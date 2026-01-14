---
description: Ejecutar tests con coverage mínimo del 80%
---

# Test Workflow

Este workflow ejecuta tests y verifica cobertura.

## Modos de ejecución

### Todos los tests

```bash
npx nx test --coverage
```

### Tests afectados (recomendado para PRs)

```bash
npx nx affected -t test --coverage
```

### Un proyecto específico

```bash
npx nx test people --coverage
```

### Un archivo específico

```bash
npx nx test --testFile=src/app/components/pt-example/pt-example.component.spec.ts
```

## Pasos

// turbo

### 1. Ejecutar tests

```bash
npx nx test --coverage
```

### 2. Revisar cobertura

El reporte de cobertura se genera en `coverage/`.

**Mínimos requeridos:**
| Métrica | Mínimo |
|---------|--------|
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

### 3. Si hay tests fallidos

1. Leer el mensaje de error
2. Identificar el archivo del test
3. Revisar el código del test
4. Corregir y re-ejecutar

### 4. Si la cobertura es baja

Agregar tests para:

- Casos edge no cubiertos
- Ramas `if/else` no probadas
- Funciones sin tests

## Comandos útiles

### Ejecutar en modo watch

```bash
npx nx test --watch
```

### Actualizar snapshots

```bash
npx nx test --updateSnapshot
```

### Ver reporte de cobertura

```bash
npx open-cli coverage/lcov-report/index.html
```

## Tips

- Usa `describe/it` con nombres descriptivos
- Un test = un caso específico
- Mockea dependencias externas
- Aísla side-effects
