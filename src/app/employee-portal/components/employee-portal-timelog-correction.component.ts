import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

type CorrectionTypeOption = {
  label: string;
  value: string;
};

@Component({
  selector: 'pt-employee-portal-timelog-correction',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    DatePicker,
    InputTextarea,
    FileUpload,
    Button,
    Select,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-orange-400"></i>
            <span>Marcación Errónea</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [outlined]="true"
              (onClick)="closeSection.emit()"
              pTooltip="Volver a Gestiones"
              [style]="{ width: '2.5rem', height: '2.5rem' }"
            />
          </div>
        </div>
      </ng-template>
      <ng-template #subtitle
        >Solicita corrección de una marcación de asistencia</ng-template
      >

      <div
        class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calendar text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Fecha de Marcación
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2 font-medium">
              <i class="pi pi-calendar mr-2"></i>Fecha
            </label>
            <p-datepicker
              [ngModel]="correctionDate"
              (ngModelChange)="correctionDateChange.emit($event)"
              appendTo="body"
              [maxDate]="today"
              class="w-full"
              placeholder="Selecciona la fecha"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2 font-medium">
              <i class="pi pi-tag mr-2"></i>Tipo de Corrección
            </label>
            <p-select
              [options]="correctionTypes"
              [ngModel]="correctionType"
              (ngModelChange)="correctionTypeChange.emit($event)"
              placeholder="Selecciona tipo"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div
        class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-comment text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Motivo de Corrección
          </h3>
        </div>
        <textarea
          id="correction-reason"
          pInputTextarea
          [ngModel]="correctionReason"
          (ngModelChange)="correctionReasonChange.emit($event)"
          rows="3"
          placeholder="Explica brevemente por qué necesitas esta corrección..."
          class="w-full"
        ></textarea>
      </div>

      <div
        class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Documento de Soporte (Opcional)
          </h3>
        </div>
        <p-fileUpload
          mode="basic"
          accept="image/*,.pdf"
          maxFileSize="5000000"
          [auto]="false"
          chooseLabel="Seleccionar Archivo"
          (onSelect)="handleFileSelect($event)"
          class="w-full"
        />
        <p class="text-xs text-gray-500 mt-2">
          Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
        </p>
        @if (correctionFile) {
        <div
          class="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-file text-orange-400"></i>
            <span class="text-sm text-gray-300">{{ correctionFile.name }}</span>
          </div>
          <p-button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            (onClick)="correctionFileChange.emit(null)"
            pTooltip="Eliminar archivo"
          />
        </div>
        }
      </div>

      <div
        class="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-lg bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-400/30 shadow-lg"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-info-circle text-orange-400 text-xl"></i>
          </div>
          <div>
            <p class="text-sm text-gray-400 m-0">Tipo de solicitud</p>
            <p class="text-lg font-bold text-orange-300 m-0">
              {{ getCorrectionTypeLabel(correctionType) }}
            </p>
          </div>
        </div>
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-send"
          [loading]="submitting"
          [disabled]="!canSubmit || submitting"
          (onClick)="submitRequest.emit()"
          class="ml-auto"
        />
      </div>
    </p-card>
  `,
})
export class EmployeePortalTimelogCorrectionComponent {
  @Input() correctionDate: Date | null = null;
  @Output() correctionDateChange = new EventEmitter<Date | null>();
  @Input() correctionType = '';
  @Output() correctionTypeChange = new EventEmitter<string>();
  @Input() correctionReason = '';
  @Output() correctionReasonChange = new EventEmitter<string>();
  @Input() correctionFile: File | null = null;
  @Output() correctionFileChange = new EventEmitter<File | null>();
  @Input() canSubmit = false;
  @Input() submitting = false;
  @Input() today: Date = new Date();
  @Output() submitRequest = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();

  public correctionTypes: CorrectionTypeOption[] = [
    { label: 'Olvidé marcar entrada', value: 'missing_entry' },
    { label: 'Olvidé marcar salida', value: 'missing_exit' },
    { label: 'Olvidé marcar inicio de almuerzo', value: 'missing_lunch_start' },
    { label: 'Olvidé marcar fin de almuerzo', value: 'missing_lunch_end' },
    { label: 'Marcación incorrecta', value: 'incorrect_mark' },
    { label: 'Falla del dispositivo', value: 'device_failure' },
    { label: 'Otro', value: 'other' },
  ];

  public handleFileSelect(event: any): void {
    const file = event?.files?.[0] ?? null;
    this.correctionFileChange.emit(file);
  }

  public getCorrectionTypeLabel(value: string): string {
    const type = this.correctionTypes.find((t) => t.value === value);
    return type?.label || 'Selecciona el tipo';
  }
}
