import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyResponseAnswer,
  SurveyQuestionOption,
  SURVEY_STATUS_OPTIONS,
} from '../../models';
import { SurveyService } from '../../services/survey.service';
import { HttpClient } from '@angular/common/http';
import { ApiUrlService } from '../../services/api-url.service';
import { firstValueFrom } from 'rxjs';

interface QuestionResult {
  question: SurveyQuestion;
  totalAnswers: number;
  // For rating/scale/yes_no
  average?: number;
  distribution?: { label: string; count: number; percentage: number }[];
  chartData?: any;
  chartOptions?: any;
  // For text
  textResponses?: string[];
}

@Component({
  selector: 'pt-survey-results',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    ChartModule,
    TableModule,
    ProgressBarModule,
  ],
  template: `
    <div class="p-4 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <p-button
          icon="pi pi-arrow-left"
          [rounded]="true"
          [text]="true"
          (onClick)="router.navigate(['/admin/surveys'])"
        />
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-white m-0">{{ survey()?.title ?? 'Cargando...' }}</h2>
          @if (survey(); as s) {
            <div class="flex items-center gap-2 mt-1">
              <p-tag
                [value]="getStatusLabel(s.status)"
                [severity]="getStatusSeverity(s.status)"
              />
              @if (s.is_anonymous) {
                <span class="text-xs text-neutral-400"><i class="pi pi-eye-slash mr-1"></i>Anónima</span>
              }
            </div>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
        </div>
      } @else {
        <!-- Response Rate Card -->
        <div class="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700 mb-6">
          <h3 class="text-lg font-semibold text-white mb-3">Tasa de Respuesta</h3>
          <div class="flex items-center gap-6">
            <div class="text-center">
              <div class="text-4xl font-bold text-amber-400">{{ responseRate() }}%</div>
              <div class="text-sm text-neutral-400 mt-1">completadas</div>
            </div>
            <div class="flex-1">
              <p-progressbar [value]="responseRate()" [showValue]="false" styleClass="h-3" />
              <div class="flex justify-between text-xs text-neutral-400 mt-1">
                <span>{{ completedCount() }} respuestas</span>
                <span>{{ totalAssigned() }} asignadas</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Question Results -->
        @for (result of questionResults(); track result.question.id; let i = $index) {
          <div class="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700 mb-4">
            <div class="flex items-start gap-3 mb-4">
              <span class="bg-amber-500/20 text-amber-400 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0">
                {{ i + 1 }}
              </span>
              <div>
                <h4 class="text-white font-medium m-0">{{ result.question.question_text }}</h4>
                <span class="text-xs text-neutral-500">{{ result.totalAnswers }} respuesta(s)</span>
              </div>
            </div>

            @switch (result.question.question_type) {
              @case ('rating') {
                <div class="flex items-center gap-4 mb-4">
                  <div class="text-3xl font-bold text-amber-400">{{ result.average?.toFixed(1) }}</div>
                  <div class="flex gap-1">
                    @for (star of [1,2,3,4,5]; track star) {
                      <i class="pi text-xl"
                        [class]="star <= (result.average ?? 0) ? 'pi-star-fill text-amber-400' : 'pi-star text-neutral-600'"
                      ></i>
                    }
                  </div>
                </div>
                @if (result.chartData) {
                  <p-chart type="bar" [data]="result.chartData" [options]="result.chartOptions" height="200px" />
                }
              }
              @case ('scale') {
                <div class="flex items-center gap-3 mb-4">
                  <div class="text-3xl font-bold text-amber-400">{{ result.average?.toFixed(1) }}</div>
                  <div class="text-sm text-neutral-400">
                    de {{ result.question.scale_config?.max ?? 10 }}
                  </div>
                </div>
                @if (result.chartData) {
                  <p-chart type="bar" [data]="result.chartData" [options]="result.chartOptions" height="200px" />
                }
              }
              @case ('yes_no') {
                @if (result.chartData) {
                  <div class="max-w-xs mx-auto">
                    <p-chart type="doughnut" [data]="result.chartData" [options]="result.chartOptions" height="250px" />
                  </div>
                }
              }
              @case ('single_choice') {
                @if (result.chartData) {
                  <p-chart type="bar" [data]="result.chartData" [options]="result.chartOptions" height="250px" />
                }
              }
              @case ('multiple_choice') {
                @if (result.chartData) {
                  <p-chart type="bar" [data]="result.chartData" [options]="result.chartOptions" height="250px" />
                }
              }
              @case ('text') {
                @if (result.textResponses && result.textResponses.length > 0) {
                  <div class="space-y-2 max-h-60 overflow-y-auto">
                    @for (text of result.textResponses; track $index) {
                      <div class="bg-neutral-900/50 rounded-lg p-3 text-sm text-neutral-300 border border-neutral-700">
                        "{{ text }}"
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-neutral-500 text-sm">Sin respuestas de texto.</p>
                }
              }
            }
          </div>
        }

        <!-- Individual Responses (non-anonymous) -->
        @if (survey() && !survey()!.is_anonymous && responses().length > 0) {
          <div class="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700 mt-6">
            <h3 class="text-lg font-semibold text-white mb-4">Respuestas Individuales</h3>
            <p-table [value]="responses()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
              <ng-template #header>
                <tr>
                  <th>Empleado</th>
                  <th>Fecha</th>
                </tr>
              </ng-template>
              <ng-template #body let-r>
                <tr>
                  <td>{{ r.employee?.first_name }} {{ r.employee?.father_name }}</td>
                  <td>{{ formatDate(r.submitted_at) }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }
      }
    </div>
  `,
})
export class SurveyResultsComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  survey = signal<Survey | null>(null);
  questions = signal<SurveyQuestion[]>([]);
  responses = signal<SurveyResponse[]>([]);
  totalAssigned = signal(0);
  completedCount = signal(0);
  loading = signal(true);

  responseRate = computed(() => {
    const total = this.totalAssigned();
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  questionResults = computed(() => this.buildQuestionResults());

  async ngOnInit() {
    const surveyId = this.route.snapshot.paramMap.get('surveyId');
    if (surveyId) {
      await this.loadResults(surveyId);
    }
  }

  private async loadResults(surveyId: string) {
    this.loading.set(true);
    try {
      // Load survey
      const surveyUrl = this.apiUrl.build('rest/v1/surveys', {
        id: `eq.${surveyId}`,
        select: '*',
      });
      const surveys = await firstValueFrom(this.http.get<Survey[]>(surveyUrl));
      this.survey.set(surveys?.[0] ?? null);

      // Load questions with options
      const questions = await this.surveyService.getQuestions(surveyId);
      this.questions.set(questions);

      // Load assignment counts
      const counts = await this.surveyService.getAssignmentCounts(surveyId);
      this.totalAssigned.set(counts.total);
      this.completedCount.set(counts.completed);

      // Load responses with answers
      const responses = await this.surveyService.getResponsesForSurvey(surveyId);
      this.responses.set(responses);
    } catch (e) {
      console.error('Error loading survey results:', e);
    } finally {
      this.loading.set(false);
    }
  }

  private buildQuestionResults(): QuestionResult[] {
    const questions = this.questions();
    const responses = this.responses();
    if (!questions.length || !responses.length) return [];

    // Build a map of questionId -> answers
    const answersByQuestion = new Map<string, SurveyResponseAnswer[]>();
    for (const response of responses) {
      for (const answer of response.answers ?? []) {
        const list = answersByQuestion.get(answer.question_id) ?? [];
        list.push(answer);
        answersByQuestion.set(answer.question_id, list);
      }
    }

    return questions.map(q => {
      const answers = answersByQuestion.get(q.id) ?? [];
      return this.buildResultForQuestion(q, answers);
    });
  }

  private buildResultForQuestion(question: SurveyQuestion, answers: SurveyResponseAnswer[]): QuestionResult {
    const result: QuestionResult = { question, totalAnswers: answers.length };

    const chartBaseOptions = {
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#a3a3a3', stepSize: 1 },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        x: {
          ticks: { color: '#a3a3a3' },
          grid: { display: false },
        },
      },
    };

    switch (question.question_type) {
      case 'rating': {
        const values = answers.map(a => a.answer_numeric ?? 0).filter(v => v > 0);
        result.average = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
        const dist = [1, 2, 3, 4, 5].map(star => ({
          label: `${star} ★`,
          count: values.filter(v => v === star).length,
          percentage: values.length > 0 ? Math.round((values.filter(v => v === star).length / values.length) * 100) : 0,
        }));
        result.distribution = dist;
        result.chartData = {
          labels: dist.map(d => d.label),
          datasets: [{ data: dist.map(d => d.count), backgroundColor: '#f59e0b' }],
        };
        result.chartOptions = chartBaseOptions;
        break;
      }
      case 'scale': {
        const min = question.scale_config?.min ?? 1;
        const max = question.scale_config?.max ?? 10;
        const values = answers.map(a => a.answer_numeric ?? 0).filter(v => v >= min);
        result.average = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
        const labels: number[] = [];
        for (let i = min; i <= max; i++) labels.push(i);
        const dist = labels.map(val => ({
          label: `${val}`,
          count: values.filter(v => v === val).length,
          percentage: values.length > 0 ? Math.round((values.filter(v => v === val).length / values.length) * 100) : 0,
        }));
        result.distribution = dist;
        result.chartData = {
          labels: dist.map(d => d.label),
          datasets: [{ data: dist.map(d => d.count), backgroundColor: '#f59e0b' }],
        };
        result.chartOptions = chartBaseOptions;
        break;
      }
      case 'yes_no': {
        const yesCount = answers.filter(a => a.answer_numeric === 1).length;
        const noCount = answers.filter(a => a.answer_numeric === 0).length;
        result.distribution = [
          { label: 'Sí', count: yesCount, percentage: answers.length > 0 ? Math.round((yesCount / answers.length) * 100) : 0 },
          { label: 'No', count: noCount, percentage: answers.length > 0 ? Math.round((noCount / answers.length) * 100) : 0 },
        ];
        result.chartData = {
          labels: ['Sí', 'No'],
          datasets: [{ data: [yesCount, noCount], backgroundColor: ['#22c55e', '#ef4444'] }],
        };
        result.chartOptions = {
          plugins: { legend: { position: 'bottom', labels: { color: '#a3a3a3' } } },
        };
        break;
      }
      case 'single_choice':
      case 'multiple_choice': {
        const options = question.options ?? [];
        const optionCounts = new Map<string, number>();
        for (const opt of options) {
          optionCounts.set(opt.id, 0);
        }
        for (const answer of answers) {
          for (const optId of answer.selected_option_ids ?? []) {
            optionCounts.set(optId, (optionCounts.get(optId) ?? 0) + 1);
          }
        }
        const dist = options.map(opt => ({
          label: opt.option_text,
          count: optionCounts.get(opt.id) ?? 0,
          percentage: answers.length > 0 ? Math.round(((optionCounts.get(opt.id) ?? 0) / answers.length) * 100) : 0,
        }));
        result.distribution = dist;
        result.chartData = {
          labels: dist.map(d => d.label.length > 30 ? d.label.substring(0, 30) + '...' : d.label),
          datasets: [{ data: dist.map(d => d.count), backgroundColor: '#f59e0b' }],
        };
        result.chartOptions = {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { color: '#a3a3a3', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#a3a3a3' }, grid: { display: false } },
          },
        };
        break;
      }
      case 'text': {
        result.textResponses = answers
          .map(a => a.answer_text)
          .filter((t): t is string => !!t && t.trim().length > 0);
        break;
      }
    }

    return result;
  }

  getStatusLabel(status: string): string {
    return SURVEY_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'secondary'> = {
      draft: 'secondary', active: 'success', closed: 'warn', archived: 'info',
    };
    return map[status] ?? 'secondary';
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-PA', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
