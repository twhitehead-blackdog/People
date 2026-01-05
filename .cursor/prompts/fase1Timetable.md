# Refactorizar employees-timetable.component.ts - Fase 1

## Objetivo

Extraer lógica de negocio y utilidades a servicios/utils.

---

## Pasos

### Commit 1: Crear timetable-date.utils.ts

- Extraer funciones: `generateWeekDays`, `formatWeekRange`, `getCurrentWeekRange`, `getWeeksInMonth`, `getCurrentWeekOfMonth`, `getMonthOptions`
- Actualizar imports en componente
- Verificar funcionalidad

### Commit 2: Crear timetable-permissions.service.ts

- Extraer lógica: `isHRDepartment`, `canAddEmployees`, `canApproveSchedules`, `isStoreManager`, `canSelectBranch`, `getFilterBranchId`
- Inyectar servicio en componente
- Verificar permisos

### Commit 3: Crear timetable-filter.service.ts

- Extraer signals: `employeeSearch`, `currentBranch`, `currentPosition`
- Extraer computed: `filteredEmployees`
- Inyectar servicio
- Verificar filtros

### Commit 4: Crear timetable-navigation.service.ts

- Extraer navegación temporal: `currentDate`, `weekRange`, `start`, `end`, `currentWeek`
- Métodos: `nextWeek`, `previousWeek`, `goToToday`, `goToDate`
- Inyectar servicio
- Verificar navegación

---

## Comando

```
@refactor-timetable-phase1. md Ejecutar Fase 1 completa.  Commits atómicos.
```
