---
description: Cargar contexto del proyecto desde el vault .context/ para reducir tokens
---

# Workflow: Cargar Contexto del Proyecto

Este workflow carga el contexto necesario del proyecto PeopleBD desde el vault `.context/`.
**Beneficio:** Reduce ~60-80% los tokens necesarios para re-descubrir el contexto.

## Pasos

### 1. Leer Quick Context (SIEMPRE)
// turbo
Leer el archivo `.context/00-INDEX.md` para obtener el Quick Context del proyecto completo (stack, reglas, archivos clave).

### 2. Identificar el área relevante
Según la tarea que el usuario necesita, leer el MOC (Map of Content) correspondiente:

| Si la tarea es sobre... | Leer MOC |
|------------------------|----------|
| Stack, estructura, patrones | `.context/architecture/_MOC.md` |
| Modelos de datos | `.context/models/_MOC.md` |
| Servicios | `.context/services/_MOC.md` |
| Base de datos | `.context/database/_MOC.md` |
| Funcionalidades | `.context/features/_MOC.md` |
| Estado del proyecto | `.context/state/current-status.md` |
| Convenciones | `.context/decisions/_MOC.md` |

// turbo
Leer el MOC relevante para la tarea.

### 3. Leer notas específicas
// turbo
Desde el MOC, leer SOLO las notas específicas que necesitas para la tarea actual. No leer todo el vault.

### 4. Verificar prohibiciones
// turbo
Si vas a hacer cambios de código, leer `.context/decisions/prohibitions.md` para asegurar que no violas ninguna regla.

## Ejemplo de uso

**Tarea: "Agregar un campo al modelo de empleado"**
1. ✅ Leer `00-INDEX.md` (Quick Context)
2. ✅ Leer `models/_MOC.md` 
3. ✅ Leer `models/employee-model.md`
4. ✅ Leer `database/migrations-guide.md`
5. ✅ Leer `decisions/prohibitions.md`

**Tarea: "Arreglar un bug en timelogs"**
1. ✅ Leer `00-INDEX.md`
2. ✅ Leer `features/_MOC.md`
3. ✅ Leer `features/timelogs.md`
4. ✅ Leer `models/timelog-model.md`
5. ✅ Leer `state/known-issues.md`
6. ✅ Leer `database/postgrest-tips.md` (si es query related)
