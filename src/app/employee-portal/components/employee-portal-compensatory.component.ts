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
import { TooltipModule } from 'primeng/tooltip';
import { Employee } from '../../models';

@Component({
  selector: 'pt-employee-portal-compensatory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    DatePicker,
    FileUpload,
    InputTextarea,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-cyan-400"></i>
            <span>{{
              isBranchManagerView
                ? 'Solicitar Compensatorio para Empleado'
                : 'Solicitar Tiempo Compensatorio'
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-question-circle"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [outlined]="true"
              (onClick)="openTutorial.emit()"
              pTooltip="¿Cómo funciona el tiempo compensatorio?"
              [style]="{ width: '2.5rem', height: '2.5rem' }"
            />
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
      <ng-template #subtitle>
        Solicita tiempo compensatorio basado en tus horas extras trabajadas
      </ng-template>

      <div class="space-y-6 mt-4">
        <!-- Información del empleado seleccionado (solo en vista branch manager) -->
        @if (isBranchManagerView && selectedEmployee) {
        <div
          class="p-4 bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-400/30 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <span class="text-cyan-400 font-semibold text-lg">
                {{ selectedEmployee.first_name?.charAt(0)
                }}{{ selectedEmployee.father_name?.charAt(0) }}
              </span>
            </div>
            <div>
              <h4 class="text-white font-semibold text-lg">
                {{ selectedEmployee.first_name }}
                {{ selectedEmployee.father_name }}
              </h4>
              <p class="text-cyan-300 text-sm">
                {{ selectedEmployee.position?.name }} •
                {{ selectedEmployee.branch?.name }}
              </p>
              <p class="text-gray-400 text-xs">
                #{{ selectedEmployee.employee_number }}
              </p>
            </div>
          </div>
        </div>
        }

        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <i class="pi pi-list text-cyan-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 1: Selecciona el Tipo
            </h3>
          </div>
          <div class="flex gap-6">
            <div
              class="flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
              [class.border-cyan-400]="compensatoryType === 'hours'"
              [class.border-neutral-600]="compensatoryType !== 'hours'"
              [ngClass]="{
                'bg-cyan-500/10': compensatoryType === 'hours',
                'bg-neutral-700/30': compensatoryType !== 'hours'
              }"
              (click)="compensatoryTypeChange.emit('hours')"
            >
              <div class="flex items-center gap-3">
                <input
                  type="radio"
                  id="compensatory-hours"
                  name="compensatory-type"
                  [value]="'hours'"
                  [checked]="compensatoryType === 'hours'"
                />
                <label
                  for="compensatory-hours"
                  class="text-base font-medium text-gray-300 cursor-pointer flex-1"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-clock text-cyan-400"></i>
                    <span>Horas</span>
                  </div>
                </label>
              </div>
              <p class="text-xs text-gray-400 mt-2 ml-8">
                Solicita compensatorio por horas específicas
              </p>
            </div>
            <div
              class="flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
              [class.border-cyan-400]="compensatoryType === 'days'"
              [class.border-neutral-600]="compensatoryType !== 'days'"
              [ngClass]="{
                'bg-cyan-500/10': compensatoryType === 'days',
                'bg-neutral-700/30': compensatoryType !== 'days'
              }"
              (click)="compensatoryTypeChange.emit('days')"
            >
              <div class="flex items-center gap-3">
                <input
                  type="radio"
                  id="compensatory-days"
                  name="compensatory-type"
                  [value]="'days'"
                  [checked]="compensatoryType === 'days'"
                />
                <label
                  for="compensatory-days"
                  class="text-base font-medium text-gray-300 cursor-pointer flex-1"
                >
                  <div class="flex items-center gap-2">
                    <i class="pi pi-calendar text-cyan-400"></i>
                    <span>Días</span>
                  </div>
                </label>
              </div>
              <p class="text-xs text-gray-400 mt-2 ml-8">
                Solicita compensatorio por días completos
              </p>
            </div>
          </div>
        </div>

        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <i class="pi pi-calendar text-cyan-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 2: Fecha del Compensatorio
            </h3>
          </div>

          @if (compensatoryType === 'hours') {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2 font-medium">
                <i class="pi pi-calendar mr-2"></i>Fecha
              </label>
              <p-datepicker
                [ngModel]="compensatoryDate"
                (ngModelChange)="compensatoryDateChange.emit($event)"
                appendTo="body"
                class="w-full"
                [minDate]="minPastDate"
                placeholder="Selecciona la fecha"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2 font-medium">
                <i class="pi pi-clock mr-2"></i>Hora Inicio
              </label>
              <p-datepicker
                [ngModel]="compensatoryTimeStart"
                (ngModelChange)="compensatoryTimeStartChange.emit($event)"
                appendTo="body"
                class="w-full"
                timeOnly
                hourFormat="12"
                stepMinute="60"
                stepSecond="0"
                hideSeconds="true"
                placeholder="Hora inicio"
                [showIcon]="true"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2 font-medium">
                <i class="pi pi-clock mr-2"></i>Hora Fin
              </label>
              <p-datepicker
                [ngModel]="compensatoryTimeEnd"
                (ngModelChange)="compensatoryTimeEndChange.emit($event)"
                appendTo="body"
                class="w-full"
                timeOnly
                hourFormat="12"
                stepMinute="60"
                stepSecond="0"
                hideSeconds="true"
                placeholder="Hora fin"
                [showIcon]="true"
              />
            </div>
          </div>
          } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2 font-medium">
                <i class="pi pi-calendar-plus mr-2"></i>Fecha de Inicio
              </label>
              <p-datepicker
                [ngModel]="compensatoryStartDate"
                (ngModelChange)="compensatoryStartDateChange.emit($event)"
                appendTo="body"
                class="w-full"
                [minDate]="minPastDate"
                placeholder="Selecciona fecha inicio"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-2 font-medium">
                <i class="pi pi-calendar-minus mr-2"></i>Fecha de Fin
              </label>
              <p-datepicker
                [ngModel]="compensatoryEndDate"
                (ngModelChange)="compensatoryEndDateChange.emit($event)"
                appendTo="body"
                class="w-full"
                [minDate]="compensatoryStartDate || minPastDate"
                placeholder="Selecciona fecha fin"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
              />
            </div>
          </div>
          }
        </div>

        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <i class="pi pi-comment text-cyan-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 3: Motivo (Opcional)
            </h3>
          </div>
          <textarea
            pInputTextarea
            [ngModel]="compensatoryReason"
            (ngModelChange)="compensatoryReasonChange.emit($event)"
            rows="3"
            placeholder="Describe el motivo de la solicitud..."
            class="w-full"
          ></textarea>
        </div>

        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <i class="pi pi-clock text-cyan-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 4: Fechas donde trabajé horas extra
            </h3>
          </div>
          <p class="text-sm text-gray-400 mb-4">
            Ingresa manualmente las fechas donde trabajaste horas extra. RRHH
            revisará esta información junto con tus marcaciones para verificar
            que el tiempo solicitado es correcto.
          </p>

          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-2"
              >Agregar fecha</label
            >
            <p-datepicker
              [ngModel]="newOvertimeDate"
              (ngModelChange)="onDateSelected($event)"
              appendTo="body"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona una fecha (se agrega automáticamente)"
              [maxDate]="today"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">
              Selecciona una fecha y se agregará automáticamente a la lista
            </p>
          </div>

          @if (!manualOvertimeDates.length) {
          <div
            class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <i class="pi pi-info-circle text-yellow-400 text-xl"></i>
              <div>
                <p class="text-yellow-300 font-semibold mb-1">
                  No hay fechas agregadas
                </p>
                <p class="text-sm text-gray-300">
                  Agrega las fechas donde trabajaste horas extra usando el campo
                  de arriba.
                </p>
              </div>
            </div>
          </div>
          } @else {
          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-300 mb-3">
              Fechas agregadas ({{ manualOvertimeDates.length }}):
            </h4>
            <div class="flex flex-col gap-2">
              @for (date of manualOvertimeDates; track $index) {
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-700/50 border border-neutral-600/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-calendar text-cyan-400"></i>
                  <span class="text-white font-medium">
                    {{ date | date : 'fullDate' }}
                  </span>
                </div>
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="removeManualDate.emit($index)"
                  pTooltip="Eliminar fecha"
                />
              </div>
              }
            </div>
          </div>
          }

          <div
            class="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
          >
            <div class="flex items-start gap-2">
              <i class="pi pi-info-circle text-cyan-400 mt-0.5"></i>
              <div>
                <p class="text-sm text-gray-300">
                  <strong>Nota para RRHH:</strong> Esta información será
                  revisada junto con las marcaciones del empleado para verificar
                  las horas extra trabajadas y aprobar la solicitud.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <i class="pi pi-file text-cyan-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 5: Documento Físico (Opcional)
            </h3>
          </div>
          <p class="text-sm text-gray-400 mb-4">
            Si tienes una solicitud física firmada, puedes adjuntarla como PDF
            para respaldar tu solicitud.
          </p>
          <p-fileUpload
            mode="basic"
            accept=".pdf"
            maxFileSize="5000000"
            [auto]="false"
            chooseLabel="Seleccionar PDF"
            (onSelect)="handleFileSelect($event)"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-2">
            Formato permitido: PDF (máx. 5MB)
          </p>
          @if (compensatoryFile) {
          <div
            class="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-file text-cyan-400"></i>
              <span class="text-sm text-gray-300">{{
                compensatoryFile.name
              }}</span>
            </div>
            <p-button
              icon="pi pi-times"
              severity="danger"
              text
              rounded
              size="small"
              (onClick)="compensatoryFileChange.emit(null)"
              pTooltip="Eliminar archivo"
            />
          </div>
          }
        </div>

        <div
          class="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-400/30 shadow-lg"
        >
          @if (compensatoryAmount > 0) {
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center"
            >
              <i class="pi pi-check-circle text-cyan-400 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-400 m-0">Total a Solicitar</p>
              <p class="text-xl font-bold text-cyan-300 m-0">
                @if (compensatoryType === 'hours') {
                {{ compensatoryAmount.toFixed(1) }} hora(s) } @else {
                {{ compensatoryAmount }} día(s) }
              </p>
            </div>
          </div>
          }
          <p-button
            label="Solicitar Tiempo Compensatorio"
            icon="pi pi-send"
            [loading]="submitting"
            [disabled]="!canSubmit || submitting"
            (onClick)="submitRequest.emit()"
            class="ml-auto"
          />
        </div>
      </div>
    </p-card>
  `,
})
export class EmployeePortalCompensatoryComponent {
  @Input() compensatoryType: 'hours' | 'days' = 'hours';
  @Output() compensatoryTypeChange = new EventEmitter<'hours' | 'days'>();
  @Input() compensatoryDate: Date | null = null;
  @Output() compensatoryDateChange = new EventEmitter<Date | null>();
  @Input() compensatoryTimeStart: Date | null = null;
  @Output() compensatoryTimeStartChange = new EventEmitter<Date | null>();
  @Input() compensatoryTimeEnd: Date | null = null;
  @Output() compensatoryTimeEndChange = new EventEmitter<Date | null>();
  @Input() compensatoryStartDate: Date | null = null;
  @Output() compensatoryStartDateChange = new EventEmitter<Date | null>();
  @Input() compensatoryEndDate: Date | null = null;
  @Output() compensatoryEndDateChange = new EventEmitter<Date | null>();
  @Input() compensatoryReason = '';
  @Output() compensatoryReasonChange = new EventEmitter<string>();
  @Input() manualOvertimeDates: Date[] = [];
  @Input() newOvertimeDate: Date | null = null;
  @Output() newOvertimeDateChange = new EventEmitter<Date | null>();
  @Output() addManualDate = new EventEmitter<Date>();
  @Output() removeManualDate = new EventEmitter<number>();
  @Input() compensatoryAmount = 0;
  @Input() isBranchManagerView = false;
  @Input() selectedEmployee: Employee | null = null;
  @Input() availableEmployees: { id: string; short_name: string }[] = [];
  @Input() selectedEmployeeId: string | null = null;
  @Output() selectedEmployeeIdChange = new EventEmitter<string | null>();
  @Input() canSubmit = false;
  @Input() submitting = false;
  @Input() minPastDate: Date = new Date();
  @Input() today: Date = new Date();
  @Input() compensatoryFile: File | null = null;
  @Output() compensatoryFileChange = new EventEmitter<File | null>();
  @Output() submitRequest = new EventEmitter<void>();
  @Output() openTutorial = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();
  @Output() viewRequests = new EventEmitter<void>();

  public handleFileSelect(event: any): void {
    const file = event?.files?.[0] ?? null;
    this.compensatoryFileChange.emit(file);
  }

  public onDateSelected(date: Date | null): void {
    if (date) {
      // Pass the date directly to avoid race condition with signal update
      this.addManualDate.emit(date);
      // Clear input field for next selection
      this.newOvertimeDateChange.emit(null);
    }
  }
}
