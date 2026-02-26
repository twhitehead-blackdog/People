---
description: Auditar y optimizar rendimiento de la aplicación
---

# Performance Workflow

Este workflow guía la auditoría de rendimiento.

## Análisis de Bundle

// turbo

### 1. Analizar tamaño del bundle

```bash
npx nx build --configuration=production --stats-json
npx webpack-bundle-analyzer dist/people/stats.json
```

### 2. Identificar módulos grandes

Buscar en el reporte:

- Dependencias duplicadas
- Módulos no tree-shaken
- Imports innecesarios

## Lazy Loading

### 3. Verificar lazy loading de rutas

```typescript
// ✅ Correcto - Lazy loaded
{
  path: 'dashboard',
  loadComponent: () => import('./dashboard/dashboard.component')
    .then(m => m.DashboardComponent)
}

// ❌ Evitar - Eager loaded
{
  path: 'dashboard',
  component: DashboardComponent
}
```

### 4. Revisar imports de PrimeNG

```typescript
// ❌ Evitar importar todo
import { PrimeNGModule } from 'primeng';

// ✅ Importar solo lo necesario
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
```

## Optimización de Componentes

### 5. Verificar ChangeDetection

```typescript
// ✅ Usar OnPush para componentes con Signals
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 6. Revisar computed y effects

```typescript
// ❌ Cálculos pesados en template
{{ calculateHeavy(items()) }}

// ✅ Usar computed
readonly result = computed(() => this.calculateHeavy(this.items()));
```

### 7. Virtualización de listas largas

```typescript
// Para listas > 100 items, usar p-virtualScroller
<p-virtualScroller
  [items]="items()"
  [itemSize]="50"
  scrollHeight="400px"
>
```

## httpResource Optimization

### 8. Evitar queries innecesarias

```typescript
// ❌ Query se ejecuta siempre
readonly data = httpResource(() => ({ url: ... }));

// ✅ Query condicional
readonly data = httpResource(() => {
  const id = this.id();
  if (!id) return undefined;  // No ejecutar
  return { url: ... };
});
```

### 9. Limitar resultados

```typescript
// Agregar límite a queries grandes
url: this.apiUrl.build('rest/v1/timelogs', {
  limit: '100',
  order: 'created_at.desc',
});
```

## Métricas a Revisar

| Métrica      | Target  | Cómo medir              |
| ------------ | ------- | ----------------------- |
| Bundle size  | < 500KB | webpack-bundle-analyzer |
| First Paint  | < 2s    | Lighthouse              |
| TTI          | < 3s    | Lighthouse              |
| Memory leaks | 0       | Chrome DevTools         |

## Checklist Final

- [ ] Bundle principal < 500KB
- [ ] Rutas lazy loaded
- [ ] OnPush en componentes con Signals
- [ ] Listas grandes virtualizadas
- [ ] Queries con límites
- [ ] No hay memory leaks
