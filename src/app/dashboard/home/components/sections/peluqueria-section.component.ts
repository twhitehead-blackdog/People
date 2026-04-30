import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { HomeDataService, OdooSaleOrder } from '../../services/home-data.service';
import { BranchesStore } from '../../../../stores/branches.store';
import { PELUQUERIA_POSITION_NAMES } from '../../../services/groomer-schedule-utils.service';
import { HttpClient } from '@angular/common/http';
import { LateRecordsService } from '../../../services/late-records.service';
import { LoggerService } from '../../../../services/logger.service';
import { DeviceService } from '../../../../services/device.service';
import { ApiUrlService } from '../../../../services/api-url.service';
import { toZonedTime } from 'date-fns-tz';
import { format, parseISO, differenceInMinutes, set } from 'date-fns';

const TZ = 'America/Panama';

// Alerta por posición específica: si hay más de este número con esta posición en la misma tienda
const ALERT_POSITION_ID = '8fae41e2-6054-48c6-91f9-7388a87d6245';
const ALERT_POSITION_THRESHOLD = 2; // más de 2 (es decir 3 o más) = alerta

// Sucursales que no se muestran en la vista Peluquería
const BRANCHES_EXCLUDED_FROM_PELUQUERIA = ['Oficina Central', 'Bodega Dos Caminos'];

// IDs de horarios que no cuentan para tardanza (feriado, día libre)
const SCHEDULE_ID_FERIADO = '3d07f626-d58f-4203-bac5-f6e35557e0ad';
const SCHEDULE_ID_DIA_LIBRE = 'c01dff8f-ce0d-498f-a473-46418576e589';

type TimelogWithBranch = {
  id: string;
  employee_id: string;
  branch_id: string;
  created_at?: string;
  punched_at?: string | null;
  branch?: { id: string; name: string; short_name?: string };
  employee?: {
    id: string;
    first_name?: string;
    father_name?: string;
    position?: { id?: string; name?: string };
  };
};

type TimelogExitRaw = {
  employee_id: string;
  branch_id: string;
  created_at?: string;
  punched_at?: string | null;
};

export type PersonPeluqueria = {
  employeeId: string;
  name: string;
  position?: string;
  positionId?: string;
  entryTime?: string;
  exitTime?: string;
  isLate?: boolean;
  minutesLate?: number;
  scheduledEntryTime?: string; // Hora programada de entrada (HH:mm:ss)
  toleranceMinutes?: number; // Minutos de tolerancia aplicados
  branchId?: string; // ID de la sucursal
  branchName?: string; // Nombre de la sucursal
  timelogId?: string; // ID del timelog de entrada
};

export type BranchPeluqueriaRow = {
  branchId: string;
  branchName: string;
  shortName: string;
  count: number;
  /** Mascotas de peluquería en esta sucursal (del Odoo) */
  petCount: number;
  /** Contador por nombre de posición en esta tienda */
  positionCounts: Record<string, number>;
  /** Lista agrupada por posición (para mostrar por secciones) */
  peopleByPosition: { positionName: string; positionId?: string; people: PersonPeluqueria[] }[];
  /** true si hay más de ALERT_POSITION_THRESHOLD con la posición específica (id 8fae41e2-...) en esta tienda */
  alertOverflow: boolean;
  /** Cantidad de la posición alerta en esta tienda (para el mensaje) */
  alertPositionCount: number;
  people: PersonPeluqueria[];
};

@Component({
  selector: 'pt-peluqueria-section',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ========== DESKTOP ========== -->
    @if (device.isDesktop()) {
    <div class="peluqueria-section">
      <div class="section-header">
        <div class="section-title-row">
          <h2 class="section-title">
            <i class="pi pi-building"></i>
            Peluquería por sucursal
          </h2>
          <div class="date-filter">
            <label class="date-filter-label">Ver fecha:</label>
            <p-datepicker
              [ngModel]="homeData.peluqueriaViewDate()"
              (ngModelChange)="onViewDateChange($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [maxDate]="maxDate()"
              styleClass="peluqueria-date-picker"
              inputStyleClass="peluqueria-date-input"
            ></p-datepicker>
          </div>
        </div>
        <p class="section-subtitle">
          Cantidad de peluqueros en cada tienda (quien marcó entrada en la fecha seleccionada)
        </p>
        <p class="section-date">{{ dateLabel() }}</p>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <i class="pi pi-users stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">{{ totalPeopleCount() }}</span>
            <span class="stat-label">Peluqueros</span>
          </div>
        </div>
        <div class="stat-item stat-pets">
          <i class="pi pi-heart stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">{{ totalPetsCount() }}</span>
            <span class="stat-label">Mascotas</span>
          </div>
        </div>
        <div class="stat-item">
          <i class="pi pi-building stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">{{ branchRows().length }}</span>
            <span class="stat-label">Sucursales</span>
          </div>
        </div>
        <div class="stat-item stat-update">
          <i class="pi pi-refresh stat-icon"></i>
          <div class="stat-content">
            <span class="stat-value">{{ lastUpdateTime() }}</span>
            <span class="stat-label">Actualizado</span>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando...</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
        </div>
      } @else if (branchRows().length === 0) {
        <div class="empty-state">
          <i class="pi pi-inbox"></i>
          <span>No hay sucursales activas</span>
        </div>
      } @else {
        <div class="branch-grid">
          @for (row of branchRows(); track row.branchId) {
            <div class="branch-card" [class.branch-card-alert]="row.alertOverflow">
              @if (row.alertOverflow) {
                <div class="overflow-alert" [pTooltip]="'Más de ' + ALERT_POSITION_THRESHOLD + ' con esta posición en la misma tienda'" tooltipPosition="top">
                  <i class="pi pi-exclamation-triangle"></i>
                  Alerta: más de {{ ALERT_POSITION_THRESHOLD }} con esta posición en tienda ({{ row.alertPositionCount }})
                </div>
              }
              <div class="branch-card-header">
                <span class="branch-name">{{ row.branchName }}</span>
                <div class="branch-badges">
                  <span class="branch-count-badge">{{ row.count }} en tienda</span>
                  @if (row.petCount > 0) {
                  <span class="branch-pet-badge">
                    <i class="pi pi-heart"></i> {{ row.petCount }} mascota{{ row.petCount !== 1 ? 's' : '' }}
                  </span>
                  }
                </div>
              </div>
              @if (getPositionCountEntries(row.positionCounts).length > 0) {
                <div class="position-counts">
                  @for (pos of getPositionCountEntries(row.positionCounts); track pos[0]) {
                    <span class="position-badge">{{ pos[0] }}: {{ pos[1] }}</span>
                  }
                </div>
              }
              @if (row.peopleByPosition.length === 0) {
                <p class="no-marcados">Ningún peluquero ha marcado entrada aún</p>
              } @else {
                @for (group of row.peopleByPosition; track group.positionName) {
                  <div class="position-group">
                    <h4 class="position-group-title">{{ group.positionName }} ({{ group.people.length }})</h4>
                    <ul class="people-list">
                      @for (p of group.people; track p.employeeId) {
                        <li class="person-row" [class.person-late]="p.isLate">
                          <div class="person-info">
                            <span class="person-name">{{ p.name }}</span>
                            @if (p.isLate && p.minutesLate != null) {
                              <span class="late-badge" [pTooltip]="'Llegó ' + p.minutesLate + ' min después del horario'" tooltipPosition="top">
                                <i class="pi pi-clock"></i> Tarde (+{{ p.minutesLate }} min)
                              </span>
                            }
                            <div class="day-record">
                              <span class="record-entry">Entrada: {{ p.entryTime ?? '—' }}</span>
                              <span class="record-exit">Salida: {{ p.exitTime ?? 'Sin salida' }}</span>
                            </div>
                          </div>
                          @if (p.entryTime) {
                            <span class="entry-time" [pTooltip]="'Marcó entrada a las ' + p.entryTime" tooltipPosition="left">
                              @if (p.isLate) {
                                <i class="pi pi-exclamation-triangle status-late"></i>
                              } @else {
                                <i class="pi pi-check-circle status-ok"></i>
                              }
                              {{ p.entryTime }}
                            </span>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              }
            </div>
          }
        </div>
      }

      <!-- Órdenes de venta Odoo (peluquería) para la fecha seleccionada -->
      <div class="odoo-orders-section">
        <h3 class="odoo-orders-title">
          <i class="pi pi-shopping-cart"></i>
          Órdenes de venta (Odoo) – Peluquería
        </h3>
        @if (odooOrdersLoading()) {
          <p class="odoo-orders-loading"><i class="pi pi-spin pi-spinner"></i> Cargando órdenes...</p>
        } @else if (odooOrdersError()) {
          <p class="odoo-orders-error">{{ odooOrdersError() }}</p>
        } @else if (odooOrders().length === 0) {
          <p class="odoo-orders-empty">No hay órdenes de peluquería para esta fecha.</p>
        } @else {
          @for (group of ordersGroupedByWarehouse(); track group.warehouseName) {
            <div class="odoo-group">
              <div class="odoo-group-header" (click)="toggleOrderGroup(group.warehouseName)">
                <i class="pi" [class.pi-chevron-right]="!expandedOrderGroups().has(group.warehouseName)"
                   [class.pi-chevron-down]="expandedOrderGroups().has(group.warehouseName)"></i>
                <span class="odoo-group-name">{{ group.warehouseName }}</span>
                <span class="odoo-group-count">({{ group.orders.length }})</span>
              </div>
              @if (expandedOrderGroups().has(group.warehouseName)) {
                <div class="odoo-orders-grid">
                  @for (order of group.orders; track order.id) {
                    <div class="odoo-order-card">
                      <span class="odoo-order-name">{{ order.name }}</span>
                      <span class="odoo-order-date">{{ formatOdooDate(order.date_order) }}</span>
                      @if (order.nombres_mascotas) {
                        <span class="odoo-order-mascotas">{{ order.nombres_mascotas }}</span>
                      }
                      <span class="odoo-order-stats">
                        Peluquería: {{ order.count_peluqueria ?? 0 }}
                        @if ((order.count_bano_y_corte ?? 0) + (order.count_solo_bano ?? 0) > 0) {
                          · Baño: {{ (order.count_solo_bano ?? 0) + (order.count_bano_y_corte ?? 0) }}
                          · Corte: {{ order.count_cortes ?? 0 }}
                        }
                      </span>
                      <span class="odoo-order-state state-{{ order.state }}">{{ order.state }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
    }

    <!-- ========== MOBILE ========== -->
    @if (!device.isDesktop()) {
    <div class="px-4 py-4">
      <!-- Header -->
      <div class="mb-4">
        <h2 class="text-lg font-bold text-amber-400 flex items-center gap-2 mb-1">
          <i class="pi pi-building text-base"></i>
          Peluquería
        </h2>
        <p class="text-xs text-gray-400 mb-2">Peluqueros por tienda</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-400">Fecha:</span>
          <p-datepicker
            [ngModel]="homeData.peluqueriaViewDate()"
            (ngModelChange)="onViewDateChange($event)"
            [showIcon]="true"
            dateFormat="dd/mm/yy"
            [maxDate]="maxDate()"
            styleClass="peluqueria-date-picker"
            inputStyleClass="peluqueria-date-input"
          ></p-datepicker>
        </div>
        <p class="text-xs text-gray-500">{{ dateLabel() }}</p>
      </div>

      @if (loading()) {
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30 flex items-center gap-2 text-gray-400 text-sm">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando...</span>
        </div>
      } @else if (error()) {
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-red-700/30 flex items-center gap-2 text-red-400 text-sm">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
        </div>
      } @else if (branchRows().length === 0) {
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30 text-center text-gray-400 text-sm py-6">
          <i class="pi pi-inbox text-2xl mb-2 block opacity-60"></i>
          <span>No hay sucursales activas</span>
        </div>
      } @else {
        <!-- Summary stats -->
        <div class="grid grid-cols-2 gap-2.5 mb-4">
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
            <span class="text-xs text-gray-400 block">Peluqueros</span>
            <span class="text-sm text-white font-semibold">{{ totalPeopleCount() }}</span>
          </div>
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-amber-500/20">
            <div class="flex items-center gap-1.5">
              <i class="pi pi-heart text-amber-400 text-xs"></i>
              <span class="text-xs text-amber-400 block">Mascotas</span>
            </div>
            <span class="text-sm text-white font-semibold">{{ totalPetsCount() }}</span>
          </div>
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
            <span class="text-xs text-gray-400 block">Sucursales</span>
            <span class="text-sm text-white font-semibold">{{ branchRows().length }}</span>
          </div>
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
            <div class="flex items-center gap-1.5">
              <i class="pi pi-refresh text-gray-500 text-xs"></i>
              <span class="text-xs text-gray-400 block">Actualizado</span>
            </div>
            <span class="text-sm text-white font-semibold">{{ lastUpdateTime() }}</span>
          </div>
        </div>

        <!-- Branch cards -->
        <div class="space-y-3">
          @for (row of branchRows(); track row.branchId) {
            <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30"
                 [class.border-red-700\/40]="row.alertOverflow">
              @if (row.alertOverflow) {
                <div class="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 rounded-lg px-2 py-1.5 mb-2">
                  <i class="pi pi-exclamation-triangle text-xs"></i>
                  <span>Alerta: {{ row.alertPositionCount }} con misma posicion</span>
                </div>
              }
              <div class="flex justify-between items-center mb-1">
                <span class="text-sm text-white font-semibold">{{ row.branchName }}</span>
                <span class="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg">{{ row.count }}</span>
              </div>
              @if (row.petCount > 0) {
              <div class="flex items-center gap-1 mb-2">
                <i class="pi pi-heart text-amber-400" style="font-size: 0.625rem;"></i>
                <span class="text-xs text-amber-300">{{ row.petCount }} mascota{{ row.petCount !== 1 ? 's' : '' }}</span>
              </div>
              }
              @if (getPositionCountEntries(row.positionCounts).length > 0) {
                <div class="flex flex-wrap gap-1.5 mb-2">
                  @for (pos of getPositionCountEntries(row.positionCounts); track pos[0]) {
                    <span class="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">{{ pos[0] }}: {{ pos[1] }}</span>
                  }
                </div>
              }
              @if (row.peopleByPosition.length === 0) {
                <p class="text-xs text-gray-500 italic">Sin marcadas aún</p>
              } @else {
                @for (group of row.peopleByPosition; track group.positionName) {
                  <div class="mb-2 last:mb-0">
                    <p class="text-xs text-gray-400 font-semibold border-b border-white/5 pb-1 mb-1">{{ group.positionName }} ({{ group.people.length }})</p>
                    @for (p of group.people; track p.employeeId) {
                      <div class="py-1.5 flex justify-between items-start"
                           [class.bg-amber-400\/5]="p.isLate"
                           [class.rounded-lg]="p.isLate"
                           [class.px-1.5]="p.isLate">
                        <div class="min-w-0 flex-1">
                          <span class="text-xs text-gray-300 block truncate">{{ p.name }}</span>
                          @if (p.isLate && p.minutesLate != null) {
                            <span class="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                              <i class="pi pi-clock text-xs"></i> +{{ p.minutesLate }} min
                            </span>
                          }
                          <div class="flex gap-2 mt-0.5">
                            <span class="text-xs text-green-400">{{ p.entryTime ?? '—' }}</span>
                            <span class="text-xs text-gray-500">{{ p.exitTime ?? 'Sin salida' }}</span>
                          </div>
                        </div>
                        @if (p.entryTime) {
                          <div class="flex-shrink-0 ml-2">
                            @if (p.isLate) {
                              <i class="pi pi-exclamation-triangle text-xs text-amber-400"></i>
                            } @else {
                              <i class="pi pi-check-circle text-xs text-green-400"></i>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }
        </div>
      }

      <!-- Odoo Orders -->
      <div class="mt-4 pt-3 border-t border-white/10">
        <h3 class="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <i class="pi pi-shopping-cart text-xs text-amber-400"></i>
          Ordenes Odoo - Peluquería
        </h3>
        @if (odooOrdersLoading()) {
          <p class="text-xs text-gray-400"><i class="pi pi-spin pi-spinner"></i> Cargando...</p>
        } @else if (odooOrdersError()) {
          <p class="text-xs text-red-400">{{ odooOrdersError() }}</p>
        } @else if (odooOrders().length === 0) {
          <p class="text-xs text-gray-500">Sin órdenes para esta fecha.</p>
        } @else {
          <div class="space-y-3">
            @for (group of ordersGroupedByWarehouse(); track group.warehouseName) {
              <div>
                <div class="flex items-center gap-2 py-1.5 cursor-pointer select-none"
                     (click)="toggleOrderGroup(group.warehouseName)">
                  <i class="pi text-xs text-amber-400"
                     [class.pi-chevron-right]="!expandedOrderGroups().has(group.warehouseName)"
                     [class.pi-chevron-down]="expandedOrderGroups().has(group.warehouseName)"></i>
                  <span class="text-sm font-semibold text-white">{{ group.warehouseName }}</span>
                  <span class="text-xs text-gray-400">({{ group.orders.length }})</span>
                </div>
                @if (expandedOrderGroups().has(group.warehouseName)) {
                  <div class="space-y-2 pl-4">
                    @for (order of group.orders; track order.id) {
                      <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
                        <div class="flex justify-between items-start mb-1">
                          <span class="text-sm text-white font-semibold">{{ order.name }}</span>
                          <span class="text-xs px-1.5 py-0.5 rounded"
                                [class.text-green-400]="order.state === 'sale'"
                                [class.bg-green-400\/10]="order.state === 'sale'"
                                [class.text-amber-400]="order.state === 'draft'"
                                [class.bg-amber-400\/10]="order.state === 'draft'"
                                [class.text-blue-400]="order.state === 'done'"
                                [class.bg-blue-400\/10]="order.state === 'done'"
                                [class.text-gray-400]="order.state === 'cancel'"
                                [class.bg-gray-400\/10]="order.state === 'cancel'">
                            {{ order.state }}
                          </span>
                        </div>
                        <span class="text-xs text-gray-400 block">{{ formatOdooDate(order.date_order) }}</span>
                        @if (order.nombres_mascotas) {
                          <span class="text-xs text-gray-400 block mt-0.5">{{ order.nombres_mascotas }}</span>
                        }
                        <span class="text-xs text-gray-500 block mt-1">
                          Pel: {{ order.count_peluqueria ?? 0 }}
                          @if ((order.count_bano_y_corte ?? 0) + (order.count_solo_bano ?? 0) > 0) {
                            · Baño: {{ (order.count_solo_bano ?? 0) + (order.count_bano_y_corte ?? 0) }}
                            · Corte: {{ order.count_cortes ?? 0 }}
                          }
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
    }
  `,
  styles: [
    `
      .peluqueria-section {
        padding: 1.5rem;
        max-width: 1400px;
        margin: 0 auto;
      }
      .section-header {
        margin-bottom: 1.5rem;
      }
      .section-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.25rem;
      }
      .section-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
      }
      .section-title i {
        font-size: 1.25rem;
      }
      .date-filter {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .date-filter-label {
        font-size: 0.875rem;
        color: #a1a1aa;
      }
      :host ::ng-deep .peluqueria-date-picker .p-inputtext {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: #e4e4e7;
      }
      :host ::ng-deep .peluqueria-date-picker .p-datepicker-trigger {
        background: rgba(251, 191, 36, 0.15);
        border-color: rgba(251, 191, 36, 0.3);
        color: #fbbf24;
      }
      .section-subtitle {
        color: #a1a1aa;
        font-size: 0.9rem;
        margin: 0 0 0.5rem 0;
      }
      .section-date {
        color: #71717a;
        font-size: 0.85rem;
        margin: 0;
      }
      .stats-bar {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }
      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 0.875rem 1.25rem;
        flex: 1;
        min-width: 140px;
      }
      .stat-item.stat-pets {
        border-color: rgba(251, 191, 36, 0.2);
        background: rgba(251, 191, 36, 0.05);
      }
      .stat-icon {
        font-size: 1.25rem;
        color: #71717a;
      }
      .stat-pets .stat-icon {
        color: #fbbf24;
      }
      .stat-content {
        display: flex;
        flex-direction: column;
      }
      .stat-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #e4e4e7;
        line-height: 1.2;
      }
      .stat-pets .stat-value {
        color: #fbbf24;
      }
      .stat-label {
        font-size: 0.75rem;
        color: #71717a;
      }
      .stat-update .stat-value {
        font-size: 0.875rem;
        font-weight: 500;
      }

      .loading-state,
      .error-state,
      .empty-state {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 2rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        color: #a1a1aa;
      }
      .error-state {
        color: #f87171;
      }
      .empty-state i {
        font-size: 2rem;
        opacity: 0.6;
      }
      .branch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }
      .branch-card {
        background: linear-gradient(135deg, rgba(24, 24, 27, 0.9) 0%, rgba(15, 15, 16, 0.95) 100%);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 1rem;
        transition: border-color 0.2s;
      }
      .branch-card:hover {
        border-color: rgba(251, 191, 36, 0.2);
      }
      .branch-card.branch-card-alert {
        border-color: rgba(239, 68, 68, 0.4);
        box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
      }
      .overflow-alert {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #f87171;
        background: rgba(239, 68, 68, 0.12);
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        margin-bottom: 0.75rem;
      }
      .overflow-alert i {
        font-size: 1rem;
      }
      .branch-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .branch-name {
        font-weight: 600;
        color: #e4e4e7;
      }
      .branch-badges {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .branch-count-badge {
        font-size: 0.85rem;
        font-weight: 600;
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
      }
      .branch-pet-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: #fcd34d;
        background: rgba(251, 191, 36, 0.08);
        border: 1px solid rgba(251, 191, 36, 0.15);
        padding: 0.2rem 0.5rem;
        border-radius: 6px;
      }
      .branch-pet-badge i {
        font-size: 0.625rem;
      }
      .no-marcados {
        font-size: 0.85rem;
        color: #71717a;
        margin: 0;
        font-style: italic;
      }
      .position-group {
        margin-bottom: 1rem;
      }
      .position-group:last-child {
        margin-bottom: 0;
      }
      .position-group-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #a1a1aa;
        margin: 0 0 0.35rem 0;
        padding-bottom: 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .people-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .person-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0;
        border-radius: 8px;
        padding-left: 0.25rem;
      }
      .person-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }
      .person-name {
        color: #d4d4d8;
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .person-position {
        font-size: 0.75rem;
        color: #71717a;
      }
      .day-record {
        display: flex;
        gap: 1rem;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        color: #71717a;
      }
      .record-entry {
        color: #4ade80;
      }
      .record-exit {
        color: #a1a1aa;
      }
      .position-counts {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-bottom: 0.75rem;
      }
      .position-badge {
        font-size: 0.75rem;
        color: #a1a1aa;
        background: rgba(255, 255, 255, 0.06);
        padding: 0.2rem 0.45rem;
        border-radius: 6px;
      }
      .late-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: #fbbf24;
        margin-top: 0.15rem;
      }
      .person-row.person-late {
        background: rgba(251, 191, 36, 0.06);
        border-radius: 8px;
        margin: 0 -0.25rem;
        padding-left: 0.5rem;
      }
      .status-late {
        color: #fbbf24;
      }
      .entry-time {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8rem;
        color: #4ade80;
      }
      .status-ok {
        color: #4ade80;
      }
      .odoo-orders-section {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .odoo-orders-title {
        font-size: 1.1rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .odoo-orders-loading,
      .odoo-orders-error,
      .odoo-orders-empty {
        color: var(--text-color-secondary);
        font-size: 0.9rem;
      }
      .odoo-orders-error {
        color: #f87171;
      }
      .odoo-group {
        margin-bottom: 0.75rem;
      }
      .odoo-group-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.25rem;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 0.5rem;
      }
      .odoo-group-header:hover {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 6px;
      }
      .odoo-group-header .pi {
        font-size: 0.75rem;
        color: #fbbf24;
        transition: transform 0.2s;
      }
      .odoo-group-name {
        font-weight: 600;
        font-size: 0.95rem;
      }
      .odoo-group-count {
        font-size: 0.8rem;
        color: var(--text-color-secondary);
      }
      .odoo-orders-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 0.75rem;
        padding-left: 1.25rem;
      }
      .odoo-order-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
      }
      .odoo-order-name {
        font-weight: 600;
      }
      .odoo-order-date,
      .odoo-order-mascotas {
        color: var(--text-color-secondary);
      }
      .odoo-order-stats {
        font-size: 0.8rem;
        color: var(--text-color-secondary);
      }
      .odoo-order-state {
        font-size: 0.75rem;
        text-transform: uppercase;
        margin-top: 0.25rem;
      }
      .odoo-order-state.state-sale {
        color: #4ade80;
      }
      .odoo-order-state.state-draft {
        color: #fbbf24;
      }
      .odoo-order-state.state-done {
        color: #60a5fa;
      }
      .odoo-order-state.state-cancel {
        color: #9ca3af;
      }
    `,
  ],
})
export class PeluqueriaSectionComponent {
  homeData = inject(HomeDataService);
  protected device = inject(DeviceService);
  private branchesStore = inject(BranchesStore);
  private lateRecordsService = inject(LateRecordsService);
  private logger = inject(LoggerService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  readonly ALERT_POSITION_THRESHOLD = ALERT_POSITION_THRESHOLD;

  /** Total de personas en todas las sucursales (para mobile summary) */
  totalPeopleCount = computed(() => this.branchRows().reduce((sum, r) => sum + r.count, 0));
  private readonly peluqueriaPositionNames = PELUQUERIA_POSITION_NAMES as readonly string[];

  /** Órdenes de Odoo para la fecha de vista Peluquería */
  odooOrders = computed((): OdooSaleOrder[] => {
    this.homeData.peluqueriaViewDate();
    const res = this.homeData.odooSaleOrdersForPeluqueriaView.value?.();
    if (!res?.success || !Array.isArray(res.data)) return [];
    return res.data;
  });

  /** Órdenes agrupadas por warehouse (sucursal) */
  ordersGroupedByWarehouse = computed((): { warehouseName: string; orders: OdooSaleOrder[] }[] => {
    const orders = this.odooOrders();
    const map = new Map<string, OdooSaleOrder[]>();
    for (const order of orders) {
      const wh = order.warehouse_id;
      const whName = Array.isArray(wh) ? wh[1] : 'Sin sucursal';
      if (!map.has(whName)) map.set(whName, []);
      map.get(whName)!.push(order);
    }
    return Array.from(map.entries()).map(([warehouseName, grpOrders]) => ({ warehouseName, orders: grpOrders }));
  });

  /** Grupos expandidos (vacío = todos cerrados por defecto) */
  expandedOrderGroups = signal<Set<string>>(new Set());

  toggleOrderGroup(name: string): void {
    const next = new Set(this.expandedOrderGroups());
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.expandedOrderGroups.set(next);
  }

  odooOrdersLoading = computed(() => this.homeData.odooSaleOrdersForPeluqueriaView.isLoading?.() ?? false);
  odooOrdersError = computed(() => {
    const e = this.homeData.odooSaleOrdersForPeluqueriaView.error?.();
    return e instanceof Error ? e.message : (e as string | undefined) ?? null;
  });

  /** Total de mascotas de peluquería (solo peluquería, sin clínica) */
  totalPetsCount = computed(() => {
    const orders = this.odooOrders();
    return orders.reduce((sum, o) => sum + (o.count_peluqueria ?? 0), 0);
  });

  /** Pet counts por warehouse name (del Odoo) */
  private petCountByWarehouse = computed((): Map<string, number> => {
    const orders = this.odooOrders();
    const map = new Map<string, number>();
    for (const order of orders) {
      const wh = order.warehouse_id;
      const whName = Array.isArray(wh) ? wh[1] : '';
      if (!whName) continue;
      map.set(whName.toLowerCase(), (map.get(whName.toLowerCase()) ?? 0) + (order.count_peluqueria ?? 0));
    }
    return map;
  });

  /** Match warehouse name de Odoo a branch name de People */
  private matchPetCountForBranch(branchName: string): number {
    const petMap = this.petCountByWarehouse();
    const bn = branchName.toLowerCase().trim();

    // Exact match first
    for (const [wh, count] of petMap) {
      if (wh === bn) return count;
    }
    // Partial: warehouse contains branch or branch contains warehouse
    for (const [wh, count] of petMap) {
      if (wh.includes(bn) || bn.includes(wh)) return count;
    }
    // Keyword match (first significant word)
    const branchKey = bn.split(/\s+/)[0];
    if (branchKey.length >= 4) {
      for (const [wh, count] of petMap) {
        if (wh.includes(branchKey)) return count;
      }
    }
    return 0;
  }

  /** Hora de última actualización de datos */
  lastUpdateTime = signal<string>('—');

  private updateTimeTracker = effect(() => {
    // Se dispara cada vez que los datos cambian (timelogs o órdenes Odoo)
    this.homeData.timelogsEntryForPeluqueriaView.value?.();
    this.homeData.odooSaleOrdersForPeluqueriaView.value?.();
    const now = new Date();
    // Escribir fuera del effect para evitar NG0600
    setTimeout(() => this.lastUpdateTime.set(format(toZonedTime(now, TZ), 'HH:mm:ss')));
  });

  /** Persiste conteo de mascotas por sucursal en Supabase (branch_daily_pet_count) */
  private petCountDebounce: any = null;
  private persistPetCountsEffect = effect(() => {
    const rows = this.branchRows();
    const orders = this.odooOrders();
    if (orders.length === 0) return; // No hay datos Odoo aún

    const today = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd');
    const rowsWithPets = rows.filter((r) => r.petCount > 0);
    if (rowsWithPets.length === 0) return;

    // Debounce: esperar 2s de estabilidad antes de persistir
    clearTimeout(this.petCountDebounce);
    this.petCountDebounce = setTimeout(() => this.upsertPetCounts(rowsWithPets, today), 2000);
  });

  private async upsertPetCounts(rows: BranchPeluqueriaRow[], recordDate: string): Promise<void> {
    const baseUrl = this.apiUrl.baseUrl;
    if (!baseUrl) return;

    for (const row of rows) {
      try {
        const body = {
          branch_id: row.branchId,
          branch_name: row.branchName,
          pet_count: row.petCount,
          record_date: recordDate,
          service_type: 'peluqueria',
          updated_at: new Date().toISOString(),
        };
        this.http
          .post(`${baseUrl}/rest/v1/branch_daily_pet_count?on_conflict=branch_name,record_date,service_type`, body, {
            headers: {
              Prefer: 'resolution=merge-duplicates',
            },
          })
          .subscribe({
            error: (err) =>
              this.logger.warn(`[Peluqueria] Error upserting pet count for ${row.branchName}:`, err),
          });
      } catch (err) {
        this.logger.warn(`[Peluqueria] Error upserting pet count for ${row.branchName}:`, err);
      }
    }
  }

  formatOdooDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = parseISO(dateStr);
      return format(toZonedTime(d, TZ), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateStr;
    }
  }

  onViewDateChange(value: Date | null): void {
    this.homeData.peluqueriaViewDate.set(value ? new Date(value) : new Date());
  }

  /** Fecha máxima seleccionable (hoy) */
  maxDate = computed(() => new Date());

  /** Etiqueta de la fecha seleccionada */
  dateLabel = computed(() => {
    const d = toZonedTime(this.homeData.peluqueriaViewDate(), TZ);
    return format(d, "EEEE d 'de' MMMM, yyyy");
  });

  loading = computed(() => this.homeData.timelogsEntryForPeluqueriaView.isLoading?.() ?? false);

  error = computed(() => {
    const t = this.homeData.timelogsEntryForPeluqueriaView.error?.();
    return t instanceof Error ? t.message : (t as string | undefined) || null;
  });

  /** Para el template: convierte positionCounts en array [nombre, cantidad] ordenado */
  getPositionCountEntries(counts: BranchPeluqueriaRow['positionCounts']) {
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])) as [string, number][];
  }

  branchRows = computed((): BranchPeluqueriaRow[] => {
    this.homeData.peluqueriaViewDate(); // dependencia para recalcular al cambiar fecha
    const timelogs = (this.homeData.timelogsEntryForPeluqueriaView.value?.() ?? []) as TimelogWithBranch[];
    const exitLogs = (this.homeData.timelogsExitForPeluqueriaView.value?.() ?? []) as TimelogExitRaw[];
    const schedules = (this.homeData.employeeSchedules.value?.() ?? []) as EmployeeScheduleForLate[];
    const branches = this.branchesStore
      .entities()
      .filter((b) => b.is_active && !BRANCHES_EXCLUDED_FROM_PELUQUERIA.includes(b.name?.trim() ?? ''));
    const viewDate = this.homeData.peluqueriaViewDate();
    const selectedDayStr = format(toZonedTime(viewDate, TZ), 'yyyy-MM-dd');

    const isPeluqueriaPosition = (positionName: string | undefined): boolean => {
      if (!positionName?.trim()) return false;
      return this.peluqueriaPositionNames.some(
        (allowed) => positionName.trim().toLowerCase() === allowed.toLowerCase()
      );
    };

    // Horarios del mes que aplican hoy (start_date <= today <= end_date), excluir feriado/día libre
    const schedulesToday = schedules.filter((s) => {
      if (!s.start_date || !s.end_date) return false;
      if (s.start_date > selectedDayStr || s.end_date < selectedDayStr) return false;
      const sch = s.schedule as { id?: string; day_off?: boolean } | undefined;
      if (sch?.day_off) return false;
      if (sch?.id === SCHEDULE_ID_FERIADO || sch?.id === SCHEDULE_ID_DIA_LIBRE) return false;
      return true;
    });

    // Salidas de hoy: por (branch_id, employee_id) quedarse con la última salida del día
    const exitByBranchEmployee = new Map<string, string>();
    for (const log of exitLogs) {
      const branchId = log.branch_id;
      if (!branchId) continue;
      const raw = log.punched_at || log.created_at;
      const exitDt = raw ? (typeof raw === 'string' ? parseISO(raw) : new Date(raw)) : null;
      const exitTime = exitDt ? format(toZonedTime(exitDt, TZ), 'HH:mm') : '';
      if (!exitTime) continue;
      const key = `${branchId}|${log.employee_id}`;
      const existing = exitByBranchEmployee.get(key);
      if (!existing || exitTime > existing) {
        exitByBranchEmployee.set(key, exitTime);
      }
    }

    // Por branch_id: mapa de employee_id -> datos del empleado incluyendo tardanza
    const byBranch = new Map<
      string,
      Map<string, {
        name: string;
        position?: string;
        positionId?: string;
        entryTime: string;
        exitTime?: string;
        isLate?: boolean;
        minutesLate?: number;
        scheduledEntryTime?: string;
        toleranceMinutes?: number;
        branchId?: string;
        branchName?: string;
        timelogId?: string;
      }>
    >();

    for (const log of timelogs) {
      if (!isPeluqueriaPosition(log.employee?.position?.name)) continue;

      const branchId = log.branch_id || log.branch?.id;
      if (!branchId) continue;

      const emp = log.employee;
      const name = emp ? [emp.first_name, emp.father_name].filter(Boolean).join(' ').trim() || 'Sin nombre' : 'Sin nombre';
      const position = emp?.position?.name?.trim() || undefined;
      const positionId = emp?.position?.id ?? undefined;
      const raw = log.punched_at || log.created_at;
      const entryDt = raw ? (typeof raw === 'string' ? parseISO(raw) : new Date(raw)) : null;
      const entryTime = entryDt ? format(toZonedTime(entryDt, TZ), 'HH:mm') : '';
      const entryTimeSeconds = entryDt ? format(toZonedTime(entryDt, TZ), 'HH:mm:ss') : '';

      let isLate: boolean | undefined;
      let minutesLate: number | undefined;
      let scheduledEntryTime: string | undefined;
      let toleranceMinutes: number | undefined;
      const schedule = schedulesToday.find(
        (s: any) => s.employee_id === log.employee_id && s.start_date <= selectedDayStr && s.end_date >= selectedDayStr
      );
      if (schedule?.schedule?.entry_time && entryTimeSeconds) {
        const scheduledEntry = this.formatScheduledTime(schedule.schedule.entry_time);
        if (scheduledEntry) {
          const diff = calcMinutesDiff(entryTimeSeconds, scheduledEntry);
          const tolerance = (schedule.schedule as { minutes_tolerance?: number }).minutes_tolerance ?? 0;
          if (diff > tolerance) {
            isLate = true;
            minutesLate = diff; // minutos después de la hora programada
          }
          scheduledEntryTime = scheduledEntry;
          toleranceMinutes = tolerance;
        }
      }

      if (!byBranch.has(branchId)) {
        byBranch.set(branchId, new Map());
      }
      const employeesInBranch = byBranch.get(branchId)!;
      if (!employeesInBranch.has(log.employee_id)) {
        const exitKey = `${branchId}|${log.employee_id}`;
        const exitTime = exitByBranchEmployee.get(exitKey);
        employeesInBranch.set(log.employee_id, {
          name,
          position,
          positionId,
          entryTime,
          exitTime,
          isLate,
          minutesLate,
          scheduledEntryTime,
          toleranceMinutes,
          branchId,
          branchName: log.branch?.name ?? '',
          timelogId: log.id,
        });
      }
    }

    // Una fila por sucursal (todas las sucursales activas) con positionCounts, peopleByPosition y alerta por posición
    const rows: BranchPeluqueriaRow[] = branches.map((b) => {
      const peopleMap = byBranch.get(b.id) ?? new Map();
      const people: PersonPeluqueria[] = Array.from(peopleMap.entries()).map(([employeeId, data]) => ({
        employeeId,
        name: data.name,
        position: data.position,
        positionId: data.positionId,
        entryTime: data.entryTime || undefined,
        exitTime: data.exitTime,
        isLate: data.isLate,
        minutesLate: data.minutesLate,
        scheduledEntryTime: data.scheduledEntryTime,
        toleranceMinutes: data.toleranceMinutes,
        branchId: data.branchId,
        branchName: data.branchName,
        timelogId: data.timelogId,
      }));
      const positionCounts: Record<string, number> = {};
      for (const data of peopleMap.values()) {
        const pos = data.position ?? 'Sin posición';
        positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
      }
      // Agrupar por posición para la lista dividida
      const byPosition = new Map<string, PersonPeluqueria[]>();
      for (const p of people) {
        const key = p.position ?? 'Sin posición';
        if (!byPosition.has(key)) byPosition.set(key, []);
        byPosition.get(key)!.push(p);
      }
      const peopleByPosition = Array.from(byPosition.entries())
        .map(([positionName, groupPeople]) => ({
          positionName,
          positionId: groupPeople[0]?.positionId,
          people: groupPeople,
        }))
        .sort((a, b) => a.positionName.localeCompare(b.positionName));
      const alertPositionCount = people.filter((p) => p.positionId === ALERT_POSITION_ID).length;
      const alertOverflow = alertPositionCount > ALERT_POSITION_THRESHOLD;
      return {
        branchId: b.id,
        branchName: b.name,
        shortName: b.short_name ?? b.name.slice(0, 3),
        count: people.length,
        petCount: this.matchPetCountForBranch(b.name),
        positionCounts,
        peopleByPosition,
        alertOverflow,
        alertPositionCount,
        people,
      };
    });

    // Persistir tardanzas automáticamente (fire-and-forget, fuera del computed)
    const allLatePeople = rows.flatMap((r) =>
      r.people.filter((p) => p.isLate && p.minutesLate && p.minutesLate > 0)
    );
    if (allLatePeople.length > 0) {
      setTimeout(() => this.persistLateRecords(allLatePeople, selectedDayStr));
    }

    return rows.sort((a, b) => a.branchName.localeCompare(b.branchName));
  });

  /**
   * Persiste automáticamente los registros de tardanza en la base de datos
   * Ejecuta en background sin bloquear la UI
   */
  private async persistLateRecords(
    latePeople: PersonPeluqueria[],
    timelogDate: string
  ): Promise<void> {
    for (const person of latePeople) {
      try {
        // Verificar que tengamos todos los datos necesarios
        if (!person.scheduledEntryTime || !person.entryTime || !person.minutesLate) {
          this.logger.warn(
            `[Peluqueria] Datos incompletos para tardanza: ${person.name}`
          );
          continue;
        }

        // Formatear horas a HH:mm:ss
        const [actualH, actualM] = person.entryTime.split(':');
        const actualEntryTime = `${actualH.padStart(2, '0')}:${actualM.padStart(2, '0')}:00`;

        await this.lateRecordsService.save({
          employee_id: person.employeeId,
          timelog_date: timelogDate,
          scheduled_entry_time: person.scheduledEntryTime,
          actual_entry_time: actualEntryTime,
          minutes_late: person.minutesLate,
          tolerance_minutes: person.toleranceMinutes ?? 0,
          employee_name: person.name,
          position_id: person.positionId,
          position_name: person.position,
          branch_id: person.branchId,
          branch_name: person.branchName,
          source_module: 'peluqueria',
          source_timelog_id: person.timelogId,
        });

        this.logger.debug(
          `[Peluqueria] Tardanza persistida: ${person.name} - ${person.minutesLate} min`
        );
      } catch (error) {
        // Error silencioso - no afecta la UI
        this.logger.error(
          `[Peluqueria] Error persistiendo tardanza para ${person.name}:`,
          error
        );
      }
    }
  }
  private formatScheduledTime(t: string | Date): string {
    if (typeof t === 'string') {
      const parts = t.split(':');
      return parts.length >= 2
        ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(parts[2] ?? '00').padStart(2, '0')}`
        : '';
    }
    return format(toZonedTime(t, TZ), 'HH:mm:ss');
  }
}

function calcMinutesDiff(actualTime: string, scheduledTime: string): number {
  if (!actualTime || !scheduledTime) return 0;
  let actual = new Date();
  let scheduled = new Date();
  const actualParts = actualTime.split(':');
  const scheduledParts = scheduledTime.split(':');
  if (actualParts.length < 2 || scheduledParts.length < 2) return 0;
  actual = set(actual, { hours: +actualParts[0], minutes: +actualParts[1], seconds: 0, milliseconds: 0 });
  scheduled = set(scheduled, { hours: +scheduledParts[0], minutes: +scheduledParts[1], seconds: 0, milliseconds: 0 });
  return differenceInMinutes(actual, scheduled);
}

type EmployeeScheduleForLate = {
  employee_id: string;
  start_date: string;
  end_date: string;
  schedule?: {
    id?: string;
    entry_time?: string | Date;
    minutes_tolerance?: number;
    day_off?: boolean;
  };
};
