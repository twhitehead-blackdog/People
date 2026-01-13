import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { getEnv } from '../../../../utils/env.utils';
import { HrFiltersPanelComponent } from '../../shared/components/hr-filters-panel.component';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import {
  STATUS_OPTIONS,
  calculateDaysBetween,
  getStatusLabel,
  getStatusSeverity,
} from '../../shared/utils/hr-status.utils';
import { VacationsService } from '../data/vacations.service';
import { VacationRequest } from '../models/vacation-request.model';

@Component({
  selector: 'pt-vacations',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    HrStatsGridComponent,
    HrFiltersPanelComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-3">
      <!-- Estadísticas Compactas -->
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-calendar"
      />

      <!-- Filtros -->
      <pt-hr-filters-panel
        [statusOptions]="statusOptions"
        [totalCount]="totalCount()"
        [filteredCount]="filteredVacations().length"
        searchPlaceholder="Empleado..."
        (searchChange)="onSearchChange($event)"
        (statusChange)="onStatusChange($event)"
        (dateRangeChange)="onDateRangeChange($event)"
        (clearFilters)="onClearFilters()"
      />

      <!-- Tabla de Vacaciones -->
      @if (service.isLoading()) {
      <div class="flex justify-center py-8">
        <p-progressSpinner />
      </div>
      } @else if (filteredVacations().length === 0) {
      <div
        class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-8"
      >
        <div class="text-center">
          <i class="pi pi-calendar text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">
            No se encontraron solicitudes de vacaciones
          </p>
        </div>
      </div>
      } @else {
      <div
        class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden"
      >
        <p-table
          [value]="filteredVacations()"
          [scrollable]="true"
          scrollHeight="600px"
          [responsive]="true"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 180px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user text-cyan-400 text-xs"></i>
                  <span class="text-xs">Empleado</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                  <span class="text-xs">Fecha Inicio</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                  <span class="text-xs">Fecha Fin</span>
                </div>
              </th>
              <th style="width: 100px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-clock text-cyan-400 text-xs"></i>
                  <span class="text-xs">Días</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-tag text-cyan-400 text-xs"></i>
                  <span class="text-xs">Estado</span>
                </div>
              </th>
              <th style="width: 140px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                  <span class="text-xs">Creado por</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-calendar-plus text-cyan-400 text-xs"></i>
                  <span class="text-xs">Solicitado</span>
                </div>
              </th>
              <th style="width: 180px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-cog text-cyan-400 text-xs"></i>
                  <span class="text-xs">Acciones</span>
                </div>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-vacation>
            <tr class="hover:bg-neutral-700/30">
              <td style="padding: 0.5rem;">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-white">
                    {{ vacation.employee?.first_name }}
                    {{ vacation.employee?.father_name }}
                  </span>
                  @if (vacation.employee?.position?.name) {
                  <span class="text-xs text-gray-400">
                    {{ vacation.employee.position.name }}
                  </span>
                  } @if (vacation.employee?.branch?.name) {
                  <span class="text-xs text-cyan-400">
                    {{ vacation.employee.branch.name }}
                  </span>
                  }
                </div>
              </td>
              <td style="padding: 0.5rem;">
                <span class="text-sm text-gray-300">
                  {{ vacation.start_date | date : 'dd/MM/yyyy' }}
                </span>
              </td>
              <td style="padding: 0.5rem;">
                <span class="text-sm text-gray-300">
                  {{ vacation.end_date | date : 'dd/MM/yyyy' }}
                </span>
              </td>
              <td style="padding: 0.5rem;">
                <span class="text-sm font-medium text-cyan-400">
                  {{ calculateDays(vacation.start_date, vacation.end_date) }}
                </span>
              </td>
              <td style="padding: 0.5rem;">
                <p-tag
                  [value]="getStatusLabel(vacation.status)"
                  [severity]="getStatusSeverity(vacation.status)"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.5rem; text-align: center;">
                @if (vacation.created_by && vacation.created_by !==
                vacation.employee_id) {
                <div class="flex flex-col items-center gap-0.5">
                  <div class="flex items-center gap-1">
                    <i class="pi pi-user text-amber-400 text-[10px]"></i>
                    <span class="text-[10px] font-medium text-amber-300">
                      Creado por gerente
                    </span>
                  </div>
                </div>
                } @else {
                <span class="text-[10px] text-gray-500 italic">
                  Auto-solicitud
                </span>
                }
              </td>
              <td style="padding: 0.5rem;">
                <span class="text-xs text-gray-400">
                  {{ vacation.created_at | date : 'dd/MM/yyyy' }}
                </span>
                <br />
                <span class="text-xs text-gray-500">
                  {{ vacation.created_at | date : 'HH:mm' }}
                </span>
              </td>
              <td style="padding: 0.5rem;">
                @if (vacation.status === 'pending') {
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    pTooltip="Aprobar"
                    tooltipPosition="left"
                    (onClick)="approveVacation(vacation)"
                  />
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    size="small"
                    pTooltip="Rechazar"
                    tooltipPosition="left"
                    (onClick)="rejectVacation(vacation)"
                  />
                </div>
                }
                <p-button
                  icon="pi pi-eye"
                  severity="info"
                  size="small"
                  pTooltip="Ver detalles"
                  tooltipPosition="left"
                  (onClick)="viewDetails(vacation)"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
      }
    </div>
  `,
})
export class VacationsComponent {
  public service = inject(VacationsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);
  private http = inject(HttpClient);

  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  public statusOptions = STATUS_OPTIONS;

  public totalCount = computed(() => this.service.value().length);
  public pendingCount = computed(
    () => this.service.value().filter((v) => v.status === 'pending').length
  );
  public approvedCount = computed(
    () => this.service.value().filter((v) => v.status === 'approved').length
  );
  public rejectedCount = computed(
    () => this.service.value().filter((v) => v.status === 'rejected').length
  );

  public filteredVacations = computed(() => {
    let vacations = this.service.value();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const range = this.dateRange();

    if (search) {
      vacations = vacations.filter(
        (v) =>
          v.employee?.first_name.toLowerCase().includes(search) ||
          v.employee?.father_name.toLowerCase().includes(search) ||
          v.employee?.work_email?.toLowerCase().includes(search)
      );
    }
    if (status) {
      vacations = vacations.filter((v) => v.status === status);
    }
    if (range && range[0] && range[1]) {
      const start = range[0].getTime();
      const end = range[1].getTime();
      vacations = vacations.filter((v) => {
        const time = new Date(v.created_at).getTime();
        return time >= start && time <= end;
      });
    }
    return vacations;
  });

  // Filter event handlers
  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  onStatusChange(value: string | null): void {
    this.selectedStatus.set(value);
  }

  onDateRangeChange(value: Date[] | null): void {
    this.dateRange.set(value);
  }

  onClearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  // Utility methods
  getStatusLabel = getStatusLabel;
  getStatusSeverity = getStatusSeverity;

  calculateDays(start: string, end: string): number {
    return calculateDaysBetween(start, end);
  }

  // Action methods
  approveVacation(vacation: VacationRequest) {
    this.confirmationService.confirm({
      message: `¿Aprobar solicitud de vacaciones de ${vacation.employee?.first_name} ${vacation.employee?.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateVacationStatus(vacation.id, 'approved'),
    });
  }

  rejectVacation(vacation: VacationRequest) {
    this.confirmationService.confirm({
      message: `¿Rechazar solicitud de vacaciones de ${vacation.employee?.first_name} ${vacation.employee?.father_name}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateVacationStatus(vacation.id, 'rejected'),
    });
  }

  viewDetails(vacation: VacationRequest) {
    // TODO: Implement details dialog
    console.log('View details:', vacation);
  }

  private updateVacationStatus(id: string, status: 'approved' | 'rejected') {
    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_vacations?id=eq.${id}`,
        {
          status,
          reviewed_by: currentEmployee.id,
          reviewed_at: new Date().toISOString(),
        }
      )
      .subscribe({
        next: async () => {
          const vacation = this.service.value().find((v) => v.id === id);
          if (vacation) await this.notifyEmployee(vacation, status);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Solicitud actualizada',
          });
          this.service.reload();
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Fallo al actualizar',
          }),
      });
  }

  private async notifyEmployee(
    vacation: VacationRequest,
    status: 'approved' | 'rejected'
  ) {
    const data = {
      employee_id: vacation.employee_id,
      type: status === 'approved' ? 'vacation_approved' : 'vacation_rejected',
      title:
        status === 'approved'
          ? 'Vacaciones Aprobadas'
          : 'Vacaciones Rechazadas',
      message: `Tu solicitud de vacaciones del ${new Date(
        vacation.start_date
      ).toLocaleDateString()} al ${new Date(
        vacation.end_date
      ).toLocaleDateString()} ha sido ${
        status === 'approved' ? 'aprobada' : 'rechazada'
      }.`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    try {
      await firstValueFrom(
        this.http.post(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`,
          data
        )
      );
    } catch (e) {
      console.error('Error sending notification', e);
    }
  }
}
