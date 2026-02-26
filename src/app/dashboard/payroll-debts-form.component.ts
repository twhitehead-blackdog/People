import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ApiUrlService } from '../services/api-url.service';
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
import { Textarea } from 'primeng/textarea';
import { v4 } from 'uuid';
import { markGroupDirty } from '../services/util.service';
import { CreditorsStore } from '../stores/creditors.store';
import { EmployeesStore } from '../stores/employees.store';
import { PayrollsStore } from '../stores/payrolls.store';

const DEBT_TYPES = [
  { label: 'Prestamo de Empresa', value: 'company_loan' },
  { label: 'Prestamo Bancario', value: 'bank_loan' },
  { label: 'Acreedor / Otro', value: 'creditor' },
];

const DEBT_STATUSES = [
  { label: 'Activo', value: 'active' },
  { label: 'Pausado', value: 'paused' },
  { label: 'Completado', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' },
];

@Component({
  selector: 'pt-payroll-debts-form',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    InputText,
    InputNumber,
    DatePicker,
    Button,
    Textarea,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="input-container">
        <label for="employee">Empleado</label>
        <p-select
          inputId="employee"
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
          inputId="payroll"
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
        <label for="debt_type">Tipo de Deuda</label>
        <p-select
          inputId="debt_type"
          formControlName="debt_type"
          fluid
          [options]="debtTypes"
          optionLabel="label"
          optionValue="value"
          placeholder="---Tipo de deuda---"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="creditor">Acreedor</label>
        <p-select
          inputId="creditor"
          formControlName="creditor_id"
          fluid
          [options]="creditors.entities()"
          optionLabel="name"
          optionValue="id"
          placeholder="---Seleccione un acreedor---"
          filter
          filterBy="name"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="description">Descripcion</label>
        <input
          pInputText
          id="description"
          fluid
          placeholder="---Ingrese la descripcion---"
          formControlName="description"
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
        <label for="amount">Monto Total</label>
        <p-input-number
          mode="currency"
          currency="USD"
          id="amount"
          fluid
          formControlName="amount"
        />
      </div>
      <div class="input-container">
        <label for="installment_amount">Cuota por Quincena</label>
        <p-input-number
          mode="currency"
          currency="USD"
          id="installment_amount"
          fluid
          formControlName="installment_amount"
        />
      </div>
      <div class="input-container">
        <label for="total_installments">Total de Cuotas</label>
        <p-input-number
          id="total_installments"
          fluid
          formControlName="total_installments"
          [min]="1"
        />
      </div>
      <div class="input-container">
        <label for="balance">Saldo Pendiente</label>
        <p-input-number
          mode="currency"
          currency="USD"
          id="balance"
          fluid
          formControlName="balance"
        />
      </div>
      <div class="input-container">
        <label for="start_date">Fecha de Inicio</label>
        <p-datepicker
          inputId="start_date"
          formControlName="start_date"
          showIcon
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="due_date">Fecha de Vencimiento</label>
        <p-datepicker
          inputId="due_date"
          formControlName="due_date"
          showIcon
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="status">Estado</label>
        <p-select
          inputId="status"
          formControlName="status"
          fluid
          [options]="debtStatuses"
          optionLabel="label"
          optionValue="value"
          appendTo="body"
        />
      </div>
      <div class="input-container lg:col-span-3">
        <label for="notes">Notas</label>
        <textarea
          pTextarea
          id="notes"
          formControlName="notes"
          rows="2"
          class="w-full"
          placeholder="Notas adicionales..."
        ></textarea>
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
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  public message = inject(MessageService);

  public dialog = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);

  public debtTypes = DEBT_TYPES;
  public debtStatuses = DEBT_STATUSES;

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
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    amount: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    installment_amount: new FormControl<number | null>(null),
    total_installments: new FormControl<number | null>(null),
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
    debt_type: new FormControl('company_loan', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl('active', {
      nonNullable: true,
    }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const { debt, payrollId } = this.dialogConfig.data;
    if (debt) {
      this.form.patchValue(debt);
      if (debt.start_date) {
        this.form
          .get('start_date')
          ?.patchValue(toDate(debt.start_date, { timeZone: 'America/Panama' }));
      }
      if (debt.due_date) {
        this.form
          .get('due_date')
          ?.patchValue(toDate(debt.due_date, { timeZone: 'America/Panama' }));
      }
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

    const payload = this.form.value;

    const { debt } = this.dialogConfig.data;
    if (debt) {
      const url = this.apiUrl.build('rest/v1/payroll_debts', {
        id: `eq.${debt.id}`,
      });
      this.http
        .patch(url, payload)
        .subscribe({
          next: () => {
            this.message.add({
              severity: 'success',
              summary: 'Actualizado',
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

    const url = this.apiUrl.build('rest/v1/payroll_debts');
    this.http
      .post(url, payload)
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Creado',
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
