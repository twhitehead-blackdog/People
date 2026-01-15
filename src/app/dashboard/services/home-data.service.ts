import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import {
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { EmployeesStore } from '../../stores/employees.store';
import {
  getDaysInMonth,
  getMonthNameSpanish,
  getPanamaNowParts,
  pad2,
} from '../../utils/panama-date.utils';

/**
 * Interface for the termination records
 */
export interface TerminationRecord {
  date: string;
  reason: string;
  employee_id: string;
}

/**
 * Interface for timelog entries used in tardiness calculations
 */
export interface TimelogEntry {
  created_at: string;
  employee_id: string;
  type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit';
  employee: {
    first_name: string;
    father_name: string;
    is_active: boolean;
  };
}

/**
 * Interface for employee schedules
 */
export interface EmployeeScheduleRecord {
  id: string;
  employee_id: string;
  company_id?: string;
  start_date: string;
  end_date: string;
  schedule: {
    id: string;
    name: string;
    entry_time?: string;
    exit_time?: string;
    minutes_tolerance?: number;
    day_off?: boolean;
  };
  employee?: {
    id: string;
    company_id: string;
    is_active: boolean;
  };
}

/**
 * Service that centralizes all HTTP data fetching for the Home Dashboard component.
 * This service uses httpResource for reactive data fetching and caching.
 */
@Injectable({
  providedIn: 'root',
})
export class HomeDataService {
  private readonly apiUrl = inject(ApiUrlService);
  private readonly organizationService = inject(OrganizationService);
  private readonly employeesStore = inject(EmployeesStore);

  /**
   * Fetches all terminations for historical calculations.
   * Used for calculating exits/hires and retention metrics.
   */
  public readonly terminationsResource = httpResource<TerminationRecord[]>(
    () => {
      const baseUrl = this.apiUrl.baseUrl;
      const url = `${baseUrl}/rest/v1/terminations?select=date,reason,employee_id&order=date.asc`;
      return {
        url,
        method: 'GET',
      };
    }
  );

  /**
   * Fetches timelogs for the current month to calculate tardiness.
   * Only fetches 'entry' type logs for employees that are currently active.
   */
  public readonly timelogsResource = httpResource<TimelogEntry[]>(() => {
    const baseUrl = this.apiUrl.baseUrl;
    // Range in Panama timezone (not dependent on device timezone)
    const { year, month, day } = getPanamaNowParts();
    const fromPanama = `${year}-${pad2(month)}-01T00:00:00-05:00`;
    const toPanama = `${year}-${pad2(month)}-${pad2(day)}T23:59:59-05:00`;
    const from = new Date(fromPanama).toISOString().split('.')[0] + 'Z';
    const to = new Date(toPanama).toISOString().split('.')[0] + 'Z';

    const companyId = this.organizationService.getCurrentCompanyId();
    let url = `${baseUrl}/rest/v1/timelogs?select=created_at,employee_id,type,employee:employees!inner(first_name,father_name,is_active)&type=eq.entry&created_at=gte.${from}&created_at=lte.${to}&order=created_at.asc&limit=5000`;

    // Filter only active employees
    url += `&employee.is_active=eq.true`;

    // Add company_id filter
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }

    return {
      url,
      method: 'GET',
    };
  });

  /**
   * Fetches employee schedules that overlap with the current month.
   * Used for calculating tardiness by comparing entry times against scheduled times.
   */
  public readonly employeeSchedulesResource = httpResource<
    EmployeeScheduleRecord[]
  >(() => {
    const baseUrl = this.apiUrl.baseUrl;
    const { year, month } = getPanamaNowParts();
    const daysInMonth = getDaysInMonth(year, month);
    const monthStart = `${year}-${pad2(month)}-01`;
    const monthEnd = `${year}-${pad2(month)}-${pad2(daysInMonth)}`;

    const companyId = this.organizationService.getCurrentCompanyId();

    let url = `${baseUrl}/rest/v1/employee_schedules?select=*,schedule:schedules(*),employee:employees!inner(id,company_id,is_active)`;
    url += `&start_date=lte.${monthEnd}&end_date=gte.${monthStart}`;
    url += `&employee.is_active=eq.true`;

    if (companyId) {
      url += `&employee.company_id=eq.${companyId}`;
    }

    return {
      url,
      method: 'GET',
    };
  });

  /**
   * Computed signal for monthly hires and exits based on current data.
   */
  public readonly monthlyHiresAndExits = computed(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Employees hired this month (start_date in current month)
    const hires = this.employeesStore
      .entities()
      .filter(
        (x) =>
          x.start_date &&
          new Date(x.start_date) >= monthStart &&
          new Date(x.start_date) <= monthEnd
      ).length;

    // Employees who left this month - use terminations table
    const terminations = this.terminationsResource.value() ?? [];
    const exits = terminations.filter((t) => {
      if (!t.date) return false;
      const terminationDate = new Date(t.date);
      return terminationDate >= monthStart && terminationDate <= monthEnd;
    }).length;

    return {
      hires,
      exits,
    };
  });

  /**
   * Computed signal for headcount trend data (last 12 months).
   * Returns data formatted for Chart.js line chart.
   */
  public readonly headcountTrendData = computed(() => {
    const now = new Date();
    const employees = this.employeesStore.entities();
    const terminations = this.terminationsResource.value() ?? [];

    // Get last 12 months
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 11),
      end: startOfMonth(now),
    });

    const headcounts: number[] = [];
    const labels: string[] = [];

    for (const monthDate of months) {
      const monthEnd = endOfMonth(monthDate);

      // Count employees active at the end of each month
      const activeCount = employees.filter((emp) => {
        if (!emp.start_date) return false;
        const startDate = new Date(emp.start_date);
        if (startDate > monthEnd) return false;

        // Check if terminated before end of month
        const termination = terminations.find((t) => t.employee_id === emp.id);
        if (termination) {
          const terminationDate = new Date(termination.date);
          if (terminationDate <= monthEnd) return false;
        }

        return true;
      }).length;

      headcounts.push(activeCount);
      labels.push(
        `${getMonthNameSpanish(
          monthDate.getMonth()
        )} ${monthDate.getFullYear()}`
      );
    }

    return {
      labels,
      datasets: [
        {
          data: headcounts,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  });

  /**
   * Helper to get loading state for all resources
   */
  public readonly isLoading = computed(
    () =>
      this.terminationsResource.isLoading() ||
      this.timelogsResource.isLoading() ||
      this.employeeSchedulesResource.isLoading()
  );

  /**
   * Helper to check if any resource has an error
   */
  public readonly hasError = computed(
    () =>
      this.terminationsResource.error() ||
      this.timelogsResource.error() ||
      this.employeeSchedulesResource.error()
  );
}
