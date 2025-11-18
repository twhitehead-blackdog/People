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
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

@Component({
  selector: 'pt-payment-item-form',
  imports: [ReactiveFormsModule, InputText, InputNumber, Select, Button],
  template: `
    <form [formGroup]="form">
      <div class="flex flex-col gap-2">
        <div class="input-container">
          <label for="description">Descripción</label>
          <input pInputText id="description" formControlName="description" />
        </div>
        <div class="input-container">
          <label for="amount">Monto</label>
          <p-inputNumber
            mode="currency"
            currency="USD"
            formControlName="amount"
            id="amount"
            placeholder="Monto"
          />
        </div>
        <div class="input-container">
          <label for="type">Tipo</label>
          <p-select
            id="type"
            formControlName="type"
            optionLabel="name"
            optionValue="value"
            [options]="types"
            appendTo="body"
          />
        </div>
      </div>
      <div class="dialog-actions">
        <p-button
          label="Cancelar"
          (onClick)="ref.close()"
          severity="secondary"
          outlined
          rounded
        />
        <p-button
          label="Guardar"
          (onClick)="ref.close(form.value)"
          rounded
          icon="pi pi-save"
          severity="success"
        />
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentItemFormComponent implements OnInit {
  public ref = inject(DynamicDialogRef);
  public types = [
    { name: 'Ingreso', value: 'income' },
    { name: 'Deduccion', value: 'deduction' },
    { name: 'Deuda', value: 'debt' },
  ];
  public form = new FormGroup({
    description: new FormControl('', [Validators.required]),
    amount: new FormControl(0, [Validators.required]),
    type: new FormControl('payment', [Validators.required]),
  });

  public dialogConfig = inject(DynamicDialogConfig);

  ngOnInit(): void {
    if (this.dialogConfig.data.item) {
      this.form.patchValue(this.dialogConfig.data.item);
    }
  }
}
