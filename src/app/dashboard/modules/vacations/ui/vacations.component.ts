import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { format as formatDate } from 'date-fns';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { ScheduleAutoAssignService } from '../../../../services/schedule-auto-assign.service';
import { TimeoffAuditService } from '../../../../services/timeoff-audit.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { getEnv } from '../../../../utils/env.utils';
import { HrFiltersPanelComponent } from '../../shared/components/hr-filters-panel.component';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import {
  STATUS_OPTIONS,
  calculateDaysBetween,
  getStatusLabel,
  getStatusSeverity,
} from '../../shared/utils/hr-status.utils';
import { VacationsService } from '../data/vacations.service';
import { VacationRequest } from '../models/vacation-request.model';

@Component({
  selector: 'pt-vacations',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    HrStatsGridComponent,
    HrFiltersPanelComponent,
    SafeUrlPipe,
    Textarea,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-3">
      <!-- Estadísticas Compactas -->
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-calendar"
      />

      <!-- Filtros -->
      <pt-hr-filters-panel
        [statusOptions]="statusOptions"
        [totalCount]="totalCount()"
        [filteredCount]="filteredVacations().length"
        searchPlaceholder="Empleado..."
        (searchChange)="onSearchChange($event)"
        (statusChange)="onStatusChange($event)"
        (dateRangeChange)="onDateRangeChange($event)"
        (clearFilters)="onClearFilters()"
      />

      <!-- Tabla de Vacaciones -->
      @if (service.isLoading()) {
      <div class="flex justify-center py-8">
        <p-progressSpinner />
      </div>
      } @else if (filteredVacations().length === 0) {
      <div
        class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-8"
      >
        <div class="text-center">
          <i class="pi pi-calendar text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">
            No se encontraron solicitudes de vacaciones
          </p>
        </div>
      </div>
      } @else {
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <!-- Header -->
        <div class="p-2 border-b border-neutral-700/50">
          <h3
            class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
          >
            <i class="pi pi-calendar text-cyan-400 text-sm"></i>
            Solicitudes de Vacaciones
          </h3>
        </div>
        <p-table
          [value]="filteredVacations()"
          [paginator]="true"
          [rows]="8"
          [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
          paginatorPosition="bottom"
          [scrollable]="true"
          scrollHeight="600px"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 180px; padding: 0.4rem; text-align: left;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user text-cyan-400 text-xs"></i>
                  <span class="text-xs">Empleado</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                  <span class="text-xs">Fecha Inicio</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                  <span class="text-xs">Fecha Fin</span>
                </div>
              </th>
              <th style="width: 100px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-clock text-cyan-400 text-xs"></i>
                  <span class="text-xs">Días</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-tag text-cyan-400 text-xs"></i>
                  <span class="text-xs">Estado</span>
                </div>
              </th>
              <th style="width: 140px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                  <span class="text-xs">Creador</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar-plus text-cyan-400 text-xs"></i>
                  <span class="text-xs">Solicitado</span>
                </div>
              </th>
              <th style="width: 180px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-cog text-cyan-400 text-xs"></i>
                  <span class="text-xs">Acciones</span>
                </div>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-vacation>
            <tr
              class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
              (click)="viewDetails(vacation)"
            >
              <td style="padding: 0.4rem;">
                <div class="flex items-center gap-1">
                  <div
                    class="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-user text-cyan-400 text-[9px]"></i>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-medium text-white text-xs truncate">
                      {{ vacation.employee?.first_name }}
                      {{ vacation.employee?.father_name }}
                    </span>
                    <span class="text-[9px] text-gray-400 truncate">
                      {{ vacation.employee?.branch?.name || '-' }}
                    </span>
                  </div>
                </div>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-sm text-gray-300">
                  {{ vacation.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
                </span>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-sm text-gray-300">
                  {{ vacation.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
                </span>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-sm font-medium text-cyan-400">
                  {{ calculateDays(vacation.start_date, vacation.end_date) }}
                </span>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <p-tag
                  [value]="getStatusLabel(vacation.status)"
                  [severity]="getStatusSeverity(vacation.status)"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                @if (vacation.created_by_employee) {
                <div class="flex flex-col items-center gap-0.5">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">
                      {{ vacation.created_by_employee.first_name }}
                      {{ vacation.created_by_employee.father_name }}
                    </span>
                  </div>
                </div>
                } @else {
                <span class="text-[10px] text-gray-500 italic">
                  Auto-solicitud
                </span>
                }
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-xs text-gray-400">
                  {{ vacation.created_at | date : 'dd/MM/yyyy' }}
                </span>
                <br />
                <span class="text-xs text-gray-500">
                  {{ vacation.created_at | date : 'HH:mm' }}
                </span>
              </td>
              <td
                style="padding: 0.4rem; text-align: center;"
                (click)="$event.stopPropagation()"
              >
                <div class="flex gap-0.5 justify-center">
                  @if (vacation.status === 'pending') {
                  <p-button
                    icon="pi pi-check"
                    [text]="true"
                    severity="success"
                    size="small"
                    pTooltip="Aprobar"
                    tooltipPosition="top"
                    [rounded]="true"
                    (onClick)="
                      approveVacation(vacation); $event.stopPropagation()
                    "
                  />
                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    severity="danger"
                    size="small"
                    pTooltip="Rechazar"
                    tooltipPosition="top"
                    [rounded]="true"
                    (onClick)="
                      rejectVacation(vacation); $event.stopPropagation()
                    "
                  />
                  }
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    size="small"
                    pTooltip="Ver detalles"
                    tooltipPosition="top"
                    [rounded]="true"
                    (onClick)="viewDetails(vacation); $event.stopPropagation()"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      }
    </div>

    <!-- Diálogo de Detalles de Vacaciones -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center w-full">
          <span class="text-lg font-semibold text-white"
            >Detalles de Vacaciones</span
          >
        </div>
      </ng-template>

      @if (selectedVacation()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Resumen de Vacaciones (lado a lado) -->
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
                  {{ selectedVacation()!.employee?.first_name }}
                  {{ selectedVacation()!.employee?.father_name }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ selectedVacation()!.employee?.work_email || '-' }}
                </p>
              </div>
              @if (selectedVacation()!.employee?.position?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ selectedVacation()!.employee?.position?.name }}
                </p>
              </div>
              } @if (selectedVacation()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ selectedVacation()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Resumen de Vacaciones -->
          <div
            class="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-calendar-check text-cyan-400"></i>
              Resumen de Vacaciones
            </h3>
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">Duración total</p>
                <p class="text-3xl font-bold text-cyan-300">
                  {{
                    calculateDays(
                      selectedVacation()!.start_date,
                      selectedVacation()!.end_date
                    )
                  }}
                  días
                </p>
              </div>
              <div
                class="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center"
              >
                <i class="pi pi-calendar text-cyan-400 text-3xl"></i>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <div
                class="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-cyan-300">
                    Fecha Inicio
                  </span>
                  <span class="text-xs font-bold text-cyan-400">
                    {{ selectedVacation()!.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </div>
              </div>
              <div
                class="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-cyan-300">
                    Fecha Fin
                  </span>
                  <span class="text-xs font-bold text-cyan-400">
                    {{ selectedVacation()!.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </div>
              </div>
            </div>
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
                >Fecha de Inicio</label
              >
              <p class="text-white">
                {{ selectedVacation()!.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Fin</label
              >
              <p class="text-white">
                {{ selectedVacation()!.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Duración</label
              >
              <p class="text-white">
                {{
                  calculateDays(
                    selectedVacation()!.start_date,
                    selectedVacation()!.end_date
                  )
                }}
                día(s)
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getStatusLabel(selectedVacation()!.status)"
                [severity]="getStatusSeverity(selectedVacation()!.status)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{ selectedVacation()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Creador</label
              >
              <p class="text-white">
                @if (selectedVacation()?.created_by_employee) {
                {{ selectedVacation()!.created_by_employee!.first_name }}
                {{ selectedVacation()!.created_by_employee!.father_name }}
                } @else if (selectedVacation()?.created_by &&
                selectedVacation()?.created_by !==
                selectedVacation()?.employee_id) {
                <span class="text-amber-300">Gerente</span>
                } @else {
                <span class="text-gray-400">Auto-solicitud</span>
                }
              </p>
            </div>
          </div>
        </div>

        @if (selectedVacation()!.reason) {
        <!-- Motivo -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-cyan-400"></i>
            Motivo
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ selectedVacation()!.reason }}
          </p>
        </div>
        } @if (selectedVacation()!.status === 'rejected' &&
        selectedVacation()!.rejection_comment) {
        <!-- Motivo de Rechazo -->
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-red-400"></i>
            Motivo de Rechazo
          </h3>
          <p class="text-red-300 whitespace-pre-wrap">
            {{ selectedVacation()!.rejection_comment }}
          </p>
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
          @if (selectedVacation()?.document_url) {
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
                  icon="pi pi-search-minus"
                  (onClick)="zoomOut()"
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  size="small"
                  [disabled]="documentZoomLevel() <= 0.5"
                  pTooltip="Alejar"
                />
                <span class="text-sm text-gray-400 min-w-[50px] text-center">
                  {{ (documentZoomLevel() * 100).toFixed(0) }}%
                </span>
                <p-button
                  icon="pi pi-search-plus"
                  (onClick)="zoomIn()"
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  size="small"
                  [disabled]="documentZoomLevel() >= 2"
                  pTooltip="Acercar"
                />
                <p-button
                  icon="pi pi-download"
                  (onClick)="
                    downloadDocument(selectedVacation()!.document_url!)
                  "
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  size="small"
                  pTooltip="Descargar"
                />
                <p-button
                  icon="pi pi-upload"
                  (onClick)="attachDocument()"
                  [text]="true"
                  [rounded]="true"
                  severity="info"
                  size="small"
                  pTooltip="Adjuntar nuevo"
                />
              </div>
            </div>
            <div class="h-[400px] overflow-auto bg-neutral-900">
              <div
                [style.transform]="'scale(' + documentZoomLevel() + ')'"
                [style.transform-origin]="'top center'"
                class="transition-transform duration-200"
                style="width: 100%; min-height: 100%;"
              >
                <iframe
                  [src]="getVacationDocumentUrl() | safeUrl"
                  class="w-full h-[600px] border-0 bg-white"
                  title="Preview del documento"
                ></iframe>
              </div>
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
              (onClick)="attachDocument()"
            />
          </div>
          }
        </div>

      </div>
      }
      <ng-template pTemplate="footer">
        @if (selectedVacation()) {
        <div class="flex items-center gap-3">
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="selectedVacation()!.status === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.12)] cursor-default'
              : 'bg-neutral-800 text-amber-400/70 border border-neutral-600 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300 cursor-pointer'"
            [disabled]="selectedVacation()!.status === 'pending'"
            (click)="updateVacationStatusFromDialog('pending')"
          >
            <i class="pi pi-clock text-xs"></i>
            Pendiente
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="selectedVacation()!.status === 'approved'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)] cursor-default'
              : 'bg-neutral-800 text-emerald-400/70 border border-neutral-600 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 cursor-pointer'"
            [disabled]="selectedVacation()!.status === 'approved'"
            (click)="updateVacationStatusFromDialog('approved')"
          >
            <i class="pi pi-check-circle text-xs"></i>
            Aprobada
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="selectedVacation()!.status === 'rejected'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.12)] cursor-default'
              : 'bg-neutral-800 text-red-400/70 border border-neutral-600 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 cursor-pointer'"
            [disabled]="selectedVacation()!.status === 'rejected'"
            (click)="openRejectionDialog()"
          >
            <i class="pi pi-times-circle text-xs"></i>
            Rechazada
          </button>
        </div>
        }
      </ng-template>
    </p-dialog>

    <!-- Diálogo de Confirmación de Rechazo -->
    <p-dialog
      [(visible)]="showRejectionDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      (onHide)="rejectionComment.set('')"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-red-400"></i>
          <span class="text-lg font-semibold text-white"
            >Confirmar Rechazo</span
          >
        </div>
      </ng-template>

      <div class="space-y-4 pt-4">
        <p class="text-gray-300">
          Por favor, indica el motivo del rechazo de esta solicitud de
          vacaciones.
        </p>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">
            Motivo de Rechazo <span class="text-red-400">*</span>
          </label>
          <textarea
            pTextarea
            [(ngModel)]="rejectionComment"
            rows="4"
            placeholder="Escribe el motivo del rechazo..."
            class="w-full"
            maxlength="500"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            {{ rejectionComment().length }}/500 caracteres
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="showRejectionDialog.set(false)"
          />
          <p-button
            label="Confirmar Rechazo"
            severity="danger"
            icon="pi pi-times"
            [disabled]="!rejectionComment().trim()"
            (onClick)="confirmRejection()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class VacationsComponent {
  public service = inject(VacationsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);
  private http = inject(HttpClient);
  private domSanitizer = inject(DomSanitizer);
  private auditService = inject(TimeoffAuditService);
  private scheduleAutoAssign = inject(ScheduleAutoAssignService);

  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Signals for details dialog
  public showDetailsDialog = signal(false);
  public selectedVacation = signal<VacationRequest | null>(null);

  // Signals for document preview
  public showDocumentPreview = signal(false);
  public documentZoomLevel = signal(1);

  // Signals for rejection dialog
  public showRejectionDialog = signal(false);
  public rejectionComment = signal('');

  public statusOptions = STATUS_OPTIONS;

  public totalCount = computed(() => this.service.value().length);
  public pendingCount = computed(
    () => this.service.value().filter((v) => v.status === 'pending').length
  );
  public approvedCount = computed(
    () => this.service.value().filter((v) => v.status === 'approved').length
  );
  public rejectedCount = computed(
    () => this.service.value().filter((v) => v.status === 'rejected').length
  );

  public filteredVacations = computed(() => {
    let vacations = this.service.value();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const range = this.dateRange();

    if (search) {
      vacations = vacations.filter(
        (v) =>
          v.employee?.first_name.toLowerCase().includes(search) ||
          v.employee?.father_name.toLowerCase().includes(search) ||
          v.employee?.work_email?.toLowerCase().includes(search)
      );
    }
    if (status) {
      vacations = vacations.filter((v) => v.status === status);
    }
    if (range && range[0] && range[1]) {
      const start = range[0];
      const end = range[1];
      vacations = vacations.filter((v) => {
        const createdAt = new Date(v.created_at);
        return createdAt >= start && createdAt <= end;
      });
    }
    return vacations;
  });

  // Filter event handlers
  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  onStatusChange(value: string | null): void {
    this.selectedStatus.set(value);
  }

  onDateRangeChange(value: Date[] | null): void {
    this.dateRange.set(value);
  }

  onClearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  // Utility methods
  getStatusLabel = getStatusLabel;
  getStatusSeverity = getStatusSeverity;

  calculateDays(start: string, end: string): number {
    return calculateDaysBetween(start, end);
  }

  // Action methods
  approveVacation(vacation: VacationRequest) {
    this.confirmationService.confirm({
      message: `¿Aprobar solicitud de vacaciones de ${vacation.employee?.first_name} ${vacation.employee?.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateVacationStatus(vacation.id, 'approved'),
    });
  }

  rejectVacation(vacation: VacationRequest) {
    this.confirmationService.confirm({
      message: `¿Rechazar solicitud de vacaciones de ${vacation.employee?.first_name} ${vacation.employee?.father_name}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateVacationStatus(vacation.id, 'rejected'),
    });
  }

  viewDetails(vacation: VacationRequest): void {
    this.selectedVacation.set(vacation);
    this.showDetailsDialog.set(true);
  }

  // Document management methods
  public openDocument(): void {
    if (this.selectedVacation()?.document_url) {
      this.showDocumentPreview.set(true);
    }
  }

  public closeDocumentPreview(): void {
    this.showDocumentPreview.set(false);
  }

  public attachDocument(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        this.uploadDocument(file);
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private async uploadDocument(file: File) {
    if (file.size > 5000000) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Archivo muy grande (>5MB)',
      });
      return;
    }
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Solo PDF',
      });
      return;
    }

    const vacation = this.selectedVacation();
    if (!vacation) return;

    this.messageService.add({
      severity: 'info',
      summary: 'Subiendo...',
      detail: 'Espere por favor',
    });

    try {
      const fileName = `${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const bucketName = 'employee-documents';
      const filePath = `vacations/${vacation.id}/${fileName}`;
      const url = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/${bucketName}/${filePath}`;

      const formData = new FormData();
      formData.append('file', file);

      await firstValueFrom(this.http.post(url, formData));

      const documentUrl = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/public/${bucketName}/${filePath}`;

      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_vacations?id=eq.${
            vacation.id
          }`,
          { document_url: documentUrl }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Documento adjunto',
      });

      // Registrar auditoría
      const currentUserId = this.dashboardStore.auth.currentEmployeeId?.();
      if (currentUserId) {
        await this.auditService.logChange({
          timeoffId: vacation.id,
          changedBy: currentUserId,
          action: 'updated',
          comment: `Documento adjunto: ${file.name}`,
        });
      }

      this.service.reload();

      // Update the local signal directly to reflect changes immediately
      this.selectedVacation.update((current) =>
        current ? { ...current, document_url: documentUrl } : null
      );
    } catch (error) {
      console.error('Upload error', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Fallo al subir documento',
      });
    }
  }

  public zoomIn(): void {
    this.documentZoomLevel.update((v) => Math.min(v + 0.25, 2));
  }

  public zoomOut(): void {
    this.documentZoomLevel.update((v) => Math.max(v - 0.25, 0.5));
  }

  public resetZoom(): void {
    this.documentZoomLevel.set(1);
  }

  public getVacationDocumentUrl(): string {
    return this.selectedVacation()?.document_url || '';
  }

  public downloadDocument(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  private updateVacationStatus(id: string, status: 'approved' | 'rejected') {
    this.updateVacationStatusFromDialog(status);
  }

  /**
   * Updates vacation status directly from the dialog buttons
   */
  updateVacationStatusFromDialog(
    status: 'pending' | 'approved' | 'rejected',
    rejectionComment?: string
  ) {
    const vacation = this.selectedVacation();
    if (!vacation) return;

    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    const updateData: Record<string, unknown> = { status };

    // Only set reviewed_by and reviewed_at for approve/reject
    if (status !== 'pending') {
      updateData['reviewed_by'] = currentEmployee.id;
      updateData['reviewed_at'] = new Date().toISOString();
    }

    // Add rejection comment if rejecting
    if (status === 'rejected' && rejectionComment) {
      updateData['rejection_comment'] = rejectionComment;
    }

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_vacations?id=eq.${
          vacation.id
        }`,
        updateData
      )
      .subscribe({
        next: async () => {
          // Notify employee for approve/reject
          if (status !== 'pending') {
            await this.notifyEmployee(
              vacation,
              status as 'approved' | 'rejected',
              rejectionComment
            );
          }
          // Auto-assign vacation schedule on approval
          if (status === 'approved') {
            try {
              await this.scheduleAutoAssign.assignScheduleForTimeOff({
                employeeId: vacation.employee_id,
                startDate: vacation.start_date,
                endDate: vacation.end_date,
                timeOffType: 'vacation',
                timeOffSourceId: vacation.id,
                companyId: vacation.company_id,
                createdBy: currentEmployee.id,
              });
            } catch (e) {
              console.warn('[Vacations] Auto-assign schedule failed (non-blocking):', e);
            }
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Solicitud ${
              status === 'pending'
                ? 'marcada como pendiente'
                : status === 'approved'
                ? 'aprobada'
                : 'rechazada'
            }`,
          });
          this.service.reload();
          // Update local signal
          this.selectedVacation.update((v) =>
            v
              ? {
                  ...v,
                  status,
                  rejection_comment:
                    status === 'rejected' ? rejectionComment : null,
                }
              : null
          );
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Fallo al actualizar',
          }),
      });
  }

  /**
   * Opens the rejection dialog
   */
  openRejectionDialog(): void {
    this.rejectionComment.set('');
    this.showRejectionDialog.set(true);
  }

  /**
   * Confirms rejection with the comment
   */
  confirmRejection(): void {
    const comment = this.rejectionComment().trim();
    if (!comment) return;

    this.showRejectionDialog.set(false);
    this.updateVacationStatusFromDialog('rejected', comment);
  }

  private async notifyEmployee(
    vacation: VacationRequest,
    status: 'approved' | 'rejected',
    rejectionComment?: string
  ) {
    let message = `Tu solicitud de vacaciones del ${formatDate(
      new Date(vacation.start_date),
      'dd/MM/yyyy'
    )} al ${formatDate(
      new Date(vacation.end_date),
      'dd/MM/yyyy'
    )} ha sido ${
      status === 'approved' ? 'aprobada' : 'rechazada'
    }.`;

    // Add rejection reason if available
    if (status === 'rejected' && rejectionComment) {
      message += `\n\nMotivo: ${rejectionComment}`;
    }

    const data = {
      employee_id: vacation.employee_id,
      type: status === 'approved' ? 'vacation_approved' : 'vacation_rejected',
      title:
        status === 'approved'
          ? 'Vacaciones Aprobadas'
          : 'Vacaciones Rechazadas',
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    try {
      await firstValueFrom(
        this.http.post(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`,
          data
        )
      );
    } catch (e) {
      console.error('Error sending notification', e);
    }
  }

  // --- Export ---
  public async exportData(): Promise<void> {
    try {
      const xlsxModule = await import('xlsx-js-style');
      const XLSX = (xlsxModule as any).default || xlsxModule;
      const { format } = await import('date-fns');
      const { styleDataSheet, styleSummarySheet, MODULE_COLORS } = await import('../../shared/utils/excel-style.utils');
      const items = this.filteredVacations();
      if (items.length === 0) { this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay vacaciones para exportar con los filtros aplicados' }); return; }
      const data = items.map((v) => ({
        Empleado: `${v.employee?.first_name || ''} ${v.employee?.father_name || ''}`.trim(),
        Email: v.employee?.work_email || 'N/A',
        'Posición': v.employee?.position?.name || 'N/A',
        Sucursal: v.employee?.branch?.name || 'N/A',
        Inicio: v.start_date ? format(new Date(v.start_date), 'dd/MM/yyyy') : '',
        Fin: v.end_date ? format(new Date(v.end_date), 'dd/MM/yyyy') : '',
        'Días': calculateDaysBetween(v.start_date, v.end_date),
        Motivo: v.reason || '',
        Estado: getStatusLabel(v.status),
        'Comentario Rechazo': v.rejection_comment || '',
        'Fecha Solicitud': v.created_at ? format(new Date(v.created_at), 'dd/MM/yyyy HH:mm') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vacaciones');
      ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 18 }];
      styleDataSheet(ws, XLSX.utils, MODULE_COLORS['vacations']);
      const summaryData = [
        ['Resumen - Vacaciones'], ['Fecha Exportación', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        ['Total Vacaciones', items.length], ['Pendientes', this.pendingCount()],
        ['Aprobadas', this.approvedCount()], ['Rechazadas', this.rejectedCount()],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 30 }];
      styleSummarySheet(summaryWs, XLSX.utils, MODULE_COLORS['vacations']);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      XLSX.writeFile(wb, `Vacaciones_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`);
      this.messageService.add({ severity: 'success', summary: 'Exportación exitosa', detail: `Se exportaron ${items.length} vacaciones` });
    } catch (error) {
      console.error('Error exportando datos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar los datos' });
    }
  }
}
