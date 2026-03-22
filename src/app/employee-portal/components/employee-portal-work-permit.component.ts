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

export const PORTAL_PERMIT_TYPE_OPTIONS = [
  { label: 'Defunción', value: 'family_death' },
  { label: 'Personal', value: 'personal' },
  { label: 'Tema Médico', value: 'medical' },
  { label: 'Otros', value: 'other' }];

@Component({
  selector: 'pt-employee-portal-work-permit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePicker,
    FileUpload,
    InputTextarea,
    Select,
    Button,
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
          <h2 class="text-lg font-bold text-white m-0 tracking-tight">Solicitud de Permiso</h2>
          <p class="text-xs text-gray-500 m-0 mt-0.5">Solicita un permiso laboral</p>
        </div>
      </div>

      <!-- Paso 1: Tipo de Permiso -->
      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-id-card text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 1: Tipo de Permiso</h3>
        </div>
        <p-select
          [options]="permitTypeOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="permitType"
          (ngModelChange)="permitTypeChange.emit($event)"
          placeholder="Selecciona el tipo de permiso"
          styleClass="w-full"
          appendTo="body"
        />
      </div>

      <!-- Paso 2: Período -->
      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-calendar text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 2: Período</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Fecha de Inicio</label>
            <p-datepicker
              [ngModel]="startDate"
              (ngModelChange)="startDateChange.emit($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona fecha de inicio"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">Fecha de Fin</label>
            <p-datepicker
              [ngModel]="endDate"
              (ngModelChange)="endDateChange.emit($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona fecha de fin"
              [minDate]="startDate || undefined"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>

        <!-- Hora inicio/fin (opcionales) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">
              Hora de Inicio <span class="text-gray-500 text-xs">(Opcional)</span>
            </label>
            <p-datepicker
              [ngModel]="startTime"
              (ngModelChange)="startTimeChange.emit($event)"
              [showIcon]="true"
              [timeOnly]="true"
              [showTime]="true"
              [hourFormat]="'12'"
              placeholder="Hora inicio"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300">
              Hora de Fin <span class="text-gray-500 text-xs">(Opcional)</span>
            </label>
            <p-datepicker
              [ngModel]="endTime"
              (ngModelChange)="endTimeChange.emit($event)"
              [showIcon]="true"
              [timeOnly]="true"
              [showTime]="true"
              [hourFormat]="'12'"
              placeholder="Hora fin"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>

        @if (equivalentDisplay) {
        <div class="mt-3 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg">
          <p class="text-sm text-amber-300 m-0">
            <i class="pi pi-info-circle mr-2"></i>
            Equivalente: <strong>{{ equivalentDisplay }}</strong>
          </p>
        </div>
        }
      </div>

      <!-- Paso 3: Observaciones -->
      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-file-edit text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">Paso 3: Observaciones</h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="observations"
          (ngModelChange)="observationsChange.emit($event)"
          rows="4"
          placeholder="Describe el motivo del permiso, observaciones adicionales..."
          class="w-full"
        ></textarea>
      </div>

      <!-- Paso 4: Documento (Opcional) -->
      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <i class="pi pi-file text-amber-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 4: Documento <span class="text-gray-400 text-sm font-normal">(Opcional)</span>
          </h3>
        </div>
        <p-fileUpload
          mode="basic"
          accept=".pdf,.jpg,.jpeg,.png"
          maxFileSize="5000000"
          [auto]="false"
          chooseLabel="Seleccionar Archivo"
          (onSelect)="handleFileSelect($event)"
          class="w-full"
        />
        <p class="text-xs text-gray-500 mt-2">Formatos permitidos: PDF, JPG, PNG (máx. 5MB)</p>
        @if (selectedFile) {
        <div class="mt-3 p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-file text-amber-400"></i>
            <span class="text-sm text-gray-300">{{ selectedFile.name }}</span>
          </div>
          <p-button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            (onClick)="fileChange.emit(null)"
            pTooltip="Eliminar archivo"
          />
        </div>
        }
      </div>

      <!-- Botones de Acción -->
      <div class="flex justify-between pt-4">
        <p-button
          label="Volver"
          icon="pi pi-arrow-left"
          severity="secondary"
          (onClick)="closeSection.emit()"
        />
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-check"
          [loading]="submitting"
          [disabled]="!permitType || !startDate || !endDate || submitting"
          (onClick)="submitRequest.emit()"
          severity="success"
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
          <h2 class="text-lg font-bold text-white m-0">Solicitud de Permiso</h2>
          <p class="text-xs text-gray-400 m-0">Solicita un permiso laboral</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <!-- Tipo de Permiso -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-id-card text-amber-400"></i>
            Tipo de Permiso
          </h3>
          <p-select
            [options]="permitTypeOptions"
            optionLabel="label"
            optionValue="value"
            [ngModel]="permitType"
            (ngModelChange)="permitTypeChange.emit($event)"
            placeholder="Selecciona el tipo"
            styleClass="w-full"
            appendTo="body"
          />
        </div>

        <!-- Período -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-calendar text-amber-400"></i>
            Período
          </h3>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Fecha de Inicio</label>
              <p-datepicker
                [ngModel]="startDate"
                (ngModelChange)="startDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Fecha de inicio"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Fecha de Fin</label>
              <p-datepicker
                [ngModel]="endDate"
                (ngModelChange)="endDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Fecha de fin"
                [minDate]="startDate || undefined"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>

          <!-- Hora inicio/fin (opcionales) -->
          <div class="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Hora Inicio</label>
              <p-datepicker
                [ngModel]="startTime"
                (ngModelChange)="startTimeChange.emit($event)"
                [showIcon]="true"
                [timeOnly]="true"
                [showTime]="true"
                [hourFormat]="'12'"
                placeholder="Inicio"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Hora Fin</label>
              <p-datepicker
                [ngModel]="endTime"
                (ngModelChange)="endTimeChange.emit($event)"
                [showIcon]="true"
                [timeOnly]="true"
                [showTime]="true"
                [hourFormat]="'12'"
                placeholder="Fin"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>

          @if (equivalentDisplay) {
          <div class="mt-2 p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg">
            <p class="text-xs text-amber-300 m-0">
              <i class="pi pi-info-circle mr-1"></i>
              Equivalente: <strong>{{ equivalentDisplay }}</strong>
            </p>
          </div>
          }
        </div>

        <!-- Observaciones -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file-edit text-amber-400"></i>
            Observaciones
          </h3>
          <textarea
            pInputTextarea
            [ngModel]="observations"
            (ngModelChange)="observationsChange.emit($event)"
            rows="3"
            placeholder="Motivo del permiso"
            class="w-full"
          ></textarea>
        </div>

        <!-- Documento (Opcional) -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file text-amber-400"></i>
            Documento (Opcional)
          </h3>
          <p-fileUpload
            mode="basic"
            accept=".pdf,.jpg,.jpeg,.png"
            maxFileSize="5000000"
            [auto]="false"
            chooseLabel="Seleccionar Archivo"
            (onSelect)="handleFileSelect($event)"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
          @if (selectedFile) {
          <div class="mt-2 p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-file text-amber-400 text-sm"></i>
              <span class="text-xs text-gray-300">{{ selectedFile.name }}</span>
            </div>
            <button class="text-red-400" (click)="fileChange.emit(null)">
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
          }
        </div>

        <!-- Submit -->
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-check"
          [loading]="submitting"
          [disabled]="!permitType || !startDate || !endDate || submitting"
          (onClick)="submitRequest.emit()"
          severity="success"
          styleClass="w-full min-h-[44px]"
        />
      </div>
    </div>
    }
  `,
})
export class EmployeePortalWorkPermitComponent {
  protected device = inject(DeviceService);

  @Input() permitType: string | null = null;
  @Output() permitTypeChange = new EventEmitter<string | null>();
  @Input() startDate: Date | null = null;
  @Output() startDateChange = new EventEmitter<Date | null>();
  @Input() endDate: Date | null = null;
  @Output() endDateChange = new EventEmitter<Date | null>();
  @Input() startTime: Date | null = null;
  @Output() startTimeChange = new EventEmitter<Date | null>();
  @Input() endTime: Date | null = null;
  @Output() endTimeChange = new EventEmitter<Date | null>();
  @Input() observations = '';
  @Output() observationsChange = new EventEmitter<string>();
  @Input() selectedFile: File | null = null;
  @Output() fileChange = new EventEmitter<File | null>();
  @Input() submitting = false;
  @Input() equivalentDisplay = '';
  @Output() submitRequest = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();

  public permitTypeOptions = PORTAL_PERMIT_TYPE_OPTIONS;

  public handleFileSelect(event: any): void {
    const files = event?.currentFiles || event?.files;
    const file = files?.[0] ?? null;
    this.fileChange.emit(file);
  }
}
