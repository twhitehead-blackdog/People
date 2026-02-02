import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';

@Component({
  selector: 'pt-structure-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TooltipModule],
  template: `
    <!-- ===== PC VERSION ===== -->
    @if (device.isDesktop()) {
      <div class="pc-structure">
        <!-- Header -->
        <div class="section-header">
          <div class="header-icon">
            <i class="pi pi-sitemap"></i>
          </div>
          <div class="header-text">
            <h2>Estructura Organizacional</h2>
            <p>Distribución y organización del personal</p>
          </div>
        </div>

        <div class="structure-layout">
          <!-- Left: KPIs -->
          <div class="structure-kpis">
            <div class="kpi-row">
              <div class="kpi-card purple" pTooltip="Número de sucursales operativas activas" tooltipPosition="top">
                <div class="kpi-icon"><i class="pi pi-building"></i></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ state.branchesCount() }}</span>
                  <span class="kpi-label">Sucursales</span>
                </div>
              </div>

              <div class="kpi-card blue" pTooltip="Total de empleados activos" tooltipPosition="top">
                <div class="kpi-icon"><i class="pi pi-users"></i></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ state.headCount() }}</span>
                  <span class="kpi-label">Empleados</span>
                </div>
              </div>

              <div class="kpi-card yellow" pTooltip="Empleados por cada supervisor" tooltipPosition="top">
                <div class="kpi-icon"><i class="pi pi-chart-pie"></i></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ state.supervisionRatio() }}</span>
                  <span class="kpi-label">Ratio Supervisión</span>
                </div>
              </div>
            </div>

            <!-- Contratos -->
            <div class="contracts-section">
              <h3>Tipo de Contrato</h3>
              <div class="contract-bars">
                <div class="contract-item" pTooltip="Empleados con contrato indefinido" tooltipPosition="right">
                  <div class="contract-info">
                    <span class="contract-label">Fijos</span>
                    <span class="contract-value">{{ state.contractDistribution().fixed }}</span>
                  </div>
                  <div class="contract-bar">
                    <div class="bar-fill green" [style.width.%]="getContractPercentage('fixed')"></div>
                  </div>
                  <span class="contract-percent">{{ getContractPercentage('fixed') }}%</span>
                </div>

                <div class="contract-item" pTooltip="Empleados con contrato temporal" tooltipPosition="right">
                  <div class="contract-info">
                    <span class="contract-label">Temporales</span>
                    <span class="contract-value">{{ state.contractDistribution().temporary }}</span>
                  </div>
                  <div class="contract-bar">
                    <div class="bar-fill orange" [style.width.%]="getContractPercentage('temporary')"></div>
                  </div>
                  <span class="contract-percent">{{ getContractPercentage('temporary') }}%</span>
                </div>
              </div>
            </div>

            <!-- Distribución por Edad -->
            <div class="age-section">
              <h3>Distribución por Edad</h3>
              <div class="age-bars">
                @for (age of getAgeDistributionArray(); track age.range) {
                  <div class="age-item" pTooltip="Empleados entre {{ age.range }} años" tooltipPosition="right">
                    <span class="age-label">{{ age.range }}</span>
                    <div class="age-bar">
                      <div class="age-fill" [style.width.%]="getAgePercentage(age.count)"></div>
                    </div>
                    <span class="age-count">{{ age.count }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Top Departamentos -->
            <div class="dept-section">
              <h3>Top Departamentos</h3>
              <div class="dept-list">
                @for (dept of getTopDepartments(); track dept.department?.id; let i = $index) {
                  <div class="dept-item">
                    <span class="dept-rank">{{ i + 1 }}</span>
                    <span class="dept-name">{{ dept.department?.name || 'Sin depto' }}</span>
                    <span class="dept-count">{{ dept.count }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Center: Positions Table -->
          <div class="positions-panel">
            <div class="panel-header">
              <h3>Salario por Posición</h3>
              <span class="panel-badge">Ordenado por salario total</span>
            </div>
            <div class="positions-table">
              <div class="table-header">
                <span class="col-pos">Posición</span>
                <span class="col-emp" pTooltip="Empleados (% del total)" tooltipPosition="top">Emp.</span>
                <span class="col-avg" pTooltip="Salario promedio" tooltipPosition="top">Prom.</span>
                <span class="col-total" pTooltip="Salario total" tooltipPosition="top">Total</span>
              </div>
              <div class="table-body">
                @for (pos of getSortedPositions(); track pos.position?.id; let i = $index) {
                  <div class="table-row" [class.top-3]="i < 3">
                    <div class="col-pos">
                      <span class="pos-rank">{{ i + 1 }}</span>
                      <span class="pos-name">{{ pos.position?.name || 'Sin posición' }}</span>
                    </div>
                    <div class="col-emp">
                      <span class="emp-count">{{ pos.count }}</span>
                      <span class="emp-percent">({{ pos.empPercent }}%)</span>
                    </div>
                    <span class="col-avg">{{ pos.avgSalary | currency:'$':'symbol':'1.0-0' }}</span>
                    <span class="col-total">{{ pos.totalSalary | currency:'$':'symbol':'1.0-0' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right: Branches Table -->
          <div class="branches-panel">
            <div class="panel-header">
              <h3>Distribución por Sucursal</h3>
              <span class="panel-badge">Ordenado por salario total</span>
            </div>
            <div class="branches-table">
              <div class="table-header">
                <span class="col-branch">Sucursal</span>
                <span class="col-emp" pTooltip="Empleados (% del total)" tooltipPosition="top">Emp.</span>
                <span class="col-salary-pct" pTooltip="% del total de salarios" tooltipPosition="top">% Salario</span>
                <span class="col-total" pTooltip="Salario total de la sucursal" tooltipPosition="top">Total</span>
              </div>
              <div class="table-body">
                @for (branch of getSortedBranches(); track branch.branch?.id; let i = $index) {
                  <div class="table-row" [class.top-3]="i < 3">
                    <div class="col-branch">
                      <span class="branch-rank">{{ i + 1 }}</span>
                      <span class="branch-name">{{ branch.branch?.name || 'Sin sucursal' }}</span>
                    </div>
                    <div class="col-emp">
                      <span class="emp-count">{{ branch.count }}</span>
                      <span class="emp-percent">({{ branch.empPercent }}%)</span>
                    </div>
                    <div class="col-salary-pct">
                      <div class="pct-bar">
                        <div class="pct-fill" [style.width.%]="branch.salaryPercent" [class.high]="branch.ratio > 1.1" [class.low]="branch.ratio < 0.9"></div>
                      </div>
                      <span class="pct-value" [class.high]="branch.ratio > 1.1" [class.low]="branch.ratio < 0.9">{{ branch.salaryPercent }}%</span>
                    </div>
                    <span class="col-total">{{ branch.totalSalary | currency:'$':'symbol':'1.0-0' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ===== MOBILE VERSION ===== -->
    @if (!device.isDesktop()) {
      <div class="mobile-section">
        <div class="mobile-header">
          <i class="pi pi-sitemap"></i>
          <span>Estructura</span>
        </div>

        <div class="mobile-cards">
          <div class="m-card">
            <i class="pi pi-building purple"></i>
            <span class="m-value">{{ state.branchesCount() }}</span>
            <span class="m-label">Sucursales</span>
          </div>
          <div class="m-card">
            <i class="pi pi-users blue"></i>
            <span class="m-value">{{ state.headCount() }}</span>
            <span class="m-label">Empleados</span>
          </div>
        </div>

        <div class="mobile-stats">
          <div class="stat-row">
            <span>Empleados Fijos</span>
            <span class="value">{{ state.contractDistribution().fixed }} ({{ getContractPercentage('fixed') }}%)</span>
          </div>
          <div class="stat-row">
            <span>Empleados Temporales</span>
            <span class="value">{{ state.contractDistribution().temporary }} ({{ getContractPercentage('temporary') }}%)</span>
          </div>
          <div class="stat-row">
            <span>Ratio de Supervisión</span>
            <span class="value">{{ state.supervisionRatio() }}</span>
          </div>
          <div class="stat-row">
            <span>Promedio por Sucursal</span>
            <span class="value">{{ getAveragePerBranch() }}</span>
          </div>
        </div>

        <div class="mobile-positions">
          <span class="section-title">Salario por Posición</span>
          @for (pos of getSortedPositions().slice(0, 10); track pos.position?.id; let i = $index) {
            <div class="position-row">
              <div class="position-info">
                <div class="position-header-mobile">
                  <span class="position-rank-mobile">{{ i + 1 }}</span>
                  <span class="position-name">{{ pos.position?.name || 'Sin posición' }}</span>
                </div>
                <span class="position-emp">{{ pos.count }} emp ({{ pos.empPercent }}%)</span>
              </div>
              <div class="position-salaries">
                <span class="position-avg">{{ pos.avgSalary | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="position-total">{{ pos.totalSalary | currency:'$':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          }
        </div>

        <div class="mobile-branches">
          <span class="section-title">Top Sucursales por Salario</span>
          @for (branch of getSortedBranches(); track branch.branch?.id; let i = $index) {
            <div class="branch-row">
              <div class="branch-info">
                <div class="branch-header-mobile">
                  <span class="branch-rank-mobile">{{ i + 1 }}</span>
                  <span class="branch-name">{{ branch.branch?.name || 'Sin sucursal' }}</span>
                </div>
                <span class="emp-count">{{ branch.count }} emp ({{ branch.empPercent }}%) → {{ branch.salaryPercent }}% salario</span>
              </div>
              <span class="branch-total">{{ branch.totalSalary | currency:'$':'symbol':'1.0-0' }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    /* ===== PC STYLES ===== */
    .pc-structure {
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
      background: rgba(139, 92, 246, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      i { font-size: 1.25rem; color: #8b5cf6; }
    }

    .header-text {
      h2 { font-size: 1.25rem; font-weight: 600; color: #fff; margin: 0; }
      p { font-size: 0.8rem; color: #71717a; margin: 0.25rem 0 0; }
    }

    .structure-layout {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    .structure-kpis {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .kpi-row {
      display: flex;
      gap: 0.75rem;
    }

    .kpi-card {
      flex: 1;
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: all 0.2s ease;

      &:hover { border-color: rgba(255, 255, 255, 0.1); }

      &.purple { border-top: 3px solid #8b5cf6; }
      &.blue { border-top: 3px solid #3b82f6; }
      &.yellow { border-top: 3px solid #fbbf24; }
    }

    .kpi-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
      i { font-size: 1.125rem; }
    }

    .kpi-card.purple .kpi-icon { background: rgba(139, 92, 246, 0.12); i { color: #8b5cf6; } }
    .kpi-card.blue .kpi-icon { background: rgba(59, 130, 246, 0.12); i { color: #3b82f6; } }
    .kpi-card.yellow .kpi-icon { background: rgba(251, 191, 36, 0.12); i { color: #fbbf24; } }

    .kpi-data {
      display: flex;
      flex-direction: column;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
      line-height: 1;
    }

    .kpi-label {
      font-size: 0.65rem;
      font-weight: 500;
      color: #a1a1aa;
      margin-top: 0.25rem;
      text-transform: uppercase;
    }

    .contracts-section {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 1.25rem;

      h3 {
        font-size: 0.75rem;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        margin: 0 0 1rem;
      }
    }

    .contract-bars {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .contract-item {
      display: grid;
      grid-template-columns: 100px 1fr 50px;
      align-items: center;
      gap: 1rem;
    }

    .contract-info {
      display: flex;
      justify-content: space-between;
    }

    .contract-label { font-size: 0.8rem; color: #a1a1aa; }
    .contract-value { font-size: 0.9rem; font-weight: 700; color: #fff; }

    .contract-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;

      .bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;
        &.green { background: linear-gradient(90deg, #22c55e, #34d399); }
        &.orange { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
      }
    }

    .contract-percent {
      font-size: 0.85rem;
      font-weight: 600;
      color: #71717a;
      text-align: right;
    }

    /* Age Section */
    .age-section {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 1rem;

      h3 {
        font-size: 0.7rem;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        margin: 0 0 0.75rem;
      }
    }

    .age-bars {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .age-item {
      display: grid;
      grid-template-columns: 50px 1fr 30px;
      align-items: center;
      gap: 0.5rem;
    }

    .age-label {
      font-size: 0.7rem;
      color: #a1a1aa;
    }

    .age-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;

      .age-fill {
        height: 100%;
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
        border-radius: 3px;
      }
    }

    .age-count {
      font-size: 0.75rem;
      font-weight: 600;
      color: #fff;
      text-align: right;
    }

    /* Department Section */
    .dept-section {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 1rem;

      h3 {
        font-size: 0.7rem;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        margin: 0 0 0.75rem;
      }
    }

    .dept-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .dept-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
    }

    .dept-rank {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: rgba(6, 182, 212, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.55rem;
      font-weight: 700;
      color: #06b6d4;
    }

    .dept-name {
      flex: 1;
      font-size: 0.75rem;
      color: #e4e4e7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dept-count {
      font-size: 0.8rem;
      font-weight: 600;
      color: #06b6d4;
    }

    /* Positions Panel */
    .positions-panel {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      overflow: hidden;
    }

    .positions-panel .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.875rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      h3 { font-size: 0.8rem; font-weight: 600; color: #fff; margin: 0; }
    }

    .positions-panel .panel-badge {
      font-size: 0.55rem;
      color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 20px;
      border: 1px solid rgba(6, 182, 212, 0.2);
    }

    .positions-table {

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
    }

    .positions-table .table-header {
      display: grid;
      grid-template-columns: 1fr 70px 80px 90px;
      padding: 0.625rem 0.875rem;
      background: rgba(255, 255, 255, 0.02);
      position: sticky;
      top: 0;
      z-index: 1;

      span {
        font-size: 0.5rem;
        font-weight: 600;
        color: #52525b;
        text-transform: uppercase;
        cursor: default;
      }

      .col-emp, .col-avg, .col-total { text-align: right; }
    }

    .positions-table .table-row {
      display: grid;
      grid-template-columns: 1fr 70px 80px 90px;
      padding: 0.5rem 0.875rem;
      transition: background 0.2s ease;
      align-items: center;

      &:hover { background: rgba(255, 255, 255, 0.02); }

      &.top-3 {
        background: rgba(6, 182, 212, 0.03);
        .pos-rank { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
      }

      .col-pos {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        min-width: 0;
      }

      .pos-rank {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.55rem;
        font-weight: 700;
        color: #71717a;
        flex-shrink: 0;
      }

      .pos-name {
        font-size: 0.7rem;
        color: #e4e4e7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .col-emp {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.0625rem;
      }

      .emp-count {
        font-size: 0.75rem;
        font-weight: 600;
        color: #06b6d4;
      }

      .emp-percent {
        font-size: 0.5rem;
        color: #71717a;
      }

      .col-avg {
        font-size: 0.65rem;
        font-weight: 500;
        color: #34d399;
        text-align: right;
      }

      .col-total {
        font-size: 0.7rem;
        font-weight: 600;
        color: #60a5fa;
        text-align: right;
      }
    }

    /* Branches Panel */
    .branches-panel {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      h3 { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0; }
    }

    .panel-badge {
      font-size: 0.65rem;
      color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      padding: 0.25rem 0.625rem;
      border-radius: 20px;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .branches-table {

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
    }

    .table-header {
      display: grid;
      grid-template-columns: 1.2fr 80px 100px 100px;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      position: sticky;
      top: 0;
      z-index: 1;

      span {
        font-size: 0.55rem;
        font-weight: 600;
        color: #52525b;
        text-transform: uppercase;
        cursor: default;
      }

      .col-emp, .col-salary-pct, .col-total { text-align: right; }
    }

    .table-body {
      padding: 0.25rem 0;
    }

    .table-row {
      display: grid;
      grid-template-columns: 1.2fr 80px 100px 100px;
      padding: 0.5rem 1rem;
      transition: background 0.2s ease;
      align-items: center;

      &:hover { background: rgba(255, 255, 255, 0.02); }

      &.top-3 {
        background: rgba(251, 191, 36, 0.03);
        .branch-rank { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
      }

      .col-branch {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
      }

      .branch-rank {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6rem;
        font-weight: 700;
        color: #71717a;
        flex-shrink: 0;
      }

      .branch-name {
        font-size: 0.75rem;
        color: #e4e4e7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .col-emp {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.125rem;
      }

      .emp-count {
        font-size: 0.8rem;
        font-weight: 600;
        color: #fbbf24;
      }

      .emp-percent {
        font-size: 0.55rem;
        color: #71717a;
      }

      .col-salary-pct {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        justify-content: flex-end;
      }

      .pct-bar {
        width: 40px;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;

        .pct-fill {
          height: 100%;
          background: #71717a;
          border-radius: 3px;
          transition: width 0.3s ease;

          &.high { background: #ef4444; }
          &.low { background: #22c55e; }
        }
      }

      .pct-value {
        font-size: 0.7rem;
        font-weight: 600;
        color: #a1a1aa;
        min-width: 35px;
        text-align: right;

        &.high { color: #ef4444; }
        &.low { color: #22c55e; }
      }

      .col-total {
        font-size: 0.75rem;
        font-weight: 600;
        color: #60a5fa;
        text-align: right;
      }
    }

    /* ===== MOBILE STYLES ===== */
    .mobile-section { padding: 0.75rem; }

    .mobile-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      i { color: #8b5cf6; }
      span { font-size: 1rem; font-weight: 600; color: #fff; }
    }

    .mobile-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .m-card {
      background: rgba(24, 24, 27, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;

      i { font-size: 1.25rem; margin-bottom: 0.375rem; &.purple { color: #8b5cf6; } &.blue { color: #3b82f6; } }
      .m-value { font-size: 1.75rem; font-weight: 700; color: #fff; }
      .m-label { font-size: 0.65rem; color: #71717a; text-transform: uppercase; }
    }

    .mobile-stats {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.75rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.8rem;
      &:last-child { border-bottom: none; }
      span:first-child { color: #a1a1aa; }
      .value { color: #fff; font-weight: 600; }
    }

    .mobile-positions {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .section-title {
      font-size: 0.65rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.5rem;
    }

    .position-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      gap: 0.5rem;
      &:last-child { border-bottom: none; }

      .position-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }

      .position-header-mobile {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      .position-rank-mobile {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        background: rgba(6, 182, 212, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.5rem;
        font-weight: 700;
        color: #06b6d4;
        flex-shrink: 0;
      }

      .position-name { font-size: 0.7rem; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .position-emp { font-size: 0.55rem; color: #71717a; margin-top: 0.0625rem; }

      .position-salaries {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.0625rem;
      }

      .position-avg { font-size: 0.6rem; color: #34d399; }
      .position-total { font-size: 0.7rem; font-weight: 600; color: #60a5fa; }
    }

    .mobile-branches {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.75rem;
    }

    .branches-title {
      font-size: 0.65rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.5rem;
    }

    .branch-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      gap: 0.5rem;
      &:last-child { border-bottom: none; }

      .branch-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }

      .branch-header-mobile {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      .branch-rank-mobile {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background: rgba(251, 191, 36, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.55rem;
        font-weight: 700;
        color: #fbbf24;
        flex-shrink: 0;
      }

      .branch-name { font-size: 0.75rem; color: #e4e4e7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .emp-count { font-size: 0.55rem; color: #71717a; margin-top: 0.125rem; }

      .branch-total {
        font-size: 0.8rem;
        font-weight: 700;
        color: #60a5fa;
        white-space: nowrap;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructureSectionComponent {
  state = inject(DashboardStore);
  device = inject(DeviceService);

  getContractPercentage(type: 'fixed' | 'temporary'): number {
    const dist = this.state.contractDistribution();
    const total = dist.fixed + dist.temporary;
    if (total === 0) return 0;
    return Math.round((dist[type] / total) * 100);
  }

  getAveragePerBranch(): string {
    const branches = this.state.branchesCount();
    const employees = this.state.headCount();
    if (branches === 0) return '0';
    return (employees / branches).toFixed(1);
  }

  getSalaryByBranch(branchId: string | undefined): { average: number; total: number } {
    if (!branchId) return { average: 0, total: 0 };
    const salaryData = this.state.averageSalaryByBranch().find(
      (item) => item.branch?.id === branchId
    );
    return {
      average: salaryData?.averageSalary || 0,
      total: salaryData?.totalSalary || 0,
    };
  }

  getBranchPercentage(count: number): number {
    const max = Math.max(...this.state.employeesByBranch().map(b => b.count), 1);
    return (count / max) * 100;
  }

  getAgeDistributionArray() {
    const dist = this.state.ageDistribution();
    return [
      { range: '18-25', count: dist['18-25'] },
      { range: '26-35', count: dist['26-35'] },
      { range: '36-45', count: dist['36-45'] },
      { range: '46-55', count: dist['46-55'] },
      { range: '56+', count: dist['56+'] },
    ];
  }

  getAgePercentage(count: number): number {
    const ageData = this.getAgeDistributionArray();
    const max = Math.max(...ageData.map(a => a.count), 1);
    return (count / max) * 100;
  }

  getTopDepartments() {
    return [...this.state.employeesByDepartment()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  getSortedPositions() {
    const positions = this.state.employeesByPosition();
    const employees = this.state.employeesList();
    const totalEmployees = this.state.headCount();

    // Posiciones a excluir
    const excludedPositions = ['socio', 'desarrollador', 'soporte de it'];

    return positions
      .filter(pos => pos.count > 1) // Solo posiciones con más de 1 empleado
      .filter(pos => {
        const name = (pos.position?.name || '').toLowerCase();
        return !excludedPositions.some(excluded => name.includes(excluded));
      })
      .map(pos => {
        const posEmployees = employees.filter(e => e.position_id === pos.position?.id);
        const posTotal = posEmployees.reduce((acc, e) => acc + (e.monthly_salary || 0), 0);
        const avgSalary = posEmployees.length > 0 ? Math.round(posTotal / posEmployees.length) : 0;
        const empPercent = totalEmployees > 0 ? Math.round((pos.count / totalEmployees) * 100 * 10) / 10 : 0;

        return {
          ...pos,
          totalSalary: Math.round(posTotal),
          avgSalary,
          empPercent,
        };
      })
      .sort((a, b) => b.totalSalary - a.totalSalary);
  }

  // Obtener sucursales ordenadas por salario total (mayor a menor)
  getSortedBranches() {
    const branches = this.state.employeesByBranch();
    const salaryData = this.state.averageSalaryByBranch();
    const totalEmployees = this.state.headCount();
    const totalSalary = this.state.monthlyBudget();

    return branches
      .map(branch => {
        const salary = salaryData.find(s => s.branch?.id === branch.branch?.id);
        const branchTotal = salary?.totalSalary || 0;
        const empPercent = totalEmployees > 0 ? (branch.count / totalEmployees) * 100 : 0;
        const salaryPercent = totalSalary > 0 ? (branchTotal / totalSalary) * 100 : 0;
        
        return {
          ...branch,
          totalSalary: branchTotal,
          avgSalary: salary?.averageSalary || 0,
          empPercent: Math.round(empPercent * 10) / 10,
          salaryPercent: Math.round(salaryPercent * 10) / 10,
          // Ratio: si salaryPercent > empPercent, la sucursal tiene salarios altos
          ratio: empPercent > 0 ? Math.round((salaryPercent / empPercent) * 100) / 100 : 0
        };
      })
      .sort((a, b) => b.totalSalary - a.totalSalary);
  }
}
