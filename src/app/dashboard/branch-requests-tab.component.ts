import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { DatePipe, NgClass } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Branch, Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DocumentViewerCardComponent } from '../shared/components/document-viewer-card.component';
import { EmployeesStore } from '../stores/employees.store';
import { CompensatoryRequest } from './modules/compensatory/ui/compensatory-tab.component';
import {
  getRequestColorClass,
  getRequestIcon,
  getRequestStatusLabel,
  getRequestStatusSeverity,
  getRequestTypeLabel,
  getRequestTypeSeverity,
  getSeverityColor,
} from './request.helpers';

// Helper para parsear fechas de la DB como UTC (evita desfase de -1 día)
const parseUTCDateString = (
  dateStr: string | null | undefined
): Date | null => {
  if (!dateStr) return null;
  // Tomar solo la parte de fecha (YYYY-MM-DD) y forzar interpretación UTC
  const cleanDate = dateStr.split('T')[0];
  return new Date(cleanDate + 'T12:00:00Z'); // Usar mediodía UTC para evitar problemas de zona horaria
};

@Component({
  selector: 'pt-branch-requests-tab',
  standalone: true,
  imports: [
    Dialog,
    TableModule,
    Button,
    Tag,
    Avatar,
    Select,
    FormsModule,
    DatePipe,
    NgClass,
    TooltipModule,
    DocumentViewerCardComponent,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('staggerFade', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger('50ms', [
              animate(
                '0.3s ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  template: `
    <div class="space-y-4 md:space-y-5">
      <!-- Filtros - Moderno -->
      <div
        class="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl"
      >
        <div class="flex gap-2 md:gap-3 items-center flex-wrap w-full md:w-auto">
          <p-select
            [options]="[
              { label: 'Todos los tipos', value: null },
              { label: 'Compensatorio', value: 'compensatorio' },
              { label: 'Incapacidades', value: 'incapacidad' },
              { label: 'Vacaciones', value: 'vacaciones' },
              { label: 'Documentos', value: 'documentos' },
              { label: 'Uniforme', value: 'uniform_request' },
              {
                label: 'Omisión de Marcación',
                value: 'timelog_correction'
              },
              { label: 'Permiso', value: 'work_permit' }
            ]"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="requestTypeFilter"
            placeholder="Tipo de solicitud"
            showClear
            appendTo="body"
            styleClass="w-full sm:w-48"
          />
          <p-select
            [options]="[
              { label: 'Todos los estados', value: null },
              { label: 'Pendiente', value: 'pending' },
              { label: 'Aprobado', value: 'approved' },
              { label: 'Rechazado', value: 'rejected' }
            ]"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="requestStatusFilter"
            placeholder="Estado"
            showClear
            appendTo="body"
            styleClass="w-full sm:w-44"
          />
          <p-button
            icon="pi pi-refresh"
            [label]="isMobile() ? undefined : 'Actualizar'"
            [outlined]="true"
            severity="secondary"
            (onClick)="reload()"
            [loading]="
              compensatoryTimeoffsApi.isLoading() ||
              disabilitiesApi.isLoading() ||
              vacationsApi.isLoading() ||
              documentRequestsApi.isLoading() ||
              workPermitsApi.isLoading()
            "
            styleClass="rounded-xl"
          />
        </div>
        <div
          class="flex items-center gap-2 bg-white/5 rounded-full px-3 md:px-4 py-2"
        >
          <i class="pi pi-list text-indigo-400"></i>
          <span class="text-sm font-medium text-gray-300">
            {{ filteredBranchEmployeeRequests().length }}
            <span class="text-gray-500 hidden sm:inline">solicitud(es)</span>
          </span>
        </div>
      </div>

      <!-- Loading State -->
      @if (compensatoryTimeoffsApi.isLoading() ||
      disabilitiesApi.isLoading() || vacationsApi.isLoading() ||
      documentRequestsApi.isLoading() || workPermitsApi.isLoading()) {
      <div class="flex flex-col items-center justify-center py-16">
        <div
          class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4"
        >
          <i class="pi pi-spin pi-spinner text-2xl text-indigo-400"></i>
        </div>
        <p class="text-gray-400">Cargando solicitudes...</p>
      </div>
      }

      <!-- Empty State -->
      @else if (filteredBranchEmployeeRequests().length === 0) {
      <div
        class="flex flex-col items-center justify-center py-16 bg-white/5 rounded-2xl border border-white/10"
      >
        <div
          class="w-20 h-20 rounded-2xl bg-gray-500/10 flex items-center justify-center mb-4"
        >
          <i class="pi pi-inbox text-3xl text-gray-500"></i>
        </div>
        <p class="text-gray-300 text-lg font-medium mb-1">
          No hay solicitudes
        </p>
        <p class="text-gray-500 text-sm">
          Las solicitudes creadas en "Gestiones" aparecerán aquí
        </p>
      </div>
      }

      <!-- Requests List -->
      @else {
      <div class="grid grid-cols-1 gap-3 md:gap-4" @staggerFade>
        @for (request of unifiedRequests(); track request.id) {
        <div
          class="group relative overflow-hidden border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:scale-[1.005] cursor-pointer bg-white/5 backdrop-blur-sm"
          @scaleIn
          (click)="viewRequestDetails(request)"
        >
          <div
            class="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            [ngClass]="request.unified.colorClassBg"
          ></div>
          <div class="relative flex items-start justify-between gap-2 md:gap-4">
            <div class="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
              <!-- Icono unificado -->
              <div
                class="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
                [ngClass]="request.unified.colorClassBg"
              >
                <i
                  class="pi text-base md:text-lg"
                  [ngClass]="[
                    request.unified.icon,
                    request.unified.colorClassActive
                  ]"
                ></i>
              </div>

              <div class="flex-1 min-w-0">
                <!-- Header con tipo, estado y fecha -->
                <div class="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                  <p-tag
                    [value]="request.unified.typeLabel"
                    [severity]="request.unified.typeSeverity"
                    styleClass="text-xs"
                  />
                  <p-tag
                    [value]="request.unified.statusLabel"
                    [severity]="request.unified.statusSeverity"
                    styleClass="text-xs"
                  />
                  <span class="text-xs text-gray-400 hidden sm:inline">
                    {{ request.created_at | date : 'dd/MM/yyyy HH:mm' }}
                  </span>
                  <span class="text-xs text-gray-400 sm:hidden">
                    {{ request.created_at | date : 'dd/MM/yy' }}
                  </span>
                </div>

                <!-- Información del empleado -->
                <div class="flex items-center gap-2 mb-1.5 md:mb-2">
                  <p-avatar
                    [label]="getEmployeeInitials(request.employee)"
                    shape="circle"
                    styleClass="text-xs"
                    size="normal"
                  />
                  <span class="text-sm font-semibold text-white truncate">
                    {{ request.employee?.first_name }}
                    {{ request.employee?.father_name }}
                  </span>
                </div>

                <!-- Detalles unificados -->
                <div class="text-xs md:text-sm text-gray-300">
                  <p class="font-medium text-white mb-1 truncate">
                    {{ request.unified.summary }}
                  </p>
                  <p class="truncate">
                    <span class="text-gray-400"
                      >{{
                        request.requestType === 'compensatorio'
                          ? 'Fecha del compensatorio'
                          : request.unified.displayDateLabel
                      }}:</span
                    >
                    {{ request.unified.displayDate }}
                  </p>
                  @let reason = request.reason || request.description ||
                  request.notes; @if (reason) {
                  <p class="truncate max-w-[200px] sm:max-w-md">
                    <span class="text-gray-400">Motivo:</span>
                    {{ reason }}
                  </p>
                  }
                </div>

                <!-- Indicador de documento adjunto -->
                @if (request.document_url ||
                request.metadata?.attachment_url) {
                <div
                  class="mt-2 flex items-center gap-1 text-xs text-gray-400"
                >
                  <i class="pi pi-paperclip"></i>
                  <span class="hidden sm:inline">Documento adjunto</span>
                  <span class="sm:hidden">Adjunto</span>
                </div>
                }
              </div>
            </div>

            <!-- Botón para ver detalles -->
            <p-button
              icon="pi pi-eye"
              severity="secondary"
              text
              rounded
              size="small"
              pTooltip="Ver detalles"
              (onClick)="
                viewRequestDetails(request); $event.stopPropagation()
              "
            />
          </div>
        </div>
        }
      </div>
      }
    </div>

    <!-- Diálogo de Detalles de Solicitud -->
    <p-dialog
      [(visible)]="showRequestDetailsDialog"
      [modal]="true"
      [style]="{ width: isMobile() ? '98vw' : '95vw', maxWidth: '1200px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [maximizable]="isMobile()"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white">
            Detalles de Solicitud -
            {{
              selectedRequest()?.unified?.typeLabel ||
                getRequestTypeLabel(selectedRequest()?.requestType)
            }}
          </span>
          @if (selectedRequest()?.document_url ||
          selectedRequest()?.metadata?.attachment_url) {
          <!-- Document existing indicator handled in layout -->
          }
        </div>
      </ng-template>

      @if (selectedRequest()) {
      <div
        class="grid transition-all duration-500 pt-2 md:pt-4"
        [ngClass]="{
          'grid-cols-1': !hasDocument(),
          'grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6': hasDocument()
        }"
      >
        <!-- Columna Información -->
        <div class="space-y-4">
          <!-- Información del Empleado -->
          <div
            class="p-3 md:p-4 rounded-lg border transition-all duration-300 w-full"
            [ngClass]="
              selectedRequest().unified?.colorClassBg ||
              'bg-neutral-800 border-neutral-700'
            "
          >
            <h3
              class="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2"
            >
              <i
                class="pi pi-user"
                [style.color]="
                  getSeverityColor(selectedRequest().unified?.typeSeverity)
                "
              ></i>
              Información del Empleado
            </h3>
            <div class="flex flex-col sm:flex-row gap-4 md:gap-6">
              <!-- Lado izquierdo: Avatar y Datos Principales -->
              <div class="flex items-center gap-3 md:gap-4 min-w-0 sm:min-w-[180px]">
                <p-avatar
                  [label]="getEmployeeInitials(selectedRequest().employee)"
                  shape="circle"
                  [size]="isMobile() ? 'large' : 'xlarge'"
                  [style]="{
                    'background-color':
                      getSeverityColor(
                        selectedRequest().unified?.typeSeverity
                      ) + '20',
                    color: getSeverityColor(
                      selectedRequest().unified?.typeSeverity
                    )
                  }"
                />
                <div class="min-w-0">
                  <p class="text-lg md:text-xl font-bold text-white leading-tight truncate">
                    {{ selectedRequest().employee?.first_name }}
                    {{ selectedRequest().employee?.father_name }}
                  </p>
                  <p class="text-xs md:text-sm text-gray-400 truncate">
                    {{
                      selectedRequest().employee?.work_email ||
                        'Sin email registrado'
                    }}
                  </p>
                </div>
              </div>

              <!-- Lado derecho: Detalles Secundarios -->
              <div
                class="flex-1 grid grid-cols-2 gap-3 md:gap-4 pt-3 sm:pt-0 sm:pl-4 md:pl-6 border-t sm:border-t-0 sm:border-l border-neutral-700/50"
              >
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Cargo</label
                  >
                  <p
                    class="text-white font-medium break-words whitespace-normal"
                  >
                    {{
                      selectedRequest().employee?.position?.name ||
                        'No especificado'
                    }}
                  </p>
                </div>
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Sucursal</label
                  >
                  <p
                    class="text-white font-medium break-words whitespace-normal"
                  >
                    {{
                      selectedRequest().employee?.branch?.name ||
                        'No especificada'
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Detalles de la Solicitud -->
          <div
            class="p-3 md:p-4 rounded-lg border transition-all duration-300"
            [ngClass]="
              selectedRequest().unified?.colorClassBg ||
              'bg-neutral-800 border-neutral-700'
            "
          >
            <h3
              class="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2"
            >
              <i
                class="pi"
                [ngClass]="selectedRequest().unified?.icon || 'pi-file-edit'"
                [style.color]="
                  getSeverityColor(selectedRequest().unified?.typeSeverity)
                "
              ></i>
              Detalle de la Solicitud
            </h3>
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <!-- Estado -->
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Estado</label
                  >
                  <p-tag
                    [value]="
                      selectedRequest().unified?.statusLabel ||
                      getRequestStatusLabel(selectedRequest())
                    "
                    [severity]="
                      selectedRequest().unified?.statusSeverity ||
                      getRequestStatusSeverity(selectedRequest())
                    "
                  />
                </div>

                <!-- Fecha de Solicitud -->
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Fecha de Solicitud</label
                  >
                  <p class="text-white font-medium">
                    {{
                      selectedRequest().created_at | date : 'dd/MM/yyyy HH:mm'
                    }}
                  </p>
                </div>

                <!-- Motivo de Rechazo (si aplica) -->
                @if ((selectedRequest().status === 'rejected' ||
                selectedRequest().review_status === 'rejected') &&
                (selectedRequest().rejection_comment ||
                selectedRequest().notes)) {
                <div class="col-span-1 md:col-span-2">
                  <div
                    class="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
                  >
                    <h4
                      class="text-red-300 font-semibold mb-2 flex items-center gap-2"
                    >
                      <i class="pi pi-exclamation-circle text-red-400"></i>
                      Motivo del Rechazo
                    </h4>
                    <p class="text-red-200 text-sm whitespace-pre-wrap">
                      {{
                        selectedRequest().rejection_comment ||
                          selectedRequest().notes
                      }}
                    </p>
                  </div>
                </div>
                }
              </div>

              <!-- Resumen y Detalles unificados -->
              <div class="pt-3 md:pt-4 border-t border-neutral-700/50">
                <div class="mb-3 md:mb-4">
                  <p class="text-base md:text-lg font-bold text-white">
                    {{ selectedRequest().unified?.summary }}
                  </p>
                </div>
                <div
                  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                >
                  @for (detail of selectedRequest().unified?.details; track
                  detail.label) {
                  <div
                    [class.lg:col-span-1]="
                      detail.label === 'Fecha del compensatorio' ||
                      detail.label === 'Tipo' ||
                      detail.label === 'Cantidad'
                    "
                    [class.md:col-span-2]="
                      detail.label === 'Notas' ||
                      detail.label === 'Descripción' ||
                      detail.label === 'Razón'
                    "
                  >
                    <label
                      class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                      >{{ detail.label }}</label
                    >
                    <p
                      class="text-white text-base break-words whitespace-normal"
                    >
                      {{ detail.value }}
                    </p>
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Información de Creación -->
          @if (selectedRequest().created_by) {
          <div
            class="p-3 md:p-4 rounded-lg border transition-all duration-300"
            [ngClass]="
              selectedRequest().unified?.colorClassBg ||
              'bg-neutral-800 border-neutral-700'
            "
          >
            <h3
              class="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2"
            >
              <i
                class="pi pi-info-circle"
                [style.color]="
                  getSeverityColor(selectedRequest().unified?.typeSeverity)
                "
              ></i>
              Información de Creación
            </h3>
            <div>
              <label
                class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                >Origen de la Solicitud</label
              >
              <p class="text-white font-medium">
                @if (selectedRequest().created_by !==
                selectedRequest().employee_id) { Gerente de Tienda /
                Administrador } @else { Auto-solicitud del empleado }
              </p>
            </div>
          </div>
          }
        </div>

        <!-- Documento Adjunto (Columna Derecha) -->
        @if (hasDocument()) {
        <div class="h-full mt-4 lg:mt-0">
          <pt-document-viewer-card
            [documentUrl]="
              selectedRequest()?.document_url ||
              selectedRequest()?.metadata?.attachment_url
            "
            [title]="'Documento Adjunto'"
            (download)="downloadDocument($event)"
          />
        </div>
        }
      </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cerrar"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="showRequestDetailsDialog.set(false)"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BranchRequestsTabComponent {
  private readonly apiUrl = inject(ApiUrlService);
  private readonly organizationService = inject(OrganizationService);
  private readonly employeesStore = inject(EmployeesStore);

  // Inputs
  public branchEmployees =
    input.required<(Employee & { short_name: string })[]>();
  public currentBranch = input<Branch | null>();
  public isMobile = input<boolean>(false);

  // Outputs
  public pendingCountChange = output<number>();
  public requestCreated = output<void>();

  // Signals
  public requestTypeFilter = signal<string | null>(null);
  public requestStatusFilter = signal<string | null>(null);
  public showRequestDetailsDialog = signal(false);
  public selectedRequest = signal<any>(null);
  public requestRejectionComment = signal('');
  public showDocumentPreview = signal(false);

  // ── HTTP Resources ──────────────────────────────────────────────

  // Compensatory timeoffs API
  public compensatoryTimeoffsApi = httpResource<CompensatoryRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `id,employee_id,type_id,date_from,date_to,notes,is_approved,compensatory_type,compensatory_amount,review_status,reviewed_by,reviewed_at,rejection_comment,created_at,company_id,document_url,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,company_id,branch_id,position:positions(name),branch:branches(name))`,
      company_id: `eq.${companyId}`,
      type_id: `eq.${compensatoryTypeId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/timeoffs'),
      params: params,
      method: 'GET',
    };
  });

  // Employee Disabilities API
  public disabilitiesApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `*`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities'),
      params: params,
      method: 'GET',
    };
  });

  // Employee Vacations API
  public vacationsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `*`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/employee_vacations'),
      params: params,
      method: 'GET',
    };
  });

  // Work Permits API
  public workPermitsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `id,employee_id,permit_type,start_date,end_date,start_time,end_time,equivalent_value,equivalent_unit,observations,status,reviewed_by,reviewed_at,rejection_comment,document_url,created_by,created_at,company_id,employee:employees!work_permits_employee_id_fkey(id,first_name,father_name,work_email,company_id,branch_id,position:positions(name),branch:branches(name))`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/work_permits'),
      params: params,
      method: 'GET',
    };
  });

  // Document Requests API
  public documentRequestsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `*`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/document_requests'),
      params: params,
      method: 'GET',
    };
  });

  // ── Computeds ───────────────────────────────────────────────────

  // Combinar todas las solicitudes de empleados de la sucursal
  public branchEmployeeRequests = computed(() => {
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!branchId || !companyId) return [];

    // Obtener empleados de la sucursal actual
    const branchEmployeeIds = new Set(
      this.branchEmployees().map((e) => e.id)
    );

    // Compensatory: viene con employee join desde compensatoryTimeoffsApi
    const compensatory = (this.compensatoryTimeoffsApi.value() || [])
      .filter((r) => r.employee?.branch_id === branchId)
      .map((r) => {
        const reviewerId = r.reviewed_by;
        const reviewer = reviewerId
          ? this.employeesStore.entityMap()[reviewerId]
          : null;

        return {
          ...r,
          reviewedByEmployee: reviewer
            ? `${reviewer.first_name} ${reviewer.father_name}`
            : r.reviewed_by,
          requestType: 'compensatorio' as const,
        };
      });

    // Disabilities: enriquecer con datos del empleado
    const disabilities = (this.disabilitiesApi.value() || [])
      .filter((r) => branchEmployeeIds.has(r.employee_id))
      .map((r) => {
        const employee = this.employeesStore.entityMap()[r.employee_id];
        const reviewerId = r.reviewed_by;
        const reviewer = reviewerId
          ? this.employeesStore.entityMap()[reviewerId]
          : null;

        return {
          ...r,
          employee: employee || undefined,
          reviewedByEmployee: reviewer
            ? `${reviewer.first_name} ${reviewer.father_name}`
            : r.reviewed_by,
          requestType: 'incapacidad' as const,
        };
      });

    // Vacations: enriquecer con datos del empleado
    const vacations = (this.vacationsApi.value() || [])
      .filter((r) => branchEmployeeIds.has(r.employee_id))
      .map((r) => {
        const employee = this.employeesStore.entityMap()[r.employee_id];
        const reviewerId = r.reviewed_by;
        const reviewer = reviewerId
          ? this.employeesStore.entityMap()[reviewerId]
          : null;

        return {
          ...r,
          employee: employee || undefined,
          reviewedByEmployee: reviewer
            ? `${reviewer.first_name} ${reviewer.father_name}`
            : r.reviewed_by,
          requestType: 'vacaciones' as const,
        };
      });

    // Documents: enriquecer con datos del empleado y determinar el tipo correcto
    const documents = (this.documentRequestsApi.value() || [])
      .filter((r) => branchEmployeeIds.has(r.employee_id))
      .map((r) => {
        const employee = this.employeesStore.entityMap()[r.employee_id];
        const reviewerId = r.reviewed_by;
        const reviewer = reviewerId
          ? this.employeesStore.entityMap()[reviewerId]
          : null;

        // Determine the correct request type based on document_type
        let requestType:
          | 'documentos'
          | 'uniform_request'
          | 'timelog_correction' = 'documentos';
        if (r.document_type === 'uniform_request') {
          requestType = 'uniform_request';
        } else if (r.document_type === 'timelog_correction') {
          requestType = 'timelog_correction';
        }

        return {
          ...r,
          employee: employee || undefined,
          reviewedByEmployee: reviewer
            ? `${reviewer.first_name} ${reviewer.father_name}`
            : r.reviewed_by,
          requestType,
          status: r.status || 'pending',
        };
      });

    // Work Permits: viene con employee join desde workPermitsApi
    const workPermits = (this.workPermitsApi.value() || [])
      .filter((r) => r.employee?.branch_id === branchId)
      .map((r) => {
        const reviewerId = r.reviewed_by;
        const reviewer = reviewerId
          ? this.employeesStore.entityMap()[reviewerId]
          : null;

        return {
          ...r,
          reviewedByEmployee: reviewer
            ? `${reviewer.first_name} ${reviewer.father_name}`
            : r.reviewed_by,
          requestType: 'work_permit' as const,
        };
      });

    // Combinar y ordenar por fecha de creación
    return [...compensatory, ...disabilities, ...vacations, ...documents, ...workPermits].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  // Filtered branch employee requests
  public filteredBranchEmployeeRequests = computed(() => {
    let requests = this.branchEmployeeRequests();

    const typeFilter = this.requestTypeFilter();
    if (typeFilter) {
      requests = requests.filter((r) => r.requestType === typeFilter);
    }

    const statusFilter = this.requestStatusFilter();
    if (statusFilter) {
      requests = requests.filter((r) => {
        const status = r.status || r.review_status;
        return status === statusFilter;
      });
    }

    return requests;
  });

  // Unified requests mapping for display
  public unifiedRequests = computed(() => {
    return this.filteredBranchEmployeeRequests().map((r) => {
      let displayDate = '';
      let displayDateLabel = 'Fecha';
      let summary = '';
      let details: { label: string; value: string }[] = [];
      let cleanReason = '';

      if (r.requestType === 'compensatorio') {
        const fromDate = parseUTCDateString(r.date_from);
        const toDateVal = parseUTCDateString(r.date_to);
        const from = fromDate ? format(fromDate, 'dd/MM/yyyy') : '-';
        const to = toDateVal ? format(toDateVal, 'dd/MM/yyyy') : '-';

        if (r.compensatory_type === 'hours' || from === to) {
          displayDate = from;
          displayDateLabel = 'Fecha del compensatorio';
        } else {
          displayDate = `${from} – ${to}`;
          displayDateLabel = 'Período del compensatorio';
        }
        summary = 'Compensatorio';
        details = [
          {
            label: 'Fecha del compensatorio',
            value: displayDate,
          },
          {
            label: 'Tipo',
            value: r.compensatory_type === 'hours' ? 'Horas' : 'Días',
          },
          {
            label: 'Cantidad',
            value: `${r.compensatory_amount} ${
              r.compensatory_type === 'hours' ? 'hora(s)' : 'día(s)'
            }`,
          },
        ];
        if (r.notes) {
          if (Array.isArray(r.notes)) {
            const reasonNote = r.notes.find(
              (note: any) =>
                typeof note === 'string' &&
                note.trim() !== '' &&
                !note.includes('Tipo:') &&
                !note.includes('Cantidad solicitada:') &&
                !note.includes('Fecha compensatorio:') &&
                !note.includes('Hora inicio:') &&
                !note.includes('Hora fin:') &&
                !note.includes('Fechas horas extra:')
            );
            if (reasonNote) cleanReason = reasonNote;
          } else if (typeof r.notes === 'string') {
            const parts = r.notes.split(',');
            const cleanParts = parts
              .map((p: string) => p.trim())
              .filter(
                (p: string) =>
                  p !== '' &&
                  !p.startsWith('Tipo:') &&
                  !p.startsWith('Cantidad solicitada:') &&
                  !p.startsWith('Fecha compensatorio:') &&
                  !p.startsWith('Hora inicio:') &&
                  !p.startsWith('Hora fin:') &&
                  !p.startsWith('Fechas horas extra:')
              );
            cleanReason = cleanParts.join(', ');
          }
        }

        if (cleanReason) {
          details.push({ label: 'Notas', value: cleanReason });
        }
      } else if (r.requestType === 'incapacidad') {
        const startDate = parseUTCDateString(r.start_date);
        const endDate = parseUTCDateString(r.end_date);
        const start = startDate ? format(startDate, 'dd/MM/yyyy') : '-';
        const end = endDate ? format(endDate, 'dd/MM/yyyy') : '-';

        if (start === end) {
          displayDate = start;
          displayDateLabel = 'Fecha';
        } else {
          displayDate = `${start} – ${end}`;
          displayDateLabel = 'Período';
        }
        summary = 'Incapacidad Médica';
        details = [
          { label: 'Fecha de Inicio', value: start },
          { label: 'Fecha de Fin', value: end },
        ];
        if (r.description)
          details.push({ label: 'Descripción', value: r.description });
      } else if (r.requestType === 'vacaciones') {
        const startDate = parseUTCDateString(r.start_date);
        const endDate = parseUTCDateString(r.end_date);
        const start = startDate ? format(startDate, 'dd/MM/yyyy') : '-';
        const end = endDate ? format(endDate, 'dd/MM/yyyy') : '-';

        if (start === end) {
          displayDate = start;
          displayDateLabel = 'Fecha';
        } else {
          displayDate = `${start} – ${end}`;
          displayDateLabel = 'Período';
        }
        summary = 'Vacaciones';
        if (r.reason) details.push({ label: 'Razón', value: r.reason });
      } else if (r.requestType === 'documentos') {
        const reqDate = parseUTCDateString(r.required_date);
        displayDate = reqDate ? format(reqDate, 'dd/MM/yyyy') : '-';
        summary = r.document_type || 'Solicitud de Documento';
        details = [{ label: 'Fecha requerida', value: displayDate }];
        if (r.reason) details.push({ label: 'Razón', value: r.reason });
      } else if (r.requestType === 'uniform_request') {
        const metadata = r.metadata || {};
        displayDate = r.created_at
          ? format(new Date(r.created_at), 'dd/MM/yyyy')
          : '-';
        const itemType = metadata.item_type || 'Prenda';
        const size = metadata.size || '-';
        const quantity = metadata.quantity || 1;
        summary = `${quantity}x ${itemType} - Talla ${size}`;
        details = [
          { label: 'Prenda', value: itemType },
          { label: 'Talla', value: size },
          { label: 'Cantidad', value: String(quantity) },
        ];
        if (r.reason) details.push({ label: 'Notas', value: r.reason });
      } else if (r.requestType === 'timelog_correction') {
        const metadata = r.metadata || {};
        const timelogDateParsed = parseUTCDateString(metadata.timelog_date);
        const timelogDate = timelogDateParsed
          ? format(timelogDateParsed, 'dd/MM/yyyy')
          : '-';
        displayDate = timelogDate;
        const timelogTypeLabels: Record<string, string> = {
          entry: 'Entrada',
          lunch_start: 'Inicio Almuerzo',
          lunch_end: 'Fin Almuerzo',
          exit: 'Salida',
        };
        const timelogTypeLabel =
          timelogTypeLabels[metadata.timelog_type] ||
          metadata.timelog_type ||
          '-';
        summary = `Corrección de ${timelogTypeLabel}`;
        details = [
          { label: 'Fecha', value: timelogDate },
          { label: 'Tipo de Marcación', value: timelogTypeLabel },
        ];
        if (r.reason) details.push({ label: 'Motivo', value: r.reason });
        if (metadata.attachment_url)
          details.push({ label: 'Adjunto', value: 'Sí' });
      } else if (r.requestType === 'work_permit') {
        const startDate = parseUTCDateString(r.start_date);
        const endDate = parseUTCDateString(r.end_date);
        const start = startDate ? format(startDate, 'dd/MM/yyyy') : '-';
        const end = endDate ? format(endDate, 'dd/MM/yyyy') : '-';

        if (start === end) {
          displayDate = start;
          displayDateLabel = 'Fecha';
        } else {
          displayDate = `${start} – ${end}`;
          displayDateLabel = 'Período';
        }

        const permitTypeLabels: Record<string, string> = {
          family_death: 'Defunción',
          personal: 'Personal',
          medical: 'Tema Médico',
          other: 'Otros',
        };
        const permitLabel = permitTypeLabels[r.permit_type] || r.permit_type || 'Permiso';
        summary = `Permiso - ${permitLabel}`;
        details = [
          { label: 'Tipo de Permiso', value: permitLabel },
          { label: 'Fecha de Inicio', value: start },
          { label: 'Fecha de Fin', value: end },
        ];
        if (r.start_time && r.end_time) {
          details.push({ label: 'Horario', value: `${r.start_time} – ${r.end_time}` });
        }
        if (r.equivalent_value) {
          const unit = r.equivalent_unit === 'hours' ? 'hora(s)' : 'día(s)';
          details.push({ label: 'Equivalente', value: `${r.equivalent_value} ${unit}` });
        }
        if (r.observations) details.push({ label: 'Observaciones', value: r.observations });
      }

      return {
        ...r,
        reason:
          r.requestType === 'compensatorio' && cleanReason
            ? cleanReason
            : r.reason,
        unified: {
          displayDate,
          displayDateLabel,
          summary,
          details,
          statusLabel: this.getRequestStatusLabel(r),
          statusSeverity: this.getRequestStatusSeverity(r),
          typeLabel: this.getRequestTypeLabel(r.requestType),
          typeSeverity: this.getRequestTypeSeverity(r.requestType),
          icon: this.getRequestIcon(r.requestType),
          colorClassActive: this.getRequestColorClass(r.requestType, true),
          colorClassBg: this.getRequestColorClass(r.requestType, false),
        },
      };
    });
  });

  // Has document computed
  public hasDocument = computed(() => {
    const req = this.selectedRequest();
    return !!(req?.document_url || req?.metadata?.attachment_url);
  });

  // Pending requests count
  public pendingRequestsCount = computed(() => {
    return this.branchEmployeeRequests().filter((r) => {
      const status = r.status || r.review_status;
      return status === 'pending';
    }).length;
  });

  constructor() {
    // Emit pending count changes to parent
    effect(() => {
      this.pendingCountChange.emit(this.pendingRequestsCount());
    });
  }

  // ── Helper methods (delegated to shared functions) ──────────────

  public getRequestIcon = getRequestIcon;
  public getRequestColorClass = getRequestColorClass;
  public getRequestStatusLabel = getRequestStatusLabel;
  public getRequestStatusSeverity = getRequestStatusSeverity;
  public getRequestTypeLabel = getRequestTypeLabel;
  public getRequestTypeSeverity = getRequestTypeSeverity;
  public getSeverityColor = getSeverityColor;

  public getEmployeeInitials(
    employee?: Employee | { first_name?: string; father_name?: string }
  ): string {
    if (!employee) return '?';
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  public viewRequestDetails(request: any): void {
    this.selectedRequest.set(request);
    this.requestRejectionComment.set(request.rejection_comment || '');
    this.showRequestDetailsDialog.set(true);
  }

  public downloadDocument(url: string): void {
    window.open(url, '_blank');
  }

  // ── Public methods ──────────────────────────────────────────────

  public reload(): void {
    this.compensatoryTimeoffsApi.reload();
    this.disabilitiesApi.reload();
    this.vacationsApi.reload();
    this.documentRequestsApi.reload();
    this.workPermitsApi.reload();
  }
}
