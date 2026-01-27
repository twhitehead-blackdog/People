---
name: angular-component
description: Guía completa para crear y refactorizar componentes Angular standalone con Signals en el proyecto People. Úsala cuando necesites crear un nuevo componente, refactorizar uno existente, o entender patrones de Signals.
---

# Angular Component Skill

Esta skill te guía en la creación y mantenimiento de componentes Angular en People.

## Estructura de un Componente

```typescript
import {
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pt-employee-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading()) {
    <p-progressSpinner />
    } @else {
    <div class="card">
      <h3>{{ employee().name }}</h3>
      <p>{{ formattedDate() }}</p>
      <button (click)="handleClick()">Action</button>
    </div>
    }
  `,
})
export class PtEmployeeCardComponent {
  // 1. Inyección de dependencias
  private readonly dateService = inject(DateService);

  // 2. Inputs (signal-based)
  readonly employee = input.required<Employee>();
  readonly showDetails = input(false);

  // 3. Outputs
  readonly onSelect = output<Employee>();

  // 4. Estado local
  readonly isLoading = signal(false);
  readonly selectedId = signal<number | null>(null);

  // 5. Computed
  readonly formattedDate = computed(() =>
    this.dateService.format(this.employee().hireDate)
  );

  // 6. Effects (constructor)
  constructor() {
    effect(() => {
      console.log('Employee changed:', this.employee().id);
    });
  }

  // 7. Métodos (< 30 líneas cada uno)
  handleClick(): void {
    this.onSelect.emit(this.employee());
  }
}
```

## Checklist de Creación

- [ ] Selector con prefijo `pt-`
- [ ] `standalone: true`
- [ ] `inject()` para dependencias
- [ ] `input()` y `input.required()` para props
- [ ] `output()` para eventos
- [ ] `signal()` para estado mutable
- [ ] `computed()` para valores derivados
- [ ] Métodos < 30 líneas
- [ ] Template < 150 líneas

## Signals vs Observables

| Usar Signal cuando...        | Usar Observable cuando...                  |
| ---------------------------- | ------------------------------------------ |
| Estado local simple          | Streams de datos (WebSocket)               |
| Valores derivados (computed) | Operadores complejos (debounce, switchMap) |
| Inputs/Outputs               | Integración con librerías RxJS             |
| UI reactiva síncrona         | Operaciones async encadenadas              |

## Patrones Comunes

### Cargar datos reactivamente

```typescript
readonly employeeId = input.required<number>();

readonly employeeResource = httpResource<Employee>(() => ({
  url: this.apiUrl.build('rest/v1/employees', {
    id: `eq.${this.employeeId()}`
  })
}));
```

### Estado de formulario

```typescript
readonly formData = signal<FormData>({
  name: '',
  email: ''
});

updateField(field: keyof FormData, value: string): void {
  this.formData.update(current => ({
    ...current,
    [field]: value
  }));
}
```

### Toggle booleano

```typescript
readonly isOpen = signal(false);
toggle(): void {
  this.isOpen.update(v => !v);
}
```

## Anti-patrones a Evitar

```typescript
// ❌ NO: Lógica compleja en template
template: `{{ calculateComplexValue(employee()) }}`

// ✅ SI: Usar computed
readonly complexValue = computed(() =>
  this.calculateComplexValue(this.employee())
);
```

```typescript
// ❌ NO: Mutar signal directamente
this.items().push(newItem);

// ✅ SI: Usar update
this.items.update((current) => [...current, newItem]);
```

## Type Narrowing en Templates (Union Types)

Cuando uses tipos de unión (Union Types) con Signals, **siempre** usa variables de template (`as variable`) para permitir el refinamiento de tipos (type narrowing). Evita llamar al signal directamente dentro de bloques condicionales si necesitas acceder a propiedades específicas del tipo refinado.

```typescript
// ❌ NO: Llamar al signal directamente (el narrowing puede fallar en otras partes del bloque)
@if (isTypeA(mySignal())) {
  {{ mySignal().propertyA }} // ERROR: propertyA no existe en TypeB
}

// ✅ SI: Usar variable de template con "as"
@if (mySignal(); as value) {
  @if (isTypeA(value)) {
    {{ value.propertyA }} // TypeScript refina "value" correctamente
  } @else {
    {{ value.propertyB }} // Refinado a TypeB
  }
}
```
