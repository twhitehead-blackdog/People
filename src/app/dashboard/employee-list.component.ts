import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ConfirmationService,
  FilterService,
  MessageService,
} from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { utils, writeFile } from 'xlsx';
import { Column, Employee, ExportColumn } from '../models';
import { AgePipe } from '../pipes/age.pipe';
import { OrganizationService } from '../services/organization.service';
import { WassengerService } from '../services/wassenger.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeeFormComponent } from './employee-form.component';
import { getEmployeeNumberPrefix } from '../utils/employee-number.utils';

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
    <p-card>
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
      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <p-table
          #dt
          [value]="this.filtered()"
          [loading]="store.employees.isLoading()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[5, 10, 20]"
          [scrollable]="true"
          dataKey="id"
          paginatorDropdownAppendTo="body"
          [showCurrentPageReport]="false"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} empleados"
          styleClass="min-w-full"
        >
          <ng-template #caption>
            <div class="flex gap-2 items-center">
              <p-toggleswitch [formControl]="inactiveToggle" inputId="active" />
              <label for="active">Incluir inactivos</label>
            </div>
          </ng-template>
          <ng-template #header>
            <tr>
              <th>
                <p-columnFilter
                  type="text"
                  field="employee_number"
                  placeholder="Número"
                  ariaLabel="Filter Number"
                  matchMode="contains"
                  [showMenu]="false"
                  [showApplyButton]="false"
                  [showClearButton]="true"
                />
              </th>
              <th>
                <p-columnFilter
                  type="text"
                  field="short_name"
                  placeholder="Buscar por nombre"
                  ariaLabel="Filter Name"
                  matchMode="contains"
                  [showMenu]="false"
                  [showApplyButton]="false"
                  [showClearButton]="true"
                />
              </th>
              @if (inactiveValue()) {
              <th></th>
              }
              <th>
                <p-columnFilter
                  type="text"
                  field="document_id"
                  placeholder="Buscar por Cédula"
                  ariaLabel="Filter Document"
                  matchMode="contains"
                  [showMenu]="false"
                  [showApplyButton]="false"
                  [showClearButton]="true"
                />
              </th>
              <th>
                <p-columnFilter
                  field="branch"
                  matchMode="custom-filter"
                  [showMenu]="false"
                >
                  <ng-template
                    pTemplate="filter"
                    let-value
                    let-filter="filterCallback"
                  >
                    <p-multiSelect
                      [ngModel]="value"
                      [options]="store.branches.entities()"
                      placeholder="TODOS"
                      (onChange)="filter($event.value)"
                      optionLabel="name"
                      appendTo="body"
                    />
                  </ng-template>
                </p-columnFilter>
              </th>
              <th>
                <p-columnFilter
                  field="department"
                  matchMode="custom-filter"
                  [showMenu]="false"
                >
                  <ng-template
                    pTemplate="filter"
                    let-value
                    let-filter="filterCallback"
                  >
                    <p-multiSelect
                      [ngModel]="value"
                      [options]="store.departments.entities()"
                      placeholder="TODOS"
                      (onChange)="filter($event.value)"
                      optionLabel="name"
                      appendTo="body"
                    />
                  </ng-template>
                </p-columnFilter>
              </th>
              <th>
                <p-columnFilter
                  field="position"
                  matchMode="custom-filter"
                  [showMenu]="false"
                >
                  <ng-template
                    pTemplate="filter"
                    let-value
                    let-filter="filterCallback"
                  >
                    <p-multiSelect
                      [ngModel]="value"
                      [options]="store.positions.entities()"
                      placeholder="TODOS"
                      (onChange)="filter($event.value)"
                      optionLabel="name"
                      appendTo="body"
                    />
                  </ng-template>
                </p-columnFilter>
              </th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th>
                <p-columnFilter
                  field="gender"
                  matchMode="equals"
                  [showMatchModes]="false"
                  [showOperator]="false"
                  [showAddButton]="false"
                  [showApplyButton]="false"
                  [showClearButton]="false"
                >
                  <ng-template
                    pTemplate="filter"
                    let-value
                    let-filter="filterCallback"
                  >
                    <p-select
                      [options]="genders"
                      [ngModel]="value"
                      (onChange)="filter($event.value)"
                      placeholder="Elija uno"
                      [showClear]="true"
                    >
                      <ng-template let-option #item>
                        <div class="flex items-center gap-2">
                          <i
                            [ngClass]="
                              option.value === 'M'
                                ? 'pi pi-mars'
                                : 'pi pi-venus'
                            "
                          ></i>
                          {{ option.label }}
                        </div>
                      </ng-template>
                    </p-select>
                  </ng-template>
                </p-columnFilter>
              </th>
              <th></th>
              <th></th>
            </tr>
            <tr>
              <th pSortableColumn="employee_number">
                Número<p-sortIcon field="employee_number" />
              </th>
              <th pSortableColumn="short_name">
                Nombre<p-sortIcon field="short_name" />
              </th>
              @if (inactiveValue()) {
              <th pSortableColumn="is_active">
                Status<p-sortIcon field="is_active" />
              </th>
              }
              <th pSortableColumn="document_id">
                Cedula<p-sortIcon field="document_id" />
              </th>
              <th pSortableColumn="branch.name">
                Sucursal<p-sortIcon field="branch.name" />
              </th>
              <th pSortableColumn="department.name">
                Area<p-sortIcon field="department.name" />
              </th>
              <th
                style="width: 10%; max-width: 120px;"
                pSortableColumn="position.name"
              >
                Cargo<p-sortIcon field="position.name" />
              </th>
              <th pSortableColumn="monthly_salary">
                Salario<p-sortIcon field="monthly_salary" />
              </th>
              <th pSortableColumn="uniform_size">
                Talla<p-sortIcon field="uniform_size" />
              </th>
              <th pSortableColumn="start_date">
                Fecha de inicio<p-sortIcon field="start_date" />
              </th>
              <th pSortableColumn="birth_date">
                Fecha de nacimiento<p-sortIcon field="birth_date" />
              </th>
              <th pSortableColumn="gender">
                Sexo<p-sortIcon field="gender" />
              </th>
              <th pSortableColumn="created_at">
                Creado<p-sortIcon field="created_at" />
              </th>
              <th pSortableColumn="total_lunch_exceeded_minutes">
                Almuerzo Excedido<p-sortIcon
                  field="total_lunch_exceeded_minutes"
                />
              </th>
              <th></th>
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
              <td class="position-cell">
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
              <td>
                <span class="flex items-center gap-2">
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
              <td>{{ item.created_at | date : 'medium' }}</td>
              <td>
                @if(item.total_lunch_exceeded_minutes !== undefined &&
                item.total_lunch_exceeded_minutes !== null) {
                @if(item.total_lunch_exceeded_minutes > 0) {
                <p-tag
                  severity="warn"
                  [value]="
                    formatLunchExceeded(item.total_lunch_exceeded_minutes)
                  "
                />
                } @else {
                <span class="text-gray-500">0</span>
                } } @else {
                <span class="text-gray-500">0</span>
                }
              </td>
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
  `,
  styles: `
    /* Estilos para mantener dimensiones uniformes y consistentes */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.5rem 0.75rem !important;
      vertical-align: middle !important;
      line-height: 1.4 !important;
      height: 3rem !important;
      min-height: 3rem !important;
      max-height: 3rem !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      text-align: center !important;
    }

    /* Excepción: columna Cargo puede tener múltiples líneas */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td.position-cell {
      white-space: normal !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      line-height: 1.4 !important;
      max-height: none !important;
      height: auto !important;
      min-height: 3rem !important;
      vertical-align: middle !important;
      overflow: visible !important;
      text-overflow: clip !important;
      padding: 0.5rem 0.75rem !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr {
      height: auto !important;
      min-height: 3rem !important;
      box-sizing: border-box !important;
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

    /* Títulos de columnas más llamativos (segunda fila con los títulos) */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:last-child > th {
      font-weight: 700 !important;
      font-size: 0.9rem !important;
      letter-spacing: 0.05em !important;
      color: #e5e7eb !important;
      text-transform: uppercase !important;
      background-color: #474747 !important;
      border-bottom: 2px solid rgba(107, 114, 128, 0.6) !important;
      padding: 1rem 0.75rem !important;
    }

    /* Títulos de columnas ordenables aún más destacados */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:last-child > th.p-datatable-sortable-column {
      color: #ffffff !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      background-color: #474747 !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr:last-child > th.p-datatable-sortable-column:hover {
      background-color: rgba(249, 115, 22, 0.2) !important; /* Naranja con opacidad */
      color: #fbbf24 !important; /* Amarillo/naranja claro para el texto */
    }

    /* Columna Cargo - ancho limitado y permite múltiples líneas */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th[psortablecolumn="position.name"] {
      width: 10% !important;
      max-width: 120px !important;
      min-width: 80px !important;
      white-space: normal !important;
      word-wrap: break-word !important;
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

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column:hover {
      background-color: rgba(249, 115, 22, 0.15) !important;
      color: #fbbf24 !important;
    }

    /* Estilo cuando la columna está activa (ordenada) - Igual que "Nombre" */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-highlight,
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th.p-datatable-sortable-column.p-datatable-column-sorted {
      background-color: rgba(107, 114, 128, 0.3) !important;
      color: #e5e7eb !important;
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

    /* Enlaces con ellipsis */
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td a {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
      text-align: center !important;
      margin: 0 auto;
    }

    /* Centrar columna de número (primera columna en encabezados, primera columna en body) */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:last-child > th:first-child,
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td:first-child {
      text-align: center !important;
    }


    /* Reducir ancho del input de búsqueda de número (primera fila = filtros, primera columna) */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:first-child > th:first-child p-columnfilter input.p-inputtext {
      max-width: 100px !important;
      width: 100px !important;
      box-sizing: border-box !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr:first-child > th:first-child p-columnfilter {
      max-width: 100px !important;
      width: 100px !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr:first-child > th:first-child .p-datatable-filter {
      max-width: 100px !important;
      width: 100px !important;
    }

    /* Limitar ancho de input de filtro para nombre (primera fila = filtros, segunda columna) */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:first-child > th:nth-child(2) p-columnfilter input.p-inputtext {
      max-width: 150px !important;
      width: 150px !important;
      box-sizing: border-box !important;
    }

    /* También limitar el contenedor del filtro para nombre */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:first-child > th:nth-child(2) p-columnfilter {
      max-width: 150px !important;
      width: 150px !important;
    }

    /* Limitar el div contenedor del filtro inline para nombre */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:first-child > th:nth-child(2) .p-datatable-filter {
      max-width: 150px !important;
      width: 150px !important;
    }

    /* Input de cédula más estrecho - ajustar índice según si hay columna de status */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:nth-child(2) > th:nth-child(4) p-columnfilter input.p-inputtext {
      max-width: 120px !important;
      width: 120px !important;
      box-sizing: border-box !important;
    }

    /* Contenedor del filtro de cédula más estrecho */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:nth-child(2) > th:nth-child(4) p-columnfilter {
      max-width: 120px !important;
      width: 120px !important;
    }

    /* Div contenedor del filtro de cédula más estrecho */
    :host ::ng-deep .p-datatable .p-datatable-thead > tr:nth-child(2) > th:nth-child(4) .p-datatable-filter {
      max-width: 120px !important;
      width: 120px !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeListComponent implements OnInit {
  readonly store = inject(DashboardStore);
  private http = inject(HttpClient);
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

  public filtered = computed(() =>
    this.store.employees
      .employeesList()
      .filter(
        (item) =>
          item.is_active === (this.inactiveValue() ? item.is_active : true)
      )
  );

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
  private filterService = inject(FilterService);
  callbackFilter: any;
  public cols: Column[] = [];

  ngOnInit(): void {
    this.filterService.register(
      'custom-filter',
      (value: { id: any } | null | undefined, filter: any[]) => {
        if (filter === undefined || filter === null || !filter.length) {
          return true;
        }

        if (value === undefined || value === null) {
          return false;
        }
        return filter.map((x) => x.id).includes(value.id);
      }
    );
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
    if (employee.employee_number && /^[A-Z]{2}\d{4}$/.test(employee.employee_number)) {
      return employee.employee_number;
    }
    
    // Si no tiene employee_number, generar uno basado en el company_id
    const companyId = this.organizationService.getCurrentCompanyId();
    const nazCompanyId = this.organizationService['_nazCompanyId'];
    const blackdogCompanyId = this.organizationService['_blackdogCompanyId'];
    
    const prefix = getEmployeeNumberPrefix(companyId, nazCompanyId, blackdogCompanyId);
    
    // Si no podemos determinar el prefijo, usar el ID como fallback
    if (prefix === 'XX') {
      return employee.id.substring(0, 8);
    }
    
    // Generar un número basado en el ID del empleado (usar últimos 4 dígitos del UUID)
    // Esto es temporal hasta que se asigne un employee_number real
    const idDigits = employee.id.replace(/-/g, '').substring(0, 4);
    const number = parseInt(idDigits, 16) % 10000; // Convertir a número y limitar a 4 dígitos
    const formattedNumber = number.toString().padStart(4, '0');
    
    return `${prefix}${formattedNumber}`;
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

          const updateResponse = await this.http
            .patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
              { has_portal_access: true },
              {
                params,
                headers: {
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation',
                },
              }
            )
            .toPromise();

          // Enviar invitación por Wassenger
          const portalUrl = `${process.env['ENV_APP_URL']}/my-portal`;
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
            // Recargar la lista de empleados
            this.store.employees.fetchItems();
          } else {
            // Aunque falló el envío, el acceso al portal ya fue otorgado
            this.messageService.add({
              severity: 'warn',
              summary: 'Acceso otorgado',
              detail: `${employeeName} ahora tiene acceso al portal, pero no se pudo enviar el mensaje por Wassenger`,
            });
            this.store.employees.fetchItems();
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
