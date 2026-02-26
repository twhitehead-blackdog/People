---
description: Guía para refactorizar código siguiendo las reglas del proyecto People
---

# Refactor Workflow

Este workflow guía la refactorización segura de código.

## Cuándo usar

- Al mejorar código existente sin cambiar comportamiento
- Al reducir líneas en componentes grandes
- Al extraer lógica a services/utils

## Pasos

### 1. Identificar archivo objetivo

Pregunta al usuario qué archivo refactorizar o analiza el archivo activo.

### 2. Revisar límites actuales

Verifica las métricas del archivo:

- Component TS: ¿> 500 líneas?
- Template: ¿> 150 líneas?
- Métodos: ¿> 30-40 líneas?

### 3. Identificar code smells

Busca:

- Lógica de negocio en componentes
- Validaciones complejas inline
- Cálculos de fechas/horas directo
- Acceso directo a APIs sin service
- Código duplicado

### 4. Proponer cambios incrementales

Para cada problema identificado:

1. Proponer **un solo** cambio
2. Indicar destino según tipo:
   - Cálculos puros → `*.utils.ts`
   - Reglas de negocio → `*.service.ts`
   - Submits complejos → `*.actions.ts`
   - Estado compartido → `*.store.ts`

### 5. Implementar cambio

- Un cambio a la vez
- Mantener API pública idéntica
- Preservar comportamiento

// turbo

### 6. Verificar compilación

```bash
npx nx build
```

// turbo

### 7. Ejecutar tests afectados

```bash
npx nx affected -t test
```

### 8. Revisar resultado

- ¿El archivo objetivo tiene menos líneas?
- ¿La funcionalidad es idéntica?
- ¿Los tests pasan?

## Reglas importantes

- ❌ NO mezclar refactor con features nuevas
- ❌ NO cambiar contratos existentes
- ✅ Un commit = una responsabilidad
- ✅ Cada cambio debe compilar y pasar tests
