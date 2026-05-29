import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { addDays, format } from 'date-fns';
import { ApiUrlService } from '../../services/api-url.service';
import { LoggerService } from '../../services/logger.service';
import { OrganizationService } from '../../services/organization.service';

/**
 * Fecha que marca un cambio histórico en cómo se almacena `punched_at` en
 * `timelogs`. Las consultas que crucen esta fecha se parten en 2 requests
 * paralelos (`logsBefore22` y `logsAfter22`) para preservar compatibilidad
 * con datos anteriores. Si en el futuro se hace un backfill completo y se
 * verifica que ambos lados son intercambiables, este split puede removerse.
 *
 * Verificado 2026-05-29: los datos a ambos lados ya parecen estar en el mismo
 * formato, pero el split se conserva por precaución hasta tener auditoría
 * formal.
 */
export const PUNCHED_AT_BACKFILL_CUTOFF_DATE = '2025-12-22';
export const PUNCHED_AT_BACKFILL_CUTOFF_NEXT = '2025-12-23';

@Injectable({ providedIn: 'root' })
export class TimelogsApiService {
  private readonly TIMEZONE = 'America/Panama';
  private readonly cutoffBefore = new Date(PUNCHED_AT_BACKFILL_CUTOFF_DATE);
  private readonly cutoffAfter = new Date(PUNCHED_AT_BACKFILL_CUTOFF_NEXT);
  private readonly cutoffBeforeStr = PUNCHED_AT_BACKFILL_CUTOFF_DATE;
  private readonly cutoffAfterStr = PUNCHED_AT_BACKFILL_CUTOFF_NEXT;

  private readonly organizationService = inject(OrganizationService);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly http = inject(HttpClient);

  // Supabase PostgREST tiene un hard cap server-side de 10000 filas por request,
  // independiente de los params `limit` o header `Range`. Paginamos para no perder filas.
  private readonly PAGE_SIZE = 10000;

  private clone(date: Date): Date {
    return new Date(date.getTime());
  }

  // Safety hard stop: 50 páginas * 10000 = 500K filas máximo.
  private readonly MAX_PAGES = 50;

  /**
   * Trae TODOS los timelogs del rango, paginando por offset hasta agotar el server cap.
   * Devuelve la unión completa en orden punched_at.asc.
   */
  public async fetchAllLogs(
    start: Date,
    end: Date,
    employeeId?: string,
    signal?: AbortSignal
  ): Promise<any[]> {
    const all: any[] = [];
    let from = 0;
    let pages = 0;
    let lastPageFull = false;
    for (pages = 0; pages < this.MAX_PAGES; pages++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const req = this.buildLogsRequest(start, end, employeeId, from, from + this.PAGE_SIZE - 1);
      const page = await firstValueFrom(
        this.http.get<any[]>(req.url, { headers: req.headers })
      );
      if (!page || page.length === 0) {
        lastPageFull = false;
        break;
      }
      all.push(...page);
      lastPageFull = page.length === this.PAGE_SIZE;
      if (!lastPageFull) break;
      from += this.PAGE_SIZE;
    }

    // Telemetría: si llenamos las 50 páginas con la última completa, casi
    // seguro hay más datos que no estamos trayendo. Avisar para investigar.
    if (pages === this.MAX_PAGES && lastPageFull) {
      this.logger.warn(
        '[TimelogsApiService] fetchAllLogs golpeó el cap de paginación',
        {
          maxPages: this.MAX_PAGES,
          pageSize: this.PAGE_SIZE,
          totalRows: all.length,
          rangeStart: start.toISOString(),
          rangeEnd: end.toISOString(),
          employeeId: employeeId ?? 'all',
        }
      );
    }

    return all;
  }

  public buildLogsRequest(start: Date, end: Date, employeeId?: string, rangeFrom = 0, rangeTo = 9999) {
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
    // Solo los campos que realmente se usan en el procesamiento de DayLogs
    const select =
      'id,employee_id,type,created_at,punched_at,branch_id,ip,invalid_ip,source,is_manual,manual_reason,manual_created_by,db_user_at_insert,reason,employee:employees!timelogs_employee_id_fkey(id,first_name,father_name),branch:branches(id,name,short_name)';

    const params: Record<string, string> = {
      select: select,
      order: 'punched_at.asc',
    };

    if (employeeId) {
      params['employee_id'] = `eq.${employeeId}`;
    }

    if (companyId) {
      params['company_id'] = `eq.${companyId}`;
    }

    // Filtro directo por punched_at (backfill + trigger garantizan que todos los registros lo tienen)
    params['and'] = `(punched_at.gte.${startDate},punched_at.lte.${endDate})`;

    const url = this.apiUrl.build('rest/v1/timelogs', params);

    return {
      url,
      method: 'GET' as const,
      headers: { Range: `${rangeFrom}-${rangeTo}`, 'Range-Unit': 'items' },
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
