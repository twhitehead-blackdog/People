import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
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

type Status = 'open' | 'in_process' | 'resolved' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Category = 'hardware' | 'software' | 'network' | 'other';

interface ItTicketAdmin {
  id: number;
  title: string;
  description: string | null;
  category: Category | null;
  priority: Priority;
  status: Status;
  branch_id: string | null;
  company_id: string | null;
  requester_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  branch?: { id: string; name: string } | null;
  requester?: { id: string; first_name: string; father_name: string } | null;
  assignee?: { id: string; first_name: string; father_name: string } | null;
}

interface TicketComment {
  id: number;
  ticket_id: number;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: { first_name: string; father_name: string } | null;
}

const STATUS_META: Record<Status, { label: string; severity: 'warn' | 'info' | 'success' | 'secondary' }> = {
  open:       { label: 'Abierto',    severity: 'warn'      },
  in_process: { label: 'En Proceso', severity: 'info'      },
  resolved:   { label: 'Resuelto',   severity: 'success'   },
  cancelled:  { label: 'Cancelado',  severity: 'secondary' },
};

const PRIORITY_META: Record<Priority, { label: string; severity: 'danger' | 'warn' | 'info' | 'secondary' }> = {
  urgent: { label: 'Urgente', severity: 'danger'    },
  high:   { label: 'Alta',    severity: 'warn'      },
  medium: { label: 'Media',   severity: 'info'      },
  low:    { label: 'Baja',    severity: 'secondary' },
};

const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  hardware: { label: 'Hardware',          icon: 'pi-desktop' },
  software: { label: 'Software / Acceso', icon: 'pi-key'     },
  network:  { label: 'Red / Internet',    icon: 'pi-wifi'    },
  other:    { label: 'Otro',              icon: 'pi-wrench'  },
};

@Component({
  selector: 'pt-it-tickets-admin',
  standalone: true,
  imports: [
    DatePipe, FormsModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, ProgressSpinnerModule, TableModule, TagModule,
    TextareaModule, TooltipModule, CardModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-2xl font-bold text-gray-100 m-0">Tickets IT</h2>
          <p class="text-sm text-gray-400 m-0 mt-0.5">Bandeja unificada de soporte técnico</p>
        </div>
        <p-button icon="pi pi-refresh" label="Actualizar" size="small" severity="secondary" (onClick)="ticketsApi.reload()" />
      </div>

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
        <p-select [(ngModel)]="filterStatus"   [options]="statusOptions"   placeholder="Estado"     [showClear]="true" styleClass="w-40" />
        <p-select [(ngModel)]="filterPriority" [options]="priorityOptions" placeholder="Prioridad"  [showClear]="true" styleClass="w-36" />
        <p-select [(ngModel)]="filterCategory" [options]="categoryOptions" placeholder="Categoría"  [showClear]="true" styleClass="w-40" />
        <p-select [(ngModel)]="filterBranchId" [options]="branchOptions()" placeholder="Sucursal"   [showClear]="true" styleClass="w-56" />
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
                <td class="text-gray-400 text-xs">#{{ t.id }}</td>
                <td class="font-medium text-gray-200">{{ t.title }}</td>
                <td class="text-xs text-gray-400">{{ t.branch?.name || '—' }}</td>
                <td class="text-xs text-gray-400">
                  <i class="pi {{ categoryMeta(t.category).icon }} mr-1"></i>{{ categoryMeta(t.category).label }}
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
                <i class="pi {{ categoryMeta(t.category).icon }}"></i>{{ categoryMeta(t.category).label }}
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

            <div class="pt-3 border-t border-neutral-700/40">
              <h4 class="text-sm font-semibold text-gray-200 mb-2">Comentarios ({{ comments().length }})</h4>
              @if (commentsApi.isLoading()) {
                <div class="text-xs text-gray-500">Cargando comentarios…</div>
              }
              <div class="space-y-2 mb-3 max-h-64 overflow-y-auto">
                @for (c of comments(); track c.id) {
                  <div [class]="'rounded-lg p-2 text-sm ' + (c.is_internal ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-neutral-800/60')">
                    <div class="flex justify-between text-xs text-gray-400 mb-0.5">
                      <span class="font-medium">{{ employeeName(c.author) }}</span>
                      <span>{{ c.created_at | date:'dd/MM/yyyy HH:mm' }} @if (c.is_internal) { · <span class="text-yellow-400">Interno</span> }</span>
                    </div>
                    <div class="text-gray-200 whitespace-pre-wrap">{{ c.content }}</div>
                  </div>
                }
                @if (!comments().length && !commentsApi.isLoading()) {
                  <div class="text-xs text-gray-500">Sin comentarios todavía</div>
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
export class ItTicketsAdminComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private messageService = inject(MessageService);

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
  readonly categoryOptions = [
    { label: 'Hardware',          value: 'hardware' },
    { label: 'Software / Acceso', value: 'software' },
    { label: 'Red / Internet',    value: 'network'  },
    { label: 'Otro',              value: 'other'    },
  ];

  filterStatus   = signal<Status | null>(null);
  filterPriority = signal<Priority | null>(null);
  filterCategory = signal<Category | null>(null);
  filterBranchId = signal<string | null>(null);
  filterSearch   = signal<string>('');

  detailVisible = false;
  selectedTicket = signal<ItTicketAdmin | null>(null);
  editStatus     = signal<Status>('open');
  editAssigneeId = signal<string | null>(null);
  savingEdit     = signal(false);
  newComment     = signal('');
  postingComment = signal(false);

  ticketsApi = httpResource<ItTicketAdmin[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/it_tickets', {
        company_id: `eq.${companyId}`,
        order:      'created_at.desc',
        select:     'id,title,description,category,priority,status,branch_id,company_id,requester_id,assignee_id,created_at,updated_at,' +
                    'branch:branches(id,name),' +
                    'requester:employees!it_tickets_requester_id_fkey(id,first_name,father_name),' +
                    'assignee:employees!it_tickets_assignee_id_fkey(id,first_name,father_name)',
      }),
      method: 'GET',
    };
  });

  commentsApi = httpResource<TicketComment[]>(() => {
    const id = this.selectedTicket()?.id;
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/it_ticket_comments', {
        ticket_id: `eq.${id}`,
        order:     'created_at.asc',
        select:    'id,ticket_id,author_id,content,is_internal,created_at,author:employees(first_name,father_name)',
      }),
      method: 'GET',
    };
  });

  allTickets = computed(() => this.ticketsApi.value() ?? []);
  comments   = computed(() => this.commentsApi.value() ?? []);

  totalCount       = computed(() => this.allTickets().length);
  openCount        = computed(() => this.allTickets().filter(t => t.status === 'open').length);
  inProcessCount   = computed(() => this.allTickets().filter(t => t.status === 'in_process').length);
  resolvedCount    = computed(() => this.allTickets().filter(t => t.status === 'resolved').length);
  urgentOpenCount  = computed(() => this.allTickets().filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'cancelled').length);

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
    return t ? `Ticket #${t.id} — ${t.title}` : 'Ticket';
  });

  statusMeta(s: string)   { return STATUS_META[s as Status]     ?? { label: s, severity: 'secondary' as const }; }
  priorityMeta(p: string) { return PRIORITY_META[p as Priority] ?? { label: p, severity: 'secondary' as const }; }
  categoryMeta(c: string | null) { return CATEGORY_META[c as Category] ?? { label: c ?? '—', icon: 'pi-wrench' }; }

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

  openDetail(t: ItTicketAdmin) {
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
          this.apiUrl.build('rest/v1/it_tickets', { id: `eq.${t.id}` }),
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
          this.apiUrl.build('rest/v1/it_ticket_comments'),
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
