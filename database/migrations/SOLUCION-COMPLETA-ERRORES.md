# 🔧 Solución Completa para Errores de Job Applications

## ❌ Errores que estás viendo:

1. **Error 400 al subir archivo**: `Failed to load resource: the server responded with a status of 400`
2. **Error de RLS**: `new row violates row-level security policy`

## ✅ Solución Paso a Paso

### PASO 1: Verificar que el bucket existe

1. Ve a **Supabase Dashboard** → **Storage**
2. Verifica que existe un bucket llamado **`job-applications`**
3. Si NO existe, créalo:
   - Haz clic en **New bucket**
   - **Name**: `job-applications`
   - **Public bucket**: ❌ NO (dejar desmarcado)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - Haz clic en **Create bucket**

### PASO 2: Ejecutar el script SQL completo

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Crea una **nueva consulta**
3. Abre el archivo: `database/migrations/fix-all-job-applications-policies.sql`
4. **Copia TODO** el contenido
5. **Pégalo** en el SQL Editor
6. Haz clic en **Run** (o presiona `Ctrl+Enter`)

Este script:

- ✅ Corrige las políticas RLS de la tabla `job_applications`
- ✅ Corrige las políticas RLS del bucket `job-applications` en Storage
- ✅ Permite inserción pública en la tabla
- ✅ Permite subida pública de archivos en Storage

### PASO 3: Verificar que las políticas se crearon correctamente

Ejecuta el script de verificación:

1. Ve a **SQL Editor**
2. Abre el archivo: `database/migrations/VERIFICAR-POLITICAS.sql`
3. **Copia y pega** el contenido
4. **Ejecuta** el script

Deberías ver:

- ✅ 4 políticas en la tabla `job_applications`
- ✅ 4 políticas en `storage.objects` para el bucket `job-applications`
- ✅ El bucket `job-applications` existe
- ✅ RLS está habilitado en ambas tablas

### PASO 4: Verificar manualmente en el Dashboard

#### Verificar políticas de la tabla:

1. Ve a **Table Editor** → **job_applications**
2. Haz clic en la pestaña **Policies**
3. Debes ver estas 4 políticas:
   - ✅ `Allow public insert to job_applications`
   - ✅ `Allow authenticated select from job_applications`
   - ✅ `Allow authenticated update to job_applications`
   - ✅ `Allow authenticated delete from job_applications`

#### Verificar políticas de Storage:

1. Ve a **Storage** → **job-applications**
2. Haz clic en la pestaña **Policies**
3. Debes ver estas 4 políticas:
   - ✅ `Allow public uploads to job-applications`
   - ✅ `Allow authenticated read from job-applications`
   - ✅ `Allow authenticated update from job-applications`
   - ✅ `Allow authenticated delete from job-applications`

### PASO 5: Si las políticas NO aparecen

Si después de ejecutar el script las políticas no aparecen:

1. **Verifica que no haya errores** en el SQL Editor (debe mostrar "Success")
2. **Recarga la página** del Dashboard
3. **Ejecuta el script nuevamente** (puede haber un problema de caché)

### PASO 6: Probar nuevamente

Después de ejecutar el script y verificar las políticas:

1. **Recarga** tu aplicación Angular
2. **Intenta enviar** una aplicación desde el formulario
3. **Revisa la consola** del navegador para ver si hay errores

## 🐛 Si el error persiste

### Error 400 al subir archivo:

**Causa posible**: El bucket no tiene las políticas correctas o el método de subida no es correcto.

**Solución**:

1. Verifica que el bucket existe (PASO 1)
2. Ejecuta el script SQL (PASO 2)
3. Verifica las políticas de Storage (PASO 4)

### Error de RLS:

**Causa posible**: Las políticas de la tabla no permiten inserción pública.

**Solución**:

1. Ejecuta el script SQL (PASO 2)
2. Verifica las políticas de la tabla (PASO 4)
3. Asegúrate de que la política `Allow public insert to job_applications` existe

## 📝 Notas Importantes

- Los archivos PDF **NO** se almacenan en la base de datos
- Los archivos PDF se almacenan en **Supabase Storage** (bucket `job-applications`)
- En la base de datos solo se guarda:
  - `resume_url`: URL del archivo en Storage
  - `resume_filename`: Nombre original del archivo

## 🔍 Cómo ver los archivos subidos

1. Ve a **Storage** → **job-applications**
2. Deberías ver todos los archivos PDF subidos
3. Puedes descargarlos haciendo clic en ellos

## ✅ Checklist Final

Antes de probar, verifica que:

- [ ] El bucket `job-applications` existe en Storage
- [ ] El script SQL se ejecutó sin errores
- [ ] Hay 4 políticas en la tabla `job_applications`
- [ ] Hay 4 políticas en el bucket `job-applications`
- [ ] RLS está habilitado en ambas tablas
- [ ] Recargaste la aplicación Angular
