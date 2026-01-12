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
    <div
      class="min-h-screen bg-neutral-950 flex items-center justify-center px-4"
    >
      <p-card
        class="w-full max-w-lg text-center bg-neutral-900 border border-neutral-800"
      >
        <ng-template pTemplate="title">
          <div class="flex flex-col items-center gap-3">
            <div class="relative">
              <div
                class="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center shadow-lg shadow-red-500/20 border border-red-500/30 animate-pulse"
              >
                <i
                  class="pi pi-exclamation-triangle text-red-400 text-3xl drop-shadow-lg"
                ></i>
              </div>
              <div
                class="absolute inset-0 w-20 h-20 rounded-full bg-red-500/10 animate-ping"
              ></div>
            </div>
            <h1 class="text-2xl font-semibold text-white m-0">{{ title() }}</h1>
          </div>
        </ng-template>
        <div class="space-y-4 text-gray-300">
          @if (showMeme()) {
          <div class="flex justify-center mb-4">
            <img
              src="images/meme.jpg"
              alt="Meme"
              class="max-w-full h-auto rounded-lg shadow-lg border-2 border-red-500/30"
              style="max-height: 300px; object-fit: contain;"
            />
          </div>
          }
          <p class="text-lg text-white font-medium">{{ message() }}</p>
          <p class="leading-relaxed">{{ description() }}</p>
          @if (showWifiInstruction()) {
          <div
            class="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
          >
            <div class="flex items-start gap-3">
              <i class="pi pi-wifi text-blue-400 text-xl mt-1"></i>
              <div class="flex-1">
                <p class="text-blue-300 font-semibold mb-1">Instrucciones:</p>
                <p class="text-blue-200 text-sm leading-relaxed">
                  Conéctate al WiFi de tu sucursal para poder acceder al modo
                  kiosko. El sistema detectará automáticamente cuando vuelvas a
                  una IP autorizada y te redirigirá al modo kiosko.
                </p>
              </div>
            </div>
          </div>
          } @if (currentIP()) {
          <div
            class="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
          >
            <p class="text-xs text-gray-400 mb-1">IP detectada:</p>
            <p class="text-sm text-red-400 font-mono font-semibold">
              {{ currentIP() }}
            </p>
          </div>
          } @if (previousIP()) {
          <div
            class="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
          >
            <p class="text-xs text-gray-400 mb-1">IP anterior:</p>
            <p class="text-sm text-gray-300 font-mono">{{ previousIP() }}</p>
          </div>
          }
          <div class="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            @if (showLogout()) {
            <p-button
              label="Cerrar sesión"
              severity="danger"
              icon="pi pi-sign-out"
              (onClick)="logout()"
            ></p-button>
            }
            <a routerLink="/login" class="sm:w-auto w-full">
              <p-button
                label="Ir al inicio"
                severity="secondary"
                outlined
                styleClass="w-full"
              ></p-button>
            </a>
          </div>
        </div>
      </p-card>
    </div>
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
