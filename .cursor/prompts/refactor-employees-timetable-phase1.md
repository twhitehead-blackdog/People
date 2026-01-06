# Refactor employees-timetable.component.ts – Fase 1 (rendimiento)

Objetivo:
- Reducir cómputo por render y mejorar filtros/auditoría.

Pasos:
1) Reemplazar `.toPromise()` con `firstValueFrom`.
2) Inyectar `ApiUrlService` y remover accesos directos a `process.env`.
3) Precomputar mapa de intervalos: `Map<string, { start: Date; end: Date; shift: any }[]>` por `employee_id`.
   - Construir una sola vez desde `schedulesResource.value()` y reutilizarlo para los días.
4) trackBy en bucles `@for` de auditorías (usar `log.id`).
5) Extender `ScheduleAuditService` para aceptar filtros server-side:
   - `getAllAuditHistory(params?: { employeeId?: string; dateFrom?: Date; dateTo?: Date; action?: string; search?: string; page?: number; pageSize?: number })`
   - `getAuditHistoryByEmployeeAndDate(employeeId: string, date: Date)` manteniendo compatibilidad.
6) En el componente, preferir llamadas con parámetros cuando existan filtros activos.

Criterios:
- Igual funcionalidad, menor recomputación.
