import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pt-email-config',
  imports: [CommonModule, Button, ToastModule],
  providers: [MessageService],
  template: `
    <div class="flex flex-col gap-4">

      <!-- Remitente de notificaciones -->
      <div class="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <i class="pi pi-send text-green-400 text-xl mt-0.5"></i>
          <div class="flex-1">
            <p class="text-white font-semibold mb-1">Correo Remitente de Notificaciones</p>
            <p class="text-sm text-gray-300 m-0">
              Las notificaciones de solicitudes de empleados se envían desde
              <code class="bg-neutral-700 px-1.5 py-0.5 rounded text-green-300">notificaciones&#64;blackdogpanama.com</code>
              via Microsoft 365 SMTP con fallback a Graph API.
            </p>
          </div>
        </div>
      </div>

      <!-- Env vars -->
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <i class="pi pi-server text-amber-400 text-xl mt-0.5"></i>
          <div class="flex-1">
            <p class="text-amber-300 font-semibold mb-2">Configuración del Servidor</p>
            <p class="text-sm text-gray-300 mb-2">
              Para cambiar las credenciales del remitente, actualizar las variables de entorno en el servidor:
            </p>
            <div class="flex flex-col gap-1 text-xs font-mono">
              <span class="text-gray-400">
                <code class="bg-neutral-700 px-1.5 py-0.5 rounded text-amber-300">ENV_NOTIFICATIONS_SMTP_USER</code>
                — correo del remitente de notificaciones
              </span>
              <span class="text-gray-400">
                <code class="bg-neutral-700 px-1.5 py-0.5 rounded text-amber-300">ENV_NOTIFICATIONS_SMTP_PASSWORD</code>
                — contraseña del remitente de notificaciones
              </span>
              <span class="text-gray-400">
                <code class="bg-neutral-700 px-1.5 py-0.5 rounded text-amber-300">ENV_SMTP_USER</code>
                — correo SMTP general (otros correos del sistema)
              </span>
              <span class="text-gray-400">
                <code class="bg-neutral-700 px-1.5 py-0.5 rounded text-amber-300">ENV_MS365_TENANT_ID</code>
                — Tenant ID de Microsoft 365 (para fallback Graph API)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Test notificaciones -->
      <div class="flex flex-col gap-3 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
        <div>
          <p class="text-white font-semibold mb-1">Probar Notificaciones</p>
          <p class="text-xs text-gray-400 m-0">
            Envía un correo de prueba usando el flujo real de notificaciones (respetando destinatarios configurados en el tab "Notificaciones").
          </p>
        </div>
        <div class="flex justify-end">
          <p-button
            label="Enviar Notificación de Prueba"
            icon="pi pi-send"
            severity="secondary"
            [loading]="testing()"
            (click)="sendTest()"
          />
        </div>
        @if (lastTestResult()) {
          <div
            class="text-xs rounded px-3 py-2"
            [class.bg-green-500/10]="lastTestResult() === 'ok'"
            [class.text-green-300]="lastTestResult() === 'ok'"
            [class.bg-red-500/10]="lastTestResult() !== 'ok'"
            [class.text-red-300]="lastTestResult() !== 'ok'"
          >
            @if (lastTestResult() === 'ok') {
              <i class="pi pi-check-circle mr-1"></i> Correo de prueba enviado correctamente.
            } @else {
              <i class="pi pi-times-circle mr-1"></i> Error: {{ lastTestResult() }}
            }
          </div>
        }
      </div>

    </div>
    <p-toast />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailConfigComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  public testing = signal(false);
  public lastTestResult = signal<string | null>(null);

  public async sendTest(): Promise<void> {
    this.testing.set(true);
    this.lastTestResult.set(null);
    try {
      await firstValueFrom(
        this.http.post('/api/notifications/employee-request', {
          requestType: 'vacation',
          employeeName: 'Empleado de Prueba',
          details: {
            'Fecha inicio': '2025-01-01',
            'Fecha fin': '2025-01-07',
            'Motivo': 'Correo de prueba desde Configuración',
          },
        })
      );
      this.lastTestResult.set('ok');
      this.messageService.add({ severity: 'success', summary: 'Prueba enviada', detail: 'Correo de prueba enviado correctamente' });
    } catch (error: any) {
      const msg = error?.error?.message || error?.message || 'Error desconocido';
      this.lastTestResult.set(msg);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.testing.set(false);
    }
  }
}
