import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { eachDayOfInterval, format } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { ScheduleAuditService } from './schedule-audit.service';

export type TimeOffType =
  | 'vacation'
  | 'compensatory_day'
  | 'compensatory_hours'
  | 'disability';

@Injectable({ providedIn: 'root' })
export class ScheduleAutoAssignService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private auditService = inject(ScheduleAuditService);

  async assignScheduleForTimeOff(params: {
    employeeId: string;
    startDate: string;
    endDate: string;
    scheduleId: string;
    timeOffType: TimeOffType;
    timeOffSourceId: string;
    companyId?: string;
    createdBy: string;
    compensatoryHoursAmount?: number;
  }): Promise<void> {
    const days = eachDayOfInterval({
      start: new Date(params.startDate),
      end: new Date(params.endDate),
    });

    const entries = days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry: Record<string, unknown> = {
        employee_id: params.employeeId,
        schedule_id: params.scheduleId,
        start_date: dateStr,
        end_date: dateStr,
        approved: true,
        time_off_type: params.timeOffType,
        time_off_source_id: params.timeOffSourceId,
      };
      if (params.companyId) {
        entry['company_id'] = params.companyId;
      }
      if (
        params.timeOffType === 'compensatory_hours' &&
        params.compensatoryHoursAmount != null
      ) {
        entry['compensatory_hours_amount'] = params.compensatoryHoursAmount;
      }
      return entry;
    });

    if (entries.length === 0) return;

    const url = this.apiUrl.build('rest/v1/employee_schedules');

    await firstValueFrom(
      this.http.post(url, entries, {
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
      })
    );

    // Best-effort audit log for each created entry
    try {
      for (const entry of entries) {
        await this.auditService.logChange({
          employeeScheduleId: null,
          changedBy: params.createdBy,
          action: 'created',
          newValue: entry,
          comment: `Auto-assigned from ${params.timeOffType} approval (source: ${params.timeOffSourceId})`,
        });
      }
    } catch (e) {
      console.warn(
        '[ScheduleAutoAssign] Audit log failed (non-blocking):',
        e
      );
    }
  }
}
