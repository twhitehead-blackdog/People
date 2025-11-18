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

import * as pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';

import { Button } from 'primeng/button';

@Component({
  selector: 'pt-payroll-summary',
  imports: [AccordionModule, KeyValuePipe, CurrencyPipe, Button],
  template: `
    <h1
      class="text-2xl font-bold text-gray-700 dark:text-gray-200 text-center uppercase"
    >
      BO Capital, S.A.
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
    <p-button label="Generar Documento" (click)="generateDocument()" />
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
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payments`,
    method: 'GET',
    params: {
      select: '*, payroll:payrolls(id, name)',
      id: `eq.${this.payment_id()}`,
    },
  }));
  public completed = httpResource<PayrollPaymentEmployee[]>(() => {
    if (!this.payment_id()) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payment_employees`,
      method: 'GET',
      params: {
        select:
          '*, items:payroll_payment_employee_items(*), employee:employees(id, first_name, father_name, document_id, branch:branches(id, name))',
        payroll_payment_id: `eq.${this.payment_id()}`,
      },
    };
  });

  public completedByBranch = computed(() => {
    return this.completed.value()?.reduce((acc, item) => {
      acc[item.employee?.branch?.name || 'N/A'] = [
        ...(acc[item.employee?.branch?.name || 'N/A'] || []),
        {
          ...item,
          total_deductions:
            item.items
              ?.filter((item) => item.type === 'deduction')
              .reduce((acc, item) => acc + item.amount, 0) || 0,
          total_income:
            item.items
              ?.filter((item) => item.type === 'income')
              .reduce((acc, item) => acc + item.amount, 0) || 0,
          total:
            (item.items
              ?.filter((item) => item.type === 'income')
              .reduce((acc, item) => acc + item.amount, 0) || 0) -
            (item.items
              ?.filter((item) => item.type === 'deduction')
              .reduce((acc, item) => acc + item.amount, 0) || 0) -
            (item.items
              ?.filter((item) => item.type === 'debt')
              .reduce((acc, item) => acc + item.amount, 0) || 0),
          total_debt:
            item.items
              ?.filter((item) => item.type === 'debt')
              .reduce((acc, item) => acc + item.amount, 0) || 0,
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

  public generateDocument() {
    pdfMake
      .createPdf(
        this.documentDefinition(),
        {},
        {
          // Default font should still be available
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-Italic.ttf',
          },
          // Make sure you define all 4 components - normal, bold, italics, bolditalics - (even if they all point to the same font file)
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

  public documentDefinition() {
    return {
      pageSize: 'LEGAL',
      pageOrientation: 'landscape',
      header: {
        text: `BO Capital, S.A. / ${
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
