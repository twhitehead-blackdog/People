---
title: Employee Model
type: model
status: implemented
tags: [model, employee, core]
source: src/app/models.ts#L44-L88
related: [[core-models]], [[timelog-model]]
last-updated: 2026-02-13
---
# Employee Model

> Central entity. Un empleado pertenece a una Company y tiene Position, Schedule, Branch, etc.

## Fields (44+)

### Identificación
| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| employee_number | string? | Numeración: BD0001, NZ0001 |
| document_id | string | Cédula panameña |
| first_name | string | Nombre |
| middle_name | string | Segundo nombre |
| father_name | string | Apellido paterno |
| mother_name | string | Apellido materno |

### Datos Personales
| Field | Type | Description |
|-------|------|-------------|
| birth_date | Date? | Fecha de nacimiento |
| gender | 'M' \| 'F' | Género |
| start_date | Date | Fecha de ingreso |
| end_date | Date? | Fecha de salida |
| phone_number | string | Teléfono |
| email | string | Email personal |
| work_email | string? | Email corporativo |
| address | string? | Dirección |

### Relaciones
| Field | Type | Description |
|-------|------|-------------|
| company_id | string | FK → companies |
| position_id | string | FK → positions |
| position | Position? | Cargo (joined) |
| branch_id | string? | FK → branches |
| branch | Branch? | Sucursal (joined) |

### Financiero
| Field | Type | Description |
|-------|------|-------------|
| salary | number | Salario mensual |
| hourly_salary | number? | Salario por hora |
| bank | string? | Banco |
| account_number | string? | Número de cuenta |
| bank_account_type | 'Ahorros' \| 'Corriente' | Tipo de cuenta |

### Estado
| Field | Type | Description |
|-------|------|-------------|
| is_active | boolean | Activo o desvinculado |
| qr_code | string? | QR para marcaciones |
| code_uri | string? | URI del QR |

### Portal y Permisos
| Field | Type | Description |
|-------|------|-------------|
| has_portal_access | boolean? | Acceso al portal empleado |
| account_approved | boolean? | Cuenta aprobada |
| frontend_permissions_override | string \| Record? | Override permisos frontend |
| legacy_permissions_override | string \| Record? | Override permisos legacy |

### Uniforme
| Field | Type | Description |
|-------|------|-------------|
| uniform_size | UniformSize? | Talla de uniforme |

### Overtime
| Field | Type | Description |
|-------|------|-------------|
| total_lunch_exceeded_minutes | number? | Minutos exceso almuerzo acumulados |

## Tabla Supabase
`employees`

## Notas
- `employee_number` se genera automáticamente: `BD0001` para Black Dog, `NZ0001` para Naz
- `position` define permisos base, `frontend_permissions_override` los sobreescribe
- `full_name` es un campo computed en algunos contextos
