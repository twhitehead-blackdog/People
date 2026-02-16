---
title: Time Offs Feature
type: feature
status: production
tags: [feature, timeoff, vacation, compensatory, disability]
related: [[timeoff-model]]
last-updated: 2026-02-13
---
# Time Offs — Vacaciones, Compensatorio, Incapacidades

## Descripción
Sistema de solicitudes de ausencia con flujo de aprobación.

## Tipos de Ausencia
- **Vacaciones** — Días de descanso laboral
- **Compensatorio (días)** — Días completos compensatorios por overtime
- **Compensatorio (horas)** — Horas parciales compensatorias
- **Incapacidad** — Con documento médico adjunto

## Flujo de Solicitud de Compensatorio
```
Empleado solicita
  → Formulario: tipo (horas/días), fechas, motivo
    → Guardar en time_offs
      → Email a RRHH
        → RRHH aprueba/rechaza
          → Si aprueba:
            → Consume overtime_consumptions
            → Prioriza fechas manuales
```

## Componentes

| Componente | Propósito |
|-----------|-----------|
| time-offs.component | Vista admin de solicitudes |
| time-management.component | Gestión de tiempo |
| hr-disabilities.component | Incapacidades (211KB - archivo grande) |
| late-compensatory-form.component | Solicitud de compensatorio |

## Reglas de Negocio
- Estados: `pending` → `approved` / `rejected`
- Consumo de overtime es parcial y auditable
- Puede usar horas extra de múltiples días
- Cada consumo crea registro en `overtime_consumptions`
- Emails automáticos según configuración (`settings`)
