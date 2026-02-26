# 🔍 Analiza un componente grande (Timelogs)
Describe en detalle el estado actual del componente `src/app/dashboard/timelogs.component.ts` para preparar su refactorización.

## 1. Métricas clave
- Contar líneas totales del archivo y porcentaje que representa con respecto al límite de 150 líneas recomendado.
- Identificar cuántas líneas corresponden a lógica (TypeScript) y cuántas al template.
- Enumerar imports principales y si hay dependencias críticas (PrimeNG, date-fns, supabase).

## 2. Responsabilidades detectadas
Marcar qué responsabilidades maneja y si alguna debería vivir fuera del componente:
- UI y templates complejos
- Formularios y validaciones
- Calls a API/Supabase
- Transformación de datos (mapeos, ordenaciones)
- Lógica de negocio (cálculos de tolerancias, alertas)
- Manipulación de fechas y zonas horarias
- Filtrado y búsqueda de empleados

## 3. Code smells visibles
- Funciones de >30 líneas o bloques repetidos.
- Uso excesivo de `any` o código sin tipado.
- Lógica de negocio mezclada con vistas.
- Consulta directa a Supabase desde el componente.
- Operaciones pesadas en cada render.

## 4. Bloques candidatos a extraer
### Subcomponentes (template)
Listar bloques visuales que se pueden convertir en componentes standalone (por ejemplo filtros, tabla, diálogos).

### Servicios (lógica/estado)
Identificar funciones que deben residir en servicios/utilities (p. ej. construcción de queries, mapeo de logs, búsqueda de empleados).

### Stores (estado complejo)
Evaluar si hay estado derivado que convenga mover a un `signalStore` para facilitar la reactividad.

## 5. Plan sugerido
Proponer pasos concretos para extraer cada responsabilidad, mencionando archivos nuevos a crear bajo `src/app/dashboard/timelogs/`.
