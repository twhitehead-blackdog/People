import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PanamaDatePipe } from '../../../pipes/panama-date.pipe';
import { EmployeePortalDataService } from '../services/employee-portal-data.service';

@Component({
  selector: 'pt-employee-portal-dashboard-tab',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, PanamaDatePipe],
  template: `
    <div class="tab-content" *ngIf="currentEmployee()">
      <div class="flex flex-col gap-6">
        <!-- Welcome Card -->
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
                  ¡Hola, {{ currentEmployee()?.first_name }}!
                </h2>
                <p class="text-gray-400 m-0 mt-1">
                  {{ currentEmployee()?.position?.name || 'Sin cargo' }} -
                  {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-400 m-0">Hoy es</p>
              <p class="text-lg font-semibold text-white m-0">
                {{ getCurrentDate() | date : 'fullDate' }}
              </p>
            </div>
          </div>
        </p-card>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Días Trabajados Este Mes -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">Días Trabajados</p>
                <p class="text-2xl font-bold text-white m-0">
                  {{ daysWorkedThisMonth() }}
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

          <!-- Tardanzas Este Mes -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">Tardanzas</p>
                <p class="text-2xl font-bold text-white m-0">
                  {{ myLates().length }}
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

          <!-- Horas de Compensatorio Aprobadas -->
          <p-card class="dashboard-stat-card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-400 m-0 mb-1">
                  Horas de Compensatorio Aprobadas
                </p>
                <p class="text-2xl font-bold text-white m-0">
                  {{ approvedCompensatoryHours() }}
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
        </div>

        <!-- Recent Activity and Quick Info -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Marcaciones Recientes -->
          <p-card>
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar-clock text-amber-400"></i>
                <span>Marcaciones Recientes</span>
              </div>
            </ng-template>
            <div class="flex flex-col gap-3">
              <ng-container
                *ngIf="recentTimelogs().length > 0; else noTimelogs"
              >
                <div
                  *ngFor="let log of recentTimelogs()"
                  class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
                    >
                      <i class="pi pi-clock text-amber-400"></i>
                    </div>
                    <div>
                      <p class="text-white font-semibold m-0">
                        {{ log.day | panamaDate : 'mediumDate' }}
                      </p>
                      <p class="text-sm text-gray-400 m-0">
                        Entrada:
                        {{
                          log.entry?.date
                            ? (log.entry.date | panamaDate : 'hh:mm a')
                            : 'Sin registro'
                        }}
                      </p>
                    </div>
                  </div>
                  <ng-container *ngIf="log.delay && log.delay > 0; else onTime">
                    <span
                      class="text-xs text-red-400 font-semibold px-2 py-1 rounded bg-red-500/20"
                    >
                      +{{ log.delay }} min
                    </span>
                  </ng-container>
                  <ng-template #onTime>
                    <span
                      class="text-xs text-green-400 font-semibold px-2 py-1 rounded bg-green-500/20"
                    >
                      A tiempo
                    </span>
                  </ng-template>
                </div>
              </ng-container>
              <ng-template #noTimelogs>
                <p class="text-gray-400 text-center py-4">
                  No hay marcaciones recientes
                </p>
              </ng-template>
            </div>
          </p-card>

          <!-- Información Rápida -->
          <p-card>
            <ng-template #title>
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-amber-400"></i>
                <span>Información Rápida</span>
              </div>
            </ng-template>
            <div class="flex flex-col gap-3">
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-building text-amber-400"></i>
                  <span class="text-gray-400">Sucursal:</span>
                </div>
                <span class="text-white font-semibold">{{
                  currentEmployee()?.branch?.name || 'N/A'
                }}</span>
              </div>
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-sitemap text-amber-400"></i>
                  <span class="text-gray-400">Departamento:</span>
                </div>
                <span class="text-white font-semibold">{{
                  currentEmployee()?.department?.name || 'N/A'
                }}</span>
              </div>
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-calendar text-amber-400"></i>
                  <span class="text-gray-400">Fecha de Ingreso:</span>
                </div>
                <span class="text-white font-semibold">{{
                  currentEmployee()?.start_date | date : 'shortDate'
                }}</span>
              </div>
              <div
                class="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-envelope text-amber-400"></i>
                  <span class="text-gray-400">Email:</span>
                </div>
                <span class="text-white font-semibold text-sm">{{
                  currentEmployee()?.work_email || 'N/A'
                }}</span>
              </div>
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Styles copied from parent */
      ::ng-deep .dashboard-welcome-card .p-card-body {
        background: linear-gradient(
          135deg,
          rgba(251, 191, 36, 0.1) 0%,
          rgba(251, 191, 36, 0.05) 100%
        );
        border: 1px solid rgba(251, 191, 36, 0.2);
      }

      ::ng-deep .dashboard-stat-card .p-card-body {
        padding: 1.25rem;
      }

      @media (max-width: 640px) {
        ::ng-deep .dashboard-stat-card .p-card-body {
          padding: 1rem;
        }
      }

      ::ng-deep .dashboard-stat-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      ::ng-deep .dashboard-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
      }
    `,
  ],
})
export class EmployeePortalDashboardTabComponent implements OnInit {
  private dataService = inject(EmployeePortalDataService);

  public currentEmployee = this.dataService.currentEmployee;
  public myLates = this.dataService.myLates;

  public daysWorkedThisMonth = computed(() => {
    // Implement logic: unique days in monthTimelogs that have at least an entry
    const logs = this.dataService.monthTimelogs();
    // Assuming existence of entry indicates working
    return logs.filter((l) => l.entry).length;
  });

  public recentTimelogs = computed(() => {
    const logs = this.dataService.monthTimelogs();
    // Already sorted in service? Yes: sort((a, b) => b.day - a.day)
    return logs.slice(0, 5);
  });

  public approvedCompensatoryHours = this.dataService.approvedCompensatoryHours;

  public ngOnInit(): void {
    this.dataService.monthTimelogsApi.reload();
    this.dataService.timelogsApi.reload();
    this.dataService.compensatoryApi.reload();
  }

  public getCurrentDate(): Date {
    return new Date();
  }
}
