import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { utils, writeFile } from 'xlsx';
import { Employee, ExportColumn } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { DeviceService } from '../services/device.service';
import { OrganizationService } from '../services/organization.service';
import { WassengerService } from '../services/wassenger.service';
import { DashboardStore } from '../stores/dashboard.store';
import { getEnv } from '../utils/env.utils';
import { EmployeeFormComponent } from './employee-form.component';

@Component({
  selector: 'pt-employee-list',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    Select,
    ToggleSwitch,
    TableModule,
    MenuModule,
    Skeleton,
    Tag,
    FormsModule,
    Button,
    MultiSelectModule,
    NgClass,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputText,
  ],
  providers: [
    DynamicDialogRef,
    DialogService,
    MessageService,
    ConfirmationService,
  ],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="employee-list-page w-full">
    @if (device.isDesktop()) {
    <!-- Vista PC: layout moderno, fácil de usar, sin scroll horizontal -->
    <div class="desktop-employee-list max-w-7xl mx-auto">
      <!-- Barra superior: título + búsqueda + acciones -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-white m-0 tracking-tight">Empleados</h1>
          <p class="text-sm text-gray-400 m-0 mt-0.5">Listado de colaboradores</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="relative flex-1 sm:flex-initial sm:w-72">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            <input
              pInputText
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar por nombre, número o cédula..."
              class="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-neutral-600 bg-neutral-800/80 text-white placeholder-gray-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </span>
          <button
            type="button"
            (click)="filtersExpanded.set(!filtersExpanded())"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-600 bg-neutral-800/80 text-gray-300 hover:bg-neutral-700/80 hover:text-white transition-colors text-sm font-medium"
          >
            <i class="pi pi-filter"></i>
            Filtros
            @if (hasActiveFilters()) {
              <span class="px-1.5 py-0.5 bg-amber-500/25 text-amber-300 text-xs font-semibold rounded-full">{{ getActiveFiltersCount() }}</span>
            }
          </button>
          <p-button icon="pi pi-file-excel" severity="success" [label]="'Exportar'" (onClick)="generateReport()" rounded class="!min-h-[42px]" pTooltip="Exportar a Excel" tooltipPosition="bottom" />
          <p-button label="Nuevo empleado" routerLink="new" icon="pi pi-plus" rounded class="!min-h-[42px]" />
        </div>
      </div>

      <!-- Filtros en una sola fila (colapsable) -->
      @if (filtersExpanded()) {
        <div class="flex flex-wrap items-end gap-4 p-4 rounded-xl border border-neutral-700/50 bg-neutral-800/40 mb-5">
          <div class="min-w-[140px]">
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Sucursal</label>
            <p-multiSelect
              [(ngModel)]="branchFilter"
              [options]="store.branches.entities()"
              placeholder="Todas"
              optionLabel="name"
              appendTo="body"
              class="w-full"
              styleClass="!min-h-[38px]"
            />
          </div>
          <div class="min-w-[140px]">
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Área</label>
            <p-multiSelect
              [(ngModel)]="departmentFilter"
              [options]="store.departments.entities()"
              placeholder="Todas"
              optionLabel="name"
              appendTo="body"
              class="w-full"
              styleClass="!min-h-[38px]"
            />
          </div>
          <div class="min-w-[140px]">
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Cargo</label>
            <p-multiSelect
              [(ngModel)]="positionFilter"
              [options]="store.positions.entities()"
              placeholder="Todos"
              optionLabel="name"
              appendTo="body"
              class="w-full"
              styleClass="!min-h-[38px]"
            />
          </div>
          <div class="min-w-[120px]">
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Género</label>
            <p-select
              [options]="genders"
              [(ngModel)]="genderFilter"
              optionLabel="label"
              optionValue="value"
              placeholder="Todos"
              appendTo="body"
              [showClear]="true"
              class="w-full"
              styleClass="!min-h-[38px]"
            />
          </div>
          <div class="flex items-center gap-2">
            <p-toggleswitch [formControl]="inactiveToggle" inputId="desktop-inactive" />
            <label for="desktop-inactive" class="text-sm text-gray-400 cursor-pointer whitespace-nowrap">Incluir inactivos</label>
          </div>
          @if (hasActiveFilters()) {
            <p-button label="Limpiar" icon="pi pi-times" [outlined]="true" severity="secondary" size="small" (onClick)="clearFilters()" class="!min-h-[38px]" />
          }
        </div>
      }

      <!-- Tabla compacta: solo columnas esenciales para caber sin scroll -->
      <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/40 overflow-hidden">
        <p-table
          #dt
          [value]="this.filtered()"
          [loading]="store.employees.isLoading()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          dataKey="id"
          paginatorDropdownAppendTo="body"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="{totalRecords} empleados"
          styleClass="p-datatable-sm p-datatable-striped desktop-employee-table"
        >
          <ng-template pTemplate="empty">
            <div class="text-center py-16 px-4 text-gray-400">
              <i class="pi pi-users text-5xl mb-4 block opacity-50"></i>
              <p class="text-base font-medium text-white/80">No hay empleados</p>
              <p class="text-sm mt-1">Ajusta la búsqueda o los filtros.</p>
            </div>
          </ng-template>
          <ng-template #header>
            <tr>
              <th pSortableColumn="employee_number" class="desktop-th w-20">Nº<p-sortIcon field="employee_number" /></th>
              <th pSortableColumn="short_name" class="desktop-th text-center">Nombre<p-sortIcon field="short_name" /></th>
              @if (inactiveValue()) {
                <th pSortableColumn="is_active" class="desktop-th w-24">Estado<p-sortIcon field="is_active" /></th>
              }
              <th pSortableColumn="branch.name" class="desktop-th">Sucursal<p-sortIcon field="branch.name" /></th>
              <th pSortableColumn="department.name" class="desktop-th">Área<p-sortIcon field="department.name" /></th>
              <th pSortableColumn="position.name" class="desktop-th">Cargo<p-sortIcon field="position.name" /></th>
              <th pSortableColumn="start_date" class="desktop-th w-28">F. inicio<p-sortIcon field="start_date" /></th>
              <th class="desktop-th w-40 text-right pr-4">Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
            <tr class="desktop-tr desktop-tr-clickable cursor-pointer" (click)="navigateToEmployee(item.id)">
              <td class="font-mono text-xs text-gray-400">{{ getEmployeeDisplayNumber(item) }}</td>
              <td class="text-center">
                <span class="desktop-name-link">
                  {{ item.short_name }}
                  @if (inactiveValue() && !item.is_active) {
                    <span class="ml-1.5 text-[10px] text-red-400 font-medium">Inactivo</span>
                  }
                </span>
              </td>
              @if (inactiveValue()) {
                <td>
                  <p-tag [severity]="item.is_active ? 'success' : 'danger'" [value]="item.is_active ? 'Activo' : 'Inactivo'" styleClass="!text-xs !px-2 !py-0.5" />
                </td>
              }
              <td [class.text-red-400]="!item.branch" class="text-sm">{{ item.branch?.name || '—' }}</td>
              <td class="text-sm">{{ item.department?.name || '—' }}</td>
              <td class="text-sm max-w-[140px] truncate" [pTooltip]="item.position?.name || '—'">{{ item.position?.name || '—' }}</td>
              <td class="text-sm text-gray-300">{{ item.start_date | date : 'd/M/yyyy' }}</td>
              <td class="text-right pr-2" (click)="$event.stopPropagation()">
                <div class="flex gap-0.5 justify-end">
                  <p-button icon="pi pi-eye" [routerLink]="item.id" rounded [text]="true" size="small" pTooltip="Ver" class="!min-w-[36px] !min-h-[36px]" />
                  <p-button icon="pi pi-pencil" [routerLink]="[item.id, 'edit']" rounded [text]="true" severity="success" size="small" pTooltip="Editar" class="!min-w-[36px] !min-h-[36px]" />
                  @if (!item.has_portal_access) {
                    <p-button icon="pi pi-user-plus" (click)="inviteToPortal(item)" rounded [text]="true" severity="info" size="small" pTooltip="Invitar al portal" [loading]="invitingEmployeeId() === item.id" class="!min-w-[36px] !min-h-[36px]" />
                  } @else {
                    <span class="inline-flex items-center text-[10px] text-green-400 px-1.5" title="Portal activo"><i class="pi pi-check-circle mr-0.5"></i>Portal</span>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #loadingbody>
            @for (i of [1,2,3,4,5]; track i) {
              <tr class="desktop-tr">
                <td colspan="8"><p-skeleton width="100%" height="2.5rem" /></td>
              </tr>
            }
          </ng-template>
        </p-table>
      </div>
    </div>
    } @else {
    <!-- Vista móvil: lista de empleados en cards -->
    <div class="mobile-employee-list flex flex-col min-h-[60vh]">
      <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="m-0 text-lg font-bold text-white truncate">Empleados</h2>
          <div class="flex gap-1 flex-shrink-0">
            <p-button icon="pi pi-plus" [label]="''" routerLink="new" rounded size="small" pTooltip="Nuevo" tooltipPosition="bottom" />
            <p-button icon="pi pi-file-excel" [label]="''" severity="success" (onClick)="generateReport()" rounded size="small" pTooltip="Exportar" tooltipPosition="bottom" />
          </div>
        </div>
        <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar por nombre, número o cédula..." class="w-full text-sm rounded-lg border-neutral-600 bg-neutral-900/80 px-3 py-2.5 text-white placeholder-gray-500" />
        <button type="button" (click)="filtersExpanded.set(!filtersExpanded())" class="w-full mt-2 flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-700/50 border border-neutral-600 text-left text-sm text-gray-300">
          <span><i class="pi pi-filter text-amber-400 mr-2"></i>Filtros @if (hasActiveFilters()) { <span class="text-amber-400 text-xs">({{ getActiveFiltersCount() }})</span> }</span>
          <i [class]="filtersExpanded() ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
        </button>
        @if (filtersExpanded()) {
          <div class="mt-2 p-3 rounded-lg bg-neutral-800/80 border border-neutral-700/50 space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Sucursal</label>
              <p-multiSelect [(ngModel)]="branchFilter" [options]="store.branches.entities()" placeholder="Todas" optionLabel="name" appendTo="body" class="w-full" styleClass="w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Área</label>
              <p-multiSelect [(ngModel)]="departmentFilter" [options]="store.departments.entities()" placeholder="Todas" optionLabel="name" appendTo="body" class="w-full" styleClass="w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Cargo</label>
              <p-multiSelect [(ngModel)]="positionFilter" [options]="store.positions.entities()" placeholder="Todos" optionLabel="name" appendTo="body" class="w-full" styleClass="w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Género</label>
              <p-select [options]="genders" [(ngModel)]="genderFilter" optionLabel="label" optionValue="value" placeholder="Todos" appendTo="body" [showClear]="true" class="w-full" styleClass="w-full" />
            </div>
            <div class="flex items-center gap-2 pt-1">
              <p-toggleswitch [formControl]="inactiveToggle" inputId="mobile-inactive" />
              <label for="mobile-inactive" class="text-sm text-gray-400">Incluir inactivos</label>
            </div>
            <p-button label="Limpiar filtros" icon="pi pi-filter-slash" [outlined]="true" severity="secondary" size="small" (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" class="w-full" />
          </div>
        }
      </header>

      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (store.employees.isLoading()) {
          <div class="flex justify-center py-12"><p-skeleton width="100%" height="4rem" class="mb-2" /></div>
          <p-skeleton width="100%" height="4rem" class="mb-2" />
          <p-skeleton width="100%" height="4rem" />
        } @else if (filtered().length === 0) {
          <div class="text-center py-12 text-gray-400">
            <i class="pi pi-inbox text-4xl block mb-2 opacity-60"></i>
            <p class="text-sm font-medium">No hay empleados</p>
            <p class="text-xs mt-1">Ajusta filtros o búsqueda</p>
          </div>
        } @else {
          <div class="flex flex-col gap-1.5 pb-4">
            @for (item of filtered(); track item.id) {
              <div (click)="navigateToEmployee(item.id)" class="block rounded-lg border border-neutral-700/50 bg-neutral-800/80 p-2.5 active:bg-neutral-700/50 transition-colors cursor-pointer">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-[11px] font-mono text-gray-500">{{ getEmployeeDisplayNumber(item) }}</span>
                      @if (inactiveValue() && !item.is_active) {
                        <p-tag value="INACTIVO" severity="danger" [rounded]="true" styleClass="text-[10px] py-0" />
                      }
                    </div>
                    <p class="font-semibold text-white text-sm leading-tight m-0 mt-0.5 truncate">{{ item.short_name }}</p>
                    <p class="text-[11px] text-gray-400 leading-tight m-0 mt-0.5 truncate">{{ item.branch?.name || 'Sin sucursal' }} · {{ item.position?.name || 'Sin cargo' }}@if (item.department?.name) { · {{ item.department?.name }} }</p>
                  </div>
                  <i class="pi pi-chevron-right text-gray-500 flex-shrink-0 text-sm"></i>
                </div>
                <div class="flex gap-1.5 mt-1.5 flex-wrap" (click)="$event.stopPropagation()">
                  <p-button icon="pi pi-eye" [label]="''" [routerLink]="item.id" rounded text size="small" class="min-w-[32px] min-h-[32px]" pTooltip="Ver" tooltipPosition="top" />
                  <p-button icon="pi pi-pen" [label]="''" [routerLink]="[item.id, 'edit']" rounded text severity="success" size="small" class="min-w-[32px] min-h-[32px]" pTooltip="Editar" tooltipPosition="top" />
                  @if (!item.has_portal_access) {
                    <p-button icon="pi pi-user-plus" [label]="''" (click)="inviteToPortal(item)" rounded text severity="info" size="small" [loading]="invitingEmployeeId() === item.id" class="min-w-[32px] min-h-[32px]" pTooltip="Invitar al portal" tooltipPosition="top" />
                  } @else {
                    <p-tag value="Portal" severity="success" icon="pi pi-check" styleClass="text-[10px] py-0" />
                  }
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>
    }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    /* Vista PC: listado moderno */
    :host ::ng-deep .desktop-employee-list .desktop-employee-table.p-datatable {
      background: transparent !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-thead > tr > th.desktop-th {
      padding: 0.75rem 1rem !important;
      font-size: 0.6875rem !important;
      font-weight: 600 !important;
      letter-spacing: 0.05em !important;
      text-transform: uppercase !important;
      color: #9ca3af !important;
      background: rgba(31, 41, 55, 0.8) !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.5) !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-tbody > tr.desktop-tr > td {
      padding: 0.75rem 1rem !important;
      font-size: 0.875rem !important;
      color: #e5e7eb !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.25) !important;
      vertical-align: middle !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-tbody > tr.desktop-tr:hover > td {
      background: rgba(55, 65, 81, 0.35) !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-tbody > tr.desktop-tr:nth-child(even) > td {
      background: rgba(31, 41, 55, 0.3) !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-tbody > tr.desktop-tr:nth-child(even):hover > td {
      background: rgba(55, 65, 81, 0.35) !important;
    }
    :host .desktop-name-link {
      color: #fbbf24;
      font-weight: 600;
      transition: color 0.15s ease;
    }
    :host .desktop-tr-clickable:hover .desktop-name-link {
      color: #fcd34d;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-thead > tr > th.desktop-th.text-center,
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-datatable-tbody > tr > td.text-center {
      text-align: center !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-paginator {
      background: rgba(31, 41, 55, 0.6) !important;
      border-top: 1px solid rgba(75, 85, 99, 0.5) !important;
      padding: 0.5rem 1rem !important;
    }
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-paginator .p-paginator-current,
    :host ::ng-deep .desktop-employee-list .desktop-employee-table .p-paginator button {
      color: #9ca3af !important;
    }

    /* Card integrada al tema del admin (mismo fondo y borde que el resto) - solo móvil/legacy */
    :host ::ng-deep .employee-list-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .employee-list-card .p-card-body {
      background: transparent !important;
    }
    :host ::ng-deep .employee-list-card .p-card-title {
      color: #f3f4f6 !important;
    }
    :host ::ng-deep .employee-list-card .p-card-subtitle {
      color: #9ca3af !important;
    }

    /* En pantallas pequeñas ocultar columna "Creado" para que la tabla quepa mejor */
    @media (max-width: 992px) {
      :host ::ng-deep .hide-sm {
        display: none !important;
      }
    }

    /* Columna Sexo: ancho mínimo para que no se trunque Femenino/Masculino */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.col-gender,
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td.col-gender {
      min-width: 7rem !important;
      white-space: nowrap !important;
    }
    /* Contenedor tabla con scroll horizontal suave */
    .employee-table-wrap {
      border-radius: 0.75rem;
      min-height: 320px;
    }
    @media (max-width: 992px) {
      .employee-table-wrap {
        -webkit-overflow-scrolling: touch;
        box-shadow: inset -12px 0 12px -8px rgba(0, 0, 0, 0.25);
      }
    }

    /* Estilos modernos para la tabla */
    :host ::ng-deep .p-datatable.employee-list-table {
      border-radius: 0.75rem !important;
      overflow: hidden !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      background: #1f2937 !important;
    }

    :host ::ng-deep .p-datatable-table {
      border-collapse: separate !important;
      border-spacing: 0 !important;
    }

    /* Filas alternadas (striped) */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:nth-child(even) > td {
      background: rgba(31, 41, 55, 0.95) !important;
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:nth-child(odd) > td {
      background: rgba(17, 24, 39, 0.98) !important;
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover > td {
      background: rgba(55, 65, 81, 0.7) !important;
    }

    /* Estilos para mantener dimensiones uniformes y consistentes */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.875rem 1rem !important;
      vertical-align: middle !important;
      line-height: 1.5 !important;
      height: 3.5rem !important;
      min-height: 3.5rem !important;
      max-height: 3.5rem !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      text-align: center !important;
      color: #e5e7eb !important;
      border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
      font-size: 0.875rem !important;
      transition: all 0.2s ease !important;
    }


    :host ::ng-deep .p-datatable .p-datatable-tbody > tr {
      height: auto !important;
      min-height: 3.5rem !important;
      box-sizing: border-box !important;
      transition: all 0.2s ease !important;
    }

    /* Efecto hover suave (sin transform para evitar saltos) */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: transparent !important;
    }

    /* Columna Cargo - texto truncado con ellipsis */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td.position-cell {
      max-width: 150px !important;
      width: 150px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      padding: 0.875rem 1rem !important;
      vertical-align: middle !important;
      text-align: center !important;
    }

    /* Centrar elementos dentro de las celdas */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td > .flex {
      align-items: center !important;
      white-space: normal !important;
    }

    /* Última columna - iconos horizontalmente, sin flex-wrap */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:last-child {
      white-space: nowrap !important;
      overflow: visible !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:last-child > .flex {
      flex-wrap: nowrap !important;
      white-space: nowrap !important;
    }

    /* Header uniforme */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      padding: 0.75rem !important;
      vertical-align: middle !important;
      box-sizing: border-box !important;
      height: auto !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      text-align: center !important;
    }

    /* Cabecera fija al hacer scroll y títulos de columnas */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      font-weight: 600 !important;
      font-size: 0.8125rem !important;
      letter-spacing: 0.025em !important;
      color: #f9fafb !important;
      text-transform: uppercase !important;
      background: linear-gradient(135deg, #374151 0%, #1f2937 100%) !important;
      border-bottom: 2px solid rgba(107, 114, 128, 0.3) !important;
      padding: 0.875rem 1rem !important;
      position: relative !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) inset !important;
    }
    :host ::ng-deep .p-datatable-scrollable .p-datatable-thead > tr > th {
      position: sticky !important;
      top: 0 !important;
      z-index: 2 !important;
      background: linear-gradient(135deg, #374151 0%, #1f2937 100%) !important;
      box-shadow: 0 2px 0 rgba(107, 114, 128, 0.3) !important;
    }

    /* Títulos de columnas ordenables */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column {
      color: #f9fafb !important;
      cursor: pointer !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      background: linear-gradient(135deg, #374151 0%, #1f2937 100%) !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column:hover {
      background: linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, rgba(107, 114, 128, 0.05) 100%) !important;
      color: #d1d5db !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    }

    /* Estilos de columnas ordenables */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column {
      cursor: pointer !important;
      user-select: none !important;
      transition: background-color 0.2s ease !important;
      position: relative !important;
    }

    /* Espaciado entre texto e icono */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column .p-sortable-column-icon {
      margin-left: 0.25rem !important;
    }

    /* Columna ordenada activa: acento ámbar */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-highlight,
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-datatable-column-sorted {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.05) 100%) !important;
      color: #fcd34d !important;
      border-bottom-color: rgba(251, 191, 36, 0.5) !important;
    }

    /* Animación de iconos de ordenamiento */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column .p-sortable-column-icon {
      transition: transform 0.2s ease, opacity 0.2s ease !important;
      opacity: 0.5 !important;
      display: inline-block !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-highlight .p-sortable-column-icon {
      opacity: 1 !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-highlight[aria-sort="ascending"] .p-sortable-column-icon {
      transform: rotate(0deg) !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-highlight[aria-sort="descending"] .p-sortable-column-icon {
      transform: rotate(180deg) !important;
    }

    /* Enlaces nombre: ámbar acorde al tema, sin azul */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a.employee-name-link,
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
      text-align: center !important;
      margin: 0 auto;
      color: #fbbf24 !important;
      font-weight: 600 !important;
      transition: color 0.2s ease, text-decoration 0.2s ease !important;
      text-decoration: none !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a.employee-name-link:hover,
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a:hover {
      color: #fcd34d !important;
      text-decoration: underline !important;
    }

    /* Alineación: número centrado, nombre a la izquierda */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.col-number,
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:first-child {
      text-align: center !important;
    }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.col-name,
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:nth-child(2) {
      text-align: left !important;
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:nth-child(2) a {
      margin: 0;
    }

    /* Mejoras adicionales para modernizar la tabla */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:first-child {
      font-weight: 600 !important;
      color: #9ca3af !important;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
      font-size: 0.8125rem !important;
    }

    /* Tags modernos */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td p-tag {
      border-radius: 0.5rem !important;
      font-weight: 500 !important;
      font-size: 0.75rem !important;
      padding: 0.25rem 0.625rem !important;
    }

    /* Scrollbar moderno */
    :host ::ng-deep .p-datatable .p-datatable-scrollable-body::-webkit-scrollbar {
      width: 8px !important;
      height: 8px !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-scrollable-body::-webkit-scrollbar-track {
      background: #1f2937 !important;
      border-radius: 4px !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-scrollable-body::-webkit-scrollbar-thumb {
      background: #4b5563 !important;
      border-radius: 4px !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-scrollable-body::-webkit-scrollbar-thumb:hover {
      background: #6b7280 !important;
    }

    /* Mejorar contraste de texto en celdas */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      color: #d1d5db !important;
    }

    /* Estilo para texto en rojo (sin sucursal) */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td.text-red-600 {
      color: #f87171 !important;
      font-weight: 500 !important;
    }

    /* Vista móvil: cards */
    .mobile-employee-list a.no-underline {
      text-decoration: none;
      color: inherit;
    }
    :host ::ng-deep .mobile-employee-list .p-button {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeListComponent implements OnInit {
  readonly store = inject(DashboardStore);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private wassengerService = inject(WassengerService);
  private organizationService = inject(OrganizationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected device = inject(DeviceService);

  public invitingEmployeeId = signal<string | null>(null);

  navigateToEmployee(id: string): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  public inactiveToggle = new FormControl(false, { nonNullable: true });
  public probatories = [
    { label: 'Probatorio', value: true },
    { label: 'Regular', value: false },
  ];
  public genders = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
  ];

  public inactiveValue = toSignal(this.inactiveToggle.valueChanges, {
    initialValue: false,
  });
  public exportColumns!: ExportColumn[];

  public searchTerm = model<string>('');
  public filtersExpanded = signal(false);
  public branchFilter = signal<any[]>([]);
  public departmentFilter = signal<any[]>([]);
  public positionFilter = signal<any[]>([]);
  public genderFilter = signal<string | null>(null);

  public hasActiveFilters = computed(() => {
    return (
      this.branchFilter().length > 0 ||
      this.departmentFilter().length > 0 ||
      this.positionFilter().length > 0 ||
      this.genderFilter() !== null
    );
  });

  public getActiveFiltersCount = computed(() => {
    let count = 0;
    if (this.branchFilter().length > 0) count++;
    if (this.departmentFilter().length > 0) count++;
    if (this.positionFilter().length > 0) count++;
    if (this.genderFilter() !== null) count++;
    return count;
  });

  public clearFilters(): void {
    this.branchFilter.set([]);
    this.departmentFilter.set([]);
    this.positionFilter.set([]);
    this.genderFilter.set(null);
  }

  public filtered = computed(() => {
    const employees = this.store.employees.employeesList().filter(
      (item) =>
        // Si el toggle está activado, mostrar todos (activos e inactivos)
        // Si está desactivado, mostrar solo activos
        this.inactiveValue() || item.is_active === true
    );

    const search = this.searchTerm()?.toLowerCase().trim() || '';

    // Aplicar filtro de búsqueda
    let filtered = employees;
    if (search) {
      filtered = employees.filter((emp) => {
        // Buscar por número de empleado
        const employeeNumber = this.getEmployeeDisplayNumber(emp).toLowerCase();
        if (employeeNumber.includes(search)) {
          return true;
        }

        // Buscar por nombre completo
        const fullName = `${emp.first_name || ''} ${emp.father_name || ''}`
          .toLowerCase()
          .trim();
        const firstName = (emp.first_name || '').toLowerCase();
        const fatherName = (emp.father_name || '').toLowerCase();
        if (
          fullName.includes(search) ||
          firstName.includes(search) ||
          fatherName.includes(search)
        ) {
          return true;
        }

        // Buscar por cédula
        const documentId = (emp.document_id || '').toLowerCase();
        if (documentId.includes(search)) {
          return true;
        }

        return false;
      });
    }

    // Aplicar filtros de sucursal
    const branchFilterIds = this.branchFilter().map((b) => b.id);
    if (branchFilterIds.length > 0) {
      filtered = filtered.filter(
        (emp) => emp.branch_id && branchFilterIds.includes(emp.branch_id)
      );
    }

    // Aplicar filtros de área
    const departmentFilterIds = this.departmentFilter().map((d) => d.id);
    if (departmentFilterIds.length > 0) {
      filtered = filtered.filter(
        (emp) =>
          emp.department_id && departmentFilterIds.includes(emp.department_id)
      );
    }

    // Aplicar filtros de cargo
    const positionFilterIds = this.positionFilter().map((p) => p.id);
    if (positionFilterIds.length > 0) {
      filtered = filtered.filter(
        (emp) => emp.position_id && positionFilterIds.includes(emp.position_id)
      );
    }

    // Aplicar filtro de género
    const gender = this.genderFilter();
    if (gender !== null) {
      filtered = filtered.filter((emp) => emp.gender === gender);
    }

    return filtered;
  });

  public itemsToReports = computed(() =>
    this.filtered().map((item) => ({
      Nombre: item.first_name + ' ' + item.father_name,
      Status: item.is_active ? 'ACTIVO' : 'INACTIVO',
      Cedula: item.document_id,
      Sucursal: item.branch?.name,
      Area: item.department?.name,
      Cargo: item.position?.name,
      Salario: item.monthly_salary,
      Talla: item.uniform_size,
      'Fecha de inicio': item.start_date,
      Probatorio: item.probatory ? 'PROBATORIO' : 'NORMAL',
      'Fecha de nacimiento': item.birth_date,
      Sexo: item.gender,
      Creado: item.created_at,
    }))
  );
  private dialog = inject(DialogService);
  private ref = inject(DynamicDialogRef);

  ngOnInit(): void {
    this.store.employees.clearSelectedEntity();
    this.store.employees.fetchItems();
    // Cargar posiciones, branches y departments para los filtros
    this.store.positions.fetchItems();
    this.store.branches.fetchItems();
    this.store.departments.fetchItems();
  }

  editEmployee(employee?: Employee) {
    this.ref = this.dialog.open(EmployeeFormComponent, {
      header: 'Datos de empleado',
      width: '90vw',
      data: { employee },
    });
  }

  public formatLunchExceeded(minutes: number): string {
    if (minutes === 0) {
      return '0';
    }
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  public getEmployeeDisplayNumber(employee: Employee): string {
    // Si el empleado ya tiene employee_number en formato BD0001, usarlo
    if (
      employee.employee_number &&
      /^[A-Z]{2}\d{4}$/.test(employee.employee_number)
    ) {
      return employee.employee_number;
    }

    // Si no tiene employee_number, mostrar solo los primeros 8 caracteres del ID como fallback
    // El formato BD0001 debe asignarse desde la base de datos o al crear el empleado
    return employee.id.substring(0, 8);
  }

  generateReport() {
    const ws = utils.json_to_sheet(this.itemsToReports());
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Empleados');
    writeFile(wb, 'REPORTE_EMPLEADOS.xlsx');
  }

  async inviteToPortal(employee: Employee) {
    if (!employee.work_email || !employee.phone_number) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail:
          'El empleado debe tener email laboral y teléfono para ser invitado al portal',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Deseas invitar a ${employee.first_name} ${employee.father_name} al portal de empleados? Se enviará un mensaje por Wassenger con las instrucciones de acceso.`,
      header: 'Invitar al Portal',
      icon: 'pi pi-user-plus',
      acceptLabel: 'Sí, invitar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.invitingEmployeeId.set(employee.id);
        try {
          // Actualizar el empleado para darle acceso al portal
          const companyId = this.organizationService.getCurrentCompanyId();
          const params: any = { id: `eq.${employee.id}` };

          // Agregar filtro por company_id para seguridad
          if (companyId) {
            params.company_id = `eq.${companyId}`;
          }

          const url = this.apiUrl.build('rest/v1/employees', params);
          const updateResponse = await firstValueFrom(
            this.http.patch(
              url,
              { has_portal_access: true },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation',
                },
              }
            )
          );

          // Enviar invitación por Wassenger
          const portalUrl = `${getEnv('ENV_APP_URL')}/my-portal`;
          const employeeName = `${employee.first_name} ${employee.father_name}`;
          const success = await this.wassengerService.sendPortalInvitation(
            employeeName,
            employee.phone_number,
            employee.work_email,
            portalUrl
          );

          if (success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Invitación enviada',
              detail: `${employeeName} ahora tiene acceso al portal y se le ha enviado un mensaje por Wassenger`,
            });
            this.store.employees.reloadItems();
          } else {
            // Aunque falló el envío, el acceso al portal ya fue otorgado
            this.messageService.add({
              severity: 'warn',
              summary: 'Acceso otorgado',
              detail: `${employeeName} ahora tiene acceso al portal, pero no se pudo enviar el mensaje por Wassenger`,
            });
            this.store.employees.reloadItems();
          }
        } catch (error: any) {
          console.error('Error inviting to portal:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo invitar al empleado al portal',
          });
        } finally {
          this.invitingEmployeeId.set(null);
        }
      },
    });
  }
}
