import {
  addDays,
  compareAsc,
  differenceInMinutes,
  differenceInSeconds,
  format,
  getYear,
  isValid,
  set,
} from 'date-fns';
import { resolveEmployeeScheduleForDate } from '../../../utils/employee-schedule.utils';
import { formatInTimeZone } from 'date-fns-tz';
import {
  DayLog,
  Employee,
  EmployeeScheduleData,
  Schedule,
  TimeoffData,
} from '../../../models';
import { matchesEmployeeSearch } from './employee-search.utils';
import { calcTimeDiff } from './time.utils';
import {
  RESTRICTED_SCHEDULE_IDS,
  RESTRICTED_SCHEDULE_NAMES,
  RESTRICTED_TIMEOFF_TYPE_IDS,
} from './timelogs-constants';

export interface DayLogProcessingInput {
  logsData: any[];
  schedulesData: EmployeeScheduleData[];
  timeoffsData: TimeoffData[];
  daysList: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  employeesList: Partial<Employee>[];
  employeeSearch: string;
  employeeId: string | undefined;
  branchId: string | undefined;
  onlyWithMarcaciones: boolean;
  timezone: string;
  logger?: { warn: (...args: any[]) => void };
}

/**
 * Parsea la fecha de un log priorizando punched_at sobre created_at
 */
export function parseLogDate(
  log: any,
  logger?: { warn: (...args: any[]) => void }
): Date {
  const rawDate = log.punched_at || log.created_at;
  const date = new Date(rawDate);

  if (!isValid(date)) {
    logger?.warn('[TimelogsComponent] Fecha inválida encontrada:', log);
    return new Date();
  }

  if (getYear(date) < 2020) {
    logger?.warn('[TimelogsComponent] Fecha sospechosa (año < 2020):', {
      id: log.id,
      date: rawDate,
      parsed: date,
    });
  }

  return date;
}

/**
 * Filtra y parsea los logs crudos, asignando el día correcto en zona horaria de Panamá
 */
function filterAndParseRawLogs(
  logsData: any[],
  branchId: string | undefined,
  dateRangeStart: string,
  dateRangeEnd: string,
  timezone: string,
  logger?: { warn: (...args: any[]) => void }
): any[] {
  return logsData
    .filter((x: any) => (branchId ? x.branch_id === branchId : true))
    .map((x: any) => {
      const logDate = parseLogDate(x, logger);
      const dayStr = formatInTimeZone(logDate, timezone, 'yyyy-MM-dd');
      return { ...x, day: dayStr };
    })
    .filter((x: any) => {
      const logDay = x.day;
      return (
        logDay >= dateRangeStart &&
        logDay <= dateRangeEnd &&
        logDay !== format(new Date('1900-01-01'), 'yyyy-MM-dd')
      );
    });
}

/**
 * Construye el mapa de empleados únicos que deben aparecer en la tabla
 */
function buildUniqueEmployeesMap(
  filteredLogs: any[],
  employeesList: Partial<Employee>[],
  employeeSearch: string,
  employeeId: string | undefined,
  branchId: string | undefined,
  onlyWithMarcaciones: boolean
): Map<string, Partial<Employee>> {
  const uniqueEmployees = new Map<string, Partial<Employee>>();

  // Si hay búsqueda por nombre, incluir empleados que coincidan incluso si no tienen timelogs
  if (employeeSearch) {
    employeesList.forEach((emp) => {
      if (!emp.is_active) return;
      if (
        matchesEmployeeSearch(emp, employeeSearch) &&
        !uniqueEmployees.has(emp.id!)
      ) {
        uniqueEmployees.set(emp.id!, emp);
      }
    });
  }

  // Agregar empleados que tienen logs, usando datos completos de employeesList
  filteredLogs.forEach((log: any) => {
    if (log.employee?.id && !uniqueEmployees.has(log.employee.id)) {
      const fullEmployee = employeesList.find(
        (emp) => emp.id === log.employee.id
      );
      if (fullEmployee || log.employee) {
        uniqueEmployees.set(log.employee.id, fullEmployee || log.employee);
      }
    }
  });

  // Agregar empleado seleccionado si hay filtro por empleado
  if (employeeId) {
    const selectedEmployee = employeesList.find(
      (emp) => emp.id === employeeId
    );
    if (selectedEmployee && !uniqueEmployees.has(selectedEmployee.id!)) {
      uniqueEmployees.set(selectedEmployee.id!, selectedEmployee);
    }
  }

  // Sin búsqueda y onlyWithMarcaciones=false: mostrar empleados de la sucursal
  if (!employeeSearch && !onlyWithMarcaciones) {
    employeesList.forEach((emp) => {
      if (emp.is_active) {
        if (branchId) {
          if (
            emp.branch_id === branchId &&
            !uniqueEmployees.has(emp.id!)
          ) {
            uniqueEmployees.set(emp.id!, emp);
          }
        } else {
          if (!uniqueEmployees.has(emp.id!)) {
            uniqueEmployees.set(emp.id!, emp);
          }
        }
      }
    });
  }

  return uniqueEmployees;
}

/**
 * Crea la estructura inicial de DayLogs con todos los días para todos los empleados
 */
function createInitialDayLogs(
  uniqueEmployees: Map<string, Partial<Employee>>,
  daysList: string[],
  dateRangeStart: string,
  dateRangeEnd: string,
  schedulesData: EmployeeScheduleData[]
): DayLog[] {
  const acc: DayLog[] = [];

  uniqueEmployees.forEach((employee) => {
    daysList.forEach((day) => {
      if (day < dateRangeStart || day > dateRangeEnd) {
        return;
      }

      // Buscar schedules que coincidan con el rango de fechas
      const matchingSchedules = schedulesData.filter(
        (schedule) =>
          schedule.employee_id === employee.id &&
          schedule.start_date <= day &&
          schedule.end_date >= day
      );

      // Resolver usando el resolver canónico: individual > aprobado > más reciente
      const schedule = resolveEmployeeScheduleForDate(employee.id!, day, matchingSchedules);

      // Detectar si hay un schedule de compensatorio por horas para este día
      const compensatorySchedule = matchingSchedules.find(
        (s) => s.time_off_type === 'compensatory_hours' && s.compensatory_hours_amount
      );

      acc.push({
        employee,
        day,
        schedule,
        compensatoryHours: compensatorySchedule?.compensatory_hours_amount ?? null,
        delay: undefined,
        alert: undefined,
        scheduleError: false,
        shiftMismatch: false,
        expectedScheduleName: undefined,
        lunchExceeded: false,
        lunchMinutes: undefined,
        earlyExit: false,
        insufficientHours: false,
        totalHours: undefined,
        overtimeHours: undefined,
        entry: undefined,
        lunch_start: undefined,
        lunch_end: undefined,
        exit: undefined,
      });
    });
  });

  return acc;
}

/**
 * Detecta alertas de feriado/día libre para un DayLog
 */
function detectAlerts(
  dayLog: DayLog,
  timeoffsData: TimeoffData[],
  timezone: string
): void {
  const dayDate = new Date(dayLog.day);
  const dayStr = formatInTimeZone(dayDate, timezone, 'yyyy-MM-dd');
  const hasMark = dayLog.entry || dayLog.lunch_start || dayLog.exit;

  // Verificar timeoff
  const timeoffForDay = timeoffsData.find((timeoff) => {
    if (timeoff.employee_id !== dayLog.employee.id) return false;
    const fromStr = format(new Date(timeoff.date_from), 'yyyy-MM-dd');
    const toStr = format(new Date(timeoff.date_to), 'yyyy-MM-dd');
    return dayStr >= fromStr && dayStr <= toStr;
  });
  // Compensatorio por horas: el empleado SÍ debe trabajar, no es un día libre completo
  const isCompensatoryHours = timeoffForDay?.compensatory_type === 'hours';
  const hasTimeOff = !!timeoffForDay && !isCompensatoryHours;
  const timeoffTypeId = timeoffForDay?.type_id || timeoffForDay?.type?.id;
  const hasRestrictedTimeOff =
    hasTimeOff &&
    timeoffTypeId &&
    RESTRICTED_TIMEOFF_TYPE_IDS.includes(timeoffTypeId);

  // Verificar schedule restringido
  const scheduleId = dayLog.schedule?.schedule?.id;
  const scheduleName = dayLog.schedule?.schedule?.name?.toLowerCase() || '';
  const isRestrictedScheduleId =
    scheduleId && RESTRICTED_SCHEDULE_IDS.includes(scheduleId);
  const isRestrictedScheduleName = RESTRICTED_SCHEDULE_NAMES.some((name) =>
    scheduleName.includes(name)
  );
  const isScheduleFeriado =
    isRestrictedScheduleId ||
    isRestrictedScheduleName ||
    dayLog.schedule?.schedule?.day_off;

  if (hasTimeOff && hasMark) {
    dayLog.alert = 'Feriado';
    dayLog.scheduleError = true;
  }
  if (hasTimeOff && !hasMark) {
    dayLog.alert = 'Feriado';
    dayLog.scheduleError = false;
  }
  if (isScheduleFeriado && hasMark) {
    dayLog.alert = dayLog.schedule?.schedule?.day_off
      ? 'Día Libre'
      : 'Feriado';
    dayLog.scheduleError = true;
  }
  if (isScheduleFeriado && !hasMark) {
    dayLog.alert = dayLog.schedule?.schedule?.day_off
      ? 'Día Libre'
      : 'Feriado';
    dayLog.scheduleError = false;
  }
}

/**
 * Calcula retraso, almuerzo, salida temprana y horas trabajadas para un DayLog
 */
function calculateMetrics(
  dayLog: DayLog,
  timeoffsData: TimeoffData[],
  timezone: string,
  delayToleranceMinutes: number,
  logger?: { warn: (...args: any[]) => void }
): void {
  const hasMark = dayLog.entry || dayLog.lunch_start || dayLog.exit;

  if (!hasMark) return;

  const dayDate = new Date(dayLog.day);
  const dayStr = formatInTimeZone(dayDate, timezone, 'yyyy-MM-dd');

  const timeoffForDay = timeoffsData.find((timeoff) => {
    if (timeoff.employee_id !== dayLog.employee.id) return false;
    const fromStr = format(new Date(timeoff.date_from), 'yyyy-MM-dd');
    const toStr = format(new Date(timeoff.date_to), 'yyyy-MM-dd');
    return dayStr >= fromStr && dayStr <= toStr;
  });
  // Compensatorio por horas: el empleado SÍ debe trabajar
  const isCompensatoryHoursMetrics = timeoffForDay?.compensatory_type === 'hours';
  const hasTimeOff = !!timeoffForDay && !isCompensatoryHoursMetrics;

  const scheduleId = dayLog.schedule?.schedule?.id;
  const scheduleName = dayLog.schedule?.schedule?.name?.toLowerCase() || '';
  const isRestrictedScheduleId =
    scheduleId && RESTRICTED_SCHEDULE_IDS.includes(scheduleId);
  const isRestrictedScheduleName = RESTRICTED_SCHEDULE_NAMES.some((name) =>
    scheduleName.includes(name)
  );
  const isScheduleFeriado =
    isRestrictedScheduleId ||
    isRestrictedScheduleName ||
    dayLog.schedule?.schedule?.day_off;

  if (hasTimeOff) {
    if (!dayLog.scheduleError) {
      dayLog.scheduleError = true;
    }
  } else if (dayLog.schedule?.schedule) {
    if (dayLog.schedule.schedule.day_off || isScheduleFeriado) {
      dayLog.delay = 'DIA LIBRE';
      dayLog.alert = dayLog.schedule.schedule.day_off
        ? 'Día Libre'
        : 'Feriado';
      dayLog.scheduleError = true;
    } else {
      // Calcular retraso si hay entrada
      if (dayLog.entry) {
        const entryTime = formatInTimeZone(
          dayLog.entry.date,
          timezone,
          'HH:mm:ss'
        );
        const scheduleTime = dayLog.schedule.schedule.entry_time;
        if (scheduleTime) {
          const scheduleTimeStr =
            typeof scheduleTime === 'string'
              ? scheduleTime
              : format(new Date(scheduleTime), 'HH:mm:ss');
          const delayTotal = calcTimeDiff(entryTime, scheduleTimeStr);

          // Detectar error de marcación: entrada difiere más de 2h del turno asignado
          const SHIFT_MISMATCH_THRESHOLD = 120; // 2 horas en minutos
          if (Math.abs(delayTotal) > SHIFT_MISMATCH_THRESHOLD) {
            dayLog.shiftMismatch = true;
            dayLog.expectedScheduleName = dayLog.schedule?.schedule?.name ?? '';
            // No calcular tardanza en este caso — es turno incorrecto, no tardanza
            dayLog.delay = undefined;
            dayLog.withinTolerance = false;
          } else if (delayTotal > delayToleranceMinutes) {
            dayLog.delay = delayTotal - delayToleranceMinutes;
            dayLog.withinTolerance = false;
          } else if (delayTotal > 0) {
            dayLog.delay = undefined;
            dayLog.withinTolerance = true;
            dayLog.toleranceUsedMinutes = delayTotal;
          } else {
            dayLog.delay = undefined;
            dayLog.withinTolerance = false;
            dayLog.toleranceUsedMinutes = 0;
          }
        }
      }
    }
  } else {
    // Sin horario — se muestra en la columna Horario de la tabla, no como alert tag
  }

  // Validar tiempo de almuerzo
  if (dayLog.lunch_start && dayLog.lunch_end) {
    const lunchMinutes = differenceInMinutes(
      dayLog.lunch_end.date,
      dayLog.lunch_start.date
    );
    dayLog.lunchMinutes = lunchMinutes;
    dayLog.lunchExceeded = lunchMinutes > 60;
  } else {
    dayLog.lunchExceeded = false;
  }

  // Validar salida temprana
  if (
    dayLog.schedule?.schedule &&
    dayLog.exit &&
    !dayLog.schedule.schedule.day_off
  ) {
    const exitTime = formatInTimeZone(dayLog.exit.date, timezone, 'HH:mm:ss');
    const scheduleExitTime = dayLog.schedule.schedule.exit_time;
    if (scheduleExitTime) {
      const scheduleTimeStr =
        typeof scheduleExitTime === 'string'
          ? scheduleExitTime
          : format(new Date(scheduleExitTime), 'HH:mm:ss');
      const exitParts = exitTime.split(':');
      const scheduleParts = scheduleTimeStr.split(':');
      const exitMinutes = +exitParts[0] * 60 + +exitParts[1];
      let scheduleMinutes = +scheduleParts[0] * 60 + +scheduleParts[1];

      // Si tiene compensatorio por horas, reducir la hora de salida esperada
      if (dayLog.compensatoryHours && dayLog.compensatoryHours > 0) {
        scheduleMinutes -= dayLog.compensatoryHours * 60;
      }

      dayLog.earlyExit = exitMinutes < scheduleMinutes;
    } else {
      dayLog.earlyExit = false;
    }
  } else {
    dayLog.earlyExit = false;
  }

  // Calcular horas trabajadas y horas extras
  calculateWorkHours(dayLog, logger);
}

/**
 * Calcula los minutos de trabajo requeridos según el horario asignado.
 * Resta el tiempo de almuerzo definido en el horario (o 60 min por defecto).
 * Retorna 480 (8h) si no se puede calcular.
 */
export function getScheduleRequiredMinutes(schedule: Schedule): number {
  const DEFAULT = 480;
  if (!schedule.entry_time || !schedule.exit_time) return DEFAULT;

  const entryStr =
    typeof schedule.entry_time === 'string'
      ? schedule.entry_time
      : format(new Date(schedule.entry_time), 'HH:mm:ss');
  const exitStr =
    typeof schedule.exit_time === 'string'
      ? schedule.exit_time
      : format(new Date(schedule.exit_time), 'HH:mm:ss');

  const [eH, eM] = entryStr.split(':').map(Number);
  const [xH, xM] = exitStr.split(':').map(Number);
  if ([eH, eM, xH, xM].some(isNaN)) return DEFAULT;

  const base = new Date(2000, 0, 1);
  const entryDate = set(base, { hours: eH, minutes: eM, seconds: 0, milliseconds: 0 });
  let exitDate = set(base, { hours: xH, minutes: xM, seconds: 0, milliseconds: 0 });
  if (exitDate <= entryDate) exitDate = addDays(exitDate, 1); // turno nocturno

  const totalScheduleMinutes = differenceInMinutes(exitDate, entryDate);

  // Solo aplicar default de almuerzo (60 min) si la jornada dura más de 6h.
  // Turnos cortos (ej. 8:00-12:00 = 4h) no tienen almuerzo programado.
  let lunchMinutes = totalScheduleMinutes > 360 ? 60 : 0;
  if (schedule.lunch_start_time && schedule.lunch_end_time) {
    const lsStr =
      typeof schedule.lunch_start_time === 'string'
        ? schedule.lunch_start_time
        : format(new Date(schedule.lunch_start_time), 'HH:mm:ss');
    const leStr =
      typeof schedule.lunch_end_time === 'string'
        ? schedule.lunch_end_time
        : format(new Date(schedule.lunch_end_time), 'HH:mm:ss');
    const [lsH, lsM] = lsStr.split(':').map(Number);
    const [leH, leM] = leStr.split(':').map(Number);
    if (![lsH, lsM, leH, leM].some(isNaN)) {
      const lsDate = set(base, { hours: lsH, minutes: lsM, seconds: 0, milliseconds: 0 });
      const leDate = set(base, { hours: leH, minutes: leM, seconds: 0, milliseconds: 0 });
      if (leDate > lsDate) {
        lunchMinutes = Math.min(differenceInMinutes(leDate, lsDate), 60);
      }
    }
  }

  const requiredMinutes = totalScheduleMinutes - lunchMinutes;
  return requiredMinutes > 0 ? requiredMinutes : DEFAULT;
}

/**
 * Calcula horas trabajadas y horas extras para un DayLog con entrada y salida
 */
function calculateWorkHours(
  dayLog: DayLog,
  logger?: { warn: (...args: any[]) => void }
): void {
  if (!dayLog.entry || !dayLog.exit) return;

  const hasSchedule =
    dayLog.schedule?.schedule && !dayLog.schedule.schedule.day_off;

  const entryDate = new Date(dayLog.entry.date);
  const exitDate = new Date(dayLog.exit.date);

  if (!isValid(entryDate) || !isValid(exitDate) || exitDate <= entryDate) {
    logger?.warn(
      '[TimelogsComponent] Fechas inválidas o salida anterior a entrada',
      {
        day: dayLog.day,
        entry: dayLog.entry.date,
        exit: dayLog.exit.date,
        entryDateUTC: entryDate.toISOString(),
        exitDateUTC: exitDate.toISOString(),
        employee: `${dayLog.employee?.first_name} ${dayLog.employee?.father_name}`,
        employee_id: dayLog.employee?.id,
        diferencia_segundos:
          exitDate <= entryDate
            ? differenceInSeconds(exitDate, entryDate)
            : null,
      }
    );
    dayLog.totalHours = 0;
    dayLog.overtimeHours = 0;
    return;
  }

  // Solo calcular si hay schedule con entry/exit times, o sin schedule
  if (hasSchedule) {
    const scheduleEntryTime = dayLog.schedule!.schedule!.entry_time;
    const scheduleExitTime = dayLog.schedule!.schedule!.exit_time;
    if (!scheduleEntryTime || !scheduleExitTime) return;
  }

  const totalMinutes = differenceInMinutes(exitDate, entryDate);

  // Si la jornada total es ≤6h, no aplicar default de almuerzo
  const isShortShift = totalMinutes <= 360;

  // Calcular tiempo de almuerzo a restar
  const MIN_VALID_LUNCH_MINUTES = 15;
  let lunchTimeToSubtract = 0;
  if (dayLog.lunch_start && dayLog.lunch_end) {
    const lunchStartDate = new Date(dayLog.lunch_start.date);
    const lunchEndDate = new Date(dayLog.lunch_end.date);

    if (
      isValid(lunchStartDate) &&
      isValid(lunchEndDate) &&
      lunchEndDate > lunchStartDate
    ) {
      const actualLunchMinutes = differenceInMinutes(
        lunchEndDate,
        lunchStartDate
      );
      if (actualLunchMinutes >= MIN_VALID_LUNCH_MINUTES) {
        // Almuerzo válido: usar el real, limitado a 60 min
        if (!hasSchedule) {
          if (actualLunchMinutes <= 180) {
            lunchTimeToSubtract = Math.min(actualLunchMinutes, 60);
          }
        } else {
          lunchTimeToSubtract = Math.min(actualLunchMinutes, 60);
        }
      } else if (hasSchedule && !isShortShift) {
        // Marcación de almuerzo demasiado corta (< 15 min): marcación errónea, usar 60 min por defecto
        lunchTimeToSubtract = 60;
      }
    } else {
      // Fechas inválidas: usar defecto si hay schedule (no en turnos cortos)
      if (hasSchedule && !isShortShift) {
        lunchTimeToSubtract = 60;
      }
      logger?.warn(
        '[TimelogsComponent] Fechas de almuerzo inválidas o lunch_end <= lunch_start',
        {
          lunch_start: dayLog.lunch_start.date,
          lunch_end: dayLog.lunch_end.date,
          employee: dayLog.employee?.first_name,
        }
      );
    }
  } else if (hasSchedule && !isShortShift) {
    // Sin marcaciones de almuerzo: restar 60 min por defecto solo si jornada > 6h
    lunchTimeToSubtract = 60;
  }

  const workMinutes = totalMinutes - lunchTimeToSubtract;
  const totalHours = workMinutes > 0 ? workMinutes / 60 : 0;
  dayLog.totalHours = totalHours;

  let requiredWorkMinutes = hasSchedule
    ? getScheduleRequiredMinutes(dayLog.schedule!.schedule!)
    : 480;

  // Si tiene compensatorio por horas, reducir las horas requeridas
  if (dayLog.compensatoryHours && dayLog.compensatoryHours > 0) {
    requiredWorkMinutes -= dayLog.compensatoryHours * 60;
    if (requiredWorkMinutes < 0) requiredWorkMinutes = 0;
  }

  dayLog.requiredHours = requiredWorkMinutes / 60;

  const overtimeByWorkTime =
    workMinutes > requiredWorkMinutes
      ? workMinutes - requiredWorkMinutes
      : 0;
  const totalOvertimeMinutes = Math.max(0, overtimeByWorkTime);
  dayLog.overtimeHours = totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;

  // Si la entrada estuvo dentro de la tolerancia, restar esos minutos al requerido
  const effectiveRequired =
    dayLog.withinTolerance && dayLog.toleranceUsedMinutes
      ? Math.max(0, requiredWorkMinutes - dayLog.toleranceUsedMinutes)
      : requiredWorkMinutes;

  if (workMinutes < effectiveRequired) {
    dayLog.insufficientHours = true;
  } else {
    dayLog.insufficientHours = false;
  }
}

/**
 * Construye los DayLogs completos a partir de datos crudos.
 * Esta función orquesta todo el procesamiento de marcaciones.
 */
export function buildDayLogs(input: DayLogProcessingInput): DayLog[] {
  const {
    logsData,
    schedulesData,
    timeoffsData,
    daysList,
    dateRangeStart,
    dateRangeEnd,
    employeesList,
    employeeSearch,
    employeeId,
    branchId,
    onlyWithMarcaciones,
    timezone,
    logger,
  } = input;

  // Validar y regenerar daysList si hay inconsistencias
  const validDaysList = [...daysList];
  if (
    validDaysList.length === 0 ||
    validDaysList[0] !== dateRangeStart ||
    validDaysList[validDaysList.length - 1] !== dateRangeEnd
  ) {
    validDaysList.length = 0;
    const normalizedStart = new Date(dateRangeStart + 'T00:00:00');
    const normalizedEnd = new Date(dateRangeEnd + 'T00:00:00');
    let currentDate = new Date(normalizedStart);
    while (currentDate <= normalizedEnd) {
      validDaysList.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }
  }

  // 1. Filtrar y parsear logs crudos
  const filteredLogs = filterAndParseRawLogs(
    logsData,
    branchId,
    dateRangeStart,
    dateRangeEnd,
    timezone,
    logger
  );

  // 2. Construir mapa de empleados únicos
  const uniqueEmployees = buildUniqueEmployeesMap(
    filteredLogs,
    employeesList,
    employeeSearch,
    employeeId,
    branchId,
    onlyWithMarcaciones
  );

  // 3. Crear estructura inicial de DayLogs
  const acc = createInitialDayLogs(
    uniqueEmployees,
    validDaysList,
    dateRangeStart,
    dateRangeEnd,
    schedulesData
  );

  // 4. Procesar logs para actualizar DayLogs con marcaciones
  for (const x of filteredLogs) {
    if (x.day < dateRangeStart || x.day > dateRangeEnd) continue;
    if (!x.employee?.id) continue;

    const index = acc.findIndex(
      (y: DayLog) => y.day === x.day && y.employee?.id === x.employee.id
    );
    if (index === -1) continue;

    const effectiveDate = parseLogDate(x, logger);

    {
      const src = ((x as any).source ?? '').toString().toUpperCase();
      const isManualLegacy = src === 'MANUAL' || src === 'EMERGENCY';
      const ipMissing = (x as any).ip == null || (x as any).ip === '';
      acc[index] = {
        ...acc[index],
        [x.type]: {
          date: effectiveDate,
          branch: x.branch,
          id: x.id,
          // Considerar legacy: source MANUAL/EMERGENCY también cuenta como manual
          is_manual: ((x as any).is_manual ?? false) || isManualLegacy,
          manual_reason: (x as any).manual_reason ?? null,
          // IP nula ó marcada como inválida
          invalid_ip: ((x as any).invalid_ip ?? false) || ipMissing,
          source: (x as any).source ?? null,
          ip: (x as any).ip ?? null,
        },
      };
    }

    // 5. Detectar alertas y calcular métricas
    detectAlerts(acc[index], timeoffsData, timezone);
    calculateMetrics(acc[index], timeoffsData, timezone, 5, logger);
  }

  // 6. Ordenar y filtrar resultado final
  return acc
    .sort((a: DayLog, b: DayLog) => {
      const dateA = new Date(a.day + 'T00:00:00');
      const dateB = new Date(b.day + 'T00:00:00');
      const dateComparison = compareAsc(dateA, dateB);
      if (dateComparison !== 0) return dateComparison;
      const nameA =
        (a.employee.first_name || '') + ' ' + (a.employee.father_name || '');
      const nameB =
        (b.employee.first_name || '') + ' ' + (b.employee.father_name || '');
      return nameA.localeCompare(nameB);
    })
    .filter(
      (x: DayLog) => x.day >= dateRangeStart && x.day <= dateRangeEnd
    );
}
