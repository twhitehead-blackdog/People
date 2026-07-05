import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getEnv } from '../../utils/env.utils';

type Row = Record<string, unknown>;
interface Metrics {
  overview?: Row;
  commerce?: Row;
  top_searches?: Row[];
  zero_result_searches?: Row[];
  top_pages?: Row[];
  breakdown?: { devices?: Row[]; browsers?: Row[]; sources?: Row[] };
}

@Component({
  selector: 'pt-web-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="min-h-[calc(100dvh-56px)] bg-neutral-950 text-neutral-100 px-3 sm:px-5 md:px-8 py-4">
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h1 class="text-xl font-bold text-amber-400">Analítica Web</h1>
      <div class="flex gap-1.5">
        @for (d of ranges; track d.v) {
          <button (click)="setDays(d.v)"
            class="rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
            [class]="days() === d.v ? 'bg-amber-400 text-neutral-900' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'">
            {{ d.l }}
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <p class="text-neutral-400 text-sm">Cargando métricas…</p>
    } @else if (error()) {
      <p class="text-rose-400 text-sm">No se pudieron cargar las métricas. {{ error() }}</p>
    } @else {
      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
        @for (k of kpis(); track k[0]) {
          <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <div class="text-lg font-black tabular-nums leading-none">{{ k[1] }}</div>
            <div class="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{{ k[0] }}</div>
          </div>
        }
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <!-- Top búsquedas -->
        <section class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 class="mb-3 text-xs font-black uppercase tracking-wider text-amber-400">Top búsquedas</h3>
          @if ((m()?.top_searches ?? []).length === 0) { <p class="text-xs text-neutral-500">Sin datos aún</p> }
          <ul class="space-y-1 text-sm">
            @for (r of m()?.top_searches ?? []; track $index) {
              <li class="flex justify-between"><span class="text-neutral-300">{{ r['query'] }}</span><span class="font-bold tabular-nums">{{ r['n'] }}</span></li>
            }
          </ul>
        </section>

        <!-- Búsquedas sin resultados -->
        <section class="rounded-xl border-2 border-rose-500/40 bg-rose-950/20 p-4">
          <h3 class="text-xs font-black uppercase tracking-wider text-rose-400">Búsquedas SIN resultados</h3>
          <p class="mb-2 text-[11px] text-rose-300/70">Demanda no cubierta — oportunidades de producto/naming.</p>
          @if ((m()?.zero_result_searches ?? []).length === 0) { <p class="text-xs text-neutral-500">Ninguna</p> }
          <ul class="space-y-1 text-sm">
            @for (r of m()?.zero_result_searches ?? []; track $index) {
              <li class="flex justify-between"><span class="text-neutral-200 font-medium">{{ r['query'] }}</span><span class="font-bold tabular-nums text-rose-400">{{ r['n'] }}</span></li>
            }
          </ul>
        </section>

        <!-- Páginas más vistas -->
        <section class="rounded-xl border border-neutral-800 bg-neutral-900 p-4 lg:col-span-2">
          <h3 class="mb-3 text-xs font-black uppercase tracking-wider text-amber-400">Páginas más vistas</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-[11px] uppercase tracking-wider text-neutral-500"><th class="py-1">Página</th><th class="py-1 text-right">Vistas</th><th class="py-1 text-right">Tiempo prom.</th></tr></thead>
              <tbody>
                @for (r of m()?.top_pages ?? []; track $index) {
                  <tr class="border-t border-neutral-800"><td class="py-1.5 truncate max-w-[420px] text-neutral-300">{{ r['path'] }}</td><td class="py-1.5 text-right font-bold tabular-nums">{{ r['views'] }}</td><td class="py-1.5 text-right text-neutral-400">{{ dur(r['avg_dwell_ms']) }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <!-- Barras -->
        @for (g of bars(); track g.label) {
          <section class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 class="mb-3 text-xs font-black uppercase tracking-wider text-amber-400">{{ g.label }}</h3>
            @if (g.rows.length === 0) { <p class="text-xs text-neutral-500">Sin datos</p> }
            <ul class="space-y-1.5">
              @for (r of g.rows; track $index) {
                <li class="text-xs">
                  <div class="flex justify-between mb-0.5"><span class="truncate pr-2 text-neutral-300">{{ r.name }}</span><span class="font-bold tabular-nums">{{ r.n }}</span></div>
                  <div class="h-1.5 rounded-full bg-neutral-800 overflow-hidden"><div class="h-full bg-amber-400" [style.width.%]="g.max ? (r.n / g.max) * 100 : 0"></div></div>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    }
  </div>
  `,
})
export class WebAnalyticsComponent {
  private http = inject(HttpClient);
  ranges = [{ v: 1, l: 'Hoy' }, { v: 7, l: '7d' }, { v: 30, l: '30d' }, { v: 90, l: '90d' }];
  days = signal(7);
  loading = signal(true);
  error = signal<string | null>(null);
  m = signal<Metrics | null>(null);

  constructor() { this.load(); }

  setDays(d: number) { if (d !== this.days()) { this.days.set(d); this.load(); } }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    const url = getEnv('ENV_WEB_METRICS_URL');
    const token = getEnv('ENV_WEB_METRICS_TOKEN');
    if (!url || !token) { this.error.set('Config faltante'); this.loading.set(false); return; }
    try {
      const data = await firstValueFrom(
        this.http.get<Metrics>(`${url}?days=${this.days()}`, { headers: { 'x-metrics-token': token } }),
      );
      this.m.set(data);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'error');
    } finally {
      this.loading.set(false);
    }
  }

  private n(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0; }
  private money(v: unknown): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(this.n(v)); }
  private num(v: unknown): string { return new Intl.NumberFormat('es-PA').format(this.n(v)); }
  dur(v: unknown): string { const s = Math.round(this.n(v) / 1000); if (!s) return '—'; return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

  kpis(): [string, string][] {
    const o = this.m()?.overview ?? {}; const c = this.m()?.commerce ?? {};
    return [
      ['Vistas', this.num(o['page_views'])],
      ['Sesiones', this.num(o['sessions'])],
      ['Visitantes', this.num(o['visitors'])],
      ['Carritos activos', this.num(c['active_carts'])],
      ['Compras', this.num(c['orders_paid'])],
      ['Ingresos', this.money(c['revenue'])],
      ['Ticket prom.', this.money(c['aov'])],
      ['Conversión', `${this.n(c['conversion_pct'])}%`],
      ['Compras hoy', this.num(c['orders_today'])],
      ['Ingresos hoy', this.money(c['revenue_today'])],
      ['Pendientes pago', this.num(c['orders_pending'])],
      ['Búsquedas', this.num(o['searches'])],
      ['Add to cart', this.num(o['add_to_cart'])],
      ['Checkouts', this.num(o['begin_checkout'])],
      ['PWA instalado', this.num(o['pwa_installed'])],
      ['PWA en uso', this.num(o['pwa_launch'])],
      ['Tiempo prom.', this.dur(o['avg_dwell_ms'])],
      ['Móvil', `${this.n(o['mobile_pct'])}%`],
    ];
  }

  bars(): { label: string; rows: { name: string; n: number }[]; max: number }[] {
    const b = this.m()?.breakdown ?? {};
    const c = this.m()?.commerce ?? {};
    const mk = (label: string, rows: Row[] | undefined, nameKey: string) => {
      const mapped = (rows ?? []).map((r) => ({ name: String(r[nameKey] ?? '—'), n: this.n(r['n']) }));
      return { label, rows: mapped, max: Math.max(1, ...mapped.map((x) => x.n)) };
    };
    return [
      mk('Compras por método', (c['by_method'] as Row[]) ?? [], 'payment_method'),
      mk('Fuentes de tráfico', b.sources, 'src'),
      mk('Dispositivos', b.devices, 'device'),
      mk('Navegadores', b.browsers, 'browser'),
    ];
  }
}
