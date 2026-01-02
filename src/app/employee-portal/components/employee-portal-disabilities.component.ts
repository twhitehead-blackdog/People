import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'pt-employee-portal-disabilities',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    DatePicker,
    Textarea,
    FileUpload,
    Button,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-file-medical text-cyan-400"></i>
            <span>Subir Incapacidad</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [outlined]="true"
              (onClick)="closeManagement.emit()"
              pTooltip="Volver a Gestiones"
              [style]="{ width: '2.5rem', height: '2.5rem' }"
            />
          </div>
        </div>
      </ng-template>
      <ng-template #subtitle>Carga documentos de incapacidad médica</ng-template>

      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
          >
            <i class="pi pi-calendar text-cyan-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 1: Período de Incapacidad
          </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2 font-medium">
              <i class="pi pi-calendar-plus mr-2"></i>Inicio de Incapacidad
            </label>
            <p-datepicker
              [ngModel]="startDate"
              (ngModelChange)="startDateChange.emit($event)"
              appendTo="body"
              class="w-full"
              placeholder="Selecciona fecha inicio"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2 font-medium">
              <i class="pi pi-calendar-minus mr-2"></i>Fin de Incapacidad
            </label>
            <p-datepicker
              [ngModel]="endDate"
              (ngModelChange)="endDateChange.emit($event)"
              appendTo="body"
              class="w-full"
              placeholder="Selecciona fecha fin"
            />
          </div>
        </div>
      </div>

      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
          >
            <i class="pi pi-comment text-cyan-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Descripción (Opcional)
          </h3>
        </div>
        <textarea
          id="disability-description"
          pInputTextarea
          [ngModel]="description"
          (ngModelChange)="descriptionChange.emit($event)"
          rows="3"
          placeholder="Describe el motivo de la incapacidad..."
          class="w-full"
        ></textarea>
      </div>

      <div class="mb-6 p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-cyan-400"></i>
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
            class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center"
          >
            <i class="pi pi-check-circle text-cyan-400 text-xl"></i>
          </div>
          <div>
            <p class="text-sm text-gray-400 m-0">Período de Incapacidad</p>
            <p class="text-xl font-bold text-cyan-300 m-0">
              {{ calculateDays(startDate, endDate) }} día(s)
            </p>
          </div>
        </div>
        }
        <p-button
          label="Subir Incapacidad"
          icon="pi pi-upload"
          [loading]="uploading"
          [disabled]="
            !startDate ||
            !endDate ||
            !selectedFile ||
            uploading
          "
          (onClick)="submit.emit()"
          class="ml-auto"
        />
      </div>
    </p-card>
  `,
})
export class EmployeePortalDisabilitiesComponent {
  @Input() startDate: Date | null = null;
  @Output() startDateChange = new EventEmitter<Date | null>();
  @Input() endDate: Date | null = null;
  @Output() endDateChange = new EventEmitter<Date | null>();
  @Input() description = '';
  @Output() descriptionChange = new EventEmitter<string>();
  @Input() selectedFile: File | null = null;
  @Output() fileChange = new EventEmitter<File | null>();
  @Input() uploading = false;
  @Output() submit = new EventEmitter<void>();
  @Output() closeManagement = new EventEmitter<void>();
  @Input() calculateDays: (start: Date, end: Date) => number = () => 0;

  public handleFileSelect(event: any): void {
    const file = event?.files?.[0] ?? null;
    this.fileChange.emit(file);
  }
}
