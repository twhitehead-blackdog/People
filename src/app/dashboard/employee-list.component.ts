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
import { ConfirmationService, FilterService, MessageService } from 'primeng/api';
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
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { utils, writeFile } from 'xlsx';
import { Column, Employee, ExportColumn } from '../models';
import { AgePipe } from '../pipes/age.pipe';
import { DashboardStore } from '../stores/dashboard.store';
import { WassengerService } from '../services/wassenger.service';
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
  ],
  providers: [DynamicDialogRef, DialogService, MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <p-card>
      <ng-template #title>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div>
            <h2 class="m-0 text-lg sm:text-xl">Empleados</h2>
            <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">Listado de colaboradores de la empresa</p>
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
            <p-toggleswitch
              [formControl]="inactiveToggle"
              inputId="active"
            />
            <label for="active">Incluir inactivos</label>
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th style="width:22%" pSortableColumn="short_name" pFrozenColumn>
              Nombre <p-sortIcon field="short_name" />
            </th>
            @if (inactiveValue()) {
            <th pSortableColumn="is_active">
              Status
              <p-sortIcon field="is_active" />
            </th>
            }
            <th pSortableColumn="document_id">
              Cedula<p-sortIcon field="document_id" />
            </th>
            <th pSortableColumn="branch.name">
              Sucursal <p-sortIcon field="branch" />
            </th>
            <th pSortableColumn="department.name">
              Area <p-sortIcon field="department" />
            </th>
            <th pSortableColumn="position.name">
              Cargo <p-sortIcon field="position" />
            </th>
            <th pSortableColumn="monthly_salary">
              Salario <p-sortIcon field="salary" />
            </th>
            <th pSortableColumn="uniform_size">
              Talla <p-sortIcon field="size" />
            </th>
            <th pSortableColumn="start_date">
              Fecha de inicio <p-sortIcon field="start_date" />
            </th>
            <th pSortableColumn="probatory">
              Probatorio <p-sortIcon field="probatory" />
            </th>
            <th pSortableColumn="birth_date">
              Fecha de nacimiento <p-sortIcon field="birth_date" />
            </th>
            <th pSortableColumn="gender">Sexo <p-sortIcon field="gender" /></th>
            <th pSortableColumn="created_at">
              Creado <p-sortIcon field="created_at" />
            </th>
            <th></th>
          </tr>
          <tr>
            <th pFrozenColumn>
              <p-columnFilter
                type="text"
                field="short_name"
                placeholder="Buscar por nombre"
                ariaLabel="Filter Name"
              />
            </th>
            @if (inactiveValue()) {
            <th></th>
            }
            <th>
              <p-columnFilter
                type="text"
                field="document_id"
                placeholder="Buscar por Nro. Doc"
                ariaLabel="Filter Document"
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
            <th>
              <p-columnFilter
                field="probatory"
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
                    [options]="probatories"
                    [ngModel]="value"
                    (onChange)="filter($event.value)"
                    placeholder="Elija uno"
                    [showClear]="true"
                  >
                    <ng-template let-option #item>
                      <p-tag
                        [value]="option.value ? 'PROBATORIO' : 'NORMAL'"
                        [severity]="option.value ? 'danger' : 'secondary'"
                      />
                    </ng-template>
                  </p-select>
                </ng-template>
              </p-columnFilter>
            </th>
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
                            option.value === 'M' ? 'pi pi-mars' : 'pi pi-venus'
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
        </ng-template>
        <ng-template #body let-item let-columns="columns">
          <tr>
            <td pFrozenColumn>
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
            <td>{{ item.position?.name || 'SIN CARGO' }}</td>
            <td>{{ item.monthly_salary | currency : '$' }}</td>
            <td>{{ item.uniform_size }}</td>
            <td>{{ item.start_date | date : 'mediumDate' }}</td>
            <td>
              @if (item.probatory) {
              <p-tag severity="danger" value="PROBATORIO" />
              }
            </td>
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
              <div class="flex gap-1 sm:gap-2 flex-wrap">
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
    
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeListComponent implements OnInit {
  readonly store = inject(DashboardStore);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private wassengerService = inject(WassengerService);

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
  }

  editEmployee(employee?: Employee) {
    this.ref = this.dialog.open(EmployeeFormComponent, {
      header: 'Datos de empleado',
      width: '90vw',
      data: { employee },
    });
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
        detail: 'El empleado debe tener email laboral y teléfono para ser invitado al portal',
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
          const updateResponse = await this.http
            .patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees?id=eq.${employee.id}`,
              { has_portal_access: true },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation',
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
