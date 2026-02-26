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

      <!-- Balance + Stats row -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <!-- Balance card -->
        <div class="lg:col-span-1 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-400/30">
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-sun text-amber-400"></i>
              <span class="text-xs font-semibold text-amber-400 uppercase tracking-wide">Balance</span>
            </div>
            <div>
              <p class="text-xs text-gray-400 m-0 mb-0.5">Vacaciones</p>
              <p class="text-2xl font-bold text-white m-0">{{ vacationBalance }} <span class="text-sm font-normal text-gray-400">días</span></p>
            </div>
            <div>
              <p class="text-xs text-gray-400 m-0 mb-0.5">Compensatorio</p>
              <p class="text-lg font-bold text-white m-0">{{ compensatoryBalance }} <span class="text-sm font-normal text-gray-400">hrs</span></p>
            </div>
          </div>
        </div>

        <!-- Stat cards -->
        <div class="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ng-container *ngTemplateOutlet="statCards" />
        </div>
      </div>

      <!-- Quick Actions (desktop) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ng-container *ngTemplateOutlet="quickActions" />
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

      <!-- Balance card (mobile) -->
      <div class="bg-gradient-to-r from-amber-500/15 to-amber-600/10 rounded-xl p-3 border border-amber-400/30">
        <div class="flex items-center justify-around">
          <div class="text-center">
            <p class="text-[0.65rem] text-amber-400 m-0 uppercase tracking-wide font-semibold">Vacaciones</p>
            <p class="text-2xl font-bold text-white m-0">{{ vacationBalance }}</p>
            <p class="text-[0.6rem] text-gray-400 m-0">días disponibles</p>
          </div>
          <div class="w-px h-10 bg-amber-400/30"></div>
          <div class="text-center">
            <p class="text-[0.65rem] text-amber-400 m-0 uppercase tracking-wide font-semibold">Compensatorio</p>
            <p class="text-2xl font-bold text-white m-0">{{ compensatoryBalance }}</p>
            <p class="text-[0.6rem] text-gray-400 m-0">hrs aprobadas</p>
          </div>
        </div>
      </div>

      <!-- Stat cards - horizontal scroll snap -->
      <div class="stat-cards-scroll">
        <ng-container *ngTemplateOutlet="statCards" />
      </div>

      <!-- Quick Actions grid 2x2 -->
      <div class="grid grid-cols-2 gap-3">
        <ng-container *ngTemplateOutlet="quickActions" />
      </div>

      <!-- Recent timelogs -->
      <ng-container *ngTemplateOutlet="recentTimelogsCard" />

      <!-- Quick info -->
      <ng-container *ngTemplateOutlet="quickInfoCard" />
    </div>
    }

    <!-- ========== SHARED TEMPLATES ========== -->

    <ng-template #quickActions>
      <button
        class="quick-action-btn"
        (click)="quickAction.emit('vacations')"
      >
        <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <i class="pi pi-sun text-blue-400"></i>
        </div>
        <span class="text-xs text-white font-medium">Vacaciones</span>
      </button>
      <button
        class="quick-action-btn"
        (click)="quickAction.emit('documents')"
      >
        <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <i class="pi pi-file text-purple-400"></i>
        </div>
        <span class="text-xs text-white font-medium">Documentos</span>
      </button>
      <button
        class="quick-action-btn"
        (click)="quickAction.emit('compensatory')"
      >
        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <i class="pi pi-clock text-green-400"></i>
        </div>
        <span class="text-xs text-white font-medium">Compensatorio</span>
      </button>
      <button
        class="quick-action-btn"
        (click)="quickAction.emit('uniform_request')"
      >
        <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <i class="pi pi-tag text-amber-400"></i>
        </div>
        <span class="text-xs text-white font-medium">Uniforme</span>
      </button>
    </ng-template>

    <ng-template #statCards>
      <div class="stat-card bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
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

      <div class="stat-card bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
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

      <div class="stat-card bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
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
      <div class="stat-card bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
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
            <div class="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-700/30">
              <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <i [class]="'pi ' + event.icon + ' text-amber-400 text-sm'"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-white font-medium m-0">{{ event.typeLabel }}</p>
                <p class="text-xs text-gray-400 m-0 truncate">
                  {{ event.date | date : 'shortDate' }} - {{ event.time }}
                  @if (event.branch?.name) { · {{ event.branch?.name }} }
                </p>
              </div>
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
  styles: [`
    .stat-cards-scroll {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 4px;
    }
    .stat-cards-scroll::-webkit-scrollbar { display: none; }
    .stat-cards-scroll .stat-card {
      min-width: 160px;
      scroll-snap-align: start;
      flex-shrink: 0;
    }

    .quick-action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem 0.5rem;
      border-radius: 0.75rem;
      background: rgba(38, 38, 38, 0.6);
      border: 1px solid rgba(64, 64, 64, 0.3);
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .quick-action-btn:hover {
      background: rgba(38, 38, 38, 0.9);
      border-color: rgba(251, 191, 36, 0.3);
    }
    .quick-action-btn:active {
      transform: scale(0.97);
    }
  `],
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
  @Input() vacationBalance = 0;
  @Input() compensatoryBalance = 0;
  @Output() toggleSalary = new EventEmitter<void>();
  @Output() quickAction = new EventEmitter<string>();

  canViewSalary(): boolean {
    return this.permissions.canCurrentUser('view_salaries');
  }
}
