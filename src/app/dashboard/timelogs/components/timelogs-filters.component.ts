import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  Signal,
  WritableSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { Employee } from '../../../models';
import { matchesEmployeeSearch } from '../utils/employee-search.utils';

@Component({
  selector: 'pt-timelogs-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoComplete,
    Button,
    DatePicker,
    Select,
    ToggleSwitch,
    InputNumber,
    TooltipModule,
  ],
  template: `
    <div class="flex flex-col md:flex-row gap-2 md:gap-3 items-center mb-2 md:mb-4">
      <div class="flex-1 w-full md:w-auto flex gap-2">
        <div class="flex-1">
          <p-autoComplete
            [ngModel]="employeeSearchInput()"
            (ngModelChange)="employeeSearchInput.set($event)"
            [suggestions]="employeeSuggestions()"
            (completeMethod)="onEmployeeComplete($event)"
            (onSelect)="onSuggestionSelected($event)"
            (keyup.enter)="handleSearch()"
            [minLength]="1"
            [delay]="150"
            [forceSelection]="false"
            placeholder="Buscar empleado por nombre..."
            styleClass="w-full"
            [inputStyleClass]="'w-full text-xs md:text-sm'"
            appendTo="body"
          >
          </p-autoComplete>
        </div>
        <p-button
          icon="pi pi-search"
          (click)="handleSearch()"
          [rounded]="true"
          severity="primary"
          [style]="{ 'min-width': '44px', height: '44px' }"
          [pTooltip]="'Buscar'"
          tooltipPosition="top"
        />
      </div>
      <div class="w-full md:w-auto">
        <p-datepicker
          placeholder="Fecha o rango de fechas"
          selectionMode="range"
          appendTo="body"
          [ngModel]="dateRange()"
          (ngModelChange)="dateRange.set($event)"
          [showIcon]="true"
          dateFormat="dd/mm/yy"
          class="w-full"
        />
      </div>
    </div>

    <div
      class="mb-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden"
    >
      <button
        type="button"
        (click)="toggleFilters()"
        class="w-full flex items-center justify-between p-3 hover:bg-neutral-700/30 transition-colors"
      >
        <div class="flex items-center gap-2">
          <i class="pi pi-filter text-yellow-400 text-sm"></i>
          <span class="text-sm md:text-base font-semibold text-white">Filtros</span>
          <span
            *ngIf="hasActiveFilters()"
            class="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full"
          >
            {{ activeFiltersCount() }} activo(s)
          </span>
        </div>
        <i
          class="pi transition-transform duration-300 text-sm"
          [class.pi-chevron-down]="!filtersExpanded()"
          [class.pi-chevron-up]="filtersExpanded()"
          class="text-gray-400"
        ></i>
      </button>

      <div
        *ngIf="filtersExpanded()"
        class="px-3 pb-3 border-t border-neutral-700/50 pt-3"
      >
        <div class="flex flex-wrap items-end gap-2 md:gap-3">
          <div class="flex-1 min-w-[140px] flex flex-col gap-4">
            <div>
              <label
                class="block text-xs font-medium text-gray-300 mb-1 text-center"
              >
                <i class="pi pi-user mr-1 text-xs"></i>Empleado
              </label>
              <p-select
                [options]="activeEmployeesList()"
                optionLabel="short_name"
                optionValue="id"
                placeholder="TODOS"
                filter
                showClear
                appendTo="body"
                [ngModel]="employeeId()"
                (ngModelChange)="employeeId.set($event)"
                class="w-full"
                [style]="{ 'font-size': '0.875rem', 'min-height': '32px' }"
              />
            </div>
            <div>
              <label
                class="block text-xs font-medium text-gray-300 mb-1 text-center"
              >
                <i class="pi pi-building mr-1 text-xs"></i>Sucursal
              </label>
              <p-select
                placeholder="TODAS"
                [options]="branchOptions()"
                optionLabel="name"
                optionValue="id"
                showClear
                appendTo="body"
                [ngModel]="branchId()"
                (ngModelChange)="branchId.set($event)"
                class="w-full"
                [style]="{ 'font-size': '0.875rem', 'min-height': '32px' }"
              />
            </div>
          </div>

          <div class="flex-1 min-w-[200px]">
            <label
              class="block text-xs font-medium text-gray-300 mb-1 text-center"
            >
              <i class="pi pi-exclamation-triangle mr-1 text-xs"></i>Alertas
            </label>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1">
              <div class="flex items-center gap-1.5">
                <p-toggleSwitch
                  inputId="delayed"
                  [ngModel]="onlyDelayed()"
                  (ngModelChange)="onlyDelayed.set($event)"
                  [style]="{ transform: 'scale(0.85)' }"
                />
                <label
                  for="delayed"
                  class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                  >Retrasos</label
                >
              </div>
              <div class="flex items-center gap-1.5">
                <p-toggleSwitch
                  inputId="errors"
                  [ngModel]="onlyErrors()"
                  (ngModelChange)="onlyErrors.set($event)"
                  [style]="{ transform: 'scale(0.85)' }"
                />
                <label
                  for="errors"
                  class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                  >Errores</label
                >
              </div>
              <div class="flex items-center gap-1.5">
                <p-toggleSwitch
                  inputId="earlyExit"
                  [ngModel]="onlyEarlyExit()"
                  (ngModelChange)="onlyEarlyExit.set($event)"
                  [style]="{ transform: 'scale(0.85)' }"
                />
                <label
                  for="earlyExit"
                  class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                  >Salida temprana</label
                >
              </div>
              <div class="flex items-center gap-1.5">
                <p-toggleSwitch
                  inputId="lunchExceededToggle"
                  [ngModel]="onlyLunchExceeded()"
                  (ngModelChange)="onlyLunchExceeded.set($event)"
                  [style]="{ transform: 'scale(0.85)' }"
                />
                <label
                  for="lunchExceededToggle"
                  class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                  >Almuerzo excedido</label
                >
              </div>
              <div class="flex items-center gap-1.5">
                <p-toggleSwitch
                  inputId="onlyMarcaciones"
                  [ngModel]="onlyWithMarcaciones()"
                  (ngModelChange)="onlyWithMarcaciones.set($event)"
                  [style]="{ transform: 'scale(0.85)' }"
                />
                <label
                  for="onlyMarcaciones"
                  class="text-xs text-gray-300 cursor-pointer whitespace-nowrap"
                  >Solo marcaciones</label
                >
              </div>
            </div>
            <div *ngIf="onlyLunchExceeded()" class="mt-2">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-clock mr-1 text-xs"></i>Rango de Exceso
              </label>
              <p-select
                inputId="lunchExceeded"
                [options]="lunchExceededOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos"
                [ngModel]="lunchExceededRange()"
                (ngModelChange)="lunchExceededRange.set($event)"
                showClear
                appendTo="body"
                class="w-full"
                [style]="{ 'font-size': '0.875rem' }"
              />
            </div>
            <div *ngIf="onlyDelayed()" class="mt-2">
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-clock mr-1 text-xs"></i>Rango de Retraso
              </label>
              <p-select
                inputId="delayRange"
                [options]="delayRangeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos"
                [ngModel]="delayRange()"
                (ngModelChange)="delayRange.set($event)"
                showClear
                appendTo="body"
                class="w-full"
                [style]="{ 'font-size': '0.875rem' }"
              />
            </div>
          </div>

          <div class="flex-1 min-w-[140px] flex flex-col gap-2">
            <label
              class="block text-xs font-medium text-gray-300 mb-1 text-center"
            >
              <i class="pi pi-clock mr-1 text-xs"></i>Tolerancia
            </label>
            <p-inputNumber
              [ngModel]="delayToleranceMinutes()"
              (ngModelChange)="delayToleranceMinutes.set($event)"
              [min]="0"
              [max]="60"
              [showButtons]="true"
              [style]="{ 'font-size': '0.875rem', 'min-height': '32px' }"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelogsFiltersComponent {
  @Input() public dateRange!: WritableSignal<Date[]>;
  @Input() public employeeSearchInput!: WritableSignal<string>;
  @Input() public employeeId!: WritableSignal<string | undefined>;
  @Input() public branchId!: WritableSignal<string | undefined>;
  @Input() public onlyDelayed!: WritableSignal<boolean>;
  @Input() public onlyErrors!: WritableSignal<boolean>;
  @Input() public onlyEarlyExit!: WritableSignal<boolean>;
  @Input() public onlyLunchExceeded!: WritableSignal<boolean>;
  @Input() public onlyWithMarcaciones!: WritableSignal<boolean>;
  @Input() public lunchExceededRange!: WritableSignal<string | null>;
  @Input() public delayRange!: WritableSignal<string | null>;
  @Input() public delayToleranceMinutes!: WritableSignal<number>;
  @Input() public filtersExpanded!: WritableSignal<boolean>;
  @Input() public activeEmployeesList!: Signal<Partial<Employee>[]>;
  @Input() public branchOptions!: Signal<any[]>;
  @Input() public lunchExceededOptions!: { label: string; value: string }[];
  @Input() public delayRangeOptions!: { label: string; value: string }[];
  @Input() public hasActiveFilters!: Signal<boolean>;
  @Input() public activeFiltersCount!: Signal<number>;
  @Output() public searchRequested = new EventEmitter<void>();

  public employeeSuggestions = signal<string[]>([]);

  public handleSearch(): void {
    this.searchRequested.emit();
  }

  public toggleFilters(): void {
    this.filtersExpanded.set(!this.filtersExpanded());
  }

  public onEmployeeComplete(event: AutoCompleteCompleteEvent): void {
    const term = (event.query || '').trim();
    if (!term) {
      this.employeeSuggestions.set([]);
      return;
    }
    const all = this.activeEmployeesList();
    this.employeeSuggestions.set(
      all
        .filter((emp) => matchesEmployeeSearch(emp, term))
        .slice(0, 10)
        .map((emp) => `${emp.first_name || ''} ${emp.father_name || ''}`.trim())
    );
  }

  public onSuggestionSelected(event: { value: string }): void {
    this.employeeSearchInput.set(event.value);
    this.searchRequested.emit();
  }
}
