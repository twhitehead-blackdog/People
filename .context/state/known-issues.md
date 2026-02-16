---
title: Known Issues
type: state
status: active
tags: [state, bugs, issues]
source: BUGS_AND_ISSUES.md
last-updated: 2026-02-13
---
# Known Issues

Condensado de `BUGS_AND_ISSUES.md`. Solo los issues activos más relevantes.

## 🔴 Críticos

### 1. Cálculo de horas — valores negativos posibles
- `employee-portal.component.ts`: `calculateWorkedHours()` no valida exit > entry
- Puede mostrar resultados negativos si datos son inconsistentes

### 2. Fechas null en marcaciones
- `format(x.created_at, 'yyyy-MM-dd')` lanza error si `created_at` es null
- Debería filtrar logs sin fecha antes de procesarlos

## 🟡 Medios

### 3. Guard del Portal — permisos con cache obsoleto
- Cache de 5 min puede mostrar datos obsoletos si empleado fue desactivado
- Si error HTTP sin cache → permite acceso por defecto

### 4. Mensajes sin leer — filtro incompleto
- API de mensajes no filtra por `employee_id` del empleado actual
- Puede contar mensajes de otros empleados

### 5. Validación de email al editar datos personales
- No valida formato de email antes de guardar
- No verifica duplicados

## ✅ Resueltos
- `.toPromise()` deprecado → Reemplazado con `firstValueFrom()` en 8 archivos
- Logs de debug → Reemplazados con `LoggerService`
- Validaciones de fechas → Agregadas en timelogs
- Variables de entorno → Validadas con `getSupabaseBaseUrl()`
- Tipos `any` → Reemplazados con interfaces propias

> Para la lista completa ver `BUGS_AND_ISSUES.md` (547 líneas, 30 issues documentados)
