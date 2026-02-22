import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressBarModule } from 'primeng/progressbar';
import { SurveyAssignment, SURVEY_CATEGORY_OPTIONS } from '../../models';
import { SurveyService } from '../../services/survey.service';
import { EmployeePortalSurveyFormComponent } from './employee-portal-survey-form.component';

@Component({
  selector: 'pt-employee-portal-surveys',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ProgressBarModule,
    EmployeePortalSurveyFormComponent,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />

    <div class="p-4">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <p-button
          icon="pi pi-arrow-left"
          [rounded]="true"
          [text]="true"
          (onClick)="closeSection.emit()"
        />
        <div>
          <h2 class="text-xl font-bold text-white m-0">Mis Encuestas</h2>
          <p class="text-neutral-400 text-sm mt-1 mb-0">Completa las encuestas asignadas por HR</p>
        </div>
      </div>

      @if (activeSurvey()) {
        <!-- Survey Form -->
        <pt-employee-portal-survey-form
          [assignment]="activeSurvey()!"
          [employeeId]="employeeId()"
          [companyId]="companyId()"
          (completed)="onSurveyCompleted()"
          (back)="activeSurvey.set(null)"
        />
      } @else {
        <!-- Loading -->
        @if (loading()) {
          <div class="flex justify-center py-12">
            <i class="pi pi-spin pi-spinner text-3xl text-amber-400"></i>
          </div>
        } @else {
          <!-- Pending Surveys -->
          @if (pendingSurveys().length > 0) {
            <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Pendientes</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              @for (assignment of pendingSurveys(); track assignment.id) {
                <div
                  class="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700 hover:border-amber-500/30 transition-all cursor-pointer"
                  (click)="activeSurvey.set(assignment)"
                >
                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <i class="pi pi-chart-bar text-amber-400"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-white font-medium m-0 truncate">{{ assignment.survey?.title }}</h4>
                      @if (assignment.survey?.description) {
                        <p class="text-xs text-neutral-400 mt-1 mb-0 line-clamp-2">{{ assignment.survey?.description }}</p>
                      }
                      <div class="flex items-center gap-2 mt-2">
                        @if (assignment.survey?.category) {
                          <span class="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                            {{ getCategoryLabel(assignment.survey?.category ?? '') }}
                          </span>
                        }
                        @if (assignment.survey?.due_date) {
                          <span class="text-xs text-neutral-500">
                            <i class="pi pi-calendar mr-1"></i>
                            Vence {{ formatDate(assignment.survey?.due_date) }}
                          </span>
                        }
                      </div>
                    </div>
                    <i class="pi pi-chevron-right text-neutral-500 mt-2"></i>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Completed -->
          @if (completedSurveys().length > 0) {
            <h3 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Completadas</h3>
            <div class="space-y-2">
              @for (assignment of completedSurveys(); track assignment.id) {
                <div class="bg-neutral-800/30 rounded-lg p-3 border border-neutral-700/50 flex items-center gap-3">
                  <i class="pi pi-check-circle text-green-400"></i>
                  <span class="text-neutral-400 text-sm flex-1">{{ assignment.survey?.title }}</span>
                  <span class="text-xs text-neutral-500">{{ formatDate(assignment.completed_at) }}</span>
                </div>
              }
            </div>
          }

          <!-- Empty state -->
          @if (pendingSurveys().length === 0 && completedSurveys().length === 0) {
            <div class="text-center py-16 text-neutral-400">
              <i class="pi pi-inbox text-5xl mb-4 block"></i>
              <h3 class="text-lg font-medium text-neutral-300 mb-1">Sin encuestas</h3>
              <p class="text-sm">No tienes encuestas asignadas por el momento.</p>
            </div>
          }
        }
      }
    </div>
  `,
})
export class EmployeePortalSurveysComponent implements OnInit {
  private surveyService = inject(SurveyService);
  private messageService = inject(MessageService);

  employeeId = input.required<string>();
  companyId = input.required<string>();
  closeSection = output<void>();

  loading = signal(true);
  pendingSurveys = signal<SurveyAssignment[]>([]);
  completedSurveys = signal<SurveyAssignment[]>([]);
  activeSurvey = signal<SurveyAssignment | null>(null);

  async ngOnInit() {
    await this.loadSurveys();
  }

  private async loadSurveys() {
    this.loading.set(true);
    try {
      const [pending, completed] = await Promise.all([
        this.surveyService.getPendingSurveysForEmployee(this.employeeId()),
        this.surveyService.getCompletedSurveysForEmployee(this.employeeId()),
      ]);
      // Only show surveys with active status
      this.pendingSurveys.set(pending.filter(a => a.survey?.status === 'active'));
      this.completedSurveys.set(completed);
    } catch (e) {
      console.error('Error loading surveys:', e);
    } finally {
      this.loading.set(false);
    }
  }

  async onSurveyCompleted() {
    this.activeSurvey.set(null);
    this.messageService.add({
      severity: 'success',
      summary: 'Encuesta completada',
      detail: 'Gracias por completar la encuesta.',
    });
    await this.loadSurveys();
  }

  getCategoryLabel(category: string): string {
    return SURVEY_CATEGORY_OPTIONS.find(o => o.value === category)?.label ?? category;
  }

  formatDate(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-PA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }
}
