import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

@Component({
  selector: 'pt-financial-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, KpiCardComponent],
  template: `
    <div class="section-content">
      <div class="kpi-grid">
        <!-- Monthly Payroll -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-money-bill"
          label="Planilla Mensual"
          [value]="state.monthlyBudget() | currency : '$' : 'symbol' : '1.0-0'"
          sublabel="Costo mensual"
        ></pt-kpi-card>

        <!-- Annual Payroll -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-calendar"
          label="Planilla Anual"
          [value]="
            state.monthlyBudget() * 12 | currency : '$' : 'symbol' : '1.0-0'
          "
          sublabel="Proyección anual"
        ></pt-kpi-card>

        <!-- Average Salary -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-dollar"
          label="Promedio Salarial"
          [value]="state.averageSalary() | currency : '$' : 'symbol' : '1.0-0'"
          sublabel="Salario promedio"
        ></pt-kpi-card>

        <!-- People Efficiency Ratio -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-chart-line"
          label="People Efficiency Ratio"
          [value]="
            state.peopleEfficiencyRatio() | currency : '$' : 'symbol' : '1.0-0'
          "
          sublabel="Ingresos por empleado"
        ></pt-kpi-card>

        <!-- Estimated Revenue -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-arrow-up"
          label="Ingresos Estimados"
          [value]="
            state.peopleEfficiencyRatio() * state.headCount()
              | currency : '$' : 'symbol' : '1.0-0'
          "
          sublabel="Ingresos mensuales"
        ></pt-kpi-card>

        <!-- Debt -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-exclamation-triangle"
          label="Empleados con Deudas"
          value=""
          class="debt-card"
        >
          <div value class="kpi-value-split">
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
        </pt-kpi-card>
      </div>
    </div>
  `,
  styles: [
    `
      .section-content {
        padding: 0;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .kpi-value-split {
        display: flex;
        gap: 2rem;
      }

      .value-lg {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
      }

      .value-label {
        font-size: 0.75rem;
        color: #9ca3af;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialSectionComponent {
  state = inject(DashboardStore);
}
