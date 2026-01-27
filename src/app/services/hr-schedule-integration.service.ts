import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CompensatoryRequest,
  EmployeeDisability,
  EmployeeSchedule,
  EmployeeVacation,
  TimeoffCategory,
} from '../models';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

/**
 * Tipo de solicitud HR que puede afectar horarios
 */
export type HRRequestType = 'vacation' | 'disability' | 'compensatory';

/**
 * Resultado de aplicar una solicitud HR a horarios
 */
export interface ApplyHRRequestResult {
  success: boolean;
  affectedDays: number;
  scheduleIds: string[];
  error?: string;
}

/**
 * Servicio para integrar solicitudes HR (Vacaciones, Incapacidades, Compensatorios)
 * con los horarios de empleados.
 *
 * PRINCIPIOS:
 * - NO elimina registros existentes de employee_schedules
 * - Preserva historial y auditabilidad
 * - Si existe horario para fecha, lo marca/ajusta
 * - Si no existe horario, crea uno nuevo marcado con la solicitud
 * - Mantiene referencia a la solicitud HR que causó el cambio
 */
@Injectable({
  providedIn: 'root',
})
export class HRScheduleIntegrationService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

  /**
   * Aplica una solicitud de vacaciones aprobada a los horarios del empleado.
   *
   * Para cada día en el rango:
   * - Si existe horario: lo marca como timeoff y preserva el original
   * - Si no existe horario: crea uno marcado como timeoff
   */
  async applyVacationToSchedules(
    vacation: EmployeeVacation,
    modifiedBy?: string,
    notes?: string
  ): Promise<ApplyHRRequestResult> {
    return this.applyTimeoffToSchedules(
      vacation.employee_id,
      vacation.start_date,
      vacation.end_date,
      'VACACIONES',
      vacation.id,
      'vacation',
      modifiedBy,
      notes
    );
  }

  /**
   * Aplica una solicitud de incapacidad aprobada a los horarios del empleado.
   *
   * Para cada día en el rango:
   * - Si existe horario: lo marca como timeoff y preserva el original
   * - Si no existe horario: crea uno marcado como timeoff
   */
  async applyDisabilityToSchedules(
    disability: EmployeeDisability,
    modifiedBy?: string,
    notes?: string
  ): Promise<ApplyHRRequestResult> {
    return this.applyTimeoffToSchedules(
      disability.employee_id,
      disability.start_date,
      disability.end_date,
      'INCAPACIDAD',
      disability.id,
      'disability',
      modifiedBy,
      notes
    );
  }

  /**
   * Aplica una solicitud de compensatorio aprobada a los horarios del empleado.
   *
   * Para cada día en el rango:
   * - Si existe horario: lo marca como compensatorio y preserva el original
   * - Si no existe horario: crea uno nuevo marcado como compensatorio
   */
  async applyCompensatoryToSchedules(
    compensatory: CompensatoryRequest,
    modifiedBy?: string,
    notes?: string
  ): Promise<ApplyHRRequestResult> {
    const employeeId = compensatory.employee_id;
    const startDate = this.toDateString(compensatory.date_from);
    const endDate = this.toDateString(compensatory.date_to);

    try {
      // Obtener todos los días en el rango
      const days = this.getDaysInRange(startDate, endDate);
      const affectedIds: string[] = [];

      for (const day of days) {
        // Buscar si existe horario para este día
        const existingSchedule = await this.getScheduleForDate(employeeId, day);

        if (existingSchedule) {
          // Actualizar horario existente
          const updateUrl = this.apiUrl.build(
            `rest/v1/employee_schedules?id=eq.${existingSchedule.id}`
          );

          await firstValueFrom(
            this.http.patch(
              updateUrl,
              {
                is_compensatory: true,
                compensatory_request_id: compensatory.id,
                original_schedule_id: existingSchedule.original_schedule_id || existingSchedule.schedule_id,
                hr_request_notes: notes || null,
                modified_by: modifiedBy || null,
                hr_modified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                headers: { Prefer: 'return=minimal' },
              }
            )
          );

          affectedIds.push(existingSchedule.id);
        } else {
          // Crear nuevo horario marcado como compensatorio
          const newSchedule = await this.createCompensatorySchedule(
            employeeId,
            day,
            compensatory.id,
            modifiedBy,
            notes
          );

          if (newSchedule) {
            affectedIds.push(newSchedule.id);
          }
        }
      }

      return {
        success: true,
        affectedDays: affectedIds.length,
        scheduleIds: affectedIds,
      };
    } catch (error) {
      console.error('Error applying compensatory to schedules:', error);
      return {
        success: false,
        affectedDays: 0,
        scheduleIds: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Revierte los cambios aplicados por una solicitud HR específica.
   *
   * Restaura el schedule_id original si fue preservado y limpia
   * los campos de tracking HR.
   */
  async revertHRChanges(
    employeeId: string,
    requestId: string,
    requestType: HRRequestType
  ): Promise<ApplyHRRequestResult> {
    try {
      // Construir el filtro según el tipo de request
      let filterField: string;
      switch (requestType) {
        case 'vacation':
          filterField = 'vacation_request_id';
          break;
        case 'disability':
          filterField = 'disability_request_id';
          break;
        case 'compensatory':
          filterField = 'compensatory_request_id';
          break;
      }

      // Obtener horarios afectados por esta solicitud
      const affectedUrl = this.apiUrl.build('rest/v1/employee_schedules', {
        employee_id: `eq.${employeeId}`,
        [filterField]: `eq.${requestId}`,
        select: 'id,original_schedule_id',
      });

      const affected = await firstValueFrom(
        this.http.get<{ id: string; original_schedule_id?: string }[]>(affectedUrl)
      );

      if (!affected || affected.length === 0) {
        return {
          success: true,
          affectedDays: 0,
          scheduleIds: [],
        };
      }

      const revertedIds: string[] = [];

      // Revertir cada horario
      for (const schedule of affected) {
        const updateUrl = this.apiUrl.build(
          `rest/v1/employee_schedules?id=eq.${schedule.id}`
        );

        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Limpiar campos según el tipo
        if (requestType === 'vacation') {
          updatePayload.is_timeoff = false;
          updatePayload.timeoff_type = null;
          updatePayload.vacation_request_id = null;
        } else if (requestType === 'disability') {
          updatePayload.is_timeoff = false;
          updatePayload.timeoff_type = null;
          updatePayload.disability_request_id = null;
        } else if (requestType === 'compensatory') {
          updatePayload.is_compensatory = false;
          updatePayload.compensatory_request_id = null;
        }

        // Restaurar schedule_id original si existe
        if (schedule.original_schedule_id) {
          updatePayload.schedule_id = schedule.original_schedule_id;
          updatePayload.original_schedule_id = null;
        }

        // Limpiar campos de auditoría HR
        updatePayload.hr_request_notes = null;
        updatePayload.hr_modified_at = null;

        await firstValueFrom(
          this.http.patch(updateUrl, updatePayload, {
            headers: { Prefer: 'return=minimal' },
          })
        );

        revertedIds.push(schedule.id);
      }

      return {
        success: true,
        affectedDays: revertedIds.length,
        scheduleIds: revertedIds,
      };
    } catch (error) {
      console.error('Error reverting HR changes:', error);
      return {
        success: false,
        affectedDays: 0,
        scheduleIds: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verifica si una solicitud HR ya fue aplicada a los horarios.
   */
  async isRequestApplied(
    employeeId: string,
    requestId: string,
    requestType: HRRequestType
  ): Promise<boolean> {
    let filterField: string;
    switch (requestType) {
      case 'vacation':
        filterField = 'vacation_request_id';
        break;
      case 'disability':
        filterField = 'disability_request_id';
        break;
      case 'compensatory':
        filterField = 'compensatory_request_id';
        break;
    }

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      [filterField]: `eq.${requestId}`,
      select: 'id',
      limit: '1',
    });

    const result = await firstValueFrom(this.http.get<{ id: string }[]>(url));
    return result && result.length > 0;
  }

  /**
   * Obtiene los horarios de un empleado afectados por solicitudes HR
   * en un rango de fechas.
   */
  async getSchedulesWithHRTracking(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<EmployeeSchedule[]> {
    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      or: `(and(start_date.lte.${endDate},end_date.gte.${startDate}))`,
      select: `
        *,
        schedule:schedules!employee_schedules_schedule_id_fkey(*),
        original_schedule:schedules!employee_schedules_original_schedule_id_fkey(*)
      `.replace(/\s+/g, ''),
    });

    const schedules = await firstValueFrom(
      this.http.get<EmployeeSchedule[]>(url)
    );

    return schedules || [];
  }

  // ===== Métodos privados =====

  /**
   * Método interno para aplicar timeoff (vacaciones/incapacidades) a horarios.
   */
  private async applyTimeoffToSchedules(
    employeeId: string,
    startDate: Date | string,
    endDate: Date | string,
    timeoffType: TimeoffCategory,
    requestId: string,
    requestType: 'vacation' | 'disability',
    modifiedBy?: string,
    notes?: string
  ): Promise<ApplyHRRequestResult> {
    const start = this.toDateString(startDate);
    const end = this.toDateString(endDate);

    try {
      // Obtener todos los días en el rango
      const days = this.getDaysInRange(start, end);
      const affectedIds: string[] = [];

      for (const day of days) {
        // Buscar si existe horario para este día
        const existingSchedule = await this.getScheduleForDate(employeeId, day);

        if (existingSchedule) {
          // Actualizar horario existente
          const updateUrl = this.apiUrl.build(
            `rest/v1/employee_schedules?id=eq.${existingSchedule.id}`
          );

          const updatePayload: Record<string, unknown> = {
            is_timeoff: true,
            timeoff_type: timeoffType,
            original_schedule_id: existingSchedule.original_schedule_id || existingSchedule.schedule_id,
            hr_request_notes: notes || null,
            modified_by: modifiedBy || null,
            hr_modified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Agregar referencia según tipo
          if (requestType === 'vacation') {
            updatePayload.vacation_request_id = requestId;
          } else {
            updatePayload.disability_request_id = requestId;
          }

          await firstValueFrom(
            this.http.patch(updateUrl, updatePayload, {
              headers: { Prefer: 'return=minimal' },
            })
          );

          affectedIds.push(existingSchedule.id);
        } else {
          // Crear nuevo horario marcado como timeoff
          const newSchedule = await this.createTimeoffSchedule(
            employeeId,
            day,
            timeoffType,
            requestId,
            requestType,
            modifiedBy,
            notes
          );

          if (newSchedule) {
            affectedIds.push(newSchedule.id);
          }
        }
      }

      return {
        success: true,
        affectedDays: affectedIds.length,
        scheduleIds: affectedIds,
      };
    } catch (error) {
      console.error('Error applying timeoff to schedules:', error);
      return {
        success: false,
        affectedDays: 0,
        scheduleIds: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Crea un nuevo registro de horario marcado como compensatorio.
   */
  private async createCompensatorySchedule(
    employeeId: string,
    date: string,
    requestId: string,
    modifiedBy?: string,
    notes?: string
  ): Promise<{ id: string } | null> {
    // Obtener un schedule de día libre para usar
    const dayOffSchedule = await this.getDayOffSchedule();
    if (!dayOffSchedule) {
      console.warn('No day-off schedule found, cannot create compensatory entry');
      return null;
    }

    const companyId = this.organizationService.getCurrentCompanyId();

    const payload: Record<string, unknown> = {
      employee_id: employeeId,
      schedule_id: dayOffSchedule.id,
      start_date: date,
      end_date: date,
      approved: true,
      approved_at: new Date().toISOString(),
      is_compensatory: true,
      compensatory_request_id: requestId,
      hr_request_notes: notes || null,
      modified_by: modifiedBy || null,
      hr_modified_at: new Date().toISOString(),
      company_id: companyId,
    };

    const url = this.apiUrl.build('rest/v1/employee_schedules');

    const result = await firstValueFrom(
      this.http.post<{ id: string }[]>(url, payload, {
        headers: { Prefer: 'return=representation' },
      })
    );

    return result?.[0] || null;
  }

  /**
   * Crea un nuevo registro de horario marcado como timeoff.
   */
  private async createTimeoffSchedule(
    employeeId: string,
    date: string,
    timeoffType: TimeoffCategory,
    requestId: string,
    requestType: 'vacation' | 'disability',
    modifiedBy?: string,
    notes?: string
  ): Promise<{ id: string } | null> {
    // Obtener un schedule de día libre para usar
    const dayOffSchedule = await this.getDayOffSchedule();
    if (!dayOffSchedule) {
      console.warn('No day-off schedule found, cannot create timeoff entry');
      return null;
    }

    const companyId = this.organizationService.getCurrentCompanyId();

    const payload: Record<string, unknown> = {
      employee_id: employeeId,
      schedule_id: dayOffSchedule.id,
      start_date: date,
      end_date: date,
      approved: true,
      approved_at: new Date().toISOString(),
      is_timeoff: true,
      timeoff_type: timeoffType,
      hr_request_notes: notes || null,
      modified_by: modifiedBy || null,
      hr_modified_at: new Date().toISOString(),
      company_id: companyId,
    };

    if (requestType === 'vacation') {
      payload.vacation_request_id = requestId;
    } else {
      payload.disability_request_id = requestId;
    }

    const url = this.apiUrl.build('rest/v1/employee_schedules');

    const result = await firstValueFrom(
      this.http.post<{ id: string }[]>(url, payload, {
        headers: { Prefer: 'return=representation' },
      })
    );

    return result?.[0] || null;
  }

  /**
   * Obtiene el horario de un empleado para una fecha específica.
   */
  private async getScheduleForDate(
    employeeId: string,
    date: string
  ): Promise<EmployeeSchedule | null> {
    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      start_date: `lte.${date}`,
      end_date: `gte.${date}`,
      select: 'id,schedule_id,original_schedule_id',
      limit: '1',
    });

    const result = await firstValueFrom(
      this.http.get<EmployeeSchedule[]>(url)
    );

    return result?.[0] || null;
  }

  /**
   * Obtiene los horarios de un empleado en un rango de fechas.
   */
  private async getSchedulesInRange(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<EmployeeSchedule[]> {
    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      employee_id: `eq.${employeeId}`,
      or: `(and(start_date.lte.${endDate},end_date.gte.${startDate}))`,
      select: 'id,schedule_id,original_schedule_id,start_date,end_date',
    });

    const result = await firstValueFrom(
      this.http.get<EmployeeSchedule[]>(url)
    );

    return result || [];
  }

  /**
   * Obtiene un schedule de día libre.
   */
  private async getDayOffSchedule(): Promise<{ id: string } | null> {
    const url = this.apiUrl.build('rest/v1/schedules', {
      day_off: 'eq.true',
      select: 'id',
      limit: '1',
    });

    const result = await firstValueFrom(
      this.http.get<{ id: string }[]>(url)
    );

    return result?.[0] || null;
  }

  /**
   * Convierte una fecha a string ISO (YYYY-MM-DD).
   */
  private toDateString(date: Date | string): string {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }

  /**
   * Genera un array de fechas (YYYY-MM-DD) en el rango dado.
   */
  private getDaysInRange(startDate: string, endDate: string): string[] {
    const days: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return days;
  }
}
