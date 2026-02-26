---
name: code-review
description: Revisar código buscando errores, problemas de estilo y mejores prácticas del proyecto People. Úsala al revisar PRs o calidad de código.
---

# Code Review Skill

Esta skill guía la revisión de código en el proyecto People.

## Checklist de Revisión

### 1. Correctitud

- [ ] ¿El código hace lo que debe hacer?
- [ ] ¿Maneja casos edge correctamente?
- [ ] ¿Hay condiciones de carrera potenciales?

### 2. Tipado

- [ ] ¿Hay uso de `any`? (PROHIBIDO)
- [ ] ¿Los tipos son específicos y precisos?
- [ ] ¿Se usan interfaces para objetos complejos?

### 3. Arquitectura

- [ ] ¿El componente tiene < 500 líneas?
- [ ] ¿Los métodos tienen < 30-40 líneas?
- [ ] ¿La lógica está en el lugar correcto?
  - Cálculos → `*.utils.ts`
  - Reglas de negocio → `*.service.ts`
  - Submits → `*.actions.ts`
  - Estado → `*.store.ts`

### 4. Signals y Estado

- [ ] ¿Usa `signal()` para estado mutable?
- [ ] ¿Usa `computed()` para valores derivados?
- [ ] ¿Evita mutación directa de signals?
- [ ] ¿Usa `input()` para props?

### 5. Supabase

- [ ] ¿Usa `ApiUrlService.build()` para URLs?
- [ ] ¿Filtra por `company_id`?
- [ ] ¿Evita `process.env` directo?
- [ ] ¿Maneja errores de API?

### 6. Tests

- [ ] ¿Hay tests para la funcionalidad nueva?
- [ ] ¿La cobertura es >= 80%?
- [ ] ¿Los tests son deterministas?

## Cómo dar Feedback

### Formato de comentarios

```markdown
**[BLOQUEO]** Problema crítico que debe corregirse antes de merge.

**[SUGERENCIA]** Mejora opcional que haría el código mejor.

**[PREGUNTA]** Clarificación necesaria para entender la decisión.
```

### Ejemplos

```typescript
// ❌ BLOQUEO: Uso de `any` prohibido
const data: any = response;

// ✅ Sugerencia: Definir tipo específico
interface ResponseData {
  items: Item[];
  total: number;
}
const data: ResponseData = response;
```

```typescript
// ❌ BLOQUEO: Lógica de negocio en componente
calculateOvertime(timelogs: Timelog[]): number {
  // 50 líneas de cálculos...
}

// ✅ Sugerencia: Mover a service
// overtime.service.ts
@Injectable({ providedIn: 'root' })
export class OvertimeService {
  calculateOvertime(timelogs: Timelog[]): number { ... }
}
```

## Severidades

| Tipo        | Acción          | Ejemplo                 |
| ----------- | --------------- | ----------------------- |
| **Crítico** | Bloquea merge   | Bugs, seguridad, `any`  |
| **Mayor**   | Debe corregirse | Arquitectura incorrecta |
| **Menor**   | Nice-to-have    | Nombres poco claros     |
| **Nit**     | Opcional        | Formato, espacios       |

## Anti-patrones a Detectar

1. **God Component**: > 500 líneas
2. **Prop Drilling**: Pasar props por muchos niveles
3. **Mutation**: Modificar signals directamente
4. **Magic Numbers**: Valores sin constantes
5. **Copy-Paste**: Código duplicado
6. **Any Abuse**: Tipos genéricos innecesarios

## Template de Review

```markdown
## Resumen

[Descripción breve de qué hace el PR]

## Puntos positivos

- [Qué está bien]

## Cambios requeridos

1. **[BLOQUEO]** [Descripción]
2. **[MAYOR]** [Descripción]

## Sugerencias

- [Mejoras opcionales]

## Verificación

- [ ] Compila sin errores
- [ ] Tests pasan
- [ ] Cobertura >= 80%
```
