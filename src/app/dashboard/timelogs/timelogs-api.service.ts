import { inject, Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ApiUrlService } from '../../services/api-url.service';
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
  private readonly apiUrl = inject(ApiUrlService);

  private clone(date: Date): Date {
    return new Date(date.getTime());
  }

  public buildLogsRequest(start: Date, end: Date, employeeId?: string) {
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

    const params: Record<string, string> = {
      select: select,
      created_at: `gte.${startDate}`,
      'employee.is_active': 'eq.true',
      order: 'created_at.asc',
    };

    if (employeeId) {
      params['employee_id'] = `eq.${employeeId}`;
    }

    if (companyId) {
      params['company_id'] = `eq.${companyId}`;
    }

    // Agregar el segundo filtro de fecha usando PostgREST 'and' para combinar condiciones
    params['and'] = `(created_at.gte.${startDate},created_at.lte.${endDate})`;
    delete params['created_at']; // Remover el filtro simple ya que usamos 'and'

    const url = this.apiUrl.build('rest/v1/timelogs', params);

    return { url, method: 'GET' as const };
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
