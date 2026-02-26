---
title: Naming Contracts
type: decision
status: active
tags: [decision, naming, conventions]
last-updated: 2026-02-13
---
# Naming Contracts

## Archivos y Componentes

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Components | `pt-*.component.ts` | `pt-permissions.component.ts` |
| Services | `*Service` | `OrganizationService` |
| Stores | `*Store` | `EmployeesStore` |
| Actions | `*.actions.ts` | `employee.actions.ts` |
| Utils | `*.utils.ts` | `date.utils.ts` |

## Signals

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| State signals | `camelCase = signal()` | `isLoading = signal(false)` |
| Computed | `camelCase = computed()` | `filteredItems = computed(...)` |

## Employee Numbers

| Empresa | Patrón | Ejemplo |
|---------|--------|---------|
| Black Dog | `BD0001` | BD0001, BD0002, BD0003 |
| Naz | `NZ0001` | NZ0001, NZ0002, NZ0003 |

## Database

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Tablas | snake_case plural | `employees`, `timelogs` |
| FKs | `{tabla}_{columna}_fkey` | `timelogs_employee_id_fkey` |
| Migrations | `YYYYMMDD_descripcion.sql` | `20260110_groomer_branch_assignments.sql` |
