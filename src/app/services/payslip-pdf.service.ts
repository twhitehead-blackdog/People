import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = pdfFonts;

export interface PayslipEmployee {
  employee_id: number;
  first_name: string;
  father_name: string;
  document_id: string;
  position: string;
  branch: string;
  department: string;
  monthly_salary: number;
  bank: string;
  account_number: string;
  bank_account_type: string;
  income_amount: number;
  deduction_amount: number;
  debt_amount: number;
  late_amount: number;
  absence_amount: number;
  overtime_amount: number;
  sunday_amount: number;
  holiday_amount: number;
  employer_cost: number;
  total_amount: number;
}

export interface PayslipItem {
  payment_employee_id: number;
  type: 'income' | 'deduction' | 'debt';
  amount: number;
  description: string;
}

export interface PayslipPayment {
  title: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  period_number: number;
  month: number;
  year: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PayslipPdfService {

  private readonly primaryColor = '#1a237e';
  private readonly headerBg = '#e8eaf6';
  private readonly tableBorderColor = '#bdbdbd';
  private readonly lightGray = '#f5f5f5';

  generatePayslip(
    employee: PayslipEmployee,
    payment: PayslipPayment,
    items: PayslipItem[],
    companyName: string
  ): void {
    const docDefinition = this.buildDocument([employee], payment, { [employee.employee_id]: items }, companyName);
    pdfMake.createPdf(docDefinition as any).open();
  }

  generateBulkPayslips(
    employees: PayslipEmployee[],
    payment: PayslipPayment,
    itemsMap: Record<number, PayslipItem[]>,
    companyName: string
  ): void {
    const docDefinition = this.buildDocument(employees, payment, itemsMap, companyName);
    pdfMake.createPdf(docDefinition as any).download(
      `Planilla_${payment.year}_${String(payment.month).padStart(2, '0')}_P${payment.period_number}.pdf`
    );
  }

  private buildDocument(
    employees: PayslipEmployee[],
    payment: PayslipPayment,
    itemsMap: Record<number, PayslipItem[]>,
    companyName: string
  ): any {
    const content: any[] = [];

    employees.forEach((employee, index) => {
      const items = itemsMap[employee.employee_id] || [];

      if (index > 0) {
        content.push({ text: '', pageBreak: 'before' });
      }

      content.push(...this.buildPayslipContent(employee, payment, items, companyName));
    });

    return {
      pageSize: 'LETTER',
      pageMargins: [40, 30, 40, 30],
      content,
      defaultStyle: {
        fontSize: 9,
        font: 'Roboto',
      },
      styles: {
        companyName: {
          fontSize: 16,
          bold: true,
          color: this.primaryColor,
        },
        documentTitle: {
          fontSize: 12,
          bold: true,
          color: this.primaryColor,
          alignment: 'center',
        },
        sectionHeader: {
          fontSize: 10,
          bold: true,
          color: '#ffffff',
          fillColor: this.primaryColor,
          margin: [4, 3, 4, 3],
        },
        tableHeader: {
          fontSize: 8,
          bold: true,
          color: this.primaryColor,
          fillColor: this.headerBg,
        },
        totalLabel: {
          fontSize: 10,
          bold: true,
          color: this.primaryColor,
        },
        totalAmount: {
          fontSize: 11,
          bold: true,
          color: this.primaryColor,
          alignment: 'right',
        },
        netPayLabel: {
          fontSize: 12,
          bold: true,
          color: '#ffffff',
          fillColor: this.primaryColor,
        },
        netPayAmount: {
          fontSize: 12,
          bold: true,
          color: '#ffffff',
          fillColor: this.primaryColor,
          alignment: 'right',
        },
      },
    };
  }

  private buildPayslipContent(
    employee: PayslipEmployee,
    payment: PayslipPayment,
    items: PayslipItem[],
    companyName: string
  ): any[] {
    const incomes = items.filter(i => i.type === 'income');
    const deductions = items.filter(i => i.type === 'deduction');
    const debts = items.filter(i => i.type === 'debt');

    const content: any[] = [];

    // Header
    content.push(this.buildHeader(companyName, payment));

    // Separator
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 2, lineColor: this.primaryColor }],
      margin: [0, 5, 0, 8],
    });

    // Employee info
    content.push(this.buildEmployeeInfo(employee));

    // Spacer
    content.push({ text: '', margin: [0, 8, 0, 0] });

    // Items tables side by side
    content.push(this.buildItemsTables(incomes, deductions, debts));

    // Summary
    content.push({ text: '', margin: [0, 10, 0, 0] });
    content.push(this.buildSummary(employee));

    // Signature lines
    content.push({ text: '', margin: [0, 40, 0, 0] });
    content.push(this.buildSignatures());

    return content;
  }

  private buildHeader(companyName: string, payment: PayslipPayment): any {
    const monthNames = [
      '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    return {
      columns: [
        {
          width: '*',
          stack: [
            { text: companyName, style: 'companyName' },
            { text: 'RUC: _______________', fontSize: 8, color: '#666666', margin: [0, 2, 0, 0] },
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: 'COMPROBANTE DE PAGO', style: 'documentTitle' },
            {
              text: payment.title || `Planilla ${monthNames[payment.month]} ${payment.year}`,
              fontSize: 9,
              alignment: 'center',
              margin: [0, 3, 0, 0],
            },
            {
              text: `Periodo ${payment.period_number} | ${this.formatDate(payment.start_date)} - ${this.formatDate(payment.end_date)}`,
              fontSize: 8,
              color: '#666666',
              alignment: 'center',
              margin: [0, 2, 0, 0],
            },
            {
              text: `Fecha de Pago: ${this.formatDate(payment.payment_date)}`,
              fontSize: 8,
              color: '#666666',
              alignment: 'center',
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    };
  }

  private buildEmployeeInfo(employee: PayslipEmployee): any {
    const leftFields = [
      ['Nombre', `${employee.first_name} ${employee.father_name}`],
      ['Cedula / Pasaporte', employee.document_id || 'N/A'],
      ['Cargo', employee.position || 'N/A'],
      ['Sucursal', employee.branch || 'N/A'],
      ['Departamento', employee.department || 'N/A'],
    ];

    const rightFields = [
      ['Salario Mensual', this.formatCurrency(employee.monthly_salary)],
      ['Banco', employee.bank || 'N/A'],
      ['No. Cuenta', employee.account_number || 'N/A'],
      ['Tipo Cuenta', employee.bank_account_type || 'N/A'],
    ];

    const buildFieldRows = (fields: string[][]): any[] =>
      fields.map(([label, value]) => ({
        columns: [
          { text: `${label}:`, bold: true, width: 110, fontSize: 8, color: '#444444' },
          { text: value, width: '*', fontSize: 8 },
        ],
        margin: [0, 1, 0, 1],
      }));

    return {
      table: {
        widths: ['*', '*'],
        body: [
          [
            {
              stack: buildFieldRows(leftFields),
              margin: [5, 5, 5, 5],
            },
            {
              stack: buildFieldRows(rightFields),
              margin: [5, 5, 5, 5],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => this.tableBorderColor,
        vLineColor: () => this.tableBorderColor,
      },
    };
  }

  private buildItemsTables(
    incomes: PayslipItem[],
    deductions: PayslipItem[],
    debts: PayslipItem[]
  ): any {
    const buildTable = (title: string, items: PayslipItem[], totalAmount: number): any => {
      const headerRow = [
        { text: 'Descripcion', style: 'tableHeader', margin: [4, 3, 4, 3] },
        { text: 'Monto', style: 'tableHeader', alignment: 'right', margin: [4, 3, 4, 3] },
      ];

      const itemRows = items.map((item, idx) => [
        {
          text: item.description,
          fontSize: 8,
          margin: [4, 2, 4, 2],
          fillColor: idx % 2 === 0 ? '#ffffff' : this.lightGray,
        },
        {
          text: this.formatCurrency(item.amount),
          fontSize: 8,
          alignment: 'right',
          margin: [4, 2, 4, 2],
          fillColor: idx % 2 === 0 ? '#ffffff' : this.lightGray,
        },
      ]);

      if (items.length === 0) {
        itemRows.push([
          { text: 'Sin registros', fontSize: 8, margin: [4, 2, 4, 2], fillColor: '#ffffff', colSpan: 2 } as any,
          {} as any,
        ]);
      }

      const totalRow = [
        { text: 'TOTAL', bold: true, fontSize: 8, margin: [4, 3, 4, 3], fillColor: this.headerBg },
        {
          text: this.formatCurrency(totalAmount),
          bold: true,
          fontSize: 8,
          alignment: 'right',
          margin: [4, 3, 4, 3],
          fillColor: this.headerBg,
        },
      ];

      return {
        stack: [
          {
            table: {
              widths: ['*'],
              body: [[{ text: title, style: 'sectionHeader' }]],
            },
            layout: 'noBorders',
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 80],
              body: [headerRow, ...itemRows, totalRow],
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0,
              vLineWidth: () => 0.5,
              hLineColor: () => this.tableBorderColor,
              vLineColor: () => this.tableBorderColor,
            },
          },
        ],
      };
    };

    const incomeTotal = incomes.reduce((sum, i) => sum + i.amount, 0);
    const deductionTotal = deductions.reduce((sum, i) => sum + i.amount, 0);
    const debtTotal = debts.reduce((sum, i) => sum + i.amount, 0);

    // If there are debts, show 3 columns; otherwise 2
    if (debts.length > 0) {
      return {
        columns: [
          { width: '*', ...buildTable('INGRESOS', incomes, incomeTotal) },
          { width: 8, text: '' },
          { width: '*', ...buildTable('DEDUCCIONES', deductions, deductionTotal) },
          { width: 8, text: '' },
          { width: '*', ...buildTable('DEUDAS / PRESTAMOS', debts, debtTotal) },
        ],
      };
    }

    return {
      columns: [
        { width: '*', ...buildTable('INGRESOS', incomes, incomeTotal) },
        { width: 10, text: '' },
        { width: '*', ...buildTable('DEDUCCIONES', deductions, deductionTotal) },
      ],
    };
  }

  private buildSummary(employee: PayslipEmployee): any {
    const summaryItems: [string, number][] = [
      ['Salario Bruto (Ingresos)', employee.income_amount],
      ['(-) CSS Obrero', 0],
      ['(-) Seguro Educativo', 0],
      ['(-) ISR (Impuesto Sobre la Renta)', 0],
      ['(-) Total Deducciones', employee.deduction_amount],
      ['(-) Deudas / Prestamos', employee.debt_amount],
      ['(-) Tardanzas', employee.late_amount],
      ['(-) Ausencias', employee.absence_amount],
      ['(+) Horas Extra', employee.overtime_amount],
      ['(+) Domingos Trabajados', employee.sunday_amount],
      ['(+) Dias Feriados', employee.holiday_amount],
    ];

    // Filter out zero-value optional rows (keep income and total deductions always)
    const rows: any[][] = summaryItems
      .filter(([label, amount]) =>
        label === 'Salario Bruto (Ingresos)' ||
        label === '(-) Total Deducciones' ||
        amount !== 0
      )
      .map(([label, amount]) => [
        { text: label, fontSize: 9, margin: [8, 2, 4, 2] },
        { text: this.formatCurrency(amount), fontSize: 9, alignment: 'right', margin: [4, 2, 8, 2] },
      ]);

    // Net pay row
    rows.push([
      { text: 'PAGO NETO', style: 'netPayLabel', margin: [8, 5, 4, 5] },
      { text: this.formatCurrency(employee.total_amount), style: 'netPayAmount', margin: [4, 5, 8, 5] },
    ]);

    // Employer cost row
    rows.push([
      { text: 'Costo Patronal (ref.)', fontSize: 8, color: '#888888', margin: [8, 2, 4, 2] },
      {
        text: this.formatCurrency(employee.employer_cost),
        fontSize: 8,
        color: '#888888',
        alignment: 'right',
        margin: [4, 2, 8, 2],
      },
    ]);

    return {
      columns: [
        { width: '*', text: '' },
        {
          width: 320,
          table: {
            widths: ['*', 100],
            body: rows,
          },
          layout: {
            hLineWidth: (i: number, node: any) => {
              if (i === node.table.body.length - 2 || i === node.table.body.length - 1) return 1;
              return 0.3;
            },
            vLineWidth: (i: number, node: any) =>
              i === 0 || i === node.table.widths.length ? 0.5 : 0,
            hLineColor: (i: number, node: any) =>
              i >= node.table.body.length - 2 ? this.primaryColor : '#e0e0e0',
            vLineColor: () => this.tableBorderColor,
          },
        },
      ],
    };
  }

  private buildSignatures(): any {
    return {
      columns: [
        {
          width: '*',
          stack: [
            {
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#333333' }],
            },
            { text: 'Firma del Empleado', alignment: 'center', fontSize: 8, color: '#666666', margin: [0, 4, 0, 0] },
            { text: 'Cedula: _______________', alignment: 'center', fontSize: 7, color: '#999999', margin: [0, 3, 0, 0] },
          ],
          alignment: 'center',
        },
        { width: 40, text: '' },
        {
          width: '*',
          stack: [
            {
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#333333' }],
            },
            { text: 'Autorizado', alignment: 'center', fontSize: 8, color: '#666666', margin: [0, 4, 0, 0] },
            { text: 'Fecha: _______________', alignment: 'center', fontSize: 7, color: '#999999', margin: [0, 3, 0, 0] },
          ],
          alignment: 'center',
        },
      ],
      margin: [30, 0, 30, 0],
    };
  }

  private formatCurrency(amount: number): string {
    if (amount == null) return '$0.00';
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}
