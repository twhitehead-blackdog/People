---
name: supabase-api
description: Cómo interactuar con Supabase usando httpResource y el patrón del proyecto People. Úsala cuando necesites hacer queries, inserts, updates o deletes a la base de datos.
---

# Supabase API Skill

Esta skill te guía en la interacción con Supabase en el proyecto People.

## Patrón Básico con httpResource

```typescript
import { httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiUrlService } from '../services/api-url.service';

@Component({...})
export class MyComponent {
  private readonly apiUrl = inject(ApiUrlService);

  // Query reactiva
  readonly employees = httpResource<Employee[]>(() => ({
    url: this.apiUrl.build('rest/v1/employees', {
      company_id: `eq.${this.companyId()}`,
      select: '*',
      order: 'created_at.desc'
    })
  }));
}
```

## Reglas Obligatorias

1. **SIEMPRE** usar `ApiUrlService.build()` para URLs
2. **SIEMPRE** filtrar por `company_id`
3. **NUNCA** usar `process.env` directo
4. Para operaciones que requieren privilegios, agregar endpoint a `needsServiceRoleKey` en `http.interceptor.ts`

## Operaciones CRUD

### SELECT (GET)

```typescript
readonly data = httpResource<Item[]>(() => ({
  url: this.apiUrl.build('rest/v1/items', {
    company_id: `eq.${this.companyId()}`,
    status: 'eq.active',
    select: 'id,name,created_at',
    order: 'created_at.desc',
    limit: '50'
  })
}));
```

### INSERT (POST)

```typescript
async createItem(item: CreateItemDto): Promise<void> {
  const url = this.apiUrl.build('rest/v1/items');

  await firstValueFrom(
    this.http.post(url, {
      ...item,
      company_id: this.companyId()
    })
  );

  // Refrescar datos
  this.data.reload();
}
```

### UPDATE (PATCH)

```typescript
async updateItem(id: number, changes: Partial<Item>): Promise<void> {
  const url = this.apiUrl.build('rest/v1/items', {
    id: `eq.${id}`
  });

  await firstValueFrom(
    this.http.patch(url, changes)
  );

  this.data.reload();
}
```

### DELETE

```typescript
async deleteItem(id: number): Promise<void> {
  const url = this.apiUrl.build('rest/v1/items', {
    id: `eq.${id}`
  });

  await firstValueFrom(
    this.http.delete(url)
  );

  this.data.reload();
}
```

## Filtros de Query

| Operador | Uso                         | Ejemplo                  |
| -------- | --------------------------- | ------------------------ |
| `eq`     | Igual                       | `status: 'eq.active'`    |
| `neq`    | No igual                    | `status: 'neq.deleted'`  |
| `gt`     | Mayor que                   | `amount: 'gt.100'`       |
| `gte`    | Mayor o igual               | `date: 'gte.2024-01-01'` |
| `lt`     | Menor que                   | `amount: 'lt.1000'`      |
| `lte`    | Menor o igual               | `date: 'lte.2024-12-31'` |
| `like`   | Contiene                    | `name: 'like.*john*'`    |
| `ilike`  | Contiene (case-insensitive) | `name: 'ilike.*john*'`   |
| `in`     | En lista                    | `id: 'in.(1,2,3)'`       |
| `is`     | Es null                     | `deleted_at: 'is.null'`  |

## Manejo de Errores

```typescript
readonly data = httpResource<Item[]>(() => ({
  url: this.apiUrl.build('rest/v1/items', {...})
}));

// En template
@if (data.error()) {
  <p-message severity="error">
    Error: {{ data.error()?.message }}
  </p-message>
} @else if (data.isLoading()) {
  <p-progressSpinner />
} @else {
  <!-- Mostrar datos -->
}
```

## RPC Functions

```typescript
async callRpc<T>(functionName: string, params: object): Promise<T> {
  const url = this.apiUrl.build(`rpc/${functionName}`);

  return firstValueFrom(
    this.http.post<T>(url, params)
  );
}

// Uso
const result = await this.callRpc('process_timelog', {
  employee_id: 123,
  timestamp: new Date().toISOString()
});
```

## Storage (Archivos)

```typescript
async uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const url = `${getEnv('ENV_SUPABASE_URL')}/storage/v1/object/${bucket}/${path}`;

  const formData = new FormData();
  formData.append('file', file);

  await firstValueFrom(
    this.http.post(url, formData)
  );

  return `${getEnv('ENV_SUPABASE_URL')}/storage/v1/object/public/${bucket}/${path}`;
}
```
