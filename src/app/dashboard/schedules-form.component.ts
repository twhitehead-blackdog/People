import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { v4 } from 'uuid';
import { colorVariants } from '../models';
import { SchedulesStore } from '../stores/schedules.store';

@Component({
  selector: 'pt-schedules-form',
  imports: [
    DatePicker,
    FormsModule,
    ReactiveFormsModule,
    InputText,
    InputNumber,
    Button,
    ToggleSwitch,
    Select,
    NgClass,
  ],
  template: `<form [formGroup]="form" (ngSubmit)="saveChanges()">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="input-container col-span-2 md:col-span-4">
        <label for="name">Nombre</label>
        <input pInputText id="name" type="text" formControlName="name" />
      </div>
      <div class="input-container">
        <label for="calendar-timeonly">Hora entrada</label>
        <p-datepicker
          inputId="calendar-timeonly"
          timeOnly
          formControlName="entry_time"
          hourFormat="12"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="formatted-hour">Hora inicio almuerzo</label>
        <p-datepicker
          timeOnly
          formControlName="lunch_start_time"
          hourFormat="12"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="formatted-hour">Hora fin almuerzo</label>
        <p-datepicker
          timeOnly
          formControlName="lunch_end_time"
          hourFormat="12"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="formatted-hour">Hora salida</label>
        <p-datepicker
          timeOnly
          formControlName="exit_time"
          hourFormat="12"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="minutes-tolerance">Tolerancia (minutos)</label>
        <p-inputNumber
          id="minutes-tolerance"
          formControlName="minutes_tolerance"
          [min]="0"
          [max]="60"
          showButtons
          step="5"
          [disabled]="!!form.get('no_tolerance')?.value"
        />
      </div>
      <div class="flex items-center mt-2 gap-2">
        <p-toggleswitch formControlName="no_tolerance" inputId="no_tolerance" />
        <label for="no_tolerance">Sin tiempo de gracia (horario estricto)</label>
      </div>
      <div class="input-container">
        <label for="color">Color</label>
        <p-select
          formControlName="color"
          [options]="colors"
          optionValue="key"
          appendTo="body"
        >
          <ng-template #item let-color>
            <span
              class="rounded h-6 w-full flex items-center justify-center"
              [ngClass]="colorVariants[color.key]"
            ></span>
          </ng-template>
          <ng-template #selectedItem let-color>
            <span
              class="rounded h-6 w-full flex items-center justify-center"
              [ngClass]="colorVariants[color.key]"
            ></span>
          </ng-template>
        </p-select>
      </div>
      <div class="flex items-center mt-2 gap-2">
        <p-toggleswitch formControlName="day_off" inputId="day_off" />
        <label for="day_off">Dia Libre</label>
      </div>
    </div>
    <div class="flex justify-end gap-4 items-center">
      <p-button
        label="Cancelar"
        severity="secondary"
        outlined
        rounded
        icon="pi pi-times"
        (click)="dialogRef.close()"
      />
      <p-button
        label="Guardar"
        icon="pi pi-save"
        type="submit"
        rounded
        [loading]="state.isLoading()"
      />
    </div>
  </form> `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesFormComponent implements OnInit {
  public form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    entry_time: new FormControl<string | null>(null),
    lunch_start_time: new FormControl<string | null>(null),
    lunch_end_time: new FormControl<string | null>(null),
    exit_time: new FormControl<string | null>(null),
    day_off: new FormControl(false, { nonNullable: true }),
    minutes_tolerance: new FormControl(0, { nonNullable: true }),
    no_tolerance: new FormControl(false, { nonNullable: true }),
    color: new FormControl('', { nonNullable: true }),
  });

  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public state = inject(SchedulesStore);
  private message = inject(MessageService);

  public colorVariants = colorVariants;
  public colors = Object.entries(colorVariants).map(([key, value]) => ({
    key,
    value,
  }));

  ngOnInit() {
    const { schedule } = this.dialog.data;
    if (schedule) {
      const { id, name, minutes_tolerance, color } = schedule;
      let { entry_time, lunch_end_time, lunch_start_time, exit_time } =
        schedule;
      entry_time = this.setTime(entry_time);
      lunch_end_time = this.setTime(lunch_end_time);
      lunch_start_time = this.setTime(lunch_start_time);
      exit_time = this.setTime(exit_time);
      const no_tolerance = minutes_tolerance === 0;
      this.form.patchValue({
        id,
        name,
        color,
        minutes_tolerance,
        no_tolerance,
        entry_time,
        lunch_end_time,
        lunch_start_time,
        exit_time,
      });
    }

    // Watch no_tolerance toggle and update minutes_tolerance accordingly
    this.form.get('no_tolerance')?.valueChanges.subscribe((noTolerance) => {
      if (noTolerance) {
        this.form.patchValue({ minutes_tolerance: 0 }, { emitEvent: false });
      }
    });
  }

  saveChanges() {
    if (this.form.invalid) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor, complete todos los campos.',
      });
      this.form.markAllAsTouched();
      return;
    }
    const { id, name, minutes_tolerance, day_off, color, no_tolerance } =
      this.form.getRawValue();
    let { entry_time, lunch_end_time, lunch_start_time, exit_time } =
      this.form.getRawValue();
    entry_time = entry_time ? format(entry_time, 'HH:mm:ss') : null;
    lunch_end_time = lunch_end_time ? format(lunch_end_time, 'HH:mm:ss') : null;
    lunch_start_time = lunch_start_time
      ? format(lunch_start_time, 'HH:mm:ss')
      : null;
    exit_time = exit_time ? format(exit_time, 'HH:mm:ss') : null;
    // Ensure minutes_tolerance is 0 if no_tolerance is true
    const finalTolerance = no_tolerance ? 0 : minutes_tolerance;
    const request = {
      id,
      name,
      color,
      entry_time,
      lunch_end_time,
      lunch_start_time,
      exit_time,
      minutes_tolerance: finalTolerance,
      day_off,
    };
    if (this.dialog.data.schedule) {
      this.state
        .editItem(request)
        .pipe()
        .subscribe(() => this.dialogRef.close());
    } else {
      this.state
        .createItem(request)
        .pipe()
        .subscribe(() => this.dialogRef.close());
    }
  }

  setTime(time: string) {
    const date = new Date();
    const [hours, minutes] = time.split(':');
    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
    return date;
  }
}
