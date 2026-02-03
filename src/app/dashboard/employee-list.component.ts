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
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
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
import { AgePipe } from '../pipes/age.pipe';
import { ApiUrlService } from '../services/api-url.service';
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
    AgePipe,
    CurrencyPipe,
    Select,
    ToggleSwitch,
    TableModule,
    MenuModule,
    Card,
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
    <p-card styleClass="employee-list-card">
      <ng-template #title>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3"
        >
          <div>
            <h2 class="m-0 text-lg sm:text-xl">Empleados</h2>
            <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">
              Listado de colaboradores de la empresa
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <p-button
              icon="pi pi-file-excel"
              severity="success"
              [label]="'XLS'"
              (onClick)="generateReport()"
              rounded
              class="min-h-[44px]"
            />
            <p-button
              icon="pi pi-file-pdf"
              severity="warn"
              [label]="'PDF'"
              (onClick)="generateReport()"
              rounded
              class="min-h-[44px]"
            />
            <p-button
              label="Nuevo"
              routerLink="new"
              icon="pi pi-plus-circle"
              rounded
              class="min-h-[44px]"
            />
          </div>
        </div>
      </ng-template>
      <!-- Panel de Filtros Colapsable -->
      <div
        class="mb-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden"
      >
        <!-- Header del panel de filtros -->
        <button
          type="button"
          (click)="filtersExpanded.set(!filtersExpanded())"
          class="w-full flex items-center justify-between p-4 hover:bg-neutral-700/30 transition-colors"
        >
          <div class="flex items-center gap-3">
            <i class="pi pi-filter text-yellow-400"></i>
            <span class="text-lg font-semibold text-white">Filtros</span>
            @if (hasActiveFilters()) {
            <span
              class="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full"
            >
              {{ getActiveFiltersCount() }} activo(s)
            </span>
            }
          </div>
          <i
            class="pi transition-transform duration-300"
            [class.pi-chevron-down]="!filtersExpanded()"
            [class.pi-chevron-up]="filtersExpanded()"
            [class.text-gray-400]="true"
          ></i>
        </button>

        <!-- Contenido desplegable -->
        @if (filtersExpanded()) {
        <div class="px-4 pb-4 border-t border-neutral-700/50 pt-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Filtro por Sucursal -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                <i class="pi pi-building mr-2"></i>Sucursal
              </label>
              <p-multiSelect
                [(ngModel)]="branchFilter"
                [options]="store.branches.entities()"
                placeholder="TODAS"
                optionLabel="name"
                appendTo="body"
                class="w-full"
              />
            </div>

            <!-- Filtro por Área -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                <i class="pi pi-sitemap mr-2"></i>Área
              </label>
              <p-multiSelect
                [(ngModel)]="departmentFilter"
                [options]="store.departments.entities()"
                placeholder="TODAS"
                optionLabel="name"
                appendTo="body"
                class="w-full"
              />
            </div>

            <!-- Filtro por Cargo -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                <i class="pi pi-briefcase mr-2"></i>Cargo
              </label>
              <p-multiSelect
                [(ngModel)]="positionFilter"
                [options]="store.positions.entities()"
                placeholder="TODOS"
                optionLabel="name"
                appendTo="body"
                class="w-full"
              />
            </div>

            <!-- Filtro por Género -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                <i class="pi pi-users mr-2"></i>Género
              </label>
              <p-select
                [options]="genders"
                [(ngModel)]="genderFilter"
                optionLabel="label"
                optionValue="value"
                placeholder="Todos"
                appendTo="body"
                [showClear]="true"
                class="w-full"
              >
                <ng-template let-option #item>
                  <div class="flex items-center gap-2">
                    <i
                      [ngClass]="
                        option.value === 'M' ? 'pi pi-mars' : 'pi pi-venus'
                      "
                    ></i>
                    {{ option.label }}
                  </div>
                </ng-template>
              </p-select>
            </div>

            <!-- Filtro Incluir Inactivos -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                <i class="pi pi-toggle-on mr-2"></i>Estado
              </label>
              <div class="flex items-center gap-2">
                <p-toggleswitch
                  [formControl]="inactiveToggle"
                  inputId="active"
                />
                <label for="active" class="text-sm text-gray-300 cursor-pointer"
                  >Incluir inactivos</label
                >
              </div>
            </div>
          </div>
        </div>
        }
      </div>

      <div class="employee-table-wrap overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          #dt
          [value]="this.filtered()"
          [loading]="store.employees.isLoading()"
          [paginator]="true"
          [rows]="20"
          [rowsPerPageOptions]="[10, 20, 50, 100]"
          [scrollable]="true"
          dataKey="id"
          paginatorDropdownAppendTo="body"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} empleados"
          styleClass="p-datatable-sm p-datatable-striped employee-list-table min-w-full"
        >
          <ng-template pTemplate="empty">
            <div class="text-center py-12 px-4 text-gray-400">
              <i class="pi pi-inbox text-5xl mb-4 block opacity-60"></i>
              <p class="text-base font-medium">No se encontraron empleados</p>
              <p class="text-sm mt-1">Prueba a cambiar los filtros o el texto de búsqueda.</p>
            </div>
          </ng-template>
          <ng-template #caption>
            <div class="flex flex-col sm:flex-row gap-3 items-center mb-3">
              <input
                pInputText
                type="text"
                [(ngModel)]="searchTerm"
                placeholder="Buscar por número, nombre o cédula..."
                class="w-full sm:max-w-sm flex-1 text-sm rounded-lg border-neutral-600 bg-neutral-800/80 px-3 py-2"
              />
            </div>
          </ng-template>
          <ng-template #header>
            <tr class="employee-table-header-row">
              <th pSortableColumn="employee_number" class="col-number">Número<p-sortIcon field="employee_number" /></th>
              <th pSortableColumn="short_name" class="col-name">Nombre<p-sortIcon field="short_name" /></th>
              @if (inactiveValue()) {
              <th pSortableColumn="is_active" class="col-status">Estado<p-sortIcon field="is_active" /></th>
              }
              <th pSortableColumn="document_id" class="col-doc">Cédula<p-sortIcon field="document_id" /></th>
              <th pSortableColumn="branch.name" class="col-branch">Sucursal<p-sortIcon field="branch.name" /></th>
              <th pSortableColumn="department.name" class="col-area">Área<p-sortIcon field="department.name" /></th>
              <th class="col-position" style="width: 150px; max-width: 150px; min-width: 120px;" pSortableColumn="position.name">Cargo<p-sortIcon field="position.name" /></th>
              <th pSortableColumn="monthly_salary" class="col-salary">Salario<p-sortIcon field="monthly_salary" /></th>
              <th pSortableColumn="uniform_size" class="col-size">Talla<p-sortIcon field="uniform_size" /></th>
              <th pSortableColumn="start_date" class="col-date">F. inicio<p-sortIcon field="start_date" /></th>
              <th pSortableColumn="birth_date" class="col-birth">F. nacimiento<p-sortIcon field="birth_date" /></th>
              <th pSortableColumn="gender" class="col-gender">Sexo<p-sortIcon field="gender" /></th>
              <th pSortableColumn="created_at" class="col-created hide-sm">Creado<p-sortIcon field="created_at" /></th>
              <th class="col-actions">Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-item let-columns="columns">
            <tr>
              <td>{{ getEmployeeDisplayNumber(item) }}</td>
              <td>
                <a
                  [routerLink]="item.id"
                  class="text-primary-700 font-semibold hover:underline"
                  >{{ item.short_name }}</a
                >
              </td>
              @if (inactiveValue()) {
              <td>
                <p-tag
                  [severity]="item.is_active ? 'success' : 'danger'"
                  [value]="item.is_active ? 'ACTIVO' : 'INACTIVO'"
                />
              </td>

              }
              <td>{{ item.document_id }}</td>
              <td [class.text-red-600]="!item.branch">
                {{ item.branch?.name || 'SIN SUCURSAL' }}
              </td>
              <td>{{ item.department?.name || 'SIN AREA' }}</td>
              <td
                class="position-cell"
                [pTooltip]="item.position?.name || 'SIN CARGO'"
              >
                {{ item.position?.name || 'SIN CARGO' }}
              </td>
              <td>{{ item.monthly_salary | currency : '$' }}</td>
              <td>{{ item.uniform_size }}</td>
              <td>{{ item.start_date | date : 'mediumDate' }}</td>
              <td>
                {{ item.birth_date | date : 'mediumDate' }} ({{
                  item.birth_date | age
                }})
              </td>
              <td class="col-gender">
                <span class="flex items-center gap-2 justify-center min-w-[7rem]">
                  <i
                    [ngClass]="
                      item.gender === 'M'
                        ? 'pi pi-mars text-sky-600 dark:text-sky-400'
                        : 'pi pi-venus text-pink-600 dark:text-pink-400'
                    "
                  ></i>
                  {{ item.gender === 'M' ? 'Masculino' : 'Femenino' }}
                </span>
              </td>
              <td class="col-created hide-sm">{{ item.created_at | date : 'medium' }}</td>
              <td>
                <div class="flex gap-1 sm:gap-2 flex-nowrap">
                  <p-button
                    icon="pi pi-info-circle"
                    [routerLink]="item.id"
                    rounded
                    text
                    pTooltip="Ver detalles"
                    class="min-w-[44px] min-h-[44px]"
                  />
                  <p-button
                    icon="pi pi-pen-to-square"
                    [routerLink]="[item.id, 'edit']"
                    rounded
                    text
                    severity="success"
                    pTooltip="Editar"
                    class="min-w-[44px] min-h-[44px]"
                  />
                  @if (!item.has_portal_access) {
                  <p-button
                    icon="pi pi-user-plus"
                    (click)="inviteToPortal(item)"
                    rounded
                    text
                    severity="info"
                    pTooltip="Invitar al Portal"
                    [loading]="invitingEmployeeId() === item.id"
                    class="min-w-[44px] min-h-[44px]"
                  />
                  } @else {
                  <p-tag
                    value="Portal Activo"
                    severity="success"
                    icon="pi pi-check-circle"
                    class="text-xs"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #loadingbody>
            <tr style="height: 5rem">
              @for (col of dt.columns; track $index) {
              <td [attr.colspan]="col">
                <p-skeleton shape="circle" size="5rem" class="mx-auto" />
              </td>
              }
            </tr>
          </ng-template>
        </p-table>
      </div>
    </p-card>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    /* Card integrada al tema del admin (mismo fondo y borde que el resto) */
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

    /* Columna ordenada activa */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-highlight,
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-datatable-column-sorted {
      background: linear-gradient(135deg, rgba(107, 114, 128, 0.2) 0%, rgba(107, 114, 128, 0.1) 100%) !important;
      color: #d1d5db !important;
      border-bottom-color: rgba(107, 114, 128, 0.5) !important;
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

    /* Enlaces modernos con ellipsis */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
      text-align: center !important;
      margin: 0 auto;
      color: #60a5fa !important;
      font-weight: 500 !important;
      transition: all 0.2s ease !important;
      text-decoration: none !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a:hover {
      color: #3b82f6 !important;
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

  public invitingEmployeeId = signal<string | null>(null);

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
