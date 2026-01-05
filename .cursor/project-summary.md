# ⚡ PeopleBD – Project Summary (Quick Context)

> 📖 Para contexto completo: ver `project-context.md`  
> 🧱 Para reglas de refactorización: ver `.cursorrules`

PeopleBD es un HRMS en producción para empresas panameñas.
El sistema es sensible a errores en asistencia, overtime y nómina.

────────────────────────────────────
🎯 QUÉ ES
────────────────────────────────────

- Angular standalone + Signals
- HRMS: marcaciones, asistencia, horas extra, compensatorio, payroll
- Multiempresa (BlackDog, NAZ, etc.)
- Usuarios reales en producción

────────────────────────────────────
🚨 ZONAS CRÍTICAS (NO ROMPER)
────────────────────────────────────

- Marcaciones (timelogs)
- Cálculo de horas trabajadas
- Cálculo de horas extra
- Consumo de overtime
- Solicitudes compensatorias
- Flujos de aprobación RRHH
- Payroll directo e indirecto

────────────────────────────────────
⏱️ MARCACIONES (CRÍTICO)
────────────────────────────────────

- Tipos válidos:

  - entry
  - lunch_start
  - lunch_end
  - exit

- El orden y la existencia de marcaciones afecta:
  - horas trabajadas
  - tardanzas
  - salidas tempranas
  - overtime
  - payroll

❌ NO alterar lógica de marcaciones sin entender el flujo completo
❌ NO recalcular horas en el component
❌ NO asumir secuencias ideales (hay datos imperfectos)

✔ Las validaciones viven en services
✔ El cálculo vive fuera del component
✔ El component solo muestra resultados

────────────────────────────────────
⏱️ REGLAS CLAVE DE OVERTIME
────────────────────────────────────

- Trabajo neto > 8h = overtime
- Lunch máx 60 min
- Exceso de lunch RESTA overtime
- Consumo parcial permitido
- Priorizar fechas manuales
- Todo consumo es auditable (overtime_consumptions)

────────────────────────────────────
🏗️ ARQUITECTURA (FIJA)
────────────────────────────────────

- Components: orquestan (NO calculan)
- Services: reglas de negocio
- Stores: estado compartido
- Utils: funciones puras
- Actions: submits complejos

❌ No recrear arquitectura
❌ No reescribir componentes completos

────────────────────────────────────
📂 REGLA RÁPIDA DE UBICACIÓN
────────────────────────────────────

- Cálculos → utils
- Negocio → services
- Estado → stores
- Forms/submits → actions
- UI grande → subcomponents

────────────────────────────────────
📅 FECHAS Y HORAS
────────────────────────────────────

- date-fns
- Timezone: America/Panama
- Timelogs históricos usan created_at
- NO existe columna day
- NO usar Date nativo para cálculos
- Formato horas: SIEMPRE formatHoursMinutes() → "1h 30m" (NO "1.5h")

────────────────────────────────────
📌 CUANDO DUDES
────────────────────────────────────

- Revisa patrones existentes
- Mantén comportamiento idéntico
- Preferir cambios pequeños y auditables

────────────────────────────────────
🔍 CONSULTAS SUPABASE
────────────────────────────────────

- Usar httpResource para queries reactivas
- Siempre filtrar por company_id
- Timelogs: filtrar por created_at (gte/lte)
- NO usar columna 'day' (no existe)

────────────────────────────────────
🚨 ZONAS CRÍTICAS (NO ROMPER)
────────────────────────────────────

- Cálculo de horas extra (8h neto, lunch máx 60min)
- Consumo de overtime (parcial, auditable)
- Solicitudes compensatorias (flujo completo)
- Flujos de aprobación RRHH (emails, estados)
- Payroll indirecto (depende de datos correctos)
- Marcaciones
