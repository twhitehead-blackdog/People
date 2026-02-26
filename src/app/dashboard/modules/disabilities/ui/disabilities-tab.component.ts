import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { differenceInCalendarDays } from 'date-fns';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Disability } from '../models/disability.model';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';

@Component({
  selector: 'pt-disabilities-tab',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
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
        icon="pi-heart"
        approvedLabel="Aprobadas"
      />

      <!-- Filtros Avanzados Colapsables -->
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
                placeholder="Empleado, email, descripción..."
                [(ngModel)]="searchText"
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
              <p-calendar
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
                >{{ filteredDisabilities().length }} de
                {{ totalCount() }} resultados</span
              >
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Tabla Compacta -->
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <div
          class="p-2 border-b border-neutral-700/50 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <h3
              class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
            >
              <i class="pi pi-list text-cyan-400 text-sm"></i>
              Solicitudes de Incapacidades
            </h3>
          </div>
        </div>

        @if (loading()) {
        <div class="flex justify-center items-center py-8">
          <div class="text-center">
            <p-progressSpinner />
            <p class="text-gray-400 mt-2 text-sm">
              Cargando solicitudes...
            </p>
          </div>
        </div>
        } @else if (filteredDisabilities().length === 0) {
        <div
          class="flex flex-col items-center justify-center py-8 text-center"
        >
          <i class="pi pi-inbox text-4xl text-gray-600 mb-2"></i>
          <h4 class="text-sm font-semibold text-gray-300 mb-1">
            No se encontraron solicitudes
          </h4>
          <p class="text-gray-500 text-xs mb-2">
            Intenta ajustar los filtros para ver más resultados
          </p>
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
            [value]="filteredDisabilities()"
            [paginator]="true"
            [rows]="8"
            [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
            paginatorPosition="bottom"
            styleClass="p-datatable-striped p-datatable-sm"
            [tableStyle]="{ 'min-width': '50rem' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th
                  style="width: 180px; padding: 0.5rem; text-align: left;"
                >
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-cyan-400 text-xs"></i>
                    <span class="text-xs">Empleado</span>
                  </div>
                </th>
                <th
                  style="width: 120px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i
                      class="pi pi-calendar-plus text-cyan-400 text-xs"
                    ></i>
                    <span class="text-xs">Fecha Solicitud</span>
                  </div>
                </th>
                <th
                  style="width: 100px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                    <span class="text-xs">Inicio</span>
                  </div>
                </th>
                <th
                  style="width: 100px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i
                      class="pi pi-calendar-times text-cyan-400 text-xs"
                    ></i>
                    <span class="text-xs">Fin</span>
                  </div>
                </th>
                <th
                  style="width: 70px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-clock text-cyan-400 text-xs"></i>
                    <span class="text-xs">Días</span>
                  </div>
                </th>
                <th style="padding: 0.5rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-file-edit text-cyan-400 text-xs"></i>
                    <span class="text-xs">Descripción</span>
                  </div>
                </th>
                <th
                  style="width: 100px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-tag text-cyan-400 text-xs"></i>
                    <span class="text-xs">Estado</span>
                  </div>
                </th>
                <th
                  style="width: 140px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                    <span class="text-xs">Creador</span>
                  </div>
                </th>
                <th
                  style="width: 70px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-paperclip text-cyan-400 text-xs"></i>
                    <span class="text-xs">Doc</span>
                  </div>
                </th>
                <th
                  style="width: 120px; padding: 0.5rem; text-align: center;"
                >
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-cog text-cyan-400 text-xs"></i>
                    <span class="text-xs">Acciones</span>
                  </div>
                </th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-disability>
              <tr
                class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                (click)="viewDetails.emit(disability)"
              >
                <td style="padding: 0.5rem; text-align: left;">
                  <div class="flex items-center gap-1.5">
                    <div
                      class="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0"
                    >
                      <i class="pi pi-user text-cyan-400 text-[10px]"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span
                        class="font-semibold text-white text-xs truncate"
                      >
                        {{ disability.employee?.first_name }}
                        {{ disability.employee?.father_name }}
                      </span>
                      <span class="text-[10px] text-gray-400 truncate">
                        {{ disability.employee?.branch?.name || '-' }}
                      </span>
                    </div>
                  </div>
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  <span class="text-xs text-gray-300">
                    {{ disability.created_at | date : 'dd/MM/yyyy' }}
                  </span>
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  <span class="text-xs text-gray-300">
                    {{ disability.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  <span class="text-xs text-gray-300">
                    {{ disability.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  <span
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold"
                  >
                    {{ calculateDays(disability.start_date, disability.end_date) }}
                  </span>
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  @if (disability.description) {
                  <span
                    class="text-xs text-gray-300 cursor-help inline-block max-w-[150px] truncate"
                    [pTooltip]="disability.description"
                    tooltipPosition="top"
                  >
                    {{ disability.description }}
                  </span>
                  } @else {
                  <span class="text-gray-500 text-xs">-</span>
                  }
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  <p-tag
                    [value]="getStatusLabel(disability.status)"
                    [severity]="getStatusSeverity(disability.status)"
                    [rounded]="true"
                    [style]="{
                      'font-size': '0.7rem',
                      padding: '0.125rem 0.5rem'
                    }"
                  />
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  @if (disability.created_by_employee) {
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[9px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">
                      {{ disability.created_by_employee.first_name }}
                      {{ disability.created_by_employee.father_name }}
                    </span>
                  </div>
                  } @else {
                  <span class="text-[10px] text-gray-500 italic">
                    Auto-solicitud
                  </span>
                  }
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  @if (disability.document_url) {
                  <p-button
                    icon="pi pi-download"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (onClick)="downloadDocument.emit(disability.document_url!); $event.stopPropagation()"
                    pTooltip="Descargar documento"
                    tooltipPosition="top"
                    [rounded]="true"
                  />
                  } @else {
                  <span class="text-gray-500 text-xs">-</span>
                  }
                </td>
                <td
                  style="padding: 0.5rem; text-align: center;"
                  (click)="$event.stopPropagation()"
                >
                  <div class="flex gap-0.5">
                    @if (disability.status === 'pending') {
                    <p-button
                      icon="pi pi-check"
                      [text]="true"
                      severity="success"
                      size="small"
                      (onClick)="
                        approve.emit(disability);
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
                        reject.emit(disability);
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
                        viewDetails.emit(disability); $event.stopPropagation()
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
        icon="pi-heart"
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
          placeholder="Empleado, descripción..."
          [(ngModel)]="searchText"
          class="w-full text-sm py-2 bg-neutral-900/50 border-neutral-600 rounded"
        />
        <p-dropdown
          [options]="statusOptions"
          [(ngModel)]="selectedStatus"
          placeholder="Estado"
          [showClear]="true"
          class="w-full"
          styleClass="w-full"
        />
        <p-calendar
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
      } @else if (filteredDisabilities().length === 0) {
      <div class="text-center py-8 text-gray-400">
        <i class="pi pi-inbox text-3xl block mb-2"></i>
        <p class="text-sm">No hay solicitudes</p>
        <p-button
          label="Limpiar filtros"
          icon="pi pi-filter-slash"
          [outlined]="true"
          severity="secondary"
          size="small"
          (onClick)="clearFilters()"
          class="mt-2"
        />
      </div>
      } @else {
      <div class="flex flex-col gap-2">
        @for (d of filteredDisabilities(); track d.id) {
        <div
          (click)="viewDetails.emit(d)"
          class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p
                class="font-semibold text-white text-sm m-0 truncate"
              >
                {{ d.employee?.first_name }}
                {{ d.employee?.father_name }}
              </p>
              <p class="text-xs text-gray-400 m-0 mt-0.5">
                {{ d.employee?.branch?.name || '-' }}
              </p>
              <div
                class="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 text-xs text-gray-400"
              >
                <span
                  >{{ d.start_date | date : 'dd/MM/yy' }} -
                  {{ d.end_date | date : 'dd/MM/yy' }}</span
                >
                <span
                  class="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded"
                  >{{ calculateDays(d.start_date, d.end_date) }}
                  días</span
                >
              </div>
            </div>
            <p-tag
              [value]="getStatusLabel(d.status)"
              [severity]="getStatusSeverity(d.status)"
              [rounded]="true"
              [style]="{ 'font-size': '0.7rem' }"
            />
          </div>
          @if (d.status === 'pending') {
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
              (onClick)="approve.emit(d); $event.stopPropagation()"
            />
            <p-button
              icon="pi pi-times"
              [text]="true"
              severity="danger"
              size="small"
              [disabled]="updatingStatus()"
              (onClick)="reject.emit(d); $event.stopPropagation()"
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
export class DisabilitiesTabComponent {
  // Inputs from parent
  disabilities = input.required<Disability[]>();
  loading = input<boolean>(false);
  isMobile = input<boolean>(false);
  globalSearch = input<string>('');
  updatingStatus = input<boolean>(false);

  // Outputs to parent
  viewDetails = output<Disability>();
  approve = output<Disability>();
  reject = output<Disability>();
  downloadDocument = output<string>();

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

  // Stats computed from unfiltered data
  public totalCount = computed(() => this.disabilities().length);
  public pendingCount = computed(
    () => this.disabilities().filter((d) => d.status === 'pending').length
  );
  public approvedCount = computed(
    () => this.disabilities().filter((d) => d.status === 'approved').length
  );
  public rejectedCount = computed(
    () => this.disabilities().filter((d) => d.status === 'rejected').length
  );

  // Filtered data
  public filteredDisabilities = computed(() => {
    let items = this.disabilities();

    const globalSearch = this.globalSearch().toLowerCase();
    if (globalSearch) {
      items = items.filter((d) => {
        const name = `${d.employee?.first_name || ''} ${d.employee?.father_name || ''}`.toLowerCase();
        const email = d.employee?.work_email?.toLowerCase() || '';
        const desc = d.description?.toLowerCase() || '';
        return name.includes(globalSearch) || email.includes(globalSearch) || desc.includes(globalSearch);
      });
    }

    const search = this.searchText().toLowerCase();
    if (search) {
      items = items.filter((d) => {
        const name = `${d.employee?.first_name || ''} ${d.employee?.father_name || ''}`.toLowerCase();
        const email = d.employee?.work_email?.toLowerCase() || '';
        const desc = d.description?.toLowerCase() || '';
        return name.includes(search) || email.includes(search) || desc.includes(search);
      });
    }

    const status = this.selectedStatus();
    if (status) {
      items = items.filter((d) => d.status === status);
    }

    const range = this.dateRange();
    if (range && range.length === 2) {
      items = items.filter((d) => {
        const start = new Date(d.start_date);
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

  public calculateDays(start: string | Date, end: string | Date): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    return differenceInCalendarDays(e, s) + 1;
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
    return labels[status] || status;
  }

  public getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      pending: 'warn', approved: 'success', rejected: 'danger',
    };
    return map[status] || 'info';
  }
}
