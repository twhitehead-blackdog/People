---
title: Database Tables
type: database
status: current
tags: [database, tables, schema]
source: database/01-setup.sql
last-updated: 2026-02-13
---
# Database Tables

## Entidades Principales

```
companies
└── branches (company_id FK)
└── departments
    └── positions (department_id FK)
└── employees (company_id, position_id, branch_id FKs)
    ├── timelogs (employee_id, branch_id, company_id)
    ├── employee_schedules (employee_id, schedule_id, branch_id)
    ├── time_offs (employee_id, type_id)
    ├── overtime_consumptions (employee_id)
    ├── employee_disabilities
    ├── employee_vacations
    └── document_requests (employee_id)
```

## Tablas Core

| Tabla | Descripción | FK Principal |
|-------|-------------|-------------|
| `companies` | Empresas | — |
| `branches` | Sucursales | company_id |
| `departments` | Departamentos | — |
| `positions` | Cargos | department_id |
| `employees` | Empleados | company_id, position_id, branch_id |
| `schedules` | Definiciones de horarios | — |

## Tablas de Gestión

| Tabla | Descripción | FK Principal |
|-------|-------------|-------------|
| `timelogs` | Marcaciones (entry/lunch/exit) | employee_id, company_id |
| `employee_schedules` | Asignación horario ↔ empleado | employee_id, schedule_id |
| `time_offs` | Solicitudes de ausencia | employee_id, type_id |
| `time_off_types` | Tipos de ausencia | — |
| `overtime_consumptions` | Consumo de horas extra | employee_id |
| `terminations` | Desvinculaciones | employee_id |

## Tablas de Nómina

| Tabla | Descripción | FK Principal |
|-------|-------------|-------------|
| `payrolls` | Nóminas | company_id |
| `payroll_deductions` | Deducciones (ISR, CSS, etc.) | payroll_id |
| `payroll_employees` | Empleado ↔ nómina | payroll_id, employee_id |
| `payroll_payments` | Períodos de pago | payroll_id |
| `payroll_payment_employees` | Detalle pago por empleado | payroll_payment_id |
| `payroll_payment_employee_items` | Items individuales | payment_employee_id |
| `payroll_debts` | Deudas/préstamos | payroll_id, employee_id |
| `creditors` | Acreedores | — |
| `banks` | Bancos | — |

## Tablas HR

| Tabla | Descripción | FK Principal |
|-------|-------------|-------------|
| `employee_disabilities` | Incapacidades | employee_id |
| `employee_vacations` | Vacaciones | employee_id |
| `document_requests` | Solicitudes de documentos | employee_id |
| `complaints` | Quejas | employee_id |
| `complaint_messages` | Mensajes de quejas | complaint_id |
| `suggestions` | Sugerencias | employee_id |

## Tablas IT

| Tabla | Descripción | FK Principal |
|-------|-------------|-------------|
| `devices` | Inventario de dispositivos | company_id |
| `device_assignments` | Asignaciones dispositivo ↔ empleado | device_id, employee_id |

## Tablas Feria de Empleo

| Tabla | Descripción | FK Principal |
|-------|-------------|-------------|
| `job_applications` | Solicitudes de empleo | — |

## Tablas Especiales

| Tabla | Descripción |
|-------|-------------|
| `vet_branch_assignments` | Asignaciones veterinaria por día |
| `groomer_branch_assignments` | Asignaciones grooming por día |
| `settings` | Configuración del sistema |

## ⚠️ Regla Fundamental
> **TODAS las queries deben filtrar por `company_id`** excepto la tabla `companies` misma.
