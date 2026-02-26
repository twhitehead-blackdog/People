---
title: Prohibitions
type: decision
status: active
tags: [decision, rules, prohibitions]
last-updated: 2026-02-13
---
# Prohibitions — Lo que NO Hacer

## ❌ Arquitectura
- **No recrear arquitectura** ni mover carpetas sin razón explícita
- **No renombrar archivos/folders** existentes sin discusión
- **No introducir dependencias nuevas** sin discusión previa
- **No mezclar refactoring con feature work** — commits separados

## ❌ API y Datos
- **No usar `process.env` directamente** — usar `getEnv()`
- **No construir URLs manualmente** — usar `ApiUrlService.build()`
- **No cambiar API contracts** (inputs/outputs)
- **No olvidar filtrar por `company_id`** en queries (excepto tabla `companies`)

## ❌ Lógica de Negocio
- **No modificar cálculo de overtime** sin extremo cuidado
- **No modificar lógica de payroll** sin revisión exhaustiva
- **No modificar cálculo de horas** sin tests que lo validen

## ❌ Código
- **No usar `.toPromise()`** — usar `firstValueFrom()` o `lastValueFrom()`
- **No usar `any`** — crear interfaces apropiadas
- **No dejar `console.log`** en producción — usar `LoggerService`
- **No crear componentes > 500 líneas** — split en subcomponentes
- **No poner lógica de negocio en componentes** — usar services/utils

## ❌ RxJS (enforced por ESLint)
- `toPromise` → prohibido
- `process.env` fuera del allowlist → prohibido
