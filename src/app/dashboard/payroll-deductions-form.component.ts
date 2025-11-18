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
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { v4 } from 'uuid';
import { markGroupDirty } from '../services/util.service';

@Component({
  selector: 'pt-payroll-deductions-form',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputNumber,
    Button,
    Select,
    ToggleSwitch,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="flex flex-col md:grid md:grid-cols-2 gap-4">
        <div class="input-container">
          <label for="name">Nombre</label>
          <input pInputText formControlName="name" />
        </div>
        <div class="input-container">
          <label for="value">Valor</label>
          <p-inputnumber
            formControlName="value"
            mode="decimal"
            minFractionDigits="2"
            maxFractionDigits="2"
          />
        </div>
        <div class="input-container">
          <label for="calculation_type">Tipo de Calculo</label>
          <p-select
            formControlName="calculation_type"
            [options]="calculationTypes"
            optionLabel="name"
            optionValue="value"
            appendTo="body"
          />
        </div>
        <div class="input-container">
          <label for="min_salary">Salario Minimo</label>
          <p-inputnumber
            formControlName="min_salary"
            mode="currency"
            currency="USD"
            minFractionDigits="2"
            maxFractionDigits="2"
          />
        </div>
        <div class="input-container">
          <label for="income_tax">Impuesto sobre la renta</label>
          <p-toggleSwitch formControlName="income_tax" />
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
export class PayrollDeductionsFormComponent implements OnInit {
  public dialog = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);
  private http = inject(HttpClient);
  private message = inject(MessageService);

  public calculationTypes = [
    { name: 'Fijo', value: 'fixed' },
    { name: 'Porcentaje', value: 'percentage' },
  ];
  public form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    value: new FormControl(0, {
      validators: [Validators.required],
      nonNullable: true,
    }),
    calculation_type: new FormControl('fixed', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    payroll_id: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    min_salary: new FormControl(0, { nonNullable: true }),
    income_tax: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    const { deduction, payrollId } = this.dialogConfig.data;
    if (deduction) {
      this.form.patchValue(deduction);
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
    const { deduction } = this.dialogConfig.data;
    if (deduction) {
      this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_deductions`,
          this.form.value,
          {
            params: {
              id: `eq.${deduction.id}`,
            },
          }
        )
        .subscribe(() => {
          this.dialog.close();
        });
    } else {
      this.http
        .post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_deductions`,
          this.form.value
        )
        .subscribe(() => {
          this.dialog.close();
        });
    }
  }
}
