import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

@Component({
  selector: 'pt-executive-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, BaseChartDirective, KpiCardComponent],
  template: `
    <div class="kpi-grid executive-kpi-grid">
      <!-- Headcount Card -->
      <pt-kpi-card
        icon="pi pi-users"
        label="TOTAL COLABORADORES"
        [value]="state.headCount()"
        sublabel="Empleados activos"
        class="headcount-card"
        tooltip="Muestra el número total de empleados activos en la empresa."
      >
        <div extra class="sparkline-box">
          <div class="kpi-sparkline">
            <canvas
              baseChart
              [type]="'line'"
              [data]="headcountChartData()"
              [options]="headcountChartOptions()"
            ></canvas>
          </div>
        </div>
      </pt-kpi-card>

      <!-- Gender Distribution -->
      <pt-kpi-card
        icon="pi pi-id-card"
        label="Distribución por Género"
        value=""
        class="gender-vs-card"
        tooltip="Muestra la distribución porcentual de empleados por género."
      >
        <div value class="gender-chart-container">
          <div class="gender-chart-wrapper">
            <canvas
              baseChart
              [type]="'doughnut'"
              [data]="genderChartData()"
              [options]="genderChartOptions()"
              class="gender-chart-canvas"
            ></canvas>
            <div class="gender-center-icons">
              <i class="pi pi-user male-center-icon"></i>
              <i class="pi pi-user female-center-icon"></i>
            </div>
          </div>

          <div class="gender-legend">
            <div class="legend-item">
              <span class="legend-label">Masculino</span>
              <span class="legend-value"
                >{{ genderCounts().male }} ({{
                  genderPercentages().male
                }}%)</span
              >
            </div>
            <div class="legend-item">
              <span class="legend-label">Femenino</span>
              <span class="legend-value"
                >{{ genderCounts().female }} ({{
                  genderPercentages().female
                }}%)</span
              >
            </div>
          </div>
        </div>
      </pt-kpi-card>

      <!-- Lates Card -->
      <pt-kpi-card
        icon="pi pi-clock"
        label="Tardanzas del Mes"
        [value]="monthlyLates()"
        sublabel="Llegadas tarde"
        class="lates-card"
        tooltip="Cuenta el número total de tardanzas registradas en el mes actual."
      >
        <div extra class="sparkline-box">
          <div class="kpi-sparkline">
            <canvas
              baseChart
              [type]="'line'"
              [data]="latesDailyChartData()"
              [options]="latesChartOptions()"
            ></canvas>
          </div>
        </div>
      </pt-kpi-card>

      <!-- Top Lates -->
      <pt-kpi-card
        icon="pi pi-exclamation-triangle"
        label="Top Tardanzas"
        [value]="topLatesCount()"
        [sublabel]="topLatesEmployeeName()"
        class="top-lates-card"
        [clickable]="true"
        (cardClick)="openTopLates.emit()"
        tooltip="Muestra el top de empleados con más tardanzas en el mes actual."
      ></pt-kpi-card>

      <!-- Top Absences -->
      <pt-kpi-card
        icon="pi pi-ban"
        label="Top Ausencias"
        [value]="topAbsencesCount()"
        [sublabel]="topAbsencesEmployeeName()"
        class="top-absences-card"
        [clickable]="true"
        (cardClick)="openTopAbsences.emit()"
        tooltip="Muestra el top de empleados con más ausencias en el mes actual."
      ></pt-kpi-card>

      <!-- Hires vs Exits -->
      <pt-kpi-card
        icon="pi pi-user-plus"
        label="Ingresos y Salida del Personal"
        value=""
        class="hires-exits-vs-card"
        [clickable]="true"
        (cardClick)="openHiresExits.emit()"
        tooltip="Muestra el movimiento de personal del mes actual."
      >
        <div value class="hires-exits-chart-container">
          <div class="hires-exits-chart-wrapper">
            <canvas
              baseChart
              [type]="'doughnut'"
              [data]="hiresExitsChartData()"
              [options]="hiresExitsChartOptions()"
              class="hires-exits-chart-canvas"
            ></canvas>
            <div class="hires-exits-center-icons">
              <i class="pi pi-arrow-down hires-center-icon"></i>
              <i class="pi pi-arrow-up exits-center-icon"></i>
            </div>
          </div>

          <div class="hires-exits-legend">
            <div class="legend-item">
              <span class="legend-label">Ingresos</span>
              <span class="legend-value">{{ hiresExitsCounts().hires }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-label">Salidas</span>
              <span class="legend-value">{{ hiresExitsCounts().exits }}</span>
            </div>
          </div>
        </div>
      </pt-kpi-card>

      <!-- Retention Rate -->
      <pt-kpi-card
        icon="pi pi-heart"
        label="Tasa de Retención"
        [value]="state.retentionRate() + '%'"
        sublabel="Retención anual"
        tooltip="Mide el porcentaje de empleados que permanecen en la empresa después de 12 meses."
      ></pt-kpi-card>

      <!-- Birthdays -->
      <pt-kpi-card
        icon="pi pi-crown"
        label="Cumpleañeros del Mes"
        [value]="monthlyBirthdaysCount()"
        sublabel="Celebraciones este mes"
        class="birthdays-card"
        [clickable]="true"
        (cardClick)="openBirthdays.emit()"
        tooltip="Muestra el número de empleados que cumplen años en el mes actual."
      ></pt-kpi-card>

      <!-- Payroll Cost Compact -->
      <pt-kpi-card
        variant="financial"
        icon="pi pi-money-bill"
        label="Costo de Planilla"
        value=""
        class="payroll-cost-compact"
        tooltip="Muestra el costo total de la planilla de empleados."
      >
        <div value class="kpi-value-stacked">
          <div class="value-item">
            <span class="value-lg">{{
              state.monthlyBudget() | currency : '$' : 'symbol' : '1.0-0'
            }}</span>
            <span class="value-label">Mensual</span>
          </div>
          <div class="value-item">
            <span class="value-lg">{{
              state.monthlyBudget() * 12 | currency : '$' : 'symbol' : '1.0-0'
            }}</span>
            <span class="value-label">Anual</span>
          </div>
        </div>
      </pt-kpi-card>

      <!-- Average Tenure -->
      <pt-kpi-card
        icon="pi pi-calendar-clock"
        label="Antigüedad Promedio"
        [value]="state.averageTenure()"
        sublabel="Años de experiencia"
        tooltip="Calcula el promedio de años de antigüedad de los empleados activos."
      ></pt-kpi-card>

      <!-- Average Age -->
      <pt-kpi-card
        icon="pi pi-calendar"
        label="Edad Promedio"
        [value]="state.averageAge()"
        sublabel="Años promedio"
        tooltip="Calcula la edad promedio de todos los empleados activos."
      ></pt-kpi-card>

      <!-- Average Salary -->
      <pt-kpi-card
        variant="financial"
        icon="pi pi-dollar"
        label="Salario Promedio"
        [value]="state.averageSalary() | currency : '$' : 'symbol' : '1.0-0'"
        sublabel="Salario promedio"
        tooltip="Calcula el salario mensual promedio de todos los empleados activos."
      ></pt-kpi-card>

      <!-- Work Climate -->
      <pt-kpi-card
        icon="pi pi-users"
        label="Índice de Clima Laboral"
        [value]="workClimateIndex() + '%'"
        sublabel="Satisfacción general"
        tooltip="Indicador compuesto que mide el clima laboral."
      ></pt-kpi-card>

      <!-- Schedule Compliance -->
      <pt-kpi-card
        icon="pi pi-check-circle"
        label="Índice de Cumplimiento"
        [value]="scheduleComplianceIndex() + '%'"
        sublabel="Cumplimiento mensual"
        tooltip="Mide el porcentaje de cumplimiento de horarios en el mes actual."
      ></pt-kpi-card>
    </div>
  `,
  styles: [
    `
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      /* Executive Section Specifics */
      .executive-kpi-grid {
        /* First row - large cards */
        .headcount-card,
        .gender-vs-card {
          grid-column: span 2;
          @media (max-width: 1400px) {
            grid-column: span 1;
          }
        }

        .lates-card {
          grid-column: span 2;
          @media (max-width: 1400px) {
            grid-column: span 1;
          }
        }
      }

      /* Sparkline & Charts helpers */
      .sparkline-box {
        height: 60px;
        width: 100%;
        margin-top: 0.5rem;
      }

      .kpi-sparkline {
        height: 100%;
        width: 100%;
      }

      /* Gender Chart */
      .gender-chart-container {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        width: 100%;
      }

      .gender-chart-wrapper {
        position: relative;
        height: 100px;
        width: 200px;
        flex-shrink: 0;
      }

      .gender-center-icons {
        position: absolute;
        top: 60%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        gap: 1rem;
        pointer-events: none;

        i {
          font-size: 1.25rem;
          opacity: 0.8;
        }

        .male-center-icon {
          color: #60a5fa;
        }
        .female-center-icon {
          color: #f472b6;
        }
      }

      .gender-legend {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      /* Hires Exits Chart */
      .hires-exits-chart-container {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        width: 100%;
      }

      .hires-exits-chart-wrapper {
        position: relative;
        height: 100px;
        width: 200px;
        flex-shrink: 0;
      }

      .hires-exits-center-icons {
        position: absolute;
        top: 60%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        gap: 1rem;
        pointer-events: none;

        i {
          font-size: 1.25rem;
          opacity: 0.8;
        }

        .hires-center-icon {
          color: #34d399;
        }
        .exits-center-icon {
          color: #f87171;
        }
      }

      .hires-exits-legend {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .legend-item {
        display: flex;
        flex-direction: column;
      }

      .legend-label {
        font-size: 0.75rem;
        color: #a1a1aa;
      }

      .legend-value {
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        font-family: 'Segoe UI', sans-serif;
      }

      /* Stacked Value */
      .kpi-value-stacked {
        display: flex;
        gap: 1.5rem;
      }

      .value-item {
        display: flex;
        flex-direction: column;
      }

      .value-lg {
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
      }

      .value-label {
        font-size: 0.75rem;
        color: #71717a;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutiveSectionComponent {
  state = inject(DashboardStore);

  // Data Inputs
  headcountChartData = input.required<any>();
  headcountChartOptions = input.required<any>();

  genderChartData = input.required<any>();
  genderChartOptions = input.required<any>();
  genderCounts = input.required<{ male: number; female: number }>();
  genderPercentages = input.required<{ male: number; female: number }>();

  monthlyLates = input.required<number>();
  latesDailyChartData = input.required<any>();
  latesChartOptions = input.required<any>();

  topLatesCount = input.required<number>();
  topLatesEmployeeName = input.required<string>();

  topAbsencesCount = input.required<number>();
  topAbsencesEmployeeName = input.required<string>();

  monthlyBirthdaysCount = input.required<number>();

  hiresExitsChartData = input.required<any>();
  hiresExitsChartOptions = input.required<any>();
  hiresExitsCounts = input.required<{ hires: number; exits: number }>();

  workClimateIndex = input.required<number>();
  scheduleComplianceIndex = input.required<number>();

  // Outputs (Dialog triggers)
  openTopLates = output<void>();
  openTopAbsences = output<void>();
  openHiresExits = output<void>();
  openBirthdays = output<void>();
}
