import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
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
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import {
  getStatusLabel,
  getStatusSeverity,
  TagSeverity,
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
      .pdf-viewer {
        width: 100%;
        height: 500px;
        border: 1px solid #3f3f46;
        border-radius: 0.5rem;
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
    DialogModule,
    FileUploadModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    HrStatsGridComponent,
    HrFiltersPanelComponent,
    SafeUrlPipe,
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
        [hideRejected]="true"
        approvedLabel="Completadas"
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
              <th style="width: 180px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user text-purple-400 text-xs"></i>
                  <span class="text-xs">Empleado</span>
                </div>
              </th>
              <th style="width: 150px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-file text-purple-400 text-xs"></i>
                  <span class="text-xs">Tipo Documento</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-tag text-purple-400 text-xs"></i>
                  <span class="text-xs">Estado</span>
                </div>
              </th>
              <th style="width: 140px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-user-plus text-purple-400 text-xs"></i>
                  <span class="text-xs">Creado por</span>
                </div>
              </th>
              <th style="width: 120px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-calendar text-purple-400 text-xs"></i>
                  <span class="text-xs">Solicitado</span>
                </div>
              </th>
              <th style="width: 180px; padding: 0.5rem;">
                <div class="flex items-center gap-1">
                  <i class="pi pi-cog text-purple-400 text-xs"></i>
                  <span class="text-xs">Acciones</span>
                </div>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-document>
            <tr
              class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
              (click)="viewDetails(document)"
            >
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
              <td style="padding: 0.5rem;" (click)="$event.stopPropagation()">
                <div class="flex gap-1">
                  @if (document.status === 'pending') {
                  <p-button
                    label="Completar"
                    icon="pi pi-check-circle"
                    severity="success"
                    size="small"
                    (onClick)="openCompleteDialog(document)"
                    pTooltip="Adjuntar y Completar"
                    tooltipPosition="left"
                  />
                  } @if (document.document_url) {
                  <p-button
                    icon="pi pi-file-pdf"
                    severity="secondary"
                    size="small"
                    (onClick)="viewDetails(document)"
                    pTooltip="Ver Documento"
                    tooltipPosition="left"
                  />
                  }
                  <p-button
                    icon="pi pi-eye"
                    severity="info"
                    size="small"
                    pTooltip="Ver detalles"
                    tooltipPosition="left"
                    (onClick)="viewDetails(document)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </div>
    </div>

    <!-- Diálogo Completar Solicitud -->
    <p-dialog
      [(visible)]="showCompleteDialog"
      [modal]="true"
      [style]="{ width: '450px' }"
      header="Completar Solicitud"
      [draggable]="false"
      [resizable]="false"
    >
      <ng-template pTemplate="content">
        @if (selectedDocument()) {
        <div class="flex flex-col gap-4">
          <div class="bg-neutral-800/50 p-3 rounded border border-neutral-700">
            <p class="text-sm text-gray-300 m-0 mb-1">
              Estás completando la solicitud de:
            </p>
            <p class="font-bold text-white m-0">
              {{ getDocumentTypeLabel(selectedDocument()!.document_type) }}
            </p>
            <p class="text-xs text-gray-400 m-0 mt-1">
              {{ selectedDocument()?.employee?.first_name }}
              {{ selectedDocument()?.employee?.father_name }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2"
              >Adjuntar Documento (PDF) *</label
            >
            <p-fileUpload
              mode="basic"
              chooseLabel="Seleccionar PDF"
              accept="application/pdf"
              [maxFileSize]="5000000"
              (onSelect)="onFileSelect($event)"
              [auto]="false"
              styleClass="w-full"
            ></p-fileUpload>
            @if (selectedFile()) {
            <p class="text-xs text-green-400 mt-2 flex items-center gap-1">
              <i class="pi pi-check"></i> Archivo seleccionado:
              {{ selectedFile()?.name }}
            </p>
            }
          </div>
        </div>
        }
      </ng-template>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          icon="pi pi-times"
          [text]="true"
          (onClick)="showCompleteDialog.set(false)"
        />
        <p-button
          label="Completar y Guardar"
          icon="pi pi-check"
          severity="success"
          [disabled]="!selectedFile() || isUploading()"
          [loading]="isUploading()"
          (onClick)="completeDocument()"
        />
      </ng-template>
    </p-dialog>

    <!-- Diálogo de Detalles de Documento -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-file-edit text-purple-400"></i>
          <span class="text-lg font-semibold text-white">
            Detalles de Solicitud de Documento
          </span>
        </div>
      </ng-template>

      @if (selectedDocument()) {
      <div class="space-y-4">
        <!-- Información del Empleado -->
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <h4
            class="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2"
          >
            <i class="pi pi-user"></i> Información del Empleado
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-gray-400">Nombre</span>
              <p class="text-sm text-white font-medium m-0">
                {{ selectedDocument()?.employee?.first_name }}
                {{ selectedDocument()?.employee?.father_name }}
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Email</span>
              <p class="text-sm text-white m-0">
                {{ selectedDocument()?.employee?.work_email || '-' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Detalles del Documento -->
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <h4
            class="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2"
          >
            <i class="pi pi-file"></i> Detalles del Documento
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-gray-400">Tipo de Documento</span>
              <p class="text-sm text-white font-medium m-0">
                {{ getDocumentTypeLabel(selectedDocument()!.document_type) }}
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Estado</span>
              <p-tag
                [value]="getDocumentStatusLabel(selectedDocument()!.status)"
                [severity]="
                  getDocumentStatusSeverity(selectedDocument()!.status)
                "
              />
            </div>
            @if (selectedDocument()?.reason) {
            <div class="col-span-2">
              <span class="text-xs text-gray-400">Motivo / Descripción</span>
              <p class="text-sm text-gray-300 m-0">
                {{ selectedDocument()?.reason }}
              </p>
            </div>
            }
          </div>
        </div>

        <!-- Visor de PDF -->
        @if (selectedDocument()?.document_url) {
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <h4
            class="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2"
          >
            <i class="pi pi-eye"></i> Vista Previa
          </h4>
          <object
            [data]="selectedDocument()?.document_url | safeUrl"
            type="application/pdf"
            class="pdf-viewer"
          >
            <div
              class="flex flex-col items-center justify-center h-full text-gray-400"
            >
              <p>No se puede visualizar el PDF directamente.</p>
              <a
                [href]="selectedDocument()?.document_url"
                target="_blank"
                class="text-cyan-400 hover:underline"
                >Descargar PDF</a
              >
            </div>
          </object>
        </div>
        }

        <!-- Información de Auditoría -->
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-gray-400">Solicitado</span>
              <p class="text-sm text-white m-0">
                {{ selectedDocument()?.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            @if (selectedDocument()?.processed_at) {
            <div>
              <span class="text-xs text-gray-400">Completado el</span>
              <p class="text-sm text-white m-0">
                {{
                  selectedDocument()?.processed_at | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
            }
          </div>
        </div>
      </div>
      }
    </p-dialog>
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

  // Signals for dialogs
  public showDetailsDialog = signal(false);
  public showCompleteDialog = signal(false);
  public selectedDocument = signal<DocumentRequest | null>(null);

  // Upload signals
  public selectedFile = signal<File | null>(null);
  public isUploading = signal(false);

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Completada', value: 'completed' },
  ];

  public totalCount = computed(() => this.service.value().length);
  public pendingCount = computed(
    () => this.service.value().filter((d) => d.status === 'pending').length
  );
  public completedCount = computed(
    () => this.service.value().filter((d) => d.status === 'completed').length
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

  getDocumentStatusLabel(status: string): string {
    return getStatusLabel(status);
  }

  getDocumentStatusSeverity(status: string): TagSeverity {
    return getStatusSeverity(status);
  }

  viewDetails(document: DocumentRequest): void {
    this.selectedDocument.set(document);
    this.showDetailsDialog.set(true);
  }

  openCompleteDialog(document: DocumentRequest): void {
    this.selectedDocument.set(document);
    this.selectedFile.set(null);
    this.showCompleteDialog.set(true);
  }

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.selectedFile.set(event.files[0]);
    }
  }

  async completeDocument() {
    const doc = this.selectedDocument();
    const file = this.selectedFile();
    const currentEmployee = this.dashboardStore.currentEmployee();

    if (!doc || !file || !currentEmployee) return;

    this.isUploading.set(true);

    try {
      // 1. Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const filePath = `document-requests/${doc.id}/${fileName}`;
      const bucketName = 'employee-documents'; // Changed to 'documents' as per plan

      const formData = new FormData();
      formData.append('file', file);

      await firstValueFrom(
        this.http.post(
          `${getEnv(
            'ENV_SUPABASE_URL'
          )}/storage/v1/object/${bucketName}/${filePath}`,
          formData
        )
      );

      // 2. Construct Public URL
      const documentUrl = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/public/${bucketName}/${filePath}`;

      // 3. Update Request Record
      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests?id=eq.${
            doc.id
          }`,
          {
            status: 'completed',
            processed_by: currentEmployee.id,
            processed_at: new Date().toISOString(),
            document_url: documentUrl,
          }
        )
      );

      // 4. Notify Employee
      await this.notifyEmployee(doc, 'completed');

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Solicitud completada y documento adjuntado',
      });

      this.showCompleteDialog.set(false);
      this.service.reload();
    } catch (error) {
      console.error('Error completing request:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Fallo al procesar la solicitud',
      });
    } finally {
      this.isUploading.set(false);
    }
  }

  private async notifyEmployee(document: DocumentRequest, status: 'completed') {
    const data = {
      employee_id: document.employee_id,
      type: 'document_completed',
      title: 'Solicitud de Documento Completada',
      message: `Tu solicitud de ${this.getDocumentTypeLabel(
        document.document_type
      )} ha sido completada. Puedes descargar el documento adjunto.`,
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
