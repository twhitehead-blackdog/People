import { HttpClient } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { catchError, of, switchMap } from 'rxjs';
import { Branch } from './models';
import { ApiUrlService } from './services/api-url.service';
import { IpMonitorService } from './services/ip-monitor.service';
import { getEnv } from './utils/env.utils';

@Component({
  selector: 'pt-no-access',
  standalone: true,
  imports: [Button, Card, RouterLink],
  template: `
    <div class="na-screen">
      <div class="na-card">
        <div class="na-icon-wrap">
          <div class="na-icon" [class.na-icon--warn]="showWifiInstruction()" [class.na-icon--error]="showMeme()">
            <i class="pi" [class.pi-lock]="showWifiInstruction()" [class.pi-exclamation-triangle]="showMeme()" [class.pi-shield]="!showWifiInstruction() && !showMeme()"></i>
          </div>
        </div>

        <div class="na-title">{{ title() }}</div>
        <div class="na-desc">{{ description() }}</div>

        @if (showMeme()) {
          <img src="images/meme.jpg" alt="" class="na-meme" />
        }

        @if (currentIP()) {
          <div class="na-ip-row">
            <span class="na-ip-label">IP actual</span>
            <span class="na-ip-value">{{ currentIP() }}</span>
          </div>
        }
        @if (previousIP()) {
          <div class="na-ip-row na-ip-row--dim">
            <span class="na-ip-label">IP anterior</span>
            <span class="na-ip-value">{{ previousIP() }}</span>
          </div>
        }

        @if (showWifiInstruction()) {
          <div class="na-info-box">
            <div class="na-info-title"><i class="pi pi-wifi"></i> Instrucciones</div>
            <p>Conéctate al WiFi de tu sucursal. El sistema detectará automáticamente cuando tu IP sea autorizada y te redirigirá.</p>
          </div>
        }

        <div class="na-actions">
          @if (showLogout()) {
            <button class="na-btn na-btn--danger" (click)="logout()">
              <i class="pi pi-sign-out"></i> Cerrar sesión
            </button>
          }
          <a routerLink="/login" class="na-btn na-btn--ghost">
            <i class="pi pi-arrow-left"></i> Ir al inicio
          </a>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
      background: #08080c;
    }

    .na-screen {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: #08080c;
    }

    .na-card {
      max-width: 420px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.1rem;
      padding: 2.5rem 2rem;
      border-radius: 32px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(40px) saturate(1.3);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
      animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .na-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.15), transparent);
      z-index: 1;
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .na-icon-wrap {
      position: relative;
      margin-bottom: 0.25rem;
    }
    .na-icon-wrap::after {
      content: '';
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.08);
      animation: ripple 2.5s ease-out infinite;
    }
    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.7); opacity: 0; }
    }

    .na-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%);
      border: 1px solid rgba(239, 68, 68, 0.15);
      position: relative;
      z-index: 1;
      animation: iconIn 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .na-icon--warn {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
      border-color: rgba(251, 191, 36, 0.15);
    }
    .na-icon--warn i { color: rgba(251, 191, 36, 0.8) !important; }
    @keyframes iconIn {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.12); }
      70% { transform: scale(0.96); }
      100% { transform: scale(1); opacity: 1; }
    }
    .na-icon i {
      font-size: 2rem;
      color: rgba(248, 113, 113, 0.85);
      filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.2));
    }

    .na-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      letter-spacing: -0.01em;
    }
    .na-desc {
      font-size: 0.88rem;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      line-height: 1.55;
      max-width: 340px;
    }

    .na-meme {
      max-width: 100%;
      max-height: 220px;
      object-fit: contain;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .na-ip-row {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.1rem;
      border-radius: 14px;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.1);
    }
    .na-ip-row--dim {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.06);
    }
    .na-ip-label {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 500;
    }
    .na-ip-value {
      font-size: 0.9rem;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
      font-weight: 600;
      color: rgba(248, 113, 113, 0.85);
      letter-spacing: 0.01em;
    }
    .na-ip-row--dim .na-ip-value {
      color: rgba(255, 255, 255, 0.4);
    }

    .na-info-box {
      width: 100%;
      padding: 1rem 1.25rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .na-info-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.45);
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .na-info-title i { font-size: 0.72rem; }
    .na-info-box p {
      font-size: 0.82rem;
      color: rgba(255, 255, 255, 0.32);
      line-height: 1.55;
      margin: 0;
    }

    .na-actions {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      width: 100%;
      margin-top: 0.5rem;
    }
    .na-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      height: 46px;
      border-radius: 14px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      border: none;
    }
    .na-btn--danger {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.1) 100%);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: rgba(248, 113, 113, 0.9);
    }
    .na-btn--danger:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
    }
    .na-btn--ghost {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.5);
    }
    .na-btn--ghost:hover {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
    }
    .na-btn:active { transform: scale(0.98); }

    @media (max-width: 640px) {
      .na-card {
        padding: 2rem 1.5rem;
        border-radius: 28px;
        gap: 1rem;
      }
      .na-icon { width: 68px; height: 68px; }
      .na-icon i { font-size: 1.75rem; }
      .na-title { font-size: 1.3rem; }
    }
  `,
})
export class NoAccessComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private apiUrl = inject(ApiUrlService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ipMonitor = inject(IpMonitorService);
  private destroyRef = inject(DestroyRef);

  title = signal<string>('Acceso restringido');
  message = signal<string>('No tienes permiso para acceder');
  description = signal<string>(
    'Tu correo no aparece en nuestra base de empleados. Comunícate con tu supervisor para solicitar acceso.'
  );
  currentIP = signal<string | null>(null);
  previousIP = signal<string | null>(null);
  showLogout = signal<boolean>(true);
  showMeme = signal<boolean>(false);
  showWifiInstruction = signal<boolean>(false);
  private monitoringIP = false;
  private checkInterval: any = null;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const reason = params['reason'];
      const ip = params['ip'];
      const previous_ip = params['previous_ip'];
      const current_ip = params['current_ip'];

      if (ip) {
        this.currentIP.set(ip);
      }
      if (current_ip) {
        this.currentIP.set(current_ip);
      }
      if (previous_ip) {
        this.previousIP.set(previous_ip);
      }

      switch (reason) {
        case 'ip_not_allowed':
          this.title.set('IP no autorizada');
          this.message.set('Tu dirección IP no está autorizada');
          this.description.set(
            'Tu dirección IP actual no está en la lista de IPs permitidas para el modo kiosko.'
          );
          this.showLogout.set(false);
          this.showWifiInstruction.set(true);
          this.startIPMonitoring();
          break;
        case 'ip_changed':
          this.title.set('Cambio de red detectado');
          this.message.set('Tu dirección IP ha cambiado');
          this.description.set(
            'Se detectó un cambio en tu dirección IP. El modo kiosko solo está disponible desde IPs autorizadas.'
          );
          this.showLogout.set(false);
          this.showWifiInstruction.set(true);
          this.startIPMonitoring();
          break;
        case 'ip_check_failed':
          this.title.set('Error de verificación');
          this.message.set('No se pudo verificar tu dirección IP');
          this.description.set(
            'Hubo un error al verificar tu dirección IP. Por favor, intenta nuevamente o contacta al administrador.'
          );
          this.showLogout.set(false);
          this.showMeme.set(true);
          break;
        case 'no_ips_configured':
          this.title.set('Configuración incompleta');
          this.message.set('No hay IPs configuradas');
          this.description.set(
            'El modo kiosko no está configurado correctamente. Contacta al administrador del sistema.'
          );
          this.showLogout.set(false);
          break;
        default:
          // Mantener valores por defecto
          break;
      }
    });
  }

  logout() {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }

  /**
   * Inicia el monitoreo de IP para detectar cuando vuelve a ser permitida
   */
  private startIPMonitoring(): void {
    if (this.monitoringIP) {
      return; // Ya está monitoreando
    }

    this.monitoringIP = true;

    // Obtener IPs permitidas desde la base de datos
    const url = this.apiUrl.build('rest/v1/branches', {
      select: 'ip',
      is_active: 'eq.true',
      ip: 'not.is.null',
    });
    const apiKey = getEnv('ENV_SUPABASE_API_KEY') || '';
    this.http
      .get<Branch[]>(url, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((branches) => {
          const allowedIPs = branches
            .map((branch) => branch.ip?.trim())
            .filter((ip): ip is string => !!ip && ip.length > 0);

          this.ipMonitor.setAllowedIPs(allowedIPs);

          // Monitorear la IP cada 5 segundos
          this.checkInterval = setInterval(() => {
            this.ipMonitor
              .validateInitialIP(allowedIPs)
              .then((result) => {
                if (result.ip && result.allowed) {
                  this.stopMonitoring();
                  // Redirigir automáticamente a timeclock-kiosk
                  this.router.navigate(['/timeclock-kiosk']);
                }
              })
              .catch(() => {
                // Error silencioso, continuar monitoreando
              });
          }, 5000); // Verificar cada 5 segundos

          return of(null);
        }),
        catchError(() => of(null))
      )
      .subscribe();
  }

  /**
   * Detiene el monitoreo de IP
   */
  private stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.monitoringIP = false;
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
