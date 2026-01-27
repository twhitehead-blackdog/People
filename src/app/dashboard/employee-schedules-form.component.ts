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
import { v4 } from 'uuid';
import { EmployeeSchedule } from '../models';
import {
  colorVariants,
  getScheduleColorInlineStyle as getColorStyle,
} from '../models';
import { TrimPipe } from '../pipes/trim.pipe';
import { ApiUrlService } from '../services/api-url.service';
import { LoggerService } from '../services/logger.service';
import { OrganizationService } from '../services/organization.service';
import { ScheduleAuditService } from '../services/schedule-audit.service';
import { ScheduleValidationService } from '../services/schedule-validation.service';
import { DashboardStore } from '../stores/dashboard.store';
import { ScheduleConfigurationsStore } from '../stores/schedule-configurations.store';

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
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
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
  </form>
  <p-confirmDialog />`,
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
  private organizationService = inject(OrganizationService);
  public colorVariants = colorVariants;
  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }
  public store = inject(DashboardStore);
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private auditService = inject(ScheduleAuditService);
  private scheduleValidation = inject(ScheduleValidationService);
  private configStore = inject(ScheduleConfigurationsStore);
  private confirmationService = inject(ConfirmationService);
  private originalSchedule: any = null;
  private singleDayEdit = false;
  private shouldClearHRTracking = false;

  private weekStart: Date | null = null;
  private weekEnd: Date | null = null;
  private employeeHasSchedulesInWeek = false;

  // Filtrar solo empleados activos para el selector
  public activeEmployeesList = computed(() =>
    this.store.employees.employeesList().filter((emp) => emp.is_active)
  );

  // ID del turno "Compensatorio" - solo admins pueden seleccionarlo
  private readonly COMPENSATORY_SCHEDULE_ID =
    'f2d92995-96a0-414f-b64a-9823db776745';

  /**
   * Determina si el usuario actual es gerente de tienda
   * (schedule_admin pero NO admin)
   */
  public isStoreManager = computed(() => {
    return this.store.isScheduleAdmin() && !this.store.isAdmin();
  });

  // Filtrar turnos disponibles según permisos
  public availableSchedules = computed(() => {
    const allSchedules = this.store.schedules.entities() ?? [];
    const selectedEmployeeId = this.form.get('employee_id')?.value;
    const selectedDate = this.form.get('start_date')?.value || null;

    // Si no hay empleado seleccionado, mostrar todos (o filtrar solo para admin/gerente básico)
    if (!selectedEmployeeId) {
      // Fallback logic minimal or return all if admin
      if (this.store.isAdmin()) return allSchedules;
      // Si es Store Manager, mostrar solo los permitidos genéricos
      if (this.isStoreManager()) {
        // Usar una lista base de permitidos si no hay empleado seleccionado aún,
        // o esperar a que seleccione.
        // Para UX, mejor retornamos los schedules genéricos validos para la mayoría.
        // O mejor, retornamos todos los que NO son compensatorios ni especiales.
        return allSchedules.filter(
          (s) =>
            !s.name.toUpperCase().includes('COMPENSATORIO') &&
            !s.name.toUpperCase().includes('10:30AM')
        );
      }
      return allSchedules;
    }

    const employee = this.store.employees
      .entities()
      .find((e) => e.id === selectedEmployeeId);

    return this.scheduleValidation.getAvailableSchedulesForEmployee(
      allSchedules,
      employee,
      selectedDate,
      this.store.isAdmin()
    );
  });

  ngOnInit(): void {
    // Ensure schedule configurations are loaded
    this.configStore.fetchItems();
    // Also preload configurations into the validation service cache
    this.scheduleValidation.loadConfigurations();

    const {
      employee_schedule,
      employee_id,
      date,
      branch,
      weekStart,
      weekEnd,
      employeeHasSchedulesInWeek,
    } = this.dialog.data;

    // DEBUG: Log detallado de datos recibidos
    console.log(
      '[EmployeeSchedulesFormComponent] ngOnInit - datos recibidos:',
      {
        employee_schedule: employee_schedule
          ? {
              id: employee_schedule.id,
              employee_id: employee_schedule.employee_id,
              schedule_id: employee_schedule.schedule_id,
              branch_id: employee_schedule.branch_id,
              start_date: employee_schedule.start_date,
              end_date: employee_schedule.end_date,
              approved: employee_schedule.approved,
              schedule_name: employee_schedule.schedule?.name,
            }
          : null,
        employee_id,
        date,
        branch,
        weekStart,
        weekEnd,
        employeeHasSchedulesInWeek,
      }
    );

    this.logger.debug(
      '[EmployeeSchedulesFormComponent] OnInit data received:',
      this.dialog.data
    );

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
        '[EmployeeSchedulesFormComponent] Modo EDICION - cargando datos del horario existente'
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

      console.log('[EmployeeSchedulesFormComponent] Valores extraídos:', {
        id,
        scheduleEmployeeId,
        schedule_id,
        start_date,
        end_date,
        branch_id,
        approved,
      });

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

      console.log('[EmployeeSchedulesFormComponent] Fechas procesadas:', {
        startDateObj,
        endDateObj,
        finalBranchId,
      });

      // Detectar si se está editando un solo día dentro de un rango existente
      if (date) {
        const dateObj = toDate(date, { timeZone: 'America/Panama' });
        const isSingleDay = isSameDay(startDateObj, endDateObj);
        const dateIsInRange = dateObj >= startDateObj && dateObj <= endDateObj;

        console.log(
          '[EmployeeSchedulesFormComponent] Análisis de edición con fecha:',
          {
            dateObj,
            isSingleDay,
            dateIsInRange,
            isSameDayAsStart: isSameDay(startDateObj, dateObj),
          }
        );

        // Si el turno original es de un solo día y se está editando ese mismo día,
        // simplemente actualizar (no dividir)
        if (isSingleDay && isSameDay(startDateObj, dateObj)) {
          console.log(
            '[EmployeeSchedulesFormComponent] Caso: Edición normal de turno de un solo día'
          );
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
          console.log(
            '[EmployeeSchedulesFormComponent] Caso: División de turno multi-día'
          );
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
          console.log(
            '[EmployeeSchedulesFormComponent] Caso: Edición normal con fecha fuera de rango'
          );
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
        console.log(
          '[EmployeeSchedulesFormComponent] Caso: Edición normal sin fecha específica'
        );
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

      // DEBUG: Verificar que el formulario se haya llenado correctamente
      console.log(
        '[EmployeeSchedulesFormComponent] Valores del formulario después de patchValue:',
        {
          formValue: this.form.getRawValue(),
          formValid: this.form.valid,
          formStatus: this.form.status,
        }
      );
    }
  }

  async saveChanges(): Promise<void> {
    this.loading.set(true);
    this.shouldClearHRTracking = false; // Reset flag

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

    // Validar límite diario de uso del horario (si está configurado)
    if (value.schedule_id && value.start_date) {
      try {
        // Get the ID to exclude (if updating an existing schedule)
        const excludeId = this.originalSchedule?.id || undefined;

        const dailyLimitValidation =
          await this.scheduleValidation.validateDailyUsageLimit(
            value.schedule_id,
            value.start_date,
            excludeId
          );

        if (!dailyLimitValidation.valid) {
          this.message.add({
            severity: 'error',
            summary: 'Límite diario alcanzado',
            detail: dailyLimitValidation.message,
            life: 6000,
          });
          this.loading.set(false);
          return;
        }
      } catch (error) {
        console.error('Error validating daily limit:', error);
        // Continue if validation fails
      }
    }

    // Verificar si el horario existente tiene tracking HR (vacaciones, incapacidad, compensatorio)
    const hrTrackingCheck = await this.checkHRTrackingAndConfirm();
    if (!hrTrackingCheck.canProceed) {
      this.loading.set(false);
      return;
    }
    this.shouldClearHRTracking = hrTrackingCheck.shouldClear;

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

    // VALIDACIÓN DE CONFLICTO GERENTE/SUBGERENTE
    const employee = this.store.employees
      .entities()
      .find((e) => e.id === value.employee_id);
    if (employee && value.schedule_id && value.start_date && value.end_date) {
      try {
        // Validar asincrónicamente
        const conflict = await this.validateManagerConflictsAsync(
          employee,
          value.schedule_id,
          value.branch_id || employee.branch_id,
          new Date(value.start_date),
          new Date(value.end_date)
        );

        if (!conflict.valid) {
          this.message.add({
            severity: 'error',
            summary: 'Conflicto de horarios',
            detail: conflict.message,
            life: 5000,
          });
          this.loading.set(false);
          return;
        }
      } catch (e) {
        console.error('Error validating conflicts', e);
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo validar reglas de negocio.',
        });
        this.loading.set(false);
        return;
      }
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

    // Si se debe limpiar tracking HR (confirmado por RRHH), agregar campos null
    if (this.shouldClearHRTracking) {
      updateData.is_timeoff = false;
      updateData.is_compensatory = false;
      updateData.timeoff_type = null;
      updateData.vacation_request_id = null;
      updateData.disability_request_id = null;
      updateData.compensatory_request_id = null;
      updateData.original_schedule_id = null;
      updateData.hr_request_notes = null;
      updateData.hr_modified_at = null;
      updateData.modified_by = null;
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
                  ? `Horario "${
                      oldSchedule?.name || 'Desconocido'
                    }" dividido (día específico modificado) para ${
                      employee
                        ? `${employee.first_name} ${employee.father_name}`
                        : 'empleado'
                    }`
                  : `Horario "${
                      oldSchedule?.name || 'Desconocido'
                    }" actualizado para ${
                      employee
                        ? `${employee.first_name} ${employee.father_name}`
                        : 'empleado'
                    }: ${oldStartFormatted} - ${oldEndFormatted} → ${newStartFormatted} - ${newEndFormatted}${
                      oldSchedule?.name !== newSchedule?.name
                        ? ` (turno cambiado a "${
                            newSchedule?.name || 'Desconocido'
                          }")`
                        : ''
                    }${
                      oldBranch?.name !== newBranch?.name
                        ? ` (sucursal cambiada de ${
                            oldBranch?.name || 'Desconocido'
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
                  ? `Horario "${schedule?.name || 'Desconocido'}" creado para ${
                      employee
                        ? `${employee.first_name} ${employee.father_name}`
                        : 'empleado'
                    } el día ${startDate}${
                      branch ? ` en sucursal ${branch.name}` : ''
                    }`
                  : `Horario "${schedule?.name || 'Desconocido'}" creado para ${
                      employee
                        ? `${employee.first_name} ${employee.father_name}`
                        : 'empleado'
                    } del ${startDate} al ${endDate}${
                      branch ? ` en sucursal ${branch.name}` : ''
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
                  comment: `Horario "${
                    schedule?.name || 'Desconocido'
                  }" creado para ${
                    employee
                      ? `${employee.first_name} ${employee.father_name}`
                      : 'empleado'
                  } el ${dayName} ${dayDate}${
                    branch ? ` en sucursal ${branch.name}` : ''
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
                ? `Horario "${
                    schedule?.name || 'Desconocido'
                  }" dividido: día específico ${dayName} ${newStartFormatted} extraído del rango ${originalStartFormatted} - ${originalEndFormatted} para ${
                    employee
                      ? `${employee.first_name} ${employee.father_name}`
                      : 'empleado'
                  }${branch ? ` en sucursal ${branch.name}` : ''}`
                : `Horario "${
                    schedule?.name || 'Desconocido'
                  }" dividido: rango ${newStartFormatted} - ${format(
                    newEnd,
                    'dd/MM/yyyy'
                  )} extraído del rango ${originalStartFormatted} - ${originalEndFormatted} para ${
                    employee
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

  private async validateManagerConflictsAsync(
    employee: any,
    scheduleId: string,
    branchId: string,
    start: Date,
    end: Date
  ): Promise<{ valid: boolean; message?: string }> {
    // 1. Check if checking is needed
    const positionName = employee.position?.name?.toUpperCase() || '';
    if (
      !positionName.includes('GERENTE') &&
      !positionName.includes('SUBGERENTE')
    ) {
      return { valid: true };
    }

    // 2. Identify counterpart
    const isManager =
      positionName.includes('GERENTE') && !positionName.includes('SUBGERENTE');
    const counterpartTerm = isManager ? 'SUBGERENTE' : 'GERENTE';

    // 3. Find counterpart employees in branch
    const allEmployees = this.store.employees.employeesList();
    const counterparts = allEmployees.filter(
      (e) =>
        e.branch_id === branchId &&
        e.id !== employee.id &&
        e.position?.name?.toUpperCase().includes(counterpartTerm)
    );

    if (counterparts.length === 0) return { valid: true };

    // 4. Fetch schedules for counterparts in date range
    // Query: employee_schedules where employee_id IN (counterparts) AND overlap with [start, end]
    // Since supabase filtering with OR/AND and multiple IDs is complex,
    // we'll fetch schedules for these employees for the relevant week(s)
    // or just filter client side if we fetch a broad range.

    const startDateStr = format(start, 'yyyy-MM-dd');
    const endDateStr = format(end, 'yyyy-MM-dd');

    const counterpartIds = counterparts.map((c) => `"${c.id}"`).join(','); // for IN query

    const url = this.apiUrl.build('rest/v1/employee_schedules');
    // format: employee_id=in.("id1","id2")&start_date=lte.end&end_date=gte.start

    const params: any = {
      select: '*',
      employee_id: `in.(${counterpartIds})`,
      start_date: `lte.${endDateStr}`,
      end_date: `gte.${startDateStr}`,
    };

    try {
      const checkSchedules = await firstValueFrom(
        this.http.get<any[]>(url, { params })
      );

      if (!checkSchedules || checkSchedules.length === 0)
        return { valid: true };

      // 5. Use service to validate with the fetched schedules
      return this.scheduleValidation.validateManagerSubmanagerConflict(
        employee,
        scheduleId,
        this.store.schedules.entities() || [],
        counterparts,
        checkSchedules,
        start,
        end
      );
    } catch (error) {
      console.error('Error fetching schedules for validation', error);
      throw error;
    }
  }

  /**
   * Verifica si el horario existente tiene tracking HR (vacaciones, incapacidad, compensatorio).
   * Solo RRHH (admin) puede sobrescribir horarios con solicitudes HR activas.
   * Muestra un diálogo de confirmación antes de sobrescribir.
   *
   * @returns Promise con canProceed (si puede continuar) y shouldClear (si debe limpiar campos HR)
   */
  private async checkHRTrackingAndConfirm(): Promise<{
    canProceed: boolean;
    shouldClear: boolean;
  }> {
    // Solo verificar si estamos editando un horario existente
    const existingSchedule = this.dialog.data
      .employee_schedule as EmployeeSchedule | null;
    if (!existingSchedule) {
      return { canProceed: true, shouldClear: false };
    }

    // Verificar si tiene tracking HR
    const hasHRTracking =
      existingSchedule.is_timeoff ||
      existingSchedule.is_compensatory ||
      existingSchedule.vacation_request_id ||
      existingSchedule.disability_request_id ||
      existingSchedule.compensatory_request_id;

    if (!hasHRTracking) {
      return { canProceed: true, shouldClear: false };
    }

    // Determinar el tipo de solicitud HR
    let hrType = '';
    if (existingSchedule.is_timeoff) {
      hrType =
        existingSchedule.timeoff_type === 'VACACIONES'
          ? 'VACACIONES'
          : existingSchedule.timeoff_type === 'INCAPACIDAD'
            ? 'INCAPACIDAD'
            : 'TIEMPO LIBRE';
    } else if (existingSchedule.is_compensatory) {
      hrType = 'COMPENSATORIO';
    }

    // Solo RRHH (admin) puede sobrescribir
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'error',
        summary: 'Horario con solicitud HR',
        detail: `Este horario tiene ${hrType} aprobado. Solo RRHH puede modificar horarios con solicitudes HR activas.`,
        life: 6000,
      });
      return { canProceed: false, shouldClear: false };
    }

    // Mostrar confirmación para RRHH
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: `Este horario tiene ${hrType} aprobado. ¿Desea sobrescribir y eliminar la referencia a la solicitud HR?`,
        header: 'Sobrescribir solicitud HR',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, sobrescribir',
        rejectLabel: 'Cancelar',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          resolve({ canProceed: true, shouldClear: true });
        },
        reject: () => {
          resolve({ canProceed: false, shouldClear: false });
        },
      });
    });
  }
}
