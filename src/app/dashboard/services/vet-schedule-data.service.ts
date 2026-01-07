import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { format, eachDayOfInterval, endOfWeek } from 'date-fns';

import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { VetBranchAssignment, Employee } from '../../models';
import { VetScheduleUtilsService } from './vet-schedule-utils.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VetScheduleDataService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);
  private utils = inject(VetScheduleUtilsService);

  /**
   * Carga las asignaciones de veterinarios para una semana específica
   */
  loadAssignments(startDate: Date): Observable<VetBranchAssignment[]> {
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 });
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      throw new Error('No se pudo identificar la compañía.');
    }

    return this.http.get<VetBranchAssignment[]>(
      this.apiUrl.build('rest/v1/vet_branch_assignments', {
        // PostgREST: no podemos repetir la key "date" porque ApiUrlService usa searchParams.set,
        // así que usamos el operador and=(...) para rango.
        and: `(date.gte.${format(startDate, 'yyyy-MM-dd')},date.lte.${format(
          endDate,
          'yyyy-MM-dd'
        )})`,
        company_id: `eq.${companyId}`,
        select:
          '*,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
      }),
      {}
    );
  }

  /**
   * Carga los días no laborables de veterinarios desde employee_schedules
   */
  loadNonWorkingDays(
    startDate: Date,
    vetIds: string[]
  ): Observable<{ employee_id: string; start_date: string; end_date: string; schedule: any }[]> {
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 });
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      throw new Error('No se pudo identificar la compañía.');
    }

    return this.http.get<any[]>(
      this.apiUrl.build('rest/v1/employee_schedules', {
        start_date: `lte.${format(endDate, 'yyyy-MM-dd')}`,
        end_date: `gte.${format(startDate, 'yyyy-MM-dd')}`,
        employee_id: `in.(${vetIds.join(',')})`,
        ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
        select:
          'employee_id,start_date,end_date,schedule:schedules(day_off,name),employee:employees(id,company_id)',
      }),
      {}
    );
  }

  /**
   * Procesa los schedules no laborables y crea un mapa de días no laborables
   */
  processNonWorkingDays(
    rows: any[],
    startDate: Date
  ): Record<string, string> {
    const map: Record<string, string> = {};
    const days = eachDayOfInterval({ start: startDate, end: endOfWeek(startDate, { weekStartsOn: 0 }) });

    for (const row of rows || []) {
      const schedule = row.schedule;

      // Verificar si es un schedule no laborable
      const isNonWorking = this.utils.isNonWorkingSchedule(schedule);
      if (!isNonWorking) {
        continue;
      }

      const rowStart = this.utils.parseDateWithoutTimezone(row.start_date);
      const rowEnd = this.utils.parseDateWithoutTimezone(row.end_date);

      for (const d of days) {
        // Crear fechas solo con año/mes/día para comparación
        const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const startDateOnly = new Date(rowStart.getFullYear(), rowStart.getMonth(), rowStart.getDate());
        const endDateOnly = new Date(rowEnd.getFullYear(), rowEnd.getMonth(), rowEnd.getDate());

        // Comparación inclusive usando solo fecha (sin hora)
        if (dDate >= startDateOnly && dDate <= endDateOnly) {
          const key = `${row.employee_id}|${format(d, 'yyyy-MM-dd')}`;
          // Si hay varias, deja la primera
          if (!map[key]) {
            map[key] = this.utils.getScheduleLabel(schedule);
          }
        }
      }
    }

    return map;
  }

  /**
   * Asigna una sucursal a un veterinario en una fecha específica
   */
  assignBranch(
    employeeId: string,
    branchId: string,
    date: Date,
    currentEmployeeId: string
  ): Observable<any> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      throw new Error('No se pudo identificar la compañía.');
    }

    const assignmentData = {
      employee_id: employeeId,
      branch_id: branchId,
      date: format(date, 'yyyy-MM-dd'),
      company_id: companyId,
    };

    return this.http.post(
      this.apiUrl.build('rest/v1/vet_branch_assignments', {
        on_conflict: 'company_id,employee_id,date',
      }),
      assignmentData,
      {
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
      }
    );
  }

  /**
   * Elimina una asignación de sucursal
   */
  deleteAssignment(assignmentId: string): Observable<void> {
    return this.http.delete<void>(
      this.apiUrl.build('rest/v1/vet_branch_assignments', { id: `eq.${assignmentId}` })
    );
  }
}