import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
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
import { SelectModule } from 'primeng/select';
import { markGroupDirty } from '../services/util.service';
import { PayrollService } from '../services/payroll.service';

const MONTHS = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
];

const PERIODS = [
  { label: 'Primera quincena (corte dia 10)', value: 1 },
  { label: 'Segunda quincena (corte dia 25)', value: 2 },
];

@Component({
  selector: 'pt-payroll-payments-form',
  imports: [ReactiveFormsModule, Button, InputNumber, SelectModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="flex flex-col md:grid grid-cols-3 md:gap-4">
        <div class="input-container">
          <label for="year">Ano</label>
          <p-input-number
            inputId="year"
            formControlName="year"
            fluid
            [useGrouping]="false"
            [min]="2020"
            [max]="2040"
          />
        </div>
        <div class="input-container">
          <label for="month">Mes</label>
          <p-select
            inputId="month"
            formControlName="month"
            fluid
            [options]="months"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccione un mes"
            appendTo="body"
          />
        </div>
        <div class="input-container">
          <label for="period">Quincena</label>
          <p-select
            inputId="period"
            formControlName="period_number"
            fluid
            [options]="periods"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccione la quincena"
            appendTo="body"
          />
        </div>
      </div>
      <div class="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <p class="text-sm text-gray-400 m-0">
          <i class="pi pi-info-circle mr-1"></i>
          Las fechas de corte y pago se calculan automaticamente segun la configuracion de planilla.
        </p>
      </div>
      <div class="dialog-actions pt-4">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          icon="pi pi-times"
          (click)="modalRef.close()"
        />
        <p-button
          label="Generar Periodo"
          type="submit"
          icon="pi pi-calendar-plus"
          rounded
          severity="success"
          [loading]="saving()"
        />
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPaymentsFormComponent implements OnInit {
  public modalRef = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);
  private payrollService = inject(PayrollService);
  private message = inject(MessageService);
  public saving = signal(false);

  public months = MONTHS;
  public periods = PERIODS;

  form = new FormGroup({
    year: new FormControl(new Date().getFullYear(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    month: new FormControl(new Date().getMonth() + 1, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    period_number: new FormControl<1 | 2>(1, {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  public ngOnInit(): void {}

  public async saveChanges(): Promise<void> {
    if (this.form.invalid) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, complete los campos requeridos',
      });
      markGroupDirty(this.form);
      return;
    }

    this.saving.set(true);
    try {
      const { year, month, period_number } = this.form.getRawValue();
      const payrollId = this.dialogConfig.data.payrollId;

      const payment = await this.payrollService.generatePeriod(
        payrollId,
        year,
        month,
        period_number
      );

      this.message.add({
        severity: 'success',
        summary: 'Periodo Creado',
        detail: payment.title,
      });
      this.modalRef.close(payment);
    } catch (err: any) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.error?.message ?? 'Error al generar periodo',
      });
    }
    this.saving.set(false);
  }
}
