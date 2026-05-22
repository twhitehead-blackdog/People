import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Input,
  OnDestroy,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { SupabaseRealtimeService } from '../services/supabase-realtime.service';

interface VersusQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

type Screen =
  | 'menu'
  | 'pick-create'
  | 'lobby'
  | 'pick-join'
  | 'playing'
  | 'tiebreak'
  | 'results';

type Status = 'waiting' | 'playing' | 'tiebreak' | 'finished' | 'abandoned';

interface VersusMatch {
  id: string;
  code: string;
  status: Status;
  questions: VersusQuestion[];
  tiebreak_qs: VersusQuestion[];
  tiebreak_idx: number;
  host_employee_id: string;
  guest_employee_id: string | null;
  host_branch_id: string | null;
  guest_branch_id: string | null;
  winner_employee_id: string | null;
  started_at: string | null;
  finished_at: string | null;
}

interface VersusPlayer {
  match_id: string;
  role: 'host' | 'guest';
  employee_id: string;
  branch_id: string | null;
  answers: (number | null)[];
  score: number;
  current_idx: number;
  finished_main: boolean;
  tiebreak_alive: boolean;
  heartbeat_at: string;
}

interface EmployeeLite {
  id: string;
  first_name: string;
  father_name: string;
  branch_id?: string | null;
  company_id?: string | null;
}

const QUESTION_TIME_SECONDS = 15;
const HEARTBEAT_INTERVAL_MS = 10_000;
const DISCONNECT_THRESHOLD_MS = 30_000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I/L

@Component({
  selector: 'pt-kiosk-versus',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active()) {
      <div class="kv-root">
        @switch (screen()) {
          @case ('menu') {
            <div class="kv-menu">
              <div class="kv-menu-title">
                <span class="kv-flame">⚡</span>
                <h3>Versus 1v1</h3>
                <p>Reta a un compañero de otra sucursal</p>
              </div>
              <div class="kv-menu-grid">
                <button class="kv-menu-btn kv-menu-btn--primary" (click)="goCreate()">
                  <span class="kv-menu-emoji">🎯</span>
                  <span class="kv-menu-label">Crear sala</span>
                  <span class="kv-menu-sub">Generas un código y esperas rival</span>
                </button>
                <button class="kv-menu-btn" (click)="goJoin()">
                  <span class="kv-menu-emoji">🔑</span>
                  <span class="kv-menu-label">Unirme con código</span>
                  <span class="kv-menu-sub">¿Te pasaron un código?</span>
                </button>
                <button class="kv-menu-btn" (click)="findOpen()" [disabled]="searching()">
                  <span class="kv-menu-emoji">🔎</span>
                  <span class="kv-menu-label">Buscar partida abierta</span>
                  <span class="kv-menu-sub">{{ searching() ? 'Buscando…' : 'Encuentra una sala al azar' }}</span>
                </button>
              </div>
              @if (error()) { <div class="kv-error">{{ error() }}</div> }
            </div>
          }

          @case ('pick-create') {
            <div class="kv-pick">
              <button class="kv-back" (click)="screen.set('menu'); error.set('')">← Volver</button>
              <h3 class="kv-pick-title">¿Quién va a jugar?</h3>
              <p class="kv-pick-sub">Selecciona tu nombre para crear la sala.</p>
              <select class="kv-select" [value]="selectedEmpId() ?? ''" (change)="onPick($event)">
                <option value="">— Selecciona empleado —</option>
                @for (e of employees(); track e.id) {
                  <option [value]="e.id">{{ e.first_name }} {{ e.father_name }}</option>
                }
              </select>
              @if (error()) { <div class="kv-error">{{ error() }}</div> }
              <button class="kv-btn kv-btn--primary" [disabled]="!selectedEmpId() || busy()" (click)="createRoom()">
                {{ busy() ? 'Creando…' : 'Crear sala' }}
              </button>
            </div>
          }

          @case ('lobby') {
            <div class="kv-lobby">
              <div class="kv-lobby-title">Sala creada</div>
              <div class="kv-lobby-sub">Compártele este código a tu rival:</div>
              <div class="kv-code">{{ match()?.code }}</div>
              <div class="kv-spinner-wrap">
                <div class="kv-spinner"></div>
                <span>Esperando rival…</span>
              </div>
              <button class="kv-btn kv-btn--ghost" (click)="cancelLobby()">Cancelar</button>
            </div>
          }

          @case ('pick-join') {
            <div class="kv-pick">
              <button class="kv-back" (click)="screen.set('menu'); error.set('')">← Volver</button>
              <h3 class="kv-pick-title">Unirse a una sala</h3>
              <p class="kv-pick-sub">Ingresa el código de tu rival y tu nombre.</p>
              <input
                class="kv-code-input"
                type="text"
                maxlength="4"
                placeholder="ABCD"
                [value]="joinCode()"
                (input)="onCodeInput($event)"
                autocomplete="off"
                autocapitalize="characters"
              />
              <select class="kv-select" [value]="selectedEmpId() ?? ''" (change)="onPick($event)">
                <option value="">— Selecciona empleado —</option>
                @for (e of employees(); track e.id) {
                  <option [value]="e.id">{{ e.first_name }} {{ e.father_name }}</option>
                }
              </select>
              @if (error()) { <div class="kv-error">{{ error() }}</div> }
              <button class="kv-btn kv-btn--primary"
                      [disabled]="!selectedEmpId() || joinCode().length !== 4 || busy()"
                      (click)="joinRoom()">
                {{ busy() ? 'Uniéndote…' : 'Unirse' }}
              </button>
            </div>
          }

          @case ('playing') {
            <ng-container *ngTemplateOutlet="gameTpl"></ng-container>
          }

          @case ('tiebreak') {
            <div class="kv-tiebreak-banner">
              <span class="kv-fire">🔥</span>
              <span>¡EMPATE! Muerte súbita · Ronda {{ match()?.tiebreak_idx }}</span>
              <span class="kv-fire">🔥</span>
            </div>
            <ng-container *ngTemplateOutlet="gameTpl"></ng-container>
          }

          @case ('results') {
            <div class="kv-results">
              <div class="kv-result-banner" [class.win]="iWon()" [class.lose]="iLost()" [class.tie]="resultIsTie()">
                @if (iWon()) { <span>🏆 ¡Ganaste!</span> }
                @if (iLost()) { <span>💀 Perdiste</span> }
                @if (resultIsTie()) { <span>🤝 Empate</span> }
              </div>
              <div class="kv-result-grid">
                <div class="kv-result-card" [class.is-me]="true">
                  <div class="kv-result-name">{{ meName() }} <span class="kv-tag">Tú</span></div>
                  <div class="kv-result-score">{{ me()?.score ?? 0 }}<small> / {{ (match()?.questions?.length) ?? 10 }}</small></div>
                </div>
                <div class="kv-vs">VS</div>
                <div class="kv-result-card">
                  <div class="kv-result-name">{{ opponentName() || 'Rival' }}</div>
                  <div class="kv-result-score">{{ opponent()?.score ?? 0 }}<small> / {{ (match()?.questions?.length) ?? 10 }}</small></div>
                </div>
              </div>
              <div class="kv-result-actions">
                <button class="kv-btn kv-btn--primary" (click)="playAgain()">Otra partida</button>
                <button class="kv-btn kv-btn--ghost" (click)="exitToMenu()">Salir</button>
              </div>
            </div>
          }
        }

        <ng-template #gameTpl>
          <div class="kv-game">
            <!-- Strip arriba: ambos jugadores y progreso -->
            <div class="kv-strip">
              <div class="kv-strip-card" [class.is-me]="true">
                <div class="kv-strip-label">Tú</div>
                <div class="kv-strip-progress">P{{ (me()?.current_idx ?? 0) + 1 }}<small>/10</small></div>
                <div class="kv-strip-score">{{ me()?.score ?? 0 }} ✓</div>
              </div>
              <div class="kv-strip-vs">VS</div>
              <div class="kv-strip-card" [class.is-opp]="true" [class.disconnected]="opponentDisconnected()">
                <div class="kv-strip-label">{{ opponentName() || 'Rival' }}</div>
                @if (opponentDisconnected()) {
                  <div class="kv-strip-disc">Sin señal…</div>
                } @else {
                  <div class="kv-strip-progress">P{{ (opponent()?.current_idx ?? 0) + 1 }}<small>/10</small></div>
                  <div class="kv-strip-score">{{ opponent()?.score ?? 0 }} ✓</div>
                }
              </div>
            </div>

            <!-- Pregunta -->
            @if (currentQuestion(); as q) {
              <div class="kv-question">
                <div class="kv-q-meta">
                  <span>Pregunta {{ questionLabel() }}</span>
                  <span class="kv-q-timer" [class.warn]="timeLeft() <= 5">⏱ {{ timeLeft() }}s</span>
                </div>
                <div class="kv-q-text">{{ q.question }}</div>
                <div class="kv-q-options">
                  @for (opt of q.options; track $index) {
                    <button
                      class="kv-q-opt"
                      [class.selected]="selectedIdx() === $index"
                      [class.correct]="answered() && $index === q.correct_index"
                      [class.wrong]="answered() && selectedIdx() === $index && $index !== q.correct_index"
                      [disabled]="answered()"
                      (click)="selectAnswer($index)"
                    >{{ opt }}</button>
                  }
                </div>
                @if (answered() && !waitingForOpponent()) {
                  <button class="kv-btn kv-btn--primary" (click)="nextQuestion()">
                    {{ isLastQuestion() ? 'Ver resultado' : 'Siguiente' }}
                  </button>
                }
                @if (waitingForOpponent()) {
                  <div class="kv-waiting">Esperando al rival…</div>
                }
              </div>
            }
          </div>
        </ng-template>
      </div>
    }
  `,
  styles: [`
    .kv-root { padding: 0.5rem 0.25rem 1rem; color: #e5e7eb; min-height: 360px; }

    /* MENU */
    .kv-menu-title { text-align: center; margin-bottom: 1rem; }
    .kv-menu-title h3 { font-size: 1.4rem; font-weight: 800; margin: 0.3rem 0 0.1rem; color: #fbbf24; }
    .kv-menu-title p { color: #9ca3af; font-size: 0.85rem; margin: 0; }
    .kv-flame { font-size: 2rem; display: inline-block; animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }

    .kv-menu-grid { display: grid; gap: 0.6rem; }
    .kv-menu-btn {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem;
      padding: 0.85rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04); color: #e5e7eb; cursor: pointer; text-align: left;
      transition: all 0.18s ease;
    }
    .kv-menu-btn:hover:not(:disabled) {
      background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.4);
      transform: translateY(-1px);
    }
    .kv-menu-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .kv-menu-btn--primary {
      background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.12));
      border-color: rgba(251,191,36,0.6);
    }
    .kv-menu-emoji { font-size: 1.5rem; }
    .kv-menu-label { font-weight: 700; font-size: 1rem; }
    .kv-menu-sub { font-size: 0.78rem; color: #9ca3af; }

    /* PICK */
    .kv-pick { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 0.25rem; }
    .kv-back {
      align-self: flex-start; background: transparent; border: none; color: #9ca3af;
      cursor: pointer; padding: 0.25rem 0.5rem; font-size: 0.85rem;
    }
    .kv-back:hover { color: #fbbf24; }
    .kv-pick-title { margin: 0; font-size: 1.2rem; font-weight: 700; color: #f3f4f6; }
    .kv-pick-sub { margin: 0; color: #9ca3af; font-size: 0.85rem; }
    .kv-select, .kv-code-input {
      width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15);
      color: #f3f4f6; font-size: 1rem;
    }
    .kv-select:focus, .kv-code-input:focus { outline: none; border-color: #fbbf24; }
    .kv-code-input { text-align: center; letter-spacing: 0.3em; font-weight: 800; font-size: 1.6rem; text-transform: uppercase; }

    .kv-btn {
      padding: 0.85rem 1.5rem; border-radius: 0.6rem; font-weight: 700; cursor: pointer;
      transition: all 0.2s ease; border: 1px solid transparent;
    }
    .kv-btn--primary {
      background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1f1408; border: none;
    }
    .kv-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(251,191,36,0.4); }
    .kv-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .kv-btn--ghost {
      background: transparent; color: #d1d5db; border-color: rgba(255,255,255,0.15);
    }
    .kv-btn--ghost:hover { background: rgba(255,255,255,0.06); }

    .kv-error { color: #fca5a5; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
                padding: 0.5rem 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; }

    /* LOBBY */
    .kv-lobby { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1rem 0; }
    .kv-lobby-title { font-size: 1.3rem; font-weight: 800; color: #22c55e; }
    .kv-lobby-sub { color: #9ca3af; }
    .kv-code {
      font-family: 'Orbitron', monospace; font-size: 4.5rem; font-weight: 900;
      letter-spacing: 0.4em; color: #fbbf24;
      text-shadow: 0 0 24px rgba(251,191,36,0.5), 0 0 48px rgba(251,191,36,0.25);
      padding: 0.5rem 1.5rem; border: 2px dashed rgba(251,191,36,0.5); border-radius: 1rem;
      background: rgba(251,191,36,0.05);
    }
    .kv-spinner-wrap { display: flex; align-items: center; gap: 0.6rem; color: #9ca3af; }
    .kv-spinner {
      width: 18px; height: 18px; border: 2px solid rgba(251,191,36,0.3);
      border-top-color: #fbbf24; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* GAME */
    .kv-game { display: flex; flex-direction: column; gap: 0.75rem; }
    .kv-strip {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem;
      background: rgba(0,0,0,0.3); border-radius: 0.6rem;
    }
    .kv-strip-card { flex: 1; padding: 0.5rem 0.6rem; border-radius: 0.45rem; background: rgba(255,255,255,0.04); }
    .kv-strip-card.is-me { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); }
    .kv-strip-card.is-opp { background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); }
    .kv-strip-card.disconnected { background: rgba(248,113,113,0.12); border-color: rgba(248,113,113,0.4); }
    .kv-strip-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .kv-strip-progress { font-weight: 800; font-size: 1.1rem; color: #f3f4f6; }
    .kv-strip-progress small { color: #9ca3af; font-size: 0.7rem; }
    .kv-strip-score { font-size: 0.85rem; color: #fbbf24; font-weight: 700; }
    .kv-strip-disc { color: #fca5a5; font-size: 0.8rem; font-weight: 600; }
    .kv-strip-vs { font-weight: 900; color: #f59e0b; font-size: 0.9rem; }

    .kv-question { padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 0.6rem;
                   border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.65rem; }
    .kv-q-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: #9ca3af; }
    .kv-q-timer { font-weight: 700; }
    .kv-q-timer.warn { color: #fca5a5; animation: blink 0.6s infinite; }
    @keyframes blink { 50% { opacity: 0.5; } }
    .kv-q-text { font-size: 1.05rem; font-weight: 600; color: #f3f4f6; line-height: 1.3; }
    .kv-q-options { display: grid; gap: 0.4rem; }
    .kv-q-opt {
      padding: 0.65rem 0.85rem; text-align: left; cursor: pointer;
      border-radius: 0.5rem; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12); color: #e5e7eb; transition: all 0.15s ease;
    }
    .kv-q-opt:hover:not(:disabled) { border-color: rgba(251,191,36,0.5); background: rgba(251,191,36,0.06); }
    .kv-q-opt.selected { border-color: #fbbf24; background: rgba(251,191,36,0.1); }
    .kv-q-opt.correct { border-color: #22c55e; background: rgba(34,197,94,0.18); color: #86efac; }
    .kv-q-opt.wrong { border-color: #ef4444; background: rgba(239,68,68,0.18); color: #fca5a5; }
    .kv-q-opt:disabled { cursor: default; }
    .kv-waiting { text-align: center; color: #9ca3af; font-size: 0.85rem; padding-top: 0.5rem; font-style: italic; }

    /* TIEBREAK BANNER */
    .kv-tiebreak-banner {
      display: flex; justify-content: center; align-items: center; gap: 0.8rem;
      padding: 0.7rem 1rem; margin-bottom: 0.5rem;
      background: linear-gradient(90deg, rgba(239,68,68,0.2), rgba(245,158,11,0.25), rgba(239,68,68,0.2));
      border: 1px solid rgba(239,68,68,0.5); border-radius: 0.5rem;
      font-weight: 800; color: #fef3c7; font-size: 1rem;
      animation: tbpulse 1.5s ease-in-out infinite;
    }
    .kv-fire { font-size: 1.4rem; }
    @keyframes tbpulse { 0%,100% { box-shadow: 0 0 0 rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 24px rgba(239,68,68,0.6); } }

    /* RESULTS */
    .kv-results { display: flex; flex-direction: column; gap: 1rem; align-items: center; padding: 0.5rem 0; }
    .kv-result-banner {
      font-size: 2rem; font-weight: 900; padding: 0.5rem 1.5rem; border-radius: 0.75rem;
      letter-spacing: 0.02em;
    }
    .kv-result-banner.win { color: #22c55e; background: rgba(34,197,94,0.15); }
    .kv-result-banner.lose { color: #f87171; background: rgba(248,113,113,0.15); }
    .kv-result-banner.tie { color: #fbbf24; background: rgba(251,191,36,0.15); }
    .kv-result-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center; width: 100%; }
    .kv-result-card {
      padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 0.75rem;
      border: 1px solid rgba(255,255,255,0.1); text-align: center;
    }
    .kv-result-card.is-me { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.06); }
    .kv-result-name { font-size: 0.9rem; color: #d1d5db; margin-bottom: 0.3rem; }
    .kv-tag { background: rgba(251,191,36,0.2); color: #fbbf24; padding: 0.05rem 0.4rem;
              border-radius: 0.3rem; font-size: 0.65rem; margin-left: 0.3rem; }
    .kv-result-score { font-size: 2.5rem; font-weight: 900; color: #f3f4f6; }
    .kv-result-score small { font-size: 1rem; color: #9ca3af; font-weight: 500; }
    .kv-vs { font-size: 1.2rem; font-weight: 800; color: #f59e0b; }
    .kv-result-actions { display: flex; gap: 0.75rem; }
  `],
})
export class KioskVersusComponent implements OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private realtime = inject(SupabaseRealtimeService);

  /** Signal mirror del input para que el template reaccione */
  public active = signal(false);
  @Input() set activeRoute(v: boolean) {
    const prev = this.active();
    this.active.set(!!v);
    if (!prev && v && this.employees().length === 0) this.loadEmployees();
  }
  private lastSeenTiebreakIdx = 0;

  // === Sub-screen state ===
  public screen = signal<Screen>('menu');
  public busy = signal(false);
  public searching = signal(false);
  public error = signal('');

  // === Employees + auth ===
  public employees = signal<EmployeeLite[]>([]);
  public selectedEmpId = signal<string | null>(null);

  // === Match state ===
  public match = signal<VersusMatch | null>(null);
  public me = signal<VersusPlayer | null>(null);
  public opponent = signal<VersusPlayer | null>(null);
  public joinCode = signal('');
  public isHost = signal(false);

  // === In-game ===
  public selectedIdx = signal<number | null>(null);
  public answered = signal(false);
  public timeLeft = signal(QUESTION_TIME_SECONDS);
  private timerHandle: any = null;
  private heartbeatHandle: any = null;
  private disconnectChecker: any = null;

  // === Derived ===
  public currentQuestion = computed<VersusQuestion | null>(() => {
    const m = this.match();
    const meP = this.me();
    if (!m || !meP) return null;
    if (m.status === 'tiebreak') {
      const idx = (meP.current_idx - 10); // tiebreak rounds start at 10
      return m.tiebreak_qs[idx] ?? null;
    }
    return m.questions[meP.current_idx] ?? null;
  });

  public questionLabel = computed(() => {
    const m = this.match();
    const meP = this.me();
    if (!m || !meP) return '';
    if (m.status === 'tiebreak') {
      return `Desempate ${(meP.current_idx - 10) + 1}`;
    }
    return `${meP.current_idx + 1} / ${m.questions.length}`;
  });

  public isLastQuestion = computed(() => {
    const m = this.match();
    const meP = this.me();
    if (!m || !meP) return false;
    if (m.status === 'tiebreak') return false; // tiebreak no tiene "última"
    return meP.current_idx >= m.questions.length - 1;
  });

  public waitingForOpponent = computed(() => {
    const m = this.match();
    const meP = this.me();
    const opp = this.opponent();
    if (!m || !meP || !opp) return false;
    // Si terminó las main y oponente no
    if (meP.finished_main && !opp.finished_main) return true;
    // En tiebreak, esperar a que ambos hayan respondido la ronda actual
    if (m.status === 'tiebreak' && this.answered()) {
      const myRound = meP.current_idx - 10;
      const oppRound = opp.current_idx - 10;
      return myRound > oppRound;
    }
    return false;
  });

  public meName = computed(() => {
    const id = this.me()?.employee_id;
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.father_name}` : '';
  });

  public opponentName = signal<string>('');
  public opponentDisconnected = signal(false);

  public iWon = computed(() => {
    const m = this.match();
    const meP = this.me();
    return !!(m && meP && m.status === 'finished' && m.winner_employee_id === meP.employee_id);
  });
  public iLost = computed(() => {
    const m = this.match();
    const meP = this.me();
    return !!(m && meP && m.status === 'finished' && m.winner_employee_id && m.winner_employee_id !== meP.employee_id);
  });
  public resultIsTie = computed(() => {
    const m = this.match();
    return !!(m && m.status === 'finished' && !m.winner_employee_id);
  });

  // ============ Lifecycle ============

  // El componente vive dentro del modal de kiosk-extras. Solo suscribimos a
  // realtime cuando está activo (no consumir canales si nadie lo ve).
  private matchesSig = this.realtime.subscribeToTable('kiosk_versus_matches');
  private playersSig = this.realtime.subscribeToTable('kiosk_versus_players');

  constructor() {
    effect(() => {
      const batch = this.matchesSig();
      if (!batch) return;
      const m = this.match();
      if (!m) return;
      for (const ev of batch.events) {
        const rec: any = ev.record;
        if (rec?.id === m.id) {
          this.match.set(this.normalizeMatch(rec));
          this.onMatchUpdate();
        }
      }
    });

    effect(() => {
      const batch = this.playersSig();
      if (!batch) return;
      const m = this.match();
      const meP = this.me();
      if (!m || !meP) return;
      for (const ev of batch.events) {
        const rec: any = ev.record;
        if (rec?.match_id === m.id) {
          if (rec.role === meP.role) {
            this.me.set(this.normalizePlayer(rec));
          } else {
            this.opponent.set(this.normalizePlayer(rec));
            this.maybeLoadOpponentName(rec.employee_id);
          }
          this.onPlayerUpdate();
        }
      }
    });

    // Disconnect checker (cada 5s mira heartbeat del rival)
    this.disconnectChecker = setInterval(() => {
      const opp = this.opponent();
      if (!opp) { this.opponentDisconnected.set(false); return; }
      const last = new Date(opp.heartbeat_at).getTime();
      const stale = Date.now() - last > DISCONNECT_THRESHOLD_MS;
      this.opponentDisconnected.set(stale);
      if (stale && this.match()?.status === 'playing' && this.isHost()) {
        this.declareWinnerByDisconnect();
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    this.realtime.unsubscribeFromTable('kiosk_versus_matches');
    this.realtime.unsubscribeFromTable('kiosk_versus_players');
    this.stopTimer();
    this.stopHeartbeat();
    if (this.disconnectChecker) {
      clearInterval(this.disconnectChecker);
      this.disconnectChecker = null;
    }
  }

  // ============ Loading ============

  private async loadEmployees(): Promise<void> {
    try {
      const companyId = this.orgService.getCurrentCompanyId();
      const params: any = {
        is_active: 'eq.true',
        select: 'id,first_name,father_name,branch_id,company_id',
        order: 'first_name.asc',
        limit: 500,
      };
      if (companyId) params.company_id = `eq.${companyId}`;
      const url = this.apiUrl.build('rest/v1/employees', params);
      const list = await firstValueFrom(this.http.get<EmployeeLite[]>(url));
      this.employees.set(list ?? []);
    } catch (e) {
      console.error('[versus] Error cargando empleados', e);
    }
  }

  private async maybeLoadOpponentName(empId: string | undefined): Promise<void> {
    if (!empId) return;
    if (this.opponentName()) return;
    const emp = this.employees().find(e => e.id === empId);
    if (emp) { this.opponentName.set(`${emp.first_name} ${emp.father_name}`); return; }
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        id: `eq.${empId}`,
        select: 'first_name,father_name',
        limit: 1,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (rows && rows[0]) {
        this.opponentName.set(`${rows[0].first_name} ${rows[0].father_name}`);
      }
    } catch {}
  }

  // ============ Menu actions ============

  public goCreate(): void {
    this.error.set('');
    this.selectedEmpId.set(null);
    this.screen.set('pick-create');
  }

  public goJoin(): void {
    this.error.set('');
    this.selectedEmpId.set(null);
    this.joinCode.set('');
    this.screen.set('pick-join');
  }

  public onPick(ev: Event): void {
    const v = (ev.target as HTMLSelectElement).value;
    this.selectedEmpId.set(v || null);
    this.error.set('');
  }

  public onCodeInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
    this.joinCode.set(v);
    this.error.set('');
  }

  // ============ Create room ============

  public async createRoom(): Promise<void> {
    const empId = this.selectedEmpId();
    if (!empId) return;
    this.busy.set(true);
    this.error.set('');
    try {
      // Daily limit pre-check
      const overLimit = await this.checkDailyLimit(empId);
      if (overLimit) {
        this.error.set('Llegaste al límite de 5 partidas versus por hoy.');
        return;
      }

      // Activa pre-check: que no tenga sala abierta
      const activeUrl = this.apiUrl.build('rest/v1/kiosk_versus_matches', {
        or: `(host_employee_id.eq.${empId},guest_employee_id.eq.${empId})`,
        status: 'in.(waiting,playing,tiebreak)',
        select: 'id,code',
        limit: 1,
      });
      const active = await firstValueFrom(this.http.get<any[]>(activeUrl));
      if (active && active.length > 0) {
        this.error.set(`Ya tienes una partida abierta (${active[0].code}). Termínala primero.`);
        return;
      }

      const emp = this.employees().find(e => e.id === empId);
      if (!emp) { this.error.set('Empleado no encontrado'); return; }

      // Cargar pool de preguntas
      const qUrl = this.apiUrl.build('rest/v1/kiosk_quiz_questions', {
        active: 'eq.true',
        select: 'id,question,options,correct_index,explanation',
        limit: 600,
      });
      const pool = await firstValueFrom(this.http.get<VersusQuestion[]>(qUrl));
      if (!pool || pool.length < 15) {
        this.error.set('No hay suficientes preguntas en el banco.');
        return;
      }
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const questions = shuffled.slice(0, 10);
      const tiebreakQs = shuffled.slice(10, 15);

      // Intentar crear con código (3 retries por colisión)
      let created: any = null;
      for (let i = 0; i < 3 && !created; i++) {
        const code = this.generateCode();
        try {
          const body = {
            code,
            status: 'waiting',
            questions,
            tiebreak_qs: tiebreakQs,
            host_employee_id: empId,
            host_branch_id: emp.branch_id ?? null,
            company_id: emp.company_id ?? this.orgService.getCurrentCompanyId() ?? null,
          };
          const url = this.apiUrl.build('rest/v1/kiosk_versus_matches');
          const resp = await firstValueFrom(
            this.http.post<any[]>(url, body, { headers: { Prefer: 'return=representation' } })
          );
          if (resp && resp[0]) created = resp[0];
        } catch (e: any) {
          if (e?.status !== 409) throw e; // 23505 = 409 vía PostgREST
        }
      }
      if (!created) {
        this.error.set('No se pudo generar un código único. Intenta de nuevo.');
        return;
      }

      // Insertar fila propia en players
      const playerUrl = this.apiUrl.build('rest/v1/kiosk_versus_players');
      await firstValueFrom(this.http.post(playerUrl, {
        match_id: created.id,
        role: 'host',
        employee_id: empId,
        branch_id: emp.branch_id ?? null,
      }, { headers: { Prefer: 'return=minimal' } }));

      this.isHost.set(true);
      this.match.set(this.normalizeMatch(created));
      this.me.set({
        match_id: created.id,
        role: 'host',
        employee_id: empId,
        branch_id: emp.branch_id ?? null,
        answers: [],
        score: 0,
        current_idx: 0,
        finished_main: false,
        tiebreak_alive: true,
        heartbeat_at: new Date().toISOString(),
      });
      this.opponent.set(null);
      this.opponentName.set('');
      this.screen.set('lobby');
      this.startHeartbeat();
    } catch (e: any) {
      console.error('[versus] createRoom error', e);
      this.error.set('Error al crear la sala. Intenta de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  public async cancelLobby(): Promise<void> {
    const m = this.match();
    if (!m) { this.exitToMenu(); return; }
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', { id: `eq.${m.id}` });
      await firstValueFrom(this.http.patch(url, { status: 'abandoned' }));
    } catch {}
    this.exitToMenu();
  }

  // ============ Join room ============

  public async joinRoom(): Promise<void> {
    const empId = this.selectedEmpId();
    const code = this.joinCode().toUpperCase();
    if (!empId || code.length !== 4) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const emp = this.employees().find(e => e.id === empId);
      if (!emp) { this.error.set('Empleado no encontrado'); return; }
      const rpcUrl = this.apiUrl.build('rest/v1/rpc/kiosk_versus_join');
      const resp = await firstValueFrom(this.http.post<any>(rpcUrl, {
        p_code: code,
        p_employee_id: empId,
        p_branch_id: emp.branch_id ?? null,
      }));
      if (!resp?.ok) {
        const reason = resp?.reason;
        if (reason === 'daily_limit') this.error.set('Llegaste al límite de 5 partidas versus por hoy.');
        else if (reason === 'cant_join_own_room') this.error.set('No puedes unirte a tu propia sala.');
        else this.error.set('Sala no encontrada o ya está llena.');
        return;
      }
      // Cargar el match completo
      const matchUrl = this.apiUrl.build('rest/v1/kiosk_versus_matches', {
        id: `eq.${resp.match_id}`,
        select: '*',
        limit: 1,
      });
      const mrows = await firstValueFrom(this.http.get<any[]>(matchUrl));
      if (!mrows || !mrows[0]) {
        this.error.set('Error cargando la sala.');
        return;
      }
      const mraw = mrows[0];
      this.isHost.set(false);
      this.match.set(this.normalizeMatch(mraw));
      this.me.set({
        match_id: mraw.id,
        role: 'guest',
        employee_id: empId,
        branch_id: emp.branch_id ?? null,
        answers: [],
        score: 0,
        current_idx: 0,
        finished_main: false,
        tiebreak_alive: true,
        heartbeat_at: new Date().toISOString(),
      });
      // Cargar host como opponent
      await this.loadPlayers(mraw.id);
      this.screen.set('playing');
      this.startTimer();
      this.startHeartbeat();
    } catch (e: any) {
      console.error('[versus] joinRoom error', e);
      this.error.set('Error al unirse. Intenta de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  public async findOpen(): Promise<void> {
    this.searching.set(true);
    this.error.set('');
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', {
        status: 'eq.waiting',
        select: 'code,created_at',
        order: 'created_at.desc',
        limit: 5,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (!rows || rows.length === 0) {
        this.error.set('No hay salas abiertas ahora. Crea una y espera a alguien.');
        return;
      }
      // Filtrar menores a 10 min
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      const fresh = rows.filter(r => new Date(r.created_at).getTime() > tenMinAgo);
      if (fresh.length === 0) {
        this.error.set('No hay salas recientes. Crea una nueva.');
        return;
      }
      const pick = fresh[Math.floor(Math.random() * fresh.length)];
      this.joinCode.set(pick.code);
      this.screen.set('pick-join');
    } finally {
      this.searching.set(false);
    }
  }

  private async loadPlayers(matchId: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/kiosk_versus_players', {
      match_id: `eq.${matchId}`,
      select: '*',
    });
    const rows = await firstValueFrom(this.http.get<any[]>(url));
    const meP = this.me();
    if (!rows || !meP) return;
    for (const r of rows) {
      if (r.role === meP.role) {
        this.me.set(this.normalizePlayer(r));
      } else {
        this.opponent.set(this.normalizePlayer(r));
        this.maybeLoadOpponentName(r.employee_id);
      }
    }
  }

  // ============ Game flow ============

  private startTimer(): void {
    this.stopTimer();
    this.timeLeft.set(QUESTION_TIME_SECONDS);
    this.selectedIdx.set(null);
    this.answered.set(false);
    this.timerHandle = setInterval(() => {
      const t = this.timeLeft() - 1;
      this.timeLeft.set(t);
      if (t <= 0) {
        this.stopTimer();
        if (!this.answered()) {
          this.recordAnswer(null);
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  public selectAnswer(idx: number): void {
    if (this.answered()) return;
    this.recordAnswer(idx);
  }

  private async recordAnswer(idx: number | null): Promise<void> {
    this.stopTimer();
    this.selectedIdx.set(idx);
    this.answered.set(true);
    const q = this.currentQuestion();
    if (!q) return;
    const meP = this.me();
    const m = this.match();
    if (!meP || !m) return;

    const isCorrect = idx !== null && idx === q.correct_index;
    const newAnswers = [...meP.answers, idx];
    const newScore = meP.score + (isCorrect ? 1 : 0);

    // Local update
    this.me.set({ ...meP, answers: newAnswers, score: newScore });

    // PATCH remoto (current_idx se actualiza en nextQuestion)
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_players', {
        match_id: `eq.${m.id}`,
        role: `eq.${meP.role}`,
      });
      await firstValueFrom(this.http.patch(url, {
        answers: newAnswers,
        score: newScore,
        heartbeat_at: new Date().toISOString(),
        ...(m.status === 'tiebreak' ? { tiebreak_alive: isCorrect } : {}),
      }, { headers: { Prefer: 'return=minimal' } }));
    } catch (e) {
      console.error('[versus] PATCH answer failed', e);
    }
  }

  public async nextQuestion(): Promise<void> {
    const m = this.match();
    const meP = this.me();
    if (!m || !meP) return;
    const newIdx = meP.current_idx + 1;
    const finishedMain = m.status === 'playing' && newIdx >= m.questions.length;

    this.me.set({ ...meP, current_idx: newIdx, finished_main: finishedMain || meP.finished_main });

    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_players', {
        match_id: `eq.${m.id}`,
        role: `eq.${meP.role}`,
      });
      await firstValueFrom(this.http.patch(url, {
        current_idx: newIdx,
        finished_main: finishedMain || meP.finished_main,
        heartbeat_at: new Date().toISOString(),
      }, { headers: { Prefer: 'return=minimal' } }));
    } catch (e) {
      console.error('[versus] PATCH next failed', e);
    }

    if (!finishedMain && m.status === 'playing') {
      this.startTimer();
    } else if (m.status === 'tiebreak') {
      // En tiebreak no avanzamos hasta que host evalúe la ronda
      // se queda esperando con `waitingForOpponent`
    }

    // Si soy host y ambos terminaron main, evaluar
    if (this.isHost()) {
      await this.maybeEvaluateMainEnd();
    }
  }

  private async maybeEvaluateMainEnd(): Promise<void> {
    const m = this.match();
    const meP = this.me();
    const opp = this.opponent();
    if (!m || !meP || !opp) return;
    if (m.status !== 'playing') return;
    if (!meP.finished_main || !opp.finished_main) return;

    if (meP.score > opp.score) {
      await this.finishMatch(meP.employee_id);
    } else if (opp.score > meP.score) {
      await this.finishMatch(opp.employee_id);
    } else {
      await this.startTiebreak();
    }
  }

  private async startTiebreak(): Promise<void> {
    const m = this.match();
    if (!m) return;
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', { id: `eq.${m.id}` });
      await firstValueFrom(this.http.patch(url, {
        status: 'tiebreak',
        tiebreak_idx: 1,
        last_activity: new Date().toISOString(),
      }, { headers: { Prefer: 'return=minimal' } }));
    } catch (e) {
      console.error('[versus] startTiebreak failed', e);
    }
  }

  private async maybeEvaluateTiebreakRound(): Promise<void> {
    const m = this.match();
    const meP = this.me();
    const opp = this.opponent();
    if (!m || !meP || !opp) return;
    if (m.status !== 'tiebreak') return;
    if (!this.isHost()) return;
    const round = m.tiebreak_idx;
    const expectedIdx = 10 + round; // tiebreak ronda 1 → ambos current_idx debería estar en 11 después de responder
    // Esperar a que ambos hayan respondido la ronda actual
    if (meP.current_idx < expectedIdx || opp.current_idx < expectedIdx) return;

    if (meP.tiebreak_alive && !opp.tiebreak_alive) {
      await this.finishMatch(meP.employee_id);
    } else if (!meP.tiebreak_alive && opp.tiebreak_alive) {
      await this.finishMatch(opp.employee_id);
    } else {
      // Ambos correctos o ambos incorrectos → siguiente ronda
      // Si nos quedamos sin preguntas, cargar 3 más
      if (round >= m.tiebreak_qs.length) {
        await this.loadMoreTiebreak();
      }
      try {
        const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', { id: `eq.${m.id}` });
        await firstValueFrom(this.http.patch(url, {
          tiebreak_idx: round + 1,
          last_activity: new Date().toISOString(),
        }, { headers: { Prefer: 'return=minimal' } }));
      } catch (e) {
        console.error('[versus] advance tiebreak failed', e);
      }
      // reset alive locales (próxima ronda empieza vivos)
      const meRefreshed = this.me();
      const oppRefreshed = this.opponent();
      if (meRefreshed) {
        try {
          const url2 = this.apiUrl.build('rest/v1/kiosk_versus_players', {
            match_id: `eq.${m.id}`,
            role: `eq.${meRefreshed.role}`,
          });
          await firstValueFrom(this.http.patch(url2, { tiebreak_alive: true }, { headers: { Prefer: 'return=minimal' } }));
        } catch {}
      }
      if (oppRefreshed) {
        try {
          const url3 = this.apiUrl.build('rest/v1/kiosk_versus_players', {
            match_id: `eq.${m.id}`,
            role: `eq.${oppRefreshed.role}`,
          });
          await firstValueFrom(this.http.patch(url3, { tiebreak_alive: true }, { headers: { Prefer: 'return=minimal' } }));
        } catch {}
      }
    }
  }

  private async loadMoreTiebreak(): Promise<void> {
    const m = this.match();
    if (!m) return;
    try {
      const usedIds = [...m.questions, ...m.tiebreak_qs].map(q => q.id);
      const url = this.apiUrl.build('rest/v1/kiosk_quiz_questions', {
        active: 'eq.true',
        select: 'id,question,options,correct_index,explanation',
        id: `not.in.(${usedIds.join(',')})`,
        limit: 30,
      });
      const pool = await firstValueFrom(this.http.get<VersusQuestion[]>(url));
      const more = (pool ?? []).sort(() => Math.random() - 0.5).slice(0, 3);
      if (more.length === 0) return;
      const newPool = [...m.tiebreak_qs, ...more];
      const purl = this.apiUrl.build('rest/v1/kiosk_versus_matches', { id: `eq.${m.id}` });
      await firstValueFrom(this.http.patch(purl, { tiebreak_qs: newPool }, { headers: { Prefer: 'return=minimal' } }));
    } catch (e) {
      console.error('[versus] loadMoreTiebreak failed', e);
    }
  }

  private async finishMatch(winnerId: string | null): Promise<void> {
    const m = this.match();
    if (!m) return;
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', { id: `eq.${m.id}` });
      await firstValueFrom(this.http.patch(url, {
        status: 'finished',
        winner_employee_id: winnerId,
        finished_at: new Date().toISOString(),
      }, { headers: { Prefer: 'return=minimal' } }));
    } catch (e) {
      console.error('[versus] finishMatch failed', e);
    }
  }

  private async declareWinnerByDisconnect(): Promise<void> {
    const m = this.match();
    const meP = this.me();
    if (!m || !meP) return;
    if (m.status === 'finished' || m.status === 'abandoned') return;
    try {
      const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', { id: `eq.${m.id}` });
      await firstValueFrom(this.http.patch(url, {
        status: 'abandoned',
        winner_employee_id: meP.employee_id,
        finished_at: new Date().toISOString(),
      }, { headers: { Prefer: 'return=minimal' } }));
    } catch {}
  }

  private onMatchUpdate(): void {
    const m = this.match();
    if (!m) return;
    if (m.status === 'playing' && this.screen() === 'lobby') {
      // Guest se unió → empezar
      this.screen.set('playing');
      this.loadPlayers(m.id);
      this.startTimer();
    } else if (m.status === 'tiebreak') {
      // Entrar o avanzar ronda de tiebreak — el indicador es que tiebreak_idx cambió
      if (m.tiebreak_idx !== this.lastSeenTiebreakIdx) {
        this.lastSeenTiebreakIdx = m.tiebreak_idx;
        this.screen.set('tiebreak');
        this.answered.set(false);
        this.selectedIdx.set(null);
        this.startTimer();
      }
    } else if (m.status === 'finished' || m.status === 'abandoned') {
      this.screen.set('results');
      this.stopTimer();
      this.stopHeartbeat();
    }
  }

  private onPlayerUpdate(): void {
    if (this.isHost()) {
      // Posible evaluación de fin de main o ronda de tiebreak
      void this.maybeEvaluateMainEnd();
      void this.maybeEvaluateTiebreakRound();
    }
  }

  // ============ Heartbeat ============

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatHandle = setInterval(async () => {
      const m = this.match();
      const meP = this.me();
      if (!m || !meP) return;
      if (m.status === 'finished' || m.status === 'abandoned') return;
      try {
        const url = this.apiUrl.build('rest/v1/kiosk_versus_players', {
          match_id: `eq.${m.id}`,
          role: `eq.${meP.role}`,
        });
        await firstValueFrom(this.http.patch(url, {
          heartbeat_at: new Date().toISOString(),
        }, { headers: { Prefer: 'return=minimal' } }));
      } catch {}
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
  }

  // ============ Daily limit ============

  private async checkDailyLimit(empId: string): Promise<boolean> {
    try {
      const now = new Date();
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(now);
      const startOfDay = `${dateStr}T00:00:00-05:00`;
      const url = this.apiUrl.build('rest/v1/kiosk_versus_matches', {
        or: `(host_employee_id.eq.${empId},guest_employee_id.eq.${empId})`,
        created_at: `gte.${startOfDay}`,
        status: 'neq.abandoned',
        select: 'id',
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      return (rows?.length ?? 0) >= 5;
    } catch {
      return false;
    }
  }

  // ============ Result actions ============

  public playAgain(): void {
    this.resetState();
    this.screen.set('menu');
  }

  public exitToMenu(): void {
    this.resetState();
    this.screen.set('menu');
  }

  private resetState(): void {
    this.stopTimer();
    this.stopHeartbeat();
    this.match.set(null);
    this.me.set(null);
    this.opponent.set(null);
    this.opponentName.set('');
    this.opponentDisconnected.set(false);
    this.selectedEmpId.set(null);
    this.selectedIdx.set(null);
    this.answered.set(false);
    this.joinCode.set('');
    this.isHost.set(false);
    this.error.set('');
    this.lastSeenTiebreakIdx = 0;
  }

  // ============ Helpers ============

  private generateCode(): string {
    let out = '';
    for (let i = 0; i < 4; i++) {
      out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return out;
  }

  private normalizeMatch(raw: any): VersusMatch {
    return {
      id: raw.id,
      code: raw.code,
      status: raw.status,
      questions: Array.isArray(raw.questions) ? raw.questions : [],
      tiebreak_qs: Array.isArray(raw.tiebreak_qs) ? raw.tiebreak_qs : [],
      tiebreak_idx: raw.tiebreak_idx ?? 0,
      host_employee_id: raw.host_employee_id,
      guest_employee_id: raw.guest_employee_id ?? null,
      host_branch_id: raw.host_branch_id ?? null,
      guest_branch_id: raw.guest_branch_id ?? null,
      winner_employee_id: raw.winner_employee_id ?? null,
      started_at: raw.started_at ?? null,
      finished_at: raw.finished_at ?? null,
    };
  }

  private normalizePlayer(raw: any): VersusPlayer {
    return {
      match_id: raw.match_id,
      role: raw.role,
      employee_id: raw.employee_id,
      branch_id: raw.branch_id ?? null,
      answers: Array.isArray(raw.answers) ? raw.answers : [],
      score: raw.score ?? 0,
      current_idx: raw.current_idx ?? 0,
      finished_main: raw.finished_main ?? false,
      tiebreak_alive: raw.tiebreak_alive ?? true,
      heartbeat_at: raw.heartbeat_at ?? new Date().toISOString(),
    };
  }
}
