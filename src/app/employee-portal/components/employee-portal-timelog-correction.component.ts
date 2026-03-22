import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DeviceService } from '../../services/device.service';

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
    DatePicker,
    InputTextarea,
    FileUpload,
    Button,
    Select,
    TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="portal-form-panel rounded-2xl">
      <div class="flex items-center gap-3 mb-5">
        <button class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer" (click)="closeSection.emit()">
          <i class="pi pi-arrow-left text-sm"></i>
        </button>
        <div>
          <h2 class="text-lg font-bold text-white m-0 tracking-tight">Omisión de Marcación</h2>
          <p class="text-xs text-gray-500 m-0 mt-0.5">Solicita corrección de una marcación</p>
        </div>
      </div>

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
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Fecha de la omisión</label>
            <p-datepicker
              [ngModel]="correctionDate"
              (ngModelChange)="correctionDateChange.emit($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [maxDate]="today"
              styleClass="w-full"
              appendTo="body"
              placeholder="Selecciona la fecha"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Tipo de marcación</label>
            <p-select
              [options]="correctionTypes"
              [ngModel]="correctionType"
              (ngModelChange)="correctionTypeChange.emit($event)"
              placeholder="Selecciona el tipo"
              styleClass="w-full"
              appendTo="body"
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

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300">Explicación de la corrección</label>
          <textarea
            pInputTextarea
            [ngModel]="correctionReason"
            (ngModelChange)="correctionReasonChange.emit($event)"
            rows="4"
            placeholder="Explica por qué se necesita la corrección de esta marcación"
            class="w-full"
          ></textarea>
        </div>
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
    </div>
    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="px-4 py-4">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <button class="text-gray-400 hover:text-white" (click)="closeSection.emit()">
          <i class="pi pi-arrow-left text-lg"></i>
        </button>
        <div>
          <h2 class="text-lg font-bold text-white m-0">Omisión de Marcación</h2>
          <p class="text-xs text-gray-400 m-0">Corrección de marcación de asistencia</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <!-- Fecha y Tipo -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-calendar text-orange-400"></i>
            Fecha y Tipo
          </h3>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Fecha de la omisión</label>
              <p-datepicker
                [ngModel]="correctionDate"
                (ngModelChange)="correctionDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                [maxDate]="today"
                styleClass="w-full"
                appendTo="body"
                placeholder="Selecciona la fecha"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Tipo de marcación</label>
              <p-select
                [options]="correctionTypes"
                [ngModel]="correctionType"
                (ngModelChange)="correctionTypeChange.emit($event)"
                placeholder="Selecciona el tipo"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>
        </div>

        <!-- Motivo -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-comment text-orange-400"></i>
            Motivo de Corrección
          </h3>
          <textarea
            pInputTextarea
            [ngModel]="correctionReason"
            (ngModelChange)="correctionReasonChange.emit($event)"
            rows="3"
            placeholder="Explica por qué se necesita la corrección"
            class="w-full"
          ></textarea>
        </div>

        <!-- Documento -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file text-orange-400"></i>
            Documento (Opcional)
          </h3>
          <p-fileUpload
            mode="basic"
            accept="image/*,.pdf"
            maxFileSize="5000000"
            [auto]="false"
            chooseLabel="Seleccionar Archivo"
            (onSelect)="handleFileSelect($event)"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
          @if (correctionFile) {
          <div class="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-file text-orange-400 text-sm"></i>
              <span class="text-xs text-gray-300">{{ correctionFile.name }}</span>
            </div>
            <button class="text-red-400" (click)="correctionFileChange.emit(null)">
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
          }
        </div>

        <!-- Summary -->
        <div class="bg-orange-500/10 border border-orange-400/30 rounded-xl p-3">
          <p class="text-xs text-gray-400 m-0">Tipo de solicitud</p>
          <p class="text-sm font-bold text-orange-300 m-0">{{ getCorrectionTypeLabel(correctionType) }}</p>
        </div>

        <!-- Submit -->
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-send"
          [loading]="submitting"
          [disabled]="!canSubmit || submitting"
          (onClick)="submitRequest.emit()"
          styleClass="w-full min-h-[44px]"
        />
      </div>
    </div>
    }
  `,
})
export class EmployeePortalTimelogCorrectionComponent {
  protected device = inject(DeviceService);
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
    { label: 'Otro', value: 'other' }];

  public handleFileSelect(event: any): void {
    const file = event?.files?.[0] ?? null;
    this.correctionFileChange.emit(file);
  }

  public getCorrectionTypeLabel(value: string): string {
    const type = this.correctionTypes.find((t) => t.value === value);
    return type?.label || 'Selecciona el tipo';
  }
}
