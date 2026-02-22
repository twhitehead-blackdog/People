import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { RatingModule } from 'primeng/rating';
import { SliderModule } from 'primeng/slider';
import { ProgressBarModule } from 'primeng/progressbar';
import {
  SurveyAssignment,
  SurveyQuestion,
  SurveyQuestionType,
  QUESTION_TYPE_OPTIONS,
} from '../../models';
import { SurveyService } from '../../services/survey.service';

@Component({
  selector: 'pt-employee-portal-survey-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RadioButtonModule,
    CheckboxModule,
    TextareaModule,
    RatingModule,
    SliderModule,
    ProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (assignment().survey; as survey) {
      <div>
        <!-- Survey header -->
        <div class="flex items-center gap-3 mb-6">
          <p-button
            icon="pi pi-arrow-left"
            [rounded]="true"
            [text]="true"
            (onClick)="back.emit()"
          />
          <div>
            <h2 class="text-xl font-bold text-white m-0">{{ survey.title }}</h2>
            @if (survey.description) {
              <p class="text-sm text-neutral-400 mt-1 mb-0">{{ survey.description }}</p>
            }
          </div>
        </div>

        <!-- Progress -->
        <div class="mb-6">
          <div class="flex justify-between text-xs text-neutral-400 mb-1">
            <span>Progreso</span>
            <span>{{ answeredCount() }} / {{ totalRequired() }} requeridas</span>
          </div>
          <p-progressbar [value]="progressPercent()" [showValue]="false" styleClass="h-2" />
        </div>

        @if (survey.is_anonymous) {
          <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6 flex items-center gap-2">
            <i class="pi pi-eye-slash text-blue-400"></i>
            <span class="text-sm text-blue-300">Esta encuesta es anónima. Tus respuestas no serán vinculadas a tu nombre.</span>
          </div>
        }

        <!-- Questions -->
        <div class="space-y-6">
          @for (question of sortedQuestions(); track question.id; let i = $index) {
            <div class="bg-neutral-800/50 rounded-xl p-5 border border-neutral-700">
              <div class="flex items-start gap-2 mb-3">
                <span class="bg-amber-500/20 text-amber-400 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {{ i + 1 }}
                </span>
                <div>
                  <span class="text-white font-medium">{{ question.question_text }}</span>
                  @if (question.is_required) {
                    <span class="text-red-400 ml-1">*</span>
                  }
                </div>
              </div>

              @switch (question.question_type) {
                @case ('rating') {
                  <div class="pl-9">
                    <p-rating
                      [ngModel]="getAnswerNumeric(question.id)"
                      (ngModelChange)="setAnswerNumeric(question.id, $event)"
                      [stars]="5"
                    />
                  </div>
                }
                @case ('yes_no') {
                  <div class="pl-9 flex gap-3">
                    <button
                      class="px-5 py-2 rounded-lg text-sm font-medium transition-all border"
                      [class]="getAnswerNumeric(question.id) === 1 ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-neutral-500'"
                      (click)="setAnswerNumeric(question.id, 1)"
                    >
                      <i class="pi pi-check mr-1"></i> Sí
                    </button>
                    <button
                      class="px-5 py-2 rounded-lg text-sm font-medium transition-all border"
                      [class]="getAnswerNumeric(question.id) === 0 ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-neutral-500'"
                      (click)="setAnswerNumeric(question.id, 0)"
                    >
                      <i class="pi pi-times mr-1"></i> No
                    </button>
                  </div>
                }
                @case ('scale') {
                  <div class="pl-9">
                    @if (question.scale_config; as sc) {
                      <div class="flex items-center gap-2 flex-wrap">
                        @for (val of getScaleValues(sc.min, sc.max); track val) {
                          <button
                            class="w-10 h-10 rounded-lg text-sm font-medium transition-all border"
                            [class]="getAnswerNumeric(question.id) === val ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-neutral-500'"
                            (click)="setAnswerNumeric(question.id, val)"
                          >
                            {{ val }}
                          </button>
                        }
                      </div>
                      <div class="flex justify-between text-xs text-neutral-500 mt-1">
                        <span>{{ sc.min_label || sc.min }}</span>
                        <span>{{ sc.max_label || sc.max }}</span>
                      </div>
                    }
                  </div>
                }
                @case ('single_choice') {
                  <div class="pl-9 space-y-2">
                    @for (option of question.options; track option.id) {
                      <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-700/30 cursor-pointer">
                        <p-radioButton
                          [name]="'q_' + question.id"
                          [value]="option.id"
                          [ngModel]="getSelectedSingleOption(question.id)"
                          (ngModelChange)="setSelectedSingleOption(question.id, $event)"
                        />
                        <span class="text-sm text-neutral-300">{{ option.option_text }}</span>
                      </label>
                    }
                  </div>
                }
                @case ('multiple_choice') {
                  <div class="pl-9 space-y-2">
                    @for (option of question.options; track option.id) {
                      <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-700/30 cursor-pointer">
                        <p-checkbox
                          [ngModel]="isOptionSelected(question.id, option.id)"
                          (ngModelChange)="toggleOption(question.id, option.id)"
                          [binary]="true"
                        />
                        <span class="text-sm text-neutral-300">{{ option.option_text }}</span>
                      </label>
                    }
                  </div>
                }
                @case ('text') {
                  <div class="pl-9">
                    <textarea
                      pTextarea
                      [ngModel]="getAnswerText(question.id)"
                      (ngModelChange)="setAnswerText(question.id, $event)"
                      [rows]="3"
                      class="w-full"
                      placeholder="Escribe tu respuesta..."
                    ></textarea>
                  </div>
                }
              }
            </div>
          }
        </div>

        <!-- Submit -->
        <div class="flex justify-between items-center mt-8">
          <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()" />
          <p-button
            label="Enviar Respuestas"
            icon="pi pi-send"
            severity="success"
            (onClick)="submitSurvey()"
            [loading]="submitting()"
            [disabled]="!canSubmit()"
          />
        </div>
      </div>
    }
  `,
})
export class EmployeePortalSurveyFormComponent {
  private surveyService = inject(SurveyService);

  assignment = input.required<SurveyAssignment>();
  employeeId = input.required<string>();
  companyId = input.required<string>();
  completed = output<void>();
  back = output<void>();

  submitting = signal(false);

  // Answers stored as maps
  private numericAnswers = signal<Map<string, number>>(new Map());
  private textAnswers = signal<Map<string, string>>(new Map());
  private optionAnswers = signal<Map<string, string[]>>(new Map());

  sortedQuestions = computed(() => {
    const survey = this.assignment().survey;
    if (!survey?.questions) return [];
    return [...survey.questions].sort((a, b) => a.order_index - b.order_index);
  });

  totalRequired = computed(() =>
    this.sortedQuestions().filter(q => q.is_required).length
  );

  answeredCount = computed(() => {
    const questions = this.sortedQuestions().filter(q => q.is_required);
    let count = 0;
    for (const q of questions) {
      if (this.isQuestionAnswered(q)) count++;
    }
    return count;
  });

  progressPercent = computed(() => {
    const total = this.totalRequired();
    if (total === 0) return 100;
    return Math.round((this.answeredCount() / total) * 100);
  });

  canSubmit = computed(() => this.answeredCount() === this.totalRequired());

  private isQuestionAnswered(q: SurveyQuestion): boolean {
    switch (q.question_type) {
      case 'rating':
      case 'scale':
        return this.numericAnswers().has(q.id);
      case 'yes_no':
        return this.numericAnswers().has(q.id);
      case 'text':
        return (this.textAnswers().get(q.id)?.trim().length ?? 0) > 0;
      case 'single_choice':
        return (this.optionAnswers().get(q.id)?.length ?? 0) > 0;
      case 'multiple_choice':
        return (this.optionAnswers().get(q.id)?.length ?? 0) > 0;
      default:
        return false;
    }
  }

  // Numeric answers
  getAnswerNumeric(questionId: string): number | null {
    return this.numericAnswers().get(questionId) ?? null;
  }

  setAnswerNumeric(questionId: string, value: number) {
    this.numericAnswers.update(map => {
      const m = new Map(map);
      m.set(questionId, value);
      return m;
    });
  }

  // Text answers
  getAnswerText(questionId: string): string {
    return this.textAnswers().get(questionId) ?? '';
  }

  setAnswerText(questionId: string, value: string) {
    this.textAnswers.update(map => {
      const m = new Map(map);
      m.set(questionId, value);
      return m;
    });
  }

  // Single choice
  getSelectedSingleOption(questionId: string): string | null {
    const opts = this.optionAnswers().get(questionId);
    return opts?.[0] ?? null;
  }

  setSelectedSingleOption(questionId: string, optionId: string) {
    this.optionAnswers.update(map => {
      const m = new Map(map);
      m.set(questionId, [optionId]);
      return m;
    });
  }

  // Multiple choice
  isOptionSelected(questionId: string, optionId: string): boolean {
    return this.optionAnswers().get(questionId)?.includes(optionId) ?? false;
  }

  toggleOption(questionId: string, optionId: string) {
    this.optionAnswers.update(map => {
      const m = new Map(map);
      const current = m.get(questionId) ?? [];
      if (current.includes(optionId)) {
        m.set(questionId, current.filter(id => id !== optionId));
      } else {
        m.set(questionId, [...current, optionId]);
      }
      return m;
    });
  }

  // Scale helper
  getScaleValues(min: number, max: number): number[] {
    const values: number[] = [];
    for (let i = min; i <= max; i++) values.push(i);
    return values;
  }

  async submitSurvey() {
    const survey = this.assignment().survey;
    if (!survey) return;

    this.submitting.set(true);
    try {
      const answers = this.sortedQuestions().map(q => {
        const answer: {
          question_id: string;
          answer_text?: string;
          answer_numeric?: number;
          selected_option_ids?: string[];
        } = { question_id: q.id };

        switch (q.question_type) {
          case 'rating':
          case 'scale':
          case 'yes_no':
            answer.answer_numeric = this.numericAnswers().get(q.id);
            break;
          case 'text':
            answer.answer_text = this.textAnswers().get(q.id);
            break;
          case 'single_choice':
          case 'multiple_choice':
            answer.selected_option_ids = this.optionAnswers().get(q.id);
            break;
        }

        return answer;
      }).filter(a => a.answer_text || a.answer_numeric !== undefined || a.selected_option_ids?.length);

      await this.surveyService.submitSurveyResponse(
        survey.id,
        this.employeeId(),
        this.companyId(),
        answers
      );

      this.completed.emit();
    } catch (e) {
      console.error('Error submitting survey:', e);
    } finally {
      this.submitting.set(false);
    }
  }
}
