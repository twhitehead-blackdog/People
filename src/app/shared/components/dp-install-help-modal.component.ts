import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { DpFingerprintService } from '../../services/dp-fingerprint.service';

/**
 * Modal de ayuda + diagnóstico para el lector DigitalPersona U.are.U 4500.
 *
 * Diagnostica automáticamente en qué paso está fallando:
 *  1. Lite Client no instalado (puerto 52181 muerto)
 *  2. Certificado self-signed no aceptado por Chrome
 *  3. Chrome bloquea acceso al loopback (Private Network Access)
 *  4. Driver no instalado / lector no enchufado
 *
 * El modal usa `position: fixed` para evitar quedar atrapado por
 * contenedores con `backdrop-filter` (bug v7.0.0).
 *
 * Uso:
 *   <app-dp-install-help-modal [(show)]="showDpHelp" />
 */
type DiagState = 'idle' | 'checking' | 'ok' | 'no-service' | 'pna-blocked' | 'cert-or-service';

@Component({
  selector: 'app-dp-install-help-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div class="dp-help-overlay" (click)="show.set(false)">
        <div class="dp-help-modal" (click)="$event.stopPropagation()">
          <button class="dp-help-close" (click)="show.set(false)" type="button" aria-label="Cerrar">
            <i class="pi pi-times"></i>
          </button>
          <div class="dp-help-header">
            <i class="pi pi-fingerprint dp-help-icon"></i>
            <h2>Configurar lector de huellas</h2>
            <p>Sigue los pasos. Usa "Probar conexión" para saber dónde estás fallando.</p>
          </div>

          <!-- Diagnóstico automático -->
          <div class="dp-diag" [class]="'diag-' + diag()">
            <div class="dp-diag-row">
              <button class="dp-diag-btn" (click)="runDiagnostic()" type="button" [disabled]="diag() === 'checking'">
                @if (diag() === 'checking') {
                  <i class="pi pi-spin pi-spinner"></i> Probando…
                } @else {
                  <i class="pi pi-bolt"></i> Probar conexión
                }
              </button>
              @if (diag() === 'ok') {
                <span class="dp-diag-msg ok"><i class="pi pi-check-circle"></i> Servicio detectado. Recarga la página.</span>
              } @else if (diag() === 'no-service') {
                <span class="dp-diag-msg err"><i class="pi pi-times-circle"></i> Lite Client no responde — falta paso 3.</span>
              } @else if (diag() === 'pna-blocked') {
                <span class="dp-diag-msg warn"><i class="pi pi-exclamation-triangle"></i> Chrome bloquea el loopback — ver paso 4.</span>
              } @else if (diag() === 'cert-or-service') {
                <span class="dp-diag-msg warn"><i class="pi pi-exclamation-triangle"></i> Certificado no aceptado o servicio caído — ver pasos 3 y 4.</span>
              }
            </div>
          </div>

          <ol class="dp-help-steps">
            <li>
              <span class="step-num">1</span>
              <div><strong>Conecta el lector U.are.U 4500</strong> al puerto USB.</div>
            </li>
            <li>
              <span class="step-num">2</span>
              <div>
                <strong>Instala el driver del lector.</strong><br>
                <button class="dp-help-btn" (click)="downloadDriver()" type="button">
                  <i class="pi pi-download"></i> Descargar driver
                </button>
              </div>
            </li>
            <li>
              <span class="step-num">3</span>
              <div>
                <strong>Instala el DigitalPersona Lite Client.</strong> Después de instalar verifica que aparezca corriendo en el system tray.<br>
                <button class="dp-help-btn" (click)="downloadInstaller()" type="button">
                  <i class="pi pi-download"></i> Descargar Lite Client
                </button>
              </div>
            </li>
            <li class="step-key">
              <span class="step-num">4</span>
              <div>
                <strong>Acepta el certificado del Lite Client.</strong> Chrome bloquea por defecto el acceso a <code>127.0.0.1</code> hasta que el certificado se acepta manualmente.<br>
                <ol class="substeps">
                  <li>Abre <a href="https://127.0.0.1:52181/get_connection" target="_blank" rel="noopener" class="dp-help-link">https://127.0.0.1:52181/get_connection</a> en una pestaña nueva.</li>
                  <li>Verás "Tu conexión no es privada" → click <strong>Configuración avanzada</strong> → <strong>Acceder a 127.0.0.1 (no seguro)</strong>.</li>
                  <li>Si ves un JSON o página vacía: el cert quedó aceptado.</li>
                </ol>
                <button class="dp-help-btn" (click)="openCertUrl()" type="button">
                  <i class="pi pi-external-link"></i> Abrir 127.0.0.1:52181
                </button>
              </div>
            </li>
            <li class="step-key">
              <span class="step-num">5</span>
              <div>
                <strong>Si Chrome no muestra prompt de permiso</strong>, habilita acceso a redes privadas:<br>
                <ol class="substeps">
                  <li>Abre <code>chrome://flags/#private-network-access-permission-prompt</code></li>
                  <li>Cambia a <strong>Enabled</strong> y reinicia Chrome.</li>
                </ol>
                <button class="dp-help-btn" (click)="openFlags()" type="button">
                  <i class="pi pi-external-link"></i> Abrir chrome://flags
                </button>
                <p class="step-note">Nota: <code>chrome://</code> no se puede abrir con un click — copia la URL y pégala en la barra de direcciones.</p>
              </div>
            </li>
            <li>
              <span class="step-num">6</span>
              <div><strong>Recarga esta página.</strong> El chip del lector debe ponerse en verde.</div>
            </li>
          </ol>
          <button class="dp-help-cta" (click)="show.set(false)" type="button">Entendido</button>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }

    .dp-help-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; animation: dp-help-fade 0.2s ease-out;
    }
    @keyframes dp-help-fade { from { opacity: 0; } to { opacity: 1; } }

    .dp-help-modal {
      position: relative; max-width: 560px; width: 100%; max-height: 90vh;
      overflow-y: auto; padding: 28px 24px 20px;
      border-radius: 18px;
      background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(99,179,237,0.22);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
      color: #cbd5e1;
    }

    .dp-help-close {
      position: absolute; top: 12px; right: 12px;
      width: 30px; height: 30px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
      color: #94a3b8; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .dp-help-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

    .dp-help-header { text-align: center; margin-bottom: 16px; }
    .dp-help-icon {
      font-size: 2.5rem; color: #63b3ed;
      filter: drop-shadow(0 0 12px rgba(99,179,237,0.5));
    }
    .dp-help-header h2 { margin: 8px 0 4px; font-size: 1.3rem; color: #fff; font-weight: 700; }
    .dp-help-header p { margin: 0; font-size: 0.85rem; color: #94a3b8; }

    .dp-diag {
      margin-bottom: 14px; padding: 12px;
      border-radius: 12px;
      background: rgba(99,179,237,0.06);
      border: 1px solid rgba(99,179,237,0.15);
    }
    .dp-diag.diag-ok { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.3); }
    .dp-diag.diag-no-service,
    .dp-diag.diag-pna-blocked,
    .dp-diag.diag-cert-or-service { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); }
    .dp-diag-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .dp-diag-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      border: 1px solid rgba(99,179,237,0.5); background: rgba(99,179,237,0.15);
      color: #93c5fd; font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s; font-family: inherit;
    }
    .dp-diag-btn:hover:not(:disabled) { background: rgba(99,179,237,0.25); }
    .dp-diag-btn:disabled { opacity: 0.6; cursor: wait; }
    .dp-diag-msg { font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
    .dp-diag-msg.ok { color: #4ade80; }
    .dp-diag-msg.err { color: #f87171; }
    .dp-diag-msg.warn { color: #fbbf24; }

    .dp-help-steps {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 10px;
    }
    .dp-help-steps li {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px; border-radius: 12px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    }
    .dp-help-steps li.step-key {
      background: rgba(99,179,237,0.06);
      border-color: rgba(99,179,237,0.2);
    }
    .dp-help-steps li > div { flex: 1; font-size: 0.85rem; line-height: 1.5; }
    .dp-help-steps li strong { color: #fff; font-weight: 600; }
    .dp-help-steps code {
      background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px;
      font-size: 0.8rem; color: #e0e7ff;
    }

    .substeps {
      margin: 6px 0 8px 18px; padding: 0;
      display: flex; flex-direction: column; gap: 4px;
      font-size: 0.82rem; color: #94a3b8;
    }
    .substeps li {
      background: transparent !important; border: none !important; padding: 0 !important;
      display: list-item !important; list-style: decimal;
    }
    .step-note { margin: 6px 0 0; font-size: 0.75rem; color: #64748b; font-style: italic; }

    .step-num {
      flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
      background: linear-gradient(135deg, #63b3ed, #4299e1);
      color: white; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      margin-top: 1px;
    }

    .dp-help-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; margin-top: 6px;
      border: 1px solid rgba(99,179,237,0.4); border-radius: 8px;
      background: rgba(99,179,237,0.1); color: #63b3ed;
      font-size: 0.8rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s; font-family: inherit;
    }
    .dp-help-btn:hover { background: rgba(99,179,237,0.2); }

    .dp-help-link { color: #63b3ed; text-decoration: underline; word-break: break-all; }

    .dp-help-cta {
      width: 100%; margin-top: 18px; padding: 12px;
      border-radius: 10px; border: none;
      background: linear-gradient(135deg, #63b3ed, #4299e1);
      color: white; font-size: 0.95rem; font-weight: 700;
      cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .dp-help-cta:hover { filter: brightness(1.1); transform: translateY(-1px); }
  `,
})
export class DpInstallHelpModalComponent {
  private dp = inject(DpFingerprintService);

  /** Two-way binding: parent controls visibility; modal can close itself. */
  readonly show = model<boolean>(false);

  /** Diagnostic state — drives the indicator under the "Probar conexión" button. */
  protected readonly diag = signal<DiagState>('idle');

  protected async runDiagnostic(): Promise<void> {
    this.diag.set('checking');

    // Probe 1: usar el método del servicio (no-cors, abortable). Si responde true,
    // el cert ya está aceptado y PNA no está bloqueando.
    const reachable = await this.dp.isLiteClientAvailable(2500);
    if (reachable) {
      this.diag.set('ok');
      return;
    }

    // Probe 2: distinguir entre PNA-block, cert-no-aceptado y servicio caído.
    // En modo `cors` Chrome lanza TypeError con el mensaje específico de PNA.
    let pnaBlocked = false;
    let serviceUp = false;
    try {
      await fetch('https://127.0.0.1:52181/get_connection', {
        method: 'GET', mode: 'cors', cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      serviceUp = true;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/private.network|loopback/i.test(msg)) pnaBlocked = true;
    }

    if (pnaBlocked) this.diag.set('pna-blocked');
    else if (serviceUp) this.diag.set('cert-or-service');
    else this.diag.set('no-service');
  }

  protected downloadDriver(): void {
    window.open('/api/dp/driver', '_blank');
  }

  protected downloadInstaller(): void {
    window.open('/api/dp/lite-client-installer', '_blank');
  }

  protected openCertUrl(): void {
    window.open('https://127.0.0.1:52181/get_connection', '_blank');
  }

  protected openFlags(): void {
    // chrome:// URLs no se pueden abrir programáticamente — copiar al clipboard.
    const url = 'chrome://flags/#private-network-access-permission-prompt';
    navigator.clipboard?.writeText(url).catch(() => {});
    alert(`URL copiada al portapapeles:\n\n${url}\n\nPégala en la barra de direcciones de Chrome.`);
  }
}
