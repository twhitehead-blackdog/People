import { CurrencyPipe, KeyValuePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { PayrollPayment, PayrollPaymentEmployee } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { getEnv } from '../utils/env.utils';
import { OrganizationService } from '../services/organization.service';

import { Button } from 'primeng/button';

@Component({
  selector: 'pt-payroll-summary',
  imports: [AccordionModule, KeyValuePipe, CurrencyPipe, Button],
  template: `
    <h1
      class="text-2xl font-bold text-gray-700 dark:text-gray-200 text-center uppercase"
    >
      {{ companyName() }}
    </h1>
    <h2 class="text-2xl font-bold text-gray-700 dark:text-gray-200 text-center">
      Planilla Quincenal
    </h2>
    <h2
      class="text-lg font-semibold text-gray-700 dark:text-gray-200 text-center uppercase"
    >
      Planilla {{ payroll.value()?.[0]?.payroll?.name }}
    </h2>
    <h2 class="text font-semibold text-gray-700 dark:text-gray-200 text-center">
      {{ payroll.value()?.[0]?.title }}
    </h2>
    <p class="text-gray-800 dark:text-gray-200 uppercase text-center ">
      Total: {{ totalValue() | currency : '$' }}
    </p>
    <div class="flex gap-2 flex-wrap">
      <p-button label="Generar Documento" (click)="generateDocument()" />
      <p-button label="TXT Banco General" icon="pi pi-download" severity="secondary" outlined (click)="generateBancoGeneralTxt()" />
    </div>
    <p-accordion value="0">
      @for(branch of completedByBranch() | keyvalue; track $index; let index =
      $index) {
      <p-accordion-panel [value]="index">
        <p-accordion-header>
          <div class="flex items-center gap-2 justify-between">
            <div>{{ branch.key }}</div>
            <div>{{ totalValueByBranch()[branch.key] | currency : '$' }}</div>
          </div>
        </p-accordion-header>
        <p-accordion-content>
          @for(employee of branch.value; track employee.id) {
          <p
            class="font-medium text-gray-800 dark:text-gray-200 text-sm uppercase"
          >
            {{ employee.employee?.first_name }}
            {{ employee.employee?.father_name }}
          </p>
          <br />
          <div class="flex gap-8 text-sm">
            <div class="w-full">
              <div class="text-center font-bold">Ingresos</div>
              <div class="flex flex-col justify-between h-full">
                <div>
                  @for(item of employee.items; track item.id) { @if(item.type
                  === 'income') {
                  <div class="flex justify-between items-center w-full">
                    <div class="text-gray-800 dark:text-gray-200 font-medium">
                      {{ item.description }}
                    </div>
                    <div>{{ item.amount | currency : '$' }}</div>
                  </div>
                  } }
                </div>
                <div class="flex justify-between items-center">
                  <div class="font-semibold">Total Ingresos</div>
                  <div class="font-semibold">
                    {{ employee.total_income | currency : '$' }}
                  </div>
                </div>
              </div>
            </div>
            <div class="w-full">
              <div class="text-center font-semibold">Deducciones</div>
              <div class="flex flex-col justify-between h-full">
                <div>
                  @for(item of employee.items; track item.id) { @if(item.type
                  === 'deduction') {
                  <div class="flex justify-between items-center">
                    <div class="text-gray-800 dark:text-gray-200 font-medium">
                      {{ item.description }}
                    </div>
                    <div>{{ item.amount | currency : '$' }}</div>
                  </div>
                  } }
                </div>
                <div class="flex justify-between items-center">
                  <div class="font-semibold">Total Deducciones</div>
                  <div class="font-semibold">
                    {{ employee.total_deductions | currency : '$' }}
                  </div>
                </div>
              </div>
            </div>
            <div class="w-full">
              <div class="text-center font-bold">Deuda</div>
              <div class="flex flex-col justify-between h-full">
                <div>
                  @for(item of employee.items; track item.id) { @if(item.type
                  === 'debt') {
                  <div class="flex justify-between items-center">
                    <div class="text-gray-800 dark:text-gray-200 font-medium">
                      {{ item.description }}
                    </div>
                    <div>{{ item.amount | currency : '$' }}</div>
                  </div>
                  } }
                </div>
                <div class="flex justify-between items-center mt-3">
                  <div class="font-semibold">Total Deuda</div>
                  <div class="font-semibold">
                    {{ employee.total_debt | currency : '$' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            class="flex gap-4 items-center border-b border-gray-200 last:border-b-0 py-4 my-4 last:mb-0 text-base"
          >
            <div class="font-semibold">Total</div>
            <div class="font-semibold">
              {{ employee.total | currency : '$' }}
            </div>
          </div>

          }
        </p-accordion-content>
      </p-accordion-panel>
      }
    </p-accordion>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollSummaryComponent {
  public store = inject(DashboardStore);
  public payment_id = input.required<string>();
  public payroll_id = input.required<string>();
  public payroll = httpResource<PayrollPayment[]>(() => ({
    url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_payments`,
    method: 'GET',
    params: {
      select: '*, payroll:payrolls(id, name)',
      id: `eq.${this.payment_id()}`,
    },
  }));
  public organizationService = inject(OrganizationService);
  
  public companyName = computed(() => {
    return this.organizationService.isNaz() ? 'Naz' : 'BO Capital, S.A.';
  });

  public completed = httpResource<PayrollPaymentEmployee[]>(() => {
    if (!this.payment_id()) {
      return undefined;
    }
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: `*, items:payroll_payment_employee_items(*), employee:employees(id, first_name, father_name, document_id, bank, account_number, bank_account_type, branch:branches(id, name))`,
      payroll_payment_id: `eq.${this.payment_id()}`,
    };
    
    // Nota: payroll_payment_employees no tiene company_id directamente, pero podemos filtrar por employee.company_id
    // Por ahora, dejamos que el filtro se haga a través de la relación employee si es necesario
    
    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/payroll_payment_employees`,
      method: 'GET',
      params,
    };
  });

  public completedByBranch = computed(() => {
    const MAX_AMOUNT = 999999999; // Límite máximo para evitar overflow
    
    const safeSum = (items: any[], type: string): number => {
      return items
        ?.filter((item) => item.type === type)
        .reduce((acc, item) => {
          const amount = item.amount || 0;
          if (isNaN(amount) || amount < 0 || amount > MAX_AMOUNT) {
            return acc;
          }
          const newTotal = acc + amount;
          return newTotal > MAX_AMOUNT ? MAX_AMOUNT : newTotal;
        }, 0) || 0;
    };
    
    return this.completed.value()?.reduce((acc, item) => {
      const totalIncome = safeSum(item.items || [], 'income');
      const totalDeductions = safeSum(item.items || [], 'deduction');
      const totalDebt = safeSum(item.items || [], 'debt');
      const total = Math.max(0, totalIncome - totalDeductions - totalDebt);
      
      acc[item.employee?.branch?.name || 'N/A'] = [
        ...(acc[item.employee?.branch?.name || 'N/A'] || []),
        {
          ...item,
          total_deductions: totalDeductions,
          total_income: totalIncome,
          total: total,
          total_debt: totalDebt,
        },
      ];
      return acc;
    }, {} as Record<string, any[]>);
  });

  public totalValueByBranch = computed(() => {
    return Object.keys(this.completedByBranch() || {}).reduce((acc, key) => {
      acc[key] = this.completedByBranch()?.[key].reduce((acc, item) => {
        return acc + item.total;
      }, 0);
      return acc;
    }, {} as Record<string, number>);
  });

  public totalValue = computed(() => {
    return Object.values(this.totalValueByBranch() || {}).reduce(
      (acc, item) => {
        return acc + item;
      },
      0
    );
  });

  public async generateDocument() {
    const pdfMake = await import('pdfmake/build/pdfmake.js');
    const pdfFonts = await import('pdfmake/build/vfs_fonts.js');
    pdfMake
      .createPdf(
        this.documentDefinition(),
        {},
        {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-Italic.ttf',
          },
          Helvetica: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique',
          },
        },
        pdfFonts.vfs
      )
      .download(
        `Planilla ${this.payroll.value()?.[0]?.payroll?.name || ''} - ${
          this.payroll.value()?.[0]?.title || ''
        }.pdf`
      );
  }

  public generateBancoGeneralTxt(): void {
    const records = this.completed.value() ?? [];
    const title = this.payroll.value()?.[0]?.title ?? 'planilla';
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lines: string[] = [];
    let totalAmount = 0;
    const empLines: string[] = [];

    for (const rec of records) {
      const emp = rec.employee as any;
      if (!emp?.account_number) continue;
      const amount = rec.total_amount ?? 0;
      if (amount <= 0) continue;
      const accountType = emp.bank_account_type === 'Corriente' ? 'CC' : 'CA';
      const amountStr = amount.toFixed(2).replace('.', '').padStart(12, '0');
      const name = `${emp.first_name ?? ''} ${emp.father_name ?? ''}`.trim().substring(0, 40).padEnd(40, ' ');
      const cedula = (emp.document_id ?? '').substring(0, 15).padEnd(15, ' ');
      const account = (emp.account_number ?? '').substring(0, 20).padEnd(20, ' ');
      empLines.push(`2${account}${accountType}${amountStr}${name}${cedula}`);
      totalAmount += amount;
    }

    const totalStr = totalAmount.toFixed(2).replace('.', '').padStart(12, '0');
    const companyName = (this.companyName() ?? 'BLACK DOG').substring(0, 40).padEnd(40, ' ');
    lines.push(`1${companyName}${dateStr}${String(empLines.length).padStart(6, '0')}${totalStr}`);
    lines.push(...empLines);
    lines.push(`9${String(empLines.length).padStart(6, '0')}${totalStr}`);

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACH_BancoGeneral_${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public documentDefinition() {
    return {
      pageSize: 'LEGAL',
      pageOrientation: 'landscape',
      header: {
        text: `${this.companyName()} / ${
          this.payroll.value()?.[0]?.payroll?.name || ''
        }`,
        style: 'header1',
        margin: [0, 20, 0, 10],
      },
      content: [
        {
          text: this.payroll.value()?.[0]?.title || '',
          style: 'header4',
        },
        {
          text: `Total: ${
            this.totalValue()?.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            }) || '$0.00'
          }`,
          style: 'total',
        },
        ...this.generateBranchSections(),
      ],
      styles: {
        header1: {
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        header2: {
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        header3: {
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        header4: {
          fontSize: 12,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        total: {
          fontSize: 12,
          bold: false,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        employeeName: {
          fontSize: 10,
          bold: true,
          margin: [0, 5, 0, 5],
        },
        sectionHeader: {
          fontSize: 10,
          bold: true,
          uppercase: true,
          alignment: 'center',
          margin: [0, 5, 0, 5],
        },
        itemLabel: {
          fontSize: 8,
          marginRight: 20,
        },
        itemValue: {
          fontSize: 8,
          margin: [0, 2, 0, 2],
        },
        totalLabel: {
          fontSize: 8,
          bold: true,
          margin: [0, 5, 0, 5],
        },
        totalValue: {
          fontSize: 8,
          bold: true,
          margin: [0, 5, 0, 5],
        },
      },
    } as any;
  }

  generateBranchSections() {
    const branchSections = [];
    const branches = this.completedByBranch() || {};

    for (const [branchName, employees] of Object.entries(branches)) {
      const branchTotal =
        this.totalValueByBranch()[branchName]?.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        }) || '$0.00';

      branchSections.push({
        text: [
          { text: branchName, bold: true },
          { text: ` ${branchTotal}`, bold: true, alignment: 'right' },
        ],
        style: 'sectionHeader',
        margin: [0, 10, 0, 5],
      });

      for (const employee of employees) {
        // Employee name
        branchSections.push({
          text: `${employee.employee?.first_name || ''} ${
            employee.employee?.father_name || ''
          }`,
          style: 'employeeName',
        });

        // Income, Deductions, and Debt columns
        branchSections.push({
          columns: [
            // Income column
            {
              width: '*',
              stack: [
                { text: 'Ingresos', style: 'sectionHeader' },
                ...(employee.items
                  ?.filter((item: any) => item.type === 'income')
                  .map((item: any) => ({
                    columns: [
                      {
                        text: item.description || '' + '   ',
                        style: 'itemLabel',
                        margin: [0, 0, 10, 0],
                      },
                      {
                        text:
                          item.amount?.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }) || '$0.00',
                        style: 'itemValue',
                        alignment: 'right',
                      },
                    ],
                    margin: [0, 2, 0, 2],
                  })) || []),
                {
                  columns: [
                    { text: 'Total Ingresos', style: 'totalLabel' },
                    {
                      text:
                        employee.total_income?.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }) || '$0.00',
                      style: 'totalValue',
                      alignment: 'right',
                    },
                  ],
                },
              ],
            },
            // Deductions column
            {
              width: '*',
              stack: [
                { text: 'Deducciones', style: 'sectionHeader' },
                ...(employee.items
                  ?.filter(
                    (item: any) => item.type === 'deduction' && item.amount > 0
                  )
                  .map((item: any) => ({
                    columns: [
                      { text: item.description || '', style: 'itemLabel' },
                      {
                        text:
                          item.amount?.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }) || '$0.00',
                        style: 'itemValue',
                        alignment: 'right',
                      },
                    ],
                    columnGap: 10,
                    margin: [0, 2, 0, 2],
                  })) || []),
                {
                  columns: [
                    { text: 'Total Deducciones', style: 'totalLabel' },
                    {
                      text:
                        employee.total_deductions?.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }) || '$0.00',
                      style: 'totalValue',
                      alignment: 'right',
                    },
                  ],
                },
              ],
            },
            // Debt column
            {
              width: '*',
              stack: [
                { text: 'Deuda', style: 'sectionHeader' },
                ...(employee.items
                  ?.filter((item: any) => item.type === 'debt')
                  .map((item: any) => ({
                    columns: [
                      { text: item.description || '', style: 'itemLabel' },
                      {
                        text:
                          item.amount?.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }) || '$0.00',
                        style: 'itemValue',
                        alignment: 'right',
                      },
                    ],
                  })) || []),
                {
                  columns: [
                    { text: 'Total Deuda', style: 'totalLabel' },
                    {
                      text:
                        employee.total_debt?.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }) || '$0.00',
                      style: 'totalValue',
                      alignment: 'right',
                    },
                  ],
                },
              ],
            },
          ],
          columnGap: 20,
        });

        // Employee total
        branchSections.push({
          columns: [
            {
              text: `TOTAL ${
                employee.employee?.first_name.toUpperCase() || ''
              } ${employee.employee?.father_name.toUpperCase() || ''}`,
              style: 'totalLabel',
            },
            {
              text:
                employee.total?.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }) || '$0.00',
              style: 'totalValue',
              alignment: 'right',
            },
            {
              text: '',
            },
          ],
        });
      }
    }

    return branchSections;
  }
}
