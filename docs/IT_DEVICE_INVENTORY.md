# Módulo de IT - Inventario de Dispositivos

Este módulo permite gestionar el inventario de dispositivos IT de la empresa, incluyendo laptops, celulares, equipos de escritorio y accesorios.

## Características

- **Gestión de dispositivos**: Crear, editar y eliminar dispositivos del inventario
- **Asignaciones**: Asignar dispositivos a empleados con fecha de entrega
- **Confirmación del empleado**: Los empleados pueden confirmar la recepción de dispositivos
- **Historial**: Ver historial completo de asignaciones por dispositivo
- **Estados**: Seguimiento de estados (disponible, asignado, mantenimiento, retirado)
- **Responsive**: Interfaz adaptada para escritorio y móvil

## Estructura de Archivos

```
src/app/
├── models.ts                                 # Tipos y modelos (agregados)
├── stores/
│   └── device-inventory.store.ts            # Store para dispositivos y asignaciones
└── dashboard/
    ├── device-inventory.component.ts        # Vista principal del inventario
    ├── device-inventory-form.component.ts   # Formulario de dispositivos
    ├── device-assignment-form.component.ts  # Formulario de asignaciones
    └── dashboard.routes.ts                  # Ruta agregada

database/
└── device_inventory_tables.sql              # Script SQL para Supabase
```

## Tipos de Dispositivos Soportados

- Laptop
- Desktop
- Monitor
- Teclado
- Mouse
- Impresora
- Escáner
- Teléfono
- Tablet
- Audífonos
- Cámara Web
- Otro

## Estados de Dispositivos

| Estado | Descripción |
|--------|-------------|
| Disponible | El dispositivo está listo para asignar |
| Asignado | El dispositivo está asignado a un empleado |
| Mantenimiento | El dispositivo está en reparación/mantenimiento |
| Retirado | El dispositivo ya no está en uso |

## Estados de Asignación

| Estado | Descripción |
|--------|-------------|
| Activo | La asignación está vigente |
| Devuelto | El dispositivo fue devuelto |
| Perdido | El dispositivo fue reportado como perdido |
| Dañado | El dispositivo fue devuelto dañado |

## Configuración de Base de Datos

1. Ejecutar el script SQL en Supabase:
   ```bash
   database/device_inventory_tables.sql
   ```

2. Las tablas creadas son:
   - `devices`: Almacena la información de los dispositivos
   - `device_assignments`: Registra las asignaciones a empleados

## Uso

### Acceder al módulo

Navegar a: `/admin/device-inventory`

### Crear un nuevo dispositivo

1. Click en "Nuevo Dispositivo"
2. Completar la información (nombre, tipo, marca, modelo, serie)
3. Guardar cambios

### Asignar un dispositivo

1. Buscar el dispositivo con estado "Disponible"
2. Click en el botón "Asignar" (icono de usuario+)
3. Seleccionar el empleado
4. Indicar fecha de entrega y accesorios incluidos
5. Guardar

### Devolver un dispositivo

1. Buscar el dispositivo asignado
2. Click en el botón "Devolver" (icono de flecha)
3. Completar información de la devolución
4. Guardar

### Confirmar recepción (como empleado)

1. El empleado puede confirmar la recepción del dispositivo
2. Se registra la fecha de confirmación
3. Se pueden agregar notas del empleado

## Campos de Dispositivo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| name | string | Nombre del dispositivo |
| device_type | enum | Tipo de dispositivo |
| brand | string | Marca |
| model | string | Modelo |
| serial_number | string | Número de serie |
| status | enum | Estado actual |
| purchase_date | date | Fecha de compra |
| warranty_expiry | date | Vencimiento de garantía |
| notes | text | Notas adicionales |

## Campos de Asignación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| device_id | uuid | Referencia al dispositivo |
| employee_id | uuid | Referencia al empleado |
| assigned_by | uuid | Quien realizó la asignación |
| assigned_date | date | Fecha de entrega |
| return_date | date | Fecha de devolución |
| status | enum | Estado de la asignación |
| employee_confirmed | boolean | Si el empleado confirmó |
| employee_confirmed_at | timestamp | Fecha de confirmación |
| accessories_included | text | Accesorios entregados |
| condition_notes | text | Condición del dispositivo |
| employee_notes | text | Notas del empleado |

## Permisos

El módulo sigue las políticas de RLS (Row Level Security) de Supabase:
- Los usuarios solo ven dispositivos de su empresa
- Solo administradores pueden crear/editar/eliminar
- Los empleados pueden ver sus propias asignaciones

## Notas Técnicas

- Los stores usan `withCustomEntities` para operaciones CRUD
- La interfaz es responsive con vista de tabla en desktop y tarjetas en móvil
- Se utiliza PrimeNG para los componentes de UI
- Las fechas se manejan en formato ISO con zona horaria de Panamá
