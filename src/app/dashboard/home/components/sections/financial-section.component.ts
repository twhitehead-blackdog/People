import { CommonModule, CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { HomeDataService, BranchFinancialRecord, BranchDailySalesRecord, GroomerMonthlyStats, GroomerServiceLine } from '../../services/home-data.service';

@Component({
  selector: 'pt-financial-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, DatePipe, TooltipModule, BaseChartDirective],
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

        <!-- ===== RENDIMIENTO POR SUCURSAL (Odoo data) ===== -->
        @if (branchFinancialsList().length > 0) {
          <div class="branch-revenue-section">
            <div class="section-header" style="margin-top: 0;">
              <div class="header-icon" style="background: rgba(96, 165, 250, 0.12);">
                <i class="pi pi-shop" style="color: #60a5fa;"></i>
              </div>
              <div class="header-text">
                <h2>Rendimiento por Sucursal</h2>
                <p>Ingresos POS vs Planilla — {{ getMonthName(homeData.financialMonth()) }} {{ homeData.financialYear() }}</p>
              </div>
              <div class="month-nav">
                <button class="month-btn" (click)="prevMonth()" pTooltip="Mes anterior" tooltipPosition="top">
                  <i class="pi pi-chevron-left"></i>
                </button>
                <button class="month-btn" (click)="nextMonth()" pTooltip="Mes siguiente" tooltipPosition="top">
                  <i class="pi pi-chevron-right"></i>
                </button>
              </div>
            </div>

            <!-- KPI Hero Cards with MoM comparison -->
            <div class="revenue-kpis">
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon blue"><i class="pi pi-shopping-cart"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Ingresos POS Total</span>
                  <span class="rev-kpi-value blue">{{ totalRevenue() | currency:'$':'symbol':'1.0-0' }}</span>
                  @if (prevTotalRevenue() > 0) {
                    <span class="mom-change" [class.up]="revenueGrowth() >= 0" [class.down]="revenueGrowth() < 0">
                      <i [class]="revenueGrowth() >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                      {{ revenueGrowth() >= 0 ? '+' : '' }}{{ revenueGrowth() | number:'1.1-1' }}% vs mes ant.
                    </span>
                  }
                </div>
              </div>
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon green"><i class="pi pi-wallet"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Planilla Total</span>
                  <span class="rev-kpi-value green">{{ totalPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
                  @if (prevTotalPayroll() > 0) {
                    <span class="mom-change" [class.up]="payrollGrowth() <= 0" [class.down]="payrollGrowth() > 0">
                      <i [class]="payrollGrowth() > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                      {{ payrollGrowth() >= 0 ? '+' : '' }}{{ payrollGrowth() | number:'1.1-1' }}%
                    </span>
                  }
                </div>
              </div>
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon" [class]="marginClass()"><i class="pi pi-chart-line"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Margen (Ingreso - Planilla)</span>
                  <span class="rev-kpi-value" [class]="marginClass()">{{ totalRevenue() - totalPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
                  @if (totalExpenses() > 0) {
                    <span class="mom-change down">Gastos Odoo: {{ totalExpenses() | currency:'$':'symbol':'1.0-0' }}</span>
                  }
                </div>
              </div>
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon cyan"><i class="pi pi-receipt"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Ticket Promedio Global</span>
                  <span class="rev-kpi-value cyan">{{ globalAvgTicket() | currency:'$':'symbol':'1.2-2' }}</span>
                  @if (prevAvgTicket() > 0) {
                    <span class="mom-change" [class.up]="ticketGrowth() >= 0" [class.down]="ticketGrowth() < 0">
                      <i [class]="ticketGrowth() >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"></i>
                      {{ ticketGrowth() >= 0 ? '+' : '' }}{{ ticketGrowth() | number:'1.1-1' }}%
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Branch Table -->
            <div class="branch-table-wrap">
              <table class="branch-table">
                <colgroup>
                  <col style="width: 14%">
                  <col style="width: 12%">
                  <col style="width: 10%">
                  <col style="width: 10%">
                  <col style="width: 7%">
                  <col style="width: 8%">
                  <col style="width: 10%">
                  <col style="width: 8%">
                  <col style="width: 21%">
                </colgroup>
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th class="col-num">Ingresos POS</th>
                    <th class="col-num">Planilla</th>
                    <th class="col-num">Margen</th>
                    <th class="col-num">Ratio</th>
                    <th class="col-num">Ordenes</th>
                    <th class="col-num">Ticket Prom.</th>
                    <th class="col-num">Empleados</th>
                    <th>Meta Prom.</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of branchFinancialsList(); track b.branch_id) {
                    <tr>
                      <td class="col-name">
                        <span class="branch-name">{{ b.branch?.name || 'Sin nombre' }}</span>
                      </td>
                      <td class="col-num">
                        <span class="val-revenue">{{ b.pos_revenue | currency:'$':'symbol':'1.0-0' }}</span>
                      </td>
                      <td class="col-num">
                        <span class="val-payroll">{{ b.payroll_total | currency:'$':'symbol':'1.0-0' }}</span>
                      </td>
                      <td class="col-num">
                        <span [class]="b.pos_revenue - b.payroll_total >= 0 ? 'val-positive' : 'val-negative'">
                          {{ b.pos_revenue - b.payroll_total | currency:'$':'symbol':'1.0-0' }}
                        </span>
                      </td>
                      <td class="col-num">
                        <span class="val-ratio" [class.ratio-good]="b.revenue_vs_payroll_ratio >= 3" [class.ratio-ok]="b.revenue_vs_payroll_ratio >= 2 && b.revenue_vs_payroll_ratio < 3" [class.ratio-low]="b.revenue_vs_payroll_ratio < 2">
                          {{ b.revenue_vs_payroll_ratio | number:'1.1-1' }}x
                        </span>
                      </td>
                      <td class="col-num">{{ b.pos_order_count | number }}</td>
                      <td class="col-num">{{ b.pos_avg_ticket | currency:'$':'symbol':'1.2-2' }}</td>
                      <td class="col-num">{{ b.employee_count }}</td>
                      <td class="col-last">
                        @if (b.target_promedio > 0) {
                          <div class="target-bar-wrap">
                            <div class="target-bar-fill" [style.width.%]="getTargetPct(b)" [class.over-target]="b.pos_revenue >= b.target_promedio" [class.under-target]="b.pos_revenue < b.target_promedio"></div>
                            <span class="target-pct">{{ getTargetPct(b) | number:'1.0-0' }}%</span>
                          </div>
                        } @else {
                          <span class="no-target">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td class="col-name"><strong>TOTAL</strong></td>
                    <td class="col-num"><strong class="val-revenue">{{ totalRevenue() | currency:'$':'symbol':'1.0-0' }}</strong></td>
                    <td class="col-num"><strong class="val-payroll">{{ totalPayroll() | currency:'$':'symbol':'1.0-0' }}</strong></td>
                    <td class="col-num">
                      <strong [class]="totalRevenue() - totalPayroll() >= 0 ? 'val-positive' : 'val-negative'">
                        {{ totalRevenue() - totalPayroll() | currency:'$':'symbol':'1.0-0' }}
                      </strong>
                    </td>
                    <td class="col-num"><strong>{{ totalRatio() | number:'1.1-1' }}x</strong></td>
                    <td class="col-num"><strong>{{ totalOrders() | number }}</strong></td>
                    <td class="col-num"><strong>{{ globalAvgTicket() | currency:'$':'symbol':'1.2-2' }}</strong></td>
                    <td class="col-num"><strong>{{ totalEmployees() }}</strong></td>
                    <td class="col-last"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Sales Targets Legend -->
            @if (hasTargets()) {
              <div class="targets-legend">
                <span class="legend-title">Metas mensuales (sin imp.):</span>
                <span class="legend-item"><span class="dot dot-baja"></span>Baja: {{ totalTarget('target_baja') | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="legend-item"><span class="dot dot-prom"></span>Promedio: {{ totalTarget('target_promedio') | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="legend-item"><span class="dot dot-alta"></span>Alta: {{ totalTarget('target_alta') | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="legend-item"><span class="dot dot-oro"></span>Oro: {{ totalTarget('target_oro') | currency:'$':'symbol':'1.0-0' }}</span>
              </div>
            }
          </div>
        }

        <!-- ===== TENDENCIA VENTAS DIARIAS ===== -->
        @if (dailySalesChartData(); as chartData) {
          @if (chartData.labels.length > 0) {
            <div class="branch-revenue-section">
              <div class="section-header" style="margin-top: 0;">
                <div class="header-icon" style="background: rgba(96, 165, 250, 0.12);">
                  <i class="pi pi-chart-bar" style="color: #60a5fa;"></i>
                </div>
                <div class="header-text">
                  <h2>Tendencia Ventas Diarias</h2>
                  <p>Ingresos POS por día — últimos 14 días (todas las sucursales)</p>
                </div>
              </div>
              <div class="chart-container">
                <canvas baseChart
                  [type]="'bar'"
                  [data]="chartData"
                  [options]="dailySalesChartOptions">
                </canvas>
              </div>
            </div>
          }
        }

        <!-- ===== RENDIMIENTO PELUQUEROS ===== -->
        @if (groomerStatsList().length > 0) {
          <div class="branch-revenue-section">
            <div class="section-header" style="margin-top: 0;">
              <div class="header-icon" style="background: rgba(168, 85, 247, 0.12);">
                <i class="pi pi-scissors" style="color: #a855f7;"></i>
              </div>
              <div class="header-text">
                <h2>Rendimiento Peluqueros</h2>
                <p>Servicios, ventas y comisiones — {{ getMonthName(homeData.financialMonth()) }} {{ homeData.financialYear() }}</p>
              </div>
            </div>

            <!-- Groomer KPIs -->
            <div class="revenue-kpis">
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon purple"><i class="pi pi-users"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Peluqueros Activos</span>
                  <span class="rev-kpi-value purple">{{ groomerStatsList().length }}</span>
                </div>
              </div>
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon blue"><i class="pi pi-heart"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Total Servicios</span>
                  <span class="rev-kpi-value blue">{{ groomerTotalServices() | number }}</span>
                </div>
              </div>
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon green"><i class="pi pi-dollar"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Ventas Peluquería</span>
                  <span class="rev-kpi-value green">{{ groomerTotalSales() | currency:'$':'symbol':'1.0-0' }}</span>
                </div>
              </div>
              <div class="rev-kpi-card">
                <div class="rev-kpi-icon amber"><i class="pi pi-wallet"></i></div>
                <div class="rev-kpi-content">
                  <span class="rev-kpi-label">Comisiones Total</span>
                  <span class="rev-kpi-value amber">{{ groomerTotalCommission() | currency:'$':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </div>

            <!-- Groomer Table -->
            <div class="branch-table-wrap">
              <table class="branch-table">
                <colgroup>
                  <col style="width: 6%">
                  <col style="width: 22%">
                  <col style="width: 11%">
                  <col style="width: 14%">
                  <col style="width: 12%">
                  <col style="width: 13%">
                  <col style="width: 12%">
                  <col style="width: 10%">
                </colgroup>
                <thead>
                  <tr>
                    <th class="col-num">#</th>
                    <th>Peluquero</th>
                    <th class="col-num">Servicios</th>
                    <th class="col-num">Ventas</th>
                    <th class="col-num">Prom/Serv</th>
                    <th class="col-num">Comisión</th>
                    <th class="col-num">Crec. Ventas</th>
                    <th class="col-num">Compartidos</th>
                  </tr>
                </thead>
                <tbody>
                  @for (g of groomerStatsList(); track g.groomer_odoo_id) {
                    <tr>
                      <td class="col-num">
                        <span class="rank-badge" [class.rank-top3]="g.ranking <= 3">{{ g.ranking }}</span>
                      </td>
                      <td class="col-name">
                        <span class="branch-name">{{ g.groomer_name }}</span>
                      </td>
                      <td class="col-num">{{ g.total_services | number }}</td>
                      <td class="col-num">
                        <span class="val-revenue">{{ g.total_sales | currency:'$':'symbol':'1.0-0' }}</span>
                      </td>
                      <td class="col-num">{{ g.avg_per_service | currency:'$':'symbol':'1.2-2' }}</td>
                      <td class="col-num">
                        <span class="val-commission">{{ g.commission_final | currency:'$':'symbol':'1.0-0' }}</span>
                      </td>
                      <td class="col-num">
                        @if (g.sales_growth !== 0) {
                          <span [class]="g.sales_growth > 0 ? 'val-positive' : 'val-negative'">
                            {{ g.sales_growth > 0 ? '+' : '' }}{{ g.sales_growth | number:'1.0-0' }}%
                          </span>
                        } @else {
                          <span class="no-target">—</span>
                        }
                      </td>
                      <td class="col-num">
                        @if (g.shared_services > 0) {
                          <span class="val-shared">{{ g.shared_services }} ({{ g.shared_pct | number:'1.0-0' }}%)</span>
                        } @else {
                          <span class="no-target">0</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Groomer Service Lines Detail (expandable) -->
            @if (groomerServiceLinesList().length > 0) {
              <div class="groomer-detail-section">
                <button class="detail-toggle" (click)="showGroomerLines.set(!showGroomerLines())">
                  <i [class]="showGroomerLines() ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"></i>
                  <span>Detalle de servicios ({{ groomerServiceLinesList().length }} registros últimos 30 días)</span>
                </button>
                @if (showGroomerLines()) {
                  <div class="branch-table-wrap" style="max-height: 400px; overflow-y: auto;">
                    <table class="branch-table">
                      <colgroup>
                        <col style="width: 12%">
                        <col style="width: 18%">
                        <col style="width: 14%">
                        <col style="width: 16%">
                        <col style="width: 14%">
                        <col style="width: 10%">
                        <col style="width: 8%">
                        <col style="width: 8%">
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Peluquero</th>
                          <th>Sucursal</th>
                          <th>Servicio</th>
                          <th>Mascota</th>
                          <th class="col-num">Total</th>
                          <th class="col-num">Comisión</th>
                          <th class="col-num">Pelq.</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (l of groomerServiceLinesList().slice(0, 100); track l.id) {
                          <tr>
                            <td>{{ l.service_date }}</td>
                            <td class="col-name"><span class="branch-name">{{ l.groomer_name }}</span></td>
                            <td>{{ l.branch_name }}</td>
                            <td>{{ l.product_name }}</td>
                            <td>{{ l.pet_name }}</td>
                            <td class="col-num"><span class="val-revenue">{{ l.line_total | currency:'$':'symbol':'1.2-2' }}</span></td>
                            <td class="col-num"><span class="val-commission">{{ l.commission_amount | currency:'$':'symbol':'1.2-2' }}</span></td>
                            <td class="col-num">{{ l.groomer_count }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }
          </div>
        }
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

        @if (branchFinancialsList().length > 0) {
          <div class="mobile-revenue-header">
            <i class="pi pi-shop" style="color: #60a5fa;"></i>
            <span>Sucursales — {{ getMonthName(homeData.financialMonth()) }}</span>
            <div class="month-nav-mobile">
              <button (click)="prevMonth()"><i class="pi pi-chevron-left"></i></button>
              <button (click)="nextMonth()"><i class="pi pi-chevron-right"></i></button>
            </div>
          </div>

          <div class="mobile-revenue-kpis">
            <div class="mobile-kpi">
              <span class="label">Ingresos POS</span>
              <span class="value blue">{{ totalRevenue() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
            <div class="mobile-kpi">
              <span class="label">Planilla</span>
              <span class="value green">{{ totalPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
            <div class="mobile-kpi">
              <span class="label">Margen</span>
              <span class="value" [class]="marginClass()">{{ totalRevenue() - totalPayroll() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="mobile-branches">
            @for (b of branchFinancialsList(); track b.branch_id) {
              <div class="mobile-branch-card">
                <div class="branch-card-header">
                  <span class="branch-name">{{ b.branch?.name || 'Sin nombre' }}</span>
                  <span class="branch-revenue">{{ b.pos_revenue | currency:'$':'symbol':'1.0-0' }}</span>
                </div>
                <div class="branch-card-stats">
                  <span>Planilla: {{ b.payroll_total | currency:'$':'symbol':'1.0-0' }}</span>
                  <span>Ratio: {{ b.revenue_vs_payroll_ratio | number:'1.1-1' }}x</span>
                  <span>{{ b.pos_order_count }} ordenes</span>
                </div>
                @if (b.target_promedio > 0) {
                  <div class="branch-card-bar">
                    <div class="target-bar-fill" [style.width.%]="getTargetPct(b)" [class.over-target]="b.pos_revenue >= b.target_promedio" [class.under-target]="b.pos_revenue < b.target_promedio"></div>
                    <span class="target-pct-mobile">{{ getTargetPct(b) | number:'1.0-0' }}% meta</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Mobile: Groomer data -->
        @if (groomerStatsList().length > 0) {
          <div class="mobile-revenue-header">
            <i class="pi pi-scissors" style="color: #a855f7;"></i>
            <span>Peluqueros — {{ getMonthName(homeData.financialMonth()) }}</span>
          </div>

          <div class="mobile-revenue-kpis">
            <div class="mobile-kpi">
              <span class="label">Servicios</span>
              <span class="value purple">{{ groomerTotalServices() | number }}</span>
            </div>
            <div class="mobile-kpi">
              <span class="label">Ventas</span>
              <span class="value green">{{ groomerTotalSales() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
            <div class="mobile-kpi">
              <span class="label">Comisiones</span>
              <span class="value amber">{{ groomerTotalCommission() | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="mobile-branches">
            @for (g of groomerStatsList(); track g.groomer_odoo_id) {
              <div class="mobile-branch-card">
                <div class="branch-card-header">
                  <span class="branch-name">#{{ g.ranking }} {{ g.groomer_name }}</span>
                  <span class="branch-revenue">{{ g.total_sales | currency:'$':'symbol':'1.0-0' }}</span>
                </div>
                <div class="branch-card-stats">
                  <span>{{ g.total_services }} servicios</span>
                  <span>Com: {{ g.commission_final | currency:'$':'symbol':'1.0-0' }}</span>
                  @if (g.sales_growth !== 0) {
                    <span [style.color]="g.sales_growth > 0 ? '#34d399' : '#f87171'">
                      {{ g.sales_growth > 0 ? '+' : '' }}{{ g.sales_growth | number:'1.0-0' }}%
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        }
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

    /* ===== BRANCH REVENUE (PC) ===== */
    .branch-revenue-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .month-nav {
      display: flex;
      gap: 0.25rem;
      margin-left: auto;
    }

    .month-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
      i { font-size: 0.75rem; }
    }

    .revenue-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .rev-kpi-card {
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .rev-kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      i { font-size: 1rem; }

      &.blue { background: rgba(96, 165, 250, 0.12); i { color: #60a5fa; } }
      &.green { background: rgba(52, 211, 153, 0.12); i { color: #34d399; } }
      &.cyan { background: rgba(6, 182, 212, 0.12); i { color: #06b6d4; } }
      &.positive { background: rgba(52, 211, 153, 0.12); i { color: #34d399; } }
      &.negative { background: rgba(248, 113, 113, 0.12); i { color: #f87171; } }
    }

    .rev-kpi-content {
      display: flex;
      flex-direction: column;
    }

    .rev-kpi-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
    }

    .rev-kpi-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;

      &.blue { color: #60a5fa; }
      &.green { color: #34d399; }
      &.cyan { color: #06b6d4; }
      &.positive { color: #34d399; }
      &.negative { color: #f87171; }
    }

    .branch-table-wrap {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      overflow-x: auto;
    }

    .branch-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      table-layout: fixed;

      th, td {
        padding: 0.625rem 0.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      th {
        text-align: left;
        font-size: 0.65rem;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      td {
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        color: #e4e4e7;
      }

      tbody tr {
        transition: background 0.15s ease;
        &:hover { background: rgba(255, 255, 255, 0.02); }
      }
    }

    .col-num { text-align: right; }

    .branch-name {
      font-weight: 500;
      color: #fff;
      white-space: nowrap;
    }

    .val-revenue { color: #60a5fa; font-weight: 600; }
    .val-payroll { color: #a1a1aa; }
    .val-positive { color: #34d399; font-weight: 600; }
    .val-negative { color: #f87171; font-weight: 600; }

    .val-ratio {
      font-weight: 700;
      &.ratio-good { color: #34d399; }
      &.ratio-ok { color: #fbbf24; }
      &.ratio-low { color: #f87171; }
    }

    .target-bar-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      height: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .target-bar-fill {
      height: 100%;
      border-radius: 4px;
      max-width: 100%;
      transition: width 0.3s ease;

      &.over-target { background: linear-gradient(90deg, #34d399, #10b981); }
      &.under-target { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
    }

    .target-pct {
      font-size: 0.7rem;
      font-weight: 600;
      color: #e4e4e7;
      position: absolute;
      right: 6px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .no-target { color: #52525b; }

    .total-row {
      td {
        border-top: 2px solid rgba(255, 255, 255, 0.1);
        border-bottom: none;
        padding-top: 0.75rem;
      }

      strong { color: #fff; }
      strong.val-revenue { color: #60a5fa; }
      strong.val-payroll { color: #a1a1aa; }
    }

    .targets-legend {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.7rem;
      color: #71717a;
    }

    .legend-title {
      font-weight: 600;
      color: #a1a1aa;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-baja { background: #71717a; }
    .dot-prom { background: #fbbf24; }
    .dot-alta { background: #34d399; }
    .dot-oro { background: #f59e0b; }

    /* Groomer-specific */
    .rev-kpi-icon.purple { background: rgba(168, 85, 247, 0.12); i { color: #a855f7; } }
    .rev-kpi-icon.amber { background: rgba(251, 191, 36, 0.12); i { color: #fbbf24; } }
    .rev-kpi-value.purple { color: #a855f7; }
    .rev-kpi-value.amber { color: #fbbf24; }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.05);
      color: #a1a1aa;

      &.rank-top3 {
        background: rgba(251, 191, 36, 0.15);
        color: #fbbf24;
      }
    }

    .val-commission { color: #fbbf24; font-weight: 600; }
    .val-shared { color: #a1a1aa; font-size: 0.75rem; }

    /* MoM growth indicators */
    .mom-change {
      font-size: 0.65rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.125rem;

      i { font-size: 0.55rem; }

      &.up { color: #34d399; }
      &.down { color: #f87171; }
    }

    /* Chart container */
    .chart-container {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 1rem;
      height: 280px;
    }

    /* Groomer detail toggle */
    .groomer-detail-section {
      margin-top: 0.75rem;
    }

    .detail-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      color: #a1a1aa;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
      text-align: left;

      &:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
      i { font-size: 0.65rem; }
    }

    .mobile-kpi .value.purple { color: #a855f7; }
    .mobile-kpi .value.amber { color: #fbbf24; }

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

    /* ===== MOBILE BRANCH REVENUE ===== */
    .mobile-revenue-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      span { font-size: 0.9rem; font-weight: 600; color: #fff; }
    }

    .month-nav-mobile {
      display: flex;
      gap: 0.25rem;
      margin-left: auto;

      button {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #a1a1aa;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        i { font-size: 0.65rem; }
      }
    }

    .mobile-revenue-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .mobile-kpi {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 0.625rem;
      text-align: center;

      .label {
        display: block;
        font-size: 0.6rem;
        color: #71717a;
        text-transform: uppercase;
        margin-bottom: 0.25rem;
      }
      .value {
        display: block;
        font-size: 0.95rem;
        font-weight: 700;
        &.blue { color: #60a5fa; }
        &.green { color: #34d399; }
        &.positive { color: #34d399; }
        &.negative { color: #f87171; }
      }
    }

    .mobile-branches {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .mobile-branch-card {
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 0.625rem 0.75rem;
    }

    .branch-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;

      .branch-name { font-size: 0.8rem; font-weight: 600; color: #fff; }
      .branch-revenue { font-size: 0.85rem; font-weight: 700; color: #60a5fa; }
    }

    .branch-card-stats {
      display: flex;
      gap: 0.75rem;
      font-size: 0.65rem;
      color: #71717a;
    }

    .branch-card-bar {
      margin-top: 0.375rem;
      height: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .target-pct-mobile {
      font-size: 0.6rem;
      font-weight: 600;
      color: #e4e4e7;
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialSectionComponent {
  state = inject(DashboardStore);
  device = inject(DeviceService);
  homeData = inject(HomeDataService);

  private readonly MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  branchFinancialsList = computed(() =>
    (this.homeData.branchFinancials.value() ?? []) as BranchFinancialRecord[]
  );

  totalRevenue = computed(() =>
    this.branchFinancialsList().reduce((sum, b) => sum + (b.pos_revenue || 0), 0)
  );

  totalPayroll = computed(() =>
    this.branchFinancialsList().reduce((sum, b) => sum + (b.payroll_total || 0), 0)
  );

  totalOrders = computed(() =>
    this.branchFinancialsList().reduce((sum, b) => sum + (b.pos_order_count || 0), 0)
  );

  totalEmployees = computed(() =>
    this.branchFinancialsList().reduce((sum, b) => sum + (b.employee_count || 0), 0)
  );

  globalAvgTicket = computed(() => {
    const orders = this.totalOrders();
    return orders > 0 ? this.totalRevenue() / orders : 0;
  });

  totalRatio = computed(() => {
    const payroll = this.totalPayroll();
    return payroll > 0 ? this.totalRevenue() / payroll : 0;
  });

  marginClass = computed(() =>
    this.totalRevenue() - this.totalPayroll() >= 0 ? 'positive' : 'negative'
  );

  getMonthName(month: number): string {
    return this.MONTH_NAMES[month - 1] || '';
  }

  prevMonth(): void {
    let m = this.homeData.financialMonth();
    let y = this.homeData.financialYear();
    m--;
    if (m < 1) { m = 12; y--; }
    this.homeData.financialMonth.set(m);
    this.homeData.financialYear.set(y);
  }

  nextMonth(): void {
    let m = this.homeData.financialMonth();
    let y = this.homeData.financialYear();
    m++;
    if (m > 12) { m = 1; y++; }
    this.homeData.financialMonth.set(m);
    this.homeData.financialYear.set(y);
  }

  getTargetPct(b: BranchFinancialRecord): number {
    if (!b.target_promedio || b.target_promedio === 0) return 0;
    return Math.min((b.pos_revenue / b.target_promedio) * 100, 150);
  }

  hasTargets(): boolean {
    return this.branchFinancialsList().some(b => (b.target_promedio || 0) > 0);
  }

  totalTarget(field: 'target_baja' | 'target_promedio' | 'target_alta' | 'target_oro'): number {
    return this.branchFinancialsList().reduce((sum, b) => sum + (b[field] || 0), 0);
  }

  // ── Groomer stats ──

  groomerStatsList = computed(() =>
    (this.homeData.groomerStats.value() ?? []) as GroomerMonthlyStats[]
  );

  groomerTotalServices = computed(() =>
    this.groomerStatsList().reduce((sum, g) => sum + (g.total_services || 0), 0)
  );

  groomerTotalSales = computed(() =>
    this.groomerStatsList().reduce((sum, g) => sum + (g.total_sales || 0), 0)
  );

  groomerTotalCommission = computed(() =>
    this.groomerStatsList().reduce((sum, g) => sum + (g.commission_final || 0), 0)
  );

  // ── Groomer service lines ──
  showGroomerLines = signal(false);

  groomerServiceLinesList = computed(() =>
    (this.homeData.groomerServiceLines.value() ?? []) as GroomerServiceLine[]
  );

  // ── MoM (month-over-month) comparison ──
  private prevMonthData = computed(() =>
    (this.homeData.prevMonthFinancials.value() ?? []) as BranchFinancialRecord[]
  );

  prevTotalRevenue = computed(() =>
    this.prevMonthData().reduce((sum, b) => sum + (b.pos_revenue || 0), 0)
  );

  prevTotalPayroll = computed(() =>
    this.prevMonthData().reduce((sum, b) => sum + (b.payroll_total || 0), 0)
  );

  prevAvgTicket = computed(() => {
    const orders = this.prevMonthData().reduce((sum, b) => sum + (b.pos_order_count || 0), 0);
    const revenue = this.prevTotalRevenue();
    return orders > 0 ? revenue / orders : 0;
  });

  totalExpenses = computed(() =>
    this.branchFinancialsList().reduce((sum, b) => sum + (b.odoo_expenses || 0), 0)
  );

  revenueGrowth = computed(() => {
    const prev = this.prevTotalRevenue();
    return prev > 0 ? ((this.totalRevenue() - prev) / prev) * 100 : 0;
  });

  payrollGrowth = computed(() => {
    const prev = this.prevTotalPayroll();
    return prev > 0 ? ((this.totalPayroll() - prev) / prev) * 100 : 0;
  });

  ticketGrowth = computed(() => {
    const prev = this.prevAvgTicket();
    return prev > 0 ? ((this.globalAvgTicket() - prev) / prev) * 100 : 0;
  });

  // ── Daily sales chart ──
  dailySalesChartData = computed(() => {
    const records = (this.homeData.branchDailySales.value() ?? []) as BranchDailySalesRecord[];
    if (!records.length) return { labels: [], datasets: [] };

    // Aggregate by date (last 14 days)
    const byDate = new Map<string, number>();
    for (const r of records) {
      const current = byDate.get(r.sale_date) || 0;
      byDate.set(r.sale_date, current + r.revenue);
    }

    const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
    const labels = sorted.map(([d]) => d.slice(5)); // MM-DD
    const data = sorted.map(([, v]) => Math.round(v));

    return {
      labels,
      datasets: [{
        data,
        label: 'Ventas diarias',
        backgroundColor: 'rgba(96, 165, 250, 0.3)',
        borderColor: 'rgba(96, 165, 250, 0.8)',
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    };
  });

  dailySalesChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#60a5fa',
        bodyColor: '#fff',
        borderColor: 'rgba(96, 165, 250, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (ctx: any) => `$${(ctx.raw || 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: 'rgba(255,255,255,0.5)',
          font: { size: 10 },
          callback: (v: number) => `$${(v / 1000).toFixed(0)}k`,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

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
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return employees
      .filter(e => e.start_date && new Date(e.start_date) > threeMonthsAgo)
      .reduce((acc, e) => acc + (e.monthly_salary || 0), 0);
  }

  getNewHiresPayroll(): number {
    const employees = this.state.employeesList();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
