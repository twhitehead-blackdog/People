---
name: error-handling
description: Patrones de try/catch, toast de errores, logging. Úsala para manejar errores correctamente.
---

# Error Handling Skill

Esta skill te guía en el manejo de errores en People.

## Patrón Básico

```typescript
async performAction(): Promise<void> {
  this.isLoading.set(true);
  this.error.set(null);

  try {
    await this.doSomething();
    this.showSuccess('Operación completada');
  } catch (error) {
    this.handleError(error);
  } finally {
    this.isLoading.set(false);
  }
}
```

## MessageService para Toasts

```typescript
import { MessageService } from 'primeng/api';

@Component({
  providers: [MessageService],
  template: `<p-toast />`,
})
export class MyComponent {
  private message = inject(MessageService);

  showSuccess(detail: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Éxito',
      detail,
      life: 3000,
    });
  }

  showError(detail: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Error',
      detail,
      life: 5000,
    });
  }

  showWarn(detail: string): void {
    this.message.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail,
      life: 4000,
    });
  }
}
```

## Categorización de Errores HTTP

```typescript
handleHttpError(error: any): void {
  const status = error.status;

  if (!status || error.message?.includes('Network')) {
    this.showError('Error de conexión. Verifica tu internet.');
    return;
  }

  switch (status) {
    case 400:
      this.showError('Solicitud inválida. Revisa los datos.');
      break;
    case 401:
      this.showError('Sesión expirada. Inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      break;
    case 403:
      this.showError('No tienes permisos para esta acción.');
      break;
    case 404:
      this.showError('Recurso no encontrado.');
      break;
    case 500:
      this.showError('Error del servidor. Intenta más tarde.');
      break;
    default:
      this.showError('Ocurrió un error inesperado.');
  }

  this.logger.error('HTTP Error', { status, error });
}
```

## Error en httpResource

```typescript
readonly data = httpResource<Data[]>(() => ({...}));

// En template
@if (data.error()) {
  <div class="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
    <i class="pi pi-exclamation-circle text-red-500 mr-2"></i>
    <span>{{ getErrorMessage(data.error()) }}</span>
    <p-button
      label="Reintentar"
      icon="pi pi-refresh"
      (onClick)="data.reload()"
    />
  </div>
} @else if (data.isLoading()) {
  <p-progressSpinner />
} @else {
  <!-- Mostrar datos -->
}
```

## Logging de Errores

```typescript
import { LoggerService } from '../services/logger.service';

@Component({...})
export class MyComponent {
  private logger = inject(LoggerService);

  handleError(error: unknown): void {
    // Log para debugging
    this.logger.error('Operation failed', {
      component: 'MyComponent',
      action: 'saveData',
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Mostrar al usuario
    this.showError(this.getUserFriendlyMessage(error));
  }

  private getUserFriendlyMessage(error: unknown): string {
    if (error instanceof Error) {
      // Mensajes específicos
      if (error.message.includes('duplicate')) {
        return 'Este registro ya existe.';
      }
      if (error.message.includes('foreign key')) {
        return 'No se puede eliminar, hay registros relacionados.';
      }
    }
    return 'Ocurrió un error. Intenta nuevamente.';
  }
}
```

## Validación de Formularios

```typescript
showFormErrors(): void {
  const controls = this.form.controls;

  Object.keys(controls).forEach(key => {
    const control = controls[key];
    if (control.invalid) {
      const errors = control.errors;

      if (errors?.['required']) {
        this.showWarn(`El campo ${key} es requerido`);
      } else if (errors?.['email']) {
        this.showWarn('Ingresa un email válido');
      } else if (errors?.['min']) {
        this.showWarn(`El valor mínimo es ${errors['min'].min}`);
      }
    }
  });
}
```

## Error Boundary Pattern

```typescript
// Para errores en effects
effect(() => {
  try {
    this.processData();
  } catch (error) {
    this.logger.error('Effect error', error);
    this.error.set('Error al procesar datos');
  }
});
```

## Reintentos Automáticos

```typescript
async withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      this.logger.warn(`Retry ${i + 1}/${maxRetries}`, { error });
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }

  throw lastError;
}

// Uso
const data = await this.withRetry(() => this.fetchData());
```
