# Base de Datos Peopletrak - Supabase

Este directorio contiene los scripts SQL para crear y configurar la base de datos de Peopletrak en Supabase.

## 📋 Requisitos Previos

1. **Cuenta de Supabase**: Necesitas tener una cuenta en [Supabase](https://supabase.com)
2. **Proyecto creado**: Debes haber creado un proyecto en Supabase

## 🚀 Pasos para Crear la Base de Datos

### 1. Crear el Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto
4. Anota la URL del proyecto y la API Key

### 2. Ejecutar los Scripts SQL

Ejecuta los scripts en el siguiente orden:

#### a) Crear el Esquema (schema.sql)

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **New Query**
3. Copia y pega el contenido completo del archivo `schema.sql`
4. Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

Este script crea todas las tablas, índices y configuraciones básicas.

#### b) (Opcional) Datos Iniciales (seed.sql)

Si quieres datos de ejemplo para desarrollo:

1. Crea una nueva query en el SQL Editor
2. Copia y pega el contenido de `seed.sql`
3. Ejecuta el script

**⚠️ Solo para desarrollo/testing, no ejecutar en producción.**

#### c) (Recomendado) Políticas de Seguridad (rls-policies.sql)

Para configurar políticas de seguridad más específicas:

1. Crea una nueva query en el SQL Editor
2. Copia y pega el contenido de `rls-policies.sql`
3. Ejecuta el script

Este script reemplaza las políticas básicas con políticas más granulares basadas en roles.

### 3. Configurar Variables de Entorno

Después de crear las tablas, configura las siguientes variables de entorno en tu aplicación:

```env
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=tu-api-key-publica
ENV_SUPABASE_TOKEN=tu-service-role-key (opcional, para operaciones administrativas)
```

### 4. Configurar Autenticación con Auth0

La aplicación usa Auth0 para autenticación. Necesitas:

1. Crear una cuenta en [Auth0](https://auth0.com)
2. Crear una aplicación
3. Configurar las variables de entorno:

```env
ENV_AUTH0_DOMAIN=tu-dominio.auth0.com
ENV_AUTH0_CLIENT_ID=tu-client-id
ENV_AUTH0_AUDIENCE=tu-api-audience
ENV_APP_URL=http://localhost:4200
```

## 📁 Archivos en este Directorio

- **schema.sql** - Script principal que crea todas las tablas, índices y configuraciones básicas
- **seed.sql** - Datos iniciales para desarrollo/testing (opcional)
- **rls-policies.sql** - Políticas de seguridad avanzadas basadas en roles (recomendado)
- **README.md** - Esta documentación

## 📊 Estructura de la Base de Datos

### Tablas Principales

- **companies** - Compañías/empresas
- **branches** - Sucursales
- **departments** - Departamentos
- **positions** - Posiciones/cargos
- **employees** - Empleados
- **schedules** - Horarios de trabajo
- **employee_schedules** - Asignación de horarios
- **timelogs** - Registros de asistencia
- **attendance_sheets** - Hojas de asistencia calculadas
- **payrolls** - Nóminas
- **payroll_payments** - Pagos de nómina
- **payroll_debts** - Deudas de empleados

## 🔒 Seguridad (RLS)

El script habilita Row Level Security (RLS) en todas las tablas. Las políticas básicas permiten acceso a usuarios autenticados.

**⚠️ IMPORTANTE**: En producción, debes crear políticas más específicas basadas en roles de usuario y permisos.

### Ejemplo de Política Más Específica

```sql
-- Solo permitir que los empleados vean sus propios registros
CREATE POLICY "Employees can view own timelogs" ON timelogs
    FOR SELECT USING (
        auth.uid()::text = (
            SELECT work_email FROM employees WHERE id = timelogs.employee_id
        )
    );
```

## 🔧 Mantenimiento

### Backup

Supabase realiza backups automáticos, pero puedes crear backups manuales desde el dashboard.

### Migraciones

Para cambios futuros en el esquema:

1. Crea un nuevo archivo SQL con los cambios
2. Ejecuta el script en el SQL Editor
3. Documenta los cambios

## 📝 Notas Importantes

1. **UUIDs**: Todas las tablas usan UUID como ID primario
2. **Timestamps**: Se usan `TIMESTAMP WITH TIME ZONE` para manejar zonas horarias
3. **Constraints**: Hay validaciones de datos (CHECK constraints) en varios campos
4. **Foreign Keys**: Las relaciones están definidas con foreign keys para integridad referencial
5. **Índices**: Se crean índices en campos frecuentemente consultados para mejorar rendimiento

## 🐛 Troubleshooting

### Error: "extension uuid-ossp does not exist"

Si obtienes este error, ejecuta primero:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error de permisos en RLS

Si tienes problemas con las políticas RLS, puedes temporalmente deshabilitarlas:

```sql
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
```

**⚠️ Solo para desarrollo, nunca en producción sin políticas adecuadas.**

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL UUID](https://www.postgresql.org/docs/current/uuid-ossp.html)

