import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { getEnv } from '../../../../utils/env.utils';
import { DocumentRequestsService } from '../data/document-requests.service';
import { DocumentRequest } from '../models/document-request.model';

@Component({
  selector: 'pt-document-requests',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-3 p-4">
      <!-- Estadísticas Compactas -->
      <div class="grid grid-cols-4 gap-2">
        <!-- Total -->
        <div
          class="group relative bg-gradient-to-br from-neutral-800 to-neutral-800/80 rounded-lg p-3 border border-neutral-700/50 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <div
              class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
            >
              <i class="pi pi-file text-lg text-gray-400"></i>
            </div>
            <div class="text-right flex-1">
              <p
                class="text-[10px] font-medium text-gray-400 uppercase tracking-wider m-0"
              >
                Total
              </p>
              <p class="text-xl font-bold text-white m-0">{{ totalCount() }}</p>
            </div>
          </div>
        </div>

        <!-- Pendientes -->
        <div
          class="group relative bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-neutral-800 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <div
              class="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
            >
              <i class="pi pi-clock text-lg text-yellow-400"></i>
            </div>
            <div class="text-right flex-1">
              <p
                class="text-[10px] font-medium text-yellow-400/80 uppercase tracking-wider m-0"
              >
                Pendientes
              </p>
              <p class="text-xl font-bold text-yellow-300 m-0">
                {{ pendingCount() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Aprobadas -->
        <div
          class="group relative bg-gradient-to-br from-green-500/10 via-green-500/5 to-neutral-800 rounded-lg p-3 border border-green-500/30 hover:border-green-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <div
              class="w-8 h-8 rounded-md bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
            >
              <i class="pi pi-check-circle text-lg text-green-400"></i>
            </div>
            <div class="text-right flex-1">
              <p
                class="text-[10px] font-medium text-green-400/80 uppercase tracking-wider m-0"
              >
                Aprobadas
              </p>
              <p class="text-xl font-bold text-green-300 m-0">
                {{ approvedCount() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Rechazadas -->
        <div
          class="group relative bg-gradient-to-br from-red-500/10 via-red-500/5 to-neutral-800 rounded-lg p-3 border border-red-500/30 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <div
              class="w-8 h-8 rounded-md bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
            >
              <i class="pi pi-times-circle text-lg text-red-400"></i>
            </div>
            <div class="text-right flex-1">
              <p
                class="text-[10px] font-medium text-red-400/80 uppercase tracking-wider m-0"
              >
                Rechazadas
              </p>
              <p class="text-xl font-bold text-red-300 m-0">
                {{ rejectedCount() }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm p-3"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label
              class="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1"
              >Búsqueda</label
            >
            <input
              pInputText
              [(ngModel)]="searchText"
              placeholder="Empleado o tipo..."
              class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
            />
          </div>
          <div>
            <label
              class="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1"
              >Estado</label
            >
            <p-dropdown
              [(ngModel)]="selectedStatus"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Todos"
              [showClear]="true"
              class="w-full text-sm"
              [style]="{ height: '32px' }"
            />
          </div>
          <div>
            <label
              class="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1"
              >Rango</label
            >
            <p-calendar
              [(ngModel)]="dateRange"
              selectionMode="range"
              placeholder="Seleccionar"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              class="w-full text-sm"
              [inputStyle]="{ height: '32px', padding: '0.375rem' }"
              [showClear]="true"
            />
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div
        class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden"
      >
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
          [scrollable]="true"
          scrollHeight="600px"
          styleClass="p-datatable-sm"
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

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

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

  getDocumentTypeLabel(type: string): string {
    const types: Record<string, string> = {
      work_certificate: 'Constancia Laboral',
      salary_certificate: 'Constancia Salarial',
      social_security: 'Ficha Seguro Social',
      other: 'Otro',
    };
    return types[type] || type;
  }

  getDocumentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
  }

  getDocumentStatusSeverity(
    status: string
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'secondary'
    | 'contrast'
    | undefined {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'info';
    }
  }

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
          reviewed_by: currentEmployee.id,
          reviewed_at: new Date().toISOString(),
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
