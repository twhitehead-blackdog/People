---
description: Contexto de dominio del sistema HRMS PeopleBD. Entidades, flujos críticos y reglas de negocio.
---

# 🧠 PeopleBD – Contexto del Proyecto

## 📋 Contexto General

PeopleBD es un sistema de gestión de recursos humanos (HRMS) para empresas panameñas.
Está en **producción** y se usa diariamente para asistencia, horas extra y nómina.

> ⚠️ **Riesgo crítico**: Romper cálculo de horas, consumo de overtime, o flujos de aprobación.

## 🎯 Propósito Principal

- Gestión de empleados (datos, contratos, salarios)
- Control de asistencia (timelogs)
- Solicitudes de tiempo libre
- Gestión de horas extra y compensatorio
- Soporte multiempresa
- Portal de empleados (autoservicio)

## 🏢 Entidades Principales

```
Company
└── Branch
    └── Employee
        ├── Position
        ├── Department
        ├── Schedule
        ├── Timelog
        ├── Timeoff
        └── Payroll
```

**Tablas clave**: `employees`, `timelogs`, `timeoffs`, `schedules`, `overtime_consumptions`

## 🔄 Flujos Críticos

### 1️⃣ Solicitud de Tiempo Compensatorio

```
Empleado → Formulario (horas/días, fechas, motivo)
→ timeoffs (compensatory_type, compensatory_amount)
→ Email a RRHH → RRHH aprueba/rechaza
→ Si aprueba: consume overtime_consumptions (prioriza fechas manuales)
```

### 2️⃣ Cálculo de Horas Extra

- Timelogs: `entry`, `lunch_start`, `lunch_end`, `exit`
- Tiempo total = exit - entry
- Tiempo trabajo = total - lunch
- Lunch permitido: máx **60 min**
- Exceso de lunch **RESTA** overtime
- Overtime = trabajo neto - 8h (solo si > 8h)

### 3️⃣ Marcaciones

```
Empleado marca → process_timelog() RPC (Supabase)
→ Validar horario → Calcular: retrasos, salidas tempranas, exceso de lunch
→ Guardar timelog
```

## 📐 Reglas de Negocio

### Horas Extra

- Se calculan por día
- Consumo parcial permitido
- Puede usar múltiples días
- Todo consumo es **AUDITABLE**
- Cada uso crea `overtime_consumptions`

### Timeoffs

- Estados: `pending` → `approved` / `rejected`
- Validación manual por RRHH
- Emails automáticos según configuración

### Empleados

- Multiempresa (`company_id`)
- Portal controlado por: `has_portal_access`, `account_approved`
- Numeración: `BD0001`, `NZ0001`

## 🎨 Convenciones de Nombres

| Elemento         | Patrón                 |
| ---------------- | ---------------------- |
| Components       | `pt-*`                 |
| Stores           | `*Store`               |
| Services         | `*Service`             |
| Actions          | `*.actions.ts`         |
| Utils            | `*.utils.ts`           |
| Signals computed | `camelCase()`          |
| Signals state    | `camelCase = signal()` |

## 🔧 Patrones de Código

### Supabase

- Usar `httpResource` (queries reactivas)
- Siempre filtrar por `company_id`
- Timelogs históricos → `created_at` (NO existe `day`)

### Fechas

- Usar `date-fns`
- Timezone: `America/Panama`
- NO usar `Date` nativo directo

### Formato de horas

- **SIEMPRE** usar `formatHoursMinutes()`

### Emails

- Verificar settings antes de enviar
- No asumir notificación activa

## ⚠️ Recordatorio Final

- Proyecto en producción
- Cambios pequeños y seguros
- No romper UX, payroll, ni overtime
