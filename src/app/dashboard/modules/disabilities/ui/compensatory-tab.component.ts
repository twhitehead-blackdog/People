import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CompensatoryRequest } from '../models/disability.model';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import {
  getCompensatoryQuantity,
  getCompensatoryTypeFromNotes,
  getCompensatoryReasonFromNotes,
  getCompensatoryDateFromNotes,
  getCompensatoryRequestedAmountFromNotes,
} from '../../shared/utils/compensatory-parsing.utils';

@Component({
  selector: 'pt-compensatory-tab',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
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
        icon="pi-clock"
        approvedLabel="Aprobadas"
      />

      <!-- Filtros -->
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm"
      >
        <div
          class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
          (click)="showFilters.set(!showFilters())"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-cyan-400 text-sm"></i>
            <h3 class="text-sm font-semibold text-white m-0">
              Filtros Avanzados
            </h3>
            @if (hasActiveFilters()) {
            <span
              class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold"
            >
              {{ activeFiltersCount() }} activos
            </span>
            }
          </div>
          <i
            class="pi text-sm"
            [class.pi-chevron-down]="!showFilters()"
            [class.pi-chevron-up]="showFilters()"
            [class.text-gray-400]="!showFilters()"
            [class.text-cyan-400]="showFilters()"
          ></i>
        </div>

        @if (showFilters()) {
        <div class="p-3 space-y-2 animate-fade-in">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i
                >Búsqueda Específica
              </label>
              <input
                type="text"
                pInputText
                placeholder="Empleado, email, motivo..."
                [(ngModel)]="searchText"
                class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Estado
              </label>
              <p-select
                [options]="statusOptions"
                [(ngModel)]="selectedStatus"
                placeholder="Todos"
                [showClear]="true"
                class="w-full text-sm"
                [style]="{ height: '32px' }"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i
                >Rango de Fechas
              </label>
              <p-datepicker
                [(ngModel)]="dateRange"
                selectionMode="range"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Seleccionar"
                [showClear]="true"
                class="w-full text-sm"
                [inputStyle]="{ height: '32px', padding: '0.375rem' }"
              />
            </div>
          </div>

          <div
            class="flex items-center justify-between pt-2 border-t border-neutral-700/50"
          >
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
              <span
                >{{ filteredRequests().length }} de
                {{ totalCount() }} resultados</span
              >
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Tabla -->
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <div class="p-2 border-b border-neutral-700/50">
          <h3
            class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
          >
            <i class="pi pi-list text-cyan-400 text-sm"></i>
            Solicitudes de Tiempo Compensatorio
          </h3>
        </div>

        <div>
          @if (loading()) {
          <div class="flex justify-center items-center py-8">
            <p-progressSpinner />
          </div>
          } @else {
          <p-table
            [value]="filteredRequests()"
            [paginator]="true"
            [rows]="8"
            [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
            paginatorPosition="bottom"
            styleClass="p-datatable-sm p-datatable-striped"
            [scrollable]="false"
          >
            <ng-template #emptymessage>
              <tr>
                <td colspan="9" class="text-center py-4">
                  No se encontraron solicitudes de tiempo compensatorio
                </td>
              </tr>
            </ng-template>
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
                <th style="width: 140px; padding: 0.4rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                    <span class="text-xs">Creador</span>
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
              <tr
                class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                (click)="viewDetails.emit(request)"
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
                        {{ getEmployeeName(request) }}
                      </span>
                      <span class="text-[9px] text-gray-400 truncate">
                        {{ request.employee?.branch?.name || '-' }}
                      </span>
                    </div>
                  </div>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <span class="text-xs text-gray-300">
                    {{ request.created_at | date : 'dd/MM/yyyy' }}
                  </span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let compensatoryType = getType(request);
                  <span class="text-xs font-medium text-white">
                    @if (compensatoryType === 'days') { Días } @else if
                    (compensatoryType === 'hours') { Horas } @else {
                    <span class="text-gray-500">-</span>
                    }
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
                    @let compensatoryDate = getDate(request);
                    @if (compensatoryDate) {
                    <span class="text-xs text-gray-300">{{ compensatoryDate | date : 'dd/MM/yyyy' : 'UTC' }}</span>
                    } @else {
                    <span class="text-xs text-gray-500">-</span>
                    }
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let requestedAmount = getRequestedAmount(request);
                  @let quantity = getQuantity(request);
                  @let compType = getType(request);
                  <span class="text-xs font-medium text-white">
                    @if (requestedAmount !== null && compType === 'days') {
                    {{ requestedAmount }} día(s) } @else if (requestedAmount
                    !== null && compType === 'hours') { {{ requestedAmount }}h } @else if (requestedAmount
                    !== null) { {{ requestedAmount }} } @else if
                    ((quantity?.value ?? 0) > 0 && quantity?.isDays) {
                    {{ quantity?.value }} día(s) } @else if
                    ((quantity?.value ?? 0) > 0) {
                    {{ formatHoursMinutes(quantity?.value || 0) }} } @else {
                    <span class="text-gray-500">-</span>
                    }
                  </span>
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  @let reason = getReason(request); @if (reason) {
                  <span
                    class="text-xs text-gray-300 cursor-help inline-block max-w-[110px] truncate"
                    [pTooltip]="reason"
                    tooltipPosition="top"
                  >
                    {{ reason }}
                  </span>
                  } @else {
                  <span class="text-gray-500 text-xs">-</span>
                  }
                </td>
                <td style="padding: 0.4rem; text-align: center;">
                  <p-tag
                    [value]="getStatusLabel(request)"
                    [severity]="getStatusSeverity(request)"
                    [style]="{
                      'font-size': '0.65rem',
                      padding: '0.1rem 0.4rem'
                    }"
                  />
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  @if (request.created_by_employee) {
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">
                      {{ request.created_by_employee.first_name }}
                      {{ request.created_by_employee.father_name }}
                    </span>
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
                    @if (request.review_status === 'pending') {
                    <p-button
                      icon="pi pi-check"
                      [text]="true"
                      severity="success"
                      size="small"
                      (onClick)="
                        approve.emit(request);
                        $event.stopPropagation()
                      "
                      pTooltip="Aprobar"
                      tooltipPosition="top"
                      [rounded]="true"
                      [loading]="updatingStatus()"
                    />
                    <p-button
                      icon="pi pi-times"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (onClick)="
                        reject.emit(request);
                        $event.stopPropagation()
                      "
                      pTooltip="Rechazar"
                      tooltipPosition="top"
                      [rounded]="true"
                      [disabled]="updatingStatus()"
                    />
                    }
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      severity="info"
                      size="small"
                      (onClick)="
                        viewDetails.emit(request);
                        $event.stopPropagation()
                      "
                      pTooltip="Ver detalles"
                      tooltipPosition="top"
                      [rounded]="true"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
          }
        </div>
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
        icon="pi-clock"
        approvedLabel="Aprobadas"
      />
      <button
        type="button"
        (click)="showFilters.set(!showFilters())"
        class="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-left text-sm text-gray-300"
      >
        <span
          ><i class="pi pi-filter text-cyan-400 mr-2"></i>Filtros
          @if (hasActiveFilters()) {
          <span class="text-cyan-400 text-xs"
            >({{ activeFiltersCount() }})</span
          >
          }</span
        >
        <i
          [class]="
            showFilters() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'
          "
        ></i>
      </button>
      @if (showFilters()) {
      <div
        class="grid grid-cols-1 gap-2 p-2 bg-neutral-800/80 rounded-lg border border-neutral-700/50"
      >
        <input
          type="text"
          pInputText
          placeholder="Empleado, motivo..."
          [(ngModel)]="searchText"
          class="w-full text-sm py-2 bg-neutral-900/50 border-neutral-600 rounded"
        />
        <p-select
          [options]="statusOptions"
          [(ngModel)]="selectedStatus"
          placeholder="Estado"
          [showClear]="true"
          class="w-full"
          styleClass="w-full"
        />
        <p-datepicker
          [(ngModel)]="dateRange"
          selectionMode="range"
          dateFormat="dd/mm/yy"
          placeholder="Rango fechas"
          [showClear]="true"
          class="w-full"
          [inputStyle]="{ width: '100%' }"
        />
        <p-button
          label="Limpiar filtros"
          icon="pi pi-filter-slash"
          [outlined]="true"
          severity="secondary"
          size="small"
          (onClick)="clearFilters()"
          [disabled]="!hasActiveFilters()"
        />
      </div>
      }

      @if (loading()) {
      <div class="flex justify-center py-8">
        <p-progressSpinner />
      </div>
      } @else if (filteredRequests().length === 0) {
      <div class="text-center py-8 text-gray-400">
        <i class="pi pi-inbox text-3xl block mb-2"></i>
        <p class="text-sm">No hay solicitudes</p>
      </div>
      } @else {
      <div class="flex flex-col gap-2">
        @for (req of filteredRequests(); track req.id) {
        <div
          (click)="viewDetails.emit(req)"
          class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-white text-sm m-0 truncate">
                {{ getEmployeeName(req) }}
              </p>
              <p class="text-xs text-gray-400 m-0 mt-0.5">
                {{ req.employee?.branch?.name || '-' }}
              </p>
              <div
                class="flex flex-wrap gap-x-2 mt-2 text-xs text-gray-400"
              >
                <span
                  >{{ req.date_from | date : 'dd/MM/yy' }} -
                  {{ req.date_to | date : 'dd/MM/yy' }}</span
                >
                @let qty = getQuantity(req); @if (qty?.value != null &&
                qty.value > 0) {
                <span
                  class="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded"
                  >{{
                    qty.isDays
                      ? qty.value + ' día(s)'
                      : formatHoursMinutes(qty.value)
                  }}</span
                >
                }
              </div>
            </div>
            <p-tag
              [value]="getStatusLabel(req)"
              [severity]="getStatusSeverity(req)"
              [rounded]="true"
              [style]="{ 'font-size': '0.7rem' }"
            />
          </div>
          @if (req.review_status === 'pending') {
          <div
            class="flex gap-1 mt-2"
            (click)="$event.stopPropagation()"
          >
            <p-button
              icon="pi pi-check"
              [text]="true"
              severity="success"
              size="small"
              [loading]="updatingStatus()"
              (onClick)="approve.emit(req); $event.stopPropagation()"
            />
            <p-button
              icon="pi pi-times"
              [text]="true"
              severity="danger"
              size="small"
              [disabled]="updatingStatus()"
              (onClick)="reject.emit(req); $event.stopPropagation()"
            />
          </div>
          }
        </div>
        }
      </div>
      }
    </div>
    }
  `,
})
export class CompensatoryTabComponent {
  // Inputs
  requests = input.required<CompensatoryRequest[]>();
  loading = input<boolean>(false);
  isMobile = input<boolean>(false);
  globalSearch = input<string>('');
  updatingStatus = input<boolean>(false);

  // Outputs
  viewDetails = output<CompensatoryRequest>();
  approve = output<CompensatoryRequest>();
  reject = output<CompensatoryRequest>();

  // Local filter state
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);
  public showFilters = signal(false);

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Stats
  public totalCount = computed(() => this.requests().length);
  public pendingCount = computed(
    () =>
      this.requests().filter(
        (r) => r.review_status === 'pending' || (!r.review_status && !r.is_approved)
      ).length
  );
  public approvedCount = computed(
    () => this.requests().filter((r) => r.is_approved === true).length
  );
  public rejectedCount = computed(
    () =>
      this.requests().filter(
        (r) => r.review_status === 'rejected' || r.rejection_comment
      ).length
  );

  // Filtered data
  public filteredRequests = computed(() => {
    let items = this.requests();

    const globalSearch = this.globalSearch().toLowerCase();
    if (globalSearch) {
      items = items.filter((r) => {
        const name = this.getEmployeeName(r).toLowerCase();
        const email = r.employee?.work_email?.toLowerCase() || '';
        const reason = (getCompensatoryReasonFromNotes(r) || '').toLowerCase();
        return name.includes(globalSearch) || email.includes(globalSearch) || reason.includes(globalSearch);
      });
    }

    const search = this.searchText().toLowerCase();
    if (search) {
      items = items.filter((r) => {
        const name = this.getEmployeeName(r).toLowerCase();
        const email = r.employee?.work_email?.toLowerCase() || '';
        const reason = (getCompensatoryReasonFromNotes(r) || '').toLowerCase();
        return name.includes(search) || email.includes(search) || reason.includes(search);
      });
    }

    const status = this.selectedStatus();
    if (status) {
      if (status === 'pending') {
        items = items.filter((r) => r.review_status === 'pending' || (!r.review_status && !r.is_approved));
      } else if (status === 'approved') {
        items = items.filter((r) => r.is_approved === true);
      } else if (status === 'rejected') {
        items = items.filter((r) => r.review_status === 'rejected' || r.rejection_comment);
      }
    }

    const range = this.dateRange();
    if (range && range.length === 2) {
      items = items.filter((r) => {
        const start = new Date(r.date_from);
        return start >= range[0] && start <= range[1];
      });
    }

    return items;
  });

  public hasActiveFilters(): boolean {
    return !!(this.searchText() || this.selectedStatus() || this.dateRange() || this.globalSearch());
  }

  public activeFiltersCount(): number {
    let count = 0;
    if (this.searchText()) count++;
    if (this.selectedStatus()) count++;
    if (this.dateRange()) count++;
    if (this.globalSearch()) count++;
    return count;
  }

  public clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  // Delegate to pure utils
  public getType(request: CompensatoryRequest) {
    return getCompensatoryTypeFromNotes(request);
  }

  public getDate(request: CompensatoryRequest) {
    return getCompensatoryDateFromNotes(request);
  }

  public getQuantity(request: CompensatoryRequest) {
    return getCompensatoryQuantity(request);
  }

  public getRequestedAmount(request: CompensatoryRequest) {
    return getCompensatoryRequestedAmountFromNotes(request);
  }

  public getReason(request: CompensatoryRequest) {
    return getCompensatoryReasonFromNotes(request);
  }

  public getEmployeeName(request: CompensatoryRequest): string {
    if (request.employee) {
      return `${request.employee.first_name || ''} ${request.employee.father_name || ''}`.trim();
    }
    return 'Empleado';
  }

  public getStatusLabel(request: CompensatoryRequest): string {
    if (request.is_approved) return 'Aprobado';
    if (request.rejection_comment || request.review_status === 'rejected') return 'Rechazado';
    if (request.review_status === 'approved') return 'En Registro';
    return 'Pendiente';
  }

  public getStatusSeverity(
    request: CompensatoryRequest
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (request.is_approved) return 'success';
    if (request.rejection_comment || request.review_status === 'rejected') return 'danger';
    if (request.review_status === 'approved') return 'info';
    return 'warn';
  }

  public formatHoursMinutes(hours: number): string {
    if (hours === 0) return '0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
