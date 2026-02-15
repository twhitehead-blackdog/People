import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { endOfDay } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import {
  AuditAnswer,
  AuditEvaluation,
  AuditForm,
  PerformanceRule,
} from '../models';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root',
})
export class Performance360Service {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  // Cache de reglas (se cargan al inicio)
  private rules = signal<PerformanceRule[]>([]);

  // Recursos HTTP

  // Formularios activos con su última versión
  activeFormsResource = httpResource<AuditForm[]>(() => {
    const url = this.apiUrl.build('rest/v1/audit_forms', {
      is_active: 'eq.true',
      select: '*,sections:audit_sections(*,questions:audit_questions(*))',
    });
    console.log('[Performance360Service] activeFormsResource URL:', url);
    return { url, method: 'GET' };
  });

  // Reglas de rendimiento
  rulesResource = httpResource<PerformanceRule[]>(() => {
    const url = this.apiUrl.build('rest/v1/performance_rules', {
      select: 'id,name,min_score,max_score,multiplier,severity',
      order: 'min_score.asc',
    });
    console.log('[Performance360Service] rulesResource URL:', url);
    return { url, method: 'GET' };
  });

  constructor() {}

  // ==========================================
  // VIEW METHODS (Lectura)
  // ==========================================

  getEvaluations(filters?: {
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    // Construir URL base
    let url = this.apiUrl.build('rest/v1/audit_evaluations', {
      select:
        '*,audit_form:audit_forms(title,business_unit),auditor:employees!audit_evaluations_audited_by_fkey(first_name,father_name),branch:branches(name)',
      order: 'created_at.desc',
    });

    // Agregar filtros manualmente para soportar múltiples condiciones en la misma columna
    const queryParams: string[] = [];

    if (filters?.branchId) {
      queryParams.push(`branch_id=eq.${filters.branchId}`);
    }

    if (filters?.startDate) {
      // created_at >= startDate (inicio del día)
      queryParams.push(`created_at=gte.${filters.startDate.toISOString()}`);
    }

    if (filters?.endDate) {
      // created_at <= endDate (final del día ajustable o tal cual viene)
      // Ajustamos al final del día si viene sin hora, pero supongamos gestión externa
      // Usualmente para rango inclusivo se usa lte.
      const end = endOfDay(new Date(filters.endDate));
      queryParams.push(`created_at=lte.${end.toISOString()}`);
    }

    if (queryParams.length > 0) {
      url += '&' + queryParams.join('&');
    }

    return this.http.get<AuditEvaluation[]>(url);
  }

  getEvaluationById(id: string) {
    const url = this.apiUrl.build('rest/v1/audit_evaluations', {
      id: `eq.${id}`,
      select:
        '*,audit_form:audit_forms(*,sections:audit_sections(*,questions:audit_questions(*))),answers:audit_answers(*),auditor:employees!audit_evaluations_audited_by_fkey(first_name,father_name),branch:branches(name)',
    });
    return this.http.get<AuditEvaluation[]>(url);
  }

  // ==========================================
  // TRANSACTIONAL METHODS (Escritura)
  // ==========================================

  async createEvaluation(
    branchId: string,
    formId: string,
    formVersion: number,
    auditorId: string,
    companyId: string
  ): Promise<AuditEvaluation> {
    const payload = {
      company_id: companyId,
      branch_id: branchId,
      audit_form_id: formId,
      form_version: formVersion, // Versionado crítico
      audited_by: auditorId,
      status: 'draft',
    };

    const url = this.apiUrl.build('rest/v1/audit_evaluations');

    // Usar firstValueFrom para promesas
    // Supabase devuelve un array cuando se usa Prefer: return=representation
    const result = await firstValueFrom(
      this.http.post<AuditEvaluation[]>(url, payload, {
        headers: { Prefer: 'return=representation' },
      })
    );
    // Tomar el primer elemento del array
    return Array.isArray(result) ? result[0] : result;
  }

  async saveFullEvaluation(
    evaluationId: string,
    answers: Partial<AuditAnswer>[],
    status: 'draft' | 'completed' = 'draft',
    observations?: string
  ) {
    // 1. Calcular score final (si es completed)
    let updatePayload: any = { status, observations };

    if (status === 'completed') {
      const { score, level } = this.calculateScore(answers);
      updatePayload.total_score = score;
      updatePayload.performance_level = level;
      updatePayload.completed_at = new Date().toISOString();
    }

    // 2. Actualizar cabecera
    const updateUrl = this.apiUrl.build('rest/v1/audit_evaluations', {
      id: `eq.${evaluationId}`,
    });
    await firstValueFrom(this.http.patch(updateUrl, updatePayload));

    // 3. Upsert respuestas (Manejo optimizado: borrar e insertar o upsert por ID)
    if (answers.length > 0) {
      const answersPayload = answers.map((a) => ({
        ...a,
        audit_evaluation_id: evaluationId,
      }));

      const answersUrl = this.apiUrl.build('rest/v1/audit_answers');
      await firstValueFrom(
        this.http.post(
          answersUrl,
          answersPayload,
          { headers: { Prefer: 'resolution=merge-duplicates' } } // Upsert
        )
      );
    }

    return true;
  }

  // ==========================================
  // CALCULATION ENGINE
  // ==========================================

  /**
   * Calcula el puntaje en tiempo real basado en las respuestas y el formulario.
   *
   * Lógica de cálculo:
   * 1. Para cada sección, calcular el % de cumplimiento (excluyendo NA).
   * 2. Multiplicar el % de cumplimiento por el peso de la sección.
   * 3. Sumar todos los puntajes ponderados.
   * 4. Re-normalizar si hay secciones completas en NA.
   * 5. Determinar el nivel según performance_rules.
   */
  calculateScoreWithForm(
    answers: Map<string, { value: 'yes' | 'no' | 'na' | null; notes: string }>,
    form: AuditForm
  ): {
    score: number;
    level: string;
    levelColor: string;
    sectionScores: {
      sectionId: string;
      title: string;
      score: number;
      weight: number;
    }[];
  } {
    if (!form?.sections || answers.size === 0) {
      return {
        score: 0,
        level: 'Sin datos',
        levelColor: 'secondary',
        sectionScores: [],
      };
    }

    const sectionScores: {
      sectionId: string;
      title: string;
      score: number;
      weight: number;
    }[] = [];
    let totalWeightActive = 0; // Peso total de secciones con al menos una respuesta aplicable
    let totalWeightedScore = 0;

    for (const section of form.sections) {
      const sectionWeight = section.weight_percentage; // ej: 30
      const questions = section.questions || [];

      if (questions.length === 0) continue;

      let applicableQuestions = 0;
      let yesCount = 0;
      let totalRelativeWeight = 0;
      let earnedRelativeWeight = 0;

      for (const question of questions) {
        const answer = answers.get(question.id);
        if (!answer || answer.value === null) continue;

        // NA no cuenta para el cálculo
        if (answer.value === 'na') continue;

        applicableQuestions++;
        totalRelativeWeight += question.weight_relative;

        if (answer.value === 'yes') {
          yesCount++;
          earnedRelativeWeight += question.weight_relative;
        }
      }

      // Si todas las preguntas son NA o sin respuesta, la sección no cuenta
      if (applicableQuestions === 0 || totalRelativeWeight === 0) {
        sectionScores.push({
          sectionId: section.id,
          title: section.title,
          score: -1, // Indica "No Aplica"
          weight: sectionWeight,
        });
        continue;
      }

      // Calcular % de cumplimiento de la sección (0-100)
      const sectionScore = Math.round(
        (earnedRelativeWeight / totalRelativeWeight) * 100
      );

      sectionScores.push({
        sectionId: section.id,
        title: section.title,
        score: sectionScore,
        weight: sectionWeight,
      });

      // Acumular para el cálculo global
      totalWeightActive += sectionWeight;
      totalWeightedScore += sectionScore * (sectionWeight / 100);
    }

    // Calcular puntaje global
    let globalScore = 0;
    if (totalWeightActive > 0) {
      // Re-normalizar si no todas las secciones aplican
      // Ej: Si solo aplican secciones con peso 70%, el 100% real es sobre esos 70%
      globalScore = Math.round((totalWeightedScore / totalWeightActive) * 100);
    }

    // Determinar nivel según las reglas
    const levelInfo = this.getLevel(globalScore);

    return {
      score: globalScore,
      level: levelInfo.name,
      levelColor: levelInfo.color,
      sectionScores,
    };
  }

  /**
   * Versión simplificada para el backend (sin acceso al form completo).
   * Usa los snapshots guardados en las respuestas.
   */
  calculateScore(answers: Partial<AuditAnswer>[]): {
    score: number;
    level: string;
  } {
    if (!answers || answers.length === 0) {
      return { score: 0, level: 'Sin datos' };
    }

    // Calcular simple: % de 'yes' sobre el total aplicable
    const applicable = answers.filter(
      (a) => a.answer_value && a.answer_value !== 'na'
    );
    if (applicable.length === 0) {
      return { score: 0, level: 'N/A' };
    }

    const yesCount = applicable.filter((a) => a.answer_value === 'yes').length;
    const score = Math.round((yesCount / applicable.length) * 100);

    const levelInfo = this.getLevel(score);
    return { score, level: levelInfo.name };
  }

  /**
   * Helper para obtener el nivel (Critico/Moderado/Aceptable) y color
   */
  getLevel(score: number): { name: string; color: string } {
    const rules = this.rulesResource.value() || [];

    // Ordenar por min_score para encontrar el rango correcto
    const sortedRules = [...rules].sort((a, b) => a.min_score - b.min_score);

    for (const rule of sortedRules) {
      if (score >= rule.min_score && score <= rule.max_score) {
        return { name: rule.name, color: rule.severity };
      }
    }

    // Fallback si no hay reglas cargadas
    if (score >= 81) return { name: 'Aceptable', color: 'success' };
    if (score >= 61) return { name: 'Moderado', color: 'warn' };
    return { name: 'Crítico', color: 'danger' };
  }
}
