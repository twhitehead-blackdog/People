import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { format } from 'date-fns';

import { Employee } from '../../../../models';
import { EmployeesStore } from '../../../../stores/employees.store';
import { BranchesStore } from '../../../../stores/branches.store';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import { MODULE_COLORS } from '../../shared/utils/excel-style.utils';

import { PersonnelMovementsService } from '../data/personnel-movements.service';
import { IncidenciaType } from '../models/personnel-movements.model';
import { filterIncidencias, filterMovements } from '../utils/movements-filter.utils';
import { exportMovementsWorkbook } from '../utils/movements-export.utils';

import { PmResumenTabComponent } from './pm-resumen-tab.component';
import { PmMovimientosTabComponent } from './pm-movimientos-tab.component';
import { PmHistorialTabComponent } from './pm-historial-tab.component';
import { PmIncidenciasTabComponent } from './pm-incidencias-tab.component';
import { PmMetasTabComponent } from './pm-metas-tab.component';

type TabKey = 'resumen' | 'movimientos' | 'historial' | 'incidencias' | 'metas';

@Component({
  selector: 'pt-personnel-movements',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    InputNumberModule,
    ToastModule,
    ToggleButtonModule,
    HrStatsGridComponent,
    PmResumenTabComponent,
    PmMovimientosTabComponent,
    PmHistorialTabComponent,
    PmIncidenciasTabComponent,
    PmMetasTabComponent,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 max-w-7xl mx-auto space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <i class="pi pi-map" style="color: #8B5CF6"></i>
          Movimientos de Personal
        </h1>
        <p-button
          icon="pi pi-file-excel"
          label="Exportar Excel"
          severity="secondary"
          (onClick)="onExport()"
          [loading]="exporting()"
        />
      </div>

      <!-- Filters -->
      <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3 space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Rango de Fechas</label>
            <p-datepicker
              [ngModel]="dateRange()"
              (ngModelChange)="onDateRangeChange($event)"
              selectionMode="range"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              placeholder="Seleccionar rango"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Colaborador</label>
            <p-select
              [options]="employeeOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="svc.employeeId()"
              (ngModelChange)="svc.employeeId.set($event)"
              [filter]="true"
              filterBy="label"
              placeholder="Todos"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Sucursal Origen</label>
            <p-select
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="svc.originBranchId()"
              (ngModelChange)="svc.originBranchId.set($event)"
              placeholder="Todas"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Sucursal Destino</label>
            <p-select
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="svc.destinationBranchId()"
              (ngModelChange)="svc.destinationBranchId.set($event)"
              placeholder="Todas"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Sucursal Actual (incidencia)</label>
            <p-select
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="svc.currentBranchId()"
              (ngModelChange)="svc.currentBranchId.set($event)"
              placeholder="Todas"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Tipo de Incidencia</label>
            <p-select
              [options]="incidenciaOptions"
              optionLabel="label"
              optionValue="value"
              [ngModel]="svc.incidenciaType()"
              (ngModelChange)="svc.incidenciaType.set($event)"
              placeholder="Todas"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-300 mb-1">Días mínimos por movimiento</label>
            <p-inputNumber
              [ngModel]="svc.movementMinDays()"
              (ngModelChange)="svc.movementMinDays.set($event)"
              [min]="1"
              [max]="90"
              [showButtons]="true"
              styleClass="w-full"
            />
          </div>
          <div class="flex items-end">
            <p-toggleButton
              [ngModel]="svc.onlyMetAchieved()"
              (ngModelChange)="svc.onlyMetAchieved.set($event)"
              onLabel="Solo tiendas con meta ✓"
              offLabel="Todas las tiendas"
              styleClass="w-full"
            />
          </div>
        </div>
        <div class="flex justify-end">
          <p-button label="Limpiar Filtros" icon="pi pi-filter-slash" [outlined]="true" severity="secondary" (onClick)="svc.resetFilters()" />
        </div>
      </div>

      <!-- Stats -->
      <pt-hr-stats-grid
        [totalCount]="svc.summary().totalMovements"
        [pendingCount]="svc.summary().totalIncidencias"
        [approvedCount]="svc.summary().employeesMoved"
        [rejectedCount]="svc.summary().branchesWithMetaAchieved"
        icon="pi-map"
        approvedLabel="Empleados c/ mov."
      />

      <!-- Tab bar -->
      <div class="flex gap-1 border-b border-neutral-700/50 overflow-x-auto">
        @for (tab of tabs; track tab.key) {
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            [class.text-purple-300]="activeTab() === tab.key"
            [class.border-b-2]="activeTab() === tab.key"
            [class.border-purple-400]="activeTab() === tab.key"
            [class.text-gray-400]="activeTab() !== tab.key"
            [class.hover:text-white]="activeTab() !== tab.key"
            (click)="activeTab.set(tab.key)"
          >
            <i class="pi mr-1" [ngClass]="tab.icon"></i>
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab content -->
      @if (svc.isLoading()) {
        <div class="text-center text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner mr-2"></i>Cargando datos…
        </div>
      } @else {
        @switch (activeTab()) {
          @case ('resumen') {
            <pt-pm-resumen-tab [summary]="svc.summary()" />
          }
          @case ('movimientos') {
            <pt-pm-movimientos-tab [movements]="filteredMovements()" />
          }
          @case ('historial') {
            <pt-pm-historial-tab
              [history]="svc.historyForSelected()"
              [selectedEmployeeId]="svc.employeeId()"
              [employees]="activeEmployees()"
              (employeeChange)="svc.employeeId.set($event)"
            />
          }
          @case ('incidencias') {
            <pt-pm-incidencias-tab [incidencias]="filteredIncidencias()" />
          }
          @case ('metas') {
            <pt-pm-metas-tab [metas]="filteredMetas()" />
          }
        }
      }

      <p-toast />
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class PersonnelMovementsComponent {
  public svc = inject(PersonnelMovementsService);
  private employeesStore = inject(EmployeesStore);
  private branchesStore = inject(BranchesStore);
  private message = inject(MessageService);

  public activeTab = signal<TabKey>('resumen');
  public exporting = signal<boolean>(false);

  public tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'resumen', label: 'Resumen', icon: 'pi-chart-bar' },
    { key: 'movimientos', label: 'Movimientos', icon: 'pi-arrow-right-arrow-left' },
    { key: 'historial', label: 'Historial', icon: 'pi-history' },
    { key: 'incidencias', label: 'Incidencias', icon: 'pi-exclamation-triangle' },
    { key: 'metas', label: 'Metas', icon: 'pi-flag' },
  ];

  public incidenciaOptions: { label: string; value: IncidenciaType }[] = [
    { label: 'Tardanzas', value: 'tardanza' },
    { label: 'Certificados médicos', value: 'certificado_medico' },
    { label: 'Ausencias injustificadas', value: 'ausencia_injustificada' },
  ];

  public activeEmployees = computed<Employee[]>(
    () => this.employeesStore.activeEmployees() as Employee[],
  );

  public employeeOptions = computed(() =>
    this.activeEmployees().map((e) => ({
      value: e.id,
      label: `${e.first_name} ${e.father_name}`.trim(),
    })),
  );

  public branchOptions = computed(() =>
    this.branchesStore
      .entities()
      .map((b) => ({ value: b.id, label: b.name })),
  );

  public dateRange = computed<Date[]>(() => [this.svc.dateFrom(), this.svc.dateTo()]);

  public onDateRangeChange(value: Date[] | null): void {
    if (!value) return;
    if (value[0]) this.svc.dateFrom.set(value[0]);
    if (value[1]) this.svc.dateTo.set(value[1]);
  }

  public filteredMovements = computed(() =>
    filterMovements(this.svc.movementsAll(), {
      employeeId: this.svc.employeeId(),
      originBranchId: this.svc.originBranchId(),
      destinationBranchId: this.svc.destinationBranchId(),
    }),
  );

  public filteredIncidencias = computed(() =>
    filterIncidencias(this.svc.incidenciasAll(), {
      employeeId: this.svc.employeeId(),
      branchId: this.svc.currentBranchId(),
      type: this.svc.incidenciaType(),
    }),
  );

  public filteredMetas = computed(() => {
    const all = this.svc.metasEnriched();
    if (!this.svc.onlyMetAchieved()) return all;
    return all.filter((m) => m.achievedTier !== null);
  });

  public async onExport(): Promise<void> {
    this.exporting.set(true);
    try {
      const from = format(this.svc.dateFrom(), 'yyyy-MM-dd');
      const to = format(this.svc.dateTo(), 'yyyy-MM-dd');
      await exportMovementsWorkbook({
        summary: this.svc.summary(),
        movements: this.filteredMovements(),
        history: this.svc.historyAll(),
        incidencias: this.filteredIncidencias(),
        metas: this.filteredMetas(),
        periodLabel: `${from} → ${to}`,
        moduleColor: MODULE_COLORS['personnel_movements'] ?? '8B5CF6',
      });
      this.message.add({
        severity: 'success',
        summary: 'Export generado',
        detail: 'El archivo Excel fue descargado.',
      });
    } catch (err) {
      console.error('Export error', err);
      this.message.add({
        severity: 'error',
        summary: 'Error al exportar',
        detail: String((err as Error)?.message ?? err),
      });
    } finally {
      this.exporting.set(false);
    }
  }
}
