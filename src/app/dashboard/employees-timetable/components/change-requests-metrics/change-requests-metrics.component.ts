import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { Dialog } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import {
  ScheduleChangeRequest,
  ScheduleChangeRequestService,
} from '../../../../services/schedule-change-request.service';

interface MetricRow {
  label: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

@Component({
  selector: 'pt-change-requests-metrics',
  standalone: true,
  imports: [Dialog, NgClass, SelectModule, FormsModule, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      header="Métricas de solicitudes de cambio"
      [modal]="true"
      [(visible)]="visible"
      [dismissableMask]="true"
      [style]="{ width: '800px', maxHeight: '85vh' }"
    >
      <!-- Period selector -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-gray-400">Período:</span>
        <p-select
          [options]="periodOptions"
          optionLabel="label"
          optionValue="value"
          [(ngModel)]="selectedPeriod"
          (ngModelChange)="loadData()"
          [style]="{ width: '200px' }"
        />
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        </div>
      } @else {
        <!-- Summary cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-white">{{ totalRequests() }}</div>
            <div class="text-xs text-gray-500">Total</div>
          </div>
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-amber-400">{{ pendingRequests() }}</div>
            <div class="text-xs text-amber-300/70">Pendientes</div>
          </div>
          <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-400">{{ approvedRequests() }}</div>
            <div class="text-xs text-green-300/70">Aprobadas</div>
          </div>
          <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-400">{{ rejectedRequests() }}</div>
            <div class="text-xs text-red-300/70">Rechazadas</div>
          </div>
        </div>

        <!-- By Branch table -->
        <div class="mb-6">
          <h3 class="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <i class="pi pi-building text-xs"></i> Por Sucursal
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-700/50">
                  <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs">Sucursal</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Total</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Pend.</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Aprob.</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Rech.</th>
                </tr>
              </thead>
              <tbody>
                @for (row of byBranch(); track row.label) {
                  <tr class="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                    <td class="py-2 px-3 text-gray-300 font-medium">{{ row.label }}</td>
                    <td class="text-center py-2 px-2 text-white font-bold">{{ row.total }}</td>
                    <td class="text-center py-2 px-2 text-amber-400">{{ row.pending }}</td>
                    <td class="text-center py-2 px-2 text-green-400">{{ row.approved }}</td>
                    <td class="text-center py-2 px-2 text-red-400">{{ row.rejected }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- By Requester table -->
        <div class="mb-6">
          <h3 class="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <i class="pi pi-user text-xs"></i> Por Solicitante (quién pide el cambio)
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-700/50">
                  <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs">Solicitante</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Total</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Pend.</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Aprob.</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Rech.</th>
                </tr>
              </thead>
              <tbody>
                @for (row of byRequester(); track row.label) {
                  <tr class="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                    <td class="py-2 px-3 text-gray-300 font-medium">{{ row.label }}</td>
                    <td class="text-center py-2 px-2 text-white font-bold">{{ row.total }}</td>
                    <td class="text-center py-2 px-2 text-amber-400">{{ row.pending }}</td>
                    <td class="text-center py-2 px-2 text-green-400">{{ row.approved }}</td>
                    <td class="text-center py-2 px-2 text-red-400">{{ row.rejected }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- By Employee (affected) table -->
        <div>
          <h3 class="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <i class="pi pi-users text-xs"></i> Por Empleado Afectado
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-700/50">
                  <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs">Empleado</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Total</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Pend.</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Aprob.</th>
                  <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs">Rech.</th>
                </tr>
              </thead>
              <tbody>
                @for (row of byEmployee(); track row.label) {
                  <tr class="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                    <td class="py-2 px-3 text-gray-300 font-medium">{{ row.label }}</td>
                    <td class="text-center py-2 px-2 text-white font-bold">{{ row.total }}</td>
                    <td class="text-center py-2 px-2 text-amber-400">{{ row.pending }}</td>
                    <td class="text-center py-2 px-2 text-green-400">{{ row.approved }}</td>
                    <td class="text-center py-2 px-2 text-red-400">{{ row.rejected }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </p-dialog>
  `,
})
export class ChangeRequestsMetricsComponent {
  private changeRequestService = inject(ScheduleChangeRequestService);

  public visible = model<boolean>(false);
  public loading = signal(false);
  public allRequests = signal<ScheduleChangeRequest[]>([]);

  public periodOptions = [
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mes', value: 'month' },
    { label: 'Mes pasado', value: 'last_month' },
    { label: 'Últimos 3 meses', value: '3months' },
    { label: 'Todo', value: 'all' },
  ];
  public selectedPeriod = 'month';

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.loadData();
      }
    });
  }

  // Summary counts
  public totalRequests = computed(() => this.allRequests().length);
  public pendingRequests = computed(() => this.allRequests().filter(r => r.status === 'pending').length);
  public approvedRequests = computed(() => this.allRequests().filter(r => r.status === 'approved').length);
  public rejectedRequests = computed(() => this.allRequests().filter(r => r.status === 'rejected').length);

  // Grouped metrics
  public byBranch = computed(() => this.groupBy(this.allRequests(), r => r.branch?.name || 'Sin sucursal'));
  public byRequester = computed(() => this.groupBy(this.allRequests(), r =>
    r.requester ? `${r.requester.first_name} ${r.requester.father_name}` : 'Desconocido'
  ));
  public byEmployee = computed(() => this.groupBy(this.allRequests(), r =>
    r.employee ? `${r.employee.first_name} ${r.employee.father_name}` : 'Desconocido'
  ));

  public loadData(): void {
    this.loading.set(true);
    const now = new Date();
    let dateFrom: string | undefined;

    switch (this.selectedPeriod) {
      case 'week':
        dateFrom = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00");
        break;
      case 'month':
        dateFrom = format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00");
        break;
      case 'last_month':
        dateFrom = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd'T'00:00:00");
        break;
      case '3months':
        dateFrom = format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd'T'00:00:00");
        break;
      default:
        dateFrom = undefined;
    }

    this.changeRequestService.getRequestsForMetrics(dateFrom).subscribe({
      next: (data) => {
        // If last_month, filter to only last month
        if (this.selectedPeriod === 'last_month') {
          const lastMonthEnd = endOfMonth(subMonths(now, 1));
          data = data.filter(r => {
            const d = new Date(r.created_at);
            return d <= lastMonthEnd;
          });
        }
        this.allRequests.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.allRequests.set([]);
        this.loading.set(false);
      },
    });
  }

  private groupBy(
    requests: ScheduleChangeRequest[],
    keyFn: (r: ScheduleChangeRequest) => string
  ): MetricRow[] {
    const map = new Map<string, MetricRow>();
    for (const req of requests) {
      const key = keyFn(req);
      let row = map.get(key);
      if (!row) {
        row = { label: key, total: 0, pending: 0, approved: 0, rejected: 0 };
        map.set(key, row);
      }
      row.total++;
      if (req.status === 'pending') row.pending++;
      else if (req.status === 'approved') row.approved++;
      else if (req.status === 'rejected') row.rejected++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }
}
