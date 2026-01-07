import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { CompensatoryService, CompensatoryRequest } from '../services/compensatory.service';
import { CompensatoryFileService } from '../services/compensatory-file.service';
import {
  formatHoursMinutes,
  calculateDays,
  formatDate,
  hasDelay
} from '../../utils/timeoff.utils';

@Component({
  selector: 'pt-compensatory-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    CardModule,
    DialogModule,
    FileUploadModule,
    InputTextModule,
    InputTextarea,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  template: `
    <ng-template pTemplate="header">
      <div class="flex items-center justify-between w-full">
        <span class="text-lg font-semibold text-white">
          Detalles de Solicitud de Tiempo Compensatorio
        </span>
        <div class="flex items-center gap-2">
          <p-button
            icon="pi pi-history"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            (onClick)="showAuditSidebar.set(!showAuditSidebar())"
            [styleClass]="showAuditSidebar() ? 'bg-cyan-500/20 text-cyan-400' : ''"
            pTooltip="Ver historial de cambios"
            tooltipPosition="left"
            size="small"
          />
        </div>
      </div>
    </ng-template>

    <div class="space-y-4 pt-4">
      <!-- Información del Empleado y Horas Extras Disponibles (lado a lado) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Información del Empleado -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-user text-cyan-400"></i>
            Información del Empleado
          </h3>
          <div class="space-y-2">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
              <p class="text-white">{{ getEmployeeName(request()) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p class="text-white">{{ getEmployeeEmail(request()) }}</p>
            </div>
            @if (getEmployeePosition(request())) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Cargo</label>
                <p class="text-white">{{ getEmployeePosition(request()) }}</p>
              </div>
            }
            @if (request().employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Sucursal</label>
                <p class="text-white">{{ request().employee?.branch?.name }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Horas Extra Pendientes (histórico) -->
        <div class="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-clock text-cyan-400"></i>
            Horas Extra Pendientes (histórico)
          </h3>
          @if (isLoadingOvertimeHours()) {
            <div class="flex items-center gap-2 text-gray-400">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Cargando horas extras...</span>
            </div>
          } @else {
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">Total pendiente (no usado)</p>
                <p class="text-3xl font-bold text-cyan-300">{{ formatHoursMinutes(employeeOvertimeHours()) }}</p>
              </div>
              <div class="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <i class="pi pi-clock text-cyan-400 text-3xl"></i>
              </div>
            </div>
            @if (employeeOvertimeDays().length > 0) {
              <!-- Mostrar días con horas extras -->
              <div class="mt-3">
                <p class="text-xs font-medium text-gray-300 mb-2">
                  Días con saldo pendiente (mostrando últimos {{ employeeOvertimeDays().length }}):
                </p>
                <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  @for (day of employeeOvertimeDays(); track day.day) {
                    <div class="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-2 hover:bg-cyan-500/20 transition-colors">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-semibold text-cyan-300">{{ formatDate(day.day) }}</span>
                        <span class="text-xs font-bold text-cyan-400">{{ formatHoursMinutes(day.overtimeHours) }}</span>
                      </div>
                      @if (day.entryTime && day.exitTime) {
                        <div class="text-xs text-gray-400">
                          {{ day.entryTime }} - {{ day.exitTime }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <p class="text-xs text-gray-400 mt-3">
                No hay días con horas extra pendientes dentro del rango cargado.
              </p>
            }
          }
        </div>
      </div>

      <!-- Información de la Solicitud -->
      <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
        <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <i class="pi pi-info-circle text-cyan-400"></i>
          Información de la Solicitud
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Tipo de Solicitud</label>
            <p class="text-white">
              @let compensatoryType = getCompensatoryTypeFromNotes(request()); @if (compensatoryType === 'days') {
                <span class="flex items-center gap-2">
                  <i class="pi pi-calendar text-cyan-400"></i>
                  Días
                </span>
              } @else if (compensatoryType === 'hours') {
                <span class="flex items-center gap-2">
                  <i class="pi pi-clock text-cyan-400"></i>
                  Horas
                </span>
              } @else {
                <span class="text-gray-400">No especificado</span>
              }
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Cantidad Solicitada</label>
            <p class="text-white">
              @let quantity = getCompensatoryQuantity(request()); @if (quantity && quantity.value > 0) { @if (quantity.isDays) {
                {{ quantity.value }} día(s) ({{ quantity.value * 8 }} horas)
              } @else {
                {{ formatHoursMinutes(quantity.value) }}
              } } @else {
                <span class="text-gray-400">No especificada</span>
              }
            </p>
          </div>
          @let dateFrom = request().date_from | date : 'dd/MM/yyyy';
          @let dateTo = request().date_to | date : 'dd/MM/yyyy'; @if (dateFrom === dateTo) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Inicio y Fin</label>
              <p class="text-white">{{ dateFrom }}</p>
            </div>
          } @else {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Inicio</label>
              <p class="text-white">{{ dateFrom }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Fin</label>
              <p class="text-white">{{ dateTo }}</p>
            </div>
          }
          @if (request().compensatory_type === 'hours') { @let timeRange = getCompensatoryTimeRange(request()); @if (timeRange) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Hora de Inicio</label>
              <p class="text-white font-mono">{{ timeRange.startTime }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Hora de Fin</label>
              <p class="text-white font-mono">{{ timeRange.endTime }}</p>
            </div>
          } }
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Solicitud</label>
            <p class="text-white">{{ request().created_at | date : 'dd/MM/yyyy HH:mm' }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Estado</label>
            <p-tag
              [value]="getCompensatoryStatusLabel(request())"
              [severity]="getCompensatoryStatusSeverity(request())"
            />
          </div>
          @let manualDatesForRequest = getManualOvertimeDates(request()); @if (manualDatesForRequest.length > 0) {
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-400 mb-2">
                Días donde trabajó horas extra (reportados por el empleado)
              </label>
              <div class="flex flex-wrap gap-2">
                @for (date of manualDatesForRequest; track date) {
                  <span class="px-3 py-1.5 rounded-lg h-fit bg-cyan-500/10 border border-cyan-400/30 flex flex-col gap-0.5" tooltipPosition="top">
                    <span class="font-semibold text-white text-sm">{{ date }}</span>
                    <span class="text-gray-300 text-xs">{{ getManualDateSaldoLabel(date) }}</span>
                  </span>
                }
              </div>
            </div>
          }
        </div>
        @let reason = getCompensatoryReasonFromNotes(request()); @if (reason) {
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-1">Motivo</label>
            <p class="text-white whitespace-pre-wrap bg-neutral-900/50 p-3 rounded">{{ reason }}</p>
          </div>
        }
        @if (request().rejection_comment) {
          <div class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <label class="block text-sm font-medium text-red-400 mb-1">Comentario de Rechazo</label>
            <p class="text-red-300 whitespace-pre-wrap">{{ request().rejection_comment }}</p>
          </div>
        }
        @if (request().rejection_comment || request().review_status === 'rejected') {
          <div class="mt-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <label class="block text-sm font-medium text-gray-400 mb-2">
              Motivo de Rechazo (editable)
            </label>
            <textarea
              pInputTextarea
              [(ngModel)]="compensatoryRejectionComment"
              placeholder="Agregar o editar el motivo del rechazo..."
              rows="3"
              class="w-full"
            ></textarea>
            <div class="flex justify-end mt-2">
              <p-button
                label="Guardar Comentario"
                icon="pi pi-save"
                size="small"
                [loading]="savingCompensatoryComment()"
                (onClick)="saveCompensatoryRejectionComment()"
              />
            </div>
          </div>
        }
      </div>

      <!-- Documento Físico Opcional -->
      <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
        <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <i class="pi pi-file-pdf text-cyan-400"></i>
          Documento Físico (Opcional)
        </h3>

        @if (!request().physical_document_path) {
          <!-- Subida de archivo -->
          <div class="space-y-3">
            <div class="text-sm text-gray-400">
              Adjunta el documento físico de la solicitud de tiempo compensatorio (PDF)
            </div>
            <p-fileUpload
              mode="basic"
              accept=".pdf"
              maxFileSize="5000000"
              [auto]="false"
              chooseLabel="Seleccionar PDF"
              [disabled]="uploadingPhysicalFile()"
              (onSelect)="onPhysicalFileSelect($event)"
              [styleClass]="'w-full bg-neutral-900/50 border-neutral-600 hover:border-cyan-400 text-white'"
            />
            @if (selectedPhysicalFile()) {
              <div class="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-400/30 rounded">
                <div class="flex items-center gap-2">
                  <i class="pi pi-file-pdf text-cyan-400"></i>
                  <span class="text-white text-sm">{{ selectedPhysicalFile()!.name }}</span>
                  <span class="text-gray-400 text-xs">
                    ({{ formatFileSize(selectedPhysicalFile()!.size) }})
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <p-button
                    icon="pi pi-upload"
                    [loading]="uploadingPhysicalFile()"
                    (onClick)="uploadPhysicalFile()"
                    size="small"
                    severity="success"
                    pTooltip="Subir archivo"
                  />
                  <p-button
                    icon="pi pi-times"
                    (onClick)="clearPhysicalFile()"
                    size="small"
                    severity="secondary"
                    pTooltip="Cancelar"
                  />
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Visualización del PDF -->
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-green-500/10 border border-green-400/30 rounded">
              <div class="flex items-center gap-2">
                <i class="pi pi-file-pdf text-green-400"></i>
                <span class="text-white text-sm">
                  {{ request().physical_document_name || 'Documento físico adjunto' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <p-button
                  icon="pi pi-eye"
                  (onClick)="viewPhysicalDocument()"
                  size="small"
                  severity="info"
                  pTooltip="Ver documento"
                />
                <p-button
                  icon="pi pi-download"
                  (onClick)="downloadPhysicalDocument()"
                  size="small"
                  severity="secondary"
                  pTooltip="Descargar"
                />
              </div>
            </div>
            <div class="text-xs text-gray-400">
              Este documento se incluirá en la notificación al empleado cuando se apruebe la solicitud.
            </div>
          </div>
        }
      </div>

      <!-- Fechas donde trabajó horas extra -->
      @if (getOvertimeDaysFromNotes(request())) {
        <div class="p-5 bg-neutral-800 rounded-lg border border-neutral-700 shadow-lg">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i class="pi pi-calendar-check text-cyan-400"></i>
            Fechas donde trabajó horas extra
          </h3>
          <div class="overflow-x-auto -mx-2">
            <p-table
              [value]="getOvertimeDaysFromNotes(request()) || []"
              styleClass="p-datatable-sm overtime-details-table"
              [paginator]="false"
              [scrollable]="true"
              scrollHeight="300px"
              showGridlines
            >
              <ng-template #header>
                <tr>
                  <th class="text-left font-semibold">Fecha</th>
                  <th class="text-left font-semibold">Hora de Entrada</th>
                  <th class="text-left font-semibold">Hora de Salida</th>
                  <th class="text-right font-semibold">Horas Totales</th>
                  <th class="text-right font-semibold">Tiempo de Almuerzo</th>
                  <th class="text-right font-semibold">Retraso</th>
                  <th class="text-right font-semibold">Horas Extra</th>
                </tr>
              </ng-template>
              <ng-template #body let-dayDetail>
                <tr class="hover:bg-neutral-700/50 transition-colors">
                  <td class="font-semibold text-white py-3">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-calendar text-cyan-400 text-sm"></i>
                      <span>{{ dayDetail.date }}</span>
                    </div>
                  </td>
                  <td class="py-3">
                    <div class="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded">
                      <i class="pi pi-sign-in text-green-400 text-sm"></i>
                      <span class="font-mono text-sm font-semibold text-green-300">{{ dayDetail.entryTime }}</span>
                    </div>
                  </td>
                  <td class="py-3">
                    <div class="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded">
                      <i class="pi pi-sign-out text-red-400 text-sm"></i>
                      <span class="font-mono text-sm font-semibold text-red-300">{{ dayDetail.exitTime }}</span>
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <div class="flex flex-col items-end">
                      <span class="font-semibold text-white text-sm">{{ formatHoursMinutes(dayDetail.totalHours) }}</span>
                      <span class="text-xs text-gray-400 mt-0.5">(neto)</span>
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <span class="text-gray-300 font-medium text-sm">{{ formatHoursMinutes(dayDetail.lunchDuration) }}</span>
                  </td>
                  <td class="text-right py-3">
                    @if (hasDelay(dayDetail.delayHours)) {
                      <span class="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm font-semibold">
                        {{ formatHoursMinutes(dayDetail.delayHours) }}
                      </span>
                    } @else {
                      <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td class="text-right py-3">
                    <span class="px-3 py-1.5 bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 text-cyan-300 rounded-lg font-bold text-sm border border-cyan-400/30">
                      {{ formatHoursMinutes(dayDetail.overtimeHours) }}
                    </span>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      }
    </div>

    <ng-template pTemplate="footer">
      <div class="flex justify-end gap-2">
        <p-button
          label="Cerrar"
          icon="pi pi-times"
          severity="secondary"
          (onClick)="close.emit()"
          [rounded]="true"
        />
      </div>
    </ng-template>
  `,
  styles: `
    ::ng-deep .p-dialog {
      background: #1f2937 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-dialog .p-dialog-header {
      background: #111827 !important;
      border-bottom-color: #374151 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-dialog .p-dialog-content {
      background: #1f2937 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .overtime-details-table .p-datatable-thead > tr > th {
      background: #1f2937 !important;
      color: #e5e7eb !important;
      border-color: #374151 !important;
      padding: 0.75rem 1rem !important;
      font-size: 0.75rem !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    ::ng-deep .overtime-details-table .p-datatable-tbody > tr > td {
      padding: 0.75rem 1rem !important;
      border-color: #374151 !important;
      background: #111827 !important;
    }

    ::ng-deep .overtime-details-table .p-datatable-tbody > tr:hover > td {
      background: #1f2937 !important;
    }

    ::ng-deep .overtime-details-table .p-datatable-scrollable-body {
      border-color: #374151 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompensatoryDetailsDialogComponent {
  private compensatoryService = inject(CompensatoryService);
  private fileService = inject(CompensatoryFileService);

  // Inputs/Outputs
  request = input.required<CompensatoryRequest>();
  close = output<void>();

  // Estado para auditoría
  showAuditSidebar = signal(false);

  // Estado para archivo físico
  selectedPhysicalFile = signal<File | null>(null);
  uploadingPhysicalFile = signal(false);

  // Estado para comentarios
  savingCompensatoryComment = signal(false);

  // Estado para horas extras
  employeeOvertimeHours = signal(0);
  employeeOvertimeDays = signal<Array<{
    day: string;
    overtimeHours: number;
    entryTime?: string;
    exitTime?: string;
    totalHours?: number;
  }>>([]);
  isLoadingOvertimeHours = signal(false);

  // Estado para comentarios
  compensatoryRejectionComment = signal('');

  // Métodos helper delegados al servicio
  getEmployeeName = (request: CompensatoryRequest) =>
    this.compensatoryService.getEmployeeName(request);

  getEmployeeEmail = (request: CompensatoryRequest) =>
    this.compensatoryService.getEmployeeEmail(request);

  getEmployeePosition = (request: CompensatoryRequest) =>
    this.compensatoryService.getEmployeePosition(request);

  getCompensatoryTypeFromNotes = (request: CompensatoryRequest) =>
    this.compensatoryService.getCompensatoryTypeFromNotes(request);

  getCompensatoryQuantity = (request: CompensatoryRequest) =>
    this.compensatoryService.getCompensatoryQuantity(request);

  getCompensatoryReasonFromNotes = (request: CompensatoryRequest) =>
    this.compensatoryService.getCompensatoryReasonFromNotes(request);

  getCompensatoryStatusLabel = (request: CompensatoryRequest) =>
    this.compensatoryService.getCompensatoryStatusLabel(request);

  getCompensatoryStatusSeverity = (request: CompensatoryRequest) =>
    this.compensatoryService.getCompensatoryStatusSeverity(request);

  getCompensatoryTimeRange = (request: CompensatoryRequest) =>
    this.compensatoryService.getCompensatoryTimeRange(request);

  getManualOvertimeDates = (request: CompensatoryRequest) =>
    this.compensatoryService.getManualOvertimeDates(request);

  getManualDateSaldoLabel = (date: string) =>
    this.compensatoryService.getManualDateSaldoLabel(date);

  getOvertimeDaysFromNotes = (request: CompensatoryRequest) =>
    this.compensatoryService.getOvertimeDaysFromNotes(request);

  formatHoursMinutes = (hours: number) =>
    this.compensatoryService.formatHoursMinutes(hours);

  formatDate = (date: string) => formatDate(date);

  hasDelay = (delayHours: string | undefined) => hasDelay(delayHours);

  formatFileSize = (bytes: number) =>
    this.compensatoryService.formatFileSize(bytes);

  // Métodos para manejo de archivos físicos
  onPhysicalFileSelect(event: any): void {
    const file = event.files?.[0];
    if (file) {
      this.selectedPhysicalFile.set(file);
    }
  }

  clearPhysicalFile(): void {
    this.selectedPhysicalFile.set(null);
  }

  async uploadPhysicalFile(): Promise<void> {
    const file = this.selectedPhysicalFile();
    const request = this.request();

    if (!file || !request) return;

    this.uploadingPhysicalFile.set(true);

    try {
      await this.fileService.uploadPhysicalDocument(request.id, file);
      this.selectedPhysicalFile.set(null);
      // TODO: Refresh del request desde el parent
      this.close.emit(); // Temporal - debería refrescar
    } catch (error) {
      console.error('Error subiendo archivo físico:', error);
      // TODO: Mostrar error al usuario
    } finally {
      this.uploadingPhysicalFile.set(false);
    }
  }

  async viewPhysicalDocument(): Promise<void> {
    const request = this.request();
    if (request.physical_document_path) {
      try {
        await this.fileService.viewPhysicalDocument(request.physical_document_path);
      } catch (error) {
        console.error('Error visualizando documento:', error);
      }
    }
  }

  async downloadPhysicalDocument(): Promise<void> {
    const request = this.request();
    if (request.physical_document_path && request.physical_document_name) {
      try {
        await this.fileService.downloadPhysicalDocument(
          request.physical_document_path,
          request.physical_document_name
        );
      } catch (error) {
        console.error('Error descargando documento:', error);
      }
    }
  }

  // Método para guardar comentario de rechazo
  saveCompensatoryRejectionComment(): void {
    const request = this.request();
    if (!request) return;

    // TODO: Implementar guardado de comentario
    console.log('Guardar comentario:', this.compensatoryRejectionComment());
  }
}