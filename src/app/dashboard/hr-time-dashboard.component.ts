import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BaseChartDirective } from 'ng2-charts';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../services/organization.service';

interface Request {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string;
  duration: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Metric {
  name: string;
  icon: string;
  value: string;
  status: 'good' | 'bad' | 'neutral';
}

@Component({
  selector: 'pt-hr-time-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    BaseChartDirective,
    DropdownModule,
    FormsModule,
  ],
  template: `
    <div class="hr-time-dashboard-container">
      <!-- Tarjetas de Acciones -->
      <div class="action-cards-grid">

      <!-- Tarjetas de Acciones -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Registrar eventualidad -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-file-edit"></i>
            </div>
            <h3 class="action-card-title">
              Registrar eventualidad
            </h3>
            <p class="action-card-description">
              Ingrese las salidas laborales de sus trabajadores.
            </p>
            <p-button
              label="Registrar"
              (onClick)="navigateToEventuality()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Conectar dispositivo -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-mobile"></i>
            </div>
            <h3 class="action-card-title">
              Conectar dispositivo
            </h3>
            <p class="action-card-description">
              Ingrese el código de cinco dígitos que aparece en la app.
            </p>
            <p-button
              label="Conectar"
              (onClick)="navigateToConnectDevice()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Incidencias -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-file-check"></i>
            </div>
            <h3 class="action-card-title">Incidencias</h3>
            <p class="action-card-description">
              Aprobar o rechazar incidencias de sus trabajadores.
            </p>
            <p-button
              label="Ver"
              (onClick)="navigateToIncidents()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Asistencia -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-users"></i>
            </div>
            <h3 class="action-card-title">Asistencia</h3>
            <p class="action-card-description">
              Vea el tablero de marcaciones de sus trabajadores en tiempo real.
            </p>
            <p-button
              label="Ver"
              (onClick)="navigateToAttendance()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Inactivar trabajador -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-user-minus"></i>
            </div>
            <h3 class="action-card-title">
              Inactivar trabajador
            </h3>
            <p class="action-card-description">
              Inactive trabajadores que ya no están en su organización.
            </p>
            <p-button
              label="Inactivar"
              (onClick)="navigateToDeactivate()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Reportes -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-chart-line"></i>
            </div>
            <h3 class="action-card-title">Reportes</h3>
            <p class="action-card-description">
              Consulte reportes de incidencias y saldos de sus trabajadores.
            </p>
            <p-button
              label="Ver"
              (onClick)="navigateToReports()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Saldos laborales -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-wallet"></i>
            </div>
            <h3 class="action-card-title">
              Saldos laborales
            </h3>
            <p class="action-card-description">
              Vea los saldos de horas y días a favor de sus trabajadores.
            </p>
            <p-button
              label="Ver"
              (onClick)="navigateToBalances()"
              class="action-card-button"
            />
          </div>
        </p-card>

        <!-- Preparar interfaz -->
        <p-card class="action-card">
          <div class="action-card-content">
            <div class="action-card-icon">
              <i class="pi pi-cog"></i>
            </div>
            <h3 class="action-card-title">
              Preparar interfaz
            </h3>
            <p class="action-card-description">
              Revise incidencias y prepare su data para pagar su nómina.
            </p>
            <p-button
              label="Ver"
              (onClick)="navigateToPrepare()"
              class="action-card-button"
            />
          </div>
        </p-card>
      </div>

      <!-- Paneles Inferiores -->
      <div class="bottom-panels-grid">
        <!-- Panel de Solicitudes -->
        <p-card class="requests-panel">
          <ng-template #header>
            <div class="panel-header">
              <h3 class="panel-title">
                Solicitudes
              </h3>
              <p-button
                label="Abrir"
                (onClick)="navigateToRequests()"
                class="panel-open-button"
              />
            </div>
          </ng-template>
          <div class="requests-list">
            @if (requestsApi.isLoading()) {
            <div class="text-center py-4 text-gray-400">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            } @else if (requests().length === 0) {
            <div class="text-center py-4 text-gray-400">
              No hay solicitudes pendientes
            </div>
            } @else {
            @for (request of requests(); track request.id) {
            <div class="request-item">
              <div class="request-item-content">
                <div class="request-dot"></div>
                <div class="request-info">
                  <div class="request-employee-name">
                    {{ request.employee_name }}
                  </div>
                  <div class="request-type">
                    {{ request.type }}
                  </div>
                  <div class="request-dates">
                    {{ request.duration }} - {{ request.start_date }} a
                    {{ request.end_date }}
                  </div>
                </div>
              </div>
            </div>
            }
            }
          </div>
        </p-card>

        <!-- Panel de Métricas -->
        <p-card class="metrics-panel">
          <ng-template #header>
            <div class="panel-header">
              <h3 class="panel-title">Métricas</h3>
              <div class="metrics-legend">
                <div class="legend-item">
                  <div class="legend-dot legend-dot-gray"></div>
                  <span class="legend-label">Ciclo previo</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot legend-dot-red"></div>
                  <span class="legend-label">Ciclo actual</span>
                </div>
              </div>
            </div>
          </ng-template>
          <div class="metrics-chart">
            @if (chartData()) {
            <div class="chart-wrapper">
              <canvas
                baseChart
                type="bar"
                [data]="chartData()!"
                [options]="chartOptions"
              ></canvas>
              <div class="coming-soon-overlay">
                <div class="coming-soon-text">Coming soon!</div>
              </div>
            </div>
            } @else {
            <div class="coming-soon-container">
              <div class="coming-soon-text">Coming soon!</div>
            </div>
            }
          </div>
        </p-card>

        <!-- Panel de Métrica de Trabajadores -->
        <p-card class="employee-metrics-panel">
          <ng-template #header>
            <div class="panel-header">
              <h3 class="panel-title">
                Métrica de Trabajadores
              </h3>
              <button
                class="refresh-button"
                (click)="refreshEmployeeMetrics()"
              >
                <i class="pi pi-refresh"></i>
              </button>
            </div>
          </ng-template>
          <div class="employee-metrics-content">
            <div class="employee-metrics-filters">
              <p-dropdown
                [options]="employeeOptions()"
                [(ngModel)]="selectedEmployee"
                placeholder="Trabajadores"
                class="w-full"
              />
              <p-dropdown
                [options]="periodOptions"
                [(ngModel)]="selectedPeriod"
                placeholder="Últimos 7 días"
                class="w-full"
              />
            </div>
            <div class="employee-metrics-list">
              @for (metric of employeeMetrics(); track metric.name) {
              <div class="metric-item">
                <div class="metric-item-content">
                  <i [class]="'pi ' + metric.icon + ' metric-icon'"></i>
                  <span class="metric-name">
                    {{ metric.name }}
                  </span>
                  <span
                    class="metric-value"
                    [class.metric-value-bad]="metric.status === 'bad'"
                    [class.metric-value-good]="metric.status === 'good'"
                    [class.metric-value-neutral]="metric.status === 'neutral'"
                  >
                    {{ metric.value }}
                  </span>
                </div>
              </div>
              }
            </div>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: `
    /* Contenedor principal con fondo azul claro */
    .hr-time-dashboard-container {
      background: #E3F2FD;
      min-height: 100vh;
      padding: 2rem;
    }

    /* Grid de tarjetas de acciones */
    .action-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1024px) {
      .action-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .action-cards-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Tarjetas de acciones - fondo blanco */
    ::ng-deep .action-card {
      background: #ffffff !important;
      border: 1px solid #e0e0e0 !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      transition: all 0.2s ease;
    }

    ::ng-deep .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
    }

    .action-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
    }

    .action-card-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .action-card-icon i {
      font-size: 3rem;
      color: #2196F3;
    }

    .action-card-title {
      font-size: 1rem;
      font-weight: 600;
      color: #212121;
      margin: 0 0 0.5rem 0;
    }

    .action-card-description {
      font-size: 0.875rem;
      color: #757575;
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }

    ::ng-deep .action-card-button {
      width: 100%;
      background: #2196F3 !important;
      border-color: #2196F3 !important;
      color: #ffffff !important;
    }

    ::ng-deep .action-card-button:hover {
      background: #1976D2 !important;
      border-color: #1976D2 !important;
    }

    /* Grid de paneles inferiores */
    .bottom-panels-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .bottom-panels-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Paneles - fondo blanco */
    ::ng-deep .requests-panel,
    ::ng-deep .metrics-panel,
    ::ng-deep .employee-metrics-panel {
      background: #ffffff !important;
      border: 1px solid #e0e0e0 !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .panel-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #212121;
      margin: 0;
    }

    ::ng-deep .panel-open-button {
      background: #2196F3 !important;
      border-color: #2196F3 !important;
      color: #ffffff !important;
      padding: 0.5rem 1rem !important;
      font-size: 0.875rem !important;
    }

    ::ng-deep .panel-open-button:hover {
      background: #1976D2 !important;
      border-color: #1976D2 !important;
    }

    /* Panel de Solicitudes */
    .requests-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .request-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .request-item:last-child {
      border-bottom: none;
    }

    .request-item-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .request-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9C27B0;
      margin-top: 0.5rem;
      flex-shrink: 0;
    }

    .request-info {
      flex: 1;
    }

    .request-employee-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #212121;
    }

    .request-type {
      font-size: 0.75rem;
      color: #757575;
      margin-top: 0.25rem;
    }

    .request-dates {
      font-size: 0.75rem;
      color: #9e9e9e;
      margin-top: 0.25rem;
    }

    /* Panel de Métricas */
    .metrics-legend {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.75rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-dot-gray {
      background: #9e9e9e;
    }

    .legend-dot-red {
      background: #f44336;
    }

    .legend-label {
      color: #757575;
    }

    .metrics-chart {
      min-height: 300px;
      position: relative;
    }

    .chart-wrapper {
      position: relative;
      height: 300px;
    }

    .coming-soon-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .coming-soon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
    }

    .coming-soon-text {
      font-size: 1.5rem;
      font-weight: bold;
      color: #9e9e9e;
    }

    /* Panel de Métrica de Trabajadores */
    .refresh-button {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #2196F3;
      border: none;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .refresh-button:hover {
      background: #1976D2;
    }

    .refresh-button i {
      font-size: 0.75rem;
    }

    .employee-metrics-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .employee-metrics-filters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .employee-metrics-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .metric-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .metric-item:last-child {
      border-bottom: none;
    }

    .metric-item-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .metric-icon {
      font-size: 1rem;
      color: #2196F3;
      width: 20px;
    }

    .metric-name {
      font-size: 0.875rem;
      color: #424242;
      flex: 1;
    }

    .metric-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .metric-value-bad {
      color: #f44336;
    }

    .metric-value-good {
      color: #4caf50;
    }

    .metric-value-neutral {
      color: #9e9e9e;
    }

    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem !important;
    }

    ::ng-deep .p-card .p-card-header {
      background: #ffffff !important;
      border-bottom: 1px solid #e0e0e0 !important;
      padding: 1rem 1.5rem !important;
    }

    /* Ajustes para dropdowns */
    ::ng-deep .p-dropdown {
      width: 100%;
    }

    ::ng-deep .p-dropdown .p-dropdown-label {
      color: #212121;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HRTimeDashboardComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private organizationService = inject(OrganizationService);

  // API para obtener solicitudes
  public requestsApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
    method: 'GET',
    params: {
      select: '*,employee:employees(id,first_name,father_name),type:timeoff_types(name)',
      is_approved: 'eq.false',
      order: 'created_at.desc',
      limit: '10',
    },
  }));

  // Solicitudes procesadas
  public requests = computed(() => {
    const data = this.requestsApi.value() || [];
    return data.map((req: any) => ({
      id: req.id,
      employee_id: req.employee_id,
      employee_name: req.employee
        ? `${req.employee.first_name} ${req.employee.father_name}`
        : 'Empleado desconocido',
      type: req.type?.name || 'Licencia',
      duration: this.calculateDuration(req.date_from, req.date_to),
      start_date: this.formatDate(req.date_from),
      end_date: this.formatDate(req.date_to),
      status: req.is_approved ? 'approved' : 'pending',
    }));
  });

  // Datos del gráfico
  public chartData = signal<any>(null);
  public chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#757575',
          font: {
            size: 12,
          },
        },
        grid: {
          color: '#e0e0e0',
        },
      },
      y: {
        ticks: {
          color: '#757575',
          font: {
            size: 12,
          },
        },
        grid: {
          color: '#e0e0e0',
        },
      },
    },
  };

  // Métricas de trabajadores
  public selectedEmployee = signal<string | null>(null);
  public selectedPeriod = signal<string>('7');
  public employeeOptions = signal<any[]>([]);
  public periodOptions = [
    { label: 'Últimos 7 días', value: '7' },
    { label: 'Últimos 30 días', value: '30' },
    { label: 'Últimos 90 días', value: '90' },
  ];

  public employeeMetrics = signal<Metric[]>([
    {
      name: 'Identificación',
      icon: 'pi-users',
      value: '----',
      status: 'neutral',
    },
    {
      name: 'Saldo de Vacaciones',
      icon: 'pi-calendar-plus',
      value: '----',
      status: 'neutral',
    },
    {
      name: 'Saldo de Incapacidades',
      icon: 'pi-calendar-minus',
      value: '----',
      status: 'neutral',
    },
    {
      name: 'Ausencia Injustificada',
      icon: 'pi-user-minus',
      value: '-',
      status: 'bad',
    },
    {
      name: 'Ausencia Justificada',
      icon: 'pi-user-check',
      value: '-',
      status: 'good',
    },
    {
      name: 'Tardanzas',
      icon: 'pi-clock',
      value: '-',
      status: 'bad',
    },
    {
      name: 'Almuerzos extendidos',
      icon: 'pi-clock',
      value: '-',
      status: 'bad',
    },
    {
      name: 'Retiros Temprano',
      icon: 'pi-arrow-left',
      value: '----',
      status: 'neutral',
    },
    {
      name: 'Sobretiempo',
      icon: 'pi-clock',
      value: '----',
      status: 'neutral',
    },
  ]);

  constructor() {
    this.initializeChart();
  }

  private initializeChart(): void {
    // Datos de ejemplo basados en la imagen
    this.chartData.set({
      labels: [
        'Ausencias',
        'Tardanzas',
        'Almuerzos extendidos',
        'Retiros',
        'Sobretiempo',
      ],
      datasets: [
        {
          label: 'Ciclo previo',
          data: [63, 107, 0, 0, 81],
          backgroundColor: '#6b7280',
        },
        {
          label: 'Ciclo actual',
          data: [121, 0, 0, 0, 98],
          backgroundColor: '#ef4444',
        },
      ],
    });
  }


  private calculateDuration(start: string | Date, end: string | Date): string {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const months = Math.floor(diffDays / 30);
    if (months > 0) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
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
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  public refreshEmployeeMetrics(): void {
    // TODO: Implementar lógica para refrescar métricas
    console.log('Refrescando métricas de trabajadores');
  }

  // Navegación
  public navigateToEventuality(): void {
    // TODO: Implementar navegación
    console.log('Navegar a registrar eventualidad');
  }

  public navigateToConnectDevice(): void {
    // TODO: Implementar navegación
    console.log('Navegar a conectar dispositivo');
  }

  public navigateToIncidents(): void {
    // TODO: Implementar navegación
    console.log('Navegar a incidencias');
  }

  public navigateToAttendance(): void {
    this.router.navigate(['/dashboard/time-management/timetables']);
  }

  public navigateToDeactivate(): void {
    this.router.navigate(['/dashboard/admin/employees']);
  }

  public navigateToReports(): void {
    // TODO: Implementar navegación
    console.log('Navegar a reportes');
  }

  public navigateToBalances(): void {
    // TODO: Implementar navegación
    console.log('Navegar a saldos laborales');
  }

  public navigateToPrepare(): void {
    // TODO: Implementar navegación
    console.log('Navegar a preparar interfaz');
  }

  public navigateToRequests(): void {
    // TODO: Implementar navegación
    console.log('Navegar a solicitudes');
  }
}

