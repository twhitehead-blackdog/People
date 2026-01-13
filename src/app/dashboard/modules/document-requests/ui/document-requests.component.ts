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
  getStatusLabel,
  getStatusSeverity,
} from '../../shared/utils/hr-status.utils';
import { DocumentRequestsService } from '../data/document-requests.service';
import { DocumentRequest } from '../models/document-request.model';

@Component({
  selector: 'pt-document-requests',
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
        icon="pi-file-edit"
      />

      <!-- Filtros -->
      <pt-hr-filters-panel
        [statusOptions]="statusOptions"
        [totalCount]="totalCount()"
        [filteredCount]="filteredDocuments().length"
        searchPlaceholder="Empleado o tipo..."
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
            <i class="pi pi-file-edit text-purple-400 text-sm"></i>
            Solicitudes de Documentos
          </h3>
        </div>
        @if (service.isLoading()) {
        <div class="flex justify-center py-8">
          <p-progressSpinner />
        </div>
        } @else if (filteredDocuments().length === 0) {
        <div class="text-center py-8">
          <i class="pi pi-file-edit text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">No se encontraron solicitudes</p>
        </div>
        } @else {
        <p-table
          [value]="filteredDocuments()"
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
              <th style="width: 180px; padding: 0.5rem;">Empleado</th>
              <th style="width: 150px; padding: 0.5rem;">Tipo Documento</th>
              <th style="width: 120px; padding: 0.5rem;">Estado</th>
              <th style="width: 140px; padding: 0.5rem;">Creado por</th>
              <th style="width: 120px; padding: 0.5rem;">Solicitado</th>
              <th style="width: 180px; padding: 0.5rem;">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-document>
            <tr class="hover:bg-neutral-700/30">
              <td style="padding: 0.5rem;">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-white"
                    >{{ document.employee?.first_name }}
                    {{ document.employee?.father_name }}</span
                  >
                  @if (document.employee?.position?.name) {
                  <span class="text-xs text-gray-400">{{
                    document.employee.position.name
                  }}</span>
                  } @if (document.employee?.branch?.name) {
                  <span class="text-xs text-cyan-400">{{
                    document.employee.branch.name
                  }}</span>
                  }
                </div>
              </td>
              <td style="padding: 0.5rem;">
                <span class="text-sm text-gray-300">{{
                  getDocumentTypeLabel(document.document_type)
                }}</span>
                @if (document.reason) { <br /><span
                  class="text-xs text-gray-400"
                  >{{ document.reason }}</span
                >
                }
              </td>
              <td style="padding: 0.5rem;">
                <p-tag
                  [value]="getDocumentStatusLabel(document.status)"
                  [severity]="getDocumentStatusSeverity(document.status)"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.5rem;">
                @if (document.created_by && document.created_by !==
                document.employee_id) {
                <span class="text-[10px] font-medium text-amber-300"
                  >Creado por gerente</span
                >
                } @else {
                <span class="text-[10px] text-gray-500 italic"
                  >Auto-solicitud</span
                >
                }
              </td>
              <td style="padding: 0.5rem;">
                <span class="text-xs text-gray-400">{{
                  document.created_at | date : 'dd/MM/yyyy'
                }}</span>
              </td>
              <td style="padding: 0.5rem;">
                @if (document.status === 'pending') {
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    (onClick)="approveDocument(document)"
                    pTooltip="Aprobar"
                  />
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    size="small"
                    (onClick)="rejectDocument(document)"
                    pTooltip="Rechazar"
                  />
                </div>
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </div>
    </div>
  `,
})
export class DocumentRequestsComponent {
  public service = inject(DocumentRequestsService);
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
    () => this.service.value().filter((d) => d.status === 'pending').length
  );
  public approvedCount = computed(
    () => this.service.value().filter((d) => d.status === 'approved').length
  );
  public rejectedCount = computed(
    () => this.service.value().filter((d) => d.status === 'rejected').length
  );

  public filteredDocuments = computed(() => {
    let docs = this.service.value();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const range = this.dateRange();

    if (search) {
      docs = docs.filter(
        (d) =>
          d.employee?.first_name.toLowerCase().includes(search) ||
          d.employee?.father_name.toLowerCase().includes(search) ||
          this.getDocumentTypeLabel(d.document_type)
            .toLowerCase()
            .includes(search)
      );
    }
    if (status) {
      docs = docs.filter((d) => d.status === status);
    }
    if (range && range[0] && range[1]) {
      const start = range[0].getTime();
      const end = range[1].getTime();
      docs = docs.filter((d) => {
        const time = new Date(d.created_at).getTime();
        return time >= start && time <= end;
      });
    }
    return docs;
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

  getDocumentTypeLabel(type: string): string {
    const types: Record<string, string> = {
      work_certificate: 'Constancia Laboral',
      salary_certificate: 'Constancia Salarial',
      social_security: 'Ficha Seguro Social',
      other: 'Otro',
    };
    return types[type] || type;
  }

  getDocumentStatusLabel = getStatusLabel;
  getDocumentStatusSeverity = getStatusSeverity;

  approveDocument(document: DocumentRequest) {
    this.confirmationService.confirm({
      message: `¿Aprobar solicitud de ${this.getDocumentTypeLabel(
        document.document_type
      )}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateDocumentStatus(document.id, 'approved'),
    });
  }

  rejectDocument(document: DocumentRequest) {
    this.confirmationService.confirm({
      message: `¿Rechazar solicitud de ${this.getDocumentTypeLabel(
        document.document_type
      )}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateDocumentStatus(document.id, 'rejected'),
    });
  }

  private updateDocumentStatus(id: string, status: 'approved' | 'rejected') {
    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) return;

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${id}`,
        {
          status,
          processed_by: currentEmployee.id,
          processed_at: new Date().toISOString(),
        }
      )
      .subscribe({
        next: async () => {
          const doc = this.service.value().find((d) => d.id === id);
          if (doc) await this.notifyEmployee(doc, status);
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
    document: DocumentRequest,
    status: 'approved' | 'rejected'
  ) {
    const data = {
      employee_id: document.employee_id,
      type: status === 'approved' ? 'document_approved' : 'document_rejected',
      title:
        status === 'approved' ? 'Documento Aprobado' : 'Documento Rechazado',
      message: `Tu solicitud de ${this.getDocumentTypeLabel(
        document.document_type
      )} ha sido ${status === 'approved' ? 'aprobada' : 'rechazada'}.`,
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
