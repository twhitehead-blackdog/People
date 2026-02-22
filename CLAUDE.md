# CLAUDE.md

> **⚠️ OBLIGATORIO:** Al iniciar CADA conversación, SIEMPRE ejecutar primero el workflow `/context` para cargar el contexto del proyecto desde `.context/`. Esto reduce tokens y evita re-descubrir información. Leer `.context/00-INDEX.md` como mínimo antes de cualquier tarea.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PeopleBD is a production HRMS (Human Resource Management System) for Panamanian companies. It manages employee data, time attendance, overtime calculation, compensatory time requests, payroll, and multi-company support. **This system is live in production** - changes must be safe and incremental.

## Tech Stack

- **Frontend:** Angular 20 (standalone components) + NgRX Signals + PrimeNG + TailwindCSS
- **Backend:** Express.js (TypeScript via tsx)
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Auth0 (OpenID Connect)
- **Build System:** Nx 21 (monorepo)
- **Testing:** Jest 30 + Playwright

## Common Commands

```bash
npm start              # Serve Angular at :4200
npm run start:dev      # Angular + Express concurrently
npm run build          # Production build
npm run test           # Jest with coverage
npm run setup:env      # Windows env setup (PowerShell)
npm run verify         # Verify environment setup
```

## Architecture

### State Management (NgRX Signals)

Signal stores in `src/app/stores/` manage shared state:
- `auth.store.ts` - Current user/company context
- `entities.feature.ts` - Reusable entity store factory with caching
- Entity stores use duration-based caching (companies: 15min, employees: 5min, timelogs: 30sec)

### API Access Pattern

**All API URLs must use `ApiUrlService.build()`:**
```typescript
// ✅ CORRECT
const url = this.apiUrl.build('rest/v1/employees', {
  company_id: `eq.${companyId}`,
  select: 'id,name,position:positions(name)'
});

// ❌ PROHIBITED - Never use process.env directly
const url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/...`;
```

**Environment variables must use `getEnv()`:**
```typescript
const apiKey = getEnv('ENV_SUPABASE_ANON_KEY');
```

### Where Code Belongs

| Type | Location |
|------|----------|
| Pure calculations | `/utils/*.utils.ts` |
| Business rules | `/services/*.service.ts` |
| Complex form submits | `/actions/*.actions.ts` |
| Shared state | `/stores/*.store.ts` |
| Large templates | Split into subcomponents |

### Component Responsibilities

Components are **orchestrators only** - they inject services/stores, bind signals, handle navigation. They must NOT contain:
- Complex business logic (>30-40 lines)
- Direct API calls
- Permission checks
- Date/hour calculations
- Payload construction

Target: Components < 300 lines

## Critical Business Rules

### Timelog Calculation
```
Total work = exit - entry - lunch
Lunch max: 60 minutes (excess deducted from overtime)
Overtime = total work - 8 hours (only if > 8h)
```

### Multi-Company Filtering
All queries MUST include `company_id` filter (except `companies` table). Stores use `OrganizationService.getCurrentCompanyId()` automatically.

### Date Handling
- Always use `date-fns` (never native Date)
- Timezone: `America/Panama`
- Hours display: `formatHoursMinutes()` utility

### PostgREST: Múltiples Foreign Keys a la Misma Tabla

**CRÍTICO:** Cuando una tabla tiene múltiples FKs apuntando a la misma tabla (ej: `timelogs` tiene `employee_id` y `created_by` ambos referenciando `employees`), PostgREST NO puede determinar automáticamente cuál relación usar.

**Error típico:**
```
PGRST201: Could not embed because more than one relationship was found for 'timelogs' and 'employees'
```

**Solución:** Especificar explícitamente el nombre de la FK en el select:

```typescript
// ❌ INCORRECTO - PostgREST no sabe cuál FK usar
const select = `*,employee:employees(id,first_name)`;
const select = `*,employee:employees!inner(id,first_name)`;

// ✅ CORRECTO - Especificar la FK (LEFT JOIN por defecto)
const select = `*,employee:employees!timelogs_employee_id_fkey(id,first_name)`;

// ✅ CORRECTO - Especificar FK + INNER JOIN (cuando se filtra por employee.is_active, etc.)
const select = `*,employee:employees!timelogs_employee_id_fkey!inner(id,first_name,is_active)`;

// ✅ CORRECTO - Para obtener el creador (created_by)
const select = `*,creator:employees!timelogs_created_by_fkey(id,first_name)`;
```

**IMPORTANTE sobre `!inner`:**
- Si la consulta original usaba `employees!inner(...)`, la versión corregida DEBE ser `employees!fk_name!inner(...)`
- Sin `!inner`, los filtros como `employee.is_active=eq.true` NO filtran los registros principales (solo los embebidos)
- Orden correcto: `!fk_name!inner` (FK primero, inner después)

**Tablas afectadas actualmente:**
| Tabla | FK Principal | FK Secundaria |
|-------|--------------|---------------|
| `timelogs` | `timelogs_employee_id_fkey` (employee_id) | `timelogs_created_by_fkey` (created_by) |
| `employee_disabilities` | `employee_disabilities_employee_id_fkey` | `employee_disabilities_created_by_fkey` |
| `employee_vacations` | `employee_vacations_employee_id_fkey` | `employee_vacations_created_by_fkey` |
| `document_requests` | `document_requests_employee_id_fkey` | `document_requests_created_by_fkey` |
| `time_offs` | `time_offs_employee_id_fkey` | `timeoffs_created_by_fkey` |

**Al agregar una nueva FK a employees en cualquier tabla:**
1. Buscar TODAS las consultas que usen esa tabla con `employees`
2. Actualizar cada una para especificar `!nombre_de_la_fk`
3. **Si usaba `!inner`, mantenerlo:** `employees!fk_name!inner`
4. El nombre de la FK sigue el patrón: `{tabla}_{columna}_fkey`

## Key Files

- `src/app/models.ts` - All TypeScript interfaces
- `src/app/services/api-url.service.ts` - URL builder (mandatory)
- `src/app/services/organization.service.ts` - Multi-company context
- `src/app/timeclock.component.ts` - Main timeclock (large file)
- `server.ts` - Express backend
- `database/migrations/` - SQL migration files

## Naming Conventions

- Components: `pt-*.component.ts`
- Services: `*Service`
- Stores: `*Store`
- Signals: `camelCase = signal()`
- Computed: `camelCase = computed()`
- Employee numbers: `BD0001`, `NZ0001` (by company)

## Prohibitions

- Do not recreate architecture or move folders
- Do not change API contracts (inputs/outputs)
- Do not introduce new dependencies without discussion
- Do not modify overtime/payroll calculation logic without extreme care
- Do not mix refactoring with feature work

## Frontend Module/Route Registration (OBLIGATORIO)

**Cada vez que se cree un nuevo módulo o submódulo (ruta nueva), se DEBE registrar en TODOS estos lugares:**

### Checklist para nuevos módulos/submódulos

1. **SYSTEM_MODULES** (`src/app/dashboard/pt-permissions/module-permissions.types.ts`)
   - Agregar el submódulo con `id`, `label`, `description`, `icon`, `route`
   - El `label` DEBE coincidir con el texto que se muestra en la navegación

2. **Route con guard** (`src/app/dashboard/dashboard.routes.ts` o archivo de rutas correspondiente)
   - Agregar `canActivate: [modulePermissionGuard('moduleId', 'subModuleId')]`
   - Las rutas hijas de `loadChildren` TAMBIÉN deben tener guards individuales

3. **Navegación** (componente padre: `admin.component.ts`, `time-management.component.ts`, etc.)
   - Agregar link en el template (desktop Y móvil)
   - Envolver con `@if (subs().submodule_id)` para respetar permisos
   - Agregar al computed `subs` correspondiente (`adminSubs`, `hrSubs`, `tmSubs`, etc.)

4. **Dashboard access** (`src/app/stores/dashboard.store.ts`)
   - Si el nuevo módulo es un módulo principal (no submódulo de admin), agregarlo a `hasFrontendDashboardAccess()`

### Ejemplo completo

```typescript
// 1. module-permissions.types.ts → SYSTEM_MODULES
{ id: 'mi_feature', label: 'Mi Feature', description: '...', icon: 'pi pi-star', route: 'mi-feature' }

// 2. dashboard.routes.ts
{ path: 'mi-feature', canActivate: [modulePermissionGuard('admin', 'mi_feature')], loadComponent: ... }

// 3. admin.component.ts → template
@if (adminSubs().mi_feature) { <a routerLink="mi-feature">...</a> }

// 3. admin.component.ts → computed
mi_feature: this.permissionsService.canAccessSubModule('admin', 'mi_feature'),
```

**Si falta cualquiera de estos pasos, el módulo no será controlable por permisos o no será accesible desde la navegación.**

## File Upload Pattern (Supabase Storage)

Cuando un formulario necesita subir archivos a Supabase Storage, seguir este patrón exacto:

### Signals Requeridos

```typescript
// Archivo seleccionado por el usuario
public myFile = signal<File | null>(null);
// URL del archivo ya subido (background upload)
public myDocUrl = signal<string | null>(null);
// Indica si el upload está en progreso
public uploadingMyDoc = signal<boolean>(false);
```

### Template (PrimeNG FileUpload)

```html
<p-fileUpload
  mode="basic"
  accept=".pdf,.jpg,.jpeg,.png"
  maxFileSize="5000000"
  [auto]="false"
  chooseLabel="Seleccionar Archivo"
  (onSelect)="onMyFileSelect($event)"
/>

@if (myFile()) {
<div class="flex items-center gap-2">
  @if (uploadingMyDoc()) {
    <i class="pi pi-spin pi-spinner"></i>
    <span>Subiendo...</span>
  } @else {
    <i class="pi pi-file"></i>
    <span>{{ myFile()!.name }}</span>
  }
  <p-button
    icon="pi pi-times"
    (onClick)="clearMyFile()"
    [disabled]="uploadingMyDoc()"
  />
</div>
}
```

### Background Upload (al seleccionar archivo)

```typescript
public async onMyFileSelect(event: any): Promise<void> {
  const files = event.currentFiles || event.files;
  if (!files || files.length === 0) return;

  const file = files[0];
  this.myFile.set(file);
  this.uploadingMyDoc.set(true);

  try {
    const employeeId = this.selectedEmployee()?.id || 'temp';
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

    const storageKey =
      getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
      getEnv('ENV_SUPABASE_API_KEY') ||
      '';

    // ✅ CORRECTO: Usar apiUrl.baseUrl para upload
    const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/BUCKET_NAME/${fileName}`;

    await firstValueFrom(
      this.http.post(uploadUrl, file, {
        headers: {
          apikey: storageKey,
          Authorization: `Bearer ${storageKey}`,
          'x-upsert': 'true',  // Permite sobrescribir
        },
      })
    );

    // ✅ CORRECTO: Usar apiUrl.build() para URL pública
    const publicUrl = this.apiUrl.build(
      `storage/v1/object/public/BUCKET_NAME/${fileName}`
    );
    this.myDocUrl.set(publicUrl);

  } catch (error) {
    console.error('Background upload failed:', error);
    this.myDocUrl.set(null);  // Limpiar URL si falla
  } finally {
    this.uploadingMyDoc.set(false);
  }
}
```

### Limpiar Archivo (IMPORTANTE)

```typescript
// ✅ CORRECTO: Limpiar AMBOS signals juntos
public clearMyFile(): void {
  this.myFile.set(null);
  this.myDocUrl.set(null);  // ¡NO OLVIDAR!
}

// ❌ INCORRECTO: Solo limpiar el archivo
// (onClick)="myFile.set(null)"  // La URL queda huérfana
```

### Submit con Fallback

```typescript
public async submitRequest(): Promise<void> {
  // Bloquear si aún está subiendo
  if (this.uploadingMyDoc()) {
    this.messageService.add({
      severity: 'info',
      detail: 'Por favor espera a que termine de subirse el documento.',
    });
    return;
  }

  let documentUrl = this.myDocUrl();
  const file = this.myFile();

  // Fallback upload si background falló
  if (file && !documentUrl) {
    const fileName = `${employeeId}/${Date.now()}.${file.name.split('.').pop()}`;
    const storageKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || '';
    const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/BUCKET_NAME/${fileName}`;

    await firstValueFrom(this.http.post(uploadUrl, file, {
      headers: {
        apikey: storageKey,
        Authorization: `Bearer ${storageKey}`,
        'x-upsert': 'true',
      },
    }));

    // ✅ CORRECTO: Usar apiUrl.build() - NUNCA getEnv() directo
    documentUrl = this.apiUrl.build(`storage/v1/object/public/BUCKET_NAME/${fileName}`);
  }

  // Enviar datos con document_url
  const data = {
    // ... otros campos
    document_url: documentUrl || null,
  };
}
```

### Buckets Disponibles

| Bucket | Uso |
|--------|-----|
| `disabilities` | Certificados médicos de incapacidad |
| `compensatory` | Documentos de tiempo compensatorio |
| `employee-documents` | Documentos generales (vacaciones, etc.) |

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| URL `undefined/storage/...` | Usar `getEnv()` directo para URL | Usar `apiUrl.build()` |
| Archivo no se adjunta | No limpiar URL al eliminar archivo | Usar método `clearMyFile()` |
| Upload silencioso falla | Sin indicador visual | Agregar spinner con `uploadingMyDoc()` |
| Headers incorrectos | Usar `Content-Type: file.type` | Omitir Content-Type, usar solo apikey/auth |

**Referencia:** Ver `branch-manager-gestiones.component.ts` métodos `onDisabilityFileSelect`, `onVacationFileSelect`.

## Versioning (OBLIGATORIO en cada deploy)

**Cada vez que se haga un cambio y se despliegue, se DEBE bumpar la versión en `package.json`.** Esto activa el popup de "Nueva versión disponible" para los usuarios que tienen la app abierta.

### Cómo funciona

1. `src/app/services/version-check.service.ts` hace polling a `/api/version` cada 60 segundos
2. `server.ts` expone `/api/version` leyendo la versión de `package.json`
3. Si la versión del servidor difiere de la que el usuario cargó, `AppComponent` muestra un diálogo modal obligando a recargar
4. Sin bump de versión → los usuarios no ven el popup → pueden usar código viejo con datos nuevos

### Pasos para bumpar

```bash
# En package.json, incrementar la versión (semver: major.minor.patch)
# Ejemplo: "4.0.6" → "4.0.7" para un fix/cambio menor

# npm run build ya incluye update-version automáticamente
npm run build    # actualiza src/app/version.ts + compila

# Reiniciar el servicio (el servidor lee package.json al arrancar)
sudo systemctl restart people-backend          # producción
sudo systemctl restart people-prueba-backend   # staging
```

### Reglas de versionado

- **Patch** (4.0.X): bug fixes, ajustes de UI, cambios menores
- **Minor** (4.X.0): features nuevos, cambios de comportamiento
- **Major** (X.0.0): cambios que rompen compatibilidad (raro)

### Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `package.json` → `version` | Fuente de verdad, se edita manualmente |
| `src/app/version.ts` | Generado por `npm run update-version`, embebido en el build frontend |
| `server.ts` → `/api/version` | Endpoint que expone la versión al frontend |
| `src/app/services/version-check.service.ts` | Polling cada 60s, compara versiones |
| `src/app/app.component.ts` | Muestra el diálogo modal cuando hay diferencia |

## Environment Variables

Required for development:
- `ENV_SUPABASE_URL`, `ENV_SUPABASE_ANON_KEY`
- `ENV_AUTH0_DOMAIN`, `ENV_AUTH0_CLIENT_ID`, `ENV_AUTH0_AUDIENCE`
- `ENV_APP_URL` (http://localhost:4200 for dev)

See `EJEMPLO-ENV.txt` for full list.
