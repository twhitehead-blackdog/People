---
title: Current Status
type: state
status: active
tags: [state, status, production]
last-updated: 2026-02-13
---
# Current Status

## Producción
- **URL:** `people.blackdogpanama.com`
- **Hosting:** VPS Linux + Nginx + PM2
- **Branch:** `testDA`
- **Empresas activas:** Black Dog (BD), Naz (NZ)

## Módulos en Producción ✅

| Módulo | Estado | Notas |
|--------|--------|-------|
| Empleados (CRUD) | ✅ Estable | Formularios, lista, detalle |
| Marcaciones (Timelogs) | ✅ Estable | Kiosk + admin |
| Horarios (Schedules) | ✅ Estable | Templates + asignaciones |
| Nómina (Payroll) | ✅ Estable | Deducciones, pagos |
| Time-offs | ✅ Estable | Vacaciones, compensatorio |
| Incapacidades | ✅ Estable | Con file upload |
| Portal Empleado | ✅ Estable | Autoservicio |
| Branch Manager | ✅ Estable | Gestión sucursal |
| Organigrama | ✅ Estable | Vista organizacional |
| Permisos | ✅ Estable | Frontend permissions |
| Inventario IT | ✅ Estable | Dispositivos + asignaciones |
| Feria de Empleo | ✅ Estable | Formulario público |
| Settings | ✅ Estable | Configuración sistema |
| Evaluación 360 | ✅ Parcial | En desarrollo |
| Integración Odoo | ✅ Parcial | Solo sale.orders |

## Stack Actual
- Angular 20, PrimeNG, TailwindCSS
- Supabase (PostgreSQL + RLS)
- Auth0 (OpenID Connect)
- Express.js (tsx) como backend
- Nx 21 monorepo
- Jest 30 (testing)
