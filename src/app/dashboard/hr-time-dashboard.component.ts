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
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white m-0">Tiempo</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Gestión de tiempo y asistencia de trabajadores
          </p>
        </div>
      </div>

      <!-- Tarjetas de Acciones -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Registrar eventualidad -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-file-edit text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">
              Registrar eventualidad
            </h3>
            <p class="text-sm text-gray-400 mb-4">
              Ingrese las salidas laborales de sus trabajadores.
            </p>
            <p-button
              label="Registrar"
              icon="pi pi-plus"
              (onClick)="navigateToEventuality()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Conectar dispositivo -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-mobile text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">
              Conectar dispositivo
            </h3>
            <p class="text-sm text-gray-400 mb-4">
              Ingrese el código de cinco dígitos que aparece en la app.
            </p>
            <p-button
              label="Conectar"
              icon="pi pi-at"
              (onClick)="navigateToConnectDevice()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Incidencias -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-file-check text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Incidencias</h3>
            <p class="text-sm text-gray-400 mb-4">
              Aprobar o rechazar incidencias de sus trabajadores.
            </p>
            <p-button
              label="Ver"
              icon="pi pi-eye"
              (onClick)="navigateToIncidents()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Asistencia -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-users text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Asistencia</h3>
            <p class="text-sm text-gray-400 mb-4">
              Vea el tablero de marcaciones de sus trabajadores en tiempo real.
            </p>
            <p-button
              label="Ver"
              icon="pi pi-eye"
              (onClick)="navigateToAttendance()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Inactivar trabajador -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-user-minus text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">
              Inactivar trabajador
            </h3>
            <p class="text-sm text-gray-400 mb-4">
              Inactive trabajadores que ya no están en su organización.
            </p>
            <p-button
              label="Inactivar"
              icon="pi pi-ban"
              (onClick)="navigateToDeactivate()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Reportes -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-chart-line text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Reportes</h3>
            <p class="text-sm text-gray-400 mb-4">
              Consulte reportes de incidencias y saldos de sus trabajadores.
            </p>
            <p-button
              label="Ver"
              icon="pi pi-eye"
              (onClick)="navigateToReports()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Saldos laborales -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-wallet text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">
              Saldos laborales
            </h3>
            <p class="text-sm text-gray-400 mb-4">
              Vea los saldos de horas y días a favor de sus trabajadores.
            </p>
            <p-button
              label="Ver"
              icon="pi pi-eye"
              (onClick)="navigateToBalances()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>

        <!-- Preparar interfaz -->
        <p-card class="action-card">
          <div class="flex flex-col items-center text-center p-4">
            <div class="mb-4">
              <i class="pi pi-cog text-4xl text-blue-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">
              Preparar interfaz
            </h3>
            <p class="text-sm text-gray-400 mb-4">
              Revise incidencias y prepare su data para pagar su nómina.
            </p>
            <p-button
              label="Ver"
              icon="pi pi-eye"
              (onClick)="navigateToPrepare()"
              class="w-full yellow-button"
            />
          </div>
        </p-card>
      </div>

      <!-- Paneles Inferiores -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Panel de Solicitudes -->
        <p-card class="requests-panel">
          <ng-template #header>
            <div class="flex items-center justify-between w-full">
              <h3 class="text-lg font-semibold text-white m-0">
                Solicitudes
              </h3>
              <p-button
                label="Abrir"
                (onClick)="navigateToRequests()"
                class="yellow-button-small"
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
              <div class="flex items-start gap-3">
                <div
                  class="w-2 h-2 rounded-full mt-2"
                  [class.bg-purple-500]="true"
                ></div>
                <div class="flex-1">
                  <div class="text-sm font-medium text-white">
                    {{ request.employee_name }}
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    {{ request.type }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
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
            <div class="flex items-center justify-between w-full">
              <h3 class="text-lg font-semibold text-white m-0">Métricas</h3>
              <div class="flex items-center gap-2 text-xs">
                <div class="flex items-center gap-1">
                  <div class="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span class="text-gray-400">Ciclo previo</span>
                </div>
                <div class="flex items-center gap-1">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <span class="text-gray-400">Ciclo actual</span>
                </div>
              </div>
            </div>
          </ng-template>
          <div class="metrics-chart">
            @if (chartData()) {
            <canvas
              baseChart
              type="bar"
              [data]="chartData()!"
              [options]="chartOptions"
              [style]="{ height: '300px' }"
            ></canvas>
            } @else {
            <div class="flex items-center justify-center h-[300px]">
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-400 mb-2">
                  Coming soon!
                </div>
                <div class="text-sm text-gray-500">
                  Las métricas estarán disponibles próximamente
                </div>
              </div>
            </div>
            }
          </div>
        </p-card>

        <!-- Panel de Métrica de Trabajadores -->
        <p-card class="employee-metrics-panel">
          <ng-template #header>
            <div class="flex items-center justify-between w-full">
              <h3 class="text-lg font-semibold text-white m-0">
                Métrica de Trabajadores
              </h3>
              <button
                class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
                (click)="refreshEmployeeMetrics()"
              >
                <i class="pi pi-refresh text-xs text-white"></i>
              </button>
            </div>
          </ng-template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-2">
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
                <div class="flex items-center gap-3">
                  <i [class]="'pi ' + metric.icon + ' text-blue-500'"></i>
                  <span class="text-sm text-gray-300 flex-1">
                    {{ metric.name }}
                  </span>
                  <span
                    class="text-sm font-medium"
                    [class.text-red-500]="metric.status === 'bad'"
                    [class.text-green-500]="metric.status === 'good'"
                    [class.text-gray-500]="metric.status === 'neutral'"
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
    ::ng-deep .action-card {
      background: #1f2937 !important;
      border: 1px solid #374151 !important;
      transition: all 0.2s ease;
    }

    ::ng-deep .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      border-color: #fbbf24 !important;
    }

    /* Botones amarillos */
    ::ng-deep .yellow-button {
      background: #fbbf24 !important;
      border-color: #fbbf24 !important;
      color: #000000 !important;
      font-weight: 600 !important;
    }

    ::ng-deep .yellow-button:hover {
      background: #f59e0b !important;
      border-color: #f59e0b !important;
      color: #000000 !important;
    }

    ::ng-deep .yellow-button-small {
      background: #fbbf24 !important;
      border-color: #fbbf24 !important;
      color: #000000 !important;
      font-weight: 600 !important;
      padding: 0.5rem 1rem !important;
      font-size: 0.875rem !important;
    }

    ::ng-deep .yellow-button-small:hover {
      background: #f59e0b !important;
      border-color: #f59e0b !important;
      color: #000000 !important;
    }

    ::ng-deep .requests-panel,
    ::ng-deep .metrics-panel,
    ::ng-deep .employee-metrics-panel {
      background: #1f2937 !important;
      border: 1px solid #374151 !important;
    }

    .requests-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .request-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #374151;
    }

    .request-item:last-child {
      border-bottom: none;
    }

    .metrics-chart {
      min-height: 300px;
    }

    .employee-metrics-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .metric-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #374151;
    }

    .metric-item:last-child {
      border-bottom: none;
    }

    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem !important;
    }

    ::ng-deep .p-card .p-card-header {
      background: transparent !important;
      border-bottom: 1px solid #374151 !important;
      padding: 1rem 1.5rem !important;
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
  public chartOptions: any = {
    indexAxis: 'x' as const, // Barras verticales (por defecto)
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
          color: '#9ca3af',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#374151',
          display: true,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11,
          },
          stepSize: 20,
        },
        grid: {
          color: '#374151',
          display: true,
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
    // Datos de ejemplo basados en la imagen - gráfico vertical
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

