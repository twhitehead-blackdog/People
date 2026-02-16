---
title: PermissionsService
type: service
status: implemented
tags: [service, permissions, roles, guards]
source: src/app/services/permissions.service.ts
related: [[employee-model]], [[core-models]]
last-updated: 2026-02-13
---
# PermissionsService

> Sistema de permisos: Position → base permissions, Employee → override permissions.

## Quick Summary
Construye perfiles de permisos combinando permisos del cargo (Position) con overrides del empleado. Dos sistemas coexisten: legacy (boolean flags) y frontend (module-based).

## Jerarquía de Permisos
```
Position.frontend_permissions      → Base (define por cargo)
  ↓ merge
Employee.frontend_permissions_override → Override (por empleado individual)
  = Final permissions
```

## API Principal

### `buildUserProfile(employee): UserPermissionProfile`
Construye el perfil completo de un empleado combinando Position + Override.

### `buildFrontendPermissions(position?): FrontendPermissions`
Genera permisos de frontend basados en el cargo.

### `mergeFrontendPermissions(base, override): FrontendPermissions`
Merge: por cada módulo en override, reemplaza el módulo completo.

### `determineUserType(employee, permissions?): 'employee' | 'manager' | 'admin' | 'superadmin'`
Determina tipo de usuario basado en el cargo.

### Updates
- `updatePositionFrontendPermissions(positionId, permissions)` — Actualiza Position
- `updateEmployeeFrontendPermissions(employeeId, permissions)` — Actualiza Employee override
- `clearEmployeeFrontendPermissions(employeeId)` — Limpia override → restaura Position

### Consultas
- `getSystemModules(): ModuleDefinition[]` — Todos los módulos del sistema
- `getUserProfile(employeeId): UserPermissionProfile` — Perfil de un empleado

## Sistemas de Permisos

### Frontend Permissions (activo)
Basado en módulos y submódulos. Se guarda como JSON en `frontend_permissions`.

### Legacy Permissions (deprecado)
Boolean flags individuales. Se guarda como JSON en `legacy_permissions_override`.

## Ubicación
`src/app/services/permissions.service.ts` (560 líneas)
