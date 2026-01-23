# CLAUDE.md

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

## Environment Variables

Required for development:
- `ENV_SUPABASE_URL`, `ENV_SUPABASE_ANON_KEY`
- `ENV_AUTH0_DOMAIN`, `ENV_AUTH0_CLIENT_ID`, `ENV_AUTH0_AUDIENCE`
- `ENV_APP_URL` (http://localhost:4200 for dev)

See `EJEMPLO-ENV.txt` for full list.
