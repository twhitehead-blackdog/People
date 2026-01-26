import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextarea } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AuditAnswer, AuditEvaluation, AuditForm } from '../../models';
import { Performance360Service } from '../../services/performance-360.service';
import { BranchesStore } from '../../stores/branches.store';

// Tipo local para manejar respuestas en el formulario
interface LocalAnswer {
  questionId: string;
  value: 'yes' | 'no' | 'na' | null;
  notes: string;
}

@Component({
  selector: 'pt-performance-evaluation-form',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    Button,
    TabViewModule,
    SelectButtonModule,
    FormsModule,
    TagModule,
    InputTextarea,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="p-4 max-w-6xl mx-auto pb-20">
      <p-toast></p-toast>
      @if (isLoading()) {
      <div class="flex justify-center items-center h-64">
        <p-progressSpinner strokeWidth="4"></p-progressSpinner>
      </div>
      } @else if (form()) {
      <!-- Top Bar (Sticky) -->
      <div
        class="sticky top-0 z-10 bg-surface-900/95 backdrop-blur-sm border-b border-surface-700 py-3 px-4 -mx-4 mb-6 shadow-lg flex justify-between items-center"
      >
        <div class="flex items-center gap-4">
          <p-button
            icon="pi pi-arrow-left"
            [rounded]="true"
            [text]="true"
            (onClick)="goBack()"
          ></p-button>
          <div>
            <h1 class="text-xl font-bold text-white m-0">
              {{ form()?.title || 'Evaluación' }}
            </h1>
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <i class="pi pi-building"></i>
              <span>{{ branchName() }}</span>
              <span class="mx-1">•</span>
              <i class="pi pi-tag"></i>
              <span>{{ form()?.business_unit }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <!-- Live Score Widget -->
          <div class="text-right hidden sm:block">
            <div class="text-xs text-gray-400 uppercase tracking-wider">
              Live Score
            </div>
            <div
              class="text-2xl font-bold"
              [class.text-emerald-500]="liveScore() >= 81"
              [class.text-yellow-500]="liveScore() >= 61 && liveScore() < 81"
              [class.text-red-500]="liveScore() < 61"
            >
              {{ liveScore() }}%
            </div>
          </div>

          <div class="flex gap-2">
            <p-button
              label="Guardar Borrador"
              icon="pi pi-save"
              [text]="true"
              severity="secondary"
              [loading]="isSaving()"
              (onClick)="saveDraft()"
            ></p-button>
            <p-button
              label="Finalizar"
              icon="pi pi-check"
              severity="success"
              [loading]="isSaving()"
              (onClick)="finalize()"
            ></p-button>
          </div>
        </div>
      </div>

      <!-- Sections Tabs -->
      <div class="card">
        <p-tabView>
          @for (section of form()?.sections || []; track section.id) {
          <p-tabPanel
            [header]="section.title + ' (' + section.weight_percentage + '%)'"
          >
            <div class="space-y-6 pt-4">
              @for (question of section.questions || []; track question.id) {
              <div
                class="p-4 rounded-lg bg-surface-800 border border-surface-700"
              >
                <div class="flex justify-between items-start mb-3">
                  <p class="text-lg font-medium text-white max-w-3xl">
                    {{ question.code }} - {{ question.question_text }}
                  </p>
                  @if (question.is_critical) {
                  <p-tag
                    value="Crítico"
                    severity="danger"
                    icon="pi pi-exclamation-triangle"
                  ></p-tag>
                  }
                </div>

                <div
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4"
                >
                  <div class="w-full sm:w-auto">
                    <p-selectButton
                      [options]="responseOptions"
                      [ngModel]="getAnswerValue(question.id)"
                      (ngModelChange)="setAnswerValue(question.id, $event)"
                      optionLabel="label"
                      optionValue="value"
                    ></p-selectButton>
                  </div>

                  <textarea
                    pInputTextarea
                    rows="1"
                    placeholder="Observaciones (opcional)"
                    class="w-full sm:w-1/2 bg-surface-900 border-surface-600 text-sm"
                    [ngModel]="getAnswerNotes(question.id)"
                    (ngModelChange)="setAnswerNotes(question.id, $event)"
                  ></textarea>
                </div>
              </div>
              } @empty {
              <p class="text-gray-500 text-center py-4">
                No hay preguntas en esta sección.
              </p>
              }
            </div>
          </p-tabPanel>
          }
        </p-tabView>
      </div>
      } @else {
      <div class="text-center py-12 text-gray-500">
        <i class="pi pi-exclamation-circle text-4xl mb-4"></i>
        <p>No se pudo cargar el formulario de evaluación.</p>
        <p-button
          label="Volver"
          icon="pi pi-arrow-left"
          [text]="true"
          (onClick)="goBack()"
        ></p-button>
      </div>
      }
    </div>
  `,
})
export class PerformanceEvaluationFormComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private performanceService = inject(Performance360Service);
  private branchesStore = inject(BranchesStore);
  private messageService = inject(MessageService);

  // Route param: ID de la evaluación
  evaluationId = input.required<string>();

  // Estado del componente
  isLoading = signal(true);
  isSaving = signal(false);
  evaluation = signal<AuditEvaluation | null>(null);
  form = signal<AuditForm | null>(null);
  branchId = signal<string | null>(null);

  // Respuestas locales (mapa: questionId -> LocalAnswer)
  localAnswers = signal<Map<string, LocalAnswer>>(new Map());

  // Opciones de respuesta
  responseOptions = [
    { label: 'Cumple', value: 'yes', icon: 'pi pi-check' },
    { label: 'No Cumple', value: 'no', icon: 'pi pi-times' },
    { label: 'N/A', value: 'na', icon: 'pi pi-ban' },
  ];

  // Nombre de la sucursal
  branchName = computed(() => {
    const id = this.branchId();
    if (!id) return 'Sucursal';
    const branch = this.branchesStore.entities().find((b) => b.id === id);
    return branch?.name || 'Sucursal';
  });

  // Live Score usando el motor de cálculo del servicio
  liveScoreResult = computed(() => {
    const answers = this.localAnswers();
    const form = this.form();

    if (!form) {
      return {
        score: 0,
        level: 'Sin datos',
        levelColor: 'secondary',
        sectionScores: [],
      };
    }

    return this.performanceService.calculateScoreWithForm(answers, form);
  });

  // Helpers para el template
  liveScore = computed(() => this.liveScoreResult().score);
  liveLevel = computed(() => this.liveScoreResult().level);
  liveLevelColor = computed(() => this.liveScoreResult().levelColor);
  sectionScores = computed(() => this.liveScoreResult().sectionScores);

  constructor() {
    // Cargar datos cuando cambie el evaluationId
    effect(() => {
      const id = this.evaluationId();
      if (id) {
        this.loadEvaluation(id);
      }
    });

    // Obtener branchId de query params
    this.route.queryParams.subscribe((params) => {
      if (params['branch']) {
        this.branchId.set(params['branch']);
      }
    });
  }

  async loadEvaluation(id: string) {
    this.isLoading.set(true);
    try {
      const evaluation = await this.performanceService
        .getEvaluationById(id)
        .toPromise();

      if (evaluation && Array.isArray(evaluation) && evaluation.length > 0) {
        const evalData = evaluation[0] as AuditEvaluation;
        this.evaluation.set(evalData);
        this.form.set(evalData.audit_form || null);
        this.branchId.set(evalData.branch_id);

        // Inicializar respuestas locales desde BD
        this.initializeAnswers(evalData);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se encontró la evaluación solicitada',
          life: 5000,
        });
      }
    } catch (error) {
      console.error('Error cargando evaluación:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error de conexión',
        detail: 'No se pudo cargar la evaluación',
        life: 5000,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  initializeAnswers(evaluation: AuditEvaluation) {
    const answersMap = new Map<string, LocalAnswer>();

    // Cargar respuestas existentes
    for (const answer of evaluation.answers || []) {
      answersMap.set(answer.audit_question_id, {
        questionId: answer.audit_question_id,
        value: answer.answer_value,
        notes: answer.notes || '',
      });
    }

    // Inicializar preguntas sin respuesta
    const form = this.form();
    if (form?.sections) {
      for (const section of form.sections) {
        for (const question of section.questions || []) {
          if (!answersMap.has(question.id)) {
            answersMap.set(question.id, {
              questionId: question.id,
              value: null,
              notes: '',
            });
          }
        }
      }
    }

    this.localAnswers.set(answersMap);
  }

  getAnswerValue(questionId: string): string | null {
    return this.localAnswers().get(questionId)?.value || null;
  }

  setAnswerValue(questionId: string, value: 'yes' | 'no' | 'na') {
    const answers = new Map(this.localAnswers());
    const existing = answers.get(questionId) || {
      questionId,
      value: null,
      notes: '',
    };
    answers.set(questionId, { ...existing, value });
    this.localAnswers.set(answers);
  }

  getAnswerNotes(questionId: string): string {
    return this.localAnswers().get(questionId)?.notes || '';
  }

  setAnswerNotes(questionId: string, notes: string) {
    const answers = new Map(this.localAnswers());
    const existing = answers.get(questionId) || {
      questionId,
      value: null,
      notes: '',
    };
    answers.set(questionId, { ...existing, notes });
    this.localAnswers.set(answers);
  }

  async saveDraft() {
    await this.save('draft');
  }

  async finalize() {
    await this.save('completed');
  }

  private async save(status: 'draft' | 'completed') {
    const evalId = this.evaluation()?.id;
    if (!evalId) return;

    this.isSaving.set(true);
    try {
      const answersToSave: Partial<AuditAnswer>[] = [];
      this.localAnswers().forEach((answer) => {
        if (answer.value !== null) {
          answersToSave.push({
            audit_question_id: answer.questionId,
            answer_value: answer.value,
            notes: answer.notes || undefined,
          });
        }
      });

      await this.performanceService.saveFullEvaluation(
        evalId,
        answersToSave,
        status
      );

      this.messageService.add({
        severity: 'success',
        summary: status === 'completed' ? 'Evaluación Finalizada' : 'Guardado',
        detail:
          status === 'completed'
            ? 'Evaluación completada correctamente.'
            : 'Borrador guardado exitosamente.',
      });

      if (status === 'completed') {
        // Navegar al reporte después de un breve delay
        setTimeout(() => {
          this.router.navigate(['/admin/performance/report', evalId]);
        }, 1500);
      }
    } catch (error) {
      console.error('Error guardando evaluación:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al Guardar',
        detail: 'No se pudieron guardar los cambios. Intente nuevamente.',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/admin/performance']);
  }
}
