/**
 * Pantalla principal del módulo de Deudas de Empleados.
 *
 * Replica el reporte de BO Capital S.A. en UI moderna:
 *  - Resumen por empleado (Nivel de Endeudamiento, # deudas, cuota mes,
 *    saldo total).
 *  - Click en empleado expande detalle con sus deudas individuales.
 *  - Filtros: status, acreedor, búsqueda por empleado.
 *  - Acciones: nueva deuda, editar, ver historial, exportar.
 *  - Indicador de carga global durante fetch.
 */
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import {
  Creditor,
  EmployeeDebt,
  EmployeeDebtSummary,
} from '../../../../models';
import { EmployeeDebtsService } from '../../../../services/employee-debts.service';
import { LoggerService } from '../../../../services/logger.service';
import { OrganizationService } from '../../../../services/organization.service';
import { ApiUrlService } from '../../../../services/api-url.service';

@Component({
  selector: 'pt-employee-debts',
  standalone: true,
  providers: [DialogService, DynamicDialogRef, ConfirmationService],
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    Button,
    Card,
    Dialog,
    InputTextModule,
    Select,
    Tag,
    ToastModule,
    Tooltip,
  ],
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 sm:pt-5 pb-4">
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between w-full gap-3 flex-wrap">
            <div>
              <h2 class="m-0 text-xl">Deudas de Empleados</h2>
              <p class="text-sm text-gray-400 m-0 mt-1">
                Gestión de préstamos y descuentos por planilla
              </p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              @if (hasActiveFilters()) {
                <p-button
                  icon="pi pi-filter-slash"
                  severity="secondary"
                  [outlined]="true"
                  rounded
                  (click)="clearFilters()"
                  label="Limpiar filtros"
                  pTooltip="Restaurar vista por default"
                />
              }
              <p-button
                icon="pi pi-plus-circle"
                rounded
                (click)="openNewDebt()"
                label="Nueva deuda"
              />
            </div>
          </div>
        </ng-template>

        <!-- Indicador de carga -->
        <div
          class="debts-loading-bar"
          [class.debts-loading-bar--active]="debtsResource.isLoading()"
        ></div>

        <!-- Filtros rápidos -->
        <div class="flex flex-col md:flex-row gap-2 md:gap-3 mb-4 items-stretch md:items-end">
          <div class="flex-1 min-w-[200px]">
            <label class="text-[10px] uppercase text-gray-400 mb-1 block">Buscar empleado</label>
            <input
              type="text"
              pInputText
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="Nombre o código..."
              class="w-full"
            />
          </div>
          <div class="min-w-[180px]">
            <label class="text-[10px] uppercase text-gray-400 mb-1 block">Acreedor</label>
            <p-select
              [options]="creditorOptions()"
              [ngModel]="creditorFilter()"
              (ngModelChange)="creditorFilter.set($event)"
              optionLabel="label"
              optionValue="value"
              placeholder="Todos"
              showClear
              filter
              appendTo="body"
              class="w-full"
            />
          </div>
          <div class="min-w-[160px]">
            <label class="text-[10px] uppercase text-gray-400 mb-1 block">Estado</label>
            <p-select
              [options]="statusOptions"
              [ngModel]="statusFilter()"
              (ngModelChange)="statusFilter.set($event)"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              class="w-full"
            />
          </div>
        </div>

        <!-- Resumen general -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
            <div class="text-[10px] uppercase text-gray-400">Empleados con deudas</div>
            <div class="text-xl font-bold text-white">{{ filteredSummaries().length }}</div>
          </div>
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
            <div class="text-[10px] uppercase text-gray-400">Deudas activas</div>
            <div class="text-xl font-bold text-white">{{ totalDebtsCount() }}</div>
          </div>
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
            <div class="text-[10px] uppercase text-gray-400">Cuota mensual total</div>
            <div class="text-xl font-bold text-amber-400">{{ totalMonthly() | currency : '$' }}</div>
          </div>
          <div class="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/50">
            <div class="text-[10px] uppercase text-gray-400">Saldo pendiente</div>
            <div class="text-xl font-bold text-cyan-300">{{ totalBalance() | currency : '$' }}</div>
          </div>
        </div>

        <!-- Tabla de empleados con deudas -->
        @if (debtsResource.isLoading() && filteredSummaries().length === 0) {
          <div class="flex flex-col items-center py-12 gap-3">
            <i class="pi pi-spin pi-spinner text-3xl text-amber-400"></i>
            <span class="text-sm text-gray-400">Cargando deudas…</span>
          </div>
        } @else if (filteredSummaries().length === 0) {
          <div class="flex flex-col items-center py-12 gap-3 text-center">
            <div class="w-16 h-16 rounded-full bg-neutral-800/60 flex items-center justify-center">
              <i class="pi pi-search text-2xl text-gray-500"></i>
            </div>
            <p class="text-base font-semibold text-gray-200 m-0">Sin resultados</p>
            <p class="text-sm text-gray-500 m-0">
              Prueba quitar filtros o crear una nueva deuda.
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="debts-table w-full">
              <thead>
                <tr>
                  <th class="text-left">Cod.</th>
                  <th class="text-left">Empleado</th>
                  <th class="text-center">Nivel</th>
                  <th class="text-center">Deudas</th>
                  <th class="text-right">Monto Inicial</th>
                  <th class="text-right">Saldo Actual</th>
                  <th class="text-right">Cuota / Quincena</th>
                  <th class="text-right">YTD Descontado</th>
                  <th class="text-right">Este Mes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (summary of filteredSummaries(); track summary.employee.id) {
                  <tr
                    class="debts-row"
                    [class.debts-row--expanded]="isExpanded(summary.employee.id!)"
                    (click)="toggleExpanded(summary.employee.id!)"
                  >
                    <td class="font-mono text-xs text-gray-400">
                      {{ summary.employee.employee_number || '—' }}
                    </td>
                    <td class="font-medium">
                      {{ summary.employee.first_name }} {{ summary.employee.father_name }}
                    </td>
                    <td class="text-center">
                      <p-tag
                        [value]="summary.max_debt_percentage + '%'"
                        [severity]="summary.max_debt_percentage >= 100 ? 'success' : 'warn'"
                        rounded
                      />
                    </td>
                    <td class="text-center">{{ summary.debts_count }}</td>
                    <td class="text-right text-gray-300">
                      {{ summary.total_opening_balance | currency : '$' }}
                    </td>
                    <td class="text-right font-semibold text-cyan-300">
                      {{ summary.total_balance | currency : '$' }}
                    </td>
                    <td class="text-right font-semibold text-amber-400">
                      {{ summary.total_monthly_installment | currency : '$' }}
                    </td>
                    <td class="text-right text-gray-300">
                      {{ summary.total_ytd_deducted | currency : '$' }}
                    </td>
                    <td class="text-right text-gray-300">
                      {{ summary.total_current_month_deducted | currency : '$' }}
                    </td>
                    <td class="text-right">
                      <i
                        class="pi text-xs text-gray-500 transition-transform"
                        [class.pi-chevron-right]="!isExpanded(summary.employee.id!)"
                        [class.pi-chevron-down]="isExpanded(summary.employee.id!)"
                      ></i>
                    </td>
                  </tr>
                  @if (isExpanded(summary.employee.id!)) {
                    <tr class="debts-row-detail">
                      <td colspan="10" class="!p-0">
                        <div class="bg-neutral-900/60 border-t border-neutral-700/50 px-4 py-3">
                          <div class="flex flex-col gap-2">
                            @for (debt of summary.debts; track debt.id) {
                              <div
                                class="grid grid-cols-1 md:grid-cols-[80px_70px_1fr_120px_100px_100px_100px_60px] gap-2 items-center p-2 bg-neutral-800/40 rounded-lg hover:bg-neutral-800/80 transition-colors text-sm"
                              >
                                <div class="font-mono text-xs text-gray-400">
                                  {{ debt.creditor?.code || '—' }}.{{ debt.debt_code }}
                                </div>
                                <div>
                                  <p-tag
                                    [value]="debtStatusLabel(debt.status)"
                                    [severity]="debtStatusSeverity(debt.status)"
                                    rounded
                                  />
                                </div>
                                <div class="flex flex-col">
                                  <span class="text-white">{{ debt.creditor?.name || '—' }}</span>
                                  @if (debt.description) {
                                    <span class="text-[11px] text-gray-500">{{ debt.description }}</span>
                                  }
                                  @if (debt.deduction_mode === 'max_percentage') {
                                    <span class="text-[10px] text-amber-300">
                                      % Máximo: {{ debt.max_percentage }}%
                                    </span>
                                  }
                                </div>
                                <div class="text-right text-gray-300">
                                  {{ debt.opening_balance | currency : '$' }}
                                  <div class="text-[10px] text-gray-500">Monto Inicial</div>
                                </div>
                                <div class="text-right font-semibold text-cyan-300">
                                  {{ debt.balance | currency : '$' }}
                                  <div class="text-[10px] text-gray-500">Saldo</div>
                                </div>
                                <div class="text-right font-semibold text-amber-400">
                                  {{ debt.installment_amount | currency : '$' }}
                                  <div class="text-[10px] text-gray-500">Cuota</div>
                                </div>
                                <div class="text-right text-gray-300">
                                  {{ debt.ytd_deducted | currency : '$' }}
                                  <div class="text-[10px] text-gray-500">YTD</div>
                                </div>
                                <div class="flex gap-1 justify-end">
                                  <p-button
                                    icon="pi pi-pen-to-square"
                                    severity="secondary"
                                    [text]="true"
                                    [rounded]="true"
                                    size="small"
                                    (onClick)="$event.stopPropagation(); editDebt(debt)"
                                    pTooltip="Editar"
                                  />
                                  <p-button
                                    icon="pi pi-trash"
                                    severity="danger"
                                    [text]="true"
                                    [rounded]="true"
                                    size="small"
                                    (onClick)="$event.stopPropagation(); deleteDebt(debt)"
                                    pTooltip="Eliminar"
                                  />
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
              <tfoot>
                <tr class="debts-row-total">
                  <td colspan="3" class="font-bold uppercase text-xs">Totales Generales</td>
                  <td class="text-center font-bold">{{ totalDebtsCount() }}</td>
                  <td class="text-right font-bold">{{ totalOpening() | currency : '$' }}</td>
                  <td class="text-right font-bold text-cyan-300">{{ totalBalance() | currency : '$' }}</td>
                  <td class="text-right font-bold text-amber-400">{{ totalMonthly() | currency : '$' }}</td>
                  <td class="text-right font-bold">{{ totalYtd() | currency : '$' }}</td>
                  <td class="text-right font-bold">{{ totalCurrentMonth() | currency : '$' }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      </p-card>
    </div>
  `,
  styles: `
    .debts-loading-bar {
      height: 3px; width: 100%; overflow: hidden; opacity: 0;
      transition: opacity 0.25s ease; margin-bottom: 0.5rem;
    }
    .debts-loading-bar--active { opacity: 1; }
    .debts-loading-bar--active::before {
      content: ''; position: relative; display: block;
      width: 35%; height: 100%;
      background: linear-gradient(90deg, transparent 0%, #d97706 50%, transparent 100%);
      animation: debts-slide 1.2s ease-in-out infinite;
    }
    @keyframes debts-slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(385%); }
    }

    .debts-table {
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .debts-table thead th {
      background: rgba(15, 23, 42, 0.6);
      color: #d4d4d8;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.75rem 0.5rem;
      border-bottom: 2px solid #d97706;
      position: sticky;
      top: 0;
    }
    .debts-table tbody td {
      padding: 0.625rem 0.5rem;
      border-bottom: 1px solid rgba(64, 64, 64, 0.4);
    }
    .debts-row {
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .debts-row:hover {
      background: rgba(38, 38, 38, 0.6);
    }
    .debts-row--expanded {
      background: rgba(217, 119, 6, 0.05);
    }
    .debts-row-detail td {
      padding: 0 !important;
    }
    .debts-row-total td {
      padding: 0.75rem 0.5rem;
      background: rgba(15, 23, 42, 0.8);
      border-top: 2px solid #d97706;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDebtsComponent {
  public service = inject(EmployeeDebtsService);
  private organization = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private logger = inject(LoggerService);
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private dialogService = inject(DialogService);

  // ─── Filtros ───────────────────────────────────────────────
  public searchTerm = signal('');
  public statusFilter = signal<'active' | 'all' | 'completed' | 'cancelled'>('active');
  public creditorFilter = signal<string | null>(null);
  public expandedEmployeeId = signal<string | null>(null);

  public statusOptions = [
    { label: 'Solo activas', value: 'active' },
    { label: 'Todas', value: 'all' },
    { label: 'Completadas', value: 'completed' },
    { label: 'Canceladas', value: 'cancelled' },
  ];

  // ─── Resource: lista de deudas con joins ───────────────────
  public debtsResource = httpResource<EmployeeDebt[]>(() => {
    const companyId = this.organization.getCurrentCompanyId();
    if (!companyId) return undefined;

    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      select:
        '*,employee:employees!employee_debts_employee_id_fkey(id,first_name,father_name,employee_number,max_debt_percentage),creditor:creditors(id,code,name,category,is_internal),creditor_product:creditor_products(id,code,name)',
      order: 'employee_id.asc,debt_code.asc',
    };
    const status = this.statusFilter();
    if (status === 'active') params['status'] = 'in.(active,paused)';
    if (status === 'completed') params['status'] = 'eq.completed';
    if (status === 'cancelled') params['status'] = 'eq.cancelled';

    if (this.creditorFilter()) params['creditor_id'] = `eq.${this.creditorFilter()}`;

    return {
      url: this.apiUrl.build('rest/v1/employee_debts', params),
      method: 'GET' as const,
    };
  });

  public creditorsResource = httpResource<Creditor[]>(() => {
    const companyId = this.organization.getCurrentCompanyId();
    if (!companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/creditors', {
        company_id: `eq.${companyId}`,
        is_active: 'eq.true',
        select: 'id,code,name',
        order: 'code.asc',
      }),
      method: 'GET' as const,
    };
  });

  // ─── Computed: derivar summaries por empleado ──────────────
  public summaries = computed<EmployeeDebtSummary[]>(() => {
    const debts = this.debtsResource.value() ?? [];
    const byEmp = new Map<string, EmployeeDebtSummary>();
    for (const d of debts) {
      const empId = d.employee_id;
      if (!empId) continue;
      let bucket = byEmp.get(empId);
      if (!bucket) {
        bucket = {
          employee: d.employee ?? { id: empId },
          max_debt_percentage:
            (d.employee as { max_debt_percentage?: number })?.max_debt_percentage ?? 100,
          debts_count: 0,
          total_opening_balance: 0,
          total_balance: 0,
          total_monthly_installment: 0,
          total_ytd_deducted: 0,
          total_current_month_deducted: 0,
          debts: [],
        };
        byEmp.set(empId, bucket);
      }
      bucket.debts_count += 1;
      bucket.total_opening_balance += Number(d.opening_balance ?? 0);
      bucket.total_balance += Number(d.balance ?? 0);
      bucket.total_monthly_installment += Number(d.installment_amount ?? 0);
      bucket.total_ytd_deducted += Number(d.ytd_deducted ?? 0);
      bucket.total_current_month_deducted += Number(d.current_month_deducted ?? 0);
      bucket.debts.push(d);
    }
    return [...byEmp.values()].sort((a, b) =>
      `${a.employee.first_name ?? ''} ${a.employee.father_name ?? ''}`.localeCompare(
        `${b.employee.first_name ?? ''} ${b.employee.father_name ?? ''}`,
      ),
    );
  });

  public filteredSummaries = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.summaries();
    return this.summaries().filter((s) => {
      const name = `${s.employee.first_name ?? ''} ${s.employee.father_name ?? ''}`.toLowerCase();
      const num = (s.employee.employee_number ?? '').toLowerCase();
      return name.includes(term) || num.includes(term);
    });
  });

  public creditorOptions = computed(() => {
    const list = this.creditorsResource.value() ?? [];
    return list.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id }));
  });

  // Totales generales
  public totalDebtsCount = computed(() => this.filteredSummaries().reduce((a, s) => a + s.debts_count, 0));
  public totalOpening = computed(() => this.filteredSummaries().reduce((a, s) => a + s.total_opening_balance, 0));
  public totalBalance = computed(() => this.filteredSummaries().reduce((a, s) => a + s.total_balance, 0));
  public totalMonthly = computed(() => this.filteredSummaries().reduce((a, s) => a + s.total_monthly_installment, 0));
  public totalYtd = computed(() => this.filteredSummaries().reduce((a, s) => a + s.total_ytd_deducted, 0));
  public totalCurrentMonth = computed(() =>
    this.filteredSummaries().reduce((a, s) => a + s.total_current_month_deducted, 0),
  );

  public hasActiveFilters = computed(
    () =>
      !!this.searchTerm() ||
      !!this.creditorFilter() ||
      this.statusFilter() !== 'active',
  );

  // ─── Handlers ──────────────────────────────────────────────

  public isExpanded(employeeId: string): boolean {
    return this.expandedEmployeeId() === employeeId;
  }

  public toggleExpanded(employeeId: string): void {
    this.expandedEmployeeId.update((cur) => (cur === employeeId ? null : employeeId));
  }

  public clearFilters(): void {
    this.searchTerm.set('');
    this.creditorFilter.set(null);
    this.statusFilter.set('active');
  }

  public debtStatusLabel(s: string): string {
    return {
      active: 'Activa',
      paused: 'Pausada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      draft: 'Borrador',
      pending_approval: 'Pendiente',
      rejected: 'Rechazada',
    }[s] ?? s;
  }

  public debtStatusSeverity(s: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    return {
      active: 'success' as const,
      paused: 'warn' as const,
      completed: 'info' as const,
      cancelled: 'danger' as const,
      draft: 'secondary' as const,
      pending_approval: 'warn' as const,
      rejected: 'danger' as const,
    }[s] ?? 'secondary' as const;
  }

  public async openNewDebt(): Promise<void> {
    // Por ahora un mensaje, el form se conecta en la siguiente tarea
    this.message.add({
      severity: 'info',
      summary: 'Form pendiente',
      detail: 'El formulario de creación se implementará en la siguiente fase.',
    });
  }

  public async editDebt(debt: EmployeeDebt): Promise<void> {
    this.message.add({
      severity: 'info',
      summary: `Editar deuda ${debt.debt_code}`,
      detail: `Empleado: ${debt.employee?.first_name} ${debt.employee?.father_name}`,
    });
  }

  public deleteDebt(debt: EmployeeDebt): void {
    this.confirmation.confirm({
      message: `¿Eliminar la deuda ${debt.debt_code} de ${debt.creditor?.name}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Eliminar', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: async () => {
        try {
          await this.service.deleteDebt(debt.id);
          this.message.add({
            severity: 'success',
            summary: 'Deuda eliminada',
            detail: 'La deuda y su historial fueron eliminados.',
          });
          this.debtsResource.reload();
        } catch (error) {
          this.logger.error('[EmployeeDebts] Delete error:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la deuda.',
          });
        }
      },
    });
  }

  @HostListener('window:keydown.escape')
  public onEscape(): void {
    if (this.expandedEmployeeId()) this.expandedEmployeeId.set(null);
  }
}
