import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { PayrollPayment, PayrollPaymentStatus } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { PayrollPaymentsFormComponent } from './payroll-payments-form.component';

const STATUS_MAP: Record<PayrollPaymentStatus, { label: string; severity: string }> = {
  DRAFT: { label: 'Borrador', severity: 'secondary' },
  CALCULATED: { label: 'Calculado', severity: 'info' },
  REVIEWED: { label: 'Revisado', severity: 'warn' },
  APPROVED: { label: 'Aprobado', severity: 'success' },
  PAID: { label: 'Pagado', severity: 'contrast' },
};

@Component({
  selector: 'pt-payroll-payments',
  imports: [
    TableModule,
    Button,
    RouterLink,
    IconField,
    InputIcon,
    InputText,
    Card,
    FormsModule,
    Tag,
    DatePipe,
  ],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Periodos de Pago</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Quincenas generadas para esta planilla</p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Generar Periodo"
              icon="pi pi-calendar-plus"
              severity="success"
              rounded
              (click)="generatePayment()"
            />
          </div>
        </div>
      </ng-template>
      <p-table
        #dt1
        [value]="filteredPayments()"
        [loading]="payments.isLoading()"
        [paginator]="true"
        [rows]="10"
        showCurrentPageReport
        [rowsPerPageOptions]="[10, 25, 50]"
        paginatorDropdownAppendTo="body"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} periodos"
        [sortField]="'start_date'"
        [sortOrder]="-1"
      >
        <ng-template #caption>
          <div class="flex gap-2 items-center">
            <p-iconfield iconPosition="left">
              <p-inputicon>
                <i class="pi pi-search"></i>
              </p-inputicon>
              <input
                pInputText
                type="text"
                [(ngModel)]="searchTerm"
                placeholder="Buscar periodo..."
                class="w-full lg:w-auto flex-1 text-sm"
              />
            </p-iconfield>
          </div>
        </ng-template>
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">
              Periodo
              <p-sortIcon field="title" />
            </th>
            <th pSortableColumn="start_date">
              Desde
              <p-sortIcon field="start_date" />
            </th>
            <th pSortableColumn="end_date">
              Hasta
              <p-sortIcon field="end_date" />
            </th>
            <th pSortableColumn="payment_date">
              Fecha de Pago
              <p-sortIcon field="payment_date" />
            </th>
            <th pSortableColumn="status">
              Estado
              <p-sortIcon field="status" />
            </th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-payment>
          <tr>
            <td>
              <span class="font-medium">{{ payment.title }}</span>
            </td>
            <td>{{ payment.start_date | date:'dd/MM/yyyy' }}</td>
            <td>{{ payment.end_date | date:'dd/MM/yyyy' }}</td>
            <td>
              @if (payment.payment_date) {
                {{ payment.payment_date | date:'dd/MM/yyyy' }}
              } @else {
                <span class="text-gray-500">-</span>
              }
            </td>
            <td>
              <p-tag
                [value]="getStatusLabel(payment.status)"
                [severity]="getStatusSeverity(payment.status)"
                rounded
              />
            </td>
            <td>
              <p-button
                label="Ver"
                icon="pi pi-eye"
                severity="info"
                rounded
                size="small"
                [routerLink]="['payments', payment.id]"
              />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center text-gray-400 py-8">
              <i class="pi pi-calendar text-3xl mb-2 block"></i>
              No hay periodos de pago. Haga clic en "Generar Periodo" para crear uno.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPaymentsComponent {
  public payrollId = input.required<string>();
  public dialogService = inject(DialogService);
  private apiUrl = inject(ApiUrlService);
  public searchTerm = model<string>('');

  constructor() {
    effect(() => {
      const term = this.searchTerm();
      if (term) {
        // eslint-disable-next-line no-control-regex
        const sanitized = term.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 200);
        if (sanitized !== term) {
          this.searchTerm.set(sanitized);
        }
      }
    });
  }

  public payments = httpResource<PayrollPayment[]>(() => ({
    url: this.apiUrl.build('rest/v1/payroll_payments', {
      select: 'id,title,payroll_id,start_date,end_date,payment_date,period_number,month,year,status',
      payroll_id: `eq.${this.payrollId()}`,
      order: 'start_date.desc',
    }),
    method: 'GET',
  }));

  public filteredPayments = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const pays = this.payments.value() || [];

    if (!search) {
      return pays;
    }

    return pays.filter((pay) => {
      const searchableText = [pay.title, pay.status].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(search);
    });
  });

  getStatusLabel(status: PayrollPaymentStatus): string {
    return STATUS_MAP[status]?.label ?? status;
  }

  getStatusSeverity(status: PayrollPaymentStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    return (STATUS_MAP[status]?.severity ?? 'secondary') as any;
  }

  generatePayment() {
    const ref = this.dialogService.open(PayrollPaymentsFormComponent, {
      data: {
        payrollId: this.payrollId(),
      },
      modal: true,
      width: '42rem',
      header: 'Generar Periodo de Pago',
      dismissableMask: true,
      closeOnEscape: true,
    });
    ref.onClose.subscribe(() => {
      this.payments.reload();
    });
  }
}
