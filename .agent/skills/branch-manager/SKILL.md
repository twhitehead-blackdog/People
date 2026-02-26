---
name: branch-manager
description: Vista de gerente de sucursal. Úsala para modificar gestiones y supervisión de sucursal.
---

# Branch Manager Skill

Esta skill te guía en la funcionalidad de gerente de sucursal en People.

## Componentes Principales

| Componente                        | Ubicación                                         | Descripción     |
| --------------------------------- | ------------------------------------------------- | --------------- |
| `BranchManagerComponent`          | `dashboard/branch-manager.component.ts`           | Vista principal |
| `BranchManagerGestionesComponent` | `dashboard/branch-manager-gestiones.component.ts` | Gestiones       |

## Vista del Branch Manager

El gerente de sucursal tiene una vista simplificada que muestra:

- Empleados de su(s) sucursal(es)
- Marcaciones del día
- Solicitudes pendientes de aprobación
- Estadísticas de asistencia

## Modelo de Branch

```typescript
interface Branch {
  id: string;
  name: string;
  company_id: string;
  address?: string;
  phone?: string;
  manager_id?: string;
  allowed_ips?: string[]; // IPs permitidas para kiosko
  is_active: boolean;
}
```

## Datos del Branch Manager

```typescript
// El branch manager solo ve datos de sus sucursales asignadas
readonly assignedBranches = computed(() =>
  this.permissions.getBranchIds()
);

// Filtrar empleados por sucursales asignadas
readonly branchEmployees = computed(() => {
  const branchIds = this.assignedBranches();
  return this.employees.employeesList().filter(e =>
    branchIds.includes(e.branch_id)
  );
});
```

## Gestiones Pendientes

```typescript
interface GestionPendiente {
  id: string;
  type: 'compensatory' | 'vacation' | 'document' | 'schedule';
  employee: Employee;
  created_at: string;
  status: 'pending';
  details: any;
}

// Query de gestiones pendientes
readonly pendingGestiones = httpResource<GestionPendiente[]>(() => ({
  url: this.apiUrl.build('rest/v1/pending_approvals', {
    branch_id: `in.(${this.assignedBranches().join(',')})`,
    status: 'eq.pending',
    order: 'created_at.desc'
  })
}));
```

## Aprobar/Rechazar Solicitudes

```typescript
// Aprobar solicitud de tiempo compensatorio
async approveCompensatory(id: string): Promise<void> {
  const url = this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${id}` });

  await firstValueFrom(
    this.http.patch(url, {
      status: 'approved',
      approved_by: this.currentUserId,
      approved_at: new Date().toISOString()
    })
  );

  // Consumir overtime_consumptions
  await this.consumeOvertime(id);

  // Enviar notificación al empleado
  await this.notifyEmployee(id, 'approved');
}

// Rechazar con comentario
async rejectRequest(id: string, comment: string): Promise<void> {
  const url = this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${id}` });

  await firstValueFrom(
    this.http.patch(url, {
      status: 'rejected',
      rejection_comment: comment,
      approved_by: this.currentUserId,
      approved_at: new Date().toISOString()
    })
  );

  await this.notifyEmployee(id, 'rejected');
}
```

## Estadísticas de Sucursal

```typescript
interface BranchStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  pendingApprovals: number;
  scheduledToday: number;
}

readonly branchStats = computed<BranchStats>(() => {
  const employees = this.branchEmployees();
  const todayLogs = this.todayTimelogs();
  const pendingCount = this.pendingGestiones.value()?.length ?? 0;

  return {
    totalEmployees: employees.length,
    presentToday: todayLogs.filter(l => l.entry).length,
    lateToday: todayLogs.filter(l => l.delay > 0).length,
    absentToday: employees.length - todayLogs.length,
    pendingApprovals: pendingCount,
    scheduledToday: this.todaySchedules().length
  };
});
```

## Monitoreo en Tiempo Real

```typescript
// Reminders y notificaciones para el branch manager
readonly reminders = httpResource<Reminder[]>(() => ({
  url: this.apiUrl.build('rest/v1/reminders', {
    branch_id: `in.(${this.assignedBranches().join(',')})`,
    is_read: 'eq.false',
    order: 'created_at.desc'
  })
}));

// Polling para actualizaciones
constructor() {
  // Refrescar datos cada 5 minutos
  interval(5 * 60 * 1000).pipe(
    takeUntilDestroyed()
  ).subscribe(() => {
    this.pendingGestiones.reload();
    this.reminders.reload();
  });
}
```

## Permisos del Branch Manager

```typescript
// Permisos típicos de un branch manager
const branchManagerPermissions = [
  'employees.view', // Ver empleados de su sucursal
  'schedules.view', // Ver horarios
  'schedules.approve', // Aprobar horarios
  'timelogs.view', // Ver marcaciones
  'hr_requests.view', // Ver solicitudes
  'hr_requests.approve', // Aprobar solicitudes
  // NO tiene:
  // - employees.edit/delete
  // - payroll.*
  // - settings.*
];
```
