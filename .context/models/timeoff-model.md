---
title: TimeOff Model
type: model
status: implemented
tags: [model, timeoff, vacation, compensatory, termination]
source: src/app/models.ts#L90-L114
related: [[employee-model]], [[schedule-model]]
last-updated: 2026-02-13
---
# TimeOff Model

## TimeOffType
> Tipo de ausencia.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre del tipo |

**Tabla:** `time_off_types`

## TimeOff
> Solicitud de ausencia de un empleado.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| type_id | string | FK → time_off_types |
| type | TimeOffType? | Joined |
| employee_id | string | FK → employees |
| employee | Employee? | Joined |
| date_from | Date | Fecha inicio |
| date_to | Date | Fecha fin |
| notes | string[] | Notas/comentarios |
| is_approved | boolean | Aprobado por RRHH |
| created_by | string? | FK → employees |

**Tabla:** `time_offs`

### Flujo de Aprobación
```
Empleado solicita → timeoffs (pending)
  → Email a RRHH
    → RRHH aprueba/rechaza
      → Si aprueba: consume overtime_consumptions
```

### Tipos de TimeOff
- Vacaciones
- Compensatorio (horas)
- Compensatorio (días)
- Incapacidad (con documento adjunto)

## Termination
> Desvinculación de empleado.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| employee_id | string | FK → employees |
| date | Date | Fecha de desvinculación |
| notes | string | Notas |
| reason | 'DESPIDO' \| 'RENUNCIA' \| 'FIN_CONTRATO' | Motivo |

**Tabla:** `terminations`

## ⚠️ PostgREST: FKs Múltiples
`time_offs` tiene 2 FKs a `employees`:
- `time_offs_employee_id_fkey` → employee_id
- `timeoffs_created_by_fkey` → created_by (nota: sin underscore)
