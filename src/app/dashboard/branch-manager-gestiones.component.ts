import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addDays, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { uploadCompensatory } from '../employee-portal/actions/employee-portal-compensatory.actions';
import { EmployeePortalCompensatoryComponent } from '../employee-portal/components/employee-portal-compensatory.component';
import { Branch, Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { getEnv } from '../utils/env.utils';

type ManagementCard = {
  id: string;
  label: string;
  description: string;
  icon: string;
  colorClass: string;
  section: 'disabilities' | 'documents' | 'vacations' | 'compensatory';
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
    InputTextarea,
    EmployeePortalCompensatoryComponent,
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
          Realiza solicitudes en nombre de los empleados de tu sucursal
        </ng-template>

        <!-- Vista de Tarjetas de Gestiones -->
        @if (!selectedGestionType()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
          @for (card of managementCards; track card.id) {
          <p-card
            class="cursor-pointer hover:shadow-lg hover:bg-neutral-700/30 transition-all hover:ring-2 hover:ring-amber-400/50 p-3"
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

          <!-- Banner del empleado seleccionado -->
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
            (compensatoryTimeStartChange)="compensatoryTimeStart.set($event)"
            [compensatoryTimeEnd]="compensatoryTimeEnd()"
            (compensatoryTimeEndChange)="compensatoryTimeEnd.set($event)"
            [compensatoryStartDate]="compensatoryStartDate()"
            (compensatoryStartDateChange)="compensatoryStartDate.set($event)"
            [compensatoryEndDate]="compensatoryEndDate()"
            (compensatoryEndDateChange)="compensatoryEndDate.set($event)"
            [compensatoryReason]="compensatoryReason()"
            (compensatoryReasonChange)="compensatoryReason.set($event)"
            [manualOvertimeDates]="manualOvertimeDates()"
            [newOvertimeDate]="newOvertimeDate()"
            (newOvertimeDateChange)="newOvertimeDate.set($event)"
            (addManualDate)="addManualOvertimeDate()"
            (removeManualDate)="removeManualOvertimeDate($event)"
            [compensatoryFile]="compensatoryFile()"
            (compensatoryFileChange)="compensatoryFile.set($event)"
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
                    [(ngModel)]="disabilityStartDate"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de inicio"
                    [maxDate]="today"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de Fin</label
                  >
                  <p-datepicker
                    [(ngModel)]="disabilityEndDate"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de fin"
                    [minDate]="disabilityStartDate() || today"
                    styleClass="w-full"
                    appendTo="body"
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
                [(ngModel)]="disabilityDescription"
                placeholder="Describe el motivo de la incapacidad (diagnóstico, síntomas, etc.)"
                rows="4"
                class="w-full"
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
              />
              @if (disabilityFile()) {
              <div
                class="mt-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <i class="pi pi-file text-blue-400"></i>
                  <span class="text-sm text-gray-300">{{
                    disabilityFile()!.name
                  }}</span>
                </div>
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="disabilityFile.set(null)"
                  pTooltip="Eliminar archivo"
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
                    [(ngModel)]="vacationStartDate"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de inicio"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha de Fin</label
                  >
                  <p-datepicker
                    [(ngModel)]="vacationEndDate"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Selecciona fecha de fin"
                    [minDate]="vacationStartDate() || today"
                    styleClass="w-full"
                    appendTo="body"
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
                [(ngModel)]="vacationReason"
                placeholder="Motivo o comentarios adicionales sobre las vacaciones"
                rows="3"
                class="w-full"
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
                label="Solicitar Vacaciones"
                icon="pi pi-check"
                [disabled]="!canSubmitVacation()"
                [loading]="submittingVacation()"
                (onClick)="submitVacationRequest()"
                severity="success"
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
                  [(ngModel)]="documentType"
                  [options]="documentTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Tipo de documento"
                  styleClass="w-full"
                  appendTo="body"
                />
              </div>
              @if (documentType() === 'other') {
              <div class="mt-3">
                <textarea
                  pInputTextarea
                  [(ngModel)]="customDocumentType"
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
                    >Motivo de la solicitud</label
                  >
                  <textarea
                    pInputTextarea
                    [(ngModel)]="documentReason"
                    placeholder="Explica para qué necesitas este documento"
                    rows="3"
                    class="w-full"
                  ></textarea>
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-300"
                    >Fecha requerida</label
                  >
                  <p-datepicker
                    [(ngModel)]="documentRequiredDate"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="¿Cuándo necesitas el documento?"
                    [minDate]="today"
                    styleClass="w-full"
                    appendTo="body"
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
              />
            </div>
          </div>
          }
        </div>
        }
      </p-card>
    </div>
  `,
})
export class BranchManagerGestionesComponent {
  @Input() branchEmployees: (Employee & { short_name: string })[] = [];
  @Input() currentBranch: Branch | null | undefined = null;
  @Input() currentEmployee: Employee | null | undefined = null;

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);

  // Fechas para formularios
  public today = startOfDay(new Date());
  public minPastDate = addDays(this.today, -30);
  public MAX_PAST_DAYS = 30;

  // Signals para el flujo principal
  public selectedGestionType = signal<
    'disabilities' | 'documents' | 'vacations' | 'compensatory' | null
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

  // Signals para Incapacidades
  public disabilityStartDate = signal<Date | null>(null);
  public disabilityEndDate = signal<Date | null>(null);
  public disabilityDescription = signal<string>('');
  public disabilityFile = signal<File | null>(null);
  public uploadingDisability = signal<boolean>(false);

  // Signals para Vacaciones
  public vacationStartDate = signal<Date | null>(null);
  public vacationEndDate = signal<Date | null>(null);
  public vacationReason = signal<string>('');
  public submittingVacation = signal<boolean>(false);

  // Signals para Documentos
  public documentType = signal<string>('work_letter');
  public customDocumentType = signal<string>('');
  public documentReason = signal<string>('');
  public documentRequiredDate = signal<Date | null>(null);
  public submittingDocument = signal<boolean>(false);

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
      return !!(
        this.compensatoryStartDate() &&
        this.compensatoryEndDate() &&
        reason &&
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
    return !!(
      this.vacationStartDate() &&
      this.vacationEndDate() &&
      this.vacationReason()
    );
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

  public disabilityDaysCount = computed(() => {
    const start = this.disabilityStartDate();
    const end = this.disabilityEndDate();
    if (!start || !end) return 0;
    return (
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  });

  public vacationDaysCount = computed(() => {
    const start = this.vacationStartDate();
    const end = this.vacationEndDate();
    if (!start || !end) return 0;
    return (
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
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
      id: 'documents',
      label: 'Documentos',
      description: 'Solicitar cartas laborales y certificados',
      icon: 'pi-file-edit',
      colorClass: 'bg-green-500/20 text-green-400',
      section: 'documents',
    },
  ];

  // Computed para obtener la tarjeta actual
  public getCurrentCard = computed(() => {
    const type = this.selectedGestionType();
    return this.managementCards.find((card) => card.section === type);
  });

  // Seleccionar tipo de gestión
  public selectGestion(
    type: 'disabilities' | 'documents' | 'vacations' | 'compensatory'
  ): void {
    this.selectedGestionType.set(type);
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

  // Navegación
  public backToGestiones(): void {
    this.selectedGestionType.set(null);
    this.selectedEmployeeId.set(null);
    this.selectedEmployee.set(null);
  }

  public backToEmployeeSelection(): void {
    this.selectedEmployee.set(null);
  }

  public reset(): void {
    this.selectedGestionType.set(null);
    this.selectedEmployeeId.set(null);
    this.selectedEmployee.set(null);
    this.resetAllForms();
  }

  // Métodos para Compensatorio
  public addManualOvertimeDate(): void {
    const date = this.newOvertimeDate();
    if (date) {
      const existing = this.manualOvertimeDates();
      this.manualOvertimeDates.set(
        [...existing, date].sort((a, b) => a.getTime() - b.getTime())
      );
      this.newOvertimeDate.set(null);
    }
  }

  public removeManualOvertimeDate(index: number): void {
    const dates = this.manualOvertimeDates();
    this.manualOvertimeDates.set(dates.filter((_, i) => i !== index));
  }

  public async submitCompensatoryRequest(): Promise<void> {
    if (!this.canSubmitCompensatory() || !this.selectedEmployee()) return;

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
      };

      const deps = {
        http: this.http,
        apiUrl: this.apiUrl,
        messageService: this.messageService,
        currentEmployee: () => employee,
        formState,
        resetForm: () => this.resetCompensatoryForm(),
        reloadRequests: () => {},
        setSubmitting: (value: boolean) =>
          this.submittingCompensatory.set(value),
      };

      await uploadCompensatory(deps);

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `Solicitud de compensatorio para ${employee.first_name} ${employee.father_name} enviada correctamente`,
      });

      this.reset();
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
  }

  private resetAllForms(): void {
    this.resetCompensatoryForm();
    this.resetDisabilityForm();
    this.resetVacationForm();
    this.resetDocumentForm();
  }

  // Métodos para Incapacidades
  public onDisabilityFileSelect(event: any): void {
    const files = event.currentFiles || event.files;
    if (files && files.length > 0) {
      this.disabilityFile.set(files[0]);
    }
  }

  public async submitDisabilityRequest(): Promise<void> {
    if (!this.canSubmitDisability() || !this.selectedEmployee()) return;

    this.uploadingDisability.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const file = this.disabilityFile()!;
      const start = this.disabilityStartDate()!;
      const end = this.disabilityEndDate()!;
      const description = this.disabilityDescription();

      // Subir archivo a storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${employee.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage using REST API
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
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'true',
          },
        })
      );

      // Get public URL for the uploaded file
      const documentUrl = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/public/disabilities/${fileName}`;

      // Crear solicitud en employee_disabilities (no timeoffs)
      const disabilityData = {
        employee_id: employee.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        description: description || null,
        document_url: documentUrl || null,
        status: 'pending',
        created_by: this.currentEmployee?.id || null, // Gerente que crea la solicitud
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

    this.submittingVacation.set(true);

    try {
      const employee = this.selectedEmployee()!;
      const start = this.vacationStartDate()!;
      const end = this.vacationEndDate()!;
      const reason = this.vacationReason();

      const vacationData = {
        employee_id: employee.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        reason: reason || null,
        status: 'pending',
        created_by: this.currentEmployee?.id || null, // Gerente que crea la solicitud
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
  }

  private resetVacationForm(): void {
    this.vacationStartDate.set(null);
    this.vacationEndDate.set(null);
    this.vacationReason.set('');
  }

  private resetDocumentForm(): void {
    this.documentType.set('work_letter');
    this.customDocumentType.set('');
    this.documentReason.set('');
    this.documentRequiredDate.set(null);
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
