# 🔧 Instrucciones para Ejecutar Migraciones - Branch Manager Gestiones

## ✅ BUENAS NOTICIAS: ¡Las tablas ya existen!

Revisé tu schema y **todas las tablas necesarias ya existen**:
- ✅ `employee_vacations` (con `created_by`)
- ✅ `employee_disabilities` (con `created_by`)
- ✅ `document_requests` (con `created_by`)
- ✅ `timeoffs` (para compensatorio)

## 🔴 El Problema Real

Los errores HTTP 400 en consola se deben a que:
- La tabla `document_requests` **NO tiene el campo `company_id`**
- Pero el código estaba intentando filtrarlo

## ✅ Solución Aplicada

Ya corregí el código para que:
1. No intente filtrar por `company_id` en `document_requests`
2. Use `employee.company_id` en su lugar
3. Todo debería funcionar **sin ejecutar SQL**

## 🚀 Próximos Pasos

**Opción 1: Probar directamente (RECOMENDADO)**
- Recarga tu aplicación (`F5`)
- Los errores deberían haber desaparecido
- El tab "Gestiones" debería funcionar

**Opción 2: Agregar `company_id` (OPCIONAL)**
- Si quieres mejorar el performance de las consultas
- Ejecuta: `database/migrations/add-company-id-to-document-requests.sql`
- Esto es completamente opcional

---

## ⚠️ Solo si aún hay errores:

---

## 📋 Pasos para Ejecutar las Migraciones

### 1. **Abrir Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto: `fsrptlzaqjkcutoiivjr`

### 2. **Ir al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New query"**

### 3. **Copiar y Ejecutar el SQL**
   - Abre el archivo: `database/migrations/EJECUTAR-PRIMERO-branch-manager-gestiones.sql`
   - Copia **TODO** el contenido del archivo
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **"Run"** (o presiona `Ctrl + Enter`)

### 4. **Verificar que se ejecutó correctamente**
   Deberías ver un mensaje como:
   ```
   Success. No rows returned
   ```
   O similar, sin errores rojos.

### 5. **Verificar las tablas**
   Ejecuta esto en el SQL Editor para verificar:
   ```sql
   -- Verificar employee_vacations
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'employee_vacations';

   -- Verificar created_by en employee_disabilities
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'employee_disabilities' 
   AND column_name = 'created_by';

   -- Verificar created_by en document_requests
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'document_requests' 
   AND column_name = 'created_by';
   ```

### 6. **Recargar la aplicación**
   - Recarga tu aplicación en el navegador (`F5` o `Ctrl + R`)
   - Los errores en la consola deberían desaparecer
   - El tab "Gestiones" y "Mis Solicitudes de Empleados" deberían funcionar correctamente

---

## 🎯 ¿Qué hace este script?

1. **Crea la tabla `employee_vacations`** para solicitudes de vacaciones
2. **Agrega la columna `created_by`** a:
   - `employee_disabilities`
   - `document_requests`
3. **Crea índices** para mejorar el rendimiento
4. **Configura triggers** para sincronización automática
5. **Configura RLS policies** para seguridad

---

## ❓ Si tienes errores

### Error: "relation already exists"
✅ **Normal.** Significa que esa tabla/columna ya existe. El script continúa sin problemas.

### Error: "permission denied"
❌ Asegúrate de estar usando el **Service Role Key** o ejecutar como **postgres user** en Supabase.

### Error: "foreign key violation"
❌ Puede que falte la tabla `employees` o `companies`. Verifica que esas tablas existan primero.

---

## 🚀 Después de ejecutar

Una vez ejecutadas las migraciones, podrás:
- ✅ Crear solicitudes de compensatorio para empleados
- ✅ Crear solicitudes de incapacidades para empleados
- ✅ Crear solicitudes de vacaciones para empleados
- ✅ Crear solicitudes de documentos para empleados
- ✅ Ver todas las solicitudes de empleados en el tab "Mis Solicitudes de Empleados"

---

## 📝 Notas

- Este script es **idempotente**: puede ejecutarse múltiples veces sin causar errores
- Usa `IF NOT EXISTS` para evitar duplicados
- Todas las operaciones son **seguras** y no eliminan datos existentes
