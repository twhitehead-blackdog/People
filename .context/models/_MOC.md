---
title: Models MOC
type: moc
status: active
tags: [models, moc]
last-updated: 2026-02-13
---
# Models

Todas las interfaces están en `src/app/models.ts` (80+ interfaces, 1134 líneas).

| Nota | Interfaces | Tabla(s) |
|------|-----------|----------|
| [[core-models]] | Company, Branch, Department, Position | companies, branches, departments, positions |
| [[employee-model]] | Employee (44+ campos) | employees |
| [[timelog-model]] | TimeLog, TimeLogEnum, TimelogType | timelogs |
| [[schedule-model]] | Schedule, EmployeeSchedule | schedules, employee_schedules |
| [[payroll-model]] | Payroll, PayrollDeduction, PayrollPayment, etc. | payroll_*, payment_* |
| [[timeoff-model]] | TimeOff, TimeOffType, Termination | time_offs, time_off_types |

## Modelos Secundarios
- `AttendanceSheet` — Hoja de asistencia calculada
- `JobApplication` — Solicitudes feria de empleo
- `VetBranchAssignment` / `GroomerBranchAssignment` — Asignaciones por sucursal
- `NazCompany`, `NazEmployee`, etc. — Modelos legacy NAZ (migrados a company_id)
