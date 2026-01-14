---
name: employee-portal
description: Portal de autoservicio para empleados. Úsala para modificar vistas y funcionalidades del portal.
---

# Employee Portal Skill

Esta skill te guía en el desarrollo del portal de empleados en People.

## Componentes Principales

| Componente                            | Ubicación                                             | Descripción             |
| ------------------------------------- | ----------------------------------------------------- | ----------------------- |
| `EmployeePortalComponent`             | `employee-portal/employee-portal.component.ts`        | Vista principal         |
| `EmployeePortalLayoutComponent`       | `employee-portal/employee-portal-layout.component.ts` | Layout                  |
| `EmployeePortalDashboardComponent`    | `employee-portal/components/`                         | Dashboard               |
| `EmployeePortalCompensatoryComponent` | `employee-portal/components/`                         | Solicitud compensatorio |
| `EmployeePortalVacationsComponent`    | `employee-portal/components/`                         | Solicitud vacaciones    |
| `EmployeePortalDocumentsComponent`    | `employee-portal/components/`                         | Solicitud documentos    |
| `EmployeePortalTimelogsComponent`     | `employee-portal/components/`                         | Ver marcaciones         |
| `EmployeePortalProfileComponent`      | `employee-portal/components/`                         | Perfil                  |
| `EmployeePortalMyRequestsComponent`   | `employee-portal/components/`                         | Mis solicitudes         |

## Store del Portal

```typescript
// EmployeePortalStore maneja el estado del portal
import { EmployeePortalStore } from '../stores/employee-portal.store';

@Component({...})
export class PortalComponent {
  private portalStore = inject(EmployeePortalStore);

  readonly currentEmployee = this.portalStore.employee;
  readonly pendingRequests = this.portalStore.pendingRequests;
  readonly overtimeBalance = this.portalStore.overtimeBalance;
}
```

## Módulos del Portal

### Dashboard

```typescript
// Vista principal con resumen
interface DashboardData {
  employee: Employee;
  todaySchedule?: Schedule;
  pendingRequests: number;
  overtimeHours: number;
  vacationDays: number;
  notifications: Notification[];
}
```

### Tiempo Compensatorio

```typescript
// Solicitud de tiempo compensatorio
interface CompensatoryRequest {
  type: 'hours' | 'days';
  amount: number;
  start_date: string;
  end_date?: string;
  reason: string;
  manual_dates?: string[]; // Fechas específicas de overtime a usar
  document_url?: string; // Documento adjunto
}

// El empleado selecciona horas extra específicas para consumir
// Las fechas manuales tienen prioridad
```

### Vacaciones

```typescript
interface VacationRequest {
  start_date: string;
  end_date: string;
  days_requested: number;
  balance_before: number; // Días disponibles antes
  reason?: string;
}
```

### Documentos

```typescript
// Tipos de documentos que puede solicitar
type DocumentType =
  | 'carta_trabajo'
  | 'certificacion_salario'
  | 'constancia_laboral'
  | 'certificacion_seguro_social';

interface DocumentRequest {
  type: DocumentType;
  notes?: string;
}
```

## Navegación del Portal

```typescript
// Rutas del portal
const portalRoutes = [
  { path: 'dashboard', component: EmployeePortalDashboardComponent },
  { path: 'timelogs', component: EmployeePortalTimelogsComponent },
  { path: 'compensatory', component: EmployeePortalCompensatoryComponent },
  { path: 'vacations', component: EmployeePortalVacationsComponent },
  { path: 'documents', component: EmployeePortalDocumentsComponent },
  { path: 'requests', component: EmployeePortalMyRequestsComponent },
  { path: 'profile', component: EmployeePortalProfileComponent },
];
```

## Actions del Portal

```typescript
// Las acciones están en employee-portal/actions/
import {
  submitCompensatoryRequest,
  submitVacationRequest,
  submitDocumentRequest,
} from './actions/employee-portal.actions';

// Ejemplo de action
async function submitCompensatoryRequest(
  data: CompensatoryRequest
): Promise<void> {
  // 1. Validar balance disponible
  // 2. Crear registro en timeoffs
  // 3. Subir documento si existe
  // 4. Enviar email a RRHH
  // 5. Mostrar confirmación
}
```

## Notificaciones del Portal

```typescript
interface PortalNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Componente de notificaciones
@Component({
  selector: 'pt-employee-portal-notifications',
  ...
})
export class EmployeePortalNotificationsComponent {
  readonly notifications = httpResource<PortalNotification[]>(...);

  markAsRead(id: string): void { ... }
  markAllAsRead(): void { ... }
}
```

## Restricciones de Acceso

```typescript
// El empleado solo ve sus propios datos
// Verificar siempre employee_id en queries

readonly myData = httpResource<Data[]>(() => ({
  url: this.apiUrl.build('rest/v1/table', {
    employee_id: `eq.${this.currentEmployeeId()}`,
    // NO exponer datos de otros empleados
  })
}));
```
