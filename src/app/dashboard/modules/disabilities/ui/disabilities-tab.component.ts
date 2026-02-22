import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
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
import { DomSanitizer } from '@angular/platform-browser';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { OrganizationService } from '../../../../services/organization.service';
import { ScheduleAutoAssignService } from '../../../../services/schedule-auto-assign.service';
import { ApiUrlService } from '../../../../services/api-url.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { getEnv } from '../../../../utils/env.utils';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import {
  TimeoffAuditLog,
  TimeoffAuditService,
} from '../../../../services/timeoff-audit.service';

interface Disability {
  id: string;
  employee_id: string;
  created_by?: string | null;
  company_id?: string;
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

@Component({
  selector: 'pt-disabilities-tab',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressSpinnerModule,
    FormsModule,
    DatePipe,
    CheckboxModule,
    HrStatsGridComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <!-- Disability Rejection Dialog -->
    <p-dialog
      [(visible)]="showDisabilityRejectionDialog"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      (onHide)="disabilityRejectionComment.set('')"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-red-400"></i>
          <span class="text-lg font-semibold text-white"
            >Confirmar Rechazo de Incapacidad</span
          >
        </div>
      </ng-template>

      <div class="space-y-4 pt-4">
        <p class="text-gray-300">
          Por favor, indica el motivo del rechazo de esta incapacidad.
        </p>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">
            Motivo de Rechazo <span class="text-red-400">*</span>
          </label>
          <textarea
            pTextarea
            [(ngModel)]="disabilityRejectionComment"
            rows="4"
            placeholder="Escribe el motivo del rechazo..."
            class="w-full"
            maxlength="500"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            {{ disabilityRejectionComment().length }}/500 caracteres
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="showDisabilityRejectionDialog.set(false)"
          />
          <p-button
            label="Confirmar Rechazo"
            severity="danger"
            icon="pi pi-times"
            [disabled]="!disabilityRejectionComment().trim() || updatingDisabilityStatus()"
            [loading]="updatingDisabilityStatus()"
            (onClick)="confirmDisabilityRejection()"
          />
        </div>
      </ng-template>
    </p-dialog>

    @if (device.isDesktop()) {
    <!-- Desktop View -->
    <div class="space-y-3">
      <!-- Stats Grid -->
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-heart"
        approvedLabel="Aprobadas"
      />

      <!-- Collapsible Advanced Filters -->
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
                >Busqueda Especifica
              </label>
              <input
                type="text"
                pInputText
                placeholder="Empleado, email, descripcion..."
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

      <!-- Compact Table -->
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
              Solicitudes de Incapacidades
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
            Intenta ajustar los filtros para ver mas resultados
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
            styleClass="p-datatable-striped p-datatable-sm"
            [globalFilterFields]="[
              'employee.first_name',
              'employee.father_name',
              'employee.work_email',
              'description'
            ]"
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
                    <span class="text-xs">Dias</span>
                  </div>
                </th>
                <th style="padding: 0.5rem; text-align: center;">
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-file-edit text-cyan-400 text-xs"></i>
                    <span class="text-xs">Descripcion</span>
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
                  <div class="flex items-center justify-center gap-1">
                    <i class="pi pi-user-plus text-cyan-400 text-xs"></i>
                    <span class="text-xs">Creador</span>
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
                        {{ disability.employee?.branch?.name || '-' }}
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
                    {{ disability.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </td>
                <td style="padding: 0.5rem; text-align: center;">
                  <span class="text-xs text-gray-300">
                    {{ disability.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
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
                    (onClick)="downloadDocument(disability.document_url!); $event.stopPropagation()"
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
                      [loading]="updatingDisabilityStatus()"
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
                      [disabled]="updatingDisabilityStatus()"
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
    } @else {
    <!-- Mobile View -->
    <div class="space-y-3">
      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="pendingCount()"
        [approvedCount]="approvedCount()"
        [rejectedCount]="rejectedCount()"
        icon="pi-heart"
        approvedLabel="Aprobadas"
      />
      <button
        type="button"
        (click)="showFilters.set(!showFilters())"
        class="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-left text-sm text-gray-300"
      >
        <span
          ><i class="pi pi-filter text-cyan-400 mr-2"></i>Filtros @if
          (hasActiveFilters()) {
          <span class="text-cyan-400 text-xs"
            >({{ getActiveFiltersCount() }})</span
          >
          }</span
        >
        <i
          [class]="
            showFilters() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'
          "
        ></i>
      </button>
      @if (showFilters()) {
      <div
        class="grid grid-cols-1 gap-2 p-2 bg-neutral-800/80 rounded-lg border border-neutral-700/50"
      >
        <input
          type="text"
          pInputText
          placeholder="Empleado, descripcion..."
          [(ngModel)]="searchText"
          (input)="onFilterChange()"
          class="w-full text-sm py-2 bg-neutral-900/50 border-neutral-600 rounded"
        />
        <p-dropdown
          [options]="statusOptions"
          [(ngModel)]="selectedStatus"
          (onChange)="onFilterChange()"
          placeholder="Estado"
          [showClear]="true"
          class="w-full"
          styleClass="w-full"
        />
        <p-calendar
          [(ngModel)]="dateRange"
          selectionMode="range"
          dateFormat="dd/mm/yy"
          placeholder="Rango fechas"
          (onSelect)="onFilterChange()"
          [showClear]="true"
          class="w-full"
          [inputStyle]="{ width: '100%' }"
        />
        <p-button
          label="Limpiar filtros"
          icon="pi pi-filter-slash"
          [outlined]="true"
          severity="secondary"
          size="small"
          (onClick)="clearFilters()"
          [disabled]="!hasActiveFilters()"
        />
      </div>
      } @if (disabilitiesApi.isLoading()) {
      <div class="flex justify-center py-8"><p-progressSpinner /></div>
      } @else if (filteredDisabilities().length === 0) {
      <div class="text-center py-8 text-gray-400">
        <i class="pi pi-inbox text-3xl block mb-2"></i>
        <p class="text-sm">No hay solicitudes</p>
        <p-button
          label="Limpiar filtros"
          icon="pi pi-filter-slash"
          [outlined]="true"
          severity="secondary"
          size="small"
          (onClick)="clearFilters()"
          class="mt-2"
        />
      </div>
      } @else {
      <div class="flex flex-col gap-2">
        @for (d of filteredDisabilities(); track d.id) {
        <div
          (click)="viewDetails(d)"
          class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 active:bg-neutral-700/50 transition-colors"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p
                class="font-semibold text-white text-sm m-0 truncate"
              >
                {{ d.employee?.first_name }}
                {{ d.employee?.father_name }}
              </p>
              <p class="text-xs text-gray-400 m-0 mt-0.5">
                {{ d.employee?.branch?.name || '-' }}
              </p>
              <div
                class="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 text-xs text-gray-400"
              >
                <span
                  >{{ d.start_date | date : 'dd/MM/yy' }} -
                  {{ d.end_date | date : 'dd/MM/yy' }}</span
                >
                <span
                  class="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded"
                  >{{ calculateDays(d.start_date, d.end_date) }}
                  dias</span
                >
              </div>
            </div>
            <p-tag
              [value]="getStatusLabel(d.status)"
              [severity]="getStatusSeverity(d.status)"
              [rounded]="true"
              [style]="{ 'font-size': '0.7rem' }"
            />
          </div>
          @if (d.status === 'pending') {
          <div
            class="flex gap-1 mt-2"
            (click)="$event.stopPropagation()"
          >
            <p-button
              icon="pi pi-check"
              [text]="true"
              severity="success"
              size="small"
              [loading]="updatingDisabilityStatus()"
              (onClick)="
                approveDisability(d); $event.stopPropagation()
              "
            />
            <p-button
              icon="pi pi-times"
              [text]="true"
              severity="danger"
              size="small"
              [disabled]="updatingDisabilityStatus()"
              (onClick)="
                rejectDisability(d); $event.stopPropagation()
              "
            />
          </div>
          }
        </div>
        }
      </div>
      }
    </div>
    }

    <!-- Details Dialog -->
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
        <!-- Employee Info and Disability Summary (side by side) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Employee Info -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-blue-400"></i>
              Informacion del Empleado
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

          <!-- Disability Summary -->
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
                <p class="text-sm text-gray-400 mb-1">Duracion total</p>
                <p class="text-3xl font-bold text-blue-300">
                  {{
                    calculateDays(
                      selectedDisability()!.start_date,
                      selectedDisability()!.end_date
                    )
                  }}
                  dias
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
                    {{
                      selectedDisability()!.start_date
                        | date : 'dd/MM/yyyy' : 'UTC'
                    }}
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
                    {{
                      selectedDisability()!.end_date
                        | date : 'dd/MM/yyyy' : 'UTC'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Disability Information -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-blue-400"></i>
            Informacion de la Incapacidad
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Inicio</label
              >
              <p class="text-white">
                {{
                  selectedDisability()!.start_date
                    | date : 'dd/MM/yyyy' : 'UTC'
                }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Fin</label
              >
              <p class="text-white">
                {{
                  selectedDisability()!.end_date
                    | date : 'dd/MM/yyyy' : 'UTC'
                }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Duracion</label
              >
              <p class="text-white">
                {{
                  calculateDays(
                    selectedDisability()!.start_date,
                    selectedDisability()!.end_date
                  )
                }}
                dia(s)
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
                  selectedDisability()!.created_at
                    | date : 'dd/MM/yyyy HH:mm'
                }}
              </p>
            </div>
          </div>
        </div>

        @if (selectedDisability()!.description) {
        <!-- Description -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-blue-400"></i>
            Descripcion
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ selectedDisability()!.description }}
          </p>
        </div>
        } @if (selectedDisability()!.document_url) {
        <!-- Disability Document -->
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
                      Abrir en nueva pestana
                    </a>
                  </p>
                </object>
              </div>
            </div>
          </div>
        </div>
        } @if (selectedDisability()!.status === 'rejected') {
        <!-- Rejection Reason -->
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

        <!-- Status Management -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-cog text-blue-400"></i>
            Gestion de Estado
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
              [disabled]="
                selectedDisability()!.status === status.value ||
                updatingDisabilityStatus()
              "
              [loading]="
                updatingDisabilityStatus() &&
                selectedDisability()!.status !== status.value
              "
            />
            }
          </div>
        </div>
      </div>
      }

      <!-- Audit Sidebar Panel (slides from right) -->
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
          <!-- Sidebar Header -->
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

          <!-- Audit History Content -->
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
                <!-- Always Visible Content -->
                <div class="p-4 space-y-3">
                  <!-- Header with user and action -->
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
                    <!-- Expand/Collapse Button -->
                    <button
                      type="button"
                      (click)="toggleAuditItem(log.id)"
                      class="flex-shrink-0 p-1.5 rounded hover:bg-neutral-700 transition-colors"
                      [class.bg-neutral-700]="isExpanded"
                    >
                      <i
                        [class]="
                          'pi transition-transform duration-200 text-gray-400 text-xs ' +
                          (isExpanded
                            ? 'pi-chevron-up'
                            : 'pi-chevron-down')
                        "
                      ></i>
                    </button>
                  </div>

                  <!-- Expandable Content -->
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
                        <i
                          class="pi pi-arrow-right text-gray-500 text-sm"
                        ></i>
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
                      <p
                        class="text-gray-200 text-xs leading-relaxed italic"
                      >
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

      <!-- Overlay to close sidebar on outside click -->
      @if (showAuditSidebar()) {
      <div
        class="fixed inset-0 bg-black/50 z-[1199]"
        (click)="showAuditSidebar.set(false)"
      ></div>
      }
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisabilitiesTabComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private dashboardStore = inject(DashboardStore);
  private auditService = inject(TimeoffAuditService);
  private sanitizer = inject(DomSanitizer);
  private scheduleAutoAssign = inject(ScheduleAutoAssignService);
  protected device = inject(DeviceService);

  // --- Inputs ---
  globalSearchText = input<string>('');

  // --- Outputs ---
  pendingCountChange = output<number>();

  // --- httpResource API ---
  public disabilitiesApi = httpResource<Disability[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    const params: any = {
      select: `id,employee_id,created_by,start_date,end_date,description,document_url,status,reviewed_by,reviewed_at,review_notes,rejection_comment,created_at,updated_at,company_id,employee:employees!employee_disabilities_employee_id_fkey(id,first_name,father_name,mother_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!employee_disabilities_created_by_fkey(first_name,father_name)`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_disabilities`,
      method: 'GET',
      params,
    };
  });

  // --- Filter Signals ---
  public searchText = signal('');
  public selectedStatus = signal<string | null>(null);
  public dateRange = signal<Date[] | null>(null);
  public showFilters = signal(false);
  public selectedDisabilities = signal<string[]>([]);

  // --- Dialog Signals ---
  public showDetailsDialog = signal(false);
  public selectedDisability = signal<Disability | null>(null);
  public zoomLevel = signal(1);

  // --- Rejection Dialog Signals ---
  public showDisabilityRejectionDialog = signal(false);
  public disabilityToReject = signal<Disability | null>(null);
  public disabilityRejectionComment = signal('');
  public savingDisabilityComment = signal(false);
  public updatingDisabilityStatus = signal(false);

  // --- Audit Sidebar Signals ---
  public showAuditSidebar = signal(false);
  public auditHistory = signal<TimeoffAuditLog[]>([]);
  public isLoadingAuditHistory = signal(false);
  public expandedAuditItems = signal<Set<string>>(new Set());

  // --- Status Options ---
  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  // --- Computed Stats ---
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

  // --- PDF URL Computeds ---
  public pdfUrl = computed(() => {
    const disability = this.selectedDisability();
    if (!disability?.document_url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    const pdfUrl = `${disability.document_url}#toolbar=1&navpanes=1&scrollbar=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
  });

  public pdfUrlForLink = computed(() => {
    const disability = this.selectedDisability();
    if (!disability?.document_url) {
      return this.sanitizer.bypassSecurityTrustUrl('');
    }
    return this.sanitizer.bypassSecurityTrustUrl(disability.document_url);
  });

  // --- Filtered Disabilities Computed ---
  public filteredDisabilities = computed(() => {
    let disabilities = this.disabilitiesApi.value() || [];

    // Filter by global search text (from parent input)
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

    // Filter by local search text
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

    // Filter by status
    const status = this.selectedStatus();
    if (status) {
      disabilities = disabilities.filter((d) => d.status === status);
    }

    // Filter by date range
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

  // --- Effect: Emit pendingCountChange whenever pendingCount changes ---
  private pendingCountEffect = effect(() => {
    const count = this.pendingCount();
    this.pendingCountChange.emit(count);
  });

  // --- Public Method: reload ---
  public reload(): void {
    this.disabilitiesApi.reload();
  }

  // --- Helper Methods ---

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
      approved: 'Aprobado',
      rejected: 'Rechazado',
      registered: 'Registrado',
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

  public downloadDocument(url: string): void {
    window.open(url, '_blank');
  }

  // --- Filter Methods ---

  public onFilterChange(): void {
    // Filters are applied automatically via computed
  }

  public clearFilters(): void {
    this.searchText.set('');
    this.selectedStatus.set(null);
    this.dateRange.set(null);
  }

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

  // --- Bulk Selection Methods ---

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
      message: `Estas seguro de aprobar ${selected.length} incapacidad(es) seleccionada(s)?`,
      header: 'Confirmar Aprobacion Masiva',
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
          summary: 'Exito',
          detail: `${selected.length} incapacidad(es) aprobada(s) correctamente`,
        });
      },
    });
  }

  public bulkReject(): void {
    const selected = Array.from(this.selectedDisabilities());
    if (selected.length === 0) return;

    this.confirmationService.confirm({
      message: `Estas seguro de rechazar ${selected.length} incapacidad(es) seleccionada(s)?`,
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
          summary: 'Exito',
          detail: `${selected.length} incapacidad(es) rechazada(s) correctamente`,
        });
      },
    });
  }

  // --- Detail View Methods ---

  public viewDetails(disability: Disability): void {
    this.selectedDisability.set(disability);
    this.showDetailsDialog.set(true);
    this.disabilityRejectionComment.set(disability.rejection_comment || '');
    this.loadAuditHistory(disability.id);
  }

  // --- Zoom Controls ---

  public zoomIn(): void {
    const current = this.zoomLevel();
    if (current < 2) {
      this.zoomLevel.set(Math.min(current + 0.25, 2));
    }
  }

  public zoomOut(): void {
    const current = this.zoomLevel();
    if (current > 0.5) {
      this.zoomLevel.set(Math.max(current - 0.25, 0.5));
    }
  }

  public resetZoom(): void {
    this.zoomLevel.set(1);
  }

  // --- Approve/Reject Methods ---

  public approveDisability(disability: Disability): void {
    this.confirmationService.confirm({
      message: `Estas seguro de aprobar la incapacidad de ${disability.employee?.first_name} ${disability.employee?.father_name}?`,
      header: 'Confirmar Aprobacion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.updateDisabilityStatus(disability.id, 'approved');
      },
    });
  }

  public openDisabilityRejectionDialog(disability: Disability): void {
    this.disabilityToReject.set(disability);
    this.disabilityRejectionComment.set('');
    this.showDisabilityRejectionDialog.set(true);
  }

  public confirmDisabilityRejection(): void {
    const comment = this.disabilityRejectionComment().trim();
    const disability = this.disabilityToReject();
    if (!comment || !disability) return;

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

    // Only set reviewed_at if not pending
    if (status !== 'pending') {
      updateData.reviewed_at = new Date().toISOString();
    }

    if (status === 'rejected' && rejectionComment) {
      updateData.rejection_comment = rejectionComment;
    }

    this.http
      .patch(
        this.apiUrl.build('rest/v1/employee_disabilities', {
          id: `eq.${id}`,
        }),
        updateData
      )
      .subscribe({
        next: async () => {
          // Auto-assign disability schedule on approval
          if (status === 'approved') {
            const disability =
              this.disabilitiesApi.value()?.find((d) => d.id === id) ||
              this.selectedDisability();
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
                console.warn(
                  '[DisabilitiesTab] Auto-assign disability schedule failed (non-blocking):',
                  e
                );
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
            summary: 'Exito',
            detail: `Incapacidad ${statusMessages[status]} correctamente`,
          });
          this.disabilitiesApi.reload();
          // Reload selected disability if same
          if (this.selectedDisability()?.id === id) {
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

  // --- Save Rejection Comment ---

  public saveDisabilityRejectionComment(): void {
    const disability = this.selectedDisability();
    if (!disability) return;

    this.savingDisabilityComment.set(true);
    const comment = this.disabilityRejectionComment().trim() || null;

    this.http
      .patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_disabilities?id=eq.${disability.id}`,
        { rejection_comment: comment }
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Exito',
            detail: 'Comentario de rechazo guardado correctamente',
          });
          this.disabilitiesApi.reload();
          // Update local object
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

  // --- Audit Sidebar Methods ---

  public loadAuditHistory(timeoffId: string): void {
    this.isLoadingAuditHistory.set(true);
    this.auditService.getAuditHistory(timeoffId).subscribe({
      next: (history) => {
        this.auditHistory.set(history);
        // Expand all items by default
        const allIds = new Set(history.map((log) => log.id));
        this.expandedAuditItems.set(allIds);
        this.isLoadingAuditHistory.set(false);
      },
      error: (error) => {
        console.error('Error cargando historial de auditoria:', error);
        this.auditHistory.set([]);
        this.isLoadingAuditHistory.set(false);
      },
    });
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

  public getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      created: 'creo la solicitud',
      status_changed: 'cambio el estado',
      approved: 'aprobo la solicitud',
      rejected: 'rechazo la solicitud',
      registered: 'registro la solicitud',
      updated: 'actualizo la solicitud',
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
}
