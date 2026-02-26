---
title: Payroll Model
type: model
status: implemented
tags: [model, payroll, deductions, payments]
source: src/app/models.ts#L165-L360
related: [[employee-model]]
last-updated: 2026-02-13
---
# Payroll Model

## Payroll
> Definición de nómina por empresa.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre de la nómina |
| company_id | string? | FK → companies |
| company | Company? | Joined |
| deductions | PayrollDeduction[]? | Deducciones asociadas |

**Tabla:** `payrolls`

## PayrollDeduction
> Tipo de deducción de nómina.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| payroll_id | string | FK → payrolls |
| name | string | Nombre de la deducción |
| value | number | Valor (fijo o %) |
| min_salary | number | Salario mínimo para aplicar |
| income_tax | boolean? | Es impuesto sobre la renta |
| calculation_type | 'fixed' \| 'percentage' | Tipo de cálculo |

**Tabla:** `payroll_deductions`

## PayrollEmployee
> Asociación empleado ↔ nómina con salarios.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| payroll_id | string | FK → payrolls |
| employee_id | string | FK → employees |
| monthly_salary | number | Salario mensual |
| hourly_salary | number | Salario por hora |
| employee | Employee | Joined |

**Tabla:** `payroll_employees`

## PayrollPayment
> Período de pago.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| title | string | Título del pago |
| payroll_id | string | FK → payrolls |
| start_date | Date | Inicio del período |
| end_date | Date | Fin del período |
| status | 'PENDING' \| 'PAID' | Estado |

**Tabla:** `payroll_payments`

## PayrollPaymentEmployee & Items
> Detalle de pago por empleado con items individuales.

**PayrollPaymentEmployee:**
- `total_amount`, `debt_amount`, `late_amount`, `absence_amount`
- `income_amount`, `deduction_amount`
- `items: PayrollPaymentEmployeeItem[]`

**PayrollPaymentEmployeeItem:**
- `type: 'income' | 'deduction' | 'debt'`
- `amount`, `description`

## PayrollDebt
> Deudas de empleados (préstamos, adelantos).

| Field | Type | Description |
|-------|------|-------------|
| creditor_id | string | FK → creditors |
| employee_id | string | FK → employees |
| account_id | string | Identificador de cuenta |
| amount | number | Monto total |
| balance | number | Balance pendiente |
| start_date | Date | Inicio |
| due_date | Date | Vencimiento |

**Tabla:** `payroll_debts`

## ⚠️ PRECAUCIÓN
> Modificar lógica de cálculo de payroll/overtime requiere **extremo cuidado**. Sistema en producción.
