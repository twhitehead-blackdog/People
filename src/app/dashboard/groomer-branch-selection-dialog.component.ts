import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { differenceInCalendarDays, format } from 'date-fns';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectButton } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';

import { Employee, GroomerBranchAssignment } from '../models';
import { DashboardStore } from '../stores/dashboard.store';

export interface GroomerBranchSelectionResult {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  branchId?: string;
  scheduleId?: string;
}

// Constants mirrored from employee-schedules-form
const HIDDEN_FOR_ALL = ['1f4161d1-4935-4fab-9a53-b6eee2a3efd6'];
const HIDDEN_FOR_STORE_MANAGERS = ['cac0d93b-5277-4d42-978d-d4c5eda52f80'];
const COMPENSATORY_SCHEDULE_ID = 'f2d92995-96a0-414f-b64a-9823db776745';
const FEMALE_ONLY_KEYWORDS = ['lactancia', 'maternidad'];
const ALLOWED_STORE_MANAGER_SHIFTS = [
  'CM', 'Incapacidad', '7:00 AM - 4:00 PM', '8:00 AM - 5:00 PM',
  'Lactancia 1', 'Lactancia 2', '10:30 AM - 7:00 PM', 'Dia Libre',
  '11:30 AM - 8:00 PM', '12:30 PM - 9:00 PM', 'A. Injus',
  'Licencia maternidad', 'Permiso', 'Vacaciones', 'Inventario 2', 'Entrenamiento',
];

@Component({
  selector: 'pt-groomer-branch-selection-dialog',
  standalone: true,
  imports: [
    DialogModule,
    SelectModule,
    Button,
    FormsModule,
    SelectButton,
    DatePicker,
    SlicePipe,
  ],
  template: `
    <p-dialog
      header="Asignar Peluquero"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [style]="{ width: '95vw', maxWidth: '540px' }"
    >
      <div class="flex flex-col md:grid grid-cols-2 gap-4">

        <!-- Peluquero -->
        <div class="input-container col-span-2">
          <label>Peluquero</label>
          @if (employee()) {
            <div class="flex items-center gap-2 px-3 py-2 rounded border border-neutral-600 bg-neutral-800/60">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                [style.background-color]="getEmployeeColor(employee()!.id)"></div>
              <span class="font-medium">{{ employee()!.first_name }} {{ employee()!.father_name }}</span>
              <span class="text-xs text-slate-500 ml-1">— {{ employee()!.position?.name }}</span>
            </div>
          } @else {
            <p-select
              [options]="filteredEmployees()"
              [ngModel]="selectedEmployeeId()"
              (ngModelChange)="selectedEmployeeId.set($event)"
              placeholder="Buscar peluquero..."
              [filter]="true"
              filterBy="first_name,father_name"
              [showClear]="true"
              optionValue="id"
              appendTo="body"
            >
              <ng-template let-emp #item>
                <div class="flex items-center gap-2 py-0.5">
                  <div class="w-2 h-2 rounded-full flex-shrink-0"
                    [style.background-color]="getEmployeeColor(emp.id)"></div>
                  <div class="flex flex-col leading-tight">
                    <span class="text-sm font-medium">{{ emp.first_name }} {{ emp.father_name }}</span>
                    <span class="text-xs text-slate-500">{{ emp.position?.name }}</span>
                  </div>
                  @if (isNonWorking(emp.id)) {
                    <span class="ml-auto text-xs text-amber-400 italic">{{ getNonWorkingLabel(emp.id) }}</span>
                  }
                </div>
              </ng-template>
              <ng-template let-emp #selectedItem>
                @if (emp) {
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full flex-shrink-0"
                      [style.background-color]="getEmployeeColor(emp.id)"></div>
                    <span>{{ emp.first_name }} {{ emp.father_name }}</span>
                  </div>
                }
              </ng-template>
            </p-select>
          }
          @if (selectedEmployeeNonWorking()) {
            <small class="flex items-center gap-1 text-amber-400">
              <i class="pi pi-exclamation-triangle text-xs"></i>
              {{ selectedEmployeeNonWorking() }} — no labora en la fecha seleccionada.
            </small>
          }
        </div>

        <!-- Tipo de asignación -->
        <div class="input-container col-span-2">
          <label>Tipo de asignación</label>
          <p-selectbutton
            [options]="dateTypeOptions"
            [ngModel]="dateType()"
            (ngModelChange)="dateType.set($event)"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          />
        </div>

        <!-- Fecha única -->
        @if (dateType() === 'single') {
          <div class="input-container col-span-2">
            <label>Fecha</label>
            <p-datepicker
              [ngModel]="startDate()"
              (ngModelChange)="startDate.set($event)"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              [minDate]="minDate"
              appendTo="body"
            />
          </div>
        } @else {
          <!-- Rango de fechas -->
          <div class="input-container">
            <label>Fecha inicio</label>
            <p-datepicker
              [ngModel]="startDate()"
              (ngModelChange)="startDate.set($event)"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              [minDate]="minDate"
              appendTo="body"
            />
          </div>
          <div class="input-container">
            <label>Fecha fin</label>
            <p-datepicker
              [ngModel]="endDate()"
              (ngModelChange)="endDate.set($event)"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              [minDate]="startDate() || minDate"
              appendTo="body"
            />
          </div>
          @if (dayCount() > 0) {
            <small class="col-span-2 text-slate-500 flex items-center gap-1">
              <i class="pi pi-info-circle"></i>
              Se asignarán {{ dayCount() }} día(s)
            </small>
          }
        }

        <!-- Sucursal | Horario (mitad cada uno) -->
        <div class="col-span-2">
          <div class="grid grid-cols-2 gap-3">
            <!-- Sucursal -->
            <div class="input-container">
              <label>Sucursal</label>
              @if (branchIsLocked()) {
                <div class="px-3 py-2 rounded border border-neutral-600 bg-neutral-800/60">
                  <span class="font-medium">{{ lockedBranchName() }}</span>
                </div>
              } @else {
                <p-select
                  [options]="branches()"
                  optionLabel="name"
                  optionValue="id"
                  [ngModel]="selectedBranchId()"
                  (ngModelChange)="onBranchChange($event)"
                  placeholder="Sucursal..."
                  [showClear]="true"
                  appendTo="body"
                  [virtualScroll]="true"
                  [virtualScrollItemSize]="35"
                  [disabled]="scheduleDisabled()"
                />
              }
            </div>

            <!-- Horario -->
            <div class="input-container">
              <label class="flex items-center gap-2">
                Horario
                @if (actualEntryTime(); as actual) {
                  <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                    <i class="pi pi-clock text-[9px] mr-1"></i>Marcó a las {{ actual }}
                  </span>
                }
              </label>
              <p-select
                [options]="schedulesByProximity()"
                optionLabel="name"
                optionValue="id"
                [ngModel]="selectedScheduleId()"
                (ngModelChange)="onScheduleChange($event)"
                placeholder="Horario..."
                [showClear]="true"
                appendTo="body"
                [filter]="true"
                filterBy="name"
                [virtualScroll]="true"
                [virtualScrollItemSize]="35"
                [disabled]="branchDisabled()"
              >
                <ng-template let-s pTemplate="item">
                  <div class="flex items-center justify-between w-full gap-2 py-0.5">
                    <span class="font-medium">{{ s.name }}</span>
                    @if (s.entry_time) {
                      <span class="text-[10px] text-neutral-400 font-mono">
                        {{ s.entry_time | slice:0:5 }} - {{ s.exit_time | slice:0:5 }}
                      </span>
                    }
                  </div>
                </ng-template>
              </p-select>
            </div>
          </div>
          @if (selectedScheduleId() && !selectedBranchId()) {
            <small class="text-slate-400 text-xs mt-1 flex items-center gap-1">
              <i class="pi pi-info-circle text-xs"></i>
              Se creará un horario especial (sin sucursal)
            </small>
          }
        </div>

        <!-- Botones -->
        <div class="dialog-actions col-span-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            rounded
            (onClick)="cancelSelection()"
          />
          <p-button
            label="Asignar"
            rounded
            (onClick)="confirmSelection()"
            [disabled]="!canConfirm()"
          />
        </div>

      </div>
    </p-dialog>
  `,
})
export class GroomerBranchSelectionDialogComponent {
  private store = inject(DashboardStore);

  // Inputs
  visible = input<boolean>(false);
  employee = input<Employee | undefined>();
  date = input<Date | undefined>();
  currentBranchId = input<string | undefined>();
  currentScheduleId = input<string | undefined>();
  branchId = input<string | undefined>();
  /** HH:MM real de la marcación cuando se abre desde una "presencia detectada" */
  actualEntryTime = input<string | undefined>();
  allGroomerEmployees = input<Employee[]>([]);
  nonWorkingMap = input<Record<string, string>>({});
  existingAssignments = input<GroomerBranchAssignment[]>([]);

  // Outputs
  visibleChange = output<boolean>();
  confirm = output<GroomerBranchSelectionResult>();
  cancel = output<void>();

  // Internal state
  selectedEmployeeId = signal<string | null>(null);
  selectedBranchId = signal<string | null>(null);
  selectedScheduleId = signal<string | null>(null);
  dateType = signal<'single' | 'range'>('single');
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);

  minDate: Date | undefined = undefined;

  dateTypeOptions = [
    { label: 'Fecha única', value: 'single' },
    { label: 'Rango de fechas', value: 'range' },
  ];

  private readonly empColors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
  ];

  // Computed: available branches
  branches = computed(() =>
    this.store.branches.entities().filter(
      (branch) =>
        branch.is_active &&
        branch.name !== 'Bodega Dos Caminos' &&
        branch.id !== '7862b9be-890d-4432-8a2f-9329a15a2853'
    )
  );

  // Computed: available schedules (same filtering as employee-schedules-form)
  availableSchedules = computed(() => {
    const all = (this.store.schedules.entities() ?? []).filter(
      (s: any) => !HIDDEN_FOR_ALL.includes(s?.id)
    );
    const emp = this.employee();
    const isFemale = emp?.gender === 'F';
    const isAdmin = this.store.isAdmin();
    const isStoreManager = this.store.isScheduleAdmin() && !isAdmin;

    const filterGender = (schedules: any[]) =>
      isFemale
        ? schedules
        : schedules.filter(
            (s: any) =>
              !FEMALE_ONLY_KEYWORDS.some((kw) =>
                String(s?.name ?? '').toLowerCase().includes(kw)
              )
          );

    if (isAdmin) return filterGender(all);

    if (isStoreManager) {
      return filterGender(
        all.filter(
          (s: any) =>
            !HIDDEN_FOR_STORE_MANAGERS.includes(s?.id) &&
            ALLOWED_STORE_MANAGER_SHIFTS.some(
              (a) => String(s?.name ?? '').toUpperCase() === a.toUpperCase()
            )
        )
      );
    }

    return filterGender(
      all.filter(
        (s: any) =>
          s?.id !== COMPENSATORY_SCHEDULE_ID &&
          !String(s?.name ?? '').toLowerCase().includes('compensatorio')
      )
    );
  });

  /** Schedules ordenados por cercanía a actualEntryTime (cuando viene de marcación) */
  schedulesByProximity = computed(() => {
    const list = this.availableSchedules();
    const actual = this.actualEntryTime();
    if (!actual) return list;
    const [ah, am] = actual.split(':').map((x) => parseInt(x, 10));
    const actualMin = ah * 60 + (am || 0);
    const annotated = list.map((s: any) => {
      const t = (s.entry_time as string | null) ?? '';
      const [hh, mm] = t.split(':').map((x: string) => parseInt(x, 10));
      const sMin = isNaN(hh) ? -1 : hh * 60 + (mm || 0);
      const diff = sMin < 0 ? Infinity : Math.abs(sMin - actualMin);
      return { ...s, _proximity: diff };
    });
    return annotated.sort((a: any, b: any) => a._proximity - b._proximity);
  });

  // Mutual exclusion — desactivada cuando hay marcación detectada (queremos ambos)
  branchDisabled = computed(() => {
    if (this.actualEntryTime() || this.currentScheduleId()) return false;
    return !!this.selectedScheduleId();
  });
  scheduleDisabled = computed(() => {
    // En modo edición (con schedule existente) siempre permitir cambiar el schedule
    if (this.currentScheduleId()) return false;
    return !!this.selectedBranchId() || this.branchIsLocked();
  });

  // Computed: employees filtered by already-assigned on selected date
  filteredEmployees = computed(() => {
    const dateKey = this.startDate()
      ? format(this.startDate()!, 'yyyy-MM-dd')
      : null;
    const allEmployees = this.allGroomerEmployees();
    if (!dateKey) return allEmployees;

    const assignedIds = new Set(
      this.existingAssignments()
        .filter((a) => a.date.toString().slice(0, 10) === dateKey)
        .map((a) => a.employee_id)
    );

    const editingId = this.employee()?.id;
    return allEmployees.filter(
      (e) => !assignedIds.has(e.id) || e.id === editingId
    );
  });

  branchIsLocked = computed(() => !!this.branchId());

  lockedBranchName = computed(() => {
    const id = this.branchId();
    if (!id) return '';
    return this.store.branches.entities().find((b) => b.id === id)?.name ?? '';
  });

  dayCount = computed(() => {
    const s = this.startDate();
    const e = this.endDate();
    if (!s || !e) return 0;
    return Math.abs(differenceInCalendarDays(e, s)) + 1;
  });

  selectedEmployeeNonWorking = computed(() => {
    const empId = this.employee()?.id ?? this.selectedEmployeeId();
    if (!empId) return null;
    const dateKey = this.startDate()
      ? format(this.startDate()!, 'yyyy-MM-dd')
      : null;
    if (!dateKey) return null;
    const key = `${empId}|${dateKey}`;
    return this.nonWorkingMap()[key] ?? null;
  });

  canConfirm = computed(() => {
    const empId = this.employee()?.id ?? this.selectedEmployeeId();
    const hasBranch = !!(this.branchId() ?? this.selectedBranchId());
    const hasSchedule = !!this.selectedScheduleId();
    if (!empId || (!hasBranch && !hasSchedule) || !this.startDate()) return false;
    if (this.dateType() === 'range') {
      if (!this.endDate()) return false;
      if (this.startDate()! > this.endDate()!) return false;
    }
    return true;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.initDialogState();
      }
    });
  }

  private initDialogState(): void {
    this.startDate.set(this.date() ? new Date(this.date()!) : new Date());
    this.endDate.set(null);
    this.dateType.set('single');
    this.selectedEmployeeId.set(null);
    // Pre-llenar schedule si ya existe en Turnos
    this.selectedScheduleId.set(this.currentScheduleId() ?? null);

    const lockBranch = this.branchId();
    const editBranch = this.currentBranchId();
    this.selectedBranchId.set(editBranch ?? lockBranch ?? null);
  }

  onBranchChange(value: string | null): void {
    this.selectedBranchId.set(value);
    // En modo edición o presencia detectada permitimos branch + schedule simultáneos
    if (value && !this.currentScheduleId() && !this.actualEntryTime()) {
      this.selectedScheduleId.set(null);
    }
  }

  onScheduleChange(value: string | null): void {
    this.selectedScheduleId.set(value);
    // En modo edición o presencia detectada permitimos branch + schedule simultáneos
    if (value && !this.currentScheduleId() && !this.currentBranchId() && !this.actualEntryTime()) {
      this.selectedBranchId.set(null);
    }
  }

  getEmployeeColor(employeeId: string): string {
    const hash = employeeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return this.empColors[hash % this.empColors.length];
  }

  isNonWorking(employeeId: string): boolean {
    const dateKey = this.startDate()
      ? format(this.startDate()!, 'yyyy-MM-dd')
      : null;
    if (!dateKey) return false;
    return !!this.nonWorkingMap()[`${employeeId}|${dateKey}`];
  }

  getNonWorkingLabel(employeeId: string): string {
    const dateKey = this.startDate()
      ? format(this.startDate()!, 'yyyy-MM-dd')
      : null;
    if (!dateKey) return '';
    return this.nonWorkingMap()[`${employeeId}|${dateKey}`] ?? '';
  }

  confirmSelection(): void {
    if (!this.canConfirm()) return;

    const empId = this.employee()?.id ?? this.selectedEmployeeId()!;
    const startDate = this.startDate()!;
    const endDate =
      this.dateType() === 'range' && this.endDate()
        ? this.endDate()!
        : startDate;

    const result: GroomerBranchSelectionResult = {
      employeeId: empId,
      startDate,
      endDate,
    };

    // Soportar ambos: schedule + branch (cuando viene de marcación o edición)
    const sId = this.selectedScheduleId();
    const bId = this.branchId() ?? this.selectedBranchId();
    if (sId) result.scheduleId = sId;
    if (bId) result.branchId = bId;

    this.confirm.emit(result);
    this.closeDialog();
  }

  cancelSelection(): void {
    this.cancel.emit();
    this.closeDialog();
  }

  private closeDialog(): void {
    this.selectedEmployeeId.set(null);
    this.selectedBranchId.set(null);
    this.selectedScheduleId.set(null);
    this.startDate.set(null);
    this.endDate.set(null);
    this.dateType.set('single');
    this.visibleChange.emit(false);
  }
}
