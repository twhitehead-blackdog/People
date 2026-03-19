import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DeviceService } from '../services/device.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { VacationPaymentService } from '../services/vacation-payment.service';
import type { VacationPayment, Employee } from '../models';
import {
  calculateVacationAccrual,
  calculateDailyRate,
  calculateVacationPayment,
} from '../utils/vacation-calculation.utils';

type VacPayStatus = 'PENDING' | 'CALCULATED' | 'APPROVED' | 'PAID';

const STATUS_CONFIG: Record<VacPayStatus, { label: string; severity: 'secondary' | 'info' | 'success' | 'warn' }> = {
  PENDING:    { label: 'Pendiente',  severity: 'warn' },
  CALCULATED: { label: 'Calculado',  severity: 'info' },
  APPROVED:   { label: 'Aprobado',   severity: 'success' },
  PAID:       { label: 'Pagado',     severity: 'success' },
};

@Component({
  selector: 'pt-payroll-vacations',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, FormsModule,
    Button, Card, Select, TableModule, Tag, Dialog,
    InputNumber, InputText, Textarea, ProgressSpinner,
    ConfirmDialog, Toast,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white m-0">Planilla de Vacaciones</h1>
        @if (device.isDesktop()) {
          <p class="text-sm text-gray-400 m-0 mt-1">
            Calculo y pago de vacaciones — 30 dias por cada 11 meses (Art. 54 CT)
          </p>
        }
      </div>
      <p-button
        [label]="device.isDesktop() ? 'Nuevo Pago' : ''"
        icon="pi pi-plus-circle"
        rounded
        (click)="openForm()"
      />
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-3 md:p-4">
        <div class="text-xs md:text-sm text-gray-400">Total</div>
        <div class="text-xl md:text-2xl font-bold text-white">{{ payments().length }}</div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-3 md:p-4">
        <div class="text-xs md:text-sm text-gray-400">Pendientes</div>
        <div class="text-xl md:text-2xl font-bold text-amber-400">{{ pendingCount() }}</div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-3 md:p-4">
        <div class="text-xs md:text-sm text-gray-400">Aprobados</div>
        <div class="text-xl md:text-2xl font-bold text-green-400">{{ approvedCount() }}</div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-3 md:p-4">
        <div class="text-xs md:text-sm text-gray-400">Pagado</div>
        <div class="text-xl md:text-2xl font-bold text-amber-400">{{ totalPaid() | currency:'USD':'symbol':'1.2-2' }}</div>
      </div>
    </div>

    @if (device.isDesktop()) {
    <!-- Desktop Table -->
    <div class="bg-gray-800 border border-gray-700 rounded-xl">
      <p-table
        [value]="payments()"
        [paginator]="payments().length > 10"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        showCurrentPageReport
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
        [sortField]="'created_at'"
        [sortOrder]="-1"
        styleClass="p-datatable-sm"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="employee_name">Empleado <p-sortIcon field="employee_name" /></th>
            <th pSortableColumn="months_worked">Meses <p-sortIcon field="months_worked" /></th>
            <th class="text-right" pSortableColumn="accrued_days">Acumulados <p-sortIcon field="accrued_days" /></th>
            <th class="text-right" pSortableColumn="used_days">Usados <p-sortIcon field="used_days" /></th>
            <th class="text-right" pSortableColumn="days_to_pay">A Pagar <p-sortIcon field="days_to_pay" /></th>
            <th class="text-right" pSortableColumn="total_amount">Monto <p-sortIcon field="total_amount" /></th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-medium">
              {{ row.employee?.first_name }} {{ row.employee?.father_name }}
            </td>
            <td>{{ row.months_worked }}</td>
            <td class="text-right">{{ row.accrued_days }}</td>
            <td class="text-right">{{ row.used_days }}</td>
            <td class="text-right font-semibold">{{ row.days_to_pay }}</td>
            <td class="text-right font-semibold text-amber-400">{{ row.total_amount | currency:'USD':'symbol':'1.2-2' }}</td>
            <td>
              <p-tag [value]="getStatusLabel(row.status)" [severity]="getStatusSeverity(row.status)" rounded />
            </td>
            <td>
              <div class="flex gap-1">
                @if (row.status === 'PENDING' || row.status === 'CALCULATED') {
                  <p-button icon="pi pi-check" severity="success" size="small" rounded outlined
                    pTooltip="Aprobar" (click)="approve(row)" />
                }
                @if (row.status === 'APPROVED') {
                  <p-button icon="pi pi-dollar" severity="info" size="small" rounded outlined
                    pTooltip="Marcar Pagado" (click)="markPaid(row)" />
                }
                <p-button icon="pi pi-file-pdf" severity="help" size="small" rounded outlined
                  pTooltip="Exportar PDF" (click)="exportPdf(row)" />
                @if (row.status === 'PENDING') {
                  <p-button icon="pi pi-trash" severity="danger" size="small" rounded outlined
                    pTooltip="Eliminar" (click)="confirmDelete(row)" />
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center text-gray-400 py-8">
              <i class="pi pi-info-circle text-3xl mb-2 block"></i>
              No hay pagos de vacaciones registrados.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
    } @else {
    <!-- Mobile card view -->
    @if (payments().length === 0) {
      <div class="flex flex-col items-center justify-center py-8 text-gray-400">
        <i class="pi pi-info-circle text-3xl mb-2"></i>
        <p class="text-sm">No hay pagos de vacaciones registrados</p>
      </div>
    } @else {
      <div class="mobile-card-list">
        @for (row of payments(); track row.id) {
          <div class="mobile-card-item" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="mobile-card-item__avatar">
                <i class="pi pi-sun"></i>
              </div>
              <div class="mobile-card-item__body">
                <div class="mobile-card-item__title">{{ row.employee?.first_name }} {{ row.employee?.father_name }}</div>
                <div class="mobile-card-item__subtitle">{{ row.days_to_pay }} dias &middot; {{ row.months_worked }} meses</div>
                <div class="mobile-card-item__meta">
                  <span class="mobile-card-item__tag"
                    [class.mobile-card-item__tag--warning]="row.status === 'PENDING'"
                    [class.mobile-card-item__tag--info]="row.status === 'CALCULATED'"
                    [class.mobile-card-item__tag--success]="row.status === 'APPROVED' || row.status === 'PAID'"
                  >{{ getStatusLabel(row.status) }}</span>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 0.9375rem; font-weight: 700; color: #fbbf24;">{{ row.total_amount | currency:'USD':'symbol':'1.2-2' }}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.375rem; border-top: 1px solid rgba(255,255,255,0.06);">
              <div style="display: flex; gap: 0.75rem; font-size: 0.6875rem; color: #a1a1aa;">
                <span>Acum: {{ row.accrued_days }}d</span>
                <span>Usados: {{ row.used_days }}d</span>
              </div>
              <div style="display: flex; gap: 0.25rem;">
                @if (row.status === 'PENDING' || row.status === 'CALCULATED') {
                  <p-button icon="pi pi-check" severity="success" text rounded size="small" (click)="approve(row)" />
                }
                @if (row.status === 'APPROVED') {
                  <p-button icon="pi pi-dollar" severity="info" text rounded size="small" (click)="markPaid(row)" />
                }
                <p-button icon="pi pi-file-pdf" severity="help" text rounded size="small" (click)="exportPdf(row)" />
                @if (row.status === 'PENDING') {
                  <p-button icon="pi pi-trash" severity="danger" text rounded size="small" (click)="confirmDelete(row)" />
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
    }

    <!-- Form Dialog -->
    <p-dialog
      [(visible)]="formVisible"
      header="Nuevo Pago de Vacaciones"
      [modal]="true"
      [style]="{ width: device.isDesktop() ? '600px' : '95vw' }"
      [dismissableMask]="true"
    >
      <div class="space-y-4">
        <!-- Employee Select -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
          <p-select
            [options]="employees()"
            [(ngModel)]="selectedEmployeeId"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccionar empleado"
            [filter]="true"
            filterBy="label"
            class="w-full"
            (onChange)="onEmployeeSelected()"
          />
        </div>

        @if (calculationResult()) {
          <!-- Calculation Summary -->
          <div class="bg-gray-700/50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Fecha de ingreso:</span>
              <span class="text-white">{{ calculationResult()!.hireDate }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Meses trabajados:</span>
              <span class="text-white">{{ calculationResult()!.monthsWorked }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Dias acumulados:</span>
              <span class="text-white font-semibold">{{ calculationResult()!.accruedDays }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Dias usados:</span>
              <span class="text-white">{{ calculationResult()!.usedDays }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Dias disponibles:</span>
              <span class="text-amber-400 font-bold">{{ calculationResult()!.availableDays }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-400">Tasa diaria:</span>
              <span class="text-white">{{ calculationResult()!.dailyRate | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>
          </div>

          <!-- Days to pay -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Dias a pagar</label>
            <p-inputNumber
              [(ngModel)]="daysToPay"
              [min]="0"
              [max]="calculationResult()!.availableDays"
              [maxFractionDigits]="2"
              class="w-full"
              (onInput)="recalculateTotal()"
            />
          </div>

          <!-- Total -->
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-300 font-medium">Total a pagar:</span>
              <span class="text-2xl font-bold text-amber-400">
                {{ totalToPay() | currency:'USD':'symbol':'1.2-2' }}
              </span>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Notas (opcional)</label>
            <textarea pTextarea [(ngModel)]="formNotes" rows="2" class="w-full"></textarea>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Cancelar" severity="secondary" outlined rounded (click)="formVisible.set(false)" />
          <p-button
            label="Guardar"
            icon="pi pi-save"
            rounded
            [disabled]="!canSave()"
            [loading]="saving()"
            (click)="save()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
    <p-toast />

    @if (vacPayService.isLoading()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '50px', height: '50px' }" />
      </div>
    }
  `,
  styles: `
    :host { display: block; padding: 1.5rem; }
  `,
})
export class PayrollVacationsComponent {
  readonly device = inject(DeviceService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly orgService = inject(OrganizationService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly vacPayService = inject(VacationPaymentService);

  // State
  readonly formVisible = signal(false);
  readonly saving = signal(false);
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly daysToPay = signal<number>(0);
  readonly formNotes = signal('');
  readonly employeeList = signal<Partial<Employee>[]>([]);
  readonly calculationResult = signal<{
    hireDate: string;
    monthsWorked: number;
    accruedDays: number;
    usedDays: number;
    availableDays: number;
    dailyRate: number;
    monthlySalary: number;
  } | null>(null);

  // Computed
  readonly payments = computed(() => this.vacPayService.value());
  readonly pendingCount = computed(() => this.payments().filter(p => p.status === 'PENDING' || p.status === 'CALCULATED').length);
  readonly approvedCount = computed(() => this.payments().filter(p => p.status === 'APPROVED').length);
  readonly totalPaid = computed(() => this.payments().filter(p => p.status === 'PAID').reduce((s, p) => s + p.total_amount, 0));
  readonly totalToPay = computed(() => {
    const calc = this.calculationResult();
    if (!calc) return 0;
    return calculateVacationPayment(this.daysToPay(), calc.dailyRate);
  });
  readonly canSave = computed(() => this.calculationResult() !== null && this.daysToPay() > 0);

  readonly employees = computed(() => {
    return this.employeeList().map(e => ({
      label: `${e.first_name} ${e.father_name} (${e.document_id})`,
      value: e.id!,
    }));
  });

  constructor() {
    this.loadEmployees();
  }

  private async loadEmployees(): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    const url = this.apiUrl.build('rest/v1/employees', {
      select: 'id,first_name,father_name,document_id,start_date,monthly_salary',
      company_id: `eq.${companyId}`,
      is_active: 'eq.true',
      payroll_type: 'eq.regular',
      order: 'first_name.asc',
    });
    const result = await firstValueFrom(this.http.get<Partial<Employee>[]>(url));
    this.employeeList.set(result ?? []);
  }

  openForm(): void {
    this.selectedEmployeeId.set(null);
    this.calculationResult.set(null);
    this.daysToPay.set(0);
    this.formNotes.set('');
    this.formVisible.set(true);
  }

  async onEmployeeSelected(): Promise<void> {
    const empId = this.selectedEmployeeId();
    if (!empId) {
      this.calculationResult.set(null);
      return;
    }

    const emp = this.employeeList().find(e => e.id === empId);
    if (!emp?.start_date || !emp?.monthly_salary) return;

    const usedDays = await this.vacPayService.getUsedVacationDays(empId);
    const accrual = calculateVacationAccrual(emp.start_date, new Date());
    const dailyRate = calculateDailyRate(emp.monthly_salary);
    const availableDays = Math.max(0, accrual.totalDays - usedDays);

    this.calculationResult.set({
      hireDate: new Date(emp.start_date as any).toLocaleDateString('es-PA'),
      monthsWorked: accrual.monthsWorked,
      accruedDays: accrual.accruedDays,
      usedDays,
      availableDays: Math.round(availableDays * 100) / 100,
      dailyRate,
      monthlySalary: emp.monthly_salary,
    });
    this.daysToPay.set(availableDays);
  }

  recalculateTotal(): void {
    // totalToPay is a computed, just triggers re-read
  }

  async save(): Promise<void> {
    const empId = this.selectedEmployeeId();
    const calc = this.calculationResult();
    if (!empId || !calc) return;

    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    this.saving.set(true);
    try {
      const emp = this.employeeList().find(e => e.id === empId);
      await this.vacPayService.create({
        company_id: companyId,
        employee_id: empId,
        hire_date: String(emp?.start_date ?? ''),
        calculation_date: new Date().toISOString().split('T')[0],
        months_worked: calc.monthsWorked,
        accrued_days: calc.accruedDays,
        used_days: calc.usedDays,
        days_to_pay: this.daysToPay(),
        daily_rate: calc.dailyRate,
        monthly_salary: calc.monthlySalary,
        total_amount: this.totalToPay(),
        status: 'CALCULATED',
        notes: this.formNotes() || undefined,
      });
      this.formVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Pago de vacaciones registrado' });
    } catch (err) {
      console.error('Error saving vacation payment:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el pago' });
    } finally {
      this.saving.set(false);
    }
  }

  async approve(payment: VacationPayment): Promise<void> {
    try {
      await this.vacPayService.update(payment.id, {
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
      });
      this.messageService.add({ severity: 'success', summary: 'Aprobado', detail: 'Pago aprobado correctamente' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo aprobar' });
    }
  }

  async markPaid(payment: VacationPayment): Promise<void> {
    try {
      await this.vacPayService.update(payment.id, {
        status: 'PAID',
        paid_date: new Date().toISOString().split('T')[0],
      });
      this.messageService.add({ severity: 'success', summary: 'Pagado', detail: 'Marcado como pagado' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
    }
  }

  confirmDelete(payment: VacationPayment): void {
    this.confirmService.confirm({
      message: 'Estas seguro de eliminar este registro?',
      header: 'Confirmar Eliminacion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deletePayment(payment),
    });
  }

  private async deletePayment(payment: VacationPayment): Promise<void> {
    try {
      await this.vacPayService.delete(payment.id);
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro eliminado' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    }
  }

  async exportPdf(payment: VacationPayment): Promise<void> {
    const pdfMake = await import('pdfmake/build/pdfmake.js');
    const pdfFonts = await import('pdfmake/build/vfs_fonts.js');

    const companyName = this.orgService.isNaz() ? 'Naz' : 'BO Capital, S.A.';
    const empName = payment.employee
      ? `${payment.employee.first_name} ${payment.employee.father_name}`
      : 'N/A';

    const docDefinition: any = {
      pageSize: 'LETTER',
      content: [
        { text: companyName, style: 'header', alignment: 'center', margin: [0, 0, 0, 4] },
        { text: 'COMPROBANTE DE PAGO DE VACACIONES', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'Empleado:', bold: true }, empName],
              [{ text: 'Fecha de ingreso:', bold: true }, payment.hire_date?.toString() ?? ''],
              [{ text: 'Fecha de calculo:', bold: true }, payment.calculation_date?.toString() ?? ''],
              [{ text: 'Salario mensual:', bold: true }, `$${payment.monthly_salary.toFixed(2)}`],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Concepto', bold: true }, { text: 'Valor', bold: true, alignment: 'right' }],
              ['Meses trabajados', { text: String(payment.months_worked), alignment: 'right' }],
              ['Dias acumulados', { text: String(payment.accrued_days), alignment: 'right' }],
              ['Dias usados', { text: String(payment.used_days), alignment: 'right' }],
              ['Dias a pagar', { text: String(payment.days_to_pay), alignment: 'right' }],
              ['Tasa diaria', { text: `$${payment.daily_rate.toFixed(2)}`, alignment: 'right' }],
              [
                { text: 'TOTAL A PAGAR', bold: true, fontSize: 12 },
                { text: `$${payment.total_amount.toFixed(2)}`, bold: true, fontSize: 12, alignment: 'right' },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 40],
        },
        {
          columns: [
            { text: '____________________\nFirma Empleado', alignment: 'center' },
            { text: '____________________\nFirma Empresa', alignment: 'center' },
          ],
          margin: [0, 40, 0, 0],
        },
      ],
      styles: {
        header: { fontSize: 14, bold: true },
        subheader: { fontSize: 11, bold: true },
      },
    };

    pdfMake
      .createPdf(docDefinition, {}, {
        Roboto: {
          normal: 'Roboto-Regular.ttf',
          bold: 'Roboto-Medium.ttf',
          italics: 'Roboto-Italic.ttf',
          bolditalics: 'Roboto-Italic.ttf',
        },
      }, pdfFonts.vfs)
      .download(`Vacaciones_${empName.replace(/\s/g, '_')}.pdf`);
  }

  getStatusLabel(status: VacPayStatus): string {
    return STATUS_CONFIG[status]?.label ?? status;
  }

  getStatusSeverity(status: VacPayStatus): 'secondary' | 'info' | 'success' | 'warn' {
    return STATUS_CONFIG[status]?.severity ?? 'secondary';
  }
}
