import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { formatInTimeZone } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { EmergencyTimelog } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';

const EMERGENCY_KEY = 'bd_kiosk_emergency_timelogs';
const QUARANTINE_KEY = 'bd_kiosk_emergency_timelogs_quarantine';
const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  lunch_start: 'Inicio Almuerzo',
  lunch_end: 'Fin Almuerzo',
  exit: 'Salida',
};

@Component({
  selector: 'pt-emergency-timelog-review',
  imports: [CommonModule, Button, Tag, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white m-0">Marcaciones de Emergencia Locales</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Timelogs guardados en este dispositivo cuando el servidor no respondió.
            Sincronícelos manualmente para que queden en la base de datos.
          </p>
        </div>
        <p-button
          icon="pi pi-refresh"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="loadPending()"
        />
      </div>

      @if (pending().length === 0) {
        <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <i class="pi pi-check-circle text-4xl text-green-400"></i>
          <span class="text-gray-400">No hay marcaciones de emergencia pendientes en este dispositivo.</span>
        </div>
      } @else {
        <div class="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <i class="pi pi-exclamation-triangle text-yellow-400"></i>
          <span class="text-yellow-300 text-sm font-medium">
            {{ pending().length }} marcación(es) pendiente(s) de sincronizar
          </span>
        </div>

        <div class="flex flex-col gap-3">
          @for (item of pending(); track item.id) {
            <div class="flex items-center justify-between p-4 rounded-xl border"
                 [class.border-gray-700]="!item.syncing"
                 [class.border-blue-500/40]="item.syncing"
                 [class.bg-white/3]="!item.syncing"
                 [class.bg-blue-500/5]="item.syncing">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-white">{{ item.employee_name }}</span>
                  <p-tag
                    [value]="item.type_label || TYPE_LABELS[item.type] || item.type"
                    severity="warn"
                    [rounded]="true"
                  />
                </div>
                <span class="text-sm text-gray-400">{{ formatTime(item.timestamp) }}</span>
                <span class="text-xs text-gray-600 font-mono">ID: {{ item.id.substring(0, 8) }}...</span>
              </div>
              <div class="flex items-center gap-2">
                @if (item.syncing) {
                  <span class="text-sm text-blue-400 flex items-center gap-1">
                    <i class="pi pi-spin pi-spinner"></i> Sincronizando...
                  </span>
                } @else {
                  <p-button
                    icon="pi pi-upload"
                    label="Sincronizar"
                    severity="info"
                    [outlined]="true"
                    size="small"
                    (onClick)="syncItem(item)"
                  />
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    size="small"
                    (onClick)="discardItem(item)"
                  />
                }
              </div>
            </div>
          }
        </div>

        <p-button
          icon="pi pi-upload"
          label="Sincronizar todos"
          severity="info"
          [disabled]="syncing()"
          (onClick)="syncAll()"
        />
      }

      @if (quarantined().length > 0) {
        <div class="mt-8 pt-6 border-t border-neutral-700/50">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-flag-fill text-red-400"></i>
            <h3 class="text-base font-bold text-red-300 m-0">Marcaciones en cuarentena</h3>
            <span class="text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-full px-2 py-0.5">
              {{ quarantined().length }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mb-3">
            Rechazadas automáticamente porque el timestamp del kiosk era de más de 48h atrás
            (probable reloj atascado). Revisá manualmente y, si son legítimas, sincronizalas con la
            fecha/hora correcta usando la pantalla de marcaciones manuales.
          </p>
          <div class="flex flex-col gap-2">
            @for (q of quarantined(); track q.id) {
              <div class="flex items-center justify-between p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-white">{{ q.employee_name || '—' }}</span>
                    <p-tag [value]="TYPE_LABELS[q.type] || q.type" severity="danger" [rounded]="true" />
                  </div>
                  <span class="text-xs text-red-300">
                    Timestamp del kiosk: <span class="font-mono">{{ formatTime(q.timestamp) }}</span>
                  </span>
                  <span class="text-[11px] text-gray-500">
                    Antigüedad: {{ formatAge(q.age_ms) }} · Cuarentena: {{ formatTime(q.quarantined_at ?? '') }}
                  </span>
                </div>
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  size="small"
                  (onClick)="discardQuarantined(q.id)"
                />
              </div>
            }
          </div>
          <p-button
            class="mt-2"
            icon="pi pi-trash"
            label="Descartar todas"
            severity="danger"
            [outlined]="true"
            size="small"
            (onClick)="clearQuarantine()"
          />
        </div>
      }
    </div>
  `,
})
export class EmergencyTimelogReviewComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private message = inject(MessageService);

  public pending = signal<(EmergencyTimelog & { syncing?: boolean })[]>([]);
  public quarantined = signal<Array<EmergencyTimelog & { age_ms?: number; quarantined_at?: string }>>([]);
  public syncing = signal<boolean>(false);
  public readonly TYPE_LABELS = TYPE_LABELS;

  public loadQuarantine(): void {
    try {
      const raw = localStorage.getItem(QUARANTINE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      this.quarantined.set(Array.isArray(list) ? list : []);
    } catch {
      this.quarantined.set([]);
    }
  }

  public discardQuarantined(id: string): void {
    const next = this.quarantined().filter((q) => q.id !== id);
    this.quarantined.set(next);
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(next));
  }

  public clearQuarantine(): void {
    this.quarantined.set([]);
    localStorage.removeItem(QUARANTINE_KEY);
    this.message.add({
      severity: 'info',
      summary: 'Cuarentena limpiada',
      detail: 'Se descartaron todas las marcaciones en cuarentena de este dispositivo.',
      life: 3000,
    });
  }

  public formatAge(ageMs: number | undefined): string {
    if (!ageMs || !isFinite(ageMs)) return '—';
    const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    if (days >= 1) return `${days} día(s)`;
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    return `${hours} hora(s)`;
  }

  ngOnInit(): void {
    this.loadPending();
    this.loadQuarantine();
  }

  public loadPending(): void {
    try {
      const raw = localStorage.getItem(EMERGENCY_KEY);
      if (!raw) { this.pending.set([]); return; }
      const all: EmergencyTimelog[] = JSON.parse(raw);
      this.pending.set(all.filter(t => !t.synced));
    } catch {
      this.pending.set([]);
    }
  }

  public formatTime(timestamp: string): string {
    try {
      return formatInTimeZone(new Date(timestamp), 'America/Panama', 'dd/MM/yyyy hh:mm a');
    } catch {
      return timestamp;
    }
  }

  public async syncItem(item: EmergencyTimelog & { syncing?: boolean }): Promise<void> {
    this.pending.update(list =>
      list.map(t => t.id === item.id ? { ...t, syncing: true } : t)
    );

    try {
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/rpc/insert_manual_timelog'), {
          p_employee_id: item.employee_id,
          p_company_id: item.company_id,
          p_branch_id: item.branch_id,
          p_type: item.type,
          p_punched_at: item.timestamp,
          p_reason: 'Sincronización offline (EMERGENCY queue)',
        })
      );
      this.markSynced(item.id);
      this.loadPending();
      this.message.add({
        severity: 'success',
        summary: 'Sincronizado',
        detail: `Marcación de ${item.employee_name} guardada en el servidor`,
        life: 4000,
      });
    } catch (err: any) {
      // Diagnóstico real - antes era un toast genérico sin pista de la causa
      const status = err?.status;
      const code = err?.error?.code;
      const serverMsg = err?.error?.message || err?.message || 'Sin detalle';
      console.error('[EmergencyReview] Sync falló', {
        status,
        code,
        message: serverMsg,
        body: err?.error,
        item: { id: item.id, type: item.type, employee: item.employee_name },
      });

      this.pending.update(list =>
        list.map(t => t.id === item.id ? { ...t, syncing: false } : t)
      );

      const reason =
        status === 0
          ? 'sin conexión al servidor'
          : status >= 500
            ? `error servidor (${status})`
            : status >= 400
              ? `rechazo servidor ${status}${code ? ' ' + code : ''}: ${serverMsg}`
              : 'falla desconocida';
      this.message.add({
        severity: 'error',
        summary: 'No se pudo sincronizar',
        detail: reason,
        life: 8000,
      });
    }
  }

  public async syncAll(): Promise<void> {
    this.syncing.set(true);
    const items = this.pending().filter(t => !t.syncing);
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/rpc/insert_manual_timelog'), {
            p_employee_id: item.employee_id,
            p_company_id: item.company_id,
            p_branch_id: item.branch_id,
            p_type: item.type,
            p_punched_at: item.timestamp,
            p_reason: 'Sincronización offline (EMERGENCY queue)',
          })
        );
        this.markSynced(item.id);
        successCount++;
      } catch (err: any) {
        console.error('[EmergencyReview] syncAll: item falló', {
          status: err?.status,
          code: err?.error?.code,
          message: err?.error?.message || err?.message,
          body: err?.error,
          item: { id: item.id, type: item.type, employee: item.employee_name },
        });
        errorCount++;
      }
    }

    this.syncing.set(false);
    this.loadPending();

    if (successCount > 0) {
      this.message.add({
        severity: 'success',
        summary: 'Sincronización completa',
        detail: `${successCount} marcación(es) guardada(s) en el servidor`,
        life: 5000,
      });
    }
    if (errorCount > 0) {
      this.message.add({
        severity: 'warn',
        summary: 'Algunos fallaron',
        detail: `${errorCount} marcación(es) no se pudieron sincronizar`,
        life: 6000,
      });
    }
  }

  public discardItem(item: EmergencyTimelog): void {
    this.markSynced(item.id);
    this.loadPending();
    this.message.add({
      severity: 'info',
      summary: 'Descartado',
      detail: 'La marcación fue removida de la lista pendiente',
      life: 3000,
    });
  }

  private markSynced(id: string): void {
    try {
      const raw = localStorage.getItem(EMERGENCY_KEY);
      if (!raw) return;
      const all: EmergencyTimelog[] = JSON.parse(raw);
      const updated = all.map(t => t.id === id ? { ...t, synced: true } : t);
      localStorage.setItem(EMERGENCY_KEY, JSON.stringify(updated));
    } catch {
      console.error('[EmergencyReview] No se pudo marcar como sincronizado');
    }
  }
}
