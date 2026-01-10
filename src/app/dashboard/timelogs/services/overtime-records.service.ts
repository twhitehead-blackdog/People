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
   */
  async getByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeOvertimeRecord[]> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.logger.warn('[OvertimeRecordsService] No company ID available');
      return [];
    }

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const url = this.apiUrl.build('rest/v1/employee_overtime_records', {
      select:
        '*,employee:employees(id,first_name,father_name),confirmedByEmployee:employees!confirmed_by(id,first_name,father_name)',
      timelog_date: `gte.${startStr}`,
      and: `(timelog_date.gte.${startStr},timelog_date.lte.${endStr})`,
      company_id: `eq.${companyId}`,
    });

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.get<EmployeeOvertimeRecord[]>(url)
      );
      this.logger.debug(
        '[OvertimeRecordsService] Fetched records:',
        result?.length ?? 0
      );
      return result ?? [];
    } catch (error) {
      this.logger.error(
        '[OvertimeRecordsService] Error fetching records:',
        error
      );
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Gets a single overtime record by employee and date
   */
  async getByEmployeeAndDate(
    employeeId: string,
    date: string
  ): Promise<EmployeeOvertimeRecord | null> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      return null;
    }

    const url = this.apiUrl.build('rest/v1/employee_overtime_records', {
      select: '*',
      employee_id: `eq.${employeeId}`,
      timelog_date: `eq.${date}`,
      company_id: `eq.${companyId}`,
    });

    try {
      const result = await firstValueFrom(
        this.http.get<EmployeeOvertimeRecord[]>(url)
      );
      return result?.[0] ?? null;
    } catch (error) {
      this.logger.error(
        '[OvertimeRecordsService] Error fetching single record:',
        error
      );
      return null;
    }
  }

  /**
   * Saves (creates or updates) an overtime record
   * Uses UPSERT via Supabase on-conflict-update
   */
  async save(
    params: SaveOvertimeRecordParams
  ): Promise<EmployeeOvertimeRecord> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      throw new Error('No company ID available');
    }

    const payload = {
      employee_id: params.employee_id,
      timelog_date: params.timelog_date,
      hours: params.hours,
      status: params.status ?? 'pending',
      reason: params.reason ?? null,
      company_id: companyId,
    };

    // Use UPSERT with on-conflict-update
    const url = this.apiUrl.build('rest/v1/employee_overtime_records', {
      on_conflict: 'employee_id,timelog_date',
    });

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.post<EmployeeOvertimeRecord[]>(url, payload, {
          headers: {
            Prefer: 'return=representation,resolution=merge-duplicates',
          },
        })
      );
      this.logger.debug('[OvertimeRecordsService] Saved record:', result?.[0]);
      return result?.[0] ?? (payload as EmployeeOvertimeRecord);
    } catch (error) {
      this.logger.error('[OvertimeRecordsService] Error saving record:', error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Confirms an overtime record
   * Sets status to 'confirmed' and populates audit fields
   */
  async confirm(
    params: ConfirmOvertimeParams
  ): Promise<EmployeeOvertimeRecord> {
    const url = this.apiUrl.build(`rest/v1/employee_overtime_records`, {
      id: `eq.${params.recordId}`,
    });

    const payload: Partial<EmployeeOvertimeRecord> = {
      status: 'confirmed',
      confirmed_by: params.confirmedBy,
      confirmed_at: new Date().toISOString(),
    };

    if (params.hours !== undefined) {
      payload.hours = params.hours;
    }

    if (params.reason) {
      payload.reason = params.reason;
    }

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.patch<EmployeeOvertimeRecord[]>(url, payload, {
          headers: {
            Prefer: 'return=representation',
          },
        })
      );
      this.logger.debug(
        '[OvertimeRecordsService] Confirmed record:',
        result?.[0]
      );
      return result?.[0] as EmployeeOvertimeRecord;
    } catch (error) {
      this.logger.error(
        '[OvertimeRecordsService] Error confirming record:',
        error
      );
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Rejects an overtime record
   * Sets status to 'rejected' with reason
   */
  async reject(params: RejectOvertimeParams): Promise<EmployeeOvertimeRecord> {
    const url = this.apiUrl.build(`rest/v1/employee_overtime_records`, {
      id: `eq.${params.recordId}`,
    });

    const payload: Partial<EmployeeOvertimeRecord> = {
      status: 'rejected',
      confirmed_by: params.confirmedBy,
      confirmed_at: new Date().toISOString(),
      reason: params.reason,
    };

    try {
      this.isLoading.set(true);
      const result = await firstValueFrom(
        this.http.patch<EmployeeOvertimeRecord[]>(url, payload, {
          headers: {
            Prefer: 'return=representation',
          },
        })
      );
      this.logger.debug(
        '[OvertimeRecordsService] Rejected record:',
        result?.[0]
      );
      return result?.[0] as EmployeeOvertimeRecord;
    } catch (error) {
      this.logger.error(
        '[OvertimeRecordsService] Error rejecting record:',
        error
      );
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Creates a new pending overtime record for a timelog that doesn't have one
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
