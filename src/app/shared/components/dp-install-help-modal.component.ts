import { ChangeDetectionStrategy, Component, model } from '@angular/core';

/**
 * Modal de ayuda para instalar el lector DigitalPersona U.are.U 4500.
 *
 * Reemplaza la duplicación previa entre `timeclock.component.ts` y
 * `naz-timeclock/naz-timeclock.component.ts`. El modal se renderiza con
 * `position: fixed` en el shadow DOM del componente, evitando quedar
 * atrapado por contenedores con `backdrop-filter` (causa del bug que se
 * arregló en v7.0.0).
 *
 * Uso:
 *   <app-dp-install-help-modal [(show)]="showDpHelp" />
 */
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
            <p>Sigue estos pasos para activar el lector U.are.U 4500.</p>
          </div>
          <ol class="dp-help-steps">
            <li>
              <span class="step-num">1</span>
              <div><strong>Conecta el lector U.are.U 4500</strong> al puerto USB.</div>
            </li>
            <li>
              <span class="step-num">2</span>
              <div>
                <strong>Descarga e instala el driver del lector.</strong><br>
                <button class="dp-help-btn" (click)="downloadDriver()" type="button">
                  <i class="pi pi-download"></i> Descargar driver
                </button>
              </div>
            </li>
            <li>
              <span class="step-num">3</span>
              <div>
                <strong>Descarga e instala el DigitalPersona Lite Client.</strong><br>
                <button class="dp-help-btn" (click)="downloadInstaller()" type="button">
                  <i class="pi pi-download"></i> Descargar Lite Client
                </button>
              </div>
            </li>
            <li>
              <span class="step-num">4</span>
              <div>
                <strong>Acepta el certificado</strong> en
                <a href="https://127.0.0.1:52181/get_connection" target="_blank" rel="noopener" class="dp-help-link">
                  https://127.0.0.1:52181
                </a>
                (Chrome → "Configuración avanzada" → "Acceder a 127.0.0.1").
              </div>
            </li>
            <li>
              <span class="step-num">5</span>
              <div><strong>Recarga esta página.</strong> El chip debería ponerse en verde.</div>
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
      position: relative; max-width: 520px; width: 100%; max-height: 90vh;
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

    .dp-help-header { text-align: center; margin-bottom: 20px; }
    .dp-help-icon {
      font-size: 2.5rem; color: #63b3ed;
      filter: drop-shadow(0 0 12px rgba(99,179,237,0.5));
    }
    .dp-help-header h2 { margin: 8px 0 4px; font-size: 1.3rem; color: #fff; font-weight: 700; }
    .dp-help-header p { margin: 0; font-size: 0.85rem; color: #94a3b8; }

    .dp-help-steps {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 12px;
    }
    .dp-help-steps li {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px; border-radius: 12px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    }
    .dp-help-steps li > div { flex: 1; font-size: 0.85rem; line-height: 1.5; }
    .dp-help-steps li strong { color: #fff; font-weight: 600; }

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
  /** Two-way binding: parent controls visibility; modal can close itself. */
  readonly show = model<boolean>(false);

  protected downloadDriver(): void {
    window.open('/api/dp/driver', '_blank');
  }

  protected downloadInstaller(): void {
    window.open('/api/dp/lite-client-installer', '_blank');
  }
}
