# People Project - Notes

> Este archivo documenta todas las preguntas importantes, respuestas y decisiones tomadas durante el desarrollo del proyecto.

---

## 📋 Índice

- [Decisiones de Arquitectura](#decisiones-de-arquitectura)
- [Preguntas y Respuestas](#preguntas-y-respuestas)
- [Decisiones de UI/UX](#decisiones-de-uiux)
- [Configuraciones Importantes](#configuraciones-importantes)
- [Lecciones Aprendidas](#lecciones-aprendidas)

---

## Decisiones de Arquitectura

### 2026-01-17

- **Branch actual**: `refactorizacion1.1`
- **Objetivo**: Transformar el código hacia una arquitectura más limpia, escalable y mantenible

---

## Preguntas y Respuestas

<!--
Formato sugerido:
### [Fecha] - [Tema]
**Pregunta**:
**Respuesta**:
**Contexto**:
-->

### 2026-01-17 - Filtrado de Solicitudes de Documentos

**Pregunta**: En "Solicitudes de Documentos" están apareciendo solicitudes de Marcación Errónea y Uniformes. ¿Cómo separarlas?
**Respuesta**: Se mantienen en la misma tabla `document_requests` pero se filtran en el query del servicio usando `.set('document_type', 'not.in.(timelog_correction,uniform_request)')`.
**Decisión**: Cada tipo tiene su propia sección dedicada (Marcación Errónea y Uniformes), por lo que se excluyen del listado general de documentos.
**Archivo modificado**: `document-requests.service.ts`

---

## Decisiones de UI/UX

<!--
Documentar decisiones sobre diseño, colores, layouts, etc.
-->

---

## Configuraciones Importantes

- **Stack**: Angular + TypeScript + Nx + Tailwind + Supabase
- **Testing**: Jest (cobertura mínima: 80%)
- **Timezone**: Panamá (America/Panama)

---

## Lecciones Aprendidas

<!--
Documentar problemas encontrados y cómo se resolvieron
-->

---

## Regla Activa

> ⚠️ **REGLA**: Todas las preguntas importantes, respuestas y decisiones sobre este proyecto deben ser documentadas en este archivo.
