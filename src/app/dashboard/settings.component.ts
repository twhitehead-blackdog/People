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
import { EmergencyTimelogReviewComponent } from './settings/emergency-timelog-review.component';
import { ManualTimelogComponent } from './settings/manual-timelog.component';


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
    EmailConfigComponent,
    EmergencyTimelogReviewComponent,
    ManualTimelogComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="mx-3 md:mx-6 flex flex-col gap-3 md:gap-4 py-3 md:py-6">
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
            <i class="pi pi-shopping-cart mr-2"></i>
            M-Pets Precios
          </p-tab>
          @if (canManageSchedules()) {
          <p-tab value="3">
            <i class="pi pi-clock mr-2"></i>
            Marcación Manual
          </p-tab>
          }
          <p-tab value="4">
            <i class="pi pi-sync mr-2"></i>
            Shopify Sync
          </p-tab>
          @if (canManageSchedules()) {
          <p-tab value="5">
            <i class="pi pi-exclamation-triangle mr-2 text-yellow-400"></i>
            Emergencias
          </p-tab>
          }
        </p-tablist>

        <!-- Tab: Correo -->
        <p-tabpanel value="0">
          <p-card styleClass="[&_.p-card-body]:py-2">
            <ng-template #title>Configuración de Correo</ng-template>
            <ng-template #subtitle>
              Configuración de correo electrónico del sistema
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

              <!-- Configuración de notificaciones -->
              <pt-email-config />

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

                <!-- Permisos de Trabajo -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-briefcase text-rose-400 mr-2"></i>
                        Permisos de Trabajo
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Permisos personales, médicos o por defunción
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyWorkPermit"
                      (ngModelChange)="onHrEmailNotifyWorkPermitChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyWorkPermit()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsWorkPermit"
                      (ngModelChange)="onHrEmailRecipientsWorkPermitChange()"
                      [disabled]="saving()"
                      placeholder="email1@ejemplo.com,email2@ejemplo.com"
                      class="bg-neutral-700 border-neutral-600 text-white"
                    />
                  </div>
                  }
                </div>

                <!-- Cambios de Horario -->
                <div
                  class="flex flex-col gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-white">
                        <i class="pi pi-calendar text-sky-400 mr-2"></i>
                        Cambios de Horario
                      </label>
                      <p class="text-xs text-gray-400 m-0">
                        Solicitudes de modificación de horario semanal
                      </p>
                    </div>
                    <p-toggleSwitch
                      [(ngModel)]="hrEmailNotifyScheduleChange"
                      (ngModelChange)="onHrEmailNotifyScheduleChangeChange()"
                      [disabled]="saving()"
                    />
                  </div>
                  @if (hrEmailNotifyScheduleChange()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-gray-300"
                      >Destinatarios (separados por coma)</label
                    >
                    <input
                      pInputText
                      [(ngModel)]="hrEmailRecipientsScheduleChange"
                      (ngModelChange)="onHrEmailRecipientsScheduleChangeChange()"
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

        <!-- Tab: M-Pets Precios -->
        <p-tabpanel value="2">
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
        <p-tabpanel value="3">
          <pt-manual-timelog />
        </p-tabpanel>
        }

        <!-- Tab: Shopify Sync -->
        <p-tabpanel value="4">
          <div class="flex flex-col items-center justify-center gap-6 py-12">
            <div class="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
              <i class="pi pi-sync text-green-400 text-3xl"></i>
            </div>
            <div class="text-center">
              <h3 class="text-white font-semibold text-lg mb-1">Shopify Sync</h3>
              <p class="text-gray-400 text-sm max-w-sm">
                La sincronización de inventario y precios con Shopify se gestiona desde su aplicación dedicada.
              </p>
            </div>
            <a
              href="https://prueba.blackdogpanama.com/shopify-sync/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors"
            >
              <i class="pi pi-external-link"></i>
              Abrir Shopify Sync
            </a>
          </div>
        </p-tabpanel>

        <!-- Tab: Emergencias -->
        @if (canManageSchedules()) {
        <p-tabpanel value="5">
          <p-card styleClass="[&_.p-card-body]:py-2">
            <pt-emergency-timelog-review />
          </p-card>
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
  public hrEmailNotifyWorkPermit = signal(true);
  public hrEmailNotifyScheduleChange = signal(true);
  public hrEmailRecipientsWorkPermit = signal('');
  public hrEmailRecipientsScheduleChange = signal('');

  // Cargar configuraciones
  public settingsApi = httpResource<Setting[]>(() => {
    const url = this.apiUrl.build('rest/v1/settings', {
      select: 'id,key,value',
      key: `in.(email_enabled,hr_email_notify_documents,hr_email_notify_disabilities,hr_email_notify_compensatory,hr_email_notify_vacations,hr_email_notify_uniform,hr_email_notify_timelog_correction,hr_email_notify_work_permit,hr_email_notify_schedule_change,hr_email_recipients_compensatory,hr_email_recipients_documents,hr_email_recipients_disabilities,hr_email_recipients_vacations,hr_email_recipients_uniform,hr_email_recipients_timelog_correction,hr_email_recipients_work_permit,hr_email_recipients_schedule_change,employee_email_notify_approvals,employee_email_notify_rejections)`,
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
        const hrEmailNotifyWorkPermitSetting = getSetting('hr_email_notify_work_permit');
        const hrEmailNotifyScheduleChangeSetting = getSetting('hr_email_notify_schedule_change');

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
        const hrEmailRecipientsWorkPermitSetting = getSetting('hr_email_recipients_work_permit');
        const hrEmailRecipientsScheduleChangeSetting = getSetting('hr_email_recipients_schedule_change');

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

        this.hrEmailNotifyWorkPermit.set(
          hrEmailNotifyWorkPermitSetting ? hrEmailNotifyWorkPermitSetting.value === 'true' : true
        );
        this.hrEmailNotifyScheduleChange.set(
          hrEmailNotifyScheduleChangeSetting ? hrEmailNotifyScheduleChangeSetting.value === 'true' : true
        );
        this.hrEmailRecipientsWorkPermit.set(hrEmailRecipientsWorkPermitSetting?.value || defaultEmail);
        this.hrEmailRecipientsScheduleChange.set(hrEmailRecipientsScheduleChangeSetting?.value || defaultEmail);
      }
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

  public onHrEmailNotifyWorkPermitChange(): void {
    this.saveSetting('hr_email_notify_work_permit', this.hrEmailNotifyWorkPermit() ? 'true' : 'false', { category: 'notifications' });
  }

  public onHrEmailRecipientsWorkPermitChange(): void {
    this.saveSetting('hr_email_recipients_work_permit', this.hrEmailRecipientsWorkPermit(), { category: 'notifications' });
  }

  public onHrEmailNotifyScheduleChangeChange(): void {
    this.saveSetting('hr_email_notify_schedule_change', this.hrEmailNotifyScheduleChange() ? 'true' : 'false', { category: 'notifications' });
  }

  public onHrEmailRecipientsScheduleChangeChange(): void {
    this.saveSetting('hr_email_recipients_schedule_change', this.hrEmailRecipientsScheduleChange(), { category: 'notifications' });
  }

  private saveSetting(key: string, value: string, opts?: { category?: string }): void {
    this.saving.set(true);
    const category = opts?.category ?? 'general';

    // Determinar si la key ya existe en los datos cargados
    const loaded = this.settingsApi.value() || [];
    const exists = loaded.some((s) => s.key === key);

    const request$ = exists
      ? this.http.patch(this.apiUrl.build('rest/v1/settings', { key: `eq.${key}` }), { value })
      : this.http.post(this.apiUrl.build('rest/v1/settings'), { key, value, category });

    request$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Configuración guardada' });
        this.settingsApi.reload();
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Error saving setting:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo guardar la configuración' });
        this.saving.set(false);
      },
    });
  }

  // Abrir página de M-Pets Comparación en nueva ventana
  openMPetsPage(): void {
    window.open('/mpets-comparacion.html', '_blank');
  }
}
