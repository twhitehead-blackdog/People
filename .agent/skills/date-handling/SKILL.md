---
name: date-handling
description: Manejo de fechas con date-fns y timezone Panamá. Úsala para trabajar con fechas, horas y cálculos temporales.
---

# Date Handling Skill

Esta skill te guía en el manejo de fechas en People.

## Timezone

```typescript
// SIEMPRE usar timezone de Panamá
const TIMEZONE = 'America/Panama';
```

## Librerías

```typescript
// date-fns para manipulación
import {
  format,
  parseISO,
  addDays,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  isWeekend,
} from 'date-fns';

// date-fns-tz para timezone
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
```

## Formateo

```typescript
const TIMEZONE = 'America/Panama';

// Formatear fecha para mostrar
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy');
}

// Formatear hora para mostrar
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, TIMEZONE, 'HH:mm');
}

// Formatear fecha y hora
function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy HH:mm');
}
```

## Fechas para API

```typescript
// Para queries a Supabase, usar formato ISO
function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Para timestamps
function toApiTimestamp(date: Date): string {
  return date.toISOString();
}
```

## Cálculos de Tiempo

```typescript
// Diferencia en minutos
function getMinutesDiff(start: string, end: string): number {
  return differenceInMinutes(parseISO(end), parseISO(start));
}

// Formato para horas trabajadas
function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

// Calcular horas de almuerzo
function calculateLunchMinutes(
  lunchStart: string | null,
  lunchEnd: string | null
): number {
  if (!lunchStart || !lunchEnd) return 0;
  return differenceInMinutes(parseISO(lunchEnd), parseISO(lunchStart));
}
```

## Rangos de Fechas

```typescript
// Primer y último día del mes
const monthStart = startOfMonth(new Date());
const monthEnd = endOfMonth(new Date());

// Generar array de días en rango
function getDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  let current = start;

  while (current <= end) {
    days.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }

  return days;
}
```

## Validaciones

```typescript
// Verificar si es fin de semana
function isWeekendDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isWeekend(d);
}

// Verificar rango válido
function isValidDateRange(start: Date, end: Date): boolean {
  return start <= end;
}

// Rango máximo de 1 año
function isRangeWithinYear(start: Date, end: Date): boolean {
  const daysDiff = differenceInMinutes(end, start) / (60 * 24);
  return daysDiff <= 365;
}
```

## Hora Actual en Panamá

```typescript
// Obtener hora actual en timezone de Panamá
function getCurrentPanamaTime(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

// Formatear hora actual
function getFormattedCurrentTime(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'HH:mm:ss');
}
```

## ⚠️ Reglas Importantes

1. **NUNCA** usar `new Date()` directamente para mostrar
2. **SIEMPRE** usar `date-fns` para manipulación
3. **SIEMPRE** usar `formatInTimeZone` para mostrar horas
4. **SIEMPRE** usar `formatHoursMinutes()` para duraciones
5. Los timelogs usan `created_at`, NO existe campo `day`
