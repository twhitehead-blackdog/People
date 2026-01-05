# 🔨 Paso 1: Extraer servicios y utilidades de Timelogs
Objetivo: sacar del componente `src/app/dashboard/timelogs.component.ts` la lógica que toca datos, fechas o búsquedas, sin alterar la UI ni el comportamiento.

1. Identificar funciones que preguntan a Supabase o construyen URLs (split antes/después del 22).
2. Crear un servicio `TimelogsApiService` en `src/app/dashboard/timelogs/services/` que devuelva los mismos datos (valor, isLoading, error) y que encapsule la lógica de fechas.
3. Mover transformaciones puras (ordenar logs, mapear a `DayLog`) a utilidades bajo `timelogs/utils/`, exportando funciones nombradas.
4. Extraer helpers de búsqueda de empleados y tolerancias a `timelogs/utils/search.ts` y `timelogs/utils/tolerance.ts`.
5. Mantener en el componente solo: signals, bindings de template, y llamadas a los servicios/utilities nuevos.
6. Validar que: (a) no hay `console.log` temporales, (b) todos los `any` se tipan, (c) `timelogs.component.ts` sigue usando sus `httpResource`/`computed` como antes.

### Notas
- Si el servicio necesita `company_id` o filtros globales, pásalos desde el componente via inputs o services compartidos.
- Documenta cada función movida con un comentario breve.
- No cambies la estructura de carpetas existente; coloca los archivos nuevos dentro de `src/app/dashboard/timelogs/`.
