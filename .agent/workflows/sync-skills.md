---
description: Sincronizar y actualizar skills con los cambios del código actual
---

# Sync Skills Workflow

Este workflow sincroniza las skills con el estado actual del código.

## Cuándo usar

- Después de refactorizaciones grandes
- Cuando cambien patrones o convenciones
- Antes de onboarding de nuevos desarrolladores
- Periódicamente (ej: cada sprint)

## Pasos

### 1. Identificar skill a actualizar

Pregunta al usuario qué skill necesita actualización, o revisa todas si es sync completo.

Skills disponibles:

- `angular-component` - Patrones de componentes
- `supabase-api` - Queries y API
- `hr-module` - Módulos HR
- `code-review` - Checklist de revisión
- `timelogs` - Marcaciones
- `schedules` - Horarios y turnos
- `employee-management` - CRUD empleados
- `payroll` - Nómina
- `employee-portal` - Portal autoservicio
- `forms` - Formularios reactivos
- `permissions` - Sistema de permisos
- `branch-manager` - Vista gerente

### 2. Revisar código actual

Para cada skill a actualizar:

1. Leer los componentes/services relacionados
2. Identificar cambios en modelos, patrones o APIs
3. Detectar nuevas funcionalidades

### 3. Comparar con skill existente

Verificar:

- [ ] ¿Los modelos/interfaces están actualizados?
- [ ] ¿Los ejemplos de código reflejan el patrón actual?
- [ ] ¿Hay nuevas funcionalidades no documentadas?
- [ ] ¿Hay código obsoleto en la skill?

### 4. Actualizar skill

Editar el archivo `SKILL.md` correspondiente:

- Actualizar modelos e interfaces
- Corregir ejemplos de código
- Agregar nuevas secciones si aplica
- Eliminar información obsoleta

### 5. Verificar consistencia

Asegurar que:

- Los nombres de componentes/services son correctos
- Las rutas de archivos existen
- Los ejemplos de código compilan
- No hay conflictos entre skills

## Sync completo (todas las skills)

Para sincronizar todas las skills:

1. Listar todos los archivos en `.agent/skills/`
2. Para cada skill, ejecutar pasos 2-4
3. Generar resumen de cambios

## Resumen de cambios

Al finalizar, documentar:

- Skills actualizadas
- Cambios principales
- Skills sin cambios necesarios
