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
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { DeviceService } from '../../../../services/device.service';
import { HrStatsGridComponent } from '../../shared/components/hr-stats-grid.component';
import {
  Ticket,
  TicketDepartment,
  TicketPriority,
  DEPARTMENTS,
  DEPARTMENT_LIST,
  CATEGORIES_BY_DEPT,
  STATUS_META,
  PRIORITY_META,
} from '../../../../models/ticket.model';

const PRIORITY_OPTIONS: { label: string; value: TicketPriority; color: string; description: string }[] = [
  { label: 'Baja',    value: 'low',    color: 'text-gray-400',   description: 'No afecta operaciones, puede esperar' },
  { label: 'Media',   value: 'medium', color: 'text-blue-400',   description: 'Afecta parcialmente, necesita atención pronto' },
  { label: 'Alta',    value: 'high',   color: 'text-amber-400',  description: 'Impide trabajar con normalidad' },
  { label: 'Urgente', value: 'urgent', color: 'text-red-400',    description: 'Paraliza operaciones de la sucursal' },
];

@Component({
  selector: 'pt-branch-manager-it-tickets-tab',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    HrStatsGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════ DESKTOP ═══════════ -->
    @if (!isMobile()) {
    <div class="space-y-3">

      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="openCount()"
        [approvedCount]="resolvedCount()"
        [rejectedCount]="cancelledCount()"
        icon="pi-ticket"
        approvedLabel="Resueltos"
      />

      <!-- Banner informativo -->
      <div class="bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-neutral-800/60 rounded-lg border border-indigo-500/20 p-3 flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i class="pi pi-info-circle text-indigo-400 text-sm"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-indigo-300 m-0 mb-0.5">¿Cómo funciona?</p>
          <p class="text-xs text-gray-400 m-0 leading-relaxed">
            Crea tickets para cualquier departamento (IT, Operaciones, Contabilidad, RRHH).
            Cada equipo recibe los suyos y actualiza el estado.
            Puedes cancelar un ticket mientras esté <strong class="text-amber-300">Abierto</strong>.
          </p>
        </div>
        <p-button
          icon="pi pi-plus"
          label="Nuevo Ticket"
          severity="success"
          size="small"
          (onClick)="openCreateDialog()"
          class="flex-shrink-0"
        />
      </div>

      <!-- Filtros -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between cursor-pointer"
             (click)="showFilters.set(!showFilters())">
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-amber-400 text-sm"></i>
            <h3 class="text-sm font-semibold text-white m-0">Filtros</h3>
            @if (hasActiveFilters()) {
              <span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold">
                {{ activeFiltersCount() }} activos
              </span>
            }
          </div>
          <i class="pi text-sm"
             [class.pi-chevron-down]="!showFilters()"
             [class.pi-chevron-up]="showFilters()"></i>
        </div>
        @if (showFilters()) {
        <div class="p-3 space-y-2">
          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-building mr-1 text-amber-400 text-xs"></i>Departamento
              </label>
              <p-select [options]="departmentFilterOptions" [(ngModel)]="filterDepartment"
                placeholder="Todos" [showClear]="true" styleClass="w-full text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-tag mr-1 text-amber-400 text-xs"></i>Estado
              </label>
              <p-select [options]="statusFilterOptions" [(ngModel)]="filterStatus"
                placeholder="Todos" [showClear]="true" styleClass="w-full text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1">
                <i class="pi pi-exclamation-triangle mr-1 text-amber-400 text-xs"></i>Prioridad
              </label>
              <p-select [options]="priorityFilterOptions" [(ngModel)]="filterPriority"
                placeholder="Todas" [showClear]="true" styleClass="w-full text-sm" />
            </div>
            <div class="flex items-end">
              <p-button label="Limpiar" icon="pi pi-filter-slash"
                [outlined]="true" severity="secondary" size="small"
                styleClass="w-full"
                (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Tabla -->
      <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden">
        <div class="p-2 border-b border-neutral-700/50 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
            <i class="pi pi-ticket text-amber-400 text-sm"></i>
            Tickets de Sucursal
          </h3>
          <p-button icon="pi pi-refresh" [text]="true" severity="secondary" size="small"
            [rounded]="true" [loading]="ticketsApi.isLoading()" (onClick)="ticketsApi.reload()"
            pTooltip="Actualizar" tooltipPosition="top" />
        </div>

        @if (ticketsApi.isLoading()) {
          <div class="flex justify-center items-center py-8">
            <p-progressSpinner />
          </div>
        } @else if (allTickets().length === 0) {
          <div class="flex flex-col items-center justify-center py-10 text-center px-6">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 flex items-center justify-center mb-4">
              <i class="pi pi-ticket text-3xl text-indigo-400"></i>
            </div>
            <h4 class="text-base font-semibold text-gray-200 mb-1">Sin tickets registrados</h4>
            <p class="text-gray-500 text-sm mb-4 max-w-sm">
              Reporta cualquier necesidad o problema — IT, Operaciones, Contabilidad o RRHH — y el equipo correspondiente lo atenderá.
            </p>
            <p-button label="Crear primer ticket" icon="pi pi-plus"
              severity="success" (onClick)="openCreateDialog()" />
          </div>
        } @else if (filteredTickets().length === 0) {
          <div class="flex flex-col items-center justify-center py-8 text-center">
            <i class="pi pi-inbox text-4xl text-gray-600 mb-2"></i>
            <h4 class="text-sm font-semibold text-gray-300 mb-1">Sin resultados para los filtros</h4>
            <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
              [outlined]="true" severity="secondary" size="small" (onClick)="clearFilters()" class="mt-1" />
          </div>
        } @else {
          <p-table [value]="filteredTickets()" [paginator]="true" [rows]="8"
            [rowsPerPageOptions]="[5, 8, 15, 25]" paginatorPosition="bottom"
            styleClass="p-datatable-striped p-datatable-sm"
            [tableStyle]="{ 'min-width': '52rem' }">
            <ng-template pTemplate="header">
              <tr>
                <th style="width:50px;text-align:center"><span class="text-xs">#</span></th>
                <th style="text-align:left"><span class="text-xs">Título / Descripción</span></th>
                <th style="width:140px;text-align:center"><span class="text-xs">Depto</span></th>
                <th style="width:140px;text-align:center"><span class="text-xs">Categoría</span></th>
                <th style="width:100px;text-align:center"><span class="text-xs">Prioridad</span></th>
                <th style="width:110px;text-align:center"><span class="text-xs">Estado</span></th>
                <th style="width:110px;text-align:center"><span class="text-xs">Fecha</span></th>
                <th style="width:80px;text-align:center"><span class="text-xs">Acción</span></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-ticket>
              <tr class="hover:bg-neutral-700/30 transition-colors">
                <td style="text-align:center"><span class="text-[10px] text-gray-500 font-mono">{{ fmtTicketId(ticket.id) }}</span></td>
                <td>
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="text-xs font-semibold text-white">{{ ticket.title }}</span>
                    @if (ticket.description) {
                      <span class="text-[10px] text-gray-400 truncate max-w-xs"
                        [pTooltip]="ticket.description" tooltipPosition="top">{{ ticket.description }}</span>
                    }
                  </div>
                </td>
                <td style="text-align:center">
                  <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800/80">
                    <i [class]="'pi ' + deptMeta(ticket.department).icon + ' text-xs ' + deptMeta(ticket.department).color"></i>
                    <span class="text-[10px] text-gray-200">{{ deptShortLabel(ticket.department) }}</span>
                  </div>
                </td>
                <td style="text-align:center">
                  @if (ticket.category && categoryDef(ticket.department, ticket.category); as cat) {
                    <div class="flex items-center justify-center gap-1">
                      <i [class]="'pi ' + cat.icon + ' text-xs text-gray-400'"></i>
                      <span class="text-xs text-gray-300">{{ cat.label }}</span>
                    </div>
                  } @else {
                    <span class="text-gray-600 text-xs">—</span>
                  }
                </td>
                <td style="text-align:center">
                  <p-tag [value]="priorityMeta(ticket.priority).label"
                    [severity]="priorityMeta(ticket.priority).severity"
                    [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
                </td>
                <td style="text-align:center">
                  <p-tag [value]="statusMeta(ticket.status).label"
                    [severity]="statusMeta(ticket.status).severity"
                    [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
                </td>
                <td style="text-align:center">
                  <span class="text-[10px] text-gray-400">{{ ticket.created_at | date:'dd/MM/yyyy' }}</span>
                </td>
                <td style="text-align:center" (click)="$event.stopPropagation()">
                  @if (ticket.status === 'open') {
                    <p-button icon="pi pi-times" [text]="true" severity="danger" size="small"
                      [rounded]="true" pTooltip="Cancelar" tooltipPosition="left"
                      [loading]="cancellingId() === ticket.id"
                      (onClick)="cancelTicket(ticket)" />
                  } @else {
                    <span class="text-gray-600 text-xs">—</span>
                  }
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </div>
    </div>
    }

    <!-- ═══════════ MOBILE ═══════════ -->
    @if (isMobile()) {
    <div class="space-y-3">

      <pt-hr-stats-grid
        [totalCount]="totalCount()"
        [pendingCount]="openCount()"
        [approvedCount]="resolvedCount()"
        [rejectedCount]="cancelledCount()"
        icon="pi-ticket"
        approvedLabel="Resueltos"
      />

      <div class="flex gap-2">
        <p-button icon="pi pi-plus" label="Nuevo Ticket" severity="success"
          styleClass="flex-1" (onClick)="openCreateDialog()" />
        <button type="button" (click)="showFilters.set(!showFilters())"
          class="flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-sm text-gray-300">
          <i class="pi pi-filter text-amber-400"></i>
          @if (hasActiveFilters()) {
            <span class="text-amber-400 text-xs">({{ activeFiltersCount() }})</span>
          }
        </button>
      </div>

      @if (showFilters()) {
      <div class="grid grid-cols-1 gap-2 p-3 bg-neutral-800/80 rounded-lg border border-neutral-700/50">
        <p-select [options]="departmentFilterOptions" [(ngModel)]="filterDepartment"
          placeholder="Departamento" [showClear]="true" styleClass="w-full" />
        <p-select [options]="statusFilterOptions" [(ngModel)]="filterStatus"
          placeholder="Estado" [showClear]="true" styleClass="w-full" />
        <p-select [options]="priorityFilterOptions" [(ngModel)]="filterPriority"
          placeholder="Prioridad" [showClear]="true" styleClass="w-full" />
        <p-button label="Limpiar filtros" icon="pi pi-filter-slash"
          [outlined]="true" severity="secondary" size="small"
          (onClick)="clearFilters()" [disabled]="!hasActiveFilters()" />
      </div>
      }

      @if (ticketsApi.isLoading()) {
        <div class="flex justify-center py-8"><p-progressSpinner /></div>
      } @else if (allTickets().length === 0) {
        <div class="text-center py-10 px-4">
          <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
            <i class="pi pi-ticket text-2xl text-indigo-400"></i>
          </div>
          <p class="text-sm font-semibold text-gray-200 mb-1">Sin tickets registrados</p>
          <p class="text-xs text-gray-500 mb-3">Reporta cualquier necesidad de la sucursal</p>
          <p-button label="Crear primer ticket" icon="pi pi-plus"
            severity="success" size="small" (onClick)="openCreateDialog()" />
        </div>
      } @else if (filteredTickets().length === 0) {
        <div class="text-center py-6 text-gray-400">
          <i class="pi pi-inbox text-3xl block mb-2"></i>
          <p class="text-sm">Sin resultados</p>
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (ticket of filteredTickets(); track ticket.id) {
          <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <i [class]="'pi ' + deptMeta(ticket.department).icon + ' text-xs ' + deptMeta(ticket.department).color"></i>
                  <span class="font-semibold text-white text-sm truncate">{{ ticket.title }}</span>
                </div>
                @if (ticket.description) {
                  <p class="text-xs text-gray-400 m-0 truncate">{{ ticket.description }}</p>
                }
                <p class="text-[10px] text-gray-500 m-0 mt-1">
                  {{ deptShortLabel(ticket.department) }} · {{ ticket.created_at | date:'dd/MM/yyyy' }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <p-tag [value]="statusMeta(ticket.status).label"
                  [severity]="statusMeta(ticket.status).severity"
                  [rounded]="true" [style]="{ 'font-size': '0.7rem' }" />
                <p-tag [value]="priorityMeta(ticket.priority).label"
                  [severity]="priorityMeta(ticket.priority).severity"
                  [rounded]="true" [style]="{ 'font-size': '0.65rem' }" />
              </div>
            </div>
            @if (ticket.status === 'open') {
            <div class="mt-2 pt-2 border-t border-neutral-700/40">
              <p-button icon="pi pi-times" label="Cancelar" [text]="true"
                severity="danger" size="small" styleClass="p-0"
                [loading]="cancellingId() === ticket.id"
                (onClick)="cancelTicket(ticket)" />
            </div>
            }
          </div>
          }
        </div>
      }
    </div>
    }

    <!-- ═══════════ DIALOG: NUEVO TICKET ═══════════ -->
    <p-dialog
      [(visible)]="showDialog"
      header="Crear Ticket"
      [modal]="true"
      [style]="{ width: isMobile() ? '95vw' : '560px' }"
      [closable]="!saving()"
      (onHide)="resetForm()"
    >
      <div class="space-y-4 pt-1">

        <!-- Departamento -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-200">
            ¿A qué departamento va? <span class="text-red-400">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2">
            @for (d of departmentChoices; track d.id) {
            <button type="button"
              class="flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all"
              [class]="form.department === d.id
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-neutral-700/50 bg-neutral-800/60 hover:border-neutral-600'"
              (click)="selectDepartment(d.id)">
              <i [class]="'pi ' + d.icon + ' text-base ' + (form.department === d.id ? 'text-amber-300' : d.color)"></i>
              <span class="text-xs font-semibold"
                [class]="form.department === d.id ? 'text-amber-300' : 'text-gray-200'">{{ d.label }}</span>
            </button>
            }
          </div>
        </div>

        <!-- Título -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold text-gray-200">
            Título <span class="text-red-400">*</span>
          </label>
          <input pInputText [(ngModel)]="form.title"
            placeholder='Resume el problema en una oración'
            maxlength="200" class="w-full" />
        </div>

        <!-- Descripción -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold text-gray-200">
            Descripción <span class="text-red-400">*</span>
          </label>
          <textarea pTextarea [(ngModel)]="form.description"
            placeholder="Detalles: qué pasó, desde cuándo, qué se intentó, a quién afecta…"
            [rows]="4" maxlength="1000" class="w-full resize-none"></textarea>
        </div>

        <!-- Categoría (depende del depto seleccionado) -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-200">
            Categoría <span class="text-red-400">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2">
            @for (cat of currentCategories(); track cat.value) {
            <button type="button"
              class="flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all"
              [class]="form.category === cat.value
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-neutral-700/50 bg-neutral-800/60 hover:border-neutral-600'"
              (click)="form.category = cat.value">
              <i [class]="'pi ' + cat.icon + ' text-sm mt-0.5 ' + (form.category === cat.value ? 'text-amber-400' : 'text-gray-400')"></i>
              <div class="min-w-0">
                <p class="text-xs font-semibold m-0" [class]="form.category === cat.value ? 'text-amber-300' : 'text-gray-200'">
                  {{ cat.label }}
                </p>
                <p class="text-[10px] text-gray-500 m-0 leading-tight">{{ cat.description }}</p>
              </div>
            </button>
            }
          </div>
        </div>

        <!-- Prioridad -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-gray-200">Prioridad</label>
          <div class="grid grid-cols-4 gap-1.5">
            @for (p of priorityOptions; track p.value) {
            <button type="button"
              class="flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all"
              [class]="form.priority === p.value
                ? 'border-amber-400/60 bg-amber-500/10'
                : 'border-neutral-700/50 bg-neutral-800/60 hover:border-neutral-600'"
              [pTooltip]="p.description" tooltipPosition="top"
              (click)="form.priority = p.value">
              <span class="text-xs font-semibold" [class]="form.priority === p.value ? 'text-amber-300' : p.color">
                {{ p.label }}
              </span>
            </button>
            }
          </div>
          <p class="text-[10px] text-gray-500 m-0">
            <i class="pi pi-info-circle mr-1"></i>
            {{ selectedPriorityDescription() }}
          </p>
        </div>

      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary"
          [disabled]="saving()" (onClick)="showDialog = false" />
        <p-button label="Enviar ticket" icon="pi pi-send"
          [loading]="saving()" [disabled]="!formValid()"
          (onClick)="submitTicket()" />
      </ng-template>
    </p-dialog>
  `,
})
export class BranchManagerItTicketsTabComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);
  private store = inject(DashboardStore);
  private deviceService = inject(DeviceService);
  private messageService = inject(MessageService);

  readonly departmentChoices = DEPARTMENT_LIST;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly departmentFilterOptions = DEPARTMENT_LIST.map(d => ({ label: d.label, value: d.id }));
  readonly statusFilterOptions = [
    { label: 'Abierto',    value: 'open'       },
    { label: 'En Proceso', value: 'in_process' },
    { label: 'Resuelto',   value: 'resolved'   },
    { label: 'Cancelado',  value: 'cancelled'  },
  ];
  readonly priorityFilterOptions = PRIORITY_OPTIONS.map(p => ({ label: p.label, value: p.value }));

  isMobile = computed(() => this.deviceService.isMobile());
  showDialog = false;
  showFilters = signal(false);
  saving = signal(false);
  cancellingId = signal<number | null>(null);

  filterDepartment = signal<TicketDepartment | null>(null);
  filterStatus     = signal<string | null>(null);
  filterPriority   = signal<string | null>(null);

  form = {
    department: 'it' as TicketDepartment,
    title: '',
    description: '',
    category: null as string | null,
    priority: 'medium' as TicketPriority,
  };

  currentCategories = computed(() => CATEGORIES_BY_DEPT[this.form.department]);

  formValid = computed(() =>
    this.form.title.trim().length > 0 &&
    this.form.description.trim().length > 0 &&
    this.form.category !== null
  );

  selectedPriorityDescription = computed(() =>
    PRIORITY_OPTIONS.find(p => p.value === this.form.priority)?.description ?? ''
  );

  // Data — todos los tickets del branch del empleado
  ticketsApi = httpResource<Ticket[]>(() => {
    const branchId  = this.store.currentEmployee()?.branch_id;
    const companyId = this.orgService.getCurrentCompanyId();
    if (!branchId || !companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/tickets', {
        branch_id:  `eq.${branchId}`,
        company_id: `eq.${companyId}`,
        order:      'created_at.desc',
        select:     'id,title,description,department,category,priority,status,created_at',
      }),
      method: 'GET',
    };
  });

  allTickets = computed(() => this.ticketsApi.value() ?? []);

  filteredTickets = computed(() => {
    let list = this.allTickets();
    const d = this.filterDepartment();
    const s = this.filterStatus();
    const p = this.filterPriority();
    if (d) list = list.filter(t => t.department === d);
    if (s) list = list.filter(t => t.status     === s);
    if (p) list = list.filter(t => t.priority   === p);
    return list;
  });

  totalCount     = computed(() => this.allTickets().length);
  openCount      = computed(() => this.allTickets().filter(t => t.status === 'open').length);
  resolvedCount  = computed(() => this.allTickets().filter(t => t.status === 'resolved').length);
  cancelledCount = computed(() => this.allTickets().filter(t => t.status === 'cancelled').length);

  hasActiveFilters   = computed(() => !!(this.filterDepartment() || this.filterStatus() || this.filterPriority()));
  activeFiltersCount = computed(() =>
    [this.filterDepartment(), this.filterStatus(), this.filterPriority()].filter(Boolean).length
  );

  // Helpers
  deptMeta(d: string)        { return DEPARTMENTS[d as TicketDepartment] ?? { label: d, icon: 'pi-tag', color: 'text-gray-400' }; }
  deptShortLabel(d: string)  {
    const m = DEPARTMENTS[d as TicketDepartment];
    if (!m) return d;
    return m.id === 'hr' ? 'RRHH' : m.label.split(' /')[0].split(' ')[0];
  }
  statusMeta(s: string)      { return STATUS_META[s as keyof typeof STATUS_META] ?? { label: s, severity: 'secondary' as const, icon: '' }; }
  priorityMeta(p: string)    { return PRIORITY_META[p as keyof typeof PRIORITY_META] ?? { label: p, severity: 'secondary' as const, description: '', color: '' }; }
  fmtTicketId(n: number): string {
    if (n == null) return 'T—';
    const s = String(n).padStart(6, '0');
    return `T${s.slice(0,3)}-${s.slice(3)}`;
  }
  categoryDef(dept: string, cat: string) {
    return CATEGORIES_BY_DEPT[dept as TicketDepartment]?.find(c => c.value === cat) ?? null;
  }

  clearFilters() {
    this.filterDepartment.set(null);
    this.filterStatus.set(null);
    this.filterPriority.set(null);
  }

  selectDepartment(d: TicketDepartment) {
    this.form.department = d;
    this.form.category = null; // reset category cuando cambia el depto
  }

  openCreateDialog() {
    this.resetForm();
    this.showDialog = true;
  }

  resetForm() {
    this.form = { department: 'it', title: '', description: '', category: null, priority: 'medium' };
  }

  async submitTicket() {
    if (!this.formValid()) return;
    const employee  = this.store.currentEmployee();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!employee || !companyId) return;

    this.saving.set(true);
    try {
      const insertResponse = await firstValueFrom(
        this.http.post<Array<{ id: number }>>(
          this.apiUrl.build('rest/v1/tickets'),
          {
            title:        this.form.title.trim(),
            description:  this.form.description.trim(),
            department:   this.form.department,
            category:     this.form.category,
            priority:     this.form.priority,
            status:       'open',
            branch_id:    employee.branch_id,
            company_id:   companyId,
            requester_id: employee.id,
          },
          { headers: { Prefer: 'return=representation', Accept: 'application/json' } }
        )
      );
      const newTicketId = Array.isArray(insertResponse) ? insertResponse[0]?.id : undefined;

      if (this.form.priority === 'urgent') {
        const branchName = this.store.currentBranch()?.name;
        const requesterName = `${employee.first_name ?? ''} ${employee.father_name ?? ''}`.trim();
        this.http.post('/api/notifications/it-ticket-urgent', {
          ticketId:      newTicketId,
          department:    this.form.department,
          title:         this.form.title.trim(),
          description:   this.form.description.trim(),
          category:      this.form.category,
          branchName,
          requesterName,
        }).subscribe({ error: () => void 0 });
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Ticket enviado',
        detail: this.form.priority === 'urgent'
          ? `Ticket URGENTE enviado a ${DEPARTMENTS[this.form.department].label}.`
          : `Ticket enviado a ${DEPARTMENTS[this.form.department].label}.`,
        life: 5000,
      });
      this.showDialog = false;
      this.ticketsApi.reload();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear el ticket. Intenta de nuevo.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async cancelTicket(ticket: Ticket) {
    if (ticket.status !== 'open') return;
    this.cancellingId.set(ticket.id);
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/tickets', { id: `eq.${ticket.id}` }),
          { status: 'cancelled', updated_at: new Date().toISOString() },
          { headers: { Prefer: 'return=minimal' } }
        )
      );
      this.ticketsApi.reload();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cancelar el ticket.' });
    } finally {
      this.cancellingId.set(null);
    }
  }
}
