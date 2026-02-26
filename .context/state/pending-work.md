---
title: Pending Work
type: state
status: active
tags: [state, pending, todo]
last-updated: 2026-02-13
---
# Pending Work

## Testing
- [ ] Implementar tests para cálculo de horas trabajadas
- [ ] Tests para validaciones de fechas y rangos
- [ ] Tests para filtros de timelogs
- [ ] Aumentar coverage general (meta: 80%)

## Bugs por Resolver
- [ ] Guard del portal: cache puede quedar obsoleto
- [ ] Mensajes sin leer: filtrar por employee_id
- [ ] Validación de emails en datos personales
- [ ] Cálculos negativos de horas en portal

## Mejoras
- [ ] Playwright E2E tests
- [ ] Evaluación 360° completa
- [ ] Integración Odoo avanzada
- [ ] Manejo de concurrencia en ediciones
- [ ] Manejo de sesión expirada durante operaciones

## Refactoring
- [ ] Reducir archivos grandes (branch-manager: 131K, timeclock: 89K)
- [ ] hr-disabilities.component.ts (211K) — necesita split urgente
- [ ] Extraer lógica de cálculos a utils separados
