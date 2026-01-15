import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardStore } from '../../stores/dashboard.store';
import { EmployeesStore } from '../../stores/employees.store';

@Component({
  selector: 'app-charts-section',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="section-content">
      <div class="charts-grid">
        <div class="chart-card">
          <h3 class="chart-title">Empleados por Sucursal</h3>
          <div class="chart-container">
            @if (branchLabels().length > 0) {
            <canvas
              baseChart
              [datasets]="branchData()"
              [labels]="branchLabels()"
              type="bar"
              [options]="barChartOptions"
            ></canvas>
            } @else {
            <div class="empty-state">
              <i class="pi pi-chart-bar"></i>
              <p>No hay datos disponibles</p>
            </div>
            }
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">Distribución por Edad</h3>
          <div class="age-distribution">
            @for (range of ageRanges; track range.key) {
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsSectionComponent {
  public state = inject(DashboardStore);
  public employees = inject(EmployeesStore);

  public ageRanges = [
    { key: '18-25', label: '18-25 años' },
    { key: '26-35', label: '26-35 años' },
    { key: '36-45', label: '36-45 años' },
    { key: '46-55', label: '46-55 años' },
    { key: '56+', label: '56+ años' },
  ];

  public branchLabels = computed(() => {
    return this.state
      .employeesByBranch()
      .map((x) => x.branch?.name || 'Sin sucursal');
  });

  public branchData = computed(() => {
    const counts = this.state.employeesByBranch().map((x) => x.count);
    const colors = this.generateCorporateColors(counts.length);
    return [
      {
        label: 'Empleados',
        data: counts,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 2,
      },
    ];
  });

  public barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        borderColor: 'rgba(251, 191, 36, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y} empleados`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#9ca3af',
          font: { size: 10 },
          stepSize: 1,
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
        beginAtZero: true,
      },
    },
  };

  private generateCorporateColors(count: number): {
    backgroundColor: string[];
    borderColor: string[];
  } {
    const colors = [
      { bg: 'rgba(251, 191, 36, 0.7)', border: 'rgb(251, 191, 36)' },
      { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },
      { bg: 'rgba(217, 119, 6, 0.7)', border: 'rgb(217, 119, 6)' },
      { bg: 'rgba(180, 83, 9, 0.7)', border: 'rgb(180, 83, 9)' },
      { bg: 'rgba(146, 64, 14, 0.7)', border: 'rgb(146, 64, 14)' },
      { bg: 'rgba(252, 211, 77, 0.7)', border: 'rgb(252, 211, 77)' },
      { bg: 'rgba(253, 230, 138, 0.7)', border: 'rgb(253, 230, 138)' },
    ];

    const backgroundColor: string[] = [];
    const borderColor: string[] = [];

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      backgroundColor.push(color.bg);
      borderColor.push(color.border);
    }

    return { backgroundColor, borderColor };
  }

  public getAgeCount(rangeKey: string): number {
    const distribution = this.state.ageDistribution();
    return (distribution as any)[rangeKey] || 0;
  }

  public getAgePercentage(rangeKey: string): number {
    const total = this.state.headCount();
    if (total === 0) return 0;
    return Math.round((this.getAgeCount(rangeKey) / total) * 100);
  }
}
