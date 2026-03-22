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
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-employee-portal-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Select,
    InputText,
    Textarea,
    DatePicker,
    Button,
    TooltipModule,
    ProgressSpinner],
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
          <h2 class="text-lg font-bold text-white m-0 tracking-tight">Solicitar Documentos</h2>
          <p class="text-xs text-gray-500 m-0 mt-0.5">Cartas de trabajo y otros documentos</p>
        </div>
      </div>

      <!-- Loading State -->
      @if (requestsLoading) {
      <div class="flex justify-center items-center py-12">
        <div class="flex flex-col items-center gap-3">
          <i class="pi pi-spin pi-spinner text-4xl text-green-400"></i>
          <p class="text-gray-400">Cargando tus solicitudes...</p>
        </div>
      </div>
      } @else if ((documentRequests?.length ?? 0) > 0) {
      <!-- List View -->
      <div class="space-y-4">
        @for (request of documentRequests; track request.id) {
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
                <i class="pi pi-file-edit text-green-400"></i>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"
              >
                <div>
                  <h3 class="text-lg font-semibold text-white mb-1">
                    Solicitud de
                    {{ getDocumentTypeLabel(request.document_type) }}
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

              <!-- Request Details -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                @if (request.required_date) {
                <div
                  class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-calendar text-green-400"></i>
                    <span class="text-xs text-gray-400 font-medium"
                      >Fecha Requerida</span
                    >
                  </div>
                  <p class="text-white font-semibold">
                    {{ request.required_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </p>
                </div>
                } @if (request.reason) {
                <div
                  class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-comment text-green-400"></i>
                    <span class="text-xs text-gray-400 font-medium"
                      >Dirigido a</span
                    >
                  </div>
                  <p class="text-white font-semibold text-sm">
                    {{ request.reason }}
                  </p>
                </div>
                }
              </div>

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

              <!-- Download Button for Approved Requests -->
              @if (request.status === 'approved' && request.document_url) {
              <div class="mt-4">
                <p-button
                  label="Descargar Documento"
                  icon="pi pi-download"
                  severity="success"
                  [outlined]="true"
                  [rounded]="true"
                  (onClick)="downloadDocument(request.document_url)"
                />
              </div>
              }
            </div>
          </div>
        </div>
        }
      </div>
      } @else {
      <!-- Create Form View -->
      <!-- Create Form View -->
      <div class="space-y-5">
        <!-- Paso 1: Tipo de Documento -->
        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <i class="pi pi-file text-green-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 1: Tipo de Documento
            </h3>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-300"
              >Selecciona el tipo de documento</label
            >
            <p-select
              [ngModel]="documentType"
              (ngModelChange)="documentTypeChange.emit($event)"
              [options]="documentTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Tipo de documento"
              styleClass="w-full"
              appendTo="body"
            />
          </div>

          @if (documentType === 'other') {
          <div class="mt-3">
            <textarea
              pInputTextarea
              [ngModel]="customDocumentType"
              (ngModelChange)="customDocumentTypeChange.emit($event)"
              placeholder="Especifica el tipo de documento que necesitas"
              rows="2"
              class="w-full"
            ></textarea>
          </div>
          }
        </div>

        <!-- Paso 2: Detalles de la Solicitud -->
        <div
          class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <i class="pi pi-file-edit text-green-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 2: Detalles de la Solicitud
            </h3>
          </div>

          <div class="space-y-3">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-300"
                >Dirigido a</label
              >
              <textarea
                pInputTextarea
                [ngModel]="documentReason"
                (ngModelChange)="documentReasonChange.emit($event)"
                placeholder="Explica para quién es dirigido este documento"
                rows="3"
                class="w-full"
              ></textarea>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-300"
                >Fecha requerida</label
              >
              <p-datepicker
                [ngModel]="documentRequiredDate"
                (ngModelChange)="documentRequiredDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="¿Cuándo necesitas el documento?"
                [minDate]="today"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>
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
            [disabled]="!canSubmit"
            [loading]="submitting"
            (onClick)="submitDocument.emit()"
            severity="success"
          />
        </div>
      </div>
      }
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
          <h2 class="text-lg font-bold text-white m-0">
            {{ (documentRequests?.length ?? 0) > 0 ? 'Mis Solicitudes' : 'Solicitar Documentos' }}
          </h2>
          <p class="text-xs text-gray-400 m-0">
            {{ (documentRequests?.length ?? 0) > 0
              ? 'Visualiza tus solicitudes'
              : 'Cartas de trabajo u otros documentos' }}
          </p>
        </div>
      </div>

      <!-- Loading State -->
      @if (requestsLoading) {
      <div class="flex justify-center items-center py-12">
        <div class="flex flex-col items-center gap-3">
          <i class="pi pi-spin pi-spinner text-3xl text-green-400"></i>
          <p class="text-gray-400 text-sm">Cargando solicitudes...</p>
        </div>
      </div>
      } @else if ((documentRequests?.length ?? 0) > 0) {
      <!-- List View - Card style for mobile -->
      <div class="space-y-3">
        @for (request of documentRequests; track request.id) {
        <div
          class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30"
          [ngClass]="{
            'border-yellow-500/30': request.status === 'pending',
            'border-green-500/30': request.status === 'approved',
            'border-red-500/30': request.status === 'rejected'
          }"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-white">
              {{ getDocumentTypeLabel(request.document_type) }}
            </span>
            <span
              class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
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
              <i class="pi pi-check-circle text-xs"></i>
              } @else if (request.status === 'rejected') {
              <i class="pi pi-times-circle text-xs"></i>
              } @else {
              <i class="pi pi-hourglass text-xs"></i>
              }
              {{ request.status === 'pending' ? 'Pendiente' : request.status === 'approved' ? 'Aprobado' : 'Rechazado' }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mb-2">
            Solicitado el {{ request.created_at | date : 'dd/MM/yyyy' }}
          </p>
          <div class="grid grid-cols-1 gap-2">
            @if (request.required_date) {
            <div class="bg-neutral-900/50 rounded-lg p-2">
              <span class="text-xs text-gray-400">Fecha Requerida</span>
              <p class="text-sm text-white font-medium m-0">{{ request.required_date | date : 'dd/MM/yyyy' : 'UTC' }}</p>
            </div>
            }
            @if (request.reason) {
            <div class="bg-neutral-900/50 rounded-lg p-2">
              <span class="text-xs text-gray-400">Dirigido a</span>
              <p class="text-sm text-gray-300 m-0">{{ request.reason }}</p>
            </div>
            }
          </div>
          @if (request.rejection_comment) {
          <div class="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            <p class="text-xs text-red-300 font-semibold mb-1">Motivo del Rechazo</p>
            <p class="text-xs text-red-200 m-0">{{ request.rejection_comment }}</p>
          </div>
          }
          @if (request.status === 'approved' && request.document_url) {
          <div class="mt-2">
            <p-button
              label="Descargar"
              icon="pi pi-download"
              severity="success"
              size="small"
              [outlined]="true"
              (onClick)="downloadDocument(request.document_url)"
              styleClass="w-full"
            />
          </div>
          }
        </div>
        }
      </div>
      } @else {
      <!-- Create Form View - Mobile -->
      <div class="grid grid-cols-1 gap-3">
        <!-- Tipo de Documento -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file text-green-400"></i>
            Tipo de Documento
          </h3>
          <p-select
            [ngModel]="documentType"
            (ngModelChange)="documentTypeChange.emit($event)"
            [options]="documentTypeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Tipo de documento"
            styleClass="w-full"
            appendTo="body"
          />
          @if (documentType === 'other') {
          <div class="mt-2">
            <textarea
              pInputTextarea
              [ngModel]="customDocumentType"
              (ngModelChange)="customDocumentTypeChange.emit($event)"
              placeholder="Especifica el tipo de documento"
              rows="2"
              class="w-full"
            ></textarea>
          </div>
          }
        </div>

        <!-- Detalles -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file-edit text-green-400"></i>
            Detalles de la Solicitud
          </h3>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Dirigido a</label>
              <textarea
                pInputTextarea
                [ngModel]="documentReason"
                (ngModelChange)="documentReasonChange.emit($event)"
                placeholder="Para quién es dirigido este documento"
                rows="3"
                class="w-full"
              ></textarea>
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Fecha requerida</label>
              <p-datepicker
                [ngModel]="documentRequiredDate"
                (ngModelChange)="documentRequiredDateChange.emit($event)"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Fecha requerida"
                [minDate]="today"
                styleClass="w-full"
                appendTo="body"
              />
            </div>
          </div>
        </div>

        <!-- Submit -->
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-check"
          [disabled]="!canSubmit"
          [loading]="submitting"
          (onClick)="submitDocument.emit()"
          severity="success"
          styleClass="w-full min-h-[44px]"
        />
      </div>
      }
    </div>
    }
  `,
})
export class EmployeePortalDocumentsComponent {
  protected device = inject(DeviceService);
  @Input() documentTypeOptions: Array<{ label: string; value: string }> = [];
  @Input() documentType = 'work_letter';
  @Output() documentTypeChange = new EventEmitter<string>();
  @Input() customDocumentType = '';
  @Output() customDocumentTypeChange = new EventEmitter<string>();
  @Input() documentReason = '';
  @Output() documentReasonChange = new EventEmitter<string>();
  @Input() documentRequiredDate: Date | null = null;
  @Output() documentRequiredDateChange = new EventEmitter<Date | null>();
  @Input() today: Date = new Date();
  @Input() canSubmit = false;
  @Input() submitting = false;

  // Inputs for viewing existing requests
  @Input() documentRequests: any[] = [];
  @Input() requestsLoading = false;
  @Input() getDocumentTypeLabel: (type: string) => string = () => '';
  @Input() downloadDocument: (url: string | null | undefined) => void =
    () => {};

  @Output() submitDocument = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();
}
