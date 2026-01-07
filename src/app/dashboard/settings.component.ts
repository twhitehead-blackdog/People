import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { ApiUrlService } from '../services/api-url.service';
import { DashboardStore } from '../stores/dashboard.store';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  is_encrypted: boolean;
}

@Component({
  selector: 'pt-settings',
  imports: [
    CommonModule,
    Card,
    Button,
    InputText,
    ToggleSwitch,
    FormsModule,
    ToastModule,
    TabsModule,
  ],
  providers: [MessageService],
  template: `
    <div class="mx-4 md:mx-6 flex flex-col gap-4 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">
          <i class="pi pi-cog mr-2"></i>
          Configuración
        </h1>
      </div>

      <p-tabs value="0" scrollable>
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-comments mr-2"></i>
            Wassenger
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-envelope mr-2"></i>
            Notificaciones
          </p-tab>
        </p-tablist>

        <!-- Tab: Wassenger -->
        <p-tabpanel value="0">
          <p-card>
            <ng-template #title>Configuración de Wassenger</ng-template>
            <ng-template #subtitle
              >Configura la integración con Wassenger para envío de mensajes</ng-template
            >
            
            <div class="flex flex-col gap-6">
              <!-- Estado de la integración -->
              <div class="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-semibold text-white">
                    Estado de la Integración
                  </label>
                  <p class="text-xs text-gray-400">
                    Activa o desactiva la integración con Wassenger
                  </p>
                </div>
                <p-toggleSwitch
                  [(ngModel)]="wassengerEnabled"
                  (ngModelChange)="onWassengerEnabledChange()"
                  [disabled]="saving()"
                />
              </div>

              <!-- API Key -->
              <div class="flex flex-col gap-2">
                <label class="text-sm font-semibold text-white">
                  API Key de Wassenger
                </label>
                <p class="text-xs text-gray-400 mb-2">
                  Ingresa tu API Key de Wassenger. Esta clave se almacenará de forma segura.
                </p>
                <div class="flex gap-2">
                  <input
                    pInputText
                    type="password"
                    [(ngModel)]="wassengerApiKey"
                    placeholder="Ingresa tu API Key"
                    class="flex-1"
                    [disabled]="saving()"
                  />
                  <p-button
                    label="Guardar"
                    icon="pi pi-save"
                    [loading]="saving()"
                    [disabled]="!wassengerApiKey().trim()"
                    (click)="saveWassengerApiKey()"
                  />
                </div>
                @if(wassengerApiKeyValue()) {
                <p class="text-xs text-green-400 mt-1">
                  <i class="pi pi-check-circle mr-1"></i>
                  API Key configurada (oculta por seguridad)
                </p>
                }
              </div>

              <!-- Información -->
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-blue-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-blue-300 font-semibold mb-2">
                      Información sobre Wassenger
                    </p>
                    <ul class="text-sm text-gray-300 space-y-1 list-disc list-inside">
                      <li>La integración con Wassenger está disponible para uso futuro</li>
                      <li>Puedes configurar el API Key ahora, pero la funcionalidad se activará en futuras actualizaciones</li>
                      <li>El API Key se almacena de forma segura y encriptada</li>
                      <li>Puedes desactivar la integración en cualquier momento</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Estado actual -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                  <div class="text-sm text-gray-400 mb-1">Estado</div>
                  <div class="text-lg font-semibold" [class.text-green-400]="wassengerEnabled()" [class.text-gray-400]="!wassengerEnabled()">
                    {{ wassengerEnabled() ? 'Activa' : 'Inactiva' }}
                  </div>
                </div>
                <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                  <div class="text-sm text-gray-400 mb-1">API Key</div>
                  <div class="text-lg font-semibold" [class.text-green-400]="wassengerApiKeyValue()" [class.text-gray-400]="!wassengerApiKeyValue()">
                    {{ wassengerApiKeyValue() ? 'Configurada' : 'No configurada' }}
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </p-tabpanel>

        <!-- Tab: Notificaciones -->
        <p-tabpanel value="1">
          <p-card>
            <ng-template #title>Notificaciones por correo (RRHH)</ng-template>
            <ng-template #subtitle>
              Activa o desactiva qué gestiones generan un email de aviso a RRHH.
            </ng-template>

            <div class="flex flex-col gap-6">
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-blue-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-blue-300 font-semibold mb-2">
                      ¿Qué hace esto?
                    </p>
                    <p class="text-sm text-gray-300 m-0">
                      Cuando un empleado envía una solicitud desde “Gestiones”, el sistema puede enviar un correo de notificación
                      a RRHH. Estos switches controlan qué tipos disparan el email.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Solicitudes de documentos -->
              <div class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-white">
                      Solicitudes de Documentos
                    </label>
                    <p class="text-xs text-gray-400">
                      Enviar correo cuando se cree una solicitud de documento (carta de trabajo, certificados, etc.)
                    </p>
                  </div>
                  <p-toggleSwitch
                    [(ngModel)]="hrEmailNotifyDocuments"
                    (ngModelChange)="onHrEmailNotifyDocumentsChange()"
                    [disabled]="saving()"
                  />
                </div>
                <div class="flex flex-col gap-2" *ngIf="hrEmailNotifyDocuments()">
                  <label class="text-xs font-medium text-gray-300">Destinatarios (separados por coma)</label>
                  <input
                    pInputText
                    [(ngModel)]="hrEmailRecipientsDocuments"
                    (ngModelChange)="onHrEmailRecipientsDocumentsChange()"
                    [disabled]="saving()"
                    placeholder="email1@ejemplo.com,email2@ejemplo.com"
                    class="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
              </div>

              <!-- Incapacidades -->
              <div class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-white">
                      Incapacidades (documento adjunto)
                    </label>
                    <p class="text-xs text-gray-400">
                      Enviar correo cuando se suba una incapacidad médica en Gestiones.
                    </p>
                  </div>
                  <p-toggleSwitch
                    [(ngModel)]="hrEmailNotifyDisabilities"
                    (ngModelChange)="onHrEmailNotifyDisabilitiesChange()"
                    [disabled]="saving()"
                  />
                </div>
                <div class="flex flex-col gap-2" *ngIf="hrEmailNotifyDisabilities()">
                  <label class="text-xs font-medium text-gray-300">Destinatarios (separados por coma)</label>
                  <input
                    pInputText
                    [(ngModel)]="hrEmailRecipientsDisabilities"
                    (ngModelChange)="onHrEmailRecipientsDisabilitiesChange()"
                    [disabled]="saving()"
                    placeholder="email1@ejemplo.com,email2@ejemplo.com"
                    class="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
              </div>

              <!-- Tiempo compensatorio -->
              <div class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-white">
                      Tiempo Compensatorio
                    </label>
                    <p class="text-xs text-gray-400">
                      Enviar correo cuando se cree una solicitud de tiempo compensatorio desde Gestiones.
                    </p>
                  </div>
                  <p-toggleSwitch
                    [(ngModel)]="hrEmailNotifyCompensatory"
                    (ngModelChange)="onHrEmailNotifyCompensatoryChange()"
                    [disabled]="saving()"
                  />
                </div>
                <div class="flex flex-col gap-2" *ngIf="hrEmailNotifyCompensatory()">
                  <label class="text-xs font-medium text-gray-300">Destinatarios (separados por coma)</label>
                  <input
                    pInputText
                    [(ngModel)]="hrEmailRecipientsCompensatory"
                    (ngModelChange)="onHrEmailRecipientsCompensatoryChange()"
                    [disabled]="saving()"
                    placeholder="email1@ejemplo.com,email2@ejemplo.com"
                    class="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
              </div>
            </div>
          </p-card>
        </p-tabpanel>
      </p-tabs>
    </div>

    <p-toast />
  `,
  styles: `
    :host {
      display: block;
      background: #000000;
      min-height: calc(100vh - 64px);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  public store = inject(DashboardStore);
  public messageService = inject(MessageService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  public saving = signal(false);
  public wassengerEnabled = signal(false);
  public wassengerApiKey = signal('');
  public wassengerApiKeyValue = signal<string | null>(null);

  // Notificaciones por correo (RRHH)
  public hrEmailNotifyDocuments = signal(true);
  public hrEmailNotifyDisabilities = signal(true);
  public hrEmailNotifyCompensatory = signal(true);

  // Destinatarios de correos
  public hrEmailRecipientsCompensatory = signal('');
  public hrEmailRecipientsDocuments = signal('');
  public hrEmailRecipientsDisabilities = signal('');

  // Cargar configuraciones
  public settingsApi = httpResource<Setting[]>(() => {
    const url = this.apiUrl.build('rest/v1/settings', {
      select: '*',
      key: `in.(wassenger_api_key,wassenger_enabled,hr_email_notify_documents,hr_email_notify_disabilities,hr_email_notify_compensatory,hr_email_recipients_compensatory,hr_email_recipients_documents,hr_email_recipients_disabilities)`,
      order: 'key.asc',
    });
    return {
      url,
      method: 'GET',
    };
  });

  constructor() {
    // Cargar valores cuando se obtengan las configuraciones
    effect(() => {
      const settings = this.settingsApi.value();
      if (settings) {
        const wassengerKey = settings.find((s) => s.key === 'wassenger_api_key');
        const wassengerEnabled = settings.find((s) => s.key === 'wassenger_enabled');
        const hrEmailNotifyDocuments = settings.find(
          (s) => s.key === 'hr_email_notify_documents'
        );
        const hrEmailNotifyDisabilities = settings.find(
          (s) => s.key === 'hr_email_notify_disabilities'
        );
        const hrEmailNotifyCompensatory = settings.find(
          (s) => s.key === 'hr_email_notify_compensatory'
        );
        const hrEmailRecipientsCompensatory = settings.find(
          (s) => s.key === 'hr_email_recipients_compensatory'
        );
        const hrEmailRecipientsDocuments = settings.find(
          (s) => s.key === 'hr_email_recipients_documents'
        );
        const hrEmailRecipientsDisabilities = settings.find(
          (s) => s.key === 'hr_email_recipients_disabilities'
        );

        if (wassengerKey) {
          this.wassengerApiKeyValue.set(wassengerKey.value ? '***' : null);
        }

        if (wassengerEnabled) {
          this.wassengerEnabled.set(wassengerEnabled.value === 'true');
        }

        // Defaults: true (si no existe el setting aún)
        this.hrEmailNotifyDocuments.set(
          hrEmailNotifyDocuments ? hrEmailNotifyDocuments.value === 'true' : true
        );
        this.hrEmailNotifyDisabilities.set(
          hrEmailNotifyDisabilities ? hrEmailNotifyDisabilities.value === 'true' : true
        );
        this.hrEmailNotifyCompensatory.set(
          hrEmailNotifyCompensatory
            ? hrEmailNotifyCompensatory.value === 'true'
            : true
        );

        // Cargar destinatarios con valores por defecto
        this.hrEmailRecipientsCompensatory.set(
          hrEmailRecipientsCompensatory?.value || 'Verley@blackdogpanama.com,soporte2@blackdogpanama.com'
        );
        this.hrEmailRecipientsDocuments.set(
          hrEmailRecipientsDocuments?.value || 'Verley@blackdogpanama.com'
        );
        this.hrEmailRecipientsDisabilities.set(
          hrEmailRecipientsDisabilities?.value || 'Verley@blackdogpanama.com'
        );
      }
    });
  }

  public onWassengerEnabledChange(): void {
    this.saveSetting(
      'wassenger_enabled',
      this.wassengerEnabled() ? 'true' : 'false',
      { category: 'integrations' }
    );
  }

  public saveWassengerApiKey(): void {
    if (!this.wassengerApiKey().trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo Requerido',
        detail: 'Por favor ingresa un API Key válido',
      });
      return;
    }

    this.saveSetting('wassenger_api_key', this.wassengerApiKey().trim(), {
      category: 'integrations',
      isEncrypted: true,
    });
  }

  public onHrEmailNotifyDocumentsChange(): void {
    this.saveSetting(
      'hr_email_notify_documents',
      this.hrEmailNotifyDocuments() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onHrEmailNotifyDisabilitiesChange(): void {
    this.saveSetting(
      'hr_email_notify_disabilities',
      this.hrEmailNotifyDisabilities() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onHrEmailNotifyCompensatoryChange(): void {
    this.saveSetting(
      'hr_email_notify_compensatory',
      this.hrEmailNotifyCompensatory() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onHrEmailRecipientsCompensatoryChange(): void {
    this.saveSetting(
      'hr_email_recipients_compensatory',
      this.hrEmailRecipientsCompensatory(),
      { category: 'notifications' }
    );
  }

  public onHrEmailRecipientsDocumentsChange(): void {
    this.saveSetting(
      'hr_email_recipients_documents',
      this.hrEmailRecipientsDocuments(),
      { category: 'notifications' }
    );
  }

  public onHrEmailRecipientsDisabilitiesChange(): void {
    this.saveSetting(
      'hr_email_recipients_disabilities',
      this.hrEmailRecipientsDisabilities(),
      { category: 'notifications' }
    );
  }

  private saveSetting(
    key: string,
    value: string,
    opts?: { category?: string; isEncrypted?: boolean }
  ): void {
    this.saving.set(true);
    const category = opts?.category ?? 'general';
    const isEncrypted =
      opts?.isEncrypted ?? (key.includes('api_key') || key.includes('password'));

    // Primero intentar actualizar
    const url = this.apiUrl.build('rest/v1/settings', {
      key: `eq.${key}`,
    });
    this.http
      .patch(url, { value })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Configuración guardada correctamente',
          });

          if (key === 'wassenger_api_key') {
            this.wassengerApiKey.set('');
            this.wassengerApiKeyValue.set('***');
          }

          this.settingsApi.reload();
          this.saving.set(false);
        },
        error: (error) => {
          console.error('Error saving setting:', error);
          
          // Si no existe, crear
          this.http
            .post(this.apiUrl.build('rest/v1/settings'), {
              key,
              value,
              category,
              is_encrypted: isEncrypted,
            })
            .subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Éxito',
                  detail: 'Configuración guardada correctamente',
                });

                if (key === 'wassenger_api_key') {
                  this.wassengerApiKey.set('');
                  this.wassengerApiKeyValue.set('***');
                }

                this.settingsApi.reload();
                this.saving.set(false);
              },
              error: (err) => {
                console.error('Error creating setting:', err);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: err.error?.message || 'No se pudo guardar la configuración',
                });
                this.saving.set(false);
              },
            });
        },
      });
  }
}

