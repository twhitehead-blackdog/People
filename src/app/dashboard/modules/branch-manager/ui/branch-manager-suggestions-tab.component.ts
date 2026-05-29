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
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import {
  Suggestion,
  SuggestionDepartment,
  SuggestionStatus,
  SUGGESTION_STATUS_META,
} from '../../../../models/suggestion.model';
import { DEPARTMENTS, TicketDepartment } from '../../../../models/ticket.model';

const DEPT_OPTIONS: { label: string; value: SuggestionDepartment }[] = [
  { label: 'General',          value: 'general'    },
  { label: 'IT',               value: 'it'         },
  { label: 'Operaciones',      value: 'operations' },
  { label: 'Contabilidad',     value: 'accounting' },
  { label: 'RRHH',             value: 'hr'         },
];

@Component({
  selector: 'pt-branch-manager-suggestions-tab',
  standalone: true,
  imports: [
    DatePipe, FormsModule, ButtonModule, DialogModule, SelectModule,
    InputTextModule, ProgressSpinnerModule, TagModule, TextareaModule, TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">

      <!-- Banner -->
      <div class="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-neutral-800/60 rounded-lg border border-yellow-500/20 p-3 flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i class="pi pi-lightbulb text-yellow-300 text-sm"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-yellow-300 m-0 mb-0.5">¿Tienes una idea?</p>
          <p class="text-xs text-gray-400 m-0 leading-relaxed">
            Propón mejoras al equipo. Vota las ideas de tus compañeros con
            <i class="pi pi-thumbs-up text-yellow-400"></i> para subirlas en prioridad.
          </p>
        </div>
        <p-button icon="pi pi-plus" label="Proponer idea"
          severity="warn" size="small" (onClick)="openCreateDialog()" class="flex-shrink-0" />
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap gap-2 items-center bg-neutral-800/40 rounded-lg p-2">
        <p-select [(ngModel)]="filterDept"   [options]="deptOptions"   placeholder="Departamento" [showClear]="true" styleClass="w-48" />
        <p-select [(ngModel)]="filterStatus" [options]="statusOptions" placeholder="Estado"       [showClear]="true" styleClass="w-40" />
        <p-select [(ngModel)]="sortBy"       [options]="sortOptions"   placeholder="Ordenar"      styleClass="w-44" />
        <input pInputText type="text" [(ngModel)]="filterSearch" placeholder="Buscar…" class="flex-1 min-w-[200px]" />
      </div>

      @if (suggestionsApi.isLoading()) {
        <div class="flex justify-center py-8"><p-progressSpinner /></div>
      } @else if (!filteredSuggestions().length && !allSuggestions().length) {
        <div class="text-center py-10 px-4">
          <div class="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
            <i class="pi pi-lightbulb text-2xl text-yellow-300"></i>
          </div>
          <p class="text-sm font-semibold text-gray-200 mb-1">Sin sugerencias todavía</p>
          <p class="text-xs text-gray-500 mb-3">Sé el primero en proponer una mejora</p>
          <p-button label="Proponer idea" icon="pi pi-plus" severity="warn" size="small" (onClick)="openCreateDialog()" />
        </div>
      } @else if (!filteredSuggestions().length) {
        <div class="text-center py-6 text-gray-400">
          <i class="pi pi-inbox text-3xl block mb-2"></i>
          <p class="text-sm">Sin resultados</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          @for (s of filteredSuggestions(); track s.id) {
          <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3 flex gap-3">
            <!-- Vote button -->
            <button type="button"
              class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg border self-start transition-all"
              [class]="s.has_voted
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                : 'bg-neutral-700/40 border-neutral-600/40 text-gray-400 hover:border-amber-400/40'"
              [disabled]="votingId() === s.id"
              (click)="toggleVote(s)">
              <i class="pi pi-thumbs-up text-xs"></i>
              <span class="text-xs font-bold">{{ s.vote_count }}</span>
            </button>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-1">
                <i [class]="'pi ' + deptIcon(s.department) + ' text-xs ' + deptColor(s.department)"></i>
                <span class="text-[10px] uppercase text-gray-500">{{ deptLabel(s.department) }}</span>
                <span class="text-gray-700">·</span>
                <p-tag [value]="statusMeta(s.status).label" [severity]="statusMeta(s.status).severity"
                  [rounded]="true" [style]="{ 'font-size': '0.6rem' }" />
              </div>
              <h4 class="text-sm font-bold text-gray-100 m-0 mb-0.5">{{ s.title }}</h4>
              @if (s.description) {
                <p class="text-xs text-gray-400 m-0 line-clamp-2">{{ s.description }}</p>
              }
              @if (s.admin_response) {
                <div class="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                  <p class="text-[10px] text-emerald-400 font-semibold mb-0.5">Respuesta del equipo:</p>
                  <p class="text-xs text-gray-200 m-0 whitespace-pre-wrap">{{ s.admin_response }}</p>
                </div>
              }
              <p class="text-[10px] text-gray-500 m-0 mt-1">
                {{ s.is_anonymous ? 'Anónimo' : authorName(s.author) }} · {{ s.created_at | date:'dd/MM/yy' }}
              </p>
            </div>
          </div>
          }
        </div>
      }
    </div>

    <!-- Create dialog -->
    <p-dialog [(visible)]="showDialog" [modal]="true" header="Proponer una idea"
      [style]="{ width: isMobile() ? '95vw' : '520px' }" [closable]="!creating()" (onHide)="resetForm()">
      <div class="space-y-3 pt-1">
        <div>
          <label class="text-sm font-semibold text-gray-200 block mb-1">¿A quién va dirigida?</label>
          <p-select [(ngModel)]="form.department" [options]="deptOptions" styleClass="w-full" />
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-200 block mb-1">
            Título <span class="text-red-400">*</span>
          </label>
          <input pInputText [(ngModel)]="form.title" class="w-full" maxlength="200"
            placeholder='Ej: "Sistema para asignar turnos de limpieza"' />
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-200 block mb-1">
            Descripción <span class="text-red-400">*</span>
          </label>
          <p class="text-xs text-gray-500 m-0 mb-1">
            Detalla qué propones, por qué sería útil y qué problema resuelve.
          </p>
          <textarea pTextarea [(ngModel)]="form.description" [rows]="4" maxlength="2000"
            class="w-full resize-none"
            placeholder="Lo que propongo, por qué, beneficio esperado…"></textarea>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" [(ngModel)]="form.is_anonymous" class="w-4 h-4" />
          Enviar como anónimo
        </label>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [disabled]="creating()" (onClick)="showDialog = false" />
        <p-button label="Publicar idea" icon="pi pi-send"
          [loading]="creating()" [disabled]="!formValid()"
          (onClick)="submitNew()" />
      </ng-template>
    </p-dialog>
  `,
})
export class BranchManagerSuggestionsTabComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private deviceService = inject(DeviceService);
  private messageService = inject(MessageService);

  readonly deptOptions = DEPT_OPTIONS;
  readonly statusOptions = [
    { label: 'Nueva',         value: 'new'          },
    { label: 'En revisión',   value: 'under_review' },
    { label: 'Planeada',      value: 'planned'      },
    { label: 'En progreso',   value: 'in_progress'  },
    { label: 'Implementada',  value: 'implemented'  },
    { label: 'Rechazada',     value: 'rejected'     },
  ];
  readonly sortOptions = [
    { label: 'Más votados',   value: 'votes' },
    { label: 'Más recientes', value: 'newest' },
  ];

  isMobile = computed(() => this.deviceService.isMobile());
  showDialog = false;
  creating = signal(false);
  votingId = signal<number | null>(null);

  filterDept   = signal<SuggestionDepartment | null>(null);
  filterStatus = signal<SuggestionStatus | null>(null);
  filterSearch = signal('');
  sortBy       = signal<'votes' | 'newest'>('votes');

  form = {
    department: 'general' as SuggestionDepartment,
    title: '',
    description: '',
    is_anonymous: false,
  };

  formValid = computed(() => this.form.title.trim().length > 2 && this.form.description.trim().length > 5);

  suggestionsApi = httpResource<Suggestion[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/suggestions', {
        company_id: `eq.${companyId}`,
        order: 'vote_count.desc,created_at.desc',
        select: 'id,title,description,department,status,impact,is_anonymous,author_id,vote_count,admin_response,responded_at,created_at,updated_at,' +
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

  myVotedIds = computed(() => new Set((this.votesApi.value() ?? []).map(v => v.suggestion_id)));

  allSuggestions = computed(() => {
    const voted = this.myVotedIds();
    return (this.suggestionsApi.value() ?? []).map(s => ({ ...s, has_voted: voted.has(s.id) }));
  });

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
    if (this.sortBy() === 'votes') {
      list = [...list].sort((a, b) => b.vote_count - a.vote_count || b.created_at.localeCompare(a.created_at));
    } else {
      list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
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
  authorName(e?: { first_name: string; father_name: string } | null) {
    if (!e) return '—';
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim() || '—';
  }

  openCreateDialog() { this.resetForm(); this.showDialog = true; }
  resetForm() { this.form = { department: 'general', title: '', description: '', is_anonymous: false }; }

  async toggleVote(s: Suggestion) {
    const employeeId = this.store.currentEmployee()?.id;
    if (!employeeId) return;
    this.votingId.set(s.id);
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
    } finally {
      this.votingId.set(null);
    }
  }

  async submitNew() {
    if (!this.formValid()) return;
    const employee = this.store.currentEmployee();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!employee || !companyId) return;
    this.creating.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl.build('rest/v1/suggestions'),
          {
            title:        this.form.title.trim(),
            description:  this.form.description.trim(),
            department:   this.form.department,
            is_anonymous: this.form.is_anonymous,
            author_id:    this.form.is_anonymous ? null : employee.id,
            branch_id:    employee.branch_id,
            company_id:   companyId,
            status:       'new',
          },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Publicada', detail: 'Tu idea quedó registrada.' });
      this.showDialog = false;
      this.suggestionsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar.' });
    } finally {
      this.creating.set(false);
    }
  }
}
