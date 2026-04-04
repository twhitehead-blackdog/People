import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { WorkPermitsService } from '../data/work-permits.service';
import { WorkPermitRequest } from '../models/work-permit-request.model';

const PERMIT_TYPE_LABELS: Record<string, string> = {
  family_death: 'Defunción',
  personal: 'Personal',
  medical: 'Tema Médico',
  other: 'Otros',
};

@Component({
  selector: 'pt-work-permits',
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
        icon="pi-id-card"
      />

      <!-- Filtros -->
      <pt-hr-filters-panel
        [statusOptions]="statusOptions"
        [totalCount]="totalCount()"
        [filteredCount]="filteredPermits().length"
        searchPlaceholder="Empleado..."
        (searchChange)="onSearchChange($event)"
        (statusChange)="onStatusChange($event)"
        (dateRangeChange)="onDateRangeChange($event)"
        (clearFilters)="onClearFilters()"
      />

      <!-- Tabla de Permisos -->
      @if (service.isLoading()) {
      <div class="flex justify-center py-8">
        <p-progressSpinner />
      </div>
      } @else if (filteredPermits().length === 0) {
      <div
        class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-8"
      >
        <div class="text-center">
          <i class="pi pi-id-card text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">
            No se encontraron solicitudes de permisos
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
            <i class="pi pi-id-card text-amber-400 text-sm"></i>
            Solicitudes de Permiso
          </h3>
        </div>
        <p-table
          [value]="filteredPermits()"
          [paginator]="true"
          [rows]="8"
          [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
          paginatorPosition="bottom"
          [scrollable]="true"
          scrollHeight="600px"
          [responsive]="true"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 160px; padding: 0.4rem; text-align: left;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user text-amber-400 text-xs"></i>
                  <span class="text-xs">Empleado</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-tag text-amber-400 text-xs"></i>
                  <span class="text-xs">Tipo Permiso</span>
                </div>
              </th>
              <th style="width: 100px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar text-amber-400 text-xs"></i>
                  <span class="text-xs">Inicio</span>
                </div>
              </th>
              <th style="width: 100px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar text-amber-400 text-xs"></i>
                  <span class="text-xs">Fin</span>
                </div>
              </th>
              <th style="width: 90px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-clock text-amber-400 text-xs"></i>
                  <span class="text-xs">Equivalente</span>
                </div>
              </th>
              <th style="width: 100px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-tag text-amber-400 text-xs"></i>
                  <span class="text-xs">Estado</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-user-plus text-amber-400 text-xs"></i>
                  <span class="text-xs">Creador</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-cog text-amber-400 text-xs"></i>
                  <span class="text-xs">Acciones</span>
                </div>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-permit>
            <tr
              class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
              (click)="viewDetails(permit)"
            >
              <td style="padding: 0.4rem;">
                <div class="flex items-center gap-1">
                  <div
                    class="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-medium text-white text-xs truncate">
                      {{ permit.employee?.first_name }}
                      {{ permit.employee?.father_name }}
                    </span>
                    <span class="text-[9px] text-gray-400 truncate">
                      {{ permit.employee?.branch?.name || '-' }}
                    </span>
                  </div>
                </div>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-xs text-amber-300">
                  {{ getPermitTypeLabel(permit.permit_type) }}
                </span>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-sm text-gray-300">
                  {{ permit.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
                </span>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <span class="text-sm text-gray-300">
                  {{ permit.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
                </span>
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                @if (permit.equivalent_value != null) {
                <span class="text-sm font-medium text-amber-400">
                  {{ permit.equivalent_value }}
                  {{ permit.equivalent_unit === 'hours' ? 'h' : 'd' }}
                </span>
                } @else {
                <span class="text-xs text-gray-500">-</span>
                }
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                <p-tag
                  [value]="getStatusLabel(permit.status)"
                  [severity]="getStatusSeverity(permit.status)"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                @if (permit.created_by_employee) {
                <div class="flex flex-col items-center gap-0.5">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">
                      {{ permit.created_by_employee.first_name }}
                      {{ permit.created_by_employee.father_name }}
                    </span>
                  </div>
                </div>
                } @else {
                <span class="text-[10px] text-gray-500 italic">
                  Auto-solicitud
                </span>
                }
              </td>
              <td
                style="padding: 0.4rem; text-align: center;"
                (click)="$event.stopPropagation()"
              >
                <div class="flex gap-0.5 justify-center">
                  @if (permit.status === 'pending') {
                  <p-button
                    icon="pi pi-check"
                    [text]="true"
                    severity="success"
                    size="small"
                    pTooltip="Aprobar"
                    tooltipPosition="top"
                    [rounded]="true"
                    (onClick)="
                      approvePermit(permit); $event.stopPropagation()
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
                      rejectPermit(permit); $event.stopPropagation()
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
                    (onClick)="viewDetails(permit); $event.stopPropagation()"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      }
    </div>

    <!-- Diálogo de Detalles -->
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
            >Detalles del Permiso</span
          >
        </div>
      </ng-template>

      @if (selectedPermit()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Resumen del Permiso -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Información del Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-amber-400"></i>
              Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Nombre</label
                >
                <p class="text-white">
                  {{ selectedPermit()!.employee?.first_name }}
                  {{ selectedPermit()!.employee?.father_name }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ selectedPermit()!.employee?.work_email || '-' }}
                </p>
              </div>
              @if (selectedPermit()!.employee?.position?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ selectedPermit()!.employee?.position?.name }}
                </p>
              </div>
              } @if (selectedPermit()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ selectedPermit()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Resumen del Permiso -->
          <div
            class="p-4 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-id-card text-amber-400"></i>
              Resumen del Permiso
            </h3>
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">Tipo de Permiso</p>
                <p class="text-xl font-bold text-amber-300">
                  {{ getPermitTypeLabel(selectedPermit()!.permit_type) }}
                </p>
              </div>
              <div
                class="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center"
              >
                <i class="pi pi-id-card text-amber-400 text-2xl"></i>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <div
                class="bg-amber-500/10 border border-amber-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-amber-300">
                    Fecha Inicio
                  </span>
                  <span class="text-xs font-bold text-amber-400">
                    {{
                      selectedPermit()!.start_date
                        | date : 'dd/MM/yyyy' : 'UTC'
                    }}
                  </span>
                </div>
              </div>
              <div
                class="bg-amber-500/10 border border-amber-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-amber-300">
                    Fecha Fin
                  </span>
                  <span class="text-xs font-bold text-amber-400">
                    {{
                      selectedPermit()!.end_date | date : 'dd/MM/yyyy' : 'UTC'
                    }}
                  </span>
                </div>
              </div>
              @if (selectedPermit()!.start_time || selectedPermit()!.end_time) {
              <div
                class="bg-amber-500/10 border border-amber-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-amber-300">
                    Horario
                  </span>
                  <span class="text-xs font-bold text-amber-400">
                    {{ selectedPermit()!.start_time || '-' }} -
                    {{ selectedPermit()!.end_time || '-' }}
                  </span>
                </div>
              </div>
              } @if (selectedPermit()!.equivalent_value != null) {
              <div
                class="bg-amber-500/10 border border-amber-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-amber-300">
                    Equivalente
                  </span>
                  <span class="text-xs font-bold text-amber-400">
                    {{ selectedPermit()!.equivalent_value }}
                    {{
                      selectedPermit()!.equivalent_unit === 'hours'
                        ? 'hora(s)'
                        : 'día(s)'
                    }}
                  </span>
                </div>
              </div>
              }
            </div>
          </div>
        </div>

        <!-- Información de la Solicitud -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-amber-400"></i>
            Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getStatusLabel(selectedPermit()!.status)"
                [severity]="getStatusSeverity(selectedPermit()!.status)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{ selectedPermit()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Duración</label
              >
              <p class="text-white">
                {{
                  calculateDays(
                    selectedPermit()!.start_date,
                    selectedPermit()!.end_date
                  )
                }}
                día(s)
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Creador</label
              >
              <p class="text-white">
                @if (selectedPermit()?.created_by_employee) {
                {{ selectedPermit()!.created_by_employee!.first_name }}
                {{ selectedPermit()!.created_by_employee!.father_name }}
                } @else if (selectedPermit()?.created_by &&
                selectedPermit()?.created_by !==
                selectedPermit()?.employee_id) {
                <span class="text-amber-300">Gerente</span>
                } @else {
                <span class="text-gray-400">Auto-solicitud</span>
                }
              </p>
            </div>
          </div>
        </div>

        @if (selectedPermit()!.observations) {
        <!-- Observaciones -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-amber-400"></i>
            Observaciones
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ selectedPermit()!.observations }}
          </p>
        </div>
        } @if (selectedPermit()!.status === 'rejected' &&
        selectedPermit()!.rejection_comment) {
        <!-- Motivo de Rechazo -->
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-red-400"></i>
            Motivo de Rechazo
          </h3>
          <p class="text-red-300 whitespace-pre-wrap">
            {{ selectedPermit()!.rejection_comment }}
          </p>
        </div>
        }

        <!-- Documento Adjunto -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-file text-amber-400"></i>
            Documento Adjunto
          </h3>
          @if (selectedPermit()?.document_url) {
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
                    downloadDocument(selectedPermit()!.document_url!)
                  "
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  size="small"
                  pTooltip="Descargar"
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
                  [src]="selectedPermit()!.document_url! | safeUrl"
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
            <p class="text-gray-400">No hay documento adjunto</p>
          </div>
          }
        </div>

      </div>
      }
      <ng-template pTemplate="footer">
        @if (selectedPermit()) {
        <div class="flex items-center gap-3">
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="selectedPermit()!.status === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.12)] cursor-default'
              : 'bg-neutral-800 text-amber-400/70 border border-neutral-600 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300 cursor-pointer'"
            [disabled]="selectedPermit()!.status === 'pending'"
            (click)="updatePermitStatusFromDialog('pending')"
          >
            <i class="pi pi-clock text-xs"></i>
            Pendiente
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="selectedPermit()!.status === 'approved'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)] cursor-default'
              : 'bg-neutral-800 text-emerald-400/70 border border-neutral-600 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 cursor-pointer'"
            [disabled]="selectedPermit()!.status === 'approved'"
            (click)="updatePermitStatusFromDialog('approved')"
          >
            <i class="pi pi-check-circle text-xs"></i>
            Aprobada
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="selectedPermit()!.status === 'rejected'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.12)] cursor-default'
              : 'bg-neutral-800 text-red-400/70 border border-neutral-600 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 cursor-pointer'"
            [disabled]="selectedPermit()!.status === 'rejected'"
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
          Por favor, indica el motivo del rechazo de esta solicitud de permiso.
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
export class WorkPermitsComponent {
  public service = inject(WorkPermitsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);
  private http = inject(HttpClient);

  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  public showDetailsDialog = signal(false);
  public selectedPermit = signal<WorkPermitRequest | null>(null);

  public documentZoomLevel = signal(1);

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

  public filteredPermits = computed(() => {
    let permits = this.service.value();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const range = this.dateRange();

    if (search) {
      permits = permits.filter(
        (v) =>
          v.employee?.first_name.toLowerCase().includes(search) ||
          v.employee?.father_name.toLowerCase().includes(search) ||
          v.employee?.work_email?.toLowerCase().includes(search) ||
          this.getPermitTypeLabel(v.permit_type).toLowerCase().includes(search)
      );
    }
    if (status) {
      permits = permits.filter((v) => v.status === status);
    }
    if (range && range[0] && range[1]) {
      const start = range[0].getTime();
      const end = range[1].getTime();
      permits = permits.filter((v) => {
        const time = new Date(v.created_at).getTime();
        return time >= start && time <= end;
      });
    }
    return permits;
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

  getPermitTypeLabel(type: string): string {
    return PERMIT_TYPE_LABELS[type] || type;
  }

  calculateDays(start: string, end: string): number {
    return calculateDaysBetween(start, end);
  }

  // Action methods
  approvePermit(permit: WorkPermitRequest) {
    this.confirmationService.confirm({
      message: `¿Aprobar solicitud de permiso de ${permit.employee?.first_name} ${permit.employee?.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updatePermitStatus(permit.id, 'approved'),
    });
  }

  rejectPermit(permit: WorkPermitRequest) {
    this.selectedPermit.set(permit);
    this.openRejectionDialog();
  }

  viewDetails(permit: WorkPermitRequest): void {
    this.selectedPermit.set(permit);
    this.showDetailsDialog.set(true);
  }

  // Zoom
  public zoomIn(): void {
    this.documentZoomLevel.update((v) => Math.min(v + 0.25, 2));
  }

  public zoomOut(): void {
    this.documentZoomLevel.update((v) => Math.max(v - 0.25, 0.5));
  }

  public downloadDocument(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  private updatePermitStatus(id: string, status: 'approved' | 'rejected') {
    this.updatePermitStatusFromDialog(status);
  }

  updatePermitStatusFromDialog(
    status: 'pending' | 'approved' | 'rejected',
    rejectionComment?: string
  ) {
    const permit = this.selectedPermit();
    if (!permit) return;

    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    const updateData: Record<string, unknown> = { status };

    if (status !== 'pending') {
      updateData['reviewed_by'] = currentEmployee.id;
      updateData['reviewed_at'] = new Date().toISOString();
    }

    if (status === 'rejected' && rejectionComment) {
      updateData['rejection_comment'] = rejectionComment;
    }

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/work_permits?id=eq.${permit.id}`,
        updateData
      )
      .subscribe({
        next: async () => {
          if (status !== 'pending') {
            await this.notifyEmployee(
              permit,
              status as 'approved' | 'rejected',
              rejectionComment
            );
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
          this.selectedPermit.update((v) =>
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

  openRejectionDialog(): void {
    this.rejectionComment.set('');
    this.showRejectionDialog.set(true);
  }

  confirmRejection(): void {
    const comment = this.rejectionComment().trim();
    if (!comment) return;

    this.showRejectionDialog.set(false);
    this.updatePermitStatusFromDialog('rejected', comment);
  }

  private async notifyEmployee(
    permit: WorkPermitRequest,
    status: 'approved' | 'rejected',
    rejectionComment?: string
  ) {
    const typeLabel = this.getPermitTypeLabel(permit.permit_type);
    let message = `Tu solicitud de permiso (${typeLabel}) del ${new Date(
      permit.start_date
    ).toLocaleDateString()} al ${new Date(
      permit.end_date
    ).toLocaleDateString()} ha sido ${
      status === 'approved' ? 'aprobada' : 'rechazada'
    }.`;

    if (status === 'rejected' && rejectionComment) {
      message += `\n\nMotivo: ${rejectionComment}`;
    }

    const data = {
      employee_id: permit.employee_id,
      type:
        status === 'approved'
          ? 'work_permit_approved'
          : 'work_permit_rejected',
      title:
        status === 'approved'
          ? 'Permiso Aprobado'
          : 'Permiso Rechazado',
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
      const items = this.filteredPermits();
      if (items.length === 0) { this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay permisos para exportar con los filtros aplicados' }); return; }
      const data = items.map((p) => ({
        Empleado: `${p.employee?.first_name || ''} ${p.employee?.father_name || ''}`.trim(),
        Email: p.employee?.work_email || 'N/A',
        'Posición': p.employee?.position?.name || 'N/A',
        Sucursal: p.employee?.branch?.name || 'N/A',
        'Tipo Permiso': this.getPermitTypeLabel(p.permit_type),
        Inicio: p.start_date ? format(new Date(p.start_date), 'dd/MM/yyyy') : '',
        Fin: p.end_date ? format(new Date(p.end_date), 'dd/MM/yyyy') : '',
        'Hora Inicio': p.start_time || '',
        'Hora Fin': p.end_time || '',
        Equivalente: p.equivalent_value ? `${p.equivalent_value} ${p.equivalent_unit === 'hours' ? 'horas' : 'días'}` : '',
        Observaciones: p.observations || '',
        Estado: getStatusLabel(p.status),
        'Comentario Rechazo': p.rejection_comment || '',
        'Fecha Solicitud': p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy HH:mm') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Permisos');
      ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 18 }];
      styleDataSheet(ws, XLSX.utils, MODULE_COLORS['work_permits']);
      const summaryData = [
        ['Resumen - Permisos'], ['Fecha Exportación', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        ['Total Permisos', items.length], ['Pendientes', this.pendingCount()],
        ['Aprobados', this.approvedCount()], ['Rechazados', this.rejectedCount()],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 30 }];
      styleSummarySheet(summaryWs, XLSX.utils, MODULE_COLORS['work_permits']);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      XLSX.writeFile(wb, `Permisos_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`);
      this.messageService.add({ severity: 'success', summary: 'Exportación exitosa', detail: `Se exportaron ${items.length} permisos` });
    } catch (error) {
      console.error('Error exportando datos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar los datos' });
    }
  }
}
