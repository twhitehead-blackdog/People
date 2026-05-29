// ────────────────────────────────────────────────────────────────────
// Vista unificada de TODOS los tickets — solo accesible con tickets_view_all
// (Tristan / Ricardo / Michael). Incluye KPI strip + columna depto + filtro depto.
// ────────────────────────────────────────────────────────────────────

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import {
  Ticket,
  TicketDepartment,
  TicketStatus,
  TicketPriority,
  DEPARTMENTS,
  STATUS_META,
  PRIORITY_META,
} from '../models/ticket.model';

@Component({
  selector: 'pt-tickets-all-admin',
  standalone: true,
  imports: [
    DatePipe, FormsModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, ProgressSpinnerModule, TableModule, TagModule,
    TextareaModule, TooltipModule, CardModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="flex items-center gap-2">
            <i [class]="'pi text-xl ' + (scope() === 'my-branch' ? 'pi-building text-blue-400' : 'pi-globe text-amber-400')"></i>
            <h2 class="text-xl font-semibold text-gray-100">
              {{ scope() === 'my-branch' ? 'Tickets de mi sucursal' : 'Tickets — Vista Global' }}
            </h2>
          </div>
          <p class="text-sm text-gray-400 mt-1">
            {{ scope() === 'my-branch' ? 'Todos los tickets reportados por la sucursal asignada al gerente.' : 'Todos los tickets de los 4 departamentos. Solo IT / Dirección.' }}
          </p>
        </div>
        <p-button icon="pi pi-refresh" label="Actualizar" size="small" severity="secondary" (onClick)="ticketsApi.reload()" />
      </div>

      <!-- KPI Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
          <div class="text-[11px] uppercase tracking-wide text-gray-400">Total</div>
          <div class="text-2xl font-bold text-gray-100">{{ kpis().total }}</div>
        </div>
        <div class="bg-amber-950/40 border border-amber-700/40 rounded-lg p-3">
          <div class="text-[11px] uppercase tracking-wide text-amber-300/80">Abiertos</div>
          <div class="text-2xl font-bold text-amber-300">{{ kpis().open }}</div>
        </div>
        <div class="bg-blue-950/40 border border-blue-700/40 rounded-lg p-3">
          <div class="text-[11px] uppercase tracking-wide text-blue-300/80">En Proceso</div>
          <div class="text-2xl font-bold text-blue-300">{{ kpis().inProcess }}</div>
        </div>
        <div class="bg-emerald-950/40 border border-emerald-700/40 rounded-lg p-3">
          <div class="text-[11px] uppercase tracking-wide text-emerald-300/80">Resueltos</div>
          <div class="text-2xl font-bold text-emerald-300">{{ kpis().resolved }}</div>
        </div>
        <div class="bg-rose-950/40 border border-rose-700/40 rounded-lg p-3">
          <div class="text-[11px] uppercase tracking-wide text-rose-300/80">Urgentes activos</div>
          <div class="text-2xl font-bold text-rose-300">{{ kpis().urgentActive }}</div>
        </div>
        <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
          <div class="text-[11px] uppercase tracking-wide text-gray-400">Avg. resolución</div>
          <div class="text-2xl font-bold text-gray-100">{{ kpis().avgResolutionHrs }}<span class="text-sm text-gray-400 ml-1">h</span></div>
        </div>
      </div>

      <!-- Per-department mini-summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        @for (d of deptSummary(); track d.id) {
          <button
            class="text-left bg-neutral-800/40 hover:bg-neutral-800/80 border border-neutral-700/40 rounded-lg p-2 transition-colors"
            [class.ring-2]="filterDept() === d.id"
            [class.ring-amber-400]="filterDept() === d.id"
            (click)="toggleDeptFilter(d.id)">
            <div class="flex items-center gap-2">
              <i class="pi {{ d.icon }} {{ d.color }} text-sm"></i>
              <span class="text-xs font-medium text-gray-300">{{ d.label }}</span>
            </div>
            <div class="mt-1 text-sm text-gray-400">
              <span class="font-semibold text-gray-200">{{ d.active }}</span> activos · {{ d.total }} total
            </div>
          </button>
        }
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap gap-2 items-center">
        <p-select [(ngModel)]="filterDept"   [options]="deptOptions"     placeholder="Depto"     [showClear]="true" styleClass="w-44" />
        <p-select [(ngModel)]="filterStatus" [options]="statusOptions"   placeholder="Estado"    [showClear]="true" styleClass="w-44" />
        <p-select [(ngModel)]="filterPriority" [options]="priorityOptions" placeholder="Prioridad" [showClear]="true" styleClass="w-44" />
        <p-select [(ngModel)]="filterBranchId" [options]="branchOptions()" placeholder="Sucursal" [showClear]="true" styleClass="w-56" />
        <input pInputText type="text" [(ngModel)]="filterSearch" placeholder="Buscar título…" class="w-56" />
        <p-button icon="pi pi-times" label="Limpiar" size="small" severity="secondary" [text]="true" (onClick)="clearFilters()" />
      </div>

      <!-- Tabla -->
      <p-card>
        @if (ticketsApi.isLoading()) {
          <div class="flex justify-center py-8"><p-progressSpinner styleClass="w-10 h-10" strokeWidth="3" /></div>
        } @else {
          <p-table
            [value]="filteredTickets()"
            styleClass="p-datatable-sm"
            [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10, 25, 50, 100]"
            sortField="created_at" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr class="text-xs">
                <th style="width:70px" pSortableColumn="id">#</th>
                <th pSortableColumn="department">Depto</th>
                <th pSortableColumn="title">Título</th>
                <th>Sucursal</th>
                <th pSortableColumn="priority">Prioridad</th>
                <th pSortableColumn="status">Estado</th>
                <th>Asignado</th>
                <th pSortableColumn="created_at">Creado</th>
                <th style="width:60px"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr class="cursor-pointer hover:bg-neutral-800/40" (click)="openDetail(t)">
                <td class="text-gray-400 text-xs font-mono">{{ fmtTicketId(t.id) }}</td>
                <td>
                  <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded leading-none {{ deptBadgeClass(t.department) }}">
                    <i class="pi {{ deptMeta(t.department).icon }} text-[10px]"></i>{{ deptMeta(t.department).label }}
                  </span>
                </td>
                <td class="font-medium text-gray-200">{{ t.title }}</td>
                <td class="text-xs text-gray-400">{{ t.branch?.name || '—' }}</td>
                <td>
                  <p-tag [value]="priorityMeta(t.priority).label" [severity]="priorityMeta(t.priority).severity" />
                </td>
                <td>
                  <p-tag [value]="statusMeta(t.status).label" [severity]="statusMeta(t.status).severity" />
                </td>
                <td class="text-xs text-gray-400">{{ employeeName(t.assignee) }}</td>
                <td class="text-xs text-gray-400">{{ t.created_at | date:'short' }}</td>
                <td><i class="pi pi-chevron-right text-gray-500"></i></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="9" class="text-center text-gray-400 py-6">Sin tickets para los filtros aplicados.</td></tr>
            </ng-template>
          </p-table>
        }
      </p-card>
    </div>

    <!-- Detalle -->
    <p-dialog [(visible)]="detailVisible" [modal]="true" [style]="{ width: '720px', maxWidth: '92vw' }" [header]="detailHeader()">
      @if (selectedTicket(); as t) {
        <div class="space-y-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded leading-none {{ deptBadgeClass(t.department) }}">
              <i class="pi {{ deptMeta(t.department).icon }} text-[11px]"></i>{{ deptMeta(t.department).label }}
            </span>
            <p-tag [value]="priorityMeta(t.priority).label" [severity]="priorityMeta(t.priority).severity" />
            <p-tag [value]="statusMeta(t.status).label"     [severity]="statusMeta(t.status).severity" />
            <span class="text-xs text-gray-400">· {{ t.branch?.name || 'Sin sucursal' }} · {{ employeeName(t.requester) }}</span>
          </div>
          <div class="text-sm text-gray-300 whitespace-pre-wrap bg-neutral-900/40 rounded p-3">{{ t.description }}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-400 uppercase">Estado</label>
              <p-select [(ngModel)]="editStatus" [options]="statusOptions" styleClass="w-full" />
            </div>
            <div>
              <label class="text-xs text-gray-400 uppercase">Asignado a</label>
              <p-select [(ngModel)]="editAssigneeId" [options]="assigneeOptions()" [showClear]="true" placeholder="—" styleClass="w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <p-button label="Cerrar" severity="secondary" size="small" [text]="true" (onClick)="detailVisible = false" />
            <p-button label="Guardar cambios" icon="pi pi-check" size="small" [loading]="savingEdit()" (onClick)="saveEdit()" />
          </div>
        </div>
      }
    </p-dialog>
  `,
})
export class TicketsAllAdminComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);

  /** Scope viene del route data: 'all' (default) o 'my-branch' (gerente de tienda). */
  scope = signal<'all' | 'my-branch'>('all');

  constructor() {
    const dataScope = this.route.snapshot.data?.['scope'];
    if (dataScope === 'my-branch') this.scope.set('my-branch');

    effect(() => {
      const list = this.ticketsApi.value();
      if (!list) return;
      const wantedId = Number(this.route.snapshot.queryParamMap.get('ticket'));
      if (!wantedId || this.detailVisible) return;
      const found = list.find(t => t.id === wantedId);
      if (found) this.openDetail(found);
    });
  }

  readonly statusOptions = [
    { label: 'Abierto',    value: 'open'       },
    { label: 'En Proceso', value: 'in_process' },
    { label: 'Resuelto',   value: 'resolved'   },
    { label: 'Cancelado',  value: 'cancelled'  },
  ];
  readonly priorityOptions = [
    { label: 'Baja',    value: 'low'    },
    { label: 'Media',   value: 'medium' },
    { label: 'Alta',    value: 'high'   },
    { label: 'Urgente', value: 'urgent' },
  ];
  readonly deptOptions = (Object.keys(DEPARTMENTS) as TicketDepartment[]).map(d => ({
    label: DEPARTMENTS[d].label, value: d,
  }));

  filterDept     = signal<TicketDepartment | null>(null);
  filterStatus   = signal<TicketStatus | null>(null);
  filterPriority = signal<TicketPriority | null>(null);
  filterBranchId = signal<string | null>(null);
  filterSearch   = signal<string>('');

  detailVisible = false;
  selectedTicket = signal<Ticket | null>(null);
  editStatus     = signal<TicketStatus>('open');
  editAssigneeId = signal<string | null>(null);
  savingEdit     = signal(false);

  ticketsApi = httpResource<Ticket[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      order:      'created_at.desc',
      select:     'id,title,description,department,category,priority,status,branch_id,company_id,requester_id,assignee_id,created_at,updated_at,' +
                  'branch:branches(id,name),' +
                  'requester:employees!tickets_requester_id_fkey(id,first_name,father_name),' +
                  'assignee:employees!tickets_assignee_id_fkey(id,first_name,father_name)',
    };
    // En scope my-branch, filtra por la sucursal del gerente logueado
    if (this.scope() === 'my-branch') {
      const branchId = this.store.currentEmployee()?.branch_id;
      if (!branchId) return undefined;
      params['branch_id'] = `eq.${branchId}`;
    }
    return { url: this.apiUrl.build('rest/v1/tickets', params), method: 'GET' };
  });

  allTickets = computed(() => this.ticketsApi.value() ?? []);

  /** Métricas globales para el KPI strip. */
  kpis = computed(() => {
    const arr = this.allTickets();
    const total = arr.length;
    const open = arr.filter(t => t.status === 'open').length;
    const inProcess = arr.filter(t => t.status === 'in_process').length;
    const resolved = arr.filter(t => t.status === 'resolved').length;
    const urgentActive = arr.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'cancelled').length;
    // avg horas hasta updated_at (proxy de resolución) entre los resolved
    const resolvedTickets = arr.filter(t => t.status === 'resolved' && t.created_at && t.updated_at);
    let avgResolutionHrs = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const updated = new Date(t.updated_at).getTime();
        return sum + Math.max(0, updated - created);
      }, 0);
      avgResolutionHrs = Math.round(totalMs / resolvedTickets.length / 3_600_000);
    }
    return { total, open, inProcess, resolved, urgentActive, avgResolutionHrs };
  });

  /** Mini-resumen por depto para los cards clickeables. */
  deptSummary = computed(() => {
    const arr = this.allTickets();
    return (Object.keys(DEPARTMENTS) as TicketDepartment[]).map(id => {
      const subset = arr.filter(t => t.department === id);
      const active = subset.filter(t => t.status === 'open' || t.status === 'in_process').length;
      const meta = DEPARTMENTS[id];
      return { id, label: meta.label.split(' /')[0], icon: meta.icon, color: meta.color, total: subset.length, active };
    });
  });

  filteredTickets = computed(() => {
    const d = this.filterDept();
    const s = this.filterStatus();
    const p = this.filterPriority();
    const b = this.filterBranchId();
    const q = this.filterSearch().trim().toLowerCase();
    return this.allTickets().filter(t => {
      if (d && t.department !== d) return false;
      if (s && t.status     !== s) return false;
      if (p && t.priority   !== p) return false;
      if (b && t.branch_id  !== b) return false;
      if (q && !(t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))) return false;
      return true;
    });
  });

  branchOptions = computed(() =>
    this.store.branches.entities().map(b => ({ label: b.name, value: b.id }))
  );

  assigneeOptions = computed(() =>
    this.store.employees.entities()
      .filter((e: any) => e.is_active !== false)
      .map((e: any) => ({ label: `${e.first_name} ${e.father_name}`.trim(), value: e.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  detailHeader = computed(() => {
    const t = this.selectedTicket();
    return t ? `Ticket ${this.fmtTicketId(t.id)} — ${t.title}` : 'Ticket';
  });

  deptMeta(d: TicketDepartment) { return DEPARTMENTS[d]; }
  /** Mapeo estático para que Tailwind purge no descarte las clases */
  private static readonly DEPT_BADGE: Record<TicketDepartment, string> = {
    it:         'bg-blue-950/40 text-blue-400 border border-blue-800/40',
    operations: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40',
    accounting: 'bg-amber-950/40 text-amber-400 border border-amber-800/40',
    hr:         'bg-purple-950/40 text-purple-400 border border-purple-800/40',
  };
  deptBadgeClass(d: TicketDepartment): string {
    return TicketsAllAdminComponent.DEPT_BADGE[d] || 'bg-neutral-800 text-gray-300';
  }
  statusMeta(s: string)   { return STATUS_META[s as TicketStatus]     ?? { label: s, severity: 'secondary' as const, icon: '' }; }
  priorityMeta(p: string) { return PRIORITY_META[p as TicketPriority] ?? { label: p, severity: 'secondary' as const, description: '', color: '' }; }
  fmtTicketId(n: number): string {
    if (n == null) return 'T—';
    const s = String(n).padStart(6, '0');
    return `T${s.slice(0,3)}-${s.slice(3)}`;
  }
  employeeName(e?: { first_name: string; father_name: string } | null) {
    if (!e) return '—';
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim() || '—';
  }

  toggleDeptFilter(d: TicketDepartment) {
    this.filterDept.set(this.filterDept() === d ? null : d);
  }

  clearFilters() {
    this.filterDept.set(null);
    this.filterStatus.set(null);
    this.filterPriority.set(null);
    this.filterBranchId.set(null);
    this.filterSearch.set('');
  }

  openDetail(t: Ticket) {
    this.selectedTicket.set(t);
    this.editStatus.set(t.status);
    this.editAssigneeId.set(t.assignee_id);
    this.detailVisible = true;
  }

  async saveEdit() {
    const t = this.selectedTicket();
    if (!t) return;
    this.savingEdit.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/tickets', { id: `eq.${t.id}` }),
          {
            status:      this.editStatus(),
            assignee_id: this.editAssigneeId(),
            updated_at:  new Date().toISOString(),
          },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Ticket actualizado.' });
      this.ticketsApi.reload();
      this.detailVisible = false;
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
    } finally {
      this.savingEdit.set(false);
    }
  }
}
