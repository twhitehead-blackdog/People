import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputTextarea } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-employee-portal-disabilities',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePicker,
    InputTextarea,
    FileUpload,
    Button,
    TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="portal-form-panel rounded-2xl">
      <div class="flex items-center gap-3 mb-5">
        <button class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer" (click)="closeManagement.emit()">
          <i class="pi pi-arrow-left text-sm"></i>
        </button>
        <div>
          <h2 class="text-lg font-bold text-white m-0 tracking-tight">Incapacidades</h2>
          <p class="text-xs text-gray-500 m-0 mt-0.5">Carga documentos de incapacidad médica</p>
        </div>
      </div>

      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calendar text-blue-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Período de Incapacidad
          </h3>
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
              [maxDate]="endDate || undefined"
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
      </div>

      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-blue-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Descripción
          </h3>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300">Motivo de la incapacidad</label>
          <textarea
            pInputTextarea
            [ngModel]="description"
            (ngModelChange)="descriptionChange.emit($event)"
            rows="4"
            placeholder="Describe el motivo de la incapacidad"
            class="w-full"
          ></textarea>
        </div>
      </div>

      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-blue-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Documento de Incapacidad
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
        @if (selectedFile) {
        <div
          class="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-file text-cyan-400"></i>
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

      <div
        class="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-400/30 shadow-lg"
      >
        @if (startDate && endDate) {
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
          >
            <i class="pi pi-check-circle text-blue-400 text-xl"></i>
          </div>
          <div>
            <p class="text-sm text-gray-400 m-0">Período de Incapacidad</p>
            <p class="text-xl font-bold text-blue-300 m-0">
              {{ calculateDays(startDate, endDate) }} día(s)
            </p>
          </div>
        </div>
        }
      </div>

      <!-- Botones de Acción -->
      <div class="flex justify-between pt-4">
        <p-button
          label="Volver"
          icon="pi pi-arrow-left"
          severity="secondary"
          (onClick)="closeManagement.emit()"
        />
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-check"
          [loading]="uploading"
          [disabled]="
            !startDate ||
            !endDate ||
            !selectedFile ||
            !description.trim() ||
            uploading
          "
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
        <button class="text-gray-400 hover:text-white" (click)="closeManagement.emit()">
          <i class="pi pi-arrow-left text-lg"></i>
        </button>
        <div>
          <h2 class="text-lg font-bold text-white m-0">Incapacidades</h2>
          <p class="text-xs text-gray-400 m-0">Carga documentos de incapacidad médica</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <!-- Período -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-calendar text-blue-400"></i>
            Período de Incapacidad
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
                [maxDate]="endDate || undefined"
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
          @if (startDate && endDate) {
          <div class="mt-2 p-2 bg-blue-500/10 border border-blue-400/30 rounded-lg">
            <p class="text-xs text-blue-300 m-0">
              <i class="pi pi-info-circle mr-1"></i>
              Total: <strong>{{ calculateDays(startDate, endDate) }} día(s)</strong>
            </p>
          </div>
          }
        </div>

        <!-- Descripción -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file-edit text-blue-400"></i>
            Descripción
          </h3>
          <textarea
            pInputTextarea
            [ngModel]="description"
            (ngModelChange)="descriptionChange.emit($event)"
            rows="3"
            placeholder="Motivo de la incapacidad"
            class="w-full"
          ></textarea>
        </div>

        <!-- Documento -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file text-blue-400"></i>
            Documento de Incapacidad
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
          @if (selectedFile) {
          <div class="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-file text-cyan-400 text-sm"></i>
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
          [loading]="uploading"
          [disabled]="!startDate || !endDate || !selectedFile || !description.trim() || uploading"
          (onClick)="submitRequest.emit()"
          severity="success"
          styleClass="w-full min-h-[44px]"
        />
      </div>
    </div>
    }
  `,
})
export class EmployeePortalDisabilitiesComponent {
  protected device = inject(DeviceService);
  @Input() startDate: Date | null = null;
  @Output() startDateChange = new EventEmitter<Date | null>();
  @Input() endDate: Date | null = null;
  @Output() endDateChange = new EventEmitter<Date | null>();
  @Input() description = '';
  @Output() descriptionChange = new EventEmitter<string>();
  @Input() selectedFile: File | null = null;
  @Output() fileChange = new EventEmitter<File | null>();
  @Input() uploading = false;
  @Output() submitRequest = new EventEmitter<void>();
  @Output() closeManagement = new EventEmitter<void>();
  @Input() calculateDays: (start: Date, end: Date) => number = () => 0;

  public handleFileSelect(event: any): void {
    const files = event?.currentFiles || event?.files;
    const file = files?.[0] ?? null;
    this.fileChange.emit(file);
  }
}
