import { NgClass, NgStyle } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
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
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { forkJoin, iif } from 'rxjs';
import { v4 } from 'uuid';
import {
  colorVariants,
  getScheduleColorInlineStyle as getColorStyle,
} from '../models';
import { TrimPipe } from '../pipes/trim.pipe';
import { OrganizationService } from '../services/organization.service';
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
  ],
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col  md:grid grid-cols-2 gap-4">
      <div class="input-container">
        <label for="employee_id">Empleado</label>
        <p-select
          inputId="employee_id"
          formControlName="employee_id"
          [options]="store.employees.employeesList()"
          optionValue="id"
          placeholder="Seleccionar empleado"
          filter
          filterBy="first_name,father_name"
          appendTo="body"
        >
          <ng-template #selectedItem let-selected>
            {{ selected.father_name | trim }}, {{ selected.first_name | trim }}
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
          [options]="store.schedules.entities()"
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
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch formControlName="approved" inputId="approved" />
        <label for="approved">Aprobado</label>
      </div>
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
  private message = inject(MessageService);
  private organizationService = inject(OrganizationService);
  public colorVariants = colorVariants;
  public getScheduleColorInlineStyle(color: string | undefined | null) {
    return getColorStyle(color);
  }
  public store = inject(DashboardStore);
  private destroyRef = inject(DestroyRef);
  private originalSchedule: any = null;
  private singleDayEdit: boolean = false;
  private weekStart: Date | null = null;
  private weekEnd: Date | null = null;
  private employeeHasSchedulesInWeek: boolean = false;

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

    // Guardar información de la semana
    this.weekStart = weekStart || null;
    this.weekEnd = weekEnd || null;
    this.employeeHasSchedulesInWeek = employeeHasSchedulesInWeek || false;
    if (!this.store.isScheduleApprover()) {
      this.form.get('approved')?.disable();
    }

    if (branch) {
      this.form.get('branch_id')?.patchValue(branch);
    }

    if (date) {
      const dateObj = toDate(date, { timeZone: 'America/Panama' });
      this.form.get('start_date')?.patchValue(dateObj);
      this.form.get('end_date')?.patchValue(dateObj);
    }
    if (employee_id) {
      this.form.patchValue({ employee_id });
      this.form.get('employee_id')?.disable();

      // Si no hay horarios en la semana y se está creando uno nuevo,
      // establecer el rango para toda la semana
      if (!this.employeeHasSchedulesInWeek && this.weekStart && this.weekEnd) {
        const startDateObj = toDate(this.weekStart, {
          timeZone: 'America/Panama',
        });
        const endDateObj = toDate(this.weekEnd, { timeZone: 'America/Panama' });

        // Si se pasó un date específico, usar ese día; si no, usar toda la semana
        if (date) {
          const dateObj = toDate(date, { timeZone: 'America/Panama' });
          this.form.get('start_date')?.patchValue(dateObj);
          this.form.get('end_date')?.patchValue(dateObj);
        } else {
          this.form.get('start_date')?.patchValue(startDateObj);
          this.form.get('end_date')?.patchValue(endDateObj);
        }
      }
      return;
    }
    if (employee_schedule) {
      const {
        id,
        employee_id,
        schedule_id,
        start_date,
        end_date,
        branch_id,
        approved,
      } = employee_schedule;

      // Guardar el turno original para comparación
      this.originalSchedule = employee_schedule;

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
            employee_id,
            schedule_id,
            branch_id,
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
          // Generar nuevo ID para el nuevo turno
          this.form.get('id')?.patchValue(v4());
        } else {
          // Comportamiento normal: cargar todo el rango
          this.form.patchValue({
            id,
            employee_id,
            schedule_id,
            branch_id,
            approved,
          });
          this.form.get('start_date')?.patchValue(startDateObj);
          this.form.get('end_date')?.patchValue(endDateObj);
        }
      } else {
        // Comportamiento normal: cargar todo el rango
        this.form.patchValue({
          id,
          employee_id,
          schedule_id,
          branch_id,
          approved,
        });
        this.form.get('start_date')?.patchValue(startDateObj);
        this.form.get('end_date')?.patchValue(endDateObj);
      }
    }
  }

  saveChanges(): void {
    this.loading.set(true);
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
    const companyId = this.organizationService.getCurrentCompanyId();

    // Si no hay horarios en la semana y se está creando uno nuevo,
    // crear un horario para cada día de la semana
    if (
      !this.employeeHasSchedulesInWeek &&
      !this.dialog.data.employee_schedule &&
      this.weekStart &&
      this.weekEnd
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
    const requestData: any = { ...value };
    if (companyId && !requestData.company_id) {
      requestData.company_id = companyId;
    }

    const createRequest = this.http.post(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      requestData
    );

    const updateData: any = { ...this.form.getRawValue() };
    if (companyId && !updateData.company_id) {
      updateData.company_id = companyId;
    }

    const updateRequest = this.http.patch(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      updateData,
      {
        params: {
          id: `eq.${value.id}`,
          ...(companyId ? { company_id: `eq.${companyId}` } : {}),
        },
      }
    );
    iif(
      () => this.dialog.data.employee_schedule && !this.singleDayEdit,
      updateRequest,
      createRequest
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Cambios guardados',
            detail: 'Los cambios se guardaron correctamente.',
          });
          this.dialogRef.close();
        },
        error: (error) => {
          console.error(error);
          this.loading.set(false);
          this.message.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: 'Ocurrió un error al guardar los cambios.',
          });
        },
      });
  }

  private createWeekSchedules(
    scheduleData: any,
    companyId: string | null
  ): void {
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
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
        daySchedule
      );
    });

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Horarios creados',
            detail: `Se crearon horarios para toda la semana (${weekDays.length} días).`,
          });
          this.dialogRef.close();
        },
        error: (error) => {
          console.error(error);
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
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            updateData,
            {
              params: {
                id: `eq.${this.originalSchedule.id}`,
                ...(companyId ? { company_id: `eq.${companyId}` } : {}),
              },
            }
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
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            updateData,
            {
              params: {
                id: `eq.${this.originalSchedule.id}`,
                ...(companyId ? { company_id: `eq.${companyId}` } : {}),
              },
            }
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
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
          updateData1,
          {
            params: {
              id: `eq.${this.originalSchedule.id}`,
              ...(companyId ? { company_id: `eq.${companyId}` } : {}),
            },
          }
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
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
            createData2
          )
        );
      }
    }

    // 3. Crear el nuevo turno para el día seleccionado
    // IMPORTANTE: Siempre generar un ID nuevo para evitar conflictos con el turno original
    const newScheduleRequest: any = {
      id: v4(), // Generar nuevo ID para el nuevo turno
      employee_id: newScheduleData.employee_id,
      schedule_id: newScheduleData.schedule_id,
      branch_id: newScheduleData.branch_id,
      start_date: format(newStart, 'yyyy-MM-dd'),
      end_date: format(newEnd, 'yyyy-MM-dd'),
      approved: newScheduleData.approved,
    };
    if (companyId) {
      newScheduleRequest.company_id = companyId;
    }

    requests.push(
      this.http.post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
        newScheduleRequest
      )
    );

    // Ejecutar todas las operaciones en paralelo
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Cambios guardados',
            detail: 'El turno se dividió y se guardó correctamente.',
          });
          this.dialogRef.close();
        },
        error: (error) => {
          console.error(error);
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
