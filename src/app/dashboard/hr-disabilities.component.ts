import { DatePipe } from '@angular/common';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  differenceInMinutes,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { utils, writeFile } from 'xlsx';
import { OrganizationService } from '../services/organization.service';
import {
  TimeoffAuditLog,
  TimeoffAuditService,
} from '../services/timeoff-audit.service';
import { DashboardStore } from '../stores/dashboard.store';
import { getEnv } from '../utils/env.utils';
import { DocumentRequestsService } from './modules/document-requests/data/document-requests.service';
import { DocumentRequestsComponent } from './modules/document-requests/ui/document-requests.component';
import { TimelogCorrectionsComponent } from './modules/timelog-corrections/ui/timelog-corrections.component';
import { UniformRequestsComponent } from './modules/uniform-requests/ui/uniform-requests.component';
import { VacationsService } from './modules/vacations/data/vacations.service';
import { VacationsComponent } from './modules/vacations/ui/vacations.component';

interface Disability {
  id: string;
  employee_id: string;
  created_by?: string | null;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    mother_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  start_date: string;
  end_date: string;
  description: string | null;
  document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_comment?: string | null;
  created_at: string;
  created_by_employee?: {
    first_name: string;
    father_name: string;
  };
}

export interface CompensatoryRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  company_id?: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    branch_id?: string;
    position?: { name: string };
    branch?: { name: string };
  };
  date_from: string;
  date_to: string;
  hours?: number;
  document_url?: string;
  reason?: string;
  compensatory_type?: 'hours' | 'days';
  compensatory_amount?: number;
  review_status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_comment?: string;
  is_approved: boolean;
  created_at: string;
  notes?: string[] | string;
  created_by_employee?: {
    first_name: string;
    father_name: string;
  };
}

interface VacationRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  start_date: string;
  end_date: string;
  reason: string | null;
  document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_comment?: string | null;
  created_at: string;
}

export interface DocumentRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  document_type: string;
  reason: string | null;
  document_url: string | null;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
  company_id: string;
}

@Component({
  selector: 'pt-hr-disabilities',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    CardModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    MenuModule,
    MultiSelectModule,
    CheckboxModule,
    CheckboxModule,
    SelectButtonModule,
    DocumentRequestsComponent,
    VacationsComponent,
    TimelogCorrectionsComponent,
    UniformRequestsComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div
      class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden"
    >
      <!-- Header Compacto con Búsqueda Global -->
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
              Marcación Errónea @if (timelogCorrectionPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ timelogCorrectionPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('uniform_request')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'uniform_request'
                  ? 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 text-teal-300 shadow-md border border-teal-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-tag mr-1.5 text-xs"></i>
              Uniformes @if (uniformRequestPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ uniformRequestPendingCount() }}
              </span>
              }
            </button>
          </div>
        </div>

        @if (activeTab() === 'disabilities') {
        <!-- Dashboard de Gestión de Solicitudes -->
        <div class="space-y-3">
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
                  <p class="text-xl font-bold text-white m-0">
                    {{ totalCount() }}
                  </p>
                </div>
              </div>
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full"
                  [style.width.%]="100"
                ></div>
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
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                  [style.width.%]="
                    totalCount() > 0 ? (pendingCount() / totalCount()) * 100 : 0
                  "
                ></div>
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
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                  [style.width.%]="
                    totalCount() > 0
                      ? (approvedCount() / totalCount()) * 100
                      : 0
                  "
                ></div>
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
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                  [style.width.%]="
                    totalCount() > 0
                      ? (rejectedCount() / totalCount()) * 100
                      : 0
                  "
                ></div>
              </div>
            </div>
          </div>

          <!-- Filtros Avanzados Colapsables -->
          <div
            class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm"
          >
            <div
              class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
              (click)="showFilters.set(!showFilters())"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-filter text-cyan-400 text-sm"></i>
                <h3 class="text-sm font-semibold text-white m-0">
                  Filtros Avanzados
                </h3>
                @if (hasActiveFilters()) {
                <span
                  class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold"
                >
                  {{ getActiveFiltersCount() }} activos
                </span>
                }
              </div>
              <i
                class="pi text-sm"
                [class.pi-chevron-down]="!showFilters()"
                [class.pi-chevron-up]="showFilters()"
                [class.text-gray-400]="!showFilters()"
                [class.text-cyan-400]="showFilters()"
              ></i>
            </div>

            @if (showFilters()) {
            <div class="p-3 space-y-2 animate-fade-in">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i
                    >Búsqueda Específica
                  </label>
                  <input
                    type="text"
                    pInputText
                    placeholder="Empleado, email, descripción..."
                    [(ngModel)]="searchText"
                    (input)="onFilterChange()"
                    class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Estado
                  </label>
                  <p-dropdown
                    [options]="statusOptions"
                    [(ngModel)]="selectedStatus"
                    (onChange)="onFilterChange()"
                    placeholder="Todos"
                    [showClear]="true"
                    class="w-full text-sm"
                    [style]="{ height: '32px' }"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i
                    >Rango de Fechas
                  </label>
                  <p-calendar
                    [(ngModel)]="dateRange"
                    selectionMode="range"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Seleccionar"
                    (onSelect)="onFilterChange()"
                    [showClear]="true"
                    class="w-full text-sm"
                    [inputStyle]="{ height: '32px', padding: '0.375rem' }"
                  />
                </div>
              </div>

              <div
                class="flex items-center justify-between pt-2 border-t border-neutral-700/50"
              >
                <p-button
                  label="Limpiar Todo"
                  icon="pi pi-filter-slash"
                  [outlined]="true"
                  severity="secondary"
                  (onClick)="clearFilters()"
                  [disabled]="!hasActiveFilters()"
                />
                <div class="flex items-center gap-2 text-sm text-gray-400">
                  <i class="pi pi-info-circle"></i>
                  <span
                    >{{ filteredDisabilities().length }} de
                    {{ totalCount() }} resultados</span
                  >
                </div>
              </div>
            </div>
            }
          </div>

          <!-- Tabla Compacta -->
          <div
            class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
          >
            <div
              class="p-2 border-b border-neutral-700/50 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <h3
                  class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
                >
                  <i class="pi pi-list text-cyan-400 text-sm"></i>
                  Solicitudes
                </h3>
              </div>
            </div>

            @if (disabilitiesApi.isLoading()) {
            <div class="flex justify-center items-center py-8">
              <div class="text-center">
                <p-progressSpinner />
                <p class="text-gray-400 mt-2 text-sm">
                  Cargando solicitudes...
                </p>
              </div>
            </div>
            } @else if (filteredDisabilities().length === 0) {
            <div
              class="flex flex-col items-center justify-center py-8 text-center"
            >
              <i class="pi pi-inbox text-4xl text-gray-600 mb-2"></i>
              <h4 class="text-sm font-semibold text-gray-300 mb-1">
                No se encontraron solicitudes
              </h4>
              <p class="text-gray-500 text-xs mb-2">
                Intenta ajustar los filtros para ver más resultados
              </p>
              <p-button
                [label]="'Limpiar Filtros'"
                icon="pi pi-filter-slash"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="clearFilters()"
              />
            </div>
            } @else {
            <div class="overflow-x-auto">
              <p-table
                [value]="filteredDisabilities()"
                [paginator]="true"
                [rows]="8"
                [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
                paginatorPosition="bottom"
                styleClass="p-datatable-sm p-datatable-striped"
                [globalFilterFields]="[
                  'employee.first_name',
                  'employee.father_name',
                  'employee.work_email',
                  'description'
                ]"
                styleClass="p-datatable-striped p-datatable-sm"
                [tableStyle]="{ 'min-width': '50rem' }"
              >
                <ng-template pTemplate="header">
                  <tr>
                    <th
                      style="width: 180px; padding: 0.5rem; text-align: left;"
                    >
                      <div class="flex items-center gap-1">
                        <i class="pi pi-user text-cyan-400 text-xs"></i>
                        <span class="text-xs">Empleado</span>
                      </div>
                    </th>
                    <th
                      style="width: 120px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i
                          class="pi pi-calendar-plus text-cyan-400 text-xs"
                        ></i>
                        <span class="text-xs">Fecha Solicitud</span>
                      </div>
                    </th>
                    <th
                      style="width: 100px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                        <span class="text-xs">Inicio</span>
                      </div>
                    </th>
                    <th
                      style="width: 100px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i
                          class="pi pi-calendar-times text-cyan-400 text-xs"
                        ></i>
                        <span class="text-xs">Fin</span>
                      </div>
                    </th>
                    <th
                      style="width: 70px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-clock text-cyan-400 text-xs"></i>
                        <span class="text-xs">Días</span>
                      </div>
                    </th>
                    <th style="padding: 0.5rem; text-align: center;">
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-file-edit text-cyan-400 text-xs"></i>
                        <span class="text-xs">Descripción</span>
                      </div>
                    </th>
                    <th
                      style="width: 100px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-tag text-cyan-400 text-xs"></i>
                        <span class="text-xs">Estado</span>
                      </div>
                    </th>
                    <th
                      style="width: 140px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center gap-1">
                        <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                        <span class="text-xs">Creado por</span>
                      </div>
                    </th>
                    <th
                      style="width: 70px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-paperclip text-cyan-400 text-xs"></i>
                        <span class="text-xs">Doc</span>
                      </div>
                    </th>
                    <th
                      style="width: 120px; padding: 0.5rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-cog text-cyan-400 text-xs"></i>
                        <span class="text-xs">Acciones</span>
                      </div>
                    </th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-disability>
                  <tr
                    class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                    (click)="viewDetails(disability)"
                  >
                    <td style="padding: 0.5rem; text-align: left;">
                      <div class="flex items-center gap-1.5">
                        <div
                          class="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0"
                        >
                          <i class="pi pi-user text-cyan-400 text-[10px]"></i>
                        </div>
                        <div class="flex flex-col min-w-0">
                          <span
                            class="font-semibold text-white text-xs truncate"
                          >
                            {{ disability.employee?.first_name }}
                            {{ disability.employee?.father_name }}
                          </span>
                          <span class="text-[10px] text-gray-400 truncate">
                            {{ disability.employee?.work_email }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      <span class="text-xs text-gray-300">
                        {{ disability.created_at | date : 'dd/MM/yyyy' }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      <span class="text-xs text-gray-300">
                        {{ disability.start_date | date : 'dd/MM/yyyy' }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      <span class="text-xs text-gray-300">
                        {{ disability.end_date | date : 'dd/MM/yyyy' }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      <span
                        class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold"
                      >
                        {{
                          calculateDays(
                            disability.start_date,
                            disability.end_date
                          )
                        }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      @if (disability.description) {
                      <span
                        class="text-xs text-gray-300 cursor-help inline-block max-w-[150px] truncate"
                        [pTooltip]="disability.description"
                        tooltipPosition="top"
                      >
                        {{ disability.description }}
                      </span>
                      } @else {
                      <span class="text-gray-500 text-xs">-</span>
                      }
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      <p-tag
                        [value]="getStatusLabel(disability.status)"
                        [severity]="getStatusSeverity(disability.status)"
                        [rounded]="true"
                        [style]="{
                          'font-size': '0.7rem',
                          padding: '0.125rem 0.5rem'
                        }"
                      />
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      @if (disability.created_by_employee) {
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-user text-amber-400 text-[9px]"></i>
                        <span class="text-[10px] font-medium text-amber-300">
                          {{ disability.created_by_employee.first_name }}
                          {{ disability.created_by_employee.father_name }}
                        </span>
                      </div>
                      } @else {
                      <span class="text-[10px] text-gray-500 italic">
                        Auto-solicitud
                      </span>
                      }
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
                      @if (disability.document_url) {
                      <p-button
                        icon="pi pi-download"
                        [text]="true"
                        severity="secondary"
                        size="small"
                        (onClick)="downloadDocument(disability.document_url!)"
                        pTooltip="Descargar documento"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                      } @else {
                      <span class="text-gray-500 text-xs">-</span>
                      }
                    </td>
                    <td
                      style="padding: 0.5rem; text-align: center;"
                      (click)="$event.stopPropagation()"
                    >
                      <div class="flex gap-0.5">
                        @if (disability.status === 'pending') {
                        <p-button
                          icon="pi pi-check"
                          [text]="true"
                          severity="success"
                          size="small"
                          (onClick)="
                            approveDisability(disability);
                            $event.stopPropagation()
                          "
                          pTooltip="Aprobar"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                        <p-button
                          icon="pi pi-times"
                          [text]="true"
                          severity="danger"
                          size="small"
                          (onClick)="
                            rejectDisability(disability);
                            $event.stopPropagation()
                          "
                          pTooltip="Rechazar"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                        }
                        <p-button
                          icon="pi pi-eye"
                          [text]="true"
                          severity="info"
                          size="small"
                          (onClick)="
                            viewDetails(disability); $event.stopPropagation()
                          "
                          pTooltip="Ver detalles"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
            }
          </div>
        </div>
        } @if (activeTab() === 'compensatory') {
        <!-- Dashboard de Tiempo Compensatorio -->
        <div class="space-y-3">
          <!-- Estadísticas Compactas de Tiempo Compensatorio -->
          <div class="grid grid-cols-4 gap-2">
            <!-- Total -->
            <div
              class="group relative bg-gradient-to-br from-neutral-800 to-neutral-800/80 rounded-lg p-3 border border-neutral-700/50 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
            >
              <div class="flex items-center justify-between">
                <div
                  class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
                >
                  <i class="pi pi-clock text-lg text-gray-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p
                    class="text-[10px] font-medium text-gray-400 uppercase tracking-wider m-0"
                  >
                    Total
                  </p>
                  <p class="text-xl font-bold text-white m-0">
                    {{ compensatoryTotalCount() }}
                  </p>
                </div>
              </div>
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full"
                  [style.width.%]="100"
                ></div>
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
                    {{ compensatoryPendingCount() }}
                  </p>
                </div>
              </div>
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                  [style.width.%]="
                    compensatoryTotalCount() > 0
                      ? (compensatoryPendingCount() /
                          compensatoryTotalCount()) *
                        100
                      : 0
                  "
                ></div>
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
                    {{ compensatoryApprovedCount() }}
                  </p>
                </div>
              </div>
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                  [style.width.%]="
                    compensatoryTotalCount() > 0
                      ? (compensatoryApprovedCount() /
                          compensatoryTotalCount()) *
                        100
                      : 0
                  "
                ></div>
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
                    {{ compensatoryRejectedCount() }}
                  </p>
                </div>
              </div>
              <div
                class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2"
              >
                <div
                  class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                  [style.width.%]="
                    compensatoryTotalCount() > 0
                      ? (compensatoryRejectedCount() /
                          compensatoryTotalCount()) *
                        100
                      : 0
                  "
                ></div>
              </div>
            </div>
          </div>

          <!-- Filtros Avanzados Colapsables para Tiempo Compensatorio -->
          <div
            class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm"
          >
            <div
              class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
              (click)="showCompensatoryFilters.set(!showCompensatoryFilters())"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-filter text-cyan-400 text-sm"></i>
                <h3 class="text-sm font-semibold text-white m-0">
                  Filtros Avanzados
                </h3>
                @if (hasActiveCompensatoryFilters()) {
                <span
                  class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold"
                >
                  {{ getActiveCompensatoryFiltersCount() }} activos
                </span>
                }
              </div>
              <i
                class="pi text-sm"
                [class.pi-chevron-down]="!showCompensatoryFilters()"
                [class.pi-chevron-up]="showCompensatoryFilters()"
                [class.text-gray-400]="!showCompensatoryFilters()"
                [class.text-cyan-400]="showCompensatoryFilters()"
              ></i>
            </div>

            @if (showCompensatoryFilters()) {
            <div class="p-3 space-y-2 animate-fade-in">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i
                    >Búsqueda Específica
                  </label>
                  <input
                    type="text"
                    pInputText
                    placeholder="Empleado, email, motivo..."
                    [(ngModel)]="compensatorySearchText"
                    (input)="onCompensatoryFilterChange()"
                    class="w-full text-sm py-1.5 bg-neutral-900/50 border-neutral-600"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-tag mr-1 text-cyan-400 text-xs"></i>Estado
                  </label>
                  <p-dropdown
                    [options]="compensatoryStatusOptions"
                    [(ngModel)]="compensatorySelectedStatus"
                    (onChange)="onCompensatoryFilterChange()"
                    placeholder="Todos"
                    [showClear]="true"
                    class="w-full text-sm"
                    [style]="{ height: '32px' }"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i
                    >Rango de Fechas
                  </label>
                  <p-calendar
                    [(ngModel)]="compensatoryDateRange"
                    selectionMode="range"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Seleccionar"
                    (onSelect)="onCompensatoryFilterChange()"
                    [showClear]="true"
                    class="w-full text-sm"
                    [inputStyle]="{ height: '32px', padding: '0.375rem' }"
                  />
                </div>
              </div>

              <div
                class="flex items-center justify-between pt-2 border-t border-neutral-700/50"
              >
                <p-button
                  label="Limpiar Todo"
                  icon="pi pi-filter-slash"
                  [outlined]="true"
                  severity="secondary"
                  (onClick)="clearCompensatoryFilters()"
                  [disabled]="!hasActiveCompensatoryFilters()"
                />
                <div class="flex items-center gap-2 text-sm text-gray-400">
                  <i class="pi pi-info-circle"></i>
                  <span
                    >{{ filteredCompensatoryRequests().length }} de
                    {{ compensatoryTotalCount() }} resultados</span
                  >
                </div>
              </div>
            </div>
            }
          </div>

          <!-- Tabla Compacta de Tiempo Compensatorio -->
          <div
            class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
          >
            <div class="p-2 border-b border-neutral-700/50">
              <h3
                class="text-sm font-semibold text-white m-0 flex items-center gap-1.5"
              >
                <i class="pi pi-list text-cyan-400 text-sm"></i>
                Solicitudes de Tiempo Compensatorio
              </h3>
            </div>

            <div>
              @if (compensatoryTimeoffsApi.isLoading()) {
              <div class="flex justify-center items-center py-8">
                <p-progressSpinner />
              </div>
              } @else {
              <p-table
                [value]="filteredCompensatoryRequests()"
                [paginator]="true"
                [rows]="8"
                [rowsPerPageOptions]="[5, 8, 10, 15, 25]"
                paginatorPosition="bottom"
                styleClass="p-datatable-sm p-datatable-striped"
                [globalFilterFields]="[
                  'employee.first_name',
                  'employee.father_name',
                  'employee.work_email',
                  'reason'
                ]"
                [scrollable]="false"
              >
                <ng-template #emptymessage>
                  <tr>
                    <td colspan="9" class="text-center py-4">
                      No se encontraron solicitudes de tiempo compensatorio
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="header">
                  <tr>
                    <th
                      style="width: 160px; padding: 0.4rem; text-align: left;"
                    >
                      <div class="flex items-center gap-1">
                        <i class="pi pi-user text-cyan-400 text-xs"></i>
                        <span class="text-xs">Empleado</span>
                      </div>
                    </th>
                    <th
                      style="width: 100px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i
                          class="pi pi-calendar-check text-cyan-400 text-xs"
                        ></i>
                        <span class="text-xs">Fecha Solicitud</span>
                      </div>
                    </th>
                    <th
                      style="width: 70px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-tag text-cyan-400 text-xs"></i>
                        <span class="text-xs">Tipo</span>
                      </div>
                    </th>
                    <th
                      style="width: 130px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                        <span class="text-xs">Fechas</span>
                      </div>
                    </th>
                    <th
                      style="width: 80px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-clock text-cyan-400 text-xs"></i>
                        <span class="text-xs">Cantidad</span>
                      </div>
                    </th>
                    <th
                      style="width: 120px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-comment text-cyan-400 text-xs"></i>
                        <span class="text-xs">Motivo Solicitud</span>
                      </div>
                    </th>
                    <th
                      style="width: 90px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-tag text-cyan-400 text-xs"></i>
                        <span class="text-xs">Estado</span>
                      </div>
                    </th>
                    <th
                      style="width: 140px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                        <span class="text-xs">Creado por</span>
                      </div>
                    </th>
                    <th
                      style="width: 110px; padding: 0.4rem; text-align: center;"
                    >
                      <div class="flex items-center justify-center gap-1">
                        <i class="pi pi-cog text-cyan-400 text-xs"></i>
                        <span class="text-xs">Acciones</span>
                      </div>
                    </th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-request>
                  <tr
                    class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                    (click)="viewCompensatoryDetails(request)"
                  >
                    <td style="padding: 0.4rem;">
                      <div class="flex items-center gap-1">
                        <div
                          class="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0"
                        >
                          <i class="pi pi-user text-cyan-400 text-[9px]"></i>
                        </div>
                        <div class="flex flex-col min-w-0">
                          <span class="font-medium text-white text-xs truncate">
                            {{ getEmployeeName(request) }}
                          </span>
                          <span class="text-[9px] text-gray-400 truncate">
                            {{ getEmployeeEmail(request) }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 0.4rem; text-align: center;">
                      <span class="text-xs text-gray-300">
                        {{ request.created_at | date : 'dd/MM/yyyy' }}
                      </span>
                    </td>
                    <td style="padding: 0.4rem; text-align: center;">
                      @let compensatoryType =
                      getCompensatoryTypeFromNotes(request);
                      <span class="text-xs font-medium text-white">
                        @if (compensatoryType === 'days') { Días } @else if
                        (compensatoryType === 'hours') { Horas } @else {
                        <span class="text-gray-500">-</span>
                        }
                      </span>
                    </td>
                    <td style="padding: 0.4rem; text-align: center;">
                      @let compensatoryDate =
                      getCompensatoryDateFromNotes(request); @if
                      (compensatoryDate) {
                      <span class="text-xs text-cyan-400 font-medium">{{
                        compensatoryDate | date : 'dd/MM/yyyy'
                      }}</span>
                      } @else { @let dateFrom = request.date_from | date :
                      'dd/MM/yyyy'; @let dateTo = request.date_to | date :
                      'dd/MM/yyyy'; @if (dateFrom === dateTo) {
                      <span class="text-xs text-gray-300">{{ dateFrom }}</span>
                      } @else {
                      <span class="text-xs text-gray-300"
                        >{{ dateFrom }} → {{ dateTo }}</span
                      >
                      } }
                    </td>
                    <td style="padding: 0.4rem; text-align: center;">
                      @let requestedAmount =
                      getCompensatoryRequestedAmountFromNotes(request); @let
                      quantity = getCompensatoryQuantity(request); @let compType
                      = getCompensatoryTypeFromNotes(request);
                      <span class="text-xs font-medium text-white">
                        @if (requestedAmount !== null && compType === 'days') {
                        {{ requestedAmount }} día(s) } @else if (requestedAmount
                        !== null) { {{ requestedAmount }} } @else if
                        ((quantity?.value ?? 0) > 0 && quantity?.isDays) {
                        {{ quantity?.value }} día(s) } @else if
                        ((quantity?.value ?? 0) > 0) {
                        {{ formatHoursMinutes(quantity?.value || 0) }} } @else {
                        <span class="text-gray-500">-</span>
                        }
                      </span>
                    </td>
                    <td style="padding: 0.4rem; text-align: center;">
                      @let reason = getCompensatoryReasonFromNotes(request); @if
                      (reason) {
                      <span
                        class="text-xs text-gray-300 cursor-help inline-block max-w-[110px] truncate"
                        [pTooltip]="reason"
                        tooltipPosition="top"
                      >
                        {{ reason }}
                      </span>
                      } @else {
                      <span class="text-gray-500 text-xs">-</span>
                      }
                    </td>
                    <td style="padding: 0.4rem; text-align: center;">
                      <p-tag
                        [value]="getCompensatoryStatusLabel(request)"
                        [severity]="getCompensatoryStatusSeverity(request)"
                        [style]="{
                          'font-size': '0.65rem',
                          padding: '0.1rem 0.4rem'
                        }"
                      />
                    </td>
                    <td style="padding: 0.5rem; text-align: center;">
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
                        @if (request.review_status === 'pending') {
                        <p-button
                          icon="pi pi-check"
                          [text]="true"
                          severity="success"
                          size="small"
                          (onClick)="
                            approveCompensatoryRequest(request);
                            $event.stopPropagation()
                          "
                          pTooltip="Aprobar"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                        <p-button
                          icon="pi pi-times"
                          [text]="true"
                          severity="danger"
                          size="small"
                          (onClick)="
                            rejectCompensatoryRequest(request);
                            $event.stopPropagation()
                          "
                          pTooltip="Rechazar"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                        }
                        <p-button
                          icon="pi pi-eye"
                          [text]="true"
                          severity="info"
                          size="small"
                          (onClick)="
                            viewCompensatoryDetails(request);
                            $event.stopPropagation()
                          "
                          pTooltip="Ver detalles"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
              }
            </div>
          </div>
        </div>
        } @if (activeTab() === 'documents') {
        <!-- Dashboard de Solicitudes de Documentos -->
        <pt-document-requests />
        } @if (activeTab() === 'vacations') {
        <!-- Dashboard de Vacaciones -->
        <pt-vacations />
        } @if (activeTab() === 'timelog_correction') {
        <!-- Dashboard de Marcación Errónea -->
        <pt-timelog-corrections />
        } @if (activeTab() === 'uniform_request') {
        <!-- Dashboard de Solicitudes de Uniformes -->
        <pt-uniform-requests />
        }
      </div>
    </div>

    <!-- Dialog de Detalles -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white"
            >Detalles de Incapacidad</span
          >
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-history"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="showAuditSidebar.set(!showAuditSidebar())"
              [styleClass]="
                showAuditSidebar() ? 'bg-blue-500/20 text-blue-400' : ''
              "
              pTooltip="Ver historial de cambios"
              tooltipPosition="left"
              size="small"
            />
          </div>
        </div>
      </ng-template>
      @if (selectedDisability()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Resumen de Incapacidad (lado a lado) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Información del Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-blue-400"></i>
              Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Nombre</label
                >
                <p class="text-white">
                  {{ selectedDisability()!.employee?.first_name }}
                  {{ selectedDisability()!.employee?.father_name }}
                  {{ selectedDisability()!.employee?.mother_name }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ selectedDisability()!.employee?.work_email }}
                </p>
              </div>
              @if (selectedDisability()!.employee?.position?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ selectedDisability()!.employee?.position?.name }}
                </p>
              </div>
              } @if (selectedDisability()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ selectedDisability()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Resumen de Incapacidad -->
          <div
            class="p-4 bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-calendar-check text-blue-400"></i>
              Resumen de Incapacidad
            </h3>
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">Duración total</p>
                <p class="text-3xl font-bold text-blue-300">
                  {{
                    calculateDays(
                      selectedDisability()!.start_date,
                      selectedDisability()!.end_date
                    )
                  }}
                  días
                </p>
              </div>
              <div
                class="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center"
              >
                <i class="pi pi-calendar-check text-blue-400 text-3xl"></i>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <div
                class="bg-blue-500/10 border border-blue-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-blue-300">
                    Fecha Inicio
                  </span>
                  <span class="text-xs font-bold text-blue-400">
                    {{ selectedDisability()!.start_date | date : 'dd/MM/yyyy' }}
                  </span>
                </div>
              </div>
              <div
                class="bg-blue-500/10 border border-blue-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-blue-300">
                    Fecha Fin
                  </span>
                  <span class="text-xs font-bold text-blue-400">
                    {{ selectedDisability()!.end_date | date : 'dd/MM/yyyy' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Información de la Incapacidad -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-blue-400"></i>
            Información de la Incapacidad
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Inicio</label
              >
              <p class="text-white">
                {{ selectedDisability()!.start_date | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Fin</label
              >
              <p class="text-white">
                {{ selectedDisability()!.end_date | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Duración</label
              >
              <p class="text-white">
                {{
                  calculateDays(
                    selectedDisability()!.start_date,
                    selectedDisability()!.end_date
                  )
                }}
                día(s)
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getStatusLabel(selectedDisability()!.status)"
                [severity]="getStatusSeverity(selectedDisability()!.status)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{
                  selectedDisability()!.created_at | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
          </div>
        </div>

        @if (selectedDisability()!.description) {
        <!-- Descripción -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-blue-400"></i>
            Descripción
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ selectedDisability()!.description }}
          </p>
        </div>
        } @if (selectedDisability()!.document_url) {
        <!-- Documento de Incapacidad -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <div class="flex items-center justify-between mb-3">
            <h3
              class="text-lg font-semibold text-white flex items-center gap-2"
            >
              <i class="pi pi-file text-blue-400"></i>
              Documento de Incapacidad
            </h3>
            <p-button
              icon="pi pi-download"
              label="Descargar"
              (onClick)="downloadDocument(selectedDisability()!.document_url!)"
              severity="info"
              [text]="true"
              size="small"
            />
          </div>
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-300 mb-0 text-sm">
              <i class="pi pi-file mr-2"></i>
              Documento adjunto
            </p>
            <div class="flex items-center gap-2">
              <p-button
                icon="pi pi-search-minus"
                (onClick)="zoomOut()"
                [text]="true"
                [rounded]="true"
                severity="secondary"
                size="small"
                [disabled]="zoomLevel() <= 0.5"
                pTooltip="Alejar"
              />
              <span class="text-sm text-gray-400 min-w-[60px] text-center">
                {{ (zoomLevel() * 100).toFixed(0) }}%
              </span>
              <p-button
                icon="pi pi-search-plus"
                (onClick)="zoomIn()"
                [text]="true"
                [rounded]="true"
                severity="secondary"
                size="small"
                [disabled]="zoomLevel() >= 2"
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
          </div>
          <div
            class="border border-gray-700 rounded-lg overflow-hidden bg-gray-900"
          >
            <div
              class="overflow-auto max-h-[600px] bg-gray-800"
              style="padding: 20px;"
            >
              <div
                class="pdf-container"
                [style.transform]="'scale(' + zoomLevel() + ')'"
                [style.transform-origin]="'top left'"
                style="width: 100%; min-height: 800px;"
              >
                <object
                  [data]="pdfUrl()"
                  type="application/pdf"
                  class="w-full"
                  style="min-height: 800px; border: none;"
                >
                  <p class="text-gray-400 p-4">
                    No se puede mostrar el PDF.
                    <a
                      [href]="pdfUrlForLink()"
                      target="_blank"
                      class="text-blue-400 underline"
                    >
                      Abrir en nueva pestaña
                    </a>
                  </p>
                </object>
              </div>
            </div>
          </div>
        </div>
        } @if (selectedDisability()!.status === 'rejected') {
        <!-- Motivo de Rechazo -->
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-red-400"></i>
            Motivo de Rechazo
          </h3>
          <textarea
            pInputTextarea
            [(ngModel)]="disabilityRejectionComment"
            placeholder="Agregar o editar el motivo del rechazo..."
            rows="3"
            class="w-full"
          ></textarea>
          <div class="flex justify-end mt-2">
            <p-button
              label="Guardar Comentario"
              icon="pi pi-save"
              size="small"
              [loading]="savingDisabilityComment()"
              (onClick)="saveDisabilityRejectionComment()"
            />
          </div>
        </div>
        }

        <!-- Gestión de Estado -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-cog text-blue-400"></i>
            Gestión de Estado
          </h3>
          <div class="flex gap-2">
            @for (status of statusOptions; track status.value) {
            <p-button
              [label]="status.label"
              [severity]="
                status.value === 'approved'
                  ? 'success'
                  : status.value === 'rejected'
                  ? 'danger'
                  : 'warn'
              "
              [outlined]="selectedDisability()!.status !== status.value"
              (onClick)="updateDisabilityStatusFromDialog(status.value)"
              [disabled]="selectedDisability()!.status === status.value"
            />
            }
          </div>
        </div>
      </div>
      }
    </p-dialog>

    <!-- Dialog de Detalles de Tiempo Compensatorio -->
    <p-dialog
      [(visible)]="showCompensatoryDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white"
            >Detalles de Solicitud de Tiempo Compensatorio</span
          >
          <div class="flex items-center gap-2">
            <p-button
              [icon]="
                selectedCompensatoryRequest()!.document_url
                  ? 'pi pi-file'
                  : 'pi pi-paperclip'
              "
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="
                selectedCompensatoryRequest()!.document_url
                  ? openCompensatoryDocument()
                  : attachDocumentToCompensatoryRequest()
              "
              [pTooltip]="
                selectedCompensatoryRequest()!.document_url
                  ? 'Ver documento adjunto'
                  : 'Adjuntar documento'
              "
              tooltipPosition="left"
              size="small"
            />
            <p-button
              icon="pi pi-history"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="showAuditSidebar.set(!showAuditSidebar())"
              [styleClass]="
                showAuditSidebar() ? 'bg-cyan-500/20 text-cyan-400' : ''
              "
              pTooltip="Ver historial de cambios"
              tooltipPosition="left"
              size="small"
            />
          </div>
        </div>
      </ng-template>
      @if (selectedCompensatoryRequest()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Horas Extras Disponibles (lado a lado) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Información del Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-cyan-400"></i>
              Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Nombre</label
                >
                <p class="text-white">
                  {{ getEmployeeName(selectedCompensatoryRequest()!) }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ getEmployeeEmail(selectedCompensatoryRequest()!) }}
                </p>
              </div>
              @if (getEmployeePosition(selectedCompensatoryRequest()!)) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ getEmployeePosition(selectedCompensatoryRequest()!) }}
                </p>
              </div>
              } @if (selectedCompensatoryRequest()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ selectedCompensatoryRequest()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Horas Extra Pendientes (histórico) -->
          <div
            class="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-clock text-cyan-400"></i>
              Horas Extra Pendientes (histórico)
            </h3>
            @if (isLoadingOvertimeHours()) {
            <div class="flex items-center gap-2 text-gray-400">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Cargando horas extras...</span>
            </div>
            } @else {
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">
                  Total pendiente (no usado)
                </p>
                <p class="text-3xl font-bold text-cyan-300">
                  {{ formatHoursMinutes(employeeOvertimeHours()) }}
                </p>
              </div>
              <div
                class="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center"
              >
                <i class="pi pi-clock text-cyan-400 text-3xl"></i>
              </div>
            </div>
            @if (employeeOvertimeDays().length > 0) {
            <!-- Mostrar días con horas extras -->
            <div class="mt-3">
              <p class="text-xs font-medium text-gray-300 mb-2">
                Días con saldo pendiente (mostrando últimos
                {{ employeeOvertimeDays().length }}):
              </p>
              <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                @for (day of employeeOvertimeDays(); track day.day) {
                <div
                  class="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-2 hover:bg-cyan-500/20 transition-colors"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold text-cyan-300">
                      {{ formatDate(day.day) }}
                    </span>
                    <span class="text-xs font-bold text-cyan-400">
                      {{ formatHoursMinutes(day.overtimeHours) }}
                    </span>
                  </div>
                  @if (day.entryTime && day.exitTime) {
                  <div class="text-xs text-gray-400">
                    {{ day.entryTime }} - {{ day.exitTime }}
                  </div>
                  }
                </div>
                }
              </div>
              <div class="mt-3 flex items-center justify-between gap-2">
                <p class="text-[11px] text-gray-400 m-0">
                  Cargando histórico: últimos
                  {{ overtimeHistoryWindowDays() }} días
                </p>
                <p-button
                  label="Cargar más"
                  icon="pi pi-plus"
                  size="small"
                  severity="secondary"
                  [outlined]="true"
                  (onClick)="loadMoreOvertimeHistory()"
                />
              </div>
            </div>
            } @else {
            <p class="text-xs text-gray-400 mt-3">
              No hay días con horas extra pendientes dentro del rango cargado.
            </p>
            } }
          </div>
        </div>

        <!-- Información de la Solicitud -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-cyan-400"></i>
            Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Solicitud</label
              >
              <p class="text-white">
                @let compensatoryType =
                getCompensatoryTypeFromNotes(selectedCompensatoryRequest()!);
                @if (compensatoryType === 'days') {
                <span class="flex items-center gap-2">
                  <i class="pi pi-calendar text-cyan-400"></i>
                  Días
                </span>
                } @else if (compensatoryType === 'hours') {
                <span class="flex items-center gap-2">
                  <i class="pi pi-clock text-cyan-400"></i>
                  Horas
                </span>
                } @else {
                <span class="text-gray-400">No especificado</span>
                }
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Cantidad Solicitada</label
              >
              <p class="text-white">
                @let quantity =
                getCompensatoryQuantity(selectedCompensatoryRequest()!); @if
                (quantity && quantity.value > 0) { @if (quantity.isDays) {
                {{ quantity.value }} día(s) ({{ quantity.value * 8 }} horas) }
                @else {
                {{ formatHoursMinutes(quantity.value) }}
                } } @else {
                <span class="text-gray-400">No especificada</span>
                }
              </p>
            </div>
            @let compensatoryDate =
            getCompensatoryDateFromNotes(selectedCompensatoryRequest()!); @if
            (compensatoryDate) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha del Compensatorio</label
              >
              <p class="text-white font-medium text-cyan-400">
                {{ compensatoryDate | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            } @else { @let dateFrom = selectedCompensatoryRequest()!.date_from |
            date : 'dd/MM/yyyy'; @let dateTo =
            selectedCompensatoryRequest()!.date_to | date : 'dd/MM/yyyy'; @if
            (dateFrom === dateTo) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha Registrada</label
              >
              <p class="text-white">
                {{ dateFrom }}
              </p>
            </div>
            } @else {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Período Registrado</label
              >
              <p class="text-white">{{ dateFrom }} → {{ dateTo }}</p>
            </div>
            } } @let timeInfo =
            getCompensatoryTimeFromNotes(selectedCompensatoryRequest()!); @if
            (timeInfo.start || timeInfo.end) {
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Horario del Compensatorio</label
              >
              <p class="text-white font-mono">
                @if (timeInfo.start && timeInfo.end) {
                {{ timeInfo.start }} - {{ timeInfo.end }} } @else if
                (timeInfo.start) { Desde: {{ timeInfo.start }} } @else if
                (timeInfo.end) { Hasta: {{ timeInfo.end }}
                }
              </p>
            </div>
            }
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{
                  selectedCompensatoryRequest()!.created_at
                    | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="
                  getCompensatoryStatusLabel(selectedCompensatoryRequest()!)
                "
                [severity]="
                  getCompensatoryStatusSeverity(selectedCompensatoryRequest()!)
                "
              />
            </div>
            @let overtimeDates =
            getCompensatoryOvertimeDatesFromNotes(selectedCompensatoryRequest()!);
            @if (overtimeDates.length > 0) {
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-400 mb-2"
                >Días donde trabajó horas extra (reportados por el
                empleado)</label
              >
              <div class="flex flex-wrap gap-2">
                @for (date of overtimeDates; track date) {
                <span
                  class="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex flex-col gap-0.5"
                >
                  <span class="font-semibold text-white text-sm">
                    {{ date | date : 'dd/MM/yyyy' }}
                  </span>
                  <span class="text-gray-300 text-xs">
                    {{ getManualDateSaldoLabel(date) }}
                  </span>
                </span>
                }
              </div>
              <p class="text-xs text-gray-400 mt-2">
                Total de días reportados: {{ overtimeDates.length }}
              </p>
            </div>
            }
          </div>

          @let reason =
          getCompensatoryReasonFromNotes(selectedCompensatoryRequest()!); @if
          (reason) {
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Motivo</label
            >
            <p
              class="text-white whitespace-pre-wrap bg-neutral-900/50 p-3 rounded"
            >
              {{ reason }}
            </p>
          </div>
          } @if (selectedCompensatoryRequest()!.rejection_comment) {
          <div class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <label class="block text-sm font-medium text-red-400 mb-1"
              >Comentario de Rechazo</label
            >
            <p class="text-red-300 whitespace-pre-wrap">
              {{ selectedCompensatoryRequest()!.rejection_comment }}
            </p>
          </div>
          } @if (selectedCompensatoryRequest()!.rejection_comment ||
          selectedCompensatoryRequest()!.review_status === 'rejected') {
          <div
            class="mt-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
          >
            <label class="block text-sm font-medium text-gray-400 mb-2">
              Motivo de Rechazo (editable)
            </label>
            <textarea
              pInputTextarea
              [(ngModel)]="compensatoryRejectionComment"
              placeholder="Agregar o editar el motivo del rechazo..."
              rows="3"
              class="w-full"
            ></textarea>
            <div class="flex justify-end mt-2">
              <p-button
                label="Guardar Comentario"
                icon="pi pi-save"
                size="small"
                [loading]="savingCompensatoryComment()"
                (onClick)="saveCompensatoryRejectionComment()"
              />
            </div>
          </div>
          }
        </div>

        <!-- Fechas donde trabajó horas extra -->
        @if (getOvertimeDaysFromNotes(selectedCompensatoryRequest()!)) {
        <div
          class="p-5 bg-neutral-800 rounded-lg border border-neutral-700 shadow-lg"
        >
          <h3
            class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
          >
            <i class="pi pi-calendar-check text-cyan-400"></i>
            Fechas donde trabajó horas extra
          </h3>
          <div class="overflow-x-auto -mx-2">
            <p-table
              [value]="
                getOvertimeDaysFromNotes(selectedCompensatoryRequest()!) || []
              "
              styleClass="p-datatable-sm overtime-details-table"
              [paginator]="false"
              [scrollable]="true"
              scrollHeight="300px"
              showGridlines
            >
              <ng-template #header>
                <tr>
                  <th class="text-left font-semibold">Fecha</th>
                  <th class="text-left font-semibold">Hora de Entrada</th>
                  <th class="text-left font-semibold">Hora de Salida</th>
                  <th class="text-right font-semibold">Horas Totales</th>
                  <th class="text-right font-semibold">Tiempo de Almuerzo</th>
                  <th class="text-right font-semibold">Retraso</th>
                  <th class="text-right font-semibold">Horas Extra</th>
                </tr>
              </ng-template>
              <ng-template #body let-dayDetail>
                <tr class="hover:bg-neutral-700/50 transition-colors">
                  <td class="font-semibold text-white py-3">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-calendar text-cyan-400 text-sm"></i>
                      <span>{{ dayDetail.date }}</span>
                    </div>
                  </td>
                  <td class="py-3">
                    <div
                      class="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded"
                    >
                      <i class="pi pi-sign-in text-green-400 text-sm"></i>
                      <span
                        class="font-mono text-sm font-semibold text-green-300"
                        >{{ dayDetail.entryTime }}</span
                      >
                    </div>
                  </td>
                  <td class="py-3">
                    <div
                      class="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded"
                    >
                      <i class="pi pi-sign-out text-red-400 text-sm"></i>
                      <span
                        class="font-mono text-sm font-semibold text-red-300"
                        >{{ dayDetail.exitTime }}</span
                      >
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <div class="flex flex-col items-end">
                      <span class="font-semibold text-white text-sm">{{
                        formatHoursMinutes(dayDetail.totalHours)
                      }}</span>
                      <span class="text-xs text-gray-400 mt-0.5">(neto)</span>
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <span class="text-gray-300 font-medium text-sm">{{
                      formatHoursMinutes(dayDetail.lunchDuration)
                    }}</span>
                  </td>
                  <td class="text-right py-3">
                    @if (hasDelay(dayDetail.delayHours)) {
                    <span
                      class="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm font-semibold"
                    >
                      {{ formatHoursMinutes(dayDetail.delayHours) }}
                    </span>
                    } @else {
                    <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td class="text-right py-3">
                    <span
                      class="px-3 py-1.5 bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 text-cyan-300 rounded-lg font-bold text-sm border border-cyan-400/30"
                    >
                      {{ formatHoursMinutes(dayDetail.overtimeHours) }}
                    </span>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
        }
      </div>
      }

      <!-- Panel lateral de historial (deslizable desde la derecha) -->
      <div
        class="fixed bg-neutral-900 border-l border-neutral-700 shadow-2xl z-[1200] transition-all duration-500 ease-out"
        [style.width]="'320px'"
        [style.max-width]="'30vw'"
        [style.top]="'50%'"
        [style.left]="showAuditSidebar() ? 'calc(50% + 400px)' : '50%'"
        [style.transform]="
          showAuditSidebar()
            ? 'translateY(-50%) translateX(0) scale(1)'
            : 'translateY(-50%) translateX(0) scale(0.8)'
        "
        [style.opacity]="showAuditSidebar() ? '1' : '0'"
        [style.max-height]="'90vh'"
        [style.height]="'664px'"
        [style.pointer-events]="showAuditSidebar() ? 'auto' : 'none'"
      >
        <div class="flex flex-col h-full">
          <!-- Header del panel lateral -->
          <div
            class="p-4 border-b border-neutral-700 bg-neutral-800 flex items-center justify-between"
          >
            <h3
              class="text-lg font-semibold text-white flex items-center gap-2"
            >
              <i class="pi pi-history text-cyan-400"></i>
              Historial de Cambios
            </h3>
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="showAuditSidebar.set(false)"
              size="small"
            />
          </div>

          <!-- Contenido del historial -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (isLoadingAuditHistory()) {
            <div
              class="flex items-center justify-center gap-2 text-gray-400 py-8"
            >
              <i class="pi pi-spin pi-spinner"></i>
              <span class="text-sm">Cargando historial...</span>
            </div>
            } @else if (auditHistory().length === 0) {
            <div class="text-center py-8 text-gray-400">
              <i class="pi pi-info-circle text-4xl mb-4"></i>
              <p class="text-sm">No hay historial de cambios disponible</p>
            </div>
            } @else {
            <div class="space-y-3">
              @for (log of auditHistory(); track log.id) { @let isExpanded =
              expandedAuditItems().has(log.id);
              <div
                class="rounded-lg bg-gradient-to-br from-neutral-800/80 to-neutral-800/50 border border-neutral-700/70 overflow-hidden transition-all hover:border-cyan-500/30 shadow-lg"
              >
                <!-- Contenido siempre visible (mejorado) -->
                <div class="p-4 space-y-3">
                  <!-- Header con usuario y acción -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        [class]="
                          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' +
                          getActionColor(log.action)
                            .replace('text-', 'bg-')
                            .replace('-400', '-500/20')
                        "
                      >
                        <i
                          [class]="
                            'pi ' +
                            getActionIcon(log.action) +
                            ' ' +
                            getActionColor(log.action) +
                            ' text-lg'
                          "
                        ></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-white font-semibold text-sm mb-1">
                          {{
                            log.changed_by_employee
                              ? log.changed_by_employee.first_name +
                                ' ' +
                                log.changed_by_employee.father_name
                              : 'Usuario desconocido'
                          }}
                        </div>
                        <div class="text-gray-400 text-xs mb-2">
                          {{ getActionLabel(log.action) }}
                        </div>
                        <div
                          class="text-gray-500 text-xs flex items-center gap-1"
                        >
                          <i class="pi pi-calendar text-[10px]"></i>
                          {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}
                        </div>
                      </div>
                    </div>
                    <!-- Botón para colapsar/expandir -->
                    <button
                      type="button"
                      (click)="toggleAuditItem(log.id)"
                      class="flex-shrink-0 p-1.5 rounded hover:bg-neutral-700 transition-colors"
                      [class.bg-neutral-700]="isExpanded"
                    >
                      <i
                        [class]="
                          'pi transition-transform duration-200 text-gray-400 text-xs ' +
                          (isExpanded ? 'pi-chevron-up' : 'pi-chevron-down')
                        "
                      ></i>
                    </button>
                  </div>

                  <!-- Contenido expandible con más detalles -->
                  @if (isExpanded) {
                  <div
                    class="pt-3 mt-3 border-t border-neutral-700/50 space-y-3 animate-fade-in"
                  >
                    @if (log.old_status && log.new_status) {
                    <div
                      class="p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50"
                    >
                      <div class="text-xs text-gray-400 mb-2 font-medium">
                        Cambio de Estado
                      </div>
                      <div class="flex items-center gap-2">
                        <span
                          class="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-semibold border border-yellow-500/30"
                        >
                          {{ getStatusLabel(log.old_status) }}
                        </span>
                        <i class="pi pi-arrow-right text-gray-500 text-sm"></i>
                        <span
                          class="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30"
                        >
                          {{ getStatusLabel(log.new_status) }}
                        </span>
                      </div>
                    </div>
                    } @if (log.comment) {
                    <div
                      class="p-3 bg-cyan-500/10 rounded-lg border-l-4 border-cyan-400"
                    >
                      <div
                        class="text-xs text-cyan-300 mb-1.5 font-medium flex items-center gap-1"
                      >
                        <i class="pi pi-comment text-[10px]"></i>
                        Comentario
                      </div>
                      <p class="text-gray-200 text-xs leading-relaxed italic">
                        {{ log.comment }}
                      </p>
                    </div>
                    }
                  </div>
                  }
                </div>
              </div>
              }
            </div>
            }
          </div>
        </div>
      </div>

      <!-- Panel lateral de preview de documento -->
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
            <h3
              class="text-lg font-semibold text-white flex items-center gap-2"
            >
              <i class="pi pi-file text-cyan-400"></i>
              Documento Adjunto
            </h3>
            <div class="flex items-center gap-2">
              @if (selectedCompensatoryRequest()!.document_url) {
              <p-button
                label="Adjuntar nuevo archivo"
                icon="pi pi-upload"
                size="small"
                severity="secondary"
                [outlined]="true"
                (onClick)="attachDocumentToCompensatoryRequest()"
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

          <!-- Contenido del preview -->
          <div class="flex-1 overflow-hidden">
            @if (selectedCompensatoryRequest()!.document_url) {
            <iframe
              [src]="getCompensatoryDocumentUrl()"
              class="w-full h-full border-0"
              title="Preview del documento"
            ></iframe>
            } @else {
            <div
              class="flex flex-col items-center justify-center h-full p-8 text-center"
            >
              <i class="pi pi-file text-6xl text-gray-400 mb-4"></i>
              <h4 class="text-xl font-semibold text-white mb-2">
                No hay documento adjunto
              </h4>
              <p class="text-gray-400 mb-6">
                Puedes adjuntar un documento PDF a esta solicitud de tiempo
                compensatorio.
              </p>
              <p-button
                label="Adjuntar archivo"
                icon="pi pi-upload"
                severity="info"
                (onClick)="attachDocumentToCompensatoryRequest()"
              />
            </div>
            }
          </div>
        </div>
      </div>
      }

      <!-- Overlay para cerrar el panel al hacer clic fuera -->
      @if (showAuditSidebar() || showDocumentPreview()) {
      <div
        class="fixed inset-0 bg-black/50 z-[1199]"
        (click)="showAuditSidebar.set(false); showDocumentPreview.set(false)"
      ></div>
      }
    </p-dialog>

    <!-- Dialog de Historial de Auditoría Completo -->
    <p-dialog
      [(visible)]="showAuditHistoryDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1000px' }"
      [header]="'Historial de Auditoría - Tiempo Compensatorio'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <div class="space-y-4 pt-4">
        @if (isLoadingAllAuditHistory()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando historial de auditoría...</span>
        </div>
        } @else if (allAuditHistory().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-info-circle text-4xl mb-4"></i>
          <p>No hay registros de auditoría disponibles</p>
        </div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of allAuditHistory(); track log.id) {
          <div
            class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div
                [class]="
                  'w-10 h-10 rounded-full flex items-center justify-center ' +
                  getActionColor(log.action) +
                  ' bg-opacity-20'
                "
              >
                <i [class]="'pi ' + getActionIcon(log.action) + ' text-lg'"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="text-white font-semibold">
                      {{
                        log.changed_by_employee
                          ? log.changed_by_employee.first_name +
                            ' ' +
                            log.changed_by_employee.father_name
                          : 'Usuario desconocido'
                      }}
                    </div>
                    <div class="text-sm text-gray-400">
                      {{ getActionLabel(log.action) }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}
                  </div>
                </div>
                @if (log.comment) {
                <div
                  class="text-sm text-gray-300 mt-2 p-2 bg-neutral-900/50 rounded border-l-2 border-cyan-400"
                >
                  {{ log.comment }}
                </div>
                } @if (log.old_status && log.new_status) {
                <div class="flex items-center gap-2 mt-2 text-xs">
                  <span class="text-gray-400">Estado:</span>
                  <span
                    class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400"
                    >{{ log.old_status }}</span
                  >
                  <i class="pi pi-arrow-right text-gray-500"></i>
                  <span
                    class="px-2 py-1 rounded bg-green-500/20 text-green-400"
                    >{{ log.new_status }}</span
                  >
                </div>
                }
                <div class="text-xs text-gray-500 mt-2">
                  Solicitud ID:
                  <span class="font-mono text-gray-400"
                    >{{ log.timeoff_id.substring(0, 8) }}...</span
                  >
                </div>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button
            label="Cerrar"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="showAuditHistoryDialog.set(false)"
            [rounded]="true"
          />
        </div>
      </ng-template>
    </p-dialog>
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
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private dashboardStore = inject(DashboardStore);
  private router = inject(Router);
  private auditService = inject(TimeoffAuditService);
  private sanitizer = inject(DomSanitizer);
  private vacationsService = inject(VacationsService);
  private documentRequestsService = inject(DocumentRequestsService);

  // Método para navegar a diferentes pestañas
  public navigateToTab(
    tab:
      | 'disabilities'
      | 'compensatory'
      | 'documents'
      | 'vacations'
      | 'timelog_correction'
      | 'uniform_request'
  ): void {
    this.activeTab.set(tab);
  }

  // API para obtener incapacidades con información del empleado
  public disabilitiesApi = httpResource<Disability[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined; // No hacer request si no hay company_id
    }

    const params: any = {
      // Ahora podemos filtrar directamente por company_id ya que se agregó el campo a la tabla
      select: `id,employee_id,created_by,start_date,end_date,description,document_url,status,reviewed_by,reviewed_at,review_notes,rejection_comment,created_at,updated_at,company_id,employee:employees!employee_disabilities_employee_id_fkey(id,first_name,father_name,mother_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!employee_disabilities_created_by_fkey(first_name,father_name)`,
      // Filtrar directamente por company_id (campo agregado a la tabla)
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_disabilities`,
      method: 'GET',
      params,
    };
  });

  // Filtros
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);

  // Nuevas señales para el dashboard mejorado
  public activeTab = signal<
    | 'disabilities'
    | 'compensatory'
    | 'documents'
    | 'vacations'
    | 'suggestions'
    | 'timelog_correction'
    | 'uniform_request'
  >('disabilities');
  public showFilters = signal(false);
  public showCompensatoryFilters = signal(false);
  public showDocumentsFilters = signal(false);
  public globalSearchText = signal('');
  public selectedDisabilities = signal<string[]>([]);

  // Dialog
  public showDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);
  public showCompensatoryDetailsDialog = signal(false);
  public selectedCompensatoryRequest = signal<CompensatoryRequest | null>(null);
  public auditHistory = signal<TimeoffAuditLog[]>([]);
  public isLoadingAuditHistory = signal(false);
  public employeeOvertimeHours = signal<number>(0);
  public zoomLevel = signal(1);

  // Signal computado para la URL del PDF sanitizada
  public pdfUrl = computed(() => {
    const disability = this.selectedDisability();
    if (!disability?.document_url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    const pdfUrl = `${disability.document_url}#toolbar=1&navpanes=1&scrollbar=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  });

  // URL sanitizada para el enlace de fallback
  public pdfUrlForLink = computed(() => {
    const disability = this.selectedDisability();
    if (!disability?.document_url) {
      return this.sanitizer.bypassSecurityTrustUrl('');
    }
    return this.sanitizer.bypassSecurityTrustUrl(disability.document_url);
  });

  // URL sanitizada para el documento del compensatorio
  public getCompensatoryDocumentUrl() {
    const request = this.selectedCompensatoryRequest();
    if (!request?.document_url) {
      return '';
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${request.document_url}#toolbar=1&navpanes=1&scrollbar=1`
    );
  }
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
  public showDocumentPreview = signal(false);

  // Señales para edición de comentarios
  public disabilityRejectionComment = signal('');
  public compensatoryRejectionComment = signal('');
  public savingDisabilityComment = signal(false);
  public savingCompensatoryComment = signal(false);

  // Opciones de estado
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Estadísticas
  public totalCount = computed(() => this.disabilitiesApi.value()?.length || 0);
  public pendingCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'pending')
        .length || 0
  );
  public approvedCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'approved')
        .length || 0
  );
  public rejectedCount = computed(
    () =>
      this.disabilitiesApi.value()?.filter((d) => d.status === 'rejected')
        .length || 0
  );

  // Incapacidades filtradas
  public filteredDisabilities = computed(() => {
    let disabilities = this.disabilitiesApi.value() || [];

    // Filtro por búsqueda global
    const globalSearch = this.globalSearchText().toLowerCase();
    if (globalSearch) {
      disabilities = disabilities.filter((d) => {
        const employeeName = `${d.employee?.first_name || ''} ${
          d.employee?.father_name || ''
        }`.toLowerCase();
        const email = d.employee?.work_email?.toLowerCase() || '';
        const description = d.description?.toLowerCase() || '';
        return (
          employeeName.includes(globalSearch) ||
          email.includes(globalSearch) ||
          description.includes(globalSearch)
        );
      });
    }

    // Filtro por texto específico
    const search = this.searchText().toLowerCase();
    if (search) {
      disabilities = disabilities.filter((d) => {
        const employeeName = `${d.employee?.first_name || ''} ${
          d.employee?.father_name || ''
        }`.toLowerCase();
        const email = d.employee?.work_email?.toLowerCase() || '';
        const description = d.description?.toLowerCase() || '';
        return (
          employeeName.includes(search) ||
          email.includes(search) ||
          description.includes(search)
        );
      });
    }

    // Filtro por estado
    const status = this.selectedStatus();
    if (status) {
      disabilities = disabilities.filter((d) => d.status === status);
    }

    // Filtro por rango de fechas
    const dateRange = this.dateRange();
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      disabilities = disabilities.filter((d) => {
        const disabilityStart = new Date(d.start_date);
        return disabilityStart >= startDate && disabilityStart <= endDate;
      });
    }

    return disabilities;
  });

  public calculateDays(start: string | Date, end: string | Date): number {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  public calculateHoursFromDates(
    dateFrom: Date | string,
    dateTo: Date | string
  ): number {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    // Validar que las fechas sean válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 0;
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100; // Redondear a 2 decimales
  }

  public formatHoursMinutes(hours: number): string {
    if (hours === 0) return '0m';

    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (wholeHours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  }

  public formatDate(dateString: string): string {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  }

  public getCompensatoryQuantity(data: CompensatoryRequest): {
    value: number;
    isDays: boolean;
  } {
    // Log temporal para depuración
    console.log('getCompensatoryQuantity data:', {
      compensatory_type: data.compensatory_type,
      compensatory_amount: data.compensatory_amount,
      date_from: data.date_from,
      date_to: data.date_to,
      fullData: data,
    });

    // Primero intentar determinar si es días u horas desde las notas o el campo compensatory_type
    let isDays = false;

    // 1. Intentar desde compensatory_type si existe
    if (data.compensatory_type) {
      isDays = data.compensatory_type === 'days';
    }
    // 2. Intentar desde las notas
    else if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      // Buscar nota que contenga "Tipo:"
      const tipoNote = notesArray.find(
        (note: any) => typeof note === 'string' && note.includes('Tipo:')
      );

      if (tipoNote) {
        isDays = tipoNote.includes('Días');
      }
      // 3. Si no hay nota de tipo, determinar por el formato de las fechas y la diferencia
      else if (data.date_from && data.date_to) {
        const dateFromStr = String(data.date_from);
        const dateToStr = String(data.date_to);

        // Si las fechas incluyen hora (formato datetime), probablemente es por horas
        const hasTimeInFrom =
          dateFromStr.includes(' ') && dateFromStr.includes(':');
        const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');

        if (hasTimeInFrom && hasTimeInTo) {
          // Tiene hora, es por horas
          isDays = false;
        } else {
          // No tiene hora, calcular diferencia
          const hours = this.calculateHoursFromDates(
            data.date_from,
            data.date_to
          );
          const days = hours / 24;
          // Si la diferencia es un número entero de días (tolerancia pequeña)
          isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
        }
      }
    }
    // 4. Si no hay notas, intentar determinar por formato de fechas
    else if (data.date_from && data.date_to) {
      const dateFromStr = String(data.date_from);
      const dateToStr = String(data.date_to);

      const hasTimeInFrom =
        dateFromStr.includes(' ') && dateFromStr.includes(':');
      const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');

      if (hasTimeInFrom && hasTimeInTo) {
        isDays = false;
      } else {
        const hours = this.calculateHoursFromDates(
          data.date_from,
          data.date_to
        );
        const days = hours / 24;
        isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
      }
    }

    if (isDays === true) {
      // Calcular días desde fechas o usar compensatory_amount
      let days = 0;
      if (data.compensatory_amount) {
        days = data.compensatory_amount;
      } else if (data.date_from && data.date_to) {
        days = this.calculateDays(data.date_from, data.date_to);
      }
      return { value: days > 0 ? days : 1, isDays: true };
    } else if (isDays === false) {
      // Para horas, priorizar compensatory_amount si existe
      let hours = 0;
      if (data.compensatory_amount) {
        hours = data.compensatory_amount;
      } else if (data.date_from && data.date_to) {
        hours = this.calculateHoursFromDates(data.date_from, data.date_to);

        // Si el resultado es muy grande (más de 24 horas), probablemente es un error
        // y debería ser días en lugar de horas
        if (hours >= 24 && hours % 24 < 0.1) {
          // Es un número entero de días, convertir a días
          const days = Math.round(hours / 24);
          return { value: days, isDays: true };
        }
      } else if (data.hours) {
        hours = data.hours;
      }

      // Si no hay horas calculadas y no hay datos, devolver 0 para que se muestre "-"
      if (
        hours === 0 &&
        !data.date_from &&
        !data.date_to &&
        !data.hours &&
        !data.compensatory_amount
      ) {
        return { value: 0, isDays: false };
      }

      return { value: hours > 0 ? hours : 0, isDays: false };
    }

    // Si no se pudo determinar el tipo, intentar usar compensatory_amount como fallback
    const amount = data.compensatory_amount ?? 0;
    if (amount > 0) {
      // Si hay amount pero no type, asumir horas (más común)
      return { value: amount, isDays: false };
    }

    // Si no hay datos, devolver 0 para que se muestre "-"
    return { value: 0, isDays: false };
  }

  public getCompensatoryTypeFromNotes(
    data: CompensatoryRequest
  ): 'days' | 'hours' | null {
    // Primero intentar desde compensatory_type si existe
    if (data.compensatory_type) {
      return data.compensatory_type;
    }

    // Intentar desde las notas
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      // Buscar nota que contenga "Tipo:"
      const tipoNote = notesArray.find(
        (note: any) => typeof note === 'string' && note.includes('Tipo:')
      );

      if (tipoNote) {
        const match = tipoNote.match(/Tipo:\s*(hours|days)/);
        if (match && match[1]) {
          return match[1] as 'hours' | 'days';
        }
      }
    }

    // Si no se encuentra, intentar determinar por formato de fechas
    if (data.date_from && data.date_to) {
      const dateFromStr = String(data.date_from);
      const dateToStr = String(data.date_to);

      const hasTimeInFrom =
        dateFromStr.includes(' ') && dateFromStr.includes(':');
      const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');

      if (hasTimeInFrom && hasTimeInTo) {
        return 'hours';
      } else {
        return 'days';
      }
    }

    return null;
  }

  public getCompensatoryReasonFromNotes(
    data: CompensatoryRequest
  ): string | null {
    // Primero intentar desde reason si existe
    if (data.reason) {
      return data.reason;
    }

    // Intentar desde las notas - la primera nota que no esté vacía y no sea técnica
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      // Buscar la primera nota que no sea información técnica (Tipo, Cantidad, etc.)
      for (const note of notesArray) {
        if (typeof note === 'string' && note.trim().length > 0) {
          // Si no contiene ":" o contiene "Motivo:", es el reason
          if (!note.includes(':') || note.includes('Motivo:')) {
            if (note.includes('Motivo:')) {
              const match = note.match(/Motivo:\s*(.+)/);
              return match && match[1]
                ? match[1].trim()
                : note.replace('Motivo:', '').trim();
            }
            return note.trim();
          }
        }
      }
    }

    return null;
  }

  // Nuevas funciones para obtener información adicional de compensatory
  public getCompensatoryDateFromNotes(
    data: CompensatoryRequest
  ): string | null {
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      const dateNote = notesArray.find(
        (note: any) =>
          typeof note === 'string' && note.includes('Fecha compensatorio:')
      );

      if (dateNote) {
        const match = dateNote.match(/Fecha compensatorio:\s*(.+)/);
        return match && match[1] ? match[1].trim() : null;
      }
    }
    return null;
  }

  public getCompensatoryTimeFromNotes(data: CompensatoryRequest): {
    start: string | null;
    end: string | null;
  } {
    const result = { start: null as string | null, end: null as string | null };

    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      const startNote = notesArray.find(
        (note: any) => typeof note === 'string' && note.includes('Hora inicio:')
      );
      const endNote = notesArray.find(
        (note: any) => typeof note === 'string' && note.includes('Hora fin:')
      );

      if (startNote) {
        const match = startNote.match(/Hora inicio:\s*(.+)/);
        result.start = match && match[1] ? match[1].trim() : null;
      }

      if (endNote) {
        const match = endNote.match(/Hora fin:\s*(.+)/);
        result.end = match && match[1] ? match[1].trim() : null;
      }
    }

    return result;
  }

  public getCompensatoryOvertimeDatesFromNotes(
    data: CompensatoryRequest
  ): string[] {
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      const datesNote = notesArray.find(
        (note: any) =>
          typeof note === 'string' && note.includes('Fechas horas extra:')
      );

      if (datesNote) {
        const match = datesNote.match(/Fechas horas extra:\s*(.+)/);
        if (match && match[1]) {
          return match[1]
            .split(',')
            .map((date) => date.trim())
            .filter((date) => date.length > 0);
        }
      }
    }
    return [];
  }

  public getCompensatoryRequestedAmountFromNotes(
    data: CompensatoryRequest
  ): number | null {
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];

      const amountNote = notesArray.find(
        (note: any) =>
          typeof note === 'string' && note.includes('Cantidad solicitada:')
      );

      if (amountNote) {
        const match = amountNote.match(/Cantidad solicitada:\s*(\d+)/);
        return match && match[1] ? parseInt(match[1], 10) : null;
      }
    }
    return null;
  }

  public getStatusSeverity(
    status: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<
      string,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
      pending: 'warn',
      approved: 'success',
      rejected: 'danger',
    };
    return severities[status] || 'info';
  }

  public onFilterChange(): void {
    // Los filtros se aplican automáticamente mediante computed
  }

  public clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

  // Métodos helper para el dashboard mejorado
  public hasActiveFilters(): boolean {
    return !!(
      this.searchText() ||
      this.selectedStatus() ||
      this.dateRange() ||
      this.globalSearchText()
    );
  }

  public getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchText()) count++;
    if (this.selectedStatus()) count++;
    if (this.dateRange()) count++;
    if (this.globalSearchText()) count++;
    return count;
  }

  public onGlobalSearch(): void {
    // La búsqueda global se aplica automáticamente mediante computed
    // Puedes agregar lógica adicional aquí si es necesario
  }

  public clearGlobalSearch(): void {
    this.globalSearchText.set('');
  }

  public toggleDisabilitySelection(id: string, selected: boolean): void {
    const current = [...this.selectedDisabilities()];
    if (selected) {
      if (!current.includes(id)) {
        current.push(id);
      }
    } else {
      const index = current.indexOf(id);
      if (index > -1) {
        current.splice(index, 1);
      }
    }
    this.selectedDisabilities.set(current);
  }

  public isAllSelected(): boolean {
    const filtered = this.filteredDisabilities();
    return (
      filtered.length > 0 &&
      filtered.every((d) => this.selectedDisabilities().includes(d.id))
    );
  }

  public toggleSelectAll(selectAll: boolean): void {
    if (selectAll) {
      const allIds = this.filteredDisabilities().map((d) => d.id);
      this.selectedDisabilities.set([...allIds]);
    } else {
      this.selectedDisabilities.set([]);
    }
  }

  public bulkApprove(): void {
    const selected = Array.from(this.selectedDisabilities());
    if (selected.length === 0) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de aprobar ${selected.length} incapacidad(es) seleccionada(s)?`,
      header: 'Confirmar Aprobación Masiva',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        selected.forEach((id) => {
          const disability = this.disabilitiesApi
            .value()
            ?.find((d) => d.id === id);
          if (disability && disability.status === 'pending') {
            this.updateDisabilityStatus(id, 'approved');
          }
        });
        this.selectedDisabilities.set([]);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${selected.length} incapacidad(es) aprobada(s) correctamente`,
        });
      },
    });
  }

  public bulkReject(): void {
    const selected = Array.from(this.selectedDisabilities());
    if (selected.length === 0) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de rechazar ${selected.length} incapacidad(es) seleccionada(s)?`,
      header: 'Confirmar Rechazo Masivo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        selected.forEach((id) => {
          const disability = this.disabilitiesApi
            .value()
            ?.find((d) => d.id === id);
          if (disability && disability.status === 'pending') {
            this.updateDisabilityStatus(id, 'rejected');
          }
        });
        this.selectedDisabilities.set([]);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${selected.length} incapacidad(es) rechazada(s) correctamente`,
        });
      },
    });
  }

  public async exportData(): Promise<void> {
    try {
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
      const employee = await firstValueFrom(
        this.http.get<any[]>(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`,
          {
            params: {
              id: `eq.${employeeId}`,
              select: 'first_name,father_name',
            },
          }
        )
      );
      if (employee && employee[0]) {
        return `${employee[0].first_name} ${employee[0].father_name}`;
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  }

  public hasActiveCompensatoryFilters(): boolean {
    return !!(
      this.compensatorySearchText() ||
      this.compensatorySelectedStatus() ||
      this.compensatoryDateRange() ||
      this.globalSearchText()
    );
  }

  public getActiveCompensatoryFiltersCount(): number {
    let count = 0;
    if (this.compensatorySearchText()) count++;
    if (this.compensatorySelectedStatus()) count++;
    if (this.compensatoryDateRange()) count++;
    if (this.globalSearchText()) count++;
    return count;
  }

  // ========== Tiempo Compensatorio ==========

  // API para obtener solicitudes de tiempo compensatorio
  public compensatoryTimeoffsApi = httpResource<CompensatoryRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

    if (!companyId) {
      return undefined; // No hacer request si no hay company_id
    }

    // Ahora podemos filtrar directamente por company_id ya que se agregó el campo a la tabla
    const params: any = {
      select: `id,employee_id,type_id,date_from,date_to,notes,is_approved,compensatory_type,compensatory_amount,review_status,reviewed_by,reviewed_at,rejection_comment,created_at,company_id,document_url,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!timeoffs_created_by_fkey(first_name,father_name)`,
      type_id: `eq.${compensatoryTypeId}`,
      // Filtrar directamente por company_id (campo agregado a la tabla)
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`,
      method: 'GET',
      params,
    };
  });

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
            d.document_type !== 'uniform_request'
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

  public uniformRequestPendingCount = computed(
    () =>
      this.documentRequestsService
        .value()
        .filter(
          (d) => d.status === 'pending' && d.document_type === 'uniform_request'
        ).length || 0
  );

  // Filtros para tiempo compensatorio
  public compensatorySearchText = signal('');
  public compensatorySelectedStatus = signal<string | null>(null);
  public compensatoryDateRange = signal<Date[] | null>(null);
  public isRefreshing = computed(
    () =>
      this.compensatoryTimeoffsApi.isLoading() ||
      this.vacationsService.isLoading() ||
      this.documentRequestsService.isLoading()
  );

  public refreshAll(): void {
    this.disabilitiesApi.reload();
    this.compensatoryTimeoffsApi.reload();
    this.vacationsService.reload();
    this.documentRequestsService.reload();
  }

  // Opciones de estado para tiempo compensatorio
  public compensatoryStatusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // Estadísticas de tiempo compensatorio
  public compensatoryTotalCount = computed(
    () => this.compensatoryTimeoffsApi.value()?.length || 0
  );
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
          this.getCompensatoryReasonFromNotes(r) || ''
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
          this.getCompensatoryReasonFromNotes(r) || ''
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

  public onCompensatoryFilterChange(): void {
    // Los filtros se aplican automáticamente mediante computed
  }

  public clearCompensatoryFilters(): void {
    this.compensatorySearchText.set('');
    this.compensatorySelectedStatus.set(null);
    this.compensatoryDateRange.set(null);
  }

  public getCompensatoryStatusLabel(request: CompensatoryRequest): string {
    if (request.is_approved) return 'Aprobado';
    if (request.rejection_comment || request.review_status === 'rejected')
      return 'Rechazado';
    if (request.review_status === 'approved') return 'En Registro';
    return 'Pendiente';
  }

  public getCompensatoryStatusSeverity(
    request: CompensatoryRequest
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (request.is_approved) return 'success';
    if (request.rejection_comment || request.review_status === 'rejected')
      return 'danger';
    if (request.review_status === 'approved') return 'info';
    return 'warn';
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

  public getEmployeePosition(request: CompensatoryRequest): string | null {
    if (request.employee?.position?.name) {
      return request.employee.position.name;
    }
    return null;
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
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      this.allAuditHistory.set([]);
      this.isLoadingAllAuditHistory.set(false);
      return;
    }

    // Obtener todos los timeoffs compensatorios primero, filtrados por company_id
    this.http
      .get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`, {
        params: {
          type_id: `eq.${compensatoryTypeId}`,
          select:
            'id,employee:employees!time_offs_employee_id_fkey(company_id)',
          // Filtrar por company_id del empleado
          'employee.company_id': `eq.${companyId}`,
        },
      })
      .subscribe({
        next: (timeoffs) => {
          if (timeoffs.length === 0) {
            this.allAuditHistory.set([]);
            this.isLoadingAllAuditHistory.set(false);
            return;
          }

          const timeoffIds = timeoffs.map((t) => t.id);

          // Obtener todo el historial de auditoría para estos timeoffs
          this.http
            .get<TimeoffAuditLog[]>(
              `${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoff_audit_log`,
              {
                params: {
                  timeoff_id: `in.(${timeoffIds.join(',')})`,
                  select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email)`,
                  order: 'changed_at.desc',
                  limit: '1000', // Límite razonable
                },
              }
            )
            .subscribe({
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

  // Helper para verificar si hay retraso
  public hasDelay(delayHours: string | undefined): boolean {
    if (!delayHours) return false;
    const delay = parseFloat(delayHours);
    return !isNaN(delay) && delay > 0;
  }

  // Método helper para parsear las notas y extraer información de fechas de horas extra
  public getOvertimeDaysFromNotes(request: CompensatoryRequest): Array<{
    date: string;
    entryTime: string;
    exitTime: string;
    totalHours: string;
    lunchDuration: string;
    delayHours: string;
    overtimeHours: string;
  }> | null {
    if (!request.notes) return null;

    // Convertir notes a array si es string
    const notesArray = Array.isArray(request.notes)
      ? request.notes
      : typeof request.notes === 'string'
      ? [request.notes]
      : [];

    // Buscar la sección "--- Fechas donde trabajó horas extra ---"
    const startIndex = notesArray.findIndex(
      (note) =>
        typeof note === 'string' &&
        note.includes('--- Fechas donde trabajó horas extra ---')
    );

    if (startIndex === -1) return null;

    // Extraer las líneas de detalle por fecha (después de "Detalle por fecha:")
    const detailStartIndex = notesArray.findIndex(
      (note, idx) =>
        idx > startIndex &&
        typeof note === 'string' &&
        note.includes('Detalle por fecha:')
    );

    if (detailStartIndex === -1) return null;

    const overtimeDays: Array<{
      date: string;
      entryTime: string;
      exitTime: string;
      totalHours: string;
      lunchDuration: string;
      delayHours: string;
      overtimeHours: string;
    }> = [];

    // Parsear cada línea de detalle
    for (let i = detailStartIndex + 1; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (typeof note !== 'string') continue;

      // Formato nuevo con delay: "dd/MM/yyyy: Entrada HH:mm - Salida HH:mm | Total: X.XXh (después de restar almuerzo y retraso) | Almuerzo: X.XXh | Retraso: X.XXh | Extra: X.XXh"
      const matchWithDelay = note.match(
        /(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h[^|]*\|\s+Almuerzo:\s+([\d.]+)h(?:\s+\|\s+Retraso:\s+([\d.]+)h)?\s+\|\s+Extra:\s+([\d.]+)h/
      );

      if (matchWithDelay) {
        overtimeDays.push({
          date: matchWithDelay[1],
          entryTime: matchWithDelay[2],
          exitTime: matchWithDelay[3],
          totalHours: matchWithDelay[4],
          lunchDuration: matchWithDelay[5],
          delayHours: matchWithDelay[6] || '0.00',
          overtimeHours: matchWithDelay[7],
        });
      } else {
        // Formato antiguo sin delay pero con almuerzo
        const matchWithLunch = note.match(
          /(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Almuerzo:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/
        );
        if (matchWithLunch) {
          overtimeDays.push({
            date: matchWithLunch[1],
            entryTime: matchWithLunch[2],
            exitTime: matchWithLunch[3],
            totalHours: matchWithLunch[4],
            lunchDuration: matchWithLunch[5],
            delayHours: '0.00',
            overtimeHours: matchWithLunch[6],
          });
        } else {
          // Formato antiguo sin almuerzo (para compatibilidad)
          const oldMatch = note.match(
            /(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/
          );
          if (oldMatch) {
            overtimeDays.push({
              date: oldMatch[1],
              entryTime: oldMatch[2],
              exitTime: oldMatch[3],
              totalHours: oldMatch[4],
              lunchDuration: '0.00',
              delayHours: '0.00',
              overtimeHours: oldMatch[5],
            });
          }
        }
      }
    }

    return overtimeDays.length > 0 ? overtimeDays : null;
  }

  // Función para extraer rango de horas desde notes o date_from/date_to
  public getCompensatoryTimeRange(request: CompensatoryRequest): {
    startTime: string;
    endTime: string;
  } | null {
    if (request.compensatory_type !== 'hours') return null;

    // Intentar extraer desde notes primero
    if (request.notes) {
      const notesArray = Array.isArray(request.notes)
        ? request.notes
        : typeof request.notes === 'string'
        ? [request.notes]
        : [];

      const timeRangeNote = notesArray.find(
        (note) => typeof note === 'string' && note.includes('Rango de horas:')
      );

      if (timeRangeNote) {
        const match = timeRangeNote.match(
          /Rango de horas:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/
        );
        if (match) {
          return { startTime: match[1], endTime: match[2] };
        }
      }
    }

    // Si no está en notes, intentar extraer desde date_from y date_to (si son datetime)
    if (request.date_from && request.date_to) {
      const dateFromStr = String(request.date_from);
      const dateToStr = String(request.date_to);

      // Verificar si tienen hora (incluyen espacio y dos puntos)
      if (
        dateFromStr.includes(' ') &&
        dateFromStr.includes(':') &&
        dateToStr.includes(' ') &&
        dateToStr.includes(':')
      ) {
        try {
          const fromDate = new Date(request.date_from);
          const toDate = new Date(request.date_to);
          const startTime = format(fromDate, 'HH:mm');
          const endTime = format(toDate, 'HH:mm');
          return { startTime, endTime };
        } catch (e) {
          // Si falla, retornar null
        }
      }
    }

    return null;
  }

  // Función para extraer las fechas manuales desde notes
  public getManualOvertimeDates(request: CompensatoryRequest): string[] {
    if (!request.notes) {
      console.log('[DEBUG HR] No hay notes en el request');
      return [];
    }

    console.log('[DEBUG HR] request.notes recibido:', request.notes);
    console.log(
      '[DEBUG HR] Tipo de request.notes:',
      typeof request.notes,
      Array.isArray(request.notes)
    );

    let notesArray: string[] = [];

    if (Array.isArray(request.notes)) {
      notesArray = request.notes;
      console.log('[DEBUG HR] Notes es un array:', notesArray);
    } else if (typeof request.notes === 'string') {
      // Intentar parsear como JSON primero
      try {
        const parsed = JSON.parse(request.notes);
        if (Array.isArray(parsed)) {
          notesArray = parsed;
          console.log('[DEBUG HR] Notes parseado como JSON array:', notesArray);
        } else {
          notesArray = [request.notes];
          console.log(
            '[DEBUG HR] Notes es string simple, convertido a array:',
            notesArray
          );
        }
      } catch (e) {
        // No es JSON válido, tratarlo como string simple
        notesArray = [request.notes];
        console.log(
          '[DEBUG HR] Notes no es JSON válido, tratado como string simple:',
          notesArray
        );
      }
    } else {
      console.log(
        '[DEBUG HR] Notes tiene tipo inesperado:',
        typeof request.notes
      );
      return [];
    }

    const startIndex = notesArray.findIndex(
      (note) =>
        typeof note === 'string' &&
        note.includes(
          '--- Fechas donde trabajó horas extra (ingresadas manualmente) ---'
        )
    );

    console.log('[DEBUG HR] Índice de inicio encontrado:', startIndex);

    if (startIndex === -1) {
      console.log('[DEBUG HR] No se encontró el patrón de fechas manuales');
      return [];
    }

    const dates: string[] = [];
    for (let i = startIndex + 1; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (typeof note === 'string') {
        // Buscar formato: "- dd/MM/yyyy"
        const match = note.match(/^\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
        if (match) {
          dates.push(match[1]);
          console.log('[DEBUG HR] Fecha encontrada:', match[1]);
        } else if (note.includes('RRHH revisará')) {
          // Si encontramos el texto final, parar
          console.log('[DEBUG HR] Fin de fechas encontrado en índice:', i);
          break;
        }
        // Si es línea vacía, continuar sin hacer nada (no romper el loop)
      }
    }

    console.log('[DEBUG HR] Fechas manuales extraídas:', dates);
    console.log('[DEBUG HR] Longitud del array de fechas:', dates.length);
    console.log('[DEBUG HR] ¿Array vacío?:', dates.length === 0);
    console.log('[DEBUG HR] Retornando fechas:', dates);
    return dates;
  }

  public getManualDateSaldoLabel(dateStr: string): string {
    const isoDay = this.parseDDMMYYYYToISO(dateStr);
    if (!isoDay) return 'Horas Extras 0';

    const match = this.employeeOvertimeDaysAll().find((d) => d.day === isoDay);
    if (!match) return 'Horas Extras 0';

    const remaining = Number(match.overtimeHours ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return 'Horas Extras 0';
    }

    // Formatear como "01h 30m"
    const wholeHours = Math.floor(remaining);
    const minutes = Math.round((remaining - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, '0')}h ${minutes
      .toString()
      .padStart(2, '0')}m`;
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
      const startDate = startOfDay(
        subDays(today, this.overtimeHistoryWindowDays())
      );

      const startDayStr = format(startDate, 'yyyy-MM-dd');
      const endDayStr = format(endDate, 'yyyy-MM-dd');
      const startTimestamp = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
      const endTimestamp = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

      console.log(
        `[DEBUG] Loading overtime for employee ${employeeId}, range: ${startDayStr} to ${endDayStr}`
      );

      // Traer marcaciones históricas por created_at (la tabla no tiene columna 'day')
      const timelogParams = new HttpParams()
        .set('select', 'type,created_at,employee_id,company_id')
        .set('employee_id', `eq.${employeeId}`)
        .set('company_id', `eq.${companyId}`)
        .set('created_at', `gte.${startTimestamp}`)
        .append('created_at', `lte.${endTimestamp}`)
        .set('order', 'created_at.asc');

      const timelogs = await firstValueFrom(
        this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timelogs`, {
          params: timelogParams,
        })
      );

      console.log(
        `[DEBUG] Found ${timelogs.length} timelogs for employee ${employeeId}`
      );
      if (timelogs.length > 0) {
        console.log('[DEBUG] Sample timelog:', timelogs[0]);
        const uniqueDays = [
          ...new Set(
            timelogs.map((t) => format(new Date(t.created_at), 'yyyy-MM-dd'))
          ),
        ];
        console.log('[DEBUG] Timelog days:', uniqueDays);
      }

      // Consumido (auditable) dentro del mismo rango
      const consumptionParams = new HttpParams()
        .set('select', 'overtime_day,hours_used')
        .set('employee_id', `eq.${employeeId}`)
        .set('company_id', `eq.${companyId}`)
        .set('overtime_day', `gte.${startDayStr}`)
        .append('overtime_day', `lte.${endDayStr}`);

      const consumptions = await firstValueFrom(
        this.http.get<any[]>(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/overtime_consumptions`,
          { params: consumptionParams }
        )
      );

      console.log(
        `[DEBUG] Found ${
          consumptions?.length || 0
        } consumptions for employee ${employeeId}`
      );
      if (consumptions && consumptions.length > 0) {
        console.log('[DEBUG] Sample consumption:', consumptions[0]);
      }

      const consumedByDay = this.sumConsumedHoursByDay(consumptions ?? []);
      console.log(
        '[DEBUG] Consumed by day:',
        Object.fromEntries(consumedByDay)
      );

      // Procesar timelogs similar a Marcaciones (8h netas sin almuerzo)
      const processedLogs = this.processTimelogsForOvertime(timelogs);
      console.log(
        `[DEBUG] Processed ${processedLogs.length} days with complete entry/exit`
      );

      const overtimeDaysRaw = this.extractOvertimeDays(processedLogs);
      console.log(
        `[DEBUG] Days with overtime before consumption: ${overtimeDaysRaw.length}`
      );
      if (overtimeDaysRaw.length > 0) {
        console.log('[DEBUG] Sample overtime day:', overtimeDaysRaw[0]);
      }

      // Restar consumos y dejar solo días con saldo > 0
      const overtimeDaysRemaining = overtimeDaysRaw
        .map((d) => {
          const consumed = consumedByDay.get(d.day) ?? 0;
          const remaining = Math.max(0, d.overtimeHours - consumed);
          console.log(
            `[DEBUG] Day ${d.day}: ${d.overtimeHours}h overtime - ${consumed}h consumed = ${remaining}h remaining`
          );
          return { ...d, overtimeHours: remaining };
        })
        .filter((d) => d.overtimeHours > 0)
        .sort((a, b) => b.day.localeCompare(a.day));

      const totalRemaining = overtimeDaysRemaining.reduce(
        (acc, d) => acc + d.overtimeHours,
        0
      );

      console.log(
        `[DEBUG] Final result: ${overtimeDaysRemaining.length} days with ${totalRemaining}h remaining overtime`
      );

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

  private sumConsumedHoursByDay(
    rows: Array<{ overtime_day?: string; hours_used?: any }>
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rows) {
      const day = r?.overtime_day ? String(r.overtime_day).slice(0, 10) : null;
      if (!day) continue;
      const hours = Number(r?.hours_used ?? 0);
      if (!Number.isFinite(hours) || hours <= 0) continue;
      map.set(day, (map.get(day) ?? 0) + hours);
    }
    return map;
  }

  // Procesar timelogs para agrupar por día
  private processTimelogsForOvertime(timelogs: any[]): any[] {
    const processed = timelogs
      .map((x) => ({
        ...x,
        day: x.day
          ? String(x.day).slice(0, 10)
          : format(new Date(x.created_at), 'yyyy-MM-dd'),
      }))
      .reduce<any[]>((acc, x) => {
        const existing = acc.find((item) => item.day === x.day);
        if (!existing) {
          acc.push({
            day: x.day,
            entry:
              x.type === 'entry' ? { date: new Date(x.created_at) } : undefined,
            lunch_start:
              x.type === 'lunch_start'
                ? { date: new Date(x.created_at) }
                : undefined,
            lunch_end:
              x.type === 'lunch_end'
                ? { date: new Date(x.created_at) }
                : undefined,
            exit:
              x.type === 'exit' ? { date: new Date(x.created_at) } : undefined,
          });
        } else {
          if (x.type === 'entry')
            existing.entry = { date: new Date(x.created_at) };
          if (x.type === 'lunch_start')
            existing.lunch_start = { date: new Date(x.created_at) };
          if (x.type === 'lunch_end')
            existing.lunch_end = { date: new Date(x.created_at) };
          if (x.type === 'exit')
            existing.exit = { date: new Date(x.created_at) };
        }
        return acc;
      }, []);

    return processed.filter((log) => log.entry && log.exit);
  }

  // Calcular horas extras totales
  private calculateTotalOvertimeHours(logs: any[]): number {
    let totalOvertimeMinutes = 0;

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      const entryDate = new Date(log.entry.date);
      const exitDate = new Date(log.exit.date);

      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return;

      const totalMinutes = differenceInMinutes(exitDate, entryDate);

      const lunchMinutes =
        log.lunch_start && log.lunch_end
          ? differenceInMinutes(
              new Date(log.lunch_end.date),
              new Date(log.lunch_start.date)
            )
          : 0;

      // Regla igual a Marcaciones: overtime sobre trabajo neto (sin contar almuerzo, máximo 60m)
      const lunchToSubtract = Math.max(0, Math.min(lunchMinutes, 60));
      const workMinutes = totalMinutes - lunchToSubtract;
      const requiredWorkMinutes = 480; // 8 horas de trabajo
      const overtimeMinutes = Math.max(0, workMinutes - requiredWorkMinutes);

      totalOvertimeMinutes += overtimeMinutes;
    });

    return totalOvertimeMinutes / 60;
  }

  // Extraer días con horas extras con información detallada
  private extractOvertimeDays(logs: any[]): Array<{
    day: string;
    overtimeHours: number;
    entryTime?: string;
    exitTime?: string;
    totalHours?: number;
  }> {
    const overtimeDays: Array<{
      day: string;
      overtimeHours: number;
      entryTime?: string;
      exitTime?: string;
      totalHours?: number;
    }> = [];

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      const entryDate = new Date(log.entry.date);
      const exitDate = new Date(log.exit.date);

      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return;

      const totalMinutes = differenceInMinutes(exitDate, entryDate);
      const lunchMinutes =
        log.lunch_start && log.lunch_end
          ? differenceInMinutes(
              new Date(log.lunch_end.date),
              new Date(log.lunch_start.date)
            )
          : 0;

      // Regla igual a Marcaciones: overtime sobre trabajo neto (sin contar almuerzo, máximo 60m)
      const lunchToSubtract = Math.max(0, Math.min(lunchMinutes, 60));
      const workMinutes = totalMinutes - lunchToSubtract;
      const requiredWorkMinutes = 480; // 8 horas de trabajo
      const overtimeMinutes = Math.max(0, workMinutes - requiredWorkMinutes);

      // Solo agregar días con horas extras > 0
      if (overtimeMinutes > 0) {
        overtimeDays.push({
          day: log.day,
          overtimeHours: overtimeMinutes / 60,
          entryTime: format(entryDate, 'HH:mm'),
          exitTime: format(exitDate, 'HH:mm'),
          totalHours: workMinutes / 60,
        });
      }
    });

    return overtimeDays;
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

  public rejectCompensatoryRequest(request: CompensatoryRequest): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de rechazar la solicitud de tiempo compensatorio de ${this.getEmployeeName(
        request
      )}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.updateCompensatoryReviewStatus(request.id, 'rejected');
      },
    });
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

    // Obtener estado anterior antes de actualizar
    const request = this.compensatoryTimeoffsApi
      .value()
      ?.find((r) => r.id === id);
    const oldStatus = request?.review_status || 'pending';

    const updateData: any = {
      review_status: status,
      is_approved: status === 'approved', // Eliminar paso "Registrado" - aprobar es final
      reviewed_by: currentEmployee.id,
      reviewed_at: new Date().toISOString(),
    };

    // El rejectionComment solo se guarda si se proporciona y el status es 'rejected'
    if (status === 'rejected' && rejectionComment) {
      updateData.rejection_comment = rejectionComment;
    }

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs?id=eq.${id}`,
        updateData
      )
      .subscribe({
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
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado de la solicitud',
          });
        },
      });
  }

  private parseDDMMYYYYToISO(dateStr: string): string | null {
    const parts = String(dateStr).trim().split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    if (
      !Number.isFinite(day) ||
      !Number.isFinite(month) ||
      !Number.isFinite(year)
    )
      return null;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900)
      return null;
    try {
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return null;
      return format(d, 'yyyy-MM-dd');
    } catch {
      return null;
    }
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

    const quantity = this.getCompensatoryQuantity(request);
    const requestedHours = quantity?.isDays
      ? quantity.value * 8
      : quantity?.value ?? 0;
    if (!requestedHours || requestedHours <= 0) return;

    // Prioridad: fechas manuales ingresadas por el empleado
    const manualDates = this.getManualOvertimeDates(request);
    const manualIsoDays = manualDates
      .map((d) => this.parseDDMMYYYYToISO(d))
      .filter(Boolean) as string[];

    let candidates: Array<{ day: string; remainingHours: number }> = [];

    if (manualIsoDays.length > 0) {
      // Traer timelogs y consumos solo para esas fechas (histórico)
      const timelogs = await firstValueFrom(
        this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timelogs`, {
          params: {
            select: 'day,type,created_at,employee_id,company_id',
            employee_id: `eq.${request.employee_id}`,
            company_id: `eq.${companyId}`,
            day: `in.(${manualIsoDays.join(',')})`,
            order: 'day.asc,created_at.asc',
          },
        })
      );

      const consumptions = await firstValueFrom(
        this.http.get<any[]>(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/overtime_consumptions`,
          {
            params: {
              select: 'overtime_day,hours_used',
              employee_id: `eq.${request.employee_id}`,
              company_id: `eq.${companyId}`,
              overtime_day: `in.(${manualIsoDays.join(',')})`,
            },
          }
        )
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

    await firstValueFrom(
      this.http.post(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/overtime_consumptions`,
        rows,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
        }
      )
    );

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

  // Funciones helper para notificaciones
  private async notifyLiaForRegistration(
    timeoffId: string,
    request: CompensatoryRequest
  ): Promise<void> {
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) return;

      // Buscar posición exacta de Lia: "Especialista de Nómina y Gestión Administrativa"
      const liaPositions = await firstValueFrom(
        this.http.get<any[]>(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/positions`,
          {
            params: {
              select: 'id',
              name: 'eq.Especialista de Nómina y Gestión Administrativa',
              company_id: `eq.${companyId}`,
            },
          }
        )
      );

      if (!liaPositions || liaPositions.length === 0) {
        console.warn(
          'No se encontró la posición "Especialista de Nómina y Gestión Administrativa"'
        );
        return;
      }

      const liaPositionIds = liaPositions.map((p) => p.id);

      // Buscar Lia (empleado HR que registra)
      const liaEmployees = await firstValueFrom(
        this.http.get<any[]>(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`,
          {
            params: {
              select: 'id,first_name,father_name',
              position_id: `in.(${liaPositionIds.join(',')})`,
              company_id: `eq.${companyId}`,
              is_active: 'eq.true',
            },
          }
        )
      );

      if (!liaEmployees || liaEmployees.length === 0) {
        console.warn('No se encontraron empleados HR (Lia) para notificar');
        return;
      }

      const employeeName = this.getEmployeeName(request);
      const currentEmployee = this.dashboardStore.currentEmployee();
      const notifications = liaEmployees.map((lia) => ({
        employee_id: lia.id,
        related_type: 'timeoff',
        related_id: timeoffId,
        message_type: 'compensatory_registered',
        title: 'Solicitud de Tiempo Compensatorio Aprobada - Requiere Registro',
        message: `La solicitud de tiempo compensatorio de ${employeeName} ha sido aprobada y requiere tu registro.`,
        created_by: currentEmployee?.id || null,
      }));

      await firstValueFrom(
        this.http.post(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`,
          notifications,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );
    } catch (error) {
      console.error('Error enviando notificación a Lia:', error);
    }
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
        this.http.post(
          `${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`,
          {
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
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
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
    this.showDocumentPreview.set(true);
  }

  public attachDocumentToCompensatoryRequest(): void {
    // Crear input file oculto
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.style.display = 'none';

    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 5000000) {
        // 5MB
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

        // Mostrar loading
        this.messageService.add({
          severity: 'info',
          summary: 'Subiendo archivo',
          detail: 'Por favor espera...',
        });

        // Subir archivo
        const employeeId = request.employee_id;
        const fileName = `${employeeId}/${Date.now()}.pdf`;

        const storageKey =
          getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
          getEnv('ENV_SUPABASE_API_KEY') ||
          '';

        const uploadUrl = `${getEnv(
          'ENV_SUPABASE_URL'
        )}/storage/v1/object/compensatory/${fileName}`;

        // Debug logging restored
        console.log('Key check:', {
          hasServiceKey: !!getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY'),
          hasAnonKey: !!getEnv('ENV_SUPABASE_API_KEY'),
          usedKeyLength: storageKey.length,
        });

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${storageKey}`,
            apikey: storageKey,
            'Content-Type': file.type,
            'x-upsert': 'true',
          },
          body: file,
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Upload Failed Body:', errorData);

          this.messageService.add({
            severity: 'error',
            summary: 'Error Supabase',
            detail: `Status: ${response.status}. Msg: ${errorData.substring(
              0,
              100
            )}`,
          });
          throw new Error(
            `Error al subir archivo: ${response.status} ${response.statusText} - ${errorData}`
          );
        }

        // Obtener URL pública
        const documentUrl = `${getEnv(
          'ENV_SUPABASE_URL'
        )}/storage/v1/object/public/compensatory/${fileName}`;

        // Actualizar solicitud en la base de datos
        const updateUrl = `${getEnv(
          'ENV_SUPABASE_URL'
        )}/rest/v1/timeoffs?id=eq.${request.id}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${storageKey}`,
            apikey: storageKey,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ document_url: documentUrl }),
        });

        if (!updateResponse.ok) {
          throw new Error('Error al actualizar solicitud');
        }

        // Actualizar la solicitud local
        request.document_url = documentUrl;

        this.messageService.add({
          severity: 'success',
          summary: 'Archivo adjuntado',
          detail: 'El documento se adjuntó correctamente a la solicitud.',
        });

        // Recargar datos para refrescar la vista
        this.compensatoryTimeoffsApi.reload();
      } catch (error) {
        console.error('Error attaching document:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al adjuntar archivo',
          detail: 'No se pudo adjuntar el archivo. Inténtalo nuevamente.',
        });
      }
    };

    // Hacer click en el input
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  public zoomIn() {
    const current = this.zoomLevel();
    if (current < 2) {
      this.zoomLevel.set(Math.min(current + 0.25, 2));
    }
  }

  public zoomOut() {
    const current = this.zoomLevel();
    if (current > 0.5) {
      this.zoomLevel.set(Math.max(current - 0.25, 0.5));
    }
  }

  public resetZoom() {
    this.zoomLevel.set(1);
  }

  public saveDisabilityRejectionComment(): void {
    const disability = this.selectedDisability();
    if (!disability) return;

    this.savingDisabilityComment.set(true);
    const comment = this.disabilityRejectionComment().trim() || null;

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_disabilities?id=eq.${
          disability.id
        }`,
        { rejection_comment: comment }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Comentario de rechazo guardado correctamente',
          });
          this.disabilitiesApi.reload();
          // Actualizar el objeto local
          if (disability) {
            disability.rejection_comment = comment;
          }
          this.savingDisabilityComment.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar el comentario',
          });
          this.savingDisabilityComment.set(false);
        },
      });
  }

  public saveCompensatoryRejectionComment(): void {
    const request = this.selectedCompensatoryRequest();
    if (!request) return;

    this.savingCompensatoryComment.set(true);
    const comment = this.compensatoryRejectionComment().trim() || null;

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs?id=eq.${request.id}`,
        { rejection_comment: comment }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Comentario de rechazo guardado correctamente',
          });
          this.compensatoryTimeoffsApi.reload();
          // Actualizar el objeto local
          if (request) {
            request.rejection_comment = comment || undefined;
          }
          this.savingCompensatoryComment.set(false);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar el comentario',
          });
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

  public rejectDisability(disability: Disability): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de rechazar la incapacidad de ${disability.employee?.first_name} ${disability.employee?.father_name}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.updateDisabilityStatus(disability.id, 'rejected');
      },
    });
  }

  public updateDisabilityStatusFromDialog(statusValue: string): void {
    const disability = this.selectedDisability();
    if (!disability) return;

    const validStatus = statusValue as 'pending' | 'approved' | 'rejected';
    if (['pending', 'approved', 'rejected'].includes(statusValue)) {
      this.updateDisabilityStatus(disability.id, validStatus);
    }
  }

  public updateDisabilityStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected',
    rejectionComment?: string
  ): void {
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

    this.http
      .patch(
        `${getEnv(
          'ENV_SUPABASE_URL'
        )}/rest/v1/employee_disabilities?id=eq.${id}`,
        updateData
      )
      .subscribe({
        next: () => {
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
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado de la incapacidad',
          });
        },
      });
  }

  // ========== Vacaciones ==========

  // Filtros para vacaciones
  public vacationsSearchText = signal('');
  public vacationsSelectedStatus = signal<string | null>(null);
  public vacationsDateRange = signal<Date[] | null>(null);

  // Opciones de estado para vacaciones
  public vacationsStatusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  public viewVacationDetails(vacation: VacationRequest): void {
    // TODO: Implementar vista de detalles de vacaciones
    this.messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: 'Vista de detalles próximamente disponible',
    });
  }
}
