# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repo overview
- **Product:** PeopleBD (HRMS) — this system is **live in production**; prefer safe, incremental changes.
- **Workspace:** Nx (single project: `people`). Prefer running tasks via `nx` targets rather than invoking underlying tools directly. (See `AGENTS.md`.)
- **Frontend:** Angular 20 (standalone) + PrimeNG + Tailwind + NgRX Signals.
- **Backend:** Express (`server.ts`, run via `tsx`) used mainly as a small API + static file host/proxy.
- **Data:** Supabase (PostgREST) + RLS; SQL in `database/`.

## Common commands

### Install
```bash
npm install
# or (clean/CI style)
npm ci
```

### Dev server (Angular)
```bash
npm start
# equivalent
npx nx serve people
```

### Dev server (Angular + Express)
```bash
npm run start:dev
# runs:
# - nx serve (Angular)
# - tsx server.ts (Express)
```
Notes:
- Angular dev-server uses `proxy.conf.js` to proxy `/api/*` to a local backend.
- Ensure the backend `PORT` matches the proxy target (currently `http://localhost:4000` in `proxy.conf.js`) or update the proxy config.

### Build
```bash
npm run build
# runs update-version + nx build

# direct
npx nx build people
```
Build output goes under `dist/people/` (often `dist/people/browser/`), which is what `server.ts` serves in production.

### Lint
```bash
npx nx lint people
```

### Unit tests (Jest)
```bash
npm test
# equivalent
npx nx test people
```

Run a single test file:
```bash
npx nx test people --testPathPattern=permissions.service.spec.ts
# or a full path fragment
npx nx test people --testPathPattern=src/app/dashboard/companies.component.spec.ts
```

Run a single test by name:
```bash
npx nx test people --testNamePattern="should .*"
```

### Environment setup (Windows)
The repo includes PowerShell helpers:
```powershell
npm run setup:env   # runs scripts/setup-env.ps1
npm run verify      # runs scripts/verify-setup.ps1
```
Notes:
- `scripts/setup-env.ps1` tries to create `.env` by copying `.env.example`.
- If `.env.example` is not present, create `.env` manually using `EJEMPLO-ENV.txt` as the template.

## Working style (requested)
When asked to make changes in this repo, start by checking whether the target file is “large” (line count) and adjust the approach accordingly:
- If the file is large, prefer **re-structuring first** (clear sections, extraction into smaller files/modules/components, reducing long functions) before/while implementing the requested change.
- If the requested change is small but the file is large, keep the change minimal **and** propose a follow-up refactor that improves readability without changing behavior.
- Use existing repo thresholds as a guide: components ideally stay under ~300 lines and avoid introducing new files over ~500 lines.

## Key architectural patterns

### Runtime configuration & environment variables
- Frontend code reads env through `getEnv()` in `src/app/utils/env.utils.ts`.
- Build-time injection of `ENV_*` variables is handled by the esbuild plugin `plugins/env-var-plugin.js` (wired in `project.json` under `build.options.plugins`).
- There are repo rules (also enforced by ESLint in `./src`) that:
  - forbid direct `process.env` access outside a small allowlist (see `.eslintrc.json` overrides), and
  - forbid RxJS `.toPromise()`.

Related docs:
- `API_URL_SERVICE_GUIDE.md`

### API access (Supabase + backend)
- **Supabase base URL** is centralized in `src/app/services/api-url.service.ts`.
- **Supabase auth headers / request behavior** are centralized in `src/app/interceptors/http.interceptor.ts`:
  - adds `apikey` + `Authorization` headers.
  - chooses anon vs service-role key for certain whitelisted endpoints.
- **Backend API base URL** for `/api/*` calls is handled by `src/app/interceptors/api-url.interceptor.ts`:
  - if `ENV_API_URL` is set (e.g., Railway/prod), `/api/...` is rewritten to absolute.
  - otherwise it remains relative (local dev + proxy).

### Multi-company filtering
- Current company context is managed by `src/app/services/organization.service.ts`.
- Shared entity stores use a common feature factory in `src/app/stores/entities.feature.ts`:
  - injects `OrganizationService` to automatically add `company_id` filters to most Supabase queries.
  - has per-entity caching (`CACHE_DURATION`) to reduce chatter.

### Frontend structure (big picture)
- Entry point: `src/main.ts` bootstraps `AppComponent` with `appConfig`.
- App-wide providers: `src/app/app.config.ts` (router, interceptors, Auth0, PrimeNG, global stores).
- Routing: `src/app/app.routes.ts`
  - authenticated “dashboard” routes are lazy-loaded.
  - an employee portal section is lazy-loaded.
  - special routes exist for timeclock kiosk flows.

### Backend structure (big picture)
- `server.ts` defines and runs an Express app:
  - health endpoint: `/api/health`
  - backend utility endpoints used by the frontend (examples):
    - `/api/email/*` (email sending + config + test)
    - `/api/wassenger/send-message` (CORS-safe proxy)
    - `/api/server-time` (server time based on Supabase `Date` header)
    - `/api/client-ip`
  - serves the Angular build output as static files.

## Deployment & database docs (where to look)
- Docker staging/prod workflows: `docker/README.md` and compose files under `docker/stage/` and `docker/prod/`.
- Railway examples & environment variable templates: `docker/railway/`.
- Supabase DB setup:
  - fresh install: `database/01-setup.sql`
  - docs: `database/README.md`

## Guardrails (from existing AI/tooling rules)
These are repeated across `CLAUDE.md`, `.cursorrules`, and `.cursor/rules/refactorizacion.md`:
- Do not recreate or reorganize the architecture; avoid moving/renaming existing folders/files without explicit reason.
- Keep refactors incremental; avoid mixing refactors with feature work.
- Components should be orchestrators; push business logic into services/stores/utils.
- Use `ApiUrlService.build()` for Supabase URLs and `getEnv()` for environment variables.
- For risky refactors, prioritize extracting pure logic first (notably around `src/app/dashboard/timelogs/`).
