import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { catchError, of, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  ScheduleChangeRequest,
  ScheduleChangeRequestService,
  ScheduleChangeRequestStatus,
} from '../../../../services/schedule-change-request.service';
import { colorVariants } from '../../../../models';
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import { DeviceService } from '../../../../services/device.service';


@Component({
  selector: 'pt-schedule-changes-tab',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    ButtonModule,
    CalendarModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    HrStatsGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Desktop -->
    @if (!isMobile()) {
    <div class="space-y-3">
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-calendar-clock"
        approvedLabel="Aprobadas"
      />

      <!-- Métricas por Tienda -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
        <button type="button"
          class="w-full p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-700/20 transition-colors rounded-t-lg"
          [class.border-b]="showBranchMetrics()"
          [class.border-neutral-700/50]="showBranchMetrics()"
          (click)="showBranchMetrics.set(!showBranchMetrics())">
          <div class="flex items-center gap-1.5">
            <i class="pi pi-building text-amber-400 text-sm"></i>
            <span class="text-sm font-semibold text-white">Solicitudes por Tienda</span>
          </div>
          <div class="flex items-center gap-2">
            <p-calendar [(ngModel)]="selectedMetricMonth" view="month" dateFormat="MM yy"
              [inputStyle]="{ height: '28px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: '110px' }"
              (click)="$event.stopPropagation()" />
            <i [class]="showBranchMetrics() ? 'pi pi-chevron-up text-gray-400 text-xs' : 'pi pi-chevron-down text-gray-400 text-xs'"></i>
          </div>
        </button>
        @if (showBranchMetrics()) {
          @if (branchMetrics().length === 0) {
          <p class="text-xs text-gray-500 m-0 p-3">Sin solicitudes este mes.</p>
          } @else {
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-700/50">
                <th class="text-left text-xs font-medium text-gray-400 p-2 pl-3">Tienda</th>
                <th class="text-center text-xs font-medium text-gray-400 p-2">Solicitudes</th>
                <th class="text-center text-xs font-medium text-gray-400 p-2">Pendientes</th>
                <th class="text-center text-xs font-medium text-gray-400 p-2">Aprobadas</th>
              </tr>
            </thead>
            <tbody>
              @for (m of branchMetrics(); track m.branchName) {
              <tr class="border-b border-neutral-700/30 hover:bg-neutral-700/20">
                <td class="text-gray-200 p-2 pl-3 text-xs font-medium">{{ m.branchName }}</td>
                <td class="text-center text-gray-300 p-2 text-xs font-bold">{{ m.total }}</td>
                <td class="text-center p-2 text-xs">
                  @if (m.pending > 0) {
                    <span class="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">{{ m.pending }}</span>
                  } @else {
                    <span class="text-gray-600">—</span>
                  }
                </td>
                <td class="text-center p-2 text-xs">
                  @if (m.approved > 0) {
                    <span class="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">{{ m.approved }}</span>
                  } @else {
                    <span class="text-gray-600">—</span>
                  }
                </td>
              </tr>
              }
            </tbody>
          </table>
          }
        }
      </div>

      <!-- Filtros colapsables -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
             (click)="showFilters.set(!showFilters())">
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-amber-400 text-sm"></i>
            <h3 class="text-sm font-semibold text-white m-0">Filtros Avanzados</h3>
            @if (hasActiveFilters()) {
              <span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold">
                {{ activeFiltersCount() }} activos
              </span>
            }
          </div>
          <i class="pi text-sm"
             [class.pi-chevron-down]="!showFilters()"
             [class.pi-chevron-up]="showFilters()"
             [class.text-gray-400]="!showFilters()"
             [class.text-amber-400]="showFilters()"></i>
        </div>
        @if (showFilters()) {
        <div class="p-3 space-y-2">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-search mr-1 text-amber-400 text-xs"></i>Búsqueda
              </label>
              <input type="text" pInputText placeholder="Empleado, motivo..."
                [(ngModel)]="searchText" (ngModelChange)="searchText.set($event)"
                class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-amber-400 text-xs"></i>Estado
              </label>
              <p-dropdown [options]="statusOptions" [(ngModel)]="selectedStatus"
                placeholder="Todos" [showClear]="true" class="w-full text-sm"
                [style]="{ height: '32px' }" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-amber-400 text-xs"></i>Tipo
              </label>
              <p-dropdown [options]="typeOptions" [(ngModel)]="selectedType"
                placeholder="Todos" [showClear]="true" class="w-full text-sm"
                [style]="{ height: '32px' }" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-calendar mr-1 text-amber-400 text-xs"></i>Rango de Fechas
              </label>
              <p-calendar [(ngModel)]="dateRange" selectionMode="range"
                [showIcon]="true" dateFormat="dd/mm/yy" placeholder="Seleccionar"
                [showClear]="true" class="w-full text-sm"
                [inputStyle]="{ height: '32px', padding: '0.375rem' }" />
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-neutral-700/50">
            <p-button label="Limpiar Todo" icon="pi pi-filter-slash"
              [outlined]="true" severity="secondary"
              (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <i class="pi pi-info-circle"></i>
              <span>{{ filteredRequests().length }} de {{ allRequests().length }} resultados</span>
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Tabla -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
            <i class="pi pi-calendar-clock text-amber-400 text-sm"></i>
            Solicitudes de Cambio de Horario
          </h3>
          <p-button icon="pi pi-refresh" [text]="true" severity="secondary" size="small"
            [rounded]="true" [loading]="loading()" (onClick)="loadRequests()"
            pTooltip="Actualizar" tooltipPosition="top" />
        </div>

        @if (loading()) {
        <div class="flex justify-center items-center py-8">
          <div class="text-center">
            <p-progressSpinner />
            <p class="text-gray-400 mt-2 text-sm">Cargando solicitudes...</p>
          </div>
        </div>
        } @else if (filteredRequests().length === 0) {
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <i class="pi pi-inbox text-4xl text-gray-600 mb-2"></i>
          <h4 class="text-sm font-semibold text-gray-300 mb-1">No se encontraron solicitudes</h4>
          <p class="text-gray-500 text-xs mb-2">Intenta ajustar los filtros para ver más resultados</p>
          <p-button label="Limpiar Filtros" icon="pi pi-filter-slash"
            [outlined]="true" severity="secondary" size="small" (onClick)="clearFilters()" />
        </div>
        } @else {
        <div class="overflow-x-auto">
          <p-table [value]="filteredRequests()" [paginator]="true" [rows]="8"
            [rowsPerPageOptions]="[5, 8, 10, 15, 25]" paginatorPosition="bottom"
            styleClass="p-datatable-striped p-datatable-sm"
            [tableStyle]="{ 'min-width': '60rem' }">
            <ng-template pTemplate="header">
              <tr>
                <th style="width:180px; padding:0.5rem; text-align:left;">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-amber-400 text-xs"></i>
                    <span class="text-xs">Empleado</span>
                  </div>
                </th>
                <th style="width:90px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-tag text-amber-400 text-xs"></i>
                    <span class="text-xs">Tipo</span>
                  </div>
                </th>
                <th style="width:100px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-calendar text-amber-400 text-xs"></i>
                    <span class="text-xs">Fecha</span>
                  </div>
                </th>
                <th style="width:130px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-arrow-right text-amber-400 text-xs"></i>
                    <span class="text-xs">Actual → Propuesto</span>
                  </div>
                </th>
                <th style="padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-file-edit text-amber-400 text-xs"></i>
                    <span class="text-xs">Motivo</span>
                  </div>
                </th>
                <th style="width:100px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-tag text-amber-400 text-xs"></i>
                    <span class="text-xs">Estado</span>
                  </div>
                </th>
                <th style="width:130px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user-plus text-amber-400 text-xs"></i>
                    <span class="text-xs">Solicitado por</span>
                  </div>
                </th>
                <th style="width:110px; padding:0.5rem; text-align:center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-cog text-amber-400 text-xs"></i>
                    <span class="text-xs">Acciones</span>
                  </div>
                </th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-req>
              <tr class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                  (click)="openDetails(req)">
                <!-- Empleado -->
                <td style="padding:0.5rem; text-align:left;">
                  <div class="flex items-center gap-1.5">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center flex-shrink-0">
                      <i class="pi pi-user text-amber-400 text-[10px]"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-semibold text-white text-xs truncate">
                        {{ req.employee?.first_name }} {{ req.employee?.father_name }}
                      </span>
                      <span class="text-[10px] text-gray-400 truncate">
                        {{ req.branch?.name || '-' }}
                      </span>
                    </div>
                  </div>
                </td>
                <!-- Tipo -->
                <td style="padding:0.5rem; text-align:center;">
                  <p-tag [value]="getTypeLabel(req.request_type)"
                    [severity]="getTypeSeverity(req.request_type)"
                    [rounded]="true"
                    [style]="{ 'font-size': '0.7rem', padding: '0.125rem 0.5rem' }" />
                </td>
                <!-- Fecha -->
                <td style="padding:0.5rem; text-align:center;">
                  <span class="text-xs text-gray-300">{{ formatDate(req.schedule_date) }}</span>
                </td>
                <!-- Actual → Propuesto -->
                <td style="padding:0.5rem; text-align:center;">
                  <div class="flex flex-col gap-0.5 text-[10px]">
                    @if (req.current_schedule) {
                      <span class="text-gray-400 truncate max-w-[120px]">{{ req.current_schedule.name }}</span>
                    } @else {
                      <span class="text-gray-600 italic">Sin horario</span>
                    }
                    @if (req.proposed_schedule) {
                      <span class="text-amber-300 font-medium truncate max-w-[120px]">{{ req.proposed_schedule.name }}</span>
                    } @else {
                      <span class="text-gray-600 italic">Eliminar</span>
                    }
                  </div>
                </td>
                <!-- Motivo -->
                <td style="padding:0.5rem; text-align:center;">
                  <span class="text-xs text-gray-300 cursor-help inline-block max-w-[160px] truncate"
                    [pTooltip]="req.reason" tooltipPosition="top">
                    {{ req.reason }}
                  </span>
                </td>
                <!-- Estado -->
                <td style="padding:0.5rem; text-align:center;">
                  <p-tag [value]="getStatusLabel(req.status)"
                    [severity]="getStatusSeverity(req.status)"
                    [rounded]="true"
                    [style]="{ 'font-size': '0.7rem', padding: '0.125rem 0.5rem' }" />
                </td>
                <!-- Solicitado por -->
                <td style="padding:0.5rem; text-align:center;">
                  @if (req.requester) {
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-user text-amber-400 text-[9px]"></i>
                      <span class="text-[10px] font-medium text-amber-300">
                        {{ req.requester.first_name }} {{ req.requester.father_name }}
                      </span>
                    </div>
                  } @else {
                    <span class="text-[10px] text-gray-500 italic">Auto-solicitud</span>
                  }
                </td>
                <!-- Acciones -->
                <td style="padding:0.5rem; text-align:center;" (click)="$event.stopPropagation()">
                  <div class="flex gap-0.5 justify-center">
                    @if (req.status === 'pending') {
                      <p-button icon="pi pi-check" [text]="true" severity="success" size="small"
                        [rounded]="true" pTooltip="Aprobar" tooltipPosition="top"
                        [loading]="processingId() === req.id"
                        (onClick)="approve(req); $event.stopPropagation()" />
                      <p-button icon="pi pi-times" [text]="true" severity="danger" size="small"
                        [rounded]="true" pTooltip="Rechazar" tooltipPosition="top"
                        [disabled]="processingId() === req.id"
                        (onClick)="openRejectDialog(req); $event.stopPropagation()" />
                    }
                    @if (req.status !== 'pending' && req.review_notes) {
                      <span class="text-[10px] text-gray-500 italic max-w-[90px] truncate"
                        [pTooltip]="req.review_notes" tooltipPosition="top">
                        {{ req.review_notes }}
                      </span>
                    }
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
        }
      </div>
    </div>
    }

    <!-- Mobile -->
    @if (isMobile()) {
    <div class="space-y-3">
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-calendar-clock"
        approvedLabel="Aprobadas"
      />
      <button type="button" (click)="showFilters.set(!showFilters())"
        class="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-left text-sm text-gray-300">
        <span><i class="pi pi-filter text-amber-400 mr-2"></i>Filtros
          @if (hasActiveFilters()) {
            <span class="text-amber-400 text-xs">({{ activeFiltersCount() }})</span>
          }
        </span>
        <i [class]="showFilters() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
      </button>
      @if (showFilters()) {
      <div class="grid grid-cols-1 gap-2 p-2 bg-neutral-800/80 rounded-lg border border-neutral-700/50">
        <input type="text" pInputText placeholder="Empleado, motivo..."
          [(ngModel)]="searchText" class="w-full text-sm py-2 bg-neutral-900/50 border-neutral-600 rounded" />
        <p-dropdown [options]="statusOptions" [(ngModel)]="selectedStatus"
          placeholder="Estado" [showClear]="true" class="w-full" styleClass="w-full" />
        <p-dropdown [options]="typeOptions" [(ngModel)]="selectedType"
          placeholder="Tipo" [showClear]="true" class="w-full" styleClass="w-full" />
        <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
          [outlined]="true" severity="secondary" size="small"
          (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
      </div>
      }

      @if (loading()) {
        <div class="flex justify-center py-8"><p-progressSpinner /></div>
      } @else if (filteredRequests().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-inbox text-3xl block mb-2"></i>
          <p class="text-sm">No hay solicitudes</p>
          <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
            [outlined]="true" severity="secondary" size="small"
            (onClick)="clearFilters()" class="mt-2" />
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (req of filteredRequests(); track req.id) {
          <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors cursor-pointer"
               (click)="openDetails(req)">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-white text-sm m-0 truncate">
                  {{ req.employee?.first_name }} {{ req.employee?.father_name }}
                </p>
                <p class="text-xs text-gray-400 m-0 mt-0.5">{{ req.branch?.name || '-' }}</p>
                <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-xs">
                  <span class="text-gray-400">{{ formatDate(req.schedule_date) }}</span>
                  @if (req.proposed_schedule) {
                    <span class="text-amber-300">→ {{ req.proposed_schedule.name }}</span>
                  }
                </div>
                <p class="text-xs text-gray-500 m-0 mt-1 truncate">{{ req.reason }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <p-tag [value]="getTypeLabel(req.request_type)"
                  [severity]="getTypeSeverity(req.request_type)"
                  [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
                <p-tag [value]="getStatusLabel(req.status)"
                  [severity]="getStatusSeverity(req.status)"
                  [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
              </div>
            </div>
            @if (req.status === 'pending') {
            <div class="flex gap-1 mt-2" (click)="$event.stopPropagation()">
              <p-button icon="pi pi-check" [text]="true" severity="success" size="small"
                [loading]="processingId() === req.id" (onClick)="approve(req); $event.stopPropagation()" />
              <p-button icon="pi pi-times" [text]="true" severity="danger" size="small"
                [disabled]="processingId() === req.id"
                (onClick)="openRejectDialog(req); $event.stopPropagation()" />
            </div>
            }
          </div>
          }
        </div>
      }
    </div>
    }

    <!-- Diálogo de detalles -->
    <p-dialog [(visible)]="showDetailsDialog" [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }" [draggable]="false"
      [resizable]="false" [dismissableMask]="true">
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full pr-2">
          <span class="text-lg font-semibold text-white">Detalle de Solicitud</span>
          @if (detailsRequest()?.branch) {
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            [ngClass]="{
              'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]': showBranchSchedules(),
              'bg-neutral-700/60 text-gray-400 border border-neutral-600 hover:bg-neutral-700 hover:text-gray-200 hover:border-neutral-500': !showBranchSchedules()
            }"
            (click)="toggleBranchSchedules()"
            pTooltip="Ver todos los horarios de esta sucursal para el día"
            tooltipPosition="bottom"
          >
            <i class="pi pi-building text-[11px]"></i>
            <span>{{ showBranchSchedules() ? 'Ocultar' : 'Ver' }} sucursal</span>
            @if (loadingBranchSchedules()) {
              <i class="pi pi-spin pi-spinner text-[10px]"></i>
            }
          </button>
          }
        </div>
      </ng-template>
      @if (detailsRequest()) {
      <div class="space-y-4 pt-4">
        <!-- Empleado + Resumen -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Info Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <i class="pi pi-user text-amber-400"></i> Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                <p class="text-white">{{ detailsRequest()!.employee?.first_name }} {{ detailsRequest()!.employee?.father_name }}</p>
              </div>
              @if (detailsRequest()!.branch) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Sucursal</label>
                <p class="text-white">{{ detailsRequest()!.branch!.name }}</p>
              </div>
              }
              <div class="flex items-center gap-3 pt-1">
                <span class="text-xs text-gray-400">Solicitudes:</span>
                <span class="px-1.5 py-0.5 rounded-full bg-neutral-700 text-gray-200 text-[10px] font-bold">{{ employeeStats().total }}</span>
                <span class="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">{{ employeeStats().approved }}</span>
                <span class="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">{{ employeeStats().rejected }}</span>
              </div>
            </div>
          </div>

          <!-- Resumen del Cambio -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <i class="pi pi-calendar-clock text-amber-400"></i> Resumen del Cambio
            </h3>
            <div class="flex items-center gap-3 mb-4">
              <p-tag [value]="getTypeLabel(detailsRequest()!.request_type)"
                [severity]="getTypeSeverity(detailsRequest()!.request_type)"
                [style]="{ 'font-size': '0.85rem' }" />
              <span class="text-sm text-gray-400">
                <i class="pi pi-calendar text-xs mr-1"></i>{{ formatDate(detailsRequest()!.schedule_date) }}
              </span>
            </div>
            <div class="space-y-3">
              @if (detailsRequest()!.current_schedule; as curr) {
              <div>
                <p class="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Horario Actual</p>
                <div class="flex items-center gap-2 rounded-lg border-2 border-neutral-600 p-2.5"
                     [class]="getScheduleBarClass(curr.color)">
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm m-0">{{ curr.name }}</p>
                    @if (!curr.day_off && curr.entry_time && curr.exit_time) {
                    <p class="text-xs m-0 mt-0.5 opacity-80">{{ formatTime(curr.entry_time) }} - {{ formatTime(curr.exit_time) }}</p>
                    }
                    @if (curr.day_off) {
                    <p class="text-xs m-0 mt-0.5 opacity-80">Día libre</p>
                    }
                  </div>
                </div>
              </div>
              }
              @if (detailsRequest()!.request_type === 'update') {
              <div class="flex items-center justify-center">
                <i class="pi pi-arrow-down text-amber-400 text-lg"></i>
              </div>
              }
              @if (detailsRequest()!.proposed_schedule; as prop) {
              <div>
                <p class="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Horario Propuesto</p>
                <div class="flex items-center gap-2 rounded-lg border-2 p-2.5"
                     [class]="getScheduleBarClass(prop.color)"
                     [style]="{ 'border-color': 'rgba(251,191,36,0.5)' }">
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm m-0">{{ prop.name }}</p>
                    @if (!prop.day_off && prop.entry_time && prop.exit_time) {
                    <p class="text-xs m-0 mt-0.5 opacity-80">{{ formatTime(prop.entry_time) }} - {{ formatTime(prop.exit_time) }}</p>
                    }
                    @if (prop.day_off) {
                    <p class="text-xs m-0 mt-0.5 opacity-80">Día libre</p>
                    }
                  </div>
                  <i class="pi pi-arrow-right text-xs opacity-60"></i>
                </div>
              </div>
              }
              @if (detailsRequest()!.request_type === 'delete' && !detailsRequest()!.proposed_schedule) {
              <div class="flex items-center gap-2 rounded-lg border-2 border-dashed border-red-500/40 bg-red-500/10 p-2.5">
                <i class="pi pi-trash text-red-400 text-sm"></i>
                <span class="text-sm text-red-300 font-medium">Se eliminará el horario asignado</span>
              </div>
              }
            </div>
          </div>
        </div>

        <!-- Motivo -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <i class="pi pi-comment text-amber-400 text-xs"></i> Motivo
          </h3>
          <p class="text-sm text-gray-300 whitespace-pre-wrap m-0">{{ detailsRequest()!.reason }}</p>
        </div>

        <!-- Info del solicitante -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-info-circle text-amber-400 text-xs"></i> Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <p-tag [value]="getStatusLabel(detailsRequest()!.status)"
                [severity]="getStatusSeverity(detailsRequest()!.status)" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Solicitado por</label>
              <p class="text-white text-sm m-0">
                {{ detailsRequest()!.requester?.first_name }} {{ detailsRequest()!.requester?.father_name }}
              </p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Fecha de Solicitud</label>
              <p class="text-white text-sm m-0">{{ formatDateTime(detailsRequest()!.created_at) }}</p>
            </div>
            @if (detailsRequest()!.reviewer) {
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Revisado por</label>
              <p class="text-white text-sm m-0">
                {{ detailsRequest()!.reviewer!.first_name }} {{ detailsRequest()!.reviewer!.father_name }}
              </p>
            </div>
            }
            @if (detailsRequest()!.review_notes) {
            <div class="col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">Notas de Revisión</label>
              <p class="text-white text-sm m-0">{{ detailsRequest()!.review_notes }}</p>
            </div>
            }
          </div>
        </div>

        <!-- Horarios de la sucursal (tabla estilo timetable) -->
        @if (showBranchSchedules()) {
        <div class="rounded-lg border border-cyan-500/20 overflow-hidden bg-gradient-to-b from-cyan-500/5 to-transparent">
          <div class="px-4 py-2.5 border-b border-cyan-500/15 flex items-center gap-2">
            <i class="pi pi-building text-cyan-400 text-xs"></i>
            <span class="text-sm font-semibold text-cyan-300">
              Horarios en {{ detailsRequest()!.branch?.name }} — {{ formatDate(detailsRequest()!.schedule_date) }}
            </span>
          </div>
          @if (loadingBranchSchedules()) {
          <div class="flex items-center justify-center py-6">
            <i class="pi pi-spin pi-spinner text-cyan-400"></i>
          </div>
          } @else if (branchSchedules().length === 0) {
          <p class="text-xs text-gray-500 m-0 px-4 py-4">No hay horarios asignados en esta sucursal para este día.</p>
          } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-white/10">
                  <th class="text-left text-gray-500 font-medium py-2 px-4 w-1/4 whitespace-nowrap">Cargo</th>
                  <th class="text-left text-gray-500 font-medium py-2 px-2">Nombre</th>
                  <th class="text-center text-gray-300 font-semibold py-2 px-4 whitespace-nowrap">
                    {{ formatDate(detailsRequest()!.schedule_date) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (bs of branchSchedules(); track bs.employee_id) {
                <tr class="border-b border-white/5 transition-colors"
                    [ngClass]="{ 'bg-amber-500/10': bs.employee_id === detailsRequest()!.employee_id }">
                  <td class="py-2 px-4 text-gray-400 truncate max-w-[110px]">{{ bs.position || '—' }}</td>
                  <td class="py-2 px-2 truncate max-w-[150px]"
                      [ngClass]="{ 'text-amber-200 font-semibold': bs.employee_id === detailsRequest()!.employee_id, 'text-gray-200': bs.employee_id !== detailsRequest()!.employee_id }">
                    {{ bs.employee_name }}
                  </td>
                  <td class="py-2 px-4 text-center">
                    @if (bs.schedule) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap"
                          [class]="getScheduleBarClass(bs.schedule.color)">
                      {{ bs.schedule.name }}
                    </span>
                    } @else {
                    <span class="text-gray-600 text-[11px]">Sin horario</span>
                    }
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
          }
        </div>
        }

      </div>
      }
      <ng-template pTemplate="footer">
        @if (detailsRequest()?.status === 'pending') {
        <div class="flex items-center gap-3">
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] active:scale-[0.98]"
            [class.opacity-60]="processingId() === detailsRequest()!.id"
            [class.pointer-events-none]="processingId() === detailsRequest()!.id"
            (click)="approve(detailsRequest()!)"
          >
            @if (processingId() === detailsRequest()!.id) {
              <i class="pi pi-spin pi-spinner text-xs"></i>
            } @else {
              <i class="pi pi-check-circle text-xs"></i>
            }
            Aprobar solicitud
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-neutral-800 text-red-400 border border-neutral-600 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 active:scale-[0.98]"
            [class.opacity-60]="processingId() === detailsRequest()!.id"
            [class.pointer-events-none]="processingId() === detailsRequest()!.id"
            (click)="showDetailsDialog = false; openRejectDialog(detailsRequest()!)"
          >
            <i class="pi pi-times-circle text-xs"></i>
            Rechazar
          </button>
        </div>
        }
      </ng-template>
    </p-dialog>

    <!-- Diálogo de rechazo -->
    <p-dialog [(visible)]="showRejectDialog" [modal]="true" header="Rechazar Solicitud"
      [style]="{ width: '400px' }" [draggable]="false" [resizable]="false">
      <div class="space-y-3 py-2">
        <p class="text-sm text-gray-300 m-0">
          ¿Deseas añadir un comentario al rechazar esta solicitud?
        </p>
        <textarea pTextarea [(ngModel)]="rejectNotes" placeholder="Motivo del rechazo (opcional)..."
          rows="3" class="w-full text-sm"></textarea>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" icon="pi pi-times" [outlined]="true" severity="secondary"
          (onClick)="showRejectDialog = false" />
        <p-button label="Confirmar Rechazo" icon="pi pi-check" severity="danger"
          [loading]="processingId() !== null" (onClick)="confirmReject()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ScheduleChangesTabComponent {
  private changeRequestService = inject(ScheduleChangeRequestService);
  private messageService = inject(MessageService);
  private store = inject(DashboardStore);
  private deviceService = inject(DeviceService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);

  public isMobile = this.deviceService.isMobile;

  // Data
  public allRequests = signal<ScheduleChangeRequest[]>([]);
  public loading = signal(false);
  public processingId = signal<string | null>(null);

  // Filters
  public showFilters = signal(false);
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public selectedType = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Details dialog
  public showDetailsDialog = false;
  public detailsRequest = signal<ScheduleChangeRequest | null>(null);

  public employeeStats = computed(() => {
    const req = this.detailsRequest();
    if (!req?.employee_id) return { total: 0, approved: 0, rejected: 0 };
    const empRequests = this.allRequests().filter(r => r.employee_id === req.employee_id);
    return {
      total: empRequests.length,
      approved: empRequests.filter(r => r.status === 'approved').length,
      rejected: empRequests.filter(r => r.status === 'rejected').length,
    };
  });

  // Rejection dialog
  public showRejectDialog = false;
  public rejectNotes = '';
  private rejectTarget: ScheduleChangeRequest | null = null;

  // Branch schedules panel
  public showBranchSchedules = signal(true);
  public loadingBranchSchedules = signal(false);
  public branchSchedules = signal<{ employee_id: string; employee_name: string; position: string | null; schedule: { name: string; color: string } | null }[]>([]);

  // Branch metrics toggle
  public showBranchMetrics = signal(false);

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  public typeOptions = [
    { label: 'Crear', value: 'create' },
    { label: 'Modificar', value: 'update' },
    { label: 'Eliminar', value: 'delete' },
  ];

  // Stats (always from unfiltered)
  public totalCount = computed(() => this.allRequests().length);
  public pendingCount = computed(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.allRequests().filter(r => r.status === 'pending' && new Date(r.schedule_date) >= today).length;
  });
  public approvedCount = computed(() => this.allRequests().filter(r => r.status === 'approved').length);
  public rejectedCount = computed(() => this.allRequests().filter(r => r.status === 'rejected').length);

  // Branch metrics
  public selectedMetricMonth = signal<Date>(new Date());
  public branchMetrics = computed(() => {
    const month = this.selectedMetricMonth();
    const y = month.getFullYear();
    const m = month.getMonth();
    const requests = this.allRequests().filter(r => {
      const d = new Date(r.created_at);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const map = new Map<string, { total: number; pending: number; approved: number }>();
    for (const r of requests) {
      const name = r.branch?.name ?? 'Sin tienda';
      const entry = map.get(name) ?? { total: 0, pending: 0, approved: 0 };
      entry.total++;
      if (r.status === 'pending') entry.pending++;
      if (r.status === 'approved') entry.approved++;
      map.set(name, entry);
    }
    return Array.from(map.entries())
      .map(([branchName, stats]) => ({ branchName, ...stats }))
      .sort((a, b) => b.total - a.total);
  });

  // Filtered data
  public filteredRequests = computed(() => {
    let items = this.allRequests();
    const search = (this.searchText() as unknown as string).toLowerCase?.() ?? '';
    if (search) {
      items = items.filter(r => {
        const name = `${r.employee?.first_name || ''} ${r.employee?.father_name || ''}`.toLowerCase();
        const reason = r.reason?.toLowerCase() || '';
        const branch = r.branch?.name?.toLowerCase() || '';
        return name.includes(search) || reason.includes(search) || branch.includes(search);
      });
    }
    const status = this.selectedStatus() as unknown as string | null;
    if (status) items = items.filter(r => r.status === status);
    const type = this.selectedType() as unknown as string | null;
    if (type) items = items.filter(r => r.request_type === type);
    const range = this.dateRange() as unknown as Date[] | null;
    if (range && range[0]) {
      const from = range[0].getTime();
      const to = range[1]?.getTime() ?? Infinity;
      items = items.filter(r => {
        const d = new Date(r.schedule_date).getTime();
        return d >= from && d <= to;
      });
    }
    return items;
  });

  constructor() {
    this.loadRequests();
  }

  public loadRequests(): void {
    this.loading.set(true);
    this.changeRequestService.getRequests().subscribe({
      next: (data) => {
        this.allRequests.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.allRequests.set([]);
        this.loading.set(false);
      },
    });
  }

  public hasActiveFilters(): boolean {
    return !!(
      (this.searchText() as unknown as string) ||
      this.selectedStatus() ||
      this.selectedType() ||
      this.dateRange()
    );
  }

  public activeFiltersCount(): number {
    let count = 0;
    if (this.searchText() as unknown as string) count++;
    if (this.selectedStatus()) count++;
    if (this.selectedType()) count++;
    if (this.dateRange()) count++;
    return count;
  }

  public clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.selectedType.set(null);
    this.dateRange.set(null);
  }

  public openDetails(req: ScheduleChangeRequest): void {
    this.detailsRequest.set(req);
    this.showBranchSchedules.set(true);
    this.branchSchedules.set([]);
    this.showDetailsDialog = true;
    this.loadBranchSchedules(req);
  }

  public toggleBranchSchedules(): void {
    const newValue = !this.showBranchSchedules();
    this.showBranchSchedules.set(newValue);
    if (newValue && this.branchSchedules().length === 0) {
      const req = this.detailsRequest();
      if (req) this.loadBranchSchedules(req);
    }
  }

  private loadBranchSchedules(req: ScheduleChangeRequest): void {
    if (!req?.branch_id || !req.schedule_date) return;
    this.loadingBranchSchedules.set(true);
    const companyId = this.org.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      select: 'id,employee_id,branch_id,schedule:schedules(id,name,color),employee:employees!employee_schedule_employee_id_fkey(id,first_name,father_name,position:positions(name))',
      branch_id: `eq.${req.branch_id}`,
      start_date: `lte.${req.schedule_date}`,
      end_date: `gte.${req.schedule_date}`,
      ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
      order: 'employee_id.asc',
    });

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.branchSchedules.set(
          data
            .filter((d: any) => d.employee)
            .map((d: any) => ({
              employee_id: d.employee_id,
              employee_name: `${d.employee.first_name} ${d.employee.father_name}`,
              position: d.employee.position?.name || null,
              schedule: d.schedule || null,
            }))
        );
        this.loadingBranchSchedules.set(false);
      },
      error: () => {
        this.branchSchedules.set([]);
        this.loadingBranchSchedules.set(false);
      },
    });
  }

  public approve(req: ScheduleChangeRequest): void {
    const reviewerId = this.store.currentEmployee()?.id;
    if (!reviewerId) return;
    this.processingId.set(req.id);
    this.changeRequestService.approveRequest(req.id, reviewerId).pipe(
      switchMap(() =>
        this.changeRequestService.applyScheduleChange(req, reviewerId).pipe(
          catchError(() => {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Solicitud aprobada pero no se pudo aplicar el cambio automáticamente.',
            });
            return of(null);
          })
        )
      )
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Aprobada', detail: 'Solicitud aprobada y cambio aplicado.' });
        this.processingId.set(null);
        this.showDetailsDialog = false;
        this.loadRequests();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo aprobar la solicitud.' });
        this.processingId.set(null);
      },
    });
  }

  public openRejectDialog(req: ScheduleChangeRequest): void {
    this.rejectTarget = req;
    this.rejectNotes = '';
    this.showRejectDialog = true;
  }

  public confirmReject(): void {
    const req = this.rejectTarget;
    const reviewerId = this.store.currentEmployee()?.id;
    if (!req || !reviewerId) return;
    this.processingId.set(req.id);
    this.changeRequestService.rejectRequest(req.id, reviewerId, this.rejectNotes).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Rechazada', detail: 'Solicitud rechazada.' });
        this.showRejectDialog = false;
        this.processingId.set(null);
        this.rejectTarget = null;
        this.loadRequests();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo rechazar la solicitud.' });
        this.processingId.set(null);
      },
    });
  }

  public getTypeLabel(type: string): string {
    return type === 'create' ? 'Crear' : type === 'update' ? 'Modificar' : 'Eliminar';
  }

  public getTypeSeverity(type: string): 'success' | 'warn' | 'danger' {
    return type === 'create' ? 'success' : type === 'update' ? 'warn' : 'danger';
  }

  public getStatusLabel(status: string): string {
    return status === 'pending' ? 'Pendiente' : status === 'approved' ? 'Aprobada' : 'Rechazada';
  }

  public getStatusSeverity(status: string): 'warn' | 'success' | 'danger' {
    return status === 'pending' ? 'warn' : status === 'approved' ? 'success' : 'danger';
  }

  public formatDate(d: string): string {
    try {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch { return d; }
  }

  public getScheduleBarClass(color: string | undefined): string {
    if (!color) return 'bg-neutral-700 text-gray-300';
    return colorVariants[color] || 'bg-neutral-700 text-gray-300';
  }

  public formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
  }

  public formatDateTime(d: string): string {
    try {
      const dt = new Date(d);
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      const hours = String(dt.getHours()).padStart(2, '0');
      const mins = String(dt.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch { return d; }
  }
}
