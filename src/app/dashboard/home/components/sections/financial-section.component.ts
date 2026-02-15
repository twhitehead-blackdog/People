import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { startOfMonth, subMonths } from 'date-fns';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';

@Component({
  selector: 'pt-financial-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TooltipModule],
  template: `
    <!-- ===== PC VERSION ===== -->
    @if (device.isDesktop()) {
      <div class="pc-financial">
        <!-- Header -->
        <div class="section-header">
          <div class="header-icon">
            <i class="pi pi-dollar"></i>
          </div>
          <div class="header-text">
            <h2>Indicadores Financieros</h2>
            <p>Análisis de costos y eficiencia del personal</p>
          </div>
        </div>

        <!-- Main Grid -->
        <div class="finance-grid">
          <!-- Card Principal: Planilla -->
          <div class="finance-hero" pTooltip="Costo total de la planilla mensual de todos los empleados activos" tooltipPosition="bottom">
            <div class="hero-label">Planilla Mensual</div>
            <div class="hero-value">{{ state.monthlyBudget() | currency:'$':'symbol':'1.0-0' }}</div>
            <div class="hero-annual">
              <span class="annual-label">Proyección Anual:</span>
              <span class="annual-value">{{ state.monthlyBudget() * 12 | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <!-- Salarios -->
          <div class="finance-card" pTooltip="Salario promedio de todos los empleados activos" tooltipPosition="top">
            <div class="card-icon green"><i class="pi pi-user"></i></div>
            <div class="card-content">
              <span class="card-label">Salario Promedio</span>
              <span class="card-value">{{ state.averageSalary() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="finance-card" pTooltip="Costo total mensual por empleado (salario + beneficios + cargas)" tooltipPosition="top">
            <div class="card-icon green"><i class="pi pi-calculator"></i></div>
            <div class="card-content">
              <span class="card-label">Costo por Empleado</span>
              <span class="card-value">{{ state.costPerEmployee() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <!-- Eficiencia -->
          <div class="finance-card highlight" pTooltip="Ingresos generados por cada empleado - mide productividad económica" tooltipPosition="top">
            <div class="card-icon gold"><i class="pi pi-chart-line"></i></div>
            <div class="card-content">
              <span class="card-label">Ratio de Eficiencia</span>
              <span class="card-value gold">{{ state.peopleEfficiencyRatio() | currency:'$':'symbol':'1.0-0' }}</span>
              <span class="card-sub">por empleado</span>
            </div>
          </div>

          <div class="finance-card highlight" pTooltip="Estimación de ingresos totales mensuales de la empresa" tooltipPosition="top">
            <div class="card-icon gold"><i class="pi pi-arrow-up-right"></i></div>
            <div class="card-content">
              <span class="card-label">Ingresos Estimados</span>
              <span class="card-value gold">{{ state.peopleEfficiencyRatio() * state.headCount() | currency:'$':'symbol':'1.0-0' }}</span>
              <span class="card-sub">mensuales</span>
            </div>
          </div>

          <!-- Deudas -->
          <div class="finance-debt" pTooltip="Empleados con préstamos o adelantos pendientes" tooltipPosition="top">
            <div class="debt-header">
              <div class="debt-icon"><i class="pi pi-exclamation-triangle"></i></div>
              <span class="debt-title">Empleados con Deudas</span>
            </div>
            <div class="debt-body">
              <div class="debt-stat">
                <span class="debt-value">{{ state.employeesWithDebts() }}</span>
                <span class="debt-label">empleados</span>
              </div>
              <div class="debt-divider"></div>
              <div class="debt-stat">
                <span class="debt-value">{{ state.totalDebtAmount() | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="debt-label">total adeudado</span>
              </div>
              <div class="debt-divider"></div>
              <div class="debt-stat">
                <span class="debt-value">{{ getAverageDebt() | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="debt-label">deuda promedio</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Segunda Fila: Más KPIs -->
        <div class="finance-extra">
          <div class="extra-card" pTooltip="Salario más alto entre los empleados activos" tooltipPosition="top">
            <div class="extra-icon blue"><i class="pi pi-arrow-up"></i></div>
            <div class="extra-content">
              <span class="extra-label">Salario Máximo</span>
              <span class="extra-value blue">{{ getMaxSalary() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Salario más bajo entre los empleados activos" tooltipPosition="top">
            <div class="extra-icon purple"><i class="pi pi-arrow-down"></i></div>
            <div class="extra-content">
              <span class="extra-label">Salario Mínimo</span>
              <span class="extra-value purple">{{ getMinSalary() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Valor central de los salarios - 50% gana más, 50% gana menos" tooltipPosition="top">
            <div class="extra-icon cyan"><i class="pi pi-equals"></i></div>
            <div class="extra-content">
              <span class="extra-label">Mediana Salarial</span>
              <span class="extra-value cyan">{{ getMedianSalary() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Diferencia entre el salario máximo y mínimo" tooltipPosition="top">
            <div class="extra-icon orange"><i class="pi pi-arrows-h"></i></div>
            <div class="extra-content">
              <span class="extra-label">Rango Salarial</span>
              <span class="extra-value orange">{{ getSalaryRange() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Porcentaje de la nómina destinado a contratos fijos" tooltipPosition="top">
            <div class="extra-icon green"><i class="pi pi-check-circle"></i></div>
            <div class="extra-content">
              <span class="extra-label">% Nómina Fijos</span>
              <span class="extra-value green">{{ getFixedContractPayrollPercent() }}%</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Costo mensual total de empleados en período de prueba" tooltipPosition="top">
            <div class="extra-icon amber"><i class="pi pi-clock"></i></div>
            <div class="extra-content">
              <span class="extra-label">Nómina en Prueba</span>
              <span class="extra-value amber">{{ getProbatoryPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Costo por empleado de nuevas contrataciones este mes" tooltipPosition="top">
            <div class="extra-icon teal"><i class="pi pi-user-plus"></i></div>
            <div class="extra-content">
              <span class="extra-label">Costo Nuevos/Mes</span>
              <span class="extra-value teal">{{ getNewHiresPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="extra-card" pTooltip="Porcentaje de empleados con deudas activas" tooltipPosition="top">
            <div class="extra-icon red"><i class="pi pi-percentage"></i></div>
            <div class="extra-content">
              <span class="extra-label">% Con Deudas</span>
              <span class="extra-value red">{{ getDebtPercentage() }}%</span>
            </div>
          </div>
        </div>

        <!-- Distribución por Rangos Salariales -->
        <div class="salary-distribution">
          <div class="dist-header">
            <h4>Distribución por Rango Salarial</h4>
          </div>
          <div class="dist-bars">
            @for (range of getSalaryRanges(); track range.label) {
              <div class="range-item">
                <div class="range-info">
                  <span class="range-label">{{ range.label }}</span>
                  <span class="range-count">{{ range.count }} <small>({{ range.percent }}%)</small></span>
                </div>
                <div class="range-bar">
                  <div class="range-fill" [style.width.%]="range.percent"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ===== MOBILE VERSION ===== -->
    @if (!device.isDesktop()) {
      <div class="mobile-section">
        <div class="mobile-header">
          <i class="pi pi-dollar"></i>
          <span>Finanzas</span>
        </div>

        <div class="mobile-hero-card">
          <span class="hero-label">Planilla Mensual</span>
          <span class="hero-value">{{ state.monthlyBudget() | currency:'$':'symbol':'1.0-0' }}</span>
        </div>

        <div class="mobile-stats">
          <div class="stat-row">
            <span>Planilla Anual</span>
            <span class="value">{{ state.monthlyBudget() * 12 | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Salario Promedio</span>
            <span class="value">{{ state.averageSalary() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Salario Máximo</span>
            <span class="value blue">{{ getMaxSalary() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Salario Mínimo</span>
            <span class="value purple">{{ getMinSalary() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Mediana Salarial</span>
            <span class="value cyan">{{ getMedianSalary() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Costo por Empleado</span>
            <span class="value">{{ state.costPerEmployee() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Ratio de Eficiencia</span>
            <span class="value highlight">{{ state.peopleEfficiencyRatio() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>% Nómina Fijos</span>
            <span class="value green">{{ getFixedContractPayrollPercent() }}%</span>
          </div>
          <div class="stat-row">
            <span>Nómina en Prueba</span>
            <span class="value amber">{{ getProbatoryPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-row">
            <span>Empleados con Deudas</span>
            <span class="value warning">{{ state.employeesWithDebts() }} ({{ getDebtPercentage() }}%)</span>
          </div>
          <div class="stat-row">
            <span>Total Deudas</span>
            <span class="value warning">{{ state.totalDebtAmount() | currency:'$':'symbol':'1.0-0' }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ===== PC STYLES ===== */
    .pc-financial {
      padding: 1.25rem;
      padding-bottom: 2rem;
      background: linear-gradient(180deg, #0a0a0a 0%, #0f0f10 100%);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(52, 211, 153, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;

      i { font-size: 1.25rem; color: #34d399; }
    }

    .header-text {
      h2 { font-size: 1.25rem; font-weight: 600; color: #fff; margin: 0; }
      p { font-size: 0.8rem; color: #71717a; margin: 0.25rem 0 0; }
    }

    .finance-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .finance-hero {
      grid-column: span 3;
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(24, 24, 27, 0.95) 100%);
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-radius: 16px;
      padding: 1.5rem;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #34d399, #10b981);
      }
    }

    .finance-hero .hero-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .finance-hero .hero-value {
      font-size: 3rem;
      font-weight: 800;
      color: #34d399;
      line-height: 1.1;
      margin: 0.5rem 0;
    }

    .hero-annual {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .annual-label { font-size: 0.8rem; color: #71717a; }
    .annual-value { font-size: 1.125rem; font-weight: 700; color: #fff; }

    .finance-card {
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: all 0.2s ease;

      &:hover { border-color: rgba(255, 255, 255, 0.1); }

      &.highlight {
        border-color: rgba(251, 191, 36, 0.15);
        background: rgba(251, 191, 36, 0.04);
      }
    }

    .card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i { font-size: 1.125rem; }

      &.green { background: rgba(52, 211, 153, 0.12); i { color: #34d399; } }
      &.gold { background: rgba(251, 191, 36, 0.12); i { color: #fbbf24; } }
    }

    .card-content {
      display: flex;
      flex-direction: column;
    }

    .card-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
    }

    .card-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;

      &.gold { color: #fbbf24; }
    }

    .card-sub {
      font-size: 0.65rem;
      color: #52525b;
    }

    .finance-debt {
      grid-column: span 3;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 14px;
      padding: 1.25rem;
    }

    .debt-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .debt-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;

      i { font-size: 1rem; color: #f59e0b; }
    }

    .debt-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #f59e0b;
      text-transform: uppercase;
    }

    .debt-body {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .debt-stat {
      display: flex;
      flex-direction: column;
    }

    .debt-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
    }

    .debt-label {
      font-size: 0.7rem;
      color: #71717a;
    }

    .debt-divider {
      width: 1px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Extra KPIs Grid */
    .finance-extra {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .extra-card {
      background: rgba(24, 24, 27, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: all 0.2s ease;

      &:hover { border-color: rgba(255, 255, 255, 0.08); }
    }

    .extra-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i { font-size: 0.9rem; }

      &.blue { background: rgba(96, 165, 250, 0.12); i { color: #60a5fa; } }
      &.purple { background: rgba(168, 85, 247, 0.12); i { color: #a855f7; } }
      &.cyan { background: rgba(6, 182, 212, 0.12); i { color: #06b6d4; } }
      &.orange { background: rgba(251, 146, 60, 0.12); i { color: #fb923c; } }
      &.green { background: rgba(52, 211, 153, 0.12); i { color: #34d399; } }
      &.amber { background: rgba(251, 191, 36, 0.12); i { color: #fbbf24; } }
      &.teal { background: rgba(45, 212, 191, 0.12); i { color: #2dd4bf; } }
      &.red { background: rgba(248, 113, 113, 0.12); i { color: #f87171; } }
    }

    .extra-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .extra-label {
      font-size: 0.6rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .extra-value {
      font-size: 1.125rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;

      &.blue { color: #60a5fa; }
      &.purple { color: #a855f7; }
      &.cyan { color: #06b6d4; }
      &.orange { color: #fb923c; }
      &.green { color: #34d399; }
      &.amber { color: #fbbf24; }
      &.teal { color: #2dd4bf; }
      &.red { color: #f87171; }
    }

    /* Salary Distribution */
    .salary-distribution {
      margin-top: 1rem;
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 1rem 1.25rem;
    }

    .dist-header {
      margin-bottom: 0.75rem;

      h4 {
        font-size: 0.8rem;
        font-weight: 600;
        color: #e4e4e7;
        margin: 0;
      }
    }

    .dist-bars {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .range-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .range-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .range-label {
      font-size: 0.7rem;
      color: #a1a1aa;
    }

    .range-count {
      font-size: 0.75rem;
      font-weight: 600;
      color: #fff;

      small { color: #71717a; font-weight: 400; }
    }

    .range-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      overflow: hidden;
    }

    .range-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399, #10b981);
      border-radius: 3px;
      min-width: 4px;
    }

    /* ===== MOBILE STYLES ===== */
    .mobile-section { padding: 0.75rem; }

    .mobile-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      i { color: #34d399; }
      span { font-size: 1rem; font-weight: 600; color: #fff; }
    }

    .mobile-hero-card {
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(52, 211, 153, 0.05));
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-radius: 14px;
      padding: 1.25rem;
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .mobile-hero-card .hero-label {
      font-size: 0.7rem;
      color: #a1a1aa;
      text-transform: uppercase;
      display: block;
    }

    .mobile-hero-card .hero-value {
      font-size: 2rem;
      font-weight: 800;
      color: #34d399;
      display: block;
      margin-top: 0.25rem;
    }

    .mobile-stats {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.5rem 0.75rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.8rem;
      &:last-child { border-bottom: none; }
      span:first-child { color: #a1a1aa; }
      .value {
        color: #fff;
        font-weight: 600;
        &.highlight { color: #fbbf24; }
        &.warning { color: #f59e0b; }
        &.blue { color: #60a5fa; }
        &.purple { color: #a855f7; }
        &.cyan { color: #06b6d4; }
        &.green { color: #34d399; }
        &.amber { color: #fbbf24; }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialSectionComponent {
  state = inject(DashboardStore);
  device = inject(DeviceService);

  getMaxSalary(): number {
    const employees = this.state.employeesList();
    if (!employees.length) return 0;
    return Math.max(...employees.map(e => e.monthly_salary || 0));
  }

  getMinSalary(): number {
    const employees = this.state.employeesList().filter(e => (e.monthly_salary || 0) > 0);
    if (!employees.length) return 0;
    return Math.min(...employees.map(e => e.monthly_salary || 0));
  }

  getMedianSalary(): number {
    const salaries = this.state.employeesList()
      .map(e => e.monthly_salary || 0)
      .filter(s => s > 0)
      .sort((a, b) => a - b);
    if (!salaries.length) return 0;
    const mid = Math.floor(salaries.length / 2);
    return salaries.length % 2 ? salaries[mid] : Math.round((salaries[mid - 1] + salaries[mid]) / 2);
  }

  getSalaryRange(): number {
    return this.getMaxSalary() - this.getMinSalary();
  }

  getFixedContractPayrollPercent(): number {
    const employees = this.state.employeesList();
    const totalPayroll = this.state.monthlyBudget();
    if (!totalPayroll) return 0;
    const now = new Date();
    // Empleados fijos = sin fecha de fin o fecha de fin en el futuro
    const fixedPayroll = employees
      .filter(e => !e.end_date || new Date(e.end_date) > now)
      .reduce((acc, e) => acc + (e.monthly_salary || 0), 0);
    return Math.round((fixedPayroll / totalPayroll) * 100);
  }

  getProbatoryPayroll(): number {
    const employees = this.state.employeesList();
    let threeMonthsAgo = new Date();
    threeMonthsAgo = subMonths(threeMonthsAgo, 3);

    return employees
      .filter(e => e.start_date && new Date(e.start_date) > threeMonthsAgo)
      .reduce((acc, e) => acc + (e.monthly_salary || 0), 0);
  }

  getNewHiresPayroll(): number {
    const employees = this.state.employeesList();
    const now = new Date();
    const monthStart = startOfMonth(now);

    return employees
      .filter(e => e.start_date && new Date(e.start_date) >= monthStart)
      .reduce((acc, e) => acc + (e.monthly_salary || 0), 0);
  }

  getAverageDebt(): number {
    const withDebts = this.state.employeesWithDebts();
    const totalDebt = this.state.totalDebtAmount();
    return withDebts > 0 ? Math.round(totalDebt / withDebts) : 0;
  }

  getDebtPercentage(): number {
    const total = this.state.headCount();
    const withDebts = this.state.employeesWithDebts();
    return total > 0 ? Math.round((withDebts / total) * 100) : 0;
  }

  getSalaryRanges(): { label: string; count: number; percent: number }[] {
    const employees = this.state.employeesList();
    const total = employees.length;
    if (!total) return [];

    const ranges = [
      { label: '$0 - $500', min: 0, max: 500 },
      { label: '$501 - $1,000', min: 501, max: 1000 },
      { label: '$1,001 - $1,500', min: 1001, max: 1500 },
      { label: '$1,501 - $2,000', min: 1501, max: 2000 },
      { label: '$2,001 - $3,000', min: 2001, max: 3000 },
      { label: '$3,001+', min: 3001, max: Infinity },
    ];

    return ranges.map(r => {
      const count = employees.filter(e => {
        const salary = e.monthly_salary || 0;
        return salary >= r.min && salary <= r.max;
      }).length;
      return {
        label: r.label,
        count,
        percent: Math.round((count / total) * 100),
      };
    }).filter(r => r.count > 0);
  }
}
