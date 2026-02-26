---
title: Job Applications Feature
type: feature
status: production
tags: [feature, job-fair, recruitment]
last-updated: 2026-02-13
---
# Job Applications — Feria de Empleo

## Descripción
Sistema de recepción de solicitudes de empleo via formulario público. Incluye gestión administrativa de candidatos.

## Rutas
- `/job-fair` — Formulario público (sin auth)
- Dashboard admin — Lista y detalle de solicitudes

## Componentes
- `job-fair-form.component.ts` — Formulario público
- `job-applications-list.component.ts` — Lista admin
- `job-application-detail.component.ts` — Detalle
- `job-application-status-dialog.component.ts` — Cambio de estado
- Store: `job-applications.store.ts`

## Estados
`pending` → `reviewed` → `contacted` → `hired` / `rejected`

## Campos
Nombre, apellido, email, teléfono, posición(es), experiencia, resume (PDF), info adicional, favorito
