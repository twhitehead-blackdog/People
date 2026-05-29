import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { DpFingerprintService, DpIdentifyResult } from '../services/dp-fingerprint.service';

type Stage = 'checking' | 'no-lite-client' | 'no-device' | 'waiting' | 'identifying' | 'identified' | 'punching' | 'done';
type PunchType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit';

@Component({
  selector: 'app-dp-timeclock',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule],
  providers: [MessageService],
  template: `
<p-toast />
<a href="/soporte" class="dp-soporte-fab" title="Portal de Soporte">
  <i class="pi pi-headphones"></i>
  <span>Soporte</span>
</a>
<div class="dp-kiosk">
  <header>
    <h1>Reloj de marcación</h1>
    <p class="clock">{{ now() }}</p>
  </header>

  <main class="content">
    @switch (stage()) {
      @case ('checking') {
        <div class="state">
          <i class="pi pi-spin pi-spinner big"></i>
          <p>Verificando lector...</p>
        </div>
      }

      @case ('no-lite-client') {
        <div class="state warn">
          <i class="pi pi-exclamation-triangle big"></i>
          <h2>Lite Client no detectado</h2>

          @if (alreadyInstalled()) {
            <p>Si ya lo instalaste, falta aceptar el certificado.</p>
            <ol class="cert-steps">
              <li>Abre <a href="https://127.0.0.1:52181/get_connection" target="_blank" rel="noopener">https://127.0.0.1:52181</a></li>
              <li>Chrome dirá "No es seguro" → "Configuración avanzada" → "Acceder a 127.0.0.1 (sitio no seguro)"</li>
              <li>Cuando veas texto JSON o un error 404, regresa aquí y presiona <strong>Reintentar</strong></li>
            </ol>
            <div class="install-grid">
              <p-button label="Abrir cert" icon="pi pi-external-link" size="large"
                        severity="info" (onClick)="openCertPage()" />
              <p-button label="Reintentar" icon="pi pi-refresh" size="large"
                        severity="success" (onClick)="retry()" />
            </div>
          } @else {
            <p>Esta PC necesita el driver del lector y el DigitalPersona Lite Client.</p>
            <div class="install-grid">
              <p-button label="1. Driver del lector" icon="pi pi-download" size="large"
                        severity="secondary" (onClick)="downloadDriver()" />
              <p-button label="2. Lite Client" icon="pi pi-download" size="large"
                        severity="warn" (onClick)="downloadInstaller()" />
            </div>
            <p class="hint">Instala primero el driver, luego el Lite Client.</p>
            <p-button label="Ya instalé todo" icon="pi pi-check" size="small"
                      [text]="true" (onClick)="alreadyInstalled.set(true)" />
          }
        </div>
      }

      @case ('no-device') {
        <div class="state warn">
          <i class="pi pi-id-card big"></i>
          <h2>Lector no conectado</h2>
          <p>Conecta el lector U.are.U 4500 vía USB.</p>
          <p-button label="Reintentar" icon="pi pi-refresh" size="large"
                    severity="secondary" (onClick)="retry()" />
        </div>
      }

      @case ('waiting') {
        <div class="state">
          <div class="finger-icon" [class.pulse]="capturing()">
            <i class="pi pi-fingerprint"></i>
          </div>
          <h2>Coloca tu dedo</h2>
          <p class="quality">{{ quality() || 'Esperando huella...' }}</p>
        </div>
      }

      @case ('identifying') {
        <div class="state">
          <i class="pi pi-spin pi-spinner big"></i>
          <p>Identificando...</p>
        </div>
      }

      @case ('identified') {
        @if (matched(); as m) {
          <div class="state ok">
            <i class="pi pi-check-circle big"></i>
            <h2>Hola, {{ firstName(m.employee_name) }}</h2>
            <p class="cedula">{{ m.cedula }}</p>
            <h3>¿Qué vas a marcar?</h3>
            <div class="punch-grid">
              <button class="punch-btn entry" (click)="punch('entry')">
                <i class="pi pi-sign-in"></i><span>Entrada</span>
              </button>
              <button class="punch-btn lunch" (click)="punch('lunch_start')">
                <i class="pi pi-clock"></i><span>Inicio almuerzo</span>
              </button>
              <button class="punch-btn lunch" (click)="punch('lunch_end')">
                <i class="pi pi-clock"></i><span>Fin almuerzo</span>
              </button>
              <button class="punch-btn exit" (click)="punch('exit')">
                <i class="pi pi-sign-out"></i><span>Salida</span>
              </button>
            </div>
            <p-button label="Cancelar" icon="pi pi-times" severity="secondary"
                      [text]="true" (onClick)="reset()" />
          </div>
        }
      }

      @case ('punching') {
        <div class="state">
          <i class="pi pi-spin pi-spinner big"></i>
          <p>Registrando...</p>
        </div>
      }

      @case ('done') {
        <div class="state ok">
          <i class="pi pi-check-circle big"></i>
          <h2>¡Listo!</h2>
          <p>{{ doneMsg() }}</p>
          <p class="hint">Volviendo en {{ countdown() }}s...</p>
        </div>
      }
    }
  </main>

  @if (stage() === 'waiting') {
    <footer>
      <p class="footer-hint">Para registrar una huella nueva, contacta al administrador.</p>
    </footer>
  }
</div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: linear-gradient(135deg, #0f1729 0%, #1a2438 100%); color: #fff; }
    .dp-soporte-fab { position: fixed; top: 14px; right: 14px; z-index: 95; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(99,179,237,0.14); border: 1px solid rgba(99,179,237,0.5); color: #93c5fd; text-decoration: none; font-weight: 600; font-size: 13px; backdrop-filter: blur(6px); transition: background-color 0.15s, transform 0.15s; }
    .dp-soporte-fab:hover { background: rgba(99,179,237,0.24); transform: translateY(-1px); }
    .dp-soporte-fab i { font-size: 14px; }
    @media (max-width: 600px) { .dp-soporte-fab { top:10px; right:10px; padding:6px 10px; font-size:12px; } }
    .dp-kiosk { min-height: 100vh; display: flex; flex-direction: column; max-width: 800px; margin: 0 auto; padding: 24px; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 12px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .clock { margin: 0; font-size: 28px; font-variant-numeric: tabular-nums; color: #63b3ed; font-weight: 500; }
    .content { flex: 1; display: flex; align-items: center; justify-content: center; }
    .state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; max-width: 480px; }
    .state.warn { color: #fbbf24; }
    .state.ok h2 { color: #34d399; }
    .state h2 { margin: 0; font-size: 32px; }
    .state h3 { margin: 12px 0 8px; font-size: 18px; color: #cbd5e1; }
    .state p { margin: 0; font-size: 16px; color: #94a3b8; }
    .big { font-size: 96px; color: #63b3ed; }
    .state.warn .big { color: #fbbf24; }
    .state.ok .big { color: #34d399; }
    .finger-icon { width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; background: rgba(99,179,237,0.1); border-radius: 50%; font-size: 96px; color: #63b3ed; }
    .finger-icon.pulse { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(99,179,237,0.6); } 50% { box-shadow: 0 0 0 24px rgba(99,179,237,0); } }
    .quality { color: #63b3ed !important; font-weight: 500; }
    .cedula { color: #94a3b8; font-size: 14px; letter-spacing: 1px; }
    .install-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 420px; margin: 8px 0; }
    .cert-steps { text-align: left; max-width: 480px; padding-left: 20px; font-size: 14px; color: #cbd5e1; line-height: 1.6; }
    .cert-steps li { margin-bottom: 8px; }
    .cert-steps a { color: #63b3ed; text-decoration: underline; }
    .punch-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 420px; margin: 8px 0; }
    .punch-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer; transition: all 0.15s; font-size: 15px; font-weight: 500; }
    .punch-btn i { font-size: 32px; }
    .punch-btn:hover { transform: translateY(-2px); }
    .punch-btn.entry { border-color: rgba(52,211,153,0.4); background: rgba(52,211,153,0.08); }
    .punch-btn.entry:hover { background: rgba(52,211,153,0.16); }
    .punch-btn.exit { border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.08); }
    .punch-btn.exit:hover { background: rgba(248,113,113,0.16); }
    .punch-btn.lunch { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.08); }
    .punch-btn.lunch:hover { background: rgba(251,191,36,0.16); }
    footer { padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer-hint, .hint { font-size: 12px; color: #64748b; text-align: center; }
  `],
})
export class DpTimeclockComponent implements OnInit, OnDestroy {
  private dp = inject(DpFingerprintService);
  private msg = inject(MessageService);

  stage = signal<Stage>('checking');
  capturing = signal(false);
  quality = signal('');
  matched = signal<DpIdentifyResult | null>(null);
  doneMsg = signal('');
  countdown = signal(3);
  now = signal(this.formatNow());
  alreadyInstalled = signal(false);

  private subs: Subscription[] = [];
  private clockTimer: any;
  private resetTimer: any;
  private autoRetryTimer: any;

  async ngOnInit() {
    this.clockTimer = setInterval(() => this.now.set(this.formatNow()), 1000);
    this.subs.push(this.dp.quality$.subscribe(q => this.quality.set(q.message)));
    this.subs.push(this.dp.error$.subscribe(e => this.msg.add({ severity: 'warn', summary: 'Lector', detail: e })));
    await this.bootstrap();
  }

  ngOnDestroy() {
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    if (this.autoRetryTimer) clearTimeout(this.autoRetryTimer);
    this.subs.forEach(s => s.unsubscribe());
    this.dp.stopCapture().catch(() => {});
    this.dp.destroy();
  }

  private async bootstrap() {
    this.stage.set('checking');
    const s = await this.dp.init();
    if (s === 'no-lite-client') { this.stage.set('no-lite-client'); return; }
    if (s === 'no-device') { this.stage.set('no-device'); return; }
    this.startWaitingLoop();
  }

  private async startWaitingLoop() {
    this.stage.set('waiting');
    this.quality.set('');
    this.capturing.set(true);
    try {
      const sample = await this.dp.captureOne(60000);
      this.capturing.set(false);
      this.stage.set('identifying');
      const result = await this.dp.identify(sample);
      if (!result.matched) {
        this.msg.add({ severity: 'warn', summary: 'No identificado', detail: 'Huella no reconocida. Intenta de nuevo.' });
        this.startWaitingLoop();
        return;
      }
      this.matched.set(result);
      this.stage.set('identified');
    } catch (e: any) {
      this.capturing.set(false);
      this.msg.add({ severity: 'warn', summary: 'Captura', detail: e?.message || 'Tiempo agotado, reintentando...' });
      this.autoRetryTimer = setTimeout(() => this.startWaitingLoop(), 1500);
    }
  }

  async punch(type: PunchType) {
    const m = this.matched();
    if (!m?.employee_id) return;
    this.stage.set('punching');
    try {
      const r = await this.dp.punch(m.employee_id, type);
      if (!r.success) throw new Error(r.error || 'No se registró');
      const labels: Record<PunchType, string> = {
        entry: 'Entrada registrada',
        exit: 'Salida registrada',
        lunch_start: 'Inicio de almuerzo registrado',
        lunch_end: 'Fin de almuerzo registrado',
      };
      this.doneMsg.set(labels[type]);
      this.stage.set('done');
      this.startDoneCountdown();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.message || 'No se registró' });
      this.stage.set('identified');
    }
  }

  private startDoneCountdown() {
    this.countdown.set(3);
    const tick = () => {
      const c = this.countdown() - 1;
      if (c <= 0) { this.reset(); return; }
      this.countdown.set(c);
      this.resetTimer = setTimeout(tick, 1000);
    };
    this.resetTimer = setTimeout(tick, 1000);
  }

  reset() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.matched.set(null);
    this.startWaitingLoop();
  }

  async retry() { await this.bootstrap(); }

  downloadInstaller() {
    window.open('/api/dp/lite-client-installer', '_blank');
  }

  downloadDriver() {
    window.open('/api/dp/driver', '_blank');
  }

  openCertPage() {
    window.open('https://127.0.0.1:52181/get_connection', '_blank');
  }

  firstName(full?: string): string {
    if (!full) return '';
    return full.split(/\s+/)[0];
  }

  private formatNow(): string {
    return new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}
