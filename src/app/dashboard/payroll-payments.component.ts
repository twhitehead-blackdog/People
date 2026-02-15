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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { PayrollPayment } from '../models';
import { getEnv } from '../utils/env.utils';
import { PayrollPaymentsFormComponent } from './payroll-payments-form.component';

@Component({
  selector: 'pt-payroll-payments',
  imports: [TableModule, Button, RouterLink, IconField, InputIcon, InputText, Card, FormsModule],
  providers: [DynamicDialogRef, DialogService],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0">Pagos</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Gestión de pagos de planilla</p>
          </div>
          <div class="flex gap-2">
            <p-button
              label="Procesar pago"
              icon="pi pi-plus-circle"
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
      [rowsPerPageOptions]="[10, 25, 50, 100]"
      paginatorDropdownAppendTo="body"
      currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} pagos"
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
              placeholder="Buscar"
              class="w-full lg:w-auto flex-1 text-sm"
            />
          </p-iconfield>
        </div>
      </ng-template>
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="title">
            Titulo
            <p-sortIcon field="title" />
          </th>
          <th pSortableColumn="start_date">
            Fecha Inicio
            <p-sortIcon field="start_date" />
          </th>
          <th pSortableColumn="end_date">
            Fecha Fin
            <p-sortIcon field="end_date" />
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
          <td pSortableColumn="title">{{ payment.title }}</td>
          <td pSortableColumn="start_date">{{ payment.start_date }}</td>
          <td pSortableColumn="end_date">{{ payment.end_date }}</td>
          <td pSortableColumn="status">{{ payment.status }}</td>
          <td>
            <p-button
              label="Ver"
              icon="pi pi-eye"
              severity="info"
              rounded
              [routerLink]="['payments', payment.id]"
            />
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
  public searchTerm = model<string>('');

  constructor() {
    // Sanitizar el término de búsqueda cuando cambia
    effect(() => {
      const term = this.searchTerm();
      if (term) {
        // Remover caracteres de control y limitar a 200 caracteres
        // eslint-disable-next-line no-control-regex
        const sanitized = term.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 200);
        if (sanitized !== term) {
          this.searchTerm.set(sanitized);
        }
      }
    });
  }

  public payments = httpResource<PayrollPayment[]>(() => ({
    url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_payments`,
    method: 'GET',
    params: {
      select: 'id,title,payroll_id,start_date,end_date,status',
      payroll_id: `eq.${this.payrollId()}`,
    },
  }));

  public filteredPayments = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const pays = this.payments.value() || [];

    if (!search) {
      return pays;
    }

    return pays.filter((pay) => {
      const searchableText = [pay.title].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(search);
    });
  });

  generatePayment() {
    this.dialogService.open(PayrollPaymentsFormComponent, {
      data: {
        payrollId: this.payrollId(),
      },
      modal: true,
      width: '48rem',
      header: 'Pago',
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
    });
  }
}
