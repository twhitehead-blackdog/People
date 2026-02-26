import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { TimeoffAuditLog } from '../../../../services/timeoff-audit.service';
import {
  getCompensatoryQuantity,
  getCompensatoryTypeFromNotes,
  getCompensatoryReasonFromNotes,
  getCompensatoryDateFromNotes,
  getCompensatoryTimeFromNotes,
  getCompensatoryOvertimeDatesFromNotes,
  getOvertimeDaysFromNotes,
  hasDelay,
  formatDateDDMMYYYY,
  parseDDMMYYYYToISO,
} from '../../shared/utils/compensatory-parsing.utils';
import { CompensatoryRequest } from '../models/disability.model';

export interface OvertimeDay {
  day: string;
  overtimeHours: number;
  entryTime?: string;
  exitTime?: string;
  totalHours?: number;
}

@Component({
  selector: 'pt-compensatory-details-dialog',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }

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
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white"
            >Detalles de Solicitud de Tiempo Compensatorio</span
          >
          <div class="flex items-center gap-2">
            <p-button
              [icon]="
                attachingDoc()
                  ? 'pi pi-spin pi-spinner'
                  : request()?.document_url
                  ? 'pi pi-file'
                  : 'pi pi-paperclip'
              "
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="
                request()?.document_url
                  ? openDocument.emit()
                  : attachDocument.emit()
              "
              [pTooltip]="
                attachingDoc()
                  ? 'Subiendo documento...'
                  : request()?.document_url
                  ? 'Ver documento adjunto'
                  : 'Adjuntar documento'
              "
              tooltipPosition="left"
              size="small"
              [disabled]="attachingDoc()"
            />
            <p-button
              icon="pi pi-history"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="toggleAuditSidebar.emit()"
              [styleClass]="
                showAuditSidebar() ? 'bg-cyan-500/20 text-cyan-400' : ''
              "
              pTooltip="Ver historial de cambios"
              tooltipPosition="left"
              size="small"
            />
          </div>
        </div>
      </ng-template>
      @if (request()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Horas Extras Disponibles (lado a lado) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Información del Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-cyan-400"></i>
              Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Nombre</label
                >
                <p class="text-white">
                  {{ getEmployeeName(request()!) }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ getEmployeeEmail(request()!) }}
                </p>
              </div>
              @if (getEmployeePosition(request()!)) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ getEmployeePosition(request()!) }}
                </p>
              </div>
              } @if (request()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ request()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Horas Extra Pendientes (histórico) -->
          <div
            class="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
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
                <p class="text-sm text-gray-400 mb-1">
                  Total pendiente (no usado)
                </p>
                <p class="text-3xl font-bold text-cyan-300">
                  {{ formatHoursMinutes(employeeOvertimeHours()) }}
                </p>
              </div>
              <div
                class="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center"
              >
                <i class="pi pi-clock text-cyan-400 text-3xl"></i>
              </div>
            </div>
            @if (employeeOvertimeDays().length > 0) {
            <!-- Mostrar días con horas extras -->
            <div class="mt-3">
              <p class="text-xs font-medium text-gray-300 mb-2">
                Días con saldo pendiente (mostrando últimos
                {{ employeeOvertimeDays().length }}):
              </p>
              <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                @for (day of employeeOvertimeDays(); track day.day) {
                <div
                  class="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-2 hover:bg-cyan-500/20 transition-colors"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold text-cyan-300">
                      {{ formatDate(day.day) }}
                    </span>
                    <span class="text-xs font-bold text-cyan-400">
                      {{ formatHoursMinutes(day.overtimeHours) }}
                    </span>
                  </div>
                  @if (day.entryTime && day.exitTime) {
                  <div class="text-xs text-gray-400">
                    {{ day.entryTime }} - {{ day.exitTime }}
                  </div>
                  }
                </div>
                }
              </div>
              <div class="mt-3 flex items-center justify-between gap-2">
                <p class="text-[11px] text-gray-400 m-0">
                  Cargando histórico: últimos
                  {{ overtimeHistoryWindowDays() }} días
                </p>
                <p-button
                  label="Cargar más"
                  icon="pi pi-plus"
                  size="small"
                  severity="secondary"
                  [outlined]="true"
                  (onClick)="loadMoreOvertime.emit()"
                />
              </div>
            </div>
            } @else {
            <p class="text-xs text-gray-400 mt-3">
              No hay días con horas extra pendientes dentro del rango cargado.
            </p>
            } }
          </div>
        </div>

        <!-- Información de la Solicitud -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-cyan-400"></i>
            Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Solicitud</label
              >
              <p class="text-white">
                @let compensatoryType =
                getCompensatoryTypeFromNotes(request()!);
                @if (compensatoryType === 'days') {
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
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Cantidad Solicitada</label
              >
              <p class="text-white">
                @let quantity =
                getCompensatoryQuantity(request()!); @if
                (quantity && quantity.value > 0) { @if (quantity.isDays) {
                {{ quantity.value }} día(s) ({{ quantity.value * 8 }} horas) }
                @else {
                {{ formatHoursMinutes(quantity.value) }}
                } } @else {
                <span class="text-gray-400">No especificada</span>
                }
              </p>
            </div>
            @let dateFrom = request()!.date_from |
            date : 'dd/MM/yyyy' : 'UTC'; @let dateTo =
            request()!.date_to | date : 'dd/MM/yyyy' : 'UTC';
            @if (dateFrom) {
              @if (dateFrom === dateTo) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha del Compensatorio</label
              >
              <p class="text-white font-medium text-cyan-400">
                {{ dateFrom }}
              </p>
            </div>
              } @else {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Período del Compensatorio</label
              >
              <p class="text-white font-medium text-cyan-400">{{ dateFrom }} → {{ dateTo }}</p>
            </div>
              }
            } @else {
              @let compensatoryDate = getCompensatoryDateFromNotes(request()!);
              @if (compensatoryDate) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha del Compensatorio</label
              >
              <p class="text-white">
                {{ compensatoryDate | date : 'dd/MM/yyyy' : 'UTC' }}
              </p>
            </div>
              }
            } @let timeInfo =
            getCompensatoryTimeFromNotes(request()!); @if
            (timeInfo.start || timeInfo.end) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Horario del Compensatorio</label
              >
              <p class="text-white font-mono">
                @if (timeInfo.start && timeInfo.end) {
                {{ timeInfo.start }} - {{ timeInfo.end }} } @else if
                (timeInfo.start) { Desde: {{ timeInfo.start }} } @else if
                (timeInfo.end) { Hasta: {{ timeInfo.end }}
                }
              </p>
            </div>
            }
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{
                  request()!.created_at
                    | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="
                  getCompensatoryStatusLabel(request()!)
                "
                [severity]="
                  getCompensatoryStatusSeverity(request()!)
                "
              />
            </div>
            @let overtimeDates =
            getCompensatoryOvertimeDatesFromNotes(request()!);
            @if (overtimeDates.length > 0) {
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-400 mb-2"
                >Días donde trabajó horas extra (reportados por el
                empleado)</label
              >
              <div class="flex flex-wrap gap-2">
                @for (date of overtimeDates; track date) {
                <span
                  class="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex flex-col gap-0.5"
                >
                  <span class="font-semibold text-white text-sm">
                    {{ date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                  <span class="text-gray-300 text-xs">
                    {{ getManualDateSaldoLabel(date) }}
                  </span>
                </span>
                }
              </div>
              <p class="text-xs text-gray-400 mt-2">
                Total de días reportados: {{ overtimeDates.length }}
              </p>
            </div>
            }
          </div>

          @let reason =
          getCompensatoryReasonFromNotes(request()!); @if
          (reason) {
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Motivo</label
            >
            <p
              class="text-white whitespace-pre-wrap bg-neutral-900/50 p-3 rounded"
            >
              {{ reason }}
            </p>
          </div>
          } @if (request()!.rejection_comment) {
          <div class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <label class="block text-sm font-medium text-red-400 mb-1"
              >Comentario de Rechazo</label
            >
            <p class="text-red-300 whitespace-pre-wrap">
              {{ request()!.rejection_comment }}
            </p>
          </div>
          } @if (request()!.rejection_comment ||
          request()!.review_status === 'rejected') {
          <div
            class="mt-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
          >
            <label class="block text-sm font-medium text-gray-400 mb-2">
              Motivo de Rechazo (editable)
            </label>
            <textarea
              pInputTextarea
              [(ngModel)]="rejectionComment"
              placeholder="Agregar o editar el motivo del rechazo..."
              rows="3"
              class="w-full"
            ></textarea>
            <div class="flex justify-end mt-2">
              <p-button
                label="Guardar Comentario"
                icon="pi pi-save"
                size="small"
                [loading]="savingComment()"
                (onClick)="saveComment.emit(rejectionComment())"
              />
            </div>
          </div>
          }
        </div>

        <!-- Fechas donde trabajó horas extra -->
        @if (getOvertimeDaysFromNotes(request()!)) {
        <div
          class="p-5 bg-neutral-800 rounded-lg border border-neutral-700 shadow-lg"
        >
          <h3
            class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
          >
            <i class="pi pi-calendar-check text-cyan-400"></i>
            Fechas donde trabajó horas extra
          </h3>
          <div class="overflow-x-auto -mx-2">
            <p-table
              [value]="
                getOvertimeDaysFromNotes(request()!) || []
              "
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
                    <div
                      class="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded"
                    >
                      <i class="pi pi-sign-in text-green-400 text-sm"></i>
                      <span
                        class="font-mono text-sm font-semibold text-green-300"
                        >{{ dayDetail.entryTime }}</span
                      >
                    </div>
                  </td>
                  <td class="py-3">
                    <div
                      class="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded"
                    >
                      <i class="pi pi-sign-out text-red-400 text-sm"></i>
                      <span
                        class="font-mono text-sm font-semibold text-red-300"
                        >{{ dayDetail.exitTime }}</span
                      >
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <div class="flex flex-col items-end">
                      <span class="font-semibold text-white text-sm">{{
                        formatHoursMinutes(dayDetail.totalHours)
                      }}</span>
                      <span class="text-xs text-gray-400 mt-0.5">(neto)</span>
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <span class="text-gray-300 font-medium text-sm">{{
                      formatHoursMinutes(dayDetail.lunchDuration)
                    }}</span>
                  </td>
                  <td class="text-right py-3">
                    @if (hasDelay(dayDetail.delayHours)) {
                    <span
                      class="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm font-semibold"
                    >
                      {{ formatHoursMinutes(dayDetail.delayHours) }}
                    </span>
                    } @else {
                    <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td class="text-right py-3">
                    <span
                      class="px-3 py-1.5 bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 text-cyan-300 rounded-lg font-bold text-sm border border-cyan-400/30"
                    >
                      {{ formatHoursMinutes(dayDetail.overtimeHours) }}
                    </span>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
        }

        <!-- Documento Adjunto (inline) -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-file text-cyan-400"></i>
            Documento Adjunto
          </h3>
          @if (request()?.document_url) {
          <div
            class="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700"
          >
            <div
              class="p-2 border-b border-neutral-700 flex items-center justify-between"
            >
              <span class="text-sm text-gray-400 flex items-center gap-2">
                <i class="pi pi-check-circle text-green-400"></i>
                Documento disponible
              </span>
              <div class="flex items-center gap-2">
                <p-button
                  icon="pi pi-download"
                  (onClick)="downloadDocument.emit()"
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  size="small"
                  pTooltip="Descargar"
                />
                <p-button
                  icon="pi pi-upload"
                  (onClick)="attachDocument.emit()"
                  [text]="true"
                  [rounded]="true"
                  severity="info"
                  size="small"
                  pTooltip="Adjuntar nuevo"
                  [loading]="attachingDoc()"
                  [disabled]="attachingDoc()"
                />
              </div>
            </div>
            <div class="h-[400px] overflow-auto bg-neutral-900">
              <iframe
                [src]="documentUrl()"
                class="w-full h-[600px] border-0 bg-white"
                title="Preview del documento"
              ></iframe>
            </div>
          </div>
          } @else {
          <div
            class="flex flex-col items-center justify-center py-8 text-center bg-neutral-900/50 rounded-lg border border-dashed border-neutral-600"
          >
            <i class="pi pi-file text-4xl text-gray-500 mb-3"></i>
            <p class="text-gray-400 mb-4">No hay documento adjunto</p>
            <p-button
              label="Adjuntar documento"
              icon="pi pi-upload"
              severity="info"
              (onClick)="attachDocument.emit()"
              [loading]="attachingDoc()"
              [disabled]="attachingDoc()"
            />
          </div>
          }
        </div>
      </div>
      }

      <!-- Panel lateral de historial (deslizable desde la derecha) -->
      <div
        class="fixed bg-neutral-900 border-l border-neutral-700 shadow-2xl z-[1200] transition-all duration-500 ease-out"
        [style.width]="'320px'"
        [style.max-width]="'30vw'"
        [style.top]="'50%'"
        [style.left]="showAuditSidebar() ? 'calc(50% + 400px)' : '50%'"
        [style.transform]="
          showAuditSidebar()
            ? 'translateY(-50%) translateX(0) scale(1)'
            : 'translateY(-50%) translateX(0) scale(0.8)'
        "
        [style.opacity]="showAuditSidebar() ? '1' : '0'"
        [style.max-height]="'90vh'"
        [style.height]="'664px'"
        [style.pointer-events]="showAuditSidebar() ? 'auto' : 'none'"
      >
        <div class="flex flex-col h-full">
          <!-- Header del panel lateral -->
          <div
            class="p-4 border-b border-neutral-700 bg-neutral-800 flex items-center justify-between"
          >
            <h3
              class="text-lg font-semibold text-white flex items-center gap-2"
            >
              <i class="pi pi-history text-cyan-400"></i>
              Historial de Cambios
            </h3>
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="closeAuditSidebar.emit()"
              size="small"
            />
          </div>

          <!-- Contenido del historial -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (isLoadingAuditHistory()) {
            <div
              class="flex items-center justify-center gap-2 text-gray-400 py-8"
            >
              <i class="pi pi-spin pi-spinner"></i>
              <span class="text-sm">Cargando historial...</span>
            </div>
            } @else if (auditHistory().length === 0) {
            <div class="text-center py-8 text-gray-400">
              <i class="pi pi-info-circle text-4xl mb-4"></i>
              <p class="text-sm">No hay historial de cambios disponible</p>
            </div>
            } @else {
            <div class="space-y-3">
              @for (log of auditHistory(); track log.id) { @let isExpanded =
              expandedAuditItems().has(log.id);
              <div
                class="rounded-lg bg-gradient-to-br from-neutral-800/80 to-neutral-800/50 border border-neutral-700/70 overflow-hidden transition-all hover:border-cyan-500/30 shadow-lg"
              >
                <!-- Contenido siempre visible -->
                <div class="p-4 space-y-3">
                  <!-- Header con usuario y acción -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        [class]="
                          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' +
                          getActionColor(log.action)
                            .replace('text-', 'bg-')
                            .replace('-400', '-500/20')
                        "
                      >
                        <i
                          [class]="
                            'pi ' +
                            getActionIcon(log.action) +
                            ' ' +
                            getActionColor(log.action) +
                            ' text-lg'
                          "
                        ></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-white font-semibold text-sm mb-1">
                          {{
                            log.changed_by_employee
                              ? log.changed_by_employee.first_name +
                                ' ' +
                                log.changed_by_employee.father_name
                              : 'Usuario desconocido'
                          }}
                        </div>
                        <div class="text-gray-400 text-xs mb-2">
                          {{ getActionLabel(log.action) }}
                        </div>
                        <div
                          class="text-gray-500 text-xs flex items-center gap-1"
                        >
                          <i class="pi pi-calendar text-[10px]"></i>
                          {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}
                        </div>
                      </div>
                    </div>
                    <!-- Botón para colapsar/expandir -->
                    <button
                      type="button"
                      (click)="onToggleAuditItem.emit(log.id)"
                      class="flex-shrink-0 p-1.5 rounded hover:bg-neutral-700 transition-colors"
                      [class.bg-neutral-700]="isExpanded"
                    >
                      <i
                        [class]="
                          'pi transition-transform duration-200 text-gray-400 text-xs ' +
                          (isExpanded ? 'pi-chevron-up' : 'pi-chevron-down')
                        "
                      ></i>
                    </button>
                  </div>

                  <!-- Contenido expandible con más detalles -->
                  @if (isExpanded) {
                  <div
                    class="pt-3 mt-3 border-t border-neutral-700/50 space-y-3 animate-fade-in"
                  >
                    @if (log.old_status && log.new_status) {
                    <div
                      class="p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50"
                    >
                      <div class="text-xs text-gray-400 mb-2 font-medium">
                        Cambio de Estado
                      </div>
                      <div class="flex items-center gap-2">
                        <span
                          class="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-semibold border border-yellow-500/30"
                        >
                          {{ getStatusLabel(log.old_status) }}
                        </span>
                        <i class="pi pi-arrow-right text-gray-500 text-sm"></i>
                        <span
                          class="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30"
                        >
                          {{ getStatusLabel(log.new_status) }}
                        </span>
                      </div>
                    </div>
                    } @if (log.comment) {
                    <div
                      class="p-3 bg-cyan-500/10 rounded-lg border-l-4 border-cyan-400"
                    >
                      <div
                        class="text-xs text-cyan-300 mb-1.5 font-medium flex items-center gap-1"
                      >
                        <i class="pi pi-comment text-[10px]"></i>
                        Comentario
                      </div>
                      <p class="text-gray-200 text-xs leading-relaxed italic">
                        {{ log.comment }}
                      </p>
                    </div>
                    }
                  </div>
                  }
                </div>
              </div>
              }
            </div>
            }
          </div>
        </div>
      </div>

      <!-- Overlay para cerrar el panel al hacer clic fuera -->
      @if (showAuditSidebar()) {
      <div
        class="fixed inset-0 bg-black/50 z-[1199]"
        (click)="closeAuditSidebar.emit()"
      ></div>
      }
    </p-dialog>
  `,
})
export class CompensatoryDetailsDialogComponent {
  private sanitizer = inject(DomSanitizer);

  // Dialog visibility
  visible = model.required<boolean>();

  // Data inputs
  request = input.required<CompensatoryRequest | null>();
  attachingDoc = input<boolean>(false);
  showAuditSidebar = input<boolean>(false);
  savingComment = input<boolean>(false);
  rejectionComment = model<string>('');

  // Overtime inputs
  isLoadingOvertimeHours = input<boolean>(false);
  employeeOvertimeHours = input<number>(0);
  employeeOvertimeDays = input<OvertimeDay[]>([]);
  employeeOvertimeDaysAll = input<OvertimeDay[]>([]);
  overtimeHistoryWindowDays = input<number>(365);

  // Audit history inputs
  isLoadingAuditHistory = input<boolean>(false);
  auditHistory = input<TimeoffAuditLog[]>([]);
  expandedAuditItems = input<Set<string>>(new Set());

  // Outputs
  toggleAuditSidebar = output<void>();
  closeAuditSidebar = output<void>();
  onToggleAuditItem = output<string>();
  openDocument = output<void>();
  attachDocument = output<void>();
  downloadDocument = output<void>();
  saveComment = output<string>();
  loadMoreOvertime = output<void>();

  // Computed: sanitized document URL
  public documentUrl = computed(() => {
    const req = this.request();
    if (!req?.document_url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${req.document_url}#toolbar=1&navpanes=1&scrollbar=1`
    );
  });

  // Employee helpers
  public getEmployeeName(request: CompensatoryRequest): string {
    if (request.employee) {
      return `${request.employee.first_name || ''} ${request.employee.father_name || ''}`.trim();
    }
    return 'Empleado';
  }

  public getEmployeeEmail(request: CompensatoryRequest): string {
    return request.employee?.work_email || '';
  }

  public getEmployeePosition(request: CompensatoryRequest): string | null {
    return request.employee?.position?.name || null;
  }

  // Compensatory parsing utils (delegated)
  public getCompensatoryTypeFromNotes = getCompensatoryTypeFromNotes;
  public getCompensatoryQuantity = getCompensatoryQuantity;
  public getCompensatoryDateFromNotes = getCompensatoryDateFromNotes;
  public getCompensatoryTimeFromNotes = getCompensatoryTimeFromNotes;
  public getCompensatoryOvertimeDatesFromNotes = getCompensatoryOvertimeDatesFromNotes;
  public getCompensatoryReasonFromNotes = getCompensatoryReasonFromNotes;
  public getOvertimeDaysFromNotes = getOvertimeDaysFromNotes;
  public hasDelay = hasDelay;

  // Status helpers
  public getCompensatoryStatusLabel(request: CompensatoryRequest): string {
    if (request.is_approved) return 'Aprobado';
    if (request.rejection_comment || request.review_status === 'rejected') return 'Rechazado';
    if (request.review_status === 'approved') return 'En Registro';
    return 'Pendiente';
  }

  public getCompensatoryStatusSeverity(
    request: CompensatoryRequest
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (request.is_approved) return 'success';
    if (request.rejection_comment || request.review_status === 'rejected') return 'danger';
    if (request.review_status === 'approved') return 'info';
    return 'warn';
  }

  // Audit helpers
  public getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      created: 'creó la solicitud',
      status_changed: 'cambió el estado',
      approved: 'aprobó la solicitud',
      rejected: 'rechazó la solicitud',
      registered: 'registró la solicitud',
      updated: 'actualizó la solicitud',
    };
    return labels[action] || action;
  }

  public getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      created: 'pi-plus-circle',
      status_changed: 'pi-sync',
      approved: 'pi-check-circle',
      rejected: 'pi-times-circle',
      registered: 'pi-save',
      updated: 'pi-pencil',
    };
    return icons[action] || 'pi-circle';
  }

  public getActionColor(action: string): string {
    const colors: Record<string, string> = {
      created: 'text-blue-400',
      status_changed: 'text-yellow-400',
      approved: 'text-green-400',
      rejected: 'text-red-400',
      registered: 'text-cyan-400',
      updated: 'text-gray-400',
    };
    return colors[action] || 'text-gray-400';
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      registered: 'Registrado',
    };
    return labels[status] || status;
  }

  // Format helpers
  public formatHoursMinutes(hours: number): string {
    if (hours === 0) return '0m';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (wholeHours === 0) return `${minutes}m`;
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}m`;
  }

  public formatDate(dateString: string): string {
    return formatDateDDMMYYYY(dateString);
  }

  public getManualDateSaldoLabel(dateStr: string): string {
    const isoDay = parseDDMMYYYYToISO(dateStr);
    if (!isoDay) return 'Horas Extras 0';

    const match = this.employeeOvertimeDaysAll().find((d) => d.day === isoDay);
    if (!match) return 'Horas Extras 0';

    const remaining = Number(match.overtimeHours ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return 'Horas Extras 0';
    }

    const wholeHours = Math.floor(remaining);
    const minutes = Math.round((remaining - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, '0')}h ${minutes
      .toString()
      .padStart(2, '0')}m`;
  }
}
