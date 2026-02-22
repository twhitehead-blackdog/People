import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ApiUrlService } from '../../../services/api-url.service';
import { OrganizationService } from '../../../services/organization.service';
import { SupabaseRealtimeService } from '../../../services/supabase-realtime.service';
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

export interface GroomerAssignment {
  id: string;
  employee_id: string;
  branch_id: string;
  branch?: { id: string; name: string; short_name?: string };
  employee?: { id: string; first_name: string; father_name: string; position?: { name: string } };
}

export interface TimelogEntryRecord {
  id: string;
  employee_id: string;
  branch_id: string;
  created_at: string;
  punched_at?: string;
  branch?: { id: string; name: string; short_name?: string };
  employee?: { id: string; first_name: string; father_name: string; position?: { id: string; name: string } };
}

export interface TimelogExitRecord {
  id: string;
  employee_id: string;
  branch_id: string;
  created_at: string;
  punched_at?: string;
}

export interface BranchFinancialRecord {
  id: string;
  branch_id: string;
  year: number;
  month: number;
  pos_revenue: number;
  pos_order_count: number;
  pos_avg_ticket: number;
  target_baja: number;
  target_promedio: number;
  target_alta: number;
  target_oro: number;
  target_ng: number;
  payroll_total: number;
  employee_count: number;
  odoo_expenses: number;
  revenue_vs_payroll_ratio: number;
  revenue_per_employee: number;
  target_achievement_pct: number;
  synced_at: string;
  branch?: { name: string };
}

export interface GroomerMonthlyStats {
  id: string;
  groomer_odoo_id: number;
  groomer_name: string;
  year: number;
  month: number;
  total_services: number;
  total_sales: number;
  avg_per_service: number;
  shared_services: number;
  shared_pct: number;
  total_commission: number;
  commission_final: number;
  prev_month_sales: number;
  prev_month_commission: number;
  sales_growth: number;
  services_growth: number;
  ranking: number;
  absences: number;
  tardiness_hours: number;
  complaints: number;
  penalty_pct: number;
  penalty_amount: number;
}

export interface BranchDailySalesRecord {
  id: string;
  branch_id: string;
  sale_date: string;
  revenue: number;
  order_count: number;
  avg_ticket: number;
  branch?: { name: string };
}

export interface GroomerServiceLine {
  id: string;
  groomer_odoo_id: number;
  groomer_name: string;
  branch_name: string;
  service_date: string;
  product_name: string;
  pet_name: string;
  line_total: number;
  groomer_count: number;
  proportional_amount: number;
  commission_pct: number;
  commission_amount: number;
  odoo_line_id: number;
}

export interface EmployeeAuditLog {
  id: string;
  employee_id: string;
  changed_by: string | null;
  changed_at: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
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
  warehouse_id?: number | [number, string] | false;
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
  private realtimeService = inject(SupabaseRealtimeService);

  private currentCompanyId = computed(() => this.organizationService.getCurrentCompanyId());

  // Realtime: reload timelog resources when timelogs table changes
  private timelogChanges = this.realtimeService.subscribeToTable('timelogs');
  private realtimeReloadTrigger = effect(() => {
    const batch = this.timelogChanges();
    if (!batch) return;
    // Reload all timelog-related httpResources
    this.latesFromTimelogs.reload();
    this.timelogsEntryToday.reload();
    this.timelogsExitToday.reload();
    this.timelogsEntryForPeluqueriaView.reload();
    this.timelogsExitForPeluqueriaView.reload();
    this.timelogsEntryForClinicaView.reload();
    this.timelogsExitForClinicaView.reload();
  });

  // Terminations API for calculating exits/turnover
  terminationsApi = httpResource<TerminationRecord[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/terminations', {
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
  clinicaViewDate = signal(new Date());

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

  /** Marcaciones de entrada para la fecha seleccionada en vista Clínica */
  timelogsEntryForClinicaView = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const viewDate = toZonedTime(this.clinicaViewDate(), this.TZ);
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

  /** Marcaciones de salida para la fecha seleccionada en vista Clínica */
  timelogsExitForClinicaView = httpResource<any[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    const viewDate = toZonedTime(this.clinicaViewDate(), this.TZ);
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

  /** Órdenes de venta de Odoo para la fecha seleccionada en vista Clínica */
  odooSaleOrdersForClinicaView = httpResource<{ success: boolean; data: OdooSaleOrder[] }>(() => {
    const viewDate = toZonedTime(this.clinicaViewDate(), this.TZ);
    const dayStart = startOfDay(viewDate);
    const nextDay = addDays(dayStart, 1);
    const dateFrom = format(dayStart, 'yyyy-MM-dd');
    const dateTo = format(nextDay, 'yyyy-MM-dd');
    return {
      url: `/api/odoo/sale-orders?date_from=${dateFrom}&date_to=${dateTo}&limit=100`,
    };
  });

  /** Mes/año seleccionado para datos financieros */
  financialMonth = signal(new Date().getMonth() + 1); // 1-12
  financialYear = signal(new Date().getFullYear());

  /** Datos financieros mensuales por sucursal (del sync Odoo→People) */
  branchFinancials = httpResource<BranchFinancialRecord[]>(() => {
    const year = this.financialYear();
    const month = this.financialMonth();
    return {
      url: this.apiUrl.build('rest/v1/branch_financials', {
        select: '*,branch:branches(name)',
        year: `eq.${year}`,
        month: `eq.${month}`,
        order: 'pos_revenue.desc',
      }),
    };
  });

  /** Ventas diarias de los últimos 30 días (para tendencias) */
  branchDailySales = httpResource<BranchDailySalesRecord[]>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
    return {
      url: this.apiUrl.build('rest/v1/branch_daily_sales', {
        select: '*,branch:branches(name)',
        sale_date: `gte.${fromDate}`,
        order: 'sale_date.desc',
      }),
    };
  });

  /** Stats mensuales de peluqueros (del sync Odoo→People) */
  groomerStats = httpResource<GroomerMonthlyStats[]>(() => {
    const year = this.financialYear();
    const month = this.financialMonth();
    return {
      url: this.apiUrl.build('rest/v1/groomer_monthly_stats', {
        select: '*',
        year: `eq.${year}`,
        month: `eq.${month}`,
        order: 'ranking.asc',
      }),
    };
  });

  /** Datos financieros del mes anterior (para comparación MoM) */
  prevMonthFinancials = httpResource<BranchFinancialRecord[]>(() => {
    let prevMonth = this.financialMonth() - 1;
    let prevYear = this.financialYear();
    if (prevMonth < 1) { prevMonth = 12; prevYear--; }
    return {
      url: this.apiUrl.build('rest/v1/branch_financials', {
        select: 'pos_revenue,payroll_total,pos_order_count,pos_avg_ticket,employee_count,odoo_expenses',
        year: `eq.${prevYear}`,
        month: `eq.${prevMonth}`,
      }),
    };
  });

  /** Líneas de servicio detalladas de peluqueros (últimos 30 días) */
  groomerServiceLines = httpResource<GroomerServiceLine[]>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
    return {
      url: this.apiUrl.build('rest/v1/groomer_service_lines', {
        select: 'id,groomer_odoo_id,groomer_name,branch_name,service_date,product_name,pet_name,line_total,groomer_count,proportional_amount,commission_pct,commission_amount,odoo_line_id',
        service_date: `gte.${fromDate}`,
        order: 'service_date.desc',
        limit: '500',
      }),
    };
  });

  // ===== HR Requests (Top rankings para Resumen Ejecutivo) =====

  /** Incapacidades aprobadas (para top ranking) */
  approvedDisabilities = httpResource<{ id: string; employee_id: string; employee?: { first_name?: string; father_name?: string } }[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities', {
        company_id: `eq.${companyId}`,
        status: 'eq.approved',
        select: 'id,employee_id,employee:employees!employee_disabilities_employee_id_fkey(first_name,father_name)',
      }),
    };
  });

  /** Compensatorios aprobados (para top ranking) */
  approvedCompensatory = httpResource<{ id: string; employee_id: string; employee?: { first_name?: string; father_name?: string } }[]>(() => {
    const companyId = this.currentCompanyId();
    if (!companyId) return undefined;
    return {
      url: this.apiUrl.build('rest/v1/timeoffs', {
        company_id: `eq.${companyId}`,
        type_id: 'eq.f2d92995-96a0-414f-b64a-9823db776745',
        review_status: 'eq.approved',
        select: 'id,employee_id,employee:employees!time_offs_employee_id_fkey(first_name,father_name)',
      }),
    };
  });


  /** Últimos cambios en empleados (audit log) */
  employeeAuditLog = httpResource<EmployeeAuditLog[]>(() => {
    return {
      url: this.apiUrl.build('rest/v1/employee_audit_log', {
        select: 'id,employee_id,changed_by,changed_at,action,field_name,old_value,new_value,employee:employees(first_name,father_name)',
        order: 'changed_at.desc',
        limit: '50',
      }),
    };
  });
}
