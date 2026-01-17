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
  styles: [
    `
      .section-content {
        padding: 0;
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .chart-card {
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        max-height: 400px;
        display: flex;
        flex-direction: column;
      }

      .chart-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #fff;
        margin-bottom: 1.5rem;
        font-family: 'Segoe UI', sans-serif;
      }

      .chart-container {
        position: relative;
        height: 250px;
        width: 100%;
        flex-grow: 1;
      }

      .empty-state {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #71717a;
        gap: 1rem;

        i {
          font-size: 2rem;
          opacity: 0.5;
        }
        p {
          margin: 0;
          font-size: 0.875rem;
        }
      }

      /* Age Distribution */
      .age-distribution {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
        max-height: 300px;
      }

      .age-bar {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .age-info {
        display: flex;
        justify-content: space-between;
        color: #d1d5db;
        font-size: 0.875rem;
      }

      .age-value {
        font-weight: 600;
        color: #fff;
      }

      .progress-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 9999px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: #fbbf24;
        border-radius: 9999px;
        transition: width 0.5s ease;
      }

      /* Department List */
      .department-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
        max-height: 300px;
        padding-right: 0.5rem;
      }

      .department-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        font-size: 0.875rem;
        color: #e4e4e7;
        transition: background 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      }

      .department-badge {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      /* Absence List */
      .absence-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
        max-height: 300px;
      }

      .absence-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
        font-size: 0.875rem;
        color: #d1d5db;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        &:last-child {
          border-bottom: none;
        }
      }

      .absence-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f87171;
      }

      .absence-count {
        margin-left: auto;
        font-weight: 600;
        color: #fff;
      }

      .empty-state-small {
        text-align: center;
        padding: 2rem;
        color: #71717a;
        font-size: 0.875rem;
      }
    `,
  ],
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
