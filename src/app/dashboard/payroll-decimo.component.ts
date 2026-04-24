import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DecimoStatus = 'PENDIENTE' | 'CALCULADO' | 'PAGADO';

interface DecimoRecord {
  id?: string;
  company_id: string;
  year: number;
  period_number: 1 | 2 | 3;
  employee_id: string;
  earnings_total: number;
  decimo_amount: number;
  status: DecimoStatus;
  created_at?: string;
}

interface DecimoRow {
  employee_id: string;
  employee_name: string;
  document_id: string;
  branch_name: string;
  earnings_total: number;
  decimo_amount: number;
  status: DecimoStatus;
}

interface PeriodConfig {
  number: 1 | 2 | 3;
  label: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  deadlineMonth: number;
  deadlineDay: number;
}

const PERIODS: PeriodConfig[] = [
  { number: 1, label: 'Primer Cuatrimestre',  startMonth: 12, startDay: 16, endMonth: 4,  endDay: 15, deadlineMonth: 4,  deadlineDay: 15 },
  { number: 2, label: 'Segundo Cuatrimestre', startMonth: 4,  startDay: 16, endMonth: 8,  endDay: 15, deadlineMonth: 8,  deadlineDay: 15 },
  { number: 3, label: 'Tercer Cuatrimestre',  startMonth: 8,  startDay: 16, endMonth: 12, endDay: 15, deadlineMonth: 12, deadlineDay: 15 },
];

const STATUS_CONFIG: Record<DecimoStatus, { label: string; severity: 'secondary' | 'info' | 'success' }> = {
  PENDIENTE:  { label: 'Pendiente',  severity: 'secondary' },
  CALCULADO:  { label: 'Calculado',  severity: 'info' },
  PAGADO:     { label: 'Pagado',     severity: 'success' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'pt-payroll-decimo',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    Button,
    Card,
    Select,
    TableModule,
    Tag,
    Dialog,
    ProgressSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white m-0">Decimo Tercer Mes</h1>
        <p class="text-sm text-gray-400 m-0 mt-1">
          Calculo y control del XIII mes segun legislacion panamena
        </p>
      </div>

      <div class="flex items-center gap-3">
        <label class="text-sm text-gray-300 font-medium">Ano:</label>
        <p-select
          [options]="yearOptions()"
          [(ngModel)]="selectedYear"
          optionLabel="label"
          optionValue="value"
          placeholder="Seleccionar ano"
          class="w-32"
        />
      </div>
    </div>

    <!-- Period Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      @for (period of periodsForYear(); track period.number) {
        <div
          class="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-amber-500/40 transition-colors"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-semibold text-white m-0">
              {{ period.label }}
            </h3>
            <p-tag
              [value]="getStatusLabel(period.status)"
              [severity]="getStatusSeverity(period.status)"
              rounded
            />
          </div>

          <div class="space-y-1 text-sm text-gray-400 mb-4">
            <div class="flex justify-between">
              <span>Periodo:</span>
              <span class="text-gray-200">
                {{ period.startDate | date:'dd/MM/yyyy' }} - {{ period.endDate | date:'dd/MM/yyyy' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span>Fecha limite pago:</span>
              <span class="text-gray-200">{{ period.deadline | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Empleados:</span>
              <span class="text-gray-200">{{ period.rows.length }}</span>
            </div>
          </div>

          <div class="border-t border-gray-700 pt-3 mb-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-400">Total a pagar:</span>
              <span class="text-xl font-bold text-amber-400">
                {{ period.total | currency:'USD':'symbol':'1.2-2' }}
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <p-button
              [label]="period.status === 'PENDIENTE' ? 'Calcular' : 'Recalcular'"
              icon="pi pi-calculator"
              [severity]="period.status === 'PENDIENTE' ? 'success' : 'warn'"
              size="small"
              rounded
              [loading]="calculatingPeriod() === period.number"
              (click)="calculatePeriod(period.number)"
            />
            @if (period.rows.length > 0) {
              <p-button
                label="Ver Detalle"
                icon="pi pi-eye"
                severity="info"
                size="small"
                rounded
                outlined
                (click)="openDetail(period.number)"
              />
            }
            @if (period.status === 'CALCULADO') {
              <p-button
                label="Marcar Pagado"
                icon="pi pi-check-circle"
                severity="contrast"
                size="small"
                rounded
                outlined
                (click)="markAsPaid(period.number)"
              />
            }
          </div>
        </div>
      }
    </div>

    <!-- Summary Card -->
    <div class="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-white m-0">
            Resumen Anual {{ selectedYear() }}
          </h3>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Total acumulado de los 3 cuatrimestres
          </p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-amber-400">
            {{ yearTotal() | currency:'USD':'symbol':'1.2-2' }}
          </div>
          <div class="text-sm text-gray-400">
            {{ yearEmployeeCount() }} empleados
          </div>
        </div>
        <p-button
          label="Exportar PDF"
          icon="pi pi-file-pdf"
          severity="help"
          rounded
          outlined
          (click)="exportPdf()"
        />
      </div>
    </div>

    <!-- Detail Dialog -->
    <p-dialog
      [(visible)]="detailDialogVisible"
      [header]="detailDialogTitle()"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1100px' }"
      [dismissableMask]="true"
      [closeOnEscape]="true"
    >
      @if (detailPeriodRows().length > 0) {
        <p-table
          [value]="detailPeriodRows()"
          [paginator]="detailPeriodRows().length > 15"
          [rows]="15"
          [rowsPerPageOptions]="[15, 30, 50]"
          showCurrentPageReport
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
          [sortField]="'employee_name'"
          [sortOrder]="1"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="employee_name">
                Empleado
                <p-sortIcon field="employee_name" />
              </th>
              <th pSortableColumn="document_id">
                Documento
                <p-sortIcon field="document_id" />
              </th>
              <th pSortableColumn="branch_name">
                Sucursal
                <p-sortIcon field="branch_name" />
              </th>
              <th pSortableColumn="earnings_total" class="text-right">
                Devengado
                <p-sortIcon field="earnings_total" />
              </th>
              <th pSortableColumn="decimo_amount" class="text-right">
                Decimo
                <p-sortIcon field="decimo_amount" />
              </th>
              <th>Estado</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-medium">{{ row.employee_name }}</td>
              <td>{{ row.document_id }}</td>
              <td>{{ row.branch_name }}</td>
              <td class="text-right">{{ row.earnings_total | currency:'USD':'symbol':'1.2-2' }}</td>
              <td class="text-right font-semibold text-amber-400">
                {{ row.decimo_amount | currency:'USD':'symbol':'1.2-2' }}
              </td>
              <td>
                <p-tag
                  [value]="getStatusLabel(row.status)"
                  [severity]="getStatusSeverity(row.status)"
                  rounded
                />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="footer">
            <tr>
              <td colspan="3" class="font-bold text-right">TOTAL</td>
              <td class="text-right font-bold">
                {{ detailEarningsTotal() | currency:'USD':'symbol':'1.2-2' }}
              </td>
              <td class="text-right font-bold text-amber-400">
                {{ detailDecimoTotal() | currency:'USD':'symbol':'1.2-2' }}
              </td>
              <td></td>
            </tr>
          </ng-template>
        </p-table>
      } @else {
        <div class="text-center text-gray-400 py-12">
          <i class="pi pi-info-circle text-4xl mb-3 block"></i>
          <p class="m-0">No hay datos calculados para este periodo.</p>
          <p class="m-0 text-sm mt-1">Presione "Calcular" en la tarjeta del periodo.</p>
        </div>
      }
    </p-dialog>

    <!-- Loading overlay -->
    @if (calculatingPeriod() !== null) {
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-gray-800 rounded-xl p-8 flex flex-col items-center gap-4">
          <p-progressSpinner
            strokeWidth="4"
            [style]="{ width: '50px', height: '50px' }"
          />
          <span class="text-white text-sm">Calculando decimo tercer mes...</span>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 1.5rem;
    }
  `,
})
export class PayrollDecimoComponent {
  // ---------------------------------------------------------------------------
  // Injected services
  // ---------------------------------------------------------------------------
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly orgService = inject(OrganizationService);

  // ---------------------------------------------------------------------------
  // State signals
  // ---------------------------------------------------------------------------
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly decimoRecords = signal<DecimoRecord[]>([]);
  readonly calculatingPeriod = signal<1 | 2 | 3 | null>(null);
  readonly detailDialogVisible = signal<boolean>(false);
  readonly activePeriodNumber = signal<1 | 2 | 3>(1);

  // ---------------------------------------------------------------------------
  // Year selector options
  // ---------------------------------------------------------------------------
  readonly yearOptions = computed(() => {
    const current = new Date().getFullYear();
    const years: { label: string; value: number }[] = [];
    for (let y = current + 1; y >= current - 5; y--) {
      years.push({ label: String(y), value: y });
    }
    return years;
  });

  // ---------------------------------------------------------------------------
  // Period computation helpers
  // ---------------------------------------------------------------------------
  private getPeriodDates(period: PeriodConfig, year: number) {
    // Period 1 starts in December of the previous year
    const startYear = period.number === 1 ? year - 1 : year;
    const startDate = new Date(startYear, period.startMonth - 1, period.startDay);
    const endDate = new Date(year, period.endMonth - 1, period.endDay);
    const deadline = new Date(year, period.deadlineMonth - 1, period.deadlineDay);
    return { startDate, endDate, deadline };
  }

  readonly periodsForYear = computed(() => {
    const year = this.selectedYear();
    const records = this.decimoRecords();

    return PERIODS.map((p) => {
      const dates = this.getPeriodDates(p, year);
      const periodRecords = records.filter(
        (r) => r.year === year && r.period_number === p.number
      );

      const rows: DecimoRow[] = periodRecords.map((r) => ({
        employee_id: r.employee_id,
        employee_name: '', // will be enriched on load
        document_id: '',
        branch_name: '',
        earnings_total: r.earnings_total,
        decimo_amount: r.decimo_amount,
        status: r.status,
      }));

      const total = periodRecords.reduce((s, r) => s + r.decimo_amount, 0);

      let status: DecimoStatus = 'PENDIENTE';
      if (periodRecords.length > 0) {
        const allPaid = periodRecords.every((r) => r.status === 'PAGADO');
        status = allPaid ? 'PAGADO' : 'CALCULADO';
      }

      return {
        ...p,
        ...dates,
        rows,
        total,
        status,
      };
    });
  });

  readonly yearTotal = computed(() =>
    this.periodsForYear().reduce((s, p) => s + p.total, 0)
  );

  readonly yearEmployeeCount = computed(() => {
    const ids = new Set<string>();
    for (const p of this.periodsForYear()) {
      for (const r of p.rows) {
        ids.add(r.employee_id);
      }
    }
    return ids.size;
  });

  // ---------------------------------------------------------------------------
  // Detail dialog computeds
  // ---------------------------------------------------------------------------
  readonly detailDialogTitle = computed(() => {
    const p = PERIODS.find((x) => x.number === this.activePeriodNumber());
    return `${p?.label ?? ''} - Detalle Decimo ${this.selectedYear()}`;
  });

  readonly detailPeriodRows = signal<DecimoRow[]>([]);

  readonly detailEarningsTotal = computed(() =>
    this.detailPeriodRows().reduce((s, r) => s + r.earnings_total, 0)
  );

  readonly detailDecimoTotal = computed(() =>
    this.detailPeriodRows().reduce((s, r) => s + r.decimo_amount, 0)
  );

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  constructor() {
    // Reload décimo records whenever the year changes
    effect(() => {
      const year = this.selectedYear();
      void this.loadDecimoRecords(year);
    });
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  private async loadDecimoRecords(year: number): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    try {
      const url = this.apiUrl.build('rest/v1/decimo_tercer_mes', {
        select: '*',
        company_id: `eq.${companyId}`,
        year: `eq.${year}`,
        order: 'period_number.asc,created_at.asc',
      });
      const records = await firstValueFrom(this.http.get<DecimoRecord[]>(url));
      this.decimoRecords.set(records ?? []);
    } catch {
      this.decimoRecords.set([]);
    }
  }

  // ---------------------------------------------------------------------------
  // Calculate period
  // ---------------------------------------------------------------------------
  async calculatePeriod(periodNumber: 1 | 2 | 3): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    this.calculatingPeriod.set(periodNumber);

    try {
      const year = this.selectedYear();
      const periodConfig = PERIODS.find((p) => p.number === periodNumber)!;
      const { startDate, endDate } = this.getPeriodDates(periodConfig, year);

      const startStr = this.toIsoDate(startDate);
      const endStr = this.toIsoDate(endDate);

      // 1. Fetch all payroll_payment_employees in the date range
      //    Join through payroll_payments to get the date range filter
      const payUrl = this.apiUrl.build('rest/v1/payroll_payment_employees', {
        select: 'id,employee_id,income_amount,overtime_amount,sunday_amount,holiday_amount,employee:employees(id,first_name,father_name,document_id,payroll_type,branch:branches(id,name))',
        'payroll_payment.start_date': `gte.${startStr}`,
        'payroll_payment.end_date': `lte.${endStr}`,
        'employee.payroll_type': 'eq.regular',
      });

      // Use an RPC-style approach: fetch payments in range first, then employees
      const paymentsUrl = this.apiUrl.build('rest/v1/payroll_payments', {
        select: 'id',
        start_date: `gte.${startStr}`,
        end_date: `lte.${endStr}`,
      });

      const payments = await firstValueFrom(
        this.http.get<{ id: string }[]>(paymentsUrl)
      );

      if (!payments || payments.length === 0) {
        this.calculatingPeriod.set(null);
        return;
      }

      const paymentIds = payments.map((p) => p.id);

      // Fetch employees for these payments
      const empUrl = this.apiUrl.build('rest/v1/payroll_payment_employees', {
        select: 'id,employee_id,income_amount,overtime_amount,sunday_amount,holiday_amount,employee:employees(id,first_name,father_name,document_id,payroll_type,branch:branches(id,name))',
        payroll_payment_id: `in.(${paymentIds.join(',')})`,
        'employee.payroll_type': 'eq.regular',
      });

      const empRecords = await firstValueFrom(
        this.http.get<any[]>(empUrl)
      );

      if (!empRecords || empRecords.length === 0) {
        this.calculatingPeriod.set(null);
        return;
      }

      // 2. Aggregate by employee
      const byEmployee = new Map<string, {
        employee_id: string;
        employee_name: string;
        document_id: string;
        branch_name: string;
        earnings_total: number;
      }>();

      for (const rec of empRecords) {
        const empId = rec.employee_id;
        const existing = byEmployee.get(empId);
        // Earnings = income_amount solo (ya incluye extras, no sumar por separado — evita doble conteo)
        const periodEarnings = rec.income_amount ?? 0;

        if (existing) {
          existing.earnings_total += periodEarnings;
        } else {
          const emp = rec.employee ?? {};
          byEmployee.set(empId, {
            employee_id: empId,
            employee_name: `${emp.first_name ?? ''} ${emp.father_name ?? ''}`.trim(),
            document_id: emp.document_id ?? '',
            branch_name: emp.branch?.name ?? 'N/A',
            earnings_total: periodEarnings,
          });
        }
      }

      // 3. Build décimo records (earnings / 3)
      const newRecords: Omit<DecimoRecord, 'id' | 'created_at'>[] = [];
      for (const data of byEmployee.values()) {
        const decimoAmount = Math.round((data.earnings_total / 3) * 100) / 100;
        newRecords.push({
          company_id: companyId,
          year,
          period_number: periodNumber,
          employee_id: data.employee_id,
          earnings_total: Math.round(data.earnings_total * 100) / 100,
          decimo_amount: decimoAmount,
          status: 'CALCULADO',
        });
      }

      // 4. Delete existing records for this period/year/company
      const deleteUrl = this.apiUrl.build('rest/v1/decimo_tercer_mes', {
        company_id: `eq.${companyId}`,
        year: `eq.${year}`,
        period_number: `eq.${periodNumber}`,
      });
      await firstValueFrom(this.http.delete(deleteUrl));

      // 5. Insert new records
      if (newRecords.length > 0) {
        const insertUrl = this.apiUrl.build('rest/v1/decimo_tercer_mes');
        await firstValueFrom(this.http.post(insertUrl, newRecords));
      }

      // 6. Reload
      await this.loadDecimoRecords(year);
    } catch (err) {
      console.error('Error calculating decimo:', err);
    } finally {
      this.calculatingPeriod.set(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Mark period as paid
  // ---------------------------------------------------------------------------
  async markAsPaid(periodNumber: 1 | 2 | 3): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    const year = this.selectedYear();
    const url = this.apiUrl.build('rest/v1/decimo_tercer_mes', {
      company_id: `eq.${companyId}`,
      year: `eq.${year}`,
      period_number: `eq.${periodNumber}`,
    });

    try {
      await firstValueFrom(
        this.http.patch(url, { status: 'PAGADO' })
      );
      await this.loadDecimoRecords(year);
    } catch (err) {
      console.error('Error marking decimo as paid:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Open detail dialog
  // ---------------------------------------------------------------------------
  async openDetail(periodNumber: 1 | 2 | 3): Promise<void> {
    this.activePeriodNumber.set(periodNumber);

    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    const year = this.selectedYear();

    try {
      // Fetch décimo records with employee join
      const url = this.apiUrl.build('rest/v1/decimo_tercer_mes', {
        select: '*, employee:employees(id,first_name,father_name,document_id,branch:branches(id,name))',
        company_id: `eq.${companyId}`,
        year: `eq.${year}`,
        period_number: `eq.${periodNumber}`,
        order: 'decimo_amount.desc',
      });

      const records = await firstValueFrom(this.http.get<any[]>(url));

      const rows: DecimoRow[] = (records ?? []).map((r: any) => ({
        employee_id: r.employee_id,
        employee_name: `${r.employee?.first_name ?? ''} ${r.employee?.father_name ?? ''}`.trim(),
        document_id: r.employee?.document_id ?? '',
        branch_name: r.employee?.branch?.name ?? 'N/A',
        earnings_total: r.earnings_total,
        decimo_amount: r.decimo_amount,
        status: r.status,
      }));

      this.detailPeriodRows.set(rows);
      this.detailDialogVisible.set(true);
    } catch (err) {
      console.error('Error loading detail:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Export PDF (placeholder - uses pdfmake pattern from PayrollSummary)
  // ---------------------------------------------------------------------------
  async exportPdf(): Promise<void> {
    const year = this.selectedYear();
    const periods = this.periodsForYear();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    // Load all detail rows for all periods
    const allRows: { periodLabel: string; rows: DecimoRow[]; total: number }[] = [];
    for (const period of PERIODS) {
      try {
        const url = this.apiUrl.build('rest/v1/decimo_tercer_mes', {
          select: '*, employee:employees(id,first_name,father_name,document_id,branch:branches(id,name))',
          company_id: `eq.${companyId}`,
          year: `eq.${year}`,
          period_number: `eq.${period.number}`,
          order: 'decimo_amount.desc',
        });
        const records = await firstValueFrom(this.http.get<any[]>(url));
        const rows: DecimoRow[] = (records ?? []).map((r: any) => ({
          employee_id: r.employee_id,
          employee_name: `${r.employee?.first_name ?? ''} ${r.employee?.father_name ?? ''}`.trim(),
          document_id: r.employee?.document_id ?? '',
          branch_name: r.employee?.branch?.name ?? 'N/A',
          earnings_total: r.earnings_total,
          decimo_amount: r.decimo_amount,
          status: r.status,
        }));
        allRows.push({
          periodLabel: period.label,
          rows,
          total: rows.reduce((s, r) => s + r.decimo_amount, 0),
        });
      } catch {
        allRows.push({ periodLabel: period.label, rows: [], total: 0 });
      }
    }

    const companyName = this.orgService.isNaz() ? 'Naz' : 'BO Capital, S.A.';
    const grandTotal = allRows.reduce((s, p) => s + p.total, 0);

    const pdfMake = await import('pdfmake/build/pdfmake.js');
    const pdfFonts = await import('pdfmake/build/vfs_fonts.js');

    const content: any[] = [
      { text: companyName, style: 'header', alignment: 'center', margin: [0, 0, 0, 4] },
      { text: `Decimo Tercer Mes - ${year}`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 4] },
      {
        text: `Total Anual: ${grandTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        alignment: 'center',
        margin: [0, 0, 0, 16],
        fontSize: 11,
        bold: true,
      },
    ];

    for (const periodData of allRows) {
      if (periodData.rows.length === 0) continue;

      content.push({
        text: `${periodData.periodLabel} - Total: ${periodData.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        style: 'periodTitle',
        margin: [0, 12, 0, 6],
      });

      const tableBody = [
        [
          { text: 'Empleado', bold: true, fontSize: 8 },
          { text: 'Documento', bold: true, fontSize: 8 },
          { text: 'Sucursal', bold: true, fontSize: 8 },
          { text: 'Devengado', bold: true, fontSize: 8, alignment: 'right' },
          { text: 'Decimo', bold: true, fontSize: 8, alignment: 'right' },
        ],
        ...periodData.rows.map((r) => [
          { text: r.employee_name, fontSize: 7 },
          { text: r.document_id, fontSize: 7 },
          { text: r.branch_name, fontSize: 7 },
          { text: r.earnings_total.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), fontSize: 7, alignment: 'right' },
          { text: r.decimo_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), fontSize: 7, alignment: 'right' },
        ]),
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody,
        },
        layout: 'lightHorizontalLines',
      });
    }

    const docDefinition: any = {
      pageSize: 'LEGAL',
      pageOrientation: 'portrait',
      content,
      styles: {
        header: { fontSize: 14, bold: true },
        subheader: { fontSize: 12, bold: true },
        periodTitle: { fontSize: 10, bold: true },
      },
    };

    pdfMake
      .createPdf(
        docDefinition,
        {},
        {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-Italic.ttf',
          },
        },
        pdfFonts.default
      )
      .download(`Decimo_Tercer_Mes_${year}.pdf`);
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  getStatusLabel(status: DecimoStatus): string {
    return STATUS_CONFIG[status]?.label ?? status;
  }

  getStatusSeverity(status: DecimoStatus): 'secondary' | 'info' | 'success' {
    return STATUS_CONFIG[status]?.severity ?? 'secondary';
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
