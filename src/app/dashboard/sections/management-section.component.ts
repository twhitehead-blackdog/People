import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
  selector: 'app-management-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="section-content">
      <div class="kpi-grid">
        <!-- Contrataciones y Crecimiento -->
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-user-plus"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Nuevos este Mes</div>
            <div class="kpi-value">{{ state.newEmployeesThisMonth() }}</div>
            <div class="kpi-sublabel">
              Tasa: {{ state.monthlyHiringRate() }}%
            </div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-arrow-up"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Tasa de Crecimiento</div>
            <div class="kpi-value">{{ state.growthRate() }}%</div>
            <div class="kpi-sublabel">Crecimiento mensual</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-clock"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">En Período de Prueba</div>
            <div class="kpi-value">{{ state.probatoryEmployees() }}</div>
            <div class="kpi-sublabel">Menos de 3 meses</div>
          </div>
        </div>

        <!-- Rotación y Retención -->
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-refresh"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Rotación Mensual</div>
            <div class="kpi-value">{{ state.monthlyTurnover() }}%</div>
            <div class="kpi-sublabel">Bajas este mes</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-chart-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Rotación Anual</div>
            <div class="kpi-value">{{ state.annualTurnover() }}%</div>
            <div class="kpi-sublabel">Últimos 12 meses</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-shield"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Tasa de Retención</div>
            <div class="kpi-value">{{ state.retentionRate() }}%</div>
            <div class="kpi-sublabel">Empleados retenidos</div>
          </div>
        </div>

        <!-- Antigüedad y Estabilidad -->
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-calendar"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Antigüedad Promedio</div>
            <div class="kpi-value">{{ state.averageTenure() }}</div>
            <div class="kpi-sublabel">Años de experiencia</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-star"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Aniversarios Próximos</div>
            <div class="kpi-value">
              {{ state.upcomingAnniversaries().length }}
            </div>
            <div class="kpi-sublabel">Próximos 30 días</div>
          </div>
        </div>

        <!-- Ausentismo y Licencias -->
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Ausentismo Mensual</div>
            <div class="kpi-value">{{ state.monthlyAbsenteeism() }}%</div>
            <div class="kpi-sublabel">Tasa de ausencias</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon female">
            <i class="pi pi-heart"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Mujeres en Licencia</div>
            <div class="kpi-value">{{ state.womenOnLeave() }}</div>
            <div class="kpi-sublabel">Licencias activas</div>
          </div>
        </div>

        <!-- Costos y Eficiencia -->
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-dollar"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Costo por Empleado</div>
            <div class="kpi-value">
              {{ state.costPerEmployee() | currency : '$' : 'symbol' : '1.0-0' }}
            </div>
            <div class="kpi-sublabel">Costo promedio mensual</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-chart-bar"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Ratio de Eficiencia</div>
            <div class="kpi-value">{{ state.peopleEfficiencyRatio() }}%</div>
            <div class="kpi-sublabel">Eficiencia del personal</div>
          </div>
        </div>

        <!-- Deudas y Finanzas -->
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-credit-card"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Empleados con Deudas</div>
            <div class="kpi-value">{{ state.employeesWithDebts() }}</div>
            <div class="kpi-sublabel">
              Total:
              {{
                state.totalDebtAmount() | currency : '$' : 'symbol' : '1.0-0'
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementSectionComponent {
  public state = inject(DashboardStore);
}
