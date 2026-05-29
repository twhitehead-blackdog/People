import {
  addDays,
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
  EmployeeOvertimeRecord,
  EmployeeScheduleData,
  Schedule,
  TimeoffData,
} from '../../../models';
import { matchesEmployeeSearch } from './employee-search.utils';
import { calcTimeDiff } from './time.utils';
import {
  RESTRICTED_SCHEDULE_IDS,
  RESTRICTED_SCHEDULE_NAMES,
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
  /**
   * Tolerancia de tardanza en minutos. Default 5.
   * Solo aplica en applyMetricsToDayLogs / buildDayLogs.
   */
  delayToleranceMinutes?: number;
}

/** Input para la Fase 1 (estructura base sin métricas) */
export type BaseDayLogInput = Omit<DayLogProcessingInput, 'delayToleranceMinutes'>;

/**
 * Convierte una fecha UTC a string 'yyyy-MM-dd' en hora Panamá.
 *
 * Panamá es UTC-5 constante (no observa DST), así que un offset fijo es exacto.
 * Esto evita ~10K llamadas a `formatInTimeZone` (cara: parse + format completo)
 * y reemplaza con aritmética de timestamps + slice — orden de magnitud más rápido.
 *
 * NO usar para conversiones de horas (HH:mm:ss), solo días.
 */
const PANAMA_OFFSET_MS = -5 * 60 * 60 * 1000;
export function toDayInPanama(date: Date): string {
  return new Date(date.getTime() + PANAMA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
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
  // `timezone` se conserva en la firma por compatibilidad (la API pública del
  // util usa "America/Panama"), pero internamente sabemos que es UTC-5 fijo y
  // usamos `toDayInPanama` que es ~10x más rápido que `formatInTimeZone`.
  void timezone;
  return logsData
    .filter((x: any) => (branchId ? x.branch_id === branchId : true))
    .map((x: any) => {
      const logDate = parseLogDate(x, logger);
      const dayStr = toDayInPanama(logDate);
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
 * Crea la estructura inicial de DayLogs con todos los días para todos los empleados.
 *
 * Pre-agrupa schedulesData por employee_id (Map<empId, schedules[]>) para que el
 * lookup interno sea O(1) en vez de O(N) con .filter() sobre todo el array. Para
 * 200 empleados × 30 días × 500 schedules eso evita ~3M comparaciones.
 */
function createInitialDayLogs(
  uniqueEmployees: Map<string, Partial<Employee>>,
  daysList: string[],
  dateRangeStart: string,
  dateRangeEnd: string,
  schedulesData: EmployeeScheduleData[]
): DayLog[] {
  const acc: DayLog[] = [];

  // Indexar schedules por employee_id una sola vez
  const schedulesByEmployee = new Map<string, EmployeeScheduleData[]>();
  for (const s of schedulesData) {
    const empId = s.employee_id;
    if (!empId) continue;
    const list = schedulesByEmployee.get(empId);
    if (list) {
      list.push(s);
    } else {
      schedulesByEmployee.set(empId, [s]);
    }
  }

  uniqueEmployees.forEach((employee) => {
    const empSchedules = schedulesByEmployee.get(employee.id!) ?? [];

    daysList.forEach((day) => {
      if (day < dateRangeStart || day > dateRangeEnd) {
        return;
      }

      // Buscar schedules que coincidan con el rango de fechas (solo dentro de los del empleado)
      const matchingSchedules = empSchedules.filter(
        (schedule) =>
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
 * Índice de timeoffs aprobados por (employee_id:yyyy-MM-dd).
 * Pre-calculado una sola vez para evitar .find() O(N) por cada DayLog.
 */
type TimeoffIndex = Map<string, TimeoffData>;

function timeoffKey(employeeId: string, day: string): string {
  return `${employeeId}:${day}`;
}

/**
 * Expande cada timeoff en todos los días que cubre y los indexa por
 * (employee_id:day). Si un empleado tiene varios timeoffs solapados, se queda
 * el último insertado (comportamiento equivalente a .find() sobre el array).
 */
function buildTimeoffIndex(timeoffsData: TimeoffData[]): TimeoffIndex {
  const idx: TimeoffIndex = new Map();
  for (const t of timeoffsData) {
    if (!t.employee_id) continue;
    const from = new Date(t.date_from);
    const to = new Date(t.date_to);
    if (!isValid(from) || !isValid(to) || to < from) continue;

    // Recorrer día por día (sin TZ porque from/to ya están en fecha simple)
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const stop = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    while (cursor <= stop) {
      const key = timeoffKey(t.employee_id, format(cursor, 'yyyy-MM-dd'));
      idx.set(key, t);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return idx;
}

/**
 * Detecta alertas de feriado/día libre y retorna un nuevo DayLog (PURO).
 */
function applyAlerts(
  dayLog: DayLog,
  timeoffIndex: TimeoffIndex,
  _timezone: string
): DayLog {
  // dayLog.day ya es 'yyyy-MM-dd' en hora Panamá (asignado por la Fase 1),
  // así que no hace falta reformatearlo.
  const dayStr = dayLog.day;
  const hasMark = dayLog.entry || dayLog.lunch_start || dayLog.exit;

  // Verificar timeoff (O(1) via index)
  const timeoffForDay = dayLog.employee?.id
    ? timeoffIndex.get(timeoffKey(dayLog.employee.id, dayStr))
    : undefined;
  // Compensatorio por horas: el empleado SÍ debe trabajar, no es un día libre completo
  const isCompensatoryHours = timeoffForDay?.compensatory_type === 'hours';
  const hasTimeOff = !!timeoffForDay && !isCompensatoryHours;

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

  let alert = dayLog.alert;
  let scheduleError = dayLog.scheduleError;

  if (hasTimeOff && hasMark) {
    alert = 'Feriado';
    scheduleError = true;
  }
  if (hasTimeOff && !hasMark) {
    alert = 'Feriado';
    scheduleError = false;
  }
  if (isScheduleFeriado && hasMark) {
    alert = dayLog.schedule?.schedule?.day_off ? 'Día Libre' : 'Feriado';
    scheduleError = true;
  }
  if (isScheduleFeriado && !hasMark) {
    alert = dayLog.schedule?.schedule?.day_off ? 'Día Libre' : 'Feriado';
    scheduleError = false;
  }

  return { ...dayLog, alert, scheduleError };
}

/**
 * Calcula retraso, almuerzo, salida temprana y horas trabajadas.
 * Retorna un NUEVO DayLog (PURO, no muta el input).
 */
function applyMetrics(
  dayLog: DayLog,
  timeoffIndex: TimeoffIndex,
  timezone: string,
  delayToleranceMinutes: number,
  logger?: { warn: (...args: any[]) => void }
): DayLog {
  const hasMark = dayLog.entry || dayLog.lunch_start || dayLog.exit;

  if (!hasMark) return dayLog;

  // dayLog.day ya es 'yyyy-MM-dd' en hora Panamá (asignado por la Fase 1).
  const dayStr = dayLog.day;

  const timeoffForDay = dayLog.employee?.id
    ? timeoffIndex.get(timeoffKey(dayLog.employee.id, dayStr))
    : undefined;
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

  // Copia mutable que vamos llenando — el output es siempre un objeto nuevo
  const result: DayLog = { ...dayLog };

  if (hasTimeOff) {
    if (!result.scheduleError) {
      result.scheduleError = true;
    }
  } else if (result.schedule?.schedule) {
    if (result.schedule.schedule.day_off || isScheduleFeriado) {
      result.delay = 'DIA LIBRE';
      result.alert = result.schedule.schedule.day_off
        ? 'Día Libre'
        : 'Feriado';
      result.scheduleError = true;
    } else {
      // Calcular retraso si hay entrada
      if (result.entry) {
        const entryTime = formatInTimeZone(
          result.entry.date,
          timezone,
          'HH:mm:ss'
        );
        const scheduleTime = result.schedule.schedule.entry_time;
        if (scheduleTime) {
          const scheduleTimeStr =
            typeof scheduleTime === 'string'
              ? scheduleTime
              : format(new Date(scheduleTime), 'HH:mm:ss');
          const delayTotal = calcTimeDiff(entryTime, scheduleTimeStr);

          // Detectar error de marcación: entrada difiere más de 2h del turno asignado
          const SHIFT_MISMATCH_THRESHOLD = 120; // 2 horas en minutos
          if (Math.abs(delayTotal) > SHIFT_MISMATCH_THRESHOLD) {
            result.shiftMismatch = true;
            result.expectedScheduleName = result.schedule?.schedule?.name ?? '';
            // No calcular tardanza en este caso — es turno incorrecto, no tardanza
            result.delay = undefined;
            result.withinTolerance = false;
          } else if (delayTotal > delayToleranceMinutes) {
            result.delay = delayTotal - delayToleranceMinutes;
            result.withinTolerance = false;
          } else if (delayTotal > 0) {
            result.delay = undefined;
            result.withinTolerance = true;
            result.toleranceUsedMinutes = delayTotal;
          } else {
            result.delay = undefined;
            result.withinTolerance = false;
            result.toleranceUsedMinutes = 0;
          }
        }
      }
    }
  } else {
    // Sin horario — se muestra en la columna Horario de la tabla, no como alert tag
  }

  // Validar tiempo de almuerzo
  if (result.lunch_start && result.lunch_end) {
    const lunchMinutes = differenceInMinutes(
      result.lunch_end.date,
      result.lunch_start.date
    );
    result.lunchMinutes = lunchMinutes;
    result.lunchExceeded = lunchMinutes > 60;
  } else {
    result.lunchExceeded = false;
  }

  // Validar salida temprana
  if (
    result.schedule?.schedule &&
    result.exit &&
    !result.schedule.schedule.day_off
  ) {
    const exitTime = formatInTimeZone(result.exit.date, timezone, 'HH:mm:ss');
    const scheduleExitTime = result.schedule.schedule.exit_time;
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
      if (result.compensatoryHours && result.compensatoryHours > 0) {
        scheduleMinutes -= result.compensatoryHours * 60;
      }

      result.earlyExit = exitMinutes < scheduleMinutes;
    } else {
      result.earlyExit = false;
    }
  } else {
    result.earlyExit = false;
  }

  // Calcular horas trabajadas y horas extras (muta `result` localmente — está bien, ya es copia)
  computeWorkHoursInto(result, logger);

  return result;
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
 * Calcula horas trabajadas y horas extras. Muta el objeto recibido (que SIEMPRE
 * debe ser una copia local — nunca el DayLog original de la fase base).
 */
function computeWorkHoursInto(
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
 * Normaliza la lista de días — si viene inconsistente con dateRangeStart/End, la regenera.
 */
function ensureValidDaysList(
  daysList: string[],
  dateRangeStart: string,
  dateRangeEnd: string
): string[] {
  if (
    daysList.length > 0 &&
    daysList[0] === dateRangeStart &&
    daysList[daysList.length - 1] === dateRangeEnd
  ) {
    return daysList;
  }
  const result: string[] = [];
  const normalizedStart = new Date(dateRangeStart + 'T00:00:00');
  const normalizedEnd = new Date(dateRangeEnd + 'T00:00:00');
  let currentDate = new Date(normalizedStart);
  while (currentDate <= normalizedEnd) {
    result.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }
  return result;
}

/**
 * Comparador estable para DayLog: por fecha asc, luego por nombre.
 *
 * `day` es siempre 'yyyy-MM-dd' con padding fijo → es lexicográficamente
 * ordenable. Comparar strings directamente evita ~140K `new Date()` por
 * sort en datasets de ~6K DayLogs.
 */
function compareDayLogs(a: DayLog, b: DayLog): number {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  const nameA =
    (a.employee.first_name || '') + ' ' + (a.employee.father_name || '');
  const nameB =
    (b.employee.first_name || '') + ' ' + (b.employee.father_name || '');
  return nameA.localeCompare(nameB);
}

/**
 * FASE 1: Construye la estructura base de DayLogs SIN aplicar métricas ni alertas.
 *
 * Esta fase es la cara — depende de logs, schedules, timeoffs, empleados, rango.
 * Sale ya ordenada. Las marcaciones (entry/lunch_start/lunch_end/exit) están pegadas,
 * pero los campos calculados (delay, overtimeHours, alert, etc.) están en sus
 * valores iniciales — los llena la Fase 2 (applyMetricsToDayLogs).
 */
export function buildBaseDayLogs(input: BaseDayLogInput): DayLog[] {
  const {
    logsData,
    schedulesData,
    timeoffsData: _timeoffsData,
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

  const validDaysList = ensureValidDaysList(daysList, dateRangeStart, dateRangeEnd);

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

  // 3b. Indexar acc por (empId:day) → O(1) lookups en vez de findIndex O(N)
  const accIndex = new Map<string, number>();
  for (let i = 0; i < acc.length; i++) {
    accIndex.set(`${acc[i].employee.id}:${acc[i].day}`, i);
  }

  // 4. Procesar logs para actualizar DayLogs con marcaciones (sin métricas)
  for (const x of filteredLogs) {
    if (x.day < dateRangeStart || x.day > dateRangeEnd) continue;
    if (!x.employee?.id) continue;

    const index = accIndex.get(`${x.employee.id}:${x.day}`);
    if (index === undefined) continue;

    const effectiveDate = parseLogDate(x, logger);

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

  // 5. Ordenar y filtrar al rango (el orden no cambia con métricas/filtros UI)
  return acc
    .sort(compareDayLogs)
    .filter((x: DayLog) => x.day >= dateRangeStart && x.day <= dateRangeEnd);
}

/**
 * FASE 2: Aplica detección de alertas y cálculo de métricas sobre los DayLogs base.
 *
 * Depende solo de `baseDayLogs` + `timeoffsData` + `timezone` + `delayToleranceMinutes`.
 * Cambiar la tolerancia solo dispara esta fase + el filtro UI — la Fase 1 no se
 * recalcula.
 *
 * Es PURA: no muta los DayLogs originales, retorna un array nuevo.
 */
/**
 * Indexa overtime records por (employee_id:timelog_date) para lookup O(1).
 * Si hay duplicados (no debería con el unique constraint en DB), se queda
 * el más reciente por `updated_at` o el último insertado si no hay timestamp.
 */
function buildOvertimeIndex(
  records: EmployeeOvertimeRecord[]
): Map<string, EmployeeOvertimeRecord> {
  const idx = new Map<string, EmployeeOvertimeRecord>();
  for (const r of records) {
    if (!r.employee_id || !r.timelog_date) continue;
    const key = `${r.employee_id}:${r.timelog_date}`;
    const existing = idx.get(key);
    if (!existing) {
      idx.set(key, r);
      continue;
    }
    // Conflicto: preferir el más nuevo por updated_at (si existe)
    const a = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
    const b = r.updated_at ? new Date(r.updated_at).getTime() : 0;
    if (b >= a) idx.set(key, r);
  }
  return idx;
}

export function applyMetricsToDayLogs(
  baseDayLogs: DayLog[],
  timeoffsData: TimeoffData[],
  timezone: string,
  delayToleranceMinutes: number,
  logger?: { warn: (...args: any[]) => void },
  overtimeRecords: EmployeeOvertimeRecord[] = []
): DayLog[] {
  // Construir índice (empId:day → timeoff) una sola vez. Para 200 empleados ×
  // 30 días × ~50 timeoffs evita ~300K comparaciones que antes hacían .find().
  const timeoffIndex = buildTimeoffIndex(timeoffsData);
  // Índice de overtime records por (empId:day) — O(1) lookup.
  const overtimeIndex = buildOvertimeIndex(overtimeRecords);

  return baseDayLogs.map((base) => {
    const withAlerts = applyAlerts(base, timeoffIndex, timezone);
    const withMetrics = applyMetrics(
      withAlerts,
      timeoffIndex,
      timezone,
      delayToleranceMinutes,
      logger
    );
    // Adjuntar overtime record si existe (siempre, no solo cuando hay extras
    // calculadas — el record podría estar como `rejected` aunque ahora no
    // haya overtime).
    const empId = withMetrics.employee?.id;
    if (empId) {
      const record = overtimeIndex.get(`${empId}:${withMetrics.day}`);
      if (record) {
        return { ...withMetrics, overtimeRecord: record };
      }
    }
    return withMetrics;
  });
}

/**
 * Wrapper para retrocompat: build base + métricas en una sola llamada.
 * Para nuevos consumidores, preferir usar las 2 fases por separado para
 * memoización fina (ver `timelogs.component.ts`).
 */
export function buildDayLogs(input: DayLogProcessingInput): DayLog[] {
  const base = buildBaseDayLogs(input);
  return applyMetricsToDayLogs(
    base,
    input.timeoffsData,
    input.timezone,
    input.delayToleranceMinutes ?? 5,
    input.logger
  );
}
