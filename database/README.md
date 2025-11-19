# Base de Datos People - Supabase

## 📋 Guía Rápida

### Para una instalación nueva (base de datos vacía):

**Ejecuta SOLO este archivo:**
```
01-setup.sql
```

Este archivo incluye TODO lo necesario:
- ✅ Todas las tablas principales
- ✅ Tablas adicionales (datos personales, portal, quejas)
- ✅ Índices y triggers
- ✅ RLS básico
- ✅ Configuraciones iniciales

### ⚠️ ¿Es seguro ejecutarlo en una base de datos existente?

**SÍ, es seguro.** El script usa:
- `CREATE TABLE IF NOT EXISTS` - Solo crea tablas que no existen
- `CREATE INDEX IF NOT EXISTS` - Solo crea índices que no existen
- `CREATE OR REPLACE FUNCTION` - Actualiza funciones sin perder datos
- `CREATE OR REPLACE VIEW` - Actualiza vistas sin perder datos
- `DROP POLICY IF EXISTS` - Elimina políticas antes de recrearlas (evita errores)
- `INSERT ... ON CONFLICT DO NOTHING` - No duplica datos existentes

**No elimina ni modifica datos existentes**, solo crea lo que falta y actualiza funciones/vistas/políticas.

### Para actualizar una base de datos existente:

Si ya tienes una base de datos y necesitas aplicar cambios específicos, revisa los archivos en `migrations/` según lo que necesites.

---

## 📁 Estructura de Archivos

### Archivos Principales (USAR ESTOS)

- **`01-setup.sql`** ⭐ **USAR ESTE** - Setup completo de la base de datos
- **`02-migrations.sql`** - Migraciones adicionales (solo si ya tienes datos)

### Archivos de Referencia (NO USAR DIRECTAMENTE)

Los siguientes archivos están en `migrations/` solo para referencia histórica:
- `schema.sql` - Versión antigua del schema
- `seed.sql` - Datos de ejemplo (solo desarrollo)
- `rls-policies.sql` - Políticas RLS avanzadas (opcional)
- Otros archivos de migración individuales

---

## 🚀 Instalación Paso a Paso

### 1. Crear el Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto
4. Anota la URL del proyecto y la API Key

### 2. Ejecutar el Setup

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **New Query**
3. Abre el archivo `01-setup.sql`
4. Copia y pega TODO el contenido
5. Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

**¡Listo!** Tu base de datos está configurada.

### 3. Configurar Variables de Entorno

Después de crear las tablas, configura las siguientes variables de entorno en tu aplicación:

```env
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=tu-api-key-publica
ENV_SUPABASE_TOKEN=tu-service-role-key (opcional, para operaciones administrativas)
```

---

## 📊 Estructura de la Base de Datos

### Tablas Principales

- **companies** - Compañías/empresas
- **branches** - Sucursales
- **departments** - Departamentos
- **positions** - Posiciones/cargos
- **organization_chart** - Organigrama (permite múltiples padres)
- **employees** - Empleados
- **schedules** - Horarios de trabajo
- **employee_schedules** - Asignación de horarios
- **timelogs** - Registros de asistencia
- **attendance_sheets** - Hojas de asistencia calculadas
- **payrolls** - Nóminas
- **payroll_payments** - Pagos de nómina
- **payroll_debts** - Deudas de empleados

### Tablas Adicionales

- **emergency_contacts** - Contactos de emergencia
- **employee_documents** - Documentos del empleado
- **employee_notes** - Notas sobre empleados
- **employee_skills** - Habilidades
- **employee_languages** - Idiomas
- **employee_disabilities** - Incapacidades
- **document_requests** - Solicitudes de documentos
- **complaints** - Buzón de quejas
- **complaint_messages** - Mensajes del buzón
- **settings** - Configuraciones del sistema

---

## 🔒 Seguridad (RLS)

El script `01-setup.sql` habilita Row Level Security (RLS) en todas las tablas con políticas básicas que permiten acceso a usuarios autenticados.

**⚠️ IMPORTANTE**: En producción, debes crear políticas más específicas basadas en roles de usuario y permisos.

Para políticas más avanzadas, revisa `migrations/rls-policies.sql` (opcional).

---

## 🐛 Troubleshooting

### Error: "extension uuid-ossp does not exist"

El script `01-setup.sql` ya incluye la creación de esta extensión. Si aún así obtienes el error, ejecuta manualmente:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error de permisos en RLS

Si tienes problemas con las políticas RLS, puedes temporalmente deshabilitarlas (solo desarrollo):

```sql
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
```

**⚠️ Solo para desarrollo, nunca en producción sin políticas adecuadas.**

### Error: "relation already exists"

Si obtienes este error, significa que algunas tablas ya existen. Puedes:
1. Eliminar las tablas existentes y ejecutar `01-setup.sql` de nuevo
2. O usar los scripts de migración individuales en `migrations/`

---

## 📝 Notas Importantes

1. **UUIDs**: Todas las tablas usan UUID como ID primario
2. **Timestamps**: Se usan `TIMESTAMP WITH TIME ZONE` para manejar zonas horarias
3. **Constraints**: Hay validaciones de datos (CHECK constraints) en varios campos
4. **Foreign Keys**: Las relaciones están definidas con foreign keys para integridad referencial
5. **Índices**: Se crean índices en campos frecuentemente consultados para mejorar rendimiento
6. **Múltiples Padres**: La tabla `organization_chart` permite que una posición reporte a múltiples supervisores

---

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL UUID](https://www.postgresql.org/docs/current/uuid-ossp.html)

---

## ❓ ¿Qué archivo usar?

| Situación | Archivo a usar |
|-----------|----------------|
| Base de datos nueva | `01-setup.sql` |
| Ya tienes datos y necesitas cambios específicos | Revisa `migrations/` |
| Solo quieres datos de ejemplo (desarrollo) | `migrations/seed.sql` |
| Quieres políticas RLS avanzadas | `migrations/rls-policies.sql` |

**En caso de duda, usa `01-setup.sql`** - Es el archivo completo y seguro.
