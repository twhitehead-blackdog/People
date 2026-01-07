import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CompensatoryStore } from '../../../../stores/compensatory.store';
import { CompensatoryService } from '../services/compensatory.service';
import { CompensatoryDetailsDialogComponent } from './compensatory-details-dialog.component';
import { CompensatoryRequest } from '../services/compensatory.service';

@Component({
  selector: 'pt-compensatory-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    CalendarModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    PaginatorModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TooltipModule,
    CompensatoryDetailsDialogComponent,
  ],
  template: `
    <!-- Estadísticas Compactas -->
    <div class="grid grid-cols-4 gap-2">
      <!-- Total -->
      <div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-800/80 rounded-lg p-3 border border-neutral-700/50 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
        <div class="flex items-center justify-between">
          <div class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <i class="pi pi-clock text-lg text-gray-400"></i>
          </div>
          <div class="text-right flex-1">
            <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider m-0">Total</p>
            <p class="text-xl font-bold text-white m-0">{{ totalCount() }}</p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full" [style.width.%]="100"></div>
        </div>
      </div>

      <!-- Pendientes -->
      <div class="group relative bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-neutral-800 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer">
        <div class="flex items-center justify-between">
          <div class="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <i class="pi pi-clock text-lg text-yellow-400"></i>
          </div>
          <div class="text-right flex-1">
            <p class="text-[10px] font-medium text-yellow-400/80 uppercase tracking-wider m-0">Pendientes</p>
            <p class="text-xl font-bold text-yellow-300 m-0">{{ pendingCount() }}</p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full" [style.width.%]="totalCount() > 0 ? (pendingCount() / totalCount()) * 100 : 0"></div>
        </div>
      </div>

      <!-- Aprobadas -->
      <div class="group relative bg-gradient-to-br from-green-500/10 via-green-500/5 to-neutral-800 rounded-lg p-3 border border-green-500/30 hover:border-green-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer">
        <div class="flex items-center justify-between">
          <div class="w-8 h-8 rounded-md bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <i class="pi pi-check-circle text-lg text-green-400"></i>
          </div>
          <div class="text-right flex-1">
            <p class="text-[10px] font-medium text-green-400/80 uppercase tracking-wider m-0">Aprobadas</p>
            <p class="text-xl font-bold text-green-300 m-0">{{ approvedCount() }}</p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" [style.width.%]="totalCount() > 0 ? (approvedCount() / totalCount()) * 100 : 0"></div>
        </div>
      </div>

      <!-- Rechazadas -->
      <div class="group relative bg-gradient-to-br from-red-500/10 via-red-500/5 to-neutral-800 rounded-lg p-3 border border-red-500/30 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer">
        <div class="flex items-center justify-between">
          <div class="w-8 h-8 rounded-md bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <i class="pi pi-times-circle text-lg text-red-400"></i>
          </div>
          <div class="text-right flex-1">
            <p class="text-[10px] font-medium text-red-400/80 uppercase tracking-wider m-0">Rechazadas</p>
            <p class="text-xl font-bold text-red-300 m-0">{{ rejectedCount() }}</p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" [style.width.%]="totalCount() > 0 ? (rejectedCount() / totalCount()) * 100 : 0"></div>
        </div>
      </div>
    </div>

    <!-- Filtros Avanzados Colapsables -->
    <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
      <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer" (click)="toggleFilters()">
        <div class="flex items-center gap-2">
          <i class="pi pi-filter text-cyan-400 text-sm"></i>
          <h3 class="text-sm font-semibold text-white m-0">Filtros Avanzados</h3>
          @if (hasActiveFilters()) {
            <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold">
              {{ activeFiltersCount() }} activos
            </span>
          }
        </div>
        <i class="pi text-sm" [class.pi-chevron-down]="!showFilters()" [class.pi-chevron-up]="showFilters()" [class.text-gray-400]="!showFilters()" [class.text-cyan-400]="showFilters()"></i>
      </div>

      @if (showFilters()) {
        <div class="p-3 space-y-2 animate-fade-in">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i>Búsqueda Específica
              </label>
              <input
                type="text"
                pInputText
                placeholder="Empleado, email, motivo..."
                [(ngModel)]="searchText"
                (input)="onFilterChange()"
                class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Estado
              </label>
              <p-dropdown
                [options]="statusOptions"
                [(ngModel)]="selectedStatus"
                (onChange)="onFilterChange()"
                placeholder="Todos"
                [showClear]="true"
                class="w-full text-sm"
                [style]="{ height: '32px' }"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>Rango de Fechas
              </label>
              <p-calendar
                [(ngModel)]="dateRange"
                selectionMode="range"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Seleccionar"
                (onSelect)="onFilterChange()"
                [showClear]="true"
                class="w-full text-sm"
                [inputStyle]="{ height: '32px', padding: '0.375rem' }"
              />
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-neutral-700/50">
            <p-button
              label="Limpiar Todo"
              icon="pi pi-filter-slash"
              [outlined]="true"
              severity="secondary"
              (onClick)="clearFilters()"
              [disabled]="!hasActiveFilters()"
            />
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <i class="pi pi-info-circle"></i>
              <span>{{ filteredRequests().length }} de {{ totalCount() }} resultados</span>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Tabla Compacta -->
    <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
      <div class="p-2 border-b border-neutral-700/50">
        <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
          <i class="pi pi-list text-cyan-400 text-sm"></i>
          Solicitudes de Tiempo Compensatorio
        </h3>
      </div>

      @if (isLoading()) {
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
          <p-button
            [label]="'Limpiar Filtros'"
            icon="pi pi-filter-slash"
            [outlined]="true"
            severity="secondary"
            size="small"
            (onClick)="clearFilters()"
          />
        </div>
      } @else {
        <div class="overflow-x-auto">
          <p-table
            [value]="filteredRequests()"
            [paginator]="true"
            [rows]="8"
            [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
            paginatorPosition="bottom"
            styleClass="p-datatable-sm p-datatable-striped"
            [globalFilterFields]="['employee.first_name', 'employee.father_name', 'employee.work_email', 'reason']"
            [scrollable]="false"
          >
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 160px; padding: 0.4rem; text-align: left;">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-cyan-400 text-xs"></i>
                    <span class="text-xs">Empleado</span>
                  </div>
                </th>
                <th style="width: 100px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-calendar-check text-cyan-400 text-xs"></i>
                    <span class="text-xs">Fecha Solicitud</span>
                  </div>
                </th>
                <th style="width: 70px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-tag text-cyan-400 text-xs"></i>
                    <span class="text-xs">Tipo</span>
                  </div>
                </th>
                <th style="width: 130px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                    <span class="text-xs">Fechas</span>
                  </div>
                </th>
                <th style="width: 80px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-clock text-cyan-400 text-xs"></i>
                    <span class="text-xs">Cantidad</span>
                  </div>
                </th>
                <th style="width: 120px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-comment text-cyan-400 text-xs"></i>
                    <span class="text-xs">Motivo Solicitud</span>
                  </div>
                </th>
                <th style="width: 90px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-tag text-cyan-400 text-xs"></i>
                    <span class="text-xs">Estado</span>
                  </div>
                </th>
                <th style="width: 110px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-cog text-cyan-400 text-xs"></i>
                    <span class="text-xs">Acciones</span>
                  </div>
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
                      <span class="text-[9px] text-gray-400 truncate">{{ getEmployeeEmail(request) }}</span>
                    </div>
                  </div>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <span class="text-xs text-gray-300">{{ request.created_at | date : 'dd/MM/yyyy' }}</span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <span class="text-xs font-medium text-white">
                    @let compensatoryType = getCompensatoryTypeFromNotes(request); @if (compensatoryType === 'days') { Días } @else if (compensatoryType === 'hours') { Horas } @else { <span class="text-gray-500">-</span> }
                  </span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let dateFrom = request.date_from | date : 'dd/MM/yyyy';
                  @let dateTo = request.date_to | date : 'dd/MM/yyyy'; @if (dateFrom === dateTo) {
                    <span class="text-xs text-gray-300">{{ dateFrom }}</span>
                  } @else {
                    <span class="text-xs text-gray-300">{{ dateFrom }} → {{ dateTo }}</span>
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let quantity = getCompensatoryQuantity(request);
                  <span class="text-xs font-medium text-white">
                    @if (quantity && quantity.value > 0) { @if (quantity.isDays) {
                      {{ quantity.value }} día(s)
                    } @else {
                      {{ formatHoursMinutes(quantity.value) }}
                    } } @else {
                      <span class="text-gray-500">-</span>
                    }
                  </span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let reason = getCompensatoryReasonFromNotes(request); @if (reason) {
                    <span class="text-xs text-gray-300 cursor-help inline-block max-w-[110px] truncate" [pTooltip]="reason" tooltipPosition="top">
                      {{ reason }}
                    </span>
                  } @else {
                    <span class="text-gray-500 text-xs">-</span>
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <p-tag
                    [value]="getCompensatoryStatusLabel(request)"
                    [severity]="getCompensatoryStatusSeverity(request)"
                    [style]="{
                      'font-size': '0.65rem',
                      padding: '0.1rem 0.4rem'
                    }"
                  />
                </td>
                <td style="padding: 0.4rem; text-align: center;" (click)="$event.stopPropagation()">
                  <div class="flex gap-0.5 justify-center">
                    @if (request.review_status === 'pending') {
                      <p-button
                        icon="pi pi-check"
                        [text]="true"
                        severity="success"
                        size="small"
                        (onClick)="approveRequest(request); $event.stopPropagation()"
                        pTooltip="Aprobar"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                      <p-button
                        icon="pi pi-times"
                        [text]="true"
                        severity="danger"
                        size="small"
                        (onClick)="rejectRequest(request); $event.stopPropagation()"
                        pTooltip="Rechazar"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                    } @else if (request.review_status === 'approved' && !request.is_approved) {
                      <p-button
                        icon="pi pi-check-circle"
                        [text]="true"
                        severity="info"
                        size="small"
                        (onClick)="registerRequest(request); $event.stopPropagation()"
                        pTooltip="Registrar (Lia)"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                    }
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      severity="info"
                      size="small"
                      (onClick)="viewDetails(request); $event.stopPropagation()"
                      pTooltip="Ver detalles"
                      tooltipPosition="top"
                      [rounded]="true"
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
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      @if (selectedRequest()) {
        <pt-compensatory-details-dialog
          [request]="selectedRequest()!"
          (close)="closeDetailsDialog()"
        />
      }
    </p-dialog>
  `,
  styles: `
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: #1f2937 !important;
      color: #e5e7eb !important;
      border-color: #374151 !important;
      font-weight: 600 !important;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: #111827 !important;
      border-color: #374151 !important;
      transition: all 0.2s ease;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: #1f2937 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: #374151 !important;
      color: #e5e7eb !important;
      padding: 0.4rem !important;
      font-size: 0.75rem !important;
    }

    ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th {
      padding: 0.4rem !important;
      font-size: 0.7rem !important;
    }

    ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td {
      padding: 0.4rem !important;
      font-size: 0.75rem !important;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompensatoryListComponent {
  private compensatoryStore = inject(CompensatoryStore);
  private compensatoryService = inject(CompensatoryService);

  // Estado local para filtros
  showFilters = signal(false);
  searchText = signal('');
  selectedStatus = signal<string | null>(null);
  dateRange = signal<Date[] | null>(null);

  // Estado del diálogo
  showDetailsDialog = signal(false);
  selectedRequest = signal<CompensatoryRequest | null>(null);

  // Opciones para filtros
  statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Computed del store
  filteredRequests = this.compensatoryStore.filteredRequests;
  totalCount = this.compensatoryStore.totalCount;
  pendingCount = this.compensatoryStore.pendingCount;
  approvedCount = this.compensatoryStore.approvedCount;
  rejectedCount = this.compensatoryStore.rejectedCount;
  hasActiveFilters = this.compensatoryStore.hasActiveFilters;
  isLoading = signal(false);

  activeFiltersCount = this.compensatoryStore.hasActiveFilters;

  // Métodos helper
  getEmployeeName = (request: CompensatoryRequest) =>
    this.compensatoryService.getEmployeeName(request);

  getEmployeeEmail = (request: CompensatoryRequest) =>
    this.compensatoryService.getEmployeeEmail(request);

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

  formatHoursMinutes = (hours: number) =>
    this.compensatoryService.formatHoursMinutes(hours);

  // Métodos de acción
  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  onFilterChange(): void {
    this.compensatoryStore.updateFilters({
      searchText: this.searchText(),
      selectedStatus: this.selectedStatus(),
      dateRange: this.dateRange(),
    });
  }

  clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
    this.compensatoryStore.clearFilters();
  }

  approveRequest(request: CompensatoryRequest): void {
    this.compensatoryService.approveCompensatoryRequest(request);
  }

  rejectRequest(request: CompensatoryRequest): void {
    this.compensatoryService.rejectCompensatoryRequest(request);
  }

  registerRequest(request: CompensatoryRequest): void {
    this.compensatoryService.registerCompensatoryRequest(request);
  }

  viewDetails(request: CompensatoryRequest): void {
    this.selectedRequest.set(request);
    this.showDetailsDialog.set(true);
    // TODO: Cargar horas extras del empleado
  }

  closeDetailsDialog(): void {
    this.showDetailsDialog.set(false);
    this.selectedRequest.set(null);
  }
}