// ============================================
// Late Records Service
// Maneja el registro automático y gestión de tardanzas
// ============================================

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { format } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import {
  EmployeeLateRecord,
  LateRecordStatus,
  LateRecordSource,
} from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { LoggerService } from '../../services/logger.service';
import { OrganizationService } from '../../services/organization.service';

export interface SaveLateRecordParams {
  employee_id: string;
  timelog_date: string;
  scheduled_entry_time: string; // HH:mm:ss
  actual_entry_time: string; // HH:mm:ss
  minutes_late: number;
  tolerance_minutes?: number;
  employee_name: string;
  position_id?: string;
  position_name?: string;
  branch_id?: string;
  branch_name?: string;
  source_module?: LateRecordSource;
  source_timelog_id?: string;
}

export interface JustifyLateRecordParams {
  recordId: string;
  justifiedBy: string;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class LateRecordsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly logger = inject(LoggerService);
  private readonly organizationService = inject(OrganizationService);

  public readonly isLoading = signal(false);

  /**
   * Obtiene un registro de tardanza por empleado y fecha
   * Retorna null si no existe
   */
  async getByEmployeeAndDate(
    employeeId: string,
    date: string
  ): Promise<EmployeeLateRecord | null> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.logger.warn('[LateRecordsService] No company ID available');
      return null;
    }

    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      select: 'id,employee_id,timelog_date,scheduled_entry_time,actual_entry_time,minutes_late,tolerance_minutes,employee_name,position_id,position_name,branch_id,branch_name,source_module,source_timelog_id,status,company_id,created_at,updated_at',
      employee_id: `eq.${employeeId}`,
      timelog_date: `eq.${date}`,
      company_id: `eq.${companyId}`,
    });

    try {
      const result = await firstValueFrom(
        this.http.get<EmployeeLateRecord[]>(url)
      );
      return result?.[0] ?? null;
    } catch (error) {
      this.logger.error('[LateRecordsService] Error fetching record:', error);
      return null;
    }
  }

  /**
   * Guarda (crea o actualiza) un registro de tardanza
   * Usa UPSERT para evitar duplicados
   */
  async save(params: SaveLateRecordParams): Promise<EmployeeLateRecord> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      throw new Error('No company ID available');
    }

    // Validar parámetros
    this.validateParams(params);

    const payload = {
      employee_id: params.employee_id,
      timelog_date: params.timelog_date,
      scheduled_entry_time: params.scheduled_entry_time,
      actual_entry_time: params.actual_entry_time,
      minutes_late: params.minutes_late,
      tolerance_minutes: params.tolerance_minutes ?? 0,
      employee_name: params.employee_name,
      position_id: params.position_id ?? null,
      position_name: params.position_name ?? null,
      branch_id: params.branch_id ?? null,
      branch_name: params.branch_name ?? null,
      source_module: params.source_module ?? 'peluqueria',
      source_timelog_id: params.source_timelog_id ?? null,
      company_id: companyId,
      status: 'active' as LateRecordStatus,
    };

    // UPSERT con on-conflict-update
    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      on_conflict: 'employee_id,timelog_date',
    });

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.post<EmployeeLateRecord[]>(url, payload, {
          headers: {
            Prefer: 'return=representation,resolution=merge-duplicates',
          },
        })
      );
      this.logger.debug(
        '[LateRecordsService] Saved late record:',
        result?.[0]
      );
      return result?.[0] ?? (payload as EmployeeLateRecord);
    } catch (error) {
      this.logger.error('[LateRecordsService] Error saving late record:', error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Justifica un registro de tardanza
   */
  async justify(
    params: JustifyLateRecordParams
  ): Promise<EmployeeLateRecord> {
    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      id: `eq.${params.recordId}`,
    });

    const payload: Partial<EmployeeLateRecord> = {
      status: 'justified',
      justified_by: params.justifiedBy,
      justified_at: new Date().toISOString(),
      justification_reason: params.reason,
    };

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.patch<EmployeeLateRecord[]>(url, payload, {
          headers: { Prefer: 'return=representation' },
        })
      );
      this.logger.debug('[LateRecordsService] Justified record:', result?.[0]);
      return result?.[0] as EmployeeLateRecord;
    } catch (error) {
      this.logger.error(
        '[LateRecordsService] Error justifying record:',
        error
      );
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cambia el estado de un registro a 'compensated'
   */
  async compensate(
    recordId: string,
    updatedBy: string
  ): Promise<EmployeeLateRecord> {
    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      id: `eq.${recordId}`,
    });

    const payload: Partial<EmployeeLateRecord> = {
      status: 'compensated',
      updated_at: new Date().toISOString(),
    };

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.patch<EmployeeLateRecord[]>(url, payload, {
          headers: { Prefer: 'return=representation' },
        })
      );
      this.logger.debug('[LateRecordsService] Compensated record:', result?.[0]);
      return result?.[0] as EmployeeLateRecord;
    } catch (error) {
      this.logger.error(
        '[LateRecordsService] Error compensating record:',
        error
      );
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Descarta un registro de tardanza (estado 'discarded')
   */
  async discard(recordId: string, reason: string): Promise<EmployeeLateRecord> {
    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      id: `eq.${recordId}`,
    });

    const payload: Partial<EmployeeLateRecord> = {
      status: 'discarded',
      justification_reason: reason,
      updated_at: new Date().toISOString(),
    };

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.patch<EmployeeLateRecord[]>(url, payload, {
          headers: { Prefer: 'return=representation' },
        })
      );
      this.logger.debug('[LateRecordsService] Discarded record:', result?.[0]);
      return result?.[0] as EmployeeLateRecord;
    } catch (error) {
      this.logger.error(
        '[LateRecordsService] Error discarding record:',
        error
      );
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtiene registros por rango de fechas
   */
  async getByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeLateRecord[]> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return [];

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      select:
        '*,employee:employees(id,first_name,father_name),branch:branches(id,name)',
      and: `(timelog_date.gte.${startStr},timelog_date.lte.${endStr})`,
      company_id: `eq.${companyId}`,
      order: 'timelog_date.desc,minutes_late.desc',
    });

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.get<EmployeeLateRecord[]>(url)
      );
      return result ?? [];
    } catch (error) {
      this.logger.error('[LateRecordsService] Error fetching range:', error);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtiene registros por empleado
   */
  async getByEmployee(employeeId: string): Promise<EmployeeLateRecord[]> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return [];

    const url = this.apiUrl.build('rest/v1/employee_late_records', {
      select: '*,branch:branches(id,name)',
      employee_id: `eq.${employeeId}`,
      company_id: `eq.${companyId}`,
      order: 'timelog_date.desc',
    });

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.get<EmployeeLateRecord[]>(url)
      );
      return result ?? [];
    } catch (error) {
      this.logger.error(
        '[LateRecordsService] Error fetching by employee:',
        error
      );
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Valida los parámetros antes de guardar
   */
  private validateParams(params: SaveLateRecordParams): void {
    // Validar formato de hora
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(params.scheduled_entry_time)) {
      throw new Error(
        'Formato de hora programada inválido. Use HH:mm:ss'
      );
    }
    if (!timeRegex.test(params.actual_entry_time)) {
      throw new Error('Formato de hora actual inválido. Use HH:mm:ss');
    }

    // Validar minutos de tardanza positivos
    if (params.minutes_late <= 0) {
      throw new Error('Los minutos de tardanza deben ser mayores a 0');
    }

    // Validar fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.timelog_date)) {
      throw new Error('Formato de fecha inválido. Use yyyy-MM-dd');
    }

    // Validar que la fecha no sea futura
    const recordDate = new Date(params.timelog_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (recordDate > today) {
      throw new Error(
        'No se pueden registrar tardanzas para fechas futuras'
      );
    }

    // Validar nombre del empleado
    if (!params.employee_name || params.employee_name.trim().length < 2) {
      throw new Error('El nombre del empleado es requerido');
    }
  }
}
