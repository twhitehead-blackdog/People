---
name: permissions
description: Sistema de permisos y roles. Úsala para trabajar con PermissionsService y guards.
---

# Permissions Skill

Esta skill te guía en el sistema de permisos de People.

## Componentes Principales

| Componente                        | Ubicación                   | Descripción         |
| --------------------------------- | --------------------------- | ------------------- |
| `PermissionsManagementComponent`  | `dashboard/pt-permissions/` | Gestión de permisos |
| `PermissionEditorDialogComponent` | `dashboard/pt-permissions/` | Editor de permisos  |

## PermissionsService

```typescript
// src/app/services/permissions.service.ts
import { PermissionsService } from '../services/permissions.service';

@Component({...})
export class MyComponent {
  private permissions = inject(PermissionsService);

  // Verificar permiso específico
  readonly canEdit = this.permissions.hasPermission('employees.edit');
  readonly canDelete = this.permissions.hasPermission('employees.delete');

  // Verificar rol
  readonly isAdmin = this.permissions.isAdmin();
  readonly isBranchManager = this.permissions.isBranchManager();
}
```

## Estructura de Permisos

```typescript
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string; // 'employees', 'schedules', 'payroll', etc.
}

interface UserPermissionProfile {
  user_id: string;
  permissions: string[]; // IDs de permisos
  role: 'admin' | 'hr' | 'branch_manager' | 'employee';
  branch_ids?: string[]; // Sucursales asignadas (para branch_manager)
}
```

## Categorías de Permisos

```typescript
const permissionCategories = {
  employees: [
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.portal_access',
  ],
  schedules: [
    'schedules.view',
    'schedules.create',
    'schedules.edit',
    'schedules.approve',
  ],
  timelogs: ['timelogs.view', 'timelogs.edit', 'timelogs.manual_entry'],
  payroll: [
    'payroll.view',
    'payroll.create',
    'payroll.process',
    'payroll.export',
  ],
  hr_requests: [
    'hr_requests.view',
    'hr_requests.approve',
    'hr_requests.reject',
  ],
  settings: ['settings.view', 'settings.edit', 'settings.users'],
};
```

## Guards de Ruta

```typescript
// src/app/guards/permission.guard.ts
import { CanActivateFn } from '@angular/router';

export const permissionGuard = (requiredPermission: string): CanActivateFn => {
  return () => {
    const permissions = inject(PermissionsService);

    if (permissions.hasPermission(requiredPermission)) {
      return true;
    }

    // Redirigir a no-access
    inject(Router).navigate(['/no-access']);
    return false;
  };
};

// Uso en rutas
const routes: Routes = [
  {
    path: 'employees',
    component: EmployeeListComponent,
    canActivate: [permissionGuard('employees.view')],
  },
  {
    path: 'payroll',
    component: PayrollComponent,
    canActivate: [permissionGuard('payroll.view')],
  },
];
```

## UI Condicional por Permisos

```typescript
// En template
@if (permissions.hasPermission('employees.edit')) {
  <p-button label="Editar" (click)="edit()" />
}

@if (permissions.isAdmin()) {
  <p-button label="Eliminar" severity="danger" (click)="delete()" />
}

// Directiva personalizada
@Directive({ selector: '[hasPermission]' })
export class HasPermissionDirective {
  private permissions = inject(PermissionsService);

  @Input() set hasPermission(permission: string) {
    if (!this.permissions.hasPermission(permission)) {
      this.elementRef.nativeElement.remove();
    }
  }
}
```

## Roles Predefinidos

```typescript
const rolePermissions: Record<string, string[]> = {
  admin: ['*'], // Todos los permisos

  hr: [
    'employees.*',
    'schedules.*',
    'timelogs.view',
    'hr_requests.*',
    'payroll.view',
  ],

  branch_manager: [
    'employees.view',
    'schedules.view',
    'schedules.approve',
    'timelogs.view',
    'hr_requests.view',
    'hr_requests.approve',
  ],

  employee: [
    // Solo acceso al portal
  ],
};
```

## Test Mode

```typescript
// TestModeService permite simular diferentes roles
import { TestModeService } from '../services/test-mode.service';

@Component({...})
export class MyComponent {
  private testMode = inject(TestModeService);

  // En desarrollo, simular ser otro rol
  simulateRole(role: string): void {
    this.testMode.setRole(role);
  }
}
```
