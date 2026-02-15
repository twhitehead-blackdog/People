import { CommonModule } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ApiUrlService } from '../services/api-url.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmailConfigComponent } from './settings/email-config.component';
import { ManualTimelogComponent } from './settings/manual-timelog.component';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  is_encrypted: boolean;
}

interface EmailConfig {
  provider: 'smtp' | 'resend' | 'postmark';
  host: string;
  port: number;
  user: string;
  senderEmail: string;
  senderName: string;
  configured: boolean;
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
    EmailConfigComponent,
    ManualTimelogComponent,
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
            <i class="pi pi-envelope mr-2"></i>
            Correo
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-bell mr-2"></i>
            Notificaciones
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-comments mr-2"></i>
            Wassenger
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-shopping-cart mr-2"></i>
            M-Pets Precios
          </p-tab>
          @if (canManageSchedules()) {
          <p-tab value="4">
            <i class="pi pi-clock mr-2"></i>
            Marcación Manual
          </p-tab>
          }
        </p-tablist>

        <!-- Tab: Correo -->
        <p-tabpanel value="0">
          <p-card styleClass="[&_.p-card-body]:py-2">
            <ng-template #title>Configuración de Correo</ng-template>
            <ng-template #subtitle>
              Configuración del servidor SMTP para envío de correos
            </ng-template>

            <div class="flex flex-col gap-6">
              <!-- Master Switch: Envío de correos habilitado -->
              <div
                class="flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300"
                [class.bg-green-500/10]="emailEnabled()"
                [class.border-green-500/30]="emailEnabled()"
                [class.bg-red-500/10]="!emailEnabled()"
                [class.border-red-500/30]="!emailEnabled()"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 rounded-xl flex items-center justify-center"
                    [class.bg-green-500/20]="emailEnabled()"
                    [class.bg-red-500/20]="!emailEnabled()"
                  >
                    <i
                      class="pi text-2xl"
                      [class.pi-send]="emailEnabled()"
                      [class.pi-ban]="!emailEnabled()"
                      [class.text-green-400]="emailEnabled()"
                      [class.text-red-400]="!emailEnabled()"
                    ></i>
                  </div>
                  <div>
                    <label class="text-lg font-bold text-white">
                      Envío de Correos
                    </label>
                    <p class="text-sm text-gray-400 m-0">
                      {{
                        emailEnabled()
                          ? 'El sistema puede enviar correos electrónicos'
                          : 'TODOS los correos del sistema están deshabilitados'
                      }}
                    </p>
                  </div>
                </div>
                <p-toggleSwitch
                  [(ngModel)]="emailEnabled"
                  (ngModelChange)="onEmailEnabledChange()"
                  [disabled]="saving()"
                />
              </div>

              <!-- Estado de la configuración SMTP -->
              @if(emailConfigResource.isLoading()) {
              <div class="flex items-center gap-2 text-gray-400">
                <i class="pi pi-spin pi-spinner"></i>
                Cargando configuración...
              </div>
              } @else if (emailConfigResource.error()) {
              <div
                class="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i class="pi pi-exclamation-circle text-red-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-red-300 font-semibold mb-1">
                      Error al cargar configuración
                    </p>
                    <p class="text-sm text-gray-300 m-0">
                      No se pudo obtener la configuración del servidor de
                      correo. Asegúrate de que el servidor backend esté
                      ejecutándose.
                    </p>
                  </div>
                </div>
              </div>
              } @else {
              @if (emailConfigResource.value(); as config) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="text-sm text-gray-400 mb-1">Proveedor</div>
                  <div class="text-lg font-semibold text-white">
                    {{ config.provider === 'smtp' ? 'SMTP (' + config.host + ')' : config.provider === 'resend' ? 'Resend' : 'Postmark' }}
                  </div>
                </div>
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="text-sm text-gray-400 mb-1">Estado</div>
                  <div
                    class="text-lg font-semibold"
                    [class.text-green-400]="config.configured"
                    [class.text-red-400]="!config.configured"
                  >
                    {{ config.configured ? 'Configurado' : 'No configurado' }}
                  </div>
                </div>
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="text-sm text-gray-400 mb-1">Servidor</div>
                  <div class="text-lg font-semibold text-white">
                    {{ config.host }}:{{ config.port }}
                  </div>
                </div>
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="text-sm text-gray-400 mb-1">Usuario</div>
                  <div class="text-lg font-semibold text-white">
                    {{ config.user }}
                  </div>
                </div>
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700 md:col-span-2"
                >
                  <div class="text-sm text-gray-400 mb-1">Correo Remitente</div>
                  <div class="text-lg font-semibold text-white">
                    {{ config.senderName }} &lt;{{ config.senderEmail }}&gt;
                  </div>
                </div>
              </div>

              <!-- Configuración SMTP editable -->
              <pt-email-config />

              <!-- Probar envío -->
              <div
                class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
              >
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-semibold text-white">
                    Probar Envío de Correo
                  </label>
                  <p class="text-xs text-gray-400">
                    Envía un correo de prueba para verificar que la
                    configuración funciona.
                  </p>
                </div>
                <div class="flex gap-2">
                  <input
                    pInputText
                    type="email"
                    [(ngModel)]="testEmailRecipient"
                    placeholder="correo@ejemplo.com"
                    class="flex-1"
                    [disabled]="sendingTestEmail() || !emailEnabled()"
                  />
                  <p-button
                    label="Enviar Prueba"
                    icon="pi pi-send"
                    [loading]="sendingTestEmail()"
                    [disabled]="
                      !testEmailRecipient().trim() || !emailEnabled()
                    "
                    (click)="sendTestEmail()"
                  />
                </div>
                @if (!emailEnabled()) {
                <p class="text-xs text-amber-400 m-0">
                  <i class="pi pi-exclamation-triangle mr-1"></i>
                  El envío de correos está deshabilitado. Activa el switch
                  superior para habilitar.
                </p>
                }
              </div>
              }
              }

              <!-- Información -->
              <div
                class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-blue-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-blue-300 font-semibold mb-2">
                      Configuración del Servidor
                    </p>
                    <p class="text-sm text-gray-300 m-0">
                      El servidor, puerto y usuario SMTP se pueden editar
                      arriba. La contraseña se configura en la variable de
                      entorno
                      <code class="bg-neutral-700 px-1 rounded"
                        >ENV_SMTP_PASSWORD</code
                      >
                      del servidor por seguridad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </p-tabpanel>

        <!-- Tab: Notificaciones -->
        <p-tabpanel value="1">
          <p-card styleClass="[&_.p-card-body]:py-2">
            <ng-template #title>Notificaciones por Correo</ng-template>
            <ng-template #subtitle>
              Configura qué eventos generan correos automáticos
            </ng-template>

            <div class="flex flex-col gap-6">
              <!-- Warning si email está deshabilitado -->
              @if (!emailEnabled()) {
              <div
                class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i
                    class="pi pi-exclamation-triangle text-amber-400 text-xl"
                  ></i>
                  <div class="flex-1">
                    <p class="text-amber-300 font-semibold mb-1">
                      Envío de correos deshabilitado
                    </p>
                    <p class="text-sm text-gray-300 m-0">
                      Aunque configures las notificaciones aquí, no se enviará
                      ningún correo hasta que actives el switch principal en la
                      pestaña "Correo".
                    </p>
                  </div>
                </div>
              </div>
              }

              <div
                class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-blue-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-blue-300 font-semibold mb-2">
                      ¿Qué hace esto?
                    </p>
                    <p class="text-sm text-gray-300 m-0">
                      Configura qué tipos de solicitudes envían correos
                      automáticos a RRHH, y qué respuestas notifican al
                      empleado.
                    </p>
                  </div>
                </div>
              </div>

              <!-- SECCIÓN: Solicitudes a RRHH -->
              <div class="flex flex-col gap-4">
                <h3
                  class="text-lg font-bold text-white flex items-center gap-2 border-b border-neutral-700 pb-2"
                >
                  <i class="pi pi-inbox text-indigo-400"></i>
                  Solicitudes de Empleados → RRHH
                </h3>

                <!-- Solicitudes de documentos -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-file text-green-400 mr-2"></i>
                        Solicitudes de Documentos
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Carta de trabajo, certificados, constancias
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyDocuments"
                      (ngModelChange)="onHrEmailNotifyDocumentsChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyDocuments()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsDocuments"
                      (ngModelChange)="onHrEmailRecipientsDocumentsChange()"
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>

                <!-- Incapacidades -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-heart text-blue-400 mr-2"></i>
                        Incapacidades
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Incapacidades médicas con documento adjunto
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyDisabilities"
                      (ngModelChange)="onHrEmailNotifyDisabilitiesChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyDisabilities()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsDisabilities"
                      (ngModelChange)="onHrEmailRecipientsDisabilitiesChange()"
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>

                <!-- Tiempo compensatorio -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-clock text-amber-400 mr-2"></i>
                        Tiempo Compensatorio
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Solicitudes de horas o días compensatorios
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyCompensatory"
                      (ngModelChange)="onHrEmailNotifyCompensatoryChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyCompensatory()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsCompensatory"
                      (ngModelChange)="onHrEmailRecipientsCompensatoryChange()"
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>

                <!-- Vacaciones -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-sun text-purple-400 mr-2"></i>
                        Vacaciones
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Solicitudes de período vacacional
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyVacations"
                      (ngModelChange)="onHrEmailNotifyVacationsChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyVacations()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsVacations"
                      (ngModelChange)="onHrEmailRecipientsVacationsChange()"
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>

                <!-- Solicitud de Uniforme -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-tag text-teal-400 mr-2"></i>
                        Solicitud de Uniforme
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Solicitudes de prendas de trabajo
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyUniform"
                      (ngModelChange)="onHrEmailNotifyUniformChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyUniform()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsUniform"
                      (ngModelChange)="onHrEmailRecipientsUniformChange()"
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>

                <!-- Omisión de Marcación -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i
                          class="pi pi-exclamation-triangle text-orange-400 mr-2"
                        ></i>
                        Omisión de Marcación
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Solicitudes de corrección de asistencia
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyTimelogCorrection"
                      (ngModelChange)="onHrEmailNotifyTimelogCorrectionChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyTimelogCorrection()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsTimelogCorrection"
                      (ngModelChange)="
                        onHrEmailRecipientsTimelogCorrectionChange()
                      "
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>
              </div>

              <!-- SECCIÓN: Respuestas a Empleados -->
              <div class="flex flex-col gap-4">
                <h3
                  class="text-lg font-bold text-white flex items-center gap-2 border-b border-neutral-700 pb-2"
                >
                  <i class="pi pi-reply text-cyan-400"></i>
                  Respuestas de RRHH → Empleado
                </h3>

                <!-- Notificar aprobaciones -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-check-circle text-green-400 mr-2"></i>
                        Notificar Aprobaciones
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Enviar correo al empleado cuando RRHH aprueba su
                        solicitud
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="employeeEmailNotifyApprovals"
                      (ngModelChange)="onEmployeeEmailNotifyApprovalsChange()"
                      [disabled]="saving()"
                    />
                  </div>
                </div>

                <!-- Notificar rechazos -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-times-circle text-red-400 mr-2"></i>
                        Notificar Rechazos
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Enviar correo al empleado cuando RRHH rechaza su
                        solicitud
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="employeeEmailNotifyRejections"
                      (ngModelChange)="onEmployeeEmailNotifyRejectionsChange()"
                      [disabled]="saving()"
                    />
                  </div>
                </div>

                <!-- Info sobre email del empleado -->
                <div
                  class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4"
                >
                  <div class="flex items-start gap-3">
                    <i class="pi pi-info-circle text-amber-400 text-xl"></i>
                    <div class="flex-1">
                      <p class="text-amber-300 font-semibold mb-1">
                        Requisito: Correo del empleado
                      </p>
                      <p class="text-sm text-gray-300 m-0">
                        Para que el empleado reciba notificaciones, debe tener
                        configurado su correo laboral (work_email) en su perfil.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </p-tabpanel>

        <!-- Tab: Wassenger -->
        <p-tabpanel value="2">
          <p-card styleClass="[&_.p-card-body]:py-2">
            <ng-template #title>Configuración de Wassenger</ng-template>
            <ng-template #subtitle>
              Configura la integración con Wassenger para envío de mensajes
            </ng-template>

            <div class="flex flex-col gap-6">
              <!-- Estado de la integración -->
              <div
                class="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
              >
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
                  Ingresa tu API Key de Wassenger. Esta clave se almacenará de
                  forma segura.
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
              <div
                class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-blue-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-blue-300 font-semibold mb-2">
                      Información sobre Wassenger
                    </p>
                    <ul
                      class="text-sm text-gray-300 space-y-1 list-disc list-inside"
                    >
                      <li>
                        La integración con Wassenger está disponible para uso
                        futuro
                      </li>
                      <li>
                        Puedes configurar el API Key ahora, pero la
                        funcionalidad se activará en futuras actualizaciones
                      </li>
                      <li>
                        El API Key se almacena de forma segura y encriptada
                      </li>
                      <li>
                        Puedes desactivar la integración en cualquier momento
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Estado actual -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="text-sm text-gray-400 mb-1">Estado</div>
                  <div
                    class="text-lg font-semibold"
                    [class.text-green-400]="wassengerEnabled()"
                    [class.text-gray-400]="!wassengerEnabled()"
                  >
                    {{ wassengerEnabled() ? 'Activa' : 'Inactiva' }}
                  </div>
                </div>
                <div
                  class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="text-sm text-gray-400 mb-1">API Key</div>
                  <div
                    class="text-lg font-semibold"
                    [class.text-green-400]="wassengerApiKeyValue()"
                    [class.text-gray-400]="!wassengerApiKeyValue()"
                  >
                    {{
                      wassengerApiKeyValue() ? 'Configurada' : 'No configurada'
                    }}
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </p-tabpanel>

        <!-- Tab: M-Pets Precios -->
        <p-tabpanel value="3">
          <p-card styleClass="[&_.p-card-body]:py-2">
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-shopping-cart text-purple-400"></i>
                M-Pets: Puppis vs Black Dog
              </div>
            </ng-template>
            <ng-template #subtitle>
              Comparación de precios M-Pets entre Puppis Argentina y Black Dog Panamá
            </ng-template>

            <div class="flex flex-col gap-4">
              <!-- Info box -->
              <div
                class="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-purple-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-purple-300 font-semibold mb-1">
                      Herramienta de Comparación
                    </p>
                    <p class="text-sm text-gray-300 m-0">
                      Compara productos M-Pets entre Puppis Argentina 🇦🇷 y Black Dog Panamá 🇵🇦.
                      Los productos coincidentes muestran la diferencia de precio en USD.
                      Tasa: 1 USD = 1,505 ARS (Dólar Blue).
                    </p>
                  </div>
                </div>
              </div>

              <!-- Open in new window button -->
              <div class="flex justify-end">
                <p-button
                  label="Abrir en Nueva Ventana"
                  icon="pi pi-external-link"
                  severity="secondary"
                  (click)="openMPetsPage()"
                />
              </div>

              <!-- Iframe container -->
              <div class="rounded-lg overflow-hidden border border-neutral-700" style="height: 600px;">
                <iframe
                  src="/mpets-comparacion.html"
                  class="w-full h-full border-0"
                  title="M-Pets Precios Argentina"
                ></iframe>
              </div>
            </div>
          </p-card>
        </p-tabpanel>

        <!-- Tab: Marcación Manual -->
        @if (canManageSchedules()) {
        <p-tabpanel value="4">
          <pt-manual-timelog />
        </p-tabpanel>
        }
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

  // Permiso para ver el tab de Marcación Manual
  public canManageSchedules = this.store.canManageSchedules;

  public saving = signal(false);
  public wassengerEnabled = signal(false);
  public wassengerApiKey = signal('');
  public wassengerApiKeyValue = signal<string | null>(null);

  // Master switch global
  public emailEnabled = signal(true);

  // Notificaciones por correo (RRHH) - Solicitudes
  public hrEmailNotifyDocuments = signal(true);
  public hrEmailNotifyDisabilities = signal(true);
  public hrEmailNotifyCompensatory = signal(true);
  public hrEmailNotifyVacations = signal(true);
  public hrEmailNotifyUniform = signal(true);
  public hrEmailNotifyTimelogCorrection = signal(true);

  // Notificaciones a empleados (Respuestas)
  public employeeEmailNotifyApprovals = signal(true);
  public employeeEmailNotifyRejections = signal(true);

  // Destinatarios de correos
  public hrEmailRecipientsCompensatory = signal('');
  public hrEmailRecipientsDocuments = signal('');
  public hrEmailRecipientsDisabilities = signal('');
  public hrEmailRecipientsVacations = signal('');
  public hrEmailRecipientsUniform = signal('');
  public hrEmailRecipientsTimelogCorrection = signal('');

  // Email config
  public testEmailRecipient = signal('');
  public sendingTestEmail = signal(false);

  // Email config resource
  public emailConfigResource = httpResource<EmailConfig>(() => ({
    url: '/api/email/config',
    method: 'GET',
  }));

  // Cargar configuraciones
  public settingsApi = httpResource<Setting[]>(() => {
    const url = this.apiUrl.build('rest/v1/settings', {
      select: 'id,key,value',
      key: `in.(email_enabled,wassenger_api_key,wassenger_enabled,hr_email_notify_documents,hr_email_notify_disabilities,hr_email_notify_compensatory,hr_email_notify_vacations,hr_email_notify_uniform,hr_email_notify_timelog_correction,hr_email_recipients_compensatory,hr_email_recipients_documents,hr_email_recipients_disabilities,hr_email_recipients_vacations,hr_email_recipients_uniform,hr_email_recipients_timelog_correction,employee_email_notify_approvals,employee_email_notify_rejections)`,
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
        // Helper para obtener setting por key
        const getSetting = (key: string) => settings.find((s) => s.key === key);

        // Wassenger
        const wassengerKey = getSetting('wassenger_api_key');
        const wassengerEnabledSetting = getSetting('wassenger_enabled');

        // Email global
        const emailEnabledSetting = getSetting('email_enabled');

        // HR Notifications (solicitudes)
        const hrEmailNotifyDocumentsSetting = getSetting(
          'hr_email_notify_documents'
        );
        const hrEmailNotifyDisabilitiesSetting = getSetting(
          'hr_email_notify_disabilities'
        );
        const hrEmailNotifyCompensatorySetting = getSetting(
          'hr_email_notify_compensatory'
        );
        const hrEmailNotifyVacationsSetting = getSetting(
          'hr_email_notify_vacations'
        );
        const hrEmailNotifyUniformSetting = getSetting(
          'hr_email_notify_uniform'
        );
        const hrEmailNotifyTimelogCorrectionSetting = getSetting(
          'hr_email_notify_timelog_correction'
        );

        // Employee notifications (respuestas)
        const employeeEmailNotifyApprovalsSetting = getSetting(
          'employee_email_notify_approvals'
        );
        const employeeEmailNotifyRejectionsSetting = getSetting(
          'employee_email_notify_rejections'
        );

        // Recipients
        const hrEmailRecipientsCompensatorySetting = getSetting(
          'hr_email_recipients_compensatory'
        );
        const hrEmailRecipientsDocumentsSetting = getSetting(
          'hr_email_recipients_documents'
        );
        const hrEmailRecipientsDisabilitiesSetting = getSetting(
          'hr_email_recipients_disabilities'
        );
        const hrEmailRecipientsVacationsSetting = getSetting(
          'hr_email_recipients_vacations'
        );
        const hrEmailRecipientsUniformSetting = getSetting(
          'hr_email_recipients_uniform'
        );
        const hrEmailRecipientsTimelogCorrectionSetting = getSetting(
          'hr_email_recipients_timelog_correction'
        );

        // Set Wassenger values
        if (wassengerKey) {
          this.wassengerApiKeyValue.set(wassengerKey.value ? '***' : null);
        }
        if (wassengerEnabledSetting) {
          this.wassengerEnabled.set(wassengerEnabledSetting.value === 'true');
        }

        // Set email enabled (master switch)
        this.emailEnabled.set(
          emailEnabledSetting ? emailEnabledSetting.value === 'true' : true
        );

        // Set HR notifications (defaults: true)
        this.hrEmailNotifyDocuments.set(
          hrEmailNotifyDocumentsSetting
            ? hrEmailNotifyDocumentsSetting.value === 'true'
            : true
        );
        this.hrEmailNotifyDisabilities.set(
          hrEmailNotifyDisabilitiesSetting
            ? hrEmailNotifyDisabilitiesSetting.value === 'true'
            : true
        );
        this.hrEmailNotifyCompensatory.set(
          hrEmailNotifyCompensatorySetting
            ? hrEmailNotifyCompensatorySetting.value === 'true'
            : true
        );
        this.hrEmailNotifyVacations.set(
          hrEmailNotifyVacationsSetting
            ? hrEmailNotifyVacationsSetting.value === 'true'
            : true
        );
        this.hrEmailNotifyUniform.set(
          hrEmailNotifyUniformSetting
            ? hrEmailNotifyUniformSetting.value === 'true'
            : true
        );
        this.hrEmailNotifyTimelogCorrection.set(
          hrEmailNotifyTimelogCorrectionSetting
            ? hrEmailNotifyTimelogCorrectionSetting.value === 'true'
            : true
        );

        // Set employee notifications
        this.employeeEmailNotifyApprovals.set(
          employeeEmailNotifyApprovalsSetting
            ? employeeEmailNotifyApprovalsSetting.value === 'true'
            : true
        );
        this.employeeEmailNotifyRejections.set(
          employeeEmailNotifyRejectionsSetting
            ? employeeEmailNotifyRejectionsSetting.value === 'true'
            : true
        );

        // Set recipients with defaults
        const defaultEmail = 'Verley@blackdogpanama.com';
        this.hrEmailRecipientsCompensatory.set(
          hrEmailRecipientsCompensatorySetting?.value ||
            `${defaultEmail},soporte2@blackdogpanama.com`
        );
        this.hrEmailRecipientsDocuments.set(
          hrEmailRecipientsDocumentsSetting?.value || defaultEmail
        );
        this.hrEmailRecipientsDisabilities.set(
          hrEmailRecipientsDisabilitiesSetting?.value || defaultEmail
        );
        this.hrEmailRecipientsVacations.set(
          hrEmailRecipientsVacationsSetting?.value || defaultEmail
        );
        this.hrEmailRecipientsUniform.set(
          hrEmailRecipientsUniformSetting?.value || defaultEmail
        );
        this.hrEmailRecipientsTimelogCorrection.set(
          hrEmailRecipientsTimelogCorrectionSetting?.value || defaultEmail
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

  // === NEW HANDLERS ===

  public onEmailEnabledChange(): void {
    this.saveSetting('email_enabled', this.emailEnabled() ? 'true' : 'false', {
      category: 'email',
    });
  }

  public onHrEmailNotifyVacationsChange(): void {
    this.saveSetting(
      'hr_email_notify_vacations',
      this.hrEmailNotifyVacations() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onHrEmailRecipientsVacationsChange(): void {
    this.saveSetting(
      'hr_email_recipients_vacations',
      this.hrEmailRecipientsVacations(),
      { category: 'notifications' }
    );
  }

  public onHrEmailNotifyUniformChange(): void {
    this.saveSetting(
      'hr_email_notify_uniform',
      this.hrEmailNotifyUniform() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onHrEmailRecipientsUniformChange(): void {
    this.saveSetting(
      'hr_email_recipients_uniform',
      this.hrEmailRecipientsUniform(),
      { category: 'notifications' }
    );
  }

  public onHrEmailNotifyTimelogCorrectionChange(): void {
    this.saveSetting(
      'hr_email_notify_timelog_correction',
      this.hrEmailNotifyTimelogCorrection() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onHrEmailRecipientsTimelogCorrectionChange(): void {
    this.saveSetting(
      'hr_email_recipients_timelog_correction',
      this.hrEmailRecipientsTimelogCorrection(),
      { category: 'notifications' }
    );
  }

  public onEmployeeEmailNotifyApprovalsChange(): void {
    this.saveSetting(
      'employee_email_notify_approvals',
      this.employeeEmailNotifyApprovals() ? 'true' : 'false',
      { category: 'notifications' }
    );
  }

  public onEmployeeEmailNotifyRejectionsChange(): void {
    this.saveSetting(
      'employee_email_notify_rejections',
      this.employeeEmailNotifyRejections() ? 'true' : 'false',
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
      opts?.isEncrypted ??
      (key.includes('api_key') || key.includes('password'));

    // Primero intentar actualizar
    const url = this.apiUrl.build('rest/v1/settings', {
      key: `eq.${key}`,
    });
    this.http.patch(url, { value }).subscribe({
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
                detail:
                  err.error?.message || 'No se pudo guardar la configuración',
              });
              this.saving.set(false);
            },
          });
      },
    });
  }

  public sendTestEmail(): void {
    const to = this.testEmailRecipient().trim();
    if (!to) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo Requerido',
        detail: 'Por favor ingresa un correo destinatario',
      });
      return;
    }

    this.sendingTestEmail.set(true);

    this.http
      .post<{ success: boolean; message?: string; error?: string }>(
        '/api/email/test',
        { to }
      )
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Correo Enviado',
            detail: res.message || `Correo de prueba enviado a ${to}`,
          });
          this.sendingTestEmail.set(false);
        },
        error: (err) => {
          console.error('Error sending test email:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              err.error?.message || 'No se pudo enviar el correo de prueba',
          });
          this.sendingTestEmail.set(false);
        },
      });
  }

  // Abrir página de M-Pets Comparación en nueva ventana
  openMPetsPage(): void {
    window.open('/mpets-comparacion.html', '_blank');
  }
}
