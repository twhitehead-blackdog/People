# Instrucciones para crear las tablas de Adopciones en Supabase

Este archivo contiene las instrucciones para crear las tablas necesarias para el módulo de adopciones en Supabase.

## 📋 Tablas que se crearán

1. **foundations** - Fundaciones y refugios de animales
2. **pets** - Mascotas disponibles para adopción
3. **adoption_applications** - Solicitudes de adopción

## 🚀 Pasos para ejecutar

### Opción 1: Usando el SQL Editor de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Haz clic en **New Query**
4. Copia y pega el contenido completo del archivo `adoptions-schema.sql`
5. Haz clic en **Run** (o presiona `Ctrl+Enter`)
6. Verifica que no haya errores en la consola

### Opción 2: Usando la CLI de Supabase

Si tienes la CLI de Supabase instalada:

```bash
# Asegúrate de estar enlazado a tu proyecto
supabase link --project-ref tu-project-ref

# Ejecuta el archivo SQL
supabase db execute -f supabase/adoptions-schema.sql
```

## ✅ Verificación

Después de ejecutar el SQL, verifica que las tablas se crearon correctamente:

1. Ve a **Table Editor** en Supabase Dashboard
2. Deberías ver las tres nuevas tablas:
   - `foundations`
   - `pets`
   - `adoption_applications`

## 🔒 Seguridad (RLS)

Las políticas de Row Level Security (RLS) están configuradas para:

- **Lectura pública**: Cualquiera puede leer `foundations` y `pets`
- **Escritura con API key**: Se requiere la API key de servicio para insertar/actualizar/eliminar

**⚠️ IMPORTANTE**: En producción, deberías ajustar las políticas RLS según tus necesidades de seguridad. Actualmente están configuradas para permitir acceso con la API key de servicio que envía tu aplicación.

## 📝 Datos de ejemplo (Opcional)

Puedes insertar datos de ejemplo ejecutando este SQL después de crear las tablas:

```sql
-- Insertar una fundación de ejemplo
INSERT INTO public.foundations (name, description, address, phone_number, email, is_active)
VALUES (
  'Fundación Black Dog',
  'Fundación dedicada al rescate y adopción de perros y gatos',
  'Ciudad de Panamá, Panamá',
  '+507 1234-5678',
  'info@blackdogpanama.com',
  true
);

-- Insertar una mascota de ejemplo
INSERT INTO public.pets (
  foundation_id,
  name,
  species,
  breed,
  age,
  gender,
  size,
  color,
  description,
  is_vaccinated,
  is_sterilized,
  is_available
)
SELECT 
  id,
  'Max',
  'dog',
  'Labrador',
  2.5,
  'M',
  'large',
  'Dorado',
  'Perro muy amigable y juguetón, ideal para familias',
  true,
  true,
  true
FROM public.foundations
WHERE name = 'Fundación Black Dog'
LIMIT 1;
```

## 🐛 Solución de problemas

### Error: "relation already exists"
Si las tablas ya existen, puedes:
1. Eliminarlas primero: `DROP TABLE IF EXISTS public.adoption_applications, public.pets, public.foundations CASCADE;`
2. O usar `CREATE TABLE IF NOT EXISTS` (ya incluido en el script)

### Error: "permission denied"
Asegúrate de estar usando una cuenta con permisos de administrador en Supabase.

### Error: "extension uuid-ossp does not exist"
El script intenta crear la extensión automáticamente. Si falla, ejecuta manualmente:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 📚 Recursos adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Row Level Security en Supabase](https://supabase.com/docs/guides/auth/row-level-security)

