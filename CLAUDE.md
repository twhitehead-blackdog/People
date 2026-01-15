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

## Environment Variables

Required for development:
- `ENV_SUPABASE_URL`, `ENV_SUPABASE_ANON_KEY`
- `ENV_AUTH0_DOMAIN`, `ENV_AUTH0_CLIENT_ID`, `ENV_AUTH0_AUDIENCE`
- `ENV_APP_URL` (http://localhost:4200 for dev)

See `EJEMPLO-ENV.txt` for full list.
