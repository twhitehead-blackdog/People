import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, interval } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

interface BranchRollup {
  branch_id: string;
  branch_name: string;
  entered: number;       // entry sin exit
  on_lunch: number;      // lunch_start sin lunch_end
  exited: number;        // exit
}

@Component({
  selector: 'pt-team-pulse',
  imports: [CommonModule],
  template: `
    @if (rolledUp().length > 0) {
      <div class="tp-fab" [class.expanded]="open()" (click)="open.set(!open())">
        <!-- Compact: número total -->
        <div class="tp-fab-head">
          <i class="pi pi-users"></i>
          <span class="tp-fab-count">{{ totalActive() }}</span>
          @if (mood() === 'happy') { <span class="tp-mood">😊</span> }
          @else if (mood() === 'neutral') { <span class="tp-mood">😐</span> }
          @else if (mood() === 'sad') { <span class="tp-mood">😟</span> }
          @if (open()) { <i class="pi pi-times text-xs ml-1 opacity-60"></i> }
        </div>

        @if (open()) {
          <div class="tp-panel" (click)="$event.stopPropagation()">
            <div class="tp-header">
              <span class="tp-title">Pulso del equipo</span>
              <span class="tp-time">{{ now() | date: 'HH:mm' }}</span>
            </div>

            <!-- KPIs principales -->
            <div class="tp-kpis">
              <div class="tp-kpi">
                <span class="tp-kpi-icon" style="background:rgba(34,197,94,0.15);color:#4ade80">
                  <i class="pi pi-sign-in"></i>
                </span>
                <div class="tp-kpi-body">
                  <div class="tp-kpi-val">{{ totalActive() }}</div>
                  <div class="tp-kpi-lbl">en turno</div>
                </div>
              </div>
              <div class="tp-kpi">
                <span class="tp-kpi-icon" style="background:rgba(251,191,36,0.15);color:#fbbf24">
                  <i class="pi pi-clock"></i>
                </span>
                <div class="tp-kpi-body">
                  <div class="tp-kpi-val">{{ totalLunch() }}</div>
                  <div class="tp-kpi-lbl">almorzando</div>
                </div>
              </div>
              <div class="tp-kpi">
                <span class="tp-kpi-icon" style="background:rgba(168,85,247,0.15);color:#c084fc">
                  <i class="pi pi-star-fill"></i>
                </span>
                <div class="tp-kpi-body">
                  <div class="tp-kpi-val">{{ avgRating() || '—' }}</div>
                  <div class="tp-kpi-lbl">rating hoy</div>
                </div>
              </div>
            </div>

            <!-- Desglose por sucursal -->
            <div class="tp-section-title">Sucursales activas</div>
            <div class="tp-branches">
              @for (b of rolledUp(); track b.branch_id) {
                <div class="tp-branch">
                  <span class="tp-branch-name">{{ b.branch_name }}</span>
                  <div class="tp-branch-stats">
                    <span class="tp-pill tp-pill-green">{{ b.entered }}</span>
                    @if (b.on_lunch > 0) {
                      <span class="tp-pill tp-pill-amber">{{ b.on_lunch }} 🍽️</span>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Últimos logros -->
            @if (achievements().length > 0) {
              <div class="tp-section-title">Logros recientes</div>
              <div class="tp-achievements">
                @for (a of achievements(); track a.id) {
                  <div class="tp-achievement">
                    <span class="tp-ach-icon">{{ a.icon }}</span>
                    <div class="tp-ach-body">
                      <div class="tp-ach-name">{{ a.who }}</div>
                      <div class="tp-ach-desc">{{ a.what }}</div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .tp-fab {
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 9998;
      background: rgba(20, 20, 28, 0.92);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      color: #fff;
      backdrop-filter: blur(20px) saturate(1.4);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      cursor: pointer;
      transition: all 0.25s;
      overflow: hidden;
    }
    .tp-fab:hover:not(.expanded) {
      border-color: rgba(251,191,36,0.4);
      transform: translateY(-1px);
    }
    .tp-fab.expanded {
      width: 320px;
      cursor: default;
    }

    .tp-fab-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 700;
    }
    .tp-fab-head i { font-size: 13px; opacity: 0.8; }
    .tp-fab-count {
      color: #4ade80;
      font-family: 'Courier New', monospace;
    }
    .tp-mood { font-size: 16px; line-height: 1; }

    .tp-panel {
      padding: 4px 14px 14px;
      border-top: 1px solid rgba(255,255,255,0.05);
      animation: tpSlide 0.25s ease-out;
    }
    @keyframes tpSlide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .tp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0 8px;
    }
    .tp-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.55); font-weight: 700; }
    .tp-time { font-size: 11px; font-family: 'Courier New', monospace; color: rgba(251,191,36,0.7); }

    .tp-kpis { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .tp-kpi { display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 10px; }
    .tp-kpi-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
    .tp-kpi-val { font-size: 16px; font-weight: 800; line-height: 1; color: #fff; }
    .tp-kpi-lbl { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-top: 2px; letter-spacing: 0.05em; }

    .tp-section-title {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 10px 0 6px;
    }

    .tp-branches { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto; }
    .tp-branch {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: rgba(255,255,255,0.025);
      border-radius: 8px;
      transition: background 0.15s;
    }
    .tp-branch:hover { background: rgba(255,255,255,0.05); }
    .tp-branch-name { font-size: 12px; color: rgba(255,255,255,0.85); }
    .tp-branch-stats { display: flex; gap: 4px; }
    .tp-pill { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; font-family: 'Courier New', monospace; }
    .tp-pill-green { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }
    .tp-pill-amber { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }

    .tp-achievements { display: flex; flex-direction: column; gap: 6px; }
    .tp-achievement {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      background: linear-gradient(90deg, rgba(251,191,36,0.06), rgba(168,85,247,0.04));
      border: 1px solid rgba(251,191,36,0.15);
      border-radius: 8px;
    }
    .tp-ach-icon { font-size: 18px; }
    .tp-ach-name { font-size: 12px; font-weight: 700; color: #fff; }
    .tp-ach-desc { font-size: 10px; color: rgba(255,255,255,0.55); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPulseComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);
  private destroyRef = inject(DestroyRef);

  public open = signal(false);
  public now = signal(new Date());
  public branchActivity = signal<BranchRollup[]>([]);
  public avgRating = signal<number | null>(null);
  public achievements = signal<{ id: string; icon: string; who: string; what: string }[]>([]);

  public rolledUp = computed(() => {
    return [...this.branchActivity()]
      .filter((b) => b.entered + b.on_lunch + b.exited > 0)
      .sort((a, b) => (b.entered + b.on_lunch) - (a.entered + a.on_lunch))
      .slice(0, 12);
  });

  public totalActive = computed(() =>
    this.branchActivity().reduce((s, b) => s + b.entered, 0)
  );
  public totalLunch = computed(() =>
    this.branchActivity().reduce((s, b) => s + b.on_lunch, 0)
  );

  public mood = computed<'happy' | 'neutral' | 'sad'>(() => {
    const r = this.avgRating();
    if (r === null) return 'neutral';
    if (r >= 4.2) return 'happy';
    if (r >= 3.0) return 'neutral';
    return 'sad';
  });

  ngOnInit(): void {
    this.refresh();
    interval(60_000) // refresh cada minuto
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(new Date());
        this.refresh();
      });
  }

  private async refresh(): Promise<void> {
    await Promise.all([
      this.loadTeamStatus(),
      this.loadRatingAverage(),
      this.loadAchievements(),
    ]);
  }

  private async loadTeamStatus(): Promise<void> {
    try {
      // Tomar el último timelog de cada empleado HOY (Panama TZ)
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' });
      const today = fmt.format(new Date());
      const url = this.apiUrl.build('rest/v1/timelogs', {
        select: 'employee_id,branch_id,type,punched_at,branch:branches(id,name,short_name)',
        punched_at: `gte.${today}T00:00:00-05:00`,
        order: 'punched_at.desc',
        limit: 5000,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (!rows) return;

      // Último timelog por empleado
      const lastByEmp = new Map<string, any>();
      for (const r of rows) {
        if (!lastByEmp.has(r.employee_id)) lastByEmp.set(r.employee_id, r);
      }

      // Agrupar por sucursal
      const byBranch = new Map<string, BranchRollup>();
      for (const r of lastByEmp.values()) {
        const bId = r.branch_id;
        if (!bId) continue;
        const cur = byBranch.get(bId) ?? {
          branch_id: bId,
          branch_name: r.branch?.name ?? '—',
          entered: 0,
          on_lunch: 0,
          exited: 0,
        };
        if (r.type === 'entry' || r.type === 'lunch_end') cur.entered++;
        else if (r.type === 'lunch_start') cur.on_lunch++;
        else if (r.type === 'exit') cur.exited++;
        byBranch.set(bId, cur);
      }
      this.branchActivity.set(Array.from(byBranch.values()));
    } catch (e) {
      console.error('[TeamPulse] Error team status', e);
    }
  }

  private async loadRatingAverage(): Promise<void> {
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' });
      const today = fmt.format(new Date());
      const url = this.apiUrl.build('rest/v1/sale_order', {
        select: 'calificacion_cliente',
        'calificacion_cliente': 'gt.0',
        'create_date': `gte.${today}T00:00:00-05:00`,
        limit: 200,
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (!rows || rows.length === 0) { this.avgRating.set(null); return; }
      const sum = rows.reduce((s: number, r: any) => s + (Number(r.calificacion_cliente) || 0), 0);
      const avg = sum / rows.length;
      this.avgRating.set(Math.round(avg * 10) / 10);
    } catch {
      this.avgRating.set(null);
    }
  }

  private async loadAchievements(): Promise<void> {
    try {
      // Top quiz score de hoy
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' });
      const today = fmt.format(new Date());
      const quizUrl = this.apiUrl.build('rest/v1/kiosk_quiz_scores', {
        select: 'id,score,total,duration_ms,employee:employees!kiosk_quiz_scores_employee_id_fkey(first_name,father_name)',
        played_at: `gte.${today}T00:00:00-05:00`,
        order: 'score.desc,duration_ms.asc',
        limit: 3,
      });
      const quizRows = await firstValueFrom(this.http.get<any[]>(quizUrl));
      const list: any[] = [];
      if (quizRows && quizRows.length > 0) {
        const top = quizRows[0];
        const name = `${top.employee?.first_name || ''} ${top.employee?.father_name || ''}`.trim() || 'Alguien';
        const seconds = Math.round((top.duration_ms || 0) / 1000);
        if (top.score === top.total) {
          list.push({
            id: top.id,
            icon: '🏆',
            who: name,
            what: `Quiz perfecto ${top.score}/${top.total} en ${seconds}s`,
          });
        } else if (top.score >= 8) {
          list.push({
            id: top.id,
            icon: '⭐',
            who: name,
            what: `Top quiz ${top.score}/${top.total}`,
          });
        }
      }
      this.achievements.set(list);
    } catch {
      this.achievements.set([]);
    }
  }
}
