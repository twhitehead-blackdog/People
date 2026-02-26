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
import { Textarea } from 'primeng/textarea';
import { v4 } from 'uuid';

import { DatePicker } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-termination-form',
  imports: [ReactiveFormsModule, SelectModule, DatePicker, Textarea, Button],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="grid grid-cols-2 gap-4">
        <div class="input-container">
          <label for="employee">Empleado</label>
          <p-select
            formControlName="employee_id"
            inputId="employee"
            [options]="store.employeesList()"
            optionValue="id"
          >
            <ng-template pTemplate="selectedItem" let-selected>
              {{ selected.first_name }} {{ selected.father_name }}
            </ng-template>
            <ng-template let-item pTemplate="item">
              {{ item.first_name }} {{ item.father_name }}
            </ng-template>
          </p-select>
        </div>

        <div class="input-container">
          <label for="date">Fecha efectiva</label>
          <p-datepicker
            inputId="date"
            formControlName="date"
            [showIcon]="true"
            appendTo="body"
          />
        </div>
        <div class="input-container">
          <label for="reason">Motivo</label>
          <p-select
            inputId="reason"
            formControlName="reason"
            [options]="reasons"
            optionValue="value"
            optionLabel="label"
          />
        </div>
        <div class="input-container md:col-span-2">
          <label for="notes">Apuntes</label>
          <textarea pTextarea id="notes" formControlName="notes"></textarea>
        </div>
      </div>

      <div class="dialog-actions">
        <p-button
          [outlined]="true"
          label="Cancelar"
          severity="secondary"
          type="button"
          (onClick)="dialog.close()"
        />

        <p-button
          label="Guardar cambios"
          type="submit"
          [disabled]="form.invalid"
        />
      </div>
    </form>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminationFormComponent implements OnInit {
  public store = inject(EmployeesStore);
  public reasons = [
    { value: 'DESPIDO', label: 'Despido' },
    {
      value: 'RENUNCIA',
      label: 'Renuncia',
    },
    { value: 'FIN_CONTRATO', label: 'Fin de contrato' },
  ];
  public info = inject(DynamicDialogConfig);
  public form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    employee_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reason: new FormControl<'DESPIDO' | 'RENUNCIA' | 'FIN_CONTRATO'>(
      'DESPIDO',
      {
        nonNullable: true,
        validators: [Validators.required],
      }
    ),
    date: new FormControl<Date>(new Date(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true }),
  });
  public dialog = inject(DynamicDialogRef);

  ngOnInit() {
    const { employee } = this.info.data;
    if (employee) {
      this.form.get('employee_id')?.patchValue(employee.id);
    }
  }

  saveChanges() {
    this.store.terminateEmployee(this.form.getRawValue()).subscribe({
      next: () => this.dialog.close(),
    });
  }
}
