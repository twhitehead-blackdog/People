import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { Card } from 'primeng/card';
import { DeviceService } from '../../services/device.service';
import { PermissionsService } from '../../services/permissions.service';

import { Employee } from '../../models';

interface DashboardTimelogEvent {
  id: string;
  type: string;
  typeLabel: string;
  icon: string;
  date: Date;
  time: string;
  branch: { name?: string } | null;
}

@Component({
  selector: 'pt-employee-portal-dashboard',
  standalone: true,
  imports: [CommonModule, Card],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="flex flex-col gap-6">
      <p-card class="dashboard-welcome-card">
        <div class="flex flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <i class="pi pi-user text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white m-0">¡Hola, {{ employee?.first_name }}!</h2>
              <p class="text-gray-400 m-0 mt-1">{{ employee?.position?.name || 'Sin cargo' }} - {{ employee?.branch?.name || 'Sin sucursal' }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-400 m-0">Hoy es</p>
            <p class="text-lg font-semibold text-white m-0">{{ currentDate | date : 'fullDate' }}</p>
          </div>
        </div>
      </p-card>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ng-container *ngTemplateOutlet="statCards" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ng-container *ngTemplateOutlet="recentTimelogsCard" />
        <ng-container *ngTemplateOutlet="quickInfoCard" />
      </div>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="flex flex-col gap-4 px-4 py-4">
      <!-- Welcome compact -->
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shrink-0">
          <i class="pi pi-user text-white text-lg"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-lg font-bold text-white m-0 truncate">¡Hola, {{ employee?.first_name }}!</h2>
          <p class="text-xs text-gray-400 m-0 truncate">{{ employee?.position?.name || 'Sin cargo' }}</p>
        </div>
      </div>

      <!-- Stat cards 2x2 -->
      <div class="grid grid-cols-2 gap-3">
        <ng-container *ngTemplateOutlet="statCards" />
      </div>

      <!-- Recent timelogs -->
      <ng-container *ngTemplateOutlet="recentTimelogsCard" />

      <!-- Quick info -->
      <ng-container *ngTemplateOutlet="quickInfoCard" />
    </div>
    }

    <!-- ========== SHARED TEMPLATES ========== -->

    <ng-template #statCards>
      <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-400 m-0 mb-1">Días Trabajados</p>
            <p class="text-xl font-bold text-white m-0">{{ daysWorkedThisMonth }}</p>
            <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5">Este mes</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <i class="pi pi-calendar text-blue-400"></i>
          </div>
        </div>
      </div>

      <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-400 m-0 mb-1">Tardanzas</p>
            <p class="text-xl font-bold text-white m-0">{{ myLates?.length ?? 0 }}</p>
            <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5">Este mes</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <i class="pi pi-clock text-red-400"></i>
          </div>
        </div>
      </div>

      <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-400 m-0 mb-1">Compensatorio</p>
            <p class="text-xl font-bold text-white m-0">{{ approvedCompensatoryHours }}</p>
            <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5">Hrs aprobadas</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <i class="pi pi-check-circle text-green-400"></i>
          </div>
        </div>
      </div>

      @if (canViewSalary()) {
      <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-400 m-0 mb-1">Salario</p>
            <div class="flex items-center gap-1.5 cursor-pointer" (click)="toggleSalary.emit()">
              <p class="text-xl font-bold m-0" [class.text-green-400]="showSalary" [class.text-gray-500]="!showSalary">
                @if (showSalary && employee?.monthly_salary) {
                  {{ employee?.monthly_salary | currency : '$' }}
                } @else {
                  <span class="text-gray-500">••••</span>
                }
              </p>
            </div>
            <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5">Base</p>
          </div>
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
            [ngClass]="showSalary ? 'bg-amber-500/20' : 'bg-neutral-700/50'"
            (click)="toggleSalary.emit()"
          >
            <i [class]="showSalary ? 'pi pi-eye-slash text-amber-400' : 'pi pi-lock text-gray-400'"></i>
          </div>
        </div>
      </div>
      }
    </ng-template>

    <ng-template #recentTimelogsCard>
      <div class="bg-neutral-800/40 rounded-xl border border-neutral-700/30 p-4">
        <div class="flex items-center gap-2 mb-3">
          <i class="pi pi-calendar-clock text-amber-400"></i>
          <span class="text-sm font-semibold text-white">Marcaciones Recientes</span>
        </div>
        <div class="flex flex-col gap-2">
          @if (recentTimelogs && recentTimelogs.length > 0) {
            @for (event of recentTimelogs; track event.id) {
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-700/30">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <i [class]="'pi ' + event.icon + ' text-amber-400 text-sm'"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-sm text-white font-medium m-0">{{ event.typeLabel }}</p>
                  <p class="text-xs text-gray-400 m-0 truncate">
                    {{ event.date | date : 'shortDate' }} - {{ event.time }}
                    @if (event.branch?.name) { · {{ event.branch?.name }} }
                  </p>
                </div>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
                [ngClass]="{'bg-green-500/20': event.type === 'entry', 'bg-blue-500/20': event.type === 'exit', 'bg-amber-500/20': event.type === 'lunch_start' || event.type === 'lunch_end'}">
                @if (event.type === 'entry') { Entrada } @else if (event.type === 'exit') { Salida } @else { Almuerzo }
              </span>
            </div>
            }
          } @else {
            <p class="text-gray-400 text-center py-4 text-sm">No hay marcaciones recientes</p>
          }
        </div>
      </div>
    </ng-template>

    <ng-template #quickInfoCard>
      <div class="bg-neutral-800/40 rounded-xl border border-neutral-700/30 p-4">
        <div class="flex items-center gap-2 mb-3">
          <i class="pi pi-info-circle text-amber-400"></i>
          <span class="text-sm font-semibold text-white">Información Rápida</span>
        </div>
        @if (employee) {
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-700/30">
            <div class="flex items-center gap-2"><i class="pi pi-building text-amber-400 text-sm"></i><span class="text-xs text-gray-400">Sucursal</span></div>
            <span class="text-sm text-white font-medium">{{ employee.branch?.name || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-700/30">
            <div class="flex items-center gap-2"><i class="pi pi-sitemap text-amber-400 text-sm"></i><span class="text-xs text-gray-400">Departamento</span></div>
            <span class="text-sm text-white font-medium">{{ employee.department?.name || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-700/30">
            <div class="flex items-center gap-2"><i class="pi pi-calendar text-amber-400 text-sm"></i><span class="text-xs text-gray-400">Ingreso</span></div>
            <span class="text-sm text-white font-medium">{{ employee.start_date | date : 'shortDate' }}</span>
          </div>
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-700/30">
            <div class="flex items-center gap-2"><i class="pi pi-envelope text-amber-400 text-sm"></i><span class="text-xs text-gray-400">Email</span></div>
            <span class="text-xs text-white font-medium truncate max-w-[180px]">{{ employee.work_email || 'N/A' }}</span>
          </div>
        </div>
        }
      </div>
    </ng-template>
  `,
})
export class EmployeePortalDashboardComponent {
  protected device = inject(DeviceService);
  private permissions = inject(PermissionsService);

  @Input() employee: Employee | null = null;
  @Input() daysWorkedThisMonth = 0;
  @Input() myLates: Array<{ minutes: number }> | null = [];
  @Input() approvedCompensatoryHours = 0;
  @Input() recentTimelogs: DashboardTimelogEvent[] | null = [];
  @Input() currentDate: Date = new Date();
  @Input() showSalary = false;
  @Output() toggleSalary = new EventEmitter<void>();

  canViewSalary(): boolean {
    return this.permissions.canCurrentUser('view_salaries');
  }
}
