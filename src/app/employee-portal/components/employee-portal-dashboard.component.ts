import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Card } from 'primeng/card';

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
    <div class="flex flex-col gap-6">
      <p-card class="dashboard-welcome-card">
        <div
          class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"
            >
              <i class="pi pi-user text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white m-0">
                ¡Hola, {{ employee?.first_name }}!
              </h2>
              <p class="text-gray-400 m-0 mt-1">
                {{ employee?.position?.name || 'Sin cargo' }} -
                {{ employee?.branch?.name || 'Sin sucursal' }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-400 m-0">Hoy es</p>
            <p class="text-lg font-semibold text-white m-0">
              {{ currentDate | date : 'fullDate' }}
            </p>
          </div>
        </div>
      </p-card>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <p-card class="dashboard-stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0 mb-1">Días Trabajados</p>
              <p class="text-2xl font-bold text-white m-0">
                {{ daysWorkedThisMonth }}
              </p>
              <p class="text-xs text-gray-500 m-0 mt-1">Este mes</p>
            </div>
            <div
              class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
            >
              <i class="pi pi-calendar text-blue-400 text-xl"></i>
            </div>
          </div>
        </p-card>

        <p-card class="dashboard-stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0 mb-1">Tardanzas</p>
              <p class="text-2xl font-bold text-white m-0">
                {{ myLates?.length ?? 0 }}
              </p>
              <p class="text-xs text-gray-500 m-0 mt-1">Este mes</p>
            </div>
            <div
              class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
            >
              <i class="pi pi-clock text-red-400 text-xl"></i>
            </div>
          </div>
        </p-card>

        <p-card class="dashboard-stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0 mb-1">Horas de Compensatorio Aprobadas</p>
              <p class="text-2xl font-bold text-white m-0">
                {{ approvedCompensatoryHours }}
              </p>
              <p class="text-xs text-gray-500 m-0 mt-1">Total aprobadas</p>
            </div>
            <div
              class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <i class="pi pi-check-circle text-green-400 text-xl"></i>
            </div>
          </div>
        </p-card>

        <p-card class="dashboard-stat-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0 mb-1">Salario Mensual</p>
              <p
                class="text-2xl font-bold m-0 cursor-pointer transition-colors"
                [class.text-green-400]="showSalary"
                [class.text-gray-500]="!showSalary"
                (click)="toggleSalary.emit()"
              >
                @if (showSalary && employee?.monthly_salary) {
                  {{ employee?.monthly_salary | currency : '$' }}
                } @else {
                  <span class="text-gray-500">••••••</span>
                }
              </p>
              <p class="text-xs text-gray-500 m-0 mt-1">Base</p>
            </div>
            <div
              class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center cursor-pointer hover:bg-amber-500/30 transition-colors"
              (click)="toggleSalary.emit()"
              [title]="showSalary ? 'Ocultar salario' : 'Click para ver salario'"
            >
              <i
                [class]="
                  showSalary
                    ? 'pi pi-eye-slash text-amber-400 text-xl'
                    : 'pi pi-eye text-amber-400 text-xl'
                "
              ></i>
            </div>
          </div>
        </p-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <p-card>
          <ng-template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar-clock text-amber-400"></i>
              <span>Marcaciones Recientes</span>
            </div>
          </ng-template>
          <div class="flex flex-col gap-3">
            @if (recentTimelogs && recentTimelogs.length > 0) {
            @for (event of recentTimelogs; track event.id) {
            <div
              class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-800/70 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
                >
                  <i [class]="'pi ' + event.icon + ' text-amber-400'"></i>
                </div>
                <div>
                  <p class="text-white font-semibold m-0">
                    {{ event.typeLabel }}
                  </p>
                  <p class="text-sm text-gray-400 m-0">
                    {{ event.date | date : 'mediumDate' }} a las {{ event.time }}
                    @if (event.branch?.name) {
                      - {{ event.branch?.name }}
                    }
                  </p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="text-xs text-gray-500 font-medium">
                  {{ event.date | date : 'short' }}
                </span>
                <span
                  class="text-xs font-semibold px-2 py-1 rounded"
                  [ngClass]="{
                    'bg-green-500/20': event.type === 'entry',
                    'bg-blue-500/20': event.type === 'exit',
                    'bg-amber-500/20': event.type === 'lunch_start' || event.type === 'lunch_end'
                  }"
                >
                  @if (event.type === 'entry') {
                    Entrada
                  } @else if (event.type === 'exit') {
                    Salida
                  } @else {
                    Almuerzo
                  }
                </span>
              </div>
            </div>
            }
            } @else {
            <p class="text-gray-400 text-center py-4">
              No hay marcaciones recientes
            </p>
            }
          </div>
        </p-card>

        <p-card>
          <ng-template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-info-circle text-amber-400"></i>
              <span>Información Rápida</span>
            </div>
          </ng-template>
          <div class="flex flex-col gap-3">
            <ng-container *ngIf="employee">
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-building text-amber-400"></i>
                  <span class="text-gray-400">Sucursal:</span>
                </div>
                <span class="text-white font-semibold">
                  {{ employee.branch?.name || 'N/A' }}
                </span>
              </div>
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-sitemap text-amber-400"></i>
                  <span class="text-gray-400">Departamento:</span>
                </div>
                <span class="text-white font-semibold">
                  {{ employee.department?.name || 'N/A' }}
                </span>
              </div>
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-calendar text-amber-400"></i>
                  <span class="text-gray-400">Fecha de Ingreso:</span>
                </div>
                <span class="text-white font-semibold">
                  {{ employee.start_date | date : 'shortDate' }}
                </span>
              </div>
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-envelope text-amber-400"></i>
                  <span class="text-gray-400">Email:</span>
                </div>
                <span class="text-white font-semibold text-sm">
                  {{ employee.work_email || 'N/A' }}
                </span>
              </div>
            </ng-container>
          </div>
        </p-card>
      </div>
    </div>
  `,
})
export class EmployeePortalDashboardComponent {
  @Input() employee: Employee | null = null;
  @Input() daysWorkedThisMonth = 0;
  @Input() myLates: Array<{ minutes: number }> | null = [];
  @Input() approvedCompensatoryHours = 0;
  @Input() recentTimelogs: DashboardTimelogEvent[] | null = [];
  @Input() currentDate: Date = new Date();
  @Input() showSalary = false;
  @Output() toggleSalary = new EventEmitter<void>();
}
