import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { ProgressSpinner } from 'primeng/progressspinner';
import { LiquidationService } from '../services/liquidation.service';
import type { EmployeeLiquidation, LiquidationStatus } from '../models';
import { TERMINATION_TYPE_OPTIONS } from '../models';

const STATUS_CONFIG: Record<LiquidationStatus, { label: string; severity: 'secondary' | 'info' | 'success' | 'warn' }> = {
  DRAFT:      { label: 'Borrador',   severity: 'secondary' },
  CALCULATED: { label: 'Calculado',  severity: 'info' },
  APPROVED:   { label: 'Aprobado',   severity: 'success' },
  PAID:       { label: 'Pagado',     severity: 'success' },
};

@Component({
  selector: 'pt-payroll-liquidation',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, FormsModule,
    Button, Card, TableModule, Tag,
    ConfirmDialog, Toast, ProgressSpinner,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Header -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white m-0">Liquidacion de Personal</h1>
        <p class="text-sm text-gray-400 m-0 mt-1">
          Calculo de liquidaciones segun legislacion laboral panamena
        </p>
      </div>
      <p-button
        label="Nueva Liquidacion"
        icon="pi pi-plus-circle"
        rounded
        (click)="createNew()"
      />
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div class="text-sm text-gray-400">Total Liquidaciones</div>
        <div class="text-2xl font-bold text-white">{{ liquidations().length }}</div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div class="text-sm text-gray-400">Borradores</div>
        <div class="text-2xl font-bold text-gray-400">{{ draftCount() }}</div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div class="text-sm text-gray-400">Calculados</div>
        <div class="text-2xl font-bold text-blue-400">{{ calculatedCount() }}</div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div class="text-sm text-gray-400">Pagados</div>
        <div class="text-2xl font-bold text-green-400">{{ paidCount() }}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-gray-800 border border-gray-700 rounded-xl">
      <p-table
        [value]="liquidations()"
        [paginator]="liquidations().length > 10"
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
            <th>Tipo Terminacion</th>
            <th pSortableColumn="termination_date">Fecha <p-sortIcon field="termination_date" /></th>
            <th class="text-right" pSortableColumn="gross_total">Bruto <p-sortIcon field="gross_total" /></th>
            <th class="text-right" pSortableColumn="net_total">Neto <p-sortIcon field="net_total" /></th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-medium">{{ row.employee_name }}</td>
            <td>{{ getTerminationLabel(row.termination_type) }}</td>
            <td>{{ row.termination_date | date:'dd/MM/yyyy' }}</td>
            <td class="text-right">{{ row.gross_total | currency:'USD':'symbol':'1.2-2' }}</td>
            <td class="text-right font-semibold text-amber-400">{{ row.net_total | currency:'USD':'symbol':'1.2-2' }}</td>
            <td>
              <p-tag [value]="getStatusLabel(row.status)" [severity]="getStatusSeverity(row.status)" rounded />
            </td>
            <td>
              <div class="flex gap-1">
                <p-button icon="pi pi-eye" severity="info" size="small" rounded outlined
                  pTooltip="Ver Detalle" (click)="viewDetail(row)" />
                @if (row.status === 'CALCULATED') {
                  <p-button icon="pi pi-check" severity="success" size="small" rounded outlined
                    pTooltip="Aprobar" (click)="approve(row)" />
                }
                @if (row.status === 'APPROVED') {
                  <p-button icon="pi pi-dollar" severity="info" size="small" rounded outlined
                    pTooltip="Marcar Pagado" (click)="markPaid(row)" />
                }
                @if (row.status === 'DRAFT') {
                  <p-button icon="pi pi-trash" severity="danger" size="small" rounded outlined
                    pTooltip="Eliminar" (click)="confirmDelete(row)" />
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center text-gray-400 py-8">
              <i class="pi pi-info-circle text-3xl mb-2 block"></i>
              No hay liquidaciones registradas.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <p-confirmDialog />
    <p-toast />

    @if (liquidationService.isLoading()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '50px', height: '50px' }" />
      </div>
    }
  `,
  styles: `
    :host { display: block; padding: 1.5rem; }
  `,
})
export class PayrollLiquidationComponent {
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly liquidationService = inject(LiquidationService);

  // Computed
  readonly liquidations = computed(() => this.liquidationService.value());
  readonly draftCount = computed(() => this.liquidations().filter(l => l.status === 'DRAFT').length);
  readonly calculatedCount = computed(() => this.liquidations().filter(l => l.status === 'CALCULATED').length);
  readonly paidCount = computed(() => this.liquidations().filter(l => l.status === 'PAID').length);

  createNew(): void {
    this.router.navigate(['/dashboard/payroll/liquidation/new']);
  }

  viewDetail(liq: EmployeeLiquidation): void {
    this.router.navigate(['/dashboard/payroll/liquidation', liq.id]);
  }

  async approve(liq: EmployeeLiquidation): Promise<void> {
    try {
      await this.liquidationService.update(liq.id, {
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
      });
      this.messageService.add({ severity: 'success', summary: 'Aprobado', detail: 'Liquidacion aprobada' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo aprobar' });
    }
  }

  async markPaid(liq: EmployeeLiquidation): Promise<void> {
    try {
      await this.liquidationService.update(liq.id, {
        status: 'PAID',
        paid_date: new Date().toISOString().split('T')[0],
      });
      this.messageService.add({ severity: 'success', summary: 'Pagado', detail: 'Marcado como pagado' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
    }
  }

  confirmDelete(liq: EmployeeLiquidation): void {
    this.confirmService.confirm({
      message: 'Estas seguro de eliminar esta liquidacion?',
      header: 'Confirmar Eliminacion',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.liquidationService.delete(liq.id);
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Liquidacion eliminada' });
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        }
      },
    });
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
