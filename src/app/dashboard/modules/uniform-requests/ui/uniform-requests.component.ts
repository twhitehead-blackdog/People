import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { getEnv } from '../../../../utils/env.utils';
import { DocumentRequestsService } from '../../document-requests/data/document-requests.service';
import { DocumentRequest } from '../../document-requests/models/document-request.model';
import { HrFiltersPanelComponent } from '../../shared/components/hr-filters-panel.component';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import {
  getStatusLabel,
  getStatusSeverity,
  TagSeverity,
} from '../../shared/utils/hr-status.utils';

@Component({
  selector: 'pt-uniform-requests',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    TextareaModule,
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
        [approvedCount]="completedCount()"
        [rejectedCount]="rejectedCount()"
        approvedLabel="Completadas"
        icon="pi-shopping-bag"
      />

      <!-- Filtros -->
      <pt-hr-filters-panel
        [statusOptions]="statusOptions"
        [totalCount]="totalCount()"
        [filteredCount]="filteredRequests().length"
        searchPlaceholder="Empleado o tipo de prenda..."
        (searchChange)="onSearchChange($event)"
        (statusChange)="onStatusChange($event)"
        (dateRangeChange)="onDateRangeChange($event)"
        (clearFilters)="onClearFilters()"
      />

      <!-- Tabla -->
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <!-- Header -->
        <div class="p-2 border-b border-neutral-700/50">
          <h3
            class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
          >
            <i class="pi pi-shopping-bag text-teal-400 text-sm"></i>
            Solicitudes de Uniforme
          </h3>
        </div>
        @if (service.isLoading()) {
        <div class="flex justify-center py-8">
          <p-progressSpinner />
        </div>
        } @else if (filteredRequests().length === 0) {
        <div class="text-center py-8">
          <i class="pi pi-shopping-bag text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">No se encontraron solicitudes</p>
        </div>
        } @else {
        <p-table
          [value]="filteredRequests()"
          [paginator]="true"
          [rows]="8"
          [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
          paginatorPosition="bottom"
          [scrollable]="true"
          scrollHeight="600px"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 180px; padding: 0.4rem; text-align: left;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user text-teal-400 text-xs"></i>
                  <span class="text-xs">Empleado</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-tag text-teal-400 text-xs"></i>
                  <span class="text-xs">Prenda</span>
                </div>
              </th>
              <th style="width: 80px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-expand text-teal-400 text-xs"></i>
                  <span class="text-xs">Talla</span>
                </div>
              </th>
              <th style="width: 60px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-hashtag text-teal-400 text-xs"></i>
                  <span class="text-xs">Cant.</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-tag text-teal-400 text-xs"></i>
                  <span class="text-xs">Estado</span>
                </div>
              </th>
              <th style="width: 100px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-calendar text-teal-400 text-xs"></i>
                  <span class="text-xs">Solicitado</span>
                </div>
              </th>
              <th style="width: 140px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-user-plus text-teal-400 text-xs"></i>
                  <span class="text-xs">Creador</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.4rem; text-align: center;">
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-cog text-teal-400 text-xs"></i>
                  <span class="text-xs">Acciones</span>
                </div>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-request>
            <tr
              class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
              (click)="viewDetails(request)"
            >
              <td style="padding: 0.4rem; text-align: center;">
                <div class="flex items-center gap-1">
                  <div
                    class="w-5 h-5 rounded-full bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center flex-shrink-0"
                  >
                    <i class="pi pi-user text-teal-400 text-[9px]"></i>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-medium text-white text-xs truncate">
                      {{ request.employee?.first_name }}
                      {{ request.employee?.father_name }}
                    </span>
                    <span class="text-[9px] text-gray-400 truncate">
                      {{ request.employee?.branch?.name || '-' }}
                    </span>
                  </div>
                </div>
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <span class="text-sm text-white font-medium">
                  {{ request.metadata?.item_type || '-' }}
                </span>
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <span class="text-sm text-teal-300 font-semibold">
                  {{ request.metadata?.size || '-' }}
                </span>
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <span class="text-sm text-white font-medium">
                  {{ request.metadata?.quantity || 1 }}
                </span>
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <p-tag
                  [value]="getStatusLabel(request.status)"
                  [severity]="getStatusSeverity(request.status)"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <span class="text-xs text-gray-400">{{
                  request.created_at | date : 'dd/MM/yyyy'
                }}</span>
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                @if (request.created_by_employee) {
                <div class="flex items-center justify-center gap-1">
                  <i class="pi pi-user text-amber-400 text-[9px]"></i>
                  <span class="text-[10px] font-medium text-amber-300">
                    {{ request.created_by_employee.first_name }}
                    {{ request.created_by_employee.father_name }}
                  </span>
                </div>
                } @else {
                <span class="text-[10px] text-gray-500 italic">
                  Auto-solicitud
                </span>
                }
              </td>
              <td
                style="padding: 0.4rem; text-align: center;"
                (click)="$event.stopPropagation()"
              >
                <div class="flex gap-0.5 justify-center">
                  @if (request.status === 'pending') {
                  <p-button
                    icon="pi pi-check"
                    [text]="true"
                    severity="success"
                    size="small"
                    (onClick)="approveRequest(request)"
                    [rounded]="true"
                    pTooltip="Aprobar"
                    tooltipPosition="top"
                  />
                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (onClick)="openRejectionDialog(request)"
                    [rounded]="true"
                    pTooltip="Rechazar"
                    tooltipPosition="top"
                  />
                  }
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    size="small"
                    pTooltip="Ver detalles"
                    tooltipPosition="top"
                    [rounded]="true"
                    (onClick)="viewDetails(request)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </div>
    </div>

    <!-- Dialog de Detalles -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-shopping-bag text-teal-400"></i>
          <span class="text-lg font-semibold text-white"
            >Detalles de Solicitud de Uniforme</span
          >
        </div>
      </ng-template>

      @if (selectedRequest()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-user text-teal-400"></i>
            Información del Empleado
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Nombre</label
              >
              <p class="text-white">
                {{ selectedRequest()!.employee?.first_name }}
                {{ selectedRequest()!.employee?.father_name }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Sucursal</label
              >
              <p class="text-white">
                {{ selectedRequest()!.employee?.branch?.name || '-' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Detalles del Uniforme -->
        <div
          class="p-4 bg-gradient-to-r from-teal-500/10 to-teal-600/5 rounded-lg border border-teal-400/30"
        >
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-shopping-bag text-teal-400"></i>
            Detalles del Uniforme
          </h3>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Prenda</label
              >
              <p class="text-white text-lg font-semibold">
                {{ selectedRequest()!.metadata?.item_type || '-' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Talla</label
              >
              <p class="text-teal-300 text-lg font-semibold">
                {{ selectedRequest()!.metadata?.size || '-' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Cantidad</label
              >
              <p class="text-white text-lg font-semibold">
                {{ selectedRequest()!.metadata?.quantity || 1 }}
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getStatusLabel(selectedRequest()!.status)"
                [severity]="getStatusSeverity(selectedRequest()!.status)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha Solicitud</label
              >
              <p class="text-white">
                {{ selectedRequest()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Notas -->
        @if (selectedRequest()!.reason) {
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-teal-400"></i>
            Notas Adicionales
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ selectedRequest()!.reason }}
          </p>
        </div>
        } @if (selectedRequest()!.status === 'rejected' &&
        selectedRequest()!.rejection_comment) {
        <!-- Motivo de Rechazo -->
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-red-400"></i>
            Motivo del Rechazo
          </h3>
          <p class="text-red-300 whitespace-pre-wrap">
            {{ selectedRequest()!.rejection_comment }}
          </p>
        </div>
        }

        <!-- Acciones -->
        @if (selectedRequest()!.status === 'pending') {
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-cog text-teal-400"></i>
            Acciones
          </h3>
          <div class="flex gap-2">
            <p-button
              label="Aprobar"
              icon="pi pi-check"
              severity="success"
              (onClick)="
                approveRequest(selectedRequest()!); showDetailsDialog.set(false)
              "
            />
            <p-button
              label="Rechazar"
              icon="pi pi-times"
              severity="danger"
              (onClick)="
                showDetailsDialog.set(false);
                openRejectionDialog(selectedRequest()!)
              "
            />
          </div>
        </div>
        }
      </div>
      }
    </p-dialog>

    <!-- Diálogo de Confirmación de Rechazo -->
    <p-dialog
      [(visible)]="showRejectionDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      (onHide)="rejectionComment.set('')"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-red-400"></i>
          <span class="text-lg font-semibold text-white"
            >Confirmar Rechazo</span
          >
        </div>
      </ng-template>

      <div class="space-y-4 pt-4">
        <p class="text-gray-300">
          Por favor, indica el motivo del rechazo de esta solicitud de uniforme.
        </p>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">
            Motivo de Rechazo <span class="text-red-400">*</span>
          </label>
          <textarea
            pTextarea
            [(ngModel)]="rejectionComment"
            rows="4"
            placeholder="Escribe el motivo del rechazo..."
            class="w-full"
            maxlength="500"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            {{ rejectionComment().length }}/500 caracteres
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="showRejectionDialog.set(false)"
          />
          <p-button
            label="Confirmar Rechazo"
            severity="danger"
            icon="pi pi-times"
            [disabled]="!rejectionComment().trim()"
            (onClick)="confirmRejection()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class UniformRequestsComponent {
  public service = inject(DocumentRequestsService);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);

  // Filters
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Dialog
  public showDetailsDialog = signal(false);
  public selectedRequest = signal<DocumentRequest | null>(null);

  // Rejection dialog signals
  public showRejectionDialog = signal(false);
  public rejectionComment = signal('');
  public requestToReject = signal<DocumentRequest | null>(null);

  // Status options
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Completada', value: 'completed' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Filtered requests (only uniform_request type)
  public uniformRequests = computed(() =>
    this.service.value().filter((d) => d.document_type === 'uniform_request')
  );

  // Statistics
  public totalCount = computed(() => this.uniformRequests().length);
  public pendingCount = computed(
    () => this.uniformRequests().filter((d) => d.status === 'pending').length
  );
  public completedCount = computed(
    () => this.uniformRequests().filter((d) => d.status === 'completed').length
  );
  public rejectedCount = computed(
    () => this.uniformRequests().filter((d) => d.status === 'rejected').length
  );

  // Filtered requests
  public filteredRequests = computed(() => {
    let requests = this.uniformRequests();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const range = this.dateRange();

    if (search) {
      requests = requests.filter(
        (r) =>
          r.employee?.first_name?.toLowerCase().includes(search) ||
          r.employee?.father_name?.toLowerCase().includes(search) ||
          r.metadata?.item_type?.toLowerCase().includes(search)
      );
    }

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    if (range && range[0] && range[1]) {
      const start = range[0].getTime();
      const end = range[1].getTime();
      requests = requests.filter((r) => {
        const time = new Date(r.created_at).getTime();
        return time >= start && time <= end;
      });
    }

    return requests;
  });

  // Filter handlers
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

  getStatusLabel(status: string): string {
    return getStatusLabel(status);
  }

  getStatusSeverity(status: string): TagSeverity {
    return getStatusSeverity(status);
  }

  viewDetails(request: DocumentRequest): void {
    this.selectedRequest.set(request);
    this.showDetailsDialog.set(true);
  }

  async approveRequest(request: DocumentRequest): Promise<void> {
    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${
            request.id
          }`,
          {
            status: 'completed',
            processed_by: currentEmployee.id,
            processed_at: new Date().toISOString(),
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Aprobada',
        detail: 'La solicitud ha sido aprobada correctamente',
      });

      this.service.reload();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo aprobar la solicitud',
      });
    }
  }

  /**
   * Opens the rejection dialog
   */
  openRejectionDialog(request: DocumentRequest): void {
    this.requestToReject.set(request);
    this.rejectionComment.set('');
    this.showRejectionDialog.set(true);
  }

  /**
   * Confirms rejection with the comment
   */
  async confirmRejection(): Promise<void> {
    const comment = this.rejectionComment().trim();
    const request = this.requestToReject();
    if (!comment || !request) return;

    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    this.showRejectionDialog.set(false);

    try {
      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${
            request.id
          }`,
          {
            status: 'rejected',
            processed_by: currentEmployee.id,
            processed_at: new Date().toISOString(),
            rejection_comment: comment,
          }
        )
      );

      this.messageService.add({
        severity: 'warn',
        summary: 'Rechazada',
        detail: 'La solicitud ha sido rechazada',
      });

      this.service.reload();

      // Update local signal if viewing details
      if (this.selectedRequest()?.id === request.id) {
        this.selectedRequest.update((r) =>
          r ? { ...r, status: 'rejected', rejection_comment: comment } : null
        );
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo rechazar la solicitud',
      });
    }
  }

  // --- Export ---
  public async exportData(): Promise<void> {
    try {
      const xlsxModule = await import('xlsx-js-style');
      const XLSX = (xlsxModule as any).default || xlsxModule;
      const { format } = await import('date-fns');
      const { styleDataSheet, styleSummarySheet, MODULE_COLORS } = await import('../../shared/utils/excel-style.utils');
      const items = this.filteredRequests();
      if (items.length === 0) { this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay solicitudes de uniformes para exportar con los filtros aplicados' }); return; }
      const data = items.map((r) => ({
        Empleado: `${r.employee?.first_name || ''} ${r.employee?.father_name || ''}`.trim(),
        Email: r.employee?.work_email || 'N/A',
        'Posición': r.employee?.position?.name || 'N/A',
        Sucursal: r.employee?.branch?.name || 'N/A',
        Prenda: r.metadata?.item_type || '',
        Talla: r.metadata?.size || '',
        Cantidad: r.metadata?.quantity || 0,
        Estado: getStatusLabel(r.status),
        'Comentario Rechazo': r.rejection_comment || '',
        'Fecha Solicitud': r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Uniformes');
      ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 18 }];
      styleDataSheet(ws, XLSX.utils, MODULE_COLORS['uniform_request']);
      const summaryData = [
        ['Resumen - Uniformes'], ['Fecha Exportación', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        ['Total Solicitudes', items.length], ['Pendientes', this.pendingCount()],
        ['Completadas', this.completedCount()], ['Rechazadas', this.rejectedCount()],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 30 }];
      styleSummarySheet(summaryWs, XLSX.utils, MODULE_COLORS['uniform_request']);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      XLSX.writeFile(wb, `Uniformes_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`);
      this.messageService.add({ severity: 'success', summary: 'Exportación exitosa', detail: `Se exportaron ${items.length} solicitudes` });
    } catch (error) {
      console.error('Error exportando datos:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo exportar los datos' });
    }
  }
}
