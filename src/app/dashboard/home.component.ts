import { CommonModule, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  differenceInMinutes,
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
  eachMonthOfInterval,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns';
import { BaseChartDirective } from 'ng2-charts';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-home',
  standalone: true,
  imports: [
    BaseChartDirective,
    CardModule,
    CommonModule,
    CurrencyPipe,
    TitleCasePipe,
    DialogModule,
    TooltipModule,
  ],
  template: `
    <div class="dashboard-wrapper">
      <!-- Sidebar Navigation -->
      <aside class="dashboard-sidebar" [class.collapsed]="!sidebarOpen()">
        <div class="sidebar-header">
          <h3 [class.hidden]="!sidebarOpen()">Navegación</h3>
          <button
            class="sidebar-toggle"
            (click)="toggleSidebar()"
            [title]="sidebarOpen() ? 'Cerrar menú' : 'Abrir menú'"
          >
            <i
              [class]="sidebarOpen() ? 'pi pi-angle-left' : 'pi pi-angle-right'"
            ></i>
          </button>
        </div>
        <nav class="sidebar-nav">
          <button
            class="nav-item"
            [class.active]="activeSection() === 'executive'"
            (click)="selectSection('executive')"
            [title]="'Resumen'"
          >
            <i class="pi pi-chart-line"></i>
            <span [class.hidden]="!sidebarOpen()">Resumen</span>
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'financial'"
            (click)="selectSection('financial')"
            [title]="'Indicadores Financieros'"
          >
            <i class="pi pi-money-bill"></i>
            <span [class.hidden]="!sidebarOpen()">Indicadores Financieros</span>
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'management'"
            (click)="selectSection('management')"
            [title]="'Gestión de Personal'"
          >
            <i class="pi pi-user-plus"></i>
            <span [class.hidden]="!sidebarOpen()">Gestión de Personal</span>
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'structure'"
            (click)="selectSection('structure')"
            [title]="'Estructura Organizacional'"
          >
            <i class="pi pi-building"></i>
            <span [class.hidden]="!sidebarOpen()"
              >Estructura Organizacional</span
            >
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'charts'"
            (click)="selectSection('charts')"
            [title]="'Gráficos y Distribuciones'"
          >
            <i class="pi pi-chart-bar"></i>
            <span [class.hidden]="!sidebarOpen()"
              >Gráficos y Distribuciones</span
            >
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'events'"
            (click)="selectSection('events')"
            [title]="'Eventos y Celebraciones'"
          >
            <i class="pi pi-calendar"></i>
            <span [class.hidden]="!sidebarOpen()">Eventos y Celebraciones</span>
          </button>
        </nav>
      </aside>

      <main class="dashboard-container">
        <!-- Resumen Ejecutivo -->
        @if (activeSection() === 'executive') {
        <div class="section-content executive-section">
          <div class="kpi-grid executive-kpi-grid">
            <div
              class="kpi-card headcount-card"
              pTooltip="Muestra el número total de empleados activos en la empresa. Se calcula contando todos los empleados con estado 'is_active = true'. El gráfico muestra la tendencia histórica del número de empleados."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-users"></i>
              </div>
              <div class="kpi-content">
                <div class="headcount-header">
                  <div class="kpi-label">TOTAL COLABORADORES</div>
                  <div class="kpi-value">{{ state.headCount() }}</div>
                  <div class="kpi-sublabel">Empleados activos</div>
                </div>

                <!-- Mini trend chart -->
                <div class="sparkline-box">
                  <div class="kpi-sparkline">
                    <canvas
                      baseChart
                      [type]="'line'"
                      [data]="headcountChartData()"
                      [options]="headcountChartOptions"
                    ></canvas>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="kpi-card gender-vs-card"
              pTooltip="Muestra la distribución porcentual de empleados por género (masculino y femenino). El cálculo se basa en el campo 'gender' de cada empleado activo. El arco visual representa la proporción de cada género en la plantilla total."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-id-card"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Distribución por Género</div>
                <div class="gender-chart-container">
                  <div class="gender-chart-wrapper">
                    <canvas
                      baseChart
                      [type]="'doughnut'"
                      [data]="genderChartData()"
                      [options]="genderChartOptions"
                      class="gender-chart-canvas"
                    ></canvas>

                    <!-- Center icons inside the arc -->
                    <div class="gender-center-icons">
                      <i class="pi pi-user male-center-icon"></i>
                      <i class="pi pi-user female-center-icon"></i>
                    </div>
                  </div>

                  <div class="gender-legend">
                    <div class="legend-item">
                      <span class="legend-label">Masculino</span>
                      <span class="legend-value"
                        >{{ getGenderCount('M') }} ({{
                          getGenderPercentage('M')
                        }}%)</span
                      >
                    </div>
                    <div class="legend-item">
                      <span class="legend-label">Femenino</span>
                      <span class="legend-value"
                        >{{ getGenderCount('F') }} ({{
                          getGenderPercentage('F')
                        }}%)</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="kpi-card lates-card">
              <div
                class="kpi-icon"
                pTooltip="Cuenta el número total de tardanzas registradas en el mes actual. Una tardanza se considera cuando un empleado marca su entrada después de la hora programada según su horario asignado. El gráfico muestra la distribución diaria de tardanzas. Haz clic en el gráfico para ver detalles por fecha."
                tooltipPosition="top"
              >
                <i class="pi pi-clock"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Tardanzas del Mes</div>
                <div class="kpi-value">{{ getMonthlyLates() }}</div>
                <div class="kpi-sublabel">Llegadas tarde</div>
                <div class="sparkline-box">
                  <div class="kpi-sparkline">
                    <canvas
                      baseChart
                      [type]="'line'"
                      [data]="latesDailyChartData()"
                      [options]="latesChartOptions"
                    ></canvas>
                  </div>
                </div>
              </div>
            </div>
            <!-- Segunda fila: Movimientos del personal -->
            <div
              class="kpi-card hires-exits-vs-card kpi-card-clickable"
              pTooltip="Muestra el movimiento de personal del mes actual. Los ingresos son empleados que empezaron a trabajar este mes (basado en start_date). Las salidas son empleados que fueron terminados este mes (basado en la tabla terminations). Haz clic para ver la lista completa."
              tooltipPosition="top"
              (click)="openHiresExitsDialog()"
            >
              <div class="kpi-icon">
                <i class="pi pi-user-plus"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Ingresos y Salida del Personal</div>
                <div class="hires-exits-chart-container">
                  <div class="hires-exits-chart-wrapper">
                    <canvas
                      baseChart
                      [type]="'doughnut'"
                      [data]="hiresExitsChartData()"
                      [options]="hiresExitsChartOptions"
                      class="hires-exits-chart-canvas"
                    ></canvas>

                    <!-- Center icons inside the arc -->
                    <div class="hires-exits-center-icons">
                      <i class="pi pi-arrow-down hires-center-icon"></i>
                      <i class="pi pi-arrow-up exits-center-icon"></i>
                    </div>
                  </div>

                  <div class="hires-exits-legend">
                    <div class="legend-item">
                      <span class="legend-label">Ingresos</span>
                      <span class="legend-value">{{
                        getHiresExitsCount('hires')
                      }}</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-label">Salidas</span>
                      <span class="legend-value">{{
                        getHiresExitsCount('exits')
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="kpi-card"
              pTooltip="Mide el porcentaje de empleados que permanecen en la empresa después de 12 meses. Se calcula dividiendo los empleados que estaban activos hace 12 meses y siguen activos actualmente, entre el total de empleados que estaban activos hace 12 meses (incluyendo los que fueron terminados). Fórmula: (Empleados que siguen activos / Empleados al inicio del período) × 100."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-heart"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Tasa de Retención</div>
                <div class="kpi-value">{{ state.retentionRate() }}%</div>
                <div class="kpi-sublabel">Retención anual</div>
              </div>
            </div>
            <div
              class="kpi-card kpi-card-clickable birthdays-card"
              pTooltip="Muestra el número de empleados que cumplen años en el mes actual. Haz clic para ver la lista completa de cumpleañeros."
              tooltipPosition="top"
              (click)="openBirthdaysDialog()"
            >
              <div class="kpi-icon">
                <i class="pi pi-crown"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Cumpleañeros del Mes</div>
                <div class="kpi-value">{{ monthlyBirthdaysCount() }}</div>
                <div class="kpi-sublabel">Celebraciones este mes</div>
              </div>
            </div>
            <div
              class="kpi-card financial payroll-cost-compact"
              pTooltip="Muestra el costo total de la planilla de empleados. El costo mensual se calcula sumando el salario mensual (monthly_salary) de todos los empleados activos. El costo anual es una proyección multiplicando el costo mensual por 12 meses. Solo incluye empleados con estado 'is_active = true'."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-money-bill"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Costo de Planilla</div>
                <div class="kpi-value-stacked">
                  <div class="value-item">
                    <span class="value-lg">{{
                      state.monthlyBudget()
                        | currency : '$' : 'symbol' : '1.0-0'
                    }}</span>
                    <span class="value-label">Mensual</span>
                  </div>
                  <div class="value-item">
                    <span class="value-lg">{{
                      state.monthlyBudget() * 12
                        | currency : '$' : 'symbol' : '1.0-0'
                    }}</span>
                    <span class="value-label">Anual</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Tercera fila: Perfil demográfico y estadístico -->
            <div
              class="kpi-card"
              pTooltip="Calcula el promedio de años de antigüedad de los empleados activos en la empresa. Se basa en la fecha de inicio (start_date) de cada empleado y calcula la diferencia en años desde esa fecha hasta la fecha actual. Solo incluye empleados con estado 'is_active = true'."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-calendar-clock"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Antigüedad Promedio</div>
                <div class="kpi-value">{{ state.averageTenure() }}</div>
                <div class="kpi-sublabel">Años de experiencia</div>
              </div>
            </div>
            <div
              class="kpi-card"
              pTooltip="Calcula la edad promedio de todos los empleados activos. Se basa en la fecha de nacimiento (birth_date) de cada empleado y calcula la diferencia en años desde esa fecha hasta la fecha actual. Solo incluye empleados con estado 'is_active = true' y que tengan una fecha de nacimiento registrada."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-calendar"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Edad Promedio</div>
                <div class="kpi-value">{{ state.averageAge() }}</div>
                <div class="kpi-sublabel">Años promedio</div>
              </div>
            </div>
            <div
              class="kpi-card financial"
              pTooltip="Calcula el salario mensual promedio de todos los empleados activos. Se obtiene sumando todos los salarios mensuales (monthly_salary) y dividiendo entre el número total de empleados activos. Solo incluye empleados con estado 'is_active = true'."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-dollar"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Salario Promedio</div>
                <div class="kpi-value">
                  {{
                    state.averageSalary() | currency : '$' : 'symbol' : '1.0-0'
                  }}
                </div>
                <div class="kpi-sublabel">Salario promedio</div>
              </div>
            </div>
            <!-- Cuarta fila: Cultura y cumplimiento -->
            <div
              class="kpi-card"
              pTooltip="Indicador compuesto que mide el clima laboral basado en varios factores como tasa de retención, ausentismo, cumplimiento de horarios y otros indicadores de satisfacción. Se calcula como un promedio ponderado de estos factores. Un valor alto indica un buen ambiente laboral y satisfacción de los empleados."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-users"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Índice de Clima Laboral</div>
                <div class="kpi-value">{{ getWorkClimateIndex() }}%</div>
                <div class="kpi-sublabel">Satisfacción general</div>
              </div>
            </div>
            <div
              class="kpi-card"
              pTooltip="Mide el porcentaje de cumplimiento de horarios en el mes actual. Compara las horas trabajadas reales con las horas programadas según los horarios asignados a cada empleado. Se calcula basándose en los registros de asistencia (timelogs) y los horarios asignados (employee_schedules). Un valor alto indica buen cumplimiento de horarios."
              tooltipPosition="top"
            >
              <div class="kpi-icon">
                <i class="pi pi-check-circle"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Índice de Cumplimiento de Horario</div>
                <div class="kpi-value">{{ getScheduleComplianceIndex() }}%</div>
                <div class="kpi-sublabel">Cumplimiento mensual</div>
              </div>
            </div>
          </div>
          <!-- Dialog for lates details -->
          <p-dialog
            [visible]="lateDialogVisible()"
            (visibleChange)="lateDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '600px' }"
            [header]="lateDialogTitle()"
            styleClass="late-details-dialog lates-dialog"
          >
            <div
              class="flex flex-col gap-0"
              style="padding: 1.5rem 2rem; min-height: 100px;"
            >
              <div
                class="text-sm text-gray-300 text-center py-4"
                *ngIf="lateDialogDetails().length === 0"
              >
                No hay tardanzas registradas en esta fecha.
              </div>
              <ul
                class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
                *ngIf="lateDialogDetails().length > 0"
              >
                <li
                  class="lates-list-item"
                  *ngFor="let d of lateDialogDetails()"
                >
                  <div class="lates-item-content">
                    <div
                      class="lates-icon-box"
                      [class.late-severe]="d.minutesLate && d.minutesLate > 10"
                      [class.late-moderate]="
                        d.minutesLate && d.minutesLate <= 10
                      "
                    >
                      <i
                        class="pi"
                        [class.pi-clock]="d.minutesLate && d.minutesLate <= 10"
                        [class.pi-exclamation-triangle]="
                          d.minutesLate && d.minutesLate > 10
                        "
                      ></i>
                    </div>
                    <div class="lates-details">
                      <div class="lates-name-row">
                        <span class="lates-name">
                          {{ d.name || 'Sin nombre' }}
                        </span>
                      </div>
                      <div class="lates-info-row">
                        <span
                          class="lates-time-info"
                          *ngIf="
                            d.scheduledEntry &&
                            d.actualEntry &&
                            d.minutesLate !== undefined
                          "
                        >
                          <i class="pi pi-calendar-clock"></i>
                          {{ d.scheduledEntry }} → {{ d.actualEntry }}
                        </span>
                        <span
                          class="lates-time-info"
                          *ngIf="!d.scheduledEntry || !d.actualEntry"
                        >
                          <i class="pi pi-info-circle"></i>
                          Sin detalles de horario
                        </span>
                      </div>
                    </div>
                    <div class="lates-right-section">
                      <div
                        class="lates-delay-display"
                        [class.delay-severe]="
                          d.minutesLate && d.minutesLate > 10
                        "
                        [class.delay-moderate]="
                          d.minutesLate && d.minutesLate <= 10
                        "
                        *ngIf="d.minutesLate !== undefined"
                      >
                        {{ d.minutesLate }} min
                      </div>
                      <span
                        class="text-xs text-gray-400"
                        *ngIf="d.minutesLate === undefined"
                      >
                        -
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </p-dialog>
          <!-- Dialog for birthdays details -->
          <p-dialog
            [visible]="birthdaysDialogVisible()"
            (visibleChange)="birthdaysDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '600px' }"
            header="Cumpleañeros del Mes"
            styleClass="late-details-dialog birthdays-dialog"
          >
            <div
              class="flex flex-col gap-0"
              style="padding: 1.5rem 2rem; min-height: 100px;"
            >
              <div
                class="text-sm text-gray-300 text-center py-4"
                *ngIf="state.birthDates().length === 0"
              >
                No hay cumpleañeros este mes.
              </div>
              <ul
                class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
                *ngIf="state.birthDates().length > 0"
              >
                <li
                  class="birthday-list-item"
                  [class.birthday-today]="isBirthdayToday(birthday.birth_date)"
                  [class.birthday-passed]="
                    hasBirthdayPassed(birthday.birth_date)
                  "
                  *ngFor="let birthday of getSortedBirthdays()"
                >
                  <div class="birthday-item-content">
                    <div
                      class="birthday-icon-box"
                      [class.icon-today]="isBirthdayToday(birthday.birth_date)"
                      [class.icon-upcoming]="
                        !hasBirthdayPassed(birthday.birth_date) &&
                        !isBirthdayToday(birthday.birth_date)
                      "
                      [class.icon-passed]="
                        hasBirthdayPassed(birthday.birth_date)
                      "
                    >
                      <i
                        class="pi"
                        [class.pi-gift]="isBirthdayToday(birthday.birth_date)"
                        [class.pi-star]="
                          !hasBirthdayPassed(birthday.birth_date) &&
                          !isBirthdayToday(birthday.birth_date)
                        "
                        [class.pi-check-circle]="
                          hasBirthdayPassed(birthday.birth_date)
                        "
                      ></i>
                    </div>
                    <div class="birthday-details">
                      <div class="birthday-name-row">
                        <span class="birthday-name">
                          {{ birthday.first_name + ' ' + birthday.father_name }}
                        </span>
                      </div>
                      <div class="birthday-info-row">
                        <span class="birthday-branch">
                          <i class="pi pi-building"></i>
                          {{ birthday.branch?.name || 'Sin sucursal' }}
                        </span>
                      </div>
                    </div>
                    <div class="birthday-right-section">
                      <div class="birthday-date-display">
                        {{ getBirthdayDay(birthday.birth_date) }}
                        <span class="date-month">{{
                          getBirthdayMonth(birthday.birth_date)
                        }}</span>
                      </div>
                      <span
                        class="birthday-status-badge"
                        [class.status-today]="
                          isBirthdayToday(birthday.birth_date)
                        "
                        [class.status-upcoming]="
                          !hasBirthdayPassed(birthday.birth_date) &&
                          !isBirthdayToday(birthday.birth_date)
                        "
                        [class.status-passed]="
                          hasBirthdayPassed(birthday.birth_date)
                        "
                      >
                        <i
                          class="pi"
                          [class.pi-star-fill]="
                            isBirthdayToday(birthday.birth_date)
                          "
                          [class.pi-clock]="
                            !hasBirthdayPassed(birthday.birth_date) &&
                            !isBirthdayToday(birthday.birth_date)
                          "
                          [class.pi-check-circle]="
                            hasBirthdayPassed(birthday.birth_date)
                          "
                        ></i>
                        <span *ngIf="isBirthdayToday(birthday.birth_date)"
                          >¡HOY ES SU DÍA!</span
                        >
                        <span
                          *ngIf="
                            !hasBirthdayPassed(birthday.birth_date) &&
                            !isBirthdayToday(birthday.birth_date)
                          "
                          >Próximamente</span
                        >
                        <span *ngIf="hasBirthdayPassed(birthday.birth_date)"
                          >Ya Celebrado</span
                        >
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </p-dialog>
          <!-- Dialog for hires and exits details -->
          <p-dialog
            [visible]="hiresExitsDialogVisible()"
            (visibleChange)="hiresExitsDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '600px' }"
            header="Ingresos y Salidas del Personal"
            styleClass="late-details-dialog hires-exits-dialog"
          >
            <div
              class="flex flex-col gap-0"
              style="padding: 1.5rem 2rem; min-height: 100px;"
            >
              <!-- Tabs for Hires and Exits -->
              <div class="hires-exits-tabs">
                <button
                  class="tab-button"
                  [class.active]="hiresExitsTab() === 'hires'"
                  (click)="hiresExitsTab.set('hires')"
                >
                  <i class="pi pi-arrow-down"></i>
                  Ingresos ({{ monthlyHiresList().length }})
                </button>
                <button
                  class="tab-button"
                  [class.active]="hiresExitsTab() === 'exits'"
                  (click)="hiresExitsTab.set('exits')"
                >
                  <i class="pi pi-arrow-up"></i>
                  Salidas ({{ monthlyExitsList().length }})
                </button>
              </div>

              <!-- Hires List -->
              <div *ngIf="hiresExitsTab() === 'hires'">
                <div
                  class="text-sm text-gray-300 text-center py-4"
                  *ngIf="monthlyHiresList().length === 0"
                >
                  No hay ingresos este mes.
                </div>
                <ul
                  class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
                  *ngIf="monthlyHiresList().length > 0"
                >
                  <li
                    class="hires-exits-list-item"
                    *ngFor="let hire of monthlyHiresList()"
                  >
                    <div class="hires-exits-item-content">
                      <div class="hires-exits-icon-box icon-hire">
                        <i class="pi pi-user-plus"></i>
                      </div>
                      <div class="hires-exits-details">
                        <div class="hires-exits-name-row">
                          <span class="hires-exits-name">
                            {{ hire.first_name }} {{ hire.father_name }}
                          </span>
                        </div>
                        <div class="hires-exits-info-row">
                          <span class="hires-exits-branch">
                            <i class="pi pi-building"></i>
                            {{ hire.branch?.name || 'Sin sucursal' }}
                          </span>
                          <span
                            class="hires-exits-position"
                            *ngIf="hire.position"
                          >
                            <i class="pi pi-briefcase"></i>
                            {{ hire.position.name }}
                          </span>
                        </div>
                      </div>
                      <div class="hires-exits-right-section">
                        <div class="hires-exits-date-display">
                          {{ getHireDate(hire.start_date) }}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- Exits List -->
              <div *ngIf="hiresExitsTab() === 'exits'">
                <div
                  class="text-sm text-gray-300 text-center py-4"
                  *ngIf="monthlyExitsList().length === 0"
                >
                  No hay salidas este mes.
                </div>
                <ul
                  class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
                  *ngIf="monthlyExitsList().length > 0"
                >
                  <li
                    class="hires-exits-list-item"
                    *ngFor="let exit of monthlyExitsList()"
                  >
                    <div class="hires-exits-item-content">
                      <div class="hires-exits-icon-box icon-exit">
                        <i class="pi pi-user-minus"></i>
                      </div>
                      <div class="hires-exits-details">
                        <div class="hires-exits-name-row">
                          <span class="hires-exits-name">
                            {{ exit.employee?.first_name }}
                            {{ exit.employee?.father_name }}
                          </span>
                        </div>
                        <div class="hires-exits-info-row">
                          <span class="hires-exits-branch">
                            <i class="pi pi-building"></i>
                            {{ exit.employee?.branch?.name || 'Sin sucursal' }}
                          </span>
                          <span class="hires-exits-reason" *ngIf="exit.reason">
                            <i class="pi pi-info-circle"></i>
                            {{ exit.reason }}
                          </span>
                        </div>
                      </div>
                      <div class="hires-exits-right-section">
                        <div class="hires-exits-date-display exit-date">
                          {{ getExitDate(exit.date) }}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </p-dialog>
          <!-- Dialog for month-specific hires and exits details -->
          <p-dialog
            [visible]="monthHiresExitsDialogVisible()"
            (visibleChange)="monthHiresExitsDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '600px' }"
            [header]="'Ingresos y Salidas - ' + selectedMonthLabel()"
            styleClass="late-details-dialog hires-exits-dialog"
          >
            <div
              class="flex flex-col gap-0"
              style="padding: 1.5rem 2rem; min-height: 100px;"
            >
              <!-- Tabs for Hires and Exits -->
              <div class="hires-exits-tabs">
                <button
                  class="tab-button"
                  [class.active]="monthHiresExitsTab() === 'hires'"
                  (click)="monthHiresExitsTab.set('hires')"
                >
                  <i class="pi pi-arrow-down"></i>
                  Ingresos ({{ selectedMonthHiresList().length }})
                </button>
                <button
                  class="tab-button"
                  [class.active]="monthHiresExitsTab() === 'exits'"
                  (click)="monthHiresExitsTab.set('exits')"
                >
                  <i class="pi pi-arrow-up"></i>
                  Salidas ({{ selectedMonthExitsList().length }})
                </button>
              </div>

              <!-- Hires List -->
              <div *ngIf="monthHiresExitsTab() === 'hires'">
                <div
                  class="text-sm text-gray-300 text-center py-4"
                  *ngIf="selectedMonthHiresList().length === 0"
                >
                  No hay ingresos en este mes.
                </div>
                <ul
                  class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
                  *ngIf="selectedMonthHiresList().length > 0"
                >
                  <li
                    class="hires-exits-list-item"
                    *ngFor="let hire of selectedMonthHiresList()"
                  >
                    <div class="hires-exits-item-content">
                      <div class="hires-exits-icon-box icon-hire">
                        <i class="pi pi-user-plus"></i>
                      </div>
                      <div class="hires-exits-details">
                        <div class="hires-exits-name-row">
                          <span class="hires-exits-name">
                            {{ hire.first_name }} {{ hire.father_name }}
                          </span>
                        </div>
                        <div class="hires-exits-info-row">
                          <span class="hires-exits-branch">
                            <i class="pi pi-building"></i>
                            {{ hire.branch?.name || 'Sin sucursal' }}
                          </span>
                          <span
                            class="hires-exits-position"
                            *ngIf="hire.position"
                          >
                            <i class="pi pi-briefcase"></i>
                            {{ hire.position.name }}
                          </span>
                        </div>
                      </div>
                      <div class="hires-exits-right-section">
                        <div class="hires-exits-date-display">
                          {{ getHireDate(hire.start_date) }}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- Exits List -->
              <div *ngIf="monthHiresExitsTab() === 'exits'">
                <div
                  class="text-sm text-gray-300 text-center py-4"
                  *ngIf="selectedMonthExitsList().length === 0"
                >
                  No hay salidas en este mes.
                </div>
                <ul
                  class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
                  *ngIf="selectedMonthExitsList().length > 0"
                >
                  <li
                    class="hires-exits-list-item"
                    *ngFor="let exit of selectedMonthExitsList()"
                  >
                    <div class="hires-exits-item-content">
                      <div class="hires-exits-icon-box icon-exit">
                        <i class="pi pi-user-minus"></i>
                      </div>
                      <div class="hires-exits-details">
                        <div class="hires-exits-name-row">
                          <span class="hires-exits-name">
                            {{ exit.employee?.first_name }}
                            {{ exit.employee?.father_name }}
                          </span>
                        </div>
                        <div class="hires-exits-info-row">
                          <span class="hires-exits-branch">
                            <i class="pi pi-building"></i>
                            {{ exit.employee?.branch?.name || 'Sin sucursal' }}
                          </span>
                          <span class="hires-exits-reason" *ngIf="exit.reason">
                            <i class="pi pi-info-circle"></i>
                            {{ exit.reason }}
                          </span>
                        </div>
                      </div>
                      <div class="hires-exits-right-section">
                        <div class="hires-exits-date-display exit-date">
                          {{ getExitDate(exit.date) }}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </p-dialog>
        </div>
        }

        <!-- Indicadores Financieros -->
        @if (activeSection() === 'financial') {
        <div class="section-content">
          <div class="kpi-grid">
            <div class="kpi-card financial">
              <div class="kpi-icon">
                <i class="pi pi-money-bill"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Planilla Mensual</div>
                <div class="kpi-value">
                  {{
                    state.monthlyBudget() | currency : '$' : 'symbol' : '1.0-0'
                  }}
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
                    state.monthlyBudget() * 12
                      | currency : '$' : 'symbol' : '1.0-0'
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
                  {{
                    state.averageSalary() | currency : '$' : 'symbol' : '1.0-0'
                  }}
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
                    <span class="value-lg">{{
                      state.employeesWithDebts()
                    }}</span>
                    <span class="value-label">Empleados</span>
                  </div>
                  <div>
                    <span class="value-lg">{{
                      state.totalDebtAmount()
                        | currency : '$' : 'symbol' : '1.0-0'
                    }}</span>
                    <span class="value-label">Total</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        }

        <!-- Gestión de Personal -->
        @if (activeSection() === 'management') {
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
                <div class="kpi-value">{{ state.upcomingAnniversaries().length }}</div>
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
                  Total: {{ state.totalDebtAmount() | currency : '$' : 'symbol' : '1.0-0' }}
                </div>
              </div>
            </div>
          </div>
        </div>
        }

        <!-- Estructura Organizacional -->
        @if (activeSection() === 'structure') {
        <div class="section-content">
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon">
                <i class="pi pi-building"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Sucursales Activas</div>
                <div class="kpi-value">{{ state.branchesCount() }}</div>
                <div class="kpi-sublabel">Ubicaciones</div>
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">
                <i class="pi pi-file"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Empleados Fijos</div>
                <div class="kpi-value">
                  {{ state.contractDistribution().fixed }}
                </div>
                <div class="kpi-sublabel">
                  {{ getContractPercentage('fixed') }}% del total
                </div>
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">
                <i class="pi pi-file"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Empleados Temporales</div>
                <div class="kpi-value">
                  {{ state.contractDistribution().temporary }}
                </div>
                <div class="kpi-sublabel">
                  {{ getContractPercentage('temporary') }}% del total
                </div>
              </div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">
                <i class="pi pi-users"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">Ratio de Supervisión</div>
                <div class="kpi-value">{{ state.supervisionRatio() }}</div>
                <div class="kpi-sublabel">Empleados por supervisor</div>
              </div>
            </div>
          </div>
        </div>
        }

        <!-- Gráficos y Distribuciones -->
        @if (activeSection() === 'charts') {
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
                @for (reason of state.mainAbsenceReasons(); track reason.reason)
                {
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

        <!-- Eventos y Celebraciones -->
        @if (activeSection() === 'events') {
        <div class="section-content">
          <div class="events-grid">
            <div class="event-card">
              <h3 class="event-title">
                <i class="pi pi-star"></i>
                Cumpleañeros de {{ currentMonth() | titlecase }}
              </h3>
              <div class="birthday-list">
                @if (state.birthDates().length > 0) { @for (item of
                state.birthDates(); track item) {
                <div class="birthday-item">
                  <div class="birthday-date">
                    <div class="birthday-day">
                      {{ getBirthdayDay(item.birth_date) }}
                    </div>
                    <div class="birthday-month">
                      {{ getBirthdayMonth(item.birth_date) }}
                    </div>
                  </div>
                  <div class="birthday-info">
                    <div class="birthday-name">
                      {{ item.first_name }} {{ item.father_name }}
                    </div>
                    <div class="birthday-branch">
                      {{ item.branch?.name || 'Sin sucursal' }}
                    </div>
                  </div>
                </div>
                } } @else {
                <div class="empty-state-small">
                  No hay cumpleañeros este mes
                </div>
                }
              </div>
            </div>
            <div class="event-card">
              <h3 class="event-title">
                <i class="pi pi-star"></i>
                Próximos Aniversarios
              </h3>
              <div class="anniversary-list">
                @if (state.upcomingAnniversaries().length > 0) { @for (item of
                state.upcomingAnniversaries(); track item.employee.id) {
                <div class="anniversary-item">
                  <div class="anniversary-info">
                    <div class="anniversary-name">
                      {{ item.employee.first_name }}
                      {{ item.employee.father_name }}
                    </div>
                    <div class="anniversary-branch">
                      {{ item.employee.branch?.name || 'Sin sucursal' }}
                    </div>
                  </div>
                  <div class="anniversary-badge">{{ item.years }} años</div>
                </div>
                } } @else {
                <div class="empty-state-small">
                  No hay aniversarios próximos
                </div>
                }
              </div>
            </div>
          </div>
        </div>
        }
      </main>
    </div>
  `,
  styles: `
    /* Custom Scrollbar Global */
    * {
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 191, 36, 0.4) rgba(0, 0, 0, 0.2);
    }

    *::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }

    *::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
    }

    *::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.5), rgba(245, 158, 11, 0.3));
      border-radius: 10px;
      border: 2px solid rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    *::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.7), rgba(245, 158, 11, 0.5));
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }

    *::-webkit-scrollbar-corner {
      background: transparent;
    }

    .dashboard-wrapper {
      display: flex;
      position: relative;
      background: #000000;
    }

    .dashboard-container {
      flex: 1;
      margin-left: 280px;
      padding: 1rem 1rem 2rem;
      background: #000000;
      min-height: calc(100vh - 64px);
      font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      transition: margin-left 0.3s ease;
      position: relative;
    }

    .dashboard-sidebar.collapsed ~ .dashboard-container {
      margin-left: 80px;
    }

    /* Sidebar */
    .dashboard-sidebar {
      position: fixed;
      left: 0;
      top: 64px;
      width: 280px;
      height: calc(100vh - 64px);
      background: #18181b;
      backdrop-filter: blur(10px);
      border-right: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.1);
      padding: 2rem 0;
      z-index: 100;
      overflow-y: auto;
      overflow-x: hidden;
      transition: width 0.3s ease, transform 0.3s ease;
    }

    .dashboard-sidebar.collapsed {
      width: 80px;
    }

    .sidebar-header {
      padding: 0 1.5rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sidebar-header h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition: opacity 0.2s ease;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    }

    .sidebar-header h3.hidden {
      opacity: 0;
      width: 0;
      overflow: hidden;
    }

    .sidebar-toggle {
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.5rem;
      color: #ffffff;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.5rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
    }

    .sidebar-toggle:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.5);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0 1rem;
    }

    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: transparent;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9375rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      font-family: inherit;
      white-space: nowrap;
      justify-content: flex-start;
      position: relative;
    }

    .dashboard-sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 1rem 0.75rem;
    }

    .nav-item span.hidden {
      opacity: 0;
      width: 0;
      overflow: hidden;
    }

    .nav-item i {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.9);
      transform: translateY(-2px);
    }

    .nav-item:hover i {
      color: #ffffff;
    }

    .dashboard-sidebar:not(.collapsed) .nav-item:hover i {
      transform: translateX(4px);
    }

    .nav-item.active {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
    }

    .nav-item.active i {
      color: #ffffff;
      text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
    }

    /* Section Content */
    .section-content {
      padding: 0.5rem 0;
    }

    /* Deshabilitar scroll en la sección de Resumen */
    .executive-section {
      overflow: visible;
    }
    
    .executive-section .kpi-grid {
      overflow: visible;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #fbbf24;
      margin: 0 0 2rem 0;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #18181b;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(251, 191, 36, 0.5);
      border-radius: 0.75rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.2);
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }

    .section-title i {
      color: #fbbf24;
      font-size: 1.5rem;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
      padding: 0;
      grid-auto-flow: row dense;
    }

    /* Executive (first section) - Grid de 16 columnas para distribución precisa */
    .executive-kpi-grid {
      grid-template-columns: repeat(16, minmax(0, 1fr)) !important;
      grid-auto-flow: row;
      grid-auto-rows: min-content;
      align-items: stretch;
    }
    
    /* Primera fila: Solo 3 KPIs grandes ocupando todo el ancho disponible (5 + 5 + 6 = 16 columnas) */
    .executive-kpi-grid > .kpi-card:first-child {
      grid-row: 1;
      grid-column: span 5 !important;
    }
    .executive-kpi-grid > .kpi-card:nth-child(2) {
      grid-row: 1;
      grid-column: span 5 !important;
    }
    .executive-kpi-grid > .kpi-card:nth-child(3) {
      grid-row: 1;
      grid-column: span 6 !important;
    }

    /* Asegurar que ningún otro KPI esté en la primera fila */
    .executive-kpi-grid > .kpi-card:nth-child(n+4) {
      grid-row: auto;
    }

    /* Segunda fila: Movimientos del personal - dividida en dos */
    /* Ingresos y Salida del Personal (4to) - ocupa 2 filas (fila 2-3, columnas 1-4) */
    .executive-kpi-grid > .kpi-card:nth-child(4) {
      grid-row: 2 / span 2 !important;
      grid-column: 1 / span 4 !important;
      padding: 1rem !important;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Tasa de Retención (5to) - fila 2, columnas 5-8 */
    .executive-kpi-grid > .kpi-card:nth-child(5) {
      grid-row: 2 !important;
      grid-column: 5 / span 4 !important;
      padding: 1rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Cumpleañeros del Mes (6to) - fila 2, columnas 9-12 */
    .executive-kpi-grid > .kpi-card:nth-child(6) {
      grid-row: 2 !important;
      grid-column: 9 / span 4 !important;
      padding: 1rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Estilos específicos para la tarjeta de cumpleañeros */
    .birthdays-card .kpi-content {
      flex: 1;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    
    /* Costo de Planilla (7mo) - ocupa 2 filas (fila 2-3, columnas 13-16) */
    .executive-kpi-grid > .kpi-card:nth-child(7) {
      grid-row: 2 / span 2 !important;
      grid-column: 13 / span 4 !important;
      padding: 1rem !important;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Todos los cards de filas 2 y 3 - contenido centrado verticalmente */
    .executive-kpi-grid > .kpi-card:nth-child(4) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(5) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(6) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(7) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(9) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(10) .kpi-content {
      flex: 1;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    
    /* Hires-exits-vs-card - ajuste específico para el gráfico */
    .executive-kpi-grid > .kpi-card:nth-child(4) .kpi-content {
      gap: 0;
    }
    
    /* Costo de Planilla - misma altura y estilo que Ingresos y Salida del Personal */
    .payroll-cost-compact {
      flex-direction: column;
    }
    
    .payroll-cost-compact .kpi-label {
      width: 100%;
      text-align: center;
      align-self: center;
      margin-bottom: 0.375rem;
      flex-shrink: 0;
    }
    
    .payroll-cost-compact .kpi-content {
      align-items: center;
      justify-content: center;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Tercera fila: Edad y Salario Promedio - debajo de Tasa de Retención y Cumpleañeros */
    /* Edad Promedio (9no) - fila 3, debajo de Tasa de Retención (columnas 5-8) */
    .executive-kpi-grid > .kpi-card:nth-child(9) {
      grid-row: 3 !important;
      grid-column: 5 / span 4 !important;
      padding: 1rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Salario Promedio (10mo) - fila 3, debajo de Cumpleañeros (columnas 9-12) */
    .executive-kpi-grid > .kpi-card:nth-child(10) {
      grid-row: 3 !important;
      grid-column: 9 / span 4 !important;
      padding: 1rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Cuarta fila: Antigüedad Promedio, Índice de Clima Laboral, Índice de Cumplimiento de Horario - 3 KPIs iguales */
    /* Antigüedad Promedio (8vo) - fila 4, columnas 1-5 */
    .executive-kpi-grid > .kpi-card:nth-child(8) {
      grid-row: 4 !important;
      grid-column: 1 / span 5 !important;
      padding: 0.95rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Índice de Clima Laboral (11vo) - fila 4, columnas 6-11 */
    .executive-kpi-grid > .kpi-card:nth-child(11) {
      grid-row: 4 !important;
      grid-column: 6 / span 6 !important;
      padding: 0.95rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Índice de Cumplimiento de Horario (12vo) - fila 4, columnas 12-16 */
    .executive-kpi-grid > .kpi-card:nth-child(12) {
      grid-row: 4 !important;
      grid-column: 12 / span 5 !important;
      padding: 0.95rem !important;
      align-self: stretch;
      display: flex !important;
      flex-direction: column !important;
    }
    
    /* Antigüedad, Clima Laboral y Cumplimiento - contenido centrado */
    .executive-kpi-grid > .kpi-card:nth-child(8) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(11) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(12) .kpi-content {
      flex: 1;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    
    /* Edad y Salario Promedio - contenido igual que Tasa de Retención */
    .executive-kpi-grid > .kpi-card:nth-child(9) .kpi-content,
    .executive-kpi-grid > .kpi-card:nth-child(10) .kpi-content {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center;
      align-items: center;
      width: 100%;
    }

    /* No media queries here: always 3 columns regardless of zoom */

    @media (max-width: 1400px) {
      .kpi-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 0.5rem;
      }
    }

    @media (max-width: 1200px) {
      .kpi-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.5rem;
      }
    }

    .kpi-card {
      background: #18181b;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.75rem;
      padding: 0.75rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 0.75rem;
      transition: all 0.3s ease;
      animation: cardEntrance 0.25s ease-out;
      min-height: fit-content;
      position: relative;
      align-items: center;
      justify-content: center;
    }

    .kpi-card .kpi-icon {
      position: absolute;
      left: 0.6rem;
      top: 0.6rem;
      z-index: 1;
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      width: 100%;
      align-items: center;
      text-align: center;
      justify-content: center;
    }

    .kpi-sparkline {
      width: 100%;
      height: 64px;
      margin-top: 0.35rem;
    }

    /* Headcount card aligned like the rest of KPI cards */
    .headcount-card {
      padding: 0.75rem;
      padding-bottom: 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      min-height: auto;
    }
    .headcount-card .kpi-content {
      align-items: center;
      text-align: center;
      gap: 0.2rem;
      width: 100%;
      margin-top: 0;
      margin-bottom: 0;
      padding-bottom: 0;
      justify-content: center;
      /* Centrado completo ignorando el icono absoluto */
    }
    .headcount-card .headcount-header { 
      margin-top: 0;
      margin-bottom: 0.25rem;
    }

    .headcount-header .kpi-label {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 0.05rem;
    }

    .headcount-header .kpi-value {
      font-size: 2.1rem;
      line-height: 1;
      margin: 0.05rem 0;
    }

    .headcount-header .kpi-sublabel {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.95rem;
      margin-bottom: 0.1rem;
    }

    .sparkline-box {
      width: 100%;
      margin: 0.25rem auto 0;
      border-radius: 0.5rem;
      background: rgba(252, 211, 77, 0.06);
      border: 1px solid rgba(252, 211, 77, 0.12);
      overflow: hidden;
      padding: 0.1rem 0.25rem 0.1rem;
    }

    .headcount-card .sparkline-box {
      margin-bottom: 0;
    }

    .headcount-card .kpi-sparkline {
      width: 100%;
      height: 110px;
    }

    /* Make sparkline span full card width ignoring left icon padding */
    .headcount-card .sparkline-box,
    .lates-card .sparkline-box {
      width: 100%;
      margin-left: 0;
    }

    /* Lates card: mirror headcount sizing and layout */
    .lates-card {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    .lates-card .kpi-content {
      align-items: center;
      text-align: center;
      gap: 0.2rem;
      width: 100%;
      margin-top: 0;
      justify-content: center;
      /* Centrado completo ignorando el icono absoluto */
    }
    .lates-card .kpi-sparkline {
      width: 100%;
      height: 110px;
    }
    /* Match typography */
    .lates-card .kpi-label {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 0.05rem;
    }
    .lates-card .kpi-value {
      font-size: 2.1rem;
      line-height: 1;
      margin: 0.05rem 0;
    }
    .lates-card .kpi-sublabel {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.95rem;
      margin-bottom: 0.1rem;
    }

    /* Center title for Distribución por Género card */
    .gender-vs-card .kpi-label {
      width: 100%;
      text-align: center;
      align-self: center;
      margin-bottom: 0.375rem;
    }

    /* Hires vs Exits Card - Similar to Gender Card */
    .hires-exits-vs-card {
      grid-column: span 1;
      flex-direction: column;
      padding: 1rem;
      position: relative;
    }
    
    .hires-exits-vs-card .kpi-icon {
      position: absolute;
      left: 0.6rem;
      top: 0.6rem;
      z-index: 1;
    }

    .hires-exits-vs-card .kpi-label {
      width: 100%;
      text-align: center;
      align-self: center;
      margin-bottom: 0.375rem;
    }

    .hires-exits-chart-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      width: 100%;
    }

    .hires-exits-chart-wrapper {
      position: relative;
      width: 100%;
      max-width: 240px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    @media (max-width: 768px) {
      .hires-exits-chart-wrapper {
        height: 100px;
        max-width: 200px;
      }
    }

    .hires-exits-chart-canvas {
      width: 100% !important;
      height: 100% !important;
      max-width: 100%;
      max-height: 100%;
    }

    .hires-exits-center-icons {
      position: absolute;
      top: 66%;
      left: 50%;
      transform: translate(-50%, -50%) translateY(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      z-index: 10;
      pointer-events: none;
    }

    .hires-exits-center-icons .pi {
      font-size: 2.64rem;
      line-height: 1;
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
    }

    .hires-center-icon {
      color: #10b981;
    }

    .exits-center-icon {
      color: #ef4444;
    }


    .hires-exits-legend {
      display: flex;
      gap: 3rem;
      width: 100%;
      justify-content: center;
      align-items: center;
      flex-wrap: nowrap;
    }

    @media (max-width: 768px) {
      .hires-exits-legend {
        gap: 2rem;
      }
    }

    .hires-exits-legend .legend-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      min-width: auto;
    }

    .hires-exits-legend .legend-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .hires-exits-legend .legend-value {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1;
    }

    .hires-exits-legend .legend-item:first-child .legend-value {
      color: #10b981;
    }

    .hires-exits-legend .legend-item:last-child .legend-value {
      color: #ef4444;
    }

    .kpi-card:hover {
      background: #1f1f23;
      border-color: rgba(255, 255, 255, 0.5);
      box-shadow: 0 12px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 255, 255, 0.15);
      transform: translateY(-4px);
    }

    .kpi-card-clickable {
      cursor: pointer;
    }

    .kpi-card-clickable:hover {
      background: #1f1f23;
      border-color: rgba(251, 191, 36, 0.5);
      box-shadow: 0 12px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(251, 191, 36, 0.2);
      transform: translateY(-4px);
    }

    .kpi-card.financial .kpi-value {
      font-size: 1.75rem;
    }

    /* Gender Chart Card */
    .gender-vs-card {
      grid-column: span 1;
      flex-direction: column;
      padding: 1rem;
      position: relative;
    }
    
    .gender-vs-card .kpi-icon {
      position: absolute;
      left: 0.6rem;
      top: 0.6rem;
      z-index: 1;
    }

    @media (max-width: 1200px) {
      .gender-vs-card {
        grid-column: span 1;
        padding: 0.75rem;
      }
    }

    .gender-chart-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      width: 100%;
    }

    .gender-chart-wrapper {
      position: relative;
      width: 100%;
      max-width: 400px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      overflow: visible;
    }

    @media (max-width: 768px) {
      .gender-chart-wrapper {
        height: 100px;
        max-width: 200px;
      }
    }

    .gender-chart-canvas {
      width: 100% !important;
      height: 100% !important;
      max-width: 100%;
      max-height: 100%;
    }

    .gender-center-icons {
      position: absolute;
      top: 66%;
      left: 50%;
      transform: translate(-50%, -50%) translateY(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4.00rem;
      z-index: 10;
      pointer-events: none;
    }

    .gender-center-icons .pi {
      font-size: 3.64rem;
      line-height: 1;
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
    }

    .male-center-icon {
      color: #3b82f6;
    }

    .female-center-icon {
      color: #f472b6;
    }

    .gender-chart-center {
      position: absolute;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.125rem;
      z-index: 10;
      pointer-events: none;
      text-align: center;
      width: 100%;
    }

    .gender-chart-percentage {
      font-size: 2.5rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
      margin: 0;
      padding: 0;
    }

    @media (max-width: 768px) {
      .gender-chart-percentage {
        font-size: 2rem;
      }
    }

    .gender-chart-label {
      font-size: 0.7rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0;
      padding: 0;
    }

    .gender-legend {
      display: flex;
      gap: 3rem;
      width: 100%;
      justify-content: center;
      align-items: center;
      flex-wrap: nowrap;
    }

    @media (max-width: 768px) {
      .gender-legend {
        gap: 2rem;
      }
    }

    .gender-legend .legend-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      min-width: auto;
    }

    .gender-legend .legend-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .gender-legend .legend-value {
      font-size: 1rem;
      font-weight: 700;
      line-height: 1;
    }

    .gender-legend .legend-item:first-child .legend-value {
      color: #3b82f6;
    }

    .gender-legend .legend-item:last-child .legend-value {
      color: #f472b6;
    }

    .kpi-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.625rem;
      background: rgba(252, 211, 77, 0.1);
      border: 1px solid rgba(252, 211, 77, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      color: #FCD34D;
      flex-shrink: 0;
    }

    /* Override para cards especiales que ya tienen icono posicionado */
    .headcount-card .kpi-icon,
    .lates-card .kpi-icon {
      position: absolute;
      left: 0.6rem;
      top: 0.6rem;
      z-index: 1;
    }

    @media (max-width: 1200px) {
      .kpi-icon {
        width: 2rem;
        height: 2rem;
        font-size: 0.875rem;
      }
    }

    .kpi-icon.male {
      background: rgba(96, 165, 250, 0.1);
      border-color: rgba(96, 165, 250, 0.2);
      color: #60a5fa;
    }

    .kpi-icon.female {
      background: rgba(244, 114, 182, 0.1);
      border-color: rgba(244, 114, 182, 0.2);
      color: #f472b6;
    }

    .kpi-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    }

    .kpi-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.375rem;
    }

    @media (max-width: 1200px) {
      .kpi-label {
        font-size: 0.65rem;
        margin-bottom: 0.25rem;
      }
    }

    .kpi-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.1;
      margin-bottom: 0.25rem;
    }

    @media (max-width: 1200px) {
      .kpi-value {
        font-size: 1.25rem;
      }
    }

    .kpi-sublabel {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    @media (max-width: 1200px) {
      .kpi-sublabel {
        font-size: 0.7rem;
      }
    }

    .kpi-value-split {
      display: flex;
      gap: 1.5rem;
      margin-top: 0.5rem;
    }

    .kpi-value-split > div {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .kpi-value-stacked {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
      align-items: center;
      justify-content: center;
    }

    .kpi-value-stacked .value-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      align-items: center;
      text-align: center;
    }

    .value-lg {
      font-size: 1.5rem;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.2;
    }

    .value-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    @keyframes cardEntrance {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Charts Grid */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .chart-card {
      background: #18181b;
      border: 2px solid rgba(251, 191, 36, 0.5);
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.2);
      transition: all 0.3s ease;
    }

    .chart-card:hover {
      border-color: rgba(251, 191, 36, 0.8);
      box-shadow: 0 12px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(251, 191, 36, 0.3);
      transform: translateY(-2px);
    }

    .chart-title {
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 1.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .chart-container {
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Age Distribution */
    .age-distribution {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .age-bar {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .age-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .age-value {
      font-weight: 600;
      color: #FCD34D;
    }

    .progress-bar {
      height: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid rgba(252, 211, 77, 0.1);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, rgba(252, 211, 77, 0.3), rgba(252, 211, 77, 0.6));
      border-right: 2px solid #FCD34D;
      transition: width 0.6s ease;
    }

    /* Department List */
    .department-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .department-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(252, 211, 77, 0.1);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .department-badge {
      padding: 0.25rem 0.75rem;
      background: rgba(252, 211, 77, 0.15);
      color: #FCD34D;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    /* Absence List */
    .absence-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .absence-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.9);
    }

    .absence-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #FCD34D;
      flex-shrink: 0;
    }

    .absence-count {
      margin-left: auto;
      font-weight: 600;
      color: #FCD34D;
    }

    /* Events Grid */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .event-card {
      background: #18181b;
      border: 2px solid rgba(251, 191, 36, 0.5);
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.2);
      transition: all 0.3s ease;
    }

    .event-card:hover {
      border-color: rgba(251, 191, 36, 0.8);
      box-shadow: 0 12px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(251, 191, 36, 0.3);
      transform: translateY(-2px);
    }

    .event-title {
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 1.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .event-title i {
      color: #FCD34D;
    }

    /* Birthday List */
    .birthday-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .birthday-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(252, 211, 77, 0.1);
      border-radius: 0.5rem;
    }

    .birthday-date {
      width: 3rem;
      height: 3rem;
      border-radius: 0.5rem;
      background: rgba(252, 211, 77, 0.1);
      border: 1px solid rgba(252, 211, 77, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .birthday-day {
      font-size: 1.25rem;
      font-weight: 700;
      color: #FCD34D;
      line-height: 1;
    }

    .birthday-month {
      font-size: 0.625rem;
      color: rgba(252, 211, 77, 0.7);
      text-transform: uppercase;
    }

    .birthday-info {
      flex: 1;
    }

    .birthday-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 0.25rem;
    }

    .birthday-branch {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Anniversary List */
    .anniversary-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .anniversary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(252, 211, 77, 0.1);
      border-radius: 0.5rem;
    }

    .anniversary-info {
      flex: 1;
    }

    .anniversary-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 0.25rem;
    }

    .anniversary-branch {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .anniversary-badge {
      padding: 0.375rem 0.75rem;
      background: rgba(252, 211, 77, 0.15);
      color: #FCD34D;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(252, 211, 77, 0.3);
    }

    /* Empty States */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: rgba(252, 211, 77, 0.3);
      font-size: 2rem;
    }

    .empty-state p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 1rem;
    }

    .empty-state-small {
      text-align: center;
      padding: 2rem;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.875rem;
    }

    /* Scrollbars */
    .birthday-list::-webkit-scrollbar,
    .anniversary-list::-webkit-scrollbar {
      width: 0.375rem;
    }

    .birthday-list::-webkit-scrollbar-track,
    .anniversary-list::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 0.25rem;
    }

    .birthday-list::-webkit-scrollbar-thumb,
    .anniversary-list::-webkit-scrollbar-thumb {
      background: rgba(252, 211, 77, 0.3);
      border-radius: 0.25rem;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .dashboard-sidebar {
        top: 0;
        height: 100vh;
        z-index: 1000;
      }

      .dashboard-sidebar.collapsed {
        transform: translateX(-100%);
        width: 280px;
      }

      .dashboard-sidebar.collapsed ~ .dashboard-container {
        margin-left: 0;
      }

      .dashboard-sidebar:not(.collapsed) {
        width: 280px;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
      }

      .dashboard-sidebar:not(.collapsed) .nav-item {
        justify-content: flex-start;
        padding: 1rem 1.25rem;
      }

      .dashboard-sidebar:not(.collapsed) .nav-item span {
        opacity: 1;
        width: auto;
      }

      .dashboard-sidebar:not(.collapsed) h3 {
        opacity: 1;
        width: auto;
      }

      .dashboard-container {
        margin-left: 0;
        padding-top: 1rem;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 4rem 1rem 3rem;
      }

      .gender-vs-card {
        grid-column: span 1;
      }

      .gender-vs-container {
        flex-direction: column;
        gap: 1rem;
      }

      .male-side,
      .female-side {
        width: 100%;
        align-items: center !important;
      }

      .male-side .gender-info,
      .female-side .gender-info {
        align-items: center !important;
      }

      .vs-divider {
        transform: rotate(90deg);
      }

      .vs-text {
        font-size: 1.25rem;
        padding: 0.375rem 0.75rem;
      }
    }

    /* Late details dialog styles */
    ::ng-deep .late-details-dialog {
      .p-dialog {
        background: #18181b !important;
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      }
      .p-dialog-header {
        background: #18181b !important;
        border-bottom: 1px solid rgba(251, 191, 36, 0.2);
        color: #fbbf24;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem 0.5rem 0 0;
      }
      .p-dialog-content {
        background: #18181b !important;
        color: #ffffff;
        padding: 0 !important;
        border-radius: 0 0 0.5rem 0.5rem;
      }
      .p-dialog-header-icon {
        color: rgba(255, 255, 255, 0.7);
      }
      .p-dialog-header-icon:hover {
        color: #ffffff;
      }
    }
    
    /* Dialog overlay/mask styles - only when dialog is visible */
    ::ng-deep .p-dialog-mask.p-component-overlay {
      background: rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(2px);
    }
    
    /* Ensure dialog wrapper has proper styling */
    ::ng-deep .late-details-dialog .p-dialog-wrapper {
      border-radius: 0.5rem;
      overflow: hidden;
    }
    
    /* Remove any default padding/margin from dialog content wrapper */
    ::ng-deep .late-details-dialog .p-dialog-content-wrapper {
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Birthday Dialog Styles */
    .birthday-list-item {
      background: transparent;
      border: none;
      padding: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }

    .birthday-list-item:first-child .birthday-item-content {
      padding-top: 0;
    }

    .birthday-list-item:last-child {
      border-bottom: none;
    }

    .birthday-list-item:hover {
      background: rgba(251, 191, 36, 0.05);
    }

    .birthday-list-item.birthday-today {
      background: rgba(251, 191, 36, 0.08);
    }

    .birthday-list-item.birthday-today:hover {
      background: rgba(251, 191, 36, 0.12);
    }

    .birthday-list-item.birthday-passed {
      opacity: 0.5;
    }

    .birthday-item-content {
      display: flex;
      gap: 0.875rem;
      align-items: center;
      padding: 0.875rem 0;
    }

    .birthday-icon-box {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.25rem;
      transition: all 0.3s ease;
    }

    .birthday-icon-box.icon-today {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
      border: 2px solid rgba(251, 191, 36, 0.4);
      color: #fbbf24;
    }

    .birthday-icon-box.icon-upcoming {
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(59, 130, 246, 0.1));
      border: 2px solid rgba(96, 165, 250, 0.3);
      color: #60a5fa;
    }

    .birthday-icon-box.icon-passed {
      background: rgba(156, 163, 175, 0.1);
      border: 2px solid rgba(156, 163, 175, 0.25);
      color: #9ca3af;
    }

    .birthday-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .birthday-name-row {
      display: flex;
      align-items: center;
    }

    .birthday-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff;
    }

    .birthday-info-row {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .birthday-branch {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .birthday-branch i {
      font-size: 0.625rem;
      color: rgba(251, 191, 36, 0.5);
    }

    .birthday-right-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.375rem;
    }

    .birthday-date-display {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fbbf24;
      line-height: 1;
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      font-family: 'Segoe UI', sans-serif;
    }

    .birthday-date-display .date-month {
      font-size: 0.65rem;
      font-weight: 600;
      color: rgba(251, 191, 36, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .birthday-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.625rem;
      border-radius: 1rem;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .birthday-status-badge i {
      font-size: 0.625rem;
    }

    .birthday-status-badge.status-today {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.4);
    }

    .birthday-status-badge.status-upcoming {
      background: rgba(96, 165, 250, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(96, 165, 250, 0.3);
    }

    .birthday-status-badge.status-passed {
      background: rgba(107, 114, 128, 0.15);
      color: #9ca3af;
      border: 1px solid rgba(107, 114, 128, 0.3);
    }

    /* Custom Scrollbar for Birthday List */
    .birthdays-dialog ul {
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 191, 36, 0.4) rgba(255, 255, 255, 0.05);
    }

    .birthdays-dialog ul::-webkit-scrollbar {
      width: 10px;
    }

    .birthdays-dialog ul::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      margin: 4px 0;
    }

    .birthdays-dialog ul::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6), rgba(245, 158, 11, 0.4));
      border-radius: 10px;
      border: 2px solid rgba(24, 24, 27, 0.3);
      transition: all 0.3s ease;
    }

    .birthdays-dialog ul::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.6));
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }

    .birthdays-dialog ul::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, #fbbf24, #f59e0b);
    }

    /* Hires and Exits Dialog Styles */
    .hires-exits-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tab-button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #9ca3af;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-button:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-button.active {
      color: #fbbf24;
      border-bottom-color: #fbbf24;
      background: rgba(251, 191, 36, 0.05);
    }

    .tab-button i {
      font-size: 0.875rem;
    }

    .hires-exits-list-item {
      background: transparent;
      border: none;
      padding: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }

    .hires-exits-list-item:first-child .hires-exits-item-content {
      padding-top: 0;
    }

    .hires-exits-list-item:last-child {
      border-bottom: none;
    }

    .hires-exits-list-item:hover {
      background: rgba(251, 191, 36, 0.05);
    }

    .hires-exits-item-content {
      display: flex;
      gap: 0.875rem;
      align-items: center;
      padding: 0.875rem 0;
    }

    .hires-exits-icon-box {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.25rem;
      transition: all 0.3s ease;
    }

    .hires-exits-icon-box.icon-hire {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
      border: 2px solid rgba(16, 185, 129, 0.4);
      color: #10b981;
    }

    .hires-exits-icon-box.icon-exit {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1));
      border: 2px solid rgba(239, 68, 68, 0.4);
      color: #ef4444;
    }

    .hires-exits-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .hires-exits-name-row {
      display: flex;
      align-items: center;
    }

    .hires-exits-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff;
    }

    .hires-exits-info-row {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
      flex-wrap: wrap;
    }

    .hires-exits-branch,
    .hires-exits-position,
    .hires-exits-reason {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .hires-exits-branch i,
    .hires-exits-position i,
    .hires-exits-reason i {
      font-size: 0.625rem;
      color: rgba(251, 191, 36, 0.5);
    }

    .hires-exits-right-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.375rem;
    }

    .hires-exits-date-display {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fbbf24;
      line-height: 1;
      font-family: 'Segoe UI', sans-serif;
    }

    .hires-exits-date-display.exit-date {
      color: #ef4444;
    }

    /* Custom Scrollbar for Hires and Exits List */
    .hires-exits-dialog ul {
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 191, 36, 0.4) rgba(255, 255, 255, 0.05);
    }

    .hires-exits-dialog ul::-webkit-scrollbar {
      width: 10px;
    }

    .hires-exits-dialog ul::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      margin: 4px 0;
    }

    .hires-exits-dialog ul::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6), rgba(245, 158, 11, 0.4));
      border-radius: 10px;
      border: 2px solid rgba(24, 24, 27, 0.3);
      transition: all 0.3s ease;
    }

    .hires-exits-dialog ul::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.6));
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }

    .hires-exits-dialog ul::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, #fbbf24, #f59e0b);
    }

    /* Lates Dialog Styles */
    .lates-list-item {
      background: transparent;
      border: none;
      padding: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }

    .lates-list-item:first-child .lates-item-content {
      padding-top: 0;
    }

    .lates-list-item:last-child {
      border-bottom: none;
    }

    .lates-list-item:hover {
      background: rgba(251, 191, 36, 0.05);
    }

    .lates-item-content {
      display: flex;
      gap: 0.875rem;
      align-items: center;
      padding: 0.875rem 0;
    }

    .lates-icon-box {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.25rem;
      transition: all 0.3s ease;
    }

    .lates-icon-box.late-moderate {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
      border: 2px solid rgba(251, 191, 36, 0.4);
      color: #fbbf24;
    }

    .lates-icon-box.late-severe {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1));
      border: 2px solid rgba(239, 68, 68, 0.4);
      color: #ef4444;
    }

    .lates-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .lates-name-row {
      display: flex;
      align-items: center;
    }

    .lates-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff;
    }

    .lates-info-row {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
      flex-wrap: wrap;
    }

    .lates-time-info {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .lates-time-info i {
      font-size: 0.625rem;
      color: rgba(251, 191, 36, 0.5);
    }

    .lates-right-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.375rem;
    }

    .lates-delay-display {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
      font-family: 'Segoe UI', sans-serif;
    }

    .lates-delay-display.delay-moderate {
      color: #fbbf24;
    }

    .lates-delay-display.delay-severe {
      color: #ef4444;
    }

    /* Custom Scrollbar for Lates List */
    .lates-dialog ul {
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 191, 36, 0.4) rgba(255, 255, 255, 0.05);
    }

    .lates-dialog ul::-webkit-scrollbar {
      width: 10px;
    }

    .lates-dialog ul::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      margin: 4px 0;
    }

    .lates-dialog ul::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.6), rgba(245, 158, 11, 0.4));
      border-radius: 10px;
      border: 2px solid rgba(24, 24, 27, 0.3);
      transition: all 0.3s ease;
    }

    .lates-dialog ul::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.6));
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
    }

    .lates-dialog ul::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, #fbbf24, #f59e0b);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  public state = inject(DashboardStore);
  public employees = inject(EmployeesStore);

  public sidebarOpen = signal(true);
  public activeSection = signal('executive');

  // Computed para contar cumpleañeros del mes
  public monthlyBirthdaysCount = computed(() => {
    return this.state.birthDates().length;
  });

  // API resource para obtener todas las terminaciones (necesario para cálculo histórico)
  public terminationsApi = httpResource<any[]>(() => {
    const baseUrl = process.env['ENV_SUPABASE_URL']!;
    // Obtener todas las terminaciones, no solo del mes actual
    const url = `${baseUrl}/rest/v1/terminations?select=date,reason,employee_id&order=date.asc`;
    return {
      url,
      method: 'GET',
    };
  });

  // Calcular ingresos y salidas del mes
  public monthlyHiresAndExits = computed(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Empleados que ingresaron este mes (start_date en el mes actual)
    const hires = this.employees
      .entities()
      .filter(
        (x) =>
          x.start_date &&
          new Date(x.start_date) >= monthStart &&
          new Date(x.start_date) <= monthEnd
      ).length;

    // Empleados que salieron este mes - usar tabla terminations
    const terminations = this.terminationsApi.value() ?? [];
    const exits = terminations.filter((t) => {
      if (!t.date) return false;
      const terminationDate = new Date(t.date);
      return terminationDate >= monthStart && terminationDate <= monthEnd;
    }).length;

    return {
      hires,
      exits,
    };
  });

  // NOTA: Estas APIs usan vistas v_lates_daily y v_lates_daily_detail que dependen de attendance_sheets
  // Las vistas solo tienen datos hasta 2025-07-26 y no se están actualizando.
  // El código ahora usa latesFromTimelogs que consulta directamente timelogs en tiempo real.
  // Estas APIs se mantienen comentadas por si se necesitan en el futuro, pero NO se usan actualmente.

  // public latesDailyApi = httpResource<any[]>(() => {
  //   const baseUrl = process.env['ENV_SUPABASE_URL']!;
  //   const now = new Date();
  //   const from = format(startOfMonth(now), 'yyyy-MM-dd');
  //   const to = format(
  //     new Date(now.getFullYear(), now.getMonth() + 1, 0),
  //     'yyyy-MM-dd'
  //   );
  //   // PostgREST: use range operator for date filtering
  //   // Build URL with both filters manually since URLSearchParams doesn't handle duplicates well
  //   const url = `${baseUrl}/rest/v1/v_lates_daily?select=*&order=work_date.asc&work_date=gte.${from}&work_date=lte.${to}`;
  //   console.log(
  //     '[Tardanzas API] latesDailyApi URL:',
  //     url,
  //     'from:',
  //     from,
  //     'to:',
  //     to
  //   );
  //   return {
  //     url,
  //     method: 'GET',
  //   };
  // });

  // public latesNamesApi = httpResource<any[]>(() => {
  //   const baseUrl = process.env['ENV_SUPABASE_URL']!;
  //   const now = new Date();
  //   const from = format(startOfMonth(now), 'yyyy-MM-dd');
  //   const to = format(
  //     new Date(now.getFullYear(), now.getMonth() + 1, 0),
  //     'yyyy-MM-dd'
  //   );
  //   // PostgREST: build URL manually with both date filters
  //   const url = `${baseUrl}/rest/v1/v_lates_daily_detail?select=work_date,employee_name,minutes_late&order=work_date.asc,employee_name.asc&work_date=gte.${from}&work_date=lte.${to}`;
  //   console.log(
  //     '[Tardanzas API] latesNamesApi URL:',
  //     url,
  //     'from:',
  //     from,
  //     'to:',
  //     to
  //   );
  //   return {
  //     url,
  //     method: 'GET',
  //   };
  // });

  // Calculate tardiness from timelogs + schedules (real-time, no need for attendance_sheets)
  public latesFromTimelogs = httpResource<any[]>(() => {
    const baseUrl = process.env['ENV_SUPABASE_URL']!;
    const now = new Date();
    // Usar inicio del mes a las 00:00:00 y fin del día actual a las 23:59:59
    // Formato ISO 8601 para Supabase/PostgREST
    const monthStart = startOfMonth(now);
    const from = format(monthStart, "yyyy-MM-dd'T'00:00:00");
    // Incluir hasta el final del día actual (no solo hasta el final del mes)
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );
    const to = format(todayEnd, "yyyy-MM-dd'T'HH:mm:ss");

    // Query timelogs for entry times (type = 'entry')
    // Build URL manually because we need multiple filters on created_at
    // Include 'type' field in select to ensure it's available in the response
    // IMPORTANTE: Agregar limit=10000 para obtener todos los registros del mes (Supabase limita a 1000 por defecto)
    // El interceptor HTTP agregará el header Range automáticamente para peticiones a timelogs
    const url = `${baseUrl}/rest/v1/timelogs?select=created_at,employee_id,type,employee:employees(first_name,father_name)&type=eq.entry&created_at=gte.${from}&created_at=lte.${to}&order=created_at.asc&limit=10000`;
    // Debug logs removed for production
    return {
      url,
      method: 'GET',
    };
  });

  public employeeSchedules = httpResource<any[]>(() => {
    const baseUrl = process.env['ENV_SUPABASE_URL']!;
    const now = new Date();
    // Use date-only format for DATE field comparisons
    // Incluir horarios que se solapen con CUALQUIER día del mes actual
    // Esto es importante porque algunos horarios pueden terminar después del día actual
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

    // Query employee schedules that overlap with the current month
    // A schedule overlaps if: start_date <= month_end AND end_date >= month_start
    // Esto captura TODOS los horarios que se solapan con cualquier día del mes
    const url = `${baseUrl}/rest/v1/employee_schedules?select=*,schedule:schedules(*)&start_date=lte.${monthEnd}&end_date=gte.${monthStart}`;
    // Debug logs removed for production
    return {
      url,
      method: 'GET',
    };
  });

  // Chart options specifically for headcount chart (shows month/year)
  public get headcountChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#18181b',
          titleColor: '#fbbf24',
          bodyColor: '#ffffff',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label || 'Empleados';
              return `${label}: ${y}`;
            },
            title: (ctx: any) => {
              // Show month/year from chart labels
              const chart = ctx[0]?.chart;
              if (chart && chart.data && chart.data.labels) {
                const index = ctx[0]?.dataIndex;
                if (index !== undefined && chart.data.labels[index]) {
                  return chart.data.labels[index];
                }
              }
              // Fallback: get from computed
              const data: any = this.headcountChartData();
              const labels = data?.labels || [];
              const index = ctx[0]?.dataIndex;
              if (index !== undefined && labels[index]) {
                return labels[index];
              }
              return '';
            },
          },
        },
      },
      scales: {
        x: { 
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          beginAtZero: false,
          grid: { display: false },
        },
      },
      elements: {
        line: { 
          tension: 0.4, 
          borderWidth: 3,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
        },
        point: { 
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10,
          hoverBorderWidth: 2,
        },
      },
      onClick: (evt: any, active: any[]) => {
        // Handle click on headcount chart to show hires/exits for that month
        if (active && active.length > 0) {
          const idx = active[0].index;
          const data: any = this.headcountChartData();
          const labels = data?.labels || [];
          
          if (idx !== undefined && labels[idx]) {
            // Parse the month/year from label (e.g., "Ene 2024")
            const label = labels[idx];
            this.openMonthHiresExitsDialog(label, idx);
          }
        }
      },
    };
  }

  // Chart options for Tardanzas del Mes - Same style as headcount chart
  public get latesChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#18181b',
          titleColor: '#fbbf24',
          bodyColor: '#ffffff',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label || 'Tardanzas';
              return `${label}: ${y}`;
            },
            afterLabel: (ctx: any) => {
              const names: string[] | undefined = (ctx.dataset as any)
                ?.customNames?.[ctx.dataIndex];
              if (!names || names.length === 0) return '';
              return names.map((n) => ` ${n}`);
            },
            title: (ctx: any) => {
              const dayNum = ctx[0]?.dataIndex + 1;
              const now = new Date();
              const monthName = this.getMonthNameSpanish(now);
              return `Día ${dayNum} ${monthName}`;
            },
          },
        },
      },
      scales: {
        x: { 
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          beginAtZero: false,
          grid: { display: false },
        },
      },
      elements: {
        line: { 
          tension: 0.4, 
          borderWidth: 3,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
        },
        point: { 
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10,
          hoverBorderWidth: 2,
        },
      },
      onClick: (evt: any, active: any[]) => {
        if (active && active.length > 0) {
          const idx = active[0].index;
          const data: any = this.latesDailyChartData();

          if (data && data.datasets && data.datasets.length > 0) {
            const ds: any = data.datasets[0];
            const details = (ds?.customDetails?.[idx] ?? []) as any[];

            const sortedDetails = [...details].sort((a, b) => {
              const aMinutes = a.minutesLate ?? 0;
              const bMinutes = b.minutesLate ?? 0;
              return bMinutes - aMinutes;
            });

            const now = new Date();
            const dayNum = idx + 1;
            const monthName = this.getMonthNameSpanish(now);
            const title = `Tardanzas - Día ${dayNum} ${monthName}`;

            this.lateDialogTitle.set(title);
            this.lateDialogDetails.set(sortedDetails);
            this.lateDialogVisible.set(true);
          }
        }
      },
    };
  }

  // Mini line chart options for KPI sparkline - Improved with better styling
  public get sparklineOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#18181b',
          titleColor: '#fbbf24',
          bodyColor: '#ffffff',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label;
              return label ? `${label}: ${y}` : `${y}`;
            },
            afterLabel: (ctx: any) => {
              const names: string[] | undefined = (ctx.dataset as any)
                ?.customNames?.[ctx.dataIndex];
              if (!names || names.length === 0) return '';
              // Return full list (one name per line)
              return names.map((n) => ` ${n}`);
            },
            title: (ctx: any) => {
              // Show month/year in title for headcount chart
              const data: any = this.headcountChartData();
              const labels = data?.labels || [];
              const index = ctx[0]?.dataIndex;
              if (index !== undefined && labels[index]) {
                return labels[index];
              }
              // Fallback for other charts (like lates)
              const dayNum = ctx[0]?.dataIndex + 1;
              return `Día ${dayNum}`;
            },
          },
        },
      },
      scales: {
        x: { 
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          beginAtZero: false,
          grid: { display: false },
        },
      },
      elements: {
        line: { 
          tension: 0.4, 
          borderWidth: 3,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
        },
        point: { 
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10,
          hoverBorderWidth: 2,
        },
      },
      onClick: (evt: any, active: any[]) => {
        // Handle click directly in options
        if (active && active.length > 0) {
          const idx = active[0].index;
          const data: any = this.latesDailyChartData();

          if (data && data.datasets && data.datasets.length > 0) {
            const ds: any = data.datasets[0];
            const labels: any[] = data.labels || [];
            const details = (ds?.customDetails?.[idx] ?? []) as any[];

            // Sort details by minutesLate descending (highest first)
            const sortedDetails = [...details].sort((a, b) => {
              const aMinutes = a.minutesLate ?? 0;
              const bMinutes = b.minutesLate ?? 0;
              return bMinutes - aMinutes; // Descending order
            });

            // Format title: "Día 1 Nov"
            const now = new Date();
            const dayNum = idx + 1;
            const monthName = this.getMonthNameSpanish(now);
            const title = `Tardanzas - Día ${dayNum} ${monthName}`;

            this.lateDialogTitle.set(title);
            this.lateDialogDetails.set(sortedDetails);
            this.lateDialogVisible.set(true);
          }
        }
      },
    };
  }

  // Generate headcount trend by month/year based on actual employee start dates
  public headcountChartData = computed(() => {
    const employees = this.employees.entities();
    const terminations = this.terminationsApi.value() ?? [];
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    
    // Get the start of the current month and go back 24 months
    const endDate = startOfMonth(now);
    const startDate = subMonths(endDate, 23);
    
    // Generate array of months
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    // Calculate headcount for each month
    const data: number[] = [];
    const labels: string[] = [];
    
    for (const month of months) {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthStartTimestamp = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate(), 0, 0, 0, 0).getTime();
      const monthEndTimestamp = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999).getTime();
      const isCurrentOrFutureMonth = month.getTime() >= currentMonthStart.getTime();
      
      // Count employees who were active at the end of this specific month/year
      const headcount = employees.filter((emp) => {
        // ============================================
        // CASE 1: CURRENT OR FUTURE MONTHS
        // ============================================
        // For current/future months, use is_active flag as source of truth
        // This ensures consistency with state.headCount()
        if (isCurrentOrFutureMonth) {
          // Only count employees who are currently active
          return emp.is_active === true;
        }
        
        // ============================================
        // CASE 2: PAST MONTHS
        // ============================================
        // For past months, calculate based on start_date and termination dates
        // An employee was active at the end of a past month if:
        // 1. They started on or before the last day of that month
        // 2. They were NOT terminated on or before the last day of that month
        
        // If employee has no start_date, we cannot determine if they were active in past months
        if (!emp.start_date) {
          return false;
        }
        
        // Parse start_date (handle both Date objects and ISO strings)
        let empStartDate: Date;
        try {
          const startDateValue: Date | string = emp.start_date as any;
          if (startDateValue instanceof Date) {
            empStartDate = startDateValue;
          } else if (typeof startDateValue === 'string') {
            empStartDate = parseISO(startDateValue);
          } else {
            return false; // Invalid start_date format
          }
        } catch (error) {
          return false; // Failed to parse start_date
        }
        
        // Normalize start_date to start of day for comparison
        const empStartTimestamp = new Date(
          empStartDate.getFullYear(),
          empStartDate.getMonth(),
          empStartDate.getDate(),
          0, 0, 0, 0
        ).getTime();
        
        // Employee must have started on or before the last day of this month
        // If they started after this month, they cannot be counted
        if (empStartTimestamp > monthEndTimestamp) {
          return false;
        }
        
        // Now check if employee was terminated before or during this month
        // Check termination date from terminations table first
        const termination = terminations.find((t) => t.employee_id === emp.id);
        if (termination && termination.date) {
          try {
            const termDateValue: Date | string = termination.date as any;
            let termDate: Date | null = null;
            if (termDateValue instanceof Date) {
              termDate = termDateValue;
            } else if (typeof termDateValue === 'string') {
              termDate = parseISO(termDateValue);
            }
            
            if (termDate) {
              const termDateTimestamp = new Date(
                termDate.getFullYear(),
                termDate.getMonth(),
                termDate.getDate(),
                0, 0, 0, 0
              ).getTime();
              
              // If terminated on or before the last day of this month, exclude
              if (termDateTimestamp <= monthEndTimestamp) {
                return false;
              }
            }
          } catch (error) {
            // Failed to parse termination date, continue to check end_date
          }
        }
        
        // Check end_date field (some employees may have end_date instead of termination record)
        if (emp.end_date) {
          try {
            const endDateValue: Date | string = emp.end_date as any;
            let empEndDate: Date;
            if (endDateValue instanceof Date) {
              empEndDate = endDateValue;
            } else if (typeof endDateValue === 'string') {
              empEndDate = parseISO(endDateValue);
            } else {
              // Invalid end_date format, assume employee was active
              // (if end_date is invalid, we can't determine termination)
              return true;
            }
            
            const empEndDateTimestamp = new Date(
              empEndDate.getFullYear(),
              empEndDate.getMonth(),
              empEndDate.getDate(),
              0, 0, 0, 0
            ).getTime();
            
            // If end_date is on or before the last day of this month, exclude
            if (empEndDateTimestamp <= monthEndTimestamp) {
              return false;
            }
          } catch (error) {
            // Failed to parse end_date, assume employee was active
            // (if end_date is invalid, we can't determine termination)
          }
        }
        
        // Additional check: If employee is currently inactive and has no termination date,
        // they might have been terminated but the date wasn't recorded properly.
        // For past months, if they're inactive now and we can't find a termination date,
        // we should be conservative and exclude them if the month is recent (within last 12 months)
        // Otherwise, assume they were active if they passed all other checks
        const monthsAgo = Math.floor((now.getTime() - monthEndTimestamp) / (1000 * 60 * 60 * 24 * 30));
        if (!emp.is_active && monthsAgo <= 12) {
          // If employee is inactive and month is recent, and we couldn't find termination date,
          // they were likely terminated but date wasn't recorded - exclude them
          if (!termination && !emp.end_date) {
            return false;
          }
        }
        
        // Employee passed all checks:
        // - Started on or before the end of this month
        // - Was not terminated on or before the end of this month
        return true;
      }).length;
      
      data.push(headcount);
      
      // Format label as "Mes Año" (e.g., "Ene 2024")
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthName = monthNames[month.getMonth()];
      const year = format(month, 'yyyy');
      labels.push(`${monthName} ${year}`);
    }

    return {
      labels,
      datasets: [
        {
          data,
          label: 'Empleados',
          borderColor: '#FCD34D',
          backgroundColor: 'rgba(252, 211, 77, 0.25)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#FCD34D',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#FCD34D',
          pointHoverBorderColor: '#fff',
        },
      ],
    };
  });

  // Daily lates for current month (sparkline like headcount), using Supabase if available
  public latesDailyChartData = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysSoFar = now.getDate();

    // Labels: 1 .. daysInMonth (gráfico del 1 al día actual; los futuros van en 0)
    const labels = Array.from({ length: daysSoFar }, (_, i) => `${i + 1}`);

    // PRIMARY: Calculate from timelogs + schedules in real-time
    const totalsByDate = new Map<string, number>(); // Key: yyyy-MM-dd
    const namesByDate = new Map<string, string[]>();
    const timelogs = this.latesFromTimelogs.value() ?? [];
    const schedules = this.employeeSchedules.value() ?? [];
    const detailsByDate = new Map<
      string,
      {
        name: string;
        scheduledEntry?: string;
        actualEntry?: string;
        minutesLate?: number;
      }[]
    >();

    if (timelogs.length > 0 && schedules.length > 0) {
      const entriesByEmployeeDay = new Map<string, any>();
      for (const log of timelogs) {
        // Solo considerar entradas (type === 'entry')
        if (log.type !== 'entry') {
          continue;
        }

        const entryTime = new Date(log.created_at);
        // Verificar que la entrada esté en el mes actual (sin filtrar por día específico)
        const entryMonth = entryTime.getMonth();
        const entryYear = entryTime.getFullYear();
        const entryDay = entryTime.getDate();

        if (entryMonth !== month || entryYear !== year) {
          continue; // Skip entries outside current month
        }

        const dayKey = `${log.employee_id}_${format(entryTime, 'yyyy-MM-dd')}`;
        if (!entriesByEmployeeDay.has(dayKey)) {
          entriesByEmployeeDay.set(dayKey, {
            employee_id: log.employee_id,
            employee_name: `${log.employee?.first_name ?? ''} ${
              log.employee?.father_name ?? ''
            }`.trim(),
            entry_time: entryTime,
            day: format(entryTime, 'yyyy-MM-dd'),
          });
        }
      }

      const entryDays = Array.from(entriesByEmployeeDay.values())
        .map((e) => e.day)
        .sort();
      const uniqueDays = Array.from(new Set(entryDays));

      for (const [, entry] of entriesByEmployeeDay) {
        // Buscar horarios que se solapen con el día de la entrada
        const matchingSchedules = schedules.filter(
          (s: any) => s.employee_id === entry.employee_id
        );

        const schedule = matchingSchedules.find(
          (s: any) => s.start_date <= entry.day && s.end_date >= entry.day
        );

        // Excluir si no hay schedule o no hay entry_time configurado
        if (!schedule || !schedule.schedule?.entry_time) {
          continue;
        }

        // Excluir feriados y días libres (IDs específicos) - misma lógica que timelogs
        const scheduleId = schedule.schedule.id;
        const isFeriado = scheduleId === '3d07f626-d58f-4203-bac5-f6e35557e0ad';
        const isDiaLibre =
          scheduleId === 'c01dff8f-ce0d-498f-a473-46418576e589';
        if (isFeriado || isDiaLibre || schedule.schedule?.day_off) {
          continue;
        }

        // Convertir ambos tiempos al mismo formato (24h) para comparar correctamente
        // entry_time puede venir como string "HH:mm:ss" o como Date object
        let scheduledEntry: string;
        if (schedule.schedule.entry_time instanceof Date) {
          scheduledEntry = format(schedule.schedule.entry_time, 'HH:mm:ss');
        } else if (typeof schedule.schedule.entry_time === 'string') {
          // Asegurar formato HH:mm:ss (agregar segundos si faltan)
          const parts = schedule.schedule.entry_time.split(':');
          scheduledEntry =
            parts.length >= 2
              ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(
                  parts[2] || '00'
                ).padStart(2, '0')}`
              : schedule.schedule.entry_time;
        } else {
          continue; // Skip si no hay entry_time válido
        }
        const actualEntry = format(entry.entry_time, 'HH:mm:ss'); // Formato 24h para comparar con scheduledEntry
        const minutesLate = this.calcTimeDiff(actualEntry, scheduledEntry);
        const tolerance = schedule.schedule.minutes_tolerance ?? 0;

        // Solo contar como tardanza si minutesLate > tolerance (misma lógica que timelogs)
        if (minutesLate > tolerance) {
          const dateKey = entry.day; // yyyy-MM-dd
          totalsByDate.set(dateKey, (totalsByDate.get(dateKey) ?? 0) + 1);
          const arr = namesByDate.get(dateKey) ?? [];
          if (entry.employee_name && !arr.includes(entry.employee_name))
            arr.push(entry.employee_name);
          namesByDate.set(dateKey, arr);
          const detArr = detailsByDate.get(dateKey) ?? [];
          detArr.push({
            name: entry.employee_name,
            scheduledEntry: scheduledEntry,
            actualEntry: actualEntry,
            minutesLate: minutesLate,
          });
          detailsByDate.set(dateKey, detArr);
        }
      }
    }

    // Build month-to-date data: 1..daysSoFar
    const data: number[] = [];
    const customNames: string[][] = [];
    const customDetails: any[] = [];

    for (let d = 1; d <= daysSoFar; d++) {
      const dateKey = format(new Date(year, month, d), 'yyyy-MM-dd');
      const count = totalsByDate.get(dateKey) ?? 0;
      const names = namesByDate.get(dateKey) ?? [];
      const details = detailsByDate.get(dateKey) ?? [];

      data.push(count);
      customNames.push(names);
      customDetails.push(details);
    }

    return {
      labels,
      datasets: [
        {
          data,
          label: 'Tardanzas',
          borderColor: '#FCD34D',
          backgroundColor: 'rgba(252, 211, 77, 0.25)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#FCD34D',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#FCD34D',
          pointHoverBorderColor: '#fff',
          customNames,
          customDetails,
        },
      ],
    };
  });

  public ageRanges = [
    { key: '18-25', label: '18-25 años' },
    { key: '26-35', label: '26-35 años' },
    { key: '36-45', label: '36-45 años' },
    { key: '46-55', label: '46-55 años' },
    { key: '56+', label: '56+ años' },
  ];

  public selectSection(sectionId: string): void {
    this.activeSection.set(sectionId);
  }

  public toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  public openBirthdaysDialog(): void {
    this.birthdaysDialogVisible.set(true);
  }

  public openHiresExitsDialog(): void {
    this.hiresExitsDialogVisible.set(true);
    this.hiresExitsTab.set('hires');
  }

  // Get monthly hires list
  public monthlyHiresList = computed(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return this.employees
      .entities()
      .filter(
        (x) =>
          x.start_date &&
          new Date(x.start_date) >= monthStart &&
          new Date(x.start_date) <= monthEnd
      )
      .map((x) => ({
        first_name: x.first_name,
        father_name: x.father_name,
        start_date: x.start_date,
        branch: x.branch,
        position: x.position,
      }))
      .sort((a, b) => {
        if (!a.start_date || !b.start_date) return 0;
        return (
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
      });
  });

  // Get monthly exits list
  public monthlyExitsList = computed(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const terminations = this.terminationsApi.value() ?? [];
    return terminations
      .filter((t) => {
        if (!t.date) return false;
        const terminationDate = new Date(t.date);
        return terminationDate >= monthStart && terminationDate <= monthEnd;
      })
      .map((t) => ({
        date: t.date,
        reason: t.reason,
        employee: this.employees.entities().find((e) => e.id === t.employee_id),
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  });

  public getHireDate(date: Date | undefined): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return `${d.getDate()} de ${this.getBirthdayMonth(date)}`;
  }

  public getExitDate(date: Date | string | undefined): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return `${d.getDate()} de ${this.getBirthdayMonth(d)}`;
  }

  public openMonthHiresExitsDialog(monthLabel: string, monthIndex: number): void {
    this.selectedMonthLabel.set(monthLabel);
    this.selectedMonthIndex.set(monthIndex);
    this.monthHiresExitsDialogVisible.set(true);
    this.monthHiresExitsTab.set('hires');
  }

  // Get hires list for selected month from headcount chart
  public selectedMonthHiresList = computed(() => {
    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.headcountChartData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    // Parse month/year from label (e.g., "Ene 2024")
    const label = labels[monthIndex];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const parts = label.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndexNum = monthNames.indexOf(monthName);
    
    if (monthIndexNum === -1 || isNaN(year)) return [];

    const monthStart = new Date(year, monthIndexNum, 1);
    const monthEnd = endOfMonth(monthStart);

    return this.employees
      .entities()
      .filter((x) => {
        if (!x.start_date) return false;
        const startDateValue: Date | string = x.start_date as any;
        const startDate = startDateValue instanceof Date 
          ? startDateValue 
          : parseISO(startDateValue);
        return startDate >= monthStart && startDate <= monthEnd;
      })
      .map((x) => ({
        first_name: x.first_name,
        father_name: x.father_name,
        start_date: x.start_date,
        branch: x.branch,
        position: x.position,
      }))
      .sort((a, b) => {
        if (!a.start_date || !b.start_date) return 0;
        const aDate: Date | string = a.start_date as any;
        const bDate: Date | string = b.start_date as any;
        const aDateObj = aDate instanceof Date ? aDate : parseISO(aDate);
        const bDateObj = bDate instanceof Date ? bDate : parseISO(bDate);
        return aDateObj.getTime() - bDateObj.getTime();
      });
  });

  // Get exits list for selected month from headcount chart
  public selectedMonthExitsList = computed(() => {
    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.headcountChartData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    // Parse month/year from label (e.g., "Ene 2024")
    const label = labels[monthIndex];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const parts = label.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndexNum = monthNames.indexOf(monthName);
    
    if (monthIndexNum === -1 || isNaN(year)) return [];

    const monthStart = new Date(year, monthIndexNum, 1);
    const monthEnd = endOfMonth(monthStart);

    const terminations = this.terminationsApi.value() ?? [];
    return terminations
      .filter((t) => {
        if (!t.date) return false;
        const termDateValue: Date | string = t.date as any;
        const terminationDate = termDateValue instanceof Date 
          ? termDateValue 
          : parseISO(termDateValue);
        const termDateNormalized = new Date(terminationDate.getFullYear(), terminationDate.getMonth(), terminationDate.getDate());
        const monthStartNormalized = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
        const monthEndNormalized = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
        return termDateNormalized >= monthStartNormalized && termDateNormalized <= monthEndNormalized;
      })
      .map((t) => ({
        date: t.date,
        reason: t.reason,
        employee: this.employees.entities().find((e) => e.id === t.employee_id),
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const aDateValue: Date | string = a.date as any;
        const bDateValue: Date | string = b.date as any;
        const aDate = aDateValue instanceof Date ? aDateValue : parseISO(aDateValue);
        const bDate = bDateValue instanceof Date ? bDateValue : parseISO(bDateValue);
        return aDate.getTime() - bDate.getTime();
      });
  });

  public branchLabels = computed(() =>
    this.state.employeesByBranch().map((x) => x.branch?.name || 'Sin sucursal')
  );

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
        borderColor: 'rgba(251, 191, 36, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
          },
        },
        grid: {
          color: 'rgba(251, 191, 36, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
          },
        },
        grid: {
          color: 'rgba(251, 191, 36, 0.1)',
        },
      },
    },
  };

  // Computed signals for gender percentages
  public malePercentage = computed(() => {
    const total = this.state.headCount();
    if (total === 0) return 0;
    const count = this.state.countByGender()['M'] || 0;
    return Math.round((count / total) * 100);
  });

  public femalePercentage = computed(() => {
    const total = this.state.headCount();
    if (total === 0) return 0;
    const count = this.state.countByGender()['F'] || 0;
    return Math.round((count / total) * 100);
  });

  /**
   * Chart.js data for gender distribution donut chart
   * Returns data in Chart.js format with labels and datasets
   */
  public genderChartData = computed(() => {
    const maleCount = this.state.countByGender()['M'] || 0;
    const femaleCount = this.state.countByGender()['F'] || 0;
    const total = maleCount + femaleCount;

    return {
      labels: ['Masculino', 'Femenino'],
      datasets: [
        {
          data: [maleCount, femaleCount],
          backgroundColor: ['#3b82f6', '#f472b6'],
          borderColor: ['#3b82f6', '#f472b6'],
          borderWidth: 0,
        },
      ],
    };
  });

  /**
   * Chart.js options for semicircular donut chart
   * Configured to show only top half (semicircle)
   */
  public genderChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        borderColor: 'rgba(107, 114, 128, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage =
              total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  /**
   * Chart.js data for hires/exits distribution donut chart
   * Returns data in Chart.js format with labels and datasets
   */
  public hiresExitsChartData = computed(() => {
    const hires = this.monthlyHiresAndExits().hires;
    const exits = this.monthlyHiresAndExits().exits;

    return {
      labels: ['Ingresos', 'Salidas'],
      datasets: [
        {
          data: [hires, exits],
          backgroundColor: ['#10b981', '#ef4444'],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };
  });

  /**
   * Chart.js options for semicircular donut chart (hires/exits)
   * Configured to show only top half (semicircle)
   */
  public hiresExitsChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        borderColor: 'rgba(107, 114, 128, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage =
              total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Helper methods for gender data
  public getGenderCount(gender: 'M' | 'F'): number {
    return this.state.countByGender()[gender] || 0;
  }

  public getGenderPercentage(gender: 'M' | 'F'): number {
    const maleCount = this.state.countByGender()['M'] || 0;
    const femaleCount = this.state.countByGender()['F'] || 0;
    const total = maleCount + femaleCount;

    if (total === 0) return 0;

    const count = gender === 'M' ? maleCount : femaleCount;
    return Math.round((count / total) * 100);
  }

  // Helper methods for hires/exits data
  public getHiresExitsCount(type: 'hires' | 'exits'): number {
    const data = this.monthlyHiresAndExits();
    return type === 'hires' ? data.hires : data.exits;
  }

  public getMonthlyLates(): number {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // PRIMARY: Usar directamente el total del gráfico (misma fuente que muestra el gráfico)
    // El gráfico ya excluye casos sin horario o con errores
    const chartData = this.latesDailyChartData();
    if (
      chartData &&
      chartData.datasets &&
      chartData.datasets[0] &&
      chartData.datasets[0].data
    ) {
      const totalFromChart = chartData.datasets[0].data.reduce(
        (sum: number, val: number) => sum + val,
        0
      );
      return totalFromChart;
    }

    // FALLBACK: Calculate from timelogs + schedules in real-time (misma lógica que el gráfico)
    // Este cálculo excluye casos sin horario o con errores
    const timelogs = this.latesFromTimelogs.value() ?? [];
    const schedules = this.employeeSchedules.value() ?? [];

    if (timelogs.length > 0 && schedules.length > 0) {
      let lateCount = 0;
      const timelogsNow = new Date();
      const timelogsCurrentMonth = timelogsNow.getMonth();
      const timelogsCurrentYear = timelogsNow.getFullYear();

      // Group timelogs by employee and day (first entry of the day)
      const entriesByEmployeeDay = new Map<string, any>();

      for (const log of timelogs) {
        // Solo considerar entradas (type === 'entry')
        if (log.type !== 'entry') {
          continue;
        }

        const entryTime = new Date(log.created_at);
        const logMonth = entryTime.getMonth();
        const logYear = entryTime.getFullYear();

        if (
          logMonth !== timelogsCurrentMonth ||
          logYear !== timelogsCurrentYear
        ) {
          continue; // Skip dates outside current month
        }

        const dayKey = `${log.employee_id}_${format(entryTime, 'yyyy-MM-dd')}`;

        // Keep only the first entry of the day
        if (!entriesByEmployeeDay.has(dayKey)) {
          entriesByEmployeeDay.set(dayKey, {
            employee_id: log.employee_id,
            employee_name: `${log.employee?.first_name ?? ''} ${
              log.employee?.father_name ?? ''
            }`.trim(),
            entry_time: entryTime,
            day: format(entryTime, 'yyyy-MM-dd'),
          });
        }
      }

      let entriesWithoutSchedule = 0;
      let entriesWithScheduleErrors = 0;
      let entriesProcessed = 0;

      // Check each entry against schedule
      for (const [_, entry] of entriesByEmployeeDay) {
        // Find schedule for this employee on this day
        const schedule = schedules.find(
          (s: any) =>
            s.employee_id === entry.employee_id &&
            s.start_date <= entry.day &&
            s.end_date >= entry.day
        );

        // Excluir si no hay schedule o no hay entry_time configurado
        if (!schedule || !schedule.schedule?.entry_time) {
          entriesWithoutSchedule++;
          continue; // No schedule or no entry time defined
        }

        // Excluir feriados y días libres (IDs específicos)
        const scheduleId = schedule.schedule.id;
        const isFeriado = scheduleId === '3d07f626-d58f-4203-bac5-f6e35557e0ad';
        const isDiaLibre =
          scheduleId === 'c01dff8f-ce0d-498f-a473-46418576e589';
        if (isFeriado || isDiaLibre || schedule.schedule?.day_off) {
          entriesWithScheduleErrors++;
          continue; // Excluir feriados, días libres y días sin horario válido
        }

        entriesProcessed++;

        // Convertir ambos tiempos al mismo formato (24h) para comparar correctamente
        // entry_time puede venir como string "HH:mm:ss" o como Date object
        let scheduledEntry: string;
        if (schedule.schedule.entry_time instanceof Date) {
          scheduledEntry = format(schedule.schedule.entry_time, 'HH:mm:ss');
        } else if (typeof schedule.schedule.entry_time === 'string') {
          // Asegurar formato HH:mm:ss (agregar segundos si faltan)
          const parts = schedule.schedule.entry_time.split(':');
          scheduledEntry =
            parts.length >= 2
              ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(
                  parts[2] || '00'
                ).padStart(2, '0')}`
              : schedule.schedule.entry_time;
        } else {
          continue; // Skip si no hay entry_time válido
        }
        const actualEntry = format(entry.entry_time, 'HH:mm:ss'); // Formato 24h para comparar con scheduledEntry
        const minutesLate = this.calcTimeDiff(actualEntry, scheduledEntry);
        const tolerance = schedule.schedule.minutes_tolerance ?? 0;

        if (minutesLate > tolerance) {
          lateCount++;
        }
      }

      return lateCount;
    }

    return 0;
  }

  // Helper function to calculate time difference in minutes
  // Returns positive minutes if actualTime is later than scheduledTime (person is late)
  // Returns negative minutes if actualTime is earlier than scheduledTime (person is early)
  private calcTimeDiff(actualTime: string, scheduledTime: string): number {
    if (!actualTime || !scheduledTime) return 0;
    const actual = new Date();
    const scheduled = new Date();
    const actualParts = actualTime.split(':');
    const scheduledParts = scheduledTime.split(':');

    if (actualParts.length < 2 || scheduledParts.length < 2) return 0;

    actual.setHours(+actualParts[0], +actualParts[1], 0, 0);
    scheduled.setHours(+scheduledParts[0], +scheduledParts[1], 0, 0);

    // Return actual - scheduled: positive if late, negative if early
    return differenceInMinutes(actual, scheduled);
  }

  public getScheduleComplianceIndex(): number {
    // Placeholder: índice de cumplimiento de horario
    // En una implementación real, esto se calcularía basado en:
    // - Registros de entrada/salida vs horarios programados
    // - Tardanzas
    const lates = this.getMonthlyLates();
    const totalEmployees = this.state.headCount();

    if (totalEmployees === 0) return 100;

    // Cálculo aproximado: 100% menos tardanzas
    const latesPercentage = (lates / totalEmployees) * 100;
    const compliance = Math.max(0, 100 - latesPercentage);
    return Math.round(compliance);
  }

  public getWorkClimateIndex(): number {
    // Placeholder: índice de clima laboral
    // En una implementación real, esto vendría de encuestas de satisfacción
    // Por ahora, calculamos un índice basado en otros KPIs:
    const retention = this.state.retentionRate();
    const exits = this.monthlyHiresAndExits().exits;
    const totalEmployees = this.state.headCount();
    const absenteeism = totalEmployees > 0 ? (exits / totalEmployees) * 100 : 0;
    const turnover = this.state.monthlyTurnover();

    // Índice aproximado basado en retención alta, ausentismo bajo y rotación baja
    const baseIndex = retention;
    const absenteeismPenalty = absenteeism * 0.5; // Penalización por ausentismo
    const turnoverPenalty = turnover * 0.3; // Penalización por rotación

    const climateIndex = Math.max(
      0,
      Math.min(100, baseIndex - absenteeismPenalty - turnoverPenalty)
    );
    return Math.round(climateIndex);
  }

  public getAgeCount(range: string): number {
    const distribution = this.state.ageDistribution() as Record<string, number>;
    return distribution[range] || 0;
  }

  public getAgePercentage(range: string): number {
    const total = this.state.headCount();
    if (total === 0) return 0;
    const count = this.getAgeCount(range);
    return Math.round((count / total) * 100);
  }

  public getContractPercentage(type: 'fixed' | 'temporary'): number {
    const distribution = this.state.contractDistribution();
    const total = distribution.fixed + distribution.temporary;
    if (total === 0) return 0;
    return Math.round((distribution[type] / total) * 100);
  }

  public currentMonth = computed(() => {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return months[new Date().getMonth()];
  });

  public getBirthdayDay(date: Date | undefined): string {
    if (!date) return '??';
    return new Date(date).getDate().toString();
  }

  public getBirthdayMonth(date: Date | undefined): string {
    if (!date) return '???';
    const months = [
      'ENE',
      'FEB',
      'MAR',
      'ABR',
      'MAY',
      'JUN',
      'JUL',
      'AGO',
      'SEP',
      'OCT',
      'NOV',
      'DIC',
    ];
    return months[new Date(date).getMonth()];
  }

  public hasBirthdayPassed(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    const birthDate = new Date(date);
    return (
      birthDate.getDate() < today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    );
  }

  public isBirthdayToday(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    const birthDate = new Date(date);
    return (
      birthDate.getDate() === today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    );
  }

  public getSortedBirthdays() {
    const birthdays = [...this.state.birthDates()];
    const today = new Date();
    const currentDay = today.getDate();

    return birthdays.sort((a, b) => {
      if (!a.birth_date || !b.birth_date) return 0;

      const dayA = new Date(a.birth_date).getDate();
      const dayB = new Date(b.birth_date).getDate();

      // Los de hoy primero
      const isTodayA = dayA === currentDay;
      const isTodayB = dayB === currentDay;
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // Luego los que vienen (día mayor al actual)
      const isUpcomingA = dayA > currentDay;
      const isUpcomingB = dayB > currentDay;
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      // Dentro de cada grupo, ordenar por día
      return dayA - dayB;
    });
  }

  private generateCorporateColors(count: number): {
    backgroundColor: string[];
    borderColor: string[];
  } {
    const baseColors = [
      { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.8)' },
      { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.7)' },
      { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.6)' },
    ];

    const backgroundColor: string[] = [];
    const borderColor: string[] = [];

    for (let i = 0; i < count; i++) {
      const color = baseColors[i % baseColors.length];
      backgroundColor.push(color.bg);
      borderColor.push(color.border);
    }

    return { backgroundColor, borderColor };
  }

  // Late details dialog state
  public lateDialogVisible = signal(false);
  public lateDialogTitle = signal('Tardanzas');
  public lateDialogDetails = signal<
    {
      name: string;
      scheduledEntry?: string;
      actualEntry?: string;
      minutesLate?: number;
    }[]
  >([]);

  // Birthdays dialog state
  public birthdaysDialogVisible = signal(false);

  // Hires and Exits Dialog
  public hiresExitsDialogVisible = signal(false);
  public hiresExitsTab = signal<'hires' | 'exits'>('hires');
  
  // Month-specific Hires and Exits Dialog
  public monthHiresExitsDialogVisible = signal(false);
  public monthHiresExitsTab = signal<'hires' | 'exits'>('hires');
  public selectedMonthLabel = signal<string>('');
  public selectedMonthIndex = signal<number>(-1);

  // Helper to get month name in Spanish
  private getMonthNameSpanish(date: Date): string {
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return months[date.getMonth()];
  }

  public onLatesChartClick(evt: any) {
    // Chart.js click event structure: { event: MouseEvent, active: Array }
    const activePoints = evt?.active;
    if (!activePoints || activePoints.length === 0) {
      return;
    }

    const firstPoint = activePoints[0];
    const idx = firstPoint?.index;

    if (idx == null || idx < 0) {
      return;
    }

    const data: any = this.latesDailyChartData();

    if (!data || !data.datasets || data.datasets.length === 0) {
      return;
    }

    const ds: any = data.datasets[0];
    const labels: any[] = data.labels || [];
    const details = (ds?.customDetails?.[idx] ?? []) as any[];

    // Sort details by minutesLate descending (highest first)
    const sortedDetails = [...details].sort((a, b) => {
      const aMinutes = a.minutesLate ?? 0;
      const bMinutes = b.minutesLate ?? 0;
      return bMinutes - aMinutes; // Descending order
    });

    // Format title: "Día 1 Nov"
    const now = new Date();
    const dayNum = idx + 1;
    const monthName = this.getMonthNameSpanish(now);
    const title = `Tardanzas - Día ${dayNum} ${monthName}`;

    this.lateDialogTitle.set(title);
    this.lateDialogDetails.set(sortedDetails);
    this.lateDialogVisible.set(true);
  }
}
