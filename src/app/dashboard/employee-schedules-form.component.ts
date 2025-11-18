import { NgClass } from '@angular/common';
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
import { toDate } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { iif } from 'rxjs';
import { v4 } from 'uuid';
import { colorVariants } from '../models';
import { TrimPipe } from '../pipes/trim.pipe';
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
    ToggleSwitch,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col  md:grid grid-cols-2 gap-4">
      <div class="input-container">
        <label for="employee_id">Empleado</label>
        <p-select
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
                [ngClass]="colorVariants[item.color]"
              >
                {{ item.name }}
              </div>
            </div>
          </ng-template>
          <ng-template #selectedItem let-selected>
            <div class="flex items-center ">
              <div
                class="text-sm rounded p-1"
                [ngClass]="colorVariants[selected.color]"
              >
                {{ selected.name }}
              </div>
            </div>
          </ng-template>
        </p-select>
      </div>

      <div class="input-container">
        <label for="start_date">Fecha inicio</label>
        <p-datepicker formControlName="start_date" appendTo="body" />
      </div>
      <div class="input-container">
        <label for="end_date">Fecha fin</label>
        <p-datepicker formControlName="end_date" appendTo="body" />
      </div>
      <div class="input-container">
        <label for="branch_id">Sucursal</label>
        <p-select
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
  public colorVariants = colorVariants;
  public store = inject(DashboardStore);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const { employee_schedule, employee_id, date, branch } = this.dialog.data;
    if (!this.store.isScheduleApprover()) {
      this.form.get('approved')?.disable();
    }

    if (branch) {
      this.form.get('branch_id')?.patchValue(branch);
    }

    if (date) {
      this.form
        .get('start_date')
        ?.patchValue(toDate(date, { timeZone: 'America/Panama' }));
      this.form
        .get('end_date')
        ?.patchValue(toDate(date, { timeZone: 'America/Panama' }));
    }
    if (employee_id) {
      this.form.patchValue({ employee_id });
      this.form.get('employee_id')?.disable();
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
      this.form.patchValue({
        id,
        employee_id,
        schedule_id,
        branch_id,
        approved,
      });
      this.form
        .get('start_date')
        ?.patchValue(toDate(start_date, { timeZone: 'America/Panama' }));
      this.form
        .get('end_date')
        ?.patchValue(toDate(end_date, { timeZone: 'America/Panama' }));
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
    const createRequest = this.http.post(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      value
    );
    const updateRequest = this.http.patch(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      this.form.getRawValue(),
      {
        params: {
          id: `eq.${value.id}`,
        },
      }
    );
    iif(() => this.dialog.data.employee_schedule, updateRequest, createRequest)
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
}
