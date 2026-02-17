import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';

@Component({
  selector: 'pt-charts-section',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <!-- ========== DESKTOP ========== -->
    @if (device.isDesktop()) {
    <div class="section-content">
      <div class="charts-grid">
        <!-- Empleados por Sucursal -->
        <div class="chart-card">
          <h3 class="chart-title">Empleados por Sucursal</h3>
          <div class="chart-container">
            @if (branchLabels().length > 0) {
            <canvas
              baseChart
              [datasets]="branchData()"
              [labels]="branchLabels()"
              type="bar"
              [options]="barChartOptions()"
            ></canvas>
            } @else {
            <div class="empty-state">
              <i class="pi pi-chart-bar"></i>
              <p>No hay datos disponibles</p>
            </div>
            }
          </div>
        </div>

        <!-- Distribución por Edad -->
        <div class="chart-card">
          <h3 class="chart-title">Distribución por Edad</h3>
          <div class="age-distribution">
            @for (range of ageRanges(); track range.key) {
            <div class="age-bar">
              <div class="age-info">
                <span>{{ range.label }}</span>
                <span class="age-value">{{ getAgeCount(range.key) }}</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="getAgePercentage(range.key)"
                ></div>
              </div>
            </div>
            }
          </div>
        </div>

        <!-- Empleados por Departamento -->
        <div class="chart-card">
          <h3 class="chart-title">Empleados por Departamento</h3>
          <div class="department-list">
            @for (item of state.employeesByDepartment(); track
            item.department?.id) {
            <div class="department-item">
              <span>{{ item.department?.name || 'Sin departamento' }}</span>
              <span class="department-badge">{{ item.count }}</span>
            </div>
            } @empty {
            <div class="empty-state-small">No hay datos</div>
            }
          </div>
        </div>

        <!-- Principales Motivos de Ausencia -->
        <div class="chart-card">
          <h3 class="chart-title">Principales Motivos de Ausencia</h3>
          <div class="absence-list">
            @for (reason of state.mainAbsenceReasons(); track reason.reason) {
            <div class="absence-item">
              <span class="absence-dot"></span>
              <span>{{ reason.reason }}</span>
              <span class="absence-count">{{ reason.count }}</span>
            </div>
            }
          </div>
        </div>
      </div>
    </div>
    }

    <!-- ========== MOBILE ========== -->
    @if (!device.isDesktop()) {
    <div class="px-4 py-4">
      <h2 class="text-lg font-bold text-amber-400 flex items-center gap-2 mb-3">
        <i class="pi pi-chart-bar text-base"></i>
        Estadísticas
      </h2>

      <!-- Empleados por Sucursal (stat cards instead of chart) -->
      <div class="mb-4">
        <h3 class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Empleados por Sucursal</h3>
        @if (branchLabels().length > 0) {
          <div class="grid grid-cols-2 gap-2.5">
            @for (label of branchLabels(); track label; let i = $index) {
              <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
                <span class="text-xs text-gray-400 block truncate">{{ label }}</span>
                <span class="text-sm text-white font-semibold">{{ getBranchCount(i) }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30 text-center text-gray-500 text-xs">
            No hay datos disponibles
          </div>
        }
      </div>

      <!-- Distribución por Edad -->
      <div class="mb-4">
        <h3 class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Distribución por Edad</h3>
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30 space-y-2">
          @for (range of ageRanges(); track range.key) {
            <div>
              <div class="flex justify-between items-center mb-0.5">
                <span class="text-xs text-gray-300">{{ range.label }}</span>
                <span class="text-xs text-white font-semibold">{{ getAgeCount(range.key) }}</span>
              </div>
              <div class="w-full h-1.5 bg-neutral-700/50 rounded-full overflow-hidden">
                <div class="h-full bg-amber-400/80 rounded-full" [style.width.%]="getAgePercentage(range.key)"></div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Empleados por Departamento -->
      <div class="mb-4">
        <h3 class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Por Departamento</h3>
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          @for (item of state.employeesByDepartment(); track item.department?.id) {
            <div class="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
              <span class="text-xs text-gray-300 truncate flex-1 mr-2">{{ item.department?.name || 'Sin departamento' }}</span>
              <span class="text-xs text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded flex-shrink-0">{{ item.count }}</span>
            </div>
          } @empty {
            <div class="text-xs text-gray-500 text-center py-2">No hay datos</div>
          }
        </div>
      </div>

      <!-- Motivos de Ausencia -->
      <div class="mb-2">
        <h3 class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Motivos de Ausencia</h3>
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          @for (reason of state.mainAbsenceReasons(); track reason.reason) {
            <div class="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
              <span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>
              <span class="text-xs text-gray-300 flex-1 truncate">{{ reason.reason }}</span>
              <span class="text-xs text-white font-semibold">{{ reason.count }}</span>
            </div>
          }
        </div>
      </div>
    </div>
    }
  `,
  styleUrls: ['./charts-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsSectionComponent {
  state = inject(DashboardStore);
  protected device = inject(DeviceService);

  branchData = input.required<any[]>();
  branchLabels = input.required<string[]>();
  barChartOptions = input.required<any>();
  ageRanges = input.required<any[]>();

  // Helpers
  getBranchCount(index: number): number {
    const datasets = this.branchData();
    if (!datasets?.length || !datasets[0]?.data) return 0;
    return (datasets[0].data[index] as number) ?? 0;
  }

  getAgeCount(rangeKey: string): number {
    const dist = this.state.ageDistribution() as Record<string, number>;
    return dist[rangeKey] || 0;
  }

  getAgePercentage(rangeKey: string): number {
    const count = this.getAgeCount(rangeKey);
    const total = this.state.headCount();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }
}
