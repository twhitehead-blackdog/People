---
title: PeopleBD Context Index
type: moc
status: active
tags: [index, moc, entry-point]
last-updated: 2026-02-13
---
# PeopleBD — Context Index

## Quick Context

> **PeopleBD** es un HRMS (Human Resource Management System) en producción para empresas panameñas. Gestiona empleados, asistencia, horas extra, nómina, y soporte multiempresa.
>
> - **URL producción:** `people.blackdogpanama.com`
> - **Stack:** Angular 20 + NgRX Signals + PrimeNG + TailwindCSS | Express.js (tsx) | Supabase (PostgreSQL + RLS) | Auth0 | Nx 21
> - **Empresas activas:** Black Dog (BD) y Naz — cada una con company_id diferente
> - **Regla #1:** NO romper payroll, overtime, ni marcaciones. Sistema en producción diario.
> - **Regla #2:** Todas las queries deben filtrar por `company_id` (excepto tabla `companies`).
> - **Regla #3:** Usar `ApiUrlService.build()` para URLs y `getEnv()` para env vars. NUNCA `process.env` directo.

## Maps of Content (MOCs)

| Área | MOC | Descripción |
|------|-----|-------------|
| 🏗️ Arquitectura | [[architecture/_MOC]] | Stack, data flow, folder structure, patterns |
| 📦 Modelos | [[models/_MOC]] | Employee, TimeLog, Schedule, Payroll, etc. |
| ⚙️ Servicios | [[services/_MOC]] | ApiUrl, Organization, Permissions, etc. |
| 🗄️ Base de Datos | [[database/_MOC]] | Tablas, RLS, PostgREST tips, migrations |
| 🎯 Features | [[features/_MOC]] | Timelogs, Payroll, Portal, Schedules, etc. |
| 📊 Estado | [[state/current-status]] | Estado actual, issues, trabajo pendiente |
| 📝 Decisiones | [[decisions/_MOC]] | Naming contracts, prohibiciones, ADRs |
| 📄 Templates | [[templates/note-template]] | Templates para notas nuevas |

## Comandos Comunes

```bash
npm start              # Angular en :4200
npm run start:dev      # Angular + Express
npm run build          # Build producción
npm run test           # Jest con coverage
```

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/app/models.ts` | Todas las interfaces TypeScript |
| `src/app/services/api-url.service.ts` | URL builder (obligatorio) |
| `src/app/services/organization.service.ts` | Contexto multi-empresa |
| `src/app/stores/entities.feature.ts` | Factory de stores con caching |
| `server.ts` | Backend Express |
| `database/01-setup.sql` | Schema principal |
