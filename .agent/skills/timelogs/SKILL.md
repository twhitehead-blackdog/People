---
name: timelogs
description: Gestión de marcaciones y control de asistencia. Úsala para trabajar con entry, lunch_start, lunch_end, exit y cálculo de horas extra.
---

# Timelogs Skill

Esta skill te guía en la gestión de marcaciones del sistema People.

## Componentes Principales

| Componente                 | Ubicación                                 | Descripción                    |
| -------------------------- | ----------------------------------------- | ------------------------------ |
| `TimeclockComponent`       | `src/app/timeclock.component.ts`          | Reloj de marcación (UI kiosko) |
| `TimelogsComponent`        | `src/app/dashboard/timelogs.component.ts` | Lista de marcaciones           |
| `TimelogsTableComponent`   | `src/app/dashboard/timelogs/components/`  | Tabla de marcaciones           |
| `TimelogsFiltersComponent` | `src/app/dashboard/timelogs/components/`  | Filtros de búsqueda            |

## Modelo de Timelog

```typescript
interface TimeLog {
  id: string;
  employee_id: string;
  type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit';
  created_at: string; // Timestamp de la marcación
  company_id: string;
  branch_id?: string;
  is_manual?: boolean; // Si fue ingresado manualmente
  authorized_by?: string; // Quién autorizó marcación manual
}
```

## Tipos de Marcación

```typescript
type TimelogType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit';

const TIMELOG_LABELS: Record<TimelogType, string> = {
  entry: 'Entrada',
  lunch_start: 'Inicio de almuerzo',
  lunch_end: 'Fin de almuerzo',
  exit: 'Salida',
};
```

## Flujo de Marcación (RPC)

```typescript
// Llamar RPC de Supabase para procesar marcación
async processTimelog(employeeId: string, type: TimelogType): Promise<void> {
  const url = this.apiUrl.build('rpc/process_timelog');

  await firstValueFrom(
    this.http.post(url, {
      p_employee_id: employeeId,
      p_type: type,
      p_timestamp: new Date().toISOString()
    })
  );
}
```

## Cálculo de Horas Trabajadas

```typescript
// Reglas de cálculo
// 1. Tiempo total = exit - entry
// 2. Tiempo de lunch = lunch_end - lunch_start
// 3. Lunch permitido = máx 60 minutos
// 4. Exceso de lunch RESTA overtime
// 5. Overtime = trabajo neto - 8h (solo si > 8h)

function calculateWorkedHours(log: DayLog): number {
  if (!log.entry || !log.exit) return 0;

  const totalMinutes = differenceInMinutes(
    parseISO(log.exit),
    parseISO(log.entry)
  );

  const lunchMinutes = log.lunchMinutes ?? 0;
  const effectiveLunch = Math.min(lunchMinutes, 60); // máx 60 min

  return (totalMinutes - effectiveLunch) / 60;
}
```

## Detección de Retrasos

```typescript
// Tolerancia por defecto: 5 minutos
const delayToleranceMinutes = 5;

function calculateDelay(
  entryTime: string,
  scheduleStart: string,
  tolerance: number = 5
): number | null {
  const entry = parseISO(entryTime);
  const scheduled = parseISO(scheduleStart);

  const delayMinutes = differenceInMinutes(entry, scheduled);

  if (delayMinutes > tolerance) {
    return delayMinutes;
  }
  return null;
}
```

## Vista por Día (DayLog)

```typescript
interface DayLog {
  day: string; // 'yyyy-MM-dd'
  employee: Employee;
  schedule?: EmployeeScheduleData;
  entry?: string; // Hora de entrada
  lunch_start?: string;
  lunch_end?: string;
  exit?: string;
  lunchMinutes?: number;
  lunchExceeded?: boolean;
  delay?: number; // Minutos de retraso
  earlyExit?: boolean;
  workedHours?: number;
  overtime?: number;
}
```

## Timezone

```typescript
// SIEMPRE usar timezone de Panamá
const TIMEZONE = 'America/Panama';

import { formatInTimeZone } from 'date-fns-tz';

const formattedTime = formatInTimeZone(new Date(), TIMEZONE, 'HH:mm:ss');
```

## httpResource para Timelogs

```typescript
public logs = httpResource<TimeLog[]>(() => ({
  url: this.apiUrl.build('rest/v1/timelogs', {
    company_id: `eq.${this.companyId()}`,
    created_at: `gte.${startDate}`,
    created_at: `lte.${endDate}`,
    select: '*,employee:employees(id,first_name,father_name)',
    order: 'created_at.desc'
  })
}));
```

## Validación de IP (Modo Kiosko)

```typescript
// El timeclock puede validar IP para modo kiosko
readonly isKioskMode = signal(false);
readonly isIPValid = signal(false);

// IpMonitorService maneja la validación
private readonly ipMonitor = inject(IpMonitorService);
```
