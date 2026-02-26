# 🚀 Guía de Migración a Versión 2.0 - Producción

## 📋 Resumen

Este script actualiza la base de datos **peopletrak** (producción) para que funcione con la versión 2.0 del código, que incluye:

### Campos Agregados:

1. ✅ Campo `rejection_comment` en `employee_disabilities` (para motivos de rechazo)
2. ✅ Campo `work_email` en `branches` (para notificaciones de marcaciones)

### Settings:

3. ✅ Settings `job_fair_start_date` y `job_fair_end_date` (rango de fechas de feria)

### Nuevas Tablas:

4. ✅ Tabla `disability_events` (historial de incapacidades)
5. ✅ Tabla `document_request_events` (historial de solicitudes)
6. ✅ Tabla `hr_messages` (mensajes del sistema HR)
7. ✅ Tabla `job_application_statuses` (estados de aplicaciones)
8. ✅ Tabla `job_applications` (aplicaciones de trabajo - feria de empleo)
9. ✅ Tabla `notifications` (sistema de notificaciones)

## 🎯 Base de Datos Objetivo

- **Producción:** peopletrak (la que necesitas actualizar)
- **Desarrollo:** PPT DEMO (ya tiene estos cambios)

## 📝 Pasos para Ejecutar la Migración

### Paso 1: Acceder a Supabase Dashboard

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión
3. Selecciona el proyecto **peopletrak** (producción)

### Paso 2: Abrir SQL Editor

1. En el menú lateral, haz clic en **SQL Editor**
2. Haz clic en **New Query** (Nueva consulta)

### Paso 3: Ejecutar el Script de Migración

1. Abre el archivo: `database/migrations/migrate-to-v2.0-production.sql`
2. **Copia TODO el contenido** del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Paso 4: Verificar la Migración

El script incluye verificaciones automáticas que mostrarán mensajes como:

```
✓ Campo rejection_comment agregado correctamente
✓ Campo work_email agregado a branches correctamente
✓ Setting job_fair_start_date existe
✓ Setting job_fair_end_date existe
```

Si ves algún mensaje de advertencia (✗), revisa los errores y ejecuta nuevamente.

## ✅ Checklist Post-Migración

Después de ejecutar el script, verifica:

### Campos Agregados:

- [ ] El campo `rejection_comment` existe en la tabla `employee_disabilities`
- [ ] El campo `work_email` existe en la tabla `branches`

### Settings:

- [ ] Los settings `job_fair_start_date` y `job_fair_end_date` existen en la tabla `settings`

### Nuevas Tablas:

- [ ] La tabla `disability_events` existe
- [ ] La tabla `document_request_events` existe
- [ ] La tabla `hr_messages` existe
- [ ] La tabla `job_application_statuses` existe (con 5 estados por defecto)
- [ ] La tabla `job_applications` existe
- [ ] La tabla `notifications` existe

### Índices:

- [ ] Los índices fueron creados correctamente (verificar en la sección de índices de Supabase)

### RLS:

- [ ] RLS está habilitado en todas las nuevas tablas

### Errores:

- [ ] No hay errores en la consola de Supabase

## 🔍 Verificación Manual (Opcional)

Si quieres verificar manualmente, ejecuta estas consultas en el SQL Editor:

```sql
-- Verificar campo rejection_comment
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employee_disabilities'
AND column_name = 'rejection_comment';

-- Verificar campo work_email en branches
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'branches'
AND column_name = 'work_email';

-- Verificar settings de feria
SELECT key, value, description
FROM settings
WHERE key IN ('job_fair_start_date', 'job_fair_end_date');
```

## 🐛 Solución de Problemas

### Error: "column already exists"

Si obtienes este error, significa que el campo ya existe. Esto es normal si ejecutas el script múltiples veces. El script usa `IF NOT EXISTS`, así que es seguro.

### Error: "relation does not exist"

Si obtienes este error, significa que alguna tabla no existe. Ejecuta primero `database/01-setup.sql` para crear todas las tablas base.

### Error de permisos

Si obtienes errores de permisos, asegúrate de estar usando una cuenta con permisos de administrador en Supabase.

## 📊 Cambios Realizados

### 1. Tabla `employee_disabilities`

**Agregado:**

- `rejection_comment` (TEXT) - Motivo del rechazo de incapacidades

**Uso:** Cuando una incapacidad es rechazada, se puede agregar un comentario explicando el motivo.

### 2. Tabla `branches`

**Agregado:**

- `work_email` (VARCHAR(255)) - Email del supervisor de la sucursal

**Uso:** Se usa para identificar al supervisor que recibirá notificaciones cuando los empleados marquen entrada/salida.

### 3. Tabla `settings`

**Agregados:**

- `job_fair_start_date` - Fecha de inicio de la feria de empleo
- `job_fair_end_date` - Fecha de fin de la feria de empleo

**Uso:** Permite configurar un rango de fechas para la duración de la feria de empleo, en lugar de solo una fecha de inicio.

### 4. Tabla `disability_events` (NUEVA)

**Descripción:** Historial de eventos y cambios de estado en incapacidades.

**Columnas principales:**

- `disability_id` - Referencia a la incapacidad
- `event_type` - Tipo de evento
- `performed_by` - Quién realizó la acción
- `previous_status` / `new_status` - Cambios de estado
- `notes` - Notas adicionales
- `metadata` - Datos adicionales en JSON

**Uso:** Auditoría y seguimiento de cambios en incapacidades.

### 5. Tabla `document_request_events` (NUEVA)

**Descripción:** Historial de eventos y cambios de estado en solicitudes de documentos.

**Columnas principales:**

- `document_request_id` - Referencia a la solicitud
- `event_type` - Tipo de evento
- `performed_by` - Quién realizó la acción
- `previous_status` / `new_status` - Cambios de estado
- `notes` - Notas adicionales
- `metadata` - Datos adicionales en JSON

**Uso:** Auditoría y seguimiento de cambios en solicitudes de documentos.

### 6. Tabla `hr_messages` (NUEVA)

**Descripción:** Mensajes del sistema HR para empleados.

**Columnas principales:**

- `employee_id` - Empleado destinatario
- `message_type` - Tipo de mensaje
- `title` - Título del mensaje
- `message` - Contenido del mensaje
- `is_read` - Si fue leído
- `related_type` / `related_id` - Relación con otras entidades

**Uso:** Sistema de mensajería interna del HR.

### 7. Tabla `job_application_statuses` (NUEVA)

**Descripción:** Estados personalizados para aplicaciones de trabajo.

**Columnas principales:**

- `code` - Código único del estado
- `label` - Etiqueta para mostrar
- `severity` - Color del tag (success, info, warn, danger)
- `display_order` - Orden de visualización
- `is_default` - Si es un estado por defecto

**Estados por defecto incluidos:**

- `pending` - Pendiente
- `reviewed` - Revisada
- `contacted` - Contactada
- `rejected` - Rechazada
- `hired` - Contratada

**Uso:** Gestionar estados personalizados para aplicaciones de trabajo.

### 8. Tabla `job_applications` (NUEVA)

**Descripción:** Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual.

**Columnas principales:**

- `first_name`, `last_name` - Nombre del aspirante
- `email`, `phone_number` - Contacto
- `position_id` / `position_name` - Posición aplicada
- `resume_url` / `resume_filename` - Archivo de hoja de vida
- `status` - Estado de la aplicación
- `interview_date` - Fecha de entrevista
- `province`, `corregimiento` - Ubicación
- `salary_expectation` - Aspiración salarial
- `is_favorite` - Si está marcada como favorita
- `position_ids` - Array de IDs de posiciones (múltiples posiciones)

**Uso:** Sistema completo de feria de empleo virtual.

### 9. Tabla `notifications` (NUEVA)

**Descripción:** Sistema de notificaciones para alertar a supervisores sobre eventos del sistema.

**Columnas principales:**

- `recipient_id` - Empleado que recibe la notificación
- `branch_id` - Sucursal relacionada
- `type` - Tipo de notificación (timelog_entry, delay, etc.)
- `title`, `message` - Contenido de la notificación
- `related_entity_type` / `related_entity_id` - Entidad relacionada
- `is_read` - Si fue leída
- `priority` - Prioridad (low, medium, high, urgent)

**Tipos de notificaciones:**

- `timelog_entry` - Marcación de entrada
- `timelog_exit` - Marcación de salida
- `timelog_lunch_start` - Inicio de almuerzo
- `timelog_lunch_end` - Fin de almuerzo
- `delay` - Retraso
- `early_exit` - Salida temprana
- `lunch_exceeded` - Almuerzo excedido
- `complaint` - Queja
- `other` - Otro

**Uso:** Notificar a supervisores sobre eventos importantes del sistema.

## 🔄 Migración de Datos (Opcional)

Si tenías configurada una fecha en `job_fair_interview_start_date`, puedes migrarla manualmente:

```sql
-- Ver el valor actual
SELECT key, value FROM settings WHERE key = 'job_fair_interview_start_date';

-- Si tiene un valor, copiarlo a job_fair_start_date
UPDATE settings
SET value = (SELECT value FROM settings WHERE key = 'job_fair_interview_start_date')
WHERE key = 'job_fair_start_date'
AND (SELECT value FROM settings WHERE key = 'job_fair_interview_start_date') IS NOT NULL;
```

## 📝 Notas Importantes

- ⚠️ **El script es seguro:** Usa `IF NOT EXISTS` y `ON CONFLICT`, por lo que no elimina ni modifica datos existentes
- ✅ **Idempotente:** Puedes ejecutarlo múltiples veces sin problemas
- 🔒 **No afecta datos:** Solo agrega campos y settings nuevos, no modifica datos existentes
- 🚀 **Listo para producción:** El script está diseñado para ejecutarse en producción de forma segura

## 🎉 ¡Listo!

Una vez ejecutado el script, tu base de datos **peopletrak** estará lista para funcionar con la versión 2.0 del código.

**Próximos pasos:**

1. Actualizar el código en producción a la versión 2.0
2. Configurar las fechas de la feria desde el dashboard
3. (Opcional) Configurar `work_email` en las sucursales para habilitar notificaciones

---

**¿Necesitas ayuda?** Revisa los logs del SQL Editor o contacta al equipo de desarrollo.
