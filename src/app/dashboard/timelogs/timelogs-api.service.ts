import { inject, Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
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

    const normalizedStart = format(start, 'yyyy-MM-dd');
    // Sumar 1 día para incluir el rango completo (hasta el inicio del día siguiente)
    const normalizedEnd = format(addDays(end, 1), 'yyyy-MM-dd');

    // Construir fechas explícitamente en zona horaria de Panamá (-05:00)
    // Esto asegura que "2024-01-29" sea "2024-01-29T00:00:00-05:00"
    const startDateStrPanama = `${normalizedStart}T00:00:00-05:00`;
    const endDateStrPanama = `${normalizedEnd}T00:00:00-05:00`;

    const startDate =
      new Date(startDateStrPanama).toISOString().split('.')[0] + 'Z';
    const endDate =
      new Date(endDateStrPanama).toISOString().split('.')[0] + 'Z';

    // Usar !timelogs_employee_id_fkey para especificar la relación correcta
    // Se elimina !inner y el filtro de is_active para ver historial completo
    const select =
      '*,employee:employees!timelogs_employee_id_fkey(id,first_name,father_name,is_active,branch:branches(id, name)),branch:branches(id, name, short_name)';

    const params: Record<string, string> = {
      select: select,
      order: 'created_at.asc',
    };

    if (employeeId) {
      params['employee_id'] = `eq.${employeeId}`;
    }

    if (companyId) {
      params['company_id'] = `eq.${companyId}`;
    }

    // Filtro complejo para soportar logs backfilled (creados después pero efectivos antes)
    // 1. Logs manuales: punched_at está en el rango
    // 2. Logs automáticos: punched_at es null Y created_at está en el rango
    // Nota: Usamos paréntesis para agrupar las condiciones OR y AND de PostgREST
    const manualLogsCondition = `and(punched_at.gte.${startDate},punched_at.lte.${endDate})`;
    const autoLogsCondition = `and(punched_at.is.null,created_at.gte.${startDate},created_at.lte.${endDate})`;

    params['or'] = `(${manualLogsCondition},${autoLogsCondition})`;
    params['limit'] = '50000';

    const url = this.apiUrl.build('rest/v1/timelogs', params);

    return {
      url,
      method: 'GET' as const,
      headers: { Range: '0-49999' },
    };
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
