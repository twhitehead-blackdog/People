---
description: Crear un nuevo componente Angular standalone siguiendo las convenciones del proyecto
---

# New Component Workflow

Este workflow crea un nuevo componente Angular standalone.

## Información requerida

Antes de empezar, necesito saber:

1. **Nombre del componente** (sin prefijo, ej: `employee-card`)
2. **Ubicación** (ej: `src/app/components/`)
3. **¿Necesita inputs/outputs?**

## Pasos

### 1. Generar componente base

```bash
npx ng generate component components/pt-{nombre} --standalone --inline-template --inline-style --skip-tests=false
```

### 2. Aplicar estructura correcta

El componente debe seguir esta estructura:

```typescript
import { Component, inject, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pt-{nombre}',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Template aquí -->
  `,
  styles: ``
})
export class Pt{Nombre}Component {
  // Inyección de dependencias
  private readonly apiUrl = inject(ApiUrlService);

  // Inputs
  readonly data = input.required<DataType>();

  // Outputs
  readonly onAction = output<ActionType>();

  // Estado local
  readonly isLoading = signal(false);

  // Computed
  readonly displayValue = computed(() =>
    this.data().name.toUpperCase()
  );
}
```

### 3. Agregar imports de PrimeNG (si aplica)

```typescript
imports: [
  CommonModule,
  ButtonModule,
  // ... otros módulos PrimeNG necesarios
];
```

// turbo

### 4. Verificar compilación

```bash
npx nx build
```

### 5. Crear test básico

Asegurar que el archivo `.spec.ts` tiene al menos:

- Test de creación del componente
- Test de inputs requeridos

// turbo

### 6. Ejecutar tests

```bash
npx nx test --testFile={ruta-al-spec}
```

## Checklist final

- [ ] Selector tiene prefijo `pt-`
- [ ] Es `standalone: true`
- [ ] Usa `inject()` para dependencias
- [ ] Usa `signal()` e `input()` para estado
- [ ] Tiene tests básicos
- [ ] Compila sin errores
