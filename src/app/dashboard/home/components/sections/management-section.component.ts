import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

@Component({
  selector: 'pt-management-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, KpiCardComponent],
  template: `
    <div class="section-content">
      <div class="kpi-grid">
        <!-- Contrataciones y Crecimiento -->
        <pt-kpi-card
          icon="pi pi-user-plus"
          label="Nuevos este Mes"
          [value]="state.newEmployeesThisMonth()"
          class="management-card"
        >
          <div sublabel>Tasa: {{ state.monthlyHiringRate() }}%</div>
        </pt-kpi-card>

        <pt-kpi-card
          icon="pi pi-arrow-up"
          label="Tasa de Crecimiento"
          [value]="state.growthRate() + '%'"
          sublabel="Crecimiento mensual"
          class="management-card"
        ></pt-kpi-card>

        <pt-kpi-card
          icon="pi pi-clock"
          label="En Período de Prueba"
          [value]="state.probatoryEmployees()"
          sublabel="Menos de 3 meses"
          class="management-card"
        ></pt-kpi-card>

        <!-- Rotación y Retención -->
        <pt-kpi-card
          icon="pi pi-refresh"
          label="Rotación Mensual"
          [value]="state.monthlyTurnover() + '%'"
          sublabel="Bajas este mes"
          class="management-card"
        ></pt-kpi-card>

        <pt-kpi-card
          icon="pi pi-chart-line"
          label="Rotación Anual"
          [value]="state.annualTurnover() + '%'"
          sublabel="Últimos 12 meses"
          class="management-card"
        ></pt-kpi-card>

        <pt-kpi-card
          icon="pi pi-shield"
          label="Tasa de Retención"
          [value]="state.retentionRate() + '%'"
          sublabel="Empleados retenidos"
          class="management-card"
        ></pt-kpi-card>

        <!-- Antigüedad y Estabilidad -->
        <pt-kpi-card
          icon="pi pi-calendar"
          label="Antigüedad Promedio"
          [value]="state.averageTenure()"
          sublabel="Años de experiencia"
          class="management-card"
        ></pt-kpi-card>

        <pt-kpi-card
          icon="pi pi-star"
          label="Aniversarios Próximos"
          [value]="state.upcomingAnniversaries().length"
          sublabel="Próximos 30 días"
          class="management-card"
        ></pt-kpi-card>

        <!-- Ausentismo y Licencias -->
        <pt-kpi-card
          icon="pi pi-exclamation-triangle"
          label="Ausentismo Mensual"
          [value]="state.monthlyAbsenteeism() + '%'"
          sublabel="Tasa de ausencias"
          class="management-card"
        ></pt-kpi-card>

        <pt-kpi-card
          icon="pi pi-heart"
          label="Mujeres en Licencia"
          [value]="state.womenOnLeave()"
          sublabel="Licencias activas"
          class="management-card"
        >
          <!-- Custom icon color override -->
          <style>
            :host ::ng-deep .management-card .pi-heart {
              color: #f472b6 !important;
            }
          </style>
        </pt-kpi-card>

        <!-- Costos y Eficiencia -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-dollar"
          label="Costo por Empleado"
          [value]="
            state.costPerEmployee() | currency : '$' : 'symbol' : '1.0-0'
          "
          sublabel="Costo promedio mensual"
          class="management-card"
        ></pt-kpi-card>

        <pt-kpi-card
          variant="financial"
          icon="pi pi-chart-bar"
          label="Ratio de Eficiencia"
          [value]="state.peopleEfficiencyRatio() + '%'"
          sublabel="Eficiencia del personal"
          class="management-card"
        ></pt-kpi-card>

        <!-- Deudas -->
        <pt-kpi-card
          variant="financial"
          icon="pi pi-credit-card"
          label="Empleados con Deudas"
          [value]="state.employeesWithDebts()"
          class="management-card"
        >
          <div sublabel>
            Total:
            {{ state.totalDebtAmount() | currency : '$' : 'symbol' : '1.0-0' }}
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementSectionComponent {
  state = inject(DashboardStore);
}
