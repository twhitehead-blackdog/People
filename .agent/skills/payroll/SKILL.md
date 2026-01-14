---
name: payroll
description: Gestión de nómina, deducciones y pagos. Úsala para trabajar con payrolls, deductions y payment items.
---

# Payroll Skill

Esta skill te guía en la gestión de nómina en People.

## Componentes Principales

| Componente                   | Ubicación                                   | Descripción         |
| ---------------------------- | ------------------------------------------- | ------------------- |
| `PayrollComponent`           | `dashboard/payroll.component.ts`            | Vista principal     |
| `PayrollsComponent`          | `dashboard/payrolls.component.ts`           | Lista de nóminas    |
| `PayrollEmployeesComponent`  | `dashboard/payroll-employees.component.ts`  | Empleados en nómina |
| `PayrollDeductionsComponent` | `dashboard/payroll-deductions.component.ts` | Deducciones         |
| `PayrollPaymentsComponent`   | `dashboard/payroll-payments.component.ts`   | Pagos               |
| `PayrollSummaryComponent`    | `dashboard/payroll-summary.component.ts`    | Resumen             |
| `PayrollDebtsComponent`      | `dashboard/payroll-debts.component.ts`      | Deudas              |

## Modelos

### Payroll

```typescript
interface Payroll {
  id: string;
  company_id: string;
  name: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  status: 'draft' | 'processing' | 'paid' | 'cancelled';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_at: string;
  created_by: string;
}
```

### PayrollEmployee

```typescript
interface PayrollEmployee {
  id: string;
  payroll_id: string;
  employee_id: string;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  worked_days: number;
  overtime_hours: number;
  overtime_amount: number;
}
```

### PayrollDeduction

```typescript
interface PayrollDeduction {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_mandatory: boolean;
  company_id: string;
}
```

## PayrollStore

```typescript
// Store para manejar estado de nómina
import { PayrollStore } from '../stores/payroll.store';

@Component({...})
export class MyComponent {
  private payrollStore = inject(PayrollStore);

  readonly currentPayroll = this.payrollStore.currentPayroll;
  readonly payrollEmployees = this.payrollStore.employees;
}
```

## Cálculo de Nómina

```typescript
interface PayrollCalculation {
  grossSalary: number;
  overtimeAmount: number;
  bonuses: number;
  deductions: {
    socialSecurity: number;
    educationalInsurance: number;
    incomeTax: number;
    otherDeductions: number;
  };
  netSalary: number;
}

function calculatePayroll(
  employee: Employee,
  workedDays: number,
  overtimeHours: number
): PayrollCalculation {
  const dailyRate = employee.salary / 30;
  const grossSalary = dailyRate * workedDays;

  // Overtime: 1.25x normal rate for regular, 1.5x for weekends
  const overtimeRate = (dailyRate / 8) * 1.25;
  const overtimeAmount = overtimeHours * overtimeRate;

  // Deducciones obligatorias Panamá
  const socialSecurity = (grossSalary + overtimeAmount) * 0.0975;
  const educationalInsurance = (grossSalary + overtimeAmount) * 0.0125;

  // ... más cálculos

  return {
    grossSalary,
    overtimeAmount,
    bonuses: 0,
    deductions: {
      socialSecurity,
      educationalInsurance,
      incomeTax: 0,
      otherDeductions: 0,
    },
    netSalary:
      grossSalary + overtimeAmount - socialSecurity - educationalInsurance,
  };
}
```

## Queries

```typescript
// Listar nóminas
public payrolls = httpResource<Payroll[]>(() => ({
  url: this.apiUrl.build('rest/v1/payrolls', {
    company_id: `eq.${this.companyId()}`,
    select: '*',
    order: 'period_start.desc'
  })
}));

// Detalle de nómina con empleados
public payrollDetail = httpResource<PayrollEmployee[]>(() => ({
  url: this.apiUrl.build('rest/v1/payroll_employees', {
    payroll_id: `eq.${this.payrollId()}`,
    select: '*,employee:employees(id,first_name,father_name,employee_number)'
  })
}));
```

## Exportar Nómina

```typescript
import { utils, writeFile } from 'xlsx';

function exportPayrollToExcel(data: PayrollEmployee[]): void {
  const ws = utils.json_to_sheet(
    data.map((e) => ({
      Empleado: `${e.employee.father_name}, ${e.employee.first_name}`,
      'Salario Bruto': e.gross_salary,
      Deducciones: e.deductions,
      'Salario Neto': e.net_salary,
    }))
  );

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Nómina');
  writeFile(wb, 'nomina.xlsx');
}
```
