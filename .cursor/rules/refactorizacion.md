# Reglas para refactorizaciones de alto riesgo
1. Mantener la funcionalidad existente al 100% antes de cualquier cambio de UI.
2. Extraer primero lógica pura (tipos, utilidades, acceso a datos) a `src/app/dashboard/timelogs/` o `services/` antes de tocar la plantilla.
3. No generar archivos nuevos con más de 500 líneas sin dividirlos en subcomponentes o servicios.
4. Priorizar el uso de `signal`, `computed` y `httpResource` que ya usa el proyecto; no introducir nuevos modelos de estado.
5. Documentar cada extracción (servicio/utility) con un comentario corto que explique qué responsabilidad acapara.
6. Para este sprint inicial enfocarse en `timelogs.component.ts` y en su carpeta vecina en `dashboard/timelogs/`.
