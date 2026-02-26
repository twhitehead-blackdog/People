# 📊 Cómo Exportar Solo la Estructura (Sin Datos)

## 🎯 Objetivo

Exportar la estructura completa de la base de datos **PPT DEMO** (versión 2.0) para compararla con **peopletrak** (producción) y aplicar solo los cambios necesarios.

## 📋 Métodos Disponibles

### Método 1: Usando Supabase Dashboard (Recomendado)

#### Paso 1: Acceder a Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona el proyecto **PPT DEMO** (tu base de datos de desarrollo)

#### Paso 2: Usar SQL Editor para Exportar

1. Ve a **SQL Editor** → **New Query**
2. Copia y pega el contenido de `export-schema-only.sql`
3. Ejecuta el script
4. **Copia todos los resultados** de cada consulta
5. Guárdalos en un archivo de texto o documento

#### Paso 3: Comparar con Producción

1. Cambia al proyecto **peopletrak** (producción)
2. Ejecuta `compare-schemas.sql` en el SQL Editor
3. Compara los resultados con los de PPT DEMO

---

### Método 2: Usando pg_dump (Línea de Comandos)

Si tienes acceso a la línea de comandos y `pg_dump` instalado:

```bash
# Exportar solo estructura (sin datos)
pg_dump \
  --host=db.xxxxx.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=schema-export.sql
```

**Obtener credenciales:**
1. Supabase Dashboard → Settings → Database
2. Busca "Connection string" o "Connection pooling"
3. Usa las credenciales de "Direct connection"

---

### Método 3: Usando Supabase CLI

Si tienes Supabase CLI instalado:

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref tu-project-ref

# Exportar solo estructura
supabase db dump --schema-only -f schema-export.sql
```

---

## 📝 Qué Incluye la Exportación

El script `export-schema-only.sql` genera información sobre:

1. ✅ **Tablas** - Lista de todas las tablas
2. ✅ **Columnas** - Estructura completa de cada tabla
3. ✅ **Foreign Keys** - Relaciones entre tablas
4. ✅ **Índices** - Todos los índices creados
5. ✅ **Constraints** - Restricciones CHECK
6. ✅ **Funciones** - Funciones almacenadas
7. ✅ **Triggers** - Triggers configurados
8. ✅ **Views** - Vistas creadas
9. ✅ **RLS Policies** - Políticas de seguridad
10. ✅ **Comentarios** - Comentarios en columnas
11. ✅ **Extensiones** - Extensiones habilitadas

## 🔍 Comparación Rápida

Para una comparación rápida, usa `compare-schemas.sql` que se enfoca en:

- ✅ Tablas principales
- ✅ Campos nuevos de v2.0 (`rejection_comment`, `work_email`)
- ✅ Settings de feria (`job_fair_start_date`, `job_fair_end_date`)
- ✅ Índices importantes
- ✅ Funciones y triggers

## 📊 Ejemplo de Uso

### En PPT DEMO (Desarrollo):

```sql
-- Ejecutar compare-schemas.sql
-- Resultado esperado:
-- ✓ rejection_comment EXISTE
-- ✓ work_email EXISTE
-- ✓ job_fair_start_date EXISTE
-- ✓ job_fair_end_date EXISTE
```

### En peopletrak (Producción):

```sql
-- Ejecutar compare-schemas.sql
-- Resultado esperado (antes de migración):
-- ✗ rejection_comment NO EXISTE
-- ✗ work_email NO EXISTE
-- ✗ job_fair_start_date NO EXISTE
-- ✗ job_fair_end_date NO EXISTE
```

Después de ejecutar `migrate-to-v2.0-production.sql`, los resultados deberían coincidir.

## 🎯 Próximos Pasos

1. **Exportar estructura de PPT DEMO** usando `export-schema-only.sql`
2. **Comparar con peopletrak** usando `compare-schemas.sql`
3. **Identificar diferencias** entre ambas bases de datos
4. **Aplicar migración** usando `migrate-to-v2.0-production.sql`
5. **Verificar** que ambas estructuras coincidan

## 💡 Tips

- 📋 Guarda los resultados en archivos separados para compararlos fácilmente
- 🔍 Usa `compare-schemas.sql` para una comparación rápida
- 📊 Usa `export-schema-only.sql` para un análisis completo
- ✅ Siempre verifica en un ambiente de prueba antes de producción

## ⚠️ Notas Importantes

- Los scripts **NO incluyen datos** (INSERT statements)
- Solo exportan la **estructura** (DDL)
- Son **seguros** de ejecutar, no modifican nada
- Puedes ejecutarlos **múltiples veces** sin problemas

---

**¿Necesitas ayuda?** Compara los resultados y compártelos para identificar qué más falta migrar.

