# 📋 Cómo Exportar Funciones y Triggers

## 🎯 Objetivo

Extraer las definiciones completas de funciones y triggers de **PPT DEMO** para recrearlas en **peopletrak** (producción).

## 📝 Pasos

### Paso 1: Ejecutar en PPT DEMO

1. Ve a Supabase Dashboard → Proyecto **PPT DEMO**
2. SQL Editor → New Query
3. Copia y pega el contenido de `export-functions-definitions.sql`
4. Ejecuta el script
5. **Copia TODOS los resultados** (las definiciones completas)

### Paso 2: Crear Script de Migración

1. Crea un nuevo archivo SQL con las definiciones copiadas
2. O pégalas directamente en el SQL Editor de **peopletrak**
3. Ejecuta para crear las funciones/triggers faltantes

## 🔍 Qué Buscar

El script te mostrará:

### Funciones:
- `update_updated_at_column` - Actualiza campo updated_at
- `update_complaint_last_message_at` - Actualiza última fecha de mensaje
- `sync_thread_id_to_messages` - Sincroniza thread_id
- `get_pos_config_names` - Obtiene nombres de configuración POS
- `handle_new_user` - Maneja nuevos usuarios
- `has_pos_access` - Verifica acceso POS

### Triggers:
- Todos los triggers `update_*_updated_at` para mantener timestamps
- `update_complaint_last_message_trigger` - Actualiza última fecha
- `sync_complaint_thread_id` - Sincroniza thread_id

## ⚠️ Nota Importante

Las funciones `get_pos_config_names`, `handle_new_user`, y `has_pos_access` **no están en `01-setup.sql`**, lo que significa que:

1. Fueron agregadas después en una migración personalizada
2. Son específicas de tu implementación
3. Necesitas extraer sus definiciones de PPT DEMO

## 💡 Alternativa Rápida

Si solo quieres verificar qué falta, ejecuta `verify-functions-triggers.sql` en ambas bases de datos y compara los resultados.

