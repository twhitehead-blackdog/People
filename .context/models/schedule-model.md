---
title: Schedule Model
type: model
status: implemented
tags: [model, schedule, employee-schedule]
source: src/app/models.ts#L138-L294
related: [[employee-model]], [[timelog-model]]
last-updated: 2026-02-13
---
# Schedule Model

## Schedule
> Definición de horario (template). Se asigna a empleados via EmployeeSchedule.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre del horario |
| entry_time | Date \| string \| null | Hora de entrada |
| lunch_start_time | Date \| string \| null | Inicio almuerzo |
| lunch_end_time | Date \| string \| null | Fin almuerzo |
| exit_time | Date \| string \| null | Hora de salida |
| color | string? | Color para visualización |
| day_off | boolean | Es día libre |
| minutes_tolerance | number | Tolerancia en minutos |
| min_lunch_minutes | number? | Mínimo de almuerzo |
| max_lunch_minutes | number? | Máximo de almuerzo |

**Tabla:** `schedules`

## EmployeeSchedule
> Asignación de un schedule a un empleado en un rango de fechas.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| employee_id | string | FK → employees |
| branch_id | string? | FK → branches |
| branch | Branch? | Joined |
| schedule_id | string | FK → schedules |
| schedule | Schedule? | Joined |
| start_date | Date | Inicio del período |
| end_date | Date | Fin del período |
| approved | boolean? | Aprobado por supervisor |
| approved_at | Date? | Fecha de aprobación |
| company_id | string? | FK → companies |
| time_off_type | 'vacation' \| 'compensatory_day' \| 'compensatory_hours' \| 'disability' \| null | Tipo de ausencia |
| time_off_source_id | string? | FK al time_off origen |
| compensatory_hours_amount | number? | Horas compensatorias |

**Tabla:** `employee_schedules`

## Notas
- Horarios se pueden colorear (color variants predefinidos o RGB custom)
- `day_off: true` indica un día libre (no se calculan horas)
- `time_off_type` se usa cuando el schedule block representa una ausencia
