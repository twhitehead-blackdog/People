import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Survey,
  SurveyQuestion,
  SurveyQuestionOption,
  SurveyAssignment,
  SurveyResponse,
  SurveyResponseAnswer,
  SurveyStatus,
} from '../models';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  /** Signal to trigger resource refresh */
  refreshTrigger = signal(0);

  /** Signal for filtering surveys by status */
  statusFilter = signal<SurveyStatus | ''>('');

  // ==========================================
  // HTTP RESOURCES (Lectura reactiva)
  // ==========================================

  /** All surveys for the company (HR dashboard) */
  surveysResource = httpResource<Survey[]>(() => {
    this.refreshTrigger();
    const params: Record<string, string> = {
      select: '*,creator:employees!surveys_created_by_fkey(first_name,father_name)',
      order: 'created_at.desc',
    };
    const status = this.statusFilter();
    if (status) {
      params['status'] = `eq.${status}`;
    }
    return { url: this.apiUrl.build('rest/v1/surveys', params), method: 'GET' };
  });

  // ==========================================
  // SURVEY CRUD
  // ==========================================

  async createSurvey(data: Partial<Survey>): Promise<Survey> {
    const url = this.apiUrl.build('rest/v1/surveys');
    const result = await firstValueFrom(
      this.http.post<Survey[]>(url, data, {
        headers: { Prefer: 'return=representation' },
      })
    );
    this.refresh();
    return Array.isArray(result) ? result[0] : result;
  }

  async updateSurvey(id: string, data: Partial<Survey>): Promise<void> {
    const url = this.apiUrl.build('rest/v1/surveys', { id: `eq.${id}` });
    await firstValueFrom(this.http.patch(url, data));
    this.refresh();
  }

  async deleteSurvey(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/surveys', { id: `eq.${id}` });
    await firstValueFrom(this.http.delete(url));
    this.refresh();
  }

  async activateSurvey(id: string): Promise<void> {
    await this.updateSurvey(id, {
      status: 'active',
      activated_at: new Date().toISOString(),
    });
  }

  async closeSurvey(id: string): Promise<void> {
    await this.updateSurvey(id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
    });
  }

  // ==========================================
  // QUESTIONS CRUD
  // ==========================================

  async getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    const url = this.apiUrl.build('rest/v1/survey_questions', {
      survey_id: `eq.${surveyId}`,
      select: '*,options:survey_question_options(*)' ,
      order: 'order_index.asc',
    });
    return firstValueFrom(this.http.get<SurveyQuestion[]>(url));
  }

  async addQuestion(data: Partial<SurveyQuestion>): Promise<SurveyQuestion> {
    const url = this.apiUrl.build('rest/v1/survey_questions');
    const result = await firstValueFrom(
      this.http.post<SurveyQuestion[]>(url, data, {
        headers: { Prefer: 'return=representation' },
      })
    );
    return Array.isArray(result) ? result[0] : result;
  }

  async updateQuestion(id: string, data: Partial<SurveyQuestion>): Promise<void> {
    const url = this.apiUrl.build('rest/v1/survey_questions', { id: `eq.${id}` });
    await firstValueFrom(this.http.patch(url, data));
  }

  async deleteQuestion(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/survey_questions', { id: `eq.${id}` });
    await firstValueFrom(this.http.delete(url));
  }

  async reorderQuestions(questions: { id: string; order_index: number }[]): Promise<void> {
    for (const q of questions) {
      const url = this.apiUrl.build('rest/v1/survey_questions', { id: `eq.${q.id}` });
      await firstValueFrom(this.http.patch(url, { order_index: q.order_index }));
    }
  }

  // ==========================================
  // QUESTION OPTIONS CRUD
  // ==========================================

  async addOption(data: Partial<SurveyQuestionOption>): Promise<SurveyQuestionOption> {
    const url = this.apiUrl.build('rest/v1/survey_question_options');
    const result = await firstValueFrom(
      this.http.post<SurveyQuestionOption[]>(url, data, {
        headers: { Prefer: 'return=representation' },
      })
    );
    return Array.isArray(result) ? result[0] : result;
  }

  async updateOption(id: string, data: Partial<SurveyQuestionOption>): Promise<void> {
    const url = this.apiUrl.build('rest/v1/survey_question_options', { id: `eq.${id}` });
    await firstValueFrom(this.http.patch(url, data));
  }

  async deleteOption(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/survey_question_options', { id: `eq.${id}` });
    await firstValueFrom(this.http.delete(url));
  }

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  async getAssignments(surveyId: string): Promise<SurveyAssignment[]> {
    const url = this.apiUrl.build('rest/v1/survey_assignments', {
      survey_id: `eq.${surveyId}`,
      select: '*,employee:employees(first_name,father_name)',
      order: 'assigned_at.desc',
    });
    return firstValueFrom(this.http.get<SurveyAssignment[]>(url));
  }

  async assignEmployees(surveyId: string, employeeIds: string[], companyId: string): Promise<void> {
    const payload = employeeIds.map(empId => ({
      survey_id: surveyId,
      employee_id: empId,
      company_id: companyId,
      status: 'pending',
    }));
    const url = this.apiUrl.build('rest/v1/survey_assignments');
    await firstValueFrom(
      this.http.post(url, payload, {
        headers: { Prefer: 'resolution=merge-duplicates' },
      })
    );
  }

  async removeAssignment(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/survey_assignments', { id: `eq.${id}` });
    await firstValueFrom(this.http.delete(url));
  }

  async getAssignmentCounts(surveyId: string): Promise<{ total: number; completed: number }> {
    const url = this.apiUrl.build('rest/v1/survey_assignments', {
      survey_id: `eq.${surveyId}`,
      select: 'id,status',
    });
    const assignments = await firstValueFrom(this.http.get<SurveyAssignment[]>(url));
    return {
      total: assignments.length,
      completed: assignments.filter(a => a.status === 'completed').length,
    };
  }

  // ==========================================
  // PORTAL: Encuestas del empleado
  // ==========================================

  async getPendingSurveysForEmployee(employeeId: string): Promise<SurveyAssignment[]> {
    const url = this.apiUrl.build('rest/v1/survey_assignments', {
      employee_id: `eq.${employeeId}`,
      status: 'neq.completed',
      select: '*,survey:surveys(*,questions:survey_questions(*,options:survey_question_options(*)))',
      order: 'assigned_at.desc',
    });
    return firstValueFrom(this.http.get<SurveyAssignment[]>(url));
  }

  async getCompletedSurveysForEmployee(employeeId: string): Promise<SurveyAssignment[]> {
    const url = this.apiUrl.build('rest/v1/survey_assignments', {
      employee_id: `eq.${employeeId}`,
      status: 'eq.completed',
      select: '*,survey:surveys(id,title,category,is_anonymous)',
      order: 'completed_at.desc',
    });
    return firstValueFrom(this.http.get<SurveyAssignment[]>(url));
  }

  // ==========================================
  // RESPONSES: Submit y Resultados
  // ==========================================

  async submitSurveyResponse(
    surveyId: string,
    employeeId: string,
    companyId: string,
    answers: { question_id: string; answer_text?: string; answer_numeric?: number; selected_option_ids?: string[] }[]
  ): Promise<void> {
    // 1. Create response
    const responseUrl = this.apiUrl.build('rest/v1/survey_responses');
    const responseResult = await firstValueFrom(
      this.http.post<SurveyResponse[]>(responseUrl, {
        survey_id: surveyId,
        employee_id: employeeId,
        company_id: companyId,
      }, {
        headers: { Prefer: 'return=representation' },
      })
    );
    const response = Array.isArray(responseResult) ? responseResult[0] : responseResult;

    // 2. Insert answers
    if (answers.length > 0) {
      const answersPayload = answers.map(a => ({
        response_id: response.id,
        question_id: a.question_id,
        answer_text: a.answer_text || null,
        answer_numeric: a.answer_numeric ?? null,
        selected_option_ids: a.selected_option_ids || null,
      }));
      const answersUrl = this.apiUrl.build('rest/v1/survey_response_answers');
      await firstValueFrom(this.http.post(answersUrl, answersPayload));
    }

    // 3. Mark assignment as completed
    const assignmentUrl = this.apiUrl.build('rest/v1/survey_assignments', {
      survey_id: `eq.${surveyId}`,
      employee_id: `eq.${employeeId}`,
    });
    await firstValueFrom(
      this.http.patch(assignmentUrl, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
    );
  }

  async getResponsesForSurvey(surveyId: string): Promise<SurveyResponse[]> {
    const url = this.apiUrl.build('rest/v1/survey_responses', {
      survey_id: `eq.${surveyId}`,
      select: '*,answers:survey_response_answers(*),employee:employees(first_name,father_name)',
      order: 'submitted_at.desc',
    });
    return firstValueFrom(this.http.get<SurveyResponse[]>(url));
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  async notifyEmployeesOfSurvey(
    surveyId: string,
    surveyTitle: string,
    employeeIds: string[],
    companyId: string
  ): Promise<void> {
    const messages = employeeIds.map(empId => ({
      employee_id: empId,
      title: 'Nueva encuesta asignada',
      message: `Se te ha asignado la encuesta: "${surveyTitle}". Por favor complétala desde tu portal.`,
      message_type: 'survey_assigned',
      related_type: 'survey',
      related_id: surveyId,
      is_read: false,
    }));
    const url = this.apiUrl.build('rest/v1/hr_messages');
    await firstValueFrom(this.http.post(url, messages));

    // Mark as notified
    const assignUrl = this.apiUrl.build('rest/v1/survey_assignments', {
      survey_id: `eq.${surveyId}`,
      employee_id: `in.(${employeeIds.join(',')})`,
    });
    await firstValueFrom(this.http.patch(assignUrl, { notified: true }));
  }

  // ==========================================
  // DUPLICATE
  // ==========================================

  async duplicateSurvey(surveyId: string, companyId: string): Promise<Survey> {
    // 1. Load original survey
    const surveyUrl = this.apiUrl.build('rest/v1/surveys', {
      id: `eq.${surveyId}`,
      select: '*',
    });
    const surveys = await firstValueFrom(this.http.get<Survey[]>(surveyUrl));
    const original = surveys?.[0];
    if (!original) throw new Error('Survey not found');

    // 2. Create new survey as draft
    const newSurvey = await this.createSurvey({
      company_id: companyId,
      title: `${original.title} (Copia)`,
      description: original.description,
      category: original.category,
      is_anonymous: original.is_anonymous,
      allow_multiple_submissions: original.allow_multiple_submissions,
      due_date: original.due_date,
      status: 'draft',
    });

    // 3. Load questions with options
    const questions = await this.getQuestions(surveyId);

    // 4. Copy each question and its options
    for (const q of questions) {
      const newQuestion = await this.addQuestion({
        survey_id: newSurvey.id,
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: q.is_required,
        order_index: q.order_index,
        scale_config: q.scale_config as any,
      });
      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          await this.addOption({
            question_id: newQuestion.id,
            option_text: opt.option_text,
            order_index: opt.order_index,
          });
        }
      }
    }

    this.refresh();
    return newSurvey;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  refresh(): void {
    this.refreshTrigger.update(v => v + 1);
  }
}
