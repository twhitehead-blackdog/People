import { Injectable, computed, inject } from '@angular/core';
import { formatInTimeZone } from 'date-fns-tz';
import {
  TIMEZONE_PANAMA,
  calcTimeDiff,
  getPanamaNowParts,
} from '../../utils/panama-date.utils';
import { EmployeeScheduleRecord, HomeDataService } from './home-data.service';

/**
 * Interface for a late entry detail
 */
export interface LateDetail {
  name: string;
  scheduledEntry?: string;
  actualEntry?: string;
  minutesLate?: number;
  date: string;
  employeeId: string;
}

/**
 * Interface for employee late summary
 */
export interface EmployeeLatesSummary {
  employeeId: string;
  employeeName: string;
  lateCount: number;
  totalMinutesLate: number;
}

/**
 * Interface for employee absence summary
 */
export interface EmployeeAbsenceSummary {
  employee_name: string;
  count: number;
}

/**
 * Interface for daily lates data (for charts)
 */
export interface DailyLatesData {
  date: string;
  dayLabel: string;
  count: number;
  details: LateDetail[];
}

/**
 * UUIDs for special schedule types that should be excluded from tardiness calculations
 */
const FERIADO_SCHEDULE_ID = '3d07f626-d58f-4203-bac5-f6e35557e0ad';
const DIA_LIBRE_SCHEDULE_ID = 'c01dff8f-ce0d-498f-a473-46418576e589';

/**
 * Service that handles all tardiness calculation logic.
 * Extracted from HomeComponent to improve maintainability and testability.
 */
@Injectable({
  providedIn: 'root',
})
export class TardinessCalculationService {
  private readonly homeDataService = inject(HomeDataService);

  /**
   * Processes timelogs to get first entry per employee per day.
   * Returns a Map with key format: `${employee_id}_${yyyy-MM-dd}`
   */
  private getEntriesByEmployeeDay = computed(() => {
    const timelogs = this.homeDataService.timelogsResource.value() ?? [];
    const { year, month } = getPanamaNowParts();
    const currentMonthIndex = month - 1;
    const currentYear = year;

    const entriesByEmployeeDay = new Map<
      string,
      {
        employee_id: string;
        employee_name: string;
        entry_time: Date;
        day: string;
      }
    >();

    for (const log of timelogs) {
      if (log.type !== 'entry') continue;

      const entryTime = new Date(log.created_at);
      const logYear = parseInt(
        formatInTimeZone(entryTime, TIMEZONE_PANAMA, 'yyyy'),
        10
      );
      const logMonthIndex =
        parseInt(formatInTimeZone(entryTime, TIMEZONE_PANAMA, 'MM'), 10) - 1;

      if (logMonthIndex !== currentMonthIndex || logYear !== currentYear) {
        continue;
      }

      const entryDayStr = formatInTimeZone(
        entryTime,
        TIMEZONE_PANAMA,
        'yyyy-MM-dd'
      );
      const dayKey = `${log.employee_id}_${entryDayStr}`;

      // Keep only the first entry of the day
      if (!entriesByEmployeeDay.has(dayKey)) {
        entriesByEmployeeDay.set(dayKey, {
          employee_id: log.employee_id,
          employee_name: `${log.employee?.first_name ?? ''} ${
            log.employee?.father_name ?? ''
          }`.trim(),
          entry_time: entryTime,
          day: entryDayStr,
        });
      }
    }

    return entriesByEmployeeDay;
  });

  /**
   * Finds the schedule for an employee on a specific day.
   */
  private findScheduleForEmployeeDay(
    schedules: EmployeeScheduleRecord[],
    employeeId: string,
    day: string
  ): EmployeeScheduleRecord | undefined {
    return schedules.find(
      (s) =>
        s.employee_id === employeeId && s.start_date <= day && s.end_date >= day
    );
  }

  /**
   * Checks if a schedule should be excluded from tardiness calculations.
   */
  private isExcludedSchedule(schedule: EmployeeScheduleRecord): boolean {
    const scheduleId = schedule.schedule?.id;
    const isFeriado = scheduleId === FERIADO_SCHEDULE_ID;
    const isDiaLibre = scheduleId === DIA_LIBRE_SCHEDULE_ID;
    return isFeriado || isDiaLibre || !!schedule.schedule?.day_off;
  }

  /**
   * Formats scheduled entry time to HH:mm:ss format.
   */
  private formatScheduledEntryTime(
    entryTime: string | Date | undefined
  ): string | null {
    if (!entryTime) return null;

    if (entryTime instanceof Date) {
      return formatInTimeZone(entryTime, TIMEZONE_PANAMA, 'HH:mm:ss');
    }

    if (typeof entryTime === 'string') {
      const parts = entryTime.split(':');
      return parts.length >= 2
        ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(
            parts[2] || '00'
          ).padStart(2, '0')}`
        : null;
    }

    return null;
  }

  /**
   * Computes all late details for the current month.
   */
  public readonly allLateDetails = computed((): LateDetail[] => {
    const schedules =
      this.homeDataService.employeeSchedulesResource.value() ?? [];
    const entriesByEmployeeDay = this.getEntriesByEmployeeDay();
    const lateDetails: LateDetail[] = [];

    if (schedules.length === 0) return [];

    for (const [_, entry] of entriesByEmployeeDay) {
      const schedule = this.findScheduleForEmployeeDay(
        schedules,
        entry.employee_id,
        entry.day
      );

      if (!schedule || !schedule.schedule?.entry_time) continue;
      if (this.isExcludedSchedule(schedule)) continue;

      const scheduledEntry = this.formatScheduledEntryTime(
        schedule.schedule.entry_time
      );
      if (!scheduledEntry) continue;

      const actualEntry = formatInTimeZone(
        entry.entry_time,
        TIMEZONE_PANAMA,
        'HH:mm:ss'
      );
      const minutesLate = calcTimeDiff(actualEntry, scheduledEntry);
      const tolerance = schedule.schedule.minutes_tolerance ?? 0;

      if (minutesLate > tolerance) {
        lateDetails.push({
          name: entry.employee_name,
          scheduledEntry: scheduledEntry.substring(0, 5),
          actualEntry: actualEntry.substring(0, 5),
          minutesLate,
          date: entry.day,
          employeeId: entry.employee_id,
        });
      }
    }

    return lateDetails;
  });

  /**
   * Gets the total count of lates for the current month.
   */
  public readonly monthlyLatesCount = computed((): number => {
    return this.allLateDetails().length;
  });

  /**
   * Gets daily lates data for chart display.
   */
  public readonly dailyLatesData = computed((): DailyLatesData[] => {
    const allLates = this.allLateDetails();
    const { year, month, day: currentDay } = getPanamaNowParts();

    // Group by date
    const byDate = new Map<string, LateDetail[]>();
    for (const late of allLates) {
      const existing = byDate.get(late.date) ?? [];
      existing.push(late);
      byDate.set(late.date, existing);
    }

    // Create array for all days up to current day
    const result: DailyLatesData[] = [];
    for (let d = 1; d <= currentDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const details = byDate.get(dateStr) ?? [];
      result.push({
        date: dateStr,
        dayLabel: String(d),
        count: details.length,
        details,
      });
    }

    return result;
  });

  /**
   * Gets Chart.js compatible data for the lates sparkline chart.
   */
  public readonly latesChartData = computed(() => {
    const dailyData = this.dailyLatesData();

    return {
      labels: dailyData.map((d) => d.dayLabel),
      datasets: [
        {
          data: dailyData.map((d) => d.count),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: (ctx: { dataIndex: number }) =>
            dailyData[ctx.dataIndex]?.count > 0 ? 4 : 0,
          pointHoverRadius: 6,
          pointHitRadius: 10,
          // Add custom data for tooltip
          customDetails: dailyData.map((d) => d.details),
        },
      ],
    };
  });

  /**
   * Gets employees with most lates, sorted by count descending.
   */
  public readonly topLatesList = computed((): EmployeeLatesSummary[] => {
    const allLates = this.allLateDetails();

    // Group by employee
    const byEmployee = new Map<string, EmployeeLatesSummary>();
    for (const late of allLates) {
      const existing = byEmployee.get(late.employeeId);
      if (existing) {
        existing.lateCount++;
        existing.totalMinutesLate += late.minutesLate ?? 0;
      } else {
        byEmployee.set(late.employeeId, {
          employeeId: late.employeeId,
          employeeName: late.name,
          lateCount: 1,
          totalMinutesLate: late.minutesLate ?? 0,
        });
      }
    }

    // Sort by count descending
    return Array.from(byEmployee.values()).sort(
      (a, b) => b.lateCount - a.lateCount
    );
  });

  /**
   * Gets the top lates count (first employee's late count).
   */
  public readonly topLatesCount = computed((): number => {
    const topList = this.topLatesList();
    return topList.length > 0 ? topList[0].lateCount : 0;
  });

  /**
   * Gets the name of the employee with most lates.
   */
  public readonly topLatesEmployeeName = computed((): string => {
    const topList = this.topLatesList();
    return topList.length > 0 ? topList[0].employeeName : 'N/A';
  });

  /**
   * Gets all absences (schedules without entry) for the month.
   */
  public readonly topAbsencesList = computed((): EmployeeAbsenceSummary[] => {
    const schedules =
      this.homeDataService.employeeSchedulesResource.value() ?? [];
    const entriesByEmployeeDay = this.getEntriesByEmployeeDay(); // Map<key, {day...}>

    if (schedules.length === 0) {
      return [];
    }

    const { year, month, day: currentDay } = getPanamaNowParts();
    const currentMonthIndex = month - 1;

    // We can't easily query the Map "does employee X check in on day Y?" without keys.
    // getEntriesByEmployeeDay keys are `${employee_id}_${yyyy-MM-dd}`. This works.

    const absencesByEmployee = new Map<
      string,
      { employee_name: string; count: number }
    >();

    // For each day of the month so far
    for (let day = 1; day <= currentDay; day++) {
      const checkDate = new Date(year, currentMonthIndex, day);
      const checkDateStr = formatInTimeZone(
        checkDate,
        TIMEZONE_PANAMA,
        'yyyy-MM-dd'
      );

      // Find all employees scheduled for this day
      // Optimized: filter first? or iterate all schedules?
      // Since schedules cover ranges, we must iterate all schedules and check if they cover this day.
      for (const s of schedules) {
        if (s.start_date > checkDateStr || s.end_date < checkDateStr) continue;
        if (this.isExcludedSchedule(s)) continue; // skip holidays, days off
        if (!s.schedule?.entry_time) continue;

        // Check for entry
        const dayKey = `${s.employee_id}_${checkDateStr}`;
        if (!entriesByEmployeeDay.has(dayKey)) {
          // It's an absence
          const employeeId = s.employee_id;
          if (!absencesByEmployee.has(employeeId)) {
            let employeeName = 'Empleado desconocido';
            // Try to get name from schedule object if possible (it has `employee` relation usually)
            if (s.employee) {
              const emp = Array.isArray(s.employee)
                ? s.employee[0]
                : s.employee;
              if (emp) {
                employeeName = `${emp.first_name ?? ''} ${
                  emp.father_name ?? ''
                }`.trim();
              }
            }
            absencesByEmployee.set(employeeId, {
              employee_name: employeeName,
              count: 0,
            });
          }
          const current = absencesByEmployee.get(employeeId)!;
          current.count++;
        }
      }
    }

    return Array.from(absencesByEmployee.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
  });

  /**
   * Gets total absences of the top absent employee.
   */
  public readonly topAbsencesCount = computed((): number => {
    const topList = this.topAbsencesList();
    return topList.length > 0 ? topList[0].count : 0;
  });

  /**
   * Gets name of the top absent employee.
   */
  public readonly topAbsencesEmployeeName = computed((): string => {
    const topList = this.topAbsencesList();
    if (topList.length > 0) {
      const name = topList[0].employee_name;
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    return 'Ninguno';
  });

  /**
   * Gets late details for a specific date (for dialog display).
   */
  public getLateDetailsForDate(date: string): LateDetail[] {
    return this.allLateDetails().filter((l) => l.date === date);
  }

  /**
   * Loading state
   */
  public readonly isLoading = computed(
    () =>
      this.homeDataService.timelogsResource.isLoading() ||
      this.homeDataService.employeeSchedulesResource.isLoading()
  );
}
