---
name: hr-module
description: Crear módulos HR (solicitudes, aprobaciones, vacaciones, documentos) siguiendo el patrón establecido en People. Úsala cuando necesites crear un nuevo módulo de RRHH o extender uno existente.
---

# HR Module Skill

Esta skill te guía en la creación de módulos de Recursos Humanos en People.

## Estructura de un Módulo HR

```
src/app/components/pt-{module-name}/
├── pt-{module-name}.component.ts      # Componente principal
├── pt-{module-name}.component.spec.ts # Tests
├── {module-name}.service.ts           # Service para API
├── {module-name}.model.ts             # Interfaces/Types
└── dialogs/
    ├── {module-name}-detail-dialog.ts # Dialog de detalle
    └── {module-name}-form-dialog.ts   # Dialog de formulario
```

## Modelo de Datos Típico

```typescript
// {module-name}.model.ts
export interface RequestBase {
  id: number;
  employee_id: number;
  company_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_comment?: string;
}

export interface VacationRequest extends RequestBase {
  start_date: string;
  end_date: string;
  days_requested: number;
  balance_before: number;
  balance_after: number;
}
```

## Service Pattern

```typescript
// {module-name}.service.ts
@Injectable({ providedIn: 'root' })
export class VacationsService {
  private readonly apiUrl = inject(ApiUrlService);
  private readonly http = inject(HttpClient);

  getRequests(companyId: number) {
    return httpResource<VacationRequest[]>(() => ({
      url: this.apiUrl.build('rest/v1/vacation_requests', {
        company_id: `eq.${companyId}`,
        select: '*, employee:employees(id,name,photo_url)',
        order: 'created_at.desc',
      }),
    }));
  }

  async approve(id: number, approvedBy: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/vacation_requests', {
      id: `eq.${id}`,
    });

    await firstValueFrom(
      this.http.patch(url, {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
    );
  }

  async reject(id: number, comment: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/vacation_requests', {
      id: `eq.${id}`,
    });

    await firstValueFrom(
      this.http.patch(url, {
        status: 'rejected',
        rejection_comment: comment,
      })
    );
  }
}
```

## Componentes Compartidos

### Stats Grid

```typescript
import { HrStatsGridComponent } from '../shared/hr-stats-grid.component';

// En template
<pt-hr-stats-grid
  [total]="totalCount()"
  [pending]="pendingCount()"
  [approved]="approvedCount()"
  [rejected]="rejectedCount()"
/>
```

### Filters Panel

```typescript
import { HrFiltersPanelComponent } from '../shared/hr-filters-panel.component';

// En template
<pt-hr-filters-panel
  [statusOptions]="statusOptions"
  (filterChange)="onFilterChange($event)"
/>
```

## Tabla con Acciones

```typescript
template: `
  <p-table 
    [value]="requests()" 
    [paginator]="true" 
    [rows]="10"
    styleClass="p-datatable-striped"
  >
    <ng-template pTemplate="header">
      <tr>
        <th>Empleado</th>
        <th>Fechas</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </ng-template>
    
    <ng-template pTemplate="body" let-request>
      <tr 
        class="cursor-pointer hover:bg-gray-100"
        (click)="openDetail(request)"
      >
        <td>
          <div class="flex items-center gap-2">
            <p-avatar 
              [image]="request.employee.photo_url"
              [label]="request.employee.name[0]"
              shape="circle"
            />
            <span>{{ request.employee.name }}</span>
          </div>
        </td>
        <td>{{ request.start_date | date }} - {{ request.end_date | date }}</td>
        <td>
          <p-tag 
            [severity]="getStatusSeverity(request.status)"
            [value]="request.status"
          />
        </td>
        <td>
          @if (request.status === 'pending') {
            <p-button 
              icon="pi pi-check" 
              severity="success"
              (click)="approve(request, $event)"
            />
            <p-button 
              icon="pi pi-times" 
              severity="danger"
              (click)="reject(request, $event)"
            />
          }
        </td>
      </tr>
    </ng-template>
  </p-table>
`;
```

## Flujo de Aprobación

1. Empleado crea solicitud → estado `pending`
2. RRHH ve en lista de pendientes
3. RRHH aprueba o rechaza
4. Si aprueba: actualiza balances, envía email
5. Si rechaza: requiere comentario

## Checklist de Creación

- [ ] Modelo de datos con `RequestBase`
- [ ] Service con métodos CRUD
- [ ] Componente principal con tabla
- [ ] Dialogs de detalle y formulario
- [ ] Estadísticas (total, pending, approved, rejected)
- [ ] Filtros por estado y fecha
- [ ] Acciones de aprobar/rechazar
- [ ] Emails según configuración
