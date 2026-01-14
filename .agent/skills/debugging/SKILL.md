---
name: debugging
description: Patrones de debugging: console, DevTools, errores comunes. Úsala para diagnosticar problemas.
---

# Debugging Skill

Esta skill te guía en el debugging de problemas en People.

## DiagnosticService

```typescript
// Usar DiagnosticService para logging estructurado
import { DiagnosticService } from '../services/diagnostic.service';

@Component({...})
export class MyComponent {
  private diagnostic = inject(DiagnosticService);

  someMethod(): void {
    this.diagnostic.log('Component', 'Method called', { data: this.data() });
    this.diagnostic.warn('Component', 'Potential issue', { reason: 'xyz' });
    this.diagnostic.error('Component', 'Error occurred', { error });
  }
}
```

## Console Debugging

```typescript
// Debugging de Signals
effect(() => {
  console.log('Signal changed:', {
    items: this.items(),
    count: this.itemCount(),
    isLoading: this.isLoading(),
  });
});

// Debugging de httpResource
effect(() => {
  console.log('Resource state:', {
    value: this.resource.value(),
    isLoading: this.resource.isLoading(),
    error: this.resource.error(),
  });
});
```

## Chrome DevTools

### Network Tab

```
1. F12 → Network
2. Filtrar por "rest" para Supabase
3. Revisar:
   - Status code (200, 400, 401, 500)
   - Request headers (Authorization)
   - Response body (error message)
```

### Sources Tab

```
1. Buscar archivo: Ctrl+P
2. Poner breakpoint: click en número de línea
3. Inspeccionar variables en Scope
4. Step through: F10 (over), F11 (into)
```

### Application Tab

```
1. Local Storage: ver datos guardados
2. Session Storage: datos de sesión
3. Cookies: verificar auth cookies
```

## Errores Comunes

### "Cannot read property of undefined"

```typescript
// ❌ Error si employee() es null
const name = this.employee().name;

// ✅ Verificar antes
const emp = this.employee();
const name = emp?.name ?? 'N/A';
```

### "Expression has changed after it was checked"

```typescript
// ❌ Modificar estado en lifecycle hook
ngAfterViewInit() {
  this.isLoading.set(false);  // Error!
}

// ✅ Usar setTimeout o effect
ngAfterViewInit() {
  setTimeout(() => this.isLoading.set(false));
}
```

### httpResource no actualiza

```typescript
// ❌ La URL no cambia, no se recarga
readonly data = httpResource(() => ({
  url: this.apiUrl.build('rest/v1/table')
}));

// ✅ Agregar dependencia que cambie
readonly data = httpResource(() => ({
  url: this.apiUrl.build('rest/v1/table', {
    updated: this.refreshTrigger().toString()
  })
}));

// O usar .reload()
this.data.reload();
```

### Signal mutations

```typescript
// ❌ Mutar directamente
this.items().push(newItem);

// ✅ Crear nuevo array
this.items.update((current) => [...current, newItem]);
```

## Debugging de Forms

```typescript
// Ver estado del formulario
console.log('Form state:', {
  valid: this.form.valid,
  invalid: this.form.invalid,
  dirty: this.form.dirty,
  touched: this.form.touched,
  errors: this.form.errors,
  value: this.form.value,
});

// Ver errores de un campo
const field = this.form.get('email');
console.log('Field errors:', field?.errors);
```

## Debugging de Rutas

```typescript
import { Router, NavigationEnd } from '@angular/router';

constructor() {
  inject(Router).events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      console.log('Navigated to:', event.url);
    }
  });
}
```

## LoggerService

```typescript
// Para logs persistentes
import { LoggerService } from '../services/logger.service';

@Component({...})
export class MyComponent {
  private logger = inject(LoggerService);

  someMethod(): void {
    this.logger.info('Operation started');
    this.logger.warn('Something might be wrong');
    this.logger.error('Operation failed', error);
  }
}
```
