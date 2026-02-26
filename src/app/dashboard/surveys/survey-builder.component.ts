import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import {
  Survey,
  SurveyQuestion,
  SurveyQuestionOption,
  SurveyQuestionType,
  SurveyAssignment,
  SURVEY_CATEGORY_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  ScaleConfig,
} from '../../models';
import { SurveyService } from '../../services/survey.service';
import { OrganizationService } from '../../services/organization.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../services/api-url.service';

interface SimpleEmployee {
  id: string;
  first_name: string;
  father_name: string;
}

@Component({
  selector: 'pt-survey-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
    TagModule,
    ToastModule,
    ToggleSwitchModule,
    TooltipModule,
    TableModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="p-4 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <p-button
          icon="pi pi-arrow-left"
          [rounded]="true"
          [text]="true"
          (onClick)="router.navigate(['/admin/surveys'])"
        />
        <div>
          <h2 class="text-2xl font-bold text-white m-0">
            {{ isEditing() ? 'Editar Encuesta' : 'Nueva Encuesta' }}
          </h2>
          <p class="text-neutral-400 mt-1 mb-0">
            {{ isEditing() ? 'Modifica la encuesta y sus preguntas' : 'Configura la encuesta, agrega preguntas y asigna empleados' }}
          </p>
        </div>
      </div>

      <!-- Step indicator -->
      <div class="flex gap-2 mb-6">
        @for (step of steps; track step.key; let i = $index) {
          <button
            class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            [class]="currentStep() === i ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'"
            (click)="currentStep.set(i)"
          >
            <i [class]="step.icon + ' mr-2'"></i>{{ step.label }}
          </button>
        }
      </div>

      <!-- STEP 0: Survey Info -->
      @if (currentStep() === 0) {
        <div class="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
          <h3 class="text-lg font-semibold text-white mb-4">Información General</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm text-neutral-400 mb-1">Título *</label>
              <input
                pInputText
                [ngModel]="surveyTitle()"
                (ngModelChange)="surveyTitle.set($event)"
                placeholder="Ej: Encuesta de Clima Laboral 2026"
                class="w-full"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm text-neutral-400 mb-1">Descripción</label>
              <textarea
                pTextarea
                [ngModel]="surveyDescription()"
                (ngModelChange)="surveyDescription.set($event)"
                placeholder="Descripción opcional de la encuesta..."
                [rows]="3"
                class="w-full"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm text-neutral-400 mb-1">Categoría</label>
              <p-select
                [options]="categoryOptions"
                [ngModel]="surveyCategory()"
                (ngModelChange)="surveyCategory.set($event)"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecciona categoría"
                [showClear]="true"
                styleClass="w-full"
              />
            </div>

            <div>
              <label class="block text-sm text-neutral-400 mb-1">Fecha límite</label>
              <p-datepicker
                [ngModel]="surveyDueDate()"
                (ngModelChange)="surveyDueDate.set($event)"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                placeholder="Opcional"
                styleClass="w-full"
              />
            </div>

            <div class="flex items-center gap-3">
              <p-toggleswitch
                [ngModel]="surveyAnonymous()"
                (ngModelChange)="surveyAnonymous.set($event)"
              />
              <label class="text-sm text-neutral-300">Encuesta anónima</label>
            </div>

            <div class="flex items-center gap-3">
              <p-toggleswitch
                [ngModel]="surveyMultipleSubmissions()"
                (ngModelChange)="surveyMultipleSubmissions.set($event)"
              />
              <label class="text-sm text-neutral-300">Permitir múltiples envíos</label>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <p-button label="Siguiente: Preguntas" icon="pi pi-arrow-right" iconPos="right" severity="warn" (onClick)="saveAndNext(1)" [loading]="saving()" />
          </div>
        </div>
      }

      <!-- STEP 1: Questions -->
      @if (currentStep() === 1) {
        <div class="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-white m-0">Preguntas ({{ questions().length }})</h3>
            <p-button label="Agregar Pregunta" icon="pi pi-plus" severity="warn" [outlined]="true" (onClick)="openQuestionDialog()" />
          </div>

          @if (questions().length === 0) {
            <div class="text-center py-12 text-neutral-400">
              <i class="pi pi-list text-4xl mb-3 block"></i>
              <p>Aún no hay preguntas. Agrega la primera.</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (q of questions(); track q.id; let i = $index) {
                <div class="bg-neutral-900/50 rounded-lg p-4 border border-neutral-700 flex items-start gap-3">
                  <span class="text-amber-400 font-bold mt-1">{{ i + 1 }}</span>
                  <div class="flex-1">
                    <div class="font-medium text-white">{{ q.question_text }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                        {{ getQuestionTypeLabel(q.question_type) }}
                      </span>
                      @if (q.is_required) {
                        <span class="text-xs text-amber-400">Requerida</span>
                      }
                    </div>
                    @if (q.options && q.options.length > 0) {
                      <div class="mt-2 text-xs text-neutral-400">
                        Opciones: {{ getOptionsText(q) }}
                      </div>
                    }
                  </div>
                  <div class="flex gap-1">
                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" (onClick)="openQuestionDialog(q)" />
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="deleteQuestion(q)" />
                    @if (i > 0) {
                      <p-button icon="pi pi-arrow-up" [rounded]="true" [text]="true" (onClick)="moveQuestion(i, -1)" />
                    }
                    @if (i < questions().length - 1) {
                      <p-button icon="pi pi-arrow-down" [rounded]="true" [text]="true" (onClick)="moveQuestion(i, 1)" />
                    }
                  </div>
                </div>
              }
            </div>
          }

          <div class="flex justify-between mt-6">
            <p-button label="Anterior" icon="pi pi-arrow-left" severity="secondary" (onClick)="currentStep.set(0)" />
            <p-button label="Siguiente: Asignar Empleados" icon="pi pi-arrow-right" iconPos="right" severity="warn" (onClick)="currentStep.set(2)" />
          </div>
        </div>
      }

      <!-- STEP 2: Assignments -->
      @if (currentStep() === 2) {
        <div class="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-white m-0">Asignar Empleados ({{ assignments().length }})</h3>
            <p-button label="Agregar Empleados" icon="pi pi-user-plus" severity="warn" [outlined]="true" (onClick)="openEmployeeSelector()" />
          </div>

          @if (assignments().length === 0) {
            <div class="text-center py-12 text-neutral-400">
              <i class="pi pi-users text-4xl mb-3 block"></i>
              <p>No hay empleados asignados aún.</p>
            </div>
          } @else {
            <p-table [value]="assignments()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm">
              <ng-template #header>
                <tr>
                  <th>Empleado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </ng-template>
              <ng-template #body let-a>
                <tr>
                  <td>{{ a.employee?.first_name }} {{ a.employee?.father_name }}</td>
                  <td>
                    <p-tag
                      [value]="a.status === 'completed' ? 'Completada' : a.status === 'in_progress' ? 'En progreso' : 'Pendiente'"
                      [severity]="a.status === 'completed' ? 'success' : a.status === 'in_progress' ? 'info' : 'secondary'"
                    />
                  </td>
                  <td>
                    @if (a.status === 'pending') {
                      <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="removeAssignment(a)" />
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }

          <div class="flex justify-between mt-6">
            <p-button label="Anterior" icon="pi pi-arrow-left" severity="secondary" (onClick)="currentStep.set(1)" />
            <div class="flex gap-2">
              @if (!isEditing() || surveyStatus() === 'draft') {
                <p-button
                  label="Activar y Enviar"
                  icon="pi pi-send"
                  severity="success"
                  (onClick)="activateAndNotify()"
                  [loading]="saving()"
                  [disabled]="questions().length === 0 || assignments().length === 0"
                />
              }
              <p-button
                label="Guardar Borrador"
                icon="pi pi-save"
                severity="warn"
                [outlined]="true"
                (onClick)="router.navigate(['/admin/surveys'])"
              />
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Question Editor Dialog -->
    <p-dialog
      [(visible)]="showQuestionDialog"
      [header]="editingQuestion() ? 'Editar Pregunta' : 'Nueva Pregunta'"
      [modal]="true"
      [style]="{ width: '600px' }"
    >
      <div class="space-y-4 p-2">
        <div>
          <label class="block text-sm text-neutral-400 mb-1">Texto de la pregunta *</label>
          <textarea
            pTextarea
            [ngModel]="qdText()"
            (ngModelChange)="qdText.set($event)"
            [rows]="2"
            class="w-full"
            placeholder="Escribe la pregunta..."
          ></textarea>
        </div>

        <div>
          <label class="block text-sm text-neutral-400 mb-1">Tipo de pregunta *</label>
          <p-select
            [options]="questionTypeOptions"
            [ngModel]="qdType()"
            (ngModelChange)="qdType.set($event)"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecciona tipo"
            styleClass="w-full"
          />
        </div>

        <div class="flex items-center gap-3">
          <p-toggleswitch [ngModel]="qdRequired()" (ngModelChange)="qdRequired.set($event)" />
          <label class="text-sm text-neutral-300">Pregunta requerida</label>
        </div>

        <!-- Options for choice questions -->
        @if (qdType() === 'single_choice' || qdType() === 'multiple_choice') {
          <div>
            <label class="block text-sm text-neutral-400 mb-1">Opciones</label>
            @for (opt of qdOptions(); track $index; let i = $index) {
              <div class="flex gap-2 mb-2">
                <input
                  pInputText
                  [ngModel]="opt"
                  (ngModelChange)="updateOption(i, $event)"
                  class="flex-1"
                  [placeholder]="'Opción ' + (i + 1)"
                />
                <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" (onClick)="removeOptionFromDialog(i)" />
              </div>
            }
            <p-button label="Agregar opción" icon="pi pi-plus" [text]="true" severity="info" size="small" (onClick)="addOptionToDialog()" />
          </div>
        }

        <!-- Scale config -->
        @if (qdType() === 'scale') {
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-neutral-400 mb-1">Mínimo</label>
              <input pInputText type="number" [ngModel]="qdScaleMin()" (ngModelChange)="qdScaleMin.set($event)" class="w-full" />
            </div>
            <div>
              <label class="block text-sm text-neutral-400 mb-1">Máximo</label>
              <input pInputText type="number" [ngModel]="qdScaleMax()" (ngModelChange)="qdScaleMax.set($event)" class="w-full" />
            </div>
            <div>
              <label class="block text-sm text-neutral-400 mb-1">Etiqueta mínimo</label>
              <input pInputText [ngModel]="qdScaleMinLabel()" (ngModelChange)="qdScaleMinLabel.set($event)" class="w-full" placeholder="Ej: Muy en desacuerdo" />
            </div>
            <div>
              <label class="block text-sm text-neutral-400 mb-1">Etiqueta máximo</label>
              <input pInputText [ngModel]="qdScaleMaxLabel()" (ngModelChange)="qdScaleMaxLabel.set($event)" class="w-full" placeholder="Ej: Muy de acuerdo" />
            </div>
          </div>
        }
      </div>

      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" (onClick)="showQuestionDialog = false" />
        <p-button
          [label]="editingQuestion() ? 'Actualizar' : 'Agregar'"
          severity="warn"
          (onClick)="saveQuestion()"
          [loading]="saving()"
          [disabled]="!qdText() || !qdType()"
        />
      </ng-template>
    </p-dialog>

    <!-- Employee Selector Dialog -->
    <p-dialog
      [(visible)]="showEmployeeSelector"
      header="Seleccionar Empleados"
      [modal]="true"
      [style]="{ width: '500px' }"
    >
      <div class="mb-3">
        <input
          pInputText
          [ngModel]="empSearch()"
          (ngModelChange)="empSearch.set($event)"
          placeholder="Buscar empleado..."
          class="w-full"
        />
      </div>
      <div class="max-h-80 overflow-y-auto space-y-1">
        @for (emp of filteredEmployees(); track emp.id) {
          <label class="flex items-center gap-2 p-2 rounded hover:bg-neutral-700/50 cursor-pointer">
            <p-checkbox
              [ngModel]="isEmployeeSelected(emp.id)"
              (ngModelChange)="toggleEmployee(emp)"
              [binary]="true"
            />
            <span class="text-sm text-white">{{ emp.first_name }} {{ emp.father_name }}</span>
          </label>
        }
      </div>
      <ng-template #footer>
        <p-button label="Cerrar" severity="secondary" (onClick)="showEmployeeSelector = false" />
        <p-button label="Asignar Seleccionados" severity="warn" (onClick)="assignSelectedEmployees()" [loading]="saving()" />
      </ng-template>
    </p-dialog>
  `,
})
export class SurveyBuilderComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);
  private orgService = inject(OrganizationService);
  private messageService = inject(MessageService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  // State
  surveyId = signal<string | null>(null);
  isEditing = computed(() => !!this.surveyId());
  saving = signal(false);
  currentStep = signal(0);

  // Survey form signals
  surveyTitle = signal('');
  surveyDescription = signal('');
  surveyCategory = signal<string | null>(null);
  surveyDueDate = signal<Date | null>(null);
  surveyAnonymous = signal(false);
  surveyMultipleSubmissions = signal(false);
  surveyStatus = signal<string>('draft');

  // Questions
  questions = signal<SurveyQuestion[]>([]);

  // Assignments
  assignments = signal<SurveyAssignment[]>([]);

  // Dialog states
  showQuestionDialog = false;
  editingQuestion = signal<SurveyQuestion | null>(null);
  showEmployeeSelector = false;

  // Question dialog form
  qdText = signal('');
  qdType = signal<SurveyQuestionType | null>(null);
  qdRequired = signal(true);
  qdOptions = signal<string[]>(['', '']);
  qdScaleMin = signal(1);
  qdScaleMax = signal(5);
  qdScaleMinLabel = signal('');
  qdScaleMaxLabel = signal('');

  // Employee selector
  empSearch = signal('');
  selectedEmployeeIds = signal<Set<string>>(new Set());

  // Options
  categoryOptions = SURVEY_CATEGORY_OPTIONS;
  questionTypeOptions = QUESTION_TYPE_OPTIONS;

  steps = [
    { key: 'info', label: 'Información', icon: 'pi pi-info-circle' },
    { key: 'questions', label: 'Preguntas', icon: 'pi pi-list' },
    { key: 'assignments', label: 'Asignar', icon: 'pi pi-users' },
  ];

  // Employees list loaded on demand
  allEmployees = signal<SimpleEmployee[]>([]);
  employeesLoaded = signal(false);

  filteredEmployees = computed(() => {
    const employees = this.allEmployees();
    const search = this.empSearch().toLowerCase();
    if (!search) return employees;
    return employees.filter(e =>
      `${e.first_name} ${e.father_name}`.toLowerCase().includes(search)
    );
  });

  async ngOnInit() {
    const surveyId = this.route.snapshot.paramMap.get('surveyId');
    if (surveyId) {
      this.surveyId.set(surveyId);
      await this.loadSurvey(surveyId);
    }
  }

  private async loadSurvey(id: string) {
    try {
      const url = this.apiUrl.build('rest/v1/surveys', {
        id: `eq.${id}`,
        select: '*',
      });
      const surveys = await firstValueFrom(this.http.get<Survey[]>(url));
      const survey = surveys?.[0];
      if (survey) {
        this.surveyTitle.set(survey.title);
        this.surveyDescription.set(survey.description ?? '');
        this.surveyCategory.set(survey.category ?? null);
        this.surveyDueDate.set(survey.due_date ? new Date(survey.due_date) : null);
        this.surveyAnonymous.set(survey.is_anonymous);
        this.surveyMultipleSubmissions.set(survey.allow_multiple_submissions);
        this.surveyStatus.set(survey.status);
      }
      // Load questions
      const questions = await this.surveyService.getQuestions(id);
      this.questions.set(questions);
      // Load assignments
      const assignments = await this.surveyService.getAssignments(id);
      this.assignments.set(assignments);
    } catch (e) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la encuesta.' });
    }
  }

  async saveAndNext(nextStep: number) {
    if (!this.surveyTitle()) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'El título es obligatorio.' });
      return;
    }
    this.saving.set(true);
    try {
      const companyId = this.orgService.getCurrentCompanyId();
      const payload: Partial<Survey> = {
        title: this.surveyTitle(),
        description: this.surveyDescription() || undefined,
        category: this.surveyCategory() || undefined,
        due_date: this.surveyDueDate()?.toISOString().split('T')[0] ?? undefined,
        is_anonymous: this.surveyAnonymous(),
        allow_multiple_submissions: this.surveyMultipleSubmissions(),
      };

      if (this.surveyId()) {
        await this.surveyService.updateSurvey(this.surveyId()!, payload);
      } else {
        payload.company_id = companyId!;
        payload.status = 'draft';
        const created = await this.surveyService.createSurvey(payload);
        this.surveyId.set(created.id);
      }
      this.currentStep.set(nextStep);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
    } finally {
      this.saving.set(false);
    }
  }

  // Question dialog
  openQuestionDialog(question?: SurveyQuestion) {
    if (question) {
      this.editingQuestion.set(question);
      this.qdText.set(question.question_text);
      this.qdType.set(question.question_type);
      this.qdRequired.set(question.is_required);
      this.qdOptions.set(question.options?.map(o => o.option_text) ?? ['', '']);
      if (question.scale_config) {
        this.qdScaleMin.set(question.scale_config.min);
        this.qdScaleMax.set(question.scale_config.max);
        this.qdScaleMinLabel.set(question.scale_config.min_label ?? '');
        this.qdScaleMaxLabel.set(question.scale_config.max_label ?? '');
      }
    } else {
      this.editingQuestion.set(null);
      this.qdText.set('');
      this.qdType.set(null);
      this.qdRequired.set(true);
      this.qdOptions.set(['', '']);
      this.qdScaleMin.set(1);
      this.qdScaleMax.set(5);
      this.qdScaleMinLabel.set('');
      this.qdScaleMaxLabel.set('');
    }
    this.showQuestionDialog = true;
  }

  updateOption(index: number, value: string) {
    const opts = [...this.qdOptions()];
    opts[index] = value;
    this.qdOptions.set(opts);
  }

  addOptionToDialog() {
    this.qdOptions.update(opts => [...opts, '']);
  }

  removeOptionFromDialog(index: number) {
    this.qdOptions.update(opts => opts.filter((_, i) => i !== index));
  }

  async saveQuestion() {
    const surveyId = this.surveyId();
    if (!surveyId || !this.qdText() || !this.qdType()) return;

    this.saving.set(true);
    try {
      const type = this.qdType()!;
      const scaleConfig: ScaleConfig | undefined =
        type === 'scale' ? {
          min: this.qdScaleMin(),
          max: this.qdScaleMax(),
          min_label: this.qdScaleMinLabel() || undefined,
          max_label: this.qdScaleMaxLabel() || undefined,
        } : undefined;

      const editing = this.editingQuestion();
      if (editing) {
        await this.surveyService.updateQuestion(editing.id, {
          question_text: this.qdText(),
          question_type: type,
          is_required: this.qdRequired(),
          scale_config: scaleConfig as any,
        });
        // Update options if choice type
        if (type === 'single_choice' || type === 'multiple_choice') {
          // Delete old options, add new
          if (editing.options) {
            for (const opt of editing.options) {
              await this.surveyService.deleteOption(opt.id);
            }
          }
          const validOpts = this.qdOptions().filter(o => o.trim());
          for (let i = 0; i < validOpts.length; i++) {
            await this.surveyService.addOption({
              question_id: editing.id,
              option_text: validOpts[i],
              order_index: i,
            });
          }
        }
      } else {
        const question = await this.surveyService.addQuestion({
          survey_id: surveyId,
          question_text: this.qdText(),
          question_type: type,
          is_required: this.qdRequired(),
          order_index: this.questions().length,
          scale_config: scaleConfig as any,
        });
        // Add options if choice type
        if (type === 'single_choice' || type === 'multiple_choice') {
          const validOpts = this.qdOptions().filter(o => o.trim());
          for (let i = 0; i < validOpts.length; i++) {
            await this.surveyService.addOption({
              question_id: question.id,
              option_text: validOpts[i],
              order_index: i,
            });
          }
        }
      }

      // Reload questions
      const questions = await this.surveyService.getQuestions(surveyId);
      this.questions.set(questions);
      this.showQuestionDialog = false;
      this.messageService.add({ severity: 'success', summary: editing ? 'Pregunta actualizada' : 'Pregunta agregada' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la pregunta.' });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteQuestion(q: SurveyQuestion) {
    try {
      await this.surveyService.deleteQuestion(q.id);
      this.questions.update(qs => qs.filter(x => x.id !== q.id));
      this.messageService.add({ severity: 'success', summary: 'Pregunta eliminada' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error' });
    }
  }

  async moveQuestion(index: number, direction: -1 | 1) {
    const qs = [...this.questions()];
    const newIndex = index + direction;
    [qs[index], qs[newIndex]] = [qs[newIndex], qs[index]];
    this.questions.set(qs);
    // Persist order
    const reorder = qs.map((q, i) => ({ id: q.id, order_index: i }));
    await this.surveyService.reorderQuestions(reorder);
  }

  getQuestionTypeLabel(type: string): string {
    return QUESTION_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }

  getOptionsText(q: SurveyQuestion): string {
    return q.options?.map(o => o.option_text).join(', ') ?? '';
  }

  async openEmployeeSelector() {
    this.showEmployeeSelector = true;
    await this.loadEmployees();
  }

  // Employee loading
  async loadEmployees() {
    if (this.employeesLoaded()) return;
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        company_id: `eq.${companyId}`,
        is_active: 'eq.true',
        select: 'id,first_name,father_name',
        order: 'first_name.asc',
      });
      const employees = await firstValueFrom(this.http.get<SimpleEmployee[]>(url));
      this.allEmployees.set(employees ?? []);
      this.employeesLoaded.set(true);
    } catch (e) {
      console.error('Error loading employees:', e);
    }
  }

  // Employee selector
  isEmployeeSelected(empId: string): boolean {
    return this.selectedEmployeeIds().has(empId);
  }

  toggleEmployee(emp: SimpleEmployee) {
    this.selectedEmployeeIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(emp.id)) {
        newSet.delete(emp.id);
      } else {
        newSet.add(emp.id);
      }
      return newSet;
    });
  }

  async assignSelectedEmployees() {
    const surveyId = this.surveyId();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!surveyId || !companyId) return;

    const ids = Array.from(this.selectedEmployeeIds());
    if (ids.length === 0) return;

    this.saving.set(true);
    try {
      await this.surveyService.assignEmployees(surveyId, ids, companyId);
      const assignments = await this.surveyService.getAssignments(surveyId);
      this.assignments.set(assignments);
      this.selectedEmployeeIds.set(new Set());
      this.showEmployeeSelector = false;
      this.messageService.add({ severity: 'success', summary: `${ids.length} empleado(s) asignado(s)` });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo asignar empleados.' });
    } finally {
      this.saving.set(false);
    }
  }

  async removeAssignment(a: SurveyAssignment) {
    try {
      await this.surveyService.removeAssignment(a.id);
      this.assignments.update(list => list.filter(x => x.id !== a.id));
      this.messageService.add({ severity: 'success', summary: 'Asignación eliminada' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error' });
    }
  }

  async activateAndNotify() {
    const surveyId = this.surveyId();
    const companyId = this.orgService.getCurrentCompanyId();
    if (!surveyId || !companyId) return;

    this.saving.set(true);
    try {
      await this.surveyService.activateSurvey(surveyId);
      const employeeIds = this.assignments().map(a => a.employee_id);
      if (employeeIds.length > 0) {
        await this.surveyService.notifyEmployeesOfSurvey(
          surveyId,
          this.surveyTitle(),
          employeeIds,
          companyId
        );
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Encuesta activada',
        detail: `Se notificó a ${employeeIds.length} empleado(s).`,
      });
      this.router.navigate(['/admin/surveys']);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo activar.' });
    } finally {
      this.saving.set(false);
    }
  }
}
