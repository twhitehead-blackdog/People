import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { differenceInMinutes, format, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';

interface Disability {
  id: string;
  employee_id: string;
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
  created_at: string;
}

interface CompensatoryRequest {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  date_from: string;
  date_to: string;
  hours?: number;
  reason?: string;
  compensatory_type?: 'hours' | 'days';
  compensatory_amount?: number;
  review_status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  registered_by?: string;
  registered_at?: string;
  rejection_comment?: string;
  is_approved: boolean;
  created_at: string;
  notes?: string[] | string;
}

@Component({
  selector: 'pt-hr-disabilities',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    TabsModule,
    TooltipModule,
    InputTextModule,
    InputTextarea,
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
    SelectButtonModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden">
      <!-- Header Compacto con Búsqueda Global -->
      <div class="bg-gradient-to-r from-neutral-800 via-neutral-800/95 to-neutral-800 border-b border-neutral-700/50 shadow-xl sticky top-0 z-40 backdrop-blur-sm">
        <div class="px-4 py-2">
          <div class="flex items-center justify-between mb-2 gap-4">
            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent m-0">
                Dashboard de RRHH
              </h1>
              <p class="text-xs text-gray-400 m-0 mt-0.5 flex items-center gap-1.5">
                <i class="pi pi-shield text-cyan-400 text-xs"></i>
                <span class="truncate">Gestión integral de solicitudes y tiempo compensatorio</span>
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <p-button
                icon="pi pi-download"
                [label]="'Exportar'"
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
                [label]="'Actualizar'"
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
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
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
        <div class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-0.5 backdrop-blur-sm">
          <div class="flex gap-1 flex-wrap">
            <button
              (click)="activeTab.set('disabilities')"
              [class]="'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' + 
                (activeTab() === 'disabilities' 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30' 
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')"
            >
              <i class="pi pi-heart mr-1.5 text-xs"></i>
              Gestión de Solicitudes
              @if (pendingCount() > 0) {
              <span class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                {{ pendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="activeTab.set('compensatory')"
              [class]="'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' + 
                (activeTab() === 'compensatory' 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30' 
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')"
            >
              <i class="pi pi-clock mr-1.5 text-xs"></i>
              Tiempo Compensatorio
              @if (compensatoryPendingCount() > 0) {
              <span class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                {{ compensatoryPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('documents')"
              [class]="'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' + 
                (activeTab() === 'documents' 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30' 
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')"
            >
              <i class="pi pi-file-edit mr-1.5 text-xs"></i>
              Solicitar Documentos
            </button>
            <button
              (click)="navigateToTab('suggestions')"
              [class]="'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' + 
                (activeTab() === 'suggestions' 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30' 
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')"
            >
              <i class="pi pi-comments mr-1.5 text-xs"></i>
              Buzón de Sugerencias
            </button>
          </div>
        </div>

        @if (activeTab() === 'disabilities') {
        <!-- Dashboard de Gestión de Solicitudes -->
        <div class="space-y-3">
          <!-- Estadísticas Compactas -->
          <div class="grid grid-cols-4 gap-2">
            <!-- Total -->
            <div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-800/80 rounded-lg p-3 border border-neutral-700/50 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-file text-lg text-gray-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider m-0">Total</p>
                  <p class="text-xl font-bold text-white m-0">
                    {{ totalCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full" [style.width.%]="100"></div>
              </div>
            </div>

            <!-- Pendientes -->
            <div class="group relative bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-neutral-800 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-clock text-lg text-yellow-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-yellow-400/80 uppercase tracking-wider m-0">Pendientes</p>
                  <p class="text-xl font-bold text-yellow-300 m-0">
                    {{ pendingCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full" 
                     [style.width.%]="totalCount() > 0 ? (pendingCount() / totalCount() * 100) : 0"></div>
              </div>
            </div>

            <!-- Aprobadas -->
            <div class="group relative bg-gradient-to-br from-green-500/10 via-green-500/5 to-neutral-800 rounded-lg p-3 border border-green-500/30 hover:border-green-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-check-circle text-lg text-green-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-green-400/80 uppercase tracking-wider m-0">Aprobadas</p>
                  <p class="text-xl font-bold text-green-300 m-0">
                    {{ approvedCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" 
                     [style.width.%]="totalCount() > 0 ? (approvedCount() / totalCount() * 100) : 0"></div>
              </div>
            </div>

            <!-- Rechazadas -->
            <div class="group relative bg-gradient-to-br from-red-500/10 via-red-500/5 to-neutral-800 rounded-lg p-3 border border-red-500/30 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-times-circle text-lg text-red-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-red-400/80 uppercase tracking-wider m-0">Rechazadas</p>
                  <p class="text-xl font-bold text-red-300 m-0">
                    {{ rejectedCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" 
                     [style.width.%]="totalCount() > 0 ? (rejectedCount() / totalCount() * 100) : 0"></div>
              </div>
            </div>
          </div>

          <!-- Filtros Avanzados Colapsables -->
          <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
            <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
                 (click)="showFilters.set(!showFilters())">
              <div class="flex items-center gap-2">
                <i class="pi pi-filter text-cyan-400 text-sm"></i>
                <h3 class="text-sm font-semibold text-white m-0">Filtros Avanzados</h3>
                @if (hasActiveFilters()) {
                <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold">
                  {{ getActiveFiltersCount() }} activos
                </span>
                }
              </div>
              <i class="pi text-sm" 
                 [class.pi-chevron-down]="!showFilters()" 
                 [class.pi-chevron-up]="showFilters()"
                 [class.text-gray-400]="!showFilters()"
                 [class.text-cyan-400]="showFilters()"></i>
            </div>
            
            @if (showFilters()) {
            <div class="p-3 space-y-2 animate-fade-in">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i>Búsqueda Específica
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
                    [style]="{'height': '32px'}"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>Rango de Fechas
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
                    [inputStyle]="{'height': '32px', 'padding': '0.375rem'}"
                  />
                </div>
              </div>
              
              <div class="flex items-center justify-between pt-2 border-t border-neutral-700/50">
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
                  <span>{{ filteredDisabilities().length }} de {{ totalCount() }} resultados</span>
                </div>
              </div>
            </div>
            }
          </div>

          <!-- Tabla Compacta -->
          <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
            <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
                  <i class="pi pi-list text-cyan-400 text-sm"></i>
                  Solicitudes
                </h3>
                @if (selectedDisabilities().length > 0) {
                <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs font-medium">
                  {{ selectedDisabilities().length }} seleccionada(s)
                </span>
                }
              </div>
              @if (selectedDisabilities().length > 0) {
              <div class="flex items-center gap-1">
                <p-button
                  [label]="'Aprobar'"
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  (onClick)="bulkApprove()"
                />
                <p-button
                  [label]="'Rechazar'"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                  (onClick)="bulkReject()"
                />
                <p-button
                  icon="pi pi-times"
                  [text]="true"
                  severity="secondary"
                  size="small"
                  (onClick)="selectedDisabilities.set([])"
                  pTooltip="Limpiar selección"
                />
              </div>
              }
            </div>
            
            @if (disabilitiesApi.isLoading()) {
            <div class="flex justify-center items-center py-8">
              <div class="text-center">
                <p-progressSpinner />
                <p class="text-gray-400 mt-2 text-sm">Cargando solicitudes...</p>
              </div>
            </div>
            } @else if (filteredDisabilities().length === 0) {
            <div class="flex flex-col items-center justify-center py-8 text-center">
              <i class="pi pi-inbox text-4xl text-gray-600 mb-2"></i>
              <h4 class="text-sm font-semibold text-gray-300 mb-1">No se encontraron solicitudes</h4>
              <p class="text-gray-500 text-xs mb-2">Intenta ajustar los filtros para ver más resultados</p>
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
                    <th style="width: 40px; padding: 0.5rem;">
                      <p-checkbox 
                        [binary]="true"
                        [ngModel]="isAllSelected()"
                        (ngModelChange)="toggleSelectAll($event)"
                      />
                    </th>
                    <th style="width: 180px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-user text-cyan-400 text-xs"></i>
                        <span class="text-xs">Empleado</span>
                      </div>
                    </th>
                    <th style="width: 100px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                        <span class="text-xs">Inicio</span>
                      </div>
                    </th>
                    <th style="width: 100px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-calendar-times text-cyan-400 text-xs"></i>
                        <span class="text-xs">Fin</span>
                      </div>
                    </th>
                    <th style="width: 70px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-clock text-cyan-400 text-xs"></i>
                        <span class="text-xs">Días</span>
                      </div>
                    </th>
                    <th style="padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-file-edit text-cyan-400 text-xs"></i>
                        <span class="text-xs">Descripción</span>
                      </div>
                    </th>
                    <th style="width: 100px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-tag text-cyan-400 text-xs"></i>
                        <span class="text-xs">Estado</span>
                      </div>
                    </th>
                    <th style="width: 70px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-paperclip text-cyan-400 text-xs"></i>
                        <span class="text-xs">Doc</span>
                      </div>
                    </th>
                    <th style="width: 120px; padding: 0.5rem;">
                      <div class="flex items-center gap-1">
                        <i class="pi pi-cog text-cyan-400 text-xs"></i>
                        <span class="text-xs">Acciones</span>
                      </div>
                    </th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-disability>
                  <tr [class.bg-cyan-500/5]="selectedDisabilities().includes(disability.id)"
                      class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                      (click)="viewDetails(disability)">
                    <td style="padding: 0.5rem;" (click)="$event.stopPropagation()">
                      <p-checkbox 
                        [binary]="true"
                        [ngModel]="selectedDisabilities().includes(disability.id)"
                        (ngModelChange)="toggleDisabilitySelection(disability.id, $event)"
                      />
                    </td>
                    <td style="padding: 0.5rem;">
                      <div class="flex items-center gap-1.5">
                        <div class="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0">
                          <i class="pi pi-user text-cyan-400 text-[10px]"></i>
                        </div>
                        <div class="flex flex-col min-w-0">
                          <span class="font-semibold text-white text-xs truncate">
                            {{ disability.employee?.first_name }}
                            {{ disability.employee?.father_name }}
                          </span>
                          <span class="text-[10px] text-gray-400 truncate">
                            {{ disability.employee?.work_email }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 0.5rem;">
                      <span class="text-xs text-gray-300">
                        {{ disability.start_date | date : 'dd/MM/yyyy' }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem;">
                      <span class="text-xs text-gray-300">
                        {{ disability.end_date | date : 'dd/MM/yyyy' }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem;">
                      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-semibold">
                        {{
                          calculateDays(
                            disability.start_date,
                            disability.end_date
                          )
                        }}
                      </span>
                    </td>
                    <td style="padding: 0.5rem;">
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
                    <td style="padding: 0.5rem;">
                      <p-tag
                        [value]="getStatusLabel(disability.status)"
                        [severity]="getStatusSeverity(disability.status)"
                        [rounded]="true"
                        [style]="{'font-size': '0.7rem', 'padding': '0.125rem 0.5rem'}"
                      />
                    </td>
                    <td style="padding: 0.5rem;">
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
                    <td style="padding: 0.5rem;" (click)="$event.stopPropagation()">
                      <div class="flex gap-0.5">
                        @if (disability.status === 'pending') {
                        <p-button
                          icon="pi pi-check"
                          [text]="true"
                          severity="success"
                          size="small"
                          (onClick)="approveDisability(disability); $event.stopPropagation()"
                          pTooltip="Aprobar"
                          tooltipPosition="top"
                          [rounded]="true"
                        />
                        <p-button
                          icon="pi pi-times"
                          [text]="true"
                          severity="danger"
                          size="small"
                          (onClick)="rejectDisability(disability); $event.stopPropagation()"
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
                          (onClick)="viewDetails(disability); $event.stopPropagation()"
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
        }

        @if (activeTab() === 'compensatory') {
        <!-- Dashboard de Tiempo Compensatorio -->
        <div class="space-y-3">
          <!-- Estadísticas Compactas de Tiempo Compensatorio -->
          <div class="grid grid-cols-4 gap-2">
            <!-- Total -->
            <div class="group relative bg-gradient-to-br from-neutral-800 to-neutral-800/80 rounded-lg p-3 border border-neutral-700/50 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-clock text-lg text-gray-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider m-0">Total</p>
                  <p class="text-xl font-bold text-white m-0">
                    {{ compensatoryTotalCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full" [style.width.%]="100"></div>
              </div>
            </div>

            <!-- Pendientes -->
            <div class="group relative bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-neutral-800 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-clock text-lg text-yellow-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-yellow-400/80 uppercase tracking-wider m-0">Pendientes</p>
                  <p class="text-xl font-bold text-yellow-300 m-0">
                    {{ compensatoryPendingCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full" 
                     [style.width.%]="compensatoryTotalCount() > 0 ? (compensatoryPendingCount() / compensatoryTotalCount() * 100) : 0"></div>
              </div>
            </div>

            <!-- Aprobadas -->
            <div class="group relative bg-gradient-to-br from-green-500/10 via-green-500/5 to-neutral-800 rounded-lg p-3 border border-green-500/30 hover:border-green-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-check-circle text-lg text-green-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-green-400/80 uppercase tracking-wider m-0">Aprobadas</p>
                  <p class="text-xl font-bold text-green-300 m-0">
                    {{ compensatoryApprovedCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" 
                     [style.width.%]="compensatoryTotalCount() > 0 ? (compensatoryApprovedCount() / compensatoryTotalCount() * 100) : 0"></div>
              </div>
            </div>

            <!-- Rechazadas -->
            <div class="group relative bg-gradient-to-br from-red-500/10 via-red-500/5 to-neutral-800 rounded-lg p-3 border border-red-500/30 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer">
              <div class="flex items-center justify-between">
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="pi pi-times-circle text-lg text-red-400"></i>
                </div>
                <div class="text-right flex-1">
                  <p class="text-[10px] font-medium text-red-400/80 uppercase tracking-wider m-0">Rechazadas</p>
                  <p class="text-xl font-bold text-red-300 m-0">
                    {{ compensatoryRejectedCount() }}
                  </p>
                </div>
              </div>
              <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" 
                     [style.width.%]="compensatoryTotalCount() > 0 ? (compensatoryRejectedCount() / compensatoryTotalCount() * 100) : 0"></div>
              </div>
            </div>
          </div>

          <!-- Filtros Avanzados Colapsables para Tiempo Compensatorio -->
          <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
            <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
                 (click)="showCompensatoryFilters.set(!showCompensatoryFilters())">
              <div class="flex items-center gap-2">
                <i class="pi pi-filter text-cyan-400 text-sm"></i>
                <h3 class="text-sm font-semibold text-white m-0">Filtros Avanzados</h3>
                @if (hasActiveCompensatoryFilters()) {
                <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold">
                  {{ getActiveCompensatoryFiltersCount() }} activos
                </span>
                }
              </div>
              <i class="pi text-sm" 
                 [class.pi-chevron-down]="!showCompensatoryFilters()" 
                 [class.pi-chevron-up]="showCompensatoryFilters()"
                 [class.text-gray-400]="!showCompensatoryFilters()"
                 [class.text-cyan-400]="showCompensatoryFilters()"></i>
            </div>
            
            @if (showCompensatoryFilters()) {
            <div class="p-3 space-y-2 animate-fade-in">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-search mr-1 text-cyan-400 text-xs"></i>Búsqueda Específica
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
                    [style]="{'height': '32px'}"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-300 mb-1">
                    <i class="pi pi-calendar mr-1 text-cyan-400 text-xs"></i>Rango de Fechas
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
                    [inputStyle]="{'height': '32px', 'padding': '0.375rem'}"
                  />
                </div>
              </div>
              
              <div class="flex items-center justify-between pt-2 border-t border-neutral-700/50">
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
                  <span>{{ filteredCompensatoryRequests().length }} de {{ compensatoryTotalCount() }} resultados</span>
                </div>
              </div>
            </div>
            }
          </div>

          <!-- Tabla Compacta de Tiempo Compensatorio -->
          <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
            <div class="p-2 border-b border-neutral-700/50">
              <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
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
                  <th style="width: 160px; padding: 0.4rem; text-align: left;">
                    <div class="flex items-center gap-1">
                      <i class="pi pi-user text-cyan-400 text-xs"></i>
                      <span class="text-xs">Empleado</span>
                    </div>
                  </th>
                  <th style="width: 85px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-calendar text-cyan-400 text-xs"></i>
                      <span class="text-xs">Inicio</span>
                    </div>
                  </th>
                  <th style="width: 85px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-calendar-times text-cyan-400 text-xs"></i>
                      <span class="text-xs">Fin</span>
                    </div>
                  </th>
                  <th style="width: 70px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-tag text-cyan-400 text-xs"></i>
                      <span class="text-xs">Tipo</span>
                    </div>
                  </th>
                  <th style="width: 80px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-clock text-cyan-400 text-xs"></i>
                      <span class="text-xs">Cantidad</span>
                    </div>
                  </th>
                  <th style="width: 120px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-comment text-cyan-400 text-xs"></i>
                      <span class="text-xs">Motivo Solicitud</span>
                    </div>
                  </th>
                  <th style="width: 90px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-tag text-cyan-400 text-xs"></i>
                      <span class="text-xs">Estado</span>
                    </div>
                  </th>
                  <th style="width: 120px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-exclamation-triangle text-red-400 text-xs"></i>
                      <span class="text-xs">Motivo Rechazo</span>
                    </div>
                  </th>
                  <th style="width: 110px; padding: 0.4rem; text-align: center;">
                    <div class="flex items-center justify-center gap-1">
                      <i class="pi pi-cog text-cyan-400 text-xs"></i>
                      <span class="text-xs">Acciones</span>
                    </div>
                  </th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-request>
                <tr class="hover:bg-neutral-700/30 transition-colors cursor-pointer"
                    (click)="viewCompensatoryDetails(request)">
                  <td style="padding: 0.4rem;" (click)="$event.stopPropagation()">
                    <div class="flex items-center gap-1">
                      <div class="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0">
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
                      {{ request.date_from | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td style="padding: 0.4rem; text-align: center;">
                    <span class="text-xs text-gray-300">
                      {{ request.date_to | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td style="padding: 0.4rem; text-align: center;">
                    @let compensatoryType = getCompensatoryTypeFromNotes(request);
                    <span class="text-xs font-medium text-white">
                      @if (compensatoryType === 'days') {
                        Días
                      } @else if (compensatoryType === 'hours') {
                        Horas
                      } @else {
                        <span class="text-gray-500">-</span>
                      }
                    </span>
                  </td>
                  <td style="padding: 0.4rem; text-align: center;">
                    @let quantity = getCompensatoryQuantity(request);
                    <span class="text-xs font-medium text-white">
                      @if (quantity && quantity.value > 0) {
                        @if (quantity.isDays) {
                          {{ quantity.value }} día(s)
                        } @else {
                          {{ formatHoursMinutes(quantity.value) }}
                        }
                      } @else {
                        <span class="text-gray-500">-</span>
                      }
                    </span>
                  </td>
                  <td style="padding: 0.4rem; text-align: center;">
                    @let reason = getCompensatoryReasonFromNotes(request);
                    @if (reason) {
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
                      [style]="{'font-size': '0.65rem', 'padding': '0.1rem 0.4rem'}"
                    />
                  </td>
                  <td style="padding: 0.4rem; text-align: center;">
                    @if (request.rejection_comment) {
                    <span
                      class="text-xs text-red-300 cursor-help inline-block max-w-[110px] truncate"
                      [pTooltip]="request.rejection_comment"
                      tooltipPosition="top"
                    >
                      {{ request.rejection_comment }}
                    </span>
                    } @else {
                    <span class="text-gray-500 text-xs">-</span>
                    }
                  </td>
                  <td style="padding: 0.4rem; text-align: center;" (click)="$event.stopPropagation()">
                    <div class="flex gap-0.5 justify-center">
                      @if (request.review_status === 'pending') {
                      <p-button
                        icon="pi pi-check"
                        [text]="true"
                        severity="success"
                        size="small"
                        (onClick)="approveCompensatoryRequest(request); $event.stopPropagation()"
                        pTooltip="Aprobar"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                      <p-button
                        icon="pi pi-times"
                        [text]="true"
                        severity="danger"
                        size="small"
                        (onClick)="rejectCompensatoryRequest(request); $event.stopPropagation()"
                        pTooltip="Rechazar"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                      } @else if (request.review_status === 'approved' &&
                      !request.is_approved) {
                      <p-button
                        icon="pi pi-check-circle"
                        [text]="true"
                        severity="info"
                        size="small"
                        (onClick)="registerCompensatoryRequest(request); $event.stopPropagation()"
                        pTooltip="Registrar (Lia)"
                        tooltipPosition="top"
                        [rounded]="true"
                      />
                      }
                      <p-button
                        icon="pi pi-eye"
                        [text]="true"
                        severity="info"
                        size="small"
                        (onClick)="viewCompensatoryDetails(request); $event.stopPropagation()"
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
        }
      </div>
    </div>

    <!-- Dialog de Detalles -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '600px' }"
      [header]="'Detalles de Incapacidad'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      @if (selectedDisability()) {
      <div class="space-y-4 pt-4">
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Empleado</label
          >
          <p class="text-white">
            {{ selectedDisability()!.employee?.first_name }}
            {{ selectedDisability()!.employee?.father_name }}
            {{ selectedDisability()!.employee?.mother_name }}
          </p>
          <p class="text-sm text-gray-400">
            {{ selectedDisability()!.employee?.work_email }}
          </p>
          @if (selectedDisability()!.employee?.position?.name) {
          <p class="text-sm text-gray-500">
            {{ selectedDisability()!.employee?.position?.name }}
          </p>
          } @if (selectedDisability()!.employee?.branch?.name) {
          <p class="text-sm text-gray-500">
            Sucursal: {{ selectedDisability()!.employee?.branch?.name }}
          </p>
          }
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Fecha Inicio</label
            >
            <p class="text-white">
              {{ selectedDisability()!.start_date | date : 'dd/MM/yyyy' }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Fecha Fin</label
            >
            <p class="text-white">
              {{ selectedDisability()!.end_date | date : 'dd/MM/yyyy' }}
            </p>
          </div>
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
            días
          </p>
        </div>
        @if (selectedDisability()!.description) {
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Descripción</label
          >
          <p class="text-white whitespace-pre-wrap">
            {{ selectedDisability()!.description }}
          </p>
        </div>
        }
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Estado</label
          >
          <p-tag
            [value]="getStatusLabel(selectedDisability()!.status)"
            [severity]="getStatusSeverity(selectedDisability()!.status)"
          />
        </div>
        @if (selectedDisability()!.document_url) {
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Documento</label
          >
          <p-button
            icon="pi pi-download"
            label="Descargar Documento"
            (onClick)="downloadDocument(selectedDisability()!.document_url!)"
            class="w-full"
          />
        </div>
        }
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1"
            >Fecha de Creación</label
          >
          <p class="text-white">
            {{ selectedDisability()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
          </p>
        </div>
      </div>
      }
    </p-dialog>

    <!-- Dialog de Detalles de Tiempo Compensatorio -->
    <p-dialog
      [(visible)]="showCompensatoryDetailsDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [header]="'Detalles de Solicitud de Tiempo Compensatorio'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      @if (selectedCompensatoryRequest()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
            }
            @if (selectedCompensatoryRequest()!.employee?.branch?.name) {
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

        <!-- Horas Extras Disponibles -->
        <div class="p-4 bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-clock text-cyan-400"></i>
            Horas Extras Disponibles
          </h3>
          @if (isLoadingOvertimeHours()) {
          <div class="flex items-center gap-2 text-gray-400">
            <i class="pi pi-spin pi-spinner"></i>
            <span>Cargando horas extras...</span>
          </div>
          } @else {
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 mb-1">Total de horas extras acumuladas (mes actual)</p>
              <p class="text-3xl font-bold text-cyan-300">
                {{ employeeOvertimeHours().toFixed(1) }}h
              </p>
            </div>
            <div class="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <i class="pi pi-clock text-cyan-400 text-3xl"></i>
            </div>
          </div>
          @if (employeeOvertimeHours() === 0) {
          <p class="text-xs text-gray-400 mt-3">
            El empleado no tiene horas extras acumuladas este mes. Las horas extras se generan cuando se trabaja más de 9 horas en un día.
          </p>
          }
          }
        </div>

        <!-- Información de la Solicitud -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-info-circle text-cyan-400"></i>
            Información de la Solicitud
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Tipo de Solicitud</label
              >
              <p class="text-white">
                @let compensatoryType = getCompensatoryTypeFromNotes(selectedCompensatoryRequest()!);
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
                @let quantity = getCompensatoryQuantity(selectedCompensatoryRequest()!);
                @if (quantity && quantity.value > 0) {
                  @if (quantity.isDays) {
                    {{ quantity.value }} día(s) ({{ quantity.value * 8 }} horas)
                  } @else {
                    {{ formatHoursMinutes(quantity.value) }}
                  }
                } @else {
                  <span class="text-gray-400">No especificada</span>
                }
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Inicio</label
              >
              <p class="text-white">
                {{ selectedCompensatoryRequest()!.date_from | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Fin</label
              >
              <p class="text-white">
                {{ selectedCompensatoryRequest()!.date_to | date : 'dd/MM/yyyy' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{ selectedCompensatoryRequest()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getCompensatoryStatusLabel(selectedCompensatoryRequest()!)"
                [severity]="getCompensatoryStatusSeverity(selectedCompensatoryRequest()!)"
              />
            </div>
          </div>
          @let reason = getCompensatoryReasonFromNotes(selectedCompensatoryRequest()!);
          @if (reason) {
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Motivo</label
            >
            <p class="text-white whitespace-pre-wrap bg-neutral-900/50 p-3 rounded">
              {{ reason }}
            </p>
          </div>
          }
          @if (selectedCompensatoryRequest()!.rejection_comment) {
          <div class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <label class="block text-sm font-medium text-red-400 mb-1"
              >Comentario de Rechazo</label
            >
            <p class="text-red-300 whitespace-pre-wrap">
              {{ selectedCompensatoryRequest()!.rejection_comment }}
            </p>
          </div>
          }
        </div>

        <!-- Fechas donde trabajó horas extra -->
        @if (getOvertimeDaysFromNotes(selectedCompensatoryRequest()!)) {
        <div class="p-5 bg-neutral-800 rounded-lg border border-neutral-700 shadow-lg">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i class="pi pi-calendar-check text-cyan-400"></i>
            Fechas donde trabajó horas extra
          </h3>
          <div class="overflow-x-auto -mx-2">
            <p-table
              [value]="getOvertimeDaysFromNotes(selectedCompensatoryRequest()!) || []"
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
                    <div class="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded">
                      <i class="pi pi-sign-in text-green-400 text-sm"></i>
                      <span class="font-mono text-sm font-semibold text-green-300">{{ dayDetail.entryTime }}</span>
                    </div>
                  </td>
                  <td class="py-3">
                    <div class="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded">
                      <i class="pi pi-sign-out text-red-400 text-sm"></i>
                      <span class="font-mono text-sm font-semibold text-red-300">{{ dayDetail.exitTime }}</span>
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <div class="flex flex-col items-end">
                      <span class="font-semibold text-white text-sm">{{ formatHoursMinutes(dayDetail.totalHours) }}</span>
                      <span class="text-xs text-gray-400 mt-0.5">(neto)</span>
                    </div>
                  </td>
                  <td class="text-right py-3">
                    <span class="text-gray-300 font-medium text-sm">{{ formatHoursMinutes(dayDetail.lunchDuration) }}</span>
                  </td>
                  <td class="text-right py-3">
                    @if (hasDelay(dayDetail.delayHours)) {
                      <span class="px-2 py-1 bg-red-500/20 text-red-300 rounded text-sm font-semibold">
                        {{ formatHoursMinutes(dayDetail.delayHours) }}
                      </span>
                    } @else {
                      <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td class="text-right py-3">
                    <span class="px-3 py-1.5 bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 text-cyan-300 rounded-lg font-bold text-sm border border-cyan-400/30">
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
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button
            label="Cerrar"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="showCompensatoryDetailsDialog.set(false)"
            [rounded]="true"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Dialog de Motivo de Rechazo -->
    <p-dialog
      [(visible)]="showRejectionDialog"
      [modal]="true"
      [style]="{ width: '500px' }"
      [header]="'Motivo de Rechazo'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <div class="space-y-4 pt-4">
        @if (requestToReject()) {
        <div class="mb-4">
          <p class="text-gray-300 text-sm">
            Estás rechazando la solicitud de tiempo compensatorio de
            <strong class="text-white">{{ getEmployeeName(requestToReject()!) }}</strong>.
            Por favor, indica el motivo del rechazo:
          </p>
        </div>
        }
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Motivo del Rechazo <span class="text-red-400">*</span>
          </label>
          <textarea
            pInputTextarea
            [(ngModel)]="rejectionComment"
            placeholder="Ingresa el motivo del rechazo..."
            rows="5"
            class="w-full"
            [style]="{'min-height': '120px'}"
          ></textarea>
        </div>
      </div>
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="cancelRejection()"
            [rounded]="true"
          />
          <p-button
            label="Confirmar Rechazo"
            icon="pi pi-times-circle"
            severity="danger"
            (onClick)="confirmRejection()"
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
  
  // Método para navegar a diferentes pestañas
  public navigateToTab(tab: 'disabilities' | 'compensatory' | 'documents' | 'suggestions'): void {
    if (tab === 'documents') {
      // Navegar a la ruta de solicitudes de documentos (si existe) o mostrar contenido embebido
      this.activeTab.set('documents');
      // TODO: Implementar vista de solicitudes de documentos
    } else if (tab === 'suggestions') {
      // Navegar al buzón de sugerencias
      this.router.navigate(['admin', 'suggestions-inbox']);
    } else {
      // Para disabilities y compensatory, solo cambiar la pestaña activa
      this.activeTab.set(tab);
    }
  }

  // API para obtener incapacidades con información del empleado
  public disabilitiesApi = httpResource<Disability[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: `*,employee:employees(id,first_name,father_name,mother_name,work_email,position:positions(name),branch:branches(name))`,
      order: 'created_at.desc',
    };

    // Nota: employee_disabilities no tiene company_id directamente, pero podemos filtrar por employee.company_id
    // Por ahora, dejamos que el filtro se haga a través de la relación employee
    // Si necesitamos filtrar, podríamos agregar un filtro adicional

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
      method: 'GET',
      params,
    };
  });

  // Filtros
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);
  
  // Nuevas señales para el dashboard mejorado
  public activeTab = signal<'disabilities' | 'compensatory' | 'documents' | 'suggestions'>('disabilities');
  public showFilters = signal(false);
  public showCompensatoryFilters = signal(false);
  public globalSearchText = signal('');
  public selectedDisabilities = signal<string[]>([]);

  // Dialog
  public showDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);
  public showCompensatoryDetailsDialog = signal(false);
  public selectedCompensatoryRequest = signal<CompensatoryRequest | null>(null);
  public employeeOvertimeHours = signal<number>(0);
  public isLoadingOvertimeHours = signal<boolean>(false);
  
  // Dialog de rechazo
  public showRejectionDialog = signal(false);
  public rejectionComment = signal('');
  public requestToReject = signal<CompensatoryRequest | null>(null);

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

  public getCompensatoryQuantity(data: CompensatoryRequest): {
    value: number;
    isDays: boolean;
  } {
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
        const hasTimeInFrom = dateFromStr.includes(' ') && dateFromStr.includes(':');
        const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');
        
        if (hasTimeInFrom && hasTimeInTo) {
          // Tiene hora, es por horas
          isDays = false;
        } else {
          // No tiene hora, calcular diferencia
          const hours = this.calculateHoursFromDates(data.date_from, data.date_to);
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
      
      const hasTimeInFrom = dateFromStr.includes(' ') && dateFromStr.includes(':');
      const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');
      
      if (hasTimeInFrom && hasTimeInTo) {
        isDays = false;
      } else {
        const hours = this.calculateHoursFromDates(data.date_from, data.date_to);
        const days = hours / 24;
        isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
      }
    }

    if (isDays) {
      // Calcular días desde fechas
      let days = 0;
      if (data.date_from && data.date_to) {
        days = this.calculateDays(data.date_from, data.date_to);
      } else if (data.compensatory_amount) {
        days = data.compensatory_amount;
      }
      return { value: days > 0 ? days : 1, isDays: true };
    } else {
      // Para horas, calcular siempre desde fechas si están disponibles
      let hours = 0;
      if (data.date_from && data.date_to) {
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
      } else if (data.compensatory_amount) {
        hours = data.compensatory_amount;
      }
      
      // Si no hay horas calculadas y no hay datos, devolver 0 para que se muestre "-"
      if (hours === 0 && !data.date_from && !data.date_to && !data.hours && !data.compensatory_amount) {
        return { value: 0, isDays: false };
      }
      
      return { value: hours > 0 ? hours : 0, isDays: false };
    }
    
    // Si no se pudo determinar el tipo, intentar devolver algo por defecto
    const amount = data.compensatory_amount ?? 0;
    if (amount > 0) {
      return { value: amount, isDays: false };
    }
    
    // Si no hay datos, devolver 0 para que se muestre "-"
    return { value: 0, isDays: false };
  }

  public getCompensatoryTypeFromNotes(data: CompensatoryRequest): 'days' | 'hours' | null {
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
        if (tipoNote.includes('Días')) {
          return 'days';
        } else if (tipoNote.includes('Horas')) {
          return 'hours';
        }
      }
    }
    
    // Si no se encuentra, intentar determinar por formato de fechas
    if (data.date_from && data.date_to) {
      const dateFromStr = String(data.date_from);
      const dateToStr = String(data.date_to);
      
      const hasTimeInFrom = dateFromStr.includes(' ') && dateFromStr.includes(':');
      const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');
      
      if (hasTimeInFrom && hasTimeInTo) {
        return 'hours';
      } else {
        return 'days';
      }
    }
    
    return null;
  }

  public getCompensatoryReasonFromNotes(data: CompensatoryRequest): string | null {
    // Primero intentar desde reason si existe
    if (data.reason) {
      return data.reason;
    }
    
    // Intentar desde las notas
    if (data.notes) {
      const notesArray = Array.isArray(data.notes)
        ? data.notes
        : typeof data.notes === 'string'
        ? [data.notes]
        : [];
      
      // Buscar nota que contenga "Motivo:"
      const motivoNote = notesArray.find(
        (note: any) => typeof note === 'string' && note.includes('Motivo:')
      );
      
      if (motivoNote) {
        // Extraer el motivo después de "Motivo:"
        const match = motivoNote.match(/Motivo:\s*(.+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return null;
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
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
    return filtered.length > 0 && filtered.every(d => this.selectedDisabilities().includes(d.id));
  }

  public toggleSelectAll(selectAll: boolean): void {
    if (selectAll) {
      const allIds = this.filteredDisabilities().map(d => d.id);
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
        selected.forEach(id => {
          const disability = this.disabilitiesApi.value()?.find(d => d.id === id);
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
        selected.forEach(id => {
          const disability = this.disabilitiesApi.value()?.find(d => d.id === id);
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

  public exportData(): void {
    // Implementar exportación a Excel/CSV
    this.messageService.add({
      severity: 'info',
      summary: 'Exportación',
      detail: 'Funcionalidad de exportación próximamente disponible',
    });
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

    // Usar sintaxis con alias explícito para especificar la relación correcta
    const params: any = {
      select: `*,type:timeoff_types(id,name),employee:employee_id(id,first_name,father_name,work_email,position:positions(name),branch:branches(name))`,
      type_id: `eq.${compensatoryTypeId}`,
      order: 'created_at.desc',
    };

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`,
      method: 'GET',
      params,
    };
  });

  // Filtros para tiempo compensatorio
  public compensatorySearchText = signal('');
  public compensatorySelectedStatus = signal<string | null>(null);
  public compensatoryDateRange = signal<Date[] | null>(null);
  public isRefreshing = signal(false);

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
        const reason = r.reason?.toLowerCase() || '';
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
        const reason = r.reason?.toLowerCase() || '';
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

  public refreshAll(): void {
    this.isRefreshing.set(true);
    this.disabilitiesApi.reload();
    this.compensatoryTimeoffsApi.reload();
    setTimeout(() => this.isRefreshing.set(false), 1000);
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
    const startIndex = notesArray.findIndex(note => 
      typeof note === 'string' && note.includes('--- Fechas donde trabajó horas extra ---')
    );

    if (startIndex === -1) return null;

    // Extraer las líneas de detalle por fecha (después de "Detalle por fecha:")
    const detailStartIndex = notesArray.findIndex((note, idx) => 
      idx > startIndex && typeof note === 'string' && note.includes('Detalle por fecha:')
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
      const matchWithDelay = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h[^|]*\|\s+Almuerzo:\s+([\d.]+)h(?:\s+\|\s+Retraso:\s+([\d.]+)h)?\s+\|\s+Extra:\s+([\d.]+)h/);
      
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
        const matchWithLunch = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Almuerzo:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/);
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
          const oldMatch = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/);
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

  // Método helper para calcular horas extras de un empleado específico
  private async loadEmployeeOvertimeHours(employeeId: string): Promise<void> {
    this.isLoadingOvertimeHours.set(true);
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) {
        this.employeeOvertimeHours.set(0);
        return;
      }

      // Obtener timelogs del mes actual
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());
      
      const startDateStr = format(startDate, "yyyy-MM-dd'T'06:00:00");
      const endDateStr = format(endDate, "yyyy-MM-dd'T'06:00:00");

      const timelogs = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`,
          {
            params: {
              select: '*',
              employee_id: `eq.${employeeId}`,
              'employee.company_id': `eq.${companyId}`,
              created_at: `gte.${startDateStr},lte.${endDateStr}`,
              order: 'created_at.asc',
            },
          }
        )
      );

      // Procesar timelogs similar a employee-portal
      const processedLogs = this.processTimelogsForOvertime(timelogs);
      const totalHours = this.calculateTotalOvertimeHours(processedLogs);
      this.employeeOvertimeHours.set(totalHours);
    } catch (error) {
      console.error('Error loading overtime hours:', error);
      this.employeeOvertimeHours.set(0);
    } finally {
      this.isLoadingOvertimeHours.set(false);
    }
  }

  // Procesar timelogs para agrupar por día
  private processTimelogsForOvertime(timelogs: any[]): any[] {
    const processed = timelogs
      .map((x) => ({ ...x, day: format(new Date(x.created_at), 'yyyy-MM-dd') }))
      .reduce<any[]>((acc, x) => {
        const existing = acc.find((item) => item.day === x.day);
        if (!existing) {
          acc.push({
            day: x.day,
            entry: x.type === 'entry' ? { date: new Date(x.created_at) } : undefined,
            lunch_start: x.type === 'lunch_start' ? { date: new Date(x.created_at) } : undefined,
            lunch_end: x.type === 'lunch_end' ? { date: new Date(x.created_at) } : undefined,
            exit: x.type === 'exit' ? { date: new Date(x.created_at) } : undefined,
          });
        } else {
          if (x.type === 'entry') existing.entry = { date: new Date(x.created_at) };
          if (x.type === 'lunch_start') existing.lunch_start = { date: new Date(x.created_at) };
          if (x.type === 'lunch_end') existing.lunch_end = { date: new Date(x.created_at) };
          if (x.type === 'exit') existing.exit = { date: new Date(x.created_at) };
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

      const lunchTime =
        log.lunch_start && log.lunch_end
          ? differenceInMinutes(
              new Date(log.lunch_end.date),
              new Date(log.lunch_start.date)
            )
          : 0;

      // Calcular horas extras: más de 9 horas totales (8 horas + 1 hora de almuerzo)
      const requiredTotalMinutes = 540;
      const overtimeByTotalTime =
        totalMinutes > requiredTotalMinutes
          ? totalMinutes - requiredTotalMinutes
          : 0;

      // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
      const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

      // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
      const dayOvertimeMinutes = Math.max(0, overtimeByTotalTime - lunchExceededMinutes);
      totalOvertimeMinutes += dayOvertimeMinutes;
    });

    return totalOvertimeMinutes / 60;
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
    this.requestToReject.set(request);
    this.rejectionComment.set('');
    this.showRejectionDialog.set(true);
  }

  public confirmRejection(): void {
    const request = this.requestToReject();
    const comment = this.rejectionComment().trim();
    
    if (!request) return;
    
    if (!comment) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, ingresa un motivo para el rechazo',
      });
      return;
    }

    this.updateCompensatoryReviewStatus(
      request.id,
      'rejected',
      comment
    );
    
    this.showRejectionDialog.set(false);
    this.rejectionComment.set('');
    this.requestToReject.set(null);
  }

  public cancelRejection(): void {
    this.showRejectionDialog.set(false);
    this.rejectionComment.set('');
    this.requestToReject.set(null);
  }

  public registerCompensatoryRequest(request: CompensatoryRequest): void {
    const employeeName = this.getEmployeeName(request);
    this.confirmationService.confirm({
      message: `¿Estás seguro de registrar la solicitud de tiempo compensatorio de ${employeeName}?`,
      header: 'Confirmar Registro',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-info',
      accept: () => {
        this.registerCompensatoryTimeoff(request.id);
      },
    });
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

    const updateData: any = {
      review_status: status,
      reviewed_by: currentEmployee.id,
      reviewed_at: new Date().toISOString(),
    };

    if (status === 'rejected' && rejectionComment) {
      updateData.rejection_comment = rejectionComment;
    }

    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs?id=eq.${id}`,
        updateData
      )
      .subscribe({
        next: async () => {
          // Obtener la solicitud para notificar al empleado
          const request = this.compensatoryTimeoffsApi
            .value()
            ?.find((r) => r.id === id);

          if (status === 'approved' && request) {
            // Enviar notificación a Lia para que registre
            await this.notifyLiaForRegistration(id, request);
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

  private registerCompensatoryTimeoff(id: string): void {
    const currentEmployee = this.dashboardStore.currentEmployee();
    if (!currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al empleado actual',
      });
      return;
    }

    const updateData = {
      registered_by: currentEmployee.id,
      registered_at: new Date().toISOString(),
      is_approved: true,
    };

    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs?id=eq.${id}`,
        updateData
      )
      .subscribe({
        next: async () => {
          // Obtener la solicitud para notificar al empleado
          const request = this.compensatoryTimeoffsApi
            .value()
            ?.find((r) => r.id === id);
          if (request) {
            // Enviar notificación al empleado sobre la aprobación final
            await this.notifyEmployee(id, request, 'approved');
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Solicitud registrada correctamente',
          });
          this.compensatoryTimeoffsApi.reload();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo registrar la solicitud',
          });
        },
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

      // Buscar posiciones HR
      const hrPositions = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/positions`,
          {
            params: {
              select: 'id',
              name: 'ilike.%recursos humanos%',
            },
          }
        )
      );

      if (!hrPositions || hrPositions.length === 0) {
        console.warn('No se encontraron posiciones HR');
        return;
      }

      const hrPositionIds = hrPositions.map((p) => p.id);

      // Buscar Lia (empleado HR que registra)
      const liaEmployees = await firstValueFrom(
        this.http.get<any[]>(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
          {
            params: {
              select: 'id,first_name,father_name',
              position_id: `in.(${hrPositionIds.join(',')})`,
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
      const notifications = liaEmployees.map((lia) => ({
        recipient_id: lia.id,
        type: 'other',
        title: 'Solicitud de Tiempo Compensatorio Aprobada - Requiere Registro',
        message: `La solicitud de tiempo compensatorio de ${employeeName} ha sido aprobada y requiere tu registro.`,
        related_entity_type: 'timeoff',
        related_entity_id: timeoffId,
        priority: 'medium',
      }));

      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/notifications`,
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
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/notifications`,
          {
            recipient_id: employeeId,
            type: 'other',
            title,
            message,
            related_entity_type: 'timeoff',
            related_entity_id: timeoffId,
            priority: status === 'rejected' ? 'high' : 'medium',
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
  }

  public downloadDocument(url: string): void {
    window.open(url, '_blank');
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

  private updateDisabilityStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): void {
    this.http
      .patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities?id=eq.${id}`,
        { status, reviewed_at: new Date().toISOString() }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Incapacidad ${
              status === 'approved' ? 'aprobada' : 'rechazada'
            } correctamente`,
          });
          this.disabilitiesApi.reload();
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
}
