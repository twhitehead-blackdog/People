import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';

import { ApiUrlService } from '../../services/api-url.service';
import { DashboardStore } from '../../stores/dashboard.store';

interface TimelogAlert {
  id: string;
  timelog_id: string | null;
  alert_type: 'direct_insert' | 'update' | 'delete' | 'manual_with_reason' | 'suspicious';
  severity: 'info' | 'warn' | 'critical';
  old_data: any;
  new_data: any;
  db_user: string | null;
  db_role: string | null;
  api_jwt_claims: any;
  description: string | null;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  acknowledged_note: string | null;
}

@Component({
  selector: 'pt-timelog-alerts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    Card,
    Button,
    TableModule,
    Tag,
    SelectModule,
    DatePicker,
    InputText,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (unavailable()) {
      <!-- Migración no aplicada todavía: se oculta sin romper -->
    } @else {
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold m-0 flex items-center gap-2">
              <i class="pi pi-shield text-amber-400"></i>
              Alertas de seguridad de marcaciones
            </h2>
            <p class="text-xs text-gray-400 m-0 mt-1">
              Detecciones de inserts directos, updates y deletes en la tabla timelogs
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <p-select
              [options]="statusOptions"
              [(ngModel)]="filter"
              (ngModelChange)="loadAlerts()"
              placeholder="Estado"
              styleClass="text-xs"
            />
            <p-select
              [options]="severityOptions"
              [(ngModel)]="severityFilter"
              (ngModelChange)="loadAlerts()"
              placeholder="Severidad"
              [showClear]="true"
              styleClass="text-xs"
            />
            <p-select
              [options]="alertTypeOptions"
              [(ngModel)]="typeFilter"
              (ngModelChange)="loadAlerts()"
              placeholder="Tipo"
              [showClear]="true"
              styleClass="text-xs"
            />
            <p-datepicker
              [(ngModel)]="dateFrom"
              (ngModelChange)="loadAlerts()"
              placeholder="Desde"
              [showClear]="true"
              dateFormat="dd/mm/yy"
              styleClass="text-xs"
              appendTo="body"
            />
            <p-datepicker
              [(ngModel)]="dateTo"
              (ngModelChange)="loadAlerts()"
              placeholder="Hasta"
              [showClear]="true"
              dateFormat="dd/mm/yy"
              styleClass="text-xs"
              appendTo="body"
            />
            <input
              type="text"
              pInputText
              [(ngModel)]="searchText"
              (ngModelChange)="onSearchChange()"
              placeholder="Buscar empleado / texto..."
              class="text-xs"
              style="width: 180px"
            />
            <p-button
              icon="pi pi-refresh"
              severity="secondary"
              [text]="true"
              size="small"
              (onClick)="loadAlerts()"
              pTooltip="Recargar"
            />
          </div>
        </div>
      </ng-template>

      <!-- Resumen -->
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="rounded p-2 border border-red-500/30 bg-red-500/10">
          <div class="text-[10px] uppercase font-bold text-red-300">Críticas</div>
          <div class="text-2xl font-bold text-red-200">{{ count('critical') }}</div>
        </div>
        <div class="rounded p-2 border border-amber-500/30 bg-amber-500/10">
          <div class="text-[10px] uppercase font-bold text-amber-300">Advertencias</div>
          <div class="text-2xl font-bold text-amber-200">{{ count('warn') }}</div>
        </div>
        <div class="rounded p-2 border border-blue-500/30 bg-blue-500/10">
          <div class="text-[10px] uppercase font-bold text-blue-300">Info</div>
          <div class="text-2xl font-bold text-blue-200">{{ count('info') }}</div>
        </div>
      </div>

      <!-- Tabla -->
      <p-table
        [value]="alerts()"
        [paginator]="true"
        [rows]="20"
        [rowsPerPageOptions]="[20, 50, 100]"
        responsiveLayout="scroll"
      >
        <ng-template #header>
          <tr>
            <th class="text-xs">Severidad</th>
            <th class="text-xs">Tipo</th>
            <th class="text-xs">Cuándo</th>
            <th class="text-xs">DB User</th>
            <th class="text-xs">Descripción</th>
            <th class="text-xs">Acción</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr [class.opacity-50]="!!row.acknowledged_at">
            <td>
              <p-tag
                [value]="row.severity"
                [severity]="severityTag(row.severity)"
                styleClass="text-[10px]"
              />
            </td>
            <td>
              <span class="text-[11px] font-mono uppercase">{{ row.alert_type }}</span>
            </td>
            <td class="text-[11px] text-neutral-400">
              {{ row.created_at | date:'dd MMM HH:mm:ss' }}
            </td>
            <td class="text-[11px] text-neutral-400 font-mono">
              {{ row.db_user ?? '—' }}
            </td>
            <td class="text-[11px] max-w-[400px]">
              <div class="text-white">{{ row.description }}</div>
              @if (row.new_data?.employee_id || row.old_data?.employee_id) {
                <div class="text-[10px] text-neutral-500 mt-1">
                  emp: {{ row.new_data?.employee_id ?? row.old_data?.employee_id }}
                  · type: {{ row.new_data?.type ?? row.old_data?.type }}
                </div>
              }
            </td>
            <td>
              @if (!row.acknowledged_at) {
                <p-button
                  label="Reconocer"
                  icon="pi pi-check"
                  severity="secondary"
                  size="small"
                  [text]="true"
                  (onClick)="acknowledge(row)"
                />
              } @else {
                <span class="text-[10px] text-green-400">
                  <i class="pi pi-check"></i> {{ row.acknowledged_at | date:'dd MMM HH:mm' }}
                </span>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="6" class="text-center py-8 text-neutral-500">
              <i class="pi pi-shield text-2xl block mb-2"></i>
              Sin alertas registradas en este filtro.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
    }
  `,
})
export class TimelogAlertsComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private message = inject(MessageService);
  private store = inject(DashboardStore);

  alerts = signal<TimelogAlert[]>([]);
  unavailable = signal<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('timelog_alerts_unavailable') === '1'
  );

  // Filtros
  filter: 'unacknowledged' | 'all' = 'unacknowledged';
  severityFilter: 'critical' | 'warn' | 'info' | null = null;
  typeFilter: string | null = null;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  searchText: string = '';
  private searchTimer: any = null;

  statusOptions = [
    { label: 'No reconocidas', value: 'unacknowledged' },
    { label: 'Todas', value: 'all' },
  ];
  severityOptions = [
    { label: 'Crítica', value: 'critical' },
    { label: 'Advertencia', value: 'warn' },
    { label: 'Info', value: 'info' },
  ];
  alertTypeOptions = [
    { label: 'Insert directo', value: 'direct_insert' },
    { label: 'Update', value: 'update' },
    { label: 'Delete', value: 'delete' },
    { label: 'Manual con motivo', value: 'manual_with_reason' },
    { label: 'Sospechoso', value: 'suspicious' },
  ];

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadAlerts(), 400);
  }

  constructor() {
    this.loadAlerts();
  }

  count(severity: 'info' | 'warn' | 'critical'): number {
    return this.alerts().filter((a) => a.severity === severity && !a.acknowledged_at).length;
  }

  severityTag(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (s) {
      case 'critical':
        return 'danger';
      case 'warn':
        return 'warn';
      case 'info':
        return 'info';
      default:
        return 'secondary';
    }
  }

  async loadAlerts(): Promise<void> {
    if (this.unavailable()) return; // tabla no existe en este entorno
    const params: any = { select: '*', order: 'created_at.desc', limit: '300' };
    if (this.filter === 'unacknowledged') params['acknowledged_at'] = 'is.null';
    if (this.severityFilter) params['severity'] = `eq.${this.severityFilter}`;
    if (this.typeFilter) params['alert_type'] = `eq.${this.typeFilter}`;
    if (this.dateFrom) params['created_at'] = `gte.${this.dateFrom.toISOString()}`;
    if (this.dateTo) {
      const end = new Date(this.dateTo);
      end.setHours(23, 59, 59, 999);
      // Si ya hay created_at gte, usamos and()
      if (this.dateFrom) {
        params['and'] = `(created_at.gte.${this.dateFrom.toISOString()},created_at.lte.${end.toISOString()})`;
        delete params['created_at'];
      } else {
        params['created_at'] = `lte.${end.toISOString()}`;
      }
    }
    if (this.searchText && this.searchText.trim().length > 0) {
      // Buscar texto en description (ilike)
      const q = this.searchText.trim().replace(/[%]/g, '');
      params['description'] = `ilike.*${q}*`;
    }
    try {
      const rows = await firstValueFrom(
        this.http.get<TimelogAlert[]>(this.apiUrl.build('rest/v1/timelog_alerts', params))
      );
      this.alerts.set(rows ?? []);
      this.unavailable.set(false);
    } catch (e: any) {
      // Si la tabla aún no existe (migración no aplicada) → ocultar silenciosamente
      const code = e?.error?.code;
      const status = e?.status;
      if (status === 404 || code === '42P01') {
        this.unavailable.set(true);
        try { sessionStorage.setItem('timelog_alerts_unavailable', '1'); } catch {}
        return;
      }
      console.error('[TimelogAlerts] load error', e);
    }
  }

  async acknowledge(row: TimelogAlert): Promise<void> {
    const empId = this.store.currentEmployee()?.id ?? null;
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/timelog_alerts', { id: `eq.${row.id}` }),
          {
            acknowledged_by: empId,
            acknowledged_at: new Date().toISOString(),
          }
        )
      );
      this.loadAlerts();
      this.message.add({ severity: 'success', summary: 'Reconocida', life: 1500 });
    } catch (e) {
      console.error('[TimelogAlerts] ack error', e);
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reconocer' });
    }
  }
}
