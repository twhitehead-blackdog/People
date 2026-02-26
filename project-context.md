# 🧠 PeopleBD – Project Context

## 📋 Contexto General

PeopleBD es un sistema de gestión de recursos humanos (HRMS) para empresas panameñas.
Está en producción y se usa diariamente para asistencia, horas extra y nómina.

El error más grave posible es romper:

- cálculo de horas
- consumo de overtime
- flujos de aprobación

────────────────────────────────────────
🎯 PROPÓSITO PRINCIPAL
────────────────────────────────────────

- Gestión de empleados (datos, contratos, salarios)
- Control de asistencia (timelogs)
- Solicitudes de tiempo libre
- Gestión de horas extra y compensatorio
- Soporte multiempresa
- Portal de empleados (autoservicio)

────────────────────────────────────────
🏢 ENTIDADES PRINCIPALES
────────────────────────────────────────
Company
└── Branch
└── Employee
├── Position
├── Department
├── Schedule
├── Timelog
├── Timeoff
└── Payroll

### Entidades clave

- employees
- timelogs
- timeoffs
- schedules
- overtime_consumptions

────────────────────────────────────────
🔄 FLUJOS CRÍTICOS
────────────────────────────────────────

### 1️⃣ Solicitud de Tiempo Compensatorio

Empleado →
Formulario (horas/días, fechas, motivo, fechas manuales) →
timeoffs (compensatory_type, compensatory_amount, notes[]) →
Email a RRHH →
RRHH aprueba/rechaza →
Si aprueba:

- consume overtime_consumptions
- prioriza fechas manuales

### 2️⃣ Cálculo de Horas Extra

Timelogs del día:

- entry
- lunch_start
- lunch_end
- exit

Reglas:

- Tiempo total = exit - entry
- Tiempo trabajo = total - lunch
- Lunch permitido: máx 60 min
- Exceso de lunch RESTA overtime
- Overtime = trabajo neto - 8h
- Solo si > 8h

### 3️⃣ Marcaciones

Empleado marca →
process_timelog() RPC (Supabase) →
Validar horario →
Calcular:

- retrasos
- salidas tempranas
- exceso de lunch →
  Guardar timelog

────────────────────────────────────────
📐 REGLAS DE NEGOCIO
────────────────────────────────────────

### Horas Extra

- Se calculan por día
- Consumo parcial permitido
- Puede usar múltiples días
- Todo consumo es AUDITABLE
- Cada uso crea overtime_consumptions

### Timeoffs

- Estados: pending → approved / rejected
- Validación manual por RRHH
- Emails automáticos según configuración

### Empleados

- Multiempresa (company_id)
- Portal controlado por:
  - has_portal_access
  - account_approved
- Numeración:
  - BD0001
  - NZ0001

────────────────────────────────────────
🎨 CONVENCIONES DE NOMBRES
────────────────────────────────────────

- Components: pt-\*
- Stores: \*Store
- Services: \*Service
- Actions: \*.actions.ts
- Utils: \*.utils.ts
- Signals:
  - computed → camelCase()
  - state → camelCase = signal()

────────────────────────────────────────
🔧 PATRONES DE CÓDIGO
────────────────────────────────────────

### Supabase

- Usar httpResource
- Queries reactivas
- Siempre filtrar por company_id
- Timelogs históricos → created_at (NO existe day)

### Fechas

- Usar date-fns
- Timezone: America/Panama
- NO usar Date nativo directo

### Formato de horas

- SIEMPRE usar formatHoursMinutes()

### Emails

- Verificar settings antes de enviar
- No asumir notificación activa

────────────────────────────────────────
⚠️ CONTEXTO CRÍTICO
────────────────────────────────────────

- Proyecto en producción
- Cambios pequeños y seguros
- No romper UX
- No romper payroll
- No romper overtime

Cursor debe:
✔ entender dominio
✔ refactorizar con cuidado
✔ no inventar reglas
✔ respetar flujos reales
