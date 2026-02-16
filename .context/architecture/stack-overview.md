---
title: Stack Overview
type: architecture
status: current
tags: [stack, angular, supabase, auth0, nx]
related: [[data-flow]], [[patterns]]
last-updated: 2026-02-13
---
# Stack Overview

## Frontend
- **Angular 20** — Standalone components (no NgModules)
- **NgRX Signals** — State management via signal stores (`src/app/stores/`)
- **PrimeNG** — UI component library
- **TailwindCSS** — Utility-first CSS
- **Build:** Nx 21 monorepo (single project: `people`)

## Backend
- **Express.js** — Server en `server.ts`, ejecutado con `tsx`
- Endpoints: `/api/email/*`, `/api/wassenger/*`, `/api/server-time`, `/api/client-ip`, `/api/odoo/*`
- Sirve el build de Angular como archivos estáticos en producción

## Database
- **Supabase** (PostgreSQL) — Acceso via PostgREST
- **RLS** (Row Level Security) habilitado
- SQL migrations en `database/migrations/`

## Auth
- **Auth0** — OpenID Connect
- Interceptor agrega headers `apikey` + `Authorization` automáticamente

## Testing
- **Jest 30** — Unit tests
- **Playwright** — E2E (pendiente)

## Hosting
- **VPS Linux** con Nginx + PM2
- **Dominio:** `people.blackdogpanama.com`
- **SSL:** Let's Encrypt

## Environment Variables Críticas
| Variable | Propósito |
|----------|-----------|
| `ENV_SUPABASE_URL` | Base URL de Supabase |
| `ENV_SUPABASE_ANON_KEY` | API key pública |
| `ENV_SUPABASE_SERVICE_ROLE_KEY` | Key para storage uploads |
| `ENV_AUTH0_DOMAIN` | Dominio Auth0 |
| `ENV_AUTH0_CLIENT_ID` | Client ID Auth0 |
| `ENV_AUTH0_AUDIENCE` | Audience Auth0 |
| `ENV_APP_URL` | URL de la app (localhost:4200 en dev) |

> Ver `EJEMPLO-ENV.txt` para lista completa.
