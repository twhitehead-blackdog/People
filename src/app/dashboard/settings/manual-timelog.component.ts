import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { endOfDay, format, getHours, getMinutes, set, startOfDay } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { Employee, Schedule, TimeLog } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';

type PunchType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit';

interface ExistingPunch {
  id: string;
  time: Date;
}

interface ExistingPunches {
  entry: ExistingPunch | null;
  lunch_start: ExistingPunch | null;
  lunch_end: ExistingPunch | null;
  exit: ExistingPunch | null;
}

@Component({
  selector: 'pt-manual-timelog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Select,
    DatePicker,
    InputTextarea,
    ToastModule,
    ConfirmDialog,
    Dialog,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-amber-400"></i>
            <span>Marcación Manual</span>
          </div>
        </ng-template>
        <ng-template #subtitle>
          Registra o edita marcaciones de empleados
        </ng-template>

        <div class="space-y-6 mt-4">
          <!-- Paso 1: Seleccionar Empleado -->
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-user text-cyan-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 1: Selecciona el Empleado
              </h3>
            </div>
            <p-select
              [options]="allEmployees()"
              optionLabel="short_name"
              optionValue="id"
              [(ngModel)]="selectedEmployeeId"
              placeholder="Buscar empleado..."
              [filter]="true"
              filterBy="short_name,employee_number"
              showClear
              appendTo="body"
              styleClass="w-full"
              (onChange)="onEmployeeChange()"
            >
              <ng-template #selectedItem let-selected>
                @if (selected) {
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ selected.short_name }}</span>
                  <span class="text-gray-400 text-sm">({{ selected.employee_number }})</span>
                  @if (selected.branch?.name) {
                  <span class="text-gray-500 text-xs">· {{ selected.branch.name }}</span>
                  }
                </div>
                }
              </ng-template>
              <ng-template #item let-employee>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ employee.short_name }}</span>
                  <span class="text-gray-400 text-sm">({{ employee.employee_number }})</span>
                  @if (employee.branch?.name) {
                  <span class="text-gray-500 text-xs">· {{ employee.branch.name }}</span>
                  }
                </div>
              </ng-template>
            </p-select>
          </div>

          <!-- Paso 2: Seleccionar Fecha -->
          @if (selectedEmployeeId()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <i class="pi pi-calendar text-purple-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 2: Selecciona la Fecha
              </h3>
            </div>
            <p-datepicker
              [(ngModel)]="selectedDate"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [maxDate]="today"
              appendTo="body"
              styleClass="w-full"
              placeholder="Seleccionar fecha..."
              (onSelect)="onDateChange()"
            />
          </div>
          }

          <!-- Panel de Estado de Marcaciones -->
          @if (selectedDate() && selectedEmployeeId()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <i class="pi pi-list-check text-green-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Estado de Marcaciones - {{ selectedDate() | date:'dd/MM/yyyy' }}
              </h3>
            </div>

            <!-- Horario asignado para ese día -->
            @if (loadingSchedule()) {
              <div class="flex items-center gap-2 text-gray-400 text-xs mb-3 py-1">
                <i class="pi pi-spin pi-spinner text-xs"></i>
                <span>Cargando horario...</span>
              </div>
            } @else if (employeeSchedule()) {
              <div class="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25">
                <i class="pi pi-calendar text-cyan-400 text-sm flex-shrink-0"></i>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                  <span class="text-cyan-200 font-semibold text-sm">{{ employeeSchedule()!.name }}</span>
                  @if (!employeeSchedule()!.day_off) {
                    <div class="flex items-center gap-2 text-xs text-gray-400">
                      @if (employeeSchedule()!.entry_time) {
                        <span><i class="pi pi-sign-in text-green-400 mr-1"></i>{{ employeeSchedule()!.entry_time | date:'h:mm a' }}</span>
                      }
                      @if (employeeSchedule()!.lunch_start_time) {
                        <span class="text-gray-600">·</span>
                        <span><i class="pi pi-sun text-yellow-400 mr-1"></i>{{ employeeSchedule()!.lunch_start_time | date:'h:mm a' }} – {{ employeeSchedule()!.lunch_end_time | date:'h:mm a' }}</span>
                      }
                      @if (employeeSchedule()!.exit_time) {
                        <span class="text-gray-600">·</span>
                        <span><i class="pi pi-sign-out text-red-400 mr-1"></i>{{ employeeSchedule()!.exit_time | date:'h:mm a' }}</span>
                      }
                    </div>
                  } @else {
                    <span class="text-xs text-amber-400"><i class="pi pi-moon mr-1"></i>Día libre</span>
                  }
                </div>
              </div>
            } @else {
              <div class="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-neutral-700/40 border border-neutral-600/40">
                <i class="pi pi-calendar-times text-gray-500 text-sm"></i>
                <span class="text-xs text-gray-500">Sin horario asignado para este día</span>
              </div>
            }

            @if (loadingPunches()) {
            <div class="flex items-center gap-2 text-gray-400 py-4">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Verificando marcaciones...</span>
            </div>
            } @else {
            <p class="text-xs text-gray-500 mb-3">Haz clic en una marcación existente para editarla.</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              @for (punch of punchStatusCards(); track punch.type) {
              <div
                class="p-3 rounded-lg border transition-all"
                [class.bg-green-500/10]="punch.exists"
                [class.border-green-500/30]="punch.exists"
                [class.bg-orange-500/10]="!punch.exists"
                [class.border-orange-500/30]="!punch.exists"
                [class.cursor-pointer]="punch.exists"
                [class.hover:ring-1]="punch.exists"
                [class.hover:ring-blue-400]="punch.exists"
                (click)="punch.exists && startEditPunch(punch.type)"
              >
                <div class="flex items-center gap-2 mb-1">
                  <i
                    class="pi text-sm"
                    [class.pi-check-circle]="punch.exists"
                    [class.text-green-400]="punch.exists"
                    [class.pi-times-circle]="!punch.exists"
                    [class.text-orange-400]="!punch.exists"
                  ></i>
                  <span class="font-medium text-white">{{ punch.label }}</span>
                  @if (punch.exists) {
                  <i class="pi pi-pencil text-xs text-blue-400 ml-auto"></i>
                  }
                </div>
                <span [class.text-green-300]="punch.exists" [class.text-orange-300]="!punch.exists">
                  {{ punch.exists ? (punch.time | date:'h:mm a') : 'NO REGISTRADA' }}
                </span>
              </div>
              }
            </div>
            }
          </div>
          }

          <!-- Formulario de Marcación Manual -->
          @if (selectedDate() && selectedEmployeeId() && !loadingPunches()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <i class="pi pi-plus text-amber-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Registrar Nueva Marcación
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Tipo de Marcación -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-300">Tipo de Marcación</label>
                <p-select
                  [options]="availablePunchTypes()"
                  optionLabel="label"
                  optionValue="value"
                  [(ngModel)]="punchType"
                  placeholder="Seleccionar tipo..."
                  appendTo="body"
                  styleClass="w-full"
                />
              </div>

              <!-- Hora -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-300">Hora de Marcación</label>
                <p-datepicker
                  [(ngModel)]="selectedTime"
                  [showIcon]="true"
                  [timeOnly]="true"
                  [hourFormat]="'12'"
                  appendTo="body"
                  styleClass="w-full"
                  placeholder="Seleccionar hora..."
                />
              </div>
            </div>

            <!-- Razón -->
            <div class="space-y-2 mt-4">
              <label class="text-sm font-medium text-gray-300">Razón / Justificación</label>
              <textarea
                pInputTextarea
                [(ngModel)]="reason"
                rows="2"
                class="w-full"
                placeholder="Ingrese la razón de la marcación manual..."
              ></textarea>
            </div>

            <!-- Mensaje de validación -->
            @if (validationError()) {
            <div class="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div class="flex items-center gap-2 text-red-300">
                <i class="pi pi-exclamation-triangle"></i>
                <span>{{ validationError() }}</span>
              </div>
            </div>
            }

            <!-- Botón de Guardar -->
            <div class="flex justify-end mt-4">
              <p-button
                label="Registrar Marcación"
                icon="pi pi-check"
                [loading]="submitting()"
                [disabled]="!canSubmit()"
                (onClick)="submitTimelog()"
              />
            </div>
          </div>
          }

          <!-- Información -->
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-blue-400 text-xl"></i>
              <div class="flex-1">
                <p class="text-blue-300 font-semibold mb-2">Información Importante</p>
                <ul class="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Las marcaciones manuales quedan registradas con su nombre como responsable</li>
                  <li>Haz clic en una marcación existente (en verde) para editarla</li>
                  <li>Las marcaciones deben seguir el orden lógico: entrada → almuerzo → salida</li>
                  <li>No se puede registrar almuerzo o salida sin entrada previa</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </p-card>
    </div>

    <!-- Diálogo: Editar Marcación -->
    <p-dialog
      header="Editar Marcación"
      [(visible)]="showEditDialog"
      [modal]="true"
      [style]="{width: '380px'}"
      [closable]="!savingEdit()"
    >
      <div class="flex flex-col gap-4 pt-2">
        <p class="text-gray-300 m-0 text-sm">
          Editando: <strong class="text-white">{{ editingPunchTypeLabel() }}</strong>
        </p>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-400">Nueva hora</label>
          <p-datepicker
            [(ngModel)]="editTime"
            [timeOnly]="true"
            [hourFormat]="'12'"
            styleClass="w-full"
            appendTo="body"
          />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [disabled]="savingEdit()"
            (click)="showEditDialog.set(false)"
          />
          <p-button
            label="Guardar"
            icon="pi pi-check"
            [loading]="savingEdit()"
            [disabled]="!editTime()"
            (click)="saveEdit()"
          />
        </div>
      </div>
    </p-dialog>

    <p-confirmDialog />
    <p-toast />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ManualTimelogComponent {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly orgService = inject(OrganizationService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dashboardStore = inject(DashboardStore);

  // Selectores
  public selectedEmployeeId = signal<string | null>(null);

  // Fecha/hora
  public selectedDate = signal<Date | null>(null);
  public selectedTime = signal<Date | null>(null);
  public today = new Date();

  // Tipo de marcación
  public punchType = signal<PunchType>('entry');

  // Estado de marcaciones existentes
  public existingPunches = signal<ExistingPunches>({
    entry: null,
    lunch_start: null,
    lunch_end: null,
    exit: null,
  });

  // Horario del empleado para la fecha seleccionada
  public employeeSchedule = signal<Schedule | null>(null);
  public loadingSchedule = signal<boolean>(false);

  // Razón y UI state
  public reason = signal<string>('');
  public loadingPunches = signal<boolean>(false);
  public submitting = signal<boolean>(false);

  // Edición
  public showEditDialog = signal<boolean>(false);
  public editingPunchType = signal<PunchType | null>(null);
  public editingPunchId = signal<string | null>(null);
  public editTime = signal<Date | null>(null);
  public savingEdit = signal<boolean>(false);

  public punchTypeLabels: Record<PunchType, string> = {
    entry: 'Entrada',
    lunch_start: 'Inicio Almuerzo',
    lunch_end: 'Fin Almuerzo',
    exit: 'Salida',
  };

  public punchTypes = [
    { label: 'Entrada', value: 'entry' as PunchType },
    { label: 'Inicio Almuerzo', value: 'lunch_start' as PunchType },
    { label: 'Fin Almuerzo', value: 'lunch_end' as PunchType },
    { label: 'Salida', value: 'exit' as PunchType },
  ];

  // Computed: todos los empleados activos
  public allEmployees = computed(() =>
    this.dashboardStore.employees
      .employeesList()
      .filter((e) => e.is_active)
      .sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''))
  );

  // Computed: solo tipos que aún no existen (para el select de crear)
  public availablePunchTypes = computed(() => {
    const existing = this.existingPunches();
    return this.punchTypes.filter(t => !existing[t.value]);
  });

  // Computed: cards del status panel
  public punchStatusCards = computed(() => {
    const existing = this.existingPunches();
    return [
      { type: 'entry' as PunchType, label: 'Entrada', exists: !!existing.entry, time: existing.entry?.time },
      { type: 'lunch_start' as PunchType, label: 'Ini. Almuerzo', exists: !!existing.lunch_start, time: existing.lunch_start?.time },
      { type: 'lunch_end' as PunchType, label: 'Fin Almuerzo', exists: !!existing.lunch_end, time: existing.lunch_end?.time },
      { type: 'exit' as PunchType, label: 'Salida', exists: !!existing.exit, time: existing.exit?.time },
    ];
  });

  // Computed: label del tipo que se está editando
  public editingPunchTypeLabel = computed(() => {
    const t = this.editingPunchType();
    return t ? this.punchTypeLabels[t] : '';
  });

  // Computed: Validación
  public canSubmit = computed(() => {
    if (!this.selectedEmployeeId() || !this.selectedDate() || !this.selectedTime()) return false;
    if (this.submitting() || this.loadingPunches()) return false;

    const existing = this.existingPunches();
    const type = this.punchType();

    if (existing[type]) return false;
    if (type !== 'entry' && !existing.entry) return false;
    if (type === 'lunch_end' && !existing.lunch_start) return false;
    if (type === 'exit' && existing.lunch_start && !existing.lunch_end) return false;

    return true;
  });

  // Computed: Mensaje de error de validación
  public validationError = computed(() => {
    const existing = this.existingPunches();
    const type = this.punchType();

    if (existing[type]) return `Ya existe ${this.punchTypeLabels[type].toLowerCase()} registrada para este día.`;
    if (type !== 'entry' && !existing.entry) return 'No se puede registrar esta marcación sin una entrada previa.';
    if (type === 'lunch_end' && !existing.lunch_start) return 'No se puede registrar fin de almuerzo sin inicio de almuerzo.';
    if (type === 'exit' && existing.lunch_start && !existing.lunch_end) return 'No se puede registrar salida sin fin de almuerzo.';

    return null;
  });

  constructor() {
    this.dashboardStore.employees.fetchItems();
  }

  public onEmployeeChange(): void {
    this.selectedDate.set(null);
    this.resetForm();
  }

  public onDateChange(): void {
    this.resetForm();
    this.fetchEmployeeSchedule();
    this.checkExistingPunches();
  }

  private resetForm(): void {
    this.existingPunches.set({ entry: null, lunch_start: null, lunch_end: null, exit: null });
    this.employeeSchedule.set(null);
    this.punchType.set('entry');
    this.selectedTime.set(null);
    this.reason.set('');
  }

  private async fetchEmployeeSchedule(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!employeeId || !date) return;

    this.loadingSchedule.set(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const companyId = this.orgService.getCurrentCompanyId();

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      company_id: `eq.${companyId}`,
      start_date: `lte.${dateStr}`,
      end_date: `gte.${dateStr}`,
      select: 'id,schedule:schedules(id,name,entry_time,exit_time,lunch_start_time,lunch_end_time,day_off)',
      limit: '1',
    });

    try {
      const results = await firstValueFrom(this.http.get<any[]>(url));
      this.employeeSchedule.set(results?.[0]?.schedule ?? null);
    } catch {
      this.employeeSchedule.set(null);
    } finally {
      this.loadingSchedule.set(false);
    }
  }

  public async checkExistingPunches(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!employeeId || !date) return;

    this.loadingPunches.set(true);

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const companyId = this.orgService.getCurrentCompanyId();

    const manualUrl =
      this.apiUrl.build('rest/v1/timelogs', {
        employee_id: `eq.${employeeId}`,
        company_id: `eq.${companyId}`,
        select: 'id,type,created_at,punched_at',
      }) + `&and=(created_at.gte.${startDate.toISOString()},created_at.lt.${endDate.toISOString()})`;

    try {
      const logs = await firstValueFrom(this.http.get<TimeLog[]>(manualUrl));

      const findPunch = (type: string): ExistingPunch | null => {
        const log = logs.find((l) => l.type === type);
        if (!log) return null;
        const dateValue = log.punched_at || log.created_at;
        return dateValue ? { id: log.id, time: new Date(dateValue) } : null;
      };

      this.existingPunches.set({
        entry: findPunch('entry'),
        lunch_start: findPunch('lunch_start'),
        lunch_end: findPunch('lunch_end'),
        exit: findPunch('exit'),
      });

      // Auto-seleccionar el primer tipo faltante disponible
      const available = this.availablePunchTypes();
      if (available.length > 0) this.punchType.set(available[0].value);
    } catch (error) {
      console.error('Error checking existing punches:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron verificar las marcaciones existentes' });
    } finally {
      this.loadingPunches.set(false);
    }
  }

  public submitTimelog(): void {
    if (!this.canSubmit()) return;

    const employeeId = this.selectedEmployeeId()!;
    const employee = this.allEmployees().find(e => e.id === employeeId);
    const typeLabel = this.punchTypeLabels[this.punchType()];
    const time = this.selectedTime()!;
    const timeStr = format(time, 'h:mm a');

    this.confirmationService.confirm({
      message: `¿Registrar ${typeLabel} para <strong>${employee?.short_name || 'este empleado'}</strong> a las <strong>${timeStr}</strong>?`,
      header: 'Confirmar Marcación Manual',
      icon: 'pi pi-clock',
      acceptLabel: 'Registrar',
      rejectLabel: 'Cancelar',
      accept: () => this.doSubmitTimelog(),
    });
  }

  private async doSubmitTimelog(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    const time = this.selectedTime();
    const type = this.punchType();
    const reason = this.reason();

    if (!employeeId || !date || !time) return;

    const employee = this.allEmployees().find(e => e.id === employeeId);
    const branchId = (employee as any)?.branch_id;

    this.submitting.set(true);

    let punchedAt = new Date(date);
    punchedAt = set(punchedAt, { hours: getHours(time), minutes: getMinutes(time), seconds: 0, milliseconds: 0 });

    const companyId = this.orgService.getCurrentCompanyId();
    const currentEmployee = this.dashboardStore.currentEmployee();

    const payload = {
      employee_id: employeeId,
      branch_id: branchId || null,
      company_id: companyId,
      type,
      source: 'MANUAL',
      created_by: currentEmployee?.id || null,
      punched_at: punchedAt.toISOString(),
      created_at: punchedAt.toISOString(),
      reason: reason || null,
    };

    try {
      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/timelogs'), payload));

      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Registrada',
        detail: `Se registró la ${this.punchTypeLabels[type]} correctamente`,
      });

      await this.checkExistingPunches();
      this.selectedTime.set(null);
      this.reason.set('');
    } catch (error: any) {
      console.error('Error creating manual timelog:', error);
      const status = error?.status;
      const serverMsg = error?.error?.message || error?.error?.details || '';
      let detail = 'No se pudo registrar la marcación.';

      if (status === 409) detail = 'Ya existe una marcación de este tipo para este día.';
      else if (status === 403) detail = 'No tienes permisos para realizar esta acción.';
      else if (serverMsg) detail = serverMsg;

      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.submitting.set(false);
    }
  }

  // ── Edición de marcaciones existentes ──

  public startEditPunch(type: PunchType): void {
    const punch = this.existingPunches()[type];
    if (!punch) return;

    this.editingPunchType.set(type);
    this.editingPunchId.set(punch.id);
    this.editTime.set(new Date(punch.time));
    this.showEditDialog.set(true);
  }

  public async saveEdit(): Promise<void> {
    const id = this.editingPunchId();
    const time = this.editTime();
    const date = this.selectedDate();
    if (!id || !time || !date) return;

    this.savingEdit.set(true);

    let punchedAt = new Date(date);
    punchedAt = set(punchedAt, { hours: getHours(time), minutes: getMinutes(time), seconds: 0, milliseconds: 0 });

    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/timelogs', { id: `eq.${id}` }),
          { punched_at: punchedAt.toISOString(), created_at: punchedAt.toISOString() }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Actualizada',
        detail: `${this.editingPunchTypeLabel()} actualizada a las ${format(punchedAt, 'h:mm a')}`,
      });

      this.showEditDialog.set(false);
      await this.checkExistingPunches();
    } catch (error: any) {
      console.error('Error updating timelog:', error);
      const status = error?.status;
      let detail = error?.error?.message || 'No se pudo actualizar la marcación.';
      if (status === 403) detail = 'No tienes permisos para editar esta marcación.';

      this.messageService.add({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.savingEdit.set(false);
    }
  }
}
