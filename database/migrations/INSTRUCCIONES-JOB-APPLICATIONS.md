# 📋 Instrucciones para Configurar el Formulario de Aplicaciones

Este documento te guía paso a paso para configurar todo lo necesario en Supabase para que el formulario de aplicaciones de trabajo funcione correctamente.

## 🚀 Pasos a Seguir

### 1. Acceder al SQL Editor de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query** para crear una nueva consulta

### 2. Ejecutar el Script de Setup

**OPCIÓN A: Script Completo (puede fallar con Storage)**
1. Abre el archivo `database/migrations/setup-job-applications-complete.sql`
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
5. Si obtienes errores de permisos con Storage, ve a la OPCIÓN B

**OPCIÓN B: Script Solo Tabla (recomendado)**
1. Abre el archivo `database/migrations/setup-job-applications-table-only.sql`
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
5. Luego configura Storage manualmente (ver paso 3)

### 3. Configurar Storage Manualmente (si usaste OPCIÓN B o si falló)

#### Crear el Bucket

1. En el menú lateral, ve a **Storage**
2. Haz clic en **New bucket**
3. Configura:
   - **Name**: `job-applications`
   - **Public bucket**: ❌ **NO** (dejar desmarcado - privado)
   - **File size limit**: `5242880` (5MB en bytes)
   - **Allowed MIME types**: 
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. Haz clic en **Create bucket**

#### Configurar Políticas RLS del Bucket

1. En **Storage**, haz clic en el bucket `job-applications`
2. Ve a la pestaña **Policies**
3. Haz clic en **New policy** y crea las siguientes políticas:

**Política 1: INSERT Público**
- **Policy name**: `Allow public uploads to job-applications`
- **Allowed operation**: `INSERT`
- **Target roles**: `public`
- **USING expression**: (dejar vacío)
- **WITH CHECK expression**: `bucket_id = 'job-applications'`

**Política 2: SELECT Autenticado**
- **Policy name**: `Allow authenticated read from job-applications`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'job-applications'`
- **WITH CHECK expression**: (dejar vacío)

**Política 3: UPDATE Autenticado**
- **Policy name**: `Allow authenticated update from job-applications`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'job-applications'`
- **WITH CHECK expression**: (dejar vacío)

**Política 4: DELETE Autenticado**
- **Policy name**: `Allow authenticated delete from job-applications`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'job-applications'`
- **WITH CHECK expression**: (dejar vacío)

### 4. Verificar que Todo se Creó Correctamente

#### Verificar la Tabla

1. En el menú lateral, ve a **Table Editor**
2. Deberías ver la tabla `job_applications` en la lista
3. Haz clic en ella para ver su estructura

#### Verificar el Bucket de Storage

1. En el menú lateral, ve a **Storage**
2. Deberías ver un bucket llamado `job-applications`
3. Haz clic en él para verificar que está configurado correctamente
4. Ve a la pestaña **Policies** y verifica que las 4 políticas estén creadas

#### Verificar las Políticas RLS

1. En **Table Editor**, haz clic en la tabla `job_applications`
2. Ve a la pestaña **Policies**
3. Deberías ver las siguientes políticas:
   - `Allow public insert to job_applications`
   - `Allow authenticated select from job_applications`
   - `Allow authenticated update to job_applications`
   - `Allow authenticated delete from job_applications`

### 5. Probar el Formulario

1. Inicia tu aplicación Angular
2. Navega a `/job-fair` (o haz clic en el botón de "Feria de Empleo" en el login)
3. Completa el formulario y sube un archivo PDF, DOC o DOCX
4. Haz clic en "Enviar Aplicación"

## ✅ Verificación Final

Si todo está configurado correctamente:

- ✅ La tabla `job_applications` existe
- ✅ El bucket `job-applications` existe en Storage
- ✅ Las políticas RLS están configuradas
- ✅ Puedes enviar aplicaciones desde el formulario
- ✅ Los archivos se suben correctamente a Storage
- ✅ Las aplicaciones se guardan en la base de datos

## 🐛 Solución de Problemas

### Error: "bucket does not exist"

**Solución**: El bucket no se creó correctamente. Ejecuta manualmente:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  false,
  5242880,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);
```

### Error: "permission denied"

**Solución**: Las políticas RLS no están configuradas. Ejecuta la sección 4 del script de setup nuevamente.

### Error: "relation does not exist"

**Solución**: La tabla no se creó. Ejecuta la sección 2 del script de setup nuevamente.

### El archivo no se sube

**Solución**: Verifica que:
1. El bucket existe
2. Las políticas de Storage permiten INSERT público
3. El archivo es menor a 5MB
4. El archivo es PDF, DOC o DOCX

## 📝 Notas Importantes

- El bucket `job-applications` es **privado** por defecto (no público)
- Cualquiera puede **subir** archivos (INSERT público)
- Solo usuarios autenticados pueden **leer** archivos (SELECT autenticado)
- El tamaño máximo de archivo es **5MB**
- Solo se permiten archivos: PDF, DOC, DOCX

## 🔒 Seguridad

Las políticas están configuradas para:
- Permitir que cualquiera pueda **enviar** aplicaciones (público)
- Solo usuarios autenticados pueden **ver** las aplicaciones y archivos (privado)

Esto es seguro porque:
- Los archivos subidos son privados
- Solo los administradores autenticados pueden acceder a ellos
- Las aplicaciones solo pueden ser leídas por usuarios autenticados

