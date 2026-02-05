import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarModule } from 'primeng/calendar';
import { HomeDataService, OdooSaleOrder } from '../../services/home-data.service';
import { BranchesStore } from '../../../../stores/branches.store';
import { PELUQUERIA_POSITION_NAMES } from '../../../services/groomer-schedule-utils.service';
import { toZonedTime } from 'date-fns-tz';
import { format, parseISO, differenceInMinutes } from 'date-fns';

const TZ = 'America/Panama';

// Alerta por posición específica: si hay más de este número con esta posición en la misma tienda
const ALERT_POSITION_ID = '8fae41e2-6054-48c6-91f9-7388a87d6245';
const ALERT_POSITION_THRESHOLD = 2; // más de 2 (es decir 3 o más) = alerta

// Sucursales que no se muestran en la vista Peluquería
const BRANCHES_EXCLUDED_FROM_PELUQUERIA = ['Oficina Central', 'Bodega Dos Caminos'];

// IDs de horarios que no cuentan para tardanza (feriado, día libre)
const SCHEDULE_ID_FERIADO = '3d07f626-d58f-4203-bac5-f6e35557e0ad';
const SCHEDULE_ID_DIA_LIBRE = 'c01dff8f-ce0d-498f-a473-46418576e589';

type TimelogWithBranch = {
  employee_id: string;
  branch_id: string;
  created_at?: string;
  punched_at?: string | null;
  branch?: { id: string; name: string; short_name?: string };
  employee?: {
    id: string;
    first_name?: string;
    father_name?: string;
    position?: { id?: string; name?: string };
  };
};

type TimelogExitRaw = {
  employee_id: string;
  branch_id: string;
  created_at?: string;
  punched_at?: string | null;
};

export type PersonPeluqueria = {
  employeeId: string;
  name: string;
  position?: string;
  positionId?: string;
  entryTime?: string;
  exitTime?: string;
  isLate?: boolean;
  minutesLate?: number;
};

export type BranchPeluqueriaRow = {
  branchId: string;
  branchName: string;
  shortName: string;
  count: number;
  /** Contador por nombre de posición en esta tienda */
  positionCounts: Record<string, number>;
  /** Lista agrupada por posición (para mostrar por secciones) */
  peopleByPosition: { positionName: string; positionId?: string; people: PersonPeluqueria[] }[];
  /** true si hay más de ALERT_POSITION_THRESHOLD con la posición específica (id 8fae41e2-...) en esta tienda */
  alertOverflow: boolean;
  /** Cantidad de la posición alerta en esta tienda (para el mensaje) */
  alertPositionCount: number;
  people: PersonPeluqueria[];
};

@Component({
  selector: 'pt-peluqueria-section',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule, CalendarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="peluqueria-section">
      <div class="section-header">
        <div class="section-title-row">
          <h2 class="section-title">
            <i class="pi pi-building"></i>
            Peluquería por sucursal
          </h2>
          <div class="date-filter">
            <label class="date-filter-label">Ver fecha:</label>
            <p-calendar
              [ngModel]="homeData.peluqueriaViewDate()"
              (ngModelChange)="onViewDateChange($event)"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [maxDate]="maxDate()"
              styleClass="peluqueria-date-picker"
              inputStyleClass="peluqueria-date-input"
            ></p-calendar>
          </div>
        </div>
        <p class="section-subtitle">
          Cantidad de peluqueros en cada tienda (quien marcó entrada en la fecha seleccionada)
        </p>
        <p class="section-date">{{ dateLabel() }}</p>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando...</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
        </div>
      } @else if (branchRows().length === 0) {
        <div class="empty-state">
          <i class="pi pi-inbox"></i>
          <span>No hay sucursales activas</span>
        </div>
      } @else {
        <div class="branch-grid">
          @for (row of branchRows(); track row.branchId) {
            <div class="branch-card" [class.branch-card-alert]="row.alertOverflow">
              @if (row.alertOverflow) {
                <div class="overflow-alert" [pTooltip]="'Más de ' + ALERT_POSITION_THRESHOLD + ' con esta posición en la misma tienda'" tooltipPosition="top">
                  <i class="pi pi-exclamation-triangle"></i>
                  Alerta: más de {{ ALERT_POSITION_THRESHOLD }} con esta posición en tienda ({{ row.alertPositionCount }})
                </div>
              }
              <div class="branch-card-header">
                <span class="branch-name">{{ row.branchName }}</span>
                <span class="branch-count-badge">{{ row.count }} en tienda</span>
              </div>
              @if (getPositionCountEntries(row.positionCounts).length > 0) {
                <div class="position-counts">
                  @for (pos of getPositionCountEntries(row.positionCounts); track pos[0]) {
                    <span class="position-badge">{{ pos[0] }}: {{ pos[1] }}</span>
                  }
                </div>
              }
              @if (row.peopleByPosition.length === 0) {
                <p class="no-marcados">Ningún peluquero ha marcado entrada aún</p>
              } @else {
                @for (group of row.peopleByPosition; track group.positionName) {
                  <div class="position-group">
                    <h4 class="position-group-title">{{ group.positionName }} ({{ group.people.length }})</h4>
                    <ul class="people-list">
                      @for (p of group.people; track p.employeeId) {
                        <li class="person-row" [class.person-late]="p.isLate">
                          <div class="person-info">
                            <span class="person-name">{{ p.name }}</span>
                            @if (p.isLate && p.minutesLate != null) {
                              <span class="late-badge" [pTooltip]="'Llegó ' + p.minutesLate + ' min después del horario'" tooltipPosition="top">
                                <i class="pi pi-clock"></i> Tarde (+{{ p.minutesLate }} min)
                              </span>
                            }
                            <div class="day-record">
                              <span class="record-entry">Entrada: {{ p.entryTime ?? '—' }}</span>
                              <span class="record-exit">Salida: {{ p.exitTime ?? 'Sin salida' }}</span>
                            </div>
                          </div>
                          @if (p.entryTime) {
                            <span class="entry-time" [pTooltip]="'Marcó entrada a las ' + p.entryTime" tooltipPosition="left">
                              @if (p.isLate) {
                                <i class="pi pi-exclamation-triangle status-late"></i>
                              } @else {
                                <i class="pi pi-check-circle status-ok"></i>
                              }
                              {{ p.entryTime }}
                            </span>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              }
            </div>
          }
        </div>
      }

      <!-- Órdenes de venta Odoo (peluquería) para la fecha seleccionada -->
      <div class="odoo-orders-section">
        <h3 class="odoo-orders-title">
          <i class="pi pi-shopping-cart"></i>
          Órdenes de venta (Odoo) – Peluquería
        </h3>
        @if (odooOrdersLoading()) {
          <p class="odoo-orders-loading"><i class="pi pi-spin pi-spinner"></i> Cargando órdenes...</p>
        } @else if (odooOrdersError()) {
          <p class="odoo-orders-error">{{ odooOrdersError() }}</p>
        } @else if (odooOrders().length === 0) {
          <p class="odoo-orders-empty">No hay órdenes de peluquería para esta fecha.</p>
        } @else {
          <div class="odoo-orders-grid">
            @for (order of odooOrders(); track order.id) {
              <div class="odoo-order-card">
                <span class="odoo-order-name">{{ order.name }}</span>
                <span class="odoo-order-date">{{ formatOdooDate(order.date_order) }}</span>
                @if (order.nombres_mascotas) {
                  <span class="odoo-order-mascotas">{{ order.nombres_mascotas }}</span>
                }
                <span class="odoo-order-stats">
                  Peluquería: {{ order.count_peluqueria ?? 0 }}
                  @if ((order.count_bano_y_corte ?? 0) + (order.count_solo_bano ?? 0) > 0) {
                    · Baño: {{ (order.count_solo_bano ?? 0) + (order.count_bano_y_corte ?? 0) }}
                    · Corte: {{ order.count_cortes ?? 0 }}
                  }
                </span>
                <span class="odoo-order-state state-{{ order.state }}">{{ order.state }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .peluqueria-section {
        padding: 1.5rem;
        max-width: 1400px;
        margin: 0 auto;
      }
      .section-header {
        margin-bottom: 1.5rem;
      }
      .section-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.25rem;
      }
      .section-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
      }
      .section-title i {
        font-size: 1.25rem;
      }
      .date-filter {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .date-filter-label {
        font-size: 0.875rem;
        color: #a1a1aa;
      }
      :host ::ng-deep .peluqueria-date-picker .p-inputtext {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: #e4e4e7;
      }
      :host ::ng-deep .peluqueria-date-picker .p-datepicker-trigger {
        background: rgba(251, 191, 36, 0.15);
        border-color: rgba(251, 191, 36, 0.3);
        color: #fbbf24;
      }
      .section-subtitle {
        color: #a1a1aa;
        font-size: 0.9rem;
        margin: 0 0 0.5rem 0;
      }
      .section-date {
        color: #71717a;
        font-size: 0.85rem;
        margin: 0;
      }
      .loading-state,
      .error-state,
      .empty-state {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 2rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        color: #a1a1aa;
      }
      .error-state {
        color: #f87171;
      }
      .empty-state i {
        font-size: 2rem;
        opacity: 0.6;
      }
      .branch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }
      .branch-card {
        background: linear-gradient(135deg, rgba(24, 24, 27, 0.9) 0%, rgba(15, 15, 16, 0.95) 100%);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 1rem;
        transition: border-color 0.2s;
      }
      .branch-card:hover {
        border-color: rgba(251, 191, 36, 0.2);
      }
      .branch-card.branch-card-alert {
        border-color: rgba(239, 68, 68, 0.4);
        box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
      }
      .overflow-alert {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #f87171;
        background: rgba(239, 68, 68, 0.12);
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        margin-bottom: 0.75rem;
      }
      .overflow-alert i {
        font-size: 1rem;
      }
      .branch-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .branch-name {
        font-weight: 600;
        color: #e4e4e7;
      }
      .branch-count-badge {
        font-size: 0.85rem;
        font-weight: 600;
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.12);
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
      }
      .no-marcados {
        font-size: 0.85rem;
        color: #71717a;
        margin: 0;
        font-style: italic;
      }
      .position-group {
        margin-bottom: 1rem;
      }
      .position-group:last-child {
        margin-bottom: 0;
      }
      .position-group-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #a1a1aa;
        margin: 0 0 0.35rem 0;
        padding-bottom: 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .people-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .person-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0;
        border-radius: 8px;
        padding-left: 0.25rem;
      }
      .person-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }
      .person-name {
        color: #d4d4d8;
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .person-position {
        font-size: 0.75rem;
        color: #71717a;
      }
      .day-record {
        display: flex;
        gap: 1rem;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        color: #71717a;
      }
      .record-entry {
        color: #4ade80;
      }
      .record-exit {
        color: #a1a1aa;
      }
      .position-counts {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-bottom: 0.75rem;
      }
      .position-badge {
        font-size: 0.75rem;
        color: #a1a1aa;
        background: rgba(255, 255, 255, 0.06);
        padding: 0.2rem 0.45rem;
        border-radius: 6px;
      }
      .late-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: #fbbf24;
        margin-top: 0.15rem;
      }
      .person-row.person-late {
        background: rgba(251, 191, 36, 0.06);
        border-radius: 8px;
        margin: 0 -0.25rem;
        padding-left: 0.5rem;
      }
      .status-late {
        color: #fbbf24;
      }
      .entry-time {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8rem;
        color: #4ade80;
      }
      .status-ok {
        color: #4ade80;
      }
      .odoo-orders-section {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .odoo-orders-title {
        font-size: 1.1rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .odoo-orders-loading,
      .odoo-orders-error,
      .odoo-orders-empty {
        color: var(--text-color-secondary);
        font-size: 0.9rem;
      }
      .odoo-orders-error {
        color: #f87171;
      }
      .odoo-orders-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 0.75rem;
      }
      .odoo-order-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.85rem;
      }
      .odoo-order-name {
        font-weight: 600;
      }
      .odoo-order-date,
      .odoo-order-mascotas {
        color: var(--text-color-secondary);
      }
      .odoo-order-stats {
        font-size: 0.8rem;
        color: var(--text-color-secondary);
      }
      .odoo-order-state {
        font-size: 0.75rem;
        text-transform: uppercase;
        margin-top: 0.25rem;
      }
      .odoo-order-state.state-sale {
        color: #4ade80;
      }
      .odoo-order-state.state-draft {
        color: #fbbf24;
      }
      .odoo-order-state.state-done {
        color: #60a5fa;
      }
      .odoo-order-state.state-cancel {
        color: #9ca3af;
      }
    `,
  ],
})
export class PeluqueriaSectionComponent {
  homeData = inject(HomeDataService);
  private branchesStore = inject(BranchesStore);

  readonly ALERT_POSITION_THRESHOLD = ALERT_POSITION_THRESHOLD;
  private readonly peluqueriaPositionNames = PELUQUERIA_POSITION_NAMES as readonly string[];

  /** Órdenes de Odoo para la fecha de vista Peluquería */
  odooOrders = computed((): OdooSaleOrder[] => {
    this.homeData.peluqueriaViewDate();
    const res = this.homeData.odooSaleOrdersForPeluqueriaView.value?.();
    if (!res?.success || !Array.isArray(res.data)) return [];
    return res.data;
  });

  odooOrdersLoading = computed(() => this.homeData.odooSaleOrdersForPeluqueriaView.isLoading?.() ?? false);
  odooOrdersError = computed(() => {
    const e = this.homeData.odooSaleOrdersForPeluqueriaView.error?.();
    return e instanceof Error ? e.message : (e as string | undefined) ?? null;
  });

  formatOdooDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = parseISO(dateStr);
      return format(toZonedTime(d, TZ), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateStr;
    }
  }

  onViewDateChange(value: Date | null): void {
    this.homeData.peluqueriaViewDate.set(value ? new Date(value) : new Date());
  }

  /** Fecha máxima seleccionable (hoy) */
  maxDate = computed(() => new Date());

  /** Etiqueta de la fecha seleccionada */
  dateLabel = computed(() => {
    const d = toZonedTime(this.homeData.peluqueriaViewDate(), TZ);
    return format(d, "EEEE d 'de' MMMM, yyyy");
  });

  loading = computed(() => this.homeData.timelogsEntryForPeluqueriaView.isLoading?.() ?? false);

  error = computed(() => {
    const t = this.homeData.timelogsEntryForPeluqueriaView.error?.();
    return t instanceof Error ? t.message : (t as string | undefined) || null;
  });

  /** Para el template: convierte positionCounts en array [nombre, cantidad] ordenado */
  getPositionCountEntries(counts: BranchPeluqueriaRow['positionCounts']) {
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])) as [string, number][];
  }

  branchRows = computed((): BranchPeluqueriaRow[] => {
    this.homeData.peluqueriaViewDate(); // dependencia para recalcular al cambiar fecha
    const timelogs = (this.homeData.timelogsEntryForPeluqueriaView.value?.() ?? []) as TimelogWithBranch[];
    const exitLogs = (this.homeData.timelogsExitForPeluqueriaView.value?.() ?? []) as TimelogExitRaw[];
    const schedules = (this.homeData.employeeSchedules.value?.() ?? []) as EmployeeScheduleForLate[];
    const branches = this.branchesStore
      .entities()
      .filter((b) => b.is_active && !BRANCHES_EXCLUDED_FROM_PELUQUERIA.includes(b.name?.trim() ?? ''));
    const viewDate = this.homeData.peluqueriaViewDate();
    const selectedDayStr = format(toZonedTime(viewDate, TZ), 'yyyy-MM-dd');

    const isPeluqueriaPosition = (positionName: string | undefined): boolean => {
      if (!positionName?.trim()) return false;
      return this.peluqueriaPositionNames.some(
        (allowed) => positionName.trim().toLowerCase() === allowed.toLowerCase()
      );
    };

    // Horarios del mes que aplican hoy (start_date <= today <= end_date), excluir feriado/día libre
    const schedulesToday = schedules.filter((s) => {
      if (!s.start_date || !s.end_date) return false;
      if (s.start_date > selectedDayStr || s.end_date < selectedDayStr) return false;
      const sch = s.schedule as { id?: string; day_off?: boolean } | undefined;
      if (sch?.day_off) return false;
      if (sch?.id === SCHEDULE_ID_FERIADO || sch?.id === SCHEDULE_ID_DIA_LIBRE) return false;
      return true;
    });

    // Salidas de hoy: por (branch_id, employee_id) quedarse con la última salida del día
    const exitByBranchEmployee = new Map<string, string>();
    for (const log of exitLogs) {
      const branchId = log.branch_id;
      if (!branchId) continue;
      const raw = log.punched_at || log.created_at;
      const exitDt = raw ? (typeof raw === 'string' ? parseISO(raw) : new Date(raw)) : null;
      const exitTime = exitDt ? format(toZonedTime(exitDt, TZ), 'HH:mm') : '';
      if (!exitTime) continue;
      const key = `${branchId}|${log.employee_id}`;
      const existing = exitByBranchEmployee.get(key);
      if (!existing || exitTime > existing) {
        exitByBranchEmployee.set(key, exitTime);
      }
    }

    // Por branch_id: mapa de employee_id -> { name, position, positionId, entryTime, exitTime, isLate, minutesLate }
    const byBranch = new Map<
      string,
      Map<string, { name: string; position?: string; positionId?: string; entryTime: string; exitTime?: string; isLate?: boolean; minutesLate?: number }>
    >();

    for (const log of timelogs) {
      if (!isPeluqueriaPosition(log.employee?.position?.name)) continue;

      const branchId = log.branch_id || log.branch?.id;
      if (!branchId) continue;

      const emp = log.employee;
      const name = emp ? [emp.first_name, emp.father_name].filter(Boolean).join(' ').trim() || 'Sin nombre' : 'Sin nombre';
      const position = emp?.position?.name?.trim() || undefined;
      const positionId = emp?.position?.id ?? undefined;
      const raw = log.punched_at || log.created_at;
      const entryDt = raw ? (typeof raw === 'string' ? parseISO(raw) : new Date(raw)) : null;
      const entryTime = entryDt ? format(toZonedTime(entryDt, TZ), 'HH:mm') : '';
      const entryTimeSeconds = entryDt ? format(toZonedTime(entryDt, TZ), 'HH:mm:ss') : '';

      let isLate: boolean | undefined;
      let minutesLate: number | undefined;
      const schedule = schedulesToday.find(
        (s: any) => s.employee_id === log.employee_id && s.start_date <= selectedDayStr && s.end_date >= selectedDayStr
      );
      if (schedule?.schedule?.entry_time && entryTimeSeconds) {
        const scheduledEntry = this.formatScheduledTime(schedule.schedule.entry_time);
        if (scheduledEntry) {
          const diff = calcMinutesDiff(entryTimeSeconds, scheduledEntry);
          const tolerance = (schedule.schedule as { minutes_tolerance?: number }).minutes_tolerance ?? 0;
          if (diff > tolerance) {
            isLate = true;
            minutesLate = diff; // minutos después de la hora programada
          }
        }
      }

      if (!byBranch.has(branchId)) {
        byBranch.set(branchId, new Map());
      }
      const employeesInBranch = byBranch.get(branchId)!;
      if (!employeesInBranch.has(log.employee_id)) {
        const exitKey = `${branchId}|${log.employee_id}`;
        const exitTime = exitByBranchEmployee.get(exitKey);
        employeesInBranch.set(log.employee_id, {
          name,
          position,
          positionId,
          entryTime,
          exitTime,
          isLate,
          minutesLate,
        });
      }
    }

    // Una fila por sucursal (todas las sucursales activas) con positionCounts, peopleByPosition y alerta por posición
    const rows: BranchPeluqueriaRow[] = branches.map((b) => {
      const peopleMap = byBranch.get(b.id) ?? new Map();
      const people: PersonPeluqueria[] = Array.from(peopleMap.entries()).map(([employeeId, data]) => ({
        employeeId,
        name: data.name,
        position: data.position,
        positionId: data.positionId,
        entryTime: data.entryTime || undefined,
        exitTime: data.exitTime,
        isLate: data.isLate,
        minutesLate: data.minutesLate,
      }));
      const positionCounts: Record<string, number> = {};
      for (const data of peopleMap.values()) {
        const pos = data.position ?? 'Sin posición';
        positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
      }
      // Agrupar por posición para la lista dividida
      const byPosition = new Map<string, PersonPeluqueria[]>();
      for (const p of people) {
        const key = p.position ?? 'Sin posición';
        if (!byPosition.has(key)) byPosition.set(key, []);
        byPosition.get(key)!.push(p);
      }
      const peopleByPosition = Array.from(byPosition.entries())
        .map(([positionName, groupPeople]) => ({
          positionName,
          positionId: groupPeople[0]?.positionId,
          people: groupPeople,
        }))
        .sort((a, b) => a.positionName.localeCompare(b.positionName));
      const alertPositionCount = people.filter((p) => p.positionId === ALERT_POSITION_ID).length;
      const alertOverflow = alertPositionCount > ALERT_POSITION_THRESHOLD;
      return {
        branchId: b.id,
        branchName: b.name,
        shortName: b.short_name ?? b.name.slice(0, 3),
        count: people.length,
        positionCounts,
        peopleByPosition,
        alertOverflow,
        alertPositionCount,
        people,
      };
    });

    return rows.sort((a, b) => a.branchName.localeCompare(b.branchName));
  });

  private formatScheduledTime(t: string | Date): string {
    if (typeof t === 'string') {
      const parts = t.split(':');
      return parts.length >= 2
        ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(parts[2] ?? '00').padStart(2, '0')}`
        : '';
    }
    return format(toZonedTime(t, TZ), 'HH:mm:ss');
  }
}

function calcMinutesDiff(actualTime: string, scheduledTime: string): number {
  if (!actualTime || !scheduledTime) return 0;
  const actual = new Date();
  const scheduled = new Date();
  const actualParts = actualTime.split(':');
  const scheduledParts = scheduledTime.split(':');
  if (actualParts.length < 2 || scheduledParts.length < 2) return 0;
  actual.setHours(+actualParts[0], +actualParts[1], 0, 0);
  scheduled.setHours(+scheduledParts[0], +scheduledParts[1], 0, 0);
  return differenceInMinutes(actual, scheduled);
}

type EmployeeScheduleForLate = {
  employee_id: string;
  start_date: string;
  end_date: string;
  schedule?: {
    id?: string;
    entry_time?: string | Date;
    minutes_tolerance?: number;
    day_off?: boolean;
  };
};
