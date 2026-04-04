import { CommonModule, DatePipe } from '@angular/common';
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
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { EmergencyTimelog } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';

const EMERGENCY_KEY = 'bd_kiosk_emergency_timelogs';
const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  lunch_start: 'Inicio Almuerzo',
  lunch_end: 'Fin Almuerzo',
  exit: 'Salida',
};

@Component({
  selector: 'pt-emergency-timelog-review',
  imports: [CommonModule, Card, Button, Tag, ToastModule, DatePipe],
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
    </div>
  `,
})
export class EmergencyTimelogReviewComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private message = inject(MessageService);

  public pending = signal<(EmergencyTimelog & { syncing?: boolean })[]>([]);
  public syncing = signal<boolean>(false);
  public readonly TYPE_LABELS = TYPE_LABELS;

  ngOnInit(): void {
    this.loadPending();
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
        this.http.post(this.apiUrl.build('rest/v1/timelogs'), {
          employee_id: item.employee_id,
          company_id: item.company_id,
          branch_id: item.branch_id,
          type: item.type,
          source: 'EMERGENCY',
          punched_at: item.timestamp,
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
    } catch {
      this.pending.update(list =>
        list.map(t => t.id === item.id ? { ...t, syncing: false } : t)
      );
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo sincronizar. Verifique la conexión al servidor.',
        life: 6000,
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
          this.http.post(this.apiUrl.build('rest/v1/timelogs'), {
            employee_id: item.employee_id,
            company_id: item.company_id,
            branch_id: item.branch_id,
            type: item.type,
            source: 'EMERGENCY',
            punched_at: item.timestamp,
          })
        );
        this.markSynced(item.id);
        successCount++;
      } catch {
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
