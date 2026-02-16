---
title: Folder Structure
type: architecture
status: current
tags: [structure, folders, organization]
last-updated: 2026-02-13
---
# Folder Structure

## Raíz del Proyecto
```
/opt/people-prueba/
├── src/app/                    # Frontend Angular
├── server.ts                   # Backend Express (51KB)
├── database/                   # SQL: setup + 116 migrations
├── docker/                     # Docker configs (stage/prod/railway)
├── scripts/                    # Deploy, setup, utilities
├── public/                     # Assets estáticos
├── .agent/                     # Skills (18) + Workflows (7)
├── CLAUDE.md                   # Guía para AI
├── WARP.md                     # Guía para WARP AI
└── .env                        # Variables de entorno (NO en git)
```

## src/app/ — Estructura Principal
```
src/app/
├── models.ts                   # 80+ interfaces (1134 líneas)
├── app.routes.ts               # Rutas principales
├── app.config.ts               # Providers globales
├── app.component.ts            # Root component
│
├── services/                   # 28 servicios
│   ├── api-url.service.ts      # ⭐ URL builder (obligatorio)
│   ├── organization.service.ts # ⭐ Multi-company context
│   ├── permissions.service.ts  # ⭐ Roles y permisos
│   ├── email.service.ts
│   ├── qr.service.ts
│   └── ... (23 más)
│
├── stores/                     # 21 signal stores
│   ├── auth.store.ts           # ⭐ Usuario/empresa actual
│   ├── entities.feature.ts     # ⭐ Factory store con caching
│   ├── dashboard.store.ts      # Store principal del dashboard
│   ├── employees.store.ts
│   └── ... (17 más)
│
├── dashboard/                  # 130+ componentes
│   ├── home.component.ts       # Home (87KB)
│   ├── timelogs.component.ts   # Marcaciones (80KB)
│   ├── branch-manager.component.ts  # Gerente (131KB)
│   ├── employee-form.component.ts   # Formulario empleado
│   ├── payroll*.component.ts   # Módulo nómina
│   ├── hr-disabilities.component.ts # Incapacidades (211KB)
│   ├── services/               # Servicios del dashboard
│   ├── modules/                # Sub-módulos
│   └── ... (100+ más)
│
├── employee-portal/            # Portal autoservicio (33 archivos)
├── guards/                     # Auth, timeclock, portal guards
├── interceptors/               # HTTP + API URL interceptors
├── pipes/                      # 11 pipes
├── utils/                      # 7 utilities
├── shared/                     # Componentes compartidos
├── login/                      # Login component
├── naz-timeclock/              # Timeclock NAZ
├── job-fair/                   # Feria de empleo
└── timeclock.component.ts      # Kiosk timeclock (89KB)
```

## Rutas Principales
| Ruta | Componente | Guard |
|------|-----------|-------|
| `/` | Dashboard (lazy) | `authGuardFn` |
| `/employee-portal` | Portal (lazy) | `authGuardFn` |
| `/timeclock-kiosk` | Kiosk marcaciones | `timeclockKioskGuard` |
| `/naz-timeclock` | Timeclock NAZ | — |
| `/job-fair` | Feria de empleo | — |
| `/qr` | Generador QR | — |
| `/login` | Login | — |
| `/sin-acceso` | No access | — |
