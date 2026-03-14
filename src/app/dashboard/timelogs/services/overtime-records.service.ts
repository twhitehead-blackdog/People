import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { format } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { EmployeeOvertimeRecord, OvertimeStatus } from '../../../models';
import { ApiUrlService } from '../../../services/api-url.service';
import { LoggerService } from '../../../services/logger.service';
import { OrganizationService } from '../../../services/organization.service';

export interface SaveOvertimeRecordParams {
  employee_id: string;
  timelog_date: string;
  hours: number;
  status?: OvertimeStatus;
  reason?: string;
}

export interface ConfirmOvertimeParams {
  recordId: string;
  confirmedBy: string;
  hours?: number;
  reason?: string;
}

export interface RejectOvertimeParams {
  recordId: string;
  confirmedBy: string;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class OvertimeRecordsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly logger = inject(LoggerService);
  private readonly organizationService = inject(OrganizationService);

  // Loading state
  public readonly isLoading = signal(false);

  /**
   * Fetches overtime records for a given date range
   * TODO: Deshabilitado - tabla employee_overtime_records no existe en DB
   */
  async getByDateRange(
    _startDate: Date,
    _endDate: Date
  ): Promise<EmployeeOvertimeRecord[]> {
    this.logger.warn('[OvertimeRecordsService] Deshabilitado - tabla employee_overtime_records no existe');
    return [];
  }

  /**
   * Gets a single overtime record by employee and date
   * TODO: Deshabilitado - tabla employee_overtime_records no existe en DB
   */
  async getByEmployeeAndDate(
    _employeeId: string,
    _date: string
  ): Promise<EmployeeOvertimeRecord | null> {
    return null;
  }

  /**
   * Saves (creates or updates) an overtime record
   * TODO: Deshabilitado - tabla employee_overtime_records no existe en DB
   */
  async save(
    params: SaveOvertimeRecordParams
  ): Promise<EmployeeOvertimeRecord> {
    this.logger.warn('[OvertimeRecordsService] save() deshabilitado - tabla no existe');
    return {
      id: '',
      employee_id: params.employee_id,
      timelog_date: params.timelog_date,
      hours: params.hours,
      status: params.status ?? 'pending',
    } as EmployeeOvertimeRecord;
  }

  /**
   * Confirms an overtime record
   * TODO: Deshabilitado - tabla employee_overtime_records no existe en DB
   */
  async confirm(
    params: ConfirmOvertimeParams
  ): Promise<EmployeeOvertimeRecord> {
    this.logger.warn('[OvertimeRecordsService] confirm() deshabilitado - tabla no existe');
    return { id: params.recordId, status: 'confirmed' } as EmployeeOvertimeRecord;
  }

  /**
   * Rejects an overtime record
   * TODO: Deshabilitado - tabla employee_overtime_records no existe en DB
   */
  async reject(params: RejectOvertimeParams): Promise<EmployeeOvertimeRecord> {
    this.logger.warn('[OvertimeRecordsService] reject() deshabilitado - tabla no existe');
    return { id: params.recordId, status: 'rejected' } as EmployeeOvertimeRecord;
  }

  /**
   * Creates a new pending overtime record for a timelog that doesn't have one
   * TODO: Deshabilitado - tabla employee_overtime_records no existe en DB
   */
  async createPendingRecord(
    employeeId: string,
    timelogDate: string,
    hours: number
  ): Promise<EmployeeOvertimeRecord> {
    return this.save({
      employee_id: employeeId,
      timelog_date: timelogDate,
      hours,
      status: 'pending',
    });
  }
}
