import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
  selector: 'app-financial-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="section-content">
      <div class="kpi-grid">
        <div class="kpi-card financial">
          <div class="kpi-icon">
            <i class="pi pi-money-bill"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Planilla Mensual</div>
            <div class="kpi-value">
              {{ state.monthlyBudget() | currency : '$' : 'symbol' : '1.0-0' }}
            </div>
            <div class="kpi-sublabel">Costo mensual</div>
          </div>
        </div>
        <div class="kpi-card financial">
          <div class="kpi-icon">
            <i class="pi pi-calendar"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Planilla Anual</div>
            <div class="kpi-value">
              {{
                state.monthlyBudget() * 12 | currency : '$' : 'symbol' : '1.0-0'
              }}
            </div>
            <div class="kpi-sublabel">Proyección anual</div>
          </div>
        </div>
        <div class="kpi-card financial">
          <div class="kpi-icon">
            <i class="pi pi-dollar"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Promedio Salarial</div>
            <div class="kpi-value">
              {{ state.averageSalary() | currency : '$' : 'symbol' : '1.0-0' }}
            </div>
            <div class="kpi-sublabel">Salario promedio</div>
          </div>
        </div>
        <div class="kpi-card financial">
          <div class="kpi-icon">
            <i class="pi pi-chart-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">People Efficiency Ratio</div>
            <div class="kpi-value">
              {{
                state.peopleEfficiencyRatio()
                  | currency : '$' : 'symbol' : '1.0-0'
              }}
            </div>
            <div class="kpi-sublabel">Ingresos por empleado</div>
          </div>
        </div>
        <div class="kpi-card financial">
          <div class="kpi-icon">
            <i class="pi pi-arrow-up"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Ingresos Estimados</div>
            <div class="kpi-value">
              {{
                state.peopleEfficiencyRatio() * state.headCount()
                  | currency : '$' : 'symbol' : '1.0-0'
              }}
            </div>
            <div class="kpi-sublabel">Ingresos mensuales</div>
          </div>
        </div>
        <div class="kpi-card financial">
          <div class="kpi-icon">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Empleados con Deudas</div>
            <div class="kpi-value-split">
              <div>
                <span class="value-lg">{{ state.employeesWithDebts() }}</span>
                <span class="value-label">Empleados</span>
              </div>
              <div>
                <span class="value-lg">{{
                  state.totalDebtAmount() | currency : '$' : 'symbol' : '1.0-0'
                }}</span>
                <span class="value-label">Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialSectionComponent {
  public state = inject(DashboardStore);
}
