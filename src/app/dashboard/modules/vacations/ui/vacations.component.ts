import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  SecurityContext,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
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
    DialogModule,
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
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <!-- Header -->
        <div class="p-2 border-b border-neutral-700/50">
          <h3
            class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
          >
            <i class="pi pi-calendar text-cyan-400 text-sm"></i>
            Solicitudes de Vacaciones
          </h3>
        </div>
        <p-table
          [value]="filteredVacations()"
          [paginator]="true"
          [rows]="8"
          [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
          paginatorPosition="bottom"
          [scrollable]="true"
          scrollHeight="600px"
          [responsive]="true"
          styleClass="p-datatable-sm p-datatable-striped"
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
            <tr
              class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
              (click)="viewDetails(vacation)"
            >
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
              <td style="padding: 0.5rem;" (click)="$event.stopPropagation()">
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

    <!-- Diálogo de Detalles de Vacaciones -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar text-cyan-400"></i>
            <span class="text-lg font-semibold text-white">
              Detalles de Solicitud de Vacaciones
            </span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              [icon]="
                selectedVacation()?.document_url
                  ? 'pi pi-file'
                  : 'pi pi-paperclip'
              "
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="
                selectedVacation()?.document_url
                  ? openDocument()
                  : attachDocument()
              "
              [pTooltip]="
                selectedVacation()?.document_url
                  ? 'Ver documento adjunto'
                  : 'Adjuntar documento'
              "
              tooltipPosition="left"
              size="small"
            />
          </div>
        </div>
      </ng-template>

      @if (selectedVacation()) {
      <div class="space-y-4">
        <!-- Información del Empleado -->
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <h4
            class="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2"
          >
            <i class="pi pi-user"></i> Información del Empleado
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-gray-400">Nombre</span>
              <p class="text-sm text-white font-medium m-0">
                {{ selectedVacation()?.employee?.first_name }}
                {{ selectedVacation()?.employee?.father_name }}
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Email</span>
              <p class="text-sm text-white m-0">
                {{ selectedVacation()?.employee?.work_email || '-' }}
              </p>
            </div>
            @if (selectedVacation()?.employee?.position?.name) {
            <div>
              <span class="text-xs text-gray-400">Posición</span>
              <p class="text-sm text-white m-0">
                {{ selectedVacation()?.employee?.position?.name }}
              </p>
            </div>
            } @if (selectedVacation()?.employee?.branch?.name) {
            <div>
              <span class="text-xs text-gray-400">Sucursal</span>
              <p class="text-sm text-cyan-400 m-0">
                {{ selectedVacation()?.employee?.branch?.name }}
              </p>
            </div>
            }
          </div>
        </div>

        <!-- Detalles de la Solicitud -->
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <h4
            class="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2"
          >
            <i class="pi pi-calendar"></i> Detalles de Vacaciones
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-gray-400">Fecha de Inicio</span>
              <p class="text-sm text-white font-medium m-0">
                {{ selectedVacation()?.start_date | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Fecha de Fin</span>
              <p class="text-sm text-white font-medium m-0">
                {{ selectedVacation()?.end_date | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Total de Días</span>
              <p class="text-sm text-cyan-400 font-bold m-0">
                {{
                  calculateDays(
                    selectedVacation()!.start_date,
                    selectedVacation()!.end_date
                  )
                }}
                días
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Estado</span>
              <p-tag
                [value]="getStatusLabel(selectedVacation()!.status)"
                [severity]="getStatusSeverity(selectedVacation()!.status)"
              />
            </div>
          </div>
          @if (selectedVacation()?.reason) {
          <div class="mt-3">
            <span class="text-xs text-gray-400">Motivo</span>
            <p class="text-sm text-gray-300 m-0">
              {{ selectedVacation()?.reason }}
            </p>
          </div>
          }
        </div>

        <!-- Información de Auditoría -->
        <div
          class="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50"
        >
          <h4
            class="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2"
          >
            <i class="pi pi-history"></i> Información de Auditoría
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs text-gray-400">Fecha de Solicitud</span>
              <p class="text-sm text-white m-0">
                {{ selectedVacation()?.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div>
              <span class="text-xs text-gray-400">Creado por</span>
              <p class="text-sm m-0">
                @if (selectedVacation()?.created_by &&
                selectedVacation()?.created_by !==
                selectedVacation()?.employee_id) {
                <span class="text-amber-300">Gerente</span>
                } @else {
                <span class="text-gray-400">Auto-solicitud</span>
                }
              </p>
            </div>
            @if (selectedVacation()?.reviewed_at) {
            <div>
              <span class="text-xs text-gray-400">Fecha de Revisión</span>
              <p class="text-sm text-white m-0">
                {{
                  selectedVacation()?.reviewed_at | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
            } @if (selectedVacation()?.rejection_comment) {
            <div class="col-span-2">
              <span class="text-xs text-gray-400">Comentario de Rechazo</span>
              <p class="text-sm text-red-400 m-0">
                {{ selectedVacation()?.rejection_comment }}
              </p>
            </div>
            }
          </div>
        </div>

        <!-- Acciones -->
        @if (selectedVacation()?.status === 'pending') {
        <div class="flex justify-end gap-2 pt-2 border-t border-neutral-700/50">
          <p-button
            label="Rechazar"
            icon="pi pi-times"
            severity="danger"
            [outlined]="true"
            (onClick)="
              rejectVacation(selectedVacation()!); showDetailsDialog.set(false)
            "
          />
          <p-button
            label="Aprobar"
            icon="pi pi-check"
            severity="success"
            (onClick)="
              approveVacation(selectedVacation()!); showDetailsDialog.set(false)
            "
          />
        </div>
        }
      </div>
      }
    </p-dialog>

    @if (showDocumentPreview()) {
    <div
      class="fixed bg-neutral-900 border-l border-neutral-700 shadow-2xl z-[1200] transition-all duration-500 ease-out"
      [style.width]="'400px'"
      [style.max-width]="'40vw'"
      [style.top]="'50%'"
      [style.left]="showDocumentPreview() ? 'calc(50% + 400px)' : '50%'"
      [style.transform]="
        showDocumentPreview()
          ? 'translateY(-50%) translateX(0) scale(1)'
          : 'translateY(-50%) translateX(0) scale(0.8)'
      "
      [style.opacity]="showDocumentPreview() ? '1' : '0'"
      [style.max-height]="'90vh'"
      [style.height]="'664px'"
      [style.pointer-events]="showDocumentPreview() ? 'auto' : 'none'"
    >
      <div class="flex flex-col h-full">
        <!-- Header del panel lateral -->
        <div
          class="p-4 border-b border-neutral-700 bg-neutral-800 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <i class="pi pi-file text-cyan-400"></i>
            Documento Adjunto
          </h3>
          <div class="flex items-center gap-2">
            @if (selectedVacation()?.document_url) {
            <p-button
              label="Adjuntar nuevo archivo"
              icon="pi pi-upload"
              size="small"
              severity="secondary"
              [outlined]="true"
              (onClick)="attachDocument()"
            />
            }
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="showDocumentPreview.set(false)"
              size="small"
            />
          </div>
        </div>

        <!-- Controlles de Zoom -->
        @if (selectedVacation()?.document_url) {
        <div
          class="p-2 border-b border-neutral-700 bg-neutral-800/50 flex items-center justify-end gap-2"
        >
          <p-button
            icon="pi pi-search-minus"
            (onClick)="zoomOut()"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            size="small"
            [disabled]="documentZoomLevel() <= 0.5"
            pTooltip="Alejar"
          />
          <span class="text-sm text-gray-400 min-w-[60px] text-center">
            {{ (documentZoomLevel() * 100).toFixed(0) }}%
          </span>
          <p-button
            icon="pi pi-search-plus"
            (onClick)="zoomIn()"
            [text]="true"
            [rounded]="true"
            severity="secondary"
            size="small"
            [disabled]="documentZoomLevel() >= 2"
            pTooltip="Acercar"
          />
          <p-button
            label="Reset"
            (onClick)="resetZoom()"
            [text]="true"
            severity="secondary"
            size="small"
            pTooltip="Restablecer zoom"
          />
        </div>
        }

        <!-- Contenido del preview -->
        <div class="flex-1 overflow-hidden bg-neutral-900 relative">
          @if (selectedVacation()?.document_url) {
          <div
            class="w-full h-full overflow-auto flex justify-center p-4"
            [style.align-items]="'flex-start'"
          >
            <div
              [style.transform]="'scale(' + documentZoomLevel() + ')'"
              [style.transform-origin]="'top center'"
              class="transition-transform duration-200"
              style="width: 100%; min-height: 100%;"
            >
              <iframe
                [src]="getVacationDocumentUrl() | safeUrl"
                class="w-full h-[800px] border-0 bg-white rounded-sm"
                title="Preview del documento"
              ></iframe>
            </div>
          </div>
          } @else {
          <div
            class="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <i class="pi pi-file text-6xl text-gray-400 mb-4"></i>
            <h4 class="text-xl font-semibold text-white mb-2">
              No hay documento adjunto
            </h4>
            <p class="text-gray-400 mb-6">
              Puedes adjuntar un documento PDF a esta solicitud.
            </p>
            <p-button
              label="Adjuntar archivo"
              icon="pi pi-upload"
              severity="info"
              (onClick)="attachDocument()"
            />
          </div>
          }
        </div>
      </div>
    </div>
    }

    <!-- Overlay para cerrar el panel al hacer clic fuera -->
    @if (showDocumentPreview()) {
    <div
      class="fixed inset-0 bg-black/50 z-[1199]"
      (click)="showDocumentPreview.set(false)"
    ></div>
    }
  `,
})
export class VacationsComponent {
  public service = inject(VacationsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);
  private http = inject(HttpClient);
  private domSanitizer = inject(DomSanitizer);

  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Signals for details dialog
  public showDetailsDialog = signal(false);
  public selectedVacation = signal<VacationRequest | null>(null);

  // Signals for document preview
  public showDocumentPreview = signal(false);
  public documentZoomLevel = signal(1);

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

  viewDetails(vacation: VacationRequest): void {
    this.selectedVacation.set(vacation);
    this.showDetailsDialog.set(true);
  }

  // Document management methods
  public openDocument(): void {
    if (this.selectedVacation()?.document_url) {
      this.showDocumentPreview.set(true);
    }
  }

  public closeDocumentPreview(): void {
    this.showDocumentPreview.set(false);
  }

  public attachDocument(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        this.uploadDocument(file);
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private async uploadDocument(file: File) {
    if (file.size > 5000000) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Archivo muy grande (>5MB)',
      });
      return;
    }
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Solo PDF',
      });
      return;
    }

    const vacation = this.selectedVacation();
    if (!vacation) return;

    this.messageService.add({
      severity: 'info',
      summary: 'Subiendo...',
      detail: 'Espere por favor',
    });

    try {
      const fileName = `${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        '_'
      )}`;
      const bucketName = 'employee-documents';
      const filePath = `vacations/${vacation.id}/${fileName}`;
      const url = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/${bucketName}/${filePath}`;

      const formData = new FormData();
      formData.append('file', file);

      await firstValueFrom(this.http.post(url, formData));

      const documentUrl = `${getEnv(
        'ENV_SUPABASE_URL'
      )}/storage/v1/object/public/${bucketName}/${filePath}`;

      await firstValueFrom(
        this.http.patch(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_vacations?id=eq.${
            vacation.id
          }`,
          { document_url: documentUrl }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Documento adjunto',
      });
      this.service.reload();

      // Update the local signal directly to reflect changes immediately
      this.selectedVacation.update((current) =>
        current ? { ...current, document_url: documentUrl } : null
      );
    } catch (error) {
      console.error('Upload error', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Fallo al subir documento',
      });
    }
  }

  public zoomIn(): void {
    this.documentZoomLevel.update((v) => Math.min(v + 0.25, 2));
  }

  public zoomOut(): void {
    this.documentZoomLevel.update((v) => Math.max(v - 0.25, 0.5));
  }

  public resetZoom(): void {
    this.documentZoomLevel.set(1);
  }

  public getVacationDocumentUrl() {
    const url = this.selectedVacation()?.document_url;
    return url
      ? this.domSanitizer.sanitize(SecurityContext.RESOURCE_URL, url) || ''
      : '';
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
