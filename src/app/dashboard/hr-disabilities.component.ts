import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    endOfDay,
    format,
    startOfDay,
    subDays,
} from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { ScheduleAutoAssignService } from '../services/schedule-auto-assign.service';
import {
    TimeoffAuditLog,
    TimeoffAuditService,
} from '../services/timeoff-audit.service';
import { ApiUrlService } from '../services/api-url.service';
import { DashboardStore } from '../stores/dashboard.store';
import { DocumentRequestsService } from './modules/document-requests/data/document-requests.service';
import { DeviceService } from '../services/device.service';
import { DocumentRequestsComponent } from './modules/document-requests/ui/document-requests.component';
import { TimelogCorrectionsComponent } from './modules/timelog-corrections/ui/timelog-corrections.component';
import { WorkPermitsComponent } from './modules/work-permits/ui/work-permits.component';
import { WorkPermitsService } from './modules/work-permits/data/work-permits.service';
import { VacationsService } from './modules/vacations/data/vacations.service';
import { VacationsComponent } from './modules/vacations/ui/vacations.component';
import {
    getCompensatoryQuantity as _getCompensatoryQuantity,
    getCompensatoryReasonFromNotes as _getCompensatoryReasonFromNotes,
    getManualOvertimeDates as _getManualOvertimeDates,
    parseDDMMYYYYToISO as _parseDDMMYYYYToISO,
} from './modules/shared/utils/compensatory-parsing.utils';
import {
    sumConsumedHoursByDay as _sumConsumedHoursByDay,
    processTimelogsForOvertime as _processTimelogsForOvertime,
    extractOvertimeDays as _extractOvertimeDays,
} from './modules/shared/utils/overtime-calculation.utils';
import { HrDisabilitiesService } from './modules/disabilities/data/hr-disabilities.service';
import { DisabilitiesTabComponent } from './modules/disabilities/ui/disabilities-tab.component';
import { CompensatoryTabComponent } from './modules/disabilities/ui/compensatory-tab.component';
import { RejectionDialogComponent } from './modules/shared/components/rejection-dialog.component';
import { AuditHistoryDialogComponent } from './modules/shared/components/audit-history-dialog.component';
import { DisabilityDetailsDialogComponent } from './modules/disabilities/ui/disability-details-dialog.component';
import { CompensatoryDetailsDialogComponent } from './modules/disabilities/ui/compensatory-details-dialog.component';
import {
    Disability,
    CompensatoryRequest,
} from './modules/disabilities/models/disability.model';

// Re-export for branch-manager.component.ts backwards compatibility
export { CompensatoryRequest } from './modules/disabilities/models/disability.model';

@Component({
  selector: 'pt-hr-disabilities',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    DocumentRequestsComponent,
    VacationsComponent,
    TimelogCorrectionsComponent,
    WorkPermitsComponent,
    DisabilitiesTabComponent,
    CompensatoryTabComponent,
    RejectionDialogComponent,
    DisabilityDetailsDialogComponent,
    CompensatoryDetailsDialogComponent,
    AuditHistoryDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <!-- Diálogo de Rechazo de Incapacidad -->
    <pt-rejection-dialog
      [(visible)]="showDisabilityRejectionDialog"
      title="Confirmar Rechazo de Incapacidad"
      description="Por favor, indica el motivo del rechazo de esta incapacidad."
      [updating]="updatingDisabilityStatus()"
      (confirm)="onDisabilityRejectionConfirm($event)"
    />

    <!-- Diálogo de Rechazo de Tiempo Compensatorio -->
    <pt-rejection-dialog
      [(visible)]="showCompensatoryRejectionDialog"
      title="Confirmar Rechazo de Tiempo Compensatorio"
      description="Por favor, indica el motivo del rechazo de esta solicitud de tiempo compensatorio."
      [updating]="updatingCompensatoryStatus()"
      (confirm)="onCompensatoryRejectionConfirm($event)"
    />

    <div
      class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden"
    >
      @if (device.isDesktop()) {
      <!-- Header Compacto con Búsqueda Global (Desktop) -->
      <div
        class="bg-gradient-to-r from-neutral-800 via-neutral-800/95 to-neutral-800 border-b border-neutral-700/50 shadow-xl sticky top-0 z-40 backdrop-blur-sm"
      >
        <div class="px-4 py-2">
          <div class="flex items-center justify-between mb-2 gap-4">
            <div class="flex-1 min-w-0">
              <h1
                class="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent m-0"
              >
                Dashboard de RRHH
              </h1>
              <p
                class="text-xs text-gray-400 m-0 mt-0.5 flex items-center gap-1.5"
              >
                <i class="pi pi-shield text-cyan-400 text-xs"></i>
                <span class="truncate"
                  >Gestión integral de solicitudes y tiempo compensatorio</span
                >
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <p-button
                icon="pi pi-shield"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="openAuditHistoryDialog()"
                pTooltip="Ver historial de auditoría completo"
                tooltipPosition="bottom"
              />
              <p-button
                icon="pi pi-download"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="exportData()"
                [disabled]="isRefreshing()"
                pTooltip="Exportar datos a Excel"
                tooltipPosition="bottom"
              />
              <p-button
                icon="pi pi-refresh"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="refreshAll()"
                [loading]="isRefreshing()"
                pTooltip="Actualizar todos los datos"
                tooltipPosition="bottom"
              />
            </div>
          </div>

          <!-- Búsqueda Global Compacta -->
          <div class="relative">
            <input
              type="text"
              pInputText
              placeholder="🔍 Búsqueda rápida: empleado, email, descripción, motivo..."
              [(ngModel)]="globalSearchText"
              (input)="onGlobalSearch()"
              class="w-full pl-10 pr-8 py-1.5 text-sm bg-neutral-900/50 border-neutral-600 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />
            <i
              class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            ></i>
            @if (globalSearchText()) {
            <button
              (click)="clearGlobalSearch()"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
            }
          </div>
        </div>
      </div>

      <div class="px-4 py-2 space-y-2 flex-1 overflow-y-auto">
        <!-- Pestañas Compactas -->
        <div
          class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-0.5 backdrop-blur-sm"
        >
          <div class="flex gap-1 flex-wrap">
            <button
              (click)="activeTab.set('disabilities')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'disabilities'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-heart mr-1.5 text-xs"></i>
              Incapacidades @if (pendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ pendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="activeTab.set('compensatory')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'compensatory'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-clock mr-1.5 text-xs"></i>
              Tiempo Compensatorio @if (compensatoryPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ compensatoryPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('documents')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'documents'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-file-edit mr-1.5 text-xs"></i>
              Solicitudes de Documentos @if (documentsPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ documentsPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('vacations')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'vacations'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-calendar mr-1.5 text-xs"></i>
              Vacaciones @if (vacationsPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ vacationsPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('timelog_correction')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'timelog_correction'
                  ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 shadow-md border border-orange-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-exclamation-triangle mr-1.5 text-xs"></i>
              Omisión de Marcación @if (timelogCorrectionPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ timelogCorrectionPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('work_permits')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'work_permits'
                  ? 'bg-gradient-to-r from-violet-500/20 to-violet-600/20 text-violet-300 shadow-md border border-violet-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-id-card mr-1.5 text-xs"></i>
              Permisos @if (workPermitsPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ workPermitsPendingCount() }}
              </span>
              }
            </button>
          </div>
        </div>

        @if (activeTab() === 'disabilities') {
        <pt-disabilities-tab
          [disabilities]="disabilitiesApi.value() ?? []"
          [loading]="disabilitiesApi.isLoading()"
          [globalSearch]="globalSearchText()"
          [updatingStatus]="updatingDisabilityStatus()"
          (viewDetails)="viewDetails($event)"
          (approve)="approveDisability($event)"
          (reject)="rejectDisability($event)"
          (downloadDocument)="downloadDocument($event)"
        />
        } @if (activeTab() === 'compensatory') {
        <pt-compensatory-tab
          [requests]="compensatoryTimeoffsApi.value() ?? []"
          [loading]="compensatoryTimeoffsApi.isLoading()"
          [globalSearch]="globalSearchText()"
          [updatingStatus]="updatingCompensatoryStatus()"
          (viewDetails)="viewCompensatoryDetails($event)"
          (approve)="approveCompensatoryRequest($event)"
          (reject)="rejectCompensatoryRequest($event)"
        />
        } @if (activeTab() === 'documents') {
        <!-- Dashboard de Solicitudes de Documentos -->
        <pt-document-requests />
        } @if (activeTab() === 'vacations') {
        <!-- Dashboard de Vacaciones -->
        <pt-vacations />
        } @if (activeTab() === 'timelog_correction') {
        <!-- Dashboard de Omisión de Marcación -->
        <pt-timelog-corrections />
        } @if (activeTab() === 'work_permits') {
        <!-- Dashboard de Permisos de Trabajo -->
        <pt-work-permits />
        }
      </div>
    } @else {
      <!-- Vista móvil: RRHH Disabilities -->
      <div class="flex flex-col h-full overflow-hidden">
        <header class="flex-shrink-0 px-3 py-2 border-b border-neutral-700/50 bg-neutral-800/95 sticky top-0 z-30">
          <div class="flex items-center justify-between gap-2">
            <h1 class="text-base font-bold text-white truncate m-0">RRHH</h1>
            <div class="flex items-center gap-1">
              <p-button icon="pi pi-refresh" [label]="''" [outlined]="true" severity="secondary" size="small" (onClick)="refreshAll()" [loading]="isRefreshing()" pTooltip="Actualizar" tooltipPosition="bottom" />
              <p-button icon="pi pi-download" [label]="''" [outlined]="true" severity="secondary" size="small" (onClick)="exportData()" [disabled]="isRefreshing()" pTooltip="Exportar" tooltipPosition="bottom" />
            </div>
          </div>
          <div class="mt-2 relative">
            <input type="text" pInputText placeholder="Buscar..." [(ngModel)]="globalSearchText" (input)="onGlobalSearch()" class="w-full text-sm py-2 pl-9 pr-8 bg-neutral-900/50 border-neutral-600 text-white placeholder-gray-500 rounded-lg" />
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
            @if (globalSearchText()) {
              <button type="button" (click)="clearGlobalSearch()" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1"><i class="pi pi-times text-sm"></i></button>
            }
          </div>
        </header>

        <div class="flex overflow-x-auto gap-1 px-3 py-2 border-b border-neutral-700/50 bg-neutral-800/50 flex-shrink-0" style="scroll-snap-type: x mandatory;">
          <button (click)="activeTab.set('disabilities')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'disabilities' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-heart mr-1 text-xs"></i>Incapacidades @if (pendingCount() > 0) { <span class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">{{ pendingCount() }}</span> }
          </button>
          <button (click)="activeTab.set('compensatory')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'compensatory' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-clock mr-1 text-xs"></i>Compensatorio @if (compensatoryPendingCount() > 0) { <span class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">{{ compensatoryPendingCount() }}</span> }
          </button>
          <button (click)="navigateToTab('documents')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'documents' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-file-edit mr-1 text-xs"></i>Documentos
          </button>
          <button (click)="navigateToTab('vacations')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'vacations' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-calendar mr-1 text-xs"></i>Vacaciones
          </button>
          <button (click)="navigateToTab('timelog_correction')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'timelog_correction' ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-exclamation-triangle mr-1 text-xs"></i>Marcación
          </button>
          <button (click)="navigateToTab('work_permits')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'work_permits' ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-id-card mr-1 text-xs"></i>Permisos @if (workPermitsPendingCount() > 0) { <span class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">{{ workPermitsPendingCount() }}</span> }
          </button>
        </div>

        <main class="flex-1 overflow-y-auto px-3 py-2">
          @if (activeTab() === 'disabilities') {
            <pt-disabilities-tab
              [disabilities]="disabilitiesApi.value() ?? []"
              [loading]="disabilitiesApi.isLoading()"
              [isMobile]="true"
              [globalSearch]="globalSearchText()"
              [updatingStatus]="updatingDisabilityStatus()"
              (viewDetails)="viewDetails($event)"
              (approve)="approveDisability($event)"
              (reject)="rejectDisability($event)"
              (downloadDocument)="downloadDocument($event)"
            />
          }
          @if (activeTab() === 'compensatory') {
            <pt-compensatory-tab
              [requests]="compensatoryTimeoffsApi.value() ?? []"
              [loading]="compensatoryTimeoffsApi.isLoading()"
              [isMobile]="true"
              [globalSearch]="globalSearchText()"
              [updatingStatus]="updatingCompensatoryStatus()"
              (viewDetails)="viewCompensatoryDetails($event)"
              (approve)="approveCompensatoryRequest($event)"
              (reject)="rejectCompensatoryRequest($event)"
            />
          }
          @if (activeTab() === 'documents') { <pt-document-requests /> }
          @if (activeTab() === 'vacations') { <pt-vacations /> }
          @if (activeTab() === 'timelog_correction') { <pt-timelog-corrections /> }
          @if (activeTab() === 'work_permits') { <pt-work-permits /> }
        </main>
      </div>
    }
    </div>

    <!-- Dialog de Detalles de Incapacidad -->
    <pt-disability-details-dialog
      [(visible)]="showDetailsDialog"
      [disability]="selectedDisability()"
      [updatingStatus]="updatingDisabilityStatus()"
      [savingComment]="savingDisabilityComment()"
      [showAuditSidebar]="showAuditSidebar()"
      [(rejectionComment)]="disabilityRejectionComment"
      (downloadDocument)="downloadDocument($event)"
      (changeStatus)="updateDisabilityStatusFromDialog($event)"
      (saveComment)="saveDisabilityRejectionComment()"
      (toggleAuditSidebar)="showAuditSidebar.set(!showAuditSidebar())"
    />

    <!-- Dialog de Detalles de Tiempo Compensatorio -->
    <pt-compensatory-details-dialog
      [(visible)]="showCompensatoryDetailsDialog"
      [request]="selectedCompensatoryRequest()"
      [attachingDoc]="attachingCompensatoryDoc()"
      [showAuditSidebar]="showAuditSidebar()"
      [savingComment]="savingCompensatoryComment()"
      [(rejectionComment)]="compensatoryRejectionComment"
      [isLoadingOvertimeHours]="isLoadingOvertimeHours()"
      [employeeOvertimeHours]="employeeOvertimeHours()"
      [employeeOvertimeDays]="employeeOvertimeDays()"
      [employeeOvertimeDaysAll]="employeeOvertimeDaysAll()"
      [overtimeHistoryWindowDays]="overtimeHistoryWindowDays()"
      [isLoadingAuditHistory]="isLoadingAuditHistory()"
      [auditHistory]="auditHistory()"
      [expandedAuditItems]="expandedAuditItems()"
      (toggleAuditSidebar)="showAuditSidebar.set(!showAuditSidebar())"
      (closeAuditSidebar)="showAuditSidebar.set(false)"
      (onToggleAuditItem)="toggleAuditItem($event)"
      (openDocument)="openCompensatoryDocument()"
      (attachDocument)="attachDocumentToCompensatoryRequest()"
      (downloadDocument)="downloadCompensatoryDocument()"
      (saveComment)="saveCompensatoryRejectionComment()"
      (loadMoreOvertime)="loadMoreOvertimeHistory()"
    />

    <!-- Dialog de Historial de Auditoría Completo -->
    <pt-audit-history-dialog
      [(visible)]="showAuditHistoryDialog"
      [loading]="isLoadingAllAuditHistory()"
      [logs]="allAuditHistory()"
    />
  `,
  styles: `
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }

    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: #1f2937 !important;
      color: #e5e7eb !important;
      border-color: #374151 !important;
      font-weight: 600 !important;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: #111827 !important;
      border-color: #374151 !important;
      transition: all 0.2s ease;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: #1f2937 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: #374151 !important;
      color: #e5e7eb !important;
      padding: 0.4rem !important;
      font-size: 0.75rem !important;
    }
    
    ::ng-deep .p-datatable.p-datatable-sm .p-datatable-thead > tr > th {
      padding: 0.4rem !important;
      font-size: 0.7rem !important;
    }
    
    ::ng-deep .p-datatable.p-datatable-sm .p-datatable-tbody > tr > td {
      padding: 0.4rem !important;
      font-size: 0.75rem !important;
    }

    ::ng-deep .p-card {
      background: #1f2937 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-card .p-card-body {
      padding: 1.5rem !important;
    }

    ::ng-deep .p-dialog {
      background: #1f2937 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-dialog .p-dialog-header {
      background: #111827 !important;
      border-bottom-color: #374151 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-dialog .p-dialog-content {
      background: #1f2937 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-inputtext {
      background: #111827 !important;
      border-color: #374151 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-inputtext:enabled:focus {
      border-color: #06b6d4 !important;
      box-shadow: 0 0 0 0.2rem rgba(6, 182, 212, 0.2) !important;
    }

    ::ng-deep .p-dropdown {
      background: #111827 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-dropdown:not(.p-disabled):hover {
      border-color: #06b6d4 !important;
    }

    ::ng-deep .p-dropdown:not(.p-disabled).p-focus {
      border-color: #06b6d4 !important;
      box-shadow: 0 0 0 0.2rem rgba(6, 182, 212, 0.2) !important;
    }

    ::ng-deep .p-calendar {
      background: #111827 !important;
    }

    ::ng-deep .p-calendar .p-inputtext {
      background: #111827 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-paginator {
      background: #1f2937 !important;
      border-color: #374151 !important;
      color: #e5e7eb !important;
    }

    ::ng-deep .p-paginator .p-paginator-page.p-highlight {
      background: #06b6d4 !important;
      border-color: #06b6d4 !important;
    }

    /* Estilos específicos para la tabla de horas extra */
    ::ng-deep .overtime-details-table .p-datatable-thead > tr > th {
      background: #1f2937 !important;
      color: #e5e7eb !important;
      border-color: #374151 !important;
      padding: 0.75rem 1rem !important;
      font-size: 0.75rem !important;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    ::ng-deep .overtime-details-table .p-datatable-tbody > tr > td {
      padding: 0.75rem 1rem !important;
      border-color: #374151 !important;
      background: #111827 !important;
    }

    ::ng-deep .overtime-details-table .p-datatable-tbody > tr:hover > td {
      background: #1f2937 !important;
    }

    ::ng-deep .overtime-details-table .p-datatable-scrollable-body {
      border-color: #374151 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HRDisabilitiesComponent {
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private dashboardStore = inject(DashboardStore);
  private auditService = inject(TimeoffAuditService);
  private vacationsService = inject(VacationsService);
  private documentRequestsService = inject(DocumentRequestsService);
  private workPermitsService = inject(WorkPermitsService);
  protected device = inject(DeviceService);
  private scheduleAutoAssign = inject(ScheduleAutoAssignService);
  public service = inject(HrDisabilitiesService);

  // Delegate to service resources
  public disabilitiesApi = this.service.disabilitiesResource;

  // Método para navegar a diferentes pestañas
  public navigateToTab(
    tab:
      | 'disabilities'
      | 'compensatory'
      | 'documents'
      | 'vacations'
      | 'timelog_correction'
      | 'work_permits'
  ): void {
    this.activeTab.set(tab);
  }

  public activeTab = signal<
    | 'disabilities'
    | 'compensatory'
    | 'documents'
    | 'vacations'
    | 'suggestions'
    | 'timelog_correction'
    | 'work_permits'
  >('disabilities');
  public globalSearchText = signal('');

  // Dialog
  public showDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);
  public showCompensatoryDetailsDialog = signal(false);
  public selectedCompensatoryRequest = signal<CompensatoryRequest | null>(null);
  public auditHistory = signal<TimeoffAuditLog[]>([]);
  public isLoadingAuditHistory = signal(false);
  public employeeOvertimeHours = signal<number>(0);

  // Rejection dialog signals for disabilities
  public showDisabilityRejectionDialog = signal(false);
  public disabilityToReject = signal<Disability | null>(null);

  // Rejection dialog signals for compensatory
  public showCompensatoryRejectionDialog = signal(false);
  public compensatoryToReject = signal<CompensatoryRequest | null>(null);

  public isLoadingOvertimeHours = signal<boolean>(false);
  // Historial: por defecto cargamos 1 año hacia atrás y permitimos ampliar
  public overtimeHistoryWindowDays = signal<number>(365);
  // Lista completa (dentro del rango cargado) para consumo/ordenamiento
  public employeeOvertimeDaysAll = signal<
    Array<{
      day: string;
      overtimeHours: number;
      entryTime?: string;
      exitTime?: string;
      totalHours?: number;
    }>
  >([]);
  public employeeOvertimeDays = signal<
    Array<{
      day: string;
      overtimeHours: number;
      entryTime?: string;
      exitTime?: string;
      totalHours?: number;
    }>
  >([]);
  public showAuditHistoryDialog = signal(false);
  public allAuditHistory = signal<TimeoffAuditLog[]>([]);
  public isLoadingAllAuditHistory = signal(false);
  public expandedAuditItems = signal<Set<string>>(new Set());
  public showAuditSidebar = signal(false);

  // Señales para edición de comentarios
  public disabilityRejectionComment = signal('');
  public compensatoryRejectionComment = signal('');
  public savingDisabilityComment = signal(false);
  public savingCompensatoryComment = signal(false);
  public attachingCompensatoryDoc = signal(false);
  public updatingDisabilityStatus = signal(false);
  public updatingCompensatoryStatus = signal(false);

  public pendingCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'pending')
        .length || 0
  );
  public onGlobalSearch(): void {
    // La búsqueda global se aplica automáticamente mediante computed
    // Puedes agregar lógica adicional aquí si es necesario
  }

  public clearGlobalSearch(): void {
    this.globalSearchText.set('');
  }

  public async exportData(): Promise<void> {
    try {
      const { utils, writeFile } = await import('xlsx');
      const requests = this.filteredCompensatoryRequests();

      if (requests.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin datos',
          detail: 'No hay solicitudes para exportar con los filtros aplicados',
        });
        return;
      }

      // Preparar datos para Excel
      const data = await Promise.all(
        requests.map(async (req) => {
          const employeeName = this.getEmployeeName(req);
          const employeeEmail = this.getEmployeeEmail(req);

          // Obtener nombres de revisores y registradores
          const reviewedByName = req.reviewed_by
            ? await this.getEmployeeNameById(req.reviewed_by)
            : 'N/A';

          return {
            'ID Solicitud': req.id,
            'Fecha Solicitud': req.created_at
              ? format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')
              : '',
            Empleado: employeeName,
            Email: employeeEmail,
            Posición: req.employee?.position?.name || 'N/A',
            Sucursal: req.employee?.branch?.name || 'N/A',
            'Fecha Desde': req.date_from
              ? format(new Date(req.date_from), 'dd/MM/yyyy')
              : '',
            'Fecha Hasta': req.date_to
              ? format(new Date(req.date_to), 'dd/MM/yyyy')
              : '',
            Tipo: req.compensatory_type === 'hours' ? 'Horas' : 'Días',
            Cantidad: req.compensatory_amount || req.hours || 0,
            'Horas Totales': req.hours || (req.compensatory_amount || 0) * 8,
            Estado: this.getCompensatoryStatusLabel(req),
            'Revisado Por': reviewedByName,
            'Fecha Revisión': req.reviewed_at
              ? format(new Date(req.reviewed_at), 'dd/MM/yyyy HH:mm')
              : '',
            'Comentario Rechazo': req.rejection_comment || '',
            Motivo: req.reason || '',
            Notas: Array.isArray(req.notes)
              ? req.notes.join('; ')
              : req.notes || '',
          };
        })
      );

      // Crear hoja de datos
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Solicitudes');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 36 }, // ID
        { wch: 18 }, // Fecha Solicitud
        { wch: 25 }, // Empleado
        { wch: 30 }, // Email
        { wch: 20 }, // Posición
        { wch: 20 }, // Sucursal
        { wch: 12 }, // Fecha Desde
        { wch: 12 }, // Fecha Hasta
        { wch: 10 }, // Tipo
        { wch: 10 }, // Cantidad
        { wch: 12 }, // Horas Totales
        { wch: 15 }, // Estado
        { wch: 20 }, // Revisado Por
        { wch: 18 }, // Fecha Revisión
        { wch: 30 }, // Comentario Rechazo
        { wch: 30 }, // Motivo
        { wch: 50 }, // Notas
      ];
      ws['!cols'] = colWidths;

      // Crear hoja de resumen
      const summaryData = [
        ['Resumen de Exportación'],
        ['Fecha Exportación', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        ['Total Solicitudes', requests.length],
        ['Pendientes', this.compensatoryPendingCount()],
        ['Aprobadas', this.compensatoryApprovedCount()],
        ['Rechazadas', this.compensatoryRejectedCount()],
        [''],
        ['Filtros Aplicados'],
        ['Búsqueda', this.compensatorySearchText() || 'Ninguna'],
        [
          'Estado',
          this.compensatorySelectedStatus()
            ? this.compensatoryStatusOptions.find(
                (o) => o.value === this.compensatorySelectedStatus()
              )?.label || 'Todos'
            : 'Todos',
        ],
        [
          'Rango Fechas',
          this.compensatoryDateRange()
            ? `${format(
                this.compensatoryDateRange()![0],
                'dd/MM/yyyy'
              )} - ${format(this.compensatoryDateRange()![1], 'dd/MM/yyyy')}`
            : 'Todos',
        ],
      ];

      const summaryWs = utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 30 }];
      utils.book_append_sheet(wb, summaryWs, 'Resumen');

      // Generar nombre de archivo con timestamp
      const fileName = `Tiempo_Compensatorio_${format(
        new Date(),
        'yyyy-MM-dd_HH-mm-ss'
      )}.xlsx`;

      // Descargar archivo
      writeFile(wb, fileName);

      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: `Se exportaron ${requests.length} solicitudes`,
      });
    } catch (error) {
      console.error('Error exportando datos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar los datos',
      });
    }
  }

  private async getEmployeeNameById(employeeId: string): Promise<string> {
    try {
      const employee = await firstValueFrom(this.service.getEmployeeNameById(employeeId));
      if (employee && employee[0]) {
        return `${employee[0].first_name} ${employee[0].father_name}`;
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  }

  // ========== Tiempo Compensatorio ==========

  // Delegate to service resource
  public compensatoryTimeoffsApi = this.service.compensatoryResource;

  public vacationsPendingCount = computed(
    () =>
      this.vacationsService.value().filter((v) => v.status === 'pending')
        .length || 0
  );

  public documentsPendingCount = computed(
    () =>
      this.documentRequestsService
        .value()
        .filter(
          (d) =>
            d.status === 'pending' &&
            d.document_type !== 'timelog_correction' &&
            d.document_type !== 'uniform_request' &&
            d.document_type !== 'supply_request'
        ).length || 0
  );

  public timelogCorrectionPendingCount = computed(
    () =>
      this.documentRequestsService
        .value()
        .filter(
          (d) =>
            d.status === 'pending' && d.document_type === 'timelog_correction'
        ).length || 0
  );

  public workPermitsPendingCount = computed(
    () =>
      this.workPermitsService
        .value()
        .filter((wp) => wp.status === 'pending').length || 0
  );

  // Filtros para tiempo compensatorio
  public compensatorySearchText = signal('');
  public compensatorySelectedStatus = signal<string | null>(null);
  public compensatoryDateRange = signal<Date[] | null>(null);
  public isRefreshing = computed(
    () =>
      this.compensatoryTimeoffsApi.isLoading() ||
      this.vacationsService.isLoading() ||
      this.documentRequestsService.isLoading() ||
      this.workPermitsService.isLoading()
  );

  public refreshAll(): void {
    this.disabilitiesApi.reload();
    this.compensatoryTimeoffsApi.reload();
    this.vacationsService.reload();
    this.documentRequestsService.reload();
    this.workPermitsService.reload();
  }

  // Opciones de estado para tiempo compensatorio
  public compensatoryStatusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  public compensatoryPendingCount = computed(
    () =>
      this.compensatoryTimeoffsApi
        .value()
        ?.filter(
          (r) =>
            r.review_status === 'pending' ||
            (!r.review_status && !r.is_approved)
        ).length || 0
  );
  public compensatoryApprovedCount = computed(
    () =>
      this.compensatoryTimeoffsApi
        .value()
        ?.filter((r) => r.is_approved === true).length || 0
  );
  public compensatoryRejectedCount = computed(
    () =>
      this.compensatoryTimeoffsApi
        .value()
        ?.filter((r) => r.review_status === 'rejected' || r.rejection_comment)
        .length || 0
  );

  // Solicitudes filtradas
  public filteredCompensatoryRequests = computed(() => {
    let requests = this.compensatoryTimeoffsApi.value() || [];

    // Filtro por búsqueda global
    const globalSearch = this.globalSearchText().toLowerCase();
    if (globalSearch) {
      requests = requests.filter((r) => {
        const employeeName = this.getEmployeeName(r).toLowerCase();
        const email = this.getEmployeeEmail(r).toLowerCase();
        const reason = (
          _getCompensatoryReasonFromNotes(r) || ''
        ).toLowerCase();
        return (
          employeeName.includes(globalSearch) ||
          email.includes(globalSearch) ||
          reason.includes(globalSearch)
        );
      });
    }

    // Filtro por texto específico
    const search = this.compensatorySearchText().toLowerCase();
    if (search) {
      requests = requests.filter((r) => {
        const employeeName = this.getEmployeeName(r).toLowerCase();
        const email = this.getEmployeeEmail(r).toLowerCase();
        const reason = (
          _getCompensatoryReasonFromNotes(r) || ''
        ).toLowerCase();
        return (
          employeeName.includes(search) ||
          email.includes(search) ||
          reason.includes(search)
        );
      });
    }

    // Filtro por estado
    const status = this.compensatorySelectedStatus();
    if (status) {
      if (status === 'pending') {
        requests = requests.filter(
          (r) =>
            r.review_status === 'pending' ||
            (!r.review_status && !r.is_approved)
        );
      } else if (status === 'approved') {
        requests = requests.filter((r) => r.is_approved === true);
      } else if (status === 'rejected') {
        requests = requests.filter(
          (r) => r.review_status === 'rejected' || r.rejection_comment
        );
      }
    }

    // Filtro por rango de fechas
    const dateRange = this.compensatoryDateRange();
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      requests = requests.filter((r) => {
        const requestStart = new Date(r.date_from);
        return requestStart >= startDate && requestStart <= endDate;
      });
    }

    return requests;
  });

  public getCompensatoryStatusLabel(request: CompensatoryRequest): string {
    if (request.is_approved) return 'Aprobado';
    if (request.rejection_comment || request.review_status === 'rejected')
      return 'Rechazado';
    if (request.review_status === 'approved') return 'En Registro';
    return 'Pendiente';
  }

  // Helper methods para obtener información del empleado
  public getEmployeeName(request: CompensatoryRequest): string {
    if (request.employee) {
      return `${request.employee.first_name || ''} ${
        request.employee.father_name || ''
      }`.trim();
    }
    return 'Empleado';
  }

  public getEmployeeEmail(request: CompensatoryRequest): string {
    if (request.employee) {
      return request.employee.work_email || '';
    }
    return '';
  }

  public viewCompensatoryDetails(request: CompensatoryRequest): void {
    this.selectedCompensatoryRequest.set(request);
    this.showCompensatoryDetailsDialog.set(true);
    this.loadEmployeeOvertimeHours(request.employee_id);
    this.loadAuditHistory(request.id);
    // Inicializar el comentario si existe
    this.compensatoryRejectionComment.set(request.rejection_comment || '');
  }

  public loadAuditHistory(timeoffId: string): void {
    this.isLoadingAuditHistory.set(true);
    this.auditService.getAuditHistory(timeoffId).subscribe({
      next: (history) => {
        this.auditHistory.set(history);
        // Expandir todos los elementos por defecto
        const allIds = new Set(history.map((log) => log.id));
        this.expandedAuditItems.set(allIds);
        this.isLoadingAuditHistory.set(false);
      },
      error: (error) => {
        console.error('Error cargando historial de auditoría:', error);
        this.auditHistory.set([]);
        this.isLoadingAuditHistory.set(false);
      },
    });
  }

  public openAuditHistoryDialog(): void {
    this.showAuditHistoryDialog.set(true);
    this.loadAllAuditHistory();
  }

  public loadAllAuditHistory(): void {
    this.isLoadingAllAuditHistory.set(true);
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      this.allAuditHistory.set([]);
      this.isLoadingAllAuditHistory.set(false);
      return;
    }

    this.service.getCompensatoryTimeoffIds(companyId).subscribe({
      next: (timeoffs) => {
        if (timeoffs.length === 0) {
          this.allAuditHistory.set([]);
          this.isLoadingAllAuditHistory.set(false);
          return;
        }

        const timeoffIds = timeoffs.map((t: any) => t.id);

        this.service.getAuditLogs(timeoffIds).subscribe({
          next: (history) => {
            this.allAuditHistory.set(history);
            this.isLoadingAllAuditHistory.set(false);
          },
          error: (error) => {
            console.error('Error cargando historial completo:', error);
            this.allAuditHistory.set([]);
            this.isLoadingAllAuditHistory.set(false);
          },
        });
      },
      error: (error) => {
        console.error('Error obteniendo timeoffs:', error);
        this.allAuditHistory.set([]);
        this.isLoadingAllAuditHistory.set(false);
      },
    });
  }

  public getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      created: 'creó la solicitud',
      status_changed: 'cambió el estado',
      approved: 'aprobó la solicitud',
      rejected: 'rechazó la solicitud',
      registered: 'registró la solicitud',
      updated: 'actualizó la solicitud',
    };
    return labels[action] || action;
  }

  public getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      created: 'pi-plus-circle',
      status_changed: 'pi-sync',
      approved: 'pi-check-circle',
      rejected: 'pi-times-circle',
      registered: 'pi-save',
      updated: 'pi-pencil',
    };
    return icons[action] || 'pi-circle';
  }

  public getActionColor(action: string): string {
    const colors: Record<string, string> = {
      created: 'text-blue-400',
      status_changed: 'text-yellow-400',
      approved: 'text-green-400',
      rejected: 'text-red-400',
      registered: 'text-cyan-400',
      updated: 'text-gray-400',
    };
    return colors[action] || 'text-gray-400';
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      registered: 'Registrado',
    };
    return labels[status] || status;
  }

  public toggleAuditItem(logId: string): void {
    const current = new Set(this.expandedAuditItems());
    if (current.has(logId)) {
      current.delete(logId);
    } else {
      current.add(logId);
    }
    this.expandedAuditItems.set(current);
  }


  // Método helper para calcular horas extras de un empleado específico
  private async loadEmployeeOvertimeHours(employeeId: string): Promise<void> {
    this.isLoadingOvertimeHours.set(true);
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) {
        this.employeeOvertimeHours.set(0);
        this.employeeOvertimeDays.set([]);
        return;
      }

      const today = new Date();
      const endDate = endOfDay(today);
      const startDate = startOfDay(subDays(today, this.overtimeHistoryWindowDays()));

      const startDayStr = format(startDate, 'yyyy-MM-dd');
      const endDayStr = format(endDate, 'yyyy-MM-dd');
      const startTimestamp = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
      const endTimestamp = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

      const timelogs = await firstValueFrom(
        this.service.getEmployeeTimelogs(employeeId, companyId, startTimestamp, endTimestamp)
      );

      const consumptions = await firstValueFrom(
        this.service.getOvertimeConsumptions(employeeId, companyId, startDayStr, endDayStr)
      );

      const consumedByDay = this.sumConsumedHoursByDay(consumptions ?? []);
      const processedLogs = this.processTimelogsForOvertime(timelogs);
      const overtimeDaysRaw = this.extractOvertimeDays(processedLogs);

      const overtimeDaysRemaining = overtimeDaysRaw
        .map((d) => {
          const consumed = consumedByDay.get(d.day) ?? 0;
          return { ...d, overtimeHours: Math.max(0, d.overtimeHours - consumed) };
        })
        .filter((d) => d.overtimeHours > 0)
        .sort((a, b) => b.day.localeCompare(a.day));

      const totalRemaining = overtimeDaysRemaining.reduce((acc, d) => acc + d.overtimeHours, 0);

      this.employeeOvertimeHours.set(totalRemaining);
      this.employeeOvertimeDaysAll.set(overtimeDaysRemaining);
      this.employeeOvertimeDays.set(overtimeDaysRemaining.slice(0, 200));
    } catch (error) {
      console.error('Error loading overtime hours:', error);
      this.employeeOvertimeHours.set(0);
      this.employeeOvertimeDaysAll.set([]);
      this.employeeOvertimeDays.set([]);
    } finally {
      this.isLoadingOvertimeHours.set(false);
    }
  }

  private sumConsumedHoursByDay(rows: Array<{ overtime_day?: string; hours_used?: any }>): Map<string, number> {
    return _sumConsumedHoursByDay(rows);
  }

  private processTimelogsForOvertime(timelogs: any[]): any[] {
    return _processTimelogsForOvertime(timelogs);
  }

  private extractOvertimeDays(logs: any[]) {
    return _extractOvertimeDays(logs);
  }

  public approveCompensatoryRequest(request: CompensatoryRequest): void {
    const employeeName = this.getEmployeeName(request);
    this.confirmationService.confirm({
      message: `¿Estás seguro de aprobar la solicitud de tiempo compensatorio de ${employeeName}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.updateCompensatoryReviewStatus(request.id, 'approved');
      },
    });
  }

  /**
   * Opens the rejection dialog for a compensatory request
   */
  public openCompensatoryRejectionDialog(request: CompensatoryRequest): void {
    this.compensatoryToReject.set(request);
    this.compensatoryRejectionComment.set('');
    this.showCompensatoryRejectionDialog.set(true);
  }

  public onCompensatoryRejectionConfirm(comment: string): void {
    const request = this.compensatoryToReject();
    if (!request) return;
    this.showCompensatoryRejectionDialog.set(false);
    this.updateCompensatoryReviewStatus(request.id, 'rejected', comment);
  }

  public rejectCompensatoryRequest(request: CompensatoryRequest): void {
    this.openCompensatoryRejectionDialog(request);
  }

  public loadMoreOvertimeHistory(): void {
    const req = this.selectedCompensatoryRequest();
    if (!req?.employee_id) return;

    // Ampliar ventana histórica (1 año más) y recargar cálculo
    this.overtimeHistoryWindowDays.set(this.overtimeHistoryWindowDays() + 365);
    void this.loadEmployeeOvertimeHours(req.employee_id);
  }

  private updateCompensatoryReviewStatus(
    id: string,
    status: 'approved' | 'rejected',
    rejectionComment?: string
  ): void {
    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al empleado actual',
      });
      return;
    }

    this.updatingCompensatoryStatus.set(true);

    // Obtener estado anterior antes de actualizar
    const request = this.compensatoryTimeoffsApi
      .value()
      ?.find((r) => r.id === id);
    const oldStatus = request?.review_status || 'pending';

    const updateData: any = {
      review_status: status,
      is_approved: status === 'approved',
      reviewed_by: currentEmployee.id,
      reviewed_at: new Date().toISOString(),
    };

    if (status === 'rejected' && rejectionComment) {
      updateData.rejection_comment = rejectionComment;
    }

    this.service.updateCompensatoryReviewStatus(id, updateData).subscribe({
        next: async () => {
          // Registrar en auditoría
          await this.auditService.logChange({
            timeoffId: id,
            changedBy: currentEmployee.id,
            action: status === 'approved' ? 'approved' : 'rejected',
            oldStatus,
            newStatus: status,
            comment: status === 'rejected' ? rejectionComment : undefined,
          });

          // Obtener la solicitud para notificar al empleado
          if (status === 'approved' && request) {
            // Enviar notificación al empleado sobre la aprobación final
            await this.notifyEmployee(id, request, 'approved');

            // Consumir horas extra (auditable) al aprobar. Best-effort: no bloquea aprobación.
            try {
              await this.consumeOvertimeForApprovedRequest(request, oldStatus);
              // Refrescar panel de overtime si está abierto
              if (this.showCompensatoryDetailsDialog()) {
                void this.loadEmployeeOvertimeHours(request.employee_id);
              }
            } catch (e) {
              console.warn(
                '[HRDisabilities] No se pudo consumir overtime automáticamente',
                e
              );
            }

            // Auto-assign compensatory schedule
            try {
              const timeOffType = request.compensatory_type === 'hours'
                ? 'compensatory_hours' as const
                : 'compensatory_day' as const;
              await this.scheduleAutoAssign.assignScheduleForTimeOff({
                employeeId: request.employee_id,
                startDate: request.date_from,
                endDate: request.date_to,
                timeOffType,
                timeOffSourceId: request.id,
                companyId: request.company_id,
                createdBy: currentEmployee.id,
                compensatoryHoursAmount: request.compensatory_type === 'hours'
                  ? request.compensatory_amount
                  : undefined,
              });
            } catch (e) {
              console.warn('[HRDisabilities] Auto-assign compensatory schedule failed (non-blocking):', e);
            }
          } else if (status === 'rejected' && request) {
            // Enviar notificación al empleado sobre el rechazo
            await this.notifyEmployee(
              id,
              request,
              'rejected',
              rejectionComment
            );
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Solicitud ${
              status === 'approved' ? 'aprobada' : 'rechazada'
            } correctamente`,
          });
          this.compensatoryTimeoffsApi.reload();
          // Recargar historial si el diálogo está abierto
          if (
            this.showCompensatoryDetailsDialog() &&
            this.selectedCompensatoryRequest()?.id === id
          ) {
            this.loadAuditHistory(id);
          }
          this.updatingCompensatoryStatus.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado de la solicitud',
          });
          this.updatingCompensatoryStatus.set(false);
        },
      });
  }

  private async consumeOvertimeForApprovedRequest(
    request: CompensatoryRequest,
    oldStatus: string
  ): Promise<void> {
    // Evitar dobles consumos si ya estaba aprobado antes
    if (oldStatus === 'approved') {
      return;
    }

    const companyId = this.organizationService.getCurrentCompanyId();
    const actor = this.dashboardStore.currentEmployee();
    if (!companyId || !actor) return;

    const quantity = _getCompensatoryQuantity(request);
    const requestedHours = quantity?.isDays
      ? quantity.value * 8
      : quantity?.value ?? 0;
    if (!requestedHours || requestedHours <= 0) return;

    // Prioridad: fechas manuales ingresadas por el empleado
    const manualDates = _getManualOvertimeDates(request);
    const manualIsoDays = manualDates
      .map((d) => _parseDDMMYYYYToISO(d))
      .filter(Boolean) as string[];

    let candidates: Array<{ day: string; remainingHours: number }> = [];

    if (manualIsoDays.length > 0) {
      const timelogs = await firstValueFrom(
        this.service.getTimelogsForDays(request.employee_id, companyId, manualIsoDays)
      );

      const consumptions = await firstValueFrom(
        this.service.getConsumptionsForDays(request.employee_id, companyId, manualIsoDays)
      );

      const consumedByDay = this.sumConsumedHoursByDay(consumptions ?? []);
      const processed = this.processTimelogsForOvertime(timelogs ?? []);
      const overtimeDays = this.extractOvertimeDays(processed);
      const overtimeByDay = new Map(
        overtimeDays.map((d) => [d.day, d.overtimeHours])
      );

      candidates = manualIsoDays
        .map((day) => {
          const overtime = overtimeByDay.get(day) ?? 0;
          const consumed = consumedByDay.get(day) ?? 0;
          return { day, remainingHours: Math.max(0, overtime - consumed) };
        })
        .filter((x) => x.remainingHours > 0);
    } else {
      // Fallback: usar los días con saldo ya calculados (rango cargado)
      candidates = (this.employeeOvertimeDaysAll() ?? [])
        .map((d) => ({ day: d.day, remainingHours: d.overtimeHours }))
        .filter((x) => x.remainingHours > 0);
    }

    // Consumir desde los días más antiguos primero (FIFO)
    candidates.sort((a, b) => a.day.localeCompare(b.day));

    let remainingToAllocate = requestedHours;
    const rows: Array<Record<string, unknown>> = [];

    for (const c of candidates) {
      if (remainingToAllocate <= 0) break;
      const use = Math.min(c.remainingHours, remainingToAllocate);
      if (use <= 0) continue;

      // Redondeo defensivo a 2 decimales para NUMERIC(6,2)
      const hoursUsed = Math.round(use * 100) / 100;
      if (hoursUsed <= 0) continue;

      rows.push({
        company_id: companyId,
        employee_id: request.employee_id,
        timeoff_id: request.id,
        overtime_day: c.day,
        hours_used: hoursUsed,
        created_by: actor.id,
        comment: 'Consumido automáticamente al aprobar compensatorio',
      });

      remainingToAllocate -= hoursUsed;
    }

    if (!rows.length) return;

    await firstValueFrom(this.service.createOvertimeConsumptions(rows));

    await this.auditService.logChange({
      timeoffId: request.id,
      changedBy: actor.id,
      action: 'updated',
      oldStatus,
      newStatus: 'approved',
      comment: `Overtime consumido automáticamente al aprobar: ${rows
        .map((r: any) => `${String(r.overtime_day)}=${String(r.hours_used)}h`)
        .join(', ')}`,
      newValue: { overtime_consumptions: rows },
    });
  }

  private async notifyEmployee(
    timeoffId: string,
    request: CompensatoryRequest,
    status: 'approved' | 'rejected',
    rejectionComment?: string
  ): Promise<void> {
    try {
      const employeeId = request.employee_id;
      if (!employeeId) return;

      const currentEmployee = this.dashboardStore.currentEmployee();

      const title =
        status === 'approved'
          ? 'Solicitud de Tiempo Compensatorio Aprobada'
          : 'Solicitud de Tiempo Compensatorio Rechazada';

      const message =
        status === 'approved'
          ? `Tu solicitud de tiempo compensatorio ha sido registrada y aprobada.`
          : `Tu solicitud de tiempo compensatorio ha sido rechazada.${
              rejectionComment ? ` Motivo: ${rejectionComment}` : ''
            }`;

      await firstValueFrom(
        this.service.sendHrMessages({
          employee_id: employeeId,
          related_type: 'timeoff',
          related_id: timeoffId,
          message_type:
            status === 'approved'
              ? 'compensatory_approved'
              : 'compensatory_rejected',
          title,
          message,
          created_by: currentEmployee?.id || null,
        })
      );
    } catch (error) {
      console.error('Error enviando notificación al empleado:', error);
    }
  }

  public viewDetails(disability: Disability): void {
    this.selectedDisability.set(disability);
    this.showDetailsDialog.set(true);
    // Inicializar el comentario si existe
    this.disabilityRejectionComment.set(disability.rejection_comment || '');
  }

  public downloadDocument(url: string): void {
    window.open(url, '_blank');
  }

  public openCompensatoryDocument(): void {
    const url = this.selectedCompensatoryRequest()?.document_url;
    if (url) {
      window.open(url, '_blank');
    }
  }

  public attachDocumentToCompensatoryRequest(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.style.display = 'none';

    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 5000000) {
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo demasiado grande',
          detail: 'El archivo no puede superar los 5MB.',
        });
        return;
      }

      if (file.type !== 'application/pdf') {
        this.messageService.add({
          severity: 'error',
          summary: 'Tipo de archivo inválido',
          detail: 'Solo se permiten archivos PDF.',
        });
        return;
      }

      try {
        const request = this.selectedCompensatoryRequest();
        if (!request) return;

        this.attachingCompensatoryDoc.set(true);

        const employeeId = request.employee_id;
        const fileName = `${employeeId}/${Date.now()}.pdf`;

        await firstValueFrom(this.service.uploadDocument(fileName, file));

        const documentUrl = this.apiUrl.build(
          `storage/v1/object/public/compensatory/${fileName}`
        );

        await firstValueFrom(
          this.service.updateCompensatoryDocumentUrl(request.id, documentUrl)
        );

        this.messageService.add({
          severity: 'success',
          summary: 'Archivo adjuntado',
          detail: 'El documento se adjuntó correctamente a la solicitud.',
        });

        this.compensatoryTimeoffsApi.reload();
      } catch (error) {
        console.error('Error attaching document:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al adjuntar archivo',
          detail: 'No se pudo adjuntar el archivo. Inténtalo nuevamente.',
        });
      } finally {
        this.attachingCompensatoryDoc.set(false);
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  public saveDisabilityRejectionComment(): void {
    const disability = this.selectedDisability();
    if (!disability) return;

    this.savingDisabilityComment.set(true);
    const comment = this.disabilityRejectionComment().trim() || null;

    this.service.saveDisabilityRejectionComment(disability.id, comment).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Comentario de rechazo guardado correctamente' });
        this.disabilitiesApi.reload();
        if (disability) disability.rejection_comment = comment;
        this.savingDisabilityComment.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el comentario' });
        this.savingDisabilityComment.set(false);
      },
    });
  }

  public saveCompensatoryRejectionComment(): void {
    const request = this.selectedCompensatoryRequest();
    if (!request) return;

    this.savingCompensatoryComment.set(true);
    const comment = this.compensatoryRejectionComment().trim() || null;

    this.service.saveCompensatoryRejectionComment(request.id, comment).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Comentario de rechazo guardado correctamente' });
        this.compensatoryTimeoffsApi.reload();
        if (request) request.rejection_comment = comment || undefined;
        this.savingCompensatoryComment.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el comentario' });
        this.savingCompensatoryComment.set(false);
      },
    });
  }

  public approveDisability(disability: Disability): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de aprobar la incapacidad de ${disability.employee?.first_name} ${disability.employee?.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.updateDisabilityStatus(disability.id, 'approved');
      },
    });
  }

  /**
   * Opens the rejection dialog for a disability
   */
  public openDisabilityRejectionDialog(disability: Disability): void {
    this.disabilityToReject.set(disability);
    this.disabilityRejectionComment.set('');
    this.showDisabilityRejectionDialog.set(true);
  }

  public onDisabilityRejectionConfirm(comment: string): void {
    const disability = this.disabilityToReject();
    if (!disability) return;
    this.showDisabilityRejectionDialog.set(false);
    this.updateDisabilityStatus(disability.id, 'rejected', comment);
  }

  public rejectDisability(disability: Disability): void {
    this.openDisabilityRejectionDialog(disability);
  }

  public updateDisabilityStatusFromDialog(statusValue: string): void {
    const disability = this.selectedDisability();
    if (!disability) return;

    // For rejection, use the modal to require mandatory comment
    if (statusValue === 'rejected') {
      this.showDetailsDialog.set(false);
      this.openDisabilityRejectionDialog(disability);
      return;
    }

    const validStatus = statusValue as 'pending' | 'approved' | 'rejected';
    if (['pending', 'approved'].includes(statusValue)) {
      this.updateDisabilityStatus(disability.id, validStatus);
    }
  }

  public updateDisabilityStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected',
    rejectionComment?: string
  ): void {
    this.updatingDisabilityStatus.set(true);

    const updateData: any = {
      status,
    };

    // Solo actualizar reviewed_at si no es pending
    if (status !== 'pending') {
      updateData.reviewed_at = new Date().toISOString();
    }

    if (status === 'rejected' && rejectionComment) {
      updateData.rejection_comment = rejectionComment;
    }

    this.service.updateDisabilityStatus(id, updateData).subscribe({
        next: async () => {
          // Auto-assign disability schedule on approval
          if (status === 'approved') {
            const disability = this.disabilitiesApi.value()?.find((d) => d.id === id)
              || this.selectedDisability();
            const currentEmployee = this.dashboardStore.currentEmployee();
            if (disability && currentEmployee) {
              try {
                await this.scheduleAutoAssign.assignScheduleForTimeOff({
                  employeeId: disability.employee_id,
                  startDate: disability.start_date,
                  endDate: disability.end_date,
                  timeOffType: 'disability',
                  timeOffSourceId: disability.id,
                  companyId: disability.company_id,
                  createdBy: currentEmployee.id,
                });
              } catch (e) {
                console.warn('[HRDisabilities] Auto-assign disability schedule failed (non-blocking):', e);
              }
            }
          }
          const statusMessages: Record<string, string> = {
            approved: 'aprobada',
            rejected: 'rechazada',
            pending: 'marcada como pendiente',
          };
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Incapacidad ${statusMessages[status]} correctamente`,
          });
          this.disabilitiesApi.reload();
          // Recargar la incapacidad seleccionada si es la misma
          if (this.selectedDisability()?.id === id) {
            this.disabilitiesApi.reload();
            // Actualizar el objeto local
            const updated = this.disabilitiesApi
              .value()
              ?.find((d) => d.id === id);
            if (updated) {
              this.selectedDisability.set(updated);
            }
          }
          this.updatingDisabilityStatus.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado de la incapacidad',
          });
          this.updatingDisabilityStatus.set(false);
        },
      });
  }

  public downloadCompensatoryDocument(): void {
    const url = this.selectedCompensatoryRequest()?.document_url;
    if (url) {
      window.open(url, '_blank');
    }
  }
}
