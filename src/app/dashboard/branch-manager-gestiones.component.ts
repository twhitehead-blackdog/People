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
import { addDays, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { uploadCompensatory } from '../employee-portal/actions/employee-portal-compensatory.actions';
import { EmployeePortalCompensatoryComponent } from '../employee-portal/components/employee-portal-compensatory.component';
import { calculateCompensatoryAmount } from '../employee-portal/utils/employee-portal-compensatory.utils';
import { Branch, Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
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
import { DisabilityGestionFormComponent } from './gestiones-forms/disability-gestion-form.component';
import { VacationGestionFormComponent } from './gestiones-forms/vacation-gestion-form.component';
import { DocumentGestionFormComponent } from './gestiones-forms/document-gestion-form.component';
import { TimelogCorrectionGestionFormComponent } from './gestiones-forms/timelog-correction-gestion-form.component';
import { UniformGestionFormComponent } from './gestiones-forms/uniform-gestion-form.component';
import { WorkPermitGestionFormComponent } from './gestiones-forms/work-permit-gestion-form.component';

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
    | 'work_permit';
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
    EmployeePortalCompensatoryComponent,
    TutorialStepDirective,
    TutorialSpotlightComponent,
    DisabilityGestionFormComponent,
    VacationGestionFormComponent,
    DocumentGestionFormComponent,
    TimelogCorrectionGestionFormComponent,
    UniformGestionFormComponent,
    WorkPermitGestionFormComponent,
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
          }
          @if (selectedGestionType() === 'disabilities') {
          <pt-disability-gestion-form
            [selectedEmployee]="selectedEmployee()!"
            [currentEmployee]="currentEmployee ?? null"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onFormRequestCreated()"
            (close)="reset()"
          />
          }
          @if (selectedGestionType() === 'vacations') {
          <pt-vacation-gestion-form
            [selectedEmployee]="selectedEmployee()!"
            [currentEmployee]="currentEmployee ?? null"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onFormRequestCreated()"
            (close)="reset()"
          />
          }
          @if (selectedGestionType() === 'documents') {
          <pt-document-gestion-form
            [selectedEmployee]="selectedEmployee()!"
            [currentEmployee]="currentEmployee ?? null"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onFormRequestCreated()"
            (close)="reset()"
          />
          }
          @if (selectedGestionType() === 'timelog_correction') {
          <pt-timelog-correction-gestion-form
            [selectedEmployee]="selectedEmployee()!"
            [currentEmployee]="currentEmployee ?? null"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onFormRequestCreated()"
            (close)="reset()"
          />
          }
          @if (selectedGestionType() === 'uniform_request') {
          <pt-uniform-gestion-form
            [selectedEmployee]="selectedEmployee()!"
            [currentEmployee]="currentEmployee ?? null"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onFormRequestCreated()"
            (close)="reset()"
          />
          }
          @if (selectedGestionType() === 'work_permit') {
          <pt-work-permit-gestion-form
            [selectedEmployee]="selectedEmployee()!"
            [currentEmployee]="currentEmployee ?? null"
            [currentBranch]="currentBranch ?? null"
            (requestCreated)="onFormRequestCreated()"
            (close)="reset()"
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
  private tutorialService = inject(TutorialGuideService);

  // Fechas para formularios
  public today = startOfDay(new Date());
  public minPastDate = addDays(this.today, -30);

  // Signals para el flujo principal
  public selectedGestionType = signal<
    | 'disabilities'
    | 'documents'
    | 'vacations'
    | 'compensatory'
    | 'timelog_correction'
    | 'uniform_request'
    | 'work_permit'
    | null
  >(null);
  public selectedEmployeeId = signal<string | null>(null);
  public selectedEmployee = signal<Employee | null>(null);

  // Signals para Compensatorio (aún manejado inline por EmployeePortalCompensatoryComponent)
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

  public canSubmitCompensatory = computed(() => {
    const type = this.compensatoryType();
    const reason = this.compensatoryReason();
    const manualDates = this.manualOvertimeDates();
    if (type === 'hours') {
      return !!(this.compensatoryDate() && this.compensatoryTimeStart() && this.compensatoryTimeEnd() && reason && manualDates.length > 0);
    } else {
      return !!(this.compensatoryStartDate() && this.compensatoryEndDate() && manualDates.length > 0);
    }
  });

  // Tarjetas de gestiones disponibles
  public managementCards: ManagementCard[] = [
    { id: 'compensatory', label: 'Compensatorio', description: 'Tiempo compensatorio por horas extras trabajadas', icon: 'pi-clock', colorClass: 'bg-cyan-500/20 text-cyan-400', section: 'compensatory' },
    { id: 'disabilities', label: 'Incapacidades', description: 'Subir documentos médicos de incapacidad', icon: 'pi-file-plus', colorClass: 'bg-blue-500/20 text-blue-400', section: 'disabilities' },
    { id: 'vacations', label: 'Vacaciones', description: 'Solicitar días de vacaciones', icon: 'pi-calendar-plus', colorClass: 'bg-purple-500/20 text-purple-400', section: 'vacations' },
    { id: 'timelog_correction', label: 'Omisión de Marcación', description: 'Solicitar corrección de marcación de asistencia', icon: 'pi-exclamation-triangle', colorClass: 'bg-orange-500/20 text-orange-400', section: 'timelog_correction' },
    { id: 'uniform_request', label: 'Solicitud de Uniforme', description: 'Solicitar uniformes o prendas de trabajo', icon: 'pi-tag', colorClass: 'bg-teal-500/20 text-teal-400', section: 'uniform_request' },
    { id: 'documents', label: 'Documentos', description: 'Solicitar cartas laborales y certificados', icon: 'pi-file-edit', colorClass: 'bg-green-500/20 text-green-400', section: 'documents' },
    { id: 'work_permit', label: 'Solicitud de Permiso', description: 'Solicitar permisos laborales', icon: 'pi-id-card', colorClass: 'bg-amber-500/20 text-amber-400', section: 'work_permit' },
  ];

  public getCurrentCard = computed(() => {
    const type = this.selectedGestionType();
    return this.managementCards.find((card) => card.section === type);
  });

  // Seleccionar tipo de gestión
  public selectGestion(type: ManagementCard['section']): void {
    const wasInIntroTutorial =
      this.tutorialService.isActive() &&
      this.tutorialService.currentConfig()?.id === 'gestiones-intro';

    this.selectedGestionType.set(type);

    if (wasInIntroTutorial && GESTIONES_TUTORIALS[type]) {
      setTimeout(() => this.tutorialService.start(GESTIONES_TUTORIALS[type]), 300);
    }
  }

  // Confirmar empleado seleccionado
  public confirmEmployee(): void {
    const employee = this.branchEmployees.find((e) => e.id === this.selectedEmployeeId());
    if (employee) this.selectedEmployee.set(employee);
  }

  public getSelectedEmployeeData(): Employee | undefined {
    return this.branchEmployees.find((e) => e.id === this.selectedEmployeeId());
  }

  public getEmployeeInitials(employee: Employee | { first_name?: string; father_name?: string; short_name?: string }): string {
    if ('short_name' in employee && employee.short_name) {
      const parts = employee.short_name.split(' ');
      if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      return parts[0]?.charAt(0)?.toUpperCase() || '?';
    }
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  // Tutorial
  public startTutorial(): void {
    if (!this.selectedGestionType()) {
      this.tutorialService.start(GESTIONES_TUTORIAL_INTRO);
      return;
    }
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
    this.selectedEmployee.set(null);
  }

  public reset(): void {
    this.selectedGestionType.set(null);
    this.selectedEmployeeId.set(null);
    this.selectedEmployee.set(null);
    this.resetCompensatoryForm();
  }

  /** Llamado cuando un sub-form emite requestCreated */
  public onFormRequestCreated(): void {
    this.requestCreated.emit();
    this.reset();
  }

  // =============================================
  // Compensatory (sigue inline por dependencia con EmployeePortalCompensatoryComponent)
  // =============================================

  public addManualOvertimeDate(date?: Date): void {
    const dateToAdd = date || this.newOvertimeDate();
    if (dateToAdd) {
      const existing = this.manualOvertimeDates();
      this.manualOvertimeDates.set([...existing, dateToAdd].sort((a, b) => a.getTime() - b.getTime()));
      this.newOvertimeDate.set(null);
    }
  }

  public setCompensatoryTimeStart(time: Date | null): void {
    if (time) { time.setMinutes(0); time.setSeconds(0); time.setMilliseconds(0); }
    this.compensatoryTimeStart.set(time);
  }

  public setCompensatoryTimeEnd(time: Date | null): void {
    if (time) { time.setMinutes(0); time.setSeconds(0); time.setMilliseconds(0); }
    this.compensatoryTimeEnd.set(time);
  }

  public removeManualOvertimeDate(index: number): void {
    this.manualOvertimeDates.set(this.manualOvertimeDates().filter((_, i) => i !== index));
  }

  public async submitCompensatoryRequest(): Promise<void> {
    if (!this.canSubmitCompensatory() || !this.selectedEmployee()) return;
    if (this.uploadingCompensatoryDoc()) {
      this.messageService.add({ severity: 'info', summary: 'Subiendo archivo...', detail: 'Por favor espera a que termine de subirse el documento adjunto.' });
      return;
    }
    this.submittingCompensatory.set(true);
    try {
      const employee = this.selectedEmployee()!;
      const formState = {
        startDate: this.compensatoryType() === 'hours' ? this.compensatoryDate() : this.compensatoryStartDate(),
        endDate: this.compensatoryType() === 'hours' ? this.compensatoryDate() : this.compensatoryEndDate(),
        reason: this.compensatoryReason(),
        type: this.compensatoryType(),
        compensatoryDate: this.compensatoryDate(),
        compensatoryTimeStart: this.compensatoryTimeStart(),
        compensatoryTimeEnd: this.compensatoryTimeEnd(),
        selectedOvertimeDays: [],
        manualOvertimeDates: this.manualOvertimeDates(),
        compensatoryFile: this.compensatoryFile(),
        selectedEmployeeId: employee.id,
        documentUrl: this.compensatoryDocUrl(),
      };
      const deps = {
        http: this.http,
        apiUrl: this.apiUrl,
        messageService: this.messageService,
        currentEmployee: () => employee,
        creatorEmployeeId: this.currentEmployee?.id,
        formState,
        resetForm: () => this.resetCompensatoryForm(),
        reloadRequests: () => this.requestCreated.emit(),
        setSubmitting: (value: boolean) => this.submittingCompensatory.set(value),
        company_id: this.organizationService.getCurrentCompanyId(),
      };
      await uploadCompensatory(deps);
    } catch (error) {
      console.error('Error submitting compensatory:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' });
    } finally {
      this.submittingCompensatory.set(false);
    }
  }

  public async onCompensatoryFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    this.compensatoryFile.set(file);
    this.uploadingCompensatoryDoc.set(true);
    try {
      const employeeId = this.selectedEmployee()?.id || 'temp';
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}.${fileExt}`;
      const storageKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || getEnv('ENV_SUPABASE_API_KEY') || '';
      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/compensatory/${fileName}`;
      const { firstValueFrom } = await import('rxjs');
      await firstValueFrom(
        this.http.post(uploadUrl, file, {
          headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, 'x-upsert': 'true' },
        })
      );
      this.compensatoryDocUrl.set(this.apiUrl.build(`storage/v1/object/public/compensatory/${fileName}`));
    } catch (error) {
      console.error('Background upload failed:', error);
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
    this.onCompensatoryFileSelect({ files: [file], currentFiles: [file] });
  }

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
}
