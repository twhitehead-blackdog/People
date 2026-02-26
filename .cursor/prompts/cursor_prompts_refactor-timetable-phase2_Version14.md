# Refactorizar employees-timetable.component.ts - Fase 2

## Objetivo
Extraer template HTML a subcomponentes standalone.

---

## Pasos

### Commit 1: Crear TimetableFiltersComponent
- Inputs: `disableBranch`
- Two-way:  `employeeSearch`, `currentBranch`, `currentPosition`
- Slot para acciones adicionales
- Verificar filtros funcionan

### Commit 2: Crear TimetableHeaderComponent
- Inputs: `currentWeekLabel`, `menuItems`
- Outputs: `weekChange`, `openMonthSelector`
- Verificar navegación

### Commit 3: Crear ShiftCellComponent
- Inputs: `shift`, `canApprove`
- Outputs: `edit`, `delete`, `approve`, `add`
- Verificar interacciones

### Commit 4: Crear TimetableGridComponent
- Inputs: `employees`, `days`, `canApproveSchedules`
- Outputs: `editShift`, `deleteShift`, `approveShift`, `addShift`
- Usar ShiftCellComponent
- Verificar tabla completa

### Commit 5: Crear MonthWeekSelectorComponent
- Two-way: `visible`, `selectedMonth`, `selectedWeek`
- Inputs: `weekOptions`
- Outputs: `confirm`
- Verificar selector

---

## Comando
```
@refactor-timetable-phase2.md Ejecutar Fase 2 completa.  Commits atómicos.
```