import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import {
  addDays,
  differenceInMinutes,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarMarkerData } from '../../calendar.component';
import { TimeLogEnum } from '../../models';
import { OrganizationService } from '../../services/organization.service';
import { DashboardStore } from '../../stores/dashboard.store';
import { EmployeePortalStore } from '../../stores/employee-portal.store';
import { calculateWorkedHours } from '../utils/employee-portal-time.utils';

// NOTA: No usar providedIn:'root' porque depende de DashboardStore (scope del layout del portal).
// Se provee explícitamente en EmployeePortalComponent para compartir el injector correcto.
@Injectable()
export class EmployeePortalTimelogsService {
  private http = inject(HttpClient);
  private store = inject(DashboardStore);
  private portalStore = inject(EmployeePortalStore);
  private organizationService = inject(OrganizationService);
  private readonly TIMEZONE = 'America/Panama';

  public currentEmployee = computed(() => this.store.currentEmployee());

  // Timelogs API - usar signals del store directamente
  public timelogsApi = httpResource<any[]>(() => {
    console.log('[EmployeePortalTimelogsService] timelogsApi - Iniciando');
    console.log(
      '[EmployeePortalTimelogsService] this.portalStore:',
      this.portalStore
    );

    const dateRange = this.portalStore.dateRange();
    console.log(
      '[EmployeePortalTimelogsService] dateRange obtenido:',
      dateRange
    );

    if (!dateRange[0] || !dateRange[1] || !this.currentEmployee()?.id) {
      console.log(
        '[EmployeePortalTimelogsService] timelogsApi - Retornando undefined (faltan datos)'
      );
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    // Asegurar que siempre tengamos un company_id válido
    if (!companyId) {
      console.warn(
        '[EmployeePortal] No se encontró company_id, no se pueden cargar timelogs'
      );
      return undefined;
    }

    // Construir URL manualmente para aplicar correctamente filtros gte y lte
    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    // Construir rango en Panamá y convertirlo a UTC ISO para PostgREST
    const startDateStrPanama =
      formatInTimeZone(dateRange[0], this.TIMEZONE, 'yyyy-MM-dd') +
      'T00:00:00-05:00';
    const endDateStrPanama =
      formatInTimeZone(addDays(dateRange[1], 1), this.TIMEZONE, 'yyyy-MM-dd') +
      'T00:00:00-05:00';

    const startDate =
      new Date(startDateStrPanama).toISOString().split('.')[0] + 'Z';
    const endDate =
      new Date(endDateStrPanama).toISOString().split('.')[0] + 'Z';
    const select = `*,employee:employees(id,first_name,father_name,company_id, branch:branches(id, name)),branch:branches(id, name, short_name)`;

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    // Filtrar directamente por company_id de timelogs (la tabla tiene este campo)
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&order=created_at.asc`;

    return {
      url,
      method: 'GET',
    };
  });

  public myTimelogs = computed(() => {
    const logs = this.timelogsApi.value() ?? [];
    // Process logs similar to timelogs component
    const processedLogs = logs
      .map((x) => ({
        ...x,
        day: formatInTimeZone(new Date(x.created_at), this.TIMEZONE, 'yyyy-MM-dd'),
      }))
      .reduce<any[]>((acc, x) => {
        const existing = acc.find((item) => item.day === x.day);
        if (!existing) {
          acc.push({
            day: x.day,
            entry:
              x.type === TimeLogEnum.entry
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            lunch_start:
              x.type === TimeLogEnum.lunch_start
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            lunch_end:
              x.type === TimeLogEnum.lunch_end
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            exit:
              x.type === TimeLogEnum.exit
                ? { date: new Date(x.created_at), branch: x.branch }
                : undefined,
            schedule: null, // Would need to fetch schedules separately
            delay: undefined,
          });
        } else {
          if (x.type === TimeLogEnum.entry)
            existing.entry = { date: new Date(x.created_at), branch: x.branch };
          if (x.type === TimeLogEnum.lunch_start)
            existing.lunch_start = {
              date: new Date(x.created_at),
              branch: x.branch,
            };
          if (x.type === TimeLogEnum.lunch_end)
            existing.lunch_end = {
              date: new Date(x.created_at),
              branch: x.branch,
            };
          if (x.type === TimeLogEnum.exit)
            existing.exit = { date: new Date(x.created_at), branch: x.branch };
        }
        return acc;
      }, []);

    return processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
  });

  // Timelogs API para el mes actual (independiente del dateRange del usuario)
  public monthTimelogsApi = httpResource<any[]>(() => {
    console.log('[EmployeePortalTimelogsService] monthTimelogsApi - Iniciando');
    console.log(
      '[EmployeePortalTimelogsService] this.portalStore:',
      this.portalStore
    );

    if (!this.currentEmployee()?.id) {
      return undefined;
    }
    const employeeId = this.currentEmployee()!.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!companyId) {
      return undefined;
    }

    console.log(
      '[EmployeePortalTimelogsService] monthTimelogsApi - Obteniendo calendarMonth'
    );
    const month = this.portalStore.calendarMonth();
    console.log(
      '[EmployeePortalTimelogsService] calendarMonth obtenido:',
      month
    );
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timelogs`;
    const startDateStrPanama =
      formatInTimeZone(monthStart, this.TIMEZONE, 'yyyy-MM-dd') +
      'T00:00:00-05:00';
    const endDateStrPanama =
      formatInTimeZone(addDays(monthEnd, 1), this.TIMEZONE, 'yyyy-MM-dd') +
      'T00:00:00-05:00';
    const startDate =
      new Date(startDateStrPanama).toISOString().split('.')[0] + 'Z';
    const endDate =
      new Date(endDateStrPanama).toISOString().split('.')[0] + 'Z';
    const select = `*,employee:employees(id,first_name,father_name, branch:branches(id, name)),branch:branches(id, name, short_name)`;

    let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
    url += `&employee_id=eq.${employeeId}`;
    // Filtrar directamente por company_id de timelogs (la tabla tiene este campo)
    url += `&company_id=eq.${companyId}`;
    url += `&created_at=gte.${startDate}`;
    url += `&created_at=lte.${endDate}`;
    url += `&order=created_at.asc`;

    return {
      url,
      method: 'GET',
    };
  });

  // Procesar timelogs del mes actual
  public monthTimelogs = computed(() => {
    const logs = this.monthTimelogsApi.value() ?? [];

    const processedLogs = logs
      .filter((x) => x.created_at)
      .map((x) => {
        try {
          const date = new Date(x.created_at);
          if (isNaN(date.getTime())) {
            return null;
          }
          return x;
        } catch (error) {
          return null;
        }
      })
      .filter((x) => x !== null)
      .reduce<any[]>((acc, x) => {
        if (!x) return acc;

        const logDate = new Date(x.created_at);
        const logBranch = x.branch || null;

        // Determinar el día en Panamá (no depende del timezone del dispositivo)
        const actualDay = formatInTimeZone(logDate, this.TIMEZONE, 'yyyy-MM-dd');

        // Buscar registro existente por el día de esta marcación
        let existing = acc.find((item) => item.day === actualDay);

        // Si no existe, crear uno nuevo
        if (!existing) {
          existing = {
            day: actualDay,
            entry: undefined,
            lunch_start: undefined,
            lunch_end: undefined,
            exit: undefined,
            schedule: null,
            delay: undefined,
          };
          acc.push(existing);
        }

        // Agregar la marcación al registro
        // Si ya existe una marcación del mismo tipo, mantener la más temprana (para entrada) o la más tardía (para salida)
        if (x.type === TimeLogEnum.entry) {
          if (!existing.entry || logDate < existing.entry.date) {
            existing.entry = { date: logDate, branch: logBranch };
          }
        } else if (x.type === TimeLogEnum.exit) {
          if (!existing.exit || logDate > existing.exit.date) {
            existing.exit = { date: logDate, branch: logBranch };
          }
        } else if (x.type === TimeLogEnum.lunch_start) {
          if (!existing.lunch_start || logDate < existing.lunch_start.date) {
            existing.lunch_start = { date: logDate, branch: logBranch };
          }
        } else if (x.type === TimeLogEnum.lunch_end) {
          if (!existing.lunch_end || logDate > existing.lunch_end.date) {
            existing.lunch_end = { date: logDate, branch: logBranch };
          }
        }

        return acc;
      }, []);

    const sorted = processedLogs.sort(
      (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
    );
    return sorted;
  });

  // Convertir timelogs a markers para el calendario bonito
  public timelogMarkers = computed<CalendarMarkerData[]>(() => {
    const logs = this.monthTimelogs();

    // Filtrar solo días con marcaciones válidas (entrada y/o salida)
    const filtered = logs.filter((log) => {
      // Debe tener al menos entrada o salida
      if (!log.entry && !log.exit) {
        return false;
      }

      // Verificar que la fecha sea válida
      const logDate = new Date(log.day);
      if (isNaN(logDate.getTime())) {
        return false;
      }

      // El día ya está calculado correctamente basándose en la entrada o salida
      // No necesitamos validar días diferentes porque el día se recalcula correctamente
      // en el procesamiento anterior
      return true;
    });

    const markers = filtered.map((log) => ({
      date: new Date(log.day),
      data: log,
    }));
    return markers;
  });

  // Handler para cambio de mes en el calendario
  public onCalendarMonthChange(date: Date): void {
    console.log(
      '[EmployeePortalTimelogsService] onCalendarMonthChange - date:',
      date
    );
    console.log(
      '[EmployeePortalTimelogsService] this.portalStore:',
      this.portalStore
    );

    // Normalizar la fecha al inicio del mes para evitar problemas de zona horaria
    const normalizedDate = startOfMonth(date);
    console.log(
      '[EmployeePortalTimelogsService] normalizedDate:',
      normalizedDate
    );

    this.portalStore.setCalendarMonth(normalizedDate);
    console.log('[EmployeePortalTimelogsService] setCalendarMonth llamado');

    // Forzar recarga del API cuando cambia el mes
    this.monthTimelogsApi.reload();
    console.log(
      '[EmployeePortalTimelogsService] monthTimelogsApi.reload() llamado'
    );
  }

  // Lates computed from timelogs
  public myLates = computed(() => {
    const logs = this.myTimelogs();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return logs
      .filter((log) => {
        const logDate = new Date(log.day);
        return (
          logDate >= monthStart &&
          logDate <= monthEnd &&
          log.delay &&
          typeof log.delay === 'number'
        );
      })
      .map((log) => ({
        date: new Date(log.day),
        scheduled_time: log.schedule?.schedule?.start_time || '-',
        actual_time: log.entry?.date ? format(log.entry.date, 'HH:mm') : '-',
        minutes: log.delay as number,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  // Dashboard computed properties
  public daysWorkedThisMonth = computed(() => {
    // Usar monthTimelogs que ya está filtrado por el mes actual del calendario
    const logs = this.monthTimelogs();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Contar días que tienen al menos una marcación (entry, lunch_start, lunch_end, o exit)
    // monthTimelogs ya está filtrado por el mes, pero verificamos por si acaso
    return logs.filter((log) => {
      const logDate = new Date(log.day);
      const isInMonth = logDate >= monthStart && logDate <= monthEnd;
      const hasAnyMark =
        log.entry || log.lunch_start || log.lunch_end || log.exit;
      return isInMonth && hasAnyMark;
    }).length;
  });

  // Método para calcular horas extras de un día específico
  public calculateDayOvertimeHours(log: any): number {
    if (!log.entry || !log.exit) return 0;

    const entryDate = new Date(log.entry.date);
    const exitDate = new Date(log.exit.date);

    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return 0;

    // Calcular tiempo total desde entrada hasta salida
    const totalMinutes = differenceInMinutes(exitDate, entryDate);

    // Calcular tiempo de almuerzo si existe
    const lunchTime =
      log.lunch_start && log.lunch_end
        ? differenceInMinutes(
            new Date(log.lunch_end.date),
            new Date(log.lunch_start.date)
          )
        : 0;

    // Calcular horas extras: más de 9 horas totales (8 horas de trabajo + 1 hora de almuerzo)
    // 9 horas = 540 minutos
    const requiredTotalMinutes = 540;
    const overtimeByTotalTime =
      totalMinutes > requiredTotalMinutes
        ? totalMinutes - requiredTotalMinutes
        : 0;

    // Calcular minutos excedidos del almuerzo (más de 60 minutos)
    // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
    const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

    // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
    const dayOvertimeMinutes = Math.max(
      0,
      overtimeByTotalTime - lunchExceededMinutes
    );

    // Convertir minutos a horas
    return dayOvertimeMinutes / 60;
  }

  // Calcular horas extras totales usando la misma lógica que timelogs.component.ts
  public totalOvertimeHours = computed(() => {
    const logs = this.monthTimelogs();
    let totalOvertimeMinutes = 0;

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      const entryDate = new Date(log.entry.date);
      const exitDate = new Date(log.exit.date);

      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return;

      // Calcular tiempo total desde entrada hasta salida
      const totalMinutes = differenceInMinutes(exitDate, entryDate);

      // Calcular tiempo de almuerzo si existe
      const lunchTime =
        log.lunch_start && log.lunch_end
          ? differenceInMinutes(
              new Date(log.lunch_end.date),
              new Date(log.lunch_start.date)
            )
          : 0;

      // Calcular horas extras: más de 9 horas totales (8 horas de trabajo + 1 hora de almuerzo)
      // 9 horas = 540 minutos
      const requiredTotalMinutes = 540;
      const overtimeByTotalTime =
        totalMinutes > requiredTotalMinutes
          ? totalMinutes - requiredTotalMinutes
          : 0;

      // Calcular minutos excedidos del almuerzo (más de 60 minutos)
      // Si el almuerzo excede 60 minutos, ese tiempo extra NO es trabajo y debe restarse de las horas extras
      const lunchExceededMinutes = lunchTime > 60 ? lunchTime - 60 : 0;

      // RESTAR el exceso de almuerzo de las horas extras (porque ese tiempo no es trabajo)
      const dayOvertimeMinutes = Math.max(
        0,
        overtimeByTotalTime - lunchExceededMinutes
      );
      totalOvertimeMinutes += dayOvertimeMinutes;
    });

    // Convertir minutos a horas
    return totalOvertimeMinutes / 60;
  });

  // Computed: Días disponibles con horas extras
  public availableOvertimeDays = computed(() => {
    const logs = this.monthTimelogs();
    const daysWithOvertime: Array<{ date: Date; day: string; hours: number }> =
      [];

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      // Calcular horas extras del día
      const overtimeHours = this.calculateDayOvertimeHours(log);

      if (overtimeHours > 0) {
        daysWithOvertime.push({
          date: new Date(log.day),
          day: log.day,
          hours: overtimeHours,
        });
      }
    });

    return daysWithOvertime.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  // Computed: Detalles completos de días con horas extra (para Paso 4)
  public overtimeDaysDetails = computed(() => {
    const logs = this.monthTimelogs();
    const details: Array<{
      date: Date;
      day: string;
      entryTime: string | null;
      exitTime: string | null;
      totalHours: number;
      overtimeHours: number;
      lunchDuration: number;
      delayHours: number;
    }> = [];

    logs.forEach((log) => {
      if (!log.entry || !log.exit) return;

      const overtimeHours = this.calculateDayOvertimeHours(log);
      if (overtimeHours > 0) {
        const entryDate = new Date(log.entry.date);
        const exitDate = new Date(log.exit.date);

        // Calcular tiempo de almuerzo en horas
        const lunchTimeMinutes =
          log.lunch_start && log.lunch_end
            ? differenceInMinutes(
                new Date(log.lunch_end.date),
                new Date(log.lunch_start.date)
              )
            : 0;
        const lunchTime = lunchTimeMinutes / 60;

        // Calcular retraso (delay) en horas
        // El delay viene en minutos desde los logs procesados
        const delayMinutes =
          log.delay && typeof log.delay === 'number' ? log.delay : 0;
        const delayHours = delayMinutes / 60;

        // Calcular tiempo total trabajado REAL = (salida - entrada) - almuerzo - retraso
        const totalMinutes = differenceInMinutes(exitDate, entryDate);
        const totalHoursReal =
          (totalMinutes - lunchTimeMinutes - delayMinutes) / 60;

        details.push({
          date: new Date(log.day),
          day: log.day,
          entryTime: format(entryDate, 'HH:mm'),
          exitTime: format(exitDate, 'HH:mm'),
          totalHours: totalHoursReal, // Horas reales trabajadas después de restar almuerzo y retrasos
          overtimeHours: overtimeHours,
          lunchDuration: lunchTime,
          delayHours: delayHours,
        });
      }
    });

    return details.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  public recentTimelogs = computed(() => {
    // Obtener los timelogs crudos (sin agrupar por día)
    const rawLogs = this.timelogsApi.value() ?? [];
    const sevenDaysAgo = addDays(new Date(), -7);

    // Filtrar por los últimos 7 días y convertir cada marcación en un evento individual
    const recentEvents = rawLogs
      .filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= sevenDaysAgo;
      })
      .map((log) => {
        const logDate = new Date(log.created_at);
        let typeLabel = '';
        let icon = 'pi-clock';

        switch (log.type) {
          case 'entry':
            typeLabel = 'Entrada';
            icon = 'pi-sign-in';
            break;
          case 'lunch_start':
            typeLabel = 'Inicio de Almuerzo';
            icon = 'pi-arrow-right';
            break;
          case 'lunch_end':
            typeLabel = 'Fin de Almuerzo';
            icon = 'pi-arrow-left';
            break;
          case 'exit':
            typeLabel = 'Salida';
            icon = 'pi-sign-out';
            break;
          default:
            typeLabel = 'Marcación';
        }

        return {
          id: log.id,
          type: log.type,
          typeLabel,
          icon,
          date: logDate,
          day: format(logDate, 'yyyy-MM-dd'),
          time: format(logDate, 'HH:mm'),
          branch: log.branch,
          created_at: log.created_at,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime()) // Más recientes primero
      .slice(0, 4); // Últimas 4 marcaciones

    return recentEvents;
  });

  public recentTimelogsCount = computed(() => {
    return this.recentTimelogs().length;
  });

  // Exponer función de cálculo de horas trabajadas
  public calculateWorkedHours = calculateWorkedHours;
}
