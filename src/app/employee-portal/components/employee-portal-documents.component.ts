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
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';

@Component({
  selector: 'pt-employee-portal-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Select,
    InputText,
    Textarea,
    DatePicker,
    Button,
    TableModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-file-edit text-green-400"></i>
            <span>Solicitar Documentos</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-refresh"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [outlined]="true"
              (onClick)="reloadRequests.emit()"
              pTooltip="Recargar solicitudes"
              [style]="{ width: '2.5rem', height: '2.5rem' }"
              [loading]="requestsLoading"
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
        Solicita cartas de trabajo u otros documentos
      </ng-template>

      <div class="flex flex-col gap-6 mt-4">
        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">Nueva Solicitud de Documento</h3>

          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">
                <i class="pi pi-file mr-2 text-green-400"></i>
                Tipo de Documento <span class="text-red-400">*</span>
              </label>
              <p-select
                [ngModel]="documentType"
                (ngModelChange)="documentTypeChange.emit($event)"
                [options]="documentTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecciona el tipo de documento"
                appendTo="body"
                class="w-full"
              />
            </div>

            @if (documentType === 'other') {
            <div>
              <label class="block text-sm text-gray-400 mb-2">
                <i class="pi pi-edit mr-2 text-green-400"></i>
                Especificar Documento <span class="text-red-400">*</span>
              </label>
              <input
                pInputText
                [ngModel]="customDocumentType"
                (ngModelChange)="customDocumentTypeChange.emit($event)"
                placeholder="Describe el documento que necesitas"
                class="w-full"
                maxlength="100"
              />
              <small class="text-gray-500 text-xs mt-1 block text-right">
                {{ customDocumentType.length || 0 }}/100 caracteres
              </small>
            </div>
            }

            <div>
              <label class="block text-sm text-gray-400 mb-2">
                <i class="pi pi-comment mr-2 text-green-400"></i>
                Motivo o Uso del Documento <span class="text-red-400">*</span>
              </label>
              <textarea
                pTextarea
                [ngModel]="documentReason"
                (ngModelChange)="documentReasonChange.emit($event)"
                rows="4"
                placeholder="Ej: Para trámite bancario, visa, solicitud de préstamo, etc."
                class="w-full"
                maxlength="500"
              ></textarea>
              <small class="text-gray-500 text-xs mt-1 block text-right">
                {{ documentReason.length || 0 }}/500 caracteres
              </small>
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-2">
                <i class="pi pi-calendar mr-2 text-green-400"></i>
                Fecha Requerida (opcional)
              </label>
              <p-datepicker
                [ngModel]="documentRequiredDate"
                (ngModelChange)="documentRequiredDateChange.emit($event)"
                appendTo="body"
                [minDate]="today"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Selecciona fecha requerida"
                class="w-full"
              />
              @if (documentRequiredDate) {
              <small class="text-gray-500 text-xs mt-1 block">
                <i class="pi pi-info-circle mr-1"></i>
                Documento requerido para: {{ documentRequiredDate | date : 'fullDate' }}
              </small>
              }
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <p-button
                label="Cancelar"
                icon="pi pi-times"
                severity="secondary"
                [outlined]="true"
                [rounded]="true"
                (onClick)="resetDocument.emit()"
              />
              <p-button
                label="Solicitar Documento"
                icon="pi pi-send"
                severity="success"
                [rounded]="true"
                [loading]="submitting"
                [disabled]="!canSubmit || submitting"
                (onClick)="submitDocument.emit()"
              />
            </div>
          </div>
        </div>

        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <div class="flex items-center justify-between mb-4 gap-4">
            <h3 class="text-lg font-semibold text-white m-0">Mis Solicitudes de Documentos</h3>
            <p-button
              icon="pi pi-refresh"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [loading]="requestsLoading"
              (onClick)="reloadRequests.emit()"
              pTooltip="Actualizar lista"
            />
          </div>

          @if (documentRequests.length === 0 && !requestsLoading) {
          <div class="text-center py-12">
            <div class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-file-times text-4xl text-green-400"></i>
            </div>
            <h4 class="text-lg font-semibold text-white mb-2">No hay solicitudes</h4>
            <p class="text-gray-400 mb-4">No has realizado ninguna solicitud de documentos todavía.</p>
          </div>
          } @else if (requestsLoading) {
          <div class="flex justify-center items-center py-12">
            <div class="flex flex-col items-center gap-3">
              <i class="pi pi-spin pi-spinner text-4xl text-green-400"></i>
              <p class="text-gray-400">Cargando solicitudes...</p>
            </div>
          </div>
          } @else {
          <div class="overflow-x-auto">
            <p-table
              [value]="documentRequests"
              [rows]="10"
              paginator
              [loading]="requestsLoading"
              styleClass="p-datatable-sm md:p-datatable-lg"
              [scrollable]="true"
              scrollHeight="400px"
              [responsiveLayout]="'scroll'"
              [rowHover]="true"
            >
              <ng-template #header>
                <tr>
                  <th>Fecha de Solicitud</th>
                  <th>Tipo de Documento</th>
                  <th>Motivo</th>
                  <th>Fecha Requerida</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </ng-template>
              <ng-template #body let-request>
                <tr>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ request.created_at | date : 'mediumDate' }}</span>
                      <span class="text-xs text-gray-500">{{ request.created_at | date : 'shortTime' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-file text-green-400"></i>
                      <span class="font-semibold text-white">
                        {{ getDocumentTypeLabel(request.document_type) }}
                      </span>
                    </div>
                    @if (request.custom_document_type) {
                    <small class="text-gray-400 text-xs block mt-1">
                      {{ request.custom_document_type }}
                    </small>
                    }
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ request.reason && request.reason.length > 50 ? (request.reason.substring(0, 50) + '...') : (request.reason || '-') }}
                    </span>
                  </td>
                  <td>
                    @if (request.required_date) {
                    <span class="text-sm text-gray-300">
                      {{ request.required_date | date : 'shortDate' }}
                    </span>
                    } @else {
                    <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <span
                      class="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
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
                      } @else if (request.status === 'pending') {
                      <i class="pi pi-clock"></i>
                      } @else {
                      <i class="pi pi-times-circle"></i>
                      }
                      {{
                        request.status === 'pending'
                          ? 'Pendiente'
                          : request.status === 'approved'
                          ? 'Aprobada'
                          : 'Rechazada'
                      }}
                    </span>
                  </td>
                  <td>
                    @if (request.status === 'approved' && request.document_url) {
                    <p-button
                      icon="pi pi-download"
                      severity="success"
                      size="small"
                      [rounded]="true"
                      [text]="true"
                      (onClick)="downloadDocument(request.document_url)"
                      pTooltip="Descargar documento"
                    />
                    } @else {
                    <span class="text-gray-500 text-xs">-</span>
                    }
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="6" class="text-center py-8">
                    <p class="text-gray-400">No hay solicitudes de documentos</p>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          }
        </div>
      </div>
    </p-card>
  `,
})
export class EmployeePortalDocumentsComponent {
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
  @Input() documentRequests: any[] = [];
  @Input() requestsLoading = false;
  @Input() getDocumentTypeLabel: (type: string) => string = () => '';
  @Input() downloadDocument: (url?: string | null) => void = () => undefined;
  @Output() submitDocument = new EventEmitter<void>();
  @Output() resetDocument = new EventEmitter<void>();
  @Output() reloadRequests = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();
}
