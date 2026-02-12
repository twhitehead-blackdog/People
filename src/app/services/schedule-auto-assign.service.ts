import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import {
  addDays,
  eachDayOfInterval,
  format,
  isBefore,
  parseISO,
  subDays,
} from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { ScheduleAuditService } from './schedule-audit.service';

export type TimeOffType =
  | 'vacation'
  | 'compensatory_day'
  | 'compensatory_hours'
  | 'disability';

interface ExistingSchedule {
  id: string;
  employee_id: string;
  schedule_id: string;
  start_date: string;
  end_date: string;
  branch_id?: string;
  approved?: boolean;
  company_id?: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleAutoAssignService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private auditService = inject(ScheduleAuditService);
  private auth = inject(AuthService);

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
    // 1. Get employee's branch_id
    const branchId = await this.getEmployeeBranchId(params.employeeId);

    // 2. Get Auth0 user_id (sub) for the user_id column
    const userId = await this.getAuth0UserId();

    // 3. For all types EXCEPT compensatory_hours, replace existing schedules
    if (params.timeOffType !== 'compensatory_hours') {
      await this.removeOverlappingSchedules(
        params.employeeId,
        params.startDate,
        params.endDate,
        params.companyId
      );
    }

    // 4. Create time-off schedule entries (one per day)
    const days = eachDayOfInterval({
      start: parseISO(params.startDate),
      end: parseISO(params.endDate),
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
      if (branchId) entry['branch_id'] = branchId;
      if (userId) entry['user_id'] = userId;
      if (params.companyId) entry['company_id'] = params.companyId;
      if (
        params.timeOffType === 'compensatory_hours' &&
        params.compensatoryHoursAmount != null
      ) {
        entry['compensatory_hours_amount'] = params.compensatoryHoursAmount;
      }
      return entry;
    });

    if (entries.length === 0) return;

    await firstValueFrom(
      this.http.post(
        this.apiUrl.build('rest/v1/employee_schedules'),
        entries,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
        }
      )
    );

    // 5. Best-effort audit
    try {
      await this.auditService.logChange({
        employeeScheduleId: null,
        changedBy: params.createdBy,
        action: 'created',
        newValue: {
          timeOffType: params.timeOffType,
          sourceId: params.timeOffSourceId,
          range: `${params.startDate} to ${params.endDate}`,
          days: entries.length,
        },
        comment: `Auto-assigned ${entries.length} day(s) from ${params.timeOffType} approval (source: ${params.timeOffSourceId})`,
      });
    } catch {
      // Non-blocking
    }
  }

  /**
   * Get the employee's branch_id from the employees table
   */
  private async getEmployeeBranchId(
    employeeId: string
  ): Promise<string | null> {
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        id: `eq.${employeeId}`,
        select: 'branch_id',
      });
      const resp = await firstValueFrom(
        this.http.get<{ branch_id: string }[]>(url)
      );
      return resp?.[0]?.branch_id ?? null;
    } catch {
      console.warn('[ScheduleAutoAssign] Could not fetch employee branch_id');
      return null;
    }
  }

  /**
   * Get the Auth0 user sub (user_id) from the current session
   */
  private async getAuth0UserId(): Promise<string | null> {
    try {
      const user = await firstValueFrom(this.auth.user$);
      return user?.sub ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Remove or trim existing schedules that overlap with the time-off range.
   * Handles three overlap cases:
   * - Fully contained: DELETE
   * - Starts before range: PATCH end_date to day before range
   * - Ends after range: PATCH start_date to day after range
   * - Spans entire range: Split into before + after
   */
  private async removeOverlappingSchedules(
    employeeId: string,
    rangeStart: string,
    rangeEnd: string,
    companyId?: string
  ): Promise<void> {
    // Fetch all schedules for this employee that overlap with the range
    // Overlap condition: existing.start_date <= rangeEnd AND existing.end_date >= rangeStart
    const filterParams: Record<string, string> = {
      employee_id: `eq.${employeeId}`,
      start_date: `lte.${rangeEnd}`,
      end_date: `gte.${rangeStart}`,
      select: 'id,employee_id,schedule_id,start_date,end_date,branch_id,approved,company_id',
    };
    if (companyId) {
      filterParams['company_id'] = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/employee_schedules', filterParams);
    let overlapping: ExistingSchedule[];
    try {
      overlapping = await firstValueFrom(
        this.http.get<ExistingSchedule[]>(url)
      );
    } catch {
      console.warn('[ScheduleAutoAssign] Could not fetch overlapping schedules');
      return;
    }

    if (!overlapping || overlapping.length === 0) return;

    const start = parseISO(rangeStart);
    const end = parseISO(rangeEnd);

    for (const sched of overlapping) {
      const schedStart = parseISO(sched.start_date);
      const schedEnd = parseISO(sched.end_date);

      const startsBeforeRange = isBefore(schedStart, start);
      const endsAfterRange = isBefore(end, schedEnd);

      if (!startsBeforeRange && !endsAfterRange) {
        // Case 1: Fully contained — DELETE
        await this.deleteSchedule(sched.id, companyId);
      } else if (startsBeforeRange && !endsAfterRange) {
        // Case 2: Starts before range, ends within — trim end
        await this.patchSchedule(sched.id, companyId, {
          end_date: format(subDays(start, 1), 'yyyy-MM-dd'),
        });
      } else if (!startsBeforeRange && endsAfterRange) {
        // Case 3: Starts within range, ends after — trim start
        await this.patchSchedule(sched.id, companyId, {
          start_date: format(addDays(end, 1), 'yyyy-MM-dd'),
        });
      } else {
        // Case 4: Spans entire range — split into before + after
        // Trim original to end before range
        await this.patchSchedule(sched.id, companyId, {
          end_date: format(subDays(start, 1), 'yyyy-MM-dd'),
        });
        // Create new entry for after range
        const afterEntry: Record<string, unknown> = {
          employee_id: sched.employee_id,
          schedule_id: sched.schedule_id,
          start_date: format(addDays(end, 1), 'yyyy-MM-dd'),
          end_date: sched.end_date,
          approved: sched.approved ?? false,
        };
        if (sched.branch_id) afterEntry['branch_id'] = sched.branch_id;
        if (sched.company_id) afterEntry['company_id'] = sched.company_id;

        await firstValueFrom(
          this.http.post(
            this.apiUrl.build('rest/v1/employee_schedules'),
            afterEntry,
            {
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
            }
          )
        );
      }
    }
  }

  private async deleteSchedule(
    id: string,
    companyId?: string
  ): Promise<void> {
    const params: Record<string, string> = { id: `eq.${id}` };
    if (companyId) params['company_id'] = `eq.${companyId}`;
    await firstValueFrom(
      this.http.delete(this.apiUrl.build('rest/v1/employee_schedules', params))
    );
  }

  private async patchSchedule(
    id: string,
    companyId: string | undefined,
    data: Record<string, unknown>
  ): Promise<void> {
    const params: Record<string, string> = { id: `eq.${id}` };
    if (companyId) params['company_id'] = `eq.${companyId}`;
    await firstValueFrom(
      this.http.patch(
        this.apiUrl.build('rest/v1/employee_schedules', params),
        data
      )
    );
  }
}
