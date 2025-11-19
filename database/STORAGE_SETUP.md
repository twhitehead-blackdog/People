# 📦 Configuración de Supabase Storage

## 🎯 Objetivo
Configurar el bucket `disabilities` en Supabase Storage para permitir la subida y descarga de archivos de incapacidades.

---

## 📋 Pasos para Configurar

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**

### Paso 2: Ejecutar el Script de Configuración

1. Abre el archivo `database/migrations/setup-storage.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Paso 3: Verificar la Configuración

1. En el menú lateral de Supabase, ve a **Storage**
2. Deberías ver el bucket `disabilities` en la lista
3. Verifica que esté marcado como **Public**

---

## 🔧 Configuración Manual (Alternativa)

Si prefieres configurarlo manualmente desde la interfaz:

### Crear el Bucket

1. Ve a **Storage** en el menú lateral
2. Haz clic en **New bucket**
3. Configura:
   - **Name**: `disabilities`
   - **Public bucket**: ✅ Activado (para permitir descarga directa)
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
     - `application/pdf`
4. Haz clic en **Create bucket**

### Configurar Políticas (Policies)

1. En el bucket `disabilities`, ve a la pestaña **Policies**
2. Haz clic en **New Policy**

#### Política 1: Permitir Subida (INSERT)

- **Policy name**: `Permitir subida de archivos de incapacidades`
- **Allowed operation**: `INSERT`
- **Target roles**: `anon` (para permitir con API Key)
- **Policy definition**:
```sql
bucket_id = 'disabilities'
```

#### Política 2: Permitir Lectura (SELECT)

- **Policy name**: `Permitir lectura de archivos de incapacidades`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**:
```sql
bucket_id = 'disabilities'
```

#### Política 3: Permitir Actualización (UPDATE) - Opcional

- **Policy name**: `Permitir actualización de archivos propios`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'disabilities' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Política 4: Permitir Eliminación (DELETE) - Opcional

- **Policy name**: `Permitir eliminación de archivos propios`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'disabilities' AND (storage.foldername(name))[1] = auth.uid()::text
```

---

## ✅ Verificación

Para verificar que todo funciona:

1. **Prueba la subida desde la aplicación**:
   - Ve al portal de empleados
   - Intenta subir una incapacidad con un archivo
   - Debería subir correctamente

2. **Verifica en Supabase Storage**:
   - Ve a **Storage** > **disabilities**
   - Deberías ver los archivos subidos organizados por `employee_id`

3. **Prueba la descarga**:
   - Haz clic en el botón de descarga en la tabla de incapacidades
   - El archivo debería descargarse correctamente

---

## 🔑 Variables de Entorno Necesarias

Para que la subida de archivos funcione correctamente, necesitas configurar:

```env
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=tu-api-key-publica
ENV_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key (RECOMENDADO para subida de archivos)
```

**Nota importante**: 
- La API Key pública puede funcionar si las políticas permiten `anon`
- El Service Role Key tiene permisos completos y es más confiable para subir archivos
- Puedes encontrar el Service Role Key en: Supabase Dashboard → Settings → API → service_role (secret)

## 🔒 Seguridad

### Configuración Actual (Pública)
- ✅ El bucket es público para facilitar la descarga
- ✅ Cualquiera con la URL puede descargar el archivo
- ⚠️ Los archivos están organizados por `employee_id` para mantener cierto orden

### Configuración Más Segura (Opcional)

Si necesitas más seguridad, puedes:

1. **Cambiar el bucket a privado**:
   - En Storage, edita el bucket `disabilities`
   - Desactiva **Public bucket**

2. **Usar Signed URLs**:
   - Modifica el código para generar URLs firmadas
   - Las URLs expiran después de un tiempo determinado

3. **Restringir políticas**:
   - Cambia las políticas para solo permitir `authenticated` users
   - Agrega validación adicional basada en `employee_id`

---

## 🐛 Solución de Problemas

### Error: "Bucket not found"
- Verifica que el bucket `disabilities` existe en Storage
- Asegúrate de haber ejecutado el script SQL correctamente

### Error: "new row violates row-level security policy"
- Verifica que las políticas están configuradas correctamente
- Asegúrate de que la política de INSERT permite `anon` o `authenticated`

### Error: "File size exceeds limit"
- Verifica que el archivo no exceda 10MB
- Aumenta el límite en la configuración del bucket si es necesario

### Error: "MIME type not allowed"
- Verifica que el tipo de archivo esté en la lista de MIME types permitidos
- Los tipos permitidos son: PDF, JPG, PNG, GIF

---

## 📝 Notas Adicionales

- Los archivos se organizan automáticamente por `employee_id`
- El formato del path es: `disabilities/{employee_id}/{timestamp}.{extension}`
- La URL pública es: `{SUPABASE_URL}/storage/v1/object/public/disabilities/{filename}`
- Los archivos se pueden eliminar manualmente desde el dashboard de Supabase si es necesario

