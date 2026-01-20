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
import { ProgressSpinner } from 'primeng/progressspinner';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'pt-employee-portal-vacations',
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
    ProgressSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-calendar-plus text-purple-400"></i>
          <span>{{
            (vacationRequests?.length ?? 0) > 0
              ? 'Mis Solicitudes de Vacaciones'
              : 'Solicitar Vacaciones'
          }}</span>
        </div>
      </ng-template>
      <ng-template #subtitle>{{
        (vacationRequests?.length ?? 0) > 0
          ? 'Visualiza todas tus solicitudes de vacaciones'
          : 'Solicita tus días de vacaciones'
      }}</ng-template>

      <!-- Loading State -->
      @if (requestsLoading) {
      <div class="flex justify-center items-center py-12">
        <div class="flex flex-col items-center gap-3">
          <i class="pi pi-spin pi-spinner text-4xl text-purple-400"></i>
          <p class="text-gray-400">Cargando tus solicitudes...</p>
        </div>
      </div>
      } @else if ((vacationRequests?.length ?? 0) > 0) {
      <!-- List View -->
      <div class="space-y-4">
        @for (request of vacationRequests!; track request.id) {
        <div
          class="bg-gradient-to-r from-neutral-800 to-neutral-800/80 border rounded-xl p-5 hover:shadow-lg transition-all duration-300"
          [ngClass]="{
            'border-yellow-500/30': request.status === 'pending',
            'border-green-500/30': request.status === 'approved',
            'border-red-500/30': request.status === 'rejected'
          }"
        >
          <div class="flex flex-col md:flex-row md:items-start gap-4">
            <!-- Icon and Status -->
            <div class="flex-shrink-0">
              <div
                class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                [ngClass]="{
                  'bg-yellow-500/20': request.status === 'pending',
                  'bg-green-500/20': request.status === 'approved',
                  'bg-red-500/20': request.status === 'rejected'
                }"
              >
                <i class="pi pi-calendar-plus text-purple-400"></i>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"
              >
                <div>
                  <h3 class="text-lg font-semibold text-white mb-1">
                    Solicitud de Vacaciones
                  </h3>
                  <p class="text-sm text-gray-400">
                    Solicitado el
                    {{ request.created_at | date : 'dd/MM/yyyy' }} a las
                    {{ request.created_at | date : 'HH:mm' }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    [class.text-yellow-300]="request.status === 'pending'"
                    [class.text-green-300]="request.status === 'approved'"
                    [class.text-red-300]="request.status === 'rejected'"
                    [ngClass]="{
                      'bg-yellow-500/20': request.status === 'pending',
                      'bg-green-500/20': request.status === 'approved',
                      'bg-red-500/20': request.status === 'rejected'
                    }"
                  >
                    @if (request.status === 'approved') {
                    <i class="pi pi-check-circle"></i>
                    } @else if (request.status === 'rejected') {
                    <i class="pi pi-times-circle"></i>
                    } @else {
                    <i class="pi pi-hourglass"></i>
                    }
                    {{
                      request.status === 'pending'
                        ? 'Pendiente'
                        : request.status === 'approved'
                        ? 'Aprobado'
                        : request.status === 'rejected'
                        ? 'Rechazado'
                        : request.status
                    }}
                  </span>
                </div>
              </div>

              <!-- Vacation Details -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div
                  class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-calendar text-purple-400"></i>
                    <span class="text-xs text-gray-400 font-medium"
                      >Período</span
                    >
                  </div>
                  <p class="text-white font-semibold">
                    {{ request.start_date | date : 'dd/MM/yyyy' }}
                    @if (request.end_date) {
                    <span class="text-gray-400 text-sm block mt-1">
                      hasta {{ request.end_date | date : 'dd/MM/yyyy' }}
                    </span>
                    }
                  </p>
                </div>

                @if (calculateVacationDays() && request.start_date &&
                request.end_date) {
                <div
                  class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-clock text-purple-400"></i>
                    <span class="text-xs text-gray-400 font-medium"
                      >Días de Vacaciones</span
                    >
                  </div>
                  <p class="text-white font-semibold text-lg">
                    {{ calculateVacationDays() }} día(s)
                  </p>
                </div>
                }
              </div>

              <!-- Reason -->
              @if (request.reason) {
              <div
                class="bg-neutral-900/30 rounded-lg p-3 border border-neutral-700/30 mb-4"
              >
                <div class="flex items-center gap-2 mb-2">
                  <i class="pi pi-comment text-purple-400"></i>
                  <span class="text-sm text-gray-400 font-medium">Motivo</span>
                </div>
                <p class="text-gray-300 text-sm">{{ request.reason }}</p>
              </div>
              }

              <!-- Rejection Comment -->
              @if (request.rejection_comment) {
              <div
                class="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
              >
                <div class="flex items-start gap-3">
                  <i
                    class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"
                  ></i>
                  <div class="flex-1">
                    <h4 class="text-red-300 font-semibold mb-1">
                      Motivo del Rechazo
                    </h4>
                    <p class="text-red-200 text-sm">
                      {{ request.rejection_comment }}
                    </p>
                  </div>
                </div>
              </div>
              }
            </div>
          </div>
        </div>
        }
      </div>
      } @else {
      <!-- Create Form View -->

      <div class="space-y-5">
        <!-- Paso 1: Período de Vacaciones -->
        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
            >
              <i class="pi pi-calendar text-purple-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 1: Período de Vacaciones
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-300"
                >Fecha de Inicio</label
              >
              <p-datepicker
                [ngModel]="vacationStartDate"
                (ngModelChange)="vacationStartDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Selecciona fecha de inicio"
                [minDate]="minVacationDate"
                [maxDate]="maxVacationDate"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-300"
                >Fecha de Fin</label
              >
              <p-datepicker
                [ngModel]="vacationEndDate"
                (ngModelChange)="vacationEndDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Selecciona fecha de fin"
                [minDate]="vacationStartDate || minVacationDate"
                [maxDate]="maxVacationDate"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>
          @if (vacationStartDate && vacationEndDate) {
          <div
            class="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg"
          >
            <p class="text-sm text-purple-300">
              <i class="pi pi-info-circle mr-2"></i>
              Total:
              <strong
                >{{ calculateVacationDays() }} día(s) de vacaciones</strong
              >
            </p>
          </div>
          }
        </div>

        <!-- Paso 2: Motivo -->
        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
            >
              <i class="pi pi-file-edit text-purple-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 2: Motivo (Opcional)
            </h3>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Motivo o comentarios adicionales</label
            >
            <textarea
              pTextarea
              [ngModel]="vacationReason"
              (ngModelChange)="vacationReasonChange.emit($event)"
              rows="3"
              placeholder="Motivo o comentarios adicionales sobre las vacaciones"
              class="w-full"
            ></textarea>
          </div>
        </div>

        <!-- Paso 3: Documento de Respaldo -->
        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
            >
              <i class="pi pi-file text-purple-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 3: Documento de Respaldo (Opcional)
            </h3>
          </div>

          <p class="text-sm text-gray-400 mb-4">
            Si tienes una solicitud física firmada, puedes adjuntarla como PDF
            para respaldar la solicitud.
          </p>

          <p-fileUpload
            mode="basic"
            accept=".pdf,.jpg,.jpeg,.png"
            maxFileSize="5000000"
            [auto]="false"
            chooseLabel="Seleccionar Archivo"
            (onSelect)="handleFileSelect($event)"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-2">
            Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
          </p>

          @if (vacationFile) {
          <div
            class="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-file text-purple-400"></i>
              <span class="text-sm text-gray-300">{{ vacationFile.name }}</span>
            </div>
            <p-button
              icon="pi pi-times"
              severity="danger"
              text
              rounded
              size="small"
              (onClick)="vacationFileChange.emit(null)"
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
            label="Solicitar Vacaciones"
            icon="pi pi-check"
            [disabled]="!canSubmit"
            [loading]="submitting"
            (onClick)="submitRequest.emit()"
            severity="success"
          />
        </div>
      </div>
      }
    </p-card>
  `,
})
export class EmployeePortalVacationsComponent {
  @Input() minVacationDate: Date = new Date();
  @Input() maxVacationDate: Date = new Date();
  @Input() vacationStartDate: Date | null = null;
  @Output() vacationStartDateChange = new EventEmitter<Date | null>();
  @Input() vacationEndDate: Date | null = null;
  @Output() vacationEndDateChange = new EventEmitter<Date | null>();
  @Input() vacationReason = '';
  @Output() vacationReasonChange = new EventEmitter<string>();
  @Input() vacationFile: File | null = null;
  @Output() vacationFileChange = new EventEmitter<File | null>();
  @Input() submitting = false;
  @Input() canSubmit = false;

  // Inputs for viewing existing requests
  @Input() vacationRequests: any[] = [];
  @Input() requestsLoading = false;

  @Output() submitRequest = new EventEmitter<void>();
  @Input() calculateVacationDays: () => number = () => 0;
  @Input() calculateDaysBetween: (
    start: Date | string,
    end: Date | string
  ) => number = () => 0;
  @Input() isDateFuture: (date: Date | string) => boolean = () => false;
  @Output() closeSection = new EventEmitter<void>();

  public handleFileSelect(event: any): void {
    const file = event?.files?.[0] ?? null;
    this.vacationFileChange.emit(file);
  }
}
