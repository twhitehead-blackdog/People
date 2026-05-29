import { CommonModule, DatePipe } from '@angular/common';
import { httpResource, HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

/**
 * Dashboard de alertas y monitoreo del reconocimiento facial.
 * Lista TODOS los intentos (exitosos y fallidos) con filtros, KPIs y visor de foto.
 * Fotos de intentos: retención 15 días.
 */
@Component({
  selector: 'pt-face-alerts',
  imports: [
    CommonModule, FormsModule, DatePipe, Button, Card, Tag, Tooltip, Skeleton,
    Select, DatePicker, Dialog, IconField, InputIcon, InputText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fa-wrap">
      <div class="fa-header">
        <div>
          <h2 class="fa-title">
            <i class="pi pi-shield text-amber-400"></i>
            Reconocimiento facial — monitoreo
          </h2>
          <p class="fa-sub">Intentos exitosos y fallidos. Fotos retenidas 15 días.</p>
        </div>
        <p-button label="Actualizar" icon="pi pi-refresh" [outlined]="true" size="small" (onClick)="refresh()" />
      </div>

      <div class="fa-kpis">
        <div class="fa-kpi fa-kpi--ok">
          <div class="fa-kpi__icon"><i class="pi pi-check-circle"></i></div>
          <div class="fa-kpi__body">
            <div class="fa-kpi__label">Exitosas</div>
            <div class="fa-kpi__num">{{ summary()?.matched_24h ?? 0 }}</div>
            <div class="fa-kpi__hint">{{ matchRate() }}% éxito · 24h</div>
          </div>
        </div>
        <div class="fa-kpi fa-kpi--high">
          <div class="fa-kpi__icon"><i class="pi pi-id-card"></i></div>
          <div class="fa-kpi__body">
            <div class="fa-kpi__label">Posibles fotos</div>
            <div class="fa-kpi__num">{{ summary()?.photo_suspected_24h ?? 0 }}</div>
            <div class="fa-kpi__hint">Intento con foto estática</div>
          </div>
        </div>
        <div class="fa-kpi fa-kpi--high">
          <div class="fa-kpi__icon"><i class="pi pi-eye-slash"></i></div>
          <div class="fa-kpi__body">
            <div class="fa-kpi__label">Liveness falló</div>
            <div class="fa-kpi__num">{{ summary()?.liveness_failed_24h ?? 0 }}</div>
            <div class="fa-kpi__hint">No detectó movimiento</div>
          </div>
        </div>
        <div class="fa-kpi fa-kpi--medium">
          <div class="fa-kpi__icon"><i class="pi pi-stopwatch"></i></div>
          <div class="fa-kpi__body">
            <div class="fa-kpi__label">Rate limited</div>
            <div class="fa-kpi__num">{{ summary()?.rate_limited_24h ?? 0 }}</div>
            <div class="fa-kpi__hint">Muchos intentos seguidos</div>
          </div>
        </div>
        <div class="fa-kpi fa-kpi--low">
          <div class="fa-kpi__icon"><i class="pi pi-question-circle"></i></div>
          <div class="fa-kpi__body">
            <div class="fa-kpi__label">Sin coincidencia</div>
            <div class="fa-kpi__num">{{ (summary()?.unknown_24h ?? 0) + (summary()?.ambiguous_24h ?? 0) }}</div>
            <div class="fa-kpi__hint">No reconoció</div>
          </div>
        </div>
      </div>

      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between">
            <span><i class="pi pi-filter mr-2"></i>Filtros</span>
            <button class="fa-link" (click)="resetFilters()">Limpiar todo</button>
          </div>
        </ng-template>

        <div class="fa-filters-grid">
          <div class="fa-field">
            <label>Desde</label>
            <p-datepicker [(ngModel)]="dateFromValue" showIcon iconDisplay="input" dateFormat="yy-mm-dd" (ngModelChange)="dateFrom.set($event)" />
          </div>
          <div class="fa-field">
            <label>Hasta</label>
            <p-datepicker [(ngModel)]="dateToValue" showIcon iconDisplay="input" dateFormat="yy-mm-dd" (ngModelChange)="dateTo.set($event)" />
          </div>
          <div class="fa-field">
            <label>Resultado</label>
            <p-select [options]="resultOptions" [(ngModel)]="resultFilterValue"
              optionLabel="label" optionValue="value" [showClear]="true" placeholder="Todos" (ngModelChange)="resultFilter.set($event)" />
          </div>
          <div class="fa-field">
            <label>Severidad</label>
            <p-select [options]="severityOptions" [(ngModel)]="severityFilterValue"
              optionLabel="label" optionValue="value" placeholder="Todas" (ngModelChange)="severityFilter.set($event)" />
          </div>
          <div class="fa-field">
            <label>Sucursal</label>
            <p-select [options]="branchOptions()" [(ngModel)]="branchFilterValue"
              optionLabel="label" optionValue="value" [showClear]="true" placeholder="Todas" [filter]="true" (ngModelChange)="branchFilter.set($event)" />
          </div>
          <div class="fa-field">
            <label>Empleado / IP / kiosk</label>
            <p-iconfield>
              <p-inputicon styleClass="pi pi-search" />
              <input pInputText type="text" [(ngModel)]="searchTextValue" placeholder="Buscar..." (ngModelChange)="searchText.set($event)" />
            </p-iconfield>
          </div>
        </div>
        <div class="fa-filters-foot">
          <span class="fa-filters-count">
            <i class="pi pi-list"></i> {{ filteredAlerts().length }} de {{ alerts.value()?.length ?? 0 }} eventos
          </span>
        </div>
      </p-card>

      <p-card>
        <ng-template #title>Eventos</ng-template>

        @if (alerts.isLoading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton height="3.5rem" styleClass="mb-2" />
          }
        } @else if (filteredAlerts().length === 0) {
          <div class="fa-empty">
            <i class="pi pi-shield text-5xl text-gray-700"></i>
            <p>Sin eventos en este rango</p>
          </div>
        } @else {
          <div class="fa-list">
            @for (a of filteredAlerts(); track a.id) {
              <div class="fa-row" [attr.data-severity]="a.severity">
                <div class="fa-row__icon" [attr.data-result]="a.result">
                  <i class="pi"
                    [class.pi-check-circle]="a.result === 'matched'"
                    [class.pi-id-card]="a.result === 'photo_suspected'"
                    [class.pi-eye-slash]="a.result === 'liveness_failed'"
                    [class.pi-stopwatch]="a.result === 'rate_limited'"
                    [class.pi-question-circle]="a.result === 'unknown' || a.result === 'ambiguous'"
                    [class.pi-times-circle]="a.result === 'nonce_invalid'"
                    [class.pi-exclamation-circle]="a.result === 'no_face' || a.result === 'error' || a.result === 'no_enrolments'"></i>
                </div>
                <div class="fa-row__body">
                  <div class="fa-row__title">
                    {{ labelFor(a.result) }}
                    @if (a.employee_name) {
                      <span class="fa-row__name">— {{ a.employee_name }}</span>
                    }
                    @if (a.best_distance != null) {
                      <span class="fa-row__sim">{{ ((1 - a.best_distance) * 100).toFixed(0) }}%</span>
                    }
                  </div>
                  <div class="fa-row__meta">
                    <span><i class="pi pi-clock"></i> {{ a.created_at | date: 'short' }}</span>
                    @if (a.branch_name) {
                      <span><i class="pi pi-map-marker"></i> {{ a.branch_name }}</span>
                    }
                    @if (a.kiosk_id) {
                      <span [pTooltip]="'Kiosk: ' + a.kiosk_id"><i class="pi pi-desktop"></i> {{ shortKiosk(a.kiosk_id) }}</span>
                    }
                    @if (a.ip) {
                      <span class="fa-row__ip" [pTooltip]="a.user_agent || ''"><i class="pi pi-globe"></i> {{ a.ip }}</span>
                    }
                    <span class="fa-row__device" [pTooltip]="a.user_agent || ''">
                      <i class="pi" [class]="parseUserAgent(a.user_agent).isMobile ? 'pi-mobile' : 'pi-desktop'"></i>
                      {{ parseUserAgent(a.user_agent).browser }} · {{ parseUserAgent(a.user_agent).os }}
                    </span>
                  </div>
                </div>
                <div class="fa-row__actions">
                  @if (a.has_attempt_photo) {
                    <button class="fa-photo-btn" (click)="openPhoto(a)" pTooltip="Ver foto del intento">
                      <i class="pi pi-camera"></i>
                    </button>
                  }
                  <p-tag [value]="a.severity" [severity]="sevColor(a.severity)" styleClass="fa-row__sev" />
                </div>
              </div>
            }
          </div>
        }
      </p-card>

      <p-dialog
        [(visible)]="photoDialogVisibleValue"
        [modal]="true"
        [draggable]="false"
        [closable]="true"
        (onHide)="photoDialogVisible.set(false)"
        [style]="{ width: '420px' }"
        header="Foto del intento">
        @if (selectedPhoto()) {
          @if (photoLoading()) {
            <p-skeleton height="320px" />
          } @else if (photoData()) {
            <img [src]="'data:image/jpeg;base64,' + photoData()" class="fa-photo-img" alt="Foto del intento" />
            <div class="fa-photo-meta">
              <div><strong>Resultado:</strong> {{ labelFor(selectedPhoto().result) }}</div>
              <div><strong>Cuando:</strong> {{ selectedPhoto().created_at | date: 'short' }}</div>
              @if (selectedPhoto().employee_name) {
                <div><strong>Empleado:</strong> {{ selectedPhoto().employee_name }}</div>
              }
              @if (selectedPhoto().best_distance != null) {
                <div><strong>Similitud:</strong> {{ ((1 - selectedPhoto().best_distance) * 100).toFixed(1) }}%</div>
              }
              <div class="text-xs text-gray-500 mt-2">
                Foto retenida 15 días para auditoría.
              </div>
            </div>
          } @else {
            <div class="p-4 text-gray-400 text-sm">No hay foto disponible (puede haber expirado).</div>
          }
        }
      </p-dialog>
    </div>
  `,
  styles: [`
    .fa-wrap { padding: 1.5rem; max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .fa-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .fa-title { font-size: 1.4rem; font-weight: 700; color: #f3f4f6; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .fa-sub { color: #9ca3af; font-size: 0.85rem; margin: 0.25rem 0 0; }

    .fa-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; }
    .fa-kpi { display: flex; gap: 0.75rem; padding: 1rem; border-radius: 14px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); }
    .fa-kpi__icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .fa-kpi__icon i { font-size: 18px; }
    .fa-kpi__label { font-size: 0.72rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
    .fa-kpi__num { font-size: 1.7rem; font-weight: 800; color: #f3f4f6; line-height: 1.1; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .fa-kpi__hint { font-size: 0.72rem; color: #6b7280; margin-top: 2px; }
    .fa-kpi--high  .fa-kpi__icon { background: rgba(239,68,68,0.15);  color: #fca5a5; }
    .fa-kpi--high  .fa-kpi__num  { color: #fca5a5; }
    .fa-kpi--medium .fa-kpi__icon { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .fa-kpi--medium .fa-kpi__num  { color: #fbbf24; }
    .fa-kpi--low   .fa-kpi__icon { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .fa-kpi--ok    .fa-kpi__icon { background: rgba(34,197,94,0.15);  color: #22c55e; }
    .fa-kpi--ok    .fa-kpi__num  { color: #22c55e; }

    .fa-filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; }
    .fa-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .fa-field label { font-size: 0.72rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.4px; }
    .fa-field ::ng-deep .p-select,
    .fa-field ::ng-deep .p-datepicker,
    .fa-field ::ng-deep .p-iconfield { width: 100%; }
    .fa-filters-foot { margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); }
    .fa-filters-count { color: #9ca3af; font-size: 0.8rem; }
    .fa-filters-count i { margin-right: 4px; }
    .fa-link { background: none; border: none; color: #60a5fa; cursor: pointer; font-size: 0.8rem; padding: 0; font-family: inherit; }
    .fa-link:hover { text-decoration: underline; }

    .fa-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 65vh; overflow-y: auto; }
    .fa-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.65rem 0.85rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; transition: background 0.15s; }
    .fa-row:hover { background: rgba(255,255,255,0.04); }
    .fa-row[data-severity="high"]   { border-left: 3px solid #ef4444; }
    .fa-row[data-severity="medium"] { border-left: 3px solid #f59e0b; }
    .fa-row[data-severity="low"]    { border-left: 3px solid #3b82f6; }
    .fa-row[data-severity="ok"]     { border-left: 3px solid #22c55e; }
    .fa-row__icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .fa-row__icon i { font-size: 16px; color: #9ca3af; }
    .fa-row[data-severity="high"]   .fa-row__icon i { color: #fca5a5; }
    .fa-row[data-severity="medium"] .fa-row__icon i { color: #fbbf24; }
    .fa-row[data-severity="low"]    .fa-row__icon i { color: #60a5fa; }
    .fa-row[data-severity="ok"]     .fa-row__icon i { color: #22c55e; }
    .fa-row__body { flex: 1; min-width: 0; }
    .fa-row__title { font-size: 0.88rem; font-weight: 600; color: #f3f4f6; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .fa-row__name { color: #9ca3af; font-weight: 500; }
    .fa-row__sim  { color: #22c55e; font-weight: 700; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
    .fa-row__meta { font-size: 0.72rem; color: #6b7280; display: flex; gap: 0.85rem; flex-wrap: wrap; margin-top: 4px; }
    .fa-row__meta i { font-size: 0.7rem; margin-right: 3px; }
    .fa-row__ip { font-family: ui-monospace, monospace; }
    .fa-row__device { color: #94a3b8; }
    .fa-row__actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .fa-photo-btn { width: 30px; height: 30px; border-radius: 50%; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.35); color: #60a5fa; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
    .fa-photo-btn:hover { background: rgba(59,130,246,0.3); }
    .fa-photo-btn i { font-size: 13px; }

    .fa-empty { display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 3rem 1rem; color: #6b7280; }
    .fa-empty p { margin: 0; font-size: 0.95rem; }

    .fa-photo-img { width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); transform: scaleX(-1); display: block; }
    .fa-photo-meta { margin-top: 0.85rem; font-size: 0.85rem; color: #d1d5db; display: flex; flex-direction: column; gap: 4px; }
    .fa-photo-meta strong { color: #f3f4f6; }
  `],
})
export class FaceAlertsComponent {
  private apiUrl = inject(ApiUrlService);
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);

  // Signals
  public dateFrom = signal<Date>(this.daysAgo(7));
  public dateTo = signal<Date>(new Date());
  public resultFilter = signal<string | null>(null);
  public severityFilter = signal<string>('all');
  public branchFilter = signal<string | null>(null);
  public searchText = signal<string>('');

  // Two-way ngModel mirrors (PrimeNG aún espera property, no signal)
  public dateFromValue: Date = this.dateFrom();
  public dateToValue: Date = this.dateTo();
  public resultFilterValue: string | null = null;
  public severityFilterValue: string = 'all';
  public branchFilterValue: string | null = null;
  public searchTextValue: string = '';
  public photoDialogVisibleValue: boolean = false;

  public severityOptions = [
    { label: 'Todas',        value: 'all' },
    { label: 'Exitosas',     value: 'ok' },
    { label: 'Alta',         value: 'high' },
    { label: 'Media',        value: 'medium' },
    { label: 'Baja',         value: 'low' },
  ];
  public resultOptions = [
    { label: 'Exitosa (matched)',       value: 'matched' },
    { label: 'Posible foto',            value: 'photo_suspected' },
    { label: 'Liveness falló',          value: 'liveness_failed' },
    { label: 'Rate limited',            value: 'rate_limited' },
    { label: 'Ambiguo',                 value: 'ambiguous' },
    { label: 'Sin coincidencia',        value: 'unknown' },
    { label: 'Nonce inválido',          value: 'nonce_invalid' },
    { label: 'Sin rostros enrolados',   value: 'no_enrolments' },
    { label: 'Error técnico',           value: 'error' },
  ];

  public alerts = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: Record<string, string> = {
      select: '*',
      order: 'created_at.desc',
      limit: '500',
      and: `(created_at.gte.${this.dateFrom().toISOString()},created_at.lte.${this.endOfDayIso(this.dateTo())})`,
    };
    if (companyId) params['company_id'] = `eq.${companyId}`;
    if (this.resultFilter()) params['result'] = `eq.${this.resultFilter()}`;
    if (this.branchFilter()) params['branch_id'] = `eq.${this.branchFilter()}`;
    return { url: this.apiUrl.build('rest/v1/v_face_alerts', params), method: 'GET' };
  });

  public summaryResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: Record<string, string> = { select: '*' };
    if (companyId) params['company_id'] = `eq.${companyId}`;
    return { url: this.apiUrl.build('rest/v1/v_face_alerts_summary', params), method: 'GET' };
  });

  public branchesResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: Record<string, string> = { select: 'id,name', order: 'name.asc', limit: '200' };
    if (companyId) params['company_id'] = `eq.${companyId}`;
    return { url: this.apiUrl.build('rest/v1/branches', params), method: 'GET' };
  });

  public summary = computed(() => this.summaryResource.value()?.[0]);
  public branchOptions = computed(() =>
    (this.branchesResource.value() ?? []).map((b: any) => ({ label: b.name, value: b.id })),
  );

  public filteredAlerts = computed(() => {
    const data = this.alerts.value() ?? [];
    const sev = this.severityFilter();
    const q = this.searchText().trim().toLowerCase();
    return data.filter((a) => {
      if (sev !== 'all' && a.severity !== sev) return false;
      if (q) {
        const hay = [a.employee_name, a.employee_email, a.branch_name, a.ip, a.kiosk_id, a.result]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  public matchRate = computed(() => {
    const s = this.summary();
    if (!s || !s.total_24h) return '0';
    return ((s.matched_24h / s.total_24h) * 100).toFixed(0);
  });

  public photoDialogVisible = signal(false);
  public selectedPhoto = signal<any | null>(null);
  public photoData = signal<string | null>(null);
  public photoLoading = signal(false);

  public refresh(): void {
    this.alerts.reload();
    this.summaryResource.reload();
    this.branchesResource.reload();
  }

  public resetFilters(): void {
    const from = this.daysAgo(7);
    const to = new Date();
    this.dateFrom.set(from); this.dateFromValue = from;
    this.dateTo.set(to); this.dateToValue = to;
    this.resultFilter.set(null); this.resultFilterValue = null;
    this.severityFilter.set('all'); this.severityFilterValue = 'all';
    this.branchFilter.set(null); this.branchFilterValue = null;
    this.searchText.set(''); this.searchTextValue = '';
  }

  public async openPhoto(a: any): Promise<void> {
    this.selectedPhoto.set(a);
    this.photoData.set(null);
    this.photoLoading.set(true);
    this.photoDialogVisible.set(true);
    this.photoDialogVisibleValue = true;
    try {
      const url = this.apiUrl.build('rest/v1/rpc/get_face_attempt_photo', {});
      const res: any = await this.http.post<any[]>(url, { p_attempt_id: a.id }).toPromise();
      const row = Array.isArray(res) ? res[0] : res;
      this.photoData.set(row?.photo_base64 ?? null);
    } catch {
      this.photoData.set(null);
    } finally {
      this.photoLoading.set(false);
    }
  }

  public labelFor(result: string): string {
    return ({
      matched: 'Marcación exitosa',
      photo_suspected: 'Posible foto detectada',
      liveness_failed: 'Liveness falló',
      rate_limited: 'Bloqueo por intentos',
      ambiguous: 'Reconocimiento ambiguo',
      unknown: 'Sin coincidencia',
      nonce_invalid: 'Sesión expirada',
      no_face: 'Sin rostro visible',
      no_enrolments: 'Sin rostros enrolados',
      error: 'Error técnico',
    } as Record<string, string>)[result] || result;
  }

  public sevColor(s: string): 'danger' | 'warn' | 'info' | 'success' {
    return s === 'high' ? 'danger' : s === 'medium' ? 'warn' : s === 'low' ? 'info' : 'success';
  }

  public shortKiosk(id: string): string {
    return id.length > 12 ? id.slice(0, 8) + '…' : id;
  }

  /** Parser ligero de user-agent — heurística que cubre 95% de casos. */
  public parseUserAgent(ua: string | null): { browser: string; os: string; isMobile: boolean } {
    if (!ua) return { browser: 'Desconocido', os: '—', isMobile: false };
    let os = 'Otro';
    const iOSMatch = ua.match(/iPhone OS (\d+_\d+)|iPad; CPU OS (\d+_\d+)|CPU iPhone OS (\d+_\d+)/);
    if (iOSMatch) {
      const v = (iOSMatch[1] || iOSMatch[2] || iOSMatch[3] || '').replace('_', '.');
      os = `iOS ${v}`;
    } else if (/Android (\d+(\.\d+)?)/.test(ua)) {
      os = `Android ${ua.match(/Android (\d+(\.\d+)?)/)?.[1]}`;
    } else if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
    else if (/Mac OS X (\d+[._]\d+)/.test(ua)) os = `macOS ${ua.match(/Mac OS X (\d+[._]\d+)/)?.[1].replace('_','.')}`;
    else if (/CrOS/.test(ua)) os = 'ChromeOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    let browser = 'Otro';
    if (/Edg\/(\d+)/.test(ua))            browser = `Edge ${ua.match(/Edg\/(\d+)/)?.[1]}`;
    else if (/OPR\/(\d+)/.test(ua))       browser = `Opera ${ua.match(/OPR\/(\d+)/)?.[1]}`;
    else if (/SamsungBrowser\/(\d+)/.test(ua)) browser = `Samsung ${ua.match(/SamsungBrowser\/(\d+)/)?.[1]}`;
    else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua)) browser = `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1]}`;
    else if (/Firefox\/(\d+)/.test(ua))   browser = `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1]}`;
    else if (/Version\/(\d+).+Safari/.test(ua)) browser = `Safari ${ua.match(/Version\/(\d+)/)?.[1]}`;
    else if (/Safari/.test(ua))           browser = 'Safari';

    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
    return { browser, os, isMobile };
  }

  private daysAgo(d: number): Date { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(0,0,0,0); return x; }
  private endOfDayIso(d: Date): string { const x = new Date(d); x.setHours(23,59,59,999); return x.toISOString(); }
}
