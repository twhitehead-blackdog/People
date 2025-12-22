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
import { differenceInMinutes, format, startOfMonth, endOfMonth } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
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
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    CardModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white m-0">Gestión de RRHH</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Revisa, aprueba o rechaza las solicitudes enviadas por los empleados
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p-button
            icon="pi pi-refresh"
            label="Actualizar"
            [outlined]="true"
            severity="secondary"
            (onClick)="refreshAll()"
            [loading]="isRefreshing()"
          />
        </div>
      </div>

      <p-tabs value="disabilities">
        <p-tablist>
          <p-tab value="disabilities">
            <i class="pi pi-heart mr-2"></i>
            Incapacidades
          </p-tab>
          <p-tab value="compensatory">
            <i class="pi pi-clock mr-2"></i>
            Tiempo Compensatorio
          </p-tab>
        </p-tablist>

        <p-tabpanel value="disabilities">
          <!-- Estadísticas de Incapacidades -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Total</p>
                  <p class="text-2xl font-bold text-white m-0 mt-1">
                    {{ totalCount() }}
                  </p>
                </div>
                <i class="pi pi-file text-3xl text-gray-500"></i>
              </div>
            </div>
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Pendientes</p>
                  <p class="text-2xl font-bold text-yellow-400 m-0 mt-1">
                    {{ pendingCount() }}
                  </p>
                </div>
                <i class="pi pi-clock text-3xl text-yellow-500"></i>
              </div>
            </div>
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Aprobadas</p>
                  <p class="text-2xl font-bold text-green-400 m-0 mt-1">
                    {{ approvedCount() }}
                  </p>
                </div>
                <i class="pi pi-check-circle text-3xl text-green-500"></i>
              </div>
            </div>
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Rechazadas</p>
                  <p class="text-2xl font-bold text-red-400 m-0 mt-1">
                    {{ rejectedCount() }}
                  </p>
                </div>
                <i class="pi pi-times-circle text-3xl text-red-500"></i>
              </div>
            </div>
          </div>

          <!-- Filtros -->
          <p-card class="bg-neutral-800 border-neutral-700">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2"
                  >Buscar</label
                >
                <input
                  type="text"
                  pInputText
                  placeholder="Empleado, descripción..."
                  [(ngModel)]="searchText"
                  (input)="onFilterChange()"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2"
                  >Estado</label
                >
                <p-dropdown
                  [options]="statusOptions"
                  [(ngModel)]="selectedStatus"
                  (onChange)="onFilterChange()"
                  placeholder="Todos los estados"
                  [showClear]="true"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2"
                  >Fecha Inicio</label
                >
                <p-calendar
                  [(ngModel)]="dateRange"
                  selectionMode="range"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Rango de fechas"
                  (onSelect)="onFilterChange()"
                  [showClear]="true"
                  class="w-full"
                />
              </div>
              <div class="flex items-end">
                <p-button
                  label="Limpiar Filtros"
                  icon="pi pi-filter-slash"
                  [outlined]="true"
                  severity="secondary"
                  (onClick)="clearFilters()"
                  class="w-full"
                />
              </div>
            </div>
          </p-card>

          <!-- Tabla -->
          <p-card class="bg-neutral-800 border-neutral-700">
            @if (disabilitiesApi.isLoading()) {
            <div class="flex justify-center items-center py-12">
              <p-progressSpinner />
            </div>
            } @else {
            <p-table
              [value]="filteredDisabilities()"
              [paginator]="true"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              [globalFilterFields]="[
                'employee.first_name',
                'employee.father_name',
                'employee.work_email',
                'description'
              ]"
              styleClass="p-datatable-striped"
              [tableStyle]="{ 'min-width': '50rem' }"
            >
              <ng-template #emptymessage>
                <tr>
                  <td colspan="8" class="text-center py-4">
                    No se encontraron incapacidades
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 200px">Empleado</th>
                  <th style="width: 120px">Fecha Inicio</th>
                  <th style="width: 120px">Fecha Fin</th>
                  <th style="width: 100px">Días</th>
                  <th>Descripción</th>
                  <th style="width: 120px">Estado</th>
                  <th style="width: 100px">Documento</th>
                  <th style="width: 200px">Acciones</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-disability>
                <tr>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium text-white">
                        {{ disability.employee?.first_name }}
                        {{ disability.employee?.father_name }}
                      </span>
                      <span class="text-xs text-gray-400">
                        {{ disability.employee?.work_email }}
                      </span>
                      @if (disability.employee?.position?.name) {
                      <span class="text-xs text-gray-500">
                        {{ disability.employee.position.name }}
                      </span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ disability.start_date | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ disability.end_date | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm font-medium text-white">
                      {{
                        calculateDays(
                          disability.start_date,
                          disability.end_date
                        )
                      }}
                      días
                    </span>
                  </td>
                  <td>
                    @if (disability.description) {
                    <span
                      class="text-sm text-gray-300 cursor-help"
                      [pTooltip]="disability.description"
                      tooltipPosition="top"
                      [style.max-width.px]="200"
                      [style.display]="'inline-block'"
                      [style.overflow]="'hidden'"
                      [style.text-overflow]="'ellipsis'"
                      [style.white-space]="'nowrap'"
                    >
                      {{ disability.description }}
                    </span>
                    } @else {
                    <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <p-tag
                      [value]="getStatusLabel(disability.status)"
                      [severity]="getStatusSeverity(disability.status)"
                    />
                  </td>
                  <td>
                    @if (disability.document_url) {
                    <p-button
                      icon="pi pi-download"
                      [text]="true"
                      severity="secondary"
                      (onClick)="downloadDocument(disability.document_url!)"
                      pTooltip="Descargar documento"
                      tooltipPosition="top"
                    />
                    } @else {
                    <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-2">
                      @if (disability.status === 'pending') {
                      <p-button
                        icon="pi pi-check"
                        [text]="true"
                        severity="success"
                        (onClick)="approveDisability(disability)"
                        pTooltip="Aprobar"
                        tooltipPosition="top"
                      />
                      <p-button
                        icon="pi pi-times"
                        [text]="true"
                        severity="danger"
                        (onClick)="rejectDisability(disability)"
                        pTooltip="Rechazar"
                        tooltipPosition="top"
                      />
                      }
                      <p-button
                        icon="pi pi-eye"
                        [text]="true"
                        severity="info"
                        (onClick)="viewDetails(disability)"
                        pTooltip="Ver detalles"
                        tooltipPosition="top"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
            }
          </p-card>
        </p-tabpanel>

        <p-tabpanel value="compensatory">
          <!-- Estadísticas de Tiempo Compensatorio -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Total</p>
                  <p class="text-2xl font-bold text-white m-0 mt-1">
                    {{ compensatoryTotalCount() }}
                  </p>
                </div>
                <i class="pi pi-clock text-3xl text-gray-500"></i>
              </div>
            </div>
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Pendientes</p>
                  <p class="text-2xl font-bold text-yellow-400 m-0 mt-1">
                    {{ compensatoryPendingCount() }}
                  </p>
                </div>
                <i class="pi pi-clock text-3xl text-yellow-500"></i>
              </div>
            </div>
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Aprobadas</p>
                  <p class="text-2xl font-bold text-green-400 m-0 mt-1">
                    {{ compensatoryApprovedCount() }}
                  </p>
                </div>
                <i class="pi pi-check-circle text-3xl text-green-500"></i>
              </div>
            </div>
            <div
              class="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-400 m-0">Rechazadas</p>
                  <p class="text-2xl font-bold text-red-400 m-0 mt-1">
                    {{ compensatoryRejectedCount() }}
                  </p>
                </div>
                <i class="pi pi-times-circle text-3xl text-red-500"></i>
              </div>
            </div>
          </div>

          <!-- Filtros de Tiempo Compensatorio -->
          <p-card class="bg-neutral-800 border-neutral-700 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2"
                  >Buscar</label
                >
                <input
                  type="text"
                  pInputText
                  placeholder="Empleado, motivo..."
                  [(ngModel)]="compensatorySearchText"
                  (input)="onCompensatoryFilterChange()"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2"
                  >Estado</label
                >
                <p-dropdown
                  [options]="compensatoryStatusOptions"
                  [(ngModel)]="compensatorySelectedStatus"
                  (onChange)="onCompensatoryFilterChange()"
                  placeholder="Todos los estados"
                  [showClear]="true"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2"
                  >Fecha</label
                >
                <p-calendar
                  [(ngModel)]="compensatoryDateRange"
                  selectionMode="range"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Rango de fechas"
                  (onSelect)="onCompensatoryFilterChange()"
                  [showClear]="true"
                  class="w-full"
                />
              </div>
              <div class="flex items-end">
                <p-button
                  label="Limpiar Filtros"
                  icon="pi pi-filter-slash"
                  [outlined]="true"
                  severity="secondary"
                  (onClick)="clearCompensatoryFilters()"
                  class="w-full"
                />
              </div>
            </div>
          </p-card>

          <!-- Tabla de Tiempo Compensatorio -->
          <p-card class="bg-neutral-800 border-neutral-700">
            @if (compensatoryTimeoffsApi.isLoading()) {
            <div class="flex justify-center items-center py-12">
              <p-progressSpinner />
            </div>
            } @else {
            <p-table
              [value]="filteredCompensatoryRequests()"
              [paginator]="true"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              [globalFilterFields]="[
                'employee_id.first_name',
                'employee_id.father_name',
                'employee_id.work_email',
                'reason'
              ]"
              styleClass="p-datatable-striped"
              [tableStyle]="{ 'min-width': '50rem' }"
            >
              <ng-template #emptymessage>
                <tr>
                  <td colspan="8" class="text-center py-4">
                    No se encontraron solicitudes de tiempo compensatorio
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 200px">Empleado</th>
                  <th style="width: 120px">Fecha Inicio</th>
                  <th style="width: 120px">Fecha Fin</th>
                  <th style="width: 100px">Tipo</th>
                  <th style="width: 100px">Cantidad</th>
                  <th>Motivo</th>
                  <th style="width: 120px">Estado</th>
                  <th style="width: 200px">Acciones</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-request>
                <tr>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium text-white">
                        {{ getEmployeeName(request) }}
                      </span>
                      <span class="text-xs text-gray-400">
                        {{ getEmployeeEmail(request) }}
                      </span>
                      @if (getEmployeePosition(request)) {
                      <span class="text-xs text-gray-500">
                        {{ getEmployeePosition(request) }}
                      </span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ request.date_from | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{ request.date_to | date : 'dd/MM/yyyy' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm font-medium text-white">
                      {{
                        request.compensatory_type === 'days' ? 'Días' : 'Horas'
                      }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm font-medium text-white">
                      @if (request.compensatory_type === 'days') {
                      {{
                        request.compensatory_amount ||
                          calculateDays(request.date_from, request.date_to)
                      }}
                      días } @else {
                      {{ request.hours || request.compensatory_amount || 0 }}h }
                    </span>
                  </td>
                  <td>
                    @if (request.reason) {
                    <span
                      class="text-sm text-gray-300 cursor-help"
                      [pTooltip]="request.reason"
                      tooltipPosition="top"
                      [style.max-width.px]="200"
                      [style.display]="'inline-block'"
                      [style.overflow]="'hidden'"
                      [style.text-overflow]="'ellipsis'"
                      [style.white-space]="'nowrap'"
                    >
                      {{ request.reason }}
                    </span>
                    } @else {
                    <span class="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td>
                    <p-tag
                      [value]="getCompensatoryStatusLabel(request)"
                      [severity]="getCompensatoryStatusSeverity(request)"
                    />
                  </td>
                  <td>
                    <div class="flex gap-2">
                      @if (request.review_status === 'pending') {
                      <p-button
                        icon="pi pi-check"
                        [text]="true"
                        severity="success"
                        (onClick)="approveCompensatoryRequest(request)"
                        pTooltip="Aprobar"
                        tooltipPosition="top"
                      />
                      <p-button
                        icon="pi pi-times"
                        [text]="true"
                        severity="danger"
                        (onClick)="rejectCompensatoryRequest(request)"
                        pTooltip="Rechazar"
                        tooltipPosition="top"
                      />
                      } @else if (request.review_status === 'approved' &&
                      !request.is_approved) {
                      <p-button
                        icon="pi pi-check-circle"
                        [text]="true"
                        severity="info"
                        (onClick)="registerCompensatoryRequest(request)"
                        pTooltip="Registrar (Lia)"
                        tooltipPosition="top"
                      />
                      }
                      <p-button
                        icon="pi pi-eye"
                        [text]="true"
                        severity="info"
                        (onClick)="viewCompensatoryDetails(request)"
                        pTooltip="Ver detalles"
                        tooltipPosition="top"
                      />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
            }
          </p-card>
        </p-tabpanel>
      </p-tabs>
    </div>

    <!-- Dialog de Detalles -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{ width: '600px' }"
      [header]="'Detalles de Incapacidad'"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedDisability()) {
      <div class="space-y-4">
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
    >
      @if (selectedCompensatoryRequest()) {
      <div class="space-y-4">
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
                @if (selectedCompensatoryRequest()!.compensatory_type === 'days') {
                  <span class="flex items-center gap-2">
                    <i class="pi pi-calendar text-cyan-400"></i>
                    Por Días
                  </span>
                } @else {
                  <span class="flex items-center gap-2">
                    <i class="pi pi-clock text-cyan-400"></i>
                    Por Horas
                  </span>
                }
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Cantidad Solicitada</label
              >
              <p class="text-white">
                @if (selectedCompensatoryRequest()!.compensatory_type === 'days') {
                  {{ 
                    selectedCompensatoryRequest()!.compensatory_amount || 
                    calculateDays(selectedCompensatoryRequest()!.date_from, selectedCompensatoryRequest()!.date_to)
                  }} día(s)
                } @else {
                  {{ selectedCompensatoryRequest()!.hours || selectedCompensatoryRequest()!.compensatory_amount || 0 }} hora(s)
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
          @if (selectedCompensatoryRequest()!.reason) {
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-1"
              >Motivo</label
            >
            <p class="text-white whitespace-pre-wrap bg-neutral-900/50 p-3 rounded">
              {{ selectedCompensatoryRequest()!.reason }}
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
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <i class="pi pi-calendar-check text-cyan-400"></i>
            Fechas donde trabajó horas extra
          </h3>
          <div class="overflow-x-auto">
            <p-table
              [value]="getOvertimeDaysFromNotes(selectedCompensatoryRequest()!)"
              styleClass="p-datatable-sm"
              [paginator]="false"
              [scrollable]="true"
              scrollHeight="250px"
            >
              <ng-template #header>
                <tr>
                  <th class="text-left">Fecha</th>
                  <th class="text-left">Hora de Entrada</th>
                  <th class="text-left">Hora de Salida</th>
                  <th class="text-right">Horas Totales</th>
                  <th class="text-right">Tiempo de Almuerzo</th>
                  <th class="text-right">Horas Extra</th>
                </tr>
              </ng-template>
              <ng-template #body let-dayDetail>
                <tr>
                  <td class="font-medium">{{ dayDetail.date }}</td>
                  <td>
                    <span class="flex items-center gap-2">
                      <i class="pi pi-sign-in text-green-400"></i>
                      <span class="font-mono">{{ dayDetail.entryTime }}</span>
                    </span>
                  </td>
                  <td>
                    <span class="flex items-center gap-2">
                      <i class="pi pi-sign-out text-red-400"></i>
                      <span class="font-mono">{{ dayDetail.exitTime }}</span>
                    </span>
                  </td>
                  <td class="text-right">
                    <span class="font-semibold">{{ dayDetail.totalHours }}h</span>
                  </td>
                  <td class="text-right">
                    <span class="text-gray-400">{{ dayDetail.lunchDuration }}h</span>
                  </td>
                  <td class="text-right">
                    <span class="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded font-semibold">
                      {{ dayDetail.overtimeHours }}h
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
  `,
  styles: `
    ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: #1f2937 !important;
      color: #e5e7eb !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: #111827 !important;
      border-color: #374151 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: #1f2937 !important;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: #374151 !important;
      color: #e5e7eb !important;
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HRDisabilitiesComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private dashboardStore = inject(DashboardStore);

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

  // Dialog
  public showDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);
  public showCompensatoryDetailsDialog = signal(false);
  public selectedCompensatoryRequest = signal<CompensatoryRequest | null>(null);
  public employeeOvertimeHours = signal<number>(0);
  public isLoadingOvertimeHours = signal<boolean>(false);

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

    // Filtro por texto
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

    // Filtro por texto
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

  // Método helper para parsear las notas y extraer información de fechas de horas extra
  public getOvertimeDaysFromNotes(request: CompensatoryRequest): Array<{
    date: string;
    entryTime: string;
    exitTime: string;
    totalHours: string;
    lunchDuration: string;
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
      overtimeHours: string;
    }> = [];

    // Parsear cada línea de detalle
    for (let i = detailStartIndex + 1; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (typeof note !== 'string') continue;
      
      // Formato esperado: "dd/MM/yyyy: Entrada HH:mm - Salida HH:mm | Total: X.XXh | Almuerzo: X.XXh | Extra: X.XXh"
      const match = note.match(/(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Almuerzo:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/);
      
      if (match) {
        overtimeDays.push({
          date: match[1],
          entryTime: match[2],
          exitTime: match[3],
          totalHours: match[4],
          lunchDuration: match[5],
          overtimeHours: match[6],
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
            overtimeHours: oldMatch[5],
          });
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

      const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

      const dayOvertimeMinutes = overtimeByTotalTime + lunchExceededMinutes;
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
    // TODO: Mostrar dialog para ingresar comentario de rechazo
    const employeeName = this.getEmployeeName(request);
    this.confirmationService.confirm({
      message: `¿Estás seguro de rechazar la solicitud de tiempo compensatorio de ${employeeName}?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.updateCompensatoryReviewStatus(
          request.id,
          'rejected',
          'Solicitud rechazada'
        );
      },
    });
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
