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
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="space-y-4 p-4">
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-star text-amber-400"></i>
            <span>Evaluaciones de Desempeño</span>
          </div>
        </ng-template>
        <ng-template #subtitle>
          Aplica y consulta evaluaciones a colaboradores. Solo RRHH.
        </ng-template>

        <div class="flex flex-wrap gap-3 items-end mt-3">
          <div class="flex-1 min-w-[200px]">
            <label class="text-xs text-gray-400 block mb-1">Buscar empleado</label>
            <input
              pInputText
              type="text"
              [(ngModel)]="searchText"
              placeholder="Nombre…"
              class="w-full"
            />
          </div>
          <div class="min-w-[200px]">
            <label class="text-xs text-gray-400 block mb-1">Tipo</label>
            <p-select
              [options]="typeOptions()"
              [(ngModel)]="typeFilter"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              placeholder="Todos"
              styleClass="w-full"
            />
          </div>
          <div class="min-w-[160px]">
            <label class="text-xs text-gray-400 block mb-1">Status</label>
            <p-select
              [options]="statusOptions"
              [(ngModel)]="statusFilter"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              placeholder="Todos"
              styleClass="w-full"
            />
          </div>
          <p-button
            label="Nueva evaluación"
            icon="pi pi-plus"
            (onClick)="openNew()"
          />
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
        <div class="overflow-x-auto">
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
                <td class="py-2 px-2 text-gray-400">{{ e.evaluator_name || '—' }}</td>
                <td class="py-2 px-2">
                  @if (e.overall_score != null) {
                    <span class="font-semibold" [style.color]="scoreColor(e.overall_score)">
                      {{ e.overall_score | number:'1.1-1' }}
                    </span>
                  } @else { <span class="text-gray-500">—</span> }
                </td>
                <td class="py-2 px-2">
                  <p-tag
                    [value]="statusLabel(e.status)"
                    [severity]="statusSeverity(e.status)"
                  />
                </td>
                <td class="py-2 px-2 text-right" (click)="$event.stopPropagation()">
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
        'id,employee_id,evaluation_type_id,evaluator_name,period_label,evaluation_date,status,overall_score,values_avg,competencies_avg,suitability_count,employee:employees!employee_evaluations_employee_id_fkey(id,first_name,father_name,branch:branches(id,name)),evaluation_type:evaluation_types!employee_evaluations_evaluation_type_id_fkey(id,name)',
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

  public scoreColor(score: number): string {
    if (score <= 1.5) return '#2D6A4F';
    if (score <= 2.5) return '#C8860A';
    if (score <= 3.5) return '#E08C00';
    return '#A32D2D';
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
