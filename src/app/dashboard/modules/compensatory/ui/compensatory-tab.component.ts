import { DatePipe } from '@angular/common';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import {
  differenceInMinutes,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../../../../services/organization.service';
import { ScheduleAutoAssignService } from '../../../../services/schedule-auto-assign.service';
import { ApiUrlService } from '../../../../services/api-url.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { getEnv } from '../../../../utils/env.utils';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import {
  TimeoffAuditLog,
  TimeoffAuditService,
} from '../../../../services/timeoff-audit.service';

export interface CompensatoryRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  company_id?: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    branch_id?: string;
    position?: { name: string };
    branch?: { name: string };
  };
  date_from: string;
  date_to: string;
  hours?: number;
  document_url?: string;
  reason?: string;
  compensatory_type?: 'hours' | 'days';
  compensatory_amount?: number;
  review_status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_comment?: string;
  is_approved: boolean;
  created_at: string;
  notes?: string[] | string;
  created_by_employee?: {
    first_name: string;
    father_name: string;
  };
}

@Component({
  selector: 'pt-compensatory-tab',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    HrStatsGridComponent,
  ],
  providers: [MessageService, ConfirmationService],
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: transparent !important;
      border-color: #374151 !important;
      color: #9ca3af !important;
      font-weight: 600;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: transparent !important;
      border-color: #374151 !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: #374151 !important;
      color: #d1d5db !important;
    }
    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover > td {
      background: rgba(55, 65, 81, 0.3) !important;
    }
    ::ng-deep .p-dialog .p-dialog-header {
      background: #1f2937 !important;
      border-bottom: 1px solid #374151 !important;
    }
    ::ng-deep .p-dialog .p-dialog-content {
      background: #111827 !important;
    }
    ::ng-deep .p-dialog .p-dialog-footer {
      background: #1f2937 !important;
      border-top: 1px solid #374151 !important;
    }
    ::ng-deep .p-inputtext,
    ::ng-deep .p-textarea {
      background: rgba(17, 24, 39, 0.5) !important;
      border-color: #4b5563 !important;
      color: white !important;
    }
    ::ng-deep .p-dropdown {
      background: rgba(17, 24, 39, 0.5) !important;
      border-color: #4b5563 !important;
    }
    ::ng-deep .p-dropdown .p-dropdown-label {
      color: white !important;
    }
    ::ng-deep .p-calendar .p-inputtext {
      background: rgba(17, 24, 39, 0.5) !important;
      border-color: #4b5563 !important;
      color: white !important;
    }
    ::ng-deep .p-paginator {
      background: transparent !important;
      border: none !important;
    }
    ::ng-deep .p-paginator .p-paginator-element {
      color: #9ca3af !important;
    }
    ::ng-deep .overtime-details-table .p-datatable-thead > tr > th {
      background: rgba(17, 24, 39, 0.8) !important;
      border-color: #374151 !important;
      color: #9ca3af !important;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
    }
    ::ng-deep .overtime-details-table .p-datatable-tbody > tr > td {
      border-color: #374151 !important;
      color: #d1d5db !important;
      font-size: 0.85rem;
    }
    ::ng-deep .overtime-details-table .p-datatable-scrollable-body {
      border-color: #374151 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <p-confirmDialog />

    <!-- Rejection Dialog -->
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
          <span class="text-lg font-semibold text-white">Confirmar Rechazo de Tiempo Compensatorio</span>
        </div>
      </ng-template>
      <div class="space-y-4 pt-4">
        <p class="text-gray-300">Por favor, indica el motivo del rechazo de esta solicitud de tiempo compensatorio.</p>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">Motivo de Rechazo <span class="text-red-400">*</span></label>
          <textarea pTextarea [(ngModel)]="rejectionComment" rows="4" placeholder="Escribe el motivo del rechazo..." class="w-full" maxlength="500"></textarea>
          <p class="text-xs text-gray-500 mt-1">{{ rejectionComment().length }}/500 caracteres</p>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="showRejectionDialog.set(false)" />
          <p-button label="Confirmar Rechazo" severity="danger" icon="pi pi-times"
            [disabled]="!rejectionComment().trim() || updatingStatus()"
            [loading]="updatingStatus()"
            (onClick)="confirmRejection()" />
        </div>
      </ng-template>
    </p-dialog>

    @if (device.isDesktop()) {
    <!-- Desktop View -->
    <div class="space-y-3">
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-clock"
        approvedLabel="Aprobadas"
      />

      <!-- Collapsible Filters -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
          (click)="showFilters.set(!showFilters())">
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-cyan-400 text-sm"></i>
            <h3 class="text-sm font-semibold text-white m-0">Filtros Avanzados</h3>
            @if (hasActiveFilters()) {
            <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold">
              {{ getActiveFiltersCount() }} activos
            </span>
            }
          </div>
          <i class="pi text-sm"
            [class.pi-chevron-down]="!showFilters()"
            [class.pi-chevron-up]="showFilters()"
            [class.text-gray-400]="!showFilters()"
            [class.text-cyan-400]="showFilters()"></i>
        </div>

        @if (showFilters()) {
        <div class="p-3 space-y-2 animate-fade-in">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i>Búsqueda Específica
              </label>
              <input type="text" pInputText placeholder="Empleado, email, motivo..."
                [(ngModel)]="searchText" class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Estado
              </label>
              <p-dropdown [options]="statusOptions" [(ngModel)]="selectedStatus"
                placeholder="Todos" [showClear]="true" class="w-full text-sm" [style]="{ height: '32px' }" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>Rango de Fechas
              </label>
              <p-calendar [(ngModel)]="dateRange" selectionMode="range" [showIcon]="true"
                dateFormat="dd/mm/yy" placeholder="Seleccionar" [showClear]="true"
                class="w-full text-sm" [inputStyle]="{ height: '32px', padding: '0.375rem' }" />
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-neutral-700/50">
            <p-button label="Limpiar Todo" icon="pi pi-filter-slash" [outlined]="true"
              severity="secondary" (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <i class="pi pi-info-circle"></i>
              <span>{{ filteredRequests().length }} de {{ totalCount() }} resultados</span>
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Table -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
        <div class="p-2 border-b border-neutral-700/50">
          <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
            <i class="pi pi-list text-cyan-400 text-sm"></i>
            Solicitudes de Tiempo Compensatorio
          </h3>
        </div>
        <div>
          @if (compensatoryTimeoffsApi.isLoading()) {
          <div class="flex justify-center items-center py-8"><p-progressSpinner /></div>
          } @else {
          <p-table
            [value]="filteredRequests()"
            [paginator]="true" [rows]="8" [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
            paginatorPosition="bottom" styleClass="p-datatable-sm p-datatable-striped"
            [globalFilterFields]="['employee.first_name','employee.father_name','employee.work_email','reason']"
            [scrollable]="false">
            <ng-template #emptymessage>
              <tr><td colspan="9" class="text-center py-4">No se encontraron solicitudes de tiempo compensatorio</td></tr>
            </ng-template>
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 160px; padding: 0.4rem; text-align: left;">
                  <div class="flex items-center gap-1"><i class="pi pi-user text-cyan-400 text-xs"></i><span class="text-xs">Empleado</span></div>
                </th>
                <th style="width: 100px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-calendar-check text-cyan-400 text-xs"></i><span class="text-xs">Fecha Solicitud</span></div>
                </th>
                <th style="width: 70px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-tag text-cyan-400 text-xs"></i><span class="text-xs">Tipo</span></div>
                </th>
                <th style="width: 130px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-calendar text-cyan-400 text-xs"></i><span class="text-xs">Fechas</span></div>
                </th>
                <th style="width: 80px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-clock text-cyan-400 text-xs"></i><span class="text-xs">Cantidad</span></div>
                </th>
                <th style="width: 120px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-comment text-cyan-400 text-xs"></i><span class="text-xs">Motivo Solicitud</span></div>
                </th>
                <th style="width: 90px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-tag text-cyan-400 text-xs"></i><span class="text-xs">Estado</span></div>
                </th>
                <th style="width: 140px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-user-plus text-cyan-400 text-xs"></i><span class="text-xs">Creador</span></div>
                </th>
                <th style="width: 110px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1"><i class="pi pi-cog text-cyan-400 text-xs"></i><span class="text-xs">Acciones</span></div>
                </th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-request>
              <tr class="hover:bg-neutral-700/30 transition-colors cursor-pointer" (click)="viewDetails(request)">
                <td style="padding: 0.4rem;">
                  <div class="flex items-center gap-1">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0">
                      <i class="pi pi-user text-cyan-400 text-[9px]"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-medium text-white text-xs truncate">{{ getEmployeeName(request) }}</span>
                      <span class="text-[9px] text-gray-400 truncate">{{ request.employee?.branch?.name || '-' }}</span>
                    </div>
                  </div>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <span class="text-xs text-gray-300">{{ request.created_at | date : 'dd/MM/yyyy' }}</span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let compensatoryType = getCompensatoryTypeFromNotes(request);
                  <span class="text-xs font-medium text-white">
                    @if (compensatoryType === 'days') { Días } @else if (compensatoryType === 'hours') { Horas } @else { <span class="text-gray-500">-</span> }
                  </span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let dateFrom = request.date_from | date : 'dd/MM/yyyy' : 'UTC';
                  @let dateTo = request.date_to | date : 'dd/MM/yyyy' : 'UTC';
                  @if (dateFrom) {
                    @if (dateFrom === dateTo) {
                    <span class="text-xs text-cyan-400 font-medium">{{ dateFrom }}</span>
                    } @else {
                    <span class="text-xs text-cyan-400 font-medium">{{ dateFrom }} → {{ dateTo }}</span>
                    }
                  } @else {
                    @let compensatoryDate = getCompensatoryDateFromNotes(request);
                    @if (compensatoryDate) {
                    <span class="text-xs text-gray-300">{{ compensatoryDate | date : 'dd/MM/yyyy' : 'UTC' }}</span>
                    } @else {
                    <span class="text-xs text-gray-500">-</span>
                    }
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let requestedAmount = getCompensatoryRequestedAmountFromNotes(request);
                  @let quantity = getCompensatoryQuantity(request);
                  @let compType = getCompensatoryTypeFromNotes(request);
                  <span class="text-xs font-medium text-white">
                    @if (requestedAmount !== null && compType === 'days') { {{ requestedAmount }} día(s)
                    } @else if (requestedAmount !== null && compType === 'hours') { {{ requestedAmount }}h
                    } @else if (requestedAmount !== null) { {{ requestedAmount }}
                    } @else if ((quantity?.value ?? 0) > 0 && quantity?.isDays) { {{ quantity?.value }} día(s)
                    } @else if ((quantity?.value ?? 0) > 0) { {{ formatHoursMinutes(quantity?.value || 0) }}
                    } @else { <span class="text-gray-500">-</span> }
                  </span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let reason = getCompensatoryReasonFromNotes(request);
                  @if (reason) {
                  <span class="text-xs text-gray-300 cursor-help inline-block max-w-[110px] truncate"
                    [pTooltip]="reason" tooltipPosition="top">{{ reason }}</span>
                  } @else {
                  <span class="text-gray-500 text-xs">-</span>
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <p-tag [value]="getStatusLabel(request)" [severity]="getStatusSeverity(request)"
                    [style]="{ 'font-size': '0.65rem', padding: '0.1rem 0.4rem' }" />
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  @if (request.created_by_employee) {
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">{{ request.created_by_employee.first_name }} {{ request.created_by_employee.father_name }}</span>
                  </div>
                  } @else {
                  <span class="text-[10px] text-gray-500 italic">Auto-solicitud</span>
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;" (click)="$event.stopPropagation()">
                  <div class="flex gap-0.5 justify-center">
                    @if (request.review_status === 'pending') {
                    <p-button icon="pi pi-check" [text]="true" severity="success" size="small"
                      (onClick)="approveRequest(request); $event.stopPropagation()"
                      pTooltip="Aprobar" tooltipPosition="top" [rounded]="true" [loading]="updatingStatus()" />
                    <p-button icon="pi pi-times" [text]="true" severity="danger" size="small"
                      (onClick)="rejectRequest(request); $event.stopPropagation()"
                      pTooltip="Rechazar" tooltipPosition="top" [rounded]="true" [disabled]="updatingStatus()" />
                    }
                    <p-button icon="pi pi-eye" [text]="true" severity="info" size="small"
                      (onClick)="viewDetails(request); $event.stopPropagation()"
                      pTooltip="Ver detalles" tooltipPosition="top" [rounded]="true" />
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
          }
        </div>
      </div>
    </div>
    } @else {
    <!-- Mobile View -->
    <div class="space-y-3">
      <pt-hr-stats-grid [totalCount]="totalCount()" [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()" [rejectedCount]="rejectedCount()" icon="pi-clock" approvedLabel="Aprobadas" />
      <button type="button" (click)="showFilters.set(!showFilters())"
        class="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-left text-sm text-gray-300">
        <span><i class="pi pi-filter text-cyan-400 mr-2"></i>Filtros @if (hasActiveFilters()) { <span class="text-cyan-400 text-xs">({{ getActiveFiltersCount() }})</span> }</span>
        <i [class]="showFilters() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
      </button>
      @if (showFilters()) {
        <div class="grid grid-cols-1 gap-2 p-2 bg-neutral-800/80 rounded-lg border border-neutral-700/50">
          <input type="text" pInputText placeholder="Empleado, motivo..." [(ngModel)]="searchText"
            class="w-full text-sm py-2 bg-neutral-900/50 border-neutral-600 rounded" />
          <p-dropdown [options]="statusOptions" [(ngModel)]="selectedStatus"
            placeholder="Estado" [showClear]="true" class="w-full" styleClass="w-full" />
          <p-calendar [(ngModel)]="dateRange" selectionMode="range" dateFormat="dd/mm/yy"
            placeholder="Rango fechas" [showClear]="true" class="w-full" [inputStyle]="{ width: '100%' }" />
          <p-button label="Limpiar filtros" icon="pi pi-filter-slash" [outlined]="true"
            severity="secondary" size="small" (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
        </div>
      }

      @if (compensatoryTimeoffsApi.isLoading()) {
        <div class="flex justify-center py-8"><p-progressSpinner /></div>
      } @else if (filteredRequests().length === 0) {
        <div class="text-center py-8 text-gray-400"><i class="pi pi-inbox text-3xl block mb-2"></i><p class="text-sm">No hay solicitudes</p></div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (req of filteredRequests(); track req.id) {
            <div (click)="viewDetails(req)" class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-white text-sm m-0 truncate">{{ getEmployeeName(req) }}</p>
                  <p class="text-xs text-gray-400 m-0 mt-0.5">{{ req.employee?.branch?.name || '-' }}</p>
                  <div class="flex flex-wrap gap-x-2 mt-2 text-xs text-gray-400">
                    <span>{{ req.date_from | date : 'dd/MM/yy' }} - {{ req.date_to | date : 'dd/MM/yy' }}</span>
                    @let qty = getCompensatoryQuantity(req); @if (qty?.value != null && qty.value > 0) {
                      <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">{{ qty.isDays ? qty.value + ' día(s)' : formatHoursMinutes(qty.value) }}</span>
                    }
                  </div>
                </div>
                <p-tag [value]="getStatusLabel(req)" [severity]="getStatusSeverity(req)" [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
              </div>
              @if (req.review_status === 'pending') {
                <div class="flex gap-1 mt-2" (click)="$event.stopPropagation()">
                  <p-button icon="pi pi-check" [text]="true" severity="success" size="small" [loading]="updatingStatus()" (onClick)="approveRequest(req); $event.stopPropagation()" />
                  <p-button icon="pi pi-times" [text]="true" severity="danger" size="small" [disabled]="updatingStatus()" (onClick)="rejectRequest(req); $event.stopPropagation()" />
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
    }

    <!-- Details Dialog -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white">Detalles de Solicitud de Tiempo Compensatorio</span>
          <div class="flex items-center gap-2">
            <p-button
              [icon]="attachingDoc() ? 'pi pi-spin pi-spinner' : selectedRequest()!.document_url ? 'pi pi-file' : 'pi pi-paperclip'"
              [rounded]="true" [text]="true" severity="secondary"
              (onClick)="selectedRequest()!.document_url ? openDocument() : attachDocument()"
              [pTooltip]="attachingDoc() ? 'Subiendo documento...' : selectedRequest()!.document_url ? 'Ver documento adjunto' : 'Adjuntar documento'"
              tooltipPosition="left" size="small" [disabled]="attachingDoc()" />
            <p-button icon="pi pi-history" [rounded]="true" [text]="true" severity="secondary"
              (onClick)="showAuditSidebar.set(!showAuditSidebar())"
              [styleClass]="showAuditSidebar() ? 'bg-cyan-500/20 text-cyan-400' : ''"
              pTooltip="Ver historial de cambios" tooltipPosition="left" size="small" />
          </div>
        </div>
      </ng-template>
      @if (selectedRequest()) {
      <div class="space-y-4 pt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Employee Info -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <i class="pi pi-user text-cyan-400"></i> Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                <p class="text-white">{{ getEmployeeName(selectedRequest()!) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <p class="text-white">{{ getEmployeeEmail(selectedRequest()!) }}</p>
              </div>
              @if (getEmployeePosition(selectedRequest()!)) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Cargo</label>
                <p class="text-white">{{ getEmployeePosition(selectedRequest()!) }}</p>
              </div>
              }
              @if (selectedRequest()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Sucursal</label>
                <p class="text-white">{{ selectedRequest()!.employee?.branch?.name }}</p>
              </div>
              }
            </div>
          </div>

          <!-- Overtime Hours -->
          <div class="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <i class="pi pi-clock text-cyan-400"></i> Horas Extra Pendientes (histórico)
            </h3>
            @if (isLoadingOvertimeHours()) {
            <div class="flex items-center gap-2 text-gray-400"><i class="pi pi-spin pi-spinner"></i><span>Cargando horas extras...</span></div>
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
            <div class="mt-3">
              <p class="text-xs font-medium text-gray-300 mb-2">Días con saldo pendiente (mostrando últimos {{ employeeOvertimeDays().length }}):</p>
              <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                @for (day of employeeOvertimeDays(); track day.day) {
                <div class="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-2 hover:bg-cyan-500/20 transition-colors">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold text-cyan-300">{{ formatDate(day.day) }}</span>
                    <span class="text-xs font-bold text-cyan-400">{{ formatHoursMinutes(day.overtimeHours) }}</span>
                  </div>
                  @if (day.entryTime && day.exitTime) {
                  <div class="text-xs text-gray-400">{{ day.entryTime }} - {{ day.exitTime }}</div>
                  }
                </div>
                }
              </div>
              <div class="mt-3 flex items-center justify-between gap-2">
                <p class="text-[11px] text-gray-400 m-0">Cargando histórico: últimos {{ overtimeHistoryWindowDays() }} días</p>
                <p-button label="Cargar más" icon="pi pi-plus" size="small" severity="secondary" [outlined]="true" (onClick)="loadMoreOvertimeHistory()" />
              </div>
            </div>
            } @else {
            <p class="text-xs text-gray-400 mt-3">No hay días con horas extra pendientes dentro del rango cargado.</p>
            }
            }
          </div>
        </div>

        <!-- Request Info -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-info-circle text-cyan-400"></i> Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Tipo de Solicitud</label>
              <p class="text-white">
                @let detailCompType = getCompensatoryTypeFromNotes(selectedRequest()!);
                @if (detailCompType === 'days') {
                <span class="flex items-center gap-2"><i class="pi pi-calendar text-cyan-400"></i> Días</span>
                } @else if (detailCompType === 'hours') {
                <span class="flex items-center gap-2"><i class="pi pi-clock text-cyan-400"></i> Horas</span>
                } @else { <span class="text-gray-400">No especificado</span> }
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Cantidad Solicitada</label>
              <p class="text-white">
                @let detailQty = getCompensatoryQuantity(selectedRequest()!);
                @if (detailQty && detailQty.value > 0) {
                  @if (detailQty.isDays) { {{ detailQty.value }} día(s) ({{ detailQty.value * 8 }} horas) }
                  @else { {{ formatHoursMinutes(detailQty.value) }} }
                } @else { <span class="text-gray-400">No especificada</span> }
              </p>
            </div>
            @let detDateFrom = selectedRequest()!.date_from | date : 'dd/MM/yyyy' : 'UTC';
            @let detDateTo = selectedRequest()!.date_to | date : 'dd/MM/yyyy' : 'UTC';
            @if (detDateFrom) {
              @if (detDateFrom === detDateTo) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Fecha del Compensatorio</label>
                <p class="text-white font-medium text-cyan-400">{{ detDateFrom }}</p>
              </div>
              } @else {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Período del Compensatorio</label>
                <p class="text-white font-medium text-cyan-400">{{ detDateFrom }} → {{ detDateTo }}</p>
              </div>
              }
            } @else {
              @let compDate = getCompensatoryDateFromNotes(selectedRequest()!);
              @if (compDate) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Fecha del Compensatorio</label>
                <p class="text-white">{{ compDate | date : 'dd/MM/yyyy' : 'UTC' }}</p>
              </div>
              }
            }
            @let timeInfo = getCompensatoryTimeFromNotes(selectedRequest()!);
            @if (timeInfo.start || timeInfo.end) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Horario del Compensatorio</label>
              <p class="text-white font-mono">
                @if (timeInfo.start && timeInfo.end) { {{ timeInfo.start }} - {{ timeInfo.end }} }
                @else if (timeInfo.start) { Desde: {{ timeInfo.start }} }
                @else if (timeInfo.end) { Hasta: {{ timeInfo.end }} }
              </p>
            </div>
            }
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Fecha de Solicitud</label>
              <p class="text-white">{{ selectedRequest()!.created_at | date : 'dd/MM/yyyy HH:mm' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Estado</label>
              <p-tag [value]="getStatusLabel(selectedRequest()!)" [severity]="getStatusSeverity(selectedRequest()!)" />
            </div>
            @let overtimeDates = getCompensatoryOvertimeDatesFromNotes(selectedRequest()!);
            @if (overtimeDates.length > 0) {
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-400 mb-2">Días donde trabajó horas extra (reportados por el empleado)</label>
              <div class="flex flex-wrap gap-2">
                @for (date of overtimeDates; track date) {
                <span class="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex flex-col gap-0.5">
                  <span class="font-semibold text-white text-sm">{{ date | date : 'dd/MM/yyyy' : 'UTC' }}</span>
                  <span class="text-gray-300 text-xs">{{ getManualDateSaldoLabel(date) }}</span>
                </span>
                }
              </div>
              <p class="text-xs text-gray-400 mt-2">Total de días reportados: {{ overtimeDates.length }}</p>
            </div>
            }
          </div>

          @let detReason = getCompensatoryReasonFromNotes(selectedRequest()!);
          @if (detReason) {
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-1">Motivo</label>
            <p class="text-white whitespace-pre-wrap bg-neutral-900/50 p-3 rounded">{{ detReason }}</p>
          </div>
          }
          @if (selectedRequest()!.rejection_comment) {
          <div class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <label class="block text-sm font-medium text-red-400 mb-1">Comentario de Rechazo</label>
            <p class="text-red-300 whitespace-pre-wrap">{{ selectedRequest()!.rejection_comment }}</p>
          </div>
          }
          @if (selectedRequest()!.rejection_comment || selectedRequest()!.review_status === 'rejected') {
          <div class="mt-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <label class="block text-sm font-medium text-gray-400 mb-2">Motivo de Rechazo (editable)</label>
            <textarea pInputTextarea [(ngModel)]="rejectionComment" placeholder="Agregar o editar el motivo del rechazo..." rows="3" class="w-full"></textarea>
            <div class="flex justify-end mt-2">
              <p-button label="Guardar Comentario" icon="pi pi-save" size="small" [loading]="savingComment()" (onClick)="saveRejectionComment()" />
            </div>
          </div>
          }
        </div>

        <!-- Overtime Days Table -->
        @if (getOvertimeDaysFromNotes(selectedRequest()!)) {
        <div class="p-5 bg-neutral-800 rounded-lg border border-neutral-700 shadow-lg">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i class="pi pi-calendar-check text-cyan-400"></i> Fechas donde trabajó horas extra
          </h3>
          <div class="overflow-x-auto -mx-2">
            <p-table [value]="getOvertimeDaysFromNotes(selectedRequest()!) || []"
              styleClass="p-datatable-sm overtime-details-table" [paginator]="false"
              [scrollable]="true" scrollHeight="300px" showGridlines>
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
                    <div class="flex items-center gap-2"><i class="pi pi-calendar text-cyan-400 text-sm"></i><span>{{ dayDetail.date }}</span></div>
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
                  <td class="text-right py-3"><span class="text-gray-300 font-medium text-sm">{{ formatHoursMinutes(dayDetail.lunchDuration) }}</span></td>
                  <td class="text-right py-3">
                    @if (hasDelay(dayDetail.delayHours)) {
                    <span class="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm font-semibold">{{ formatHoursMinutes(dayDetail.delayHours) }}</span>
                    } @else { <span class="text-gray-500 text-sm">-</span> }
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

        <!-- Document -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-file text-cyan-400"></i> Documento Adjunto
          </h3>
          @if (selectedRequest()?.document_url) {
          <div class="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700">
            <div class="p-2 border-b border-neutral-700 flex items-center justify-between">
              <span class="text-sm text-gray-400 flex items-center gap-2"><i class="pi pi-check-circle text-green-400"></i> Documento disponible</span>
              <div class="flex items-center gap-2">
                <p-button icon="pi pi-download" (onClick)="downloadDocument()" [text]="true" [rounded]="true" severity="secondary" size="small" pTooltip="Descargar" />
                <p-button icon="pi pi-upload" (onClick)="attachDocument()" [text]="true" [rounded]="true" severity="info" size="small" pTooltip="Adjuntar nuevo" [loading]="attachingDoc()" [disabled]="attachingDoc()" />
              </div>
            </div>
            <div class="h-[400px] overflow-auto bg-neutral-900">
              <iframe [src]="getDocumentUrl()" class="w-full h-[600px] border-0 bg-white" title="Preview del documento"></iframe>
            </div>
          </div>
          } @else {
          <div class="flex flex-col items-center justify-center py-8 text-center bg-neutral-900/50 rounded-lg border border-dashed border-neutral-600">
            <i class="pi pi-file text-4xl text-gray-500 mb-3"></i>
            <p class="text-gray-400 mb-4">No hay documento adjunto</p>
            <p-button label="Adjuntar documento" icon="pi pi-upload" severity="info"
              (onClick)="attachDocument()" [loading]="attachingDoc()" [disabled]="attachingDoc()" />
          </div>
          }
        </div>
      </div>
      }

      <!-- Audit Sidebar -->
      <div class="fixed bg-neutral-900 border-l border-neutral-700 shadow-2xl z-[1200] transition-all duration-500 ease-out"
        [style.width]="'320px'" [style.max-width]="'30vw'" [style.top]="'50%'"
        [style.left]="showAuditSidebar() ? 'calc(50% + 400px)' : '50%'"
        [style.transform]="showAuditSidebar() ? 'translateY(-50%) translateX(0) scale(1)' : 'translateY(-50%) translateX(0) scale(0.8)'"
        [style.opacity]="showAuditSidebar() ? '1' : '0'" [style.max-height]="'90vh'"
        [style.height]="'664px'" [style.pointer-events]="showAuditSidebar() ? 'auto' : 'none'">
        <div class="flex flex-col h-full">
          <div class="p-4 border-b border-neutral-700 bg-neutral-800 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <i class="pi pi-history text-cyan-400"></i> Historial de Cambios
            </h3>
            <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" (onClick)="showAuditSidebar.set(false)" size="small" />
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            @if (isLoadingAuditHistory()) {
            <div class="flex items-center justify-center gap-2 text-gray-400 py-8"><i class="pi pi-spin pi-spinner"></i><span class="text-sm">Cargando historial...</span></div>
            } @else if (auditHistory().length === 0) {
            <div class="text-center py-8 text-gray-400"><i class="pi pi-info-circle text-4xl mb-4"></i><p class="text-sm">No hay historial de cambios disponible</p></div>
            } @else {
            <div class="space-y-3">
              @for (log of auditHistory(); track log.id) {
              @let isExpanded = expandedAuditItems().has(log.id);
              <div class="rounded-lg bg-gradient-to-br from-neutral-800/80 to-neutral-800/50 border border-neutral-700/70 overflow-hidden transition-all hover:border-cyan-500/30 shadow-lg">
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                      <div [class]="'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' + getActionColor(log.action).replace('text-', 'bg-').replace('-400', '-500/20')">
                        <i [class]="'pi ' + getActionIcon(log.action) + ' ' + getActionColor(log.action) + ' text-lg'"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-white font-semibold text-sm mb-1">{{ log.changed_by_employee ? log.changed_by_employee.first_name + ' ' + log.changed_by_employee.father_name : 'Usuario desconocido' }}</div>
                        <div class="text-gray-400 text-xs mb-2">{{ getActionLabel(log.action) }}</div>
                        <div class="text-gray-500 text-xs flex items-center gap-1"><i class="pi pi-calendar text-[10px]"></i> {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}</div>
                      </div>
                    </div>
                    <button type="button" (click)="toggleAuditItem(log.id)" class="flex-shrink-0 p-1.5 rounded hover:bg-neutral-700 transition-colors" [class.bg-neutral-700]="isExpanded">
                      <i [class]="'pi transition-transform duration-200 text-gray-400 text-xs ' + (isExpanded ? 'pi-chevron-up' : 'pi-chevron-down')"></i>
                    </button>
                  </div>
                  @if (isExpanded) {
                  <div class="pt-3 mt-3 border-t border-neutral-700/50 space-y-3 animate-fade-in">
                    @if (log.old_status && log.new_status) {
                    <div class="p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                      <div class="text-xs text-gray-400 mb-2 font-medium">Cambio de Estado</div>
                      <div class="flex items-center gap-2">
                        <span class="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-semibold border border-yellow-500/30">{{ getAuditStatusLabel(log.old_status) }}</span>
                        <i class="pi pi-arrow-right text-gray-500 text-sm"></i>
                        <span class="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">{{ getAuditStatusLabel(log.new_status) }}</span>
                      </div>
                    </div>
                    }
                    @if (log.comment) {
                    <div class="p-3 bg-cyan-500/10 rounded-lg border-l-4 border-cyan-400">
                      <div class="text-xs text-cyan-300 mb-1.5 font-medium flex items-center gap-1"><i class="pi pi-comment text-[10px]"></i> Comentario</div>
                      <p class="text-gray-200 text-xs leading-relaxed italic">{{ log.comment }}</p>
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
      @if (showAuditSidebar()) {
      <div class="fixed inset-0 bg-black/50 z-[1199]" (click)="showAuditSidebar.set(false)"></div>
      }
    </p-dialog>

    <!-- Full Audit History Dialog -->
    <p-dialog
      [(visible)]="showAuditHistoryDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1000px' }"
      [header]="'Historial de Auditoría - Tiempo Compensatorio'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <div class="space-y-4 pt-4">
        @if (isLoadingAllAuditHistory()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8"><i class="pi pi-spin pi-spinner"></i><span>Cargando historial de auditoría...</span></div>
        } @else if (allAuditHistory().length === 0) {
        <div class="text-center py-8 text-gray-400"><i class="pi pi-info-circle text-4xl mb-4"></i><p>No hay registros de auditoría disponibles</p></div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of allAuditHistory(); track log.id) {
          <div class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors">
            <div class="flex items-start gap-3">
              <div [class]="'w-10 h-10 rounded-full flex items-center justify-center ' + getActionColor(log.action) + ' bg-opacity-20'">
                <i [class]="'pi ' + getActionIcon(log.action) + ' text-lg'"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="text-white font-semibold">{{ log.changed_by_employee ? log.changed_by_employee.first_name + ' ' + log.changed_by_employee.father_name : 'Usuario desconocido' }}</div>
                    <div class="text-sm text-gray-400">{{ getActionLabel(log.action) }}</div>
                  </div>
                  <div class="text-xs text-gray-500">{{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}</div>
                </div>
                @if (log.comment) {
                <div class="p-3 bg-cyan-500/10 rounded border-l-4 border-cyan-400">
                  <p class="text-sm text-gray-200 italic">{{ log.comment }}</p>
                </div>
                }
                @if (log.old_status && log.new_status) {
                <div class="flex items-center gap-2 mt-2">
                  <span class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">{{ getAuditStatusLabel(log.old_status) }}</span>
                  <i class="pi pi-arrow-right text-gray-500 text-xs"></i>
                  <span class="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">{{ getAuditStatusLabel(log.new_status) }}</span>
                </div>
                }
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </p-dialog>
  `,
})
export class CompensatoryTabComponent {
  // Inputs/Outputs
  globalSearchText = input<string>('');
  pendingCountChange = output<number>();

  // Injected services
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private dashboardStore = inject(DashboardStore);
  private auditService = inject(TimeoffAuditService);
  private sanitizer = inject(DomSanitizer);
  protected device = inject(DeviceService);
  private scheduleAutoAssign = inject(ScheduleAutoAssignService);

  constructor() {
    effect(() => {
      this.pendingCountChange.emit(this.pendingCount());
    });
  }

  // API
  public compensatoryTimeoffsApi = httpResource<CompensatoryRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
    if (!companyId) return undefined;
    const params: any = {
      select: `id,employee_id,type_id,date_from,date_to,notes,is_approved,compensatory_type,compensatory_amount,review_status,reviewed_by,reviewed_at,rejection_comment,created_at,company_id,document_url,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!timeoffs_created_by_fkey(first_name,father_name)`,
      type_id: `eq.${compensatoryTypeId}`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };
    return { url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`, method: 'GET', params };
  });

  // Filters
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);
  public showFilters = signal(false);

  // Dialog state
  public showDetailsDialog = signal(false);
  public selectedRequest = signal<CompensatoryRequest | null>(null);
  public showRejectionDialog = signal(false);
  public requestToReject = signal<CompensatoryRequest | null>(null);
  public rejectionComment = signal('');

  // Audit state
  public auditHistory = signal<TimeoffAuditLog[]>([]);
  public isLoadingAuditHistory = signal(false);
  public expandedAuditItems = signal<Set<string>>(new Set());
  public showAuditSidebar = signal(false);
  public showAuditHistoryDialog = signal(false);
  public allAuditHistory = signal<TimeoffAuditLog[]>([]);
  public isLoadingAllAuditHistory = signal(false);

  // Overtime state
  public employeeOvertimeHours = signal<number>(0);
  public isLoadingOvertimeHours = signal<boolean>(false);
  public overtimeHistoryWindowDays = signal<number>(365);
  public employeeOvertimeDaysAll = signal<Array<{ day: string; overtimeHours: number; entryTime?: string; exitTime?: string; totalHours?: number }>>([]);
  public employeeOvertimeDays = signal<Array<{ day: string; overtimeHours: number; entryTime?: string; exitTime?: string; totalHours?: number }>>([]);

  // Status flags
  public updatingStatus = signal(false);
  public savingComment = signal(false);
  public attachingDoc = signal(false);
  public showDocumentPreview = signal(false);

  // Options
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Computed stats
  public totalCount = computed(() => this.compensatoryTimeoffsApi.value()?.length || 0);
  public pendingCount = computed(() =>
    this.compensatoryTimeoffsApi.value()?.filter(r => r.review_status === 'pending' || (!r.review_status && !r.is_approved)).length || 0
  );
  public approvedCount = computed(() =>
    this.compensatoryTimeoffsApi.value()?.filter(r => r.is_approved === true).length || 0
  );
  public rejectedCount = computed(() =>
    this.compensatoryTimeoffsApi.value()?.filter(r => r.review_status === 'rejected' || r.rejection_comment).length || 0
  );

  // Filtered requests
  public filteredRequests = computed(() => {
    let requests = this.compensatoryTimeoffsApi.value() || [];
    const globalSearch = this.globalSearchText().toLowerCase();
    if (globalSearch) {
      requests = requests.filter(r => {
        const name = this.getEmployeeName(r).toLowerCase();
        const email = this.getEmployeeEmail(r).toLowerCase();
        const reason = (this.getCompensatoryReasonFromNotes(r) || '').toLowerCase();
        return name.includes(globalSearch) || email.includes(globalSearch) || reason.includes(globalSearch);
      });
    }
    const search = this.searchText().toLowerCase();
    if (search) {
      requests = requests.filter(r => {
        const name = this.getEmployeeName(r).toLowerCase();
        const email = this.getEmployeeEmail(r).toLowerCase();
        const reason = (this.getCompensatoryReasonFromNotes(r) || '').toLowerCase();
        return name.includes(search) || email.includes(search) || reason.includes(search);
      });
    }
    const status = this.selectedStatus();
    if (status) {
      if (status === 'pending') requests = requests.filter(r => r.review_status === 'pending' || (!r.review_status && !r.is_approved));
      else if (status === 'approved') requests = requests.filter(r => r.is_approved === true);
      else if (status === 'rejected') requests = requests.filter(r => r.review_status === 'rejected' || r.rejection_comment);
    }
    const dateRange = this.dateRange();
    if (dateRange && dateRange.length === 2) {
      const [startDate, endDate] = dateRange;
      requests = requests.filter(r => { const d = new Date(r.date_from); return d >= startDate && d <= endDate; });
    }
    return requests;
  });

  // Public methods
  public reload(): void { this.compensatoryTimeoffsApi.reload(); }

  public hasActiveFilters(): boolean {
    return !!(this.searchText() || this.selectedStatus() || this.dateRange() || this.globalSearchText());
  }

  public getActiveFiltersCount(): number {
    let c = 0;
    if (this.searchText()) c++;
    if (this.selectedStatus()) c++;
    if (this.dateRange()) c++;
    if (this.globalSearchText()) c++;
    return c;
  }

  public clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  // Employee helpers
  public getEmployeeName(r: CompensatoryRequest): string {
    return r.employee ? `${r.employee.first_name || ''} ${r.employee.father_name || ''}`.trim() : 'Empleado';
  }
  public getEmployeeEmail(r: CompensatoryRequest): string { return r.employee?.work_email || ''; }
  public getEmployeePosition(r: CompensatoryRequest): string | null { return r.employee?.position?.name || null; }

  // Status helpers
  public getStatusLabel(r: CompensatoryRequest): string {
    if (r.is_approved) return 'Aprobado';
    if (r.rejection_comment || r.review_status === 'rejected') return 'Rechazado';
    if (r.review_status === 'approved') return 'En Registro';
    return 'Pendiente';
  }
  public getStatusSeverity(r: CompensatoryRequest): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (r.is_approved) return 'success';
    if (r.rejection_comment || r.review_status === 'rejected') return 'danger';
    if (r.review_status === 'approved') return 'info';
    return 'warn';
  }
  public getAuditStatusLabel(status: string): string {
    const labels: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', registered: 'Registrado' };
    return labels[status] || status;
  }

  // Note parsing helpers
  public getCompensatoryTypeFromNotes(data: CompensatoryRequest): 'days' | 'hours' | null {
    if (data.compensatory_type) return data.compensatory_type;
    if (data.notes) {
      const notesArray = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const tipoNote = notesArray.find((n: any) => typeof n === 'string' && n.includes('Tipo:'));
      if (tipoNote) { const m = tipoNote.match(/Tipo:\s*(hours|days)/); if (m && m[1]) return m[1] as 'hours' | 'days'; }
    }
    if (data.date_from && data.date_to) {
      const f = String(data.date_from), t = String(data.date_to);
      if (f.includes(' ') && f.includes(':') && t.includes(' ') && t.includes(':')) return 'hours';
      return 'days';
    }
    return null;
  }

  public getCompensatoryReasonFromNotes(data: CompensatoryRequest): string | null {
    if (data.reason) return data.reason;
    if (data.notes) {
      const notesArray = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const technicalPatterns = [/^Tipo:\s*/, /^Cantidad solicitada:\s*/, /^Fecha compensatorio:\s*/, /^Hora inicio:\s*/, /^Hora fin:\s*/, /^Fechas horas extra:\s*/];
      for (const note of notesArray) {
        if (typeof note === 'string' && note.trim().length > 0) {
          const isTechnical = technicalPatterns.some(p => p.test(note));
          if (!isTechnical) {
            if (note.includes('Motivo:')) { const m = note.match(/Motivo:\s*(.+)/); return m && m[1] ? m[1].trim() : note.replace('Motivo:', '').trim(); }
            return note.trim();
          }
        }
      }
    }
    return null;
  }

  public getCompensatoryDateFromNotes(data: CompensatoryRequest): string | null {
    if (data.notes) {
      const arr = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const n = arr.find((x: any) => typeof x === 'string' && x.includes('Fecha compensatorio:'));
      if (n) { const m = n.match(/Fecha compensatorio:\s*(.+)/); return m && m[1] ? m[1].trim() : null; }
    }
    return null;
  }

  public getCompensatoryTimeFromNotes(data: CompensatoryRequest): { start: string | null; end: string | null } {
    const result = { start: null as string | null, end: null as string | null };
    if (data.notes) {
      const arr = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const s = arr.find((x: any) => typeof x === 'string' && x.includes('Hora inicio:'));
      const e = arr.find((x: any) => typeof x === 'string' && x.includes('Hora fin:'));
      if (s) { const m = s.match(/Hora inicio:\s*(.+)/); result.start = m && m[1] ? m[1].trim() : null; }
      if (e) { const m = e.match(/Hora fin:\s*(.+)/); result.end = m && m[1] ? m[1].trim() : null; }
    }
    return result;
  }

  public getCompensatoryOvertimeDatesFromNotes(data: CompensatoryRequest): string[] {
    if (data.notes) {
      const arr = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const n = arr.find((x: any) => typeof x === 'string' && x.includes('Fechas horas extra:'));
      if (n) { const m = n.match(/Fechas horas extra:\s*(.+)/); if (m && m[1]) return m[1].split(',').map(d => d.trim()).filter(d => d.length > 0); }
    }
    return [];
  }

  public getCompensatoryRequestedAmountFromNotes(data: CompensatoryRequest): number | null {
    if (data.notes) {
      const arr = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const n = arr.find((x: any) => typeof x === 'string' && x.includes('Cantidad solicitada:'));
      if (n) { const m = n.match(/Cantidad solicitada:\s*(\d+)/); return m && m[1] ? parseInt(m[1], 10) : null; }
    }
    return null;
  }

  public getCompensatoryQuantity(data: CompensatoryRequest): { value: number; isDays: boolean } {
    let isDays = false;
    if (data.compensatory_type) { isDays = data.compensatory_type === 'days'; }
    else if (data.notes) {
      const arr = Array.isArray(data.notes) ? data.notes : typeof data.notes === 'string' ? [data.notes] : [];
      const tipoNote = arr.find((n: any) => typeof n === 'string' && n.includes('Tipo:'));
      if (tipoNote) { isDays = tipoNote.includes('Días'); }
      else if (data.date_from && data.date_to) {
        const f = String(data.date_from), t = String(data.date_to);
        if (f.includes(' ') && f.includes(':') && t.includes(' ') && t.includes(':')) isDays = false;
        else { const h = this.calculateHoursFromDates(data.date_from, data.date_to); const d = h / 24; isDays = d >= 1 && Math.abs(d - Math.round(d)) < 0.1; }
      }
    } else if (data.date_from && data.date_to) {
      const f = String(data.date_from), t = String(data.date_to);
      if (f.includes(' ') && f.includes(':') && t.includes(' ') && t.includes(':')) isDays = false;
      else { const h = this.calculateHoursFromDates(data.date_from, data.date_to); const d = h / 24; isDays = d >= 1 && Math.abs(d - Math.round(d)) < 0.1; }
    }

    if (isDays) {
      let days = 0;
      if (data.compensatory_amount) days = data.compensatory_amount;
      else if (data.date_from && data.date_to) days = this.calculateDays(data.date_from, data.date_to);
      return { value: days > 0 ? days : 1, isDays: true };
    } else {
      let hours = 0;
      if (data.compensatory_amount) hours = data.compensatory_amount;
      else if (data.date_from && data.date_to) {
        hours = this.calculateHoursFromDates(data.date_from, data.date_to);
        if (hours >= 24 && hours % 24 < 0.1) return { value: Math.round(hours / 24), isDays: true };
      } else if (data.hours) hours = data.hours;
      if (hours === 0 && !data.date_from && !data.date_to && !data.hours && !data.compensatory_amount) return { value: 0, isDays: false };
      return { value: hours > 0 ? hours : 0, isDays: false };
    }
  }

  // Date/time helpers
  public calculateDays(start: string | Date, end: string | Date): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  public calculateHoursFromDates(dateFrom: Date | string, dateTo: Date | string): number {
    const s = new Date(dateFrom), e = new Date(dateTo);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    return Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60) * 100) / 100;
  }
  public formatHoursMinutes(hours: number): string {
    if (hours === 0) return '0m';
    const h = Math.floor(hours), m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  public formatDate(dateString: string): string {
    try { return format(new Date(dateString + 'T00:00:00'), 'dd/MM/yyyy'); } catch { return dateString; }
  }
  public hasDelay(delayHours: string | undefined): boolean {
    if (!delayHours) return false;
    const d = parseFloat(delayHours);
    return !isNaN(d) && d > 0;
  }

  // View details
  public viewDetails(request: CompensatoryRequest): void {
    this.selectedRequest.set(request);
    this.showDetailsDialog.set(true);
    this.loadEmployeeOvertimeHours(request.employee_id);
    this.loadAuditHistory(request.id);
    this.rejectionComment.set(request.rejection_comment || '');
  }

  // Audit
  public loadAuditHistory(timeoffId: string): void {
    this.isLoadingAuditHistory.set(true);
    this.auditService.getAuditHistory(timeoffId).subscribe({
      next: (history) => {
        this.auditHistory.set(history);
        this.expandedAuditItems.set(new Set(history.map(l => l.id)));
        this.isLoadingAuditHistory.set(false);
      },
      error: () => { this.auditHistory.set([]); this.isLoadingAuditHistory.set(false); },
    });
  }

  public openAuditHistoryDialog(): void {
    this.showAuditHistoryDialog.set(true);
    this.loadAllAuditHistory();
  }

  public loadAllAuditHistory(): void {
    this.isLoadingAllAuditHistory.set(true);
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) { this.allAuditHistory.set([]); this.isLoadingAllAuditHistory.set(false); return; }
    this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`, {
      params: { type_id: `eq.${compensatoryTypeId}`, select: 'id,employee:employees!time_offs_employee_id_fkey(company_id)', 'employee.company_id': `eq.${companyId}` },
    }).subscribe({
      next: (timeoffs) => {
        if (timeoffs.length === 0) { this.allAuditHistory.set([]); this.isLoadingAllAuditHistory.set(false); return; }
        const ids = timeoffs.map(t => t.id);
        this.http.get<TimeoffAuditLog[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoff_audit_log`, {
          params: { timeoff_id: `in.(${ids.join(',')})`, select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email)`, order: 'changed_at.desc', limit: '1000' },
        }).subscribe({
          next: (history) => { this.allAuditHistory.set(history); this.isLoadingAllAuditHistory.set(false); },
          error: () => { this.allAuditHistory.set([]); this.isLoadingAllAuditHistory.set(false); },
        });
      },
      error: () => { this.allAuditHistory.set([]); this.isLoadingAllAuditHistory.set(false); },
    });
  }

  public getActionLabel(action: string): string {
    const labels: Record<string, string> = { created: 'creó la solicitud', status_changed: 'cambió el estado', approved: 'aprobó la solicitud', rejected: 'rechazó la solicitud', registered: 'registró la solicitud', updated: 'actualizó la solicitud' };
    return labels[action] || action;
  }
  public getActionIcon(action: string): string {
    const icons: Record<string, string> = { created: 'pi-plus-circle', status_changed: 'pi-sync', approved: 'pi-check-circle', rejected: 'pi-times-circle', registered: 'pi-save', updated: 'pi-pencil' };
    return icons[action] || 'pi-circle';
  }
  public getActionColor(action: string): string {
    const colors: Record<string, string> = { created: 'text-blue-400', status_changed: 'text-yellow-400', approved: 'text-green-400', rejected: 'text-red-400', registered: 'text-cyan-400', updated: 'text-gray-400' };
    return colors[action] || 'text-gray-400';
  }
  public toggleAuditItem(logId: string): void {
    const current = new Set(this.expandedAuditItems());
    if (current.has(logId)) current.delete(logId); else current.add(logId);
    this.expandedAuditItems.set(current);
  }

  // Overtime notes parsing
  public getOvertimeDaysFromNotes(request: CompensatoryRequest): Array<{ date: string; entryTime: string; exitTime: string; totalHours: string; lunchDuration: string; delayHours: string; overtimeHours: string }> | null {
    if (!request.notes) return null;
    const notesArray = Array.isArray(request.notes) ? request.notes : typeof request.notes === 'string' ? [request.notes] : [];
    const startIndex = notesArray.findIndex(n => typeof n === 'string' && n.includes('--- Fechas donde trabajó horas extra ---'));
    if (startIndex === -1) return null;
    const detailStartIndex = notesArray.findIndex((n, idx) => idx > startIndex && typeof n === 'string' && n.includes('Detalle por fecha:'));
    if (detailStartIndex === -1) return null;
    const days: Array<{ date: string; entryTime: string; exitTime: string; totalHours: string; lunchDuration: string; delayHours: string; overtimeHours: string }> = [];
    for (let i = detailStartIndex + 1; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (typeof note !== 'string') continue;
      const matchWithDelay = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h[^|]*\|\s+Almuerzo:\s+([\d.]+)h(?:\s+\|\s+Retraso:\s+([\d.]+)h)?\s+\|\s+Extra:\s+([\d.]+)h/);
      if (matchWithDelay) { days.push({ date: matchWithDelay[1], entryTime: matchWithDelay[2], exitTime: matchWithDelay[3], totalHours: matchWithDelay[4], lunchDuration: matchWithDelay[5], delayHours: matchWithDelay[6] || '0.00', overtimeHours: matchWithDelay[7] }); }
      else {
        const matchWithLunch = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Almuerzo:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/);
        if (matchWithLunch) { days.push({ date: matchWithLunch[1], entryTime: matchWithLunch[2], exitTime: matchWithLunch[3], totalHours: matchWithLunch[4], lunchDuration: matchWithLunch[5], delayHours: '0.00', overtimeHours: matchWithLunch[6] }); }
        else {
          const oldMatch = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/);
          if (oldMatch) { days.push({ date: oldMatch[1], entryTime: oldMatch[2], exitTime: oldMatch[3], totalHours: oldMatch[4], lunchDuration: '0.00', delayHours: '0.00', overtimeHours: oldMatch[5] }); }
        }
      }
    }
    return days.length > 0 ? days : null;
  }

  public getManualOvertimeDates(request: CompensatoryRequest): string[] {
    if (!request.notes) return [];
    let notesArray: string[] = [];
    if (Array.isArray(request.notes)) notesArray = request.notes;
    else if (typeof request.notes === 'string') {
      try { const parsed = JSON.parse(request.notes); notesArray = Array.isArray(parsed) ? parsed : [request.notes]; }
      catch { notesArray = [request.notes]; }
    } else return [];
    const startIndex = notesArray.findIndex(n => typeof n === 'string' && n.includes('--- Fechas donde trabajó horas extra (ingresadas manualmente) ---'));
    if (startIndex === -1) return [];
    const dates: string[] = [];
    for (let i = startIndex + 1; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (typeof note === 'string') {
        const match = note.match(/^\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
        if (match) dates.push(match[1]);
        else if (note.includes('RRHH revisará')) break;
      }
    }
    return dates;
  }

  public getManualDateSaldoLabel(dateStr: string): string {
    const isoDay = this.parseDDMMYYYYToISO(dateStr);
    if (!isoDay) return 'Horas Extras 0';
    const match = this.employeeOvertimeDaysAll().find(d => d.day === isoDay);
    if (!match) return 'Horas Extras 0';
    const remaining = Number(match.overtimeHours ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) return 'Horas Extras 0';
    const h = Math.floor(remaining), m = Math.round((remaining - h) * 60);
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  }

  private parseDDMMYYYYToISO(dateStr: string): string | null {
    const parts = String(dateStr).trim().split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const day = Number(dd), month = Number(mm), year = Number(yyyy);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;
    try { const d = new Date(year, month - 1, day); if (isNaN(d.getTime())) return null; return format(d, 'yyyy-MM-dd'); } catch { return null; }
  }

  // Overtime calculation
  private async loadEmployeeOvertimeHours(employeeId: string): Promise<void> {
    this.isLoadingOvertimeHours.set(true);
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) { this.employeeOvertimeHours.set(0); this.employeeOvertimeDays.set([]); return; }
      const today = new Date();
      const endDate = endOfDay(today);
      const startDate = startOfDay(subDays(today, this.overtimeHistoryWindowDays()));
      const startTimestamp = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
      const endTimestamp = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");
      const startDayStr = format(startDate, 'yyyy-MM-dd');
      const endDayStr = format(endDate, 'yyyy-MM-dd');

      const timelogParams = new HttpParams()
        .set('select', 'type,created_at,employee_id,company_id')
        .set('employee_id', `eq.${employeeId}`)
        .set('company_id', `eq.${companyId}`)
        .set('created_at', `gte.${startTimestamp}`)
        .append('created_at', `lte.${endTimestamp}`)
        .set('order', 'created_at.asc');
      const timelogs = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/timelogs`, { params: timelogParams }));

      const consumptionParams = new HttpParams()
        .set('select', 'overtime_day,hours_used')
        .set('employee_id', `eq.${employeeId}`)
        .set('company_id', `eq.${companyId}`)
        .set('overtime_day', `gte.${startDayStr}`)
        .append('overtime_day', `lte.${endDayStr}`);
      const consumptions = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/overtime_consumptions`, { params: consumptionParams }));

      const consumedByDay = this.sumConsumedHoursByDay(consumptions ?? []);
      const processedLogs = this.processTimelogsForOvertime(timelogs);
      const overtimeDaysRaw = this.extractOvertimeDays(processedLogs);
      const overtimeDaysRemaining = overtimeDaysRaw
        .map(d => ({ ...d, overtimeHours: Math.max(0, d.overtimeHours - (consumedByDay.get(d.day) ?? 0)) }))
        .filter(d => d.overtimeHours > 0)
        .sort((a, b) => b.day.localeCompare(a.day));
      const totalRemaining = overtimeDaysRemaining.reduce((acc, d) => acc + d.overtimeHours, 0);
      this.employeeOvertimeHours.set(totalRemaining);
      this.employeeOvertimeDaysAll.set(overtimeDaysRemaining);
      this.employeeOvertimeDays.set(overtimeDaysRemaining.slice(0, 200));
    } catch (error) {
      console.error('Error loading overtime hours:', error);
      this.employeeOvertimeHours.set(0); this.employeeOvertimeDaysAll.set([]); this.employeeOvertimeDays.set([]);
    } finally { this.isLoadingOvertimeHours.set(false); }
  }

  public loadMoreOvertimeHistory(): void {
    const req = this.selectedRequest();
    if (!req?.employee_id) return;
    this.overtimeHistoryWindowDays.set(this.overtimeHistoryWindowDays() + 365);
    void this.loadEmployeeOvertimeHours(req.employee_id);
  }

  private sumConsumedHoursByDay(rows: Array<{ overtime_day?: string; hours_used?: any }>): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rows) {
      const day = r?.overtime_day ? String(r.overtime_day).slice(0, 10) : null;
      if (!day) continue;
      const hours = Number(r?.hours_used ?? 0);
      if (!Number.isFinite(hours) || hours <= 0) continue;
      map.set(day, (map.get(day) ?? 0) + hours);
    }
    return map;
  }

  private processTimelogsForOvertime(timelogs: any[]): any[] {
    const processed = timelogs
      .map(x => ({ ...x, day: x.day ? String(x.day).slice(0, 10) : format(new Date(x.created_at), 'yyyy-MM-dd') }))
      .reduce<any[]>((acc, x) => {
        const existing = acc.find(item => item.day === x.day);
        if (!existing) {
          acc.push({
            day: x.day,
            entry: x.type === 'entry' ? { date: new Date(x.created_at) } : undefined,
            lunch_start: x.type === 'lunch_start' ? { date: new Date(x.created_at) } : undefined,
            lunch_end: x.type === 'lunch_end' ? { date: new Date(x.created_at) } : undefined,
            exit: x.type === 'exit' ? { date: new Date(x.created_at) } : undefined,
          });
        } else {
          if (x.type === 'entry') existing.entry = { date: new Date(x.created_at) };
          if (x.type === 'lunch_start') existing.lunch_start = { date: new Date(x.created_at) };
          if (x.type === 'lunch_end') existing.lunch_end = { date: new Date(x.created_at) };
          if (x.type === 'exit') existing.exit = { date: new Date(x.created_at) };
        }
        return acc;
      }, []);
    return processed.filter(log => log.entry && log.exit);
  }

  private extractOvertimeDays(logs: any[]): Array<{ day: string; overtimeHours: number; entryTime?: string; exitTime?: string; totalHours?: number }> {
    const overtimeDays: Array<{ day: string; overtimeHours: number; entryTime?: string; exitTime?: string; totalHours?: number }> = [];
    logs.forEach(log => {
      if (!log.entry || !log.exit) return;
      const entryDate = new Date(log.entry.date), exitDate = new Date(log.exit.date);
      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return;
      const totalMinutes = differenceInMinutes(exitDate, entryDate);
      const lunchMinutes = log.lunch_start && log.lunch_end ? differenceInMinutes(new Date(log.lunch_end.date), new Date(log.lunch_start.date)) : 0;
      const lunchToSubtract = Math.max(0, Math.min(lunchMinutes, 60));
      const workMinutes = totalMinutes - lunchToSubtract;
      const overtimeMinutes = Math.max(0, workMinutes - 480);
      if (overtimeMinutes > 0) {
        overtimeDays.push({ day: log.day, overtimeHours: overtimeMinutes / 60, entryTime: format(entryDate, 'HH:mm'), exitTime: format(exitDate, 'HH:mm'), totalHours: workMinutes / 60 });
      }
    });
    return overtimeDays;
  }

  // Approval / Rejection
  public approveRequest(request: CompensatoryRequest): void {
    const name = this.getEmployeeName(request);
    this.confirmationService.confirm({
      message: `¿Estás seguro de aprobar la solicitud de tiempo compensatorio de ${name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => { this.updateReviewStatus(request.id, 'approved'); },
    });
  }

  public rejectRequest(request: CompensatoryRequest): void {
    this.requestToReject.set(request);
    this.rejectionComment.set('');
    this.showRejectionDialog.set(true);
  }

  public confirmRejection(): void {
    const comment = this.rejectionComment().trim();
    const request = this.requestToReject();
    if (!comment || !request) return;
    this.showRejectionDialog.set(false);
    this.updateReviewStatus(request.id, 'rejected', comment);
  }

  private updateReviewStatus(id: string, status: 'approved' | 'rejected', rejectionComment?: string): void {
    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo identificar al empleado actual' }); return; }
    this.updatingStatus.set(true);
    const request = this.compensatoryTimeoffsApi.value()?.find(r => r.id === id);
    const oldStatus = request?.review_status || 'pending';
    const updateData: any = { review_status: status, is_approved: status === 'approved', reviewed_by: currentEmployee.id, reviewed_at: new Date().toISOString() };
    if (status === 'rejected' && rejectionComment) updateData.rejection_comment = rejectionComment;

    this.http.patch(this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${id}` }), updateData).subscribe({
      next: async () => {
        await this.auditService.logChange({ timeoffId: id, changedBy: currentEmployee.id, action: status === 'approved' ? 'approved' : 'rejected', oldStatus, newStatus: status, comment: status === 'rejected' ? rejectionComment : undefined });
        if (status === 'approved' && request) {
          await this.notifyEmployee(id, request, 'approved');
          try { await this.consumeOvertimeForApprovedRequest(request, oldStatus); if (this.showDetailsDialog()) void this.loadEmployeeOvertimeHours(request.employee_id); } catch (e) { console.warn('[CompensatoryTab] No se pudo consumir overtime automáticamente', e); }
          try {
            const timeOffType = request.compensatory_type === 'hours' ? 'compensatory_hours' as const : 'compensatory_day' as const;
            await this.scheduleAutoAssign.assignScheduleForTimeOff({ employeeId: request.employee_id, startDate: request.date_from, endDate: request.date_to, timeOffType, timeOffSourceId: request.id, companyId: request.company_id, createdBy: currentEmployee.id, compensatoryHoursAmount: request.compensatory_type === 'hours' ? request.compensatory_amount : undefined });
          } catch (e) { console.warn('[CompensatoryTab] Auto-assign schedule failed (non-blocking):', e); }
        } else if (status === 'rejected' && request) {
          await this.notifyEmployee(id, request, 'rejected', rejectionComment);
        }
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente` });
        this.compensatoryTimeoffsApi.reload();
        if (this.showDetailsDialog() && this.selectedRequest()?.id === id) this.loadAuditHistory(id);
        this.updatingStatus.set(false);
      },
      error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el estado de la solicitud' }); this.updatingStatus.set(false); },
    });
  }

  private async consumeOvertimeForApprovedRequest(request: CompensatoryRequest, oldStatus: string): Promise<void> {
    if (oldStatus === 'approved') return;
    const companyId = this.organizationService.getCurrentCompanyId();
    const actor = this.dashboardStore.currentEmployee();
    if (!companyId || !actor) return;
    const quantity = this.getCompensatoryQuantity(request);
    const requestedHours = quantity?.isDays ? quantity.value * 8 : quantity?.value ?? 0;
    if (!requestedHours || requestedHours <= 0) return;

    const manualDates = this.getManualOvertimeDates(request);
    const manualIsoDays = manualDates.map(d => this.parseDDMMYYYYToISO(d)).filter(Boolean) as string[];
    let candidates: Array<{ day: string; remainingHours: number }> = [];

    if (manualIsoDays.length > 0) {
      const timelogs = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/timelogs`, { params: { select: 'day,type,created_at,employee_id,company_id', employee_id: `eq.${request.employee_id}`, company_id: `eq.${companyId}`, day: `in.(${manualIsoDays.join(',')})`, order: 'day.asc,created_at.asc' } }));
      const consumptions = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/overtime_consumptions`, { params: { select: 'overtime_day,hours_used', employee_id: `eq.${request.employee_id}`, company_id: `eq.${companyId}`, overtime_day: `in.(${manualIsoDays.join(',')})` } }));
      const consumedByDay = this.sumConsumedHoursByDay(consumptions ?? []);
      const processed = this.processTimelogsForOvertime(timelogs ?? []);
      const overtimeDays = this.extractOvertimeDays(processed);
      const overtimeByDay = new Map(overtimeDays.map(d => [d.day, d.overtimeHours]));
      candidates = manualIsoDays.map(day => ({ day, remainingHours: Math.max(0, (overtimeByDay.get(day) ?? 0) - (consumedByDay.get(day) ?? 0)) })).filter(x => x.remainingHours > 0);
    } else {
      candidates = (this.employeeOvertimeDaysAll() ?? []).map(d => ({ day: d.day, remainingHours: d.overtimeHours })).filter(x => x.remainingHours > 0);
    }

    candidates.sort((a, b) => a.day.localeCompare(b.day));
    let remainingToAllocate = requestedHours;
    const rows: Array<Record<string, unknown>> = [];
    for (const c of candidates) {
      if (remainingToAllocate <= 0) break;
      const use = Math.min(c.remainingHours, remainingToAllocate);
      const hoursUsed = Math.round(use * 100) / 100;
      if (hoursUsed <= 0) continue;
      rows.push({ company_id: companyId, employee_id: request.employee_id, timeoff_id: request.id, overtime_day: c.day, hours_used: hoursUsed, created_by: actor.id, comment: 'Consumido automáticamente al aprobar compensatorio' });
      remainingToAllocate -= hoursUsed;
    }
    if (!rows.length) return;
    await firstValueFrom(this.http.post(`${this.apiUrl.baseUrl}/rest/v1/overtime_consumptions`, rows, { headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' } }));
    await this.auditService.logChange({ timeoffId: request.id, changedBy: actor.id, action: 'updated', oldStatus, newStatus: 'approved', comment: `Overtime consumido automáticamente al aprobar: ${rows.map((r: any) => `${String(r.overtime_day)}=${String(r.hours_used)}h`).join(', ')}`, newValue: { overtime_consumptions: rows } });
  }

  // Notifications
  private async notifyEmployee(timeoffId: string, request: CompensatoryRequest, status: 'approved' | 'rejected', rejComment?: string): Promise<void> {
    try {
      const employeeId = request.employee_id;
      if (!employeeId) return;
      const currentEmployee = this.dashboardStore.currentEmployee();
      const title = status === 'approved' ? 'Solicitud de Tiempo Compensatorio Aprobada' : 'Solicitud de Tiempo Compensatorio Rechazada';
      const message = status === 'approved' ? 'Tu solicitud de tiempo compensatorio ha sido registrada y aprobada.' : `Tu solicitud de tiempo compensatorio ha sido rechazada.${rejComment ? ` Motivo: ${rejComment}` : ''}`;
      await firstValueFrom(this.http.post(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`, { employee_id: employeeId, related_type: 'timeoff', related_id: timeoffId, message_type: status === 'approved' ? 'compensatory_approved' : 'compensatory_rejected', title, message, created_by: currentEmployee?.id || null }, { headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' } }));
    } catch (error) { console.error('Error enviando notificación al empleado:', error); }
  }

  // Document management
  public getDocumentUrl() {
    const request = this.selectedRequest();
    if (!request?.document_url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${request.document_url}#toolbar=1&navpanes=1&scrollbar=1`);
  }
  public openDocument(): void { this.showDocumentPreview.set(true); }
  public downloadDocument(): void { const url = this.selectedRequest()?.document_url; if (url) window.open(url, '_blank'); }

  public attachDocument(): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf'; input.style.display = 'none';
    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 5000000) { this.messageService.add({ severity: 'error', summary: 'Archivo demasiado grande', detail: 'El archivo no puede superar los 5MB.' }); return; }
      if (file.type !== 'application/pdf') { this.messageService.add({ severity: 'error', summary: 'Tipo de archivo inválido', detail: 'Solo se permiten archivos PDF.' }); return; }
      try {
        const request = this.selectedRequest();
        if (!request) return;
        this.attachingDoc.set(true);
        const fileName = `${request.employee_id}/${Date.now()}.pdf`;
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/compensatory/${fileName}`;
        await firstValueFrom(this.http.post(uploadUrl, file, { headers: { 'x-upsert': 'true' } }));
        const documentUrl = this.apiUrl.build(`storage/v1/object/public/compensatory/${fileName}`);
        await firstValueFrom(this.http.patch(this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${request.id}` }), { document_url: documentUrl }));
        this.messageService.add({ severity: 'success', summary: 'Archivo adjuntado', detail: 'El documento se adjuntó correctamente a la solicitud.' });
        this.compensatoryTimeoffsApi.reload();
      } catch (error) { console.error('Error attaching document:', error); this.messageService.add({ severity: 'error', summary: 'Error al adjuntar archivo', detail: 'No se pudo adjuntar el archivo. Inténtalo nuevamente.' }); }
      finally { this.attachingDoc.set(false); }
    };
    document.body.appendChild(input); input.click(); document.body.removeChild(input);
  }

  public saveRejectionComment(): void {
    const request = this.selectedRequest();
    if (!request) return;
    this.savingComment.set(true);
    const comment = this.rejectionComment().trim() || null;
    this.http.patch(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs?id=eq.${request.id}`, { rejection_comment: comment }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Comentario de rechazo guardado correctamente' });
        this.compensatoryTimeoffsApi.reload();
        if (request) request.rejection_comment = comment || undefined;
        this.savingComment.set(false);
      },
      error: () => { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el comentario' }); this.savingComment.set(false); },
    });
  }

  // Export
  public async exportData(): Promise<void> {
    try {
      const xlsxModule = await import('xlsx-js-style');
      const XLSX = (xlsxModule as any).default || xlsxModule;
      const { styleDataSheet, styleSummarySheet, MODULE_COLORS } = await import('../../shared/utils/excel-style.utils');
      const requests = this.filteredRequests();
      if (requests.length === 0) { this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay solicitudes para exportar con los filtros aplicados' }); return; }
      const data = await Promise.all(requests.map(async (req) => {
        const reviewedByName = req.reviewed_by ? await this.getEmployeeNameById(req.reviewed_by) : 'N/A';
        return {
          'Fecha Solicitud': req.created_at ? format(new Date(req.created_at), 'dd/MM/yyyy HH:mm') : '',
          Empleado: this.getEmployeeName(req), Email: this.getEmployeeEmail(req),
          Posición: req.employee?.position?.name || 'N/A', Sucursal: req.employee?.branch?.name || 'N/A',
          'Fecha Desde': req.date_from ? format(new Date(req.date_from), 'dd/MM/yyyy') : '',
          'Fecha Hasta': req.date_to ? format(new Date(req.date_to), 'dd/MM/yyyy') : '',
          Tipo: req.compensatory_type === 'hours' ? 'Horas' : 'Días',
          Cantidad: req.compensatory_amount || req.hours || 0,
          'Horas Totales': req.hours || (req.compensatory_amount || 0) * 8,
          Motivo: this.getCompensatoryReasonFromNotes(req) || '',
          Estado: this.getStatusLabel(req), 'Revisado Por': reviewedByName,
          'Fecha Revisión': req.reviewed_at ? format(new Date(req.reviewed_at), 'dd/MM/yyyy HH:mm') : '',
          'Comentario Rechazo': req.rejection_comment || '',
        };
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
      ws['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 30 }];
      styleDataSheet(ws, XLSX.utils, MODULE_COLORS['compensatory']);
      const summaryData = [
        ['Resumen - Tiempo Compensatorio'], ['Fecha Exportación', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        ['Total Solicitudes', requests.length], ['Pendientes', this.pendingCount()],
        ['Aprobadas', this.approvedCount()], ['Rechazadas', this.rejectedCount()],
        [''], ['Filtros Aplicados'], ['Búsqueda', this.searchText() || 'Ninguna'],
        ['Estado', this.selectedStatus() ? this.statusOptions.find(o => o.value === this.selectedStatus())?.label || 'Todos' : 'Todos'],
        ['Rango Fechas', this.dateRange() ? `${format(this.dateRange()![0], 'dd/MM/yyyy')} - ${format(this.dateRange()![1], 'dd/MM/yyyy')}` : 'Todos'],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 30 }];
      styleSummarySheet(summaryWs, XLSX.utils, MODULE_COLORS['compensatory']);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      XLSX.writeFile(wb, `Tiempo_Compensatorio_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`);
      this.messageService.add({ severity: 'success', summary: 'Exportación exitosa', detail: `Se exportaron ${requests.length} solicitudes` });
    } catch (error) {
      console.error('Error exportando datos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar los datos' });
    }
  }

  private async getEmployeeNameById(employeeId: string): Promise<string> {
    try {
      const employee = await firstValueFrom(this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`, { params: { id: `eq.${employeeId}`, select: 'first_name,father_name' } }));
      if (employee && employee[0]) return `${employee[0].first_name} ${employee[0].father_name}`;
      return 'N/A';
    } catch { return 'N/A'; }
  }
}
