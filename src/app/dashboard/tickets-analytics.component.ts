// ────────────────────────────────────────────────────────────────────
// Dashboard analítico de tickets — seguimiento por departamento, SLA,
// top sucursales, top assignees, tendencia 30d. Solo tickets_view_all.
// ────────────────────────────────────────────────────────────────────

import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DEPARTMENTS, TicketDepartment } from '../models/ticket.model';

interface TicketRow {
  id: number;
  title: string;
  department: TicketDepartment;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_process' | 'resolved' | 'cancelled';
  branch_id: string | null;
  requester_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  branch?: { id: string; name: string } | null;
  requester?: { id: string; first_name: string; father_name: string } | null;
  assignee?:  { id: string; first_name: string; father_name: string } | null;
}

// SLA en horas: cuánto tiempo MAX se espera para resolver según prioridad
const SLA_HOURS: Record<string, number> = {
  urgent: 2,
  high:   24,
  medium: 72,
  low:    168,
};

@Component({
  selector: 'pt-tickets-analytics',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule,
    ButtonModule, CardModule, SelectModule, TableModule, TagModule,
    ProgressSpinnerModule, BaseChartDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-6 space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-bar text-amber-400 text-xl"></i>
            <h2 class="text-xl font-semibold text-gray-100">Analytics de Tickets</h2>
          </div>
          <p class="text-sm text-gray-400 mt-1">Seguimiento por departamento, SLA y tendencias.</p>
        </div>
        <div class="flex gap-2 items-center">
          <p-select [(ngModel)]="range" [options]="rangeOptions" styleClass="w-36" />
          <p-button icon="pi pi-refresh" label="Actualizar" size="small" severity="secondary" (onClick)="ticketsApi.reload()" />
        </div>
      </div>

      @if (ticketsApi.isLoading()) {
        <div class="flex justify-center py-12"><p-progressSpinner styleClass="w-12 h-12" strokeWidth="3" /></div>
      } @else {
        <!-- KPI strip global -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
            <div class="text-[11px] uppercase tracking-wide text-gray-400">Total ({{ rangeLabel() }})</div>
            <div class="text-2xl font-bold text-gray-100">{{ kpis().total }}</div>
            <div class="text-[11px] text-gray-500 mt-1">{{ kpis().created24h }} en 24h</div>
          </div>
          <div class="bg-amber-950/40 border border-amber-700/40 rounded-lg p-3">
            <div class="text-[11px] uppercase tracking-wide text-amber-300/80">Abiertos</div>
            <div class="text-2xl font-bold text-amber-300">{{ kpis().open }}</div>
            <div class="text-[11px] text-amber-400/60 mt-1">activos ahora</div>
          </div>
          <div class="bg-blue-950/40 border border-blue-700/40 rounded-lg p-3">
            <div class="text-[11px] uppercase tracking-wide text-blue-300/80">En Proceso</div>
            <div class="text-2xl font-bold text-blue-300">{{ kpis().inProcess }}</div>
            <div class="text-[11px] text-blue-400/60 mt-1">trabajándose</div>
          </div>
          <div class="bg-emerald-950/40 border border-emerald-700/40 rounded-lg p-3">
            <div class="text-[11px] uppercase tracking-wide text-emerald-300/80">Resueltos</div>
            <div class="text-2xl font-bold text-emerald-300">{{ kpis().resolved }}</div>
            <div class="text-[11px] text-emerald-400/60 mt-1">{{ kpis().resolved24h }} en 24h</div>
          </div>
          <div class="bg-rose-950/40 border border-rose-700/40 rounded-lg p-3">
            <div class="text-[11px] uppercase tracking-wide text-rose-300/80">Vencidos SLA</div>
            <div class="text-2xl font-bold text-rose-300">{{ kpis().slaBreach }}</div>
            <div class="text-[11px] text-rose-400/60 mt-1">{{ kpis().slaPct | number:'1.0-0' }}% breach</div>
          </div>
          <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
            <div class="text-[11px] uppercase tracking-wide text-gray-400">Avg. resolución</div>
            <div class="text-2xl font-bold text-gray-100">{{ kpis().avgResolutionHrs }}<span class="text-sm text-gray-400 ml-1">h</span></div>
            <div class="text-[11px] text-gray-500 mt-1">en los resueltos</div>
          </div>
        </div>

        <!-- Cards por departamento -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (d of deptCards(); track d.id) {
            <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-3">
                <i class="pi {{ d.icon }} {{ d.color }} text-lg"></i>
                <div class="text-sm font-semibold text-gray-200">{{ d.label }}</div>
              </div>
              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div class="text-[10px] uppercase text-gray-400">Abiertos</div>
                  <div class="text-xl font-bold text-amber-300">{{ d.open }}</div>
                </div>
                <div>
                  <div class="text-[10px] uppercase text-gray-400">En Proceso</div>
                  <div class="text-xl font-bold text-blue-300">{{ d.inProcess }}</div>
                </div>
                <div>
                  <div class="text-[10px] uppercase text-gray-400">Resueltos</div>
                  <div class="text-xl font-bold text-emerald-300">{{ d.resolved }}</div>
                </div>
                <div>
                  <div class="text-[10px] uppercase text-gray-400">SLA breach</div>
                  <div class="text-xl font-bold" [class.text-rose-300]="d.breach > 0" [class.text-gray-300]="d.breach === 0">{{ d.breach }}</div>
                </div>
              </div>
              <div class="pt-2 border-t border-neutral-700/40 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div class="text-gray-400">Avg. resolución</div>
                  <div class="text-gray-200 font-medium">{{ d.avgHrs }}h</div>
                </div>
                <div>
                  <div class="text-gray-400">% cumplimiento</div>
                  <div class="font-medium"
                       [class.text-emerald-300]="d.compliancePct >= 80"
                       [class.text-amber-300]="d.compliancePct >= 60 && d.compliancePct < 80"
                       [class.text-rose-300]="d.compliancePct < 60">{{ d.compliancePct | number:'1.0-0' }}%</div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Tendencia 30d (line chart) -->
        <div class="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4">
          <h3 class="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <i class="pi pi-chart-line text-amber-400 text-xs"></i> Volumen por día (últimos 30 días)
          </h3>
          <div style="height: 240px;">
            <canvas baseChart [data]="trendChartData()" [options]="trendOptions" type="line"></canvas>
          </div>
        </div>

        <!-- Distribución por prioridad y top sucursales -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div class="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4">
            <h3 class="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <i class="pi pi-flag text-amber-400 text-xs"></i> Distribución por prioridad
            </h3>
            <div style="height: 220px;">
              <canvas baseChart [data]="priorityChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
            </div>
          </div>
          <div class="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4">
            <h3 class="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <i class="pi pi-map-marker text-amber-400 text-xs"></i> Top 10 sucursales reportando
            </h3>
            <div style="height: 220px; overflow-y: auto;">
              <div class="space-y-1.5">
                @for (b of topBranches(); track b.name) {
                  <div class="flex items-center justify-between gap-2 text-sm">
                    <span class="text-gray-200 flex-1 min-w-0 truncate">{{ b.name }}</span>
                    <div class="flex-1 max-w-[180px] h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-amber-500 to-amber-400" [style.width.%]="b.pct"></div>
                    </div>
                    <span class="text-gray-400 text-xs w-8 text-right">{{ b.count }}</span>
                  </div>
                }
                @if (topBranches().length === 0) {
                  <div class="text-xs text-gray-500 text-center py-6">Sin datos</div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Top assignees y categorías -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div class="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4">
            <h3 class="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <i class="pi pi-user-edit text-amber-400 text-xs"></i> Top 10 asignados (carga activa)
            </h3>
            <p-table [value]="topAssignees()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr class="text-xs">
                  <th>Persona</th>
                  <th class="text-center">Activos</th>
                  <th class="text-center">Resueltos</th>
                  <th class="text-center">Avg. resol.</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-a>
                <tr>
                  <td class="text-sm text-gray-200">{{ a.name }}</td>
                  <td class="text-center"><span class="text-amber-300 font-semibold">{{ a.active }}</span></td>
                  <td class="text-center text-emerald-300">{{ a.resolved }}</td>
                  <td class="text-center text-gray-400 text-xs">{{ a.avgHrs }}h</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center text-gray-400 py-4">Sin asignaciones</td></tr>
              </ng-template>
            </p-table>
          </div>

          <div class="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-4">
            <h3 class="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <i class="pi pi-tag text-amber-400 text-xs"></i> Categorías más reportadas
            </h3>
            <div style="max-height: 280px; overflow-y: auto;">
              <div class="space-y-1.5">
                @for (c of topCategories(); track c.key) {
                  <div class="flex items-center justify-between gap-2 text-sm">
                    <div class="flex-1 min-w-0">
                      <div class="text-gray-200 text-xs">{{ c.deptLabel }} · <span class="text-gray-100">{{ c.label }}</span></div>
                    </div>
                    <div class="flex-1 max-w-[140px] h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-blue-500 to-blue-400" [style.width.%]="c.pct"></div>
                    </div>
                    <span class="text-gray-400 text-xs w-8 text-right">{{ c.count }}</span>
                  </div>
                }
                @if (topCategories().length === 0) {
                  <div class="text-xs text-gray-500 text-center py-6">Sin datos</div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Tickets vencidos SLA -->
        <div class="bg-neutral-800/40 border border-rose-800/40 rounded-xl p-4">
          <h3 class="text-sm font-semibold text-rose-300 mb-3 flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-xs"></i> Tickets vencidos por SLA ({{ slaBreaches().length }})
          </h3>
          <p-table [value]="slaBreaches()" styleClass="p-datatable-sm" [paginator]="slaBreaches().length > 10" [rows]="10">
            <ng-template pTemplate="header">
              <tr class="text-xs">
                <th>Ticket</th>
                <th>Depto</th>
                <th>Prioridad</th>
                <th>Sucursal</th>
                <th>Asignado</th>
                <th class="text-right">Edad</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr>
                <td class="text-xs">
                  <div class="font-mono text-gray-400">{{ fmtTicketId(t.id) }}</div>
                  <div class="text-gray-200 text-xs">{{ t.title }}</div>
                </td>
                <td class="text-xs">{{ deptMeta(t.department).label }}</td>
                <td><p-tag [value]="t.priority" severity="danger" /></td>
                <td class="text-xs text-gray-400">{{ t.branch?.name || '—' }}</td>
                <td class="text-xs text-gray-400">{{ employeeName(t.assignee) || 'sin asignar' }}</td>
                <td class="text-right text-rose-300 font-semibold text-xs">{{ ageHrs(t) }}h <span class="text-gray-500">/{{ sla(t) }}h</span></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center text-emerald-300 py-4">✓ Sin tickets vencidos. Bien hecho.</td></tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>
  `,
})
export class TicketsAnalyticsComponent {
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);

  rangeOptions = [
    { label: 'Últimos 7 días',  value: 7 },
    { label: 'Últimos 30 días', value: 30 },
    { label: 'Últimos 90 días', value: 90 },
    { label: 'Todo el histórico', value: 9999 },
  ];
  range = signal<number>(30);

  rangeLabel = computed(() => {
    const r = this.range();
    return r === 9999 ? 'histórico' : `${r}d`;
  });

  ticketsApi = httpResource<TicketRow[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    const days = this.range();
    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      order:      'created_at.desc',
      select:     'id,title,department,category,priority,status,branch_id,requester_id,assignee_id,created_at,updated_at,' +
                  'branch:branches(id,name),' +
                  'requester:employees!tickets_requester_id_fkey(id,first_name,father_name),' +
                  'assignee:employees!tickets_assignee_id_fkey(id,first_name,father_name)',
    };
    if (days < 9999) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      params['created_at'] = `gte.${cutoff}`;
    }
    return { url: this.apiUrl.build('rest/v1/tickets', params), method: 'GET' };
  });

  private all = computed<TicketRow[]>(() => this.ticketsApi.value() ?? []);

  // ── KPIs globales ────────────────────────────────────────────────
  kpis = computed(() => {
    const arr = this.all();
    const now = Date.now();
    const last24h = now - 86_400_000;
    const resolvedArr = arr.filter(t => t.status === 'resolved');
    const open = arr.filter(t => t.status === 'open').length;
    const inProcess = arr.filter(t => t.status === 'in_process').length;
    const cancelled = arr.filter(t => t.status === 'cancelled').length;
    const resolved = resolvedArr.length;
    const total = arr.length;
    const slaBreach = arr.filter(t => this.isBreached(t)).length;
    const completed = total - open - inProcess; // resolved + cancelled
    const compliant = completed - arr.filter(t => (t.status === 'resolved' || t.status === 'cancelled') && this.wasBreached(t)).length;
    const slaPct = completed > 0 ? (1 - (compliant / completed)) * 100 : 0;

    let avgResolutionHrs = 0;
    if (resolvedArr.length > 0) {
      const ms = resolvedArr.reduce((s, t) => s + Math.max(0, new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()), 0);
      avgResolutionHrs = Math.round(ms / resolvedArr.length / 3_600_000);
    }
    return {
      total, open, inProcess, resolved, cancelled, slaBreach,
      slaPct: Number.isFinite(slaPct) ? slaPct : 0,
      avgResolutionHrs,
      created24h: arr.filter(t => new Date(t.created_at).getTime() >= last24h).length,
      resolved24h: resolvedArr.filter(t => new Date(t.updated_at).getTime() >= last24h).length,
    };
  });

  // ── Cards por departamento ───────────────────────────────────────
  deptCards = computed(() => {
    const arr = this.all();
    return (Object.keys(DEPARTMENTS) as TicketDepartment[]).map(id => {
      const sub = arr.filter(t => t.department === id);
      const open = sub.filter(t => t.status === 'open').length;
      const inProcess = sub.filter(t => t.status === 'in_process').length;
      const resolvedArr = sub.filter(t => t.status === 'resolved');
      const resolved = resolvedArr.length;
      const breach = sub.filter(t => this.isBreached(t)).length;
      let avgHrs = 0;
      if (resolvedArr.length > 0) {
        const ms = resolvedArr.reduce((s, t) => s + Math.max(0, new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()), 0);
        avgHrs = Math.round(ms / resolvedArr.length / 3_600_000);
      }
      const completed = resolvedArr.length + sub.filter(t => t.status === 'cancelled').length;
      const breached = sub.filter(t => (t.status === 'resolved' || t.status === 'cancelled') && this.wasBreached(t)).length;
      const compliancePct = completed > 0 ? ((completed - breached) / completed) * 100 : 100;
      const meta = DEPARTMENTS[id];
      return { id, label: meta.label.split(' /')[0], icon: meta.icon, color: meta.color, open, inProcess, resolved, breach, avgHrs, compliancePct };
    });
  });

  // ── Top sucursales ────────────────────────────────────────────────
  topBranches = computed(() => {
    const arr = this.all();
    const counts: Record<string, number> = {};
    for (const t of arr) {
      const name = t.branch?.name || 'Sin sucursal';
      counts[name] = (counts[name] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = entries[0]?.[1] || 1;
    return entries.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
  });

  // ── Top assignees ────────────────────────────────────────────────
  topAssignees = computed(() => {
    const arr = this.all();
    const map: Record<string, { name: string; active: number; resolved: number; totalMs: number }> = {};
    for (const t of arr) {
      if (!t.assignee) continue;
      const name = `${(t.assignee.first_name||'').trim()} ${(t.assignee.father_name||'').trim()}`.trim();
      if (!map[name]) map[name] = { name, active: 0, resolved: 0, totalMs: 0 };
      if (t.status === 'open' || t.status === 'in_process') map[name].active++;
      if (t.status === 'resolved') {
        map[name].resolved++;
        map[name].totalMs += Math.max(0, new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
      }
    }
    return Object.values(map)
      .sort((a, b) => (b.active + b.resolved) - (a.active + a.resolved))
      .slice(0, 10)
      .map(x => ({ name: x.name, active: x.active, resolved: x.resolved, avgHrs: x.resolved > 0 ? Math.round(x.totalMs / x.resolved / 3_600_000) : 0 }));
  });

  // ── Top categorías ───────────────────────────────────────────────
  topCategories = computed(() => {
    const arr = this.all();
    const counts: Record<string, { count: number; dept: TicketDepartment; cat: string }> = {};
    for (const t of arr) {
      if (!t.category) continue;
      const key = `${t.department}|${t.category}`;
      if (!counts[key]) counts[key] = { count: 0, dept: t.department, cat: t.category };
      counts[key].count++;
    }
    const entries = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
    const max = entries[0]?.count || 1;
    return entries.map(e => ({
      key: `${e.dept}|${e.cat}`,
      deptLabel: DEPARTMENTS[e.dept].label.split(' /')[0],
      label: e.cat,
      count: e.count,
      pct: (e.count / max) * 100,
    }));
  });

  // ── Tickets vencidos SLA (activos solamente) ─────────────────────
  slaBreaches = computed(() => this.all().filter(t => this.isBreached(t)));

  // ── Tendencia: tickets por día ───────────────────────────────────
  private trendBuckets = computed(() => {
    const days = Math.min(this.range(), 30);
    const arr = this.all();
    const labels: string[] = [];
    const counts: number[] = [];
    const now = new Date(); now.setHours(0,0,0,0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const c = arr.filter(t => {
        const ts = new Date(t.created_at).getTime();
        return ts >= d.getTime() && ts < next.getTime();
      }).length;
      labels.push(d.toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit' }));
      counts.push(c);
    }
    return { labels, counts };
  });

  trendChartData = computed<ChartData<'line'>>(() => {
    const { labels, counts } = this.trendBuckets();
    return {
      labels,
      datasets: [{
        label: 'Tickets creados',
        data: counts,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251,191,36,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      }],
    };
  });

  trendOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9ca3af', font: { size: 10 }, precision: 0 }, beginAtZero: true },
    },
  };

  priorityChartData = computed<ChartData<'doughnut'>>(() => {
    const arr = this.all();
    const c = {
      urgent: arr.filter(t => t.priority === 'urgent').length,
      high:   arr.filter(t => t.priority === 'high').length,
      medium: arr.filter(t => t.priority === 'medium').length,
      low:    arr.filter(t => t.priority === 'low').length,
    };
    return {
      labels: ['Urgente', 'Alta', 'Media', 'Baja'],
      datasets: [{
        data: [c.urgent, c.high, c.medium, c.low],
        backgroundColor: ['#ef4444', '#f59e0b', '#60a5fa', '#6b7280'],
        borderColor: '#171717',
        borderWidth: 2,
      }],
    };
  });

  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#d4d4d8', font: { size: 11 } } } },
  };

  // ── Helpers ──────────────────────────────────────────────────────
  deptMeta(d: TicketDepartment) { return DEPARTMENTS[d]; }
  employeeName(e?: { first_name: string; father_name: string } | null) {
    if (!e) return '';
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim();
  }
  fmtTicketId(n: number): string {
    if (n == null) return 'T—';
    const s = String(n).padStart(6, '0');
    return `T${s.slice(0,3)}-${s.slice(3)}`;
  }
  sla(t: TicketRow): number { return SLA_HOURS[t.priority] ?? 168; }
  ageHrs(t: TicketRow): number {
    return Math.floor((Date.now() - new Date(t.created_at).getTime()) / 3_600_000);
  }
  isBreached(t: TicketRow): boolean {
    if (t.status === 'resolved' || t.status === 'cancelled') return false;
    return this.ageHrs(t) > this.sla(t);
  }
  wasBreached(t: TicketRow): boolean {
    const hrs = (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000;
    return hrs > this.sla(t);
  }
}
