import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { PayrollDeduction } from '../models';
import { getEnv } from '../utils/env.utils';
import { PayrollDeductionsFormComponent } from './payroll-deductions-form.component';

@Component({
  selector: 'pt-payroll-deductions',
  imports: [TableModule, Button, DecimalPipe, CurrencyPipe, Card],
  providers: [DynamicDialogRef, DialogService],
  template: `<p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Deducciones</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Configuración de deducciones de planilla</p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Nuevo"
              icon="pi pi-plus-circle"
              rounded
              (onClick)="editDeduction()"
            />
          </div>
        </div>
      </ng-template>
      <p-table
    [value]="payrollDeductions.value() || []"
    [loading]="payrollDeductions.isLoading()"
  >
    <ng-template pTemplate="header">
      <tr>
        <th>Nombre</th>
        <th>Valor</th>
        <th>Tipo de Calculo</th>
        <th>Salario Minimo</th>
        <th>Impuesto sobre la renta</th>
        <th></th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-deduction>
      <tr>
        <td>{{ deduction.name }}</td>
        <td>{{ deduction.value | number : '1.2-2' }}</td>
        <td>
          {{ deduction.calculation_type === 'fixed' ? 'Fijo' : 'Porcentaje' }}
        </td>
        <td>{{ deduction.min_salary | currency : '$' }}</td>
        <td>{{ deduction.income_tax ? 'SI' : 'NO' }}</td>
        <td>
          <p-button
            icon="pi pi-pencil"
            rounded
            text
            severity="success"
            (onClick)="editDeduction(deduction)"
          />
          <p-button
            icon="pi pi-trash"
            rounded
            text
            severity="danger"
            (onClick)="deleteDeduction(deduction)"
          />
        </td>
      </tr>
    </ng-template>
  </p-table>
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollDeductionsComponent {
  public payrollId = input.required<string>();
  public payrollDeductions = httpResource<PayrollDeduction[]>(() => ({
    url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_deductions`,
    method: 'GET',
    params: {
      select: 'id,payroll_id,name,value,calculation_type,min_salary,income_tax',
      payroll_id: `eq.${this.payrollId()}`,
    },
  }));

  private confirm = inject(ConfirmationService);
  private http = inject(HttpClient);

  public dialogService = inject(DialogService);

  public editDeduction(deduction?: PayrollDeduction) {
    this.dialogService
      .open(PayrollDeductionsFormComponent, {
        data: {
          payrollId: this.payrollId(),
          deduction,
        },
        modal: true,
        width: '48rem',
        header: 'Deducción',
      })
      .onClose.subscribe(() => {
        this.payrollDeductions.reload();
      });
  }

  public deleteDeduction(deduction: PayrollDeduction) {
    this.confirm.confirm({
      message: '¿Estas seguro de eliminar esta deducción?',
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
          .delete(
            `${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_deductions`,
            {
              params: {
                id: `eq.${deduction.id}`,
              },
            }
          )
          .subscribe(() => {
            this.payrollDeductions.reload();
          });
      },
    });
  }
}
