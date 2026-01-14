---
description: Convenciones específicas de Angular con Signals y standalone components para el proyecto People.
---

# Angular Conventions – People

## Standalone Components

Todos los componentes nuevos deben ser `standalone: true`:

```typescript
@Component({
  selector: 'pt-example',
  standalone: true,
  imports: [CommonModule, FormsModule, ...],
  template: `...`
})
export class ExampleComponent { }
```

## Signals y Computed

### Estado local

```typescript
// ✅ Estado simple
readonly isLoading = signal(false);
readonly selectedId = signal<number | null>(null);

// ✅ Computed derivado
readonly filteredItems = computed(() =>
  this.items().filter(x => x.active)
);
```

### Inputs y Outputs

```typescript
// ✅ Signal inputs (Angular 17+)
readonly employeeId = input.required<number>();
readonly showHeader = input(true);

// ✅ Outputs
readonly onSave = output<Employee>();
```

## Inyección de Dependencias

```typescript
// ✅ Inject function (preferido)
private readonly apiUrl = inject(ApiUrlService);
private readonly http = inject(HttpClient);

// ❌ Evitar constructor injection para nuevos componentes
```

## Effects para Side Effects

```typescript
constructor() {
  // ✅ Effect para sincronización
  effect(() => {
    const id = this.employeeId();
    if (id) this.loadEmployee(id);
  });
}
```

## httpResource (Supabase)

```typescript
// ✅ Patrón reactivo
readonly employeesResource = httpResource<Employee[]>(() => ({
  url: this.apiUrl.build('rest/v1/employees', {
    company_id: `eq.${this.companyId()}`
  })
}));

// Uso en template
@if (employeesResource.isLoading()) {
  <p-progressSpinner />
} @else {
  @for (emp of employeesResource.value(); track emp.id) {
    <pt-employee-card [employee]="emp" />
  }
}
```

## Estructura de Archivos

```
src/app/components/pt-example/
├── pt-example.component.ts      # Component + Template inline
├── pt-example.component.spec.ts # Tests
└── pt-example.utils.ts          # Helpers específicos (opcional)
```

## PrimeNG Integration

```typescript
// ✅ Importar módulos específicos
imports: [ButtonModule, TableModule, DialogModule, ToastModule];
```

## Prefijo de Componentes

- Todos los componentes: `pt-*` (people)
- Selector: `pt-employee-card`, `pt-schedule-grid`, etc.
