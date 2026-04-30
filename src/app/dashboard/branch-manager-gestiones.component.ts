import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addDays, compareAsc, differenceInCalendarDays, format, set, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { uploadCompensatory } from '../employee-portal/actions/employee-portal-compensatory.actions';
import { EmployeePortalCompensatoryComponent } from '../employee-portal/components/employee-portal-compensatory.component';
import { PORTAL_PERMIT_TYPE_OPTIONS } from '../employee-portal/components/employee-portal-work-permit.component';
import { calculateCompensatoryAmount } from '../employee-portal/utils/employee-portal-compensatory.utils';
import { Branch, Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { TutorialGuideService } from '../services/tutorial-guide.service';
import { TutorialSpotlightComponent } from '../shared/components/tutorial-spotlight.component';
import { TutorialStepDirective } from '../shared/directives/tutorial-step.directive';
import {
  GESTIONES_TUTORIAL_INTRO,
  GESTIONES_TUTORIALS,
} from '../shared/tutorial-configs/gestiones-tutorials';
import { getEnv } from '../utils/env.utils';
import {
  getRequestColorClass,
  getRequestIcon,
  getRequestStatusLabel,
  getRequestStatusSeverity,
  getRequestTypeLabel,
  getRequestTypeSeverity,
  getSeverityColor,
} from './request.helpers';
import { ScheduleChangeGestionFormComponent } from './gestiones-forms/schedule-change-gestion-form.component';
import { SupplyGestionFormComponent } from './gestiones-forms/supply-gestion-form.component';
import { UniformTypesService } from './modules/uniform-requests/data/uniform-types.service';

type ManagementCard = {
  id: string;
  label: string;
  description: string;
  icon: string;
  colorClass: string;
  section:
    | 'disabilities'
    | 'documents'
    | 'vacations'
    | 'compensatory'
    | 'timelog_correction'
    | 'uniform_request'
    | 'supply_request'
    | 'work_permit'
    | 'schedule_change';
};

@Component({
  selector: 'pt-branch-manager-gestiones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Select,
    TooltipModule,
    DatePicker,
    FileUpload,
    InputText,
    Textarea,
    EmployeePortalCompensatoryComponent,
    TutorialStepDirective,
    TutorialSpotlightComponent,
    SupplyGestionFormComponent,
    ScheduleChangeGestionFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-briefcase text-amber-400"></i>
            <span>Gestiones de Empleados</span>
          </div>
        </ng-template>
        <ng-template #subtitle>
          <div class="flex items-center justify-between">
            <span
              >Realiza solicitudes en nombre de los empleados de tu
              sucursal</span
            >
            <p-button
              icon="pi pi-question-circle"
              label="Modo Guía"
              severity="help"
              [text]="true"
              size="small"
              (onClick)="startTutorial()"
              pTooltip="Ver tutorial interactivo"
            />
          </div>
        </ng-template>

        <!-- Vista de Tarjetas de Gestiones -->
        @if (!selectedGestionType()) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
          @for (card of managementCards; track card.id) {
          <p-card
            class="cursor-pointer hover:shadow-lg hover:bg-neutral-700/30 transition-all hover:ring-2 hover:ring-amber-400/50 p-3"
            [ptTutorialStep]="'gestiones-card-' + card.section"
            (click)="selectGestion(card.section)"
          >
            <div class="flex flex-col items-center text-center gap-2">
              <div
                [class]="
                  'w-10 h-10 rounded-full flex items-center justify-center ' +
                  card.colorClass
                "
              >
                <i [class]="'pi ' + card.icon + ' text-lg'"></i>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-white mb-1">
                  {{ card.label }}
                </h4>
                <p class="text-xs text-gray-400 leading-tight">
                  {{ card.description }}
                </p>
              </div>
            </div>
          </p-card>
          }
        </div>
        }

        <!-- Paso 1: Seleccionar Empleado -->
        @if (selectedGestionType() && !selectedEmployee()) {
        <div class="space-y-4 mt-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <i
                [class]="
                  'pi ' +
                  getCurrentCard()?.icon +
                  ' ' +
                  (getCurrentCard()?.colorClass
                    ? getCurrentCard()!.colorClass.split(' ')[1] || ''
                    : '')
                "
              ></i>
              <h3 class="text-lg font-semibold text-white m-0">
                {{ getCurrentCard()?.label }}
              </h3>
            </div>
            <p-button
              icon="pi pi-arrow-left"
              severity="secondary"
              text
              rounded
              (onClick)="backToGestiones()"
              pTooltip="Volver"
            />
          </div>

          <div
            class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
              >
                <i class="pi pi-user text-cyan-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-white m-0">
                Paso 1: Selecciona el Empleado
              </h3>
            </div>
            <p class="text-sm text-gray-400 mb-4">
              Selecciona al empleado para quien deseas realizar esta gestión.
            </p>
            <p-select
              [options]="branchEmployees"
              optionLabel="short_name"
              optionValue="id"
              [(ngModel)]="selectedEmployeeId"
              placeholder="Buscar empleado..."
              [filter]="true"
              filterBy="short_name"
              showClear
              appendTo="body"
              styleClass="w-full"
              ptTutorialStep="gestiones-employee-select"
            >
              <ng-template #selectedItem let-selected>
                @if (selected) {
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"
                  >
                    <span class="text-cyan-400 font-semibold text-sm">
                      {{ getEmployeeInitials(selected) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium text-white">
                      {{ selected.short_name }}
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ selected.position?.name }}
                    </div>
                  </div>
                </div>
                }
              </ng-template>
              <ng-template #item let-item>
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"
                  >
                    <span class="text-cyan-400 font-semibold text-sm">
                      {{ getEmployeeInitials(item) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium">{{ item.short_name }}</div>
                    <div class="text-xs text-gray-400">
                      {{ item.position?.name }}
                    </div>
                  </div>
                </div>
              </ng-template>
            </p-select>

            @if (selectedEmployeeId()) {
            <div
              class="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  @let employee = getSelectedEmployeeData(); @if (employee) {
                  <div
                    class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
                  >
                    <span class="text-cyan-400 font-semibold">
                      {{ getEmployeeInitials(employee) }}
                    </span>
                  </div>
                  <div>
                    <div class="text-white font-medium">
                      {{ employee.first_name }} {{ employee.father_name }}
                    </div>
                    <div class="text-sm text-cyan-300">
                      {{ employee.position?.name }}
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ employee.branch?.name }}
                    </div>
                  </div>
                  }
                </div>
                <p-button
                  label="Continuar"
                  icon="pi pi-arrow-right"
                  severity="info"
                  (onClick)="confirmEmployee()"
                  ptTutorialStep="gestiones-employee-confirm"
                />
              </div>
            </div>
            }
          </div>
        </div>
        }

        <!-- Paso 2: Formulario de Gestión -->
        @if (selectedEmployee()) {
        <div class="space-y-4 mt-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <i
                [class]="
                  'pi ' +
                  getCurrentCard()?.icon +
                  ' ' +
                  (getCurrentCard()?.colorClass
                    ? getCurrentCard()!.colorClass.split(' ')[1] || ''
                    : '')
                "
              ></i>
              <h3 class="text-lg font-semibold text-white m-0">
                {{ getCurrentCard()?.label }}
              </h3>
            </div>
            <p-button
              icon="pi pi-arrow-left"
              severity="secondary"
              text
              rounded
              (onClick)="backToEmployeeSelection()"
              pTooltip="Volver"
            />
          </div>

          <!-- Banner del empleado seleccionado (oculto para supply_request y schedule_change que tienen su propio layout) -->
          @if (selectedGestionType() !== 'supply_request' && selectedGestionType() !== 'schedule_change') {
          <div
            class="bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-400/30 rounded-lg p-4"
          >
            <div class="flex items-center gap-3">
              @let employee = selectedEmployee(); @if (employee) {
              <div
                class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center"
              >
                <span class="text-cyan-400 font-semibold text-lg">
                  {{ getEmployeeInitials(employee) }}
                </span>
              </div>
              <div>
                <h4 class="text-white font-semibold text-lg">
                  {{ employee.first_name }} {{ employee.father_name }}
                </h4>
                <p class="text-cyan-300 text-sm">
                  {{ employee.position?.name }} • {{ employee.branch?.name }}
                </p>
                @if (employee.employee_number) {
                <p class="text-gray-400 text-xs">
                  #{{ employee.employee_number }}
                </p>
                }
              </div>
              }
            </div>
          </div>
          }

          <!-- Formularios específicos según el tipo de gestión -->
          @if (selectedGestionType() === 'compensatory') {
          <pt-employee-portal-compensatory
            [isBranchManagerView]="true"
            [selectedEmployee]="selectedEmployee()"
            [compensatoryType]="compensatoryType()"
            (compensatoryTypeChange)="compensatoryType.set($event)"
            [compensatoryDate]="compensatoryDate()"
            (compensatoryDateChange)="compensatoryDate.set($event)"
            [compensatoryTimeStart]="compensatoryTimeStart()"
            (compensatoryTimeStartChange)="setCompensatoryTimeStart($event)"
            [compensatoryTimeEnd]="compensatoryTimeEnd()"
            (compensatoryTimeEndChange)="setCompensatoryTimeEnd($event)"
            [compensatoryStartDate]="compensatoryStartDate()"
            (compensatoryStartDateChange)="compensatoryStartDate.set($event)"
            [compensatoryEndDate]="compensatoryEndDate()"
            (compensatoryEndDateChange)="compensatoryEndDate.set($event)"
            [compensatoryReason]="compensatoryReason()"
            (compensatoryReasonChange)="compensatoryReason.set($event)"
            [manualOvertimeDates]="manualOvertimeDates()"
            [newOvertimeDate]="newOvertimeDate()"
            (newOvertimeDateChange)="newOvertimeDate.set($event)"
            (addManualDate)="addManualOvertimeDate($event)"
            (removeManualDate)="removeManualOvertimeDate($event)"
            [compensatoryFile]="compensatoryFile()"
            (compensatoryFileChange)="onCompensatoryFileChanged($event)"
            [uploadingFile]="uploadingCompensatoryDoc()"
            [compensatoryAmount]="compensatoryAmount()"
            [canSubmit]="canSubmitCompensatory()"
            [submitting]="submittingCompensatory()"
            (submitRequest)="submitCompensatoryRequest()"
            (closeSection)="reset()"
            [minPastDate]="minPastDate"
            [today]="today"
          />
          } @if (selectedGestionType() === 'disabilities') {
          <div class="space-y-5">
            <!-- Paso 1: Período de Incapacidad -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-calendar text-blue-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 1: Período de Incapacidad
                </h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de Inicio</label
                  >
                  <p-datepicker
                    [ngModel]="disabilityStartDate()"
                    (ngModelChange)="disabilityStartDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de inicio"
                    [maxDate]="today"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="disabilities-start-date"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de Fin</label
                  >
                  <p-datepicker
                    [ngModel]="disabilityEndDate()"
                    (ngModelChange)="disabilityEndDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de fin"
                    [minDate]="disabilityStartDate() || today"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="disabilities-end-date"
                  />
                </div>
              </div>
              @if (disabilityDaysCount() > 0) {
              <div
                class="mt-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg"
              >
                <p class="text-sm text-blue-300">
                  <i class="pi pi-info-circle mr-2"></i>
                  Total: <strong>{{ disabilityDaysCount() }} día(s)</strong>
                </p>
              </div>
              }
            </div>

            <!-- Paso 2: Descripción -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file-edit text-blue-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 2: Descripción
                </h3>
              </div>
              <textarea
                pInputTextarea
                [ngModel]="disabilityDescription()"
                (ngModelChange)="disabilityDescription.set($event)"
                placeholder="Describe el motivo de la incapacidad (diagnóstico, síntomas, etc.)"
                rows="4"
                class="w-full"
                ptTutorialStep="disabilities-description"
              ></textarea>
            </div>

            <!-- Paso 3: Documento -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file text-blue-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 3: Documento Médico
                </h3>
              </div>
              <p class="text-sm text-gray-400 mb-4">
                Adjunta el certificado médico o documento de incapacidad en
                formato PDF o imagen.
              </p>
              <p-fileUpload
                mode="basic"
                accept=".pdf,.jpg,.jpeg,.png"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar Archivo"
                (onSelect)="onDisabilityFileSelect($event)"
                class="w-full"
                ptTutorialStep="disabilities-file"
              />
              @if (disabilityFile()) {
              <div
                class="mt-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  @if (uploadingDisabilityDoc()) {
                  <i class="pi pi-spin pi-spinner text-blue-400"></i>
                  <span class="text-sm text-gray-300">Subiendo...</span>
                  } @else {
                  <i class="pi pi-file text-blue-400"></i>
                  <span class="text-sm text-gray-300">{{
                    disabilityFile()!.name
                  }}</span>
                  }
                </div>
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="clearDisabilityFile()"
                  pTooltip="Eliminar archivo"
                  [disabled]="uploadingDisabilityDoc()"
                />
              </div>
              }
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-between pt-4">
              <p-button
                label="Volver"
                icon="pi pi-arrow-left"
                severity="secondary"
                (onClick)="reset()"
              />
              <p-button
                label="Enviar Solicitud"
                icon="pi pi-check"
                [disabled]="!canSubmitDisability()"
                [loading]="uploadingDisability()"
                (onClick)="submitDisabilityRequest()"
                severity="success"
                ptTutorialStep="disabilities-submit"
              />
            </div>
          </div>
          } @if (selectedGestionType() === 'vacations') {
          <div class="space-y-5">
            <!-- Paso 1: Período de Vacaciones -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-calendar text-purple-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 1: Período de Vacaciones
                </h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de Inicio</label
                  >
                  <p-datepicker
                    [ngModel]="vacationStartDate()"
                    (ngModelChange)="vacationStartDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de inicio"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="vacations-start-date"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de Fin</label
                  >
                  <p-datepicker
                    [ngModel]="vacationEndDate()"
                    (ngModelChange)="vacationEndDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de fin"
                    [minDate]="vacationStartDate() || today"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="vacations-end-date"
                  />
                </div>
              </div>
              @if (vacationDaysCount() > 0) {
              <div
                class="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg"
              >
                <p class="text-sm text-purple-300">
                  <i class="pi pi-info-circle mr-2"></i>
                  Total:
                  <strong
                    >{{ vacationDaysCount() }} día(s) de vacaciones</strong
                  >
                </p>
              </div>
              }
            </div>

            <!-- Paso 2: Motivo -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file-edit text-purple-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 2: Motivo (Opcional)
                </h3>
              </div>
              <textarea
                pInputTextarea
                [ngModel]="vacationReason()"
                (ngModelChange)="vacationReason.set($event)"
                placeholder="Motivo o comentarios adicionales sobre las vacaciones"
                rows="3"
                class="w-full"
                ptTutorialStep="vacations-reason"
              ></textarea>
            </div>

            <!-- Paso 3: Documento de Respaldo -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file text-purple-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 3: Documento de Respaldo
                </h3>
              </div>
              <p class="text-sm text-gray-400 mb-4">
                Adjunta la solicitud física firmada como PDF para respaldar la
                solicitud. Este documento es obligatorio.
              </p>
              <p-fileUpload
                mode="basic"
                accept=".pdf,.jpg,.jpeg,.png"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar Archivo"
                (onSelect)="onVacationFileSelect($event)"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-2">
                Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
              </p>
              @if (vacationFile()) {
              <div
                class="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  @if (uploadingVacationDoc()) {
                  <i class="pi pi-spin pi-spinner text-purple-400"></i>
                  <span class="text-sm text-gray-300">Subiendo...</span>
                  } @else {
                  <i class="pi pi-file text-purple-400"></i>
                  <span class="text-sm text-gray-300">{{
                    vacationFile()!.name
                  }}</span>
                  }
                </div>
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="clearVacationFile()"
                  pTooltip="Eliminar archivo"
                  [disabled]="uploadingVacationDoc()"
                />
              </div>
              }
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-between pt-4">
              <p-button
                label="Volver"
                icon="pi pi-arrow-left"
                severity="secondary"
                (onClick)="reset()"
              />
              <p-button
                label="Solicitar Vacaciones"
                icon="pi pi-check"
                [disabled]="!canSubmitVacation()"
                [loading]="submittingVacation()"
                (onClick)="submitVacationRequest()"
                severity="success"
                ptTutorialStep="vacations-submit"
              />
            </div>
          </div>
          } @if (selectedGestionType() === 'documents') {
          <div class="space-y-5">
            <!-- Paso 1: Tipo de Documento -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file text-green-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 1: Tipo de Documento
                </h3>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-gray-300"
                  >Selecciona el tipo de documento</label
                >
                <p-select
                  [ngModel]="documentType()"
                  (ngModelChange)="documentType.set($event)"
                  [options]="documentTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Tipo de documento"
                  styleClass="w-full"
                  appendTo="body"
                  ptTutorialStep="documents-type"
                />
              </div>
              @if (documentType() === 'other') {
              <div class="mt-3">
                <textarea
                  pInputTextarea
                  [ngModel]="customDocumentType()"
                  (ngModelChange)="customDocumentType.set($event)"
                  placeholder="Especifica el tipo de documento que necesitas"
                  rows="2"
                  class="w-full"
                ></textarea>
              </div>
              }
            </div>

            <!-- Paso 2: Motivo y Fecha -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file-edit text-green-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 2: Detalles de la Solicitud
                </h3>
              </div>
              <div class="space-y-3">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Dirigido a</label
                  >
                  <textarea
                    pInputTextarea
                    [ngModel]="documentReason()"
                    (ngModelChange)="documentReason.set($event)"
                    placeholder="Explica para quién es dirigido este documento"
                    rows="3"
                    class="w-full"
                    ptTutorialStep="documents-reason"
                  ></textarea>
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha requerida</label
                  >
                  <p-datepicker
                    [ngModel]="documentRequiredDate()"
                    (ngModelChange)="documentRequiredDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="¿Cuándo necesitas el documento?"
                    [minDate]="today"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="documents-date"
                  />
                </div>
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-between pt-4">
              <p-button
                label="Volver"
                icon="pi pi-arrow-left"
                severity="secondary"
                (onClick)="reset()"
              />
              <p-button
                label="Enviar Solicitud"
                icon="pi pi-check"
                [disabled]="!canSubmitDocument()"
                [loading]="submittingDocument()"
                (onClick)="submitDocumentRequest()"
                severity="success"
                ptTutorialStep="documents-submit"
              />
            </div>
          </div>
          } @if (selectedGestionType() === 'timelog_correction') {
          <div class="space-y-5">
            <!-- Paso 1: Fecha y Tipo de Marcación -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-calendar text-orange-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 1: Fecha y Tipo de Marcación
                </h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de la Omisión de Marcación</label
                  >
                  <p-datepicker
                    [ngModel]="timelogCorrectionDate()"
                    (ngModelChange)="timelogCorrectionDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona la fecha"
                    [maxDate]="today"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="timelog-correction-date"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Tipo de Marcación</label
                  >
                  <p-select
                    [ngModel]="timelogCorrectionType()"
                    (ngModelChange)="timelogCorrectionType.set($event)"
                    [options]="timelogTypeOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Selecciona el tipo"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="timelog-correction-type"
                  />
                </div>
              </div>
              @if (timelogCorrectionDate() && timelogCorrectionType()) {
              <div
                class="mt-3 p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg"
              >
                <p class="text-sm text-orange-300">
                  <i class="pi pi-info-circle mr-2"></i>
                  Solicitud de corrección para:
                  <strong>{{ getTimelogCorrectionTypeLabel() }}</strong>
                </p>
              </div>
              }
            </div>

            <!-- Paso 2: Motivo -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file-edit text-orange-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 2: Motivo de la Corrección
                </h3>
              </div>
              <textarea
                pInputTextarea
                [ngModel]="timelogCorrectionReason()"
                (ngModelChange)="timelogCorrectionReason.set($event)"
                placeholder="Explica por qué se necesita la corrección de esta marcación (ej: olvidé marcar entrada, el reloj no funcionaba, etc.)"
                rows="4"
                class="w-full"
                ptTutorialStep="timelog-correction-reason"
              ></textarea>
            </div>

            <!-- Paso 3: Evidencia (Opcional) -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file text-orange-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 3: Evidencia (Opcional)
                </h3>
              </div>
              <p class="text-sm text-gray-400 mb-4">
                Si tienes evidencia de la marcación correcta (captura de
                pantalla, foto del reloj, etc.), puedes adjuntarla.
              </p>
              <p-fileUpload
                mode="basic"
                accept=".pdf,.jpg,.jpeg,.png"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar Archivo"
                (onSelect)="onTimelogCorrectionFileSelect($event)"
                class="w-full"
                ptTutorialStep="timelog-correction-file"
              />
              <p class="text-xs text-gray-500 mt-2">
                Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
              </p>
              @if (timelogCorrectionFile()) {
              <div
                class="mt-3 p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  @if (uploadingTimelogCorrectionDoc()) {
                  <i class="pi pi-spin pi-spinner text-orange-400"></i>
                  <span class="text-sm text-gray-300">Subiendo...</span>
                  } @else {
                  <i class="pi pi-file text-orange-400"></i>
                  <span class="text-sm text-gray-300">{{
                    timelogCorrectionFile()!.name
                  }}</span>
                  }
                </div>
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="clearTimelogCorrectionFile()"
                  pTooltip="Eliminar archivo"
                  [disabled]="uploadingTimelogCorrectionDoc()"
                />
              </div>
              }
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-between pt-4">
              <p-button
                label="Volver"
                icon="pi pi-arrow-left"
                severity="secondary"
                (onClick)="reset()"
              />
              <p-button
                label="Enviar Solicitud"
                icon="pi pi-check"
                [disabled]="!canSubmitTimelogCorrection()"
                [loading]="submittingTimelogCorrection()"
                (onClick)="submitTimelogCorrectionRequest()"
                severity="success"
                ptTutorialStep="timelog-correction-submit"
              />
            </div>
          </div>
          } @if (selectedGestionType() === 'uniform_request') {
          <div class="space-y-5">
            <!-- Paso 1: Tipo de Prenda -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-tag text-teal-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 1: Tipo de Prenda
                </h3>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-gray-300"
                  >¿Qué prenda necesitas?</label
                >
                <p-select
                  [ngModel]="uniformItemType()"
                  (ngModelChange)="uniformItemType.set($event)"
                  [options]="uniformItemTypeOptions()"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Selecciona el tipo de prenda"
                  styleClass="w-full"
                  appendTo="body"
                  ptTutorialStep="uniform-item-type"
                />
              </div>
            </div>

            <!-- Paso 2: Talla y Cantidad -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-sliders-h text-teal-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 2: Talla y Cantidad
                </h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300">Talla</label>
                  <p-select
                    [ngModel]="uniformSize()"
                    (ngModelChange)="uniformSize.set($event)"
                    [options]="uniformSizeOptions"
                    placeholder="Selecciona la talla"
                    styleClass="w-full"
                    appendTo="body"
                    ptTutorialStep="uniform-size"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300">Cantidad que posee actualmente</label>
                  <input
                    pInputText
                    type="number"
                    [ngModel]="uniformCurrentQuantity()"
                    (ngModelChange)="uniformCurrentQuantity.set($event)"
                    min="0"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Cantidad que necesita</label
                  >
                  <input
                    pInputText
                    type="number"
                    [ngModel]="uniformQuantity()"
                    (ngModelChange)="uniformQuantity.set($event)"
                    min="1"
                    max="5"
                    class="w-full"
                    ptTutorialStep="uniform-quantity"
                  />
                  <small class="text-gray-500 text-xs"
                    >Máximo 5 unidades</small
                  >
                </div>
              </div>
              @if (uniformItemType() && uniformSize() && uniformQuantity() >= 1)
              {
              <div
                class="mt-3 p-3 bg-teal-500/10 border border-teal-400/30 rounded-lg"
              >
                <p class="text-sm text-teal-300">
                  <i class="pi pi-check-circle mr-2"></i>
                  Solicitud:
                  <strong
                    >{{ uniformQuantity() }}x
                    {{ getUniformItemTypeLabel() }}</strong
                  >
                  - Talla <strong>{{ uniformSize() }}</strong>
                </p>
              </div>
              }
            </div>

            <!-- Paso 3: Notas Adicionales (Opcional) -->
            <div
              class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
            >
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center"
                >
                  <i class="pi pi-file-edit text-teal-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 3: Notas Adicionales (Opcional)
                </h3>
              </div>
              <textarea
                pInputTextarea
                [ngModel]="uniformNotes()"
                (ngModelChange)="uniformNotes.set($event)"
                placeholder="Comentarios adicionales sobre la solicitud (ej: motivo del cambio, etc.)"
                rows="3"
                class="w-full"
                ptTutorialStep="uniform-notes"
              ></textarea>
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-between pt-4">
              <p-button
                label="Volver"
                icon="pi pi-arrow-left"
                severity="secondary"
                (onClick)="reset()"
              />
              <p-button
                label="Solicitar Uniforme"
                icon="pi pi-check"
                [disabled]="!canSubmitUniform()"
                [loading]="submittingUniform()"
                (onClick)="submitUniformRequest()"
                severity="success"
                ptTutorialStep="uniform-submit"
              />
            </div>
          </div>
          } @if (selectedGestionType() === 'supply_request') {
          @if (currentEmployee) {
          <pt-supply-gestion-form
            [currentEmployee]="currentEmployee"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onSupplyRequestCreated()"
            (close)="reset()"
          />
          }
          } @if (selectedGestionType() === 'work_permit') {
          <div class="space-y-5">
            <!-- Paso 1: Tipo de Permiso -->
            <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <i class="pi pi-id-card text-amber-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">Paso 1: Tipo de Permiso</h3>
              </div>
              <p-select
                [ngModel]="workPermitType()"
                (ngModelChange)="workPermitType.set($event)"
                [options]="workPermitTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecciona el tipo de permiso"
                styleClass="w-full"
                appendTo="body"
              />
            </div>

            <!-- Paso 2: Período -->
            <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <i class="pi pi-calendar text-amber-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">Paso 2: Período</h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300">Fecha de Inicio</label>
                  <p-datepicker
                    [ngModel]="workPermitStartDate()"
                    (ngModelChange)="workPermitStartDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de inicio"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300">Fecha de Fin</label>
                  <p-datepicker
                    [ngModel]="workPermitEndDate()"
                    (ngModelChange)="workPermitEndDate.set($event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de fin"
                    [minDate]="workPermitStartDate() || undefined"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300">
                    Hora de Inicio <span class="text-gray-500 text-xs">(Opcional)</span>
                  </label>
                  <p-datepicker
                    [ngModel]="workPermitStartTime()"
                    (ngModelChange)="workPermitStartTime.set($event)"
                    [showIcon]="true"
                    [timeOnly]="true"
                    [showTime]="true"
                    [hourFormat]="'12'"
                    placeholder="Hora inicio"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300">
                    Hora de Fin <span class="text-gray-500 text-xs">(Opcional)</span>
                  </label>
                  <p-datepicker
                    [ngModel]="workPermitEndTime()"
                    (ngModelChange)="workPermitEndTime.set($event)"
                    [showIcon]="true"
                    [timeOnly]="true"
                    [showTime]="true"
                    [hourFormat]="'12'"
                    placeholder="Hora fin"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
              </div>
            </div>

            <!-- Paso 3: Observaciones -->
            <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <i class="pi pi-file-edit text-amber-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">Paso 3: Observaciones</h3>
              </div>
              <textarea
                pInputTextarea
                [ngModel]="workPermitObservations()"
                (ngModelChange)="workPermitObservations.set($event)"
                placeholder="Describe el motivo del permiso, observaciones adicionales..."
                rows="4"
                class="w-full"
              ></textarea>
            </div>

            <!-- Paso 4: Documento (Opcional) -->
            <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <i class="pi pi-file text-amber-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white m-0">
                  Paso 4: Documento <span class="text-gray-400 text-sm font-normal">(Opcional)</span>
                </h3>
              </div>
              <p-fileUpload
                mode="basic"
                accept=".pdf,.jpg,.jpeg,.png"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar Archivo"
                (onSelect)="onWorkPermitFileSelect($event)"
                class="w-full"
              />
              @if (workPermitFile()) {
              <div class="mt-3 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-2">
                  @if (uploadingWorkPermitDoc()) {
                  <i class="pi pi-spin pi-spinner text-amber-400"></i>
                  <span class="text-sm text-gray-300">Subiendo...</span>
                  } @else {
                  <i class="pi pi-file text-amber-400"></i>
                  <span class="text-sm text-gray-300">{{ workPermitFile()!.name }}</span>
                  }
                </div>
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="clearWorkPermitFile()"
                  pTooltip="Eliminar archivo"
                  [disabled]="uploadingWorkPermitDoc()"
                />
              </div>
              }
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-between pt-4">
              <p-button
                label="Volver"
                icon="pi pi-arrow-left"
                severity="secondary"
                (onClick)="reset()"
              />
              <p-button
                label="Enviar Solicitud"
                icon="pi pi-check"
                [disabled]="!canSubmitWorkPermit()"
                [loading]="submittingWorkPermit()"
                (onClick)="submitWorkPermitRequest()"
                severity="success"
              />
            </div>
          </div>
          }

          @if (selectedGestionType() === 'schedule_change') {
            <pt-schedule-change-gestion-form
              [branchEmployees]="branchEmployees"
              [currentEmployee]="currentEmployee!"
              [schedules]="schedulesList()"
              [branchId]="currentBranch?.id || null"
              (back)="reset()"
              (requestCreated)="onScheduleChangeRequestCreated()"
            />
          }
        </div>
        }
      </p-card>

      <!-- Tutorial Spotlight Overlay -->
      <pt-tutorial-spotlight />
    </div>
  `,
})
export class BranchManagerGestionesComponent {
  // Helper methods for requests display
  public getRequestIcon = getRequestIcon;
  public getRequestColorClass = getRequestColorClass;
  public getRequestStatusLabel = getRequestStatusLabel;
  public getRequestStatusSeverity = getRequestStatusSeverity;
  public getRequestTypeLabel = getRequestTypeLabel;
  public getRequestTypeSeverity = getRequestTypeSeverity;
  public getSeverityColor = getSeverityColor;

  @Input() branchEmployees: (Employee & { short_name: string })[] = [];
  @Input() currentBranch: Branch | null | undefined = null;
  @Input() currentEmployee: Employee | null | undefined = null;

  @Output() requestCreated = new EventEmitter<void>();

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);
  private uniformTypesService = inject(UniformTypesService);

  private tutorialService = inject(TutorialGuideService);
  private dashboardStore = inject(DashboardStore);

  public schedulesList = computed(() => this.dashboardStore.schedules.entities() ?? []);
  private getEnv = getEnv; // Make getEnv available if needed, or implement valid logic using injected services

  // Fechas para formularios
  public today = startOfDay(new Date());
  public minPastDate = addDays(this.today, -30);
  public MAX_PAST_DAYS = 30;

  // Signals para el flujo principal
  public selectedGestionType = signal<
    | 'disabilities'
    | 'documents'
    | 'vacations'
    | 'compensatory'
    | 'timelog_correction'
    | 'uniform_request'
    | 'supply_request'
    | 'work_permit'
    | 'schedule_change'
    | null
  >(null);
  public selectedEmployeeId = signal<string | null>(null);
  public selectedEmployee = signal<Employee | null>(null);

  // Signals para Compensatorio
  public compensatoryType = signal<'hours' | 'days'>('hours');
  public compensatoryDate = signal<Date | null>(null);
  public compensatoryTimeStart = signal<Date | null>(null);
  public compensatoryTimeEnd = signal<Date | null>(null);
  public compensatoryStartDate = signal<Date | null>(null);
  public compensatoryEndDate = signal<Date | null>(null);
  public compensatoryReason = signal<string>('');
  public manualOvertimeDates = signal<Date[]>([]);
  public newOvertimeDate = signal<Date | null>(null);
  public compensatoryFile = signal<File | null>(null);
  public submittingCompensatory = signal<boolean>(false);
  public compensatoryDocUrl = signal<string | null>(null);
  public uploadingCompensatoryDoc = signal<boolean>(false);

  // Signals para Incapacidades
  public disabilityStartDate = signal<Date | null>(null);
  public disabilityEndDate = signal<Date | null>(null);
  public disabilityDescription = signal<string>('');
  public disabilityFile = signal<File | null>(null);
  public disabilityDocUrl = signal<string | null>(null);
  public uploadingDisability = signal<boolean>(false);
  public uploadingDisabilityDoc = signal<boolean>(false);

  // Signals para Vacaciones
  public vacationStartDate = signal<Date | null>(null);
  public vacationEndDate = signal<Date | null>(null);
  public vacationReason = signal<string>('');
  public vacationFile = signal<File | null>(null);
  public vacationDocUrl = signal<string | null>(null);
  public submittingVacation = signal<boolean>(false);
  public uploadingVacationDoc = signal<boolean>(false);

  // Signals para Documentos
  public documentType = signal<string>('work_letter');
  public customDocumentType = signal<string>('');
  public documentReason = signal<string>('');
  public documentRequiredDate = signal<Date | null>(null);
  public submittingDocument = signal<boolean>(false);

  // Signals para Omisión de Marcación
  public timelogCorrectionDate = signal<Date | null>(null);
  public timelogCorrectionType = signal<
    'entry' | 'lunch_start' | 'lunch_end' | 'exit'
  >('entry');
  public timelogCorrectionReason = signal<string>('');
  public timelogCorrectionFile = signal<File | null>(null);
  public timelogCorrectionDocUrl = signal<string | null>(null);
  public uploadingTimelogCorrectionDoc = signal<boolean>(false);
  public submittingTimelogCorrection = signal<boolean>(false);

  // Signals para Solicitud de Uniforme
  public uniformItemType = signal<string>('');
  public uniformSize = signal<string>('M');
  public uniformCurrentQuantity = signal<number>(0);
  public uniformQuantity = signal<number>(1);
  public uniformNotes = signal<string>('');
  public submittingUniform = signal<boolean>(false);

  // Signals para Permisos
  public workPermitType = signal<string | null>(null);
  public workPermitStartDate = signal<Date | null>(null);
  public workPermitEndDate = signal<Date | null>(null);
  public workPermitStartTime = signal<Date | null>(null);
  public workPermitEndTime = signal<Date | null>(null);
  public workPermitObservations = signal<string>('');
  public workPermitFile = signal<File | null>(null);
  public workPermitDocUrl = signal<string | null>(null);
  public uploadingWorkPermitDoc = signal<boolean>(false);
  public submittingWorkPermit = signal<boolean>(false);

  // Opciones para Omisión de Marcación
  public timelogTypeOptions = [
    { label: 'Entrada', value: 'entry' },
    { label: 'Inicio Almuerzo', value: 'lunch_start' },
    { label: 'Fin Almuerzo', value: 'lunch_end' },
    { label: 'Salida', value: 'exit' },
  ];

  // Opciones para tallas de uniforme (reutilizado del modelo de employees)
  public uniformSizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  // Opciones para tipo de permiso
  public workPermitTypeOptions = PORTAL_PERMIT_TYPE_OPTIONS;

  public uniformItemTypeOptions = computed(() => {
    const employee = this.selectedEmployee();
    return this.uniformTypesService.getOptionsForBranch(employee?.branch?.name);
  });

  // Computed: Calcular el total de horas/días automáticamente
  public compensatoryAmount = computed(() => {
    return calculateCompensatoryAmount({
      type: this.compensatoryType(),
      date: this.compensatoryDate(),
      timeStart: this.compensatoryTimeStart(),
      timeEnd: this.compensatoryTimeEnd(),
      startDate: this.compensatoryStartDate(),
      endDate: this.compensatoryEndDate(),
    });
  });

  // Computed para validaciones
  public canSubmitCompensatory = computed(() => {
    const type = this.compensatoryType();
    const reason = this.compensatoryReason();
    const manualDates = this.manualOvertimeDates();

    if (type === 'hours') {
      return !!(
        this.compensatoryDate() &&
        this.compensatoryTimeStart() &&
        this.compensatoryTimeEnd() &&
        reason &&
        manualDates.length > 0
      );
    } else {
      // For days type: reason is optional per UI "Paso 3: Motivo (Opcional)"
      return !!(
        this.compensatoryStartDate() &&
        this.compensatoryEndDate() &&
        manualDates.length > 0
      );
    }
  });

  public canSubmitDisability = computed(() => {
    return !!(
      this.disabilityStartDate() &&
      this.disabilityEndDate() &&
      this.disabilityDescription() &&
      this.disabilityFile()
    );
  });

  public canSubmitVacation = computed(() => {
    return !!(this.vacationStartDate() && this.vacationEndDate() && this.vacationFile());
  });

  public canSubmitDocument = computed(() => {
    const type = this.documentType();
    const customType = this.customDocumentType();
    const reason = this.documentReason();
    const requiredDate = this.documentRequiredDate();

    if (type === 'other') {
      return !!(customType && reason && requiredDate);
    }
    return !!(reason && requiredDate);
  });

  public canSubmitTimelogCorrection = computed(() => {
    const date = this.timelogCorrectionDate();
    const type = this.timelogCorrectionType();
    const reason = this.timelogCorrectionReason();
    // Date, type, and reason are required; file is optional
    return !!(date && type && reason.trim());
  });

  public canSubmitUniform = computed(() => {
    const itemType = this.uniformItemType();
    const size = this.uniformSize();
    const quantity = this.uniformQuantity();
    // Item type, size, and quantity >= 1 are required
    return !!(itemType.trim() && size && quantity >= 1);
  });

  public canSubmitWorkPermit = computed(() => {
    return !!(
      this.workPermitType() &&
      this.workPermitStartDate() &&
      this.workPermitEndDate()
    );
  });

  public disabilityDaysCount = computed(() => {
    const start = this.disabilityStartDate();
    const end = this.disabilityEndDate();
    if (!start || !end) return 0;
    return differenceInCalendarDays(end, start) + 1;
  });

  public vacationDaysCount = computed(() => {
    const start = this.vacationStartDate();
    const end = this.vacationEndDate();
    if (!start || !end) return 0;
    return differenceInCalendarDays(end, start) + 1;
  });

  // Tarjetas de gestiones disponibles
  public managementCards: ManagementCard[] = [
    {
      id: 'compensatory',
      label: 'Compensatorio',
      description: 'Tiempo compensatorio por horas extras trabajadas',
      icon: 'pi-clock',
      colorClass: 'bg-cyan-500/20 text-cyan-400',
      section: 'compensatory',
    },
    {
      id: 'disabilities',
      label: 'Incapacidades',
      description: 'Subir documentos médicos de incapacidad',
      icon: 'pi-file-plus',
      colorClass: 'bg-blue-500/20 text-blue-400',
      section: 'disabilities',
    },
    {
      id: 'vacations',
      label: 'Vacaciones',
      description: 'Solicitar días de vacaciones',
      icon: 'pi-calendar-plus',
      colorClass: 'bg-purple-500/20 text-purple-400',
      section: 'vacations',
    },
    {
      id: 'timelog_correction',
      label: 'Omisión de Marcación',
      description: 'Solicitar corrección de marcación de asistencia',
      icon: 'pi-exclamation-triangle',
      colorClass: 'bg-orange-500/20 text-orange-400',
      section: 'timelog_correction',
    },
    {
      id: 'uniform_request',
      label: 'Solicitud de Uniforme',
      description: 'Solicitar uniformes o prendas de trabajo',
      icon: 'pi-tag',
      colorClass: 'bg-teal-500/20 text-teal-400',
      section: 'uniform_request',
    },
    {
      id: 'supply_request',
      label: 'Solicitud de Insumo',
      description: 'Solicitar insumos para la sucursal',
      icon: 'pi-box',
      colorClass: 'bg-amber-500/20 text-amber-400',
      section: 'supply_request',
    },
    {
      id: 'documents',
      label: 'Documentos',
      description: 'Solicitar cartas laborales y certificados',
      icon: 'pi-file-edit',
      colorClass: 'bg-green-500/20 text-green-400',
      section: 'documents',
    },
    {
      id: 'work_permit',
      label: 'Permisos',
      description: 'Solicitar permisos laborales',
      icon: 'pi-id-card',
      colorClass: 'bg-amber-500/20 text-amber-400',
      section: 'work_permit',
    },
    {
      id: 'schedule_change',
      label: 'Cambio de Horario',
      description: 'Solicitar cambios de turno en semanas bloqueadas',
      icon: 'pi-calendar-clock',
      colorClass: 'bg-rose-500/20 text-rose-400',
      section: 'schedule_change',
    },
  ];

  // Computed para obtener la tarjeta actual
  public getCurrentCard = computed(() => {
    const type = this.selectedGestionType();
    return this.managementCards.find((card) => card.section === type);
  });

  // Seleccionar tipo de gestión
  public selectGestion(
    type:
      | 'disabilities'
      | 'documents'
      | 'vacations'
      | 'compensatory'
      | 'timelog_correction'
      | 'uniform_request'
      | 'supply_request'
      | 'work_permit'
      | 'schedule_change'
  ): void {
    // Check if we're in the intro tutorial before changing state
    const wasInIntroTutorial =
      this.tutorialService.isActive() &&
      this.tutorialService.currentConfig()?.id === 'gestiones-intro';

    this.selectedGestionType.set(type);

    // Supply request & schedule change: skip employee picker
    if ((type === 'supply_request' || type === 'schedule_change') && this.currentEmployee) {
      this.selectedEmployee.set(this.currentEmployee as Employee);
    }

    // If intro tutorial was active, start the specific tutorial for this gestión
    if (wasInIntroTutorial && GESTIONES_TUTORIALS[type]) {
      // Give a small delay to allow the view to update
      setTimeout(() => {
        this.tutorialService.start(GESTIONES_TUTORIALS[type]);
      }, 300);
    }
  }

  // Confirmar empleado seleccionado
  public confirmEmployee(): void {
    const employee = this.branchEmployees.find(
      (e) => e.id === this.selectedEmployeeId()
    );
    if (employee) {
      this.selectedEmployee.set(employee);
    }
  }

  // Obtener datos del empleado seleccionado
  public getSelectedEmployeeData(): Employee | undefined {
    return this.branchEmployees.find((e) => e.id === this.selectedEmployeeId());
  }

  // Obtener iniciales del empleado
  public getEmployeeInitials(
    employee:
      | Employee
      | { first_name?: string; father_name?: string; short_name?: string }
  ): string {
    if ('short_name' in employee && employee.short_name) {
      const parts = employee.short_name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return parts[0]?.charAt(0)?.toUpperCase() || '?';
    }
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  // Obtener el label del tipo de prenda seleccionado
  public getUniformItemTypeLabel(): string {
    const value = this.uniformItemType();
    const option = this.uniformItemTypeOptions().find((o) => o.value === value);
    return option?.label || value || 'Prenda';
  }

  // Obtener el label del tipo de corrección de marcación
  public getTimelogCorrectionTypeLabel(): string {
    const value = this.timelogCorrectionType();
    const option = this.timelogTypeOptions.find((o) => o.value === value);
    return option?.label || value || 'Marcación';
  }

  // ============================================================
  // Tutorial Methods
  // ============================================================

  /**
   * Start the interactive tutorial for gestiones
   */
  public startTutorial(): void {
    // If we're on the main cards view, show the intro tutorial
    if (!this.selectedGestionType()) {
      this.tutorialService.start(GESTIONES_TUTORIAL_INTRO);
      return;
    }

    // If a gestión type is selected, show the specific tutorial
    const gestionType = this.selectedGestionType();
    if (gestionType && GESTIONES_TUTORIALS[gestionType]) {
      this.tutorialService.start(GESTIONES_TUTORIALS[gestionType]);
    }
  }

  // Navegación
  public backToGestiones(): void {
    this.selectedGestionType.set(null);
    this.selectedEmployeeId.set(null);
    this.selectedEmployee.set(null);
  }

  public backToEmployeeSelection(): void {
    // For supply_request and schedule_change there is no employee picker — go all the way back
    if (this.selectedGestionType() === 'supply_request' || this.selectedGestionType() === 'schedule_change') {
      this.reset();
      return;
    }
    this.selectedEmployee.set(null);
  }

  public reset(): void {
    this.selectedGestionType.set(null);
    this.selectedEmployeeId.set(null);
    this.selectedEmployee.set(null);
    this.resetAllForms();
  }

  // Métodos para Compensatorio
  public addManualOvertimeDate(date?: Date): void {
    // Si viene la fecha como parámetro (desde employee-portal-compensatory), usarla
    // Si no, intentar leerla del signal (retrocompatibilidad)
    const dateToAdd = date || this.newOvertimeDate();

    if (dateToAdd) {
      const existing = this.manualOvertimeDates();
      this.manualOvertimeDates.set(
        [...existing, dateToAdd].sort((a, b) => compareAsc(a, b))
      );
      this.newOvertimeDate.set(null);
    }
  }

  public setCompensatoryTimeStart(time: Date | null): void {
    if (time) {
      // Forzar minutos a 00
      time = set(time, { minutes: 0, seconds: 0, milliseconds: 0 });
    }
    this.compensatoryTimeStart.set(time);
  }

  public setCompensatoryTimeEnd(time: Date | null): void {
    if (time) {
      // Forzar minutos a 00
      time = set(time, { minutes: 0, seconds: 0, milliseconds: 0 });
    }
    this.compensatoryTimeEnd.set(time);
  }

  public removeManualOvertimeDate(index: number): void {
    const dates = this.manualOvertimeDates();
    this.manualOvertimeDates.set(dates.filter((_, i) => i !== index));
  }

  public async submitCompensatoryRequest(): Promise<void> {
    if (!this.canSubmitCompensatory() || !this.selectedEmployee()) return;

    // Si aún se está subiendo el archivo, esperar
    if (this.uploadingCompensatoryDoc()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo archivo...',
        detail:
          'Por favor espera a que termine de subirse el documento adjunto.',
      });
      return;
    }

    this.submittingCompensatory.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const formState = {
        startDate:
          this.compensatoryType() === 'hours'
            ? this.compensatoryDate()
            : this.compensatoryStartDate(),
        endDate:
          this.compensatoryType() === 'hours'
            ? this.compensatoryDate()
            : this.compensatoryEndDate(),
        reason: this.compensatoryReason(),
        type: this.compensatoryType(),
        compensatoryDate: this.compensatoryDate(),
        compensatoryTimeStart: this.compensatoryTimeStart(),
        compensatoryTimeEnd: this.compensatoryTimeEnd(),
        selectedOvertimeDays: [],
        manualOvertimeDates: this.manualOvertimeDates(),
        compensatoryFile: this.compensatoryFile(),
        selectedEmployeeId: employee.id,
        documentUrl: this.compensatoryDocUrl(), // Pasar la URL pre-subida
      };

      const deps = {
        http: this.http,
        apiUrl: this.apiUrl,
        messageService: this.messageService,
        currentEmployee: () => employee,
        creatorEmployeeId: this.currentEmployee?.id, // El gerente crea la solicitud
        formState,
        resetForm: () => this.resetCompensatoryForm(),
        reloadRequests: () => this.requestCreated.emit(), // Emitir evento para recargar
        setSubmitting: (value: boolean) =>
          this.submittingCompensatory.set(value),
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await uploadCompensatory(deps);
    } catch (error) {
      console.error('Error submitting compensatory:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
      });
    } finally {
      this.submittingCompensatory.set(false);
    }
  }

  // Helper para subir archivo a Storage
  public async onCompensatoryFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.compensatoryFile.set(file);
    this.uploadingCompensatoryDoc.set(true);

    try {
      const employee = this.selectedEmployee();
      // Si no hay empleado seleccionado, no podemos subir (necesitamos ID para ruta)
      // Aunque en el flujo actual primero se selecciona empleado.
      const employeeId = employee?.id || 'temp';

      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

      const storageKey =
        getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        '';

      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/compensatory/${fileName}`;

      await firstValueFrom(
        this.http.post(uploadUrl, file, {
          headers: {
            apikey: storageKey,
            Authorization: `Bearer ${storageKey}`,
            'x-upsert': 'true',
          },
        })
      );

      const publicUrl = this.apiUrl.build(
        `storage/v1/object/public/compensatory/${fileName}`
      );

      this.compensatoryDocUrl.set(publicUrl);
    } catch (error) {
      console.error('Background upload failed:', error);
      // No mostramos error fatal aquí, dejaremos que el submit intente de nuevo o falle
      // Pero limpiamos la URL porsiaca
      this.compensatoryDocUrl.set(null);
    } finally {
      this.uploadingCompensatoryDoc.set(false);
    }
  }

  public onCompensatoryFileChanged(file: File | null): void {
    if (!file) {
      this.compensatoryFile.set(null);
      this.compensatoryDocUrl.set(null);
      return;
    }
    // Simulate the event format expected by onCompensatoryFileSelect
    this.onCompensatoryFileSelect({ files: [file], currentFiles: [file] });
  }

  // Métodos de reset
  private resetCompensatoryForm(): void {
    this.compensatoryType.set('hours');
    this.compensatoryDate.set(null);
    this.compensatoryTimeStart.set(null);
    this.compensatoryTimeEnd.set(null);
    this.compensatoryStartDate.set(null);
    this.compensatoryEndDate.set(null);
    this.compensatoryReason.set('');
    this.manualOvertimeDates.set([]);
    this.newOvertimeDate.set(null);
    this.compensatoryFile.set(null);
    this.compensatoryDocUrl.set(null);
    this.uploadingCompensatoryDoc.set(false);
  }

  private resetAllForms(): void {
    this.resetCompensatoryForm();
    this.resetDisabilityForm();
    this.resetVacationForm();
    this.resetDocumentForm();
    this.resetTimelogCorrectionForm();
    this.resetUniformForm();
    this.resetWorkPermitForm();
  }

  // Métodos para Incapacidades
  public async onDisabilityFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.disabilityFile.set(file);
    this.uploadingDisabilityDoc.set(true);

    try {
      const employee = this.selectedEmployee();
      const employeeId = employee?.id || 'temp';
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

      const storageKey =
        getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        '';

      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/disabilities/${fileName}`;

      await firstValueFrom(
        this.http.post(uploadUrl, file, {
          headers: {
            apikey: storageKey,
            Authorization: `Bearer ${storageKey}`,
            'x-upsert': 'true',
          },
        })
      );

      const publicUrl = this.apiUrl.build(
        `storage/v1/object/public/disabilities/${fileName}`
      );

      this.disabilityDocUrl.set(publicUrl);
    } catch (error) {
      console.error('Background upload failed:', error);
      this.disabilityDocUrl.set(null);
    } finally {
      this.uploadingDisabilityDoc.set(false);
    }
  }

  public async onVacationFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.vacationFile.set(file);
    this.uploadingVacationDoc.set(true);

    try {
      const employee = this.selectedEmployee();
      const employeeId = employee?.id || 'temp';
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}_${Date.now()}.${fileExt}`;
      const filePath = `vacations/${fileName}`; // bucket: employee-documents, path: vacations/...

      const storageKey =
        getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        '';

      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${filePath}`;

      await firstValueFrom(
        this.http.post(uploadUrl, file, {
          headers: {
            apikey: storageKey,
            Authorization: `Bearer ${storageKey}`,
            'x-upsert': 'true',
          },
        })
      );

      const publicUrl = this.apiUrl.build(
        `storage/v1/object/public/employee-documents/${filePath}`
      );

      this.vacationDocUrl.set(publicUrl);
    } catch (error) {
      console.error('Background upload failed:', error);
      this.vacationDocUrl.set(null);
    } finally {
      this.uploadingVacationDoc.set(false);
    }
  }

  public async submitDisabilityRequest(): Promise<void> {
    if (!this.canSubmitDisability() || !this.selectedEmployee()) return;

    if (this.uploadingDisabilityDoc()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo archivo...',
        detail:
          'Por favor espera a que termine de subirse el documento adjunto.',
      });
      return;
    }

    this.uploadingDisability.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const start = this.disabilityStartDate()!;
      const end = this.disabilityEndDate()!;
      const description = this.disabilityDescription();

      // Use pre-uploaded URL if available
      let documentUrl = this.disabilityDocUrl();
      const file = this.disabilityFile();

      // Fallback upload (si falló el background upload o no se usó)
      if (file && !documentUrl) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${employee.id}/${Date.now()}.${fileExt}`;
        const storageKey =
          getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
          getEnv('ENV_SUPABASE_API_KEY') ||
          '';
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/disabilities/${fileName}`;

        await firstValueFrom(
          this.http.post(uploadUrl, file, {
            headers: {
              apikey: storageKey,
              Authorization: `Bearer ${storageKey}`,
              'x-upsert': 'true',
            },
          })
        );
        // Usar apiUrl.build() para construir la URL pública correctamente
        documentUrl = this.apiUrl.build(
          `storage/v1/object/public/disabilities/${fileName}`
        );
      }

      // Crear solicitud en employee_disabilities (no timeoffs)
      const disabilityData = {
        employee_id: employee.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        description: description || null,
        document_url: documentUrl || null,
        status: 'pending',
        created_by: this.currentEmployee?.id || null, // Gerente que crea la solicitud
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/employee_disabilities'),
          disabilityData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Incapacidad para ${employee.first_name} ${employee.father_name} registrada correctamente`,
      });

      this.requestCreated.emit();
      this.reset();
    } catch (error: any) {
      console.error('Error submitting disability:', error);
      const errorDetail =
        error?.error?.message ||
        error?.message ||
        'No se pudo enviar la solicitud.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorDetail,
      });
    } finally {
      this.uploadingDisability.set(false);
    }
  }

  // Métodos para Vacaciones
  public async submitVacationRequest(): Promise<void> {
    if (!this.canSubmitVacation() || !this.selectedEmployee()) return;

    if (this.uploadingVacationDoc()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo archivo...',
        detail:
          'Por favor espera a que termine de subirse el documento adjunto.',
      });
      return;
    }

    this.submittingVacation.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const start = this.vacationStartDate()!;
      const end = this.vacationEndDate()!;
      const reason = this.vacationReason();
      const file = this.vacationFile();

      let documentUrl = this.vacationDocUrl() || '';

      // Fallback: Subir archivo si existe y no tenemos URL (p.ej. background falló)
      if (file && !documentUrl) {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${employee.id}_${timestamp}.${fileExt}`;
        const filePath = `vacations/${fileName}`;

        // Subir a Supabase Storage
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${filePath}`;
        const apiKey =
          getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
          getEnv('ENV_SUPABASE_API_KEY') ||
          '';

        if (!apiKey) {
          throw new Error('No se pudo obtener la clave de API de Supabase');
        }

        await firstValueFrom(
          this.http.post(uploadUrl, file, {
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
              'x-upsert': 'true',
            },
          })
        );

        // Usar apiUrl.build() para construir la URL pública correctamente
        documentUrl = this.apiUrl.build(
          `storage/v1/object/public/employee-documents/${filePath}`
        );
      }

      const vacationData = {
        employee_id: employee.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        reason: reason || null,
        document_url: documentUrl || null,
        status: 'pending',
        created_by: this.currentEmployee?.id || null, // Gerente que crea la solicitud
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/employee_vacations'),
          vacationData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Vacaciones para ${employee.first_name} ${employee.father_name} solicitadas correctamente`,
      });

      this.requestCreated.emit();
      this.reset();
    } catch (error: any) {
      console.error('Error submitting vacation:', error);
      const errorDetail =
        error?.error?.message ||
        error?.message ||
        'No se pudo enviar la solicitud.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorDetail,
      });
    } finally {
      this.submittingVacation.set(false);
    }
  }

  // Métodos para Documentos
  public async submitDocumentRequest(): Promise<void> {
    if (!this.canSubmitDocument() || !this.selectedEmployee()) return;

    this.submittingDocument.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const type = this.documentType();
      const customType = this.customDocumentType();
      const reason = this.documentReason();
      const requiredDate = this.documentRequiredDate()!;

      const documentTypeLabel =
        type === 'other' ? customType : this.getDocumentTypeLabel(type);

      const documentData = {
        employee_id: employee.id,
        document_type: documentTypeLabel,
        custom_document_type: type === 'other' ? customType : null,
        reason: reason,
        required_date: requiredDate.toISOString().split('T')[0],
        status: 'pending',
        created_by: this.currentEmployee?.id || null, // Gerente que crea la solicitud
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/document_requests'),
          documentData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de ${documentTypeLabel} para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.requestCreated.emit();
      this.reset();
    } catch (error: any) {
      console.error('Error submitting document request:', error);
      const errorDetail =
        error?.error?.message ||
        error?.message ||
        'No se pudo enviar la solicitud.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorDetail,
      });
    } finally {
      this.submittingDocument.set(false);
    }
  }

  // Reset methods
  private resetDisabilityForm(): void {
    this.disabilityStartDate.set(null);
    this.disabilityEndDate.set(null);
    this.disabilityDescription.set('');
    this.disabilityFile.set(null);
    this.disabilityDocUrl.set(null);
    this.uploadingDisabilityDoc.set(false);
  }

  /**
   * Limpia el archivo de incapacidad y su URL pre-subida
   */
  public clearDisabilityFile(): void {
    this.disabilityFile.set(null);
    this.disabilityDocUrl.set(null);
  }

  /**
   * Limpia el archivo de vacaciones y su URL pre-subida
   */
  public clearVacationFile(): void {
    this.vacationFile.set(null);
    this.vacationDocUrl.set(null);
  }

  private resetVacationForm(): void {
    this.vacationStartDate.set(null);
    this.vacationEndDate.set(null);
    this.vacationReason.set('');
    this.vacationFile.set(null);
    this.vacationDocUrl.set(null);
    this.uploadingVacationDoc.set(false);
  }

  private resetDocumentForm(): void {
    this.documentType.set('work_letter');
    this.customDocumentType.set('');
    this.documentReason.set('');
    this.documentRequiredDate.set(null);
  }

  private resetTimelogCorrectionForm(): void {
    this.timelogCorrectionDate.set(null);
    this.timelogCorrectionType.set('entry');
    this.timelogCorrectionReason.set('');
    this.timelogCorrectionFile.set(null);
    this.timelogCorrectionDocUrl.set(null);
    this.uploadingTimelogCorrectionDoc.set(false);
  }

  private resetUniformForm(): void {
    this.uniformItemType.set('');
    this.uniformSize.set('M');
    this.uniformCurrentQuantity.set(0);
    this.uniformQuantity.set(1);
    this.uniformNotes.set('');
  }

  // File upload handler for timelog correction (background upload)
  public async onTimelogCorrectionFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.timelogCorrectionFile.set(file);
    this.uploadingTimelogCorrectionDoc.set(true);

    try {
      const employee = this.selectedEmployee();
      const employeeId = employee?.id || 'temp';
      const fileExt = file.name.split('.').pop();
      const fileName = `timelog-corrections/${employeeId}_${Date.now()}.${fileExt}`;

      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;

      await firstValueFrom(
        this.http.post(uploadUrl, file, {
          headers: {
            'x-upsert': 'true',
          },
        })
      );

      const publicUrl = `${this.apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${fileName}`;
      this.timelogCorrectionDocUrl.set(publicUrl);
    } catch (error) {
      console.error('Background upload failed:', error);
      this.timelogCorrectionDocUrl.set(null);
    } finally {
      this.uploadingTimelogCorrectionDoc.set(false);
    }
  }

  public clearTimelogCorrectionFile(): void {
    this.timelogCorrectionFile.set(null);
    this.timelogCorrectionDocUrl.set(null);
  }

  // Submit Omisión de Marcación request
  public async submitTimelogCorrectionRequest(): Promise<void> {
    if (!this.canSubmitTimelogCorrection() || !this.selectedEmployee()) return;

    if (this.uploadingTimelogCorrectionDoc()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo archivo...',
        detail: 'Por favor espera a que termine de subirse el documento adjunto.',
      });
      return;
    }

    this.submittingTimelogCorrection.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const date = this.timelogCorrectionDate()!;
      const type = this.timelogCorrectionType();
      const reason = this.timelogCorrectionReason();
      const file = this.timelogCorrectionFile();

      // Use pre-uploaded URL if available
      let attachmentUrl = this.timelogCorrectionDocUrl();

      // Fallback upload if background upload failed
      if (file && !attachmentUrl) {
        const fileExt = file.name.split('.').pop();
        const fileName = `timelog-corrections/${employee.id}_${Date.now()}.${fileExt}`;

        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;

        await firstValueFrom(
          this.http.post(uploadUrl, file, {
            headers: {
              'x-upsert': 'true',
            },
          })
        );

        attachmentUrl = `${this.apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${fileName}`;
      }

      // Get timelog type label for display
      const typeLabel =
        this.timelogTypeOptions.find((opt) => opt.value === type)?.label ||
        type;

      // Create document request with metadata
      const documentData = {
        employee_id: employee.id,
        document_type: 'timelog_correction',
        reason: reason,
        status: 'pending',
        created_by: this.currentEmployee?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
        metadata: {
          timelog_date: date.toISOString().split('T')[0],
          timelog_type: type,
          branch_id: employee.branch?.id || this.currentBranch?.id || null,
          attachment_url: attachmentUrl,
        },
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/document_requests'),
          documentData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Corrección de marcación (${typeLabel}) para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.requestCreated.emit();
      this.reset();
    } catch (error: any) {
      console.error('Error submitting timelog correction:', error);
      const errorDetail =
        error?.error?.message ||
        error?.message ||
        'No se pudo enviar la solicitud.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorDetail,
      });
    } finally {
      this.submittingTimelogCorrection.set(false);
    }
  }

  // Submit Solicitud de Uniforme request
  public async submitUniformRequest(): Promise<void> {
    if (!this.canSubmitUniform() || !this.selectedEmployee()) return;

    this.submittingUniform.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const itemType = this.uniformItemType();
      const size = this.uniformSize();
      const currentQuantity = this.uniformCurrentQuantity();
      const quantity = this.uniformQuantity();
      const notes = this.uniformNotes();

      // Create document request with metadata
      const documentData = {
        employee_id: employee.id,
        document_type: 'uniform_request',
        reason:
          notes ||
          `Solicitud de ${itemType} - Talla ${size} - Cantidad: ${quantity}`,
        status: 'pending',
        created_by: this.currentEmployee?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
        metadata: {
          item_type: itemType,
          size: size,
          quantity: quantity,
          current_quantity: currentQuantity,
          branch_id: employee.branch?.id || this.currentBranch?.id || null,
        },
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/document_requests'),
          documentData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de uniforme (${itemType}, talla ${size}) para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.requestCreated.emit();
      this.reset();
    } catch (error: any) {
      console.error('Error submitting uniform request:', error);
      const errorDetail =
        error?.error?.message ||
        error?.message ||
        'No se pudo enviar la solicitud.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorDetail,
      });
    } finally {
      this.submittingUniform.set(false);
    }
  }

  // Work Permit Methods
  public async onWorkPermitFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this.workPermitFile.set(file);
    this.uploadingWorkPermitDoc.set(true);

    try {
      const employee = this.selectedEmployee();
      const employeeId = employee?.id || 'temp';
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

      const storageKey =
        getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        '';

      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;

      await firstValueFrom(
        this.http.post(uploadUrl, file, {
          headers: {
            apikey: storageKey,
            Authorization: `Bearer ${storageKey}`,
            'x-upsert': 'true',
          },
        })
      );

      const publicUrl = this.apiUrl.build(
        `storage/v1/object/public/employee-documents/${fileName}`
      );
      this.workPermitDocUrl.set(publicUrl);
    } catch (error) {
      console.error('Background upload failed:', error);
      this.workPermitDocUrl.set(null);
    } finally {
      this.uploadingWorkPermitDoc.set(false);
    }
  }

  public clearWorkPermitFile(): void {
    this.workPermitFile.set(null);
    this.workPermitDocUrl.set(null);
  }

  private resetWorkPermitForm(): void {
    this.workPermitType.set(null);
    this.workPermitStartDate.set(null);
    this.workPermitEndDate.set(null);
    this.workPermitStartTime.set(null);
    this.workPermitEndTime.set(null);
    this.workPermitObservations.set('');
    this.workPermitFile.set(null);
    this.workPermitDocUrl.set(null);
  }

  public async submitWorkPermitRequest(): Promise<void> {
    if (!this.canSubmitWorkPermit() || !this.selectedEmployee()) return;

    if (this.uploadingWorkPermitDoc()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Subiendo archivo...',
        detail: 'Por favor espera a que termine de subirse el documento adjunto.',
      });
      return;
    }

    this.submittingWorkPermit.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const startDate = this.workPermitStartDate();
      const endDate = this.workPermitEndDate();
      const startTime = this.workPermitStartTime();
      const endTime = this.workPermitEndTime();

      // Calculate equivalent
      let equivalentValue: number | null = null;
      let equivalentUnit: string | null = null;
      if (startDate && endDate) {
        const days = differenceInCalendarDays(endDate, startDate) + 1;
        if (startTime && endTime && days === 1) {
          const hours = Math.abs(endTime.getTime() - startTime.getTime()) / 3600000;
          equivalentValue = Math.round(hours * 10) / 10;
          equivalentUnit = 'hours';
        } else {
          equivalentValue = days;
          equivalentUnit = 'days';
        }
      }

      const permitData: Record<string, any> = {
        employee_id: employee.id,
        permit_type: this.workPermitType(),
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        start_time: startTime ? format(startTime, 'HH:mm') : null,
        end_time: endTime ? format(endTime, 'HH:mm') : null,
        equivalent_value: equivalentValue,
        equivalent_unit: equivalentUnit,
        observations: this.workPermitObservations() || null,
        document_url: this.workPermitDocUrl() || null,
        status: 'pending',
        created_by: this.currentEmployee?.id || null,
        company_id: this.organizationService.getCurrentCompanyId(),
      };

      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/work_permits'),
          permitData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de permiso para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.requestCreated.emit();
      this.reset();
    } catch (error: any) {
      console.error('Error submitting work permit:', error);
      const errorDetail =
        error?.error?.message ||
        error?.message ||
        'No se pudo enviar la solicitud.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorDetail,
      });
    } finally {
      this.submittingWorkPermit.set(false);
    }
  }

  public onSupplyRequestCreated(): void {
    this.requestCreated.emit();
    this.reset();
  }

  public onScheduleChangeRequestCreated(): void {
    this.requestCreated.emit();
    this.reset();
  }

  // Opciones para documentos
  public documentTypeOptions = [
    { label: 'Carta de Trabajo', value: 'work_letter' },
    { label: 'Constancia de Salario', value: 'salary_certificate' },
    { label: 'Certificación Laboral', value: 'employment_certificate' },
    { label: 'Otro', value: 'other' },
  ];

  public getDocumentTypeLabel(type: string): string {
    const option = this.documentTypeOptions.find((opt) => opt.value === type);
    return option?.label || type;
  }
}
