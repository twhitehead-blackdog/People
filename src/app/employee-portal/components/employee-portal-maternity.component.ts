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
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Textarea } from 'primeng/textarea';
import { FileUpload } from 'primeng/fileupload';

@Component({
  selector: 'pt-employee-portal-maternity',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, DatePicker, Textarea, FileUpload, Button, TableModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-heart text-pink-400"></i>
            <span>Licencia de Maternidad</span>
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
      <ng-template #subtitle>
        Solicita tu licencia de maternidad con todos los beneficios legales
      </ng-template>

      <div class="flex flex-col gap-6 mt-4">
        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">
            Nueva Solicitud de Licencia de Maternidad
          </h3>

          <div class="flex flex-col gap-4">
            <div class="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <i class="pi pi-heart-fill text-pink-400 text-xl"></i>
                <div>
                  <p class="text-pink-300 font-semibold mb-2">
                    ¡Felicitaciones por tu maternidad!
                  </p>
                  <p class="text-sm text-gray-300">
                    Las licencias de maternidad están protegidas por la legislación laboral.
                    Recibirás tu salario completo durante todo el período.
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Fecha Probable de Parto <span class="text-red-400">*</span>
                </label>
                <p-datepicker
                  [ngModel]="expectedDeliveryDate"
                  (ngModelChange)="expectedDeliveryDateChange.emit($event)"
                  appendTo="body"
                  [minDate]="minMaternityDate"
                  class="w-full"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Selecciona fecha probable"
                />
                @if (expectedDeliveryDate) {
                <small class="text-gray-500 text-xs mt-1 block">
                  Licencia inicia: {{ calculateMaternityStartDate() | date : 'shortDate' }}
                </small>
                }
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Fecha de Regreso
                </label>
                <input
                  type="text"
                  [value]="calculateMaternityEndDate() | date : 'shortDate'"
                  class="w-full p-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                  readonly
                />
                <small class="text-gray-500 text-xs mt-1 block">
                  Calculada automáticamente
                </small>
              </div>
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-2">
                Información Adicional (opcional)
              </label>
              <textarea
                pTextarea
                [ngModel]="maternityNotes"
                (ngModelChange)="maternityNotesChange.emit($event)"
                rows="4"
                placeholder="Información adicional sobre tu embarazo, complicaciones médicas, etc."
                class="w-full"
                maxlength="1000"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                {{ maternityNotes.length }}/1000 caracteres
              </p>
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-2">
                Documentos de Apoyo (opcional)
              </label>
              <p-fileUpload
                mode="basic"
                accept="image/*,.pdf"
                maxFileSize="5000000"
                [auto]="false"
                chooseLabel="Seleccionar Archivo"
                (onSelect)="onFileSelect($event)"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-2">
                Formatos permitidos: PDF, JPG, PNG (máx. 5MB) - Certificado médico, ecografías, etc.
              </p>
            </div>

            <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <i class="pi pi-check-circle text-green-400 text-xl"></i>
                <div>
                  <p class="text-green-300 font-semibold mb-2">
                    Beneficios de la Licencia de Maternidad
                  </p>
                  <ul class="text-sm text-gray-300 space-y-1">
                    <li>• 12 semanas de licencia con goce de sueldo completo</li>
                    <li>• Protección laboral durante el embarazo</li>
                    <li>• Extensión posible por complicaciones médicas</li>
                    <li>• Permiso adicional para el padre (opcional)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <p-button
                label="Cancelar"
                icon="pi pi-times"
                severity="secondary"
                [outlined]="true"
                [rounded]="true"
                (onClick)="resetForm.emit()"
              />
              <p-button
                label="Solicitar Licencia"
                icon="pi pi-send"
                severity="success"
                [rounded]="true"
                [loading]="submitting"
                [disabled]="!canSubmit || submitting"
                (onClick)="submitRequest.emit()"
              />
            </div>
          </div>
        </div>

        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white m-0">Mis Solicitudes de Maternidad</h3>
            <p-button
              icon="pi pi-refresh"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [loading]="requestsLoading"
              (onClick)="reloadList.emit()"
              pTooltip="Actualizar lista"
            />
          </div>

          @if (maternityRequests.length === 0 && !requestsLoading) {
          <div class="text-center py-12">
            <div class="w-20 h-20 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-heart text-4xl text-pink-400"></i>
            </div>
            <h4 class="text-lg font-semibold text-white mb-2">No hay solicitudes</h4>
            <p class="text-gray-400 mb-4">No has realizado ninguna solicitud de licencia de maternidad todavía.</p>
          </div>
          } @else if (requestsLoading) {
          <div class="flex justify-center items-center py-12">
            <div class="flex flex-col items-center gap-3">
              <i class="pi pi-spin pi-spinner text-4xl text-pink-400"></i>
              <p class="text-gray-400">Cargando solicitudes...</p>
            </div>
          </div>
          } @else {
          <div class="overflow-x-auto">
            <p-table
              [value]="maternityRequests"
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
                  <th>Fecha Parto</th>
                  <th>Período de Licencia</th>
                  <th>Estado</th>
                  <th>Documentos</th>
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
                    <span class="font-medium text-pink-400">
                      {{ request.expected_delivery_date | date : 'shortDate' }}
                    </span>
                  </td>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ request.date_from | date : 'shortDate' }}</span>
                      <span class="text-xs text-gray-500">hasta</span>
                      <span class="font-medium">{{ request.date_to | date : 'shortDate' }}</span>
                      <span class="text-xs text-pink-400 font-semibold">
                        ({{ calculateDaysBetween(request.date_from, request.date_to) }} días)
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                      [class.text-yellow-300]="!request.is_approved && isDateFuture(request.date_from)"
                      [class.text-green-300]="request.is_approved"
                      [class.text-red-300]="!request.is_approved && !isDateFuture(request.date_from)"
                      [ngClass]="{
                        'bg-yellow-500/20': !request.is_approved && isDateFuture(request.date_from),
                        'bg-green-500/20': request.is_approved,
                        'bg-red-500/20': !request.is_approved && !isDateFuture(request.date_from)
                      }"
                    >
                      @if (request.is_approved) {
                      <i class="pi pi-check-circle"></i>
                      } @else if (isDateFuture(request.date_from)) {
                      <i class="pi pi-clock"></i>
                      } @else {
                      <i class="pi pi-times-circle"></i>
                      }
                      {{
                        request.is_approved
                          ? 'Aprobada'
                          : isDateFuture(request.date_from)
                          ? 'Pendiente'
                          : 'Rechazada'
                      }}
                    </span>
                  </td>
                  <td>
                    @if (request.document_url) {
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
                  <td colspan="5" class="text-center py-8">
                    <p class="text-gray-400">No hay solicitudes de maternidad</p>
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
export class EmployeePortalMaternityComponent {
  @Input() minMaternityDate: Date = new Date();
  @Input() expectedDeliveryDate: Date | null = null;
  @Output() expectedDeliveryDateChange = new EventEmitter<Date | null>();
  @Input() maternityNotes = '';
  @Output() maternityNotesChange = new EventEmitter<string>();
  @Input() submitting = false;
  @Input() canSubmit = false;
  @Output() submitRequest = new EventEmitter<void>();
  @Output() resetForm = new EventEmitter<void>();
  @Input() maternityRequests: any[] = [];
  @Input() requestsLoading = false;
  @Input() calculateMaternityStartDate: () => Date = () => new Date();
  @Input() calculateMaternityEndDate: () => Date = () => new Date();
  @Input() calculateDaysBetween: (start: Date | string, end: Date | string) => number = () => 0;
  @Input() isDateFuture: (date: Date | string) => boolean = () => false;
  @Input() downloadDocument: (url?: string | null) => void = () => undefined;
  @Output() reloadList = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();

  onFileSelect(event: any): void {
    // Handle file selection
  }
}