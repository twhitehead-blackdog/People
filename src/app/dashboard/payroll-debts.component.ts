import { CurrencyPipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfirmationService,
  FilterService,
  MessageService,
} from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MultiSelect } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { PayrollDebt } from '../models';
import { CreditorsStore } from '../stores/creditors.store';
import { EmployeesStore } from '../stores/employees.store';
import { OrganizationService } from '../services/organization.service';
import { getEnv } from '../utils/env.utils';
import { PayrollDebtsFormComponent } from './payroll-debts-form.component';

@Component({
  selector: 'pt-payroll-debts',
  providers: [DynamicDialogRef, DialogService],
  imports: [TableModule, Button, CurrencyPipe, MultiSelect, FormsModule, Card],
  template: `<p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Deudas</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Gestión de deudas de empleados</p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Nuevo"
              icon="pi pi-plus-circle"
              rounded
              (onClick)="editDebt()"
            />
          </div>
        </div>
      </ng-template>
      <p-table
    [value]="debts.value() || []"
    paginator
    [rows]="10"
    showCurrentPageReport
    [rowsPerPageOptions]="[10, 25, 50, 100]"
    paginatorDropdownAppendTo="body"
    currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} deudas"
    >
    <ng-template #header>
      <tr>
        <th pSortableColumn="employee">
          Empleado
          <p-sortIcon field="employee" />
        </th>
        <th>Acreedor</th>
        <th>Monto</th>
        <th>Fecha de inicio</th>
        <th>Fecha de vencimiento</th>
        <th>Saldo</th>
        <th>Descripción</th>
        <th></th>
      </tr>
      <tr>
        <th>
          <p-columnFilter
            field="employee"
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
                [options]="employees.activeEmployees()"
                placeholder="TODOS"
                (onChange)="filter($event.value)"
                optionLabel="short_name"
                appendTo="body"
              />
            </ng-template>
          </p-columnFilter>
        </th>
        <th>
          <p-columnFilter
            field="creditor"
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
                [options]="creditors.entities()"
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
        <th></th>
        <th></th>
      </tr>
    </ng-template>
    <ng-template #body let-item>
      <tr>
        <td>{{ item.employee.first_name }} {{ item.employee.father_name }}</td>
        <td>{{ item.creditor.name }}</td>
        <td>{{ item.amount | currency : '$' }}</td>
        <td>{{ item.start_date }}</td>
        <td>{{ item.due_date }}</td>
        <td>{{ item.balance | currency : '$' }}</td>
        <td>{{ item.description }}</td>
        <td>
          <p-button
            severity="success"
            text
            rounded
            icon="pi pi-pen-to-square"
            (onClick)="editDebt(item)"
          />
          <p-button
            severity="danger"
            text
            rounded
            icon="pi pi-trash"
            (onClick)="deleteDebt(item)"
          />
        </td>
      </tr>
    </ng-template>
    <ng-template #emptymessage>
      <tr>
        <td colspan="10" class="text-center">No hay deudas</td>
      </tr>
    </ng-template>
  </p-table>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollDebtsComponent implements OnInit {
  public employees = inject(EmployeesStore);
  public creditors = inject(CreditorsStore);
  public organizationService = inject(OrganizationService);
  public payrollId = input.required<string>();
  public debts = httpResource<PayrollDebt[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: `*, employee:employees(id, first_name, father_name, payroll:employee_payrolls(*)), creditor:creditors(*)`,
      payroll_id: `eq.${this.payrollId()}`,
    };
    
    // Nota: payroll_debts no tiene company_id directamente, pero podemos filtrar por employee.company_id
    // Por ahora, dejamos que el filtro se haga a través de la relación employee si es necesario
    
    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_debts`,
      method: 'GET',
      params,
    };
  });

  private filterService = inject(FilterService);

  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private http = inject(HttpClient);
  private message = inject(MessageService);

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
  }

  public editDebt(debt?: PayrollDebt) {
    this.dialogService
      .open(PayrollDebtsFormComponent, {
        data: {
          payrollId: this.payrollId(),
          debt,
        },
        modal: true,
        width: '70vw',
        header: 'Detalles de deuda',
        breakpoints: {
          '960px': '75vw',
          '640px': '90vw',
        },
      })
      .onClose.subscribe(() => {
        this.debts.reload();
      });
  }

  public deleteDebt(debt: PayrollDebt) {
    console.log({ debt });
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta deuda?',
      header: 'Confirmación',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger',
      },
      accept: () => {
        this.http
          .delete(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_debts`, {
            params: {
              id: `eq.${debt.id}`,
            },
          })
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Deuda eliminada correctamente',
              });
              this.debts.reload();
            },
            error: (err) => {
              console.error(err);
            },
          });
      },
    });
  }
}
