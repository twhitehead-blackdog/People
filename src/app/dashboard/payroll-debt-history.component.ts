import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ApiUrlService } from '../services/api-url.service';

interface DebtPaymentRecord {
  id: string;
  debt_id: string;
  payroll_payment_id: string;
  amount: number;
  payment_date: string;
  payment_employee_id: string;
  payroll_payment?: {
    title: string;
    start_date: string;
    end_date: string;
  };
}

@Component({
  selector: 'pt-payroll-debt-history',
  imports: [TableModule, CurrencyPipe, DatePipe, Tag],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div>
          <p class="text-sm text-gray-400 m-0">Monto Original</p>
          <p class="text-lg font-bold m-0">{{ debt.amount | currency:'$' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-400 m-0">Saldo Pendiente</p>
          <p class="text-lg font-bold m-0" [class.text-green-400]="debt.balance <= 0">
            {{ debt.balance | currency:'$' }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-400 m-0">Total Pagado</p>
          <p class="text-lg font-bold text-amber-400 m-0">{{ totalPaid() | currency:'$' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-400 m-0">Estado</p>
          @switch (debt.status) {
            @case ('active') {
              <p-tag value="Activo" severity="success" rounded />
            }
            @case ('paused') {
              <p-tag value="Pausado" severity="warn" rounded />
            }
            @case ('completed') {
              <p-tag value="Completado" severity="info" rounded />
            }
            @case ('cancelled') {
              <p-tag value="Cancelado" severity="danger" rounded />
            }
          }
        </div>
      </div>

      <p-table
        [value]="payments.value() ?? []"
        [loading]="payments.isLoading()"
        [paginator]="true"
        [rows]="10"
        showCurrentPageReport
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} pagos"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="payment_date">
              Fecha de Pago
              <p-sortIcon field="payment_date" />
            </th>
            <th>Periodo</th>
            <th pSortableColumn="amount">
              Monto
              <p-sortIcon field="amount" />
            </th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-payment>
          <tr>
            <td>{{ payment.payment_date | date:'dd/MM/yyyy' }}</td>
            <td>{{ payment.payroll_payment?.title ?? '-' }}</td>
            <td>{{ payment.amount | currency:'$' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="3" class="text-center text-gray-400 py-8">
              No hay pagos registrados para esta deuda
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollDebtHistoryComponent {
  private dialogConfig = inject(DynamicDialogConfig);
  private apiUrl = inject(ApiUrlService);

  public debt = this.dialogConfig.data.debt;

  public payments = httpResource<DebtPaymentRecord[]>(() => ({
    url: this.apiUrl.build('rest/v1/payroll_debt_payments', {
      debt_id: `eq.${this.debt.id}`,
      select: '*, payroll_payment:payroll_payments(id, title, start_date, end_date)',
      order: 'payment_date.desc',
    }),
    method: 'GET',
  }));

  public totalPaid = computed(() => {
    const items = this.payments.value() ?? [];
    return items.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  });
}
