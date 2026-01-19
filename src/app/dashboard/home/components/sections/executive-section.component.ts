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
        class="retention-card"
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
        class="tenure-card"
        tooltip="Calcula el promedio de años de antigüedad de los empleados activos."
      ></pt-kpi-card>

      <!-- Average Age -->
      <pt-kpi-card
        icon="pi pi-calendar"
        label="Edad Promedio"
        [value]="state.averageAge()"
        sublabel="Años promedio"
        class="age-card"
        tooltip="Calcula la edad promedio de todos los empleados activos."
      ></pt-kpi-card>

      <!-- Average Salary -->
      <pt-kpi-card
        variant="financial"
        icon="pi pi-dollar"
        label="Salario Promedio"
        [value]="state.averageSalary() | currency : '$' : 'symbol' : '1.0-0'"
        sublabel="Salario promedio"
        class="salary-card"
        tooltip="Calcula el salario mensual promedio de todos los empleados activos."
      ></pt-kpi-card>

      <!-- Work Climate -->
      <pt-kpi-card
        icon="pi pi-users"
        label="Índice de Clima Laboral"
        [value]="workClimateIndex() + '%'"
        sublabel="Satisfacción general"
        class="climate-card"
        tooltip="Indicador compuesto que mide el clima laboral."
      ></pt-kpi-card>

      <!-- Schedule Compliance -->
      <pt-kpi-card
        icon="pi pi-check-circle"
        label="Índice de Cumplimiento"
        [value]="scheduleComplianceIndex() + '%'"
        sublabel="Cumplimiento mensual"
        class="compliance-card"
        tooltip="Mide el porcentaje de cumplimiento de horarios en el mes actual."
      ></pt-kpi-card>
    </div>
  `,
  styleUrls: ['./executive-section.component.scss'],
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
