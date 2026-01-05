import { DatePipe, NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  addDays,
  differenceInDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { filter, firstValueFrom } from 'rxjs';
import { CalendarComponent, CalendarMarkerData } from '../calendar.component';
import { TimeLogEnum } from '../models';
import { PanamaDatePipe } from '../pipes/panama-date.pipe';
import { NotificationsService } from '../services/notifications.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { getBooleanSetting } from '../utils/settings-http.utils';

@Component({
  selector: 'pt-employee-portal',
  imports: [
    Card,
    TabsModule,
    TableModule,
    TagModule,
    DatePipe,
    PanamaDatePipe,
    Button,
    DatePicker,
    DropdownModule,
    FormsModule,
    InputText,
    Textarea,
    FileUpload,
    DialogModule,
    ToastModule,
    TooltipModule,
    NgClass,
    CalendarComponent,
  ],
  providers: [MessageService],
  template: `
    <div
      class="mx-2 sm:mx-4 md:mx-6 flex flex-col gap-4 py-4 sm:py-6"
      [ngClass]="{ 'naz-theme': isNaz() }"
    >
      <div class="flex items-center justify-between">
        <h1 class="text-xl sm:text-2xl font-bold text-white">
          <i class="pi pi-user mr-2"></i>
          <span class="hidden sm:inline">Mi Portal</span>
          <span class="sm:hidden">Portal</span>
        </h1>
      </div>

      <!-- DEBUG: activeTabIndex en template = {{ activeTabIndex() }} -->
      <p-tabs
        [value]="activeTabIndex().toString()"
        (valueChange)="onTabChange($event)"
        scrollable
      >
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-home mr-2"></i>
            Dashboard
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-briefcase mr-2"></i>
            <span class="hidden sm:inline">Gestiones</span>
            <span class="sm:hidden">Gestiones</span>
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-user mr-2"></i>
            Mi Perfil
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-calendar-clock mr-2"></i>
            <span class="hidden sm:inline">Mis Marcaciones</span>
            <span class="sm:hidden">Marcaciones</span>
          </p-tab>
          <p-tab value="4">
            <i class="pi pi-clock mr-2"></i>
            <span class="hidden sm:inline">Mis Tardanzas</span>
            <span class="sm:hidden">Tardanzas</span>
          </p-tab>
        </p-tablist>

        <!-- Contenido de tabs usando @if en lugar de p-tabpanel -->
        @if (activeTabIndex() === 0) {
        <!-- Tab 0: Dashboard -->
        <div class="tab-content">
          @if (currentEmployee()) {
          <div class="flex flex-col gap-6">
            <!-- Welcome Card -->
            <p-card class="dashboard-welcome-card">
              <div
                class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"
                  >
                    <i class="pi pi-user text-white text-2xl"></i>
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-white m-0">
                      ¡Hola, {{ currentEmployee()?.first_name }}!
                    </h2>
                    <p class="text-gray-400 m-0 mt-1">
                      {{ currentEmployee()?.position?.name || 'Sin cargo' }} -
                      {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-400 m-0">Hoy es</p>
                  <p class="text-lg font-semibold text-white m-0">
                    {{ getCurrentDate() | date : 'fullDate' }}
                  </p>
                </div>
              </div>
            </p-card>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Días Trabajados Este Mes -->
              <p-card class="dashboard-stat-card">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-400 m-0 mb-1">
                      Días Trabajados
                    </p>
                    <p class="text-2xl font-bold text-white m-0">
                      {{ daysWorkedThisMonth() }}
                    </p>
                    <p class="text-xs text-gray-500 m-0 mt-1">Este mes</p>
                  </div>
                  <div
                    class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-calendar text-blue-400 text-xl"></i>
                  </div>
                </div>
              </p-card>

              <!-- Tardanzas Este Mes -->
              <p-card class="dashboard-stat-card">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-400 m-0 mb-1">Tardanzas</p>
                    <p class="text-2xl font-bold text-white m-0">
                      {{ myLates().length }}
                    </p>
                    <p class="text-xs text-gray-500 m-0 mt-1">Este mes</p>
                  </div>
                  <div
                    class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-clock text-red-400 text-xl"></i>
                  </div>
                </div>
              </p-card>

              <!-- Horas de Compensatorio Aprobadas -->
              <p-card class="dashboard-stat-card">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-400 m-0 mb-1">
                      Horas de Compensatorio Aprobadas
                    </p>
                    <p class="text-2xl font-bold text-white m-0">
                      {{ approvedCompensatoryHours() }}
                    </p>
                    <p class="text-xs text-gray-500 m-0 mt-1">
                      Total aprobadas
                    </p>
                  </div>
                  <div
                    class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-check-circle text-green-400 text-xl"></i>
                  </div>
                </div>
              </p-card>

              <!-- Salario Mensual oculto -->
            </div>

            <!-- Recent Activity and Quick Info -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Marcaciones Recientes -->
              <p-card>
                <ng-template #title>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-calendar-clock text-amber-400"></i>
                    <span>Marcaciones Recientes</span>
                  </div>
                </ng-template>
                <div class="flex flex-col gap-3">
                  @if (recentTimelogs().length > 0) { @for (log of
                  recentTimelogs(); track log.day) {
                  <div
                    class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
                      >
                        <i class="pi pi-clock text-amber-400"></i>
                      </div>
                      <div>
                        <p class="text-white font-semibold m-0">
                          {{ log.day | panamaDate : 'mediumDate' }}
                        </p>
                        <p class="text-sm text-gray-400 m-0">
                          Entrada:
                          {{
                            log.entry?.date
                              ? (log.entry.date | panamaDate : 'hh:mm a')
                              : 'Sin registro'
                          }}
                        </p>
                      </div>
                    </div>
                    @if (log.delay && typeof log.delay === 'number') {
                    <span
                      class="text-xs text-red-400 font-semibold px-2 py-1 rounded bg-red-500/20"
                    >
                      +{{ log.delay }} min
                    </span>
                    } @else {
                    <span
                      class="text-xs text-green-400 font-semibold px-2 py-1 rounded bg-green-500/20"
                    >
                      A tiempo
                    </span>
                    }
                  </div>
                  } } @else {
                  <p class="text-gray-400 text-center py-4">
                    No hay marcaciones recientes
                  </p>
                  }
                </div>
              </p-card>

              <!-- Información Rápida -->
              <p-card>
                <ng-template #title>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle text-amber-400"></i>
                    <span>Información Rápida</span>
                  </div>
                </ng-template>
                <div class="flex flex-col gap-3">
                  <div
                    class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <div class="flex items-center gap-3">
                      <i class="pi pi-building text-amber-400"></i>
                      <span class="text-gray-400">Sucursal:</span>
                    </div>
                    <span class="text-white font-semibold">{{
                      currentEmployee()?.branch?.name || 'N/A'
                    }}</span>
                  </div>
                  <div
                    class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <div class="flex items-center gap-3">
                      <i class="pi pi-sitemap text-amber-400"></i>
                      <span class="text-gray-400">Departamento:</span>
                    </div>
                    <span class="text-white font-semibold">{{
                      currentEmployee()?.department?.name || 'N/A'
                    }}</span>
                  </div>
                  <div
                    class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <div class="flex items-center gap-3">
                      <i class="pi pi-calendar text-amber-400"></i>
                      <span class="text-gray-400">Fecha de Ingreso:</span>
                    </div>
                    <span class="text-white font-semibold">{{
                      currentEmployee()?.start_date | date : 'shortDate'
                    }}</span>
                  </div>
                  <div
                    class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                  >
                    <div class="flex items-center gap-3">
                      <i class="pi pi-envelope text-amber-400"></i>
                      <span class="text-gray-400">Email:</span>
                    </div>
                    <span class="text-white font-semibold text-sm">{{
                      currentEmployee()?.work_email || 'N/A'
                    }}</span>
                  </div>
                </div>
              </p-card>
            </div>
          </div>
          }
        </div>
        } @if (activeTabIndex() === 1) {
        <!-- Tab 1: Gestiones - activeTabIndex = {{ activeTabIndex() }} -->
        <div
          class="tab-content"
          style="background: rgba(255,0,0,0.1); border: 2px solid red; padding: 1rem;"
        >
          <div
            style="background: rgba(0,255,0,0.1); padding: 1rem; margin-bottom: 1rem;"
          >
            <strong
              >DEBUG: Tab Gestiones está activo - activeTabIndex =
              {{ activeTabIndex() }}</strong
            >
          </div>
          <div
            class="flex flex-col gap-6"
            style="min-height: 400px; padding: 1rem 0;"
          >
            <div>
              <h2 class="text-2xl font-bold text-white mb-2">Gestiones</h2>
              <p class="text-gray-400">
                Accede a todos los formularios y solicitudes disponibles
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Incapacidades -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('disabilities')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-file-plus text-blue-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Incapacidades
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Sube documentos de incapacidad médica
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Documentos -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('documents')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-file-edit text-green-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Solicitar Documentos
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita cartas de trabajo u otros documentos
                  </p>
                </div>
              </p-card>

              <!-- Buzón de Quejas -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('complaints')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-comments text-yellow-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Buzón de Sugerencias
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Expresa tus inquietudes de forma anónima
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Vacaciones -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('vacations')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-calendar-plus text-purple-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Solicitar Vacaciones
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita tus días de vacaciones
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Licencia -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('license')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-calendar text-orange-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Solicitar Licencia
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita una licencia sin goce de sueldo
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Permiso Personal -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('personal')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-user text-indigo-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Permiso Personal
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita un permiso por asuntos personales
                  </p>
                </div>
              </p-card>

              <!-- Solicitar Licencia de Maternidad -->
              <p-card
                class="cursor-pointer hover:shadow-lg transition-all"
                (click)="openGestionForm('maternity')"
              >
                <div class="flex flex-col items-center text-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center"
                  >
                    <i class="pi pi-heart text-pink-400 text-xl"></i>
                  </div>
                  <h3 class="text-lg font-semibold text-white m-0">
                    Licencia de Maternidad
                  </h3>
                  <p class="text-sm text-gray-400 m-0">
                    Solicita tu licencia de maternidad pagada
                  </p>
                </div>
              </p-card>
            </div>
          </div>

          <!-- Formularios modales -->
          @if (activeGestionForm()) {
          <p-dialog
            [visible]="showGestionDialog()"
            [modal]="true"
            [style]="{ width: '90vw', maxWidth: '800px' }"
            [header]="getGestionFormTitle()"
            [draggable]="false"
            [resizable]="false"
            (onHide)="closeGestionForm()"
          >
            @if (activeGestionForm() === 'disabilities') {
            <!-- Formulario de Incapacidades -->
            <div class="gestion-form-content">
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-gray-400 mb-2"
                      >Inicio de Incapacidad</label
                    >
                    <p-datepicker
                      [(ngModel)]="disabilityStartDate"
                      appendTo="body"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-400 mb-2"
                      >Fin de Incapacidad</label
                    >
                    <p-datepicker
                      [(ngModel)]="disabilityEndDate"
                      appendTo="body"
                      class="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Descripción (opcional)</label
                  >
                  <textarea
                    id="disability-description"
                    pInputTextarea
                    [(ngModel)]="disabilityDescription"
                    rows="3"
                    placeholder="Describe el motivo de la incapacidad..."
                    class="w-full"
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Documento de Incapacidad</label
                  >
                  <p-fileUpload
                    mode="basic"
                    accept="image/*,.pdf"
                    maxFileSize="5000000"
                    [auto]="false"
                    chooseLabel="Seleccionar Archivo"
                    (onSelect)="onFileSelect($event)"
                    class="w-full"
                  />
                  <p class="text-xs text-gray-500 mt-2">
                    Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
                  </p>
                </div>
                <div class="flex justify-end gap-2">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    outlined
                    (click)="closeGestionForm()"
                  />
                  <p-button
                    label="Subir Incapacidad"
                    icon="pi pi-upload"
                    type="button"
                    [loading]="uploadingDisability()"
                    [disabled]="uploadingDisability()"
                    (click)="uploadDisability(); closeGestionForm()"
                  />
                </div>
              </div>
            </div>
            } @else if (activeGestionForm() === 'documents') {
            <!-- Formulario de Solicitar Documentos -->
            <div class="gestion-form-content">
              <div class="flex flex-col gap-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Tipo de Documento</label
                  >
                  <select pInputText [(ngModel)]="documentType" class="w-full">
                    <option value="work_letter">Carta de Trabajo</option>
                    <option value="salary_certificate">
                      Certificado de Salario
                    </option>
                    <option value="employment_certificate">
                      Certificado de Empleo
                    </option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                @if(documentType() === 'other') {
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Especificar Documento</label
                  >
                  <input
                    pInputText
                    [(ngModel)]="customDocumentType"
                    placeholder="Describe el documento que necesitas"
                    class="w-full"
                  />
                </div>
                }
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Motivo o Uso del Documento</label
                  >
                  <textarea
                    pInputTextarea
                    [(ngModel)]="documentReason"
                    rows="3"
                    placeholder="Ej: Para trámite bancario, visa, etc."
                    class="w-full"
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Fecha Requerida (opcional)</label
                  >
                  <p-datepicker
                    [(ngModel)]="documentRequiredDate"
                    appendTo="body"
                    class="w-full"
                  />
                </div>
                <div class="flex justify-end gap-2">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    outlined
                    (click)="closeGestionForm()"
                  />
                  <p-button
                    label="Solicitar Documento"
                    icon="pi pi-send"
                    type="button"
                    [loading]="submittingDocument()"
                    [disabled]="submittingDocument()"
                    (click)="submitDocumentRequest(); closeGestionForm()"
                  />
                </div>
              </div>
            </div>
            } @else if (activeGestionForm() === 'complaints') {
            <!-- Formulario de Buzón de Quejas -->
            <div class="gestion-form-content">
              <div class="flex flex-col gap-4">
                <div
                  class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
                >
                  <div class="flex items-start gap-3">
                    <i class="pi pi-info-circle text-yellow-400 text-xl"></i>
                    <div class="flex-1">
                      <p class="text-yellow-300 font-semibold mb-2">
                        Tu privacidad está protegida
                      </p>
                      <p class="text-sm text-gray-300">
                        Todas las quejas son completamente anónimas. Tu
                        identidad no será revelada a menos que lo autorices
                        explícitamente.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Categoría</label
                  >
                  <select
                    pInputText
                    [ngModel]="complaintCategory()"
                    (ngModelChange)="complaintCategory.set($event)"
                    class="w-full"
                  >
                    <option value="work_environment">Ambiente Laboral</option>
                    <option value="harassment">Acoso o Discriminación</option>
                    <option value="safety">Seguridad</option>
                    <option value="management">Supervisión/Gerencia</option>
                    <option value="benefits">Beneficios</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Describe tu queja o sugerencia</label
                  >
                  <textarea
                    pTextarea
                    [ngModel]="complaintText()"
                    (ngModelChange)="complaintText.set($event)"
                    rows="6"
                    placeholder="Describe detalladamente tu queja, sugerencia o inquietud..."
                    class="w-full"
                  ></textarea>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowContact"
                    [ngModel]="allowContact()"
                    (ngModelChange)="allowContact.set($event)"
                  />
                  <label for="allowContact" class="text-sm text-gray-300"
                    >Permitir que RRHH me contacte para seguimiento
                    (opcional)</label
                  >
                </div>
                @if(allowContact()) {
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Forma de Contacto Preferida</label
                  >
                  <select
                    pInputText
                    [ngModel]="contactMethod()"
                    (ngModelChange)="contactMethod.set($event)"
                    class="w-full"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Teléfono</option>
                    <option value="meeting">Reunión Presencial</option>
                  </select>
                </div>
                }
                <div class="flex justify-end gap-2">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    outlined
                    (click)="closeGestionForm()"
                  />
                  <p-button
                    label="Enviar Queja"
                    icon="pi pi-send"
                    severity="warn"
                    type="button"
                    [loading]="submittingComplaint()"
                    [disabled]="!canSubmitComplaint() || submittingComplaint()"
                    (click)="submitComplaint(); closeGestionForm()"
                  />
                </div>
              </div>
            </div>
            } @else if (activeGestionForm() === 'vacations' ||
            activeGestionForm() === 'license' || activeGestionForm() ===
            'personal' || activeGestionForm() === 'maternity') {
            <!-- Formulario de Vacaciones/Licencias -->
            <div class="gestion-form-content">
              <div class="flex flex-col gap-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Tipo de Solicitud</label
                  >
                  <p-dropdown
                    [options]="timeoffTypes()"
                    [(ngModel)]="selectedTimeoffType"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Selecciona el tipo"
                    class="w-full"
                    [disabled]="true"
                  />
                  <input
                    type="hidden"
                    [value]="getTimeoffTypeIdForForm()"
                    #timeoffTypeInput
                  />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm text-gray-400 mb-2"
                      >Fecha Inicio</label
                    >
                    <p-datepicker
                      [(ngModel)]="timeoffStartDate"
                      appendTo="body"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="block text-sm text-gray-400 mb-2"
                      >Fecha Fin</label
                    >
                    <p-datepicker
                      [(ngModel)]="timeoffEndDate"
                      appendTo="body"
                      class="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Notas (opcional)</label
                  >
                  <textarea
                    pInputTextarea
                    [(ngModel)]="timeoffNotes"
                    rows="3"
                    placeholder="Agrega cualquier información adicional..."
                    class="w-full"
                  ></textarea>
                </div>
                <div class="flex justify-end gap-2">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    outlined
                    (click)="closeGestionForm()"
                  />
                  <p-button
                    label="Enviar Solicitud"
                    icon="pi pi-send"
                    type="button"
                    [loading]="submittingTimeoff()"
                    [disabled]="submittingTimeoff()"
                    (click)="submitTimeoffRequest(); closeGestionForm()"
                  />
                </div>
              </div>
            </div>
            }
          </p-dialog>
          }

          <!-- Diálogo de Notificaciones -->
          <p-dialog
            [visible]="showNotificationsDialog()"
            [modal]="true"
            [style]="{ width: '90vw', maxWidth: '600px' }"
            [header]="'Notificaciones'"
            (onHide)="closeNotificationsDialog()"
            [draggable]="false"
            [resizable]="false"
          >
            <div class="flex flex-col gap-4">
              <!-- Header con filtros y acciones -->
              @if (!notificationsService.notificationsApi.isLoading() &&
              myNotifications().length > 0) {
              <div
                class="flex items-center justify-between gap-3 pb-3 border-b border-neutral-700"
              >
                <!-- Filtros -->
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="notificationFilter.set('all')"
                    [ngClass]="{
                      'bg-amber-500/20': notificationFilter() === 'all'
                    }"
                    [class.text-amber-400]="notificationFilter() === 'all'"
                    [class.text-gray-400]="notificationFilter() !== 'all'"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-700/50"
                  >
                    Todas ({{ myNotifications().length }})
                  </button>
                  <button
                    type="button"
                    (click)="notificationFilter.set('unread')"
                    [ngClass]="{
                      'bg-amber-500/20': notificationFilter() === 'unread'
                    }"
                    [class.text-amber-400]="notificationFilter() === 'unread'"
                    [class.text-gray-400]="notificationFilter() !== 'unread'"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-700/50"
                  >
                    No leídas ({{ unreadNotificationsCount() }})
                  </button>
                  <button
                    type="button"
                    (click)="notificationFilter.set('read')"
                    [ngClass]="{
                      'bg-amber-500/20': notificationFilter() === 'read'
                    }"
                    [class.text-amber-400]="notificationFilter() === 'read'"
                    [class.text-gray-400]="notificationFilter() !== 'read'"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-700/50"
                  >
                    Leídas
                  </button>
                </div>
                <!-- Botón marcar todas como leídas -->
                @if (unreadNotificationsCount() > 0) {
                <button
                  type="button"
                  (click)="markAllNotificationsAsRead()"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                  pTooltip="Marcar todas como leídas"
                >
                  <i class="pi pi-check-circle text-sm"></i>
                  <span>Marcar todas</span>
                </button>
                }
              </div>
              } @if (notificationsService.notificationsApi.isLoading()) {
              <div class="flex items-center justify-center py-8">
                <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
              </div>
              } @else if (filteredNotifications().length === 0) {
              <div
                class="flex flex-col items-center justify-center py-8 text-center"
              >
                <i class="pi pi-bell text-4xl text-gray-500 mb-4"></i>
                <p class="text-gray-400">
                  @if (notificationFilter() === 'unread') { No tienes
                  notificaciones no leídas } @else if (notificationFilter() ===
                  'read') { No tienes notificaciones leídas } @else { No tienes
                  notificaciones }
                </p>
              </div>
              } @else {
              <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                @for (notification of filteredNotifications(); track
                notification.id) {
                <div
                  class="p-4 rounded-lg border transition-all"
                  [class.bg-neutral-800]="!notification.is_read"
                  [class.bg-neutral-900]="notification.is_read"
                  [ngClass]="{ 'border-amber-500/30': !notification.is_read }"
                  [class.border-neutral-700]="notification.is_read"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <!-- Icono según tipo de mensaje -->
                        <i
                          [class]="
                            getNotificationIcon(notification.message_type)
                          "
                          class="text-base flex-shrink-0"
                          [class.text-amber-400]="!notification.is_read"
                          [class.text-gray-500]="notification.is_read"
                        ></i>
                        <h4 class="font-semibold text-white m-0 flex-1">
                          {{
                            notification.title ||
                              getNotificationTitle(notification.message_type)
                          }}
                        </h4>
                        @if (!notification.is_read) {
                        <span
                          class="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"
                        ></span>
                        }
                      </div>
                      <p class="text-gray-300 text-sm m-0 mb-2">
                        {{ notification.message }}
                      </p>
                      <div class="flex items-center gap-3">
                        <p class="text-gray-500 text-xs m-0">
                          {{ notification.created_at | date : 'short' }}
                        </p>
                        @if (notification.message_type) {
                        <span class="text-gray-600 text-xs">
                          {{
                            getNotificationTypeLabel(notification.message_type)
                          }}
                        </span>
                        }
                      </div>
                    </div>
                    @if (!notification.is_read) {
                    <button
                      type="button"
                      (click)="markNotificationAsRead(notification.id)"
                      class="p-2 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0"
                      pTooltip="Marcar como leída"
                    >
                      <i
                        class="pi pi-check text-sm text-gray-400 hover:text-amber-400"
                      ></i>
                    </button>
                    }
                  </div>
                </div>
                }
              </div>
              }
            </div>
          </p-dialog>
        </div>
        } @if (activeTabIndex() === 2) {
        <!-- Tab 2: Mi Perfil -->
        <div class="tab-content">
          <p-card>
            <ng-template #title>
              <div class="flex items-center justify-between w-full">
                <span>Mi Información Personal</span>
                <p-button
                  label="Editar Datos"
                  icon="pi pi-pencil"
                  size="small"
                  outlined
                  (click)="toggleEditMode()"
                  [label]="editMode() ? 'Cancelar' : 'Editar Datos'"
                />
              </div>
            </ng-template>
            @if (currentEmployee()) {
            <div class="flex flex-col gap-6">
              <!-- Información no editable -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-gray-400">Nombre Completo</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.first_name }}
                    {{ currentEmployee()?.middle_name }}
                    {{ currentEmployee()?.father_name }}
                    {{ currentEmployee()?.mother_name }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Cargo</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.position?.name || 'Sin cargo' }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Sucursal</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Departamento</label>
                  <p class="text-white font-semibold">
                    {{
                      currentEmployee()?.department?.name || 'Sin departamento'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Fecha de Ingreso</label>
                  <p class="text-white font-semibold">
                    {{ currentEmployee()?.start_date | date : 'fullDate' }}
                  </p>
                </div>
                <!-- Salario Mensual oculto -->
              </div>

              <!-- Información editable -->
              <div class="border-t border-neutral-700 pt-6">
                <h3 class="text-lg font-semibold text-white mb-4">
                  Datos de Contacto
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @if (!editMode()) {
                  <div>
                    <label class="text-sm text-gray-400">Email Personal</label>
                    <p class="text-white font-semibold">
                      {{ currentEmployee()?.email || 'Sin email' }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm text-gray-400">Email Laboral</label>
                    <p class="text-white font-semibold">
                      {{ currentEmployee()?.work_email || 'Sin email' }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm text-gray-400">Teléfono</label>
                    <p class="text-white font-semibold">
                      {{ currentEmployee()?.phone_number || 'Sin teléfono' }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm text-gray-400">Dirección</label>
                    <p class="text-white font-semibold">
                      {{ currentEmployee()?.address || 'Sin dirección' }}
                    </p>
                  </div>
                  } @else {
                  <div>
                    <label class="text-sm text-gray-400 mb-2 block"
                      >Email Personal</label
                    >
                    <input
                      pInputText
                      [ngModel]="editEmail()"
                      (ngModelChange)="editEmail.set($event)"
                      placeholder="correo@ejemplo.com"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-sm text-gray-400 mb-2 block"
                      >Email Laboral</label
                    >
                    <input
                      pInputText
                      [ngModel]="editWorkEmail()"
                      (ngModelChange)="editWorkEmail.set($event)"
                      placeholder="correo@empresa.com"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-sm text-gray-400 mb-2 block"
                      >Teléfono</label
                    >
                    <input
                      pInputText
                      [ngModel]="editPhone()"
                      (ngModelChange)="editPhone.set($event)"
                      placeholder="+507 1234-5678"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-sm text-gray-400 mb-2 block"
                      >Dirección</label
                    >
                    <input
                      pInputText
                      [ngModel]="editAddress()"
                      (ngModelChange)="editAddress.set($event)"
                      placeholder="Calle, Ciudad, Provincia"
                      class="w-full"
                    />
                  </div>
                  <div class="md:col-span-2 flex justify-end gap-2 mt-4">
                    <p-button
                      label="Cancelar"
                      severity="secondary"
                      outlined
                      (click)="cancelEdit()"
                    />
                    <p-button
                      label="Guardar Cambios"
                      icon="pi pi-save"
                      (click)="savePersonalData()"
                      [loading]="savingPersonalData()"
                    />
                  </div>
                  }
                </div>
              </div>
            </div>
            }
          </p-card>
        </div>
        } @if (activeTabIndex() === 3) {
        <!-- Tab 3: Mis Marcaciones -->
        <div class="tab-content">
          <p-card>
            <ng-template #title>
              <div class="flex items-center justify-between w-full">
                <div>
                  <h3 class="text-xl font-bold text-white m-0">
                    Calendario de Marcaciones
                  </h3>
                  <p class="text-sm text-gray-400 m-0 mt-1">
                    {{ calendarMonth() | date : 'MMMM yyyy' }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <!-- Los controles del calendario ahora están dentro del componente pt-calendar -->
                </div>
              </div>
            </ng-template>
            <ng-template #subtitle
              >Visualiza tus marcaciones en formato calendario</ng-template
            >

            @if (monthTimelogsApi.isLoading()) {
            <div class="flex items-center justify-center py-12">
              <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
            </div>
            } @else {
            <!-- Calendario bonito usando pt-calendar -->
            <pt-calendar
              [markers]="timelogMarkers()"
              [markerTpl]="timelogMarkerTemplate"
              (monthChange)="onCalendarMonthChange($event)"
            />

            <!-- Template para mostrar los markers en el calendario tipo mapa -->
            <ng-template #timelogMarkerTemplate let-markers>
              <div class="flex flex-col gap-1.5 w-full h-full">
                @for (marker of markers; track marker.data.day) { @let log =
                marker.data; @let hasEntry = log?.entry; @let hasExit =
                log?.exit; @let hasLunchStart = log?.lunch_start; @let
                hasLunchEnd = log?.lunch_end; @let hasDelay = log?.delay &&
                typeof log?.delay === 'number'; @let workedHours = log?.entry &&
                log?.exit ? calculateWorkedHours(log.entry.date, log.exit.date)
                : null; @let isComplete = hasEntry && hasExit; @let isIncomplete
                = hasEntry && !hasExit;

                <div
                  class="flex flex-col gap-1.5 p-2 rounded-lg shadow-md border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg w-full min-h-[80px]"
                  [class.bg-gradient-to-br]="true"
                  [ngClass]="{
                    'from-green-600/30 to-green-500/20':
                      isComplete && !hasDelay,
                    'from-yellow-600/30 to-yellow-500/20': isIncomplete,
                    'from-red-600/30 to-red-500/20': hasDelay
                  }"
                  [class.border-green-400]="isComplete && !hasDelay"
                  [class.border-yellow-400]="isIncomplete"
                  [class.border-red-400]="hasDelay"
                >
                  <!-- Header con fecha y estado -->
                  <div
                    class="flex items-center justify-between mb-1 pb-1 border-b border-white/10"
                  >
                    <span
                      class="text-[10px] font-bold uppercase tracking-wide text-white/80"
                    >
                      {{ log.day | panamaDate : 'EEE d' }}
                    </span>
                    @if (isComplete) {
                    <span
                      class="text-[9px] bg-green-500/50 text-white px-1.5 py-0.5 rounded-full font-semibold"
                    >
                      ✓ Completo
                    </span>
                    } @else if (isIncomplete) {
                    <span
                      class="text-[9px] bg-yellow-500/50 text-white px-1.5 py-0.5 rounded-full font-semibold"
                    >
                      ⚠ Pendiente
                    </span>
                    } @if (hasDelay) {
                    <span
                      class="text-[9px] bg-red-500/70 text-white px-1.5 py-0.5 rounded-full font-semibold animate-pulse"
                    >
                      ⏰ {{ log.delay }}m
                    </span>
                    }
                  </div>

                  <!-- Timeline visual tipo mapa -->
                  <div class="flex flex-col gap-1.5">
                    <!-- Entrada -->
                    @if (hasEntry) {
                    <div
                      class="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-green-400/30"
                    >
                      <div
                        class="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/30 border-2 border-green-400"
                      >
                        <i class="pi pi-sign-in text-[10px] text-green-300"></i>
                      </div>
                      <div class="flex-1">
                        <div class="text-[11px] text-gray-300 font-medium">
                          Entrada
                        </div>
                        <div class="text-[13px] text-white font-bold">
                          {{ log.entry.date | panamaDate : 'HH:mm' }}
                        </div>
                      </div>
                      @if (log.entry.branch?.name) {
                      <div
                        class="text-[9px] text-gray-400 truncate max-w-[60px]"
                      >
                        {{ log.entry.branch.name }}
                      </div>
                      }
                    </div>
                    }

                    <!-- Almuerzo -->
                    @if (hasLunchStart || hasLunchEnd) {
                    <div
                      class="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-amber-400/30"
                    >
                      <div
                        class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/30 border-2 border-amber-400"
                      >
                        <i class="pi pi-clock text-[10px] text-amber-300"></i>
                      </div>
                      <div class="flex-1">
                        <div class="text-[11px] text-gray-300 font-medium">
                          Almuerzo
                        </div>
                        <div class="flex items-center gap-2 text-[12px]">
                          @if (hasLunchStart) {
                          <span class="text-white font-semibold">{{
                            log.lunch_start.date | panamaDate : 'HH:mm'
                          }}</span>
                          } @if (hasLunchStart && hasLunchEnd) {
                          <span class="text-gray-500">→</span>
                          } @if (hasLunchEnd) {
                          <span class="text-white font-semibold">{{
                            log.lunch_end.date | panamaDate : 'HH:mm'
                          }}</span>
                          }
                        </div>
                      </div>
                    </div>
                    }

                    <!-- Salida -->
                    @if (hasExit) {
                    <div
                      class="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-blue-400/30"
                    >
                      <div
                        class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/30 border-2 border-blue-400"
                      >
                        <i class="pi pi-sign-out text-[10px] text-blue-300"></i>
                      </div>
                      <div class="flex-1">
                        <div class="text-[11px] text-gray-300 font-medium">
                          Salida
                        </div>
                        <div class="text-[13px] text-white font-bold">
                          {{ log.exit.date | panamaDate : 'HH:mm' }}
                        </div>
                      </div>
                      @if (log.exit.branch?.name) {
                      <div
                        class="text-[9px] text-gray-400 truncate max-w-[60px]"
                      >
                        {{ log.exit.branch.name }}
                      </div>
                      }
                    </div>
                    }

                    <!-- Horas trabajadas -->
                    @if (workedHours) {
                    <div
                      class="flex items-center justify-center gap-1.5 mt-1 pt-1.5 border-t border-white/10"
                    >
                      <i class="pi pi-hourglass text-amber-400 text-xs"></i>
                      <span class="text-[12px] font-bold text-amber-300">{{
                        workedHours
                      }}</span>
                      <span class="text-[10px] text-gray-400">horas</span>
                    </div>
                    }
                  </div>
                </div>
                }
              </div>
            </ng-template>
            }
          </p-card>
        </div>
        } @if (activeTabIndex() === 4) {
        <!-- Tab 4: Mis Tardanzas -->
        <div class="tab-content">
          <p-card>
            <div class="overflow-x-auto">
              <p-table
                [value]="myLates()"
                [rows]="10"
                [rowsPerPageOptions]="[10, 20, 50]"
                paginator
                paginatorDropdownAppendTo="body"
                styleClass="p-datatable-sm md:p-datatable-lg"
                [scrollable]="true"
                scrollHeight="400px"
                [responsiveLayout]="'scroll'"
              >
                <ng-template #header>
                  <tr>
                    <th>Fecha</th>
                    <th>Horario Programado</th>
                    <th>Hora de Entrada</th>
                    <th>Minutos de Retraso</th>
                  </tr>
                </ng-template>
                <ng-template #body let-late>
                  <tr>
                    <td>{{ late.date | panamaDate : 'fullDate' }}</td>
                    <td>{{ late.scheduled_time || '-' }}</td>
                    <td>{{ late.actual_time || '-' }}</td>
                    <td>
                      <span
                        class="font-semibold"
                        [class.text-yellow-400]="late.minutes <= 10"
                        [class.text-red-400]="late.minutes > 10"
                      >
                        {{ late.minutes }} min
                      </span>
                    </td>
                  </tr>
                </ng-template>
                <ng-template #emptymessage>
                  <tr>
                    <td colspan="4">
                      <div
                        class="flex flex-col items-center justify-center gap-4 py-8"
                      >
                        <i
                          class="pi pi-check-circle text-green-400 text-4xl"
                        ></i>
                        <p class="text-gray-400">
                          ¡Excelente! No tienes tardanzas este mes
                        </p>
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          </p-card>
        </div>
        }

        <!-- Tab 4: Incapacidades (mantener para compatibilidad, pero redirigir a Gestiones) -->
        @if (false) {
        <div class="tab-content" style="display: none;">
          <p-card class="bg-neutral-800 border-neutral-700">
            <ng-template #title>Subir Incapacidad</ng-template>
            <ng-template #subtitle
              >Carga documentos de incapacidad médica</ng-template
            >
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Inicio de Incapacidad</label
                  >
                  <p-datepicker
                    [(ngModel)]="disabilityStartDate"
                    appendTo="body"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2"
                    >Fin de Incapacidad</label
                  >
                  <p-datepicker
                    [(ngModel)]="disabilityEndDate"
                    appendTo="body"
                    class="w-full"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Descripción (opcional)</label
                >
                <textarea
                  id="disability-description"
                  pInputTextarea
                  [(ngModel)]="disabilityDescription"
                  rows="3"
                  placeholder="Describe el motivo de la incapacidad..."
                  class="w-full"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Documento de Incapacidad</label
                >
                <p-fileUpload
                  mode="basic"
                  accept="image/*,.pdf"
                  maxFileSize="5000000"
                  [auto]="false"
                  chooseLabel="Seleccionar Archivo"
                  (onSelect)="onFileSelect($event)"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 mt-2">
                  Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
                </p>
              </div>
              <div class="flex justify-end">
                <p-button
                  label="Subir Incapacidad"
                  icon="pi pi-upload"
                  type="button"
                  [loading]="uploadingDisability()"
                  [disabled]="uploadingDisability()"
                  (click)="uploadDisability()"
                />
              </div>
            </div>

            <!-- Lista de incapacidades subidas -->
            <div class="mt-6">
              <h3 class="text-lg font-semibold text-white mb-4">
                Mis Incapacidades
              </h3>
              <div class="overflow-x-auto">
                <p-table
                  [value]="myDisabilities()"
                  [rows]="10"
                  paginator
                  [loading]="disabilitiesApi.isLoading()"
                  styleClass="p-datatable-sm md:p-datatable-lg"
                  [scrollable]="true"
                  scrollHeight="400px"
                  [responsiveLayout]="'scroll'"
                >
                  <ng-template #header>
                    <tr>
                      <th>Inicio de Incapacidad</th>
                      <th>Fin de Incapacidad</th>
                      <th>Días</th>
                      <th>Estado</th>
                      <th>Documento</th>
                    </tr>
                  </ng-template>
                  <ng-template #body let-disability>
                    <tr>
                      <td>{{ disability.start_date | date : 'mediumDate' }}</td>
                      <td>{{ disability.end_date | date : 'mediumDate' }}</td>
                      <td>
                        {{
                          calculateDays(
                            disability.start_date,
                            disability.end_date
                          )
                        }}
                      </td>
                      <td>
                        @if (disability.status === 'rejected' &&
                        (disability.rejection_comment ||
                        disability.review_notes)) {
                        <span
                          class="px-2 py-1 rounded text-xs font-semibold cursor-help"
                          [class.bg-yellow-500]="
                            disability.status === 'pending'
                          "
                          [class.bg-green-500]="
                            disability.status === 'approved'
                          "
                          [class.bg-red-500]="disability.status === 'rejected'"
                          [pTooltip]="
                            'Motivo: ' +
                            (disability.rejection_comment ||
                              disability.review_notes ||
                              'Sin motivo especificado')
                          "
                          tooltipPosition="top"
                        >
                          {{
                            disability.status === 'pending'
                              ? 'Pendiente'
                              : disability.status === 'approved'
                              ? 'Aprobada'
                              : 'Rechazada'
                          }}
                        </span>
                        } @else {
                        <span
                          class="px-2 py-1 rounded text-xs font-semibold"
                          [class.bg-yellow-500]="
                            disability.status === 'pending'
                          "
                          [class.bg-green-500]="
                            disability.status === 'approved'
                          "
                          [class.bg-red-500]="disability.status === 'rejected'"
                        >
                          {{
                            disability.status === 'pending'
                              ? 'Pendiente'
                              : disability.status === 'approved'
                              ? 'Aprobada'
                              : 'Rechazada'
                          }}
                        </span>
                        }
                      </td>
                      <td>
                        @if(disability.document_url) {
                        <p-button
                          icon="pi pi-download"
                          severity="secondary"
                          size="small"
                          (click)="downloadDocument(disability.document_url)"
                          pTooltip="Descargar documento"
                          tooltipPosition="top"
                        />
                        }
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            </div>
          </p-card>
        </div>
        }

        <!-- Tab 5: Solicitar Documentos (mantener para compatibilidad, pero redirigir a Gestiones) -->
        @if (false) {
        <div class="tab-content" style="display: none;">
          <p-card>
            <ng-template #title>Solicitar Documentos</ng-template>
            <ng-template #subtitle
              >Solicita cartas de trabajo u otros documentos</ng-template
            >
            <div class="flex flex-col gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Tipo de Documento</label
                >
                <select pInputText [(ngModel)]="documentType" class="w-full">
                  <option value="work_letter">Carta de Trabajo</option>
                  <option value="salary_certificate">
                    Certificado de Salario
                  </option>
                  <option value="employment_certificate">
                    Certificado de Empleo
                  </option>
                  <option value="other">Otro</option>
                </select>
              </div>
              @if(documentType() === 'other') {
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Especificar Documento</label
                >
                <input
                  pInputText
                  [(ngModel)]="customDocumentType"
                  placeholder="Describe el documento que necesitas"
                  class="w-full"
                />
              </div>
              }
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Motivo o Uso del Documento</label
                >
                <textarea
                  pInputTextarea
                  [(ngModel)]="documentReason"
                  rows="3"
                  placeholder="Ej: Para trámite bancario, visa, etc."
                  class="w-full"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Fecha Requerida (opcional)</label
                >
                <p-datepicker
                  [(ngModel)]="documentRequiredDate"
                  appendTo="body"
                  class="w-full"
                />
              </div>
              <div class="flex justify-end">
                <p-button
                  label="Solicitar Documento"
                  icon="pi pi-send"
                  [loading]="submittingDocument()"
                  (click)="submitDocumentRequest()"
                />
              </div>
            </div>

            <!-- Lista de solicitudes -->
            <div class="mt-6">
              <h3 class="text-lg font-semibold text-white mb-4">
                Mis Solicitudes
              </h3>
              <div class="overflow-x-auto">
                <p-table
                  [value]="myDocumentRequests()"
                  [rows]="10"
                  paginator
                  [loading]="documentRequestsApi.isLoading()"
                  styleClass="p-datatable-sm md:p-datatable-lg"
                  [scrollable]="true"
                  scrollHeight="400px"
                  [responsiveLayout]="'scroll'"
                >
                  <ng-template #header>
                    <tr>
                      <th>Fecha de Solicitud</th>
                      <th>Tipo de Documento</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </ng-template>
                  <ng-template #body let-request>
                    <tr>
                      <td>{{ request.created_at | date : 'mediumDate' }}</td>
                      <td>{{ getDocumentTypeLabel(request.document_type) }}</td>
                      <td>{{ request.reason || '-' }}</td>
                      <td>
                        <span
                          class="px-2 py-1 rounded text-xs font-semibold"
                          [class.bg-yellow-500]="request.status === 'pending'"
                          [class.bg-green-500]="request.status === 'approved'"
                          [class.bg-red-500]="request.status === 'rejected'"
                        >
                          {{
                            request.status === 'pending'
                              ? 'Pendiente'
                              : request.status === 'approved'
                              ? 'Aprobada'
                              : 'Rechazada'
                          }}
                        </span>
                      </td>
                      <td>
                        @if(request.status === 'approved' &&
                        request.document_url) {
                        <p-button
                          icon="pi pi-download"
                          severity="success"
                          size="small"
                          (click)="downloadDocument(request.document_url)"
                          pTooltip="Descargar documento"
                        />
                        }
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            </div>
          </p-card>
        </div>
        }

        <!-- Tab 6: Buzón de Quejas (mantener para compatibilidad, pero redirigir a Gestiones) -->
        @if (false) {
        <div class="tab-content" style="display: none;">
          <p-card>
            <ng-template #title>Buzón de Sugerencias Anónimas</ng-template>
            <ng-template #subtitle
              >Expresa tus inquietudes de forma anónima y
              confidencial</ng-template
            >
            <div class="flex flex-col gap-4">
              <div
                class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i class="pi pi-info-circle text-yellow-400 text-xl"></i>
                  <div class="flex-1">
                    <p class="text-yellow-300 font-semibold mb-2">
                      Tu privacidad está protegida
                    </p>
                    <p class="text-sm text-gray-300">
                      Todas las quejas son completamente anónimas. Tu identidad
                      no será revelada a menos que lo autorices explícitamente.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Categoría</label
                >
                <select
                  pInputText
                  [ngModel]="complaintCategory()"
                  (ngModelChange)="complaintCategory.set($event)"
                  class="w-full"
                >
                  <option value="work_environment">Ambiente Laboral</option>
                  <option value="harassment">Acoso o Discriminación</option>
                  <option value="safety">Seguridad</option>
                  <option value="management">Supervisión/Gerencia</option>
                  <option value="benefits">Beneficios</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Describe tu queja o sugerencia</label
                >
                <textarea
                  pTextarea
                  [ngModel]="complaintText()"
                  (ngModelChange)="complaintText.set($event)"
                  rows="6"
                  placeholder="Describe detalladamente tu queja, sugerencia o inquietud..."
                  class="w-full"
                ></textarea>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowContact"
                  [ngModel]="allowContact()"
                  (ngModelChange)="allowContact.set($event)"
                />
                <label for="allowContact" class="text-sm text-gray-300"
                  >Permitir que RRHH me contacte para seguimiento
                  (opcional)</label
                >
              </div>
              @if(allowContact()) {
              <div>
                <label class="block text-sm text-gray-400 mb-2"
                  >Forma de Contacto Preferida</label
                >
                <select
                  pInputText
                  [ngModel]="contactMethod()"
                  (ngModelChange)="contactMethod.set($event)"
                  class="w-full"
                >
                  <option value="email">Email</option>
                  <option value="phone">Teléfono</option>
                  <option value="meeting">Reunión Presencial</option>
                </select>
              </div>
              }
              <div class="flex justify-end">
                <p-button
                  label="Enviar Queja"
                  icon="pi pi-send"
                  severity="warn"
                  [loading]="submittingComplaint()"
                  [disabled]="!canSubmitComplaint() || submittingComplaint()"
                  (click)="submitComplaint()"
                />
              </div>
            </div>

            <!-- Lista de quejas/conversaciones enviadas -->
            <div class="mt-6">
              <h3 class="text-lg font-semibold text-white mb-4">
                Mis Quejas y Conversaciones
              </h3>
              @if(myComplaints().length === 0 && !complaintsApi.isLoading()) {
              <div class="text-center py-8">
                <i class="pi pi-inbox text-4xl text-gray-500 mb-4"></i>
                <p class="text-gray-400">
                  No has enviado ninguna queja todavía.
                </p>
              </div>
              } @else {
              <div class="overflow-x-auto">
                <p-table
                  [value]="myComplaints()"
                  [rows]="10"
                  paginator
                  [loading]="complaintsApi.isLoading()"
                  styleClass="p-datatable-sm md:p-datatable-lg"
                  [scrollable]="true"
                  scrollHeight="400px"
                  [responsiveLayout]="'scroll'"
                >
                  <ng-template #header>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Estado</th>
                      <th>Última Actividad</th>
                      <th>Acciones</th>
                    </tr>
                  </ng-template>
                  <ng-template #body let-complaint>
                    <tr
                      [ngClass]="{
                        'bg-amber-500/10': hasUnreadMessages(complaint)
                      }"
                    >
                      <td>{{ complaint.created_at | date : 'mediumDate' }}</td>
                      <td>
                        {{ getComplaintCategoryLabel(complaint.category) }}
                      </td>
                      <td>
                        <span
                          class="px-2 py-1 rounded text-xs font-semibold"
                          [class.bg-yellow-500]="complaint.status === 'pending'"
                          [class.bg-green-500]="complaint.status === 'resolved'"
                          [class.bg-blue-500]="complaint.status === 'in_review'"
                        >
                          {{
                            complaint.status === 'pending'
                              ? 'Pendiente'
                              : complaint.status === 'resolved'
                              ? 'Resuelta'
                              : 'En Revisión'
                          }}
                        </span>
                      </td>
                      <td class="text-sm text-gray-400">
                        {{
                          complaint.last_message_at || complaint.updated_at
                            | date : 'short'
                        }}
                        @if(hasUnreadMessages(complaint)) {
                        <i
                          class="pi pi-circle-fill text-amber-400 text-xs ml-2"
                        ></i>
                        }
                      </td>
                      <td>
                        <p-button
                          icon="pi pi-comments"
                          severity="info"
                          size="small"
                          [label]="
                            hasUnreadMessages(complaint)
                              ? 'Ver Conversación (Nuevo)'
                              : 'Ver Conversación'
                          "
                          (click)="viewResponse(complaint)"
                          pTooltip="Abrir conversación"
                        />
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
              }
            </div>
          </p-card>
        </div>
        }
      </p-tabs>
    </div>

    <!-- Dialog para conversación bidireccional -->
    @if(conversationDialogVisible()) {
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      (click)="closeConversation()"
    >
      <div
        class="bg-neutral-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="p-6 border-b border-neutral-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              <i class="pi pi-comments text-amber-400"></i>
              Conversación
            </h3>
            <p-button
              icon="pi pi-times"
              severity="secondary"
              text
              rounded
              (onClick)="closeConversation()"
            />
          </div>
          @if(selectedComplaint()) {
          <div class="flex flex-wrap gap-4 text-sm">
            <div>
              <span class="text-gray-400">Categoría: </span>
              <span class="text-white">{{
                getComplaintCategoryLabel(selectedComplaint()!.category)
              }}</span>
            </div>
            <div>
              <span class="text-gray-400">Estado: </span>
              <span class="text-white">{{
                selectedComplaint()!.status === 'pending'
                  ? 'Pendiente'
                  : selectedComplaint()!.status === 'in_review'
                  ? 'En Revisión'
                  : 'Resuelto'
              }}</span>
            </div>
          </div>
          }
        </div>

        <!-- Mensajes -->
        <div
          class="flex-1 overflow-y-auto p-6 space-y-4"
          style="max-height: 400px;"
        >
          @if(complaintMessagesApi.isLoading()) {
          <div class="text-center py-8 text-gray-400">Cargando mensajes...</div>
          } @else if(conversationMessages().length === 0) {
          <div class="text-center py-8">
            <p class="text-gray-400">No hay mensajes todavía.</p>
            <p class="text-sm text-gray-500 mt-2">
              {{ selectedComplaint()?.complaint }}
            </p>
          </div>
          } @else { @for(message of conversationMessages(); track message.id) {
          <div
            class="flex"
            [ngClass]="{
              'justify-end': message.sender_type === 'employee',
              'justify-start': message.sender_type === 'hr'
            }"
          >
            <div
              class="max-w-[70%] rounded-lg p-4"
              [ngClass]="{
                'bg-amber-500/20': message.sender_type === 'employee',
                border: message.sender_type === 'employee',
                'border-amber-500/30': message.sender_type === 'employee',
                'bg-neutral-700': message.sender_type === 'hr',
                'border-neutral-600': message.sender_type === 'hr'
              }"
            >
              <div class="flex items-center gap-2 mb-2">
                @if(message.sender_type === 'employee') {
                <i class="pi pi-user text-amber-400"></i>
                <span class="text-amber-300 font-semibold text-sm">Tú</span>
                } @else {
                <i class="pi pi-building text-gray-400"></i>
                <span class="text-gray-300 font-semibold text-sm">RRHH</span>
                }
                <span class="text-xs text-gray-500">
                  {{ message.created_at | date : 'short' }}
                </span>
              </div>
              <p class="text-white text-sm whitespace-pre-wrap">
                {{ message.message }}
              </p>
            </div>
          </div>
          } }
        </div>

        <!-- Input de respuesta -->
        @if(selectedComplaint()) {
        <div class="p-6 border-t border-neutral-700">
          <div class="flex flex-col gap-3">
            <textarea
              pInputTextarea
              [ngModel]="replyMessage()"
              (ngModelChange)="replyMessage.set($event)"
              rows="3"
              placeholder="Escribe tu respuesta..."
              class="w-full"
            ></textarea>
            <div class="flex justify-end gap-2">
              <p-button
                label="Enviar"
                icon="pi pi-send"
                [loading]="sendingReply()"
                [disabled]="!replyMessage().trim()"
                (onClick)="sendReply()"
              />
            </div>
          </div>
        </div>
        }
      </div>
    </div>
    }

    <p-toast />
  `,
  styles: `
    /* Estilos para tarjetas de Gestiones */
    ::ng-deep .gestion-card {
      cursor: pointer;
      transition: all 0.2s ease;
      background: #1f2937 !important;
      border: 1px solid #374151 !important;
    }

    ::ng-deep .gestion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      border-color: #3b82f6 !important;
    }

    .gestion-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
    }

    .gestion-card-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.1);
    }

    .gestion-card-icon i {
      font-size: 2rem;
      color: #3b82f6;
    }

    .gestion-card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
    }

    .gestion-card-description {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0;
      line-height: 1.4;
    }

    .gestion-form-content {
      padding: 1rem 0;
    }


    :host {
      display: block;
      background: #000000;
      min-height: calc(100vh - 64px);
      padding: 0;
    }

    /* Asegurar que el contenido de los tabpanels sea visible */
    ::ng-deep .p-tabs .p-tabpanel-content {
      background: transparent;
    }

    /* Asegurar que el contenedor principal tenga el fondo correcto */
    ::ng-deep .p-tabs {
      background: transparent !important;
    }

    /* Asegurar que el contenido dentro del contenedor principal sea visible */
    ::ng-deep .p-tabs .p-tabpanel {
      background: transparent !important;
    }

    /* Responsive container */
    @media (max-width: 640px) {
      :host {
        padding: 0 0.5rem;
      }
    }

    ::ng-deep .dashboard-welcome-card .p-card-body {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
      border: 1px solid rgba(251, 191, 36, 0.2);
    }

    ::ng-deep .dashboard-stat-card .p-card-body {
      padding: 1.25rem;
    }

    @media (max-width: 640px) {
      ::ng-deep .dashboard-stat-card .p-card-body {
        padding: 1rem;
      }
    }

    ::ng-deep .dashboard-stat-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    ::ng-deep .dashboard-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
    }

    /* Responsive tabs */
    ::ng-deep .p-tabs .p-tablist {
      overflow-x: auto;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
    }

    ::ng-deep .p-tabs .p-tab {
      white-space: nowrap;
      min-width: fit-content;
    }

    /* Responsive tables */
    ::ng-deep .p-datatable .p-datatable-thead > tr > th,
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.75rem 0.5rem;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      ::ng-deep .p-datatable .p-datatable-thead > tr > th,
      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.5rem 0.375rem;
        font-size: 0.75rem;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      ::ng-deep .p-datatable .p-datatable-scrollable-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Smaller paginator on mobile */
      ::ng-deep .p-paginator {
        font-size: 0.75rem;
      }

      ::ng-deep .p-paginator .p-paginator-pages .p-paginator-page {
        min-width: 2rem;
        height: 2rem;
      }
    }

    /* Responsive cards */
    ::ng-deep .p-card {
      border-radius: 0.5rem;
    }

    /* Estilos para cards con bg-neutral-800 (igual que HR Disabilities) */
    ::ng-deep .p-card.bg-neutral-800 {
      background: #262626 !important;
      border-color: #404040 !important;
    }

    ::ng-deep .p-card.bg-neutral-800 .p-card-body {
      background: #262626 !important;
    }

    ::ng-deep .p-card.bg-neutral-800 .p-card-header {
      background: #262626 !important;
      border-bottom-color: #404040 !important;
    }

    ::ng-deep .p-card.bg-neutral-800 .p-card-title {
      color: #e5e7eb !important;
    }

    ::ng-deep .p-card.bg-neutral-800 .p-card-subtitle {
      color: #9ca3af !important;
    }

    @media (max-width: 640px) {
      ::ng-deep .p-card .p-card-body {
        padding: 1rem;
      }

      ::ng-deep .p-card .p-card-header {
        padding: 0.75rem;
      }

      ::ng-deep .p-card .p-card-title {
        font-size: 1rem;
      }
    }

    /* Touch-friendly buttons */
    @media (max-width: 640px) {
      ::ng-deep .p-button {
        min-height: 44px;
        min-width: 44px;
        padding: 0.75rem 1rem;
      }

      ::ng-deep .p-inputtext,
      ::ng-deep .p-inputtextarea,
      ::ng-deep .p-datepicker input {
        min-height: 44px;
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }

    /* Estilos para textarea - igual que otros inputs */
    ::ng-deep textarea.p-inputtextarea,
    ::ng-deep .p-inputtextarea,
    ::ng-deep textarea[pinputtextarea],
    ::ng-deep textarea.p-inputtextarea.p-component {
      width: 100% !important;
      padding: 1.125rem 1.25rem !important;
      background: #262626 !important;
      border: 1px solid #404040 !important;
      border-radius: 0.375rem !important;
      color: #e5e7eb !important;
      font-size: 0.875rem !important;
      transition: all 0.2s ease !important;
      font-family: inherit !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      line-height: 1.6 !important;
      min-height: auto !important;
      resize: vertical !important;
    }

    ::ng-deep textarea.p-inputtextarea:focus,
    ::ng-deep .p-inputtextarea:focus,
    ::ng-deep textarea[pinputtextarea]:focus {
      outline: none !important;
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2) !important;
    }

    ::ng-deep textarea.p-inputtextarea::placeholder,
    ::ng-deep .p-inputtextarea::placeholder,
    ::ng-deep textarea[pinputtextarea]::placeholder {
      color: rgba(156, 163, 175, 0.6) !important;
    }

    ::ng-deep textarea.p-inputtextarea:hover:not(:disabled),
    ::ng-deep .p-inputtextarea:hover:not(:disabled),
    ::ng-deep textarea[pinputtextarea]:hover:not(:disabled) {
      border-color: rgba(107, 114, 128, 0.7) !important;
    }

    /* Estilos para input-container (igual que otros formularios) */
    .input-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .input-container label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #e5e7eb;
    }

    /* Estilos consistentes para inputs */
    ::ng-deep .input-container .p-inputtext,
    ::ng-deep .input-container .p-inputnumber-input,
    ::ng-deep .input-container .p-select,
    ::ng-deep .input-container .p-datepicker input {
      background: #262626 !important;
      border: 1px solid #404040 !important;
      color: #e5e7eb !important;
      border-radius: 0.375rem !important;
    }

    ::ng-deep .input-container .p-inputtext:focus,
    ::ng-deep .input-container .p-inputnumber-input:focus,
    ::ng-deep .input-container .p-select.p-focus,
    ::ng-deep .input-container .p-datepicker.p-focus input {
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2) !important;
    }

    /* Asegurar que el textarea tenga el mismo estilo que los datepickers */
    ::ng-deep .p-inputtextarea.p-component,
    ::ng-deep textarea.p-inputtextarea.p-component {
      background: #262626 !important;
      border: 1px solid #404040 !important;
      color: #e5e7eb !important;
      padding: 1rem 1.125rem !important;
    }

    /* Responsive forms */
    @media (max-width: 640px) {
      .grid {
        grid-template-columns: 1fr !important;
      }
    }

    /* Dialog responsive */
    @media (max-width: 640px) {
      ::ng-deep .p-dialog {
        width: 95vw !important;
        max-width: 95vw !important;
        margin: 0.5rem;
      }

      ::ng-deep .p-dialog .p-dialog-content {
        padding: 1rem;
        max-height: calc(100vh - 120px);
      }
    }

    /* Estilos para contenido de tabs usando @if */
    .tab-content {
      display: block;
      visibility: visible;
      opacity: 1;
      padding: 1rem 0;
      min-height: 400px;
    }

    /* Scrollable content */
    ::ng-deep .p-tabpanel {
      max-width: 100%;
      overflow-x: auto;
      padding: 1rem 0;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    ::ng-deep .p-tabpanel .p-tabpanel-content {
      padding: 0;
      min-height: 200px;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Asegurar que el tabpanel activo sea visible */
    ::ng-deep .p-tabpanel.p-tabpanel-active,
    ::ng-deep .p-tabpanel[aria-hidden="false"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Asegurar que todos los tabpanels sean visibles cuando están activos */
    ::ng-deep .p-tabs .p-tabpanel:not([aria-hidden="true"]) {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Asegurar que las tarjetas de gestiones sean visibles */
    ::ng-deep .gestion-card .p-card-body {
      background: #1f2937 !important;
      border: 1px solid #374151 !important;
      color: #ffffff !important;
    }

    ::ng-deep .gestion-card .p-card-body * {
      color: inherit !important;
    }

    /* Asegurar visibilidad del contenido del tabpanel de Gestiones */
    ::ng-deep .p-tabpanel[value="1"],
    ::ng-deep .p-tabpanel[value="1"][aria-hidden="false"] {
      background: transparent !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      height: auto !important;
      min-height: 400px !important;
    }

    ::ng-deep .p-tabpanel[value="1"] .p-tabpanel-content,
    ::ng-deep .p-tabpanel[value="1"][aria-hidden="false"] .p-tabpanel-content {
      background: transparent !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      min-height: 400px !important;
      padding: 1rem 0 !important;
    }

    /* Forzar visibilidad cuando el tab está activo */
    ::ng-deep .p-tabs[value="1"] .p-tabpanel[value="1"],
    ::ng-deep .p-tabs[value="1"] .p-tabpanel[value="1"] .p-tabpanel-content {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }



    /* Better spacing on mobile */
    @media (max-width: 640px) {
      .space-y-4 > * + * {
        margin-top: 1rem;
      }

      .gap-4 {
        gap: 1rem;
      }

      .gap-6 {
        gap: 1.5rem;
      }
    }

    /* Tema Naz */
    .naz-theme {
      background: #000000 !important;
      position: relative;
      overflow: hidden;
      min-height: 100vh;
    }

    /* Animación de lava lamp plateada para employee-portal Naz */
    .naz-theme::before {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.5) 0%,
          rgba(255, 255, 255, 0.6) 2%,
          rgba(229, 226, 223, 0.65) 4%,
          rgba(198, 194, 191, 0.55) 6%,
          transparent 8%,
          transparent 12%,
          rgba(198, 194, 191, 0.5) 14%,
          rgba(229, 226, 223, 0.6) 16%,
          rgba(255, 255, 255, 0.55) 18%,
          transparent 20%
        ),
        linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.6) 0%,
          rgba(229, 226, 223, 0.7) 25%,
          rgba(198, 194, 191, 0.6) 50%,
          rgba(229, 226, 223, 0.65) 75%,
          rgba(255, 255, 255, 0.55) 100%
        );
      animation: silverLavaFlow 25s ease-in-out infinite;
      z-index: 0;
      filter: blur(25px);
      pointer-events: none;
    }

    .naz-theme::after {
      content: '';
      position: fixed;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      min-height: 200vh;
      background: 
        repeating-linear-gradient(
          -45deg,
          rgba(229, 226, 223, 0.55) 0%,
          rgba(255, 255, 255, 0.65) 2%,
          rgba(198, 194, 191, 0.6) 4%,
          rgba(229, 226, 223, 0.5) 6%,
          transparent 8%,
          transparent 12%,
          rgba(255, 255, 255, 0.55) 14%,
          rgba(198, 194, 191, 0.65) 16%,
          rgba(229, 226, 223, 0.6) 18%,
          transparent 20%
        ),
        linear-gradient(
          -135deg,
          rgba(198, 194, 191, 0.7) 0%,
          rgba(229, 226, 223, 0.75) 30%,
          rgba(255, 255, 255, 0.65) 60%,
          rgba(198, 194, 191, 0.6) 100%
        );
      animation: silverLavaFlow 30s ease-in-out infinite reverse;
      z-index: 0;
      filter: blur(30px);
      pointer-events: none;
    }

    @keyframes silverLavaFlow {
      0% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
      25% {
        transform: translate(10%, 5%) rotate(5deg) scale(1.1);
        opacity: 1;
      }
      50% {
        transform: translate(5%, 15%) rotate(-3deg) scale(0.95);
        opacity: 0.85;
      }
      75% {
        transform: translate(-10%, 8%) rotate(4deg) scale(1.05);
        opacity: 0.95;
      }
      100% {
        transform: translate(-20%, -20%) rotate(0deg) scale(1);
        opacity: 0.9;
      }
    }

    /* Asegurar que el contenido esté por encima de la animación */
    .naz-theme > * {
      position: relative;
      z-index: 1;
    }

    .naz-theme h1,
    .naz-theme .text-white {
      color: #FFFFFF !important;
    }

    .naz-theme .text-gray-400 {
      color: #C6C2BF !important;
    }

    .naz-theme .text-gray-500 {
      color: #7A7A7A !important;
    }

    .naz-theme ::ng-deep .p-card {
      background: #0D0D0D !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
      color: #FFFFFF !important;
    }

    .naz-theme ::ng-deep .p-card .p-card-title,
    .naz-theme ::ng-deep .p-card .p-card-subtitle {
      color: #FFFFFF !important;
    }

    .naz-theme ::ng-deep .p-tabs .p-tablist {
      background: #0D0D0D !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme ::ng-deep .p-tabs .p-tab {
      color: #C6C2BF !important;
    }

    .naz-theme ::ng-deep .p-tabs .p-tab.p-highlight {
      color: #FFFFFF !important;
      border-bottom-color: #FFFFFF !important;
    }

    .naz-theme ::ng-deep .p-datatable {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
    }

    .naz-theme ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: #1A1A1A !important;
      color: #FFFFFF !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      color: #C6C2BF !important;
    }

    .naz-theme ::ng-deep .p-inputtext,
    .naz-theme ::ng-deep .p-inputtextarea,
    .naz-theme ::ng-deep .p-datepicker input {
      background: #0D0D0D !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
      color: #FFFFFF !important;
    }

    .naz-theme ::ng-deep .p-inputtext:focus,
    .naz-theme ::ng-deep .p-inputtextarea:focus,
    .naz-theme ::ng-deep .p-datepicker.p-focus input {
      border-color: #FFFFFF !important;
      box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.2) !important;
    }

    .naz-theme ::ng-deep .p-inputtext::placeholder,
    .naz-theme ::ng-deep .p-inputtextarea::placeholder {
      color: #7A7A7A !important;
    }

    .naz-theme ::ng-deep .p-button {
      border-color: #FFFFFF !important;
      color: #FFFFFF !important;
      background: transparent !important;
    }

    .naz-theme ::ng-deep .p-button:hover {
      background: #E5E2DF !important;
      color: #000000 !important;
    }

    .naz-theme ::ng-deep .p-button.p-button-secondary {
      background: #E5E2DF !important;
      color: #000000 !important;
      border-color: #E5E2DF !important;
    }

    .naz-theme ::ng-deep .p-button.p-button-secondary:hover {
      background: #C6C2BF !important;
    }

    .naz-theme ::ng-deep .dashboard-welcome-card .p-card-body {
      background: #0D0D0D !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme ::ng-deep .dashboard-stat-card .p-card-body {
      background: #0D0D0D !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme ::ng-deep .bg-neutral-800 {
      background: #0D0D0D !important;
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme ::ng-deep [class*="bg-neutral-800/50"] {
      background: rgba(13, 13, 13, 0.5) !important;
    }

    .naz-theme ::ng-deep [class*="border-neutral-700/50"] {
      border-color: rgba(255, 255, 255, 0.10) !important;
    }

    /* Estilos del Calendario de Marcaciones */
    .calendar-container {
      width: 100%;
      margin-top: 1.5rem;
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .calendar-weekday {
      text-align: center;
      font-weight: 600;
      font-size: 0.875rem;
      color: #9ca3af;
      padding: 0.75rem 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
    }

    .calendar-day {
      min-height: 140px;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .calendar-day:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
      border-color: #fbbf24;
    }

    .calendar-day-other-month {
      opacity: 0.4;
      background: #111827;
    }

    .calendar-day-today {
      border: 2px solid #fbbf24;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.1);
    }

    .calendar-day-today .calendar-day-number {
      background: #fbbf24;
      color: #212121;
      font-weight: 700;
    }

    .calendar-day-complete {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
      border-color: rgba(34, 197, 94, 0.3);
    }

    .calendar-day-incomplete {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
      border-color: rgba(251, 191, 36, 0.3);
    }

    .calendar-day-number {
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(251, 191, 36, 0.1);
    }

    .calendar-day-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-size: 0.75rem;
    }

    .calendar-time-entry,
    .calendar-time-exit,
    .calendar-time-lunch,
    .calendar-hours-worked {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .calendar-time-entry {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }

    .calendar-time-entry.calendar-time-delay {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    .calendar-time-exit {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .calendar-time-lunch {
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.2);
      color: #fcd34d;
    }

    .calendar-hours-worked {
      background: rgba(168, 85, 247, 0.1);
      border-color: rgba(168, 85, 247, 0.2);
      color: #c4b5fd;
      margin-top: auto;
      font-weight: 600;
    }

    .calendar-delay-badge {
      background: rgba(239, 68, 68, 0.3);
      color: #fee2e2;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      margin-left: auto;
    }

    .calendar-day-empty {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      color: #6b7280;
      font-size: 0.75rem;
      margin-top: auto;
    }

    .calendar-day-warning {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      color: #fcd34d;
      font-size: 0.75rem;
      margin-top: auto;
    }

    .calendar-legend {
      display: flex;
      justify-content: center;
      padding-top: 1.5rem;
      margin-top: 1.5rem;
    }

    /* Responsive para calendario */
    @media (max-width: 768px) {
      .calendar-day {
        min-height: 100px;
        padding: 0.5rem;
      }

      .calendar-day-content {
        gap: 0.25rem;
      }

      .calendar-time-entry,
      .calendar-time-exit,
      .calendar-time-lunch,
      .calendar-hours-worked {
        font-size: 0.625rem;
        padding: 0.125rem 0.375rem;
      }

      .calendar-day-number {
        font-size: 0.875rem;
        width: 24px;
        height: 24px;
      }

      .calendar-weekday {
        font-size: 0.75rem;
        padding: 0.5rem 0.25rem;
      }
    }

    @media (max-width: 640px) {
      .calendar-day {
        min-height: 80px;
        padding: 0.375rem;
      }

      .calendar-day-content {
        gap: 0.125rem;
      }

      .calendar-time-entry,
      .calendar-time-exit,
      .calendar-time-lunch,
      .calendar-hours-worked {
        font-size: 0.5rem;
        padding: 0.125rem 0.25rem;
      }

      .calendar-day-number {
        font-size: 0.75rem;
        width: 20px;
        height: 20px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalComponent {
  public store = inject(DashboardStore);
  public employees = inject(EmployeesStore);
  public messageService = inject(MessageService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  public organizationService = inject(OrganizationService);
  public notificationsService = inject(NotificationsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Tab activo sincronizado con fragmentos de URL
  public activeTabIndex = signal<number>(0);
  private isUpdatingFromFragment = false; // Bandera para evitar loops
  private previousTabIndex = 0; // Track del tab anterior para detectar cambios

  constructor() {
    // Inicializar notificaciones cuando cambia el empleado actual
    effect(() => {
      const employeeId = this.currentEmployee()?.id;
      if (employeeId) {
        this.notificationsService.setCurrentEmployeeId(employeeId);
      }
    });

    // Inicializar con el fragmento actual
    this.updateTabFromFragment();

    // Suscribirse a cambios de navegación para sincronizar tabs con fragmentos
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        // Pequeño delay para asegurar que el fragmento esté disponible
        setTimeout(() => {
          this.updateTabFromFragment();
        }, 150);
      });

    // También escuchar cambios en el hash directamente
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        setTimeout(() => {
          this.updateTabFromFragment();
        }, 100);
      });
    }

    // Detectar cuando el tab vuelve a ser activo y forzar recarga de recursos
    effect(() => {
      const currentTab = this.activeTabIndex();
      const previousTab = this.previousTabIndex;

      // Si el tab cambió y volvió a Dashboard (tab 0), forzar recarga
      if (currentTab === 0 && previousTab !== 0) {
        console.log(
          '[EmployeePortal] Tab Dashboard vuelve a ser activo, forzando recarga de recursos'
        );
        // Forzar recarga de recursos HTTP después de un pequeño delay
        setTimeout(() => {
          // Forzar recarga de los recursos HTTP
          try {
            if (
              this.timelogsApi &&
              typeof this.timelogsApi.reload === 'function'
            ) {
              this.timelogsApi.reload();
            }
            if (
              this.monthTimelogsApi &&
              typeof this.monthTimelogsApi.reload === 'function'
            ) {
              this.monthTimelogsApi.reload();
            }
            if (
              this.timeoffsApi &&
              typeof this.timeoffsApi.reload === 'function' &&
              this.timeoffsApi.status() !== 'error'
            ) {
              this.timeoffsApi.reload();
            }
          } catch (error) {
            console.warn('[EmployeePortal] Error al recargar recursos:', error);
          }
          // Forzar detección de cambios
          this.cdr.markForCheck();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('resize'));
          }
        }, 200);
      }

      this.previousTabIndex = currentTab;
    });

    // Sincronizar fragmento cuando cambia el tab (solo si el cambio viene del usuario)
    effect(() => {
      // Evitar actualizar si el cambio viene de la sincronización con fragmento
      if (this.isUpdatingFromFragment) {
        console.log(
          '[EmployeePortal] effect - Saltando actualización, isUpdatingFromFragment es true'
        );
        return;
      }

      const tabIndex = this.activeTabIndex();
      const fragment = this.getFragmentFromTabIndex(tabIndex);
      const currentFragment = this.getCurrentFragment();
      console.log(
        '[EmployeePortal] effect - tabIndex:',
        tabIndex,
        'fragment:',
        fragment,
        'currentFragment:',
        currentFragment
      );

      // Solo actualizar el fragmento si es diferente para evitar loops
      if (fragment && fragment !== currentFragment) {
        console.log(
          '[EmployeePortal] effect - Navegando a fragment:',
          fragment
        );
        this.router.navigate(['/employee-portal'], {
          fragment: fragment,
          replaceUrl: true, // Evitar agregar entradas al historial
        });
      } else {
        console.log(
          '[EmployeePortal] effect - No se navega, fragment igual o null'
        );
      }
    });
  }

  private getCurrentFragment(): string | null {
    // Obtener fragmento de la URL actual
    const url = this.router.url;
    console.log('[EmployeePortal] getCurrentFragment - router.url:', url);
    if (url.includes('#')) {
      const fragment = url.split('#')[1];
      const cleanFragment = fragment.split('?')[0];
      console.log(
        '[EmployeePortal] getCurrentFragment - fragment encontrado:',
        cleanFragment
      );
      // Limpiar cualquier query parameter que pueda estar después del fragmento
      return cleanFragment;
    }
    // También verificar window.location.hash como respaldo
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const cleanHash = hash.split('?')[0];
      console.log(
        '[EmployeePortal] getCurrentFragment - window.location.hash:',
        cleanHash
      );
      return cleanHash;
    }
    console.log(
      '[EmployeePortal] getCurrentFragment - No hay fragmento, retornando null'
    );
    return null;
  }

  private updateTabFromFragment(): void {
    const fragment = this.getCurrentFragment();
    const tabIndex = this.getTabIndexFromFragment(fragment);
    const currentTabIndex = this.activeTabIndex();

    console.log(
      '[EmployeePortal] updateTabFromFragment - fragment:',
      fragment,
      'tabIndex:',
      tabIndex,
      'currentTabIndex:',
      currentTabIndex
    );

    // Solo actualizar si el tab es diferente
    if (currentTabIndex !== tabIndex) {
      console.log(
        '[EmployeePortal] updateTabFromFragment - Actualizando tab de',
        currentTabIndex,
        'a',
        tabIndex
      );
      this.isUpdatingFromFragment = true;
      this.activeTabIndex.set(tabIndex);
      console.log(
        '[EmployeePortal] updateTabFromFragment - activeTabIndex después de set:',
        this.activeTabIndex()
      );

      // Si volvemos al Dashboard, forzar recarga de recursos
      if (tabIndex === 0) {
        setTimeout(() => {
          console.log(
            '[EmployeePortal] updateTabFromFragment - Forzando recarga de recursos para Dashboard'
          );
          // Forzar recarga de recursos HTTP
          try {
            if (
              this.timelogsApi &&
              typeof this.timelogsApi.reload === 'function'
            ) {
              this.timelogsApi.reload();
            }
            if (
              this.monthTimelogsApi &&
              typeof this.monthTimelogsApi.reload === 'function'
            ) {
              this.monthTimelogsApi.reload();
            }
            if (
              this.timeoffsApi &&
              typeof this.timeoffsApi.reload === 'function' &&
              this.timeoffsApi.status() !== 'error'
            ) {
              this.timeoffsApi.reload();
            }
          } catch (error) {
            console.warn('[EmployeePortal] Error al recargar recursos:', error);
          }
          // Forzar detección de cambios
          this.cdr.markForCheck();
        }, 100);
      }

      // Forzar detección de cambios después de actualizar el tab
      setTimeout(() => {
        this.isUpdatingFromFragment = false;
        console.log(
          '[EmployeePortal] updateTabFromFragment - Bandera isUpdatingFromFragment reset a false'
        );
        // Forzar detección de cambios
        this.cdr.markForCheck();
        // Asegurar que el DOM se actualice
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
          // Forzar reflow para asegurar que Angular detecte los cambios
          document.body.offsetHeight;
        }
      }, 200);
    } else {
      console.log(
        '[EmployeePortal] updateTabFromFragment - No se actualiza, tabIndex es el mismo'
      );
    }
  }

  private getTabIndexFromFragment(fragment: string | null): number {
    console.log(
      '[EmployeePortal] getTabIndexFromFragment - fragment recibido:',
      fragment
    );
    if (!fragment) {
      console.log(
        '[EmployeePortal] getTabIndexFromFragment - No hay fragmento, retornando 0 (Dashboard)'
      );
      return 0; // Dashboard por defecto
    }

    // Mapeo de fragmentos a índices de tabs
    const fragmentToTabMap: Record<string, number> = {
      dashboard: 0,
      management: 1,
      gestiones: 1,
      profile: 2,
      timelogs: 3,
      lates: 4,
      notifications: 0, // Las notificaciones se mostrarán en un diálogo o panel
      // Gestiones individuales también van al tab de Gestiones
      disabilities: 1,
      documents: 1,
      complaints: 1,
    };

    const tabIndex = fragmentToTabMap[fragment] ?? 0;
    console.log(
      '[EmployeePortal] getTabIndexFromFragment - fragment:',
      fragment,
      'mapeado a tabIndex:',
      tabIndex
    );
    return tabIndex;
  }

  private getFragmentFromTabIndex(tabIndex: number): string | null {
    // Mapeo de índices de tabs a fragmentos
    const tabToFragmentMap: Record<number, string> = {
      0: 'dashboard',
      1: 'management',
      2: 'profile',
      3: 'timelogs',
      4: 'lates',
    };

    return tabToFragmentMap[tabIndex] ?? null;
  }

  public onTabChange(tabIndex: string | number): void {
    // Convertir a número si es string
    const index =
      typeof tabIndex === 'string' ? parseInt(tabIndex, 10) : tabIndex;
    const previousIndex = this.activeTabIndex();

    console.log(
      '[EmployeePortal] onTabChange - tabIndex recibido:',
      tabIndex,
      'convertido a:',
      index,
      'anterior:',
      previousIndex
    );

    this.activeTabIndex.set(index);

    // Si el usuario cambió manualmente al Dashboard, forzar recarga de recursos
    if (index === 0 && previousIndex !== 0) {
      console.log(
        '[EmployeePortal] onTabChange - Usuario cambió manualmente a Dashboard, forzando recarga'
      );
      setTimeout(() => {
        try {
          if (
            this.timelogsApi &&
            typeof this.timelogsApi.reload === 'function'
          ) {
            this.timelogsApi.reload();
          }
          if (
            this.monthTimelogsApi &&
            typeof this.monthTimelogsApi.reload === 'function'
          ) {
            this.monthTimelogsApi.reload();
          }
          if (
            this.timeoffsApi &&
            typeof this.timeoffsApi.reload === 'function'
          ) {
            this.timeoffsApi.reload();
          }
        } catch (error) {
          console.warn(
            '[EmployeePortal] Error al recargar recursos en onTabChange:',
            error
          );
        }
        // Forzar detección de cambios
        this.cdr.markForCheck();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('resize'));
        }
      }, 150);
    }

    console.log(
      '[EmployeePortal] onTabChange - activeTabIndex después:',
      this.activeTabIndex()
    );
  }

  // Helper para agregar filtro de company_id a los parámetros
  private addCompanyFilter(params: any, tableName: string): any {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      return params;
    }

    // Tablas que tienen company_id y deben filtrarse
    const tablesWithCompanyId = [
      'employees',
      'branches',
      'departments',
      'positions',
      'schedules',
      'employee_schedules',
      'attendance_sheets',
      'timelogs',
    ];

    if (tablesWithCompanyId.includes(tableName)) {
      return {
        ...params,
        company_id: `eq.${companyId}`,
      };
    }

    return params;
  }

  public currentEmployee = computed(() => {
    const employee = this.store.currentEmployee();
    const isNaz = this.isNaz();
    const companyId = this.organizationService.getCurrentCompanyId();

    return employee;
  });

  // Get current date for template
  public getCurrentDate(): Date {
    return new Date();
  }

  // Calendario - mes actual seleccionado
  public calendarMonth = signal<Date>(new Date());

  // Date range for timelogs - inicializar con el mes actual
  public dateRange = signal<Date[]>([
    startOfMonth(new Date()),
    endOfMonth(new Date()),
  ]);

  // Generar días del calendario
  public calendarDays = computed(() => {
    const monthStart = startOfMonth(this.calendarMonth());
    const monthEnd = endOfMonth(this.calendarMonth());
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Domingo

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  });

  // Obtener log para un día específico
  public getLogForDay(day: Date): any {
    const dayStr = format(day, 'yyyy-MM-dd');
    return this.myTimelogs().find((log) => log.day === dayStr);
  }

  // Navegación del calendario
  public previousMonth(): void {
    const current = this.calendarMonth();
    const newMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.calendarMonth.set(newMonth);
    // Actualizar dateRange para el nuevo mes
    this.dateRange.set([startOfMonth(newMonth), endOfMonth(newMonth)]);
  }

  public nextMonth(): void {
    const current = this.calendarMonth();
    const newMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.calendarMonth.set(newMonth);
    // Actualizar dateRange para el nuevo mes
    this.dateRange.set([startOfMonth(newMonth), endOfMonth(newMonth)]);
  }

  public goToToday(): void {
    const today = new Date();
    this.calendarMonth.set(today);
    this.dateRange.set([startOfMonth(today), endOfMonth(today)]);
  }

  public onCalendarMonthChange(date: Date): void {
    console.log('[Timelogs] Cambio de mes en calendario:', date);
    console.log('[Timelogs] Mes anterior:', this.calendarMonth());
    this.calendarMonth.set(date);
    const newRange = [startOfMonth(date), endOfMonth(date)];
    console.log('[Timelogs] Nuevo rango de fechas:', newRange);
    this.dateRange.set(newRange);
    console.log('[Timelogs] Mes actualizado:', this.calendarMonth());
  }

  // Helper methods for template (wrapper methods to use date-fns functions)
  public checkSameMonth(day: Date, month: Date): boolean {
    return isSameMonth(day, month);
  }

  public checkIsToday(day: Date): boolean {
    return isToday(day);
  }

  // Timelogs API
  public timelogsApi = httpResource<any[]>(() => {
    if (
      !this.dateRange()[0] ||
      !this.dateRange()[1] ||
      !this.currentEmployee()?.id
    ) {
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    // Asegurar que siempre tengamos un company_id válido
    if (!companyId) {
      console.warn(
        '[EmployeePortal] No se encontró company_id, no se pueden cargar timelogs'
      );
      return undefined;
    }

    // Construir URL manualmente para aplicar correctamente filtros gte y lte
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const startDate = format(this.dateRange()[0], "yyyy-MM-dd'T'06:00:00");
    const endDate = format(
      addDays(this.dateRange()[1], 1),
      "yyyy-MM-dd'T'06:00:00"
    );
    const select = `*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)`;

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    url += `&company_id=eq.${companyId}`; // Siempre agregar filtro de company_id
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&order=created_at.asc`;

    return {
      url,
      method: 'GET',
    };
  });

  public myTimelogs = computed(() => {
    const logs = this.timelogsApi.value() ?? [];

    // Process logs similar to timelogs component
    // Filtrar logs sin fecha válida antes de procesar
    const processedLogs = logs
      .filter((x) => x.created_at) // Filtrar logs sin fecha
      .map((x) => {
        // Validar que created_at sea válido antes de formatear
        try {
          const date = new Date(x.created_at);
          if (isNaN(date.getTime())) {
            return null; // Fecha inválida
          }
          return { ...x, day: format(date, 'yyyy-MM-dd') };
        } catch {
          return null; // Error al formatear fecha
        }
      })
      .filter((x) => x !== null) // Remover logs con fechas inválidas
      .reduce<any[]>((acc, x) => {
        if (!x) return acc; // Skip si x es null

        const existing = acc.find((item) => item.day === x.day);
        const logDate = new Date(x.created_at);
        const logBranch = x.branch || null; // Validar que branch exista

        if (!existing) {
          acc.push({
            day: x.day,
            entry:
              x.type === TimeLogEnum.entry
                ? { date: logDate, branch: logBranch }
                : undefined,
            lunch_start:
              x.type === TimeLogEnum.lunch_start
                ? { date: logDate, branch: logBranch }
                : undefined,
            lunch_end:
              x.type === TimeLogEnum.lunch_end
                ? { date: logDate, branch: logBranch }
                : undefined,
            exit:
              x.type === TimeLogEnum.exit
                ? { date: logDate, branch: logBranch }
                : undefined,
            schedule: null, // Would need to fetch schedules separately
            delay: undefined,
          });
        } else {
          if (x.type === TimeLogEnum.entry)
            existing.entry = { date: logDate, branch: logBranch };
          if (x.type === TimeLogEnum.lunch_start)
            existing.lunch_start = {
              date: logDate,
              branch: logBranch,
            };
          if (x.type === TimeLogEnum.lunch_end)
            existing.lunch_end = {
              date: logDate,
              branch: logBranch,
            };
          if (x.type === TimeLogEnum.exit)
            existing.exit = { date: logDate, branch: logBranch };
        }
        return acc;
      }, []);

    return processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
  });

  // Timelogs API para el mes actual (independiente del dateRange del usuario)
  public monthTimelogsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) {
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const startDate = format(monthStart, "yyyy-MM-dd'T'06:00:00");
    const endDate = format(addDays(monthEnd, 1), "yyyy-MM-dd'T'06:00:00");
    const select = `*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)`;

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    url += `&company_id=eq.${companyId}`;
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&order=created_at.asc`;

    return {
      url,
      method: 'GET',
    };
  });

  // Procesar timelogs del mes actual
  public monthTimelogs = computed(() => {
    const logs = this.monthTimelogsApi.value() ?? [];
    console.log(
      '[Timelogs] monthTimelogs - Logs crudos recibidos:',
      logs.length,
      logs
    );

    const processedLogs = logs
      .filter((x) => x.created_at)
      .map((x) => {
        try {
          const date = new Date(x.created_at);
          if (isNaN(date.getTime())) {
            return null;
          }
          return { ...x, day: format(date, 'yyyy-MM-dd') };
        } catch {
          return null;
        }
      })
      .filter((x) => x !== null)
      .reduce<any[]>((acc, x) => {
        if (!x) return acc;

        const existing = acc.find((item) => item.day === x.day);
        const logDate = new Date(x.created_at);
        const logBranch = x.branch || null;

        if (!existing) {
          acc.push({
            day: x.day,
            entry:
              x.type === TimeLogEnum.entry
                ? { date: logDate, branch: logBranch }
                : undefined,
            lunch_start:
              x.type === TimeLogEnum.lunch_start
                ? { date: logDate, branch: logBranch }
                : undefined,
            lunch_end:
              x.type === TimeLogEnum.lunch_end
                ? { date: logDate, branch: logBranch }
                : undefined,
            exit:
              x.type === TimeLogEnum.exit
                ? { date: logDate, branch: logBranch }
                : undefined,
            schedule: null,
            delay: undefined,
          });
        } else {
          if (x.type === TimeLogEnum.entry)
            existing.entry = { date: logDate, branch: logBranch };
          if (x.type === TimeLogEnum.lunch_start)
            existing.lunch_start = {
              date: logDate,
              branch: logBranch,
            };
          if (x.type === TimeLogEnum.lunch_end)
            existing.lunch_end = {
              date: logDate,
              branch: logBranch,
            };
          if (x.type === TimeLogEnum.exit)
            existing.exit = { date: logDate, branch: logBranch };
        }
        return acc;
      }, []);

    const sorted = processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
    console.log(
      '[Timelogs] monthTimelogs - Logs procesados:',
      sorted.length,
      sorted
    );
    return sorted;
  });

  // Convertir timelogs a markers para el calendario bonito
  public timelogMarkers = computed<CalendarMarkerData[]>(() => {
    const logs = this.monthTimelogs();
    console.log(
      '[Timelogs] timelogMarkers - Logs recibidos:',
      logs.length,
      logs
    );

    const filtered = logs.filter((log) => log.entry || log.exit);
    console.log(
      '[Timelogs] timelogMarkers - Logs con entrada o salida:',
      filtered.length,
      filtered
    );

    const markers = filtered.map((log) => ({
      date: new Date(log.day),
      data: log,
    }));
    console.log(
      '[Timelogs] timelogMarkers - Markers generados:',
      markers.length,
      markers
    );
    return markers;
  });

  // Lates computed from timelogs
  public myLates = computed(() => {
    const logs = this.myTimelogs();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return logs
      .filter((log) => {
        const logDate = new Date(log.day);
        // Solo incluir logs con delay válido y dentro del mes actual
        return (
          logDate >= monthStart &&
          logDate <= monthEnd &&
          log.delay &&
          typeof log.delay === 'number' &&
          log.delay > 0
        );
      })
      .map((log) => {
        // Manejar caso donde schedule puede ser null
        let scheduledTime = '-';
        if (log.schedule?.schedule?.entry_time) {
          const entryTime = new Date(log.schedule.schedule.entry_time);
          scheduledTime = format(entryTime, 'HH:mm');
        } else if (log.schedule?.schedule?.start_time) {
          scheduledTime = log.schedule.schedule.start_time;
        }

        return {
          date: new Date(log.day),
          scheduled_time: scheduledTime,
          actual_time: log.entry?.date ? format(log.entry.date, 'HH:mm') : '-',
          minutes: log.delay as number,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  // Disabilities
  public disabilityStartDate = signal<Date | null>(null);
  public disabilityEndDate = signal<Date | null>(null);
  public disabilityDescription = signal('');
  public selectedFile = signal<File | null>(null);
  public uploadingDisability = signal(false);

  public disabilitiesApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    // employee_disabilities es compartida entre ambas organizaciones
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
      method: 'GET',
      params: {
        select: '*',
        employee_id: `eq.${this.currentEmployee()!.id}`,
        order: 'created_at.desc',
      },
    };
  });

  public myDisabilities = computed(() => this.disabilitiesApi.value() ?? []);

  // Document Requests
  public documentType = signal('work_letter');
  public customDocumentType = signal('');
  public documentReason = signal('');
  public documentRequiredDate = signal<Date | null>(null);
  public submittingDocument = signal(false);

  public documentRequestsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/document_requests`,
      method: 'GET',
      params: {
        select: '*',
        employee_id: `eq.${this.currentEmployee()!.id}`,
        order: 'created_at.desc',
      },
    };
  });

  public myDocumentRequests = computed(
    () => this.documentRequestsApi.value() ?? []
  );

  // Complaints
  public complaintCategory = signal('work_environment');
  public complaintText = signal('');
  public allowContact = signal(false);
  public contactMethod = signal('email');
  public submittingComplaint = signal(false);
  public responseDialogVisible = signal(false);
  public selectedComplaint = signal<any>(null);

  // Gestiones - Formularios
  public activeGestionForm = signal<string | null>(null);
  public showGestionDialog = signal(false);

  // Notificaciones
  public showNotificationsDialog = signal(false);
  public notificationFilter = signal<'all' | 'unread' | 'read'>('all');

  // Usar el servicio compartido de notificaciones
  public myNotifications = computed(() =>
    this.notificationsService.notifications()
  );
  public unreadNotificationsCount = computed(() =>
    this.notificationsService.unreadCount()
  );

  // Notificaciones filtradas
  public filteredNotifications = computed(() => {
    const notifications = this.myNotifications();
    const filter = this.notificationFilter();

    if (filter === 'unread') {
      return notifications.filter((n: any) => !n.is_read);
    } else if (filter === 'read') {
      return notifications.filter((n: any) => n.is_read);
    }
    return notifications;
  });

  // Timeoff Types API
  public timeoffTypesApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoff_types`,
    method: 'GET',
    params: {
      select: '*',
      order: 'name.asc',
    },
  }));

  public timeoffTypes = computed(() => this.timeoffTypesApi.value() ?? []);

  // Timeoff Request
  public selectedTimeoffType = signal<string | null>(null);
  public timeoffStartDate = signal<Date | null>(null);
  public timeoffEndDate = signal<Date | null>(null);
  public timeoffNotes = signal<string>('');
  public submittingTimeoff = signal(false);

  // Computed: Validación del formulario de quejas
  public canSubmitComplaint = computed(() => {
    const text = this.complaintText();
    if (!text) return false;
    const trimmedText = text.trim();
    // Mínimo 20 caracteres, máximo 5000 caracteres
    return trimmedText.length >= 20 && trimmedText.length <= 5000;
  });

  public complaintsApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    // Obtener todas las quejas del empleado (identificadas y anónimas)
    // usando creator_employee_id que siempre está seteado
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
      method: 'GET',
      params: {
        select: '*',
        creator_employee_id: `eq.${this.currentEmployee()!.id}`, // Todas las quejas del empleado (identificadas y anónimas)
        order: 'updated_at.desc',
      },
    };
  });

  // Computed: Todas las quejas del empleado
  public myComplaints = computed(() => {
    return this.complaintsApi.value() ?? [];
  });

  // API para mensajes de una queja específica
  public complaintMessagesApi = httpResource<any[]>(() => {
    const complaint = this.selectedComplaint();
    if (!complaint) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: '*',
        complaint_id: `eq.${complaint.id}`,
        order: 'created_at.asc',
      },
    };
  });

  public conversationMessages = computed(
    () => this.complaintMessagesApi.value() ?? []
  );

  // API para obtener todos los mensajes sin leer de HR (por complaint_id)
  public unreadMessagesApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: 'complaint_id',
        sender_type: 'eq.hr',
        is_read: 'eq.false',
      },
    };
  });

  // Computed: Set de quejas con mensajes sin leer del empleado
  public unreadMessagesMap = computed(() => {
    const messages = this.unreadMessagesApi.value() ?? [];
    const myComplaints = this.myComplaints();

    if (myComplaints.length === 0 || messages.length === 0)
      return new Set<string>();

    // Crear un Set de complaint_ids de las quejas del empleado
    const myComplaintIds = new Set(myComplaints.map((c: any) => c.id));

    // Filtrar mensajes sin leer que pertenecen a las quejas del empleado
    const unreadSet = new Set<string>();
    messages.forEach((msg: any) => {
      if (msg.complaint_id && myComplaintIds.has(msg.complaint_id)) {
        unreadSet.add(msg.complaint_id);
      }
    });

    return unreadSet;
  });

  // Señales para conversación
  public conversationDialogVisible = signal(false);
  public replyMessage = signal('');
  public sendingReply = signal(false);

  // Helper methods
  public calculateWorkedHours(
    entry: Date | null | undefined,
    exit: Date | null | undefined
  ): string {
    console.log(
      '[Timelogs] calculateWorkedHours - Entrada:',
      entry,
      'Salida:',
      exit
    );

    // Validar que ambas fechas existan
    if (!entry || !exit) {
      console.log(
        '[Timelogs] calculateWorkedHours - Faltan fechas, retornando "-"'
      );
      return '-';
    }

    // Validar que las fechas sean válidas
    const entryDate = new Date(entry);
    const exitDate = new Date(exit);

    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
      console.log(
        '[Timelogs] calculateWorkedHours - Fechas inválidas, retornando "-"'
      );
      return '-';
    }

    // Calcular diferencia en minutos
    const minutes = differenceInMinutes(exitDate, entryDate);
    console.log(
      '[Timelogs] calculateWorkedHours - Diferencia en minutos:',
      minutes
    );

    // Validar que la diferencia no sea negativa
    if (minutes < 0) {
      console.log(
        '[Timelogs] calculateWorkedHours - Diferencia negativa, retornando "0h 0m"'
      );
      return '0h 0m';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const result = `${hours}h ${mins}m`;
    console.log('[Timelogs] calculateWorkedHours - Resultado:', result);
    return result;
  }

  public calculateDays(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined
  ): number {
    // Validar que ambas fechas existan
    if (!start || !end) {
      return 0;
    }

    // Crear objetos Date y validar que sean fechas válidas
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 0;
    }

    // Validar que end_date sea posterior o igual a start_date
    if (endDate < startDate) {
      return 0;
    }

    // Calcular diferencia en días
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Incluir ambos días (inicio y fin)
    return diffDays + 1;
  }

  public getScheduleColor(color: string): string {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      yellow: 'bg-yellow-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
    };
    return colorMap[color] || 'bg-neutral-700 text-gray-300';
  }

  public onFileSelect(event: any): void {
    // Validar que haya archivos seleccionados
    if (!event.files || event.files.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin Archivo',
        detail: 'No se seleccionó ningún archivo',
      });
      return;
    }

    const file = event.files[0];

    // Validar tamaño del archivo (máximo 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB en bytes
    if (file.size > maxFileSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo Demasiado Grande',
        detail:
          'El archivo no puede exceder 10MB. Tamaño actual: ' +
          (file.size / (1024 * 1024)).toFixed(2) +
          'MB',
      });
      this.selectedFile.set(null);
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
    ];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];

    // Validar por tipo MIME o por extensión si el tipo no está disponible
    const isValidType = file.type && allowedTypes.includes(file.type);
    const isValidExtension = fileExt && allowedExtensions.includes(fileExt);

    if (!isValidType && !isValidExtension) {
      this.messageService.add({
        severity: 'error',
        summary: 'Tipo de Archivo No Válido',
        detail: 'Solo se permiten archivos PDF o imágenes (JPG, PNG, GIF)',
      });
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);
  }

  // Dashboard computed properties
  public daysWorkedThisMonth = computed(() => {
    // Usar monthTimelogs en lugar de myTimelogs para obtener todos los días del mes actual
    const logs = this.monthTimelogs();

    // Validar que logs sea un array válido
    if (!Array.isArray(logs) || logs.length === 0) {
      return 0;
    }

    // Contar días que tienen al menos una marcación (entry, lunch_start, lunch_end, o exit)
    return logs.filter((log) => {
      const hasAnyMark =
        log.entry || log.lunch_start || log.lunch_end || log.exit;
      return hasAnyMark;
    }).length;
  });

  public recentTimelogs = computed(() => {
    const logs = this.myTimelogs();

    // Validar que logs sea un array válido
    if (!Array.isArray(logs) || logs.length === 0) {
      return [];
    }

    const sevenDaysAgo = addDays(new Date(), -7);
    return logs
      .filter((log) => {
        if (!log || !log.day) return false;
        try {
          const logDate = new Date(log.day);
          return !isNaN(logDate.getTime()) && logDate >= sevenDaysAgo;
        } catch {
          return false;
        }
      })
      .slice(0, 5); // Últimos 5 días
  });

  public recentTimelogsCount = computed(() => {
    return this.recentTimelogs().length;
  });

  // Timeoffs API para compensatorios
  public timeoffsApi = httpResource<any[]>(
    () => {
      if (!this.currentEmployee()?.id) return undefined;
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!companyId) {
        return undefined;
      }

      // ID del tipo de timeoff "Compensatorio"
      const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

      const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`;
      // La tabla timeoffs tiene múltiples relaciones con employees (employee_id, reviewed_by, registered_by)
      // No necesitamos incluir la relación employee porque:
      // 1. approvedCompensatoryHours solo usa date_from y date_to (campos directos de timeoffs)
      // 2. Ya filtramos por employee_id directamente, que garantiza que pertenece al empleado correcto
      // 3. El empleado ya está filtrado por company_id a través de currentEmployee()
      // Esto evita el error HTTP 300 cuando hay múltiples relaciones
      // SOLUCIÓN: No incluir employee:employees para evitar error HTTP 300
      // approvedCompensatoryHours solo necesita date_from y date_to (campos directos)
      const select = `*,type:timeoff_types(id,name)`;

      let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
      url += `&employee_id=eq.${this.currentEmployee()!.id}`;
      url += `&type_id=eq.${compensatoryTypeId}`;
      url += `&is_approved=eq.true`;
      // No necesitamos filtrar por company_id porque employee_id ya garantiza que pertenece al empleado correcto
      // y el empleado ya está filtrado por company_id a través de currentEmployee()
      url += `&order=date_from.desc`;

      return {
        url,
        method: 'GET',
      };
    },
    {
      // CRÍTICO: defaultValue evita que el resource lance error si falla la primera carga
      // Si el resource entra en estado de error, cualquier recomputación del signal vuelve a lanzar el error (loop infinito)
      // Por eso protegemos los reload() para que no se ejecuten si status === 'error'
      defaultValue: [],
    }
  );

  // Horas de compensatorio aprobadas
  public approvedCompensatoryHours = computed(() => {
    // CRÍTICO: Si el resource está en estado de error, retornar 0 en lugar de intentar acceder a value()
    // Esto evita que el computed lance el error y entre en loop infinito
    if (this.timeoffsApi.status() === 'error') {
      return 0;
    }
    const timeoffs = this.timeoffsApi.value() ?? [];

    // Validar que timeoffs sea un array válido
    if (!Array.isArray(timeoffs) || timeoffs.length === 0) {
      return 0;
    }

    // Calcular horas totales basándose en date_from y date_to
    // Asumimos 8 horas por día trabajado
    const totalHours = timeoffs.reduce((total, timeoff) => {
      if (!timeoff || !timeoff.date_from || !timeoff.date_to) {
        return total;
      }
      try {
        const startDate = new Date(timeoff.date_from);
        const endDate = new Date(timeoff.date_to);

        // Validar que las fechas sean válidas
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return total;
        }

        // differenceInDays devuelve la diferencia en días, sumamos 1 para incluir ambos días
        const days = differenceInDays(endDate, startDate) + 1;
        return total + Math.max(0, days) * 8; // 8 horas por día, asegurar que days no sea negativo
      } catch {
        return total;
      }
    }, 0);

    return totalHours;
  });

  // Edit mode for personal data
  public editMode = signal(false);
  public editEmail = signal('');
  public editWorkEmail = signal('');
  public editPhone = signal('');
  public editAddress = signal('');
  public savingPersonalData = signal(false);

  public toggleEditMode() {
    if (!this.editMode()) {
      // Entrar en modo edición - cargar valores actuales
      const emp = this.currentEmployee();
      this.editEmail.set(emp?.email || '');
      this.editWorkEmail.set(emp?.work_email || '');
      this.editPhone.set(emp?.phone_number || '');
      this.editAddress.set(emp?.address || '');
    }
    this.editMode.update((v) => !v);
  }

  public cancelEdit() {
    this.editMode.set(false);
    this.editEmail.set('');
    this.editWorkEmail.set('');
    this.editPhone.set('');
    this.editAddress.set('');
  }

  // Validar formato de email
  private isValidEmail(email: string): boolean {
    if (!email || !email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  public async savePersonalData() {
    if (!this.currentEmployee()?.id) return;

    // Validar formato de emails si se proporcionaron
    if (this.editEmail() && !this.isValidEmail(this.editEmail())) {
      this.messageService.add({
        severity: 'error',
        summary: 'Email Inválido',
        detail: 'El formato del email personal no es válido',
      });
      return;
    }

    if (this.editWorkEmail() && !this.isValidEmail(this.editWorkEmail())) {
      this.messageService.add({
        severity: 'error',
        summary: 'Email Inválido',
        detail: 'El formato del email laboral no es válido',
      });
      return;
    }

    this.savingPersonalData.set(true);
    try {
      const updateData: any = {};
      if (this.editEmail()) updateData.email = this.editEmail().trim();
      if (this.editWorkEmail())
        updateData.work_email = this.editWorkEmail().trim();
      if (this.editPhone()) updateData.phone_number = this.editPhone().trim();
      if (this.editAddress()) updateData.address = this.editAddress().trim();

      const companyId = this.organizationService.getCurrentCompanyId();
      const params: any = { id: `eq.${this.currentEmployee()!.id}` };

      // Agregar filtro por company_id para seguridad
      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }

      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
          updateData,
          {
            params,
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Datos actualizados',
        detail: 'Tus datos personales han sido actualizados correctamente',
      });

      // Recargar datos del empleado
      this.store.employees.fetchItems();
      this.editMode.set(false);
    } catch (error: any) {
      console.error('Error updating personal data:', error);
      const errorMessage =
        error?.error?.message ||
        error?.message ||
        'No se pudieron actualizar los datos. Por favor intenta de nuevo.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    } finally {
      this.savingPersonalData.set(false);
    }
  }

  public async uploadDisability(): Promise<void> {
    // Prevenir múltiples envíos
    if (this.uploadingDisability()) {
      return;
    }

    // Validar campos requeridos
    if (
      !this.disabilityStartDate() ||
      !this.disabilityEndDate() ||
      !this.selectedFile()
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos Requeridos',
        detail: 'Por favor completa todos los campos y selecciona un archivo',
      });
      return;
    }

    // Normalizar fechas para evitar problemas de timezone
    const startDate = new Date(this.disabilityStartDate()!);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(this.disabilityEndDate()!);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Fechas',
        detail: 'Las fechas ingresadas no son válidas',
      });
      return;
    }

    // Validar que endDate sea posterior o igual a startDate
    if (endDate < startDate) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Fechas',
        detail:
          'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      });
      return;
    }

    // Validar que las fechas no sean futuras (más de 1 día en el futuro)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(maxFutureDate.getDate() + 1);

    if (startDate > maxFutureDate) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Fechas',
        detail: 'La fecha de inicio no puede ser mas de 1 dia en el futuro',
      });
      return;
    }

    // Validar que el rango de fechas no sea mayor a 1 año
    const oneYearFromStart = new Date(startDate);
    oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);

    if (endDate > oneYearFromStart) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Fechas',
        detail: 'El rango de fechas no puede ser mayor a 1 ano',
      });
      return;
    }

    // Validar tamaño del archivo (máximo 10MB)
    const file = this.selectedFile()!;
    const maxFileSize = 10 * 1024 * 1024; // 10MB en bytes

    if (file.size > maxFileSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo Demasiado Grande',
        detail:
          'El archivo no puede exceder 10MB. Tamaño actual: ' +
          (file.size / (1024 * 1024)).toFixed(2) +
          'MB',
      });
      return;
    }

    // Validar tipo de archivo (PDF, imágenes comunes)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
    ];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];

    // Validar por tipo MIME o por extensión si el tipo no está disponible
    const isValidType = file.type && allowedTypes.includes(file.type);
    const isValidExtension = fileExt && allowedExtensions.includes(fileExt);

    if (!isValidType && !isValidExtension) {
      this.messageService.add({
        severity: 'error',
        summary: 'Tipo de Archivo No Válido',
        detail: 'Solo se permiten archivos PDF o imágenes (JPG, PNG, GIF)',
      });
      return;
    }

    this.uploadingDisability.set(true);
    try {
      let documentUrl = '';

      // Upload file to Supabase Storage if file is selected
      if (this.selectedFile()) {
        const fileName = `${
          this.currentEmployee()!.id
        }/${Date.now()}.${fileExt}`;
        const filePath = `disabilities/${fileName}`;

        // Upload to Supabase Storage using REST API
        // IMPORTANTE: Para subir archivos necesitamos usar Service Role Key o configurar políticas que permitan anon
        // El interceptor NO debe agregar Content-Type para Storage API
        try {
          // Usar Service Role Key si está disponible, sino usar API Key pública
          const storageKey =
            process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'] ||
            process.env['ENV_SUPABASE_ANON_KEY'] ||
            process.env['ENV_SUPABASE_API_KEY'] ||
            '';

          const uploadResponse = await firstValueFrom(
            this.http.post(
              `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/disabilities/${fileName}`,
              file, // Enviar el archivo directamente como binario
              {
                headers: {
                  apikey: storageKey,
                  Authorization: `Bearer ${storageKey}`,
                  'Content-Type': file.type || 'application/octet-stream',
                  'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
                },
              }
            )
          );

          // Get public URL for the uploaded file
          documentUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/disabilities/${fileName}`;
        } catch (uploadError: any) {
          console.error('Error uploading file to storage:', uploadError);
          const errorDetail =
            uploadError?.error?.message ||
            uploadError?.error?.error ||
            uploadError?.message ||
            'No se pudo subir el archivo. Verifica que el bucket existe y tiene las políticas correctas.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error al Subir Archivo',
            detail: errorDetail,
          });
          this.uploadingDisability.set(false);
          return;
        }
      }

      // Create disability record
      const disabilityData = {
        employee_id: this.currentEmployee()!.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        description: this.disabilityDescription() || null,
        document_url: documentUrl || null,
        status: 'pending',
      };

      this.http
        .post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
          disabilityData
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail:
                'Incapacidad subida correctamente. Está pendiente de revisión.',
            });

            // Notificación por correo a RRHH (configurable en settings)
            void (async () => {
              const shouldNotify = await getBooleanSetting(
                this.http,
                'hr_email_notify_disabilities',
                true
              );
              if (!shouldNotify) return;

              const employeeName =
                [
                  this.currentEmployee()?.first_name,
                  this.currentEmployee()?.father_name,
                ]
                  .filter(Boolean)
                  .join(' ') || 'Un empleado';

              const createdRow = Array.isArray(created) ? created[0] : created;
              const disabilityId = createdRow?.id ?? undefined;

              const safeDescription = String(
                disabilityData.description || 'N/A'
              )
                .split('\n')
                .join('<br/>');

              const subject = `Nueva incapacidad subida - ${employeeName}`;
              const html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.4;">
                  <h2 style="margin: 0 0 12px;">Nueva incapacidad (Gestiones)</h2>
                  <p style="margin: 0 0 12px;">
                    Un empleado ha subido una incapacidad médica que requiere revisión.
                  </p>
                  <ul>
                    <li><strong>Empleado:</strong> ${employeeName}</li>
                    <li><strong>Inicio:</strong> ${
                      disabilityData.start_date
                    }</li>
                    <li><strong>Fin:</strong> ${disabilityData.end_date}</li>
                    <li><strong>Descripción:</strong> ${safeDescription}</li>
                    <li><strong>Documento:</strong> ${
                      disabilityData.document_url
                        ? `<a href="${disabilityData.document_url}">Abrir documento</a>`
                        : 'N/A'
                    }</li>
                    ${
                      disabilityId
                        ? `<li><strong>ID:</strong> ${disabilityId}</li>`
                        : ''
                    }
                  </ul>
                  <p style="color:#666; font-size: 12px; margin-top: 16px;">
                    Este mensaje fue generado automáticamente por People.
                  </p>
                </div>
              `;

              this.http
                .post('/api/email/send', {
                  to: 'Verley@blackdogpanama.com',
                  subject,
                  html,
                  fromName: 'People - RRHH',
                })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: () => undefined,
                  error: (e) =>
                    console.warn(
                      '[DisabilityUpload] No se pudo enviar email a RRHH',
                      e
                    ),
                });
            })();

            // Reset form
            this.disabilityStartDate.set(null);
            this.disabilityEndDate.set(null);
            this.disabilityDescription.set('');
            this.selectedFile.set(null);
            this.disabilitiesApi.reload();
            this.uploadingDisability.set(false);
          },
          error: (error) => {
            console.error('Error uploading disability:', error);
            const errorMessage =
              error?.error?.message ||
              error?.error?.error ||
              error?.message ||
              'No se pudo subir la incapacidad. Por favor intenta de nuevo.';
            this.messageService.add({
              severity: 'error',
              summary: 'Error al Subir Incapacidad',
              detail: errorMessage,
            });
            this.uploadingDisability.set(false);
          },
        });
    } catch (error: any) {
      const errorMessage =
        error?.error?.message ||
        error?.error?.error ||
        error?.message ||
        'No se pudo subir la incapacidad. Por favor intenta de nuevo.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error al Subir Incapacidad',
        detail: errorMessage,
      });
      this.uploadingDisability.set(false);
    }
  }

  public async submitDocumentRequest(): Promise<void> {
    // Prevenir múltiples envíos
    if (this.submittingDocument()) {
      return;
    }

    if (!this.documentReason().trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo Requerido',
        detail: 'Por favor describe el motivo de la solicitud',
      });
      return;
    }

    this.submittingDocument.set(true);

    const documentType =
      this.documentType() === 'other'
        ? this.customDocumentType()
        : this.documentType();

    const requestData = {
      employee_id: this.currentEmployee()!.id,
      document_type: documentType,
      custom_document_type:
        this.documentType() === 'other' ? this.customDocumentType() : null,
      reason: this.documentReason(),
      required_date: this.documentRequiredDate()
        ? format(this.documentRequiredDate()!, 'yyyy-MM-dd')
        : null,
      status: 'pending',
    };

    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/document_requests`,
        requestData
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail:
              'Solicitud enviada correctamente. Recibirás una notificación cuando esté lista.',
          });

          // Notificación por correo a RRHH (configurable en settings)
          void (async () => {
            const shouldNotify = await getBooleanSetting(
              this.http,
              'hr_email_notify_documents',
              true
            );
            if (!shouldNotify) return;

            const employeeName =
              [
                this.currentEmployee()?.first_name,
                this.currentEmployee()?.father_name,
              ]
                .filter(Boolean)
                .join(' ') || 'Un empleado';

            const createdRow = Array.isArray(created) ? created[0] : created;
            const requestId = createdRow?.id ?? undefined;

            const safeReason = String(requestData.reason || '')
              .split('\n')
              .join('<br/>');
            const requiredDateText = requestData.required_date
              ? String(requestData.required_date)
              : 'N/A';

            const subject = `Nueva solicitud de documento - ${employeeName}`;
            const html = `
              <div style="font-family: Arial, sans-serif; line-height: 1.4;">
                <h2 style="margin: 0 0 12px;">Nueva solicitud de documento</h2>
                <p style="margin: 0 0 12px;">
                  Se ha enviado una nueva solicitud de documento desde Gestiones.
                </p>
                <ul>
                  <li><strong>Empleado:</strong> ${employeeName}</li>
                  <li><strong>Tipo:</strong> ${requestData.document_type}</li>
                  <li><strong>Motivo:</strong> ${safeReason}</li>
                  <li><strong>Fecha requerida:</strong> ${requiredDateText}</li>
                  ${
                    requestId
                      ? `<li><strong>ID:</strong> ${requestId}</li>`
                      : ''
                  }
                </ul>
                <p style="color:#666; font-size: 12px; margin-top: 16px;">
                  Este mensaje fue generado automáticamente por People.
                </p>
              </div>
            `;

            this.http
              .post('/api/email/send', {
                to: 'Verley@blackdogpanama.com',
                subject,
                html,
                fromName: 'People - RRHH',
              })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => undefined,
                error: (e) =>
                  console.warn(
                    '[DocumentRequest] No se pudo enviar email a RRHH',
                    e
                  ),
              });
          })();

          // Reset form
          this.documentType.set('work_letter');
          this.customDocumentType.set('');
          this.documentReason.set('');
          this.documentRequiredDate.set(null);
          this.documentRequestsApi.reload();
          this.submittingDocument.set(false);
        },
        error: (error) => {
          console.error('Error submitting document request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
          });
          this.submittingDocument.set(false);
        },
      });
  }

  public async submitComplaint(): Promise<void> {
    // Prevenir múltiples envíos
    if (this.submittingComplaint()) {
      return;
    }

    if (!this.canSubmitComplaint()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Queja Muy Corta',
        detail: 'Por favor describe tu queja con al menos 10 caracteres',
      });
      return;
    }

    this.submittingComplaint.set(true);

    const complaintData = {
      employee_id: this.allowContact() ? this.currentEmployee()!.id : null, // NULL for anonymous (visible to HR)
      creator_employee_id: this.currentEmployee()!.id, // Always set, even for anonymous (for internal use)
      category: this.complaintCategory(),
      complaint: this.complaintText(),
      allow_contact: this.allowContact(),
      contact_method: this.allowContact() ? this.contactMethod() : null,
      status: 'pending',
    };

    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
        complaintData,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response: any) => {
          // La respuesta puede ser un array o un objeto único
          const complaint = Array.isArray(response) ? response[0] : response;

          if (complaint && complaint.id) {
            // Crear el primer mensaje con el texto de la queja
            const messageData = {
              complaint_id: complaint.id,
              sender_id: this.allowContact()
                ? this.currentEmployee()!.id
                : null,
              sender_type: 'employee',
              is_anonymous: !this.allowContact(),
              message: this.complaintText().trim(),
              thread_id: complaint.thread_id || complaint.id, // Usar thread_id o id como fallback
            };

            try {
              await firstValueFrom(
                this.http.post(
                  `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
                  messageData,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Prefer: 'return=representation',
                    },
                  }
                )
              );

              this.messageService.add({
                severity: 'success',
                summary: 'Queja Enviada',
                detail: this.allowContact()
                  ? 'Tu queja ha sido enviada. Recibirás respuesta de RRHH pronto.'
                  : 'Tu queja ha sido enviada de forma anónima. Recibirás respuesta de RRHH pronto.',
              });

              // Reset form
              this.complaintText.set('');
              this.complaintCategory.set('work_environment');
              this.allowContact.set(false);
              this.complaintsApi.reload();
              this.submittingComplaint.set(false);
            } catch (messageError: any) {
              console.error('Error creating message:', messageError);
              // La queja se creó pero el mensaje no, mostrar advertencia
              this.messageService.add({
                severity: 'warn',
                summary: 'Queja Enviada',
                detail:
                  'La queja fue creada pero hubo un problema al crear el mensaje. Contacta a RRHH si no recibes respuesta.',
              });
              this.complaintsApi.reload();
              this.submittingComplaint.set(false);
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo obtener el ID de la queja creada',
            });
            this.submittingComplaint.set(false);
          }
        },
        error: (error: any) => {
          console.error('Error submitting complaint:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error?.error?.message ||
              error?.message ||
              'No se pudo enviar la queja. Por favor intenta de nuevo.',
          });
          this.submittingComplaint.set(false);
        },
      });
  }

  public getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      work_letter: 'Carta de Trabajo',
      salary_certificate: 'Certificado de Salario',
      employment_certificate: 'Certificado de Empleo',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  public getComplaintCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      work_environment: 'Ambiente Laboral',
      harassment: 'Acoso o Discriminación',
      safety: 'Seguridad',
      management: 'Supervisión/Gerencia',
      benefits: 'Beneficios',
      other: 'Otro',
    };
    return labels[category] || category;
  }

  public downloadDocument(url: string | null | undefined): void {
    if (!url) {
      return;
    }
    try {
      // Si la URL es relativa (empieza con /disabilities/ o disabilities/), construir la URL completa
      let fullUrl = url;
      if (url.startsWith('/disabilities/') || url.startsWith('disabilities/')) {
        const path = url.startsWith('/') ? url.slice(1) : url;
        fullUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/${path}`;
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Si es una ruta relativa sin prefijo, asumir que es del bucket disabilities
        const path = url.startsWith('/') ? url.slice(1) : url;
        fullUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/disabilities/${path}`;
      }
      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error('Error al descargar documento:', error);
    }
  }

  public viewResponse(complaint: any): void {
    this.selectedComplaint.set(complaint);
    this.conversationDialogVisible.set(true);
    this.replyMessage.set('');
    // Recargar mensajes cuando se abre la conversación
    this.complaintMessagesApi.reload();
    // Marcar mensajes de HR como leídos cuando el empleado abre la conversación
    this.markMessagesAsRead(complaint);
  }

  public async markMessagesAsRead(complaint: any): Promise<void> {
    // Esperar a que se carguen los mensajes
    if (!this.complaintMessagesApi.value()) {
      // Esperar un poco para que se carguen los mensajes
      setTimeout(() => this.markMessagesAsRead(complaint), 500);
      return;
    }

    const messages = this.complaintMessagesApi.value() || [];
    // Marcar mensajes de HR como leídos cuando el empleado los ve
    const unreadMessages = messages.filter(
      (m) => m.sender_type === 'hr' && !m.is_read
    );

    if (unreadMessages.length === 0) return;

    // Marcar todos los mensajes de HR como leídos
    for (const message of unreadMessages) {
      try {
        await firstValueFrom(
          this.http.patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?id=eq.${message.id}`,
            { is_read: true, read_at: new Date().toISOString() },
            {
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
            }
          )
        );
      } catch (error: any) {
        console.error('Error marking message as read:', error);
      }
    }

    // Recargar mensajes para actualizar el estado
    this.complaintMessagesApi.reload();
    // Recargar quejas para actualizar contadores
    this.complaintsApi.reload();
  }

  public closeConversation(): void {
    this.conversationDialogVisible.set(false);
    this.selectedComplaint.set(null);
    this.replyMessage.set('');
    // Recargar quejas para actualizar contadores
    this.complaintsApi.reload();
  }

  // Gestiones - Funciones para manejar formularios
  public openGestionForm(formType: string): void {
    this.activeGestionForm.set(formType);
    this.showGestionDialog.set(true);

    // Pre-seleccionar el tipo de timeoff según el formulario
    if (
      formType === 'vacations' ||
      formType === 'license' ||
      formType === 'personal' ||
      formType === 'maternity'
    ) {
      const types = this.timeoffTypes();
      let typeName = '';
      if (formType === 'vacations') typeName = 'Vacaciones';
      else if (formType === 'license') typeName = 'Licencia';
      else if (formType === 'personal') typeName = 'Permiso Personal';
      else if (formType === 'maternity') typeName = 'Licencia de Maternidad';

      const foundType = types.find((t) =>
        t.name.toLowerCase().includes(typeName.toLowerCase())
      );
      if (foundType) {
        this.selectedTimeoffType.set(foundType.id);
      }
    }
  }

  public closeGestionForm(): void {
    this.showGestionDialog.set(false);
    this.activeGestionForm.set(null);
    // Reset form fields
    this.timeoffStartDate.set(null);
    this.timeoffEndDate.set(null);
    this.timeoffNotes.set('');
    this.selectedTimeoffType.set(null);
  }

  public openNotificationsDialog(): void {
    this.showNotificationsDialog.set(true);
    this.notificationsService.reload();
  }

  public closeNotificationsDialog(): void {
    this.showNotificationsDialog.set(false);
    // Limpiar el fragmento de notificaciones al cerrar
    const currentUrl = this.router.url;
    if (currentUrl.includes('#notifications')) {
      this.router.navigate(['/employee-portal'], {
        fragment: undefined,
        replaceUrl: true,
      });
    }
  }

  public markNotificationAsRead(notificationId: string): void {
    this.notificationsService.markAsRead(notificationId);
  }

  public markAllNotificationsAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  public getNotificationIcon(messageType: string | null | undefined): string {
    if (!messageType) return 'pi pi-bell';

    const iconMap: Record<string, string> = {
      info: 'pi pi-info-circle',
      warning: 'pi pi-exclamation-triangle',
      error: 'pi pi-times-circle',
      success: 'pi pi-check-circle',
      document: 'pi pi-file',
      approval: 'pi pi-check',
      rejection: 'pi pi-times',
      reminder: 'pi pi-clock',
      system: 'pi pi-cog',
    };

    return iconMap[messageType.toLowerCase()] || 'pi pi-bell';
  }

  public getNotificationTitle(messageType: string | null | undefined): string {
    if (!messageType) return 'Notificación';

    const titleMap: Record<string, string> = {
      info: 'Información',
      warning: 'Advertencia',
      error: 'Error',
      success: 'Éxito',
      document: 'Documento',
      approval: 'Aprobación',
      rejection: 'Rechazo',
      reminder: 'Recordatorio',
      system: 'Sistema',
    };

    return titleMap[messageType.toLowerCase()] || 'Notificación';
  }

  public getNotificationTypeLabel(
    messageType: string | null | undefined
  ): string {
    if (!messageType) return '';
    return (
      messageType.charAt(0).toUpperCase() + messageType.slice(1).toLowerCase()
    );
  }

  public getGestionFormTitle(): string {
    const form = this.activeGestionForm();
    const titles: Record<string, string> = {
      disabilities: 'Subir Incapacidad',
      documents: 'Solicitar Documentos',
      complaints: 'Buzón de Sugerencias',
      vacations: 'Solicitar Vacaciones',
      license: 'Solicitar Licencia',
      personal: 'Solicitar Permiso Personal',
      maternity: 'Solicitar Licencia de Maternidad',
    };
    return titles[form || ''] || 'Formulario';
  }

  public getTimeoffTypeIdForForm(): string | null {
    const form = this.activeGestionForm();
    const types = this.timeoffTypes();

    if (!form || !types.length) return null;

    let typeName = '';
    if (form === 'vacations') typeName = 'Vacaciones';
    else if (form === 'license') typeName = 'Licencia';
    else if (form === 'personal') typeName = 'Permiso Personal';
    else if (form === 'maternity') typeName = 'Licencia de Maternidad';

    const foundType = types.find((t) =>
      t.name.toLowerCase().includes(typeName.toLowerCase())
    );

    return foundType?.id || this.selectedTimeoffType() || null;
  }

  public submitTimeoffRequest(): void {
    // Prevenir múltiples envíos
    if (this.submittingTimeoff()) {
      return;
    }

    if (!this.currentEmployee()?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al empleado',
      });
      return;
    }

    const typeId = this.getTimeoffTypeIdForForm();
    if (!typeId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor selecciona un tipo de solicitud',
      });
      return;
    }

    if (!this.timeoffStartDate() || !this.timeoffEndDate()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor completa las fechas de inicio y fin',
      });
      return;
    }

    if (this.timeoffStartDate()! > this.timeoffEndDate()!) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La fecha de inicio no puede ser posterior a la fecha de fin',
      });
      return;
    }

    this.submittingTimeoff.set(true);

    const timeoffData = {
      type_id: typeId,
      employee_id: this.currentEmployee()!.id,
      date_from: format(this.timeoffStartDate()!, 'yyyy-MM-dd'),
      date_to: format(this.timeoffEndDate()!, 'yyyy-MM-dd'),
      notes: this.timeoffNotes() ? [this.timeoffNotes()] : [],
      is_approved: false,
    };

    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
        timeoffData,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Solicitud Enviada',
            detail: 'Tu solicitud ha sido enviada y será revisada por RRHH',
          });
          this.submittingTimeoff.set(false);
          // Reset form
          this.timeoffStartDate.set(null);
          this.timeoffEndDate.set(null);
          this.timeoffNotes.set('');
        },
        error: (error: any) => {
          console.error('Error submitting timeoff:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error?.error?.message ||
              error?.message ||
              'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
          });
          this.submittingTimeoff.set(false);
        },
      });
  }

  public async sendReply(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint || !this.replyMessage().trim()) return;

    this.sendingReply.set(true);
    const currentEmployee = this.currentEmployee();
    if (!currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al usuario actual',
      });
      this.sendingReply.set(false);
      return;
    }

    const messageData = {
      complaint_id: complaint.id,
      sender_id: currentEmployee.id,
      sender_type: 'employee',
      is_anonymous: false, // Si la queja ya tiene employee_id, no puede ser anónima
      message: this.replyMessage().trim(),
      thread_id: complaint.thread_id || complaint.id,
    };

    try {
      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
          messageData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Mensaje Enviado',
        detail: 'Tu respuesta ha sido enviada correctamente',
      });

      this.replyMessage.set('');
      this.complaintMessagesApi.reload();
      this.complaintsApi.reload();
      this.sendingReply.set(false);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo enviar el mensaje',
      });
      this.sendingReply.set(false);
    }
  }

  public hasUnreadMessages(complaint: any): boolean {
    // Primero verificar si hay mensajes sin leer de la conversación actual
    if (complaint.id === this.selectedComplaint()?.id) {
      const messages = this.conversationMessages();
      return messages.some((m) => m.sender_type === 'hr' && !m.is_read);
    }

    // Si no está seleccionada, usar el mapa de mensajes sin leer
    return this.unreadMessagesMap().has(complaint.id);
  }
}
