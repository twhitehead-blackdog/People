import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../services/api-url.service';
import { DashboardStore } from '../../stores/dashboard.store';
import { EmployeeEvaluation, EvaluationType } from './evaluations.models';

@Component({
  selector: 'pt-evaluations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Select,
    InputText,
    Tag,
    ToastModule,
    ConfirmDialog,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .header-actions { display: flex; align-items: center; gap: 0.5rem; }
    .filters-row { display: flex; gap: 0.5rem; align-items: end; flex-wrap: wrap; }
    .filters-row > * { flex: 1; min-width: 140px; }
    @media (max-width: 768px) {
      .desktop-table, .desktop-only { display: none !important; }
      .mobile-cards { display: block; }
      :host ::ng-deep .p-card-subtitle { display: none; }
      .filters-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      .filters-row > * { flex: none; min-width: 0; }
      .search-row { width: 100%; }
      :host ::ng-deep .new-btn-mobile { flex-shrink: 0; }
      :host ::ng-deep .new-btn-mobile .p-button {
        background: #f59e0b !important; color: #000 !important;
        border-color: #f59e0b !important;
        width: 2.5rem; height: 2.5rem; padding: 0;
      }
    }
    @media (min-width: 769px) {
      .desktop-table { display: block; }
      .mobile-cards { display: none; }
      :host ::ng-deep .new-btn-mobile { display: none !important; }
    }
    .eval-card {
      background: rgba(38, 38, 38, 0.4); border: 1px solid #262626;
      border-radius: 0.6rem; padding: 0.85rem; margin-bottom: 0.6rem;
      cursor: pointer; transition: all 0.15s;
    }
    .eval-card:hover { background: rgba(64, 64, 64, 0.4); }
    .eval-card-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    .eval-card-name { font-weight: 600; color: white; font-size: 0.95rem; line-height: 1.2; }
    .eval-card-type { font-size: 0.7rem; color: #f59e0b; margin-top: 0.15rem; }
    .eval-card-meta { display: flex; flex-wrap: wrap; gap: 0.5rem 0.85rem; margin-top: 0.5rem; font-size: 0.7rem; color: #a3a3a3; }
    .eval-card-meta i { margin-right: 0.2rem; }
    .eval-card-score {
      font-size: 1.4rem; font-weight: 800; line-height: 1;
      flex-shrink: 0; min-width: 2.5rem; text-align: right;
    }
    .score-chip {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
  `],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-4 p-4">
      <p-card>
        <ng-template #title>
          <div class="header-actions">
            <i class="pi pi-star text-amber-400"></i>
            <span class="flex-1">Evaluaciones</span>
            <p-button
              icon="pi pi-plus"
              [rounded]="true"
              size="small"
              (onClick)="openNew()"
              styleClass="new-btn-mobile"
              pTooltip="Nueva evaluación"
            />
          </div>
        </ng-template>
        <ng-template #subtitle>
          Aplica y consulta evaluaciones a colaboradores. Solo RRHH.
        </ng-template>

        <div class="space-y-2 mt-3">
          <div class="search-row">
            <input
              pInputText
              type="text"
              [(ngModel)]="searchText"
              placeholder="Buscar empleado por nombre…"
              class="w-full"
            />
          </div>
          <div class="filters-row">
            <p-select
              [options]="typeOptions()"
              [(ngModel)]="typeFilter"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              placeholder="Tipo"
              styleClass="w-full"
            />
            <p-select
              [options]="statusOptions"
              [(ngModel)]="statusFilter"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              placeholder="Status"
              styleClass="w-full"
            />
          </div>
          <div class="desktop-only">
            <p-button
              label="Nueva evaluación"
              icon="pi pi-plus"
              (onClick)="openNew()"
            />
          </div>
        </div>
      </p-card>

      <p-card>
        @if (loading()) {
        <div class="flex items-center gap-2 text-gray-400 p-4">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando…</span>
        </div>
        } @else if (filtered().length === 0) {
        <div class="text-gray-400 text-center py-12">
          <i class="pi pi-inbox text-4xl block mb-2"></i>
          <p>No hay evaluaciones registradas. Click "Nueva evaluación" para empezar.</p>
        </div>
        } @else {
        <!-- Desktop: tabla -->
        <div class="desktop-table overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-700 text-left text-gray-400">
                <th class="py-2 px-2">Empleado</th>
                <th class="py-2 px-2">Tipo</th>
                <th class="py-2 px-2">Período</th>
                <th class="py-2 px-2">Fecha</th>
                <th class="py-2 px-2">Evaluador</th>
                <th class="py-2 px-2">Score</th>
                <th class="py-2 px-2">Status</th>
                <th class="py-2 px-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              @for (e of filtered(); track e.id) {
              <tr class="border-b border-neutral-800 hover:bg-neutral-800/30 cursor-pointer" (click)="open(e.id)">
                <td class="py-2 px-2 font-medium">
                  {{ e.employee?.first_name }} {{ e.employee?.father_name }}
                </td>
                <td class="py-2 px-2 text-gray-300">{{ e.evaluation_type?.name }}</td>
                <td class="py-2 px-2 text-gray-400">{{ e.period_label || '—' }}</td>
                <td class="py-2 px-2 text-gray-400">{{ e.evaluation_date | date:'dd/MM/yyyy' }}</td>
                <td class="py-2 px-2 text-gray-400">{{ evaluatorName(e) }}</td>
                <td class="py-2 px-2">
                  @if (e.overall_score != null) {
                    @let r = scoreRating(e);
                    <span
                      class="score-chip"
                      [style.background]="r.color + '22'"
                      [style.border]="'1px solid ' + r.color"
                      [style.color]="r.color"
                    >
                      {{ r.label }}
                    </span>
                    <span class="text-gray-400 text-xs ml-2">{{ e.overall_score | number:'1.1-1' }}</span>
                  } @else { <span class="text-gray-500">—</span> }
                </td>
                <td class="py-2 px-2">
                  <div class="inline-flex items-center gap-1">
                    <p-tag
                      [value]="statusLabel(e.status)"
                      [severity]="statusSeverity(e.status)"
                    />
                    @if (e.status === 'completed') {
                      <i class="pi pi-lock text-amber-400 text-xs"
                         pTooltip="Completada — solo lectura"
                         tooltipPosition="top"></i>
                    } @else if (e.status === 'draft') {
                      <i class="pi pi-lock-open text-blue-300 text-xs"
                         pTooltip="Borrador — editable"
                         tooltipPosition="top"></i>
                    }
                  </div>
                </td>
                <td class="py-2 px-2 text-right" (click)="$event.stopPropagation()">
                  @if (e.status === 'completed' && canRevertToDraft()) {
                    <p-button
                      icon="pi pi-lock-open"
                      severity="warn"
                      [text]="true"
                      [rounded]="true"
                      size="small"
                      (onClick)="confirmRevertToDraft(e)"
                      pTooltip="Volver a borrador"
                    />
                  }
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (onClick)="confirmDelete(e)"
                    pTooltip="Eliminar"
                  />
                </td>
              </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile: cards -->
        <div class="mobile-cards">
          @for (e of filtered(); track e.id) {
          <div class="eval-card" (click)="open(e.id)">
            <div class="eval-card-row">
              <div class="flex-1 min-w-0">
                <div class="eval-card-name">{{ e.employee?.first_name }} {{ e.employee?.father_name }}</div>
                <div class="eval-card-type">{{ e.evaluation_type?.name }}</div>
              </div>
              @if (e.overall_score != null) {
                @let r = scoreRating(e);
                <div class="flex items-center gap-2">
                  <span
                    class="score-chip"
                    [style.background]="r.color + '22'"
                    [style.border]="'1px solid ' + r.color"
                    [style.color]="r.color"
                  >
                    {{ r.label }}
                  </span>
                  <span class="text-gray-400 text-xs">{{ e.overall_score | number:'1.1-1' }}</span>
                </div>
              }
            </div>
            <div class="eval-card-meta">
              <span><i class="pi pi-calendar"></i>{{ e.evaluation_date | date:'dd/MM/yyyy' }}</span>
              @let evName = evaluatorName(e);
              @if (evName !== '—') { <span><i class="pi pi-user"></i>{{ evName }}</span> }
              @if (e.period_label) { <span><i class="pi pi-clock"></i>{{ e.period_label }}</span> }
            </div>
            <div class="flex items-center justify-between mt-2">
              <div class="inline-flex items-center gap-1">
                <p-tag [value]="statusLabel(e.status)" [severity]="statusSeverity(e.status)" />
                @if (e.status === 'completed') {
                  <i class="pi pi-lock text-amber-400 text-xs"></i>
                } @else if (e.status === 'draft') {
                  <i class="pi pi-lock-open text-blue-300 text-xs"></i>
                }
                @if (e.status === 'completed' && canRevertToDraft()) {
                  <p-button
                    icon="pi pi-lock-open"
                    severity="warn"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (onClick)="confirmRevertToDraft(e); $event.stopPropagation()"
                    pTooltip="Volver a borrador"
                  />
                }
              </div>
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                [rounded]="true"
                size="small"
                (onClick)="$event.stopPropagation(); confirmDelete(e)"
              />
            </div>
          </div>
          }
        </div>
        }
      </p-card>
    </div>
  `,
})
export class EvaluationsListComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private router = inject(Router);
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private dashboardStore = inject(DashboardStore);

  public canRevertToDraft = computed(() => {
    if (this.dashboardStore.isAdmin()) return true;
    const emp = this.dashboardStore.currentEmployee();
    const dept = (emp?.department?.name || '').toLowerCase();
    return dept.includes('humano') || dept.includes('recursos');
  });

  public confirmRevertToDraft(e: EmployeeEvaluation) {
    if (!this.canRevertToDraft()) return;
    this.confirmation.confirm({
      header: 'Volver a borrador',
      message: 'Esta evaluación se podrá editar de nuevo. ¿Continuar?',
      icon: 'pi pi-lock-open',
      acceptLabel: 'Sí, volver a borrador',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-warning',
      accept: async () => {
        try {
          await firstValueFrom(
            this.http.patch(
              this.apiUrl.build('rest/v1/employee_evaluations', { id: `eq.${e.id}` }),
              { status: 'draft' },
              { headers: { Prefer: 'return=minimal' } }
            )
          );
          this.message.add({
            severity: 'success',
            summary: 'Volvió a borrador',
            life: 3000,
          });
          this.evaluationsResource.reload();
        } catch (err) {
          console.error(err);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cambiar el estado.',
            life: 4000,
          });
        }
      },
    });
  }

  public searchText = signal('');
  public typeFilter = signal<string | null>(null);
  public statusFilter = signal<string | null>(null);

  public statusOptions = [
    { value: 'draft', label: 'Borrador' },
    { value: 'completed', label: 'Completada' },
    { value: 'archived', label: 'Archivada' },
  ];

  public typesResource = httpResource<EvaluationType[]>(() => ({
    url: this.apiUrl.build('rest/v1/evaluation_types', {
      select: 'id,name,is_active',
      is_active: 'eq.true',
      order: 'name.asc',
    }),
  }));

  public evaluationsResource = httpResource<EmployeeEvaluation[]>(() => ({
    url: this.apiUrl.build('rest/v1/employee_evaluations', {
      select:
        'id,employee_id,evaluator_id,evaluation_type_id,evaluator_name,period_label,evaluation_date,status,overall_score,values_avg,competencies_avg,suitability_count,employee:employees!employee_evaluations_employee_id_fkey(id,first_name,father_name,branch:branches(id,name)),evaluator:employees!employee_evaluations_evaluator_id_fkey(id,first_name,father_name),evaluation_type:evaluation_types!employee_evaluations_evaluation_type_id_fkey(id,name,rating_scale,rating_labels,rating_colors)',
      order: 'evaluation_date.desc',
    }),
  }));

  public loading = computed(() => this.evaluationsResource.isLoading());

  public typeOptions = computed(() =>
    (this.typesResource.value() || []).map((t) => ({ value: t.id, label: t.name }))
  );

  public filtered = computed(() => {
    const all = this.evaluationsResource.value() || [];
    const q = this.searchText().trim().toLowerCase();
    const t = this.typeFilter();
    const s = this.statusFilter();
    return all.filter((e) => {
      if (s && e.status !== s) return false;
      if (t && e.evaluation_type_id !== t) return false;
      if (q) {
        const name = `${e.employee?.first_name ?? ''} ${e.employee?.father_name ?? ''}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  });

  public openNew() {
    this.router.navigate(['/admin/hr/evaluations/new']);
  }

  public open(id: string) {
    this.router.navigate(['/admin/hr/evaluations', id]);
  }

  public statusLabel(s: string) {
    return s === 'draft' ? 'Borrador' : s === 'completed' ? 'Completada' : 'Archivada';
  }
  public statusSeverity(s: string): 'info' | 'success' | 'secondary' {
    return s === 'completed' ? 'success' : s === 'draft' ? 'info' : 'secondary';
  }

  public evaluatorName(e: EmployeeEvaluation): string {
    if (e.evaluator_name && e.evaluator_name.trim()) return e.evaluator_name;
    const ev = e.evaluator;
    if (ev) {
      const full = `${ev.first_name ?? ''} ${ev.father_name ?? ''}`.trim();
      if (full) return full;
    }
    return '—';
  }

  public scoreRating(e: EmployeeEvaluation): { label: string; color: string } {
    const score = e.overall_score;
    if (score == null) return { label: '—', color: '#737373' };
    const t = e.evaluation_type;
    const labels = t?.rating_labels?.length ? t.rating_labels : ['No cumple', 'Debe mejorar', 'Cumple', 'Excede'];
    const colors = t?.rating_colors?.length ? t.rating_colors : ['#A32D2D', '#E08C00', '#C8860A', '#2D6A4F'];
    const idx = Math.min(Math.max(Math.floor(score) - 1, 0), labels.length - 1);
    return { label: labels[idx], color: colors[idx] || '#a3a3a3' };
  }

  public confirmDelete(e: EmployeeEvaluation) {
    this.confirmation.confirm({
      message: `¿Eliminar la evaluación de ${e.employee?.first_name} ${e.employee?.father_name}? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await firstValueFrom(
            this.http.delete(
              this.apiUrl.build('rest/v1/employee_evaluations', { id: `eq.${e.id}` })
            )
          );
          this.message.add({ severity: 'success', summary: 'Eliminada' });
          this.evaluationsResource.reload();
        } catch (err: any) {
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'No se pudo eliminar',
          });
        }
      },
    });
  }
}
