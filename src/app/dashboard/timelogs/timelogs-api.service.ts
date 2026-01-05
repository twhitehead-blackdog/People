import { inject, Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { LoggerService } from '../../services/logger.service';
import { OrganizationService } from '../../services/organization.service';

@Injectable({ providedIn: 'root' })
export class TimelogsApiService {
  private readonly TIMEZONE = 'America/Panama';
  private readonly cutoffBefore = new Date('2025-12-22');
  private readonly cutoffAfter = new Date('2025-12-23');
  private readonly cutoffBeforeStr = '2025-12-22';
  private readonly cutoffAfterStr = '2025-12-23';

  private readonly organizationService = inject(OrganizationService);
  private readonly logger = inject(LoggerService);

  private clone(date: Date): Date {
    return new Date(date.getTime());
  }

  private getSupabaseBaseUrl(): string {
    const baseUrl = process.env['ENV_SUPABASE_URL'];
    if (!baseUrl) {
      const errorMsg = 'ENV_SUPABASE_URL no está configurada';
      this.logger.error('[TimelogsApiService]', errorMsg);
      throw new Error(errorMsg);
    }
    return baseUrl;
  }

  public buildLogsRequest(start: Date, end: Date, employeeId?: string) {
    const baseUrl = `${this.getSupabaseBaseUrl()}/rest/v1/timelogs`;
    const companyId = this.organizationService.getCurrentCompanyId();

    const startDateStrPanama =
      formatInTimeZone(start, this.TIMEZONE, 'yyyy-MM-dd') + 'T00:00:00-05:00';
    const endDateStrPanama =
      formatInTimeZone(addDays(end, 1), this.TIMEZONE, 'yyyy-MM-dd') +
      'T00:00:00-05:00';

    const startDate = new Date(startDateStrPanama).toISOString().split('.')[0] + 'Z';
    const endDate = new Date(endDateStrPanama).toISOString().split('.')[0] + 'Z';

    const select =
      '*,employee:employees!inner(id,first_name,father_name,is_active,branch:branches(id, name)),branch:branches(id, name, short_name)';

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&employee.is_active=eq.true`;

    if (employeeId) {
      url += `&employee_id=eq.${employeeId}`;
    }

    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }

    url += `&order=created_at.asc`;

    return { url, method: 'GET' };
  }

  public splitDateRange(range: { start: Date; end: Date }) {
    const { start, end } = range;
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    const beforeRange =
      startStr > this.cutoffBeforeStr
        ? undefined
        : {
            start: this.clone(start),
            end:
              endStr > this.cutoffBeforeStr
                ? this.clone(this.cutoffBefore)
                : this.clone(end),
          };

    const afterRange =
      endStr < this.cutoffAfterStr
        ? undefined
        : {
            start:
              startStr < this.cutoffAfterStr
                ? this.clone(this.cutoffAfter)
                : this.clone(start),
            end: this.clone(end),
          };

    return { beforeRange, afterRange };
  }
}
