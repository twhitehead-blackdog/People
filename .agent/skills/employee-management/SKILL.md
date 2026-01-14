---
name: employee-management
description: CRUD completo de empleados. Úsala para crear, editar, listar o ver detalles de empleados.
---

# Employee Management Skill

Esta skill te guía en la gestión de empleados en People.

## Componentes Principales

| Componente                | Ubicación                                | Descripción        |
| ------------------------- | ---------------------------------------- | ------------------ |
| `EmployeeListComponent`   | `dashboard/employee-list.component.ts`   | Lista de empleados |
| `EmployeeFormComponent`   | `dashboard/employee-form.component.ts`   | Formulario CRUD    |
| `EmployeeDetailComponent` | `dashboard/employee-detail.component.ts` | Vista de detalle   |

## Modelo de Employee

```typescript
interface Employee {
  id: string;
  employee_number: string; // 'BD0001', 'NZ0001'
  first_name: string;
  middle_name?: string;
  father_name: string; // Apellido paterno
  mother_name?: string; // Apellido materno
  email?: string;
  phone?: string;
  hire_date: string;
  birth_date?: string;
  gender?: 'M' | 'F';

  // Relaciones
  company_id: string;
  branch_id: string;
  department_id?: string;
  position_id?: string;

  // Estado
  is_active: boolean;
  termination_date?: string;
  termination_reason?: string;

  // Portal
  has_portal_access: boolean;
  account_approved: boolean;
  totp_secret?: string; // PIN de 6 dígitos

  // Foto
  photo_url?: string;

  // Datos de nómina
  salary?: number;
  salary_type?: 'hourly' | 'monthly';
  bank_account?: string;

  // Acumulados
  total_overtime_minutes?: number;
  total_lunch_exceeded_minutes?: number;
}
```

## Numeración Automática

```typescript
// Prefijos por empresa
const COMPANY_PREFIXES: Record<string, string> = {
  blackdog: 'BD',
  naz: 'NZ',
};

// Ejemplo: BD0001, BD0002, NZ0001
function generateEmployeeNumber(
  companyPrefix: string,
  lastNumber: number
): string {
  const nextNumber = lastNumber + 1;
  return `${companyPrefix}${nextNumber.toString().padStart(4, '0')}`;
}
```

## Formulario de Empleado

```typescript
// Campos requeridos
const requiredFields = [
  'first_name',
  'father_name',
  'hire_date',
  'branch_id',
  'company_id',
];

// Validaciones
const employeeValidators = {
  email: Validators.email,
  phone: Validators.pattern(/^\+?[0-9]{8,15}$/),
  salary: Validators.min(0),
};
```

## Store de Empleados

```typescript
// EmployeesStore maneja el estado global
import { EmployeesStore } from '../stores/employees.store';

@Component({...})
export class MyComponent {
  private employees = inject(EmployeesStore);

  // Lista de empleados activos
  readonly activeEmployees = computed(() =>
    this.employees.employeesList().filter(e => e.is_active)
  );

  // Buscar empleado por ID
  getEmployee(id: string): Employee | undefined {
    return this.employees.employeesList().find(e => e.id === id);
  }
}
```

## Query de Empleados

```typescript
public employeesResource = httpResource<Employee[]>(() => ({
  url: this.apiUrl.build('rest/v1/employees', {
    company_id: `eq.${this.companyId()}`,
    is_active: 'eq.true',
    select: '*,branch:branches(id,name),position:positions(id,name)',
    order: 'father_name.asc,first_name.asc'
  })
}));
```

## Crear Empleado

```typescript
async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
  const url = this.apiUrl.build('rest/v1/employees');

  const employee = await firstValueFrom(
    this.http.post<Employee[]>(url, {
      ...data,
      is_active: true,
      has_portal_access: false,
      account_approved: false
    }, {
      headers: { 'Prefer': 'return=representation' }
    })
  );

  return employee[0];
}
```

## Actualizar Empleado

```typescript
async updateEmployee(id: string, changes: Partial<Employee>): Promise<void> {
  const url = this.apiUrl.build('rest/v1/employees', {
    id: `eq.${id}`
  });

  await firstValueFrom(
    this.http.patch(url, changes)
  );
}
```

## Terminar Empleado

```typescript
async terminateEmployee(
  id: string,
  reason: string,
  date: Date
): Promise<void> {
  await this.updateEmployee(id, {
    is_active: false,
    termination_date: format(date, 'yyyy-MM-dd'),
    termination_reason: reason,
    has_portal_access: false
  });
}
```

## Búsqueda de Empleados

```typescript
function matchesEmployeeSearch(
  employee: Employee,
  searchTerm: string
): boolean {
  const term = searchTerm.toLowerCase().trim();

  return (
    employee.first_name.toLowerCase().includes(term) ||
    employee.father_name.toLowerCase().includes(term) ||
    employee.employee_number.toLowerCase().includes(term) ||
    (employee.email?.toLowerCase().includes(term) ?? false)
  );
}
```

## Formato de Nombre

```typescript
// Usar TrimPipe para limpiar espacios
import { TrimPipe } from '../pipes/trim.pipe';

// En template
{{ employee.father_name | trim }}, {{ employee.first_name | trim }}
```
