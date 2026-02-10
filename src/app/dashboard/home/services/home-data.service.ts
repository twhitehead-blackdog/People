import { Injectable, inject, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ApiUrlService } from '../../../services/api-url.service';
import { OrganizationService } from '../../../services/organization.service';
import { startOfMonth, endOfMonth, format, startOfDay, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

/** Orden de venta de Odoo (módulo sale_order_comanda_mascotas) - solo peluquería */
export interface OdooSaleOrder {
  id: number;
  name: string;
  partner_id?: number | [number, string];
  date_order: string;
  state: string;
  amount_total?: number;
  amount_untaxed?: number;
  user_id?: number | [number, string];
  nombres_mascotas?: string;
  count_peluqueria?: number;
  count_veterinaria?: number;
  count_total_mascotas?: number;
  count_cortes?: number;
  count_solo_bano?: number;
  count_bano_y_corte?: number;
  tiene_peluqueria?: boolean;
  tiene_veterinaria?: boolean;
  tipo_servicio?: string;
  mascota_line_ids?: number[];
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

  private readonly TZ = 'America/Panama';

  /** Fecha seleccionada para la vista Peluquería (por defecto hoy) */
  peluqueriaViewDate = signal(new Date());

  /** Asignaciones de peluquería para hoy (sucursal + empleado) */
  groomerAssignmentsToday = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const today = toZonedTime(new Date(), this.TZ);
    const dateStr = format(today, 'yyyy-MM-dd');
    return {
      url: this.apiUrl.build('rest/v1/groomer_branch_assignments', {
        company_id: `eq.${companyId}`,
        date: `eq.${dateStr}`,
        select: 'id,employee_id,branch_id,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
      }),
    };
  });

  /** Marcaciones de entrada de hoy (con branch y empleado para vista peluquería en vivo) */
  timelogsEntryToday = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const today = toZonedTime(new Date(), this.TZ);
    const dayStart = startOfDay(today);
    const nextDay = addDays(dayStart, 1);
    const startStr = format(dayStart, "yyyy-MM-dd'T'HH:mm:ss");
    const endStr = format(nextDay, "yyyy-MM-dd'T'HH:mm:ss");
    return {
      url: this.apiUrl.build('rest/v1/timelogs', {
        company_id: `eq.${companyId}`,
        type: 'eq.entry',
        and: `(created_at.gte.${startStr},created_at.lt.${endStr})`,
        select: 'id,employee_id,branch_id,created_at,punched_at,branch:branches(id,name,short_name),employee:employees!timelogs_employee_id_fkey(id,first_name,father_name,position:positions(id,name))',
      }),
    };
  });

  /** Marcaciones de salida de hoy (para registro del día en vista peluquería) */
  timelogsExitToday = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const today = toZonedTime(new Date(), this.TZ);
    const dayStart = startOfDay(today);
    const nextDay = addDays(dayStart, 1);
    const startStr = format(dayStart, "yyyy-MM-dd'T'HH:mm:ss");
    const endStr = format(nextDay, "yyyy-MM-dd'T'HH:mm:ss");
    return {
      url: this.apiUrl.build('rest/v1/timelogs', {
        company_id: `eq.${companyId}`,
        type: 'eq.exit',
        and: `(created_at.gte.${startStr},created_at.lt.${endStr})`,
        select: 'id,employee_id,branch_id,created_at,punched_at',
      }),
    };
  });

  /** Marcaciones de entrada para la fecha seleccionada en vista Peluquería */
  timelogsEntryForPeluqueriaView = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const viewDate = toZonedTime(this.peluqueriaViewDate(), this.TZ);
    const dayStart = startOfDay(viewDate);
    const nextDay = addDays(dayStart, 1);
    const startStr = format(dayStart, "yyyy-MM-dd'T'HH:mm:ss");
    const endStr = format(nextDay, "yyyy-MM-dd'T'HH:mm:ss");
    return {
      url: this.apiUrl.build('rest/v1/timelogs', {
        company_id: `eq.${companyId}`,
        type: 'eq.entry',
        and: `(created_at.gte.${startStr},created_at.lt.${endStr})`,
        select: 'id,employee_id,branch_id,created_at,punched_at,branch:branches(id,name,short_name),employee:employees!timelogs_employee_id_fkey(id,first_name,father_name,position:positions(id,name))',
      }),
    };
  });

  /** Marcaciones de salida para la fecha seleccionada en vista Peluquería */
  timelogsExitForPeluqueriaView = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const viewDate = toZonedTime(this.peluqueriaViewDate(), this.TZ);
    const dayStart = startOfDay(viewDate);
    const nextDay = addDays(dayStart, 1);
    const startStr = format(dayStart, "yyyy-MM-dd'T'HH:mm:ss");
    const endStr = format(nextDay, "yyyy-MM-dd'T'HH:mm:ss");
    return {
      url: this.apiUrl.build('rest/v1/timelogs', {
        company_id: `eq.${companyId}`,
        type: 'eq.exit',
        and: `(created_at.gte.${startStr},created_at.lt.${endStr})`,
        select: 'id,employee_id,branch_id,created_at,punched_at',
      }),
    };
  });

  /** Órdenes de venta de Odoo (peluquería) para la fecha seleccionada en vista Peluquería */
  odooSaleOrdersForPeluqueriaView = httpResource<{ success: boolean; data: OdooSaleOrder[] }>(() => {
    const viewDate = toZonedTime(this.peluqueriaViewDate(), this.TZ);
    const dayStart = startOfDay(viewDate);
    const nextDay = addDays(dayStart, 1);
    const dateFrom = format(dayStart, 'yyyy-MM-dd');
    const dateTo = format(nextDay, 'yyyy-MM-dd');
    return {
      url: `/api/odoo/sale-orders?date_from=${dateFrom}&date_to=${dateTo}&limit=100`,
    };
  });
}
