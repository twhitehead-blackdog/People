---
title: Employee Portal Feature
type: feature
status: production
tags: [feature, portal, employee, self-service]
related: [[employee-model]]
last-updated: 2026-02-13
---
# Employee Portal — Autoservicio

## Descripción
Portal de autoservicio donde empleados pueden ver sus marcaciones, solicitar tiempo libre, reportar incapacidades, ver su nómina, y actualizar datos personales.

## Acceso
- **Ruta:** `/employee-portal`
- **Guard:** `authGuardFn` + `employee-portal.guard.ts`
- **Requisitos:** `has_portal_access: true` + `account_approved: true`

## Funcionalidades

| Función | Descripción |
|---------|-------------|
| Marcaciones | Ver historial de entry/lunch/exit |
| Solicitudes | Tiempo libre, compensatorio |
| Incapacidades | Subir certificados médicos |
| Datos personales | Editar email, teléfono, dirección |
| Quejas | Sistema de quejas confidenciales |
| Sugerencias | Buzón de sugerencias |
| Uniformes | Solicitar uniformes |

## Componentes
- `employee-portal/` — 33 archivos
- `employee-portal.component.ts` — Componente principal dashboard
- Store: `employee-portal.store.ts`
- Navigation: `employee-portal-navigation.service.ts`

## Guard del Portal
- Cache de 5 minutos para permisos
- Valida `has_portal_access` y `account_approved`
- Si error HTTP sin cache → permite acceso por defecto (issue conocido)
