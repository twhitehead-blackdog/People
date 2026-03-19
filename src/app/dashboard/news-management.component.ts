import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { DashboardStore } from '../stores/dashboard.store';

interface NewsItem {
  id: string;
  title: string;
  message: string;
  icon: string;
  priority: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

const ICON_OPTIONS = [
  { label: 'Megáfono', value: 'pi-megaphone', icon: 'pi pi-megaphone' },
  { label: 'Información', value: 'pi-info-circle', icon: 'pi pi-info-circle' },
  { label: 'Estrella', value: 'pi-star', icon: 'pi pi-star' },
  { label: 'Cumpleaños', value: 'pi-gift', icon: 'pi pi-gift' },
  { label: 'Reloj', value: 'pi-clock', icon: 'pi pi-clock' },
  { label: 'Calendario', value: 'pi-calendar', icon: 'pi pi-calendar' },
  { label: 'Alerta', value: 'pi-exclamation-triangle', icon: 'pi pi-exclamation-triangle' },
  { label: 'Check', value: 'pi-check-circle', icon: 'pi pi-check-circle' },
  { label: 'Tienda', value: 'pi-shop', icon: 'pi pi-shop' },
  { label: 'Personas', value: 'pi-users', icon: 'pi pi-users' },
];

@Component({
  selector: 'pt-news-management',
  standalone: true,
  imports: [
    FormsModule, DatePipe, ButtonModule, ConfirmDialogModule, DialogModule,
    InputTextModule, Select, TableModule, TagModule, TextareaModule,
    ToastModule, ToggleSwitchModule, TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden">
      <!-- Header -->
      <div class="bg-neutral-800/95 border-b border-neutral-700/50 shadow-sm sticky top-0 z-40">
        <div class="px-4 py-2.5">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold text-white m-0 flex items-center gap-2">
                <i class="pi pi-megaphone text-amber-400"></i>
                Noticias y Anuncios
              </h1>
              <p class="text-xs text-gray-400 m-0 mt-0.5">Gestión del ticker de noticias</p>
            </div>
            <p-button icon="pi pi-plus" label="Nueva" size="small" (onClick)="openNew()" />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-neutral-800/80 rounded-lg border border-neutral-700/50 p-3 text-center">
            <div class="text-lg font-bold text-white">{{ totalCount() }}</div>
            <div class="text-[10px] text-gray-400">Total</div>
          </div>
          <div class="bg-neutral-800/80 rounded-lg border border-neutral-700/50 p-3 text-center">
            <div class="text-lg font-bold text-green-400">{{ activeCount() }}</div>
            <div class="text-[10px] text-gray-400">Activas</div>
          </div>
          <div class="bg-neutral-800/80 rounded-lg border border-neutral-700/50 p-3 text-center">
            <div class="text-lg font-bold text-gray-500">{{ inactiveCount() }}</div>
            <div class="text-[10px] text-gray-400">Inactivas</div>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-neutral-800/80 rounded-lg border border-neutral-700/50 overflow-hidden">
          @if (loading()) {
            <div class="flex justify-center py-8"><i class="pi pi-spin pi-spinner text-2xl text-amber-400"></i></div>
          } @else if (news().length === 0) {
            <div class="text-center py-8">
              <i class="pi pi-megaphone text-gray-500 text-3xl mb-2"></i>
              <p class="text-gray-500 text-sm">No hay noticias. Crea la primera.</p>
            </div>
          } @else {
            <p-table [value]="news()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th style="width:40px; padding:0.4rem"></th>
                  <th style="padding:0.4rem"><span class="text-xs">Título</span></th>
                  <th style="padding:0.4rem"><span class="text-xs">Mensaje</span></th>
                  <th style="width:80px; padding:0.4rem; text-align:center"><span class="text-xs">Estado</span></th>
                  <th style="width:90px; padding:0.4rem; text-align:center"><span class="text-xs">Expira</span></th>
                  <th style="width:100px; padding:0.4rem; text-align:center"><span class="text-xs">Acciones</span></th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td style="padding:0.4rem; text-align:center">
                    <i class="pi text-amber-400 text-sm" [class]="item.icon"></i>
                  </td>
                  <td style="padding:0.4rem">
                    <span class="text-xs font-semibold text-white">{{ item.title }}</span>
                  </td>
                  <td style="padding:0.4rem">
                    <span class="text-xs text-gray-300 line-clamp-1">{{ item.message }}</span>
                  </td>
                  <td style="padding:0.4rem; text-align:center">
                    <p-button
                      [label]="item.is_active ? 'Activa' : 'Inactiva'"
                      [severity]="item.is_active ? 'success' : 'secondary'"
                      [outlined]="!item.is_active"
                      size="small"
                      (onClick)="toggleActive(item)"
                      [pTooltip]="item.is_active ? 'Click para desactivar' : 'Click para activar'"
                      tooltipPosition="top"
                    />
                  </td>
                  <td style="padding:0.4rem; text-align:center">
                    <span class="text-[10px] text-gray-400">
                      {{ item.expires_at ? (item.expires_at | date:'dd/MM/yy') : 'Sin límite' }}
                    </span>
                  </td>
                  <td style="padding:0.4rem; text-align:center">
                    <div class="flex gap-0.5 justify-center">
                      <p-button icon="pi pi-pencil" [text]="true" severity="info" size="small" [rounded]="true"
                                (onClick)="editItem(item)" pTooltip="Editar" />
                      <p-button icon="pi pi-trash" [text]="true" severity="danger" size="small" [rounded]="true"
                                (onClick)="confirmDelete(item)" pTooltip="Eliminar" />
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      </div>
    </div>

    <!-- Dialog crear/editar -->
    <p-dialog [(visible)]="showDialog" [modal]="true" [style]="{width:'90vw',maxWidth:'550px'}"
              [draggable]="false" [dismissableMask]="true">
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-megaphone text-amber-400"></i>
          <span class="text-lg font-semibold text-white">{{ editingId() ? 'Editar' : 'Nueva' }} Noticia</span>
        </div>
      </ng-template>
      <div class="space-y-4 pt-3">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Título</label>
          <input pInputText [(ngModel)]="formTitle" class="w-full" placeholder="Ej: Nuevo ingreso" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Mensaje</label>
          <textarea pTextarea [(ngModel)]="formMessage" rows="3" class="w-full"
                    placeholder="Ej: Damos la bienvenida a Juan Pérez al equipo"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Icono</label>
            <p-select [(ngModel)]="formIcon" [options]="iconOptions" optionLabel="label"
                      optionValue="value" placeholder="Seleccionar" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Prioridad</label>
            <p-select [(ngModel)]="formPriority" [options]="priorityOptions" optionLabel="label"
                      optionValue="value" styleClass="w-full" appendTo="body" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Inicia</label>
            <input pInputText type="date" [(ngModel)]="formStartsAt" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Expira (opcional)</label>
            <input pInputText type="date" [(ngModel)]="formExpiresAt" class="w-full" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <p-toggleSwitch [(ngModel)]="formActive" />
          <span class="text-sm text-gray-300">Activa</span>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="showDialog.set(false)" />
          <p-button [label]="editingId() ? 'Guardar' : 'Crear'" icon="pi pi-check"
                    [disabled]="!formTitle.trim() || !formMessage.trim()" [loading]="saving()"
                    (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class NewsManagementComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private msg = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private store = inject(DashboardStore);

  public iconOptions = ICON_OPTIONS;
  public priorityOptions = [
    { label: 'Normal', value: 0 },
    { label: 'Alta', value: 1 },
    { label: 'Urgente', value: 2 },
  ];

  public news = signal<NewsItem[]>([]);
  public loading = signal(true);
  public saving = signal(false);
  public showDialog = signal(false);
  public editingId = signal<string | null>(null);

  public totalCount = computed(() => this.news().length);
  public activeCount = computed(() => this.news().filter(n => n.is_active).length);
  public inactiveCount = computed(() => this.news().filter(n => !n.is_active).length);

  // Form
  public formTitle = '';
  public formMessage = '';
  public formIcon = 'pi-megaphone';
  public formPriority = 0;
  public formStartsAt = new Date().toISOString().split('T')[0];
  public formExpiresAt = '';
  public formActive = true;

  constructor() { this.loadNews(); }

  async loadNews() {
    this.loading.set(true);
    try {
      const url = this.apiUrl.build('rest/v1/news_ticker', {
        order: 'priority.desc,created_at.desc',
        select: '*',
      });
      const data = await firstValueFrom(this.http.get<NewsItem[]>(url));
      this.news.set(data || []);
    } catch { /* silent */ }
    this.loading.set(false);
  }

  openNew() {
    this.editingId.set(null);
    this.formTitle = '';
    this.formMessage = '';
    this.formIcon = 'pi-megaphone';
    this.formPriority = 0;
    this.formStartsAt = new Date().toISOString().split('T')[0];
    this.formExpiresAt = '';
    this.formActive = true;
    this.showDialog.set(true);
  }

  editItem(item: NewsItem) {
    this.editingId.set(item.id);
    this.formTitle = item.title;
    this.formMessage = item.message;
    this.formIcon = item.icon;
    this.formPriority = item.priority;
    this.formStartsAt = item.starts_at ? item.starts_at.split('T')[0] : '';
    this.formExpiresAt = item.expires_at ? item.expires_at.split('T')[0] : '';
    this.formActive = item.is_active;
    this.showDialog.set(true);
  }

  async save() {
    this.saving.set(true);
    const body: any = {
      title: this.formTitle.trim(),
      message: this.formMessage.trim(),
      icon: this.formIcon,
      priority: this.formPriority,
      is_active: this.formActive,
      starts_at: this.formStartsAt ? new Date(this.formStartsAt + 'T00:00:00').toISOString() : new Date().toISOString(),
      expires_at: this.formExpiresAt ? new Date(this.formExpiresAt + 'T23:59:59').toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    try {
      const id = this.editingId();
      if (id) {
        await firstValueFrom(this.http.patch(this.apiUrl.build(`rest/v1/news_ticker?id=eq.${id}`), body));
        this.msg.add({ severity: 'success', summary: 'Actualizada', detail: 'Noticia actualizada' });
      } else {
        body.created_by = this.store.currentEmployee()?.id || null;
        await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/news_ticker'), body));
        this.msg.add({ severity: 'success', summary: 'Creada', detail: 'Noticia creada exitosamente' });
      }
      this.showDialog.set(false);
      this.loadNews();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'No se pudo guardar' });
    }
    this.saving.set(false);
  }

  async toggleActive(item: NewsItem) {
    try {
      const newState = !item.is_active;
      await firstValueFrom(
        this.http.patch(this.apiUrl.build(`rest/v1/news_ticker?id=eq.${item.id}`), {
          is_active: newState,
          updated_at: new Date().toISOString(),
        })
      );
      this.msg.add({
        severity: newState ? 'success' : 'warn',
        summary: newState ? 'Activada' : 'Desactivada',
        detail: `"${item.title}" ${newState ? 'activada' : 'desactivada'}`,
      });
      this.loadNews();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado' });
    }
  }

  confirmDelete(item: NewsItem) {
    this.confirm.confirm({
      message: `¿Eliminar "${item.title}"?`,
      header: 'Confirmar',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.deleteItem(item),
    });
  }

  async deleteItem(item: NewsItem) {
    try {
      await firstValueFrom(this.http.delete(this.apiUrl.build(`rest/v1/news_ticker?id=eq.${item.id}`)));
      this.msg.add({ severity: 'warn', summary: 'Eliminada', detail: 'Noticia eliminada' });
      this.loadNews();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    }
  }
}
