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
import { markGroupDirty } from '../services/util.service';

@Component({
  selector: 'pt-late-compensatory-form',
  imports: [Select, InputNumber, InputText, Button, ReactiveFormsModule],
  template: `<form [formGroup]="form">
    <div class="flex flex-col gap-4">
      <div class="input-container">
        <label for="cause">Causa</label>
        <p-select
          id="cause"
          fluid
          formControlName="cause"
          optionLabel="label"
          optionValue="value"
          [options]="absenceCauses"
          placeholder="---Seleccione una causa---"
          filter
          filterBy="label"
          appendTo="body"
        />
        @if (form.get('cause')?.errors?.['required']) {
        <small class="text-red-500">El campo causa es requerido</small>
        }
      </div>
      <div class="input-container">
        <label for="hours">Horas</label>
        <p-inputNumber
          id="hours"
          fluid
          formControlName="hours"
          minFractionDigits="2"
          maxFractionDigits="2"
          appendTo="body"
        />
        @if (form.get('hours')?.errors?.['max']) {
        <small class="text-red-500"
          >La cantidad de horas no puede ser mayor a
          {{ form.get('hours')?.errors?.['max']?.max }}</small
        >
        }
      </div>
      <div class="input-container">
        <label for="notes">Notas</label>
        <input
          pInputText
          id="notes"
          fluid
          formControlName="notes"
          appendTo="body"
        />
        @if (form.get('notes')?.errors?.['required']) {
        <small class="text-red-500">El campo notas es requerido</small>
        }
      </div>
    </div>
    <div class="dialog-actions">
      <p-button
        label="Cancelar"
        icon="pi pi-times"
        severity="secondary"
        rounded
        (click)="dialogRef.close()"
      />
      <p-button
        label="Aceptar"
        icon="pi pi-check"
        severity="success"
        rounded
        (click)="saveHours()"
      />
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateCompensatoryFormComponent implements OnInit {
  public form = new FormGroup({
    cause: new FormControl('', [Validators.required]),
    notes: new FormControl('', [Validators.required]),
    hours: new FormControl(0, []),
  });

  public absenceCauses = [
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'INJUSTIFICADA', label: 'Injustificada' },
    { value: 'JUSTIFICADA', label: 'Justificada' },
    { value: 'COMPENSATORIO', label: 'Compensatorio' },
  ];

  public dialogRef = inject(DynamicDialogRef);
  public dialogConfig = inject(DynamicDialogConfig);

  public ngOnInit(): void {
    const { hours } = this.dialogConfig.data;
    this.form
      .get('hours')
      ?.setValidators([
        Validators.required,
        Validators.min(0),
        Validators.max(hours),
      ]);
    this.form.patchValue({ hours });
  }

  saveHours() {
    if (this.form.invalid) {
      markGroupDirty(this.form);
      return;
    }
    this.dialogRef.close(this.form.value);
  }
}
