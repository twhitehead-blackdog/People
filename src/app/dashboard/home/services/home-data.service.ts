import { Injectable, inject, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ApiUrlService } from '../../../services/api-url.service';
import { OrganizationService } from '../../../services/organization.service';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface TerminationRecord {
  id: string;
  employee_id: string;
  date: string;
  reason?: string;
}

export interface TimelogEntry {
  id: string;
  employee_id: string;
  type: 'entry' | 'exit';
  created_at: string;
  employee?: {
    first_name?: string;
    father_name?: string;
  };
}

export interface EmployeeScheduleRecord {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  schedule?: {
    id?: string;
    entry_time?: string | Date;
    exit_time?: string | Date;
    minutes_tolerance?: number;
    day_off?: boolean;
  };
  employee?: {
    first_name?: string;
    father_name?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class HomeDataService {
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

  private currentCompanyId = computed(() => this.organizationService.getCurrentCompanyId());

  // Terminations API for calculating exits/turnover
  terminationsApi = httpResource<TerminationRecord[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/employee_terminations', {
        company_id: `eq.${companyId}`,
        select: 'id,employee_id,date,reason',
      }),
    };
  });

  // Timelogs for calculating lates - current month entries
  latesFromTimelogs = httpResource<TimelogEntry[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;

    const now = new Date();
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

    return {
      url: this.apiUrl.build('rest/v1/timelogs', {
        company_id: `eq.${companyId}`,
        type: 'eq.entry',
        'created_at': `gte.${monthStart}T00:00:00`,
        // Usar !timelogs_employee_id_fkey para especificar la relación correcta (hay dos FKs a employees)
        select: 'id,employee_id,type,created_at,employee:employees!timelogs_employee_id_fkey(first_name,father_name)',
      }),
    };
  });

  // Employee schedules for calculating lates
  employeeSchedules = httpResource<EmployeeScheduleRecord[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;

    const now = new Date();
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

    return {
      url: this.apiUrl.build('rest/v1/employee_schedules', {
        company_id: `eq.${companyId}`,
        start_date: `lte.${monthEnd}`,
        end_date: `gte.${monthStart}`,
        select: 'id,employee_id,start_date,end_date,schedule:schedules(id,entry_time,exit_time,minutes_tolerance,day_off),employee:employees(first_name,father_name)',
      }),
    };
  });
}
