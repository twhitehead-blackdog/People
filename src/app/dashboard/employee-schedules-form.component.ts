import { NgClass, NgStyle } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  subDays,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { firstValueFrom, forkJoin, iif } from 'rxjs';
import { format as formatDate, getDay } from 'date-fns';
import { v4 } from 'uuid';
import {
  colorVariants,
  getScheduleColorInlineStyle as getColorStyle,
} from '../models';
import { TrimPipe } from '../pipes/trim.pipe';
import { ApiUrlService } from '../services/api-url.service';
import { LoggerService } from '../services/logger.service';
import { OrganizationService } from '../services/organization.service';
import { ScheduleAuditService } from '../services/schedule-audit.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-employee-schedules-form',
  imports: [
    SelectModule,
    Button,
    DatePicker,
    FormsModule,
    ReactiveFormsModule,
    TrimPipe,
    NgClass,
    NgStyle,
    ToggleSwitch,
    ConfirmDialog,
  ],
  providers: [ConfirmationService],
  template: `<p-confirmDialog />
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col  md:grid grid-cols-2 gap-4">
      <div class="input-container">
        <label for="employee_id">Empleado</label>
        <p-select
          inputId="employee_id"
          formControlName="employee_id"
          [options]="activeEmployeesList()"
          optionValue="id"
          placeholder="Seleccionar empleado"
          filter
          filterBy="first_name,father_name"
          appendTo="body"
        >
          <ng-template #selectedItem let-selected>
            @if(selected) {
            {{ selected.father_name | trim }}, {{ selected.first_name | trim }}
            } @else { @if(form.get('employee_id')?.value) { Cargando empleado...
            } @else { Seleccionar empleado } }
          </ng-template>
          <ng-template let-item #item>
            {{ item.father_name | trim }}, {{ item.first_name | trim }}
          </ng-template>
        </p-select>
      </div>
      <div class="input-container">
        <label for="schedule_id">Turno</label>
        <p-select
          inputId="schedule_id"
          [options]="availableSchedules()"
          optionLabel="name"
          optionValue="id"
          formControlName="schedule_id"
          appendTo="body"
          placeholder="Seleccionar turno"
        >
          <ng-template #item let-item>
            <div class="flex items-center ">
              <div
                class="px-3 py-1.5 text-sm rounded"
                [ngClass]="colorVariants[item.color] || ''"
                [ngStyle]="
                  !colorVariants[item.color]
                    ? getScheduleColorInlineStyle(item.color)
                    : null
                "
              >
                {{ item.name }}
              </div>
            </div>
          </ng-template>
          <ng-template #selectedItem let-selected>
            <div class="flex items-center ">
              <div
                class="text-sm rounded p-1"
                [ngClass]="colorVariants[selected.color] || ''"
                [ngStyle]="
                  !colorVariants[selected.color]
                    ? getScheduleColorInlineStyle(selected.color)
                    : null
                "
              >
                {{ selected.name }}
              </div>
            </div>
          </ng-template>
        </p-select>
      </div>

      <div class="input-container">
        <label for="start_date">Fecha inicio</label>
        <p-datepicker
          inputId="start_date"
          formControlName="start_date"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="end_date">Fecha fin</label>
        <p-datepicker
          inputId="end_date"
          formControlName="end_date"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="branch_id">Sucursal</label>
        <p-select
          inputId="branch_id"
          formControlName="branch_id"
          [options]="store.branches.entities()"
          optionLabel="name"
          filter
          optionValue="id"
          placeholder="Seleccionar sucursal"
          appendTo="body"
        />
        @if (isStoreManager()) {
        <small class="text-gray-400 text-xs mt-1">
          Asignada automáticamente según tu sucursal
        </small>
        }
      </div>
      @if (!isStoreManager()) {
      <div class="flex items-center gap-2">
        <p-toggleswitch formControlName="approved" inputId="approved" />
        <label for="approved">Aprobado</label>
      </div>
      }
    </div>
    <div class="flex justify-end gap-4 mt-4">
      <p-button
        label="Cancelar"
        severity="secondary"
        rounded
        (onClick)="dialogRef.close()"
      />
      <p-button
        label="Guardar cambios"
        type="submit"
        rounded
        [loading]="loading()"
      />
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeSchedulesFormComponent implements OnInit {
  public form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    employee_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    branch_id: new FormControl('', {
      nonNullable: true,
    }),
    schedule_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    start_date: new FormControl(new Date(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    end_date: new FormControl(new Date(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    approved: new FormControl(false, { nonNullable: true }),
  });
  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public loading = signal<boolean>(false);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private message = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  public colorVariants = colorVariants;
  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }
  public store = inject(DashboardStore);
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private auditService = inject(ScheduleAuditService);
  private originalSchedule: any = null;
  private singleDayEdit = false;
  private weekStart: Date | null = null;
  private weekEnd: Date | null = null;
  private employeeHasSchedulesInWeek = false;

  // Filtrar solo empleados activos para el selector
  public activeEmployeesList = computed(() =>
    this.store.employees.employeesList().filter((emp) => emp.is_active)
  );

  // Signal para el empleado seleccionado actualmente
  public selectedEmployee = signal<any>(null);

  // ID del turno "Compensatorio" - solo admins pueden seleccionarlo
  private readonly COMPENSATORY_SCHEDULE_ID =
    'f2d92995-96a0-414f-b64a-9823db776745';

  // Turnos permitidos para gerentes de tienda (schedule_admin pero no admin)
  private readonly ALLOWED_STORE_MANAGER_SHIFTS = [
    'CM',
    'Incapacidad',
    '7:00 AM - 4:00 PM',
    '8:00 AM - 5:00 PM', // Solo domingos - mostrar confirmación si no es domingo
    'Lactancia 1',
    'Lactancia 2',
    '10:30 AM - 7:00 PM', // Solo domingos - mostrar confirmación si no es domingo
    'Dia Libre',
    '11:30 AM - 8:00 PM',
    '12:30 PM - 9:00 PM',
    'A. Injus',
    'Licencia maternidad',
    'Permiso',
    'Vacaciones',
    'Inventario 2',
    'Entrenamiento',
  ];

  // IDs de horarios que solo deben usarse en domingos para gerentes
  private readonly SUNDAY_ONLY_SCHEDULES = [
    'af7ede83-ffc9-4b98-b481-665ee9dea624', // 10:30 AM - 7:00 PM
    '5d908594-89a1-4a9a-8ab7-e8b7df3e031f', // 8:00 AM - 5:00 PM
    '3d312b26-346d-4f83-9584-91296f3cbc1f', // Otro horario solo domingos
  ];

  // IDs de horarios ocultos para gerentes de tienda
  private readonly HIDDEN_FOR_STORE_MANAGERS = [
    'cac0d93b-5277-4d42-978d-d4c5eda52f80',
  ];

  // IDs de horarios ocultos para TODOS los usuarios
  private readonly HIDDEN_FOR_ALL = [
    '1f4161d1-4935-4fab-9a53-b6eee2a3efd6',
  ];

  // IDs de posiciones que no deben tener el mismo horario en la misma tienda
  // Uno debe estar en apertura y el otro en cierre (Gerente de Tienda y Sub Gerente)
  private readonly POSITION_PAIR_VALIDATION = [
    '0b660014-936f-498b-80ea-c13bbf43f59c', // Gerente de Tienda (BlackDog)
    '4e58edc4-2943-4a71-920c-a2f0f4d31bcc', // Sub Gerente (BlackDog)
  ];

  // Turnos exclusivos para mujeres (lactancia y maternidad)
  private readonly FEMALE_ONLY_SCHEDULES = [
    'lactancia',
    'maternidad',
  ];

  /**
   * Determina si el usuario actual es gerente de tienda
   * (schedule_admin pero NO admin)
   */
  public isStoreManager = computed(() => {
    return this.store.isScheduleAdmin() && !this.store.isAdmin();
  });

  /**
   * Verifica si un turno es exclusivo para mujeres
   */
  private isFemaleOnlySchedule(scheduleName: string): boolean {
    const nameLower = scheduleName.toLowerCase();
    return this.FEMALE_ONLY_SCHEDULES.some(keyword => nameLower.includes(keyword));
  }

  // Filtrar turnos disponibles según permisos y género del empleado
  public availableSchedules = computed(() => {
    const allSchedulesRaw = this.store.schedules.entities() ?? [];

    // Primero filtrar horarios ocultos para TODOS
    const allSchedules = allSchedulesRaw.filter(
      (schedule: any) => !this.HIDDEN_FOR_ALL.includes(schedule?.id)
    );

    const employee = this.selectedEmployee();
    const isFemale = employee?.gender === 'F';
    const currentEmployee = this.store.currentEmployee();
    const positionName = currentEmployee?.position?.name;

    // Debug logs
    console.log('[availableSchedules] currentEmployee:', currentEmployee?.first_name, currentEmployee?.father_name);
    console.log('[availableSchedules] position:', positionName);
    console.log('[availableSchedules] isAdmin:', this.store.isAdmin());
    console.log('[availableSchedules] isScheduleAdmin:', this.store.isScheduleAdmin());
    console.log('[availableSchedules] position.schedule_admin:', currentEmployee?.position?.schedule_admin);
    console.log('[availableSchedules] position.admin:', currentEmployee?.position?.admin);

    // Función para filtrar turnos exclusivos de mujeres
    const filterByGender = (schedules: any[]) => {
      if (isFemale) {
        // Si es mujer, mostrar todos los turnos
        return schedules;
      }
      // Si es hombre o no hay empleado seleccionado, ocultar turnos de lactancia/maternidad
      return schedules.filter((schedule: any) => {
        const scheduleName = String(schedule?.name ?? '');
        return !this.isFemaleOnlySchedule(scheduleName);
      });
    };

    // Administradores ven todos los turnos (filtrados por género)
    if (this.store.isAdmin()) {
      console.log('[availableSchedules] User is ADMIN - showing all schedules');
      return filterByGender(allSchedules);
    }

    // Gerentes de tienda (schedule_admin pero no admin) solo ven turnos específicos
    const isStoreManager =
      this.store.isScheduleAdmin() && !this.store.isAdmin();
    console.log('[availableSchedules] isStoreManager:', isStoreManager);

    if (isStoreManager) {
      console.log('[availableSchedules] User is STORE MANAGER - filtering schedules');
      const filteredByRole = allSchedules.filter((schedule: any) => {
        // Primero verificar si está en la lista de ocultos por ID
        if (this.HIDDEN_FOR_STORE_MANAGERS.includes(schedule?.id)) {
          console.log('[availableSchedules] Filtering out by ID:', schedule?.name);
          return false;
        }

        const scheduleName = String(schedule?.name ?? '').toUpperCase();
        const isAllowed = this.ALLOWED_STORE_MANAGER_SHIFTS.some(
          (allowed) => scheduleName === allowed.toUpperCase()
        );
        if (!isAllowed) {
          console.log('[availableSchedules] Filtering out by name:', scheduleName);
        }
        return isAllowed;
      });
      console.log('[availableSchedules] Filtered schedules count:', filteredByRole.length);
      return filterByGender(filteredByRole);
    }

    // Otros usuarios: ocultar Compensatorio y filtrar por género
    console.log('[availableSchedules] User is OTHER - hiding Compensatorio only');
    const filteredByRole = allSchedules.filter((schedule: any) => {
      const scheduleName = String(schedule?.name ?? '').toLowerCase();
      return (
        schedule?.id !== this.COMPENSATORY_SCHEDULE_ID &&
        !scheduleName.includes('compensatorio')
      );
    });
    return filterByGender(filteredByRole);
  });

  ngOnInit(): void {
    const {
      employee_schedule,
      employee_id,
      date,
      branch,
      weekStart,
      weekEnd,
      employeeHasSchedulesInWeek,
    } = this.dialog.data;
    console.log(
      '[EmployeeSchedulesFormComponent] ngOnInit data:',
      this.dialog.data
    );

    this.logger.debug(
      '[EmployeeSchedulesFormComponent] OnInit data received:',
      this.dialog.data
    );

    // Escuchar cambios en employee_id para actualizar selectedEmployee
    this.form.get('employee_id')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((empId) => {
        if (empId) {
          const employee = this.store.employees.entities().find((e) => e.id === empId);
          this.selectedEmployee.set(employee || null);
        } else {
          this.selectedEmployee.set(null);
        }
      });

    // Guardar información de la semana
    this.weekStart = weekStart || null;
    this.weekEnd = weekEnd || null;
    this.employeeHasSchedulesInWeek = employeeHasSchedulesInWeek || false;
    if (!this.store.isScheduleApprover()) {
      this.form.get('approved')?.disable();
    }

    // Para gerentes de tienda: deshabilitar selector de sucursal y auto-asignar su sucursal
    const isManager = this.store.isScheduleAdmin() && !this.store.isAdmin();
    if (isManager) {
      const managerBranchId = this.store.currentBranch()?.id;
      if (managerBranchId) {
        this.form.get('branch_id')?.patchValue(managerBranchId);
      }
      this.form.get('branch_id')?.disable();
    } else {
      // Establecer la sucursal por defecto: primero la que viene explícitamente,
      // luego la del empleado si existe employee_id, y finalmente ninguna
      if (branch) {
        this.form.get('branch_id')?.patchValue(branch);
      } else if (employee_id) {
        // Buscar el empleado y usar su sucursal como valor por defecto
        const employee = this.store.employees
          .entities()
          .find((emp) => emp.id === employee_id);
        if (employee?.branch_id) {
          this.form.get('branch_id')?.patchValue(employee.branch_id);
        }
      }
    }

    if (date) {
      const dateObj = toDate(date, { timeZone: 'America/Panama' });
      this.form.get('start_date')?.patchValue(dateObj);
      this.form.get('end_date')?.patchValue(dateObj);
    }
    if (employee_id) {
      // Asegurar que el empleado esté cargado antes de establecer el valor
      const employee = this.store.employees
        .entities()
        .find((emp) => emp.id === employee_id);

      if (!employee) {
        // Si el empleado no está en la lista, cargarlo
        this.store.employees.ensureEmployeeLoaded(employee_id);
        // Establecer el valor de todas formas, el componente se actualizará cuando se cargue
        this.form.patchValue({ employee_id });
      } else {
        this.form.patchValue({ employee_id });
        // Actualizar selectedEmployee para filtrar turnos por género
        this.selectedEmployee.set(employee);
      }

      this.form.get('employee_id')?.disable();

      // Si no hay horarios en la semana y se está creando uno nuevo,
      // establecer el rango para toda la semana SOLO si no se pasó una fecha específica
      // y si el usuario no ha establecido fechas manualmente
      if (
        !this.employeeHasSchedulesInWeek &&
        this.weekStart &&
        this.weekEnd &&
        !date
      ) {
        // Solo establecer el rango automáticamente si las fechas no han sido modificadas
        const currentStartDate = this.form.get('start_date')?.value;
        const currentEndDate = this.form.get('end_date')?.value;

        // Si las fechas están en su valor por defecto (hoy), establecer la semana completa
        if (
          !currentStartDate ||
          !currentEndDate ||
          (isSameDay(currentStartDate, new Date()) &&
            isSameDay(currentEndDate, new Date()))
        ) {
          const startDateObj = toDate(this.weekStart, {
            timeZone: 'America/Panama',
          });
          const endDateObj = toDate(this.weekEnd, {
            timeZone: 'America/Panama',
          });
          this.form.get('start_date')?.patchValue(startDateObj);
          this.form.get('end_date')?.patchValue(endDateObj);
        }
      }
      if (!employee_schedule) return;
    }
    if (employee_schedule) {
      console.log(
        '[EmployeeSchedulesFormComponent] Found employee_schedule, starting patch...'
      );
      const {
        id,
        employee_id: scheduleEmployeeId,
        schedule_id,
        start_date,
        end_date,
        branch_id,
        approved,
      } = employee_schedule;

      // Guardar el turno original para comparación
      this.originalSchedule = employee_schedule;

      // Asegurar que el empleado esté cargado
      if (scheduleEmployeeId) {
        const employee = this.store.employees
          .entities()
          .find((emp) => emp.id === scheduleEmployeeId);
        if (!employee) {
          this.store.employees.ensureEmployeeLoaded(scheduleEmployeeId);
        }
      }

      // Si no hay branch_id en el horario, usar la sucursal del empleado como fallback
      const finalBranchId =
        branch_id ||
        (scheduleEmployeeId
          ? this.store.employees
            .entities()
            .find((emp) => emp.id === scheduleEmployeeId)?.branch_id
          : null);

      const startDateObj = toDate(start_date, { timeZone: 'America/Panama' });
      const endDateObj = toDate(end_date, { timeZone: 'America/Panama' });

      // Detectar si se está editando un solo día dentro de un rango existente
      if (date) {
        const dateObj = toDate(date, { timeZone: 'America/Panama' });
        const isSingleDay = isSameDay(startDateObj, endDateObj);
        const dateIsInRange = dateObj >= startDateObj && dateObj <= endDateObj;

        // Si el turno original es de un solo día y se está editando ese mismo día,
        // simplemente actualizar (no dividir)
        if (isSingleDay && isSameDay(startDateObj, dateObj)) {
          // Comportamiento normal: cargar y actualizar el turno existente
          this.form.patchValue({
            id,
            employee_id: scheduleEmployeeId,
            schedule_id,
            branch_id: finalBranchId,
            approved,
          });
          this.form.get('start_date')?.patchValue(startDateObj);
          this.form.get('end_date')?.patchValue(endDateObj);
        }
        // Si el turno original cubre múltiples días y se seleccionó un día específico
        else if (!isSingleDay && dateIsInRange) {
          this.singleDayEdit = true;
          // Establecer solo el día seleccionado
          this.form.get('start_date')?.patchValue(dateObj);
          this.form.get('end_date')?.patchValue(dateObj);
          // Establecer la sucursal del turno original (o del empleado si no tiene)
          this.form.get('branch_id')?.patchValue(finalBranchId);
          // Generar nuevo ID para el nuevo turno
          this.form.get('id')?.patchValue(v4());
          // IMPORTANTE: Establecer employee_id y schedule_id del original
          this.form.patchValue({
            employee_id: scheduleEmployeeId,
            schedule_id,
            approved,
          });
        } else {
          // Comportamiento normal: cargar todo el rango
          this.form.patchValue({
            id,
            employee_id: scheduleEmployeeId,
            schedule_id,
            branch_id: finalBranchId,
            approved,
          });
          this.form.get('start_date')?.patchValue(startDateObj);
          this.form.get('end_date')?.patchValue(endDateObj);
        }
      } else {
        // Comportamiento normal: cargar todo el rango
        this.form.patchValue({
          id,
          employee_id: scheduleEmployeeId,
          schedule_id,
          branch_id: finalBranchId,
          approved,
        });
        this.form.get('start_date')?.patchValue(startDateObj);
        this.form.get('end_date')?.patchValue(endDateObj);
        this.logger.debug(
          '[EmployeeSchedulesFormComponent] patchValue done (normal edit)'
        );
      }
    }
  }

  saveChanges(): void {
    this.loading.set(true);

    // Verificar permisos antes de guardar
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para guardar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden guardar horarios.',
      });
      this.loading.set(false);
      return;
    }

    const value = this.form.getRawValue();
    if (this.form.invalid) {
      this.message.add({
        severity: 'error',
        summary: 'Formulario incompleto',
        detail: 'Por favor, completa los campos requeridos.',
      });
      this.loading.set(false);
      return;
    }

    // Validar que solo schedule_approver pueda aprobar
    if (value.approved && !this.store.isScheduleApprover()) {
      this.message.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para aprobar horarios. Solo los aprobadores de horarios pueden aprobar.',
      });
      this.loading.set(false);
      return;
    }

    // Validar que solo admins puedan asignar turno "Compensatorio"
    if (
      value.schedule_id === this.COMPENSATORY_SCHEDULE_ID &&
      !this.store.isAdmin()
    ) {
      this.message.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail:
          'Solo los administradores pueden asignar el turno "Compensatorio".',
      });
      this.loading.set(false);
      return;
    }

    // Validar que la fecha de inicio sea menor o igual a la fecha de fin
    if (value.start_date && value.end_date) {
      const startDate = new Date(value.start_date);
      const endDate = new Date(value.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (startDate > endDate) {
        this.message.add({
          severity: 'error',
          summary: 'Rango de fechas inválido',
          detail:
            'La fecha de inicio debe ser anterior o igual a la fecha de fin.',
        });
        this.loading.set(false);
        return;
      }
    }

    // Validar horarios que solo deben usarse en domingos (8:00 AM - 5:00 PM y 10:30 AM - 7:00 PM)
    if (this.SUNDAY_ONLY_SCHEDULES.includes(value.schedule_id) && value.start_date) {
      const startDate = new Date(value.start_date);
      const endDate = value.end_date ? new Date(value.end_date) : startDate;

      // Verificar si hay algún día que no sea domingo en el rango
      let hasNonSunday = false;
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if (getDay(currentDate) !== 0) { // 0 = Domingo
          hasNonSunday = true;
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (hasNonSunday) {
        this.loading.set(false);
        // Obtener el nombre del horario seleccionado
        const selectedSchedule = this.availableSchedules().find(
          (s: any) => s.id === value.schedule_id
        );
        const scheduleName = selectedSchedule?.name || 'Este horario';

        this.confirmationService.confirm({
          message: `El horario "${scheduleName}" es normalmente para domingos. Los gerentes solo deben estar en apertura o cierre. ¿Está seguro de asignar este horario?`,
          header: 'Confirmar asignación',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, continuar',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.loading.set(true);
            this.proceedWithSave(value);
          },
          reject: () => {
            // No hacer nada, el usuario canceló
          }
        });
        return;
      }
    }

    // Validar que posiciones específicas no tengan el mismo horario en la misma tienda
    this.validatePositionPairSchedule(value).then((hasConflict) => {
      if (hasConflict) {
        // Si hay conflicto, la función ya mostró la confirmación
        return;
      }
      this.proceedWithSave(value);
    });
  }

  /**
   * Valida que las posiciones específicas no tengan el mismo horario en la misma tienda.
   * Retorna true si hay conflicto y se mostró confirmación, false si no hay conflicto.
   */
  private async validatePositionPairSchedule(value: any): Promise<boolean> {
    const employee = this.selectedEmployee();

    console.log('[validatePositionPairSchedule] employee:', employee?.first_name, employee?.father_name);
    console.log('[validatePositionPairSchedule] employee.position_id:', employee?.position_id);
    console.log('[validatePositionPairSchedule] POSITION_PAIR_VALIDATION:', this.POSITION_PAIR_VALIDATION);

    if (!employee?.position_id) {
      console.log('[validatePositionPairSchedule] No position_id - skipping');
      return false;
    }

    // Verificar si el empleado seleccionado tiene una de las posiciones a validar
    if (!this.POSITION_PAIR_VALIDATION.includes(employee.position_id)) {
      console.log('[validatePositionPairSchedule] Position not in validation list - skipping');
      return false;
    }

    console.log('[validatePositionPairSchedule] Position IS in validation list!');

    // Obtener la otra posición del par
    const otherPositionId = this.POSITION_PAIR_VALIDATION.find(
      (id) => id !== employee.position_id
    );
    console.log('[validatePositionPairSchedule] otherPositionId:', otherPositionId);
    if (!otherPositionId) return false;

    const branchId = value.branch_id;
    const scheduleId = value.schedule_id;
    const startDate = value.start_date ? formatDate(new Date(value.start_date), 'yyyy-MM-dd') : null;
    const endDate = value.end_date ? formatDate(new Date(value.end_date), 'yyyy-MM-dd') : null;

    console.log('[validatePositionPairSchedule] branchId:', branchId);
    console.log('[validatePositionPairSchedule] scheduleId:', scheduleId);
    console.log('[validatePositionPairSchedule] startDate:', startDate);
    console.log('[validatePositionPairSchedule] endDate:', endDate);

    if (!branchId || !scheduleId || !startDate || !endDate) {
      console.log('[validatePositionPairSchedule] Missing required fields - skipping');
      return false;
    }

    try {
      // Buscar empleados con la otra posición (sin filtrar por branch_id del empleado)
      const allEmployees = this.store.employees.entities();
      console.log('[validatePositionPairSchedule] Total employees in store:', allEmployees.length);

      const employeesWithOtherPosition = allEmployees.filter(
        (emp) =>
          emp.position_id === otherPositionId &&
          emp.is_active &&
          emp.id !== employee.id
      );

      console.log('[validatePositionPairSchedule] Employees with other position:', employeesWithOtherPosition.map(e => `${e.first_name} ${e.father_name} (branch: ${e.branch_id})`));

      if (employeesWithOtherPosition.length === 0) {
        console.log('[validatePositionPairSchedule] No employees with other position found');
        return false;
      }

      const employeeIds = employeesWithOtherPosition.map((e) => e.id);
      console.log('[validatePositionPairSchedule] Employee IDs to check:', employeeIds);

      // Buscar horarios de esos empleados con el mismo turno en el rango de fechas
      const url = this.apiUrl.build('rest/v1/employee_schedules', {
        select: 'id,employee_id,schedule_id,start_date,end_date,branch_id',
        employee_id: `in.(${employeeIds.join(',')})`,
        schedule_id: `eq.${scheduleId}`,
        branch_id: `eq.${branchId}`,
        start_date: `lte.${endDate}`,
        end_date: `gte.${startDate}`,
      });

      console.log('[validatePositionPairSchedule] API URL:', url);

      const conflictingSchedules = await firstValueFrom(
        this.http.get<any[]>(url)
      ).catch((error) => {
        console.error('[validatePositionPairSchedule] HTTP Error:', error);
        return [];
      });

      console.log('[validatePositionPairSchedule] Conflicting schedules found:', conflictingSchedules);

      if (conflictingSchedules.length > 0) {
        console.log('[validatePositionPairSchedule] CONFLICT DETECTED!');
        // Hay conflicto - mostrar advertencia
        const conflictingEmployee = employeesWithOtherPosition.find(
          (e) => e.id === conflictingSchedules[0].employee_id
        );
        const selectedSchedule = this.availableSchedules().find(
          (s: any) => s.id === scheduleId
        );
        const scheduleName = selectedSchedule?.name || 'Este horario';
        const conflictName = conflictingEmployee
          ? `${conflictingEmployee.first_name} ${conflictingEmployee.father_name}`
          : 'otro empleado';

        this.loading.set(false);

        return new Promise<boolean>((resolve) => {
          this.confirmationService.confirm({
            message: `El horario "${scheduleName}" ya está asignado a ${conflictName} en esta tienda para las mismas fechas. Los empleados con estas posiciones deberían tener horarios diferentes (uno en apertura y otro en cierre). ¿Está seguro de continuar?`,
            header: 'Advertencia: Mismo horario',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, continuar',
            rejectLabel: 'Cancelar',
            accept: () => {
              this.loading.set(true);
              this.proceedWithSave(value);
              resolve(true); // Indica que se manejó el conflicto
            },
            reject: () => {
              resolve(true); // Indica que se manejó (canceló)
            },
          });
        });
      }

      return false;
    } catch (error) {
      console.error('[validatePositionPairSchedule] Error:', error);
      return false;
    }
  }

  private proceedWithSave(value: any): void {
    const companyId = this.organizationService.getCurrentCompanyId();

    // Verificar si el usuario estableció fechas específicas diferentes a la semana completa
    const userStartDate = value.start_date ? new Date(value.start_date) : null;
    const userEndDate = value.end_date ? new Date(value.end_date) : null;

    if (userStartDate && userEndDate) {
      userStartDate.setHours(0, 0, 0, 0);
      userEndDate.setHours(0, 0, 0, 0);
    }

    const weekStartDate = this.weekStart ? new Date(this.weekStart) : null;
    const weekEndDate = this.weekEnd ? new Date(this.weekEnd) : null;

    if (weekStartDate && weekEndDate) {
      weekStartDate.setHours(0, 0, 0, 0);
      weekEndDate.setHours(0, 0, 0, 0);
    }

    // Verificar si las fechas del usuario son diferentes a la semana completa
    const datesMatchWeek =
      userStartDate &&
      userEndDate &&
      weekStartDate &&
      weekEndDate &&
      userStartDate.getTime() === weekStartDate.getTime() &&
      userEndDate.getTime() === weekEndDate.getTime();

    // Solo crear horarios para toda la semana si:
    // 1. No hay horarios previos en la semana
    // 2. No se está editando un horario existente
    // 3. Las fechas del usuario coinciden con la semana completa (no las modificó)
    if (
      !this.employeeHasSchedulesInWeek &&
      !this.dialog.data.employee_schedule &&
      this.weekStart &&
      this.weekEnd &&
      datesMatchWeek
    ) {
      this.createWeekSchedules(value, companyId);
      return;
    }

    // Detectar si se está editando un solo día dentro de un rango existente
    // Esto puede ocurrir si:
    // 1. Hay un turno original guardado
    // 2. El turno original cubre múltiples días
    // 3. El nuevo rango es un solo día
    // 4. El nuevo día está dentro del rango original
    const shouldSplit = this.shouldSplitSchedule(value);

    // Si debemos dividir el turno, hacerlo
    if (shouldSplit && this.originalSchedule) {
      this.splitScheduleAndSave(value, companyId);
      return;
    }

    // Comportamiento normal: crear o actualizar
    // IMPORTANTE: Formatear fechas a strings antes de enviar
    const requestData: any = {
      ...value,
      start_date: value.start_date
        ? format(new Date(value.start_date), 'yyyy-MM-dd')
        : null,
      end_date: value.end_date
        ? format(new Date(value.end_date), 'yyyy-MM-dd')
        : null,
    };
    if (companyId && !requestData.company_id) {
      requestData.company_id = companyId;
    }

    const createRequest = this.http.post(
      this.apiUrl.build('rest/v1/employee_schedules'),
      requestData
    );

    // Construir updateData sin el id (el id va en los params, no en el body)
    const formRawValue = this.form.getRawValue();
    const { id, ...formDataWithoutId } = formRawValue;

    const updateData: any = {
      ...formDataWithoutId,
      start_date: value.start_date
        ? format(new Date(value.start_date), 'yyyy-MM-dd')
        : null,
      end_date: value.end_date
        ? format(new Date(value.end_date), 'yyyy-MM-dd')
        : null,
    };
    if (companyId && !updateData.company_id) {
      updateData.company_id = companyId;
    }

    // Asegurar que schedule_id esté incluido si existe en el formulario
    if (value.schedule_id && !updateData.schedule_id) {
      updateData.schedule_id = value.schedule_id;
    }

    const updateRequest = this.http.patch(
      this.apiUrl.build('rest/v1/employee_schedules', { id: `eq.${value.id}` }),
      updateData,
      {}
    );

    // CORRECCIÓN: Determinar si debemos hacer UPDATE o CREATE
    // Regla principal: Si hay un employee_schedule en los datos del diálogo, significa que estamos editando
    // un horario existente. En ese caso, hacer UPDATE a menos que singleDayEdit sea true
    // (que significa que se está dividiendo un rango multi-día y se generó un nuevo ID)
    const hasEmployeeSchedule = !!this.dialog.data.employee_schedule;
    const hasOriginalSchedule = !!this.originalSchedule;

    // Hacer UPDATE si hay employee_schedule Y:
    // 1. El ID del formulario coincide con el ID original (edición normal de un horario existente)
    // 2. O no es singleDayEdit (para asegurar que se actualice en lugar de crear)
    const idMatches =
      hasOriginalSchedule && value.id === this.originalSchedule.id;
    const shouldUpdate =
      hasEmployeeSchedule && (idMatches || !this.singleDayEdit);

    // Log para depuración
    if (hasEmployeeSchedule) {
      this.logger.debug(
        '[EmployeeSchedulesFormComponent] Editando horario existente:',
        {
          formId: value.id,
          originalId: this.originalSchedule?.id,
          idMatches,
          singleDayEdit: this.singleDayEdit,
          shouldUpdate: shouldUpdate,
          updateData: updateData,
          originalScheduleId: this.originalSchedule?.schedule_id,
          newScheduleId: value.schedule_id,
        }
      );
    }

    iif(() => shouldUpdate, updateRequest, createRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.logger.debug(
            '[EmployeeSchedulesFormComponent] Respuesta del servidor:',
            response
          );

          // Registrar auditoría
          const currentEmployeeId = this.store.currentEmployee()?.id;
          if (!currentEmployeeId) {
            console.warn(
              '⚠️ No se pudo obtener el ID del empleado actual para auditoría'
            );
            return;
          }

          const scheduleId = Array.isArray(response)
            ? (response[0] as any)?.id
            : (response as any)?.id || value.id;

          if (!scheduleId) {
            console.error(
              '❌ No se pudo obtener el ID del horario para auditoría:',
              {
                response,
                valueId: value.id,
                shouldUpdate,
              }
            );
            return;
          }

          console.log('📝 Registrando auditoría:', {
            action: shouldUpdate ? 'updated' : 'created',
            scheduleId,
            employeeId: value.employee_id,
            currentEmployeeId,
          });

          try {
            if (shouldUpdate) {
              // Actualización
              const oldSchedule = this.store.schedules
                .entities()
                .find((s) => s.id === this.originalSchedule?.schedule_id);
              const newSchedule = this.store.schedules
                .entities()
                .find((s) => s.id === value.schedule_id);
              const employee = this.store.employees
                .entities()
                .find((e) => e.id === value.employee_id);
              const oldBranch = this.store.branches
                .entities()
                .find((b) => b.id === this.originalSchedule?.branch_id);
              const newBranch = this.store.branches
                .entities()
                .find((b) => b.id === value.branch_id);

              const oldStartFormatted = this.originalSchedule?.start_date
                ? format(
                  toDate(this.originalSchedule.start_date, {
                    timeZone: 'America/Panama',
                  }),
                  'dd/MM/yyyy'
                )
                : '';
              const oldEndFormatted = this.originalSchedule?.end_date
                ? format(
                  toDate(this.originalSchedule.end_date, {
                    timeZone: 'America/Panama',
                  }),
                  'dd/MM/yyyy'
                )
                : '';
              const newStartFormatted = value.start_date
                ? format(new Date(value.start_date), 'dd/MM/yyyy')
                : '';
              const newEndFormatted = value.end_date
                ? format(new Date(value.end_date), 'dd/MM/yyyy')
                : '';

              await this.auditService.logChange({
                employeeScheduleId: scheduleId,
                changedBy: currentEmployeeId,
                action: 'updated',
                oldStatus: this.originalSchedule?.approved,
                newStatus: value.approved,
                oldValue: this.originalSchedule
                  ? {
                    employee_id: this.originalSchedule.employee_id,
                    employee_name: employee
                      ? `${employee.first_name} ${employee.father_name}`
                      : 'Desconocido',
                    schedule_id: this.originalSchedule.schedule_id,
                    schedule_name: oldSchedule?.name || 'Desconocido',
                    branch_id: this.originalSchedule.branch_id,
                    branch_name: oldBranch?.name || 'Desconocido',
                    start_date: this.originalSchedule.start_date,
                    end_date: this.originalSchedule.end_date,
                    start_date_formatted: oldStartFormatted,
                    end_date_formatted: oldEndFormatted,
                    approved: this.originalSchedule.approved,
                  }
                  : null,
                newValue: {
                  employee_id: value.employee_id,
                  employee_name: employee
                    ? `${employee.first_name} ${employee.father_name}`
                    : 'Desconocido',
                  schedule_id: value.schedule_id,
                  schedule_name: newSchedule?.name || 'Desconocido',
                  branch_id: value.branch_id,
                  branch_name: newBranch?.name || 'Desconocido',
                  start_date: value.start_date,
                  end_date: value.end_date,
                  start_date_formatted: newStartFormatted,
                  end_date_formatted: newEndFormatted,
                  approved: value.approved,
                },
                comment: this.singleDayEdit
                  ? `Horario "${oldSchedule?.name || 'Desconocido'
                  }" dividido (día específico modificado) para ${employee
                    ? `${employee.first_name} ${employee.father_name}`
                    : 'empleado'
                  }`
                  : `Horario "${oldSchedule?.name || 'Desconocido'
                  }" actualizado para ${employee
                    ? `${employee.first_name} ${employee.father_name}`
                    : 'empleado'
                  }: ${oldStartFormatted} - ${oldEndFormatted} → ${newStartFormatted} - ${newEndFormatted}${oldSchedule?.name !== newSchedule?.name
                    ? ` (turno cambiado a "${newSchedule?.name || 'Desconocido'
                    }")`
                    : ''
                  }${oldBranch?.name !== newBranch?.name
                    ? ` (sucursal cambiada de ${oldBranch?.name || 'Desconocido'
                    } a ${newBranch?.name || 'Desconocido'})`
                    : ''
                  }`,
              });
            } else {
              // Creación
              const schedule = this.store.schedules
                .entities()
                .find((s) => s.id === value.schedule_id);
              const employee = this.store.employees
                .entities()
                .find((e) => e.id === value.employee_id);
              const branch = this.store.branches
                .entities()
                .find((b) => b.id === value.branch_id);

              const startDate = value.start_date
                ? format(new Date(value.start_date), 'dd/MM/yyyy')
                : '';
              const endDate = value.end_date
                ? format(new Date(value.end_date), 'dd/MM/yyyy')
                : '';
              const isSingleDay = startDate === endDate;

              await this.auditService.logChange({
                employeeScheduleId: scheduleId,
                changedBy: currentEmployeeId,
                action: 'created',
                oldStatus: false,
                newStatus: value.approved,
                newValue: {
                  employee_id: value.employee_id,
                  employee_name: employee
                    ? `${employee.first_name} ${employee.father_name}`
                    : 'Desconocido',
                  schedule_id: value.schedule_id,
                  schedule_name: schedule?.name || 'Desconocido',
                  branch_id: value.branch_id,
                  branch_name: branch?.name || 'Desconocido',
                  start_date: value.start_date,
                  end_date: value.end_date,
                  start_date_formatted: startDate,
                  end_date_formatted: endDate,
                  is_single_day: isSingleDay,
                  approved: value.approved,
                },
                comment: isSingleDay
                  ? `Horario "${schedule?.name || 'Desconocido'}" creado para ${employee
                    ? `${employee.first_name} ${employee.father_name}`
                    : 'empleado'
                  } el día ${startDate}${branch ? ` en sucursal ${branch.name}` : ''
                  }`
                  : `Horario "${schedule?.name || 'Desconocido'}" creado para ${employee
                    ? `${employee.first_name} ${employee.father_name}`
                    : 'empleado'
                  } del ${startDate} al ${endDate}${branch ? ` en sucursal ${branch.name}` : ''
                  }`,
              });
            }
          } catch (auditError) {
            console.error('❌ Error al registrar auditoría:', auditError);
            // No interrumpir el flujo principal si falla la auditoría
            this.logger.error(
              '[EmployeeSchedulesFormComponent] Error al registrar auditoría:',
              auditError
            );
          }

          this.message.add({
            severity: 'success',
            summary: 'Cambios guardados',
            detail: 'Los cambios se guardaron correctamente.',
          });
          this.dialogRef.close();
        },
        error: (error) => {
          this.logger.error(
            '[EmployeeSchedulesFormComponent] Error al guardar horarios:',
            {
              error,
              errorMessage: error?.message,
              errorStatus: error?.status,
              errorBody: error?.error,
              updateData,
              shouldUpdate,
            }
          );
          this.loading.set(false);
          this.message.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail:
              error?.error?.message ||
              error?.message ||
              'Ocurrió un error al guardar los cambios.',
          });
        },
      });
  }

  private createWeekSchedules(
    scheduleData: any,
    companyId: string | null
  ): void {
    // Verificar permisos antes de crear horarios
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para crear horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden crear horarios.',
      });
      this.loading.set(false);
      return;
    }

    if (!this.weekStart || !this.weekEnd) return;

    // Crear un horario para cada día de la semana
    const weekDays = eachDayOfInterval({
      start: this.weekStart,
      end: this.weekEnd,
    });

    const requests = weekDays.map((day) => {
      const daySchedule: any = {
        id: v4(),
        employee_id: scheduleData.employee_id,
        schedule_id: scheduleData.schedule_id,
        branch_id: scheduleData.branch_id,
        start_date: format(day, 'yyyy-MM-dd'),
        end_date: format(day, 'yyyy-MM-dd'),
        approved: scheduleData.approved,
      };
      if (companyId) {
        daySchedule.company_id = companyId;
      }
      return this.http.post(
        this.apiUrl.build('rest/v1/employee_schedules'),
        daySchedule
      );
    });

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (responses) => {
          // Registrar auditoría para cada horario creado
          const currentEmployeeId = this.store.currentEmployee()?.id;
          if (currentEmployeeId) {
            const schedule = this.store.schedules
              .entities()
              .find((s) => s.id === scheduleData.schedule_id);
            const employee = this.store.employees
              .entities()
              .find((e) => e.id === scheduleData.employee_id);
            const branch = this.store.branches
              .entities()
              .find((b) => b.id === scheduleData.branch_id);

            for (let i = 0; i < responses.length; i++) {
              const response = responses[i];
              const scheduleId = Array.isArray(response)
                ? (response[0] as any)?.id
                : (response as any)?.id;
              if (scheduleId) {
                const dayDate = format(weekDays[i], 'dd/MM/yyyy');
                const dayName = format(weekDays[i], 'EEEE', { locale: es }); // Nombre del día

                await this.auditService.logChange({
                  employeeScheduleId: scheduleId,
                  changedBy: currentEmployeeId,
                  action: 'created',
                  oldStatus: false,
                  newStatus: scheduleData.approved,
                  newValue: {
                    employee_id: scheduleData.employee_id,
                    employee_name: employee
                      ? `${employee.first_name} ${employee.father_name}`
                      : 'Desconocido',
                    schedule_id: scheduleData.schedule_id,
                    schedule_name: schedule?.name || 'Desconocido',
                    branch_id: scheduleData.branch_id,
                    branch_name: branch?.name || 'Desconocido',
                    start_date: format(weekDays[i], 'yyyy-MM-dd'),
                    end_date: format(weekDays[i], 'yyyy-MM-dd'),
                    start_date_formatted: dayDate,
                    end_date_formatted: dayDate,
                    day_name: dayName,
                    is_single_day: true,
                    approved: scheduleData.approved,
                  },
                  comment: `Horario "${schedule?.name || 'Desconocido'
                    }" creado para ${employee
                      ? `${employee.first_name} ${employee.father_name}`
                      : 'empleado'
                    } el ${dayName} ${dayDate}${branch ? ` en sucursal ${branch.name}` : ''
                    } (semana completa)`,
                });
              }
            }
          }

          this.message.add({
            severity: 'success',
            summary: 'Horarios creados',
            detail: `Se crearon horarios para toda la semana (${weekDays.length} días).`,
          });
          this.dialogRef.close();
        },
        error: (error) => {
          this.logger.error(
            '[EmployeeSchedulesFormComponent] Error al guardar horarios:',
            error
          );
          this.loading.set(false);
          this.message.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: 'Ocurrió un error al crear los horarios de la semana.',
          });
        },
      });
  }

  private shouldSplitSchedule(newScheduleData: any): boolean {
    // Si ya se detectó en ngOnInit, usar esa detección
    if (this.singleDayEdit) {
      return true;
    }

    // Si no hay turno original, no dividir
    if (!this.originalSchedule) {
      return false;
    }

    const originalStart = toDate(this.originalSchedule.start_date, {
      timeZone: 'America/Panama',
    });
    const originalEnd = toDate(this.originalSchedule.end_date, {
      timeZone: 'America/Panama',
    });
    const newStart = newScheduleData.start_date;
    const newEnd = newScheduleData.end_date;

    // Verificar si el turno original cubre múltiples días
    const originalIsMultiDay = !isSameDay(originalStart, originalEnd);

    // Verificar si el nuevo rango es un solo día
    const newIsSingleDay = isSameDay(newStart, newEnd);

    // Verificar si el nuevo día está dentro del rango original
    const newDayInRange = newStart >= originalStart && newStart <= originalEnd;

    // NO dividir si el turno original es de un solo día (simplemente actualizar)
    // Solo dividir si: el original es multi-día, el nuevo es un solo día, y está dentro del rango
    return originalIsMultiDay && newIsSingleDay && newDayInRange;
  }

  private splitScheduleAndSave(
    newScheduleData: any,
    companyId: string | null
  ): void {
    // Verificar permisos antes de dividir y guardar
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail:
          'No tienes permisos para modificar horarios. Solo los administradores, gerentes de tienda, aprobadores de horarios y personal de administración pueden modificar horarios.',
      });
      this.loading.set(false);
      return;
    }

    if (!this.originalSchedule) return;

    const originalStart = toDate(this.originalSchedule.start_date, {
      timeZone: 'America/Panama',
    });
    const originalEnd = toDate(this.originalSchedule.end_date, {
      timeZone: 'America/Panama',
    });
    const newStart = newScheduleData.start_date;
    const newEnd = newScheduleData.end_date;

    const requests: any[] = [];

    // Caso 1: El día seleccionado es el primer día del rango
    if (isSameDay(originalStart, newStart)) {
      // Actualizar el turno original para que empiece al día siguiente
      // Mantener todos los demás campos del turno original
      if (addDays(newStart, 1) <= originalEnd) {
        const updateData: any = {
          start_date: format(addDays(newStart, 1), 'yyyy-MM-dd'),
          end_date: format(originalEnd, 'yyyy-MM-dd'),
          // Mantener todos los campos originales
          schedule_id: this.originalSchedule.schedule_id,
          branch_id: this.originalSchedule.branch_id,
          approved: this.originalSchedule.approved,
        };
        if (companyId) updateData.company_id = companyId;

        requests.push(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_schedules', {
              id: `eq.${this.originalSchedule.id}`,
              ...(companyId ? { company_id: `eq.${companyId}` } : {}),
            }),
            updateData,
            {}
          )
        );
      }
    }
    // Caso 2: El día seleccionado es el último día del rango
    else if (isSameDay(originalEnd, newEnd)) {
      // Actualizar el turno original para que termine el día anterior
      // Mantener todos los demás campos del turno original
      if (subDays(newEnd, 1) >= originalStart) {
        const updateData: any = {
          start_date: format(originalStart, 'yyyy-MM-dd'),
          end_date: format(subDays(newEnd, 1), 'yyyy-MM-dd'),
          // Mantener todos los campos originales
          schedule_id: this.originalSchedule.schedule_id,
          branch_id: this.originalSchedule.branch_id,
          approved: this.originalSchedule.approved,
        };
        if (companyId) updateData.company_id = companyId;

        requests.push(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_schedules', {
              id: `eq.${this.originalSchedule.id}`,
              ...(companyId ? { company_id: `eq.${companyId}` } : {}),
            }),
            updateData,
            {}
          )
        );
      }
    }
    // Caso 3: El día seleccionado está en el medio del rango
    else {
      // Dividir en dos turnos: uno antes y uno después del día seleccionado
      // 1. Actualizar el turno original para que termine el día anterior
      // Mantener todos los demás campos del turno original
      const updateData1: any = {
        start_date: format(originalStart, 'yyyy-MM-dd'),
        end_date: format(subDays(newStart, 1), 'yyyy-MM-dd'),
        // Mantener todos los campos originales
        schedule_id: this.originalSchedule.schedule_id,
        branch_id: this.originalSchedule.branch_id,
        approved: this.originalSchedule.approved,
      };
      if (companyId) updateData1.company_id = companyId;

      requests.push(
        this.http.patch(
          this.apiUrl.build('rest/v1/employee_schedules', {
            id: `eq.${this.originalSchedule.id}`,
            ...(companyId ? { company_id: `eq.${companyId}` } : {}),
          }),
          updateData1,
          {}
        )
      );

      // 2. Crear un nuevo turno para el período después del día seleccionado
      // Mantener todos los campos del turno original excepto las fechas
      if (addDays(newEnd, 1) <= originalEnd) {
        const createData2: any = {
          id: v4(),
          employee_id: this.originalSchedule.employee_id,
          schedule_id: this.originalSchedule.schedule_id,
          branch_id: this.originalSchedule.branch_id,
          start_date: format(addDays(newEnd, 1), 'yyyy-MM-dd'),
          end_date: format(originalEnd, 'yyyy-MM-dd'),
          approved: this.originalSchedule.approved,
        };
        if (companyId) createData2.company_id = companyId;

        requests.push(
          this.http.post(
            this.apiUrl.build('rest/v1/employee_schedules'),
            createData2
          )
        );
      }
    }

    // 3. Crear el nuevo turno para el día seleccionado
    // IMPORTANTE: Siempre generar un ID nuevo para evitar conflictos con el turno original
    // Usar branch_id del formulario, o del original si no está disponible
    const finalBranchId =
      newScheduleData.branch_id || this.originalSchedule.branch_id;
    const newScheduleRequest: any = {
      id: v4(), // Generar nuevo ID para el nuevo turno
      employee_id:
        newScheduleData.employee_id || this.originalSchedule.employee_id,
      schedule_id:
        newScheduleData.schedule_id || this.originalSchedule.schedule_id,
      branch_id: finalBranchId,
      start_date: format(newStart, 'yyyy-MM-dd'),
      end_date: format(newEnd, 'yyyy-MM-dd'),
      approved:
        newScheduleData.approved !== undefined
          ? newScheduleData.approved
          : this.originalSchedule.approved,
    };
    if (companyId) {
      newScheduleRequest.company_id = companyId;
    }

    requests.push(
      this.http.post(
        this.apiUrl.build('rest/v1/employee_schedules'),
        newScheduleRequest
      )
    );

    // Ejecutar todas las operaciones en paralelo
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (responses) => {
          // Registrar auditoría para la operación de división
          const currentEmployeeId = this.store.currentEmployee()?.id;
          if (currentEmployeeId) {
            const schedule = this.store.schedules
              .entities()
              .find(
                (s) =>
                  s.id ===
                  (newScheduleData.schedule_id ||
                    this.originalSchedule.schedule_id)
              );
            const employee = this.store.employees
              .entities()
              .find(
                (e) =>
                  e.id ===
                  (newScheduleData.employee_id ||
                    this.originalSchedule.employee_id)
              );
            const branch = this.store.branches
              .entities()
              .find((b) => b.id === finalBranchId);
            const originalBranch = this.store.branches
              .entities()
              .find((b) => b.id === this.originalSchedule.branch_id);

            const newStartFormatted = format(newStart, 'dd/MM/yyyy');
            const newEndFormatted = format(newEnd, 'yyyy-MM-dd');
            const originalStartFormatted = format(
              toDate(this.originalSchedule.start_date, {
                timeZone: 'America/Panama',
              }),
              'dd/MM/yyyy'
            );
            const originalEndFormatted = format(
              toDate(this.originalSchedule.end_date, {
                timeZone: 'America/Panama',
              }),
              'dd/MM/yyyy'
            );
            const isSingleDay = isSameDay(newStart, newEnd);
            const dayName = isSingleDay
              ? format(newStart, 'EEEE', { locale: es })
              : '';

            // Obtener el ID del nuevo horario creado (último response)
            const lastResponse = Array.isArray(responses[responses.length - 1])
              ? responses[responses.length - 1][0]
              : responses[responses.length - 1];
            const newScheduleId = lastResponse?.id;

            // Registrar que se dividió el horario original
            await this.auditService.logChange({
              employeeScheduleId: this.originalSchedule.id,
              changedBy: currentEmployeeId,
              action: 'split',
              oldStatus: this.originalSchedule.approved,
              newStatus: this.originalSchedule.approved, // El estado no cambia
              oldValue: {
                employee_id: this.originalSchedule.employee_id,
                employee_name: employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'Desconocido',
                schedule_id: this.originalSchedule.schedule_id,
                schedule_name: schedule?.name || 'Desconocido',
                branch_id: this.originalSchedule.branch_id,
                branch_name: originalBranch?.name || 'Desconocido',
                start_date: this.originalSchedule.start_date,
                end_date: this.originalSchedule.end_date,
                start_date_formatted: originalStartFormatted,
                end_date_formatted: originalEndFormatted,
                approved: this.originalSchedule.approved,
              },
              newValue: {
                employee_id:
                  newScheduleData.employee_id ||
                  this.originalSchedule.employee_id,
                employee_name: employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'Desconocido',
                schedule_id:
                  newScheduleData.schedule_id ||
                  this.originalSchedule.schedule_id,
                schedule_name: schedule?.name || 'Desconocido',
                branch_id: finalBranchId,
                branch_name: branch?.name || 'Desconocido',
                start_date: format(newStart, 'yyyy-MM-dd'),
                end_date: format(newEnd, 'yyyy-MM-dd'),
                start_date_formatted: newStartFormatted,
                end_date_formatted: format(newEnd, 'dd/MM/yyyy'),
                day_name: dayName,
                is_single_day: isSingleDay,
                new_schedule_id: newScheduleId,
                approved:
                  newScheduleData.approved !== undefined
                    ? newScheduleData.approved
                    : this.originalSchedule.approved,
              },
              comment: isSingleDay
                ? `Horario "${schedule?.name || 'Desconocido'
                }" dividido: día específico ${dayName} ${newStartFormatted} extraído del rango ${originalStartFormatted} - ${originalEndFormatted} para ${employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'empleado'
                }${branch ? ` en sucursal ${branch.name}` : ''}`
                : `Horario "${schedule?.name || 'Desconocido'
                }" dividido: rango ${newStartFormatted} - ${format(
                  newEnd,
                  'dd/MM/yyyy'
                )} extraído del rango ${originalStartFormatted} - ${originalEndFormatted} para ${employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'empleado'
                }${branch ? ` en sucursal ${branch.name}` : ''}`,
            });
          }

          this.message.add({
            severity: 'success',
            summary: 'Cambios guardados',
            detail: 'El turno se dividió y se guardó correctamente.',
          });
          this.dialogRef.close();
        },
        error: (error) => {
          this.logger.error(
            '[EmployeeSchedulesFormComponent] Error al guardar horarios:',
            error
          );
          this.loading.set(false);
          this.message.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: 'Ocurrió un error al dividir y guardar el turno.',
          });
        },
      });
  }
}
