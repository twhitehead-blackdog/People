import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardStore } from '../../../../stores/dashboard.store';

@Component({
  selector: 'pt-charts-section',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
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
  `,
  styleUrls: ['./charts-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsSectionComponent {
  state = inject(DashboardStore);

  branchData = input.required<any[]>();
  branchLabels = input.required<string[]>();
  barChartOptions = input.required<any>();
  ageRanges = input.required<any[]>();

  // Helpers
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
