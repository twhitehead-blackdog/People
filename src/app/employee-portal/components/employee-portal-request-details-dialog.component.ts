import { DatePipe, NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    model,
    output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DocumentViewerCardComponent } from '../../shared/components/document-viewer-card.component';
import {
    getCompensatoryQuantity,
    getCompensatoryReasonFromNotes,
} from '../utils/employee-portal-compensatory.utils';
import { calculateDays } from '../utils/employee-portal-date.utils';

type UnifiedRequest = {
  id: string;
  request_type:
    | 'compensatory'
    | 'disability'
    | 'document'
    | 'complaint'
    | 'vacation';
  created_at: string | Date;
  status: string;
  title: string;
  description?: string;
  originalData: any;
};

@Component({
  selector: 'pt-employee-portal-request-details-dialog',
  standalone: true,
  imports: [
    DialogModule,
    Button,
    DatePipe,
    NgClass,
    DocumentViewerCardComponent,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      [dismissableMask]="true"
      [header]="request()?.title || 'Detalles de la Solicitud'"
      (onHide)="onClose()"
    >
      @if (request()) { @let req = request()!; @let data = req.originalData;
      <div class="flex flex-col gap-6">
        <!-- Estado y Fecha -->
        <div
          class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
        >
          <div>
            <p class="text-sm text-gray-400 mb-1">Estado</p>
            <span
              class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 w-fit"
              [class.text-yellow-300]="req.status === 'pending'"
              [class.text-green-300]="req.status === 'approved'"
              [class.text-red-300]="req.status === 'rejected'"
              [class.text-cyan-300]="req.status === 'in_registry'"
              [ngClass]="{
                'bg-yellow-500/20': req.status === 'pending',
                'bg-green-500/20': req.status === 'approved',
                'bg-red-500/20': req.status === 'rejected',
                'bg-cyan-500/20': req.status === 'in_registry'
              }"
            >
              @if (req.status === 'approved') {
              <i class="pi pi-check-circle"></i>
              } @else if (req.status === 'rejected') {
              <i class="pi pi-times-circle"></i>
              } @else if (req.status === 'in_registry') {
              <i class="pi pi-clock"></i>
              } @else {
              <i class="pi pi-hourglass"></i>
              }
              {{ getStatusLabel()(req.status) }}
            </span>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-400 mb-1">Fecha de Solicitud</p>
            <p class="text-white font-semibold">
              {{ req.created_at | date : 'fullDate' }} a las
              {{ req.created_at | date : 'HH:mm' }}
            </p>
          </div>
        </div>

        <!-- Información según tipo de solicitud -->
        @if (req.request_type === 'compensatory') {
        <!-- Tiempo Compensatorio -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @let quantityForPeriod = getCompensatoryQuantity(data);
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-calendar text-cyan-400"></i>
              <span class="text-sm text-gray-400 font-medium">
                @if (quantityForPeriod.isDays) { Período } @else { Fecha y Horas
                }
              </span>
            </div>
            @if (quantityForPeriod.isDays) {
            <p class="text-white font-semibold text-lg">
              {{ data.date_from | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            @if (data.date_from !== data.date_to) {
            <p class="text-gray-400 text-sm mt-1">
              hasta {{ data.date_to | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            } } @else { @if (data.date_from) {
            <p class="text-white font-semibold text-lg">
              {{ data.date_from | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            @if (data.date_from && hasTimeInfo()(data.date_from)) {
            <p class="text-gray-400 text-sm mt-1">
              {{ formatDateWithTimeRange()(data.date_from, data.date_to) }}
            </p>
            } @else {
            <p class="text-gray-400 text-sm mt-1">
              {{ formatHoursMinutes()(quantityForPeriod.value) }}
            </p>
            } } @else {
            <p class="text-gray-400 text-sm">Sin fecha específica</p>
            } }
          </div>

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              @if (data.compensatory_type === 'days') {
              <i class="pi pi-calendar text-cyan-400"></i>
              } @else {
              <i class="pi pi-clock text-cyan-400"></i>
              }
              <span class="text-sm text-gray-400 font-medium">Cantidad</span>
            </div>
            <p class="text-white font-semibold text-xl">
              @let quantity = getCompensatoryQuantity(data); @if
              (quantity.isDays) {
              {{ quantity.value }} día(s)
              <span class="text-gray-400 text-sm font-normal block mt-1">
                ({{ quantity.value * 8 }} horas)
              </span>
              } @else {
              {{ formatHoursMinutes()(quantity.value) }}
              }
            </p>
          </div>

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-tag text-cyan-400"></i>
              <span class="text-sm text-gray-400 font-medium">Tipo</span>
            </div>
            <p class="text-white font-semibold">
              @if (data.compensatory_type === 'days') { Días } @else { Horas }
            </p>
          </div>

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-list text-cyan-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Tipo de Solicitud</span
              >
            </div>
            <p class="text-white font-semibold">
              {{ getRequestTypeLabel()(req.request_type) }}
            </p>
          </div>
        </div>

        <!-- Motivo -->
        @if (data.reason || req.description ||
        getCompensatoryReasonFromNotes(data)) {
        <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-comment text-cyan-400"></i>
            <span class="text-sm text-gray-400 font-medium">Motivo</span>
          </div>
          <p class="text-white text-sm whitespace-pre-wrap">
            {{
              data.reason ||
                req.description ||
                getCompensatoryReasonFromNotes(data) ||
                'Sin motivo especificado'
            }}
          </p>
        </div>
        }

        <!-- Comentario de Rechazo -->
        @if ((data.rejection_comment || data.notes) && req.status ===
        'rejected') {
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i
              class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"
            ></i>
            <div class="flex-1">
              <h4 class="text-red-300 font-semibold mb-2">
                Motivo del Rechazo
              </h4>
              <p class="text-red-200 text-sm whitespace-pre-wrap">
                {{ data.rejection_comment || data.notes }}
              </p>
            </div>
          </div>
        </div>
        }
        }

        @if (req.request_type === 'disability') {
        <!-- Incapacidad -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-calendar text-blue-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Período de Incapacidad</span
              >
            </div>
            <p class="text-white font-semibold text-lg">
              {{ data.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            @if (data.end_date) {
            <p class="text-gray-400 text-sm mt-1">
              hasta {{ data.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            }
          </div>

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-calendar-check text-blue-400"></i>
              <span class="text-sm text-gray-400 font-medium">Días</span>
            </div>
            <p class="text-white font-semibold text-xl">
              {{ calculateDays(data.start_date, data.end_date) }} día(s)
            </p>
          </div>
        </div>

        <!-- Documento Adjunto -->
        @if (data.document_url) {
        <pt-document-viewer-card
          [documentUrl]="data.document_url"
          [title]="'Documento de Incapacidad'"
          [iconColorClass]="'text-blue-400'"
          (download)="onDownloadDocument($event)"
        />
        }

        <!-- Descripción -->
        @if (data.description || req.description) {
        <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-comment text-blue-400"></i>
            <span class="text-sm text-gray-400 font-medium">Descripción</span>
          </div>
          <p class="text-white text-sm whitespace-pre-wrap">
            {{ data.description || req.description || 'Sin descripción' }}
          </p>
        </div>
        }

        <!-- Comentario de Rechazo -->
        @if ((data.rejection_comment || data.review_notes) && req.status ===
        'rejected') {
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i
              class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"
            ></i>
            <div class="flex-1">
              <h4 class="text-red-300 font-semibold mb-2">
                Motivo del Rechazo
              </h4>
              <p class="text-red-200 text-sm whitespace-pre-wrap">
                {{ data.rejection_comment || data.review_notes }}
              </p>
            </div>
          </div>
        </div>
        }
        }

        @if (req.request_type === 'document') {
        <!-- Solicitud de Documento -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-file text-green-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Tipo de Documento</span
              >
            </div>
            <p class="text-white font-semibold text-lg">
              {{ getDocumentTypeLabel()(data.document_type) }}
            </p>
          </div>

          @if (data.required_date) {
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-calendar text-green-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Fecha Requerida</span
              >
            </div>
            <p class="text-white font-semibold text-lg">
              {{ data.required_date | date : 'fullDate' : 'UTC' }}
            </p>
          </div>
          }

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-list text-green-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Tipo de Solicitud</span
              >
            </div>
            <p class="text-white font-semibold">
              {{ getRequestTypeLabel()(req.request_type) }}
            </p>
          </div>
        </div>

        <!-- Documento Adjunto -->
        @if (data.status === 'approved' && data.document_url) {
        <pt-document-viewer-card
          [documentUrl]="data.document_url"
          [title]="'Documento Solicitado'"
          [iconColorClass]="'text-green-400'"
          (download)="onDownloadDocument($event)"
        />
        }

        <!-- Motivo/Uso -->
        @if (data.reason || req.description) {
        <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-comment text-green-400"></i>
            <span class="text-sm text-gray-400 font-medium"
              >Motivo o Uso del Documento</span
            >
          </div>
          <p class="text-white text-sm whitespace-pre-wrap">
            {{ data.reason || req.description || 'Sin motivo especificado' }}
          </p>
        </div>
        }

        <!-- Comentario de Rechazo -->
        @if (data.rejection_comment && req.status === 'rejected') {
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i
              class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"
            ></i>
            <div class="flex-1">
              <h4 class="text-red-300 font-semibold mb-2">
                Motivo del Rechazo
              </h4>
              <p class="text-red-200 text-sm whitespace-pre-wrap">
                {{ data.rejection_comment }}
              </p>
            </div>
          </div>
        </div>
        }
        }

        @if (req.request_type === 'complaint') {
        <!-- Queja -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-tag text-yellow-400"></i>
              <span class="text-sm text-gray-400 font-medium">Categoría</span>
            </div>
            <p class="text-white font-semibold text-lg">
              {{ getComplaintCategoryLabel()(data.category) }}
            </p>
          </div>

          @if (data.priority) {
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-exclamation-circle text-yellow-400"></i>
              <span class="text-sm text-gray-400 font-medium">Prioridad</span>
            </div>
            <p class="text-white font-semibold text-lg capitalize">
              {{ data.priority }}
            </p>
          </div>
          }

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-list text-yellow-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Tipo de Solicitud</span
              >
            </div>
            <p class="text-white font-semibold">
              {{ getRequestTypeLabel()(req.request_type) }}
            </p>
          </div>
        </div>

        <!-- Detalles/Queja -->
        @if (data.complaint || req.description) {
        <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-comment text-yellow-400"></i>
            <span class="text-sm text-gray-400 font-medium"
              >Detalles de la Sugerencia</span
            >
          </div>
          <p class="text-white text-sm whitespace-pre-wrap">
            {{ data.complaint || req.description }}
          </p>
        </div>
        }

        <!-- Botón para ver conversación -->
        <div class="flex justify-end">
          <p-button
            label="Ver Conversación"
            icon="pi pi-comments"
            severity="secondary"
            [outlined]="true"
            [rounded]="true"
            (onClick)="onViewResponse(data)"
          />
        </div>
        }

        @if (req.request_type === 'vacation') {
        <!-- Vacaciones -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-calendar text-orange-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Período de Vacaciones</span
              >
            </div>
            <p class="text-white font-semibold text-lg">
              {{ data.date_from | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            @if (data.date_to) {
            <p class="text-gray-400 text-sm mt-1">
              hasta {{ data.date_to | date : 'dd/MM/yyyy' : 'UTC' }}
            </p>
            }
          </div>

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-calendar-check text-orange-400"></i>
              <span class="text-sm text-gray-400 font-medium">Días Solicitados</span>
            </div>
            <p class="text-white font-semibold text-xl">
              {{ calculateDays(data.date_from, data.date_to) }} día(s)
            </p>
          </div>

          <div
            class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700"
          >
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-list text-orange-400"></i>
              <span class="text-sm text-gray-400 font-medium"
                >Tipo de Solicitud</span
              >
            </div>
            <p class="text-white font-semibold">
              {{ getRequestTypeLabel()(req.request_type) }}
            </p>
          </div>
        </div>

        <!-- Motivo -->
        @if (data.reason || req.description) {
        <div class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-comment text-orange-400"></i>
            <span class="text-sm text-gray-400 font-medium">Motivo</span>
          </div>
          <p class="text-white text-sm whitespace-pre-wrap">
            {{ data.reason || req.description || 'Sin motivo especificado' }}
          </p>
        </div>
        }

        <!-- Comentario de Rechazo -->
        @if (data.rejection_comment && req.status === 'rejected') {
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i
              class="pi pi-exclamation-triangle text-red-400 text-xl mt-0.5"
            ></i>
            <div class="flex-1">
              <h4 class="text-red-300 font-semibold mb-2">
                Motivo del Rechazo
              </h4>
              <p class="text-red-200 text-sm whitespace-pre-wrap">
                {{ data.rejection_comment }}
              </p>
            </div>
          </div>
        </div>
        }
        }
      </div>
      }
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalRequestDetailsDialogComponent {
  // Model
  public visible = model.required<boolean>();
  public request = input<UnifiedRequest | null | undefined>();
  public getStatusLabel = input.required<(status: string) => string>();
  public getRequestTypeLabel = input.required<(type: string) => string>();
  public getDocumentTypeLabel = input.required<(type: string) => string>();
  public getComplaintCategoryLabel =
    input.required<(category: string) => string>();
  public formatHoursMinutes =
    input.required<(hours: number | string) => string>();
  public formatDateWithTimeRange =
    input.required<(from: string | Date, to: string | Date) => string>();
  public hasTimeInfo =
    input.required<(date: string | Date | null | undefined) => boolean>();

  // Outputs
  public closed = output<void>();
  public viewResponse = output<any>();
  public downloadDocument = output<string>();

  public onClose(): void {
    this.closed.emit();
  }

  public onViewResponse(complaint: any): void {
    this.viewResponse.emit(complaint);
  }

  public onDownloadDocument(url: string): void {
    this.downloadDocument.emit(url);
  }

  // Helper methods to use imported functions in template
  public getCompensatoryQuantity = getCompensatoryQuantity;
  public getCompensatoryReasonFromNotes = getCompensatoryReasonFromNotes;
  public calculateDays = calculateDays;
}
