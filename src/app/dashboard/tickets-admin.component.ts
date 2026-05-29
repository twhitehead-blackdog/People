import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { SuggestionsAdminComponent } from './suggestions-admin.component';
import {
  Ticket,
  TicketComment,
  TicketDepartment,
  TicketPriority,
  TicketStatus,
  DEPARTMENTS,
  CATEGORIES_BY_DEPT,
  STATUS_META,
  PRIORITY_META,
} from '../models/ticket.model';

@Component({
  selector: 'pt-tickets-admin',
  standalone: true,
  imports: [
    DatePipe, FormsModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, ProgressSpinnerModule, TableModule, TagModule,
    TextareaModule, TooltipModule, CardModule, SuggestionsAdminComponent,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
               [style.background-color]="'rgba(99,102,241,0.15)'">
            <i [class]="'pi ' + deptMeta().icon + ' text-xl ' + deptMeta().color"></i>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-100 m-0">Tickets {{ deptMeta().label }}</h2>
            <p class="text-sm text-gray-400 m-0 mt-0.5">Bandeja de tickets dirigidos al departamento</p>
          </div>
        </div>
        <p-button icon="pi pi-refresh" label="Actualizar" size="small" severity="secondary" (onClick)="ticketsApi.reload()" />
      </div>

      <!-- Tabs: Tickets / Sugerencias -->
      <div class="inline-flex rounded-lg bg-neutral-900/50 border border-neutral-700/50 p-0.5">
        <button type="button"
          class="px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1.5"
          [class.bg-indigo-500/15]="view() === 'tickets'"
          [class.text-indigo-200]="view() === 'tickets'"
          [class.text-gray-400]="view() !== 'tickets'"
          (click)="view.set('tickets')">
          <i class="pi pi-ticket text-xs"></i> Tickets
        </button>
        <button type="button"
          class="px-3 py-1.5 text-sm rounded-md transition flex items-center gap-1.5"
          [class.bg-amber-500/15]="view() === 'suggestions'"
          [class.text-amber-200]="view() === 'suggestions'"
          [class.text-gray-400]="view() !== 'suggestions'"
          (click)="view.set('suggestions')">
          <i class="pi pi-lightbulb text-xs"></i> Sugerencias
        </button>
      </div>

      @if (view() === 'tickets') {
      <!-- Stats grid -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-neutral-800/60 rounded-lg border border-neutral-700/40 p-3">
          <div class="text-[10px] text-gray-400 uppercase">Total</div>
          <div class="text-2xl font-bold text-gray-100">{{ totalCount() }}</div>
        </div>
        <div class="bg-amber-500/10 rounded-lg border border-amber-500/30 p-3">
          <div class="text-[10px] text-amber-300 uppercase">Abiertos</div>
          <div class="text-2xl font-bold text-amber-300">{{ openCount() }}</div>
        </div>
        <div class="bg-blue-500/10 rounded-lg border border-blue-500/30 p-3">
          <div class="text-[10px] text-blue-300 uppercase">En Proceso</div>
          <div class="text-2xl font-bold text-blue-300">{{ inProcessCount() }}</div>
        </div>
        <div class="bg-emerald-500/10 rounded-lg border border-emerald-500/30 p-3">
          <div class="text-[10px] text-emerald-300 uppercase">Resueltos</div>
          <div class="text-2xl font-bold text-emerald-300">{{ resolvedCount() }}</div>
        </div>
        <div class="bg-red-500/10 rounded-lg border border-red-500/30 p-3">
          <div class="text-[10px] text-red-300 uppercase">Urgentes Abiertos</div>
          <div class="text-2xl font-bold text-red-300">{{ urgentOpenCount() }}</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 items-center bg-neutral-800/40 rounded-lg p-2">
        <p-select [(ngModel)]="filterStatus"   [options]="statusOptions"     placeholder="Estado"     [showClear]="true" styleClass="w-40" />
        <p-select [(ngModel)]="filterPriority" [options]="priorityOptions"   placeholder="Prioridad"  [showClear]="true" styleClass="w-36" />
        <p-select [(ngModel)]="filterCategory" [options]="categoryOptions()" placeholder="Categoría"  [showClear]="true" styleClass="w-44" />
        <p-select [(ngModel)]="filterBranchId" [options]="branchOptions()"   placeholder="Sucursal"   [showClear]="true" styleClass="w-56" />
        <input pInputText type="text" [(ngModel)]="filterSearch" placeholder="Buscar título…" class="w-56" />
        <p-button icon="pi pi-times" label="Limpiar" size="small" severity="secondary" [text]="true" (onClick)="clearFilters()" />
      </div>

      <!-- Table -->
      <p-card>
        @if (ticketsApi.isLoading()) {
          <div class="flex justify-center py-8"><p-progressSpinner styleClass="w-10 h-10" strokeWidth="3" /></div>
        } @else {
          <p-table
            [value]="filteredTickets()"
            styleClass="p-datatable-sm"
            [paginator]="true"
            [rows]="20"
            [rowsPerPageOptions]="[10, 20, 50, 100]"
            [globalFilterFields]="['title']"
            sortField="created_at" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr class="text-xs">
                <th style="width:70px" pSortableColumn="id">#</th>
                <th pSortableColumn="title">Título</th>
                <th>Sucursal</th>
                <th>Categoría</th>
                <th pSortableColumn="priority">Prioridad</th>
                <th pSortableColumn="status">Estado</th>
                <th>Solicitante</th>
                <th>Asignado</th>
                <th pSortableColumn="created_at">Creado</th>
                <th style="width:60px"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-t>
              <tr class="cursor-pointer hover:bg-neutral-800/40" (click)="openDetail(t)">
                <td class="text-gray-400 text-xs font-mono">{{ fmtTicketId(t.id) }}</td>
                <td class="font-medium text-gray-200">{{ t.title }}</td>
                <td class="text-xs text-gray-400">{{ t.branch?.name || '—' }}</td>
                <td class="text-xs text-gray-400">
                  <i class="pi {{ categoryDef(t.category)?.icon || 'pi-tag' }} mr-1"></i>{{ categoryDef(t.category)?.label || (t.category || '—') }}
                </td>
                <td><p-tag [severity]="priorityMeta(t.priority).severity" [value]="priorityMeta(t.priority).label" /></td>
                <td><p-tag [severity]="statusMeta(t.status).severity" [value]="statusMeta(t.status).label" /></td>
                <td class="text-xs text-gray-300">{{ employeeName(t.requester) }}</td>
                <td class="text-xs text-gray-300">{{ t.assignee ? employeeName(t.assignee) : 'Sin asignar' }}</td>
                <td class="text-xs text-gray-400">{{ t.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td><p-button icon="pi pi-eye" size="small" severity="secondary" [text]="true" (onClick)="openDetail(t); $event.stopPropagation()" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="10" class="text-center py-8 text-gray-500">No hay tickets que coincidan</td></tr>
            </ng-template>
          </p-table>
        }
      </p-card>
      }

      @if (view() === 'suggestions') {
        <pt-suggestions-admin [lockedDepartment]="department()" />
      }

      <!-- Detail dialog -->
      <p-dialog [(visible)]="detailVisible" [modal]="true" [style]="{ width: '720px' }" [dismissableMask]="true" [closeOnEscape]="true" [header]="detailHeader()">
        @if (selectedTicket(); as t) {
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-500">Sucursal:</span> <span class="ml-1">{{ t.branch?.name || '—' }}</span></div>
              <div><span class="text-gray-500">Creado:</span>  <span class="ml-1">{{ t.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
              <div><span class="text-gray-500">Solicitante:</span> <span class="ml-1">{{ employeeName(t.requester) }}</span></div>
              <div><span class="text-gray-500">Actualizado:</span> <span class="ml-1">{{ t.updated_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
              <div class="flex items-center gap-2">
                <span class="text-gray-500">Categoría:</span>
                <i class="pi {{ categoryDef(t.category)?.icon || 'pi-tag' }}"></i>{{ categoryDef(t.category)?.label || (t.category || '—') }}
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-500">Prioridad:</span>
                <p-tag [severity]="priorityMeta(t.priority).severity" [value]="priorityMeta(t.priority).label" />
              </div>
            </div>

            @if (t.description) {
              <div class="bg-neutral-800/60 rounded-lg p-3 text-sm text-gray-200 whitespace-pre-wrap">{{ t.description }}</div>
            }

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Cambiar estado</label>
                <p-select [(ngModel)]="editStatus" [options]="statusOptions" styleClass="w-full" />
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Asignar a</label>
                <p-select [(ngModel)]="editAssigneeId" [options]="assigneeOptions()" placeholder="Sin asignar" [showClear]="true" [filter]="true" filterBy="label" styleClass="w-full" />
              </div>
            </div>
            <div class="flex justify-end">
              <p-button label="Guardar cambios" icon="pi pi-check" size="small" [loading]="savingEdit()" (onClick)="saveEdit()" />
            </div>

            @if ((attachmentsApi.value() ?? []).length > 0) {
              <div class="pt-3 border-t border-neutral-700/40">
                <h4 class="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <i class="pi pi-paperclip text-blue-400 text-xs"></i> Archivos adjuntos ({{ (attachmentsApi.value() ?? []).length }})
                </h4>
                <div class="flex flex-wrap gap-2">
                  @for (att of attachmentsApi.value(); track att.id) {
                    <button type="button"
                      class="w-20 h-20 rounded-lg overflow-hidden border border-neutral-700/40 bg-neutral-800/60 flex items-center justify-center text-xs text-gray-400 hover:border-amber-400 transition-colors cursor-pointer p-0"
                      [title]="att.file_name + ' · ' + (att.uploaded_by_name || 'Sin autor')"
                      (click)="openAttachment(att)">
                      @if (att.mime_type.startsWith('image/')) {
                        <i class="pi pi-image text-2xl text-gray-500"></i>
                      } @else {
                        <i class="pi pi-file-pdf text-2xl text-red-400"></i>
                      }
                    </button>
                  }
                </div>
              </div>
            }
            <div class="pt-3 border-t border-neutral-700/40">
              <h4 class="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                <i class="pi pi-history text-amber-400 text-xs"></i> Historial y conversación
              </h4>
              @if (commentsApi.isLoading() || historyApi.isLoading()) {
                <div class="text-xs text-gray-500">Cargando…</div>
              }
              <div class="relative pl-5 mb-3 max-h-80 overflow-y-auto">
                <div class="absolute left-1.5 top-2 bottom-2 w-px bg-neutral-700/40"></div>
                @for (it of timeline(); track it.key) {
                  @if (it.type === 'event') {
                    <div class="relative py-1 text-xs text-gray-400 flex items-center gap-2">
                      <span class="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-amber-400/60 ring-2 ring-neutral-900"></span>
                      <i [class]="'pi ' + it.icon + ' text-amber-400/80 text-[10px]'"></i>
                      <span [innerHTML]="it.html"></span>
                      <span class="text-gray-500 text-[10px]">· {{ it.date | date:'dd MMM HH:mm' }}</span>
                    </div>
                  } @else {
                    <div class="relative py-1">
                      <span class="absolute -left-[18px] top-3 w-2 h-2 rounded-full bg-blue-400/60 ring-2 ring-neutral-900"></span>
                      <div [class]="'rounded-lg p-2 text-sm ' + (it.is_internal ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-neutral-800/60 border border-neutral-700/40')">
                        <div class="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span class="font-medium text-gray-300">{{ it.author }}</span>
                          <span>{{ it.date | date:'dd/MM HH:mm' }}@if (it.is_internal) { · <span class="text-yellow-400">Interno</span> }</span>
                        </div>
                        <div class="text-gray-200 whitespace-pre-wrap text-xs">{{ it.content }}</div>
                      </div>
                    </div>
                  }
                }
                @if (timeline().length === 0 && !commentsApi.isLoading() && !historyApi.isLoading()) {
                  <div class="text-xs text-gray-500 py-2">Sin actividad todavía</div>
                }
              </div>
              <textarea pTextarea [(ngModel)]="newComment" rows="2" class="w-full mb-2" placeholder="Agregar comentario…"></textarea>
              <div class="flex gap-2 justify-end">
                <p-button label="Nota interna" icon="pi pi-lock" severity="warn" size="small" [text]="true" [loading]="postingComment()" (onClick)="addComment(true)" />
                <p-button label="Publicar"     icon="pi pi-send" size="small" [loading]="postingComment()" (onClick)="addComment(false)" />
              </div>
            </div>
          </div>
        }
      </p-dialog>
    </div>
  `,
})
export class TicketsAdminComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);

  constructor() {
    // Deep-link: si llega ?ticket=ID desde un email, abrir el detalle automáticamente
    // cuando los tickets terminen de cargar.
    effect(() => {
      const list = this.ticketsApi.value();
      if (!list) return;
      const wantedId = Number(this.route.snapshot.queryParamMap.get('ticket'));
      if (!wantedId || this.detailVisible) return;
      const found = list.find(t => t.id === wantedId);
      if (found) this.openDetail(found);
    });
  }

  /** Departamento que esta vista administra. Pasado por route data o input. */
  department = input.required<TicketDepartment>();

  // Vista activa: bandeja de tickets o panel de sugerencias del departamento
  view = signal<'tickets' | 'suggestions'>('tickets');

  deptMeta = computed(() => DEPARTMENTS[this.department()]);

  readonly statusOptions = [
    { label: 'Abierto',    value: 'open'       },
    { label: 'En Proceso', value: 'in_process' },
    { label: 'Resuelto',   value: 'resolved'   },
    { label: 'Cancelado',  value: 'cancelled'  },
  ];
  readonly priorityOptions = [
    { label: 'Baja',    value: 'low'    },
    { label: 'Media',   value: 'medium' },
    { label: 'Alta',    value: 'high'   },
    { label: 'Urgente', value: 'urgent' },
  ];
  categoryOptions = computed(() =>
    CATEGORIES_BY_DEPT[this.department()].map(c => ({ label: c.label, value: c.value }))
  );

  filterStatus   = signal<TicketStatus | null>(null);
  filterPriority = signal<TicketPriority | null>(null);
  filterCategory = signal<string | null>(null);
  filterBranchId = signal<string | null>(null);
  filterSearch   = signal<string>('');

  detailVisible = false;
  selectedTicket = signal<Ticket | null>(null);
  editStatus     = signal<TicketStatus>('open');
  editAssigneeId = signal<string | null>(null);
  savingEdit     = signal(false);
  newComment     = signal('');
  postingComment = signal(false);

  ticketsApi = httpResource<Ticket[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    const dept = this.department();
    if (!companyId || !dept) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/tickets', {
        company_id: `eq.${companyId}`,
        department: `eq.${dept}`,
        order:      'created_at.desc',
        select:     'id,title,description,department,category,priority,status,branch_id,company_id,requester_id,assignee_id,created_at,updated_at,' +
                    'branch:branches(id,name),' +
                    'requester:employees!tickets_requester_id_fkey(id,first_name,father_name),' +
                    'assignee:employees!tickets_assignee_id_fkey(id,first_name,father_name)',
      }),
      method: 'GET',
    };
  });

  commentsApi = httpResource<TicketComment[]>(() => {
    const id = this.selectedTicket()?.id;
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/ticket_comments', {
        ticket_id: `eq.${id}`,
        order:     'created_at.asc',
        select:    'id,ticket_id,author_id,content,is_internal,created_at,author:employees(first_name,father_name)',
      }),
      method: 'GET',
    };
  });

  attachmentsApi = httpResource<Array<{ id: number; file_name: string; file_size: number; mime_type: string; uploaded_by_name: string | null; created_at: string }>>(() => {
    const id = this.selectedTicket()?.id;
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/ticket_attachments', {
        ticket_id: `eq.${id}`,
        order:     'created_at.asc',
        select:    'id,file_name,file_size,mime_type,uploaded_by_name,created_at',
      }),
      method: 'GET',
    };
  });

  attachmentThumbs = signal<Record<number, string>>({});

  async openAttachment(att: { id: number; mime_type: string }) {
    try {
      const r = await fetch(`/api/admin/ticket-attachment/${att.id}/signed-url`, {
        credentials: 'same-origin',
      });
      if (!r.ok) throw new Error('signed_url_fail');
      const data = await r.json();
      if (att.mime_type.startsWith('image/')) {
        // abrir en nueva pestaña — el admin no tiene lightbox aún
        window.open(data.signed_url, '_blank', 'noopener');
      } else {
        window.open(data.signed_url, '_blank', 'noopener');
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No pudimos abrir el archivo.' });
    }
  }

  historyApi = httpResource<Array<{ id: number; action: string; from_value: string | null; to_value: string | null; actor_name: string | null; created_at: string }>>(() => {
    const id = this.selectedTicket()?.id;
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/ticket_history', {
        ticket_id: `eq.${id}`,
        action:    'in.(created,status_changed,assignee_changed,priority_changed,category_changed,department_changed,reopened,cancelled,attachment_added)',
        order:     'created_at.asc',
        select:    'id,action,from_value,to_value,actor_name,created_at',
      }),
      method: 'GET',
    };
  });

  timeline = computed(() => {
    const STATUS_LABEL: Record<string, string> = { open:'Abierto', in_process:'En Proceso', resolved:'Resuelto', cancelled:'Cancelado' };
    const PRIORITY_LABEL: Record<string, string> = { low:'Baja', medium:'Media', high:'Alta', urgent:'Urgente' };
    const ICONS: Record<string, { icon: string; label: string }> = {
      created:            { icon: 'pi-flag',              label: 'creó el ticket' },
      status_changed:     { icon: 'pi-sync',              label: 'cambió el estado' },
      assignee_changed:   { icon: 'pi-user-edit',         label: 'reasignó' },
      priority_changed:   { icon: 'pi-exclamation-circle', label: 'cambió la prioridad' },
      category_changed:   { icon: 'pi-tag',               label: 'cambió la categoría' },
      department_changed: { icon: 'pi-share-alt',         label: 'transfirió a otro equipo' },
      reopened:           { icon: 'pi-replay',            label: 'reabrió' },
      cancelled:          { icon: 'pi-times-circle',      label: 'canceló' },
      attachment_added:   { icon: 'pi-paperclip',         label: 'adjuntó archivo' },
    };
    const esc = (s: string) => String(s ?? '').replace(/[<>&"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[c] as string));
    const events = (this.historyApi.value() ?? []).map(h => {
      const meta = ICONS[h.action] || { icon: 'pi-circle', label: h.action };
      const actor = (h.actor_name ?? '').trim() || 'El sistema';
      let detail = '';
      if (h.action === 'status_changed') {
        detail = ` <strong>${STATUS_LABEL[h.to_value ?? ''] || h.to_value}</strong>` +
                 (h.from_value ? ` <span style="color:#71717a;">(antes ${STATUS_LABEL[h.from_value] || h.from_value})</span>` : '');
      } else if (h.action === 'priority_changed') {
        detail = ` a <strong>${PRIORITY_LABEL[h.to_value ?? ''] || h.to_value}</strong>`;
      } else if (h.action === 'assignee_changed') {
        detail = h.to_value ? ` a <strong>${esc(h.to_value)}</strong>` : ' (sin asignado)';
      } else if (h.to_value) {
        detail = ` a <strong>${esc(h.to_value)}</strong>`;
      }
      return {
        key: `h-${h.id}`,
        type: 'event' as const,
        ts: new Date(h.created_at).getTime(),
        date: h.created_at,
        icon: meta.icon,
        html: `<strong>${esc(actor)}</strong> ${meta.label}${detail}`,
      };
    });
    const cs = (this.commentsApi.value() ?? []).map(c => ({
      key: `c-${c.id}`,
      type: 'comment' as const,
      ts: new Date(c.created_at).getTime(),
      date: c.created_at,
      author: this.employeeName(c.author),
      is_internal: c.is_internal,
      content: c.content,
    }));
    return [...events, ...cs].sort((a, b) => a.ts - b.ts);
  });

  allTickets = computed(() => this.ticketsApi.value() ?? []);
  comments   = computed(() => this.commentsApi.value() ?? []);

  totalCount      = computed(() => this.allTickets().length);
  openCount       = computed(() => this.allTickets().filter(t => t.status === 'open').length);
  inProcessCount  = computed(() => this.allTickets().filter(t => t.status === 'in_process').length);
  resolvedCount   = computed(() => this.allTickets().filter(t => t.status === 'resolved').length);
  urgentOpenCount = computed(() => this.allTickets().filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'cancelled').length);

  filteredTickets = computed(() => {
    const s = this.filterStatus();
    const p = this.filterPriority();
    const c = this.filterCategory();
    const b = this.filterBranchId();
    const q = this.filterSearch().trim().toLowerCase();
    return this.allTickets().filter(t => {
      if (s && t.status   !== s) return false;
      if (p && t.priority !== p) return false;
      if (c && t.category !== c) return false;
      if (b && t.branch_id !== b) return false;
      if (q && !(t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))) return false;
      return true;
    });
  });

  branchOptions = computed(() =>
    this.store.branches.entities().map(b => ({ label: b.name, value: b.id }))
  );

  assigneeOptions = computed(() =>
    this.store.employees.entities()
      .filter((e: any) => e.is_active !== false)
      .map((e: any) => ({ label: `${e.first_name} ${e.father_name}`.trim(), value: e.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  detailHeader = computed(() => {
    const t = this.selectedTicket();
    return t ? `Ticket ${this.fmtTicketId(t.id)} — ${t.title}` : 'Ticket';
  });

  statusMeta(s: string)   { return STATUS_META[s as TicketStatus]     ?? { label: s, severity: 'secondary' as const, icon: '' }; }
  priorityMeta(p: string) { return PRIORITY_META[p as TicketPriority] ?? { label: p, severity: 'secondary' as const, description: '', color: '' }; }
  fmtTicketId(n: number): string {
    if (n == null) return 'T—';
    const s = String(n).padStart(6, '0');
    return `T${s.slice(0,3)}-${s.slice(3)}`;
  }

  categoryDef(c: string | null) {
    if (!c) return null;
    return CATEGORIES_BY_DEPT[this.department()].find(x => x.value === c) ?? null;
  }

  employeeName(e?: { first_name: string; father_name: string } | null) {
    if (!e) return '—';
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim() || '—';
  }

  clearFilters() {
    this.filterStatus.set(null);
    this.filterPriority.set(null);
    this.filterCategory.set(null);
    this.filterBranchId.set(null);
    this.filterSearch.set('');
  }

  openDetail(t: Ticket) {
    this.selectedTicket.set(t);
    this.editStatus.set(t.status);
    this.editAssigneeId.set(t.assignee_id);
    this.newComment.set('');
    this.detailVisible = true;
  }

  async saveEdit() {
    const t = this.selectedTicket();
    if (!t) return;
    this.savingEdit.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/tickets', { id: `eq.${t.id}` }),
          {
            status:      this.editStatus(),
            assignee_id: this.editAssigneeId(),
            updated_at:  new Date().toISOString(),
          },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Ticket actualizado.' });
      this.ticketsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
    } finally {
      this.savingEdit.set(false);
    }
  }

  async addComment(isInternal: boolean) {
    const t = this.selectedTicket();
    const content = this.newComment().trim();
    const employee = this.store.currentEmployee();
    if (!t || !content || !employee) return;
    this.postingComment.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/ticket_comments'),
          {
            ticket_id:   t.id,
            author_id:   employee.id,
            content,
            is_internal: isInternal,
          },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.newComment.set('');
      this.commentsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar el comentario.' });
    } finally {
      this.postingComment.set(false);
    }
  }
}
