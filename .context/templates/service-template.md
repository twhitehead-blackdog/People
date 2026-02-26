---
title: Service Template
type: template
tags: [template, service]
---
# [TEMPLATE] Service Documentation

```markdown
---
title: [NombreService]
type: service
status: [implemented | in-progress | planned]
tags: [service, tema]
source: src/app/services/nombre.service.ts
related: [[servicio-relacionado]]
last-updated: YYYY-MM-DD
---
# [NombreService]

## Quick Summary
> Una frase que describe la responsabilidad del servicio.

## API Principal

### `methodName(params): ReturnType`
Descripción del método.

```typescript
// Ejemplo de uso
const result = this.myService.methodName(param1);
```

## Dependencias
- `ServiceA` — para qué lo usa
- `ServiceB` — para qué lo usa

## Ubicación
`src/app/services/nombre.service.ts` (X líneas)
```
