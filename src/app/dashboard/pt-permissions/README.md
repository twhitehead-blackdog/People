# Sistema de Permisos Frontend

Este módulo permite controlar el acceso a las diferentes secciones del frontend por cargo y usuario.

## Estructura

### Módulos del Sistema

Los módulos están definidos en `module-permissions.types.ts`:

| Módulo | ID | Descripción |
|--------|-----|-------------|
| Administración | `admin` | Gestión de empleados, empresas, departamentos, etc. |
| Gestión de Tiempo | `time_management` | Horarios, turnos, marcaciones |
| Nómina | `payroll` | Planillas, acreedores, bancos |
| Recursos Humanos | `hr` | Dashboard de tiempo, incapacidades |
| Evaluación 360° | `performance` | Evaluaciones de desempeño |
| Gestión de Sucursal | `branch_manager` | Panel para gerentes de sucursal |
| Portal del Empleado | `employee_portal` | Acceso al portal de empleados |
| Reloj Checador | `timeclock` | Marcado de asistencia |

### Submódulos

Cada módulo contiene submódulos que representan páginas específicas:

```typescript
// Ejemplo: Módulo Admin
admin: {
  employees,        // Lista de empleados
  organigrama,      // Vista jerárquica
  companies,        // Empresas
  departments,      // Departamentos
  positions,        // Cargos
  branches,         // Sucursales
  settings,         // Configuración
  user_management,  // Gestión de usuarios
  permissions,      // Permisos (este módulo)
  complaints,       // Quejas
  job_applications, // Postulaciones
  audit_tasks       // Auditoría
}
```

## Uso

### 1. Acceder a la Gestión de Permisos

Navegar a: `/dashboard/admin/permissions`

### 2. Vistas Disponibles

- **Por Persona**: Lista todos los empleados activos con sus permisos
- **Por Módulo**: Muestra todos los módulos del sistema y qué cargos tienen acceso

### 3. Editar Permisos

1. Hacer clic en el botón de edición (lápiz) de un empleado
2. Se abre un diálogo con dos pestañas:
   - **Permisos del Sistema**: Permisos legacy (admin, schedule_admin, etc.)
   - **Acceso al Frontend**: Control de módulos y submódulos

### 4. Configuración de Permisos Frontend

- Toggle "Acceso Total": Habilita/deshabilita todos los módulos
- Cada módulo tiene su propio switch para activarlo/desactivarlo
- Dentro de cada módulo se pueden activar/desactivar submódulos individualmente

## Implementación Técnica

### Base de Datos

La tabla `positions` tiene un nuevo campo `frontend_permissions` (JSONB) que almacena:

```json
{
  "version": 1,
  "modules": {
    "admin": {
      "enabled": true,
      "subModules": {
        "employees": true,
        "organigrama": true,
        ...
      }
    },
    ...
  }
}
```

### Guards

Se agregaron nuevos guards para proteger rutas:

```typescript
// Guard legacy (existente)
permissionGuard('admin')

// Guard por módulo (nuevo)
modulePermissionGuard('admin', 'employees')
modulePermissionGuard('time_management') // cualquier submódulo

// Guard combinado (transición)
combinedPermissionGuard('admin', 'admin', 'employees')
```

### Servicio

El `PermissionsService` ahora incluye métodos para verificar acceso:

```typescript
// Verificar acceso a submódulo específico
permissions.canAccessSubModule('admin', 'employees')

// Verificar acceso a módulo completo
permissions.canAccessModule('time_management')

// Obtener permisos del usuario actual
permissions.getCurrentUserFrontendPermissions()

// Obtener lista de submódulos permitidos
permissions.getCurrentUserAllowedSubModules()
```

## Migración

Para aplicar la migración de base de datos:

```bash
# Ejecutar el archivo SQL en Supabase
/database/migrations/20250206_add_frontend_permissions.sql
```

La migración:
1. Agrega la columna `frontend_permissions` a la tabla `positions`
2. Genera permisos por defecto basados en los permisos existentes (admin, schedule_admin, etc.)
3. Los administradores obtienen acceso completo
4. Los schedule_admin obtienen acceso a gestión de tiempo
5. Los demás obtienen acceso básico al portal

## Notas

- Los permisos se guardan a nivel de **cargo** (position), no de empleado individual
- Los cambios afectan a **todos los usuarios** con ese cargo
- Los usuarios de soporte (`isSupportUser`) siempre tienen acceso completo
- Si un módulo está desactivado, todos sus submódulos quedan inaccesibles
