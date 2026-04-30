import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { ScheduleAuditLog } from '../../../../services/schedule-audit.service';
import {
  AUDIT_ACTION_OPTIONS,
  filterAuditHistory,
} from '../../utils/timetable-audit.utils';
import { AuditLogEntryComponent } from '../audit-log-entry/audit-log-entry.component';

@Component({
  selector: 'pt-audit-history-dialog',
  imports: [
    Dialog,
    FormsModule,
    Button,
    DatePicker,
    SelectModule,
    InputText,
    SelectModule,
    AuditLogEntryComponent,
  ],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1200px' }"
      [header]="'Historial de Auditoría - Turnos'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [closable]="true"
      (onHide)="visible.set(false)"
    >
      <div class="space-y-4 pt-4">
        <!-- Filtros Avanzados -->
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-user mr-1 text-cyan-400 text-xs"></i>Empleado
                </label>
                <p-select
                  [options]="employeeOptions()"
                  optionLabel="short_name"
                  optionValue="id"
                  [(ngModel)]="selectedEmployeeFilter"
                  placeholder="Todos"
                  [showClear]="true"
                  filter
                  appendTo="body"
                  class="w-full text-sm"
                  [style]="{ height: '32px' }"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>Rango
                  de Fechas
                </label>
                <p-datepicker
                  [(ngModel)]="selectedDateRange"
                  selectionMode="range"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Seleccionar"
                  [showClear]="true"
                  class="w-full text-sm"
                  [inputStyle]="{ height: '32px', padding: '0.375rem' }"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Tipo de
                  Acción
                </label>
                <p-select
                  [options]="auditActionOptions"
                  optionLabel="label"
                  optionValue="value"
                  [(ngModel)]="selectedActionFilter"
                  placeholder="Todas"
                  [showClear]="true"
                  class="w-full text-sm"
                  [style]="{ height: '32px' }"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-300 mb-1">
                  <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i
                  >Búsqueda
                </label>
                <input
                  type="text"
                  pInputText
                  placeholder="Buscar..."
                  [(ngModel)]="searchText"
                  class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
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
                size="small"
              />
              <div class="flex items-center gap-2 text-sm text-gray-400">
                <i class="pi pi-info-circle"></i>
                <span
                  >{{ filteredHistory().length }} de
                  {{ allHistory().length }} resultados</span
                >
              </div>
            </div>
          </div>
          }
        </div>

        <!-- Lista de Historial -->
        @if (isLoading()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando historial de auditoría...</span>
        </div>
        } @else if (filteredHistory().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-info-circle text-4xl mb-4"></i>
          <p>No hay registros de auditoría disponibles</p>
        </div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of filteredHistory(); track log.id) {
          <pt-audit-log-entry
            [log]="log"
            [showEmployee]="true"
            [showScheduleId]="true"
          />
          }
          @if (hasMore() && !hasActiveFilters()) {
          <div class="flex justify-center py-4">
            @if (isLoadingMore()) {
            <div class="flex items-center gap-2 text-gray-400">
              <i class="pi pi-spin pi-spinner"></i>
              <span class="text-sm">Cargando más...</span>
            </div>
            } @else {
            <p-button
              label="Cargar más registros"
              icon="pi pi-arrow-down"
              [outlined]="true"
              severity="secondary"
              size="small"
              (onClick)="loadMore.emit()"
            />
            }
          </div>
          }
        </div>
        }
      </div>
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditHistoryDialogComponent {
  public visible = model.required<boolean>();
  public allHistory = input.required<ScheduleAuditLog[]>();
  public isLoading = input<boolean>(false);
  public employeeOptions = input<any[]>([]);

  public isLoadingMore = input<boolean>(false);
  public hasMore = input<boolean>(true);

  public loadMore = output<void>();
  public filterChanged = output<{
    employeeId: string | null;
    dateRange: Date[] | null;
    action: string | null;
  }>();

  public showFilters = signal(false);
  public selectedEmployeeFilter = signal<string | null>(null);
  public selectedDateRange = signal<Date[] | null>(null);
  public selectedActionFilter = signal<string | null>(null);
  public searchText = signal<string>('');

  public auditActionOptions = AUDIT_ACTION_OPTIONS;

  public hasActiveFilters = computed(
    () =>
      !!this.selectedEmployeeFilter() ||
      !!this.selectedDateRange() ||
      !!this.selectedActionFilter() ||
      !!this.searchText().trim()
  );

  public activeFiltersCount = computed(() => {
    let count = 0;
    if (this.selectedEmployeeFilter()) count++;
    if (this.selectedDateRange()) count++;
    if (this.selectedActionFilter()) count++;
    if (this.searchText().trim()) count++;
    return count;
  });

  public filteredHistory = computed(() =>
    filterAuditHistory({
      allAuditHistory: this.allHistory(),
      selectedEmployeeFilter: this.selectedEmployeeFilter(),
      selectedDateRange: this.selectedDateRange(),
      selectedActionFilter: this.selectedActionFilter(),
      auditSearchText: this.searchText(),
    })
  );

  public clearFilters() {
    this.selectedEmployeeFilter.set(null);
    this.selectedDateRange.set(null);
    this.selectedActionFilter.set(null);
    this.searchText.set('');
  }
}
