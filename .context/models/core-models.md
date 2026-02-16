---
title: Core Models
type: model
status: implemented
tags: [model, company, branch, department, position]
source: src/app/models.ts
last-updated: 2026-02-13
---
# Core Models

## Company
> Empresa. Filtro principal de multi-tenancy.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre de la empresa |
| address | string | Dirección |
| phone_number | string | Teléfono |
| is_active | boolean | Activa/Inactiva |
| created_at | Date? | Fecha de creación |

**Tabla:** `companies`
**Empresas activas:** Black Dog Panama, Naz

## Branch
> Sucursal de una empresa. Empleados se asignan a branches.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre |
| short_name | string | Abreviatura |
| address | string | Dirección |
| is_active | boolean | Activa |
| ip | string | IP para validar marcaciones |
| company_id | string? | FK a companies |

**Tabla:** `branches`

## Department
> Departamento organizacional.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre del departamento |

**Tabla:** `departments`

## Position
> Cargo/puesto. Define permisos base del empleado.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Nombre del cargo |
| department_id | string | FK a departments |
| department | Department? | Relación |
| schedule_admin | boolean | Puede administrar horarios |
| admin | boolean | Es admin del sistema |
| schedule_approver | boolean | Puede aprobar horarios |
| dashboard_access | boolean | Acceso al dashboard |
| default_view | string? | Vista por defecto |
| available_for_job_fair | boolean? | Disponible para feria |
| frontend_permissions | string \| Record? | Permisos de módulos |

**Tabla:** `positions`
**Nota:** `frontend_permissions` se guarda como JSON string en la DB, se parsea en `PermissionsService`.
