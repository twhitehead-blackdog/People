import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ProgressSpinner } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { LiquidationService } from '../services/liquidation.service';
import { OrganizationService } from '../services/organization.service';
import type { EmployeeLiquidation, LiquidationStatus } from '../models';
import { TERMINATION_TYPE_OPTIONS } from '../models';

const STATUS_CONFIG: Record<LiquidationStatus, { label: string; severity: 'secondary' | 'info' | 'success' | 'warn' }> = {
  DRAFT:      { label: 'Borrador',   severity: 'secondary' },
  CALCULATED: { label: 'Calculado',  severity: 'info' },
  APPROVED:   { label: 'Aprobado',   severity: 'success' },
  PAID:       { label: 'Pagado',     severity: 'success' },
};

@Component({
  selector: 'pt-payroll-liquidation-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, Button, Tag, Toast, ProgressSpinner],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <p-button icon="pi pi-arrow-left" severity="secondary" rounded outlined (click)="goBack()" />
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-white m-0">Detalle de Liquidacion</h1>
          @if (liquidation()) {
            <p class="text-sm text-gray-400 m-0 mt-1">{{ liquidation()!.employee_name }}</p>
          }
        </div>
        @if (liquidation()) {
          <p-tag [value]="getStatusLabel(liquidation()!.status)" [severity]="getStatusSeverity(liquidation()!.status)" rounded />
        }
      </div>

      @if (loading()) {
        <div class="flex justify-center py-20">
          <p-progressSpinner strokeWidth="4" [style]="{ width: '50px', height: '50px' }" />
        </div>
      } @else if (liquidation()) {
        <!-- Employee Data -->
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 class="text-lg font-semibold text-white mb-4"><i class="pi pi-user mr-2"></i>Datos del Empleado</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span class="text-gray-400">Nombre:</span><div class="text-white font-medium">{{ liquidation()!.employee_name }}</div></div>
            <div><span class="text-gray-400">Cedula:</span><div class="text-white">{{ liquidation()!.document_id }}</div></div>
            <div><span class="text-gray-400">Fecha ingreso:</span><div class="text-white">{{ liquidation()!.hire_date | date:'dd/MM/yyyy' }}</div></div>
            <div><span class="text-gray-400">Fecha terminacion:</span><div class="text-white">{{ liquidation()!.termination_date | date:'dd/MM/yyyy' }}</div></div>
            <div><span class="text-gray-400">Salario:</span><div class="text-white">{{ liquidation()!.monthly_salary | currency:'USD':'symbol':'1.2-2' }}</div></div>
            <div><span class="text-gray-400">Tipo terminacion:</span><div class="text-white">{{ getTerminationLabel(liquidation()!.termination_type) }}</div></div>
            <div><span class="text-gray-400">Posicion:</span><div class="text-white">{{ liquidation()!.position ?? 'N/A' }}</div></div>
            <div><span class="text-gray-400">Sucursal:</span><div class="text-white">{{ liquidation()!.branch ?? 'N/A' }}</div></div>
            <div><span class="text-gray-400">Contrato:</span><div class="text-white">{{ liquidation()!.contract_type }}</div></div>
          </div>
        </div>

        <!-- Breakdown -->
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 class="text-lg font-semibold text-white mb-4"><i class="pi pi-calculator mr-2"></i>Desglose</h2>

          <div class="space-y-3">
            <div class="text-sm font-semibold text-gray-400 uppercase">Ingresos</div>

            @if (liquidation()!.pending_salary > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Salario pendiente ({{ liquidation()!.pending_salary_days }} dias)</span>
                <span class="text-white">{{ liquidation()!.pending_salary | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.vacation_pay > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Vacaciones proporcionales</span>
                <span class="text-white">{{ liquidation()!.vacation_pay | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.xiii_month_proportional > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">XIII Mes proporcional</span>
                <span class="text-white">{{ liquidation()!.xiii_month_proportional | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.seniority_bonus > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Prima de antiguedad ({{ liquidation()!.seniority_years }} anos)</span>
                <span class="text-white">{{ liquidation()!.seniority_bonus | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.notice_pay > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Preaviso</span>
                <span class="text-white">{{ liquidation()!.notice_pay | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.severance_pay > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Indemnizacion ({{ liquidation()!.severance_weeks }} semanas)</span>
                <span class="text-white">{{ liquidation()!.severance_pay | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }

            <div class="flex justify-between py-2 border-t border-gray-600">
              <span class="text-white font-semibold">Total Bruto</span>
              <span class="text-white font-bold text-lg">{{ liquidation()!.gross_total | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>

            <div class="text-sm font-semibold text-gray-400 uppercase mt-4">Deducciones</div>

            @if (liquidation()!.css_deduction > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">CSS (9.75%)</span>
                <span class="text-red-400">-{{ liquidation()!.css_deduction | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.isr_deduction > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">ISR</span>
                <span class="text-red-400">-{{ liquidation()!.isr_deduction | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.other_deductions > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Otras deducciones</span>
                <span class="text-red-400">-{{ liquidation()!.other_deductions | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }
            @if (liquidation()!.fondo_cesantia_offset > 0) {
              <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                <span class="text-gray-300">Fondo de Cesantia</span>
                <span class="text-red-400">-{{ liquidation()!.fondo_cesantia_offset | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            }

            <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-300 font-semibold text-lg">TOTAL NETO A PAGAR</span>
                <span class="text-3xl font-bold text-amber-400">{{ liquidation()!.net_total | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>

        @if (liquidation()!.notes) {
          <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold text-white mb-2">Notas</h2>
            <p class="text-gray-300 text-sm">{{ liquidation()!.notes }}</p>
          </div>
        }

        <!-- Actions -->
        <div class="flex justify-end gap-3 mb-8">
          @if (liquidation()!.status === 'CALCULATED') {
            <p-button label="Aprobar" icon="pi pi-check" severity="success" rounded (click)="approve()" />
          }
          @if (liquidation()!.status === 'APPROVED') {
            <p-button label="Marcar Pagado" icon="pi pi-dollar" severity="info" rounded (click)="markPaid()" />
          }
          <p-button label="Exportar PDF" icon="pi pi-file-pdf" severity="help" rounded outlined (click)="exportPdf()" />
        </div>
      }

      <p-toast />
    </div>
  `,
  styles: `
    :host { display: block; padding: 1.5rem; }
  `,
})
export class PayrollLiquidationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly liquidationService = inject(LiquidationService);
  private readonly orgService = inject(OrganizationService);
  private readonly messageService = inject(MessageService);

  readonly liquidation = signal<EmployeeLiquidation | null>(null);
  readonly loading = signal(true);

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id && id !== 'new') {
        void this.loadLiquidation(id);
      } else {
        this.loading.set(false);
      }
    });
  }

  private async loadLiquidation(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const liq = await this.liquidationService.getById(id);
      this.liquidation.set(liq);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la liquidacion' });
    } finally {
      this.loading.set(false);
    }
  }

  async approve(): Promise<void> {
    const liq = this.liquidation();
    if (!liq) return;
    try {
      await this.liquidationService.update(liq.id, { status: 'APPROVED', approved_at: new Date().toISOString() });
      this.liquidation.set({ ...liq, status: 'APPROVED' });
      this.messageService.add({ severity: 'success', summary: 'Aprobado', detail: 'Liquidacion aprobada' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo aprobar' });
    }
  }

  async markPaid(): Promise<void> {
    const liq = this.liquidation();
    if (!liq) return;
    try {
      await this.liquidationService.update(liq.id, { status: 'PAID', paid_date: new Date().toISOString().split('T')[0] });
      this.liquidation.set({ ...liq, status: 'PAID' });
      this.messageService.add({ severity: 'success', summary: 'Pagado', detail: 'Marcado como pagado' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
    }
  }

  async exportPdf(): Promise<void> {
    const liq = this.liquidation();
    if (!liq) return;

    const pdfMake = await import('pdfmake/build/pdfmake.js');
    const pdfFonts = await import('pdfmake/build/vfs_fonts.js');
    const companyName = this.orgService.isNaz() ? 'Naz' : 'BO Capital, S.A.';

    const rows: any[] = [];
    if (liq.pending_salary > 0) rows.push(['Salario pendiente', `${liq.pending_salary_days} dias`, `$${liq.pending_salary.toFixed(2)}`]);
    if (liq.vacation_pay > 0) rows.push(['Vacaciones proporcionales', `${liq.vacation_days_proportional} dias`, `$${liq.vacation_pay.toFixed(2)}`]);
    if (liq.xiii_month_proportional > 0) rows.push(['XIII Mes proporcional', '', `$${liq.xiii_month_proportional.toFixed(2)}`]);
    if (liq.seniority_bonus > 0) rows.push(['Prima de antiguedad', `${liq.seniority_years} anos`, `$${liq.seniority_bonus.toFixed(2)}`]);
    if (liq.notice_pay > 0) rows.push(['Preaviso', '30 dias', `$${liq.notice_pay.toFixed(2)}`]);
    if (liq.severance_pay > 0) rows.push(['Indemnizacion', `${liq.severance_weeks} semanas`, `$${liq.severance_pay.toFixed(2)}`]);
    rows.push([{ text: 'TOTAL BRUTO', bold: true }, '', { text: `$${liq.gross_total.toFixed(2)}`, bold: true }]);
    rows.push([{ text: '(-) CSS 9.75%', color: 'red' }, '', `$${liq.css_deduction.toFixed(2)}`]);
    if (liq.isr_deduction > 0) rows.push([{ text: '(-) ISR', color: 'red' }, '', `$${liq.isr_deduction.toFixed(2)}`]);
    if (liq.other_deductions > 0) rows.push([{ text: '(-) Otras deducciones', color: 'red' }, '', `$${liq.other_deductions.toFixed(2)}`]);
    if (liq.fondo_cesantia_offset > 0) rows.push([{ text: '(-) Fondo Cesantia', color: 'red' }, '', `$${liq.fondo_cesantia_offset.toFixed(2)}`]);
    rows.push([{ text: 'TOTAL NETO A PAGAR', bold: true, fontSize: 12 }, '', { text: `$${liq.net_total.toFixed(2)}`, bold: true, fontSize: 12 }]);

    const docDefinition: any = {
      pageSize: 'LETTER',
      content: [
        { text: companyName, style: 'header', alignment: 'center', margin: [0, 0, 0, 4] },
        { text: 'HOJA DE LIQUIDACION', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'Empleado:', bold: true }, liq.employee_name],
              [{ text: 'Cedula:', bold: true }, liq.document_id ?? ''],
              [{ text: 'Fecha de ingreso:', bold: true }, liq.hire_date?.toString() ?? ''],
              [{ text: 'Fecha de terminacion:', bold: true }, liq.termination_date?.toString() ?? ''],
              [{ text: 'Salario mensual:', bold: true }, `$${liq.monthly_salary.toFixed(2)}`],
              [{ text: 'Tipo de terminacion:', bold: true }, this.getTerminationLabel(liq.termination_type)],
              [{ text: 'Contrato:', bold: true }, liq.contract_type],
              [{ text: 'Posicion:', bold: true }, liq.position ?? 'N/A'],
              [{ text: 'Sucursal:', bold: true }, liq.branch ?? 'N/A'],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: [
              [{ text: 'Concepto', bold: true }, { text: 'Detalle', bold: true }, { text: 'Monto', bold: true, alignment: 'right' }],
              ...rows.map(r => [
                typeof r[0] === 'string' ? { text: r[0] } : r[0],
                { text: r[1] ?? '' },
                { text: typeof r[2] === 'string' ? r[2] : r[2], alignment: 'right' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 40],
        },
        {
          columns: [
            { text: '____________________\nFirma Empleado', alignment: 'center' },
            { text: '____________________\nFirma Empresa', alignment: 'center' },
            { text: '____________________\nTestigo', alignment: 'center' },
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
      .download(`Liquidacion_${liq.employee_name.replace(/\s/g, '_')}.pdf`);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/payroll/liquidation']);
  }

  getTerminationLabel(type: string): string {
    return TERMINATION_TYPE_OPTIONS.find(t => t.value === type)?.label ?? type;
  }

  getStatusLabel(status: LiquidationStatus): string {
    return STATUS_CONFIG[status]?.label ?? status;
  }

  getStatusSeverity(status: LiquidationStatus): 'secondary' | 'info' | 'success' | 'warn' {
    return STATUS_CONFIG[status]?.severity ?? 'secondary';
  }
}
