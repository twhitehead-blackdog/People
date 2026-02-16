---
title: Schedules Feature
type: feature
status: production
tags: [feature, schedules, shifts, timetable]
related: [[schedule-model]]
last-updated: 2026-02-13
---
# Schedules — Horarios y Turnos

## Descripción
Gestión de horarios: crear templates de horario, asignar a empleados por rangos de fecha, visualizar en timetable, y auto-asignar.

## Componentes

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| schedules.component | Lista horarios | CRUD de templates |
| schedules-form.component | Formulario | Crear/editar horario |
| employee-schedules.component | Asignaciones | Lista de asignaciones |
| employee-schedules-form.component | Formulario asignación | Asignar a empleado |
| employees-timetable.component | Timetable visual | Vista calendario |
| salon-schedule.component | Horario salones | Vista especializada |
| vet-schedule.component | Horario veterinaria | Vista especializada |

## Servicios
- `ScheduleAuditService` — Log de cambios en horarios
- `ScheduleAutoAssignService` — Asignación automática

## Colores de Horario
Los horarios tienen colores asignados para visualización. Soporta:
- Colores predefinidos (variants)
- Colores RGB custom

## Notas
- `day_off: true` → día libre
- `minutes_tolerance` → tolerancia antes de marcar tardanza
- Aprobación opcional por supervisor (`approved` flag)
