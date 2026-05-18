import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

interface Channel {
  channel_id: string;
  streaming_id?: string;
  online: boolean;
  cam_ip?: string;
  cam_name?: string;
  unused?: boolean;
}

interface NvrStatus {
  nvr_id: string;
  nvr_name: string;
  nvr_ip: string;
  nvr_model?: string;
  nvr_location?: string;
  branch_id?: string | null;
  branch_name?: string;
  expected_channels?: number | null;
  channels: Channel[];
  streaming_channels?: string[];
  disk_total_gb: number | null;
  disk_free_gb: number | null;
  online: boolean;
  online_count: number;
  offline_count: number;
  unused_count?: number;
  total_channels: number;
  error?: string | null;
}

@Component({
  selector: 'pt-it-cameras',
  standalone: true,
  imports: [
    FormsModule, ButtonModule, CardModule, DialogModule,
    ProgressBarModule, ProgressSpinnerModule, TagModule, TooltipModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-2xl font-bold text-gray-100 m-0">Monitoreo de Cámaras NVR</h2>
          <p class="text-sm text-gray-400 m-0 mt-0.5">
            {{ nvrs().length }} NVR(s) · {{ totalOnline() }} online · {{ totalOffline() }} offline · {{ totalUnused() }} sin uso
          </p>
        </div>
        <div class="flex items-center gap-2">
          @if (lastChecked()) { <span class="text-xs text-gray-400">Último check: {{ lastChecked() }}</span> }
          <p-button label="Actualizar" icon="pi pi-refresh" severity="secondary" size="small" [loading]="statusApi.isLoading()" (onClick)="statusApi.reload()" />
        </div>
      </div>

      @if (!statusApi.isLoading() && nvrs().length > 0) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-neutral-800/60 rounded-lg border border-neutral-700/40 p-3">
            <div class="text-[10px] text-gray-400 uppercase">NVRs Activos</div>
            <div class="text-2xl font-bold text-gray-100">{{ nvrs().length }}</div>
          </div>
          <div class="bg-emerald-500/10 rounded-lg border border-emerald-500/30 p-3">
            <div class="text-[10px] text-emerald-300 uppercase">Cámaras Online</div>
            <div class="text-2xl font-bold text-emerald-300">{{ totalOnline() }}</div>
          </div>
          <div class="bg-red-500/10 rounded-lg border border-red-500/30 p-3">
            <div class="text-[10px] text-red-300 uppercase">Offline</div>
            <div class="text-2xl font-bold" [class.text-red-300]="totalOffline() > 0" [class.text-gray-500]="totalOffline() === 0">{{ totalOffline() }}</div>
          </div>
          <div class="bg-amber-500/10 rounded-lg border border-amber-500/30 p-3">
            <div class="text-[10px] text-amber-300 uppercase">NVRs sin conexión</div>
            <div class="text-2xl font-bold" [class.text-amber-300]="nvrErrors() > 0" [class.text-gray-500]="nvrErrors() === 0">{{ nvrErrors() }}</div>
          </div>
        </div>
      }

      @if (statusApi.isLoading()) {
        <div class="flex flex-col items-center justify-center py-16 text-gray-400">
          <p-progressSpinner styleClass="w-12 h-12" strokeWidth="3" />
          <p class="text-sm mt-4">Conectando a {{ nvrs().length || '14' }} NVRs...</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          @for (nvr of nvrs(); track nvr.nvr_id) {
            <div class="bg-neutral-900/60 rounded-xl border border-neutral-700/40 overflow-hidden"
                 [class.ring-1]="nvr.error || nvr.offline_count > 0"
                 [class.ring-red-500_30]="nvr.error"
                 [class.ring-amber-500_30]="!nvr.error && nvr.offline_count > 0">
              <div class="h-1 w-full"
                   [class]="nvr.error ? 'bg-red-500' : nvr.offline_count > 0 ? 'bg-amber-500' : 'bg-emerald-500'"></div>

              <div class="p-3 border-b border-neutral-700/40">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                         [class]="nvr.online ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : 'bg-red-500/10 ring-1 ring-red-500/30'">
                      <i class="pi text-base" [class]="nvr.online ? 'pi-video text-emerald-400' : 'pi-times text-red-400'"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="font-semibold text-gray-100 truncate">{{ nvr.nvr_name }}</div>
                      <div class="text-[10px] text-gray-500 truncate">
                        <span class="font-mono">{{ nvr.nvr_ip }}</span>
                        @if (nvr.nvr_model) { · {{ nvr.nvr_model }} }
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    @if (nvr.branch_name || nvr.nvr_location) {
                      <span class="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full font-medium border border-amber-500/20">
                        <i class="pi pi-map-marker mr-1"></i>{{ nvr.branch_name || nvr.nvr_location }}
                      </span>
                    }
                    <p-button icon="pi pi-refresh" size="small" severity="secondary" [text]="true" [rounded]="true" [loading]="!!refreshing()[nvr.nvr_id]" (onClick)="refreshSingle(nvr.nvr_id)" pTooltip="Actualizar" />
                  </div>
                </div>

                @if (nvr.error) {
                  <div class="mt-2 text-xs text-red-400 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                    <i class="pi pi-exclamation-circle mr-1"></i>{{ nvr.error }}
                  </div>
                }
              </div>

              @if (nvr.online) {
                <div class="px-3 py-2 flex items-center gap-3 border-b border-neutral-700/40 bg-neutral-800/30">
                  <div class="flex items-center gap-2 text-xs">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>{{ nvr.online_count }}</span>
                    @if (nvr.offline_count > 0) {
                      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-red-400 font-bold">{{ nvr.offline_count }}</span></span>
                    }
                    <span class="text-gray-500">de {{ nvr.expected_channels || nvr.total_channels }} canales</span>
                  </div>
                  <div class="flex-1"></div>
                  @if (nvr.disk_total_gb) {
                    <div class="flex items-center gap-2 min-w-[160px]">
                      <i class="pi pi-database text-xs" [class]="diskColor(nvr)"></i>
                      <div class="flex-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" [style.width.%]="diskPct(nvr)" [class]="diskPct(nvr) >= 95 ? 'bg-red-500' : diskPct(nvr) >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                      </div>
                      <span class="text-[10px] font-mono tabular-nums" [class]="diskColor(nvr)">{{ nvr.disk_free_gb }}GB</span>
                    </div>
                  }
                </div>

                <div class="p-3">
                  <div class="flex flex-wrap gap-1.5">
                    @for (ch of nvr.channels; track ch.channel_id) {
                      <button
                        class="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-medium transition-all hover:scale-110"
                        [class]="ch.unused
                          ? 'bg-neutral-800 text-gray-600 border border-neutral-700 opacity-40 cursor-not-allowed'
                          : ch.online
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse cursor-pointer'"
                        [disabled]="ch.unused || !ch.online"
                        (click)="openLive(nvr, ch)"
                        [pTooltip]="'CH ' + ch.channel_id + (ch.cam_ip ? ' · ' + ch.cam_ip : '') + (ch.cam_name ? ' · ' + ch.cam_name : '') + ' · ' + (ch.unused ? 'Sin uso' : ch.online ? 'Online' : 'OFFLINE')">
                        {{ ch.channel_id }}
                      </button>
                    }
                  </div>
                </div>
              } @else if (!nvr.error) {
                <div class="p-6 text-center text-gray-500 text-sm">
                  <i class="pi pi-info-circle mr-1"></i>Sin datos de canales
                </div>
              }
            </div>
          }
        </div>

        @if (nvrs().length === 0) {
          <div class="bg-neutral-900/60 rounded-xl border border-neutral-700/40 p-16 text-center text-gray-500">
            <i class="pi pi-video text-5xl mb-4 block"></i>
            <p class="text-lg font-medium">No hay NVRs registrados</p>
            <p class="text-sm mt-1">Configúralos en la base de datos (tabla it_nvr_devices)</p>
          </div>
        }
      }

      <!-- Live view dialog -->
      <p-dialog [(visible)]="liveVisible" [modal]="true" [style]="{ width: '900px' }" [dismissableMask]="true" [closeOnEscape]="true" [header]="liveHeader()" (onHide)="closeLive()">
        @if (liveUrl()) {
          <div class="bg-black rounded-lg overflow-hidden">
            <img [src]="liveUrl()" [alt]="liveHeader()" class="w-full h-auto" (error)="onLiveError()" />
          </div>
          <div class="mt-3 flex justify-between items-center text-xs text-gray-400">
            <span><i class="pi pi-circle-fill text-red-400 text-[8px] animate-pulse mr-1"></i> EN VIVO · MJPEG</span>
            <span class="font-mono">{{ liveContext() }}</span>
          </div>
        }
      </p-dialog>
    </div>
  `,
})
export class ItCamerasComponent {
  private http = inject(HttpClient);
  private msg = inject(MessageService);

  refreshing = signal<Record<string, boolean>>({});
  lastChecked = signal<string>('');

  liveVisible = false;
  liveUrl = signal<string>('');
  liveHeader = signal<string>('');
  liveContext = signal<string>('');

  statusApi = httpResource<NvrStatus[]>(() => ({
    url: '/api/nvr/all/status',
    method: 'GET',
  }));

  nvrs = computed(() => {
    const v = this.statusApi.value() ?? [];
    if (v.length && this.lastChecked() === '') {
      queueMicrotask(() => this.lastChecked.set(new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })));
    }
    return v;
  });

  totalOnline  = computed(() => this.nvrs().reduce((s, n) => s + n.online_count,  0));
  totalOffline = computed(() => this.nvrs().reduce((s, n) => s + n.offline_count, 0));
  totalUnused  = computed(() => this.nvrs().reduce((s, n) => s + (n.unused_count || 0), 0));
  nvrErrors    = computed(() => this.nvrs().filter(n => n.error || !n.online).length);

  async refreshSingle(nvrId: string) {
    this.refreshing.update(r => ({ ...r, [nvrId]: true }));
    try {
      const result = await firstValueFrom(this.http.get<any>(`/api/nvr/${nvrId}/status`));
      const current = this.statusApi.value() ?? [];
      const updated = current.map(n => n.nvr_id === nvrId ? {
        ...n,
        channels: result.channels || [],
        disk_total_gb: result.disk_total_gb,
        disk_free_gb: result.disk_free_gb,
        online: (result.channels?.length || 0) > 0,
        online_count: result.channels?.filter((c: Channel) => c.online).length || 0,
        offline_count: result.channels?.filter((c: Channel) => !c.online).length || 0,
        total_channels: result.channels?.length || 0,
        error: result.errors?.length ? result.errors.join(', ') : null,
      } : n);
      this.statusApi.set(updated);
      this.lastChecked.set(new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: err.message || 'Error refrescando NVR' });
    } finally {
      this.refreshing.update(r => ({ ...r, [nvrId]: false }));
    }
  }

  openLive(nvr: NvrStatus, ch: Channel) {
    if (ch.unused || !ch.online) return;
    const streamingId = ch.streaming_id || `${parseInt(ch.channel_id) || 1}01`;
    this.liveHeader.set(`${nvr.nvr_name} · CH ${ch.channel_id}${ch.cam_name ? ' · ' + ch.cam_name : ''}`);
    this.liveContext.set(`${nvr.nvr_ip} · streaming ${streamingId}`);
    this.liveUrl.set(`/api/live/${nvr.nvr_id}/${streamingId}?t=${Date.now()}`);
    this.liveVisible = true;
  }

  closeLive() {
    this.liveUrl.set('');
    this.liveVisible = false;
  }

  onLiveError() {
    this.msg.add({ severity: 'warn', summary: 'Stream', detail: 'No se pudo iniciar el stream MJPEG.' });
  }

  diskPct(nvr: NvrStatus): number {
    if (!nvr.disk_total_gb) return 0;
    return Math.round(((nvr.disk_total_gb - (nvr.disk_free_gb || 0)) / nvr.disk_total_gb) * 100);
  }

  diskColor(nvr: NvrStatus): string {
    const pct = this.diskPct(nvr);
    if (pct >= 95) return 'text-red-400';
    if (pct >= 80) return 'text-amber-400';
    return 'text-emerald-400';
  }
}
