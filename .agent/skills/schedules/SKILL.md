---
name: schedules
description: Gestión de horarios y turnos. Úsala para crear, editar o consultar schedules de empleados y manejar el timetable.
---

# Schedules Skill

Esta skill te guía en la gestión de horarios y turnos en People.

## Componentes Principales

| Componente                    | Ubicación                                    | Descripción            |
| ----------------------------- | -------------------------------------------- | ---------------------- |
| `SchedulesComponent`          | `dashboard/schedules.component.ts`           | Lista de schedules     |
| `SchedulesFormComponent`      | `dashboard/schedules-form.component.ts`      | CRUD de schedules      |
| `EmployeeSchedulesComponent`  | `dashboard/employee-schedules.component.ts`  | Asignación a empleados |
| `EmployeesTimetableComponent` | `dashboard/employees-timetable.component.ts` | Vista semanal          |

## Modelo de Schedule

```typescript
interface Schedule {
  id: string;
  name: string;
  company_id: string;
  start_time: string; // '08:00:00'
  end_time: string; // '17:00:00'
  lunch_start?: string; // '12:00:00'
  lunch_end?: string; // '13:00:00'
  lunch_duration_minutes?: number;
  is_active: boolean;
  color?: string; // Color para UI
}
```

## Asignación de Horarios

```typescript
interface EmployeeSchedule {
  id: string;
  employee_id: string;
  schedule_id: string;
  start_date: string; // 'yyyy-MM-dd'
  end_date: string; // 'yyyy-MM-dd'
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  company_id: string;
  schedule?: Schedule; // Relación
  employee?: Employee; // Relación
}
```

## Schedules Especiales (Restrictivos)

```typescript
// IDs de schedules que NO deberían tener marcaciones
const restrictedScheduleIds = [
  '3d07f626-d58f-4203-bac5-f6e35557e0ad', // Feriado
  '4983c002-7c5d-4440-a4f2-52f61acdd67a', // Incapacidad
  'c01dff8f-ce0d-498f-a473-46418576e589', // Día Libre
  'd3fdaf49-2c3e-4293-bf6d-3ae2d4b7bbdf', // Licencia maternidad
  'e7e63bb4-ca86-4091-85fa-c4da16545b49', // Vacaciones
  'f2d92995-96a0-414f-b64a-9823db776745', // Compensatorio
];

// Nombres que indican permisos/feriados
const restrictedScheduleNames = [
  'feriado',
  'dia libre',
  'día libre',
  'vacaciones',
  'licencia',
  'incapacidad',
  'compensatorio',
  'maternidad',
  'paternidad',
];
```

## Query de Schedules

```typescript
public schedules = httpResource<EmployeeScheduleData[]>(() => {
  const { start, end } = this.normalizedDateRange();

  return {
    url: this.apiUrl.build('rest/v1/employee_schedules', {
      select: '*,schedule:schedules(*),employee:employees(id,company_id)',
      start_date: `lte.${format(end, 'yyyy-MM-dd')}`,
      end_date: `gte.${format(start, 'yyyy-MM-dd')}`,
      'employee.company_id': `eq.${companyId}`
    })
  };
});
```

## Colores de Schedule

```typescript
// Variantes de colores predefinidas
const colorVariants: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/50',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50',
  },
  // ... más colores
};

function getScheduleColorInlineStyle(schedule: Schedule): string {
  const color = schedule.color || 'gray';
  return colorVariants[color] || colorVariants['gray'];
}
```

## Timetable (Vista Semanal)

```typescript
// El timetable muestra una vista semanal de todos los empleados
// con sus schedules asignados

interface TimetableCell {
  employee: Employee;
  date: string;           // 'yyyy-MM-dd'
  schedule?: EmployeeSchedule;
  isToday: boolean;
  isWeekend: boolean;
}

// Navegación semanal
readonly currentWeekStart = signal<Date>(startOfWeek(new Date()));

previousWeek(): void {
  this.currentWeekStart.update(d => subWeeks(d, 1));
}

nextWeek(): void {
  this.currentWeekStart.update(d => addWeeks(d, 1));
}
```

## Aprobación de Turnos

```typescript
async approveSchedule(id: string): Promise<void> {
  const url = this.apiUrl.build('rest/v1/employee_schedules', {
    id: `eq.${id}`
  });

  await firstValueFrom(
    this.http.patch(url, {
      approved: true,
      approved_by: this.currentUserId,
      approved_at: new Date().toISOString()
    })
  );
}

async bulkApprove(ids: string[]): Promise<void> {
  // Aprobar múltiples schedules
  for (const id of ids) {
    await this.approveSchedule(id);
  }
}
```

## Validaciones

```typescript
// Un empleado no puede tener schedules solapados
function validateNoOverlap(
  existing: EmployeeSchedule[],
  newSchedule: { start_date: string; end_date: string }
): boolean {
  return !existing.some(
    (es) =>
      newSchedule.start_date <= es.end_date &&
      newSchedule.end_date >= es.start_date
  );
}
```
