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
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { v4 } from 'uuid';
import { TimeOff } from '../models';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-time-offs',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    DatePicker,
    ToggleSwitch,
    Textarea,
    Button,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="flex flex-col md:grid grid-cols-2 gap-4">
      <div class="input-container">
        <label for="employee_id">Empleado</label>
        <p-select
          formControlName="employee_id"
          inputId="employee"
          [options]="store.employeesList()"
          optionValue="id"
          appendTo="body"
          filterBy="first_name,father_name"
          filter
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
        <label for="type">Tipo</label>
        <p-select
          formControlName="type_id"
          inputId="type"
          [options]="store.timeoff_types()"
          optionValue="id"
          optionLabel="name"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="star_date">Duracion</label>
        <p-datepicker
          formControlName="start_date"
          inputId="start_date"
          selectionMode="range"
          formControlName="dateRange"
          appendTo="body"
        />
      </div>
      <div class="flex items-center gap-2">
        <p-toggleswitch formControlName="is_approved" inputId="is_approved" />
        <label for="is_approved">Aprobado</label>
      </div>
      <div class="input-container md:col-span-2">
        <label for="notes">Comentarios</label>
        <textarea pTextarea formControlName="notes" rows="4"></textarea>
      </div>
    </div>
    <div class="dialog-actions">
      <p-button
        type="button"
        label="Cancelar"
        icon="pi pi-times"
        severity="secondary"
        (onClick)="dialogRef.close()"
      />
      <p-button type="submit" label="Guardar cambios" icon="pi pi-save" />
    </div>
  </form>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeOffsComponent implements OnInit {
  public store = inject(EmployeesStore);
  protected form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    employee_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    type_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dateRange: new FormControl([new Date()], {
      nonNullable: true,
      validators: [Validators.required],
    }),

    notes: new FormControl('', { nonNullable: true }),
    is_approved: new FormControl(false, { nonNullable: true }),
  });

  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);

  ngOnInit() {
    this.store.fetchTimeOffTypes();
    const {
      data: { employee, timeoff },
    } = this.dialog;
    if (employee) {
      this.form.get('employee_id')?.setValue(employee.id);
      this.form.get('employee_id')?.disable({ emitEvent: false });
    }
  }

  saveChanges() {
    const { id, employee_id, type_id, dateRange, notes, is_approved } =
      this.form.getRawValue();
    const request: TimeOff = {
      id,
      employee_id,
      type_id,
      date_from: dateRange[0],
      date_to: dateRange[1],
      notes: [notes],
      is_approved,
    };
    this.store.saveTimeOff(request);
  }
}
