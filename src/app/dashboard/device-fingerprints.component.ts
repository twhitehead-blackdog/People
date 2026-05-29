import { CommonModule, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

/**
 * Lista de dispositivos (PCs/celulares) que han marcado en el sistema.
 * Cada dispositivo identificado por device_id (UUID persistente del browser)
 * y combined_hash (huella biométrica del hardware — mismo hash = misma máquina).
 */
@Component({
  selector: 'pt-device-fingerprints',
  imports: [CommonModule, FormsModule, DatePipe, Button, Card, Tag, Tooltip, Skeleton, Dialog, IconField, InputIcon, InputText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="df-wrap">
      <div class="df-header">
        <div>
          <h2 class="df-title">
            <i class="pi pi-desktop text-cyan-400"></i>
            Dispositivos registrados
          </h2>
          <p class="df-sub">Cada PC/celular que ha marcado en People. {{ devices.value()?.length ?? 0 }} dispositivos.</p>
        </div>
        <p-button label="Actualizar" icon="pi pi-refresh" [outlined]="true" size="small" (onClick)="devices.reload()" />
      </div>

      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between">
            <span>Lista de dispositivos</span>
            <p-iconfield style="width: 320px;">
              <p-inputicon styleClass="pi pi-search" />
              <input pInputText type="text" [(ngModel)]="searchValue" placeholder="Buscar OS/browser/IP/empleado..."
                (ngModelChange)="search.set($event)" />
            </p-iconfield>
          </div>
        </ng-template>

        @if (devices.isLoading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton height="4rem" styleClass="mb-2" />
          }
        } @else if (filtered().length === 0) {
          <div class="df-empty">
            <i class="pi pi-desktop text-5xl text-gray-700"></i>
            <p>Sin dispositivos registrados aún</p>
          </div>
        } @else {
          <div class="df-list">
            @for (d of filtered(); track d.id) {
              <div class="df-row" (click)="openDetail(d)">
                <div class="df-row__icon">
                  <i class="pi" [class]="d.is_mobile ? 'pi-mobile' : 'pi-desktop'"></i>
                </div>
                <div class="df-row__body">
                  <div class="df-row__title">
                    {{ d.browser_name || 'Browser?' }} {{ d.browser_version }} · {{ d.os_name || d.platform }} {{ d.os_version }}
                    @if (d.same_hardware_count > 1) {
                      <p-tag value="{{ d.same_hardware_count }} sesiones mismo HW" severity="warn" styleClass="ml-2" />
                    }
                  </div>
                  <div class="df-row__meta">
                    <span pTooltip="device_id"><i class="pi pi-id-card"></i> {{ shortId(d.device_id) }}</span>
                    @if (d.gpu_renderer) {
                      <span [pTooltip]="d.gpu_renderer"><i class="pi pi-microchip-ai"></i> {{ shortGpu(d.gpu_renderer) }}</span>
                    }
                    @if (d.cpu_cores) {
                      <span><i class="pi pi-server"></i> {{ d.cpu_cores }} cores</span>
                    }
                    @if (d.device_memory_gb) {
                      <span>{{ d.device_memory_gb }}GB RAM</span>
                    }
                    @if (d.screen_width && d.screen_height) {
                      <span>{{ d.screen_width }}×{{ d.screen_height }}</span>
                    }
                    @if (d.ip_public) {
                      <span class="df-mono"><i class="pi pi-globe"></i> {{ d.ip_public }}</span>
                    }
                    @if (d.branch_name) {
                      <span><i class="pi pi-map-marker"></i> {{ d.branch_name }}</span>
                    }
                    <span><i class="pi pi-list"></i> {{ d.total_timelogs }} marcas</span>
                    <span><i class="pi pi-users"></i> {{ d.distinct_employees_used }} empleados</span>
                  </div>
                </div>
                <div class="df-row__time">
                  <div>{{ d.last_seen_at | date: 'short' }}</div>
                  <small>{{ d.seen_count }} vistas</small>
                </div>
              </div>
            }
          </div>
        }
      </p-card>

      <!-- Detalle del device -->
      <p-dialog
        [(visible)]="dialogVisibleValue"
        (onHide)="dialogVisible.set(false)"
        [modal]="true" [draggable]="false" [style]="{ width: '640px' }"
        header="Detalle del dispositivo">
        @if (selected()) {
          @let s = selected();
          <div class="df-detail">
            <div class="df-detail__block">
              <h4>Identificación</h4>
              <div><strong>device_id:</strong> <code>{{ s.device_id }}</code></div>
              <div><strong>combined_hash:</strong> <code>{{ s.combined_hash }}</code></div>
              <div><strong>canvas:</strong> <code>{{ shortHash(s.canvas_hash) }}</code></div>
              <div><strong>audio:</strong> <code>{{ shortHash(s.audio_hash) }}</code></div>
              <div><strong>webgl:</strong> <code>{{ shortHash(s.webgl_hash) }}</code></div>
              <div><strong>fonts:</strong> <code>{{ shortHash(s.font_hash) }}</code></div>
            </div>
            <div class="df-detail__block">
              <h4>Hardware</h4>
              <div><strong>Platform:</strong> {{ s.platform }}</div>
              <div><strong>OS:</strong> {{ s.os_name }} {{ s.os_version }}</div>
              <div><strong>Browser:</strong> {{ s.browser_name }} {{ s.browser_version }}</div>
              <div><strong>CPU cores:</strong> {{ s.cpu_cores }}</div>
              <div><strong>RAM:</strong> {{ s.device_memory_gb }} GB</div>
              <div><strong>GPU vendor:</strong> {{ s.gpu_vendor }}</div>
              <div><strong>GPU renderer:</strong> {{ s.gpu_renderer }}</div>
              <div><strong>Pantalla:</strong> {{ s.screen_width }}×{{ s.screen_height }} @ {{ s.device_pixel_ratio }}x · {{ s.screen_color_depth }}bit</div>
              <div><strong>Touch points:</strong> {{ s.touch_points }}</div>
              <div><strong>Móvil:</strong> {{ s.is_mobile ? 'Sí' : 'No' }}</div>
            </div>
            <div class="df-detail__block">
              <h4>Sistema / Red</h4>
              <div><strong>Timezone:</strong> {{ s.timezone }} ({{ s.timezone_offset }} min)</div>
              <div><strong>Idioma:</strong> {{ s.language }}</div>
              <div><strong>Idiomas:</strong> {{ (s.languages || []).join(', ') }}</div>
              <div><strong>IP pública:</strong> {{ s.ip_public }}</div>
              <div><strong>IP local:</strong> {{ s.ip_local }}</div>
              <div><strong>Conexión:</strong> {{ s.connection_type }} {{ s.connection_downlink ? '· ' + s.connection_downlink + ' Mbps' : '' }}</div>
              <div><strong>Batería:</strong> {{ s.battery_level != null ? (s.battery_level * 100 | number: '1.0-0') + '%' : '—' }} {{ s.battery_charging ? '(cargando)' : '' }}</div>
            </div>
            @if (s.ua_brands) {
              <div class="df-detail__block">
                <h4>Client Hints (Chromium)</h4>
                <div><strong>Platform real:</strong> {{ s.ua_platform_version || '—' }}</div>
                <div><strong>Arquitectura:</strong> {{ s.ua_arch }} {{ s.ua_bitness ? s.ua_bitness + 'bit' : '' }}</div>
                @if (s.ua_model) { <div><strong>Modelo:</strong> {{ s.ua_model }}</div> }
              </div>
            }
            <div class="df-detail__block">
              <h4>Histórico</h4>
              <div><strong>Primera vez:</strong> {{ s.first_seen_at | date: 'medium' }}</div>
              <div><strong>Última vez:</strong> {{ s.last_seen_at | date: 'medium' }}</div>
              <div><strong>Total visitas:</strong> {{ s.seen_count }}</div>
              <div><strong>Marcaciones (timelogs):</strong> {{ s.total_timelogs }}</div>
              <div><strong>Intentos face:</strong> {{ s.total_face_attempts }}</div>
              <div><strong>Empleados distintos usando este PC:</strong> {{ s.distinct_employees_used }}</div>
              @if (s.same_hardware_count > 1) {
                <div class="text-amber-400"><i class="pi pi-exclamation-triangle"></i>
                  <strong>{{ s.same_hardware_count }} device_ids comparten esta huella de hardware</strong> (mismo PC, distintos browsers/incógnitos).
                </div>
              }
            </div>
            <div class="df-detail__block">
              <h4>User Agent crudo</h4>
              <code class="df-ua">{{ s.user_agent }}</code>
            </div>
          </div>
        }
      </p-dialog>
    </div>
  `,
  styles: [`
    .df-wrap { padding: 1.5rem; max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .df-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .df-title { font-size: 1.4rem; font-weight: 700; color: #f3f4f6; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .df-sub { color: #9ca3af; font-size: 0.85rem; margin: 0.25rem 0 0; }

    .df-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 70vh; overflow-y: auto; }
    .df-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer; transition: background 0.15s; }
    .df-row:hover { background: rgba(255,255,255,0.06); }
    .df-row__icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(34,211,238,0.12); color: #67e8f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .df-row__icon i { font-size: 18px; }
    .df-row__body { flex: 1; min-width: 0; }
    .df-row__title { font-size: 0.9rem; font-weight: 600; color: #f3f4f6; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
    .df-row__meta { font-size: 0.72rem; color: #6b7280; display: flex; gap: 0.85rem; flex-wrap: wrap; margin-top: 4px; }
    .df-row__meta i { font-size: 0.7rem; margin-right: 3px; }
    .df-row__time { text-align: right; font-size: 0.78rem; color: #9ca3af; flex-shrink: 0; }
    .df-row__time small { display: block; font-size: 0.66rem; color: #6b7280; }
    .df-mono { font-family: ui-monospace, monospace; }

    .df-empty { display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 3rem 1rem; color: #6b7280; }

    .df-detail { display: flex; flex-direction: column; gap: 1.25rem; font-size: 0.86rem; color: #d1d5db; }
    .df-detail__block h4 { font-size: 0.78rem; color: #67e8f9; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.5rem; }
    .df-detail__block strong { color: #f3f4f6; font-weight: 600; min-width: 140px; display: inline-block; }
    .df-detail__block code { color: #67e8f9; background: rgba(34,211,238,0.08); padding: 1px 5px; border-radius: 3px; font-size: 0.75rem; word-break: break-all; }
    .df-ua { display: block; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 0.7rem; line-height: 1.4; white-space: pre-wrap; word-break: break-all; }
  `],
})
export class DeviceFingerprintsComponent {
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

  public search = signal<string>('');
  public searchValue = '';
  public dialogVisible = signal<boolean>(false);
  public dialogVisibleValue = false;
  public selected = signal<any | null>(null);

  public devices = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: Record<string, string> = {
      select: '*',
      order: 'last_seen_at.desc',
      limit: '500',
    };
    if (companyId) params['company_id'] = `eq.${companyId}`;
    return { url: this.apiUrl.build('rest/v1/v_device_fingerprints', params), method: 'GET' };
  });

  public filtered = computed(() => {
    const list = this.devices.value() ?? [];
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => {
      const hay = [
        d.os_name, d.os_version, d.browser_name, d.platform, d.gpu_renderer,
        d.ip_public, d.ip_local, d.branch_name, d.device_id, d.user_agent,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  });

  public openDetail(d: any): void {
    this.selected.set(d);
    this.dialogVisible.set(true);
    this.dialogVisibleValue = true;
  }

  public shortId(id: string | null): string {
    return id ? id.slice(0, 8) + '…' : '—';
  }
  public shortHash(h: string | null): string {
    return h ? h.slice(0, 12) + '…' : '—';
  }
  public shortGpu(s: string | null): string {
    return s ? (s.length > 32 ? s.slice(0, 32) + '…' : s) : '—';
  }
}
