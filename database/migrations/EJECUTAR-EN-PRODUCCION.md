# 🚀 EJECUTAR ESTO EN SUPABASE PRODUCCIÓN

## ⚠️ IMPORTANTE

**Las migraciones NO se aplican automáticamente.** Debes ejecutarlas manualmente en Supabase.

---

## 📋 Pasos Exactos (5 minutos)

### 1️⃣ Abrir Supabase Dashboard

- Ve a: https://supabase.com/dashboard/project/fsrptlzaqjkcutoiivjr
- Si no tienes acceso, usa el link desde tu panel de Railway

### 2️⃣ Ir al SQL Editor

- En el menú lateral izquierdo, busca **"SQL Editor"**
- Haz clic en **"New query"** (botón verde)

### 3️⃣ Copiar el SQL

- Abre el archivo: `database/migrations/EJECUTAR-PRIMERO-branch-manager-gestiones.sql`
- Selecciona **TODO** el contenido (Ctrl+A)
- Copia (Ctrl+C)

### 4️⃣ Pegar y Ejecutar

- Pega el SQL en el editor de Supabase (Ctrl+V)
- Haz clic en **"Run"** (o presiona Ctrl+Enter)
- Espera unos segundos...

### 5️⃣ Verificar Éxito

Deberías ver:

```
Success. No rows returned
```

Si ves errores de "already exists", **es normal**, ignóralos y continúa.

### 6️⃣ Recargar Railway

- Ve a tu aplicación en Railway
- Recarga la página (F5)
- Los errores deben desaparecer

---

## 🧪 Verificar que Funcionó

Ejecuta esto en el SQL Editor para confirmar:

```sql
-- Verificar que employee_vacations existe
SELECT COUNT(*) FROM employee_vacations;

-- Verificar que created_by existe en employee_disabilities
SELECT created_by FROM employee_disabilities LIMIT 1;

-- Verificar que created_by existe en document_requests
SELECT created_by FROM document_requests LIMIT 1;
```

Si todas estas queries funcionan sin error, **¡está listo!** ✅

---

## ❓ Preguntas Frecuentes

### ¿Por qué no se aplicó automáticamente?

Las migraciones SQL deben ejecutarse manualmente en Supabase. No hay deploy automático de SQL.

### ¿Es seguro ejecutar esto?

Sí, 100% seguro. El script usa:

- `CREATE TABLE IF NOT EXISTS` (no sobrescribe datos)
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` (no borra columnas)
- Es **idempotente**: puedes ejecutarlo múltiples veces

### ¿Qué hace exactamente?

1. Crea la tabla `employee_vacations` (para solicitudes de vacaciones)
2. Agrega la columna `created_by` a `employee_disabilities` y `document_requests`
3. Crea índices para mejorar el rendimiento
4. Configura políticas RLS para seguridad

---

## 🆘 Si Tienes Errores

### Error: "permission denied"

- Asegúrate de estar logueado con una cuenta que tenga permisos de admin
- O usa el Service Role Key en la configuración

### Error: "relation already exists"

- ✅ **Es normal**, significa que ya existe. Ignóralo y continúa.

### Sigue sin funcionar después de ejecutar

1. Verifica en el SQL Editor que las columnas existen (usa las queries de arriba)
2. Limpia la caché del navegador (Ctrl+Shift+R)
3. Verifica que Railway esté usando el branch correcto (`Refactorizacion1.1`)

---

## 📞 Siguiente Paso

Después de ejecutar las migraciones, la funcionalidad de "Gestiones" del Branch Manager debería funcionar al 100%.
