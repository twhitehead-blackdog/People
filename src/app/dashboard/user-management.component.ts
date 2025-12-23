import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { httpResource } from '@angular/common/http';
import {
  ConfirmationService,
  FilterService,
  MessageService,
} from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { Employee } from '../models';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';

type ApprovalStatus = 'all' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'pt-user-management',
  imports: [
    ReactiveFormsModule,
    Select,
    ToggleSwitch,
    TableModule,
    Card,
    Skeleton,
    Tag,
    FormsModule,
    Button,
    InputText,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [
    MessageService,
    ConfirmationService,
    FilterService,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="mx-4 md:mx-6 flex flex-col gap-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">
            <i class="pi pi-users mr-2"></i>
            Gestión de Usuarios
          </h1>
          <p class="text-sm text-gray-400 mt-1">
            Gestiona el acceso de usuarios al sistema
          </p>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Total Usuarios</div>
              <div class="text-2xl font-bold text-white">
                {{ totalUsers() }}
              </div>
            </div>
            <i class="pi pi-users text-3xl text-blue-400"></i>
          </div>
        </p-card>
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Pendientes</div>
              <div class="text-2xl font-bold text-yellow-400">
                {{ pendingUsers() }}
              </div>
            </div>
            <i class="pi pi-clock text-3xl text-yellow-400"></i>
          </div>
        </p-card>
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Aprobados</div>
              <div class="text-2xl font-bold text-green-400">
                {{ approvedUsers() }}
              </div>
            </div>
            <i class="pi pi-check-circle text-3xl text-green-400"></i>
          </div>
        </p-card>
        <p-card>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-400 mb-1">Con Portal</div>
              <div class="text-2xl font-bold text-purple-400">
                {{ portalUsers() }}
              </div>
            </div>
            <i class="pi pi-id-card text-3xl text-purple-400"></i>
          </div>
        </p-card>
      </div>

      <!-- Filtros -->
      <p-card>
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="flex-1 w-full sm:w-auto">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Buscar
            </label>
            <input
              pInputText
              type="text"
              placeholder="Buscar por nombre, email..."
              [(ngModel)]="searchTerm"
              class="w-full lg:w-auto flex-1 text-sm"
            />
          </div>
          <div class="w-full sm:w-48">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Estado de Aprobación
            </label>
            <p-select
              [options]="approvalStatusOptions"
              [(ngModel)]="approvalStatusFilter"
              optionLabel="label"
              optionValue="value"
              placeholder="Todos"
              class="w-full"
            />
          </div>
          <div class="w-full sm:w-48">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Acceso al Portal
            </label>
            <p-select
              [options]="portalAccessOptions"
              [(ngModel)]="portalAccessFilter"
              optionLabel="label"
              optionValue="value"
              placeholder="Todos"
              class="w-full"
            />
          </div>
        </div>
      </p-card>

      <!-- Tabla de usuarios -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <span>Usuarios del Sistema</span>
            <span class="text-sm text-gray-400">
              {{ filteredUsers().length }} de {{ totalUsers() }} usuarios
            </span>
          </div>
        </ng-template>

        @if(usersApi.isLoading()) {
        <div class="space-y-2">
          @for(item of [1,2,3,4,5]; track item) {
          <p-skeleton height="60px" />
          }
        </div>
        } @else if(usersApi.error()) {
        <div class="text-center py-8">
          <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
          <p class="text-red-400">Error al cargar usuarios</p>
        </div>
        } @else {
        <p-table
          [value]="filteredUsers()"
          [paginator]="true"
          [rows]="20"
          [rowsPerPageOptions]="[10, 20, 50, 100]"
          [globalFilterFields]="['first_name', 'father_name', 'work_email', 'email']"
          styleClass="p-datatable-sm"
          [tableStyle]="{ 'min-width': '50rem' }"
        >
          <ng-template #header>
            <tr>
              <th>Empleado</th>
              <th>Email</th>
              <th>Último Acceso</th>
              <th>Estado</th>
              <th>Acceso Portal</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-user>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="font-semibold text-white">
                    {{ user.first_name }} {{ user.father_name }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ user.position?.name || 'Sin cargo' }}
                  </span>
                </div>
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm text-gray-300">
                    {{ user.work_email || user.email || 'Sin email' }}
                  </span>
                </div>
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm" [class.text-green-400]="getLastAccess(user.id)" [class.text-gray-400]="!getLastAccess(user.id)">
                    {{ formatLastAccess(getLastAccess(user.id)) }}
                  </span>
                </div>
              </td>
              <td>
                @if(user.account_approved === true) {
                <p-tag severity="success" value="Aprobado" />
                } @else if(user.account_approved === false) {
                <p-tag severity="danger" value="Rechazado" />
                } @else {
                <p-tag severity="warn" value="Pendiente" />
                }
              </td>
              <td>
                <p-toggleSwitch
                  [(ngModel)]="user.has_portal_access"
                  (ngModelChange)="togglePortalAccess(user)"
                  [disabled]="savingUsers().has(user.id)"
                />
              </td>
              <td>
                <div class="flex gap-2">
                  @if(user.account_approved !== true) {
                  <p-button
                    icon="pi pi-check"
                    severity="success"
                    [rounded]="true"
                    [text]="true"
                    [loading]="savingUsers().has(user.id)"
                    (onClick)="approveUser(user)"
                    pTooltip="Aprobar cuenta"
                    tooltipPosition="top"
                  />
                  }
                  @if(user.account_approved !== false) {
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    [rounded]="true"
                    [text]="true"
                    [loading]="savingUsers().has(user.id)"
                    (onClick)="rejectUser(user)"
                    pTooltip="Rechazar cuenta"
                    tooltipPosition="top"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="text-center py-8">
                <i class="pi pi-inbox text-4xl text-gray-500 mb-4"></i>
                <p class="text-gray-400">No se encontraron usuarios</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </p-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private orgService = inject(OrganizationService);
  public store = inject(DashboardStore);

  public searchTerm = model<string>('');
  public approvalStatusFilter = new FormControl<ApprovalStatus>('all');
  public portalAccessFilter = new FormControl<'all' | 'yes' | 'no'>('all');
  public savingUsers = signal<Set<string>>(new Set());

  public approvalStatusOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Aprobados', value: 'approved' },
    { label: 'Rechazados', value: 'rejected' },
  ];

  public portalAccessOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Con acceso', value: 'yes' },
    { label: 'Sin acceso', value: 'no' },
  ];

  // API para obtener usuarios con último acceso
  public usersApi = httpResource<any[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    const params: any = {
      select:
        'id,first_name,father_name,work_email,email,has_portal_access,account_approved,position:positions(id,name),branch:branches(id,name),is_active',
      order: 'first_name.asc',
    };

    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
      method: 'GET',
      params,
    };
  });

  // API para obtener últimos accesos (último timelog de cada usuario)
  // Obtenemos los últimos 1000 timelogs y procesamos para obtener el más reciente de cada empleado
  public lastAccessApi = httpResource<any[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    const params: any = {
      select: 'employee_id,created_at',
      order: 'created_at.desc',
      limit: '1000', // Obtener los últimos 1000 timelogs
    };

    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`,
      method: 'GET',
      params,
    };
  });

  // Computed para mapear último acceso por empleado
  public lastAccessMap = computed(() => {
    const timelogs = this.lastAccessApi.value() || [];
    const accessMap = new Map<string, Date>();
    
    // Obtener el último timelog de cada empleado
    timelogs.forEach((log: any) => {
      if (!log.employee_id || !log.created_at) return;
      
      const employeeId = log.employee_id;
      const logDate = new Date(log.created_at);
      
      if (isNaN(logDate.getTime())) return; // Validar fecha
      
      const existing = accessMap.get(employeeId);
      if (!existing || logDate > existing) {
        accessMap.set(employeeId, logDate);
      }
    });
    
    return accessMap;
  });

  // Función para obtener último acceso de un usuario
  public getLastAccess(userId: string): Date | null {
    return this.lastAccessMap().get(userId) || null;
  }

  // Función para formatear último acceso
  public formatLastAccess(date: Date | null): string {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  // Computed para usuarios filtrados
  public filteredUsers = computed(() => {
    const users = this.usersApi.value() || [];
    const search = (this.searchTerm() || '').toLowerCase();
    const approvalFilter = this.approvalStatusFilter.value || 'all';
    const portalFilter = this.portalAccessFilter.value || 'all';

    return users.filter((user) => {
      // Filtro de búsqueda
      if (search) {
        const searchable = `${user.first_name} ${user.father_name} ${user.work_email || ''} ${user.email || ''}`.toLowerCase();
        if (!searchable.includes(search)) {
          return false;
        }
      }

      // Filtro de estado de aprobación
      if (approvalFilter === 'pending' && user.account_approved !== null) {
        return false;
      }
      if (approvalFilter === 'approved' && user.account_approved !== true) {
        return false;
      }
      if (approvalFilter === 'rejected' && user.account_approved !== false) {
        return false;
      }

      // Filtro de acceso al portal
      if (portalFilter === 'yes' && !user.has_portal_access) {
        return false;
      }
      if (portalFilter === 'no' && user.has_portal_access) {
        return false;
      }

      return true;
    });
  });

  // Estadísticas
  public totalUsers = computed(() => this.usersApi.value()?.length || 0);
  public pendingUsers = computed(
    () => this.usersApi.value()?.filter((u) => u.account_approved === null).length || 0
  );
  public approvedUsers = computed(
    () => this.usersApi.value()?.filter((u) => u.account_approved === true).length || 0
  );
  public portalUsers = computed(
    () => this.usersApi.value()?.filter((u) => u.has_portal_access).length || 0
  );

  // Aprobar usuario
  public approveUser(user: Employee): void {
    this.confirmationService.confirm({
      message: `¿Aprobar la cuenta de ${user.first_name} ${user.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.updateUserAccountStatus(user.id, true);
      },
    });
  }

  // Rechazar usuario
  public rejectUser(user: Employee): void {
    this.confirmationService.confirm({
      message: `¿Rechazar la cuenta de ${user.first_name} ${user.father_name}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.updateUserAccountStatus(user.id, false);
      },
    });
  }

  // Actualizar estado de aprobación
  private updateUserAccountStatus(userId: string, approved: boolean): void {
    this.savingUsers.update((set) => new Set(set).add(userId));

    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
        { account_approved: approved },
        {
          params: {
            id: `eq.${userId}`,
          },
        }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Cuenta ${approved ? 'aprobada' : 'rechazada'} correctamente`,
          });
          this.usersApi.reload();
          this.lastAccessApi.reload();
          this.savingUsers.update((set) => {
            const newSet = new Set(set);
            newSet.delete(userId);
            return newSet;
          });
        },
        error: (error) => {
          console.error('Error actualizando estado:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado de la cuenta',
          });
          this.savingUsers.update((set) => {
            const newSet = new Set(set);
            newSet.delete(userId);
            return newSet;
          });
        },
      });
  }

  // Toggle acceso al portal
  public togglePortalAccess(user: Employee): void {
    this.savingUsers.update((set) => new Set(set).add(user.id));

    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
        { has_portal_access: user.has_portal_access },
        {
          params: {
            id: `eq.${user.id}`,
          },
        }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Acceso al portal ${user.has_portal_access ? 'habilitado' : 'deshabilitado'}`,
          });
          this.usersApi.reload();
          this.lastAccessApi.reload();
          this.savingUsers.update((set) => {
            const newSet = new Set(set);
            newSet.delete(user.id);
            return newSet;
          });
        },
        error: (error) => {
          console.error('Error actualizando acceso:', error);
          // Revertir el cambio
          user.has_portal_access = !user.has_portal_access;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el acceso al portal',
          });
          this.savingUsers.update((set) => {
            const newSet = new Set(set);
            newSet.delete(user.id);
            return newSet;
          });
        },
      });
  }
}

