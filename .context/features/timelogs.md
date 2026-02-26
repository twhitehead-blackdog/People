---
title: Timelogs Feature
type: feature
status: production
tags: [feature, timelogs, attendance, kiosk]
related: [[timelog-model]], [[schedule-model]]
last-updated: 2026-02-13
---
# Timelogs — Control de Asistencia

## Descripción
Sistema de marcaciones que registra entry/lunch_start/lunch_end/exit de cada empleado. Incluye kiosk para marcaciones por QR y vista administrativa para supervisión.

## Flujo de Marcación
```
Empleado marca (QR/manual)
  → process_timelog() RPC (Supabase)
    → Validar horario (schedule)
    → Calcular: retrasos, salidas tempranas, exceso lunch
    → Guardar timelog
```

## Cálculo de Horas
```
Total trabajo = exit - entry
Almuerzo = lunch_end - lunch_start
Trabajo neto = total - almuerzo
Almuerzo máx permitido: 60 min
Exceso de almuerzo RESTA overtime
Overtime = trabajo neto - 8h (solo si > 8h)
```

## Componentes Principales

| Componente | Archivo | Líneas |
|-----------|---------|--------|
| Timelogs Admin | `timelogs.component.ts` | ~80K |
| Timeclock Kiosk | `timeclock.component.ts` | ~89K |
| NAZ Timeclock | `naz-timeclock/` | Separado |
| HR Time Dashboard | `hr-time-dashboard.component.ts` | ~23K |

## Fuentes de Marcación
- `KIOSK` — Marcación por QR en tablet
- `MANUAL` — Registro manual por admin
- `RPC` — Procesada por función SQL

## ⚠️ Precauciones
- **NUNCA** modificar lógica de cálculo de overtime sin extremo cuidado
- Timelogs históricos usan `created_at` (NO existe campo `day`)
- Agrupar por día: `format(created_at, 'yyyy-MM-dd')`
