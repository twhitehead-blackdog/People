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
    :host { display: block; }
    .doc-page { max-width: 920px; margin: 0 auto; padding: 1.5rem; color: #e5e5e5; }
    .doc-header {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 1rem; padding: 2rem; margin-bottom: 1rem;
      text-align: center; position: relative; overflow: hidden;
    }
    .doc-header::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #2D6A4F, #C8860A, #E08C00, #A32D2D);
    }
    .doc-brand { font-size: 0.7rem; letter-spacing: 0.3rem; color: #f59e0b; font-weight: 700; margin-bottom: 0.5rem; }
    .doc-title { font-size: 1.6rem; font-weight: 700; color: white; margin-bottom: 0.3rem; }
    .doc-subtitle { font-size: 1.1rem; color: #d4d4d4; margin-bottom: 0.5rem; }
    .doc-confidential { font-size: 0.7rem; color: #737373; letter-spacing: 0.1rem; text-transform: uppercase; }
    .doc-section {
      background: #171717; border: 1px solid #262626; border-radius: 0.75rem;
      padding: 1.5rem; margin-bottom: 1rem;
    }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .info-field label {
      display: block; font-size: 0.7rem; color: #737373; text-transform: uppercase;
      letter-spacing: 0.05rem; margin-bottom: 0.3rem; font-weight: 600;
    }
    .info-field input, .info-field .p-select, .info-field .p-datepicker {
      width: 100%; background: #0a0a0a; border: 1px solid #262626; color: white;
    }
    .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #262626; }
    .section-roman {
      width: 2rem; height: 2rem; border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #000; font-weight: 800; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .section-title { font-size: 1.1rem; font-weight: 700; color: white; }
    .section-desc { font-size: 0.8rem; color: #a3a3a3; margin-top: 0.2rem; }
    .scale-legend {
      background: rgba(38, 38, 38, 0.4); border: 1px solid #262626;
      padding: 0.6rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem;
      margin-bottom: 0.85rem; color: #a3a3a3;
    }
    .scale-legend strong { color: white; }
    .question-card {
      background: rgba(23, 23, 23, 0.6); border: 1px solid #262626;
      border-radius: 0.6rem; padding: 1rem; margin-bottom: 0.75rem;
    }
    .question-card:hover { border-color: #404040; }
    .question-head { display: flex; gap: 0.85rem; margin-bottom: 0.75rem; }
    .question-icon { font-size: 1.6rem; flex-shrink: 0; line-height: 1; }
    .valor-badge {
      display: inline-block; font-size: 0.65rem; color: #fbbf24;
      background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 0.1rem 0.5rem; border-radius: 0.25rem; margin-bottom: 0.3rem;
      font-weight: 600;
    }
    .question-name { font-weight: 600; color: white; font-size: 0.95rem; }
    .question-desc { font-size: 0.78rem; color: #a3a3a3; margin-top: 0.25rem; line-height: 1.5; }
    .rating-row { display: flex; gap: 0.5rem; }
    .rating-option {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 0.65rem 0.4rem; border-radius: 0.5rem;
      background: rgba(38, 38, 38, 0.5);
      border: 1px solid rgba(82, 82, 82, 0.4);
      cursor: pointer; transition: all 0.15s ease;
    }
    .rating-option:hover { background: rgba(64, 64, 64, 0.6); transform: translateY(-1px); }
    .rating-option.sel { background: rgba(15, 15, 15, 0.95); border-width: 2px; }
    .rating-num { font-size: 1.4rem; font-weight: 800; line-height: 1; }
    .rating-text { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.2rem; }
    .comment-input {
      width: 100%; margin-top: 0.6rem; padding: 0.5rem 0.75rem;
      background: rgba(10, 10, 10, 0.6); border: 1px solid #262626;
      border-radius: 0.4rem; color: white; font-size: 0.85rem; resize: vertical; min-height: 2rem;
    }
    .yn-row { display: flex; gap: 0.6rem; margin-top: 0.5rem; }
    .yn-option {
      flex: 1; padding: 0.85rem 1rem; border-radius: 0.5rem;
      border: 1px solid rgba(82, 82, 82, 0.4); cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      background: rgba(38, 38, 38, 0.5); transition: all 0.15s;
      font-weight: 600; font-size: 0.9rem;
    }
    .yn-option:hover { background: rgba(64, 64, 64, 0.6); }
    .yn-option.sel-yes { background: rgba(45, 106, 79, 0.25); border-color: #2D6A4F; color: #4ade80; }
    .yn-option.sel-no { background: rgba(163, 45, 45, 0.25); border-color: #A32D2D; color: #f87171; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; }
    .summary-cell {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
      border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 0.6rem;
      padding: 1rem; text-align: center;
    }
    .summary-value { font-size: 1.8rem; font-weight: 800; color: #fbbf24; line-height: 1; }
    .summary-label { font-size: 0.7rem; color: #a3a3a3; margin-top: 0.4rem; text-transform: uppercase; letter-spacing: 0.05rem; }
    .progress-bar-bg { height: 0.5rem; background: #262626; border-radius: 1rem; overflow: hidden; margin-top: 0.5rem; }
    .progress-bar-fill {
      height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706);
      transition: width 0.3s ease;
    }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; }
    .signature-box {
      border-top: 1px solid #525252; padding-top: 0.6rem; text-align: center;
      font-size: 0.75rem; color: #a3a3a3;
    }
    .signature-box input { background: transparent; border: none; color: white; text-align: center; width: 100%; padding: 0.3rem; font-size: 0.85rem; }
    .doc-footer {
      text-align: center; font-size: 0.7rem; color: #525252;
      letter-spacing: 0.1rem; margin-top: 1.5rem; padding-top: 1rem;
      border-top: 1px solid #262626; text-transform: uppercase;
    }
    .conclusion-field { margin-top: 0.85rem; }
    .conclusion-field label { display: block; font-size: 0.8rem; color: #d4d4d4; margin-bottom: 0.3rem; font-weight: 600; }
    .conclusion-field textarea {
      width: 100%; background: rgba(10, 10, 10, 0.6); border: 1px solid #262626;
      border-radius: 0.4rem; padding: 0.6rem 0.75rem; color: white; font-size: 0.85rem;
      min-height: 4rem; resize: vertical;
    }
    .actions-bar {
      position: sticky; bottom: 0; z-index: 10;
      background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(8px);
      padding: 0.85rem; border-radius: 0.75rem; border: 1px solid #262626;
      display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;
      margin-top: 1rem;
    }
  `],
  template: `
    <p-toast />
    <div class="doc-page">
      <div class="flex items-center justify-between mb-3">
        <p-button icon="pi pi-arrow-left" label="Volver" [text]="true" size="small" (onClick)="back()" />
        <div class="text-xs text-gray-500">{{ isNew() ? 'Nueva evaluación' : 'Editar evaluación' }}</div>
      </div>

      <!-- Document Header (BlackDog branded) -->
      <div class="doc-header">
        <div class="doc-brand">BLACKDOG</div>
        <div class="doc-title">Evaluación de Desempeño</div>
        <div class="doc-subtitle">{{ currentType()?.name || 'Selecciona el tipo' }}</div>
        <div class="doc-confidential">Evaluación confidencial · Uso interno</div>
      </div>

      <!-- Type & Employee selectors (only when new) -->
      @if (isNew()) {
      <div class="doc-section">
        <div class="info-grid">
          <div class="info-field">
            <label>Tipo de evaluación *</label>
            <p-select
              [options]="typeOptions()"
              [(ngModel)]="selectedTypeId"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar tipo…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="info-field">
            <label>Colaborador *</label>
            <p-select
              [options]="employeeOptions()"
              [(ngModel)]="selectedEmployeeId"
              optionLabel="label"
              optionValue="value"
              [filter]="true"
              filterBy="label"
              placeholder="Buscar empleado…"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </div>
      </div>
      }

      <!-- Header Info -->
      @if (currentType()) {
      <div class="doc-section">
        <div class="info-grid">
          <div class="info-field">
            <label>Nombre del colaborador</label>
            <input pInputText readonly [value]="selectedEmployeeName()" placeholder="Selecciona empleado" class="w-full" />
          </div>
          <div class="info-field">
            <label>Tienda / Sede</label>
            <input pInputText readonly [value]="selectedEmployeeBranch()" placeholder="—" class="w-full" />
          </div>
          <div class="info-field">
            <label>Período evaluado</label>
            <input pInputText [(ngModel)]="periodLabel" placeholder="Ej. Ene – Jun 2026" class="w-full" />
          </div>
          <div class="info-field">
            <label>Fecha de evaluación</label>
            <p-datepicker [(ngModel)]="evaluationDate" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
          <div class="info-field">
            <label>Evaluado por *</label>
            <p-select
              [options]="evaluatorOptions()"
              [(ngModel)]="selectedEvaluatorId"
              (onChange)="onEvaluatorChange($event)"
              optionLabel="name"
              optionValue="value"
              [filter]="true"
              filterBy="name"
              placeholder="Seleccionar evaluador (Administración)"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div class="info-field">
            <label>Cargo del evaluador</label>
            <input pInputText readonly [value]="evaluatorPosition()" placeholder="Se llena automáticamente" class="w-full" />
          </div>
        </div>
      </div>

      <!-- Sections -->
      @for (section of (currentType()!.sections || []); track section.id; let secIdx = $index) {
      <div class="doc-section">
        <div class="section-header">
          <div class="section-roman">{{ romanNumeral(secIdx + 1) }}</div>
          <div>
            <div class="section-title">{{ section.name }}</div>
            @if (section.description) {
            <div class="section-desc">{{ section.description }}</div>
            }
          </div>
        </div>

        @if (section.question_type === 'rating' && currentType()) {
        <div class="scale-legend">
          <strong>Escala de desempeño:</strong>
          @for (lbl of currentType()!.rating_labels; track $index) {
            <span class="ml-2">
              <span class="font-bold" [style.color]="currentType()!.rating_colors[$index]">{{ $index + 1 }}</span> – {{ lbl }}
            </span>
          }
        </div>
        } @else if (section.question_type === 'yes_no') {
        <div class="scale-legend"><strong>Sí / No</strong></div>
        }

        @for (q of (section.questions || []); track q.id) {
        <div class="question-card">
          <div class="question-head">
            <div class="question-icon">{{ q.icon || '•' }}</div>
            <div class="flex-1 min-w-0">
              @if (q.valor_label) {
                <div class="valor-badge">Valor · {{ q.valor_label }}</div>
              }
              <div class="question-name">{{ q.name }}</div>
              <div class="question-desc">{{ q.description }}</div>
            </div>
          </div>

          @if (section.question_type === 'rating' && currentType()) {
          <div class="rating-row">
            @for (lbl of currentType()!.rating_labels; track $index; let ri = $index) {
              <div
                class="rating-option"
                [class.sel]="getResponse(q.id).rating === ri + 1"
                [style.border-color]="getResponse(q.id).rating === ri + 1 ? currentType()!.rating_colors[ri] : ''"
                (click)="setRating(q.id, ri + 1)"
              >
                <div class="rating-num" [style.color]="currentType()!.rating_colors[ri]">{{ ri + 1 }}</div>
                <div class="rating-text">{{ lbl }}</div>
              </div>
            }
          </div>
          <textarea
            class="comment-input"
            rows="1"
            placeholder="Comentarios opcionales…"
            [ngModel]="getResponse(q.id).comment || ''"
            (ngModelChange)="setComment(q.id, $event)"
          ></textarea>
          } @else if (section.question_type === 'yes_no') {
          <div class="yn-row">
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
            class="comment-input"
            rows="3"
            placeholder="Escribe la respuesta…"
            [ngModel]="getResponse(q.id).text_response || ''"
            (ngModelChange)="setText(q.id, $event)"
          ></textarea>
          }
        </div>
        }
      </div>
      }

      <!-- Resumen -->
      <div class="doc-section">
        <div class="section-header">
          <div class="section-title" style="margin-left: 0;">Resumen de Evaluación</div>
        </div>
        <div class="summary-grid">
          <div class="summary-cell">
            <div class="summary-value">{{ valuesAvg() ?? '—' }}</div>
            <div class="summary-label">Prom. Valores</div>
          </div>
          <div class="summary-cell">
            <div class="summary-value">{{ competenciesAvg() ?? '—' }}</div>
            <div class="summary-label">Prom. Competencias</div>
          </div>
          <div class="summary-cell">
            <div class="summary-value">{{ suitabilityCount() || '—' }}</div>
            <div class="summary-label">Aprobados P.III</div>
          </div>
          <div class="summary-cell">
            <div class="summary-value">{{ progressDone() }}/{{ totalQuestions() }}</div>
            <div class="summary-label">Criterios evaluados</div>
          </div>
        </div>
        <div class="mt-3">
          <div class="flex justify-between text-xs mb-1 text-gray-400">
            <span>Progreso</span><span>{{ progressPct() }}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" [style.width.%]="progressPct()"></div>
          </div>
        </div>
      </div>

      <!-- Conclusiones -->
      <div class="doc-section">
        <div class="section-header">
          <div class="section-roman">IV</div>
          <div>
            <div class="section-title">Conclusiones y Plan de Acción</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-field">
            <label>Veredicto general</label>
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
          <div class="info-field">
            <label>Próxima revisión</label>
            <p-datepicker [(ngModel)]="nextReviewDate" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
        </div>

        <div class="conclusion-field">
          <label>Fortalezas destacadas</label>
          <textarea [(ngModel)]="strengths" rows="3" placeholder="Describe las áreas donde el colaborador sobresale…"></textarea>
        </div>
        <div class="conclusion-field">
          <label>Áreas de mejora y compromisos</label>
          <textarea [(ngModel)]="areasToImprove" rows="3" placeholder="Detalla los aspectos a desarrollar y las acciones concretas acordadas…"></textarea>
        </div>
        <div class="conclusion-field">
          <label>Comentarios del colaborador</label>
          <textarea [(ngModel)]="employeeComments" rows="3" placeholder="Espacio para que el colaborador exprese su perspectiva sobre la evaluación…"></textarea>
        </div>
      </div>

      <!-- Firmas -->
      <div class="doc-section">
        <div class="signature-grid">
          <div>
            <input pInputText [(ngModel)]="evaluatorSignature" placeholder="Nombre y firma" />
            <div class="signature-box">Firma del evaluador</div>
          </div>
          <div>
            <input pInputText [(ngModel)]="employeeSignature" placeholder="Nombre y firma" />
            <div class="signature-box">Firma del colaborador</div>
          </div>
        </div>
      </div>

      <div class="doc-footer">Documento confidencial · BlackDog Panamá</div>

      <div class="actions-bar">
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
        @if (!isNew()) {
        <p-button
          label="Generar resumen"
          icon="pi pi-external-link"
          severity="warn"
          [outlined]="true"
          (onClick)="generateSummary()"
        />
        }
      </div>
      } @else if (loadingType()) {
      <div class="doc-section">
        <div class="flex items-center gap-2 text-gray-400 p-4">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando plantilla…</span>
        </div>
      </div>
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
  public evaluatorSignature = signal<string>('');
  public employeeSignature = signal<string>('');
  public selectedEvaluatorId = signal<string | null>(null);
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
      .map((e: any) => {
        const name = `${e.first_name} ${e.father_name || ''}`.trim();
        const num = e.employee_number ? ` (${e.employee_number})` : '';
        return { value: e.id, label: `${name}${num}` };
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  // Evaluadores: solo personal del departamento Administración
  public evaluatorOptions = computed(() =>
    (this.dashboardStore.employees.entities() as any[])
      .filter((e) => e.is_active)
      .filter((e) => {
        const dept = (e.department?.name || '').toLowerCase();
        return dept.includes('administr');
      })
      .map((e) => {
        const name = `${e.first_name} ${e.father_name || ''}`.trim();
        return {
          value: e.id,
          label: `${name}${e.position?.name ? ' — ' + e.position.name : ''}`,
          name,
          position: e.position?.name || '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  public selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    if (!id) return null;
    return (this.dashboardStore.employees.entities() as any[]).find((e) => e.id === id) || null;
  });

  public selectedEmployeeName = computed(() => {
    const e = this.selectedEmployee();
    if (!e) return '';
    return `${e.first_name} ${e.father_name || ''} ${e.mother_name || ''}`.trim();
  });

  public selectedEmployeeBranch = computed(() => {
    return this.selectedEmployee()?.branch?.name || '';
  });

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
      this.evaluatorSignature.set(e.evaluator_signature || '');
      this.employeeSignature.set(e.employee_signature || '');
      this.selectedEvaluatorId.set(e.evaluator_id || null);
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

  public onEvaluatorChange(event: { value: string }) {
    const opts = this.evaluatorOptions();
    const sel = opts.find((o) => o.value === event.value);
    if (sel) {
      this.evaluatorName.set(sel.name);
      this.evaluatorPosition.set(sel.position);
    }
  }

  public generateSummary() {
    const id = this.id();
    if (!id) return;
    window.open(`/admin/hr/evaluations/${id}?print=1`, '_blank');
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
        evaluator_id: this.selectedEvaluatorId() || currentEmpId || null,
        evaluator_name: this.evaluatorName(),
        evaluator_position: this.evaluatorPosition(),
        period_label: this.periodLabel(),
        evaluation_date: this.evaluationDate().toISOString().slice(0, 10),
        verdict: this.verdict() || undefined,
        next_review_date: this.nextReviewDate()?.toISOString().slice(0, 10) || null,
        strengths: this.strengths(),
        areas_to_improve: this.areasToImprove(),
        employee_comments: this.employeeComments(),
        evaluator_signature: this.evaluatorSignature(),
        employee_signature: this.employeeSignature(),
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
