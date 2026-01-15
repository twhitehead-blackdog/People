import { CommonModule, CurrencyPipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { BaseChartDirective } from 'ng2-charts';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import {
  getMonthNameSpanish,
  getPanamaNowParts,
} from '../utils/panama-date.utils';
import {
  LateDetail,
  LateDetailsDialogComponent,
import { AbsencesKpiComponent } from './components/kpi/absences-kpi.component';
import {
  Birthday,
  BirthdaysDialogComponent,
} from './components/dialogs/birthdays-dialog.component';
import {
  HireExitRecord,
  HiresExitsDialogComponent,
} from './components/dialogs/hires-exits-dialog.component';
import {
  LateDetail,
  LateDetailsDialogComponent,
} from './components/dialogs/late-details-dialog.component';
import {
  TopLateRecord,
  TopLatesDialogComponent,
} from './components/dialogs/top-lates-dialog.component';
import {
  TopAbsenceRecord,
  TopAbsencesDialogComponent,
} from './components/dialogs/top-absences-dialog.component';
import { BirthdaysKpiComponent } from './components/kpi/birthdays-kpi.component';
import { GenderKpiComponent } from './components/kpi/gender-kpi.component';
import { HeadcountKpiComponent } from './components/kpi/headcount-kpi.component';
import { HiresExitsKpiComponent } from './components/kpi/hires-exits-kpi.component';
import { LatesKpiComponent } from './components/kpi/lates-kpi.component';
import { PayrollKpiComponent } from './components/kpi/payroll-kpi.component';
import { SimpleKpiComponent } from './components/kpi/simple-kpi.component';
import {
  GENDER_CHART_OPTIONS,
  HEADCOUNT_CHART_OPTIONS,
  HIRES_EXITS_CHART_OPTIONS,
  LATES_CHART_OPTIONS,
} from './config/chart-options.config';
import { HomeDataService } from './services/home-data.service';
import { TardinessCalculationService } from './services/tardiness-calculation.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    TitleCasePipe,
    DialogModule,
    TooltipModule,
    CardModule,
    BaseChartDirective,
    HeadcountKpiComponent,
    GenderKpiComponent,
    HiresExitsKpiComponent,
    BirthdaysKpiComponent,
    LatesKpiComponent,
    AbsencesKpiComponent,
    SimpleKpiComponent,
    PayrollKpiComponent,
    LateDetailsDialogComponent,
    BirthdaysDialogComponent,
    HiresExitsDialogComponent,
    TopLatesDialogComponent,
    TopAbsencesDialogComponent,
  ],
  template: `
    <div class="dashboard-layout fade-in-up">
      <!-- Overlay para móvil cuando el sidebar está abierto -->
      @if (sidebarOpen()) {
      <div class="sidebar-overlay md:hidden" (click)="toggleSidebar()"></div>
      }
      <!-- Sidebar Navigation -->
      <aside class="dashboard-sidebar" [class.collapsed]="!sidebarOpen()">
        <div class="sidebar-header">
          <button
            class="sidebar-toggle min-w-[44px] min-h-[44px]"
            (click)="toggleSidebar()"
            [title]="sidebarOpen() ? 'Cerrar menú' : 'Abrir menú'"
          >
            <i [class]="sidebarOpen() ? 'pi pi-times' : 'pi pi-bars'"></i>
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

      <!-- Botón flotante para abrir sidebar en móvil -->
      <button
        class="mobile-sidebar-toggle"
        (click)="toggleSidebar()"
        [class.hidden]="sidebarOpen()"
        title="Abrir menú"
      >
        <i class="pi pi-bars"></i>
      </button>

      <main class="dashboard-container">
        <!-- Resumen Ejecutivo -->
        @if (activeSection() === 'executive') {
        <div class="section-content executive-section">
          <div class="kpi-grid executive-kpi-grid">
            <app-headcount-kpi
              [headcount]="state.headCount()"
              [chartData]="headcountChartData()"
              [chartOptions]="headcountChartOptions"
              (chartClick)="handleHeadcountChartClick($event)"
            ></app-headcount-kpi>

            <app-gender-kpi
              [maleCount]="getGenderCount('M')"
              [femaleCount]="getGenderCount('F')"
              [malePercentage]="getGenderPercentage('M')"
              [femalePercentage]="getGenderPercentage('F')"
              [chartData]="genderChartData()"
              [chartOptions]="genderChartOptions"
            ></app-gender-kpi>

            <app-lates-kpi
              [count]="getMonthlyLates()"
              [topEmployeeName]="getTopLatesEmployeeName()"
              [topEmployeeCount]="getTopLatesCount()"
              [chartData]="latesDailyChartData()"
              [chartOptions]="latesChartOptions"
              (chartClick)="handleLatesChartClick($event)"
            ></app-lates-kpi>

            <app-simple-kpi
              title="Top Tardanzas"
              [value]="getTopLatesCount()"
              [sublabel]="getTopLatesEmployeeName()"
              icon="pi-exclamation-triangle"
              tooltipText="Muestra el top de empleados con más tardanzas en el mes actual. Haz clic para ver la lista completa ordenada por número de tardanzas."
              (click)="openTopLatesDialog()"
              class="kpi-card-clickable"
            ></app-simple-kpi>

            <app-absences-kpi
              [maxAbsencesCount]="getTopAbsencesCount()"
              [topEmployeeName]="getTopAbsencesEmployeeName()"
              (click)="openTopAbsencesDialog()"
            ></app-absences-kpi>

            <app-hires-exits-kpi
              [hiresCount]="getHiresExitsCount('hires')"
              [exitsCount]="getHiresExitsCount('exits')"
              [chartData]="hiresExitsChartData()"
              [chartOptions]="hiresExitsChartOptions"
              (click)="openHiresExitsDialog()"
            ></app-hires-exits-kpi>

            <app-simple-kpi
              title="Tasa de Retención"
              [value]="state.retentionRate() + '%'"
              sublabel="Retención anual"
              icon="pi-heart"
              tooltipText="Mide el porcentaje de empleados que permanecen en la empresa después de 12 meses..."
            ></app-simple-kpi>

            <app-birthdays-kpi
              [count]="monthlyBirthdaysCount()"
              (click)="openBirthdaysDialog()"
            ></app-birthdays-kpi>

            <app-payroll-kpi
              [monthlyCost]="
                (state.monthlyBudget() | currency : '$' : 'symbol' : '1.0-0') ??
                '$0'
              "
              [annualCost]="
                (state.monthlyBudget() * 12
                  | currency : '$' : 'symbol' : '1.0-0') ?? '$0'
              "
            ></app-payroll-kpi>

            <app-simple-kpi
              title="Antigüedad Promedio"
              [value]="state.averageTenure()"
              sublabel="Años de experiencia"
              icon="pi-calendar-clock"
              tooltipText="Calcula el promedio de años de antigüedad de los empleados activos..."
            ></app-simple-kpi>

            <app-simple-kpi
              title="Edad Promedio"
              [value]="state.averageAge()"
              sublabel="Años promedio"
              icon="pi-calendar"
              tooltipText="Calcula la edad promedio de todos los empleados activos..."
            ></app-simple-kpi>

            <app-simple-kpi
              title="Salario Promedio"
              [value]="
                (state.averageSalary() | currency : '$' : 'symbol' : '1.0-0') ??
                '$0'
              "
              sublabel="Salario promedio"
              icon="pi-dollar"
              tooltipText="Calcula el salario mensual promedio de todos los empleados activos..."
              class="financial"
            ></app-simple-kpi>

            <app-simple-kpi
              title="Índice de Clima Laboral"
              [value]="getWorkClimateIndex() + '%'"
              sublabel="Satisfacción general"
              icon="pi-users"
              tooltipText="Indicador compuesto que mide el clima laboral..."
            ></app-simple-kpi>

            <app-simple-kpi
              title="Índice de Cumplimiento de Horario"
              [value]="getScheduleComplianceIndex() + '%'"
              sublabel="Cumplimiento mensual"
              icon="pi-check-circle"
              tooltipText="Mide el porcentaje de cumplimiento de horarios..."
            ></app-simple-kpi>
          </div>
          </div>
          <!-- Dialog for lates details -->
          <app-late-details-dialog
            [visible]="lateDialogVisible()"
            (visibleChange)="lateDialogVisible.set($event)"
            [title]="lateDialogTitle()"
            [details]="lateDialogDetails()"
          ></app-late-details-dialog>
          <!-- Dialog for birthdays details -->
          <app-birthdays-dialog
            [visible]="birthdaysDialogVisible()"
            (visibleChange)="birthdaysDialogVisible.set($event)"
            [birthdays]="state.birthDates()"
          ></app-birthdays-dialog>
          <!-- Dialog for hires and exits details -->
          <app-hires-exits-dialog
            [visible]="hiresExitsDialogVisible()"
            (visibleChange)="hiresExitsDialogVisible.set($event)"
            title="Ingresos y Salidas del Personal"
            [hires]="monthlyHiresListMapped()"
            [exits]="monthlyExitsListMapped()"
          ></app-hires-exits-dialog>
          <!-- Dialog for top lates -->
          <app-top-lates-dialog
            [visible]="topLatesDialogVisible()"
            (visibleChange)="topLatesDialogVisible.set($event)"
            [lates]="topLatesListMapped()"
          ></app-top-lates-dialog>
          <!-- Dialog for top absences -->
          <app-top-absences-dialog
            [visible]="topAbsencesDialogVisible()"
            (visibleChange)="topAbsencesDialogVisible.set($event)"
            [absences]="topAbsencesList()"
          ></app-top-absences-dialog>
          <!-- Dialog for month-specific hires and exits details -->
          <app-hires-exits-dialog
            [visible]="monthHiresExitsDialogVisible()"
            (visibleChange)="monthHiresExitsDialogVisible.set($event)"
            [title]="'Ingresos y Salidas - ' + selectedMonthLabel()"
            [hires]="selectedMonthHiresListMapped()"
            [exits]="selectedMonthExitsListMapped()"
          ></app-hires-exits-dialog>
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
                  {{
                    state.costPerEmployee()
                      | currency : '$' : 'symbol' : '1.0-0'
                  }}
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
                <div class="kpi-value">
                  {{ state.peopleEfficiencyRatio() }}%
                </div>
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
                    state.totalDebtAmount()
                      | currency : '$' : 'symbol' : '1.0-0'
                  }}
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
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  public state = inject(DashboardStore);
  public employees = inject(EmployeesStore);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);
  private homeData = inject(HomeDataService);
  public tardinessService = inject(TardinessCalculationService);

  // Inicializar sidebar como abierto en desktop, cerrado en móvil
  public sidebarOpen = signal(
    typeof window !== 'undefined' && window.innerWidth >= 769
  );
  public activeSection = signal('executive');

  // Computed para contar cumpleañeros del mes
  // Only calculate when executive or events section is active
  public monthlyBirthdaysCount = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      this.activeSection() !== 'events'
    ) {
      return 0;
    }
    return this.state.birthDates().length;
  });

  // Calcular ingresos y salidas del mes
  // Only calculate when executive section is active
  public monthlyHiresAndExits = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { hires: 0, exits: 0 };
    }
    return this.homeData.monthlyHiresAndExits();
  });

  // Effect para verificar la respuesta de employeeSchedules
  constructor() {
    effect(() => {
      const schedules = this.homeData.employeeSchedulesResource.value();
      const error = this.homeData.employeeSchedulesResource.error();
      const isLoading = this.homeData.employeeSchedulesResource.isLoading();

      if (!isLoading && error) {
        console.error('[HomeComponent] employeeSchedules - Error:', error);
      }
    });
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
          const data: any = this.homeData.headcountTrendData();
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


  // Generate headcount trend by month/year (Moved to Service)
  public headcountChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }
    return this.homeData.headcountTrendData();
  });

  // Daily lates for current month (Moved to Service)
  public latesDailyChartData = computed(() => {
    return this.tardinessService.latesChartData();
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
    // Cerrar sidebar en móvil después de seleccionar una sección
    if (window.innerWidth < 769) {
      this.sidebarOpen.set(false);
    }
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
  // Only calculate when executive section is active or dialog is open
  public monthlyHiresList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.hiresExitsDialogVisible()
    ) {
      return [];
    }

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
  // Only calculate when executive section is active or dialog is open
  // Get monthly exits list
  // Only calculate when executive section is active or dialog is open
  public monthlyExitsList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.hiresExitsDialogVisible()
    ) {
      return [];
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const terminations = this.homeData.terminationsResource.value() ?? [];
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

  public getBirthdayMonth(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date
      .toLocaleString('es-ES', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }

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

  public openMonthHiresExitsDialog(
    monthLabel: string,
    monthIndex: number
  ): void {
    this.selectedMonthLabel.set(monthLabel);
    this.selectedMonthIndex.set(monthIndex);
    this.monthHiresExitsDialogVisible.set(true);
    this.monthHiresExitsTab.set('hires');
  }

  // Get hires list for selected month from headcount chart
  // Only calculate when executive section is active or dialog is open
  public selectedMonthHiresList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.monthHiresExitsDialogVisible()
    ) {
      return [];
    }

    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.homeData.headcountTrendData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    // Parse month/year from label (e.g., "Ene 2024")
    const label = labels[monthIndex];
    const monthNames = [
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
        const startDate =
          startDateValue instanceof Date
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
  // Only calculate when executive section is active or dialog is open
  public selectedMonthExitsList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.monthHiresExitsDialogVisible()
    ) {
      return [];
    }

    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.homeData.headcountTrendData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    // Parse month/year from label (e.g., "Ene 2024")
    const label = labels[monthIndex];
    const monthNames = [
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
    const parts = label.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndexNum = monthNames.indexOf(monthName);

    if (monthIndexNum === -1 || isNaN(year)) return [];

    const monthStart = new Date(year, monthIndexNum, 1);
    const monthEnd = endOfMonth(monthStart);

    const terminations = this.homeData.terminationsResource.value() ?? [];
    return terminations
      .filter((t) => {
        if (!t.date) return false;
        const termDateValue: Date | string = t.date as any;
        const terminationDate =
          termDateValue instanceof Date
            ? termDateValue
            : parseISO(termDateValue);
        const termDateNormalized = new Date(
          terminationDate.getFullYear(),
          terminationDate.getMonth(),
          terminationDate.getDate()
        );
        const monthStartNormalized = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth(),
          monthStart.getDate()
        );
        const monthEndNormalized = new Date(
          monthEnd.getFullYear(),
          monthEnd.getMonth(),
          monthEnd.getDate()
        );
        return (
          termDateNormalized >= monthStartNormalized &&
          termDateNormalized <= monthEndNormalized
        );
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
        const aDate =
          aDateValue instanceof Date ? aDateValue : parseISO(aDateValue);
        const bDate =
          bDateValue instanceof Date ? bDateValue : parseISO(bDateValue);
        return aDate.getTime() - bDate.getTime();
      });
  });

  // Only calculate when structure section is active
  public branchLabels = computed(() => {
    if (this.activeSection() !== 'structure') {
      return [];
    }
    return this.state
      .employeesByBranch()
      .map((x) => x.branch?.name || 'Sin sucursal');
  });

  public branchData = computed(() => {
    if (this.activeSection() !== 'charts') {
      return [];
    }

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
   * Only calculate when executive section is active
   */
  public genderChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }

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
   * Only calculate when executive section is active
   */
  public hiresExitsChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }

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
            return `${label}: ${context.raw} (${percentage}%)`;
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

    if (total === 0) {
      return 0;
    }

    const count = gender === 'M' ? maleCount : femaleCount;
    return Math.round((count / total) * 100);
  }

  // Helper methods for hires/exits data
  public getHiresExitsCount(type: 'hires' | 'exits'): number {
    const data = this.monthlyHiresAndExits();
    return type === 'hires' ? data.hires : data.exits;
  }

  public getMonthlyLates(): number {
    return this.tardinessService.monthlyLatesCount();
  }

  // Calculate top employees with most lates
  public topLatesList = computed(() => {
    return this.tardinessService.topLatesList();
  });

  public topLatesListMapped = computed<TopLateRecord[]>(() =>
    this.topLatesList().map((item) => ({
      name: item.employeeName,
      count: item.lateCount,
    }))
  );

  public getTopLatesCount(): number {
    return this.tardinessService.topLatesCount();
  }

  public getTopLatesEmployeeName(): string {
    return this.tardinessService.topLatesEmployeeName();
  }

  public openTopLatesDialog(): void {
    this.topLatesDialogVisible.set(true);
  }

  // Calculate top employees with most absences
  public topAbsencesList = computed(() => {
    return this.tardinessService.topAbsencesList();
  });

  public getTopAbsencesCount(): number {
    const topList = this.tardinessService.topAbsencesList();
    return topList.length > 0 ? topList[0].count : 0;
  }

  public getTopAbsencesEmployeeName(): string {
    const topList = this.tardinessService.topAbsencesList();
    if (topList.length > 0) {
      const name = topList[0].employee_name;
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    return 'Ninguno';
  }

  public openTopAbsencesDialog(): void {
    this.topAbsencesDialogVisible.set(true);
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

  // Top Lates Dialog
  public topLatesDialogVisible = signal(false);

  // Top Absences Dialog
  public topAbsencesDialogVisible = signal(false);

  public handleLatesChartClick(event: {
    event?: Event;
    active?: any[];
  }): void {
    const active = event?.active || [];
    if (active && active.length > 0) {
      const idx = active[0].index;
      const data: any = this.tardinessService.latesChartData();

      if (data && data.datasets && data.datasets.length > 0) {
        const ds: any = data.datasets[0];
        const details = (ds?.customDetails?.[idx] ?? []) as any[];

        const sortedDetails = [...details].sort((a, b) => {
          const aMinutes = a.minutesLate ?? 0;
          const bMinutes = b.minutesLate ?? 0;
          return bMinutes - aMinutes;
        });

        const dayNum = idx + 1;
        const { month } = getPanamaNowParts();
        const monthName = getMonthNameSpanish(month - 1);
        const title = `Tardanzas - Día ${dayNum} ${monthName}`;

        this.lateDialogTitle.set(title);
        this.lateDialogDetails.set(sortedDetails);
        this.lateDialogVisible.set(true);
      }
    }
  }

  public handleHeadcountChartClick(event: {
    event?: Event;
    active?: any[];
  }): void {
    const active = event?.active || [];
    if (active && active.length > 0) {
      const idx = active[0].index;
      const data: any = this.homeData.headcountTrendData();
      const labels = data?.labels || [];

      if (idx !== undefined && labels[idx]) {
        const label = labels[idx];
        this.openMonthHiresExitsDialog(label, idx);
      }
    }
  }
}
