import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { endOfDay, format, getHours, getMinutes, set, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee, TimeLog, TimeLogEnum } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';

type PunchType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit';

interface ExistingPunches {
  entry: Date | null;
  lunch_start: Date | null;
  lunch_end: Date | null;
  exit: Date | null;
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
    DatePipe,
  ],
  providers: [MessageService],
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
          Registra marcaciones manuales para empleados que omitieron su marcación
        </ng-template>

        <div class="space-y-6 mt-4">
          <!-- Paso 1: Seleccionar Sucursal -->
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <i class="pi pi-building text-blue-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 1: Selecciona la Sucursal
              </h3>
            </div>
            <p-select
              [options]="branches()"
              optionLabel="name"
              optionValue="id"
              [(ngModel)]="selectedBranchId"
              placeholder="Seleccionar sucursal..."
              [filter]="true"
              filterBy="name"
              showClear
              appendTo="body"
              styleClass="w-full"
              (onChange)="onBranchChange()"
            />
          </div>

          <!-- Paso 2: Seleccionar Empleado -->
          @if (selectedBranchId()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-user text-cyan-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 2: Selecciona el Empleado
              </h3>
            </div>
            <p-select
              [options]="branchEmployees()"
              optionLabel="short_name"
              optionValue="id"
              [(ngModel)]="selectedEmployeeId"
              placeholder="Buscar empleado..."
              [filter]="true"
              filterBy="short_name"
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
                </div>
                }
              </ng-template>
              <ng-template #item let-employee>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ employee.short_name }}</span>
                  <span class="text-gray-400 text-sm">({{ employee.employee_number }})</span>
                </div>
              </ng-template>
            </p-select>
          </div>
          }

          <!-- Paso 3: Seleccionar Fecha -->
          @if (selectedEmployeeId()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <i class="pi pi-calendar text-purple-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Paso 3: Selecciona la Fecha
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

            @if (loadingPunches()) {
            <div class="flex items-center gap-2 text-gray-400 py-4">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Verificando marcaciones...</span>
            </div>
            } @else {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div
                class="p-3 rounded-lg border"
                [class.bg-green-500/10]="existingPunches().entry"
                [class.border-green-500/30]="existingPunches().entry"
                [class.bg-orange-500/10]="!existingPunches().entry"
                [class.border-orange-500/30]="!existingPunches().entry"
              >
                <div class="flex items-center gap-2 mb-1">
                  <i
                    class="pi text-sm"
                    [class.pi-check-circle]="existingPunches().entry"
                    [class.text-green-400]="existingPunches().entry"
                    [class.pi-times-circle]="!existingPunches().entry"
                    [class.text-orange-400]="!existingPunches().entry"
                  ></i>
                  <span class="font-medium text-white">Entrada</span>
                </div>
                <span [class.text-green-300]="existingPunches().entry" [class.text-orange-300]="!existingPunches().entry">
                  {{ existingPunches().entry ? (existingPunches().entry | date:'h:mm a') : 'NO REGISTRADA' }}
                </span>
              </div>

              <div
                class="p-3 rounded-lg border"
                [class.bg-green-500/10]="existingPunches().lunch_start"
                [class.border-green-500/30]="existingPunches().lunch_start"
                [class.bg-orange-500/10]="!existingPunches().lunch_start"
                [class.border-orange-500/30]="!existingPunches().lunch_start"
              >
                <div class="flex items-center gap-2 mb-1">
                  <i
                    class="pi text-sm"
                    [class.pi-check-circle]="existingPunches().lunch_start"
                    [class.text-green-400]="existingPunches().lunch_start"
                    [class.pi-times-circle]="!existingPunches().lunch_start"
                    [class.text-orange-400]="!existingPunches().lunch_start"
                  ></i>
                  <span class="font-medium text-white">Ini. Almuerzo</span>
                </div>
                <span [class.text-green-300]="existingPunches().lunch_start" [class.text-orange-300]="!existingPunches().lunch_start">
                  {{ existingPunches().lunch_start ? (existingPunches().lunch_start | date:'h:mm a') : 'NO REGISTRADA' }}
                </span>
              </div>

              <div
                class="p-3 rounded-lg border"
                [class.bg-green-500/10]="existingPunches().lunch_end"
                [class.border-green-500/30]="existingPunches().lunch_end"
                [class.bg-orange-500/10]="!existingPunches().lunch_end"
                [class.border-orange-500/30]="!existingPunches().lunch_end"
              >
                <div class="flex items-center gap-2 mb-1">
                  <i
                    class="pi text-sm"
                    [class.pi-check-circle]="existingPunches().lunch_end"
                    [class.text-green-400]="existingPunches().lunch_end"
                    [class.pi-times-circle]="!existingPunches().lunch_end"
                    [class.text-orange-400]="!existingPunches().lunch_end"
                  ></i>
                  <span class="font-medium text-white">Fin Almuerzo</span>
                </div>
                <span [class.text-green-300]="existingPunches().lunch_end" [class.text-orange-300]="!existingPunches().lunch_end">
                  {{ existingPunches().lunch_end ? (existingPunches().lunch_end | date:'h:mm a') : 'NO REGISTRADA' }}
                </span>
              </div>

              <div
                class="p-3 rounded-lg border"
                [class.bg-green-500/10]="existingPunches().exit"
                [class.border-green-500/30]="existingPunches().exit"
                [class.bg-orange-500/10]="!existingPunches().exit"
                [class.border-orange-500/30]="!existingPunches().exit"
              >
                <div class="flex items-center gap-2 mb-1">
                  <i
                    class="pi text-sm"
                    [class.pi-check-circle]="existingPunches().exit"
                    [class.text-green-400]="existingPunches().exit"
                    [class.pi-times-circle]="!existingPunches().exit"
                    [class.text-orange-400]="!existingPunches().exit"
                  ></i>
                  <span class="font-medium text-white">Salida</span>
                </div>
                <span [class.text-green-300]="existingPunches().exit" [class.text-orange-300]="!existingPunches().exit">
                  {{ existingPunches().exit ? (existingPunches().exit | date:'h:mm a') : 'NO REGISTRADA' }}
                </span>
              </div>
            </div>
            }
          </div>
          }

          <!-- Formulario de Marcación Manual -->
          @if (selectedDate() && selectedEmployeeId() && !loadingPunches()) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <i class="pi pi-pencil text-amber-400"></i>
              </div>
              <h3 class="text-base font-semibold text-white m-0">
                Registrar Marcación Manual
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Tipo de Marcación -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-300">Tipo de Marcación</label>
                <p-select
                  [options]="punchTypes"
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
                  <li>Solo se pueden registrar marcaciones faltantes (no reemplazar existentes)</li>
                  <li>Las marcaciones deben seguir el orden lógico: entrada → almuerzo → salida</li>
                  <li>No se puede registrar almuerzo o salida sin entrada previa</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </p-card>
    </div>

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
  private readonly dashboardStore = inject(DashboardStore);

  // Selectores
  public selectedBranchId = signal<string | null>(null);
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

  // Razón y UI state
  public reason = signal<string>('');
  public loadingPunches = signal<boolean>(false);
  public submitting = signal<boolean>(false);

  // Opciones
  public punchTypes = [
    { label: 'Entrada', value: 'entry' as PunchType },
    { label: 'Inicio Almuerzo', value: 'lunch_start' as PunchType },
    { label: 'Fin Almuerzo', value: 'lunch_end' as PunchType },
    { label: 'Salida', value: 'exit' as PunchType },
  ];

  // Computed: Lista de sucursales activas
  public branches = computed(() => {
    return this.dashboardStore.branches
      .entities()
      .filter((b) => b.is_active)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Computed: Empleados de la sucursal seleccionada (usando employeesList que incluye short_name)
  public branchEmployees = computed(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return [];

    return this.dashboardStore.employees
      .employeesList()
      .filter((e) => e.is_active && e.branch_id === branchId)
      .sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
  });

  // Computed: Validación de si se puede enviar
  public canSubmit = computed(() => {
    if (!this.selectedEmployeeId() || !this.selectedDate() || !this.selectedTime()) {
      return false;
    }
    if (this.submitting() || this.loadingPunches()) {
      return false;
    }

    const existing = this.existingPunches();
    const type = this.punchType();

    // Bloquear si ya existe ese tipo de marcación
    if (existing[type]) return false;

    // BLOQUEO COMPLETO: No permitir lunch_start, lunch_end o exit sin entrada
    if (type !== 'entry' && !existing.entry) return false;

    // No permitir lunch_end sin lunch_start
    if (type === 'lunch_end' && !existing.lunch_start) return false;

    // No permitir exit sin lunch_end (si lunch_start existe)
    if (type === 'exit' && existing.lunch_start && !existing.lunch_end) return false;

    return true;
  });

  // Computed: Mensaje de error de validación
  public validationError = computed(() => {
    const existing = this.existingPunches();
    const type = this.punchType();

    if (existing[type]) {
      const labels: Record<PunchType, string> = {
        entry: 'una entrada',
        lunch_start: 'un inicio de almuerzo',
        lunch_end: 'un fin de almuerzo',
        exit: 'una salida',
      };
      return `Ya existe ${labels[type]} registrada para este día.`;
    }

    if (type !== 'entry' && !existing.entry) {
      return 'No se puede registrar esta marcación sin una entrada previa.';
    }

    if (type === 'lunch_end' && !existing.lunch_start) {
      return 'No se puede registrar fin de almuerzo sin inicio de almuerzo.';
    }

    if (type === 'exit' && existing.lunch_start && !existing.lunch_end) {
      return 'No se puede registrar salida sin fin de almuerzo.';
    }

    return null;
  });

  constructor() {
    // Cargar datos iniciales
    this.dashboardStore.branches.fetchItems();
    this.dashboardStore.employees.fetchItems();
  }

  // Cuando cambia la sucursal
  public onBranchChange(): void {
    this.selectedEmployeeId.set(null);
    this.selectedDate.set(null);
    this.resetForm();
  }

  // Cuando cambia el empleado
  public onEmployeeChange(): void {
    this.selectedDate.set(null);
    this.resetForm();
  }

  // Cuando cambia la fecha
  public onDateChange(): void {
    this.resetForm();
    this.checkExistingPunches();
  }

  // Resetear formulario
  private resetForm(): void {
    this.existingPunches.set({
      entry: null,
      lunch_start: null,
      lunch_end: null,
      exit: null,
    });
    this.punchType.set('entry');
    this.selectedTime.set(null);
    this.reason.set('');
  }

  // Verificar marcaciones existentes para la fecha seleccionada
  public async checkExistingPunches(): Promise<void> {
    const employeeId = this.selectedEmployeeId();
    const date = this.selectedDate();
    if (!employeeId || !date) return;

    this.loadingPunches.set(true);

    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    const companyId = this.orgService.getCurrentCompanyId();

    const url = this.apiUrl.build('rest/v1/timelogs', {
      employee_id: `eq.${employeeId}`,
      company_id: `eq.${companyId}`,
      created_at: `gte.${startDate.toISOString()}`,
      'created_at@2': `lt.${endDate.toISOString()}`,
      select: 'type,created_at,punched_at',
    });

    // Workaround: PostgREST no soporta múltiples filtros en el mismo campo
    // Usamos una URL manual con and filter
    const manualUrl = this.apiUrl.build('rest/v1/timelogs', {
      employee_id: `eq.${employeeId}`,
      company_id: `eq.${companyId}`,
      select: 'type,created_at,punched_at',
    }) + `&and=(created_at.gte.${startDate.toISOString()},created_at.lt.${endDate.toISOString()})`;

    try {
      const logs = await firstValueFrom(this.http.get<TimeLog[]>(manualUrl));

      this.existingPunches.set({
        entry: this.findPunchTime(logs, 'entry'),
        lunch_start: this.findPunchTime(logs, 'lunch_start'),
        lunch_end: this.findPunchTime(logs, 'lunch_end'),
        exit: this.findPunchTime(logs, 'exit'),
      });

      // Auto-seleccionar el primer tipo faltante
      this.autoSelectPunchType();
    } catch (error) {
      console.error('Error checking existing punches:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron verificar las marcaciones existentes',
      });
    } finally {
      this.loadingPunches.set(false);
    }
  }

  // Encontrar la hora de una marcación específica
  private findPunchTime(logs: TimeLog[], type: string): Date | null {
    const log = logs.find((l) => l.type === type);
    if (!log) return null;
    const dateValue = log.punched_at || log.created_at;
    return dateValue ? new Date(dateValue) : null;
  }

  // Auto-seleccionar el siguiente tipo de marcación faltante
  private autoSelectPunchType(): void {
    const existing = this.existingPunches();

    if (!existing.entry) {
      this.punchType.set('entry');
    } else if (!existing.lunch_start) {
      this.punchType.set('lunch_start');
    } else if (!existing.lunch_end) {
      this.punchType.set('lunch_end');
    } else if (!existing.exit) {
      this.punchType.set('exit');
    }
  }

  // Enviar marcación manual
  public async submitTimelog(): Promise<void> {
    if (!this.canSubmit()) return;

    const employeeId = this.selectedEmployeeId();
    const branchId = this.selectedBranchId();
    const date = this.selectedDate();
    const time = this.selectedTime();
    const type = this.punchType();
    const reason = this.reason();

    if (!employeeId || !branchId || !date || !time) return;

    this.submitting.set(true);

    // Combinar fecha y hora
    let punchedAt = new Date(date);
    punchedAt = set(punchedAt, { hours: getHours(time), minutes: getMinutes(time), seconds: 0, milliseconds: 0 });

    const companyId = this.orgService.getCurrentCompanyId();
    const currentEmployee = this.dashboardStore.currentEmployee();

    const payload = {
      employee_id: employeeId,
      branch_id: branchId,
      company_id: companyId,
      type: type,
      source: 'MANUAL',
      created_by: currentEmployee?.id || null,
      punched_at: punchedAt.toISOString(),
      created_at: punchedAt.toISOString(), // Para mantener consistencia en reportes
      reason: reason || null,
    };

    const url = this.apiUrl.build('rest/v1/timelogs');

    try {
      await firstValueFrom(this.http.post(url, payload));

      const typeLabels: Record<PunchType, string> = {
        entry: 'Entrada',
        lunch_start: 'Inicio de Almuerzo',
        lunch_end: 'Fin de Almuerzo',
        exit: 'Salida',
      };

      this.messageService.add({
        severity: 'success',
        summary: 'Marcación Registrada',
        detail: `Se registró la ${typeLabels[type]} correctamente`,
      });

      // Recargar marcaciones existentes
      await this.checkExistingPunches();

      // Limpiar campos de formulario (pero mantener selección)
      this.selectedTime.set(null);
      this.reason.set('');
    } catch (error: any) {
      console.error('Error creating manual timelog:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo registrar la marcación',
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
