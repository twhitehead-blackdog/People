# Refactorizar employees-timetable.component.ts - Fase 3

## Objetivo
Componente principal como orquestador puro (< 150 líneas).

---

## Pasos

### Commit 1: Extraer template a archivo HTML separado
- Crear `employees-timetable.component.html`
- Usar subcomponentes
- Actualizar `templateUrl`
- Verificar renderizado

### Commit 2: Limpiar componente TypeScript
- Solo métodos de orquestación
- Inyectar servicios
- Delegar lógica
- Verificar funcionalidad completa

### Commit 3: Optimizar y documentar
- Agregar JSDoc a métodos públicos
- Verificar OnPush
- Tests manuales completos
- Crear CHANGELOG. md con cambios

---

## Comando
```
@refactor-timetable-phase3.md Ejecutar Fase 3 completa. Verificar todo funciona.
```