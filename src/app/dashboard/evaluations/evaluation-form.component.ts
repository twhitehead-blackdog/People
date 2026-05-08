import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';
import {
  EmployeeEvaluation,
  EvaluationResponse,
  EvaluationSection,
  EvaluationType,
  VERDICT_OPTIONS,
} from './evaluations.models';

@Component({
  selector: 'pt-evaluation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Select,
    DatePicker,
    InputText,
    Textarea,
    ToastModule,
    DatePipe,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .rating-option {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 0.6rem 0.4rem; border-radius: 0.5rem;
      background: rgba(38, 38, 38, 0.5);
      border: 1px solid rgba(82, 82, 82, 0.4);
      cursor: pointer; transition: all 0.15s ease;
    }
    .rating-option:hover { background: rgba(64, 64, 64, 0.6); }
    .rating-option.sel { background: rgba(38, 38, 38, 0.95); border-width: 2px; }
    .rating-num { font-size: 1.4rem; font-weight: 700; line-height: 1; }
    .rating-text { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.2rem; }
    .yn-option {
      flex: 1; padding: 0.75rem 1rem; border-radius: 0.5rem;
      border: 1px solid rgba(82, 82, 82, 0.4); cursor: pointer;
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(38, 38, 38, 0.5); transition: all 0.15s;
    }
    .yn-option.sel-yes { background: rgba(45, 106, 79, 0.2); border-color: #2D6A4F; color: #4ade80; }
    .yn-option.sel-no { background: rgba(163, 45, 45, 0.2); border-color: #A32D2D; color: #f87171; }
  `],
  template: `
    <p-toast />
    <div class="space-y-4 p-4 max-w-5xl mx-auto">
      <!-- Header -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="pi pi-star text-amber-400"></i>
              <span>{{ isNew() ? 'Nueva Evaluación' : 'Evaluación de Desempeño' }}</span>
            </div>
            <p-button
              icon="pi pi-arrow-left"
              label="Volver"
              [text]="true"
              size="small"
              (onClick)="back()"
            />
          </div>
        </ng-template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <label class="text-xs text-gray-400 block mb-1">Tipo de evaluación *</label>
            <p-select
              [options]="typeOptions()"
              [(ngModel)]="selectedTypeId"
              optionLabel="label"
              optionValue="value"
              [disabled]="!isNew()"
              placeholder="Seleccionar tipo…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Colaborador *</label>
            <p-select
              [options]="employeeOptions()"
              [(ngModel)]="selectedEmployeeId"
              optionLabel="label"
              optionValue="value"
              [filter]="true"
              filterBy="label"
              [disabled]="!isNew()"
              placeholder="Buscar empleado…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Período evaluado</label>
            <input
              pInputText
              [(ngModel)]="periodLabel"
              placeholder="Ej. Ene – Jun 2026"
              class="w-full"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Fecha de evaluación</label>
            <p-datepicker
              [(ngModel)]="evaluationDate"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Evaluado por</label>
            <input pInputText [(ngModel)]="evaluatorName" placeholder="Nombre del evaluador" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Cargo del evaluador</label>
            <input pInputText [(ngModel)]="evaluatorPosition" placeholder="Ej. Gerente de RRHH" class="w-full" />
          </div>
        </div>
      </p-card>

      @if (currentType(); as type) {
      <!-- Sections -->
      @for (section of (type.sections || []); track section.id) {
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <span class="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2 py-1 rounded">{{ romanNumeral($index + 1) }}</span>
            <span>{{ section.name }}</span>
          </div>
        </ng-template>
        <ng-template #subtitle>{{ section.description }}</ng-template>

        @if (section.question_type === 'rating') {
        <div class="text-xs text-gray-400 mb-3 p-2 rounded bg-neutral-800/40 border border-neutral-700/40">
          <strong>Escala:</strong>
          @for (lbl of type.rating_labels; track $index) {
            <span class="ml-2">
              <span class="font-bold" [style.color]="type.rating_colors[$index]">{{ $index + 1 }}</span> – {{ lbl }}
            </span>
          }
        </div>
        }

        <div class="space-y-3">
          @for (q of (section.questions || []); track q.id) {
          <div class="p-3 rounded-lg bg-neutral-800/40 border border-neutral-700/40">
            <div class="flex gap-3 mb-2">
              <div class="text-2xl flex-shrink-0">{{ q.icon || '•' }}</div>
              <div class="flex-1 min-w-0">
                @if (q.valor_label) {
                  <div class="text-xs text-amber-400 font-semibold mb-0.5">Valor · {{ q.valor_label }}</div>
                }
                <div class="font-semibold text-white">{{ q.name }}</div>
                <div class="text-xs text-gray-400 mt-1">{{ q.description }}</div>
              </div>
            </div>

            @if (section.question_type === 'rating') {
            <div class="flex gap-2 mt-2">
              @for (lbl of type.rating_labels; track $index; let ri = $index) {
                <div
                  class="rating-option"
                  [class.sel]="getResponse(q.id).rating === ri + 1"
                  [style.border-color]="getResponse(q.id).rating === ri + 1 ? type.rating_colors[ri] : ''"
                  (click)="setRating(q.id, ri + 1)"
                >
                  <div class="rating-num" [style.color]="type.rating_colors[ri]">{{ ri + 1 }}</div>
                  <div class="rating-text">{{ lbl }}</div>
                </div>
              }
            </div>
            <textarea
              pInputTextarea
              rows="1"
              placeholder="Comentario opcional…"
              class="w-full mt-2 text-sm"
              [ngModel]="getResponse(q.id).comment || ''"
              (ngModelChange)="setComment(q.id, $event)"
            ></textarea>
            } @else if (section.question_type === 'yes_no') {
            <div class="flex gap-2 mt-2">
              <div
                class="yn-option"
                [class.sel-yes]="getResponse(q.id).yes_no === true"
                (click)="setYesNo(q.id, true)"
              >
                <i class="pi pi-check"></i> Sí — Cumple
              </div>
              <div
                class="yn-option"
                [class.sel-no]="getResponse(q.id).yes_no === false"
                (click)="setYesNo(q.id, false)"
              >
                <i class="pi pi-times"></i> No — No cumple
              </div>
            </div>
            } @else if (section.question_type === 'text') {
            <textarea
              pInputTextarea
              rows="3"
              placeholder="Escribe la respuesta…"
              class="w-full mt-2"
              [ngModel]="getResponse(q.id).text_response || ''"
              (ngModelChange)="setText(q.id, $event)"
            ></textarea>
            }
          </div>
          }
        </div>
      </p-card>
      }

      <!-- Resumen -->
      <p-card>
        <ng-template #title>Resumen</ng-template>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div class="p-3 rounded bg-neutral-800/50">
            <div class="text-2xl font-bold text-amber-300">{{ valuesAvg() ?? '—' }}</div>
            <div class="text-xs text-gray-400 mt-1">Prom. Valores</div>
          </div>
          <div class="p-3 rounded bg-neutral-800/50">
            <div class="text-2xl font-bold text-amber-300">{{ competenciesAvg() ?? '—' }}</div>
            <div class="text-xs text-gray-400 mt-1">Prom. Competencias</div>
          </div>
          <div class="p-3 rounded bg-neutral-800/50">
            <div class="text-2xl font-bold text-amber-300">{{ suitabilityCount() || '—' }}</div>
            <div class="text-xs text-gray-400 mt-1">Aprobados Idoneidad</div>
          </div>
          <div class="p-3 rounded bg-neutral-800/50">
            <div class="text-2xl font-bold text-amber-300">{{ progressDone() }}/{{ totalQuestions() }}</div>
            <div class="text-xs text-gray-400 mt-1">Criterios evaluados</div>
          </div>
        </div>
        <div class="mt-3">
          <div class="flex justify-between text-xs mb-1"><span>Progreso</span><span>{{ progressPct() }}%</span></div>
          <div class="h-2 bg-neutral-800 rounded overflow-hidden">
            <div class="h-full bg-amber-400 transition-all" [style.width.%]="progressPct()"></div>
          </div>
        </div>
      </p-card>

      <!-- Conclusiones -->
      <p-card>
        <ng-template #title>Conclusiones y Plan de Acción</ng-template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-400 block mb-1">Veredicto general</label>
            <p-select
              [options]="verdictOptions"
              [(ngModel)]="verdict"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Próxima revisión</label>
            <p-datepicker
              [(ngModel)]="nextReviewDate"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>

        <div class="mt-4">
          <label class="text-xs text-gray-400 block mb-1">Fortalezas destacadas</label>
          <textarea pInputTextarea [(ngModel)]="strengths" rows="3" placeholder="Áreas donde sobresale…" class="w-full"></textarea>
        </div>
        <div class="mt-3">
          <label class="text-xs text-gray-400 block mb-1">Áreas de mejora y compromisos</label>
          <textarea pInputTextarea [(ngModel)]="areasToImprove" rows="3" placeholder="Aspectos a desarrollar y acciones acordadas…" class="w-full"></textarea>
        </div>
        <div class="mt-3">
          <label class="text-xs text-gray-400 block mb-1">Comentarios del colaborador</label>
          <textarea pInputTextarea [(ngModel)]="employeeComments" rows="3" placeholder="Perspectiva del colaborador sobre la evaluación…" class="w-full"></textarea>
        </div>
      </p-card>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2 justify-end sticky bottom-0 bg-neutral-900/95 backdrop-blur p-3 rounded-lg border border-neutral-700/50">
        <p-button label="Cancelar" icon="pi pi-times" severity="secondary" [outlined]="true" (onClick)="back()" />
        <p-button
          label="Guardar borrador"
          icon="pi pi-save"
          severity="info"
          [outlined]="true"
          [loading]="saving()"
          (onClick)="save('draft')"
        />
        <p-button
          label="Marcar como completada"
          icon="pi pi-check"
          severity="success"
          [loading]="saving()"
          [disabled]="progressPct() < 100"
          (onClick)="save('completed')"
        />
      </div>
      } @else if (loadingType()) {
      <p-card>
        <div class="flex items-center gap-2 text-gray-400 p-4">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando plantilla…</span>
        </div>
      </p-card>
      }
    </div>
  `,
})
export class EvaluationFormComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private message = inject(MessageService);
  private orgService = inject(OrganizationService);
  private dashboardStore = inject(DashboardStore);

  public verdictOptions = VERDICT_OPTIONS;

  public id = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  public isNew = computed(() => this.id() === null);

  // Form state
  public selectedTypeId = signal<string | null>(null);
  public selectedEmployeeId = signal<string | null>(null);
  public periodLabel = signal<string>('');
  public evaluationDate = signal<Date>(new Date());
  public evaluatorName = signal<string>('');
  public evaluatorPosition = signal<string>('');
  public verdict = signal<string | null>(null);
  public nextReviewDate = signal<Date | null>(null);
  public strengths = signal<string>('');
  public areasToImprove = signal<string>('');
  public employeeComments = signal<string>('');
  public responses = signal<Map<string, EvaluationResponse>>(new Map());

  public saving = signal(false);

  // Resources
  public typesResource = httpResource<EvaluationType[]>(() => ({
    url: this.apiUrl.build('rest/v1/evaluation_types', {
      select: 'id,name,description,rating_scale,rating_labels,rating_colors,is_active',
      is_active: 'eq.true',
      order: 'name.asc',
    }),
  }));

  public typeDetailResource = httpResource<EvaluationType[]>(() => {
    const tid = this.selectedTypeId();
    if (!tid) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/evaluation_types', {
        select:
          'id,name,description,rating_scale,rating_labels,rating_colors,sections:evaluation_sections(id,name,description,question_type,sort_order,questions:evaluation_questions(id,name,description,icon,valor_label,sort_order))',
        id: `eq.${tid}`,
      }),
    };
  });

  public existingEvalResource = httpResource<any[]>(() => {
    const id = this.id();
    if (!id) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/employee_evaluations', {
        select:
          'id,employee_id,evaluation_type_id,evaluator_id,evaluator_name,evaluator_position,period_label,evaluation_date,verdict,next_review_date,strengths,areas_to_improve,employee_comments,status,responses:evaluation_responses(id,question_id,rating,yes_no,text_response,comment)',
        id: `eq.${id}`,
      }),
    };
  });

  public loadingType = computed(() => this.typeDetailResource.isLoading());

  public currentType = computed<EvaluationType | null>(() => {
    const arr = this.typeDetailResource.value();
    if (!arr || arr.length === 0) return null;
    const t = arr[0];
    if (t.sections) {
      t.sections = t.sections
        .map((s) => ({
          ...s,
          questions: (s.questions || []).slice().sort((a, b) => a.sort_order - b.sort_order),
        }))
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return t;
  });

  public typeOptions = computed(() =>
    (this.typesResource.value() || []).map((t) => ({ value: t.id, label: t.name }))
  );

  public employeeOptions = computed(() =>
    (this.dashboardStore.employees.entities() as Employee[])
      .filter((e: any) => e.is_active)
      .map((e: any) => ({
        value: e.id,
        label: `${e.first_name} ${e.father_name || ''} (${e.employee_number || '—'})`.trim(),
      }))
  );

  // Compute summaries
  private allRatingResponsesByType(qType: 'rating' | 'yes_no') {
    const sections = this.currentType()?.sections || [];
    const ids = sections
      .filter((s) => s.question_type === qType)
      .flatMap((s) => (s.questions || []).map((q) => q.id));
    return ids
      .map((qid) => this.responses().get(qid))
      .filter((r): r is EvaluationResponse => !!r);
  }

  public valuesAvg = computed(() => {
    const sections = this.currentType()?.sections || [];
    const valSection = sections.find((s) => s.name?.toLowerCase().includes('valor'));
    if (!valSection || valSection.question_type !== 'rating') return null;
    const ids = (valSection.questions || []).map((q) => q.id);
    const ratings = ids.map((id) => this.responses().get(id)?.rating).filter((n): n is number => !!n);
    if (!ratings.length) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  });

  public competenciesAvg = computed(() => {
    const sections = this.currentType()?.sections || [];
    const compSection = sections.find((s) => s.name?.toLowerCase().includes('competencia'));
    if (!compSection || compSection.question_type !== 'rating') return null;
    const ids = (compSection.questions || []).map((q) => q.id);
    const ratings = ids.map((id) => this.responses().get(id)?.rating).filter((n): n is number => !!n);
    if (!ratings.length) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  });

  public suitabilityCount = computed(() => {
    const sections = this.currentType()?.sections || [];
    const idoSection = sections.find((s) => s.question_type === 'yes_no');
    if (!idoSection) return null;
    const ids = (idoSection.questions || []).map((q) => q.id);
    const answered = ids.map((id) => this.responses().get(id)?.yes_no).filter((v) => v !== undefined && v !== null);
    if (!answered.length) return null;
    const yes = answered.filter((v) => v === true).length;
    return `${yes}/${ids.length}`;
  });

  public totalQuestions = computed(() => {
    const sections = this.currentType()?.sections || [];
    return sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  });

  public progressDone = computed(() => {
    const sections = this.currentType()?.sections || [];
    let count = 0;
    for (const s of sections) {
      for (const q of s.questions || []) {
        const r = this.responses().get(q.id);
        if (!r) continue;
        if (s.question_type === 'rating' && r.rating != null) count++;
        else if (s.question_type === 'yes_no' && r.yes_no != null) count++;
        else if (s.question_type === 'text' && r.text_response) count++;
      }
    }
    return count;
  });

  public progressPct = computed(() => {
    const total = this.totalQuestions();
    if (!total) return 0;
    return Math.round((this.progressDone() / total) * 100);
  });

  constructor() {
    // Cuando carga la evaluación existente, hidratar el formulario
    effect(() => {
      const arr = this.existingEvalResource.value();
      if (!arr || arr.length === 0) return;
      const e = arr[0];
      this.selectedTypeId.set(e.evaluation_type_id);
      this.selectedEmployeeId.set(e.employee_id);
      this.periodLabel.set(e.period_label || '');
      this.evaluationDate.set(e.evaluation_date ? new Date(e.evaluation_date) : new Date());
      this.evaluatorName.set(e.evaluator_name || '');
      this.evaluatorPosition.set(e.evaluator_position || '');
      this.verdict.set(e.verdict || null);
      this.nextReviewDate.set(e.next_review_date ? new Date(e.next_review_date) : null);
      this.strengths.set(e.strengths || '');
      this.areasToImprove.set(e.areas_to_improve || '');
      this.employeeComments.set(e.employee_comments || '');
      const map = new Map<string, EvaluationResponse>();
      for (const r of e.responses || []) {
        map.set(r.question_id, r);
      }
      this.responses.set(map);
    });
  }

  public getResponse(questionId: string): EvaluationResponse {
    return this.responses().get(questionId) || { question_id: questionId };
  }

  private updateResponse(questionId: string, patch: Partial<EvaluationResponse>) {
    const map = new Map(this.responses());
    map.set(questionId, { ...this.getResponse(questionId), ...patch });
    this.responses.set(map);
  }

  public setRating(questionId: string, rating: number) {
    this.updateResponse(questionId, { rating });
  }
  public setYesNo(questionId: string, val: boolean) {
    this.updateResponse(questionId, { yes_no: val });
  }
  public setText(questionId: string, val: string) {
    this.updateResponse(questionId, { text_response: val });
  }
  public setComment(questionId: string, val: string) {
    this.updateResponse(questionId, { comment: val });
  }

  public romanNumeral(n: number): string {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n - 1] ?? `${n}`;
  }

  public back() {
    this.router.navigate(['/admin/hr/evaluations']);
  }

  public async save(status: 'draft' | 'completed') {
    if (!this.selectedTypeId() || !this.selectedEmployeeId()) {
      this.message.add({ severity: 'warn', summary: 'Faltan datos', detail: 'Selecciona el tipo y el colaborador' });
      return;
    }
    this.saving.set(true);
    try {
      const companyId = this.orgService.getCurrentCompanyId();
      const currentEmpId = this.dashboardStore.currentEmployee()?.id;
      const payload: Partial<EmployeeEvaluation> = {
        employee_id: this.selectedEmployeeId()!,
        evaluation_type_id: this.selectedTypeId()!,
        evaluator_id: currentEmpId || null,
        evaluator_name: this.evaluatorName(),
        evaluator_position: this.evaluatorPosition(),
        period_label: this.periodLabel(),
        evaluation_date: this.evaluationDate().toISOString().slice(0, 10),
        verdict: this.verdict() || undefined,
        next_review_date: this.nextReviewDate()?.toISOString().slice(0, 10) || null,
        strengths: this.strengths(),
        areas_to_improve: this.areasToImprove(),
        employee_comments: this.employeeComments(),
        status,
        values_avg: this.valuesAvg() != null ? Number(this.valuesAvg()) : undefined,
        competencies_avg: this.competenciesAvg() != null ? Number(this.competenciesAvg()) : undefined,
        suitability_count: this.suitabilityCount() || undefined,
        overall_score: this.computeOverall(),
        company_id: companyId,
      };

      let evalId = this.id();
      if (evalId) {
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_evaluations', { id: `eq.${evalId}` }),
            payload,
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      } else {
        const created = await firstValueFrom(
          this.http.post<EmployeeEvaluation[]>(
            this.apiUrl.build('rest/v1/employee_evaluations'),
            payload,
            { headers: { Prefer: 'return=representation' } }
          )
        );
        evalId = created?.[0]?.id || null;
        if (!evalId) throw new Error('No se obtuvo ID de la evaluación creada');
        this.id.set(evalId);
      }

      // Replace responses
      await firstValueFrom(
        this.http.delete(
          this.apiUrl.build('rest/v1/evaluation_responses', { evaluation_id: `eq.${evalId}` })
        )
      );
      const respPayloads = Array.from(this.responses().values())
        .filter((r) => r.rating != null || r.yes_no != null || r.text_response || r.comment)
        .map((r) => ({
          evaluation_id: evalId,
          question_id: r.question_id,
          rating: r.rating ?? null,
          yes_no: r.yes_no ?? null,
          text_response: r.text_response ?? null,
          comment: r.comment ?? null,
        }));
      if (respPayloads.length > 0) {
        await firstValueFrom(
          this.http.post(
            this.apiUrl.build('rest/v1/evaluation_responses'),
            respPayloads,
            { headers: { Prefer: 'return=minimal' } }
          )
        );
      }

      this.message.add({ severity: 'success', summary: status === 'completed' ? 'Evaluación completada' : 'Borrador guardado' });
      if (status === 'completed') {
        setTimeout(() => this.router.navigate(['/admin/hr/evaluations']), 800);
      }
    } catch (err: any) {
      console.error('Error saving evaluation', err);
      this.message.add({
        severity: 'error',
        summary: 'Error al guardar',
        detail: err?.error?.message || err?.message || 'Intenta de nuevo',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private computeOverall(): number | undefined {
    const v = this.valuesAvg() != null ? Number(this.valuesAvg()) : null;
    const c = this.competenciesAvg() != null ? Number(this.competenciesAvg()) : null;
    if (v != null && c != null) return Number(((v + c) / 2).toFixed(2));
    return v ?? c ?? undefined;
  }
}
