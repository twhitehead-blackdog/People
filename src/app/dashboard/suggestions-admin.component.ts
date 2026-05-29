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
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import {
  Suggestion,
  SuggestionComment,
  SuggestionDepartment,
  SuggestionStatus,
  SUGGESTION_STATUS_META,
  SUGGESTION_IMPACT_META,
} from '../models/suggestion.model';
import { DEPARTMENTS, TicketDepartment } from '../models/ticket.model';

const DEPT_OPTIONS: { label: string; value: SuggestionDepartment }[] = [
  { label: 'General',          value: 'general'    },
  { label: 'IT',               value: 'it'         },
  { label: 'Operaciones',      value: 'operations' },
  { label: 'Contabilidad',     value: 'accounting' },
  { label: 'RRHH',             value: 'hr'         },
];

@Component({
  selector: 'pt-suggestions-admin',
  standalone: true,
  imports: [
    DatePipe, FormsModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, ProgressSpinnerModule, TagModule, TextareaModule,
    TooltipModule, CardModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <i class="pi pi-lightbulb text-yellow-300 text-xl"></i>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-100 m-0">Sugerencias</h2>
            <p class="text-sm text-gray-400 m-0 mt-0.5">Ideas y mejoras propuestas por el equipo</p>
          </div>
        </div>
        <div class="flex gap-2">
          <p-button icon="pi pi-plus" label="Nueva sugerencia" size="small" severity="success" (onClick)="openCreateDialog()" />
          <p-button icon="pi pi-refresh" size="small" severity="secondary" (onClick)="suggestionsApi.reload()" />
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-neutral-800/60 rounded-lg border border-neutral-700/40 p-3">
          <div class="text-[10px] text-gray-400 uppercase">Total</div>
          <div class="text-2xl font-bold text-gray-100">{{ totalCount() }}</div>
        </div>
        <div class="bg-blue-500/10 rounded-lg border border-blue-500/30 p-3">
          <div class="text-[10px] text-blue-300 uppercase">Nuevas</div>
          <div class="text-2xl font-bold text-blue-300">{{ newCount() }}</div>
        </div>
        <div class="bg-amber-500/10 rounded-lg border border-amber-500/30 p-3">
          <div class="text-[10px] text-amber-300 uppercase">En revisión</div>
          <div class="text-2xl font-bold text-amber-300">{{ reviewCount() }}</div>
        </div>
        <div class="bg-indigo-500/10 rounded-lg border border-indigo-500/30 p-3">
          <div class="text-[10px] text-indigo-300 uppercase">Planeadas / En curso</div>
          <div class="text-2xl font-bold text-indigo-300">{{ activeCount() }}</div>
        </div>
        <div class="bg-emerald-500/10 rounded-lg border border-emerald-500/30 p-3">
          <div class="text-[10px] text-emerald-300 uppercase">Implementadas</div>
          <div class="text-2xl font-bold text-emerald-300">{{ implementedCount() }}</div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap gap-2 items-center bg-neutral-800/40 rounded-lg p-2">
        @if (!lockedDepartment()) {
          <p-select [(ngModel)]="filterDept"   [options]="deptOptions"   placeholder="Departamento" [showClear]="true" styleClass="w-48" />
        }
        <p-select [(ngModel)]="filterStatus" [options]="statusOptions" placeholder="Estado"       [showClear]="true" styleClass="w-44" />
        <p-select [(ngModel)]="sortBy"       [options]="sortOptions"   placeholder="Ordenar"      styleClass="w-44" />
        <input pInputText type="text" [(ngModel)]="filterSearch" placeholder="Buscar…" class="w-56" />
        <p-button icon="pi pi-times" label="Limpiar" size="small" severity="secondary" [text]="true" (onClick)="clearFilters()" />
      </div>

      <!-- Lista de sugerencias estilo Kanban / cards -->
      @if (suggestionsApi.isLoading()) {
        <div class="flex justify-center py-8"><p-progressSpinner styleClass="w-10 h-10" strokeWidth="3" /></div>
      } @else if (!filteredSuggestions().length) {
        <div class="text-center py-12 text-gray-500">
          <i class="pi pi-lightbulb text-5xl block mb-3 text-gray-700"></i>
          <p>No hay sugerencias todavía. ¡Crea la primera!</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          @for (s of filteredSuggestions(); track s.id) {
          <div class="bg-neutral-800/60 border border-neutral-700/40 rounded-lg p-3 hover:border-amber-400/40 transition-all cursor-pointer flex flex-col"
               (click)="openDetail(s)">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-2 min-w-0">
                <i [class]="'pi ' + deptIcon(s.department) + ' text-sm ' + deptColor(s.department)"></i>
                <span class="text-[10px] uppercase text-gray-500">{{ deptLabel(s.department) }}</span>
              </div>
              <p-tag [value]="statusMeta(s.status).label" [severity]="statusMeta(s.status).severity"
                [rounded]="true" [style]="{ 'font-size': '0.65rem' }" />
            </div>
            <h4 class="text-sm font-bold text-gray-100 m-0 mb-1 line-clamp-2">{{ s.title }}</h4>
            @if (s.description) {
              <p class="text-xs text-gray-400 m-0 line-clamp-3 flex-1">{{ s.description }}</p>
            }
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-neutral-700/40">
              <div class="text-[10px] text-gray-500">
                {{ s.is_anonymous ? 'Anónimo' : authorName(s.author) }} · {{ s.created_at | date:'dd/MM/yy' }}
              </div>
              <button type="button"
                class="flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all"
                [class]="s.has_voted
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  : 'bg-neutral-700/40 border-neutral-600/40 text-gray-400 hover:border-amber-400/40'"
                (click)="toggleVote(s); $event.stopPropagation()">
                <i class="pi pi-thumbs-up text-[10px]"></i>
                <span class="text-xs font-bold">{{ s.vote_count }}</span>
              </button>
            </div>
          </div>
          }
        </div>
      }

      <!-- Detail dialog (admin: cambiar estado, responder, comentar) -->
      <p-dialog [(visible)]="detailVisible" [modal]="true" [style]="{ width: '720px' }" [dismissableMask]="true" [header]="detailHeader()">
        @if (selectedSuggestion(); as s) {
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><span class="text-gray-500">Depto:</span> <span class="ml-1">{{ deptLabel(s.department) }}</span></div>
              <div><span class="text-gray-500">Estado actual:</span> <p-tag class="ml-1" [value]="statusMeta(s.status).label" [severity]="statusMeta(s.status).severity" /></div>
              <div><span class="text-gray-500">Autor:</span> <span class="ml-1">{{ s.is_anonymous ? 'Anónimo' : authorName(s.author) }}</span></div>
              <div><span class="text-gray-500">Creado:</span> <span class="ml-1">{{ s.created_at | date:'dd/MM/yyyy HH:mm' }}</span></div>
              <div><span class="text-gray-500">Votos:</span> <span class="ml-1 font-bold text-amber-300">{{ s.vote_count }}</span></div>
              @if (s.impact) {
                <div><span class="text-gray-500">Impacto:</span> <span class="ml-1" [class]="impactColor(s.impact)">{{ impactLabel(s.impact) }}</span></div>
              }
            </div>

            @if (s.description) {
              <div class="bg-neutral-800/60 rounded-lg p-3 text-sm text-gray-200 whitespace-pre-wrap">{{ s.description }}</div>
            }

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Cambiar estado</label>
                <p-select [(ngModel)]="editStatus" [options]="statusOptionsAdmin" styleClass="w-full" />
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Impacto estimado</label>
                <p-select [(ngModel)]="editImpact" [options]="impactOptions" placeholder="—" [showClear]="true" styleClass="w-full" />
              </div>
            </div>

            <div>
              <label class="text-xs text-gray-400 block mb-1">Respuesta oficial (visible al autor)</label>
              <textarea pTextarea [(ngModel)]="editAdminResponse" rows="2" class="w-full"
                placeholder="Decisión, próximos pasos, fecha estimada…"></textarea>
            </div>

            <div class="flex justify-end">
              <p-button label="Guardar cambios" icon="pi pi-check" size="small" [loading]="savingEdit()" (onClick)="saveEdit()" />
            </div>

            <div class="pt-3 border-t border-neutral-700/40">
              <h4 class="text-sm font-semibold text-gray-200 mb-2">Comentarios internos ({{ comments().length }})</h4>
              <div class="space-y-2 mb-3 max-h-64 overflow-y-auto">
                @for (c of comments(); track c.id) {
                  <div class="rounded-lg p-2 text-sm bg-neutral-800/60">
                    <div class="flex justify-between text-xs text-gray-400 mb-0.5">
                      <span class="font-medium">{{ authorName(c.author) }}</span>
                      <span>{{ c.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <div class="text-gray-200 whitespace-pre-wrap">{{ c.content }}</div>
                  </div>
                }
                @if (!comments().length) {
                  <div class="text-xs text-gray-500">Sin comentarios</div>
                }
              </div>
              <textarea pTextarea [(ngModel)]="newComment" rows="2" class="w-full mb-2" placeholder="Agregar comentario interno…"></textarea>
              <div class="flex justify-end">
                <p-button label="Publicar" icon="pi pi-send" size="small" [loading]="postingComment()" (onClick)="addComment()" />
              </div>
            </div>
          </div>
        }
      </p-dialog>

      <!-- Create dialog -->
      <p-dialog [(visible)]="createVisible" [modal]="true" header="Nueva sugerencia" [style]="{ width: '560px' }">
        <div class="space-y-3">
          <div>
            <label class="text-sm font-semibold text-gray-200 block mb-1">Departamento</label>
            <p-select [(ngModel)]="newForm.department" [options]="deptOptions" styleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-200 block mb-1">Título <span class="text-red-400">*</span></label>
            <input pInputText [(ngModel)]="newForm.title" class="w-full" maxlength="200" placeholder="Idea o mejora en una frase" />
          </div>
          <div>
            <label class="text-sm font-semibold text-gray-200 block mb-1">Descripción <span class="text-red-400">*</span></label>
            <textarea pTextarea [(ngModel)]="newForm.description" rows="4" maxlength="2000" class="w-full"
              placeholder="Detalla el qué, el por qué y el beneficio esperado…"></textarea>
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" [(ngModel)]="newForm.is_anonymous" />
            Enviar de forma anónima
          </label>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancelar" severity="secondary" [disabled]="creating()" (onClick)="createVisible = false" />
          <p-button label="Publicar sugerencia" icon="pi pi-send" [loading]="creating()" [disabled]="!createValid()" (onClick)="submitNew()" />
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class SuggestionsAdminComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private messageService = inject(MessageService);

  readonly deptOptions = DEPT_OPTIONS;
  readonly statusOptions = [
    { label: 'Nueva',         value: 'new'          },
    { label: 'En revisión',   value: 'under_review' },
    { label: 'Planeada',      value: 'planned'      },
    { label: 'En progreso',   value: 'in_progress'  },
    { label: 'Implementada',  value: 'implemented'  },
    { label: 'Rechazada',     value: 'rejected'     },
    { label: 'Duplicada',     value: 'duplicate'    },
  ];
  readonly statusOptionsAdmin = this.statusOptions;
  readonly impactOptions = [
    { label: 'Bajo',  value: 'low'    },
    { label: 'Medio', value: 'medium' },
    { label: 'Alto',  value: 'high'   },
  ];
  readonly sortOptions = [
    { label: 'Más votados',   value: 'votes' },
    { label: 'Más recientes', value: 'newest' },
    { label: 'Más antiguos',  value: 'oldest' },
  ];

  // Cuando se embebe dentro del panel de Tickets, se fija el departamento
  // y se oculta el dropdown de departamento.
  lockedDepartment = input<SuggestionDepartment | null>(null);

  filterDept   = signal<SuggestionDepartment | null>(null);
  filterStatus = signal<SuggestionStatus | null>(null);
  filterSearch = signal('');

  constructor() {
    // Si viene un departamento bloqueado, presetear el filtro.
    effect(() => {
      const locked = this.lockedDepartment();
      if (locked) this.filterDept.set(locked);
    });
  }
  sortBy       = signal<'votes' | 'newest' | 'oldest'>('votes');

  detailVisible = false;
  createVisible = false;
  selectedSuggestion = signal<Suggestion | null>(null);
  editStatus = signal<SuggestionStatus>('new');
  editImpact = signal<'low' | 'medium' | 'high' | null>(null);
  editAdminResponse = signal('');
  savingEdit = signal(false);
  newComment = signal('');
  postingComment = signal(false);
  creating = signal(false);

  newForm = {
    department: 'general' as SuggestionDepartment,
    title: '',
    description: '',
    is_anonymous: false,
  };

  createValid = computed(() => this.newForm.title.trim().length > 2 && this.newForm.description.trim().length > 5);

  suggestionsApi = httpResource<Suggestion[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/suggestions', {
        company_id: `eq.${companyId}`,
        order: 'vote_count.desc,created_at.desc',
        select: 'id,title,description,department,category,status,impact,is_anonymous,author_id,branch_id,company_id,reviewer_id,admin_response,responded_at,vote_count,created_at,updated_at,' +
                'author:employees!suggestions_author_id_fkey(id,first_name,father_name)',
      }),
      method: 'GET',
    };
  });

  votesApi = httpResource<{ suggestion_id: number }[]>(() => {
    const employeeId = this.store.currentEmployee()?.id;
    if (!employeeId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/suggestion_votes', {
        employee_id: `eq.${employeeId}`,
        select: 'suggestion_id',
      }),
      method: 'GET',
    };
  });

  commentsApi = httpResource<SuggestionComment[]>(() => {
    const id = this.selectedSuggestion()?.id;
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/suggestion_comments', {
        suggestion_id: `eq.${id}`,
        order: 'created_at.asc',
        select: 'id,suggestion_id,author_id,content,is_internal,created_at,author:employees(first_name,father_name)',
      }),
      method: 'GET',
    };
  });

  myVotedIds = computed(() => new Set((this.votesApi.value() ?? []).map(v => v.suggestion_id)));

  allSuggestions = computed(() => {
    const voted = this.myVotedIds();
    return (this.suggestionsApi.value() ?? []).map(s => ({ ...s, has_voted: voted.has(s.id) }));
  });

  comments = computed(() => this.commentsApi.value() ?? []);

  filteredSuggestions = computed(() => {
    const d = this.filterDept();
    const s = this.filterStatus();
    const q = this.filterSearch().trim().toLowerCase();
    let list = this.allSuggestions().filter(x => {
      if (d && x.department !== d) return false;
      if (s && x.status !== s) return false;
      if (q && !(x.title?.toLowerCase().includes(q) || x.description?.toLowerCase().includes(q))) return false;
      return true;
    });
    switch (this.sortBy()) {
      case 'votes':  list = [...list].sort((a, b) => b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at)); break;
      case 'newest': list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case 'oldest': list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
    }
    return list;
  });

  totalCount       = computed(() => this.allSuggestions().length);
  newCount         = computed(() => this.allSuggestions().filter(s => s.status === 'new').length);
  reviewCount      = computed(() => this.allSuggestions().filter(s => s.status === 'under_review').length);
  activeCount      = computed(() => this.allSuggestions().filter(s => s.status === 'planned' || s.status === 'in_progress').length);
  implementedCount = computed(() => this.allSuggestions().filter(s => s.status === 'implemented').length);

  detailHeader = computed(() => {
    const s = this.selectedSuggestion();
    return s ? `Sugerencia #${s.id} — ${s.title}` : 'Sugerencia';
  });

  // Helpers
  deptLabel(d: string) {
    if (d === 'general') return 'General';
    return DEPARTMENTS[d as TicketDepartment]?.label ?? d;
  }
  deptIcon(d: string) {
    if (d === 'general') return 'pi-globe';
    return DEPARTMENTS[d as TicketDepartment]?.icon ?? 'pi-tag';
  }
  deptColor(d: string) {
    if (d === 'general') return 'text-gray-400';
    return DEPARTMENTS[d as TicketDepartment]?.color ?? 'text-gray-400';
  }
  statusMeta(s: string) { return SUGGESTION_STATUS_META[s as SuggestionStatus] ?? { label: s, severity: 'secondary' as const, icon: '' }; }
  impactLabel(i: string)  { return SUGGESTION_IMPACT_META[i as 'low' | 'medium' | 'high']?.label ?? i; }
  impactColor(i: string)  { return SUGGESTION_IMPACT_META[i as 'low' | 'medium' | 'high']?.color ?? 'text-gray-400'; }

  authorName(e?: { first_name: string; father_name: string } | null) {
    if (!e) return '—';
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim() || '—';
  }

  clearFilters() {
    this.filterDept.set(null);
    this.filterStatus.set(null);
    this.filterSearch.set('');
  }

  openCreateDialog() {
    this.newForm = { department: 'general', title: '', description: '', is_anonymous: false };
    this.createVisible = true;
  }

  async submitNew() {
    if (!this.createValid()) return;
    const employee = this.store.currentEmployee();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!employee || !companyId) return;
    this.creating.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/suggestions'),
          {
            title:        this.newForm.title.trim(),
            description:  this.newForm.description.trim(),
            department:   this.newForm.department,
            is_anonymous: this.newForm.is_anonymous,
            author_id:    this.newForm.is_anonymous ? null : employee.id,
            branch_id:    employee.branch_id,
            company_id:   companyId,
            status:       'new',
          },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Publicada', detail: 'Tu sugerencia fue registrada.' });
      this.createVisible = false;
      this.suggestionsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar.' });
    } finally {
      this.creating.set(false);
    }
  }

  openDetail(s: Suggestion) {
    this.selectedSuggestion.set(s);
    this.editStatus.set(s.status);
    this.editImpact.set(s.impact);
    this.editAdminResponse.set(s.admin_response ?? '');
    this.newComment.set('');
    this.detailVisible = true;
  }

  async toggleVote(s: Suggestion) {
    const employeeId = this.store.currentEmployee()?.id;
    if (!employeeId) return;
    try {
      if (s.has_voted) {
        await firstValueFrom(
          this.http.delete(
            this.apiUrl.build('rest/v1/suggestion_votes', {
              suggestion_id: `eq.${s.id}`,
              employee_id:   `eq.${employeeId}`,
            }),
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      } else {
        await firstValueFrom(
          this.http.post(
            this.apiUrl.build('rest/v1/suggestion_votes'),
            { suggestion_id: s.id, employee_id: employeeId },
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      }
      this.votesApi.reload();
      this.suggestionsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar el voto.' });
    }
  }

  async saveEdit() {
    const s = this.selectedSuggestion();
    const employee = this.store.currentEmployee();
    if (!s || !employee) return;
    this.savingEdit.set(true);
    try {
      const body: any = {
        status: this.editStatus(),
        impact: this.editImpact(),
        admin_response: this.editAdminResponse().trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (this.editAdminResponse().trim()) {
        body.reviewer_id = employee.id;
        body.responded_at = new Date().toISOString();
      }
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/suggestions', { id: `eq.${s.id}` }),
          body,
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Guardado' });
      this.suggestionsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
    } finally {
      this.savingEdit.set(false);
    }
  }

  async addComment() {
    const s = this.selectedSuggestion();
    const content = this.newComment().trim();
    const employee = this.store.currentEmployee();
    if (!s || !content || !employee) return;
    this.postingComment.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/suggestion_comments'),
          { suggestion_id: s.id, author_id: employee.id, content, is_internal: true },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.newComment.set('');
      this.commentsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar.' });
    } finally {
      this.postingComment.set(false);
    }
  }
}
