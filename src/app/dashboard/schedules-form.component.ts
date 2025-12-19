import { NgClass, NgStyle } from '@angular/common';
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
    NgClass,
    NgStyle,
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
        <label for="lunch_start_time">Hora inicio almuerzo</label>
        <p-datepicker
          inputId="lunch_start_time"
          timeOnly
          formControlName="lunch_start_time"
          hourFormat="12"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="lunch_end_time">Hora fin almuerzo</label>
        <p-datepicker
          inputId="lunch_end_time"
          timeOnly
          formControlName="lunch_end_time"
          hourFormat="12"
          appendTo="body"
        />
      </div>
      <div class="input-container">
        <label for="exit_time">Hora salida</label>
        <p-datepicker
          inputId="exit_time"
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
        <label for="no_tolerance"
          >Sin tiempo de gracia (horario estricto)</label
        >
      </div>
      <div class="input-container col-span-2 md:col-span-4">
        <label for="color">Color</label>
        <div class="flex flex-col gap-3">
          <!-- Colores recomendados -->
          <div class="flex flex-wrap gap-2">
            @for(color of recommendedColors; track color.key) {
            <button
              type="button"
              class="rounded h-10 w-10 flex items-center justify-center transition-all hover:scale-110 hover:ring-2 hover:ring-offset-2 ring-neutral-400"
              [ngClass]="[
                colorVariants[color.key],
                form.get('color')?.value === color.key
                  ? 'ring-2 ring-offset-2 ring-neutral-600 scale-110'
                  : ''
              ]"
              (click)="selectRecommendedColor(color.key)"
              [title]="color.name"
            >
              @if(form.get('color')?.value === color.key) {
              <i class="pi pi-check text-xs"></i>
              }
            </button>
            }
          </div>

          <!-- Selector RGB personalizado -->
          <div class="flex items-center gap-3 border-t pt-3">
            <label for="custom-color" class="text-sm whitespace-nowrap"
              >Color personalizado (RGB):</label
            >
            <input
              type="color"
              id="custom-color"
              class="h-10 w-20 rounded cursor-pointer"
              [value]="getCustomColorValue()"
              (input)="onCustomColorChange($event)"
            />
            <input
              type="text"
              pInputText
              placeholder="rgb(255, 0, 0)"
              class="flex-1"
              [value]="getCustomColorText()"
              (input)="onCustomColorTextChange($event)"
            />
            @if(isCustomColor()) {
            <button
              type="button"
              class="rounded h-10 w-10 flex items-center justify-center transition-all hover:scale-110 ring-2 ring-offset-2 ring-neutral-600"
              [style.background-color]="getCustomColorValue()"
              [style.color]="getTextColorForBackground(getCustomColorValue())"
              title="Color seleccionado"
            >
              <i class="pi pi-check text-xs"></i>
            </button>
            }
          </div>
        </div>
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

  // Colores recomendados con nombres descriptivos (20 colores variados)
  public recommendedColors = [
    { key: 'blue', name: 'Azul' },
    { key: 'blue-400', name: 'Azul medio' },
    { key: 'blue-500', name: 'Azul intenso' },
    { key: 'green', name: 'Verde' },
    { key: 'green-400', name: 'Verde medio' },
    { key: 'green-500', name: 'Verde intenso' },
    { key: 'yellow', name: 'Amarillo' },
    { key: 'yellow-400', name: 'Amarillo medio' },
    { key: 'orange', name: 'Naranja' },
    { key: 'orange-400', name: 'Naranja medio' },
    { key: 'red', name: 'Rojo' },
    { key: 'red-400', name: 'Rojo medio' },
    { key: 'purple', name: 'Morado' },
    { key: 'purple-400', name: 'Morado medio' },
    { key: 'pink', name: 'Rosa' },
    { key: 'pink-400', name: 'Rosa medio' },
    { key: 'teal', name: 'Verde azulado' },
    { key: 'cyan', name: 'Cian' },
    { key: 'indigo', name: 'Índigo' },
    { key: 'amber', name: 'Ámbar' },
  ];

  ngOnInit() {
    const { schedule } = this.dialog.data;
    if (schedule) {
      const { id, name, minutes_tolerance, color, day_off } = schedule;
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
        color: color || '',
        minutes_tolerance: minutes_tolerance || 0,
        no_tolerance,
        day_off: day_off || false,
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
        ['editItem'](request)
        .pipe()
        .subscribe(() => this.dialogRef.close());
    } else {
      this.state
        ['createItem'](request)
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

  // Seleccionar color recomendado
  selectRecommendedColor(colorKey: string) {
    this.form.patchValue({ color: colorKey });
  }

  // Verificar si el color actual es personalizado (RGB)
  isCustomColor(): boolean {
    const currentColor = this.form.get('color')?.value;
    if (!currentColor) return false;
    // Si no está en los colores recomendados, es personalizado
    return !this.recommendedColors.some((c) => c.key === currentColor);
  }

  // Obtener valor RGB del color personalizado para el input color
  getCustomColorValue(): string {
    const currentColor = this.form.get('color')?.value;
    if (!currentColor) return '#3b82f6'; // Azul por defecto

    // Si es un color recomendado, convertir a hex
    if (!this.isCustomColor()) {
      return this.colorKeyToHex(currentColor);
    }

    // Si es RGB, convertir a hex
    if (currentColor.startsWith('rgb(')) {
      return this.rgbToHex(currentColor);
    }

    // Si ya es hex, retornar
    if (currentColor.startsWith('#')) {
      return currentColor;
    }

    return '#3b82f6';
  }

  // Obtener texto RGB del color personalizado
  getCustomColorText(): string {
    const currentColor = this.form.get('color')?.value;
    if (!currentColor) return '';

    if (this.isCustomColor()) {
      if (currentColor.startsWith('rgb(')) {
        return currentColor;
      }
      if (currentColor.startsWith('#')) {
        return this.hexToRgb(currentColor);
      }
    }

    return '';
  }

  // Manejar cambio del input color
  onCustomColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const hexColor = input.value;
    const rgbColor = this.hexToRgb(hexColor);
    this.form.patchValue({ color: rgbColor });
  }

  // Manejar cambio del input de texto RGB
  onCustomColorTextChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    // Validar formato RGB
    const rgbRegex = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
    if (rgbRegex.test(value)) {
      this.form.patchValue({ color: value });
    }
  }

  // Convertir color key a hex (aproximado)
  private colorKeyToHex(colorKey: string): string {
    const colorMap: Record<string, string> = {
      slate: '#cbd5e1',
      yellow: '#fde047',
      green: '#86efac',
      sky: '#7dd3fc',
      indigo: '#a5b4fc',
      orange: '#fdba74',
      purple: '#c4b5fd',
      red: '#fca5a5',
      pink: '#f9a8d4',
      teal: '#5eead4',
      cyan: '#67e8f9',
      emerald: '#6ee7b7',
      lime: '#bef264',
      amber: '#fcd34d',
      rose: '#fda4af',
      violet: '#c4b5fd',
      fuchsia: '#f0abfc',
      blue: '#93c5fd',
      stone: '#d6d3d1',
      neutral: '#d4d4d4',
      zinc: '#d4d4d8',
      gray: '#d1d5db',
    };
    return colorMap[colorKey] || '#3b82f6';
  }

  // Convertir RGB a Hex
  private rgbToHex(rgb: string): string {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#3b82f6';

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);

    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  // Convertir Hex a RGB
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 'rgb(59, 130, 246)';

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // Determinar color de texto según el fondo
  public getTextColorForBackground(hexColor: string): string {
    const rgb = this.hexToRgb(hexColor);
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);

    // Calcular luminosidad
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
