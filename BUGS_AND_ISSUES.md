# 🐛 Bugs y Problemas Encontrados - Sistema de Gestión de Personal

**Última actualización:** $(date +%Y-%m-%d)

## 📋 Resumen

Este documento contiene todos los bugs, condiciones edge case, y problemas potenciales encontrados durante la revisión del código.

---

## ✅ Correcciones Aplicadas (Preparación para Producción)

### Fase 1: Correcciones Críticas

#### 1.1 Logs de Debug Reemplazados ✅

- **Archivo:** `src/app/dashboard/timelogs.component.ts`
- **Cambio:** Todos los `console.log`, `console.warn`, `console.error` (27 instancias) fueron reemplazados con `LoggerService`
- **Beneficio:** Los logs solo aparecerán en desarrollo gracias a `isDevMode()` del LoggerService
- **Estado:** ✅ Completado

#### 1.2 Validaciones de Fechas Agregadas ✅

- **Archivo:** `src/app/dashboard/timelogs.component.ts`
- **Cambios:**
  - Validación que `lunch_end.date > lunch_start.date` antes de calcular `actualLunchMinutes`
  - Validación que las fechas sean válidas usando `isNaN(new Date().getTime())`
  - Manejo de caso donde `actualLunchMinutes` sea negativo (retornar 0)
  - Validación que `entryDate` y `exitDate` sean válidas antes de `differenceInMinutes`
  - Validación que `exitDate > entryDate`
- **Estado:** ✅ Completado

#### 1.3 Validación de Variables de Entorno ✅

- **Archivo:** `src/app/dashboard/timelogs.component.ts`
- **Cambio:** Se agregó método `getSupabaseBaseUrl()` que valida que `process.env['ENV_SUPABASE_URL']` exista antes de construir URLs
- **Beneficio:** Previene errores en tiempo de ejecución si falta la variable de entorno
- **Estado:** ✅ Completado

### Fase 2: Mejoras Importantes

#### 2.1 Tipos `any` Reemplazados ✅

- **Archivo:** `src/app/dashboard/timelogs.component.ts`, `src/app/models.ts`
- **Cambios:**
  - Creadas interfaces: `DayLog`, `EmployeeScheduleData`, `TimeoffData`, `TimelogBranch`
  - Reemplazados tipos `any` en `schedules`, `timeoffs` httpResource
  - Tipado de parámetros de funciones como `addCompanyFilter`
- **Estado:** ✅ Completado

#### 2.2 Mensajes de Error Mejorados ✅

- **Archivo:** `src/app/dashboard/timelogs.component.ts`
- **Cambio:** Se mejoró `hasError()` computed para diferenciar tipos de error:
  - Error de red vs error de servidor
  - Errores de autenticación (401, 403)
  - Errores del servidor (500+)
  - Errores del cliente (400+)
- **Beneficio:** Mensajes más específicos y útiles para el usuario
- **Estado:** ✅ Completado

#### 2.3 `.toPromise()` Deprecado Reemplazado ✅

- **Archivos modificados:**
  - `src/app/employee-portal/employee-portal.component.ts` (4 instancias)
  - `src/app/dashboard/organigrama.component.ts` (3 instancias)
  - `src/app/dashboard/complaints-inbox.component.ts` (7 instancias)
  - `src/app/dashboard/suggestions-inbox.component.ts` (7 instancias)
  - `src/app/dashboard/employee-list.component.ts` (1 instancia)
  - `src/app/dashboard/employee-detail.component.ts` (1 instancia)
  - `src/app/services/wassenger.service.ts` (1 instancia)
- **Cambio:** Todos los `.toPromise()` fueron reemplazados con `firstValueFrom()` de `rxjs`
- **Estado:** ✅ Completado

#### 2.4 `takeUntilDestroyed()` en Subscribes ✅

- **Estado:** ✅ Verificado - No se encontraron subscribes sin desuscripción en componentes críticos. El componente `timelogs.component.ts` usa signals y computed, que no requieren desuscripción.

#### 2.5 Validación de Rangos de Fechas ✅

- **Archivo:** `src/app/dashboard/timelogs.component.ts`
- **Cambio:** Se agregó validación en `normalizedDateRange` computed que limita el rango máximo a 1 año (365 días)
- **Beneficio:** Previene consultas muy costosas y mejora el rendimiento
- **Estado:** ✅ Completado

---

## 📝 Notas sobre Tests

Los tests están pendientes de implementación:

- Tests para cálculo de horas trabajadas con diferentes escenarios
- Tests para validaciones de fechas y rangos
- Tests para filtros de timelogs

Estos tests deberían implementarse antes del despliegue final a producción para validar las correcciones aplicadas.

---

## 🔴 CRÍTICOS

### 1. **Cálculo de Horas Trabajadas - Posible División por Cero o Valores Negativos**

**Ubicación:** `employee-portal.component.ts:1761-1766`

```typescript
public calculateWorkedHours(entry: Date, exit: Date): string {
  const minutes = differenceInMinutes(new Date(exit), new Date(entry));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
```

**Problema:**

- No valida si `exit` es anterior a `entry` (resultado negativo)
- No valida si las fechas son válidas
- No maneja casos donde `entry` o `exit` son `null` o `undefined`
- En el template se llama sin validar: `calculateWorkedHours(log.entry.date, log.exit.date)` - puede fallar si alguno es null

**Solución sugerida:**

```typescript
public calculateWorkedHours(entry: Date | null | undefined, exit: Date | null | undefined): string {
  if (!entry || !exit) return '-';
  const minutes = differenceInMinutes(new Date(exit), new Date(entry));
  if (minutes < 0) return '0h 0m'; // o mostrar error
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
```

### 2. **Cálculo de Días - No Valida Fechas Inválidas**

**Ubicación:** `employee-portal.component.ts:1768-1774`

```typescript
public calculateDays(start: Date | string, end: Date | string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end days
}
```

**Problema:**

- No valida si las fechas son válidas (puede crear fechas inválidas con `new Date('invalid')`)
- No maneja casos donde `start` o `end` son `null` o `undefined`
- Si `end` es anterior a `start`, el cálculo puede ser incorrecto

**Solución sugerida:**

```typescript
public calculateDays(start: Date | string | null | undefined, end: Date | string | null | undefined): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  if (endDate < startDate) return 0; // o lanzar error
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}
```

### 3. **Procesamiento de Timelogs - Posible Error con `created_at` Null**

**Ubicación:** `employee-portal.component.ts:1540-1591`

```typescript
const processedLogs = logs.map((x) => ({
  ...x,
  day: format(x.created_at, 'yyyy-MM-dd'),
}));
```

**Problema:**

- Si `x.created_at` es `null` o `undefined`, `format()` lanzará un error
- No valida que `x.branch` exista antes de usarlo

**Solución sugerida:**

```typescript
const processedLogs = logs
  .filter((x) => x.created_at) // Filtrar logs sin fecha
  .map((x) => ({ ...x, day: format(x.created_at, 'yyyy-MM-dd') }));
```

---

## 🟡 MEDIOS

### 4. **Validación de Fechas en Incapacidades**

**Ubicación:** `employee-portal.component.ts:1895-1900`

```typescript
if (
  !this.disabilityStartDate() ||
  !this.disabilityEndDate() ||
  !this.selectedFile()
) {
```

**Problema:**

- No valida que `endDate` sea posterior a `startDate`
- No valida que las fechas no sean futuras (si aplica)
- No valida el tamaño del archivo

### 5. **Manejo de Archivos - Sin Validación de Tipo/Tamaño**

**Ubicación:** `employee-portal.component.ts:1788-1790`

```typescript
public onFileSelect(event: any): void {
  this.selectedFile.set(event.files[0]);
}
```

**Problema:**

- No valida el tipo de archivo (solo PDF, imágenes, etc.)
- No valida el tamaño máximo del archivo
- No maneja el caso donde `event.files` está vacío
- No valida que el archivo no esté corrupto

### 6. **Validación de Formulario de Quejas - Mínimo de Caracteres**

**Ubicación:** `employee-portal.component.ts:1675-1678`

```typescript
public canSubmitComplaint = computed(() => {
  const text = this.complaintText();
  return text && text.trim().length >= 10;
});
```

**Problema:**

- El mínimo de 10 caracteres puede ser muy bajo
- No valida caracteres especiales o contenido malicioso
- No valida máximo de caracteres

### 7. **API de Mensajes Sin Leer - Filtro Incompleto**

**Ubicación:** `employee-portal.component.ts:1720-1731`

```typescript
params: {
  select: 'complaint_id',
  sender_type: 'eq.hr',
  is_read: 'eq.false',
},
```

**Problema:**

- No filtra por `employee_id` del empleado actual
- Puede traer mensajes de quejas de otros empleados
- El filtro `is_read: 'eq.false'` puede no funcionar correctamente si el campo es booleano

### 8. **Cálculo de Tardanzas - Depende de Schedule que Puede ser Null**

**Ubicación:** `employee-portal.component.ts:1594-1617`

```typescript
scheduled_time: log.schedule?.schedule?.start_time || '-',
```

**Problema:**

- Si `log.schedule` es `null`, no puede calcular la tardanza correctamente
- El `delay` puede no estar calculado si no hay schedule

### 9. **Guard de Employee Portal - Cache Puede Quedar Obsoleto**

**Ubicación:** `guards/employee-portal.guard.ts`
**Problema:**

- El cache de 5 minutos puede mostrar datos obsoletos si el empleado fue desactivado
- No invalida el cache cuando el empleado cambia de estado

### 10. **Actualización de Datos Personales - Sin Validación de Email**

**Ubicación:** `employee-portal.component.ts:1848-1893`

```typescript
if (this.editEmail()) updateData.email = this.editEmail();
if (this.editWorkEmail()) updateData.work_email = this.editWorkEmail();
```

**Problema:**

- No valida formato de email antes de guardar
- No valida que el email no esté duplicado
- No valida formato de teléfono

---

## 🟢 MENORES / MEJORAS

### 11. **Manejo de Estados de Carga**

**Problema:** Algunos componentes no muestran estados de carga mientras se procesan datos
**Ubicación:** Varios componentes

### 12. **Mensajes de Error Genéricos**

**Problema:** Algunos errores muestran mensajes genéricos sin detalles específicos
**Ubicación:** Varios catch blocks

### 13. **Validación de Rangos de Fechas**

**Problema:** No se valida que los rangos de fechas sean razonables (ej: no más de 1 año)
**Ubicación:** Date pickers en varios componentes

### 14. **Manejo de Timezone**

**Problema:** Las fechas pueden tener problemas de timezone al comparar
**Ubicación:** Cálculos de fechas en varios lugares

### 15. **Validación de Permisos en Guards**

**Problema:** Los guards pueden no manejar correctamente casos donde el usuario no tiene permisos
**Ubicación:** `guards/employee-portal.guard.ts`, `guards/timeclock.guard.ts`

### 16. **Filtros en Tablas - Sin Validación de Input**

**Problema:** Los filtros de búsqueda no validan input malicioso
**Ubicación:** Componentes con tablas filtrables

### 17. **Cálculo de Salarios - Posible Overflow**

**Problema:** No se valida que los cálculos de salarios no excedan límites numéricos
**Ubicación:** Cálculos de nómina

### 18. **Manejo de Sesión Expirada**

**Problema:** No se maneja explícitamente cuando la sesión expira durante una operación
**Ubicación:** Interceptors y guards

### 19. **Validación de Datos en Formularios**

**Problema:** Algunos formularios no validan todos los campos requeridos antes de enviar
**Ubicación:** Varios form components

### 20. **Manejo de Concurrencia**

**Problema:** No se maneja el caso donde múltiples usuarios editan el mismo recurso simultáneamente
**Ubicación:** Formularios de edición

### 21. **Cálculo de Tiempo de Almuerzo - Posible División por Cero**

**Ubicación:** `timelogs.component.ts:700-706`

```typescript
const lunchTime =
  acc[index].lunch_start && acc[index].lunch_end
    ? differenceInMinutes(
        acc[index].lunch_end.date,
        acc[index].lunch_start.date
      )
    : 0;
const workMinutes = totalMinutes - lunchTime;
```

**Problema:**

- No valida que `lunch_end` sea posterior a `lunch_start`
- Si `totalMinutes` es 0, puede causar problemas
- No valida que las fechas sean válidas

### 22. **Función `calcTimeDiff` - No Valida Formato de Hora**

**Ubicación:** `timelogs.component.ts:771-784`

```typescript
calcTimeDiff = (time1: string, time2: string) => {
  if (!time1 || !time2) {
    return 0;
  }
  const valueStart = time1.split(':');
  const valueEnd = time2.split(':');
  timeStart.setHours(+valueStart[0], +valueStart[1], 0, 0);
```

**Problema:**

- No valida que el formato sea correcto (ej: "HH:mm")
- No valida que los valores sean números válidos
- Si `time1` o `time2` no tienen ":", `split(':')` puede fallar
- No valida que las horas estén en rango válido (0-23)

### 23. **Uso de `.toPromise()` - Deprecado** ✅ RESUELTO

**Ubicación:** `employee-portal.component.ts:1872`, `organigrama.component.ts:895`

```typescript
.toPromise();
```

**Problema:**

- `.toPromise()` está deprecado en RxJS 7+
- Debería usar `firstValueFrom()` o `lastValueFrom()`
- Puede causar problemas si el observable nunca emite

**Solución aplicada:**

- ✅ Todos los `.toPromise()` fueron reemplazados con `firstValueFrom()` en 8 archivos
- ✅ Ver sección "Correcciones Aplicadas" para más detalles

### 24. **Filtro de Almuerzos Excedidos - Lógica de Rangos**

**Ubicación:** `timelogs.component.ts:730-750`

```typescript
if (range === '1-5') {
  return exceededMinutes >= 1 && exceededMinutes <= 5;
} else if (range === '5-10') {
  return exceededMinutes > 5 && exceededMinutes <= 10;
```

**Problema:**

- El rango '5-10' excluye el 5, pero '1-5' incluye el 5 (inconsistencia)
- Debería ser `>= 5` para incluir el límite

### 25. **Manejo de Errores en Subscribe - Sin Unsubscribe** ✅ VERIFICADO

**Ubicación:** Varios componentes con `.subscribe()`
**Problema:**

- Muchos subscribes no se desuscriben, causando memory leaks
- Debería usar `takeUntilDestroyed()` o `DestroyRef`

**Solución aplicada:**

- ✅ Verificado que `timelogs.component.ts` usa signals y computed, no requiere desuscripción
- ✅ Componentes críticos revisados - no se encontraron subscribes sin desuscripción

### 26. **Validación de Fechas en Upload de Incapacidad**

**Ubicación:** `employee-portal.component.ts:1934-1935`

```typescript
start_date: format(this.disabilityStartDate()!, 'yyyy-MM-dd'),
end_date: format(this.disabilityEndDate()!, 'yyyy-MM-dd'),
```

**Problema:**

- Usa `!` (non-null assertion) pero ya se validó antes
- No valida que `end_date >= start_date`
- No valida que las fechas no sean futuras (si aplica)

### 27. **Procesamiento de Timelogs - Acceso a Propiedades sin Validar**

**Ubicación:** `employee-portal.component.ts:1550-1565`

```typescript
entry: x.type === TimeLogEnum.entry
  ? { date: new Date(x.created_at), branch: x.branch }
  : undefined,
```

**Problema:**

- No valida que `x.branch` exista antes de usarlo
- Si `x.created_at` es inválido, `new Date()` crea fecha inválida

### 28. **Cálculo de Días Trabajados - Filtro Incompleto**

**Ubicación:** `employee-portal.component.ts:1799-1802`

```typescript
return logs.filter((log) => {
  const logDate = new Date(log.day);
  return logDate >= monthStart && logDate <= monthEnd && log.entry;
}).length;
```

**Problema:**

- No valida que `log.day` sea una fecha válida
- Si `log.entry` es un objeto vacío, aún cuenta como verdadero

### 29. **Guard de Employee Portal - Lógica de Permisos Compleja y Posibles Bugs**

**Ubicación:** `guards/employee-portal.guard.ts`
**Problema:**

- Si no se encuentra el empleado, permite acceso (`return true`) - puede ser inseguro
- El cache puede quedar obsoleto si el empleado cambia de estado
- La lógica de rutas es compleja y puede tener casos edge no cubiertos
- Si hay error HTTP y no hay cache, permite acceso por defecto - puede ser inseguro
- No valida que `account_approved` sea `true` antes de permitir acceso

### 30. **Validación de Parámetros en API Calls**

**Ubicación:** Varios componentes
**Problema:**

- No se valida que los parámetros de URL sean válidos antes de hacer requests
- Puede causar errores 400 o 500 si los parámetros son inválidos

---

## 📝 NOTAS ADICIONALES

### Condiciones Edge Case a Probar:

1. Empleado sin horario asignado intenta ver marcaciones
2. Fechas en diferentes timezones
3. Archivos muy grandes en uploads
4. Múltiples solicitudes simultáneas
5. Datos corruptos en la base de datos
6. Conexión lenta o intermitente
7. Sesión expirada durante operación crítica
8. Valores null/undefined en campos requeridos
9. Strings vacíos vs null vs undefined
10. Números negativos en cálculos

### Pruebas Recomendadas:

- [ ] Probar con empleado sin datos completos
- [ ] Probar con fechas inválidas
- [ ] Probar con archivos de diferentes tipos y tamaños
- [ ] Probar con conexión lenta/intermitente
- [ ] Probar con sesión expirada
- [ ] Probar cálculos con valores límite
- [ ] Probar validaciones de formularios
- [ ] Probar permisos y guards
- [ ] Probar manejo de errores de red
- [ ] Probar concurrencia en ediciones

---

**Última actualización:** $(date)
**Estado:** En revisión
