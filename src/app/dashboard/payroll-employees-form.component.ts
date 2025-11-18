import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  OnInit,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { debounceTime } from 'rxjs';
import { v4 } from 'uuid';
import { markGroupDirty } from '../services/util.service';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-payroll-employees-form',
  imports: [ReactiveFormsModule, Select, InputNumber, Button],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="flex flex-col md:grid md:grid-cols-2 gap-4">
        <div class="input-container">
          <label for="employee_id">Empleado</label>
          <p-select
            formControlName="employee_id"
            label="Empleado"
            [options]="employees.activeEmployees()"
            optionLabel="short_name"
            optionValue="id"
            placeholder="Seleccione un empleado"
            appendTo="body"
            filter
            filterBy="short_name"
          />
        </div>
        <div class="input-container">
          <label for="monthly_salary">Salario Mensual</label>
          <p-inputnumber
            formControlName="monthly_salary"
            mode="currency"
            currency="USD"
            minFractionDigits="2"
            maxFractionDigits="2"
          />
        </div>
        <div class="input-container">
          <label for="hourly_salary">Salario por Hora</label>
          <p-inputnumber
            formControlName="hourly_salary"
            mode="currency"
            currency="USD"
            minFractionDigits="2"
            maxFractionDigits="2"
          />
        </div>
      </div>
      <div class="dialog-actions pt-1">
        <p-button
          label="Cancelar"
          severity="secondary"
          text
          rounded
          icon="pi pi-times"
          (onClick)="dialog.close()"
        />
        <p-button label="Guardar" rounded icon="pi pi-check" type="submit" />
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollEmployeesFormComponent implements OnInit {
  public employees = inject(EmployeesStore);
  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    employee_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    payroll_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    monthly_salary: new FormControl(0, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    hourly_salary: new FormControl(0, {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });
  public dialog = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);
  public message = inject(MessageService);
  public http = inject(HttpClient);
  private injector = inject(Injector);
  currentSalary = toSignal(
    this.form.get('monthly_salary')!.valueChanges.pipe(debounceTime(500)),
    {
      initialValue: 0,
    }
  );

  hourlySalary = computed(() => this.currentSalary() / (104.28 * 2));
  currentEmployeeId = toSignal(
    this.form.get('employee_id')!.valueChanges.pipe(debounceTime(500)),
    {
      initialValue: '',
    }
  );

  currentEmployee = computed(() =>
    this.employees
      .employeesList()
      .find((e) => e.id === this.currentEmployeeId())
  );

  ngOnInit(): void {
    const { employee, payrollId } = this.dialogConfig.data;
    if (employee) {
      this.form.patchValue(employee);
      effect(
        () => {
          this.form.get('hourly_salary')?.patchValue(this.hourlySalary());
        },
        { injector: this.injector }
      );

      return;
    }

    effect(
      () => {
        this.form
          .get('monthly_salary')
          ?.patchValue(this.currentEmployee()?.monthly_salary ?? 0);
        this.form
          .get('hourly_salary')
          ?.patchValue(this.currentEmployee()?.hourly_salary ?? 0);
      },
      { injector: this.injector }
    );
    this.form.patchValue({ payroll_id: payrollId });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, complete los campos requeridos',
      });
      markGroupDirty(this.form);
      return;
    }
    const { employee } = this.dialogConfig.data;
    if (employee) {
      this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_payrolls`,
          this.form.value,
          {
            params: {
              id: `eq.${employee.id}`,
            },
          }
        )
        .subscribe(() => {
          this.dialog.close();
        });
    } else {
      this.http
        .post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_payrolls`,
          this.form.value
        )
        .subscribe(() => {
          this.dialog.close();
        });
    }
  }
}
