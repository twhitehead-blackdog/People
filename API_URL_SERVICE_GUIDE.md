# Guía de Uso de ApiUrlService y Variables de Entorno

## 🎯 Objetivo

Centralizar la construcción de URLs de API y acceso a variables de entorno para mantener consistencia, seguridad y facilitar cambios futuros.

## 🚫 Prohibiciones

- ❌ **NO usar `process.env`** directamente (excepto en `ApiUrlService` y `env.utils`)
- ❌ **NO usar `.toPromise()`** (usar `firstValueFrom()` o `lastValueFrom()`)
- ❌ **NO hardcodear URLs** de API en componentes/servicios

## ✅ Uso Correcto

### ApiUrlService

```typescript
import { ApiUrlService } from '../services/api-url.service';

@Injectable({ providedIn: 'root' })
export class MiServicio {
  constructor(private apiUrl: ApiUrlService) {}

  // URLs simples
  const url = this.apiUrl.build('rest/v1/users');

  // URLs con parámetros de query
  const url = this.apiUrl.build('rest/v1/users', {
    select: 'id,name,email',
    company_id: `eq.${companyId}`,
    order: 'name.asc'
  });

  // Acceso directo a baseUrl
  const baseUrl = this.apiUrl.baseUrl; // Para casos especiales
}
```

### Variables de Entorno

```typescript
import { getEnv } from '../utils/env.utils';

// Para cualquier variable de entorno
const apiKey = getEnv('ENV_SUPABASE_API_KEY');
const serviceKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY');
```

### RxJS - Reemplazo de toPromise()

```typescript
import { firstValueFrom, lastValueFrom } from 'rxjs';

// ❌ MAL
const result = await observable.toPromise();

// ✅ BIEN
const result = await firstValueFrom(observable); // Para el primer valor
const result = await lastValueFrom(observable);  // Para el último valor
```

## 📋 Variables de Entorno Requeridas

| Variable | Descripción | Uso |
|----------|-------------|-----|
| `ENV_SUPABASE_URL` | URL base de Supabase | ApiUrlService |
| `ENV_SUPABASE_API_KEY` | API Key público de Supabase | Autenticación |
| `ENV_SUPABASE_ANON_KEY` | API Key anónimo de Supabase | Autenticación |
| `ENV_SUPABASE_SERVICE_ROLE_KEY` | Service Role Key de Supabase | Operaciones admin |
| `ENV_SUPABASE_TOKEN` | Token de Supabase | Autenticación |
| `ENV_APP_URL` | URL de la aplicación | Configuración |
| `ENV_API_URL` | URL de API externa (opcional) | Configuración |
| `ENV_UNLOCK_CODE` | Código para desbloquear edición | Seguridad |

## 🔧 Migración

### De process.env a ApiUrlService

```typescript
// ❌ ANTES
const url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/users?company_id=eq.${id}`;

// ✅ DESPUÉS
const url = this.apiUrl.build('rest/v1/users', { company_id: `eq.${id}` });
```

### De toPromise() a firstValueFrom()

```typescript
// ❌ ANTES
const data = await this.http.get(url).toPromise();

// ✅ DESPUÉS
const data = await firstValueFrom(this.http.get(url));
```

## 🏗️ Arquitectura

### ApiUrlService
- ✅ Centraliza construcción de URLs
- ✅ Maneja encoding de parámetros
- ✅ Fácil de mockear en tests
- ✅ Un solo punto de cambio para URLs

### env.utils
- ✅ Validación de existencia de variables
- ✅ Typing seguro
- ✅ Centralización de acceso a env

## 🧪 Testing

```typescript
// Mock de ApiUrlService
const mockApiUrl = {
  build: jest.fn((path, params) => `mock-url/${path}?${new URLSearchParams(params).toString()}`),
  baseUrl: 'https://mock.supabase.co'
};

// Mock de getEnv
jest.mock('../utils/env.utils', () => ({
  getEnv: jest.fn((key) => `mock-${key}`)
}));
```

## 📚 Referencias

- [RxJS: Migrating from toPromise()](https://rxjs.dev/deprecations/toPromise)
- [Angular: HttpClient](https://angular.dev/guide/http)
- [Supabase: REST API](https://supabase.com/docs/guides/api)