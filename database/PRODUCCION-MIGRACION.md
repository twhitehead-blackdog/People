# 🚀 Migración a Producción - Guía Rápida

## ⚠️ IMPORTANTE: Ejecutar en este orden

### Paso 1: Configurar Storage (OBLIGATORIO)

**Archivo:** `database/migrations/setup-storage.sql`

Este script configura el bucket de Supabase Storage para subir archivos de incapacidades.

**Cómo ejecutar:**
1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu proyecto
2. Ve a **SQL Editor** → **New Query**
3. Abre el archivo `database/migrations/setup-storage.sql`
4. Copia TODO el contenido
5. Pégalo en el SQL Editor
6. Haz clic en **Run** o presiona `Ctrl+Enter`

**Verificación:**
- Ve a **Storage** en el menú lateral
- Deberías ver el bucket `disabilities` en la lista
- Debe estar marcado como **Public**

---

### Paso 2: Actualizar Schema Principal (OPCIONAL pero recomendado)

**Archivo:** `database/01-setup.sql`

Este script asegura que todas las tablas, índices, funciones y políticas estén actualizadas.

**Cómo ejecutar:**
1. Ve a **SQL Editor** → **New Query**
2. Abre el archivo `database/01-setup.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run** o presiona `Ctrl+Enter`

**⚠️ Es seguro ejecutarlo en bases de datos existentes:**
- Solo crea lo que falta
- No elimina datos existentes
- Actualiza funciones y vistas sin perder datos
- Maneja políticas RLS de forma segura

---

## ✅ Checklist Post-Migración

Después de ejecutar los scripts, verifica:

- [ ] El bucket `disabilities` existe en Storage
- [ ] El bucket está marcado como **Public**
- [ ] Las políticas de Storage están creadas (4 políticas)
- [ ] La tabla `employee_disabilities` existe
- [ ] Puedes subir un archivo de prueba desde la aplicación

---

## 🔧 Variables de Entorno Necesarias

Asegúrate de tener configuradas estas variables en producción:

```env
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=tu-api-key-publica
ENV_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key (RECOMENDADO para subida de archivos)
```

**Nota:** El Service Role Key es más confiable para subir archivos. Lo encuentras en:
Supabase Dashboard → Settings → API → service_role (secret)

---

## 🐛 Solución de Problemas

### Error: "Bucket not found"
- Verifica que ejecutaste `setup-storage.sql`
- Ve a Storage y verifica que el bucket `disabilities` existe

### Error: "new row violates row-level security policy"
- Verifica que las políticas de Storage están creadas
- Revisa que la política de INSERT permite `anon` o `authenticated`

### Error: "relation already exists"
- Es normal, significa que algunas tablas ya existen
- El script usa `IF NOT EXISTS`, así que no hay problema

---

## 📝 Notas

- Los scripts son **idempotentes** (puedes ejecutarlos múltiples veces sin problemas)
- No se eliminan datos existentes
- Solo se crea/actualiza lo necesario
- Si tienes dudas, ejecuta primero en un ambiente de prueba

