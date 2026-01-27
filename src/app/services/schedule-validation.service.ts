import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { format, isSunday, parseISO } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import {
  Employee,
  EmployeeSchedule,
  Schedule,
  ScheduleConfiguration,
} from '../models';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

// Default configuration values for schedules without explicit config
const DEFAULT_CONFIG: Omit<ScheduleConfiguration, 'id' | 'schedule_id'> = {
  is_active: true,
  allow_for_managers: true,
  allow_for_submanagers: true,
  allowed_position_ids: [],
  daily_usage_limit: 0,
};

// Cache for configurations
interface ConfigCache {
  data: Map<string, ScheduleConfiguration>;
  lastUpdated: Date | null;
}

@Injectable({ providedIn: 'root' })
export class ScheduleValidationService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private orgService = inject(OrganizationService);

  // Cache duration: 5 minutes
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000;

  // Configuration cache
  private configCache: ConfigCache = {
    data: new Map(),
    lastUpdated: null,
  };

  // Roles constants (normalized to uppercase for comparison)
  private readonly ROLES = {
    PELUQUERO: 'Peluquero',
    AYUDANTE_PELUQUERIA: 'Ayudante de Peluqueria',
    DOCTOR: 'Doctor',
    CHOFER: 'Conductor',
    GERENTE: 'Gerente de Tienda',
    SUBGERENTE: 'Sub Gerente',
  };

  // Schedule Names constants
  public readonly SCHEDULES = {
    SHIFT_7AM_4PM: '7AM-4PM',
    SHIFT_8AM_5PM: '8AM-5PM',
    SHIFT_9AM_6PM: '9AM - 6PM',
    SHIFT_1230PM_900PM: '12:30 PM - 9:00 PM',
    SHIFT_LACTANCIA_1: 'LACTANCIA 1',
    SHIFT_SUNDAY: '10:30AM-7:00PM',
    DAY_OFF: 'DIA LIBRE',
    COMPENSATORY: 'COMPENSATORIO',
  };

  /**
   * Load configurations from database with caching
   */
  async loadConfigurations(): Promise<Map<string, ScheduleConfiguration>> {
    // Check cache validity
    if (
      this.configCache.lastUpdated &&
      Date.now() - this.configCache.lastUpdated.getTime() < this.CACHE_DURATION_MS
    ) {
      return this.configCache.data;
    }

    try {
      const companyId = this.orgService.getCurrentCompanyId();
      const params: Record<string, string> = {
        select: '*',
      };

      if (companyId) {
        params['or'] = `(company_id.is.null,company_id.eq.${companyId})`;
      }

      const url = this.apiUrl.build('rest/v1/schedule_configurations', params);
      const configs = await firstValueFrom(
        this.http.get<ScheduleConfiguration[]>(url)
      );

      // Update cache
      this.configCache.data.clear();
      for (const config of configs) {
        this.configCache.data.set(config.schedule_id, config);
      }
      this.configCache.lastUpdated = new Date();

      return this.configCache.data;
    } catch (error) {
      console.error(
        '[ScheduleValidationService] Error loading configurations:',
        error
      );
      // Return empty cache on error to allow fallback to defaults
      return this.configCache.data;
    }
  }

  /**
   * Get configuration for a specific schedule
   * Returns default config if no configuration exists
   */
  getConfigurationForSchedule(
    scheduleId: string,
    configs?: Map<string, ScheduleConfiguration>
  ): ScheduleConfiguration {
    const configMap = configs || this.configCache.data;
    const config = configMap.get(scheduleId);

    if (config) {
      return config;
    }

    // Return default config with schedule_id
    return {
      id: '',
      schedule_id: scheduleId,
      ...DEFAULT_CONFIG,
    };
  }

  /**
   * Invalidate the configuration cache
   */
  invalidateCache(): void {
    this.configCache.lastUpdated = null;
  }

  /**
   * Filter available schedules for an employee based on their role, position, and the date.
   * Uses dynamic configurations from database.
   */
  getAvailableSchedulesForEmployee(
    allSchedules: Schedule[],
    employee: Employee | undefined | null,
    date: Date | string | null,
    isAdmin: boolean,
    configs?: Map<string, ScheduleConfiguration>
  ): Schedule[] {
    // Admins see all schedules
    if (isAdmin) return allSchedules;

    if (!employee || !employee.position) return allSchedules;

    const positionName = employee.position.name.toUpperCase();
    const positionId = employee.position_id;
    const targetDate = date
      ? typeof date === 'string'
        ? parseISO(date)
        : date
      : new Date();
    const isSundayDate = isSunday(targetDate);

    // Use provided configs or fall back to cache
    const configMap = configs || this.configCache.data;

    return allSchedules.filter((schedule) => {
      const scheduleName = schedule.name.toUpperCase();

      // Get configuration for this schedule
      const config = this.getConfigurationForSchedule(schedule.id, configMap);

      // 1. Check if schedule is active
      if (!config.is_active) {
        return false;
      }

      // 2. Sunday restriction (special case - always apply)
      if (scheduleName.includes(this.SCHEDULES.SHIFT_SUNDAY)) {
        return isSundayDate;
      }

      // 3. Manager/Submanager restrictions from config
      const isManager = positionName.includes(this.ROLES.GERENTE.toUpperCase());
      const isSubManager = positionName.includes(
        this.ROLES.SUBGERENTE.toUpperCase()
      );

      if (isManager && !config.allow_for_managers) {
        return false;
      }

      if (isSubManager && !config.allow_for_submanagers) {
        return false;
      }

      // 4. Position restrictions from config
      if (
        config.allowed_position_ids &&
        config.allowed_position_ids.length > 0
      ) {
        if (!config.allowed_position_ids.includes(positionId)) {
          return false;
        }
      }

      // 5. Hide compensatory if not admin (this check always applies)
      if (scheduleName.includes(this.SCHEDULES.COMPENSATORY)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Validate daily usage limit for a schedule
   * Returns { valid: true } if within limit or no limit set
   * Returns { valid: false, message: '...' } if limit exceeded
   */
  async validateDailyUsageLimit(
    scheduleId: string,
    date: Date | string,
    excludeEmployeeScheduleId?: string
  ): Promise<{ valid: boolean; message?: string; currentCount?: number; limit?: number }> {
    // Load configs if not cached
    const configs = await this.loadConfigurations();
    const config = this.getConfigurationForSchedule(scheduleId, configs);

    // No limit set
    if (config.daily_usage_limit === 0) {
      return { valid: true };
    }

    // Count current usage for this schedule on this date
    const dateStr =
      typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const companyId = this.orgService.getCurrentCompanyId();

    try {
      const params: Record<string, string> = {
        select: 'id',
        schedule_id: `eq.${scheduleId}`,
        start_date: `lte.${dateStr}`,
        end_date: `gte.${dateStr}`,
      };

      if (companyId) {
        params['company_id'] = `eq.${companyId}`;
      }

      // Exclude the current schedule being edited (if updating)
      if (excludeEmployeeScheduleId) {
        params['id'] = `neq.${excludeEmployeeScheduleId}`;
      }

      const url = this.apiUrl.build('rest/v1/employee_schedules', params);
      const schedules = await firstValueFrom(
        this.http.get<{ id: string }[]>(url)
      );

      const currentCount = schedules.length;

      if (currentCount >= config.daily_usage_limit) {
        return {
          valid: false,
          message: `Este horario ya alcanzó su límite diario de ${config.daily_usage_limit} empleados para el día ${dateStr}. Actualmente hay ${currentCount} asignaciones.`,
          currentCount,
          limit: config.daily_usage_limit,
        };
      }

      return {
        valid: true,
        currentCount,
        limit: config.daily_usage_limit,
      };
    } catch (error) {
      console.error(
        '[ScheduleValidationService] Error validating daily limit:',
        error
      );
      // Allow the operation if validation fails
      return { valid: true };
    }
  }

  /**
   * Validates if a Manager and Submanager are assigned the same schedule in the same branch.
   * Returns { valid: false, message: '...' } if conflict exists.
   */
  validateManagerSubmanagerConflict(
    employee: Employee,
    scheduleId: string,
    allSchedules: Schedule[],
    branchEmployees: Employee[],
    existingSchedules: EmployeeSchedule[],
    startDate: Date,
    endDate: Date
  ): { valid: boolean; message?: string } {
    const positionName = employee.position?.name.toUpperCase() || '';

    // Identify if current employee is Manager or Submanager
    const isManager = positionName.includes(this.ROLES.GERENTE.toUpperCase());
    const isSubManager = positionName.includes(
      this.ROLES.SUBGERENTE.toUpperCase()
    );

    if (!isManager && !isSubManager) return { valid: true };

    // Find the counterpart role we need to check against
    const counterpartRole = isManager
      ? this.ROLES.SUBGERENTE
      : this.ROLES.GERENTE;

    // Find employees in the same branch with the counterpart role
    const potentialConflicts = branchEmployees.filter(
      (emp) =>
        emp.id !== employee.id && // Exclude self
        emp.branch_id === employee.branch_id &&
        emp.position?.name.toUpperCase().includes(counterpartRole.toUpperCase())
    );

    if (potentialConflicts.length === 0) return { valid: true };

    // Check if any counterpart has the same schedule on the overlapping dates
    const schedule = allSchedules.find((s) => s.id === scheduleId);
    if (!schedule) return { valid: true };

    for (const otherEmp of potentialConflicts) {
      const otherSchedules = existingSchedules.filter(
        (s) => s.employee_id === otherEmp.id
      );

      for (const s of otherSchedules) {
        // Check date overlap
        const overlap = this.checkDateOverlap(
          startDate,
          endDate,
          new Date(s.start_date),
          new Date(s.end_date)
        );

        if (overlap && s.schedule_id === scheduleId) {
          return {
            valid: false,
            message: `Conflicto: ${isManager ? 'Gerente' : 'Subgerente'} y ${
              isManager ? 'Subgerente' : 'Gerente'
            } no pueden tener el mismo horario (${
              schedule.name
            }) en la misma sucursal.`,
          };
        }
      }
    }

    return { valid: true };
  }

  private checkDateOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
  ): boolean {
    return startA <= endB && endA >= startB;
  }
}
