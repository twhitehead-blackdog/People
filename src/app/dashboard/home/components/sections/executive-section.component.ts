import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { HomeDataService } from '../../services/home-data.service';

@Component({
  selector: 'pt-executive-section',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TooltipModule],
  template: `
    <!-- ========== VERSIÓN DESKTOP - REDISEÑADA ========== -->
    @if (device.isDesktop()) {
      <div class="pc-dashboard">
        <!-- ROW 1: Hero Stats -->
        <div class="pc-row-1">
          <!-- Card Principal: Headcount -->
          <div class="pc-hero-card" pTooltip="Total de empleados activos en la organización" tooltipPosition="bottom">
            <div class="hero-header">
              <div class="hero-icon">
                <i class="pi pi-users"></i>
              </div>
              <div class="hero-badge">En tiempo real</div>
            </div>
            <div class="hero-body">
              <span class="hero-value">{{ state.headCount() }}</span>
              <span class="hero-label">Colaboradores Activos</span>
            </div>
            <div class="hero-chart">
              <canvas
                baseChart
                [type]="'line'"
                [data]="headcountChartData()"
                [options]="headcountChartOptions()"
              ></canvas>
            </div>
          </div>

          <!-- Card Género -->
          <div class="pc-gender-card" pTooltip="Distribución de género en la organización" tooltipPosition="bottom">
            <div class="gender-header">
              <span class="gender-title">Distribución por Género</span>
            </div>
            <div class="gender-body">
              <div class="gender-chart-wrap">
                <canvas
                  baseChart
                  [type]="'doughnut'"
                  [data]="genderChartData()"
                  [options]="genderChartOptions()"
                ></canvas>
              </div>
              <div class="gender-details">
                <div class="gender-item male">
                  <div class="gender-dot"></div>
                  <div class="gender-info">
                    <span class="gender-count">{{ genderCounts().male }}</span>
                    <span class="gender-label">Masculino</span>
                  </div>
                  <span class="gender-percent">{{ genderPercentages().male }}%</span>
                </div>
                <div class="gender-item female">
                  <div class="gender-dot"></div>
                  <div class="gender-info">
                    <span class="gender-count">{{ genderCounts().female }}</span>
                    <span class="gender-label">Femenino</span>
                  </div>
                  <span class="gender-percent">{{ genderPercentages().female }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Tardanzas -->
          <div class="pc-lates-card" pTooltip="Registro de tardanzas del mes actual" tooltipPosition="bottom">
            <div class="lates-header">
              <div class="lates-icon">
                <i class="pi pi-clock"></i>
              </div>
              <span class="lates-title">Tardanzas del Mes</span>
            </div>
            <div class="lates-body">
              <span class="lates-value">{{ monthlyLates() }}</span>
              <span class="lates-label">llegadas tarde</span>
            </div>
            <div class="lates-chart">
              <canvas
                baseChart
                [type]="'line'"
                [data]="latesDailyChartData()"
                [options]="latesChartOptions()"
              ></canvas>
            </div>
          </div>
        </div>

        <!-- ROW 2: KPIs Grid -->
        <div class="pc-row-2">
          <!-- Columna Izquierda: Métricas de Asistencia -->
          <div class="pc-metrics-group">
            <div class="group-header">
              <i class="pi pi-chart-bar"></i>
              <span>Métricas de Asistencia</span>
            </div>
            <div class="group-cards">
              <div class="metric-card clickable" (click)="openTopLates.emit()" pTooltip="Empleado con más tardanzas. Clic para ver detalles" tooltipPosition="top">
                <div class="metric-icon orange"><i class="pi pi-exclamation-triangle"></i></div>
                <div class="metric-data">
                  <span class="metric-value">{{ topLatesCount() }}</span>
                  <span class="metric-label">Top Tardanzas</span>
                  <span class="metric-sub">{{ topLatesEmployeeName() }}</span>
                </div>
                <i class="pi pi-chevron-right metric-arrow"></i>
              </div>

              <div class="metric-card clickable" (click)="openTopAbsences.emit()" pTooltip="Empleado con más ausencias. Clic para ver detalles" tooltipPosition="top">
                <div class="metric-icon red"><i class="pi pi-ban"></i></div>
                <div class="metric-data">
                  <span class="metric-value">{{ topAbsencesCount() }}</span>
                  <span class="metric-label">Top Ausencias</span>
                  <span class="metric-sub">{{ topAbsencesEmployeeName() }}</span>
                </div>
                <i class="pi pi-chevron-right metric-arrow"></i>
              </div>

              <div class="metric-card" pTooltip="Porcentaje de cumplimiento de horarios establecidos" tooltipPosition="top">
                <div class="metric-icon emerald"><i class="pi pi-check-circle"></i></div>
                <div class="metric-data">
                  <span class="metric-value highlight-green">{{ scheduleComplianceIndex() }}%</span>
                  <span class="metric-label">Cumplimiento</span>
                </div>
                <div class="metric-bar">
                  <div class="bar-fill" [style.width.%]="scheduleComplianceIndex()"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna Central: Movimientos -->
          <div class="pc-metrics-group">
            <div class="group-header">
              <i class="pi pi-sync"></i>
              <span>Movimientos de Personal</span>
            </div>
            <div class="group-cards">
              <div class="metric-card clickable" (click)="openHiresExits.emit()" pTooltip="Nuevos ingresos y bajas del mes. Clic para ver detalles" tooltipPosition="top">
                <div class="metric-icon teal"><i class="pi pi-user-plus"></i></div>
                <div class="metric-data">
                  <div class="metric-dual">
                    <div class="dual-item in">
                      <i class="pi pi-arrow-down"></i>
                      <span>{{ hiresExitsCounts().hires }}</span>
                    </div>
                    <div class="dual-item out">
                      <i class="pi pi-arrow-up"></i>
                      <span>{{ hiresExitsCounts().exits }}</span>
                    </div>
                  </div>
                  <span class="metric-label">Ingresos / Salidas</span>
                </div>
                <i class="pi pi-chevron-right metric-arrow"></i>
              </div>

              <div class="metric-card" pTooltip="Porcentaje de empleados que permanecen en la empresa" tooltipPosition="top">
                <div class="metric-icon pink"><i class="pi pi-heart"></i></div>
                <div class="metric-data">
                  <span class="metric-value highlight-gold">{{ state.retentionRate() }}%</span>
                  <span class="metric-label">Tasa de Retención</span>
                </div>
              </div>

              <div class="metric-card" pTooltip="Índice de satisfacción y ambiente laboral" tooltipPosition="top">
                <div class="metric-icon green"><i class="pi pi-sun"></i></div>
                <div class="metric-data">
                  <span class="metric-value highlight-green">{{ workClimateIndex() }}%</span>
                  <span class="metric-label">Clima Laboral</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Demografía -->
          <div class="pc-metrics-group">
            <div class="group-header">
              <i class="pi pi-id-card"></i>
              <span>Demografía</span>
            </div>
            <div class="group-cards">
              <div class="metric-card clickable" (click)="openBirthdays.emit()" pTooltip="Cumpleaños del mes actual. Clic para ver lista" tooltipPosition="top">
                <div class="metric-icon purple"><i class="pi pi-gift"></i></div>
                <div class="metric-data">
                  <span class="metric-value">{{ monthlyBirthdaysCount() }}</span>
                  <span class="metric-label">Cumpleaños del Mes</span>
                </div>
                <i class="pi pi-chevron-right metric-arrow"></i>
              </div>

              <div class="metric-card" pTooltip="Tiempo promedio de permanencia en la empresa" tooltipPosition="top">
                <div class="metric-icon blue"><i class="pi pi-calendar"></i></div>
                <div class="metric-data">
                  <span class="metric-value">{{ state.averageTenure() }}</span>
                  <span class="metric-label">Antigüedad Promedio</span>
                  <span class="metric-sub">años</span>
                </div>
              </div>

              <div class="metric-card" pTooltip="Edad promedio de los empleados activos" tooltipPosition="top">
                <div class="metric-icon cyan"><i class="pi pi-user"></i></div>
                <div class="metric-data">
                  <span class="metric-value">{{ state.averageAge() }}</span>
                  <span class="metric-label">Edad Promedio</span>
                  <span class="metric-sub">años</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna 4: Gestión de Solicitudes -->
          <div class="pc-metrics-group">
            <div class="group-header">
              <i class="pi pi-file-edit"></i>
              <span>Gestión de Solicitudes</span>
            </div>
            <div class="group-cards">
              <div class="metric-card" pTooltip="Empleados con más incapacidades aprobadas" tooltipPosition="top">
                <div class="metric-icon amber"><i class="pi pi-heart"></i></div>
                <div class="metric-data">
                  <span class="metric-label" style="margin-bottom:0.25rem">Top Incapacidades</span>
                  @for (emp of topDisabilities(); track emp.name; let i = $index) {
                    <div class="top-row">
                      <span class="top-name">{{ i + 1 }}. {{ emp.name }}</span>
                      <span class="top-count amber-text">{{ emp.count }}</span>
                    </div>
                  } @empty {
                    <span class="metric-sub">Sin datos</span>
                  }
                </div>
              </div>

              <div class="metric-card" pTooltip="Empleados con más compensatorios aprobados" tooltipPosition="top">
                <div class="metric-icon amber"><i class="pi pi-clock"></i></div>
                <div class="metric-data">
                  <span class="metric-label" style="margin-bottom:0.25rem">Top Compensatorios</span>
                  @for (emp of topCompensatory(); track emp.name; let i = $index) {
                    <div class="top-row">
                      <span class="top-name">{{ i + 1 }}. {{ emp.name }}</span>
                      <span class="top-count amber-text">{{ emp.count }}</span>
                    </div>
                  } @empty {
                    <span class="metric-sub">Sin datos</span>
                  }
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- ROW 3: Additional KPIs -->
        <div class="pc-row-3">
          <div class="extra-kpi" pTooltip="Número de sucursales activas" tooltipPosition="top">
            <div class="extra-icon purple"><i class="pi pi-building"></i></div>
            <div class="extra-data">
              <span class="extra-value">{{ state.branchesCount() }}</span>
              <span class="extra-label">Sucursales</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Empleados en período de prueba (< 3 meses)" tooltipPosition="top">
            <div class="extra-icon blue"><i class="pi pi-hourglass"></i></div>
            <div class="extra-data">
              <span class="extra-value">{{ state.probatoryEmployees() }}</span>
              <span class="extra-label">En Prueba</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Nuevos empleados este mes" tooltipPosition="top">
            <div class="extra-icon green"><i class="pi pi-user-plus"></i></div>
            <div class="extra-data">
              <span class="extra-value">{{ state.newEmployeesThisMonth() }}</span>
              <span class="extra-label">Nuevos</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Aniversarios laborales próximos 30 días" tooltipPosition="top">
            <div class="extra-icon pink"><i class="pi pi-star"></i></div>
            <div class="extra-data">
              <span class="extra-value">{{ state.upcomingAnniversaries().length }}</span>
              <span class="extra-label">Aniversarios</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Tasa de rotación mensual" tooltipPosition="top">
            <div class="extra-icon red"><i class="pi pi-refresh"></i></div>
            <div class="extra-data">
              <span class="extra-value warning">{{ state.monthlyTurnover() }}%</span>
              <span class="extra-label">Rotación</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Porcentaje de ausentismo mensual" tooltipPosition="top">
            <div class="extra-icon orange"><i class="pi pi-calendar-times"></i></div>
            <div class="extra-data">
              <span class="extra-value warning">{{ state.monthlyAbsenteeism().percentage }}%</span>
              <span class="extra-label">Ausentismo</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Empleados con deudas pendientes" tooltipPosition="top">
            <div class="extra-icon yellow"><i class="pi pi-wallet"></i></div>
            <div class="extra-data">
              <span class="extra-value">{{ state.employeesWithDebts() }}</span>
              <span class="extra-label">Con Deudas</span>
            </div>
          </div>

          <div class="extra-kpi" pTooltip="Mujeres en licencia de maternidad" tooltipPosition="top">
            <div class="extra-icon rose"><i class="pi pi-heart"></i></div>
            <div class="extra-data">
              <span class="extra-value">{{ state.womenOnLeave() }}</span>
              <span class="extra-label">En Licencia</span>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ========== VERSIÓN MÓVIL ========== -->
    @if (!device.isDesktop()) {
      <div class="mobile-dashboard">
        <div class="mobile-hero">
          <div class="hero-icon"><i class="pi pi-users"></i></div>
          <div class="hero-content">
            <span class="hero-value">{{ state.headCount() }}</span>
            <span class="hero-label">Colaboradores</span>
          </div>
        </div>

        <div class="mobile-grid">
          <div class="mobile-card" (click)="openTopLates.emit()">
            <i class="pi pi-clock orange"></i>
            <span class="m-value">{{ monthlyLates() }}</span>
            <span class="m-label">Tardanzas</span>
          </div>

          <div class="mobile-card" (click)="openTopAbsences.emit()">
            <i class="pi pi-ban red"></i>
            <span class="m-value">{{ topAbsencesCount() }}</span>
            <span class="m-label">Ausencias</span>
          </div>

          <div class="mobile-card" (click)="openBirthdays.emit()">
            <i class="pi pi-gift purple"></i>
            <span class="m-value">{{ monthlyBirthdaysCount() }}</span>
            <span class="m-label">Cumpleaños</span>
          </div>

          <div class="mobile-card" (click)="openHiresExits.emit()">
            <i class="pi pi-user-plus teal"></i>
            <span class="m-value">+{{ hiresExitsCounts().hires }}/-{{ hiresExitsCounts().exits }}</span>
            <span class="m-label">Mov. Personal</span>
          </div>
        </div>

        <div class="mobile-stats">
          <div class="stat-row">
            <span class="stat-label">Retención</span>
            <span class="stat-value green">{{ state.retentionRate() }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Clima Laboral</span>
            <span class="stat-value green">{{ workClimateIndex() }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Cumplimiento</span>
            <span class="stat-value green">{{ scheduleComplianceIndex() }}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Antigüedad Prom.</span>
            <span class="stat-value">{{ state.averageTenure() }} años</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Edad Promedio</span>
            <span class="stat-value">{{ state.averageAge() }} años</span>
          </div>
        </div>

        <div class="mobile-gender">
          <span class="gender-title">Distribución por Género</span>
          <div class="gender-bars">
            <div class="gender-bar male" [style.width.%]="genderPercentages().male">
              <span>{{ genderCounts().male }} M</span>
            </div>
            <div class="gender-bar female" [style.width.%]="genderPercentages().female">
              <span>{{ genderCounts().female }} F</span>
            </div>
          </div>
        </div>

        <div class="mobile-stats">
          <div class="stat-row">
            <span class="stat-label" style="font-weight:600;color:#f59e0b">Gestión de Solicitudes</span>
            <span></span>
          </div>
          @for (emp of topDisabilities(); track emp.name; let i = $index) {
            <div class="stat-row">
              <span class="stat-label">{{ i + 1 }}. {{ emp.name }}</span>
              <span class="stat-value" style="color:#f59e0b">{{ emp.count }} incap.</span>
            </div>
          }
          @for (emp of topCompensatory(); track emp.name; let i = $index) {
            <div class="stat-row">
              <span class="stat-label">{{ i + 1 }}. {{ emp.name }}</span>
              <span class="stat-value" style="color:#f59e0b">{{ emp.count }} comp.</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    /* ========================================
       PC DASHBOARD - COMPLETE REDESIGN
       ======================================== */
    .pc-dashboard {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: linear-gradient(180deg, #0a0a0a 0%, #0f0f10 100%);
      padding-bottom: 2rem;
    }

    /* ===== ROW 1: Hero Cards ===== */
    .pc-row-1 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      align-items: stretch;
    }

    /* Hero Card - Headcount */
    .pc-hero-card {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(24, 24, 27, 0.95) 100%);
      border: 1px solid rgba(251, 191, 36, 0.15);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      min-height: 200px;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #fbbf24, #f59e0b);
        border-radius: 16px 16px 0 0;
      }
    }

    .hero-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      flex-shrink: 0;
    }

    .hero-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(251, 191, 36, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;

      i { font-size: 1.25rem; color: #fbbf24; }
    }

    .hero-badge {
      font-size: 0.6rem;
      color: #34d399;
      background: rgba(52, 211, 153, 0.1);
      padding: 0.25rem 0.625rem;
      border-radius: 20px;
      border: 1px solid rgba(52, 211, 153, 0.2);
    }

    .hero-body {
      margin-bottom: 0.75rem;
    }

    .hero-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
      display: block;
    }

    .hero-label {
      font-size: 0.8125rem;
      color: #a1a1aa;
      margin-top: 0.25rem;
      display: block;
    }

    .hero-chart {
      height: 56px;
      margin-top: auto;
      min-height: 56px;

      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    }

    /* Gender Card */
    .pc-gender-card {
      background: rgba(24, 24, 27, 0.95);
      border: 1px solid rgba(139, 92, 246, 0.15);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      min-height: 200px;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
        border-radius: 16px 16px 0 0;
      }
    }

    .gender-header {
      margin-bottom: 0.75rem;
      flex-shrink: 0;
    }

    .gender-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .gender-body {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      min-height: 0;
    }

    .gender-chart-wrap {
      width: 90px;
      height: 90px;
      flex-shrink: 0;

      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    }

    .gender-details {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      flex: 1;
      min-width: 0;
    }

    .gender-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .gender-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      &.male .gender-dot { background: #60a5fa; }
      &.female .gender-dot { background: #f472b6; }

      .gender-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      .gender-count {
        font-size: 1.0625rem;
        font-weight: 700;
        color: #ffffff;
      }

      .gender-label {
        font-size: 0.6875rem;
        color: #71717a;
      }

      .gender-percent {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #a1a1aa;
        flex-shrink: 0;
      }
    }

    /* Lates Card */
    .pc-lates-card {
      background: rgba(24, 24, 27, 0.95);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      min-height: 200px;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
        border-radius: 16px 16px 0 0;
      }
    }

    .lates-header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.75rem;
      flex-shrink: 0;
    }

    .lates-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;

      i { font-size: 1.1rem; color: #f59e0b; }
    }

    .lates-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
    }

    .lates-body {
      margin-bottom: 0.75rem;
    }

    .lates-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #f59e0b;
      line-height: 1.1;
      display: block;
    }

    .lates-label {
      font-size: 0.8125rem;
      color: #71717a;
      display: block;
      margin-top: 0.25rem;
    }

    .lates-chart {
      height: 56px;
      margin-top: auto;
      min-height: 56px;

      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    }

    /* ===== ROW 2: Metrics Groups ===== */
    .pc-row-2 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .pc-metrics-group {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 1rem;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.875rem;
      padding-bottom: 0.625rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      i {
        font-size: 0.875rem;
        color: #71717a;
      }

      span {
        font-size: 0.7rem;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
    }

    .group-cards {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .metric-card {
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: all 0.2s ease;

      &.clickable {
        cursor: pointer;

        &:hover {
          border-color: rgba(251, 191, 36, 0.2);
          background: rgba(30, 30, 33, 0.9);

          .metric-arrow { color: #fbbf24; transform: translateX(2px); }
        }
      }
    }

    .metric-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i { font-size: 1rem; }

      &.orange { background: rgba(245, 158, 11, 0.12); i { color: #f59e0b; } }
      &.red { background: rgba(239, 68, 68, 0.12); i { color: #ef4444; } }
      &.teal { background: rgba(20, 184, 166, 0.12); i { color: #14b8a6; } }
      &.pink { background: rgba(236, 72, 153, 0.12); i { color: #ec4899; } }
      &.purple { background: rgba(139, 92, 246, 0.12); i { color: #8b5cf6; } }
      &.blue { background: rgba(59, 130, 246, 0.12); i { color: #3b82f6; } }
      &.cyan { background: rgba(6, 182, 212, 0.12); i { color: #06b6d4; } }
      &.green { background: rgba(34, 197, 94, 0.12); i { color: #22c55e; } }
      &.emerald { background: rgba(16, 185, 129, 0.12); i { color: #10b981; } }
      &.amber { background: rgba(245, 158, 11, 0.12); i { color: #f59e0b; } }
    }

    .metric-data {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .metric-value {
      font-size: 1.375rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.1;

      &.highlight-gold {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      &.highlight-green {
        color: #34d399;
      }
    }

    .metric-label {
      font-size: 0.65rem;
      font-weight: 500;
      color: #a1a1aa;
      margin-top: 0.125rem;
    }

    .metric-sub {
      font-size: 0.6rem;
      color: #52525b;
    }

    .metric-arrow {
      font-size: 0.75rem;
      color: #52525b;
      transition: all 0.2s ease;
    }

    .metric-dual {
      display: flex;
      gap: 1rem;
    }

    .dual-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;

      i { font-size: 0.75rem; }
      span { font-size: 1.25rem; font-weight: 700; }

      &.in { i, span { color: #34d399; } }
      &.out { i, span { color: #f87171; } }
    }

    .metric-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      margin-top: 0.5rem;
      overflow: hidden;

      .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #34d399);
        border-radius: 3px;
        transition: width 0.4s ease;
      }
    }

    /* Top rankings styles */
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0.2rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      &:last-child { border-bottom: none; }
    }

    .top-name {
      font-size: 0.7rem;
      color: #a1a1aa;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 75%;
    }

    .top-count {
      font-size: 0.85rem;
      font-weight: 700;
      color: #fff;
    }

    .amber-text { color: #f59e0b; }

    /* ===== ROW 3: Extra KPIs ===== */
    .pc-row-3 {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 0.625rem;
    }

    .extra-kpi {
      background: rgba(24, 24, 27, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.08);
        background: rgba(30, 30, 33, 0.8);
      }
    }

    .extra-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      i { font-size: 0.9rem; }

      &.purple { background: rgba(139, 92, 246, 0.12); i { color: #8b5cf6; } }
      &.blue { background: rgba(59, 130, 246, 0.12); i { color: #3b82f6; } }
      &.green { background: rgba(34, 197, 94, 0.12); i { color: #22c55e; } }
      &.pink { background: rgba(236, 72, 153, 0.12); i { color: #ec4899; } }
      &.red { background: rgba(239, 68, 68, 0.12); i { color: #ef4444; } }
      &.orange { background: rgba(245, 158, 11, 0.12); i { color: #f59e0b; } }
      &.yellow { background: rgba(251, 191, 36, 0.12); i { color: #fbbf24; } }
      &.rose { background: rgba(244, 114, 182, 0.12); i { color: #f472b6; } }
    }

    .extra-data {
      display: flex;
      flex-direction: column;
    }

    .extra-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      line-height: 1;

      &.warning { color: #f59e0b; }
    }

    .extra-label {
      font-size: 0.55rem;
      font-weight: 500;
      color: #71717a;
      margin-top: 0.125rem;
      text-transform: uppercase;
    }

    /* ========================================
       MOBILE STYLES (unchanged)
       ======================================== */
    .mobile-dashboard {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mobile-hero {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.08));
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .mobile-hero .hero-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      background: rgba(251, 191, 36, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;

      i { font-size: 1.5rem; color: #fbbf24; }
    }

    .mobile-hero .hero-content {
      display: flex;
      flex-direction: column;
    }

    .mobile-hero .hero-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
    }

    .mobile-hero .hero-label {
      font-size: 0.875rem;
      color: #a1a1aa;
      margin-top: 0.25rem;
    }

    .mobile-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .mobile-card {
      background: rgba(24, 24, 27, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      cursor: pointer;

      &:active { transform: scale(0.98); }

      i {
        font-size: 1.25rem;
        &.orange { color: #f59e0b; }
        &.red { color: #ef4444; }
        &.purple { color: #8b5cf6; }
        &.teal { color: #14b8a6; }
      }

      .m-value { font-size: 1.5rem; font-weight: 700; color: #ffffff; }
      .m-label { font-size: 0.65rem; color: #71717a; text-transform: uppercase; }
    }

    .mobile-stats {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.75rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      &:last-child { border-bottom: none; }
    }

    .stat-label { font-size: 0.75rem; color: #a1a1aa; }
    .stat-value { font-size: 0.875rem; font-weight: 600; color: #ffffff; &.green { color: #34d399; } }

    .mobile-gender {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.75rem;
    }

    .gender-bars { display: flex; gap: 0.375rem; height: 28px; }

    .gender-bar {
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;

      span { font-size: 0.7rem; font-weight: 600; white-space: nowrap; }

      &.male { background: rgba(96, 165, 250, 0.25); span { color: #60a5fa; } }
      &.female { background: rgba(244, 114, 182, 0.25); span { color: #f472b6; } }
    }

    .mobile-gender .gender-title {
      font-size: 0.65rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.625rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutiveSectionComponent {
  state = inject(DashboardStore);
  device = inject(DeviceService);
  private homeData = inject(HomeDataService);

  // Computed: Top rankings from HomeDataService
  topDisabilities = computed(() => this.buildTopRanking(this.homeData.approvedDisabilities.value() ?? []));
  topCompensatory = computed(() => this.buildTopRanking(this.homeData.approvedCompensatory.value() ?? []));

  private buildTopRanking(records: { employee_id: string; employee?: { first_name?: string; father_name?: string } }[]): { name: string; count: number }[] {
    const counts = new Map<string, { name: string; count: number }>();
    for (const r of records) {
      const existing = counts.get(r.employee_id);
      if (existing) {
        existing.count++;
      } else {
        const name = r.employee ? `${r.employee.first_name || ''} ${r.employee.father_name || ''}`.trim() : 'Desconocido';
        counts.set(r.employee_id, { name, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  }

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

  // Outputs
  openTopLates = output<void>();
  openTopAbsences = output<void>();
  openHiresExits = output<void>();
  openBirthdays = output<void>();
}
