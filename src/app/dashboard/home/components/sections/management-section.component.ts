import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { HomeDataService, EmployeeAuditLog } from '../../services/home-data.service';

@Component({
  selector: 'pt-management-section',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, TooltipModule],
  template: `
    <!-- ===== PC VERSION ===== -->
    @if (device.isDesktop()) {
      <div class="pc-management">
        <!-- Header -->
        <div class="section-header">
          <div class="header-icon">
            <i class="pi pi-users"></i>
          </div>
          <div class="header-text">
            <h2>Gestión de Personal</h2>
            <p>Indicadores de contratación, retención y rotación</p>
          </div>
        </div>

        <div class="management-grid">
          <!-- Column 1: Contrataciones -->
          <div class="mgmt-panel green">
            <div class="panel-header">
              <i class="pi pi-user-plus"></i>
              <span>Contrataciones</span>
            </div>
            <div class="panel-cards">
              <div class="mgmt-card" pTooltip="Nuevos empleados contratados este mes" tooltipPosition="top">
                <span class="card-value">{{ state.newEmployeesThisMonth() }}</span>
                <span class="card-label">Nuevos este Mes</span>
                <span class="card-badge green">Tasa: {{ state.monthlyHiringRate() }}%</span>
              </div>
              <div class="mgmt-card" pTooltip="Crecimiento neto de la plantilla" tooltipPosition="top">
                <span class="card-value">{{ state.growthRate() }}%</span>
                <span class="card-label">Tasa de Crecimiento</span>
              </div>
              <div class="mgmt-card" pTooltip="Empleados con menos de 3 meses" tooltipPosition="top">
                <span class="card-value">{{ state.probatoryEmployees() }}</span>
                <span class="card-label">En Período Prueba</span>
              </div>
            </div>
          </div>

          <!-- Column 2: Rotación -->
          <div class="mgmt-panel red">
            <div class="panel-header">
              <i class="pi pi-refresh"></i>
              <span>Rotación</span>
            </div>
            <div class="panel-cards">
              <div class="mgmt-card" pTooltip="Porcentaje de bajas este mes" tooltipPosition="top">
                <span class="card-value danger">{{ state.monthlyTurnover() }}%</span>
                <span class="card-label">Rotación Mensual</span>
              </div>
              <div class="mgmt-card" pTooltip="Porcentaje de bajas últimos 12 meses" tooltipPosition="top">
                <span class="card-value warning">{{ state.annualTurnover() }}%</span>
                <span class="card-label">Rotación Anual</span>
              </div>
              <div class="mgmt-card" pTooltip="Porcentaje de ausencias del mes" tooltipPosition="top">
                <span class="card-value danger">{{ state.monthlyAbsenteeism().percentage }}%</span>
                <span class="card-label">Ausentismo</span>
              </div>
            </div>
          </div>

          <!-- Column 3: Retención -->
          <div class="mgmt-panel gold">
            <div class="panel-header">
              <i class="pi pi-heart"></i>
              <span>Retención</span>
            </div>
            <div class="panel-cards">
              <div class="mgmt-card highlight" pTooltip="Empleados que permanecen en la empresa" tooltipPosition="top">
                <span class="card-value gold">{{ state.retentionRate() }}%</span>
                <span class="card-label">Tasa de Retención</span>
                <div class="retention-bar">
                  <div class="bar-fill" [style.width.%]="state.retentionRate()"></div>
                </div>
              </div>
              <div class="mgmt-card" pTooltip="Aniversarios laborales próximos 30 días" tooltipPosition="top">
                <span class="card-value">{{ state.upcomingAnniversaries().length }}</span>
                <span class="card-label">Aniversarios Próx.</span>
              </div>
              <div class="mgmt-card" pTooltip="Mujeres en licencia de maternidad" tooltipPosition="top">
                <span class="card-value pink">{{ state.womenOnLeave() }}</span>
                <span class="card-label">Mujeres en Licencia</span>
              </div>
            </div>
          </div>

          <!-- Column 4: Demografía -->
          <div class="mgmt-panel purple">
            <div class="panel-header">
              <i class="pi pi-id-card"></i>
              <span>Demografía</span>
            </div>
            <div class="panel-cards">
              <div class="mgmt-card" pTooltip="Tiempo promedio de permanencia" tooltipPosition="top">
                <span class="card-value">{{ state.averageTenure() }}</span>
                <span class="card-label">Antigüedad Prom.</span>
                <span class="card-unit">años</span>
              </div>
              <div class="mgmt-card" pTooltip="Edad promedio de empleados" tooltipPosition="top">
                <span class="card-value">{{ state.averageAge() }}</span>
                <span class="card-label">Edad Promedio</span>
                <span class="card-unit">años</span>
              </div>
              <div class="mgmt-card" pTooltip="Costo total mensual por empleado" tooltipPosition="top">
                <span class="card-value teal">{{ state.costPerEmployee() | currency:'$':'symbol':'1.0-0' }}</span>
                <span class="card-label">Costo/Empleado</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Audit Log -->
        @if (auditLogList().length > 0) {
          <div class="audit-section">
            <div class="audit-header">
              <div class="audit-icon"><i class="pi pi-history"></i></div>
              <div>
                <h3>Últimos Cambios en Empleados</h3>
                <p>Registro de auditoría — últimas 50 modificaciones</p>
              </div>
            </div>
            <div class="audit-table-wrap">
              <table class="audit-table">
                <thead>
                  <tr>
                    <th style="width:18%">Fecha</th>
                    <th style="width:20%">Empleado</th>
                    <th style="width:12%">Acción</th>
                    <th style="width:15%">Campo</th>
                    <th style="width:15%">Anterior</th>
                    <th style="width:15%">Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of auditLogList(); track log.id) {
                    <tr>
                      <td>{{ log.changed_at | date:'dd/MM/yy HH:mm' }}</td>
                      <td class="emp-name">{{ log.employee?.first_name }} {{ log.employee?.father_name }}</td>
                      <td>
                        <span class="action-badge" [class.insert]="log.action === 'INSERT'" [class.update]="log.action === 'UPDATE'" [class.delete]="log.action === 'DELETE'">
                          {{ log.action }}
                        </span>
                      </td>
                      <td class="field-name">{{ getFieldLabel(log.field_name) }}</td>
                      <td class="old-val">{{ log.old_value || '—' }}</td>
                      <td class="new-val">{{ log.new_value || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    }

    <!-- ===== MOBILE VERSION ===== -->
    @if (!device.isDesktop()) {
      <div class="mobile-section">
        <div class="mobile-header">
          <i class="pi pi-users"></i>
          <span>Gestión de Personal</span>
        </div>

        <div class="mobile-cards">
          <div class="m-card green">
            <span class="m-value">{{ state.newEmployeesThisMonth() }}</span>
            <span class="m-label">Nuevos</span>
          </div>
          <div class="m-card yellow">
            <span class="m-value">{{ state.retentionRate() }}%</span>
            <span class="m-label">Retención</span>
          </div>
        </div>

        <div class="mobile-group">
          <span class="group-title">Contrataciones</span>
          <div class="stat-row">
            <span>Tasa de Crecimiento</span>
            <span class="value green">{{ state.growthRate() }}%</span>
          </div>
          <div class="stat-row">
            <span>En Período de Prueba</span>
            <span class="value">{{ state.probatoryEmployees() }}</span>
          </div>
          <div class="stat-row">
            <span>Tasa de Contratación</span>
            <span class="value green">{{ state.monthlyHiringRate() }}%</span>
          </div>
        </div>

        <div class="mobile-group">
          <span class="group-title">Rotación</span>
          <div class="stat-row">
            <span>Rotación Mensual</span>
            <span class="value red">{{ state.monthlyTurnover() }}%</span>
          </div>
          <div class="stat-row">
            <span>Rotación Anual</span>
            <span class="value orange">{{ state.annualTurnover() }}%</span>
          </div>
          <div class="stat-row">
            <span>Ausentismo</span>
            <span class="value red">{{ state.monthlyAbsenteeism().percentage }}%</span>
          </div>
        </div>

        <div class="mobile-group">
          <span class="group-title">Antigüedad</span>
          <div class="stat-row">
            <span>Antigüedad Promedio</span>
            <span class="value">{{ state.averageTenure() }} años</span>
          </div>
          <div class="stat-row">
            <span>Edad Promedio</span>
            <span class="value">{{ state.averageAge() }} años</span>
          </div>
          <div class="stat-row">
            <span>Aniversarios Próximos</span>
            <span class="value">{{ state.upcomingAnniversaries().length }}</span>
          </div>
          <div class="stat-row">
            <span>Mujeres en Licencia</span>
            <span class="value">{{ state.womenOnLeave() }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ===== PC STYLES ===== */
    .pc-management {
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
      background: rgba(59, 130, 246, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      i { font-size: 1.25rem; color: #3b82f6; }
    }

    .header-text {
      h2 { font-size: 1.25rem; font-weight: 600; color: #fff; margin: 0; }
      p { font-size: 0.8rem; color: #71717a; margin: 0.25rem 0 0; }
    }

    .management-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .mgmt-panel {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      overflow: hidden;

      &.green { border-top: 3px solid #22c55e; }
      &.red { border-top: 3px solid #ef4444; }
      &.gold { border-top: 3px solid #fbbf24; }
      &.purple { border-top: 3px solid #8b5cf6; }
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);

      i { font-size: 0.875rem; }
      span { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    }

    .mgmt-panel.green .panel-header { i, span { color: #22c55e; } }
    .mgmt-panel.red .panel-header { i, span { color: #ef4444; } }
    .mgmt-panel.gold .panel-header { i, span { color: #fbbf24; } }
    .mgmt-panel.purple .panel-header { i, span { color: #8b5cf6; } }

    .panel-cards {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .mgmt-card {
      background: rgba(24, 24, 27, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: all 0.2s ease;

      &:hover { border-color: rgba(255, 255, 255, 0.08); }

      &.highlight {
        background: rgba(251, 191, 36, 0.06);
        border-color: rgba(251, 191, 36, 0.1);
      }
    }

    .card-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      line-height: 1;

      &.gold { color: #fbbf24; }
      &.danger { color: #ef4444; }
      &.warning { color: #f59e0b; }
      &.pink { color: #ec4899; }
      &.teal { color: #14b8a6; }
    }

    .card-label {
      font-size: 0.6rem;
      font-weight: 500;
      color: #a1a1aa;
      margin-top: 0.25rem;
      text-transform: uppercase;
    }

    .card-badge {
      font-size: 0.55rem;
      padding: 0.2rem 0.5rem;
      border-radius: 10px;
      margin-top: 0.375rem;

      &.green {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.2);
      }
    }

    .card-unit {
      font-size: 0.6rem;
      color: #52525b;
      margin-top: 0.125rem;
    }

    .retention-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      margin-top: 0.5rem;
      overflow: hidden;

      .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #fbbf24, #f59e0b);
        border-radius: 3px;
        transition: width 0.4s ease;
      }
    }

    /* ===== MOBILE STYLES ===== */
    .mobile-section { padding: 0.75rem; }

    .mobile-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      i { color: #3b82f6; }
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

      &.green { border-top: 3px solid #22c55e; }
      &.yellow { border-top: 3px solid #fbbf24; }

      .m-value { font-size: 1.75rem; font-weight: 700; color: #fff; }
      .m-label { font-size: 0.65rem; color: #71717a; text-transform: uppercase; }
    }

    .mobile-group {
      background: rgba(24, 24, 27, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 0.625rem 0.75rem;
      margin-bottom: 0.5rem;
    }

    .group-title {
      font-size: 0.6rem;
      font-weight: 600;
      color: #52525b;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.25rem;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.8rem;

      &:last-child { border-bottom: none; }
      span:first-child { color: #a1a1aa; }
      .value {
        color: #fff;
        font-weight: 600;
        &.green { color: #22c55e; }
        &.red { color: #ef4444; }
        &.orange { color: #f59e0b; }
      }
    }

    /* Audit Log */
    .audit-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .audit-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;

      h3 { font-size: 1rem; font-weight: 600; color: #fff; margin: 0; }
      p { font-size: 0.75rem; color: #71717a; margin: 0.125rem 0 0; }
    }

    .audit-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(168, 85, 247, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;

      i { color: #a855f7; font-size: 1rem; }
    }

    .audit-table-wrap {
      background: rgba(24, 24, 27, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      overflow-x: auto;
      max-height: 350px;
      overflow-y: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.75rem;
      table-layout: fixed;

      th, td {
        padding: 0.5rem 0.625rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      th {
        text-align: left;
        font-size: 0.6rem;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        position: sticky;
        top: 0;
        background: #18181b;
      }

      td {
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        color: #a1a1aa;
      }

      tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
    }

    .emp-name { color: #fff; font-weight: 500; }
    .field-name { color: #a855f7; }
    .old-val { color: #f87171; }
    .new-val { color: #34d399; }

    .action-badge {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      text-transform: uppercase;

      &.insert { background: rgba(52, 211, 153, 0.15); color: #34d399; }
      &.update { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
      &.delete { background: rgba(248, 113, 113, 0.15); color: #f87171; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementSectionComponent {
  state = inject(DashboardStore);
  device = inject(DeviceService);
  homeData = inject(HomeDataService);

  auditLogList = computed(() =>
    (this.homeData.employeeAuditLog.value() ?? []) as EmployeeAuditLog[]
  );

  private readonly FIELD_LABELS: Record<string, string> = {
    first_name: 'Nombre',
    father_name: 'Apellido',
    middle_name: '2do Nombre',
    mother_name: '2do Apellido',
    document_id: 'Cédula',
    is_active: 'Activo',
    branch_id: 'Sucursal',
    department_id: 'Departamento',
    position_id: 'Posición',
    monthly_salary: 'Salario',
    hourly_salary: 'Salario/Hora',
    email: 'Email',
    work_email: 'Email Trabajo',
    phone_number: 'Teléfono',
    gender: 'Género',
    birth_date: 'Nacimiento',
    start_date: 'Inicio',
    address: 'Dirección',
    emergency_contact_name: 'Contacto Emerg.',
    emergency_contact_phone: 'Tel. Emerg.',
  };

  getFieldLabel(field: string | null): string {
    if (!field) return '—';
    return this.FIELD_LABELS[field] || field;
  }
}
