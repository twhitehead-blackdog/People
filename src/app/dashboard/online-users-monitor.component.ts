import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import { differenceInMinutes, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Button } from 'primeng/button';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

interface UserWithActivity {
  id: string;
  first_name: string;
  father_name: string;
  work_email: string;
  position_name: string;
  branch_name: string;
  last_activity: Date | null;
  minutes_ago: number;
}

@Component({
  selector: 'pt-online-users-monitor',
  standalone: true,
  imports: [
    Card,
    Skeleton,
    TableModule,
    Tag,
    ToastModule,
    Button,
  ],
  template: `
    <div class="mx-4 md:mx-6 flex flex-col gap-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">
            <i class="pi pi-circle-fill mr-2 text-green-400"></i>
            Usuarios en Línea
          </h1>
          <p class="text-sm text-gray-400 mt-1">
            Monitorea qué usuarios están actualmente activos en el sistema
          </p>
        </div>
          <p-button
          label="Actualizar"
          icon="pi pi-refresh"
          [loading]="employeesApi.isLoading() || timelogsApi.isLoading()"
          (click)="refreshUsers()"
        />
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Total en Línea</div>
              <div class="text-2xl font-bold text-green-400">
                {{ onlineUsers().length }}
              </div>
            </div>
            <i class="pi pi-circle-fill text-3xl text-green-400"></i>
          </div>
        </p-card>
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Inactivos</div>
              <div class="text-2xl font-bold text-yellow-400">
                {{ inactiveUsers().length }}
              </div>
            </div>
            <i class="pi pi-clock text-3xl text-yellow-400"></i>
          </div>
        </p-card>
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Total Usuarios</div>
              <div class="text-2xl font-bold text-white">
                {{ allUsers().length }}
              </div>
            </div>
            <i class="pi pi-users text-3xl text-blue-400"></i>
          </div>
        </p-card>
      </div>

      <!-- Tabla de usuarios -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <span>Actividad de Usuarios</span>
            <span class="text-sm text-gray-400">
              Última actualización: {{ lastUpdateTime() }}
            </span>
          </div>
        </ng-template>

        @if(employeesApi.isLoading() || timelogsApi.isLoading()) {
        <div class="space-y-2">
          @for(item of [1,2,3,4,5]; track item) {
          <p-skeleton height="60px" />
          }
        </div>
        } @else if(employeesApi.error() || timelogsApi.error()) {
        <div class="text-center py-8">
          <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
          <p class="text-red-400">Error al cargar usuarios</p>
        </div>
        } @else {
        <p-table
          [value]="allUsers()"
          [paginator]="true"
          [rows]="20"
          [rowsPerPageOptions]="[10, 20, 50, 100]"
          [globalFilterFields]="['first_name', 'father_name', 'work_email', 'position_name', 'branch_name']"
          styleClass="p-datatable-sm"
          [tableStyle]="{ 'min-width': '50rem' }"
        >
          <ng-template #header>
            <tr>
              <th>Empleado</th>
              <th>Email</th>
              <th>Posición</th>
              <th>Sucursal</th>
              <th>Última Actividad</th>
              <th>Estado</th>
            </tr>
          </ng-template>
          <ng-template #body let-user>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <div class="flex flex-col">
                    <span class="font-semibold text-white">
                      {{ user.first_name }} {{ user.father_name }}
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span class="text-gray-300">{{ user.work_email }}</span>
              </td>
              <td>
                <span class="text-gray-300">{{ user.position_name || 'N/A' }}</span>
              </td>
              <td>
                <span class="text-gray-300">{{ user.branch_name || 'N/A' }}</span>
              </td>
              <td>
                <span class="text-gray-300" [title]="formatFullDate(user.last_activity)">
                  {{ formatTimeAgo(user.last_activity) }}
                </span>
              </td>
              <td>
                <p-tag
                  [value]="user.minutes_ago <= ONLINE_THRESHOLD_MINUTES ? 'En Línea' : 'Inactivo'"
                  [severity]="user.minutes_ago <= ONLINE_THRESHOLD_MINUTES ? 'success' : 'warn'"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="text-center py-8">
                <p class="text-gray-400">No se encontraron usuarios</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </p-card>

      <!-- Información -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-info-circle text-blue-400"></i>
            <span>Información</span>
          </div>
        </ng-template>
        <div class="text-sm text-gray-300">
          <p class="mb-2">
            Los usuarios se consideran "En Línea" si han tenido actividad en los últimos
            <strong>{{ ONLINE_THRESHOLD_MINUTES }} minutos</strong>.
          </p>
          <p>
            La última actividad se calcula basándose en los registros de marcación (timelogs)
            del sistema. La lista se actualiza automáticamente cada 30 segundos.
          </p>
        </div>
      </p-card>
    </div>

    <p-toast />
  `,
  styles: `
    :host {
      display: block;
    }

    ::ng-deep .p-card {
      background: rgb(38 38 38 / 0.5);
      border: 1px solid rgba(107, 114, 128, 0.3);
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: rgba(107, 114, 128, 0.2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineUsersMonitorComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private refreshInterval?: number;

  // Constante para el umbral de tiempo en línea
  public readonly ONLINE_THRESHOLD_MINUTES = 15;

  public isNaz = computed(() => this.organizationService.isNaz());
  public lastUpdateTime = signal<string>('');

  // API para obtener empleados
  public employeesApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const positionSelect = `position:positions(id, name)`;
    const branchSelect = `branch:branches(id, name)`;
    const params: any = {
      select: `id,first_name,father_name,work_email,${positionSelect},${branchSelect}`,
      is_active: 'eq.true',
    };

    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${this.apiUrl.baseUrl}/rest/v1/employees`,
      method: 'GET',
      params,
    };
  });

  // API para obtener últimos timelogs
  public timelogsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: 'employee_id,created_at',
      order: 'created_at.desc',
      limit: '1000',
    };

    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${this.apiUrl.baseUrl}/rest/v1/timelogs`,
      method: 'GET',
      params,
    };
  });

  // Computed para mapear última actividad por empleado
  public lastActivityMap = computed(() => {
    const timelogs = this.timelogsApi.value() || [];
    const activityMap = new Map<string, Date>();

    timelogs.forEach((log: any) => {
      if (!log.employee_id || !log.created_at) return;

      const employeeId = log.employee_id;
      const logDate = new Date(log.created_at);

      if (!isValid(logDate)) return;

      const existing = activityMap.get(employeeId);
      if (!existing || logDate > existing) {
        activityMap.set(employeeId, logDate);
      }
    });

    return activityMap;
  });

  // Computed para todos los usuarios con actividad
  public allUsers = computed(() => {
    const employees = this.employeesApi.value() || [];
    const activityMap = this.lastActivityMap();
    const now = new Date();

    return employees.map((emp: any) => {
      const lastActivity = activityMap.get(emp.id) || null;
      const minutesAgo = lastActivity
        ? differenceInMinutes(now, lastActivity)
        : 999999; // Usuarios sin actividad tienen un valor muy alto
      
      return {
        id: emp.id,
        first_name: emp.first_name || '',
        father_name: emp.father_name || '',
        work_email: emp.work_email || '',
        position_name: emp.position?.name || 'N/A',
        branch_name: emp.branch?.name || 'N/A',
        last_activity: lastActivity,
        minutes_ago: minutesAgo,
      } as UserWithActivity;
    }).sort((a, b) => {
      // Ordenar: primero los que tienen actividad (más reciente primero), luego los sin actividad
      if (a.last_activity && b.last_activity) {
        return a.minutes_ago - b.minutes_ago;
      }
      if (a.last_activity && !b.last_activity) return -1;
      if (!a.last_activity && b.last_activity) return 1;
      return 0;
    });
  });

  // Computed para usuarios en línea
  public onlineUsers = computed(() => {
    const users = this.allUsers();
    return users.filter(u => u.last_activity && u.minutes_ago <= this.ONLINE_THRESHOLD_MINUTES);
  });

  // Computed para usuarios inactivos
  public inactiveUsers = computed(() => {
    const users = this.allUsers();
    return users.filter(u => !u.last_activity || u.minutes_ago > this.ONLINE_THRESHOLD_MINUTES);
  });

  constructor() {
    // Efecto para actualizar el tiempo de última actualización
    effect(() => {
      if (this.employeesApi.value() && this.timelogsApi.value()) {
        this.lastUpdateTime.set(new Date().toLocaleTimeString('es-ES'));
      }
    });
  }

  ngOnInit() {
    // Cargar inicialmente
    this.refreshUsers();
    
    // Configurar actualización automática cada 30 segundos
    this.refreshInterval = window.setInterval(() => {
      this.refreshUsers();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  refreshUsers() {
    this.employeesApi.reload();
    this.timelogsApi.reload();
  }

  formatTimeAgo(date: Date | null): string {
    if (!date) return 'Nunca';
    try {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: es,
      });
    } catch (e) {
      return 'N/A';
    }
  }

  formatFullDate(date: Date | null): string {
    if (!date) return 'N/A';
    try {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return 'N/A';
    }
  }
}
