---
title: TimeLog Model
type: model
status: implemented
tags: [model, timelog, attendance]
source: src/app/models.ts#L244-L275
related: [[employee-model]], [[schedule-model]]
last-updated: 2026-02-13
---
# TimeLog Model

> Registro de marcación. 4 tipos por día: entry, lunch_start, lunch_end, exit.

## Enums

### TimeLogEnum (valores internos)
```typescript
entry = 'entry'
lunch_start = 'lunch_start'
lunch_end = 'lunch_end'
exit = 'exit'
```

### TimelogType (display values)
```typescript
entry = 'Entrada'
lunch_start = 'Inicio Almuerzo'
lunch_end = 'Fin de Almuerzo / Regreso'
exit = 'Salida'
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| employee_id | string | FK → employees |
| employee | Partial<Employee>? | Joined |
| company_id | string | FK → companies |
| branch_id | string | FK → branches |
| branch | Branch? | Joined |
| type | TimeLogEnum | Tipo de marcación |
| ip | string? | IP del dispositivo |
| invalid_id | boolean? | Marcación inválida |
| created_at | Date | Fecha/hora de la marcación |
| source | 'KIOSK' \| 'MANUAL' \| 'RPC' | Origen |
| created_by | string? | FK → employees (quien creó) |
| punched_at | Date? | Timestamp del punch |
| reason | string? | Motivo (marcación manual) |

## Tabla Supabase
`timelogs`

## Cálculo de Horas
```
Total work = exit - entry - lunch
Lunch max permitido: 60 min (exceso resta overtime)
Overtime = total work - 8h (solo si > 8h)
```

## ⚠️ PostgREST: FKs Múltiples
`timelogs` tiene 2 FKs a `employees`:
- `timelogs_employee_id_fkey` → employee_id
- `timelogs_created_by_fkey` → created_by

**Siempre especificar la FK:**
```typescript
select: `*,employee:employees!timelogs_employee_id_fkey(id,first_name)`
```

## Notas
- `created_at` es el timestamp principal (NO existe campo `day`)
- Para agrupar por día: `format(created_at, 'yyyy-MM-dd')`
- Marcaciones procesadas por RPC `process_timelog()` en Supabase
