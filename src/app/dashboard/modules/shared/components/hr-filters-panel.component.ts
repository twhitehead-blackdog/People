import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';

export interface FilterStatusOption {
  label: string;
  value: string;
}

/**
 * Shared component for HR module collapsible filters panel.
 * Provides search, status dropdown, and date range filtering.
 *
 * @example
 * ```html
 * <pt-hr-filters-panel
 *   [statusOptions]="statusOptions"
 *   [totalCount]="totalCount()"
 *   [filteredCount]="filteredItems().length"
 *   (searchChange)="onSearchChange($event)"
 *   (statusChange)="onStatusChange($event)"
 *   (dateRangeChange)="onDateRangeChange($event)"
 *   (clearFilters)="clearFilters()"
 * />
 * ```
 */
@Component({
  selector: 'pt-hr-filters-panel',
  standalone: true,
  imports: [
    FormsModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
  ],
  template: `
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
              <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i>
              Búsqueda Específica
            </label>
            <input
              type="text"
              pInputText
              [placeholder]="searchPlaceholder"
              [ngModel]="searchText()"
              (ngModelChange)="onSearchTextChange($event)"
              class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">
              <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Estado
            </label>
            <p-dropdown
              [options]="statusOptions"
              [ngModel]="selectedStatus()"
              (ngModelChange)="onStatusSelectChange($event)"
              placeholder="Todos"
              [showClear]="true"
              class="w-full text-sm"
              [style]="{ height: '32px' }"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">
              <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>
              Rango de Fechas
            </label>
            <p-calendar
              [ngModel]="dateRange()"
              (ngModelChange)="onDateRangeSelect($event)"
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
            (onClick)="onClearFilters()"
            [disabled]="!hasActiveFilters()"
          />
          <div class="flex items-center gap-2 text-sm text-gray-400">
            <i class="pi pi-info-circle"></i>
            <span>{{ filteredCount }} de {{ totalCount }} resultados</span>
          </div>
        </div>
      </div>
      }
    </div>
  `,
})
export class HrFiltersPanelComponent {
  @Input() statusOptions: FilterStatusOption[] = [];
  @Input() searchPlaceholder = 'Empleado, email, motivo...';
  @Input() totalCount = 0;
  @Input() filteredCount = 0;

  @Output() searchChange = new EventEmitter<string>();
  @Output() statusChange = new EventEmitter<string | null>();
  @Output() dateRangeChange = new EventEmitter<Date[] | null>();
  @Output() clearFilters = new EventEmitter<void>();

  public showFilters = signal(false);
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  public hasActiveFilters(): boolean {
    return (
      !!this.searchText() ||
      !!this.selectedStatus() ||
      (!!this.dateRange() && this.dateRange()!.length > 0)
    );
  }

  public activeFiltersCount(): number {
    let count = 0;
    if (this.searchText()) count++;
    if (this.selectedStatus()) count++;
    if (this.dateRange() && this.dateRange()!.length > 0) count++;
    return count;
  }

  public onSearchTextChange(value: string): void {
    this.searchText.set(value);
    this.searchChange.emit(value);
  }

  public onStatusSelectChange(value: string | null): void {
    this.selectedStatus.set(value);
    this.statusChange.emit(value);
  }

  public onDateRangeSelect(value: Date[] | null): void {
    this.dateRange.set(value);
    this.dateRangeChange.emit(value);
  }

  public onClearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
    this.clearFilters.emit();
  }
}
