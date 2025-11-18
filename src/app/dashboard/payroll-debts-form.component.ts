import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toDate } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { v4 } from 'uuid';
import { markGroupDirty } from '../services/util.service';
import { CreditorsStore } from '../stores/creditors.store';
import { EmployeesStore } from '../stores/employees.store';
import { PayrollsStore } from '../stores/payrolls.store';

@Component({
  selector: 'pt-payroll-debts-form',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    InputText,
    InputNumber,
    DatePicker,
    Button,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="input-container">
        <label for="employee">Empleado</label>
        <p-select
          id="employee"
          fluid
          formControlName="employee_id"
          [options]="employees.activeEmployees()"
          optionLabel="short_name"
          optionValue="id"
          placeholder="---Seleccione un empleado---"
          filter
          filterBy="short_name"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="payroll">Planilla</label>
        <p-select
          id="payroll"
          formControlName="payroll_id"
          fluid
          [options]="store.entities()"
          optionLabel="name"
          optionValue="id"
          placeholder="---Seleccione una planilla---"
          filter
          filterBy="name"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="creditor">Acreedor</label>
        <p-select
          id="creditor"
          formControlName="creditor_id"
          fluid
          [options]="creditors.entities()"
          optionLabel="name"
          optionValue="id"
          placeholder="---Seleccione un credor---"
          filter
          filterBy="name"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="account_id">Id. Cuenta</label>
        <input
          pInputText
          id="account_id"
          fluid
          placeholder="Ingrese el id de la cuenta"
          formControlName="account_id"
        />
      </div>
      <div class="input-container">
        <label for="description">Descripción</label>
        <input
          pInputText
          id="description"
          fluid
          placeholder="---Ingrese la descripción---"
          formControlName="description"
        />
      </div>
      <div class="input-container">
        <label for="amount">Monto</label>
        <p-input-number
          mode="currency"
          currency="USD"
          id="amount"
          fluid
          formControlName="amount"
        />
      </div>
      <div class="input-container">
        <label for="start_date">Fecha de inicio</label>
        <p-datepicker
          id="start_date"
          formControlName="start_date"
          showIcon
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="due_date">Fecha de vencimiento</label>
        <p-datepicker
          id="due_date"
          formControlName="due_date"
          showIcon
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="balance">Saldo</label>
        <p-input-number
          mode="currency"
          currency="USD"
          id="balance"
          fluid
          formControlName="balance"
        />
      </div>
    </div>
    <div class="dialog-actions pt-4">
      <p-button
        label="Cancelar"
        severity="secondary"
        icon="pi pi-times"
        rounded
        (onClick)="dialog.close()"
      />
      <p-button label="Guardar" type="submit" icon="pi pi-check" rounded />
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollDebtsFormComponent implements OnInit {
  public employees = inject(EmployeesStore);
  public creditors = inject(CreditorsStore);
  public store = inject(PayrollsStore);
  public message = inject(MessageService);

  public dialog = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);
  private http = inject(HttpClient);
  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    employee_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    account_id: new FormControl('', {
      nonNullable: true,
    }),
    creditor_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    amount: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    start_date: new FormControl(new Date(), {
      nonNullable: true,
    }),
    due_date: new FormControl(new Date(), {
      nonNullable: true,
    }),
    balance: new FormControl(0, { nonNullable: true }),
    payroll_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    const { debt, payrollId } = this.dialogConfig.data;
    if (debt) {
      this.form.patchValue(debt);
      this.form
        .get('start_date')
        ?.patchValue(toDate(debt.start_date, { timeZone: 'America/Panama' }));
      this.form
        .get('due_date')
        ?.patchValue(toDate(debt.due_date, { timeZone: 'America/Panama' }));
      return;
    }
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
    const { debt } = this.dialogConfig.data;
    if (debt) {
      this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_debts`,
          this.form.value,
          {
            params: {
              id: `eq.${debt.id}`,
            },
          }
        )
        .subscribe({
          next: () => {
            this.message.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Deuda actualizada correctamente',
            });
            this.dialog.close();
          },
          error: (err) => {
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail: err.error.message,
            });
          },
        });
      return;
    }
    this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_debts`,
        this.form.value
      )
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Deuda agregada correctamente',
          });
          this.dialog.close();
        },
        error: (err) => {
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: err.error.message,
          });
        },
      });
  }
}
