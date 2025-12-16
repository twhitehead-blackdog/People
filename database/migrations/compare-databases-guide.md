# Guía para Comparar Bases de Datos en Supabase

## Métodos para Comparar Bases de Datos

### Método 1: Usar el Script SQL Incluido

1. Abre el SQL Editor en Supabase
2. Ejecuta las queries del archivo `compare-databases.sql`
3. Copia los resultados de la base de datos ORIGEN
4. Ejecuta las mismas queries en la base de datos DESTINO
5. Compara los resultados

### Método 2: Usar pg_dump (Línea de Comandos)

```bash
# Exportar solo el esquema (estructura) de la base de datos ORIGEN
pg_dump -h db.fsrptlzaqjkcutoiivjr.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        -f schema_origen.sql

# Exportar solo el esquema de la base de datos DESTINO
pg_dump -h db.otro-proyecto.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        -f schema_destino.sql

# Comparar los archivos
diff schema_origen.sql schema_destino.sql
```

### Método 3: Usar pgAdmin

1. Conecta ambas bases de datos en pgAdmin
2. Click derecho en la base de datos → **Compare**
3. Selecciona la base de datos a comparar
4. pgAdmin mostrará las diferencias visualmente

### Método 4: Usar DBeaver

1. Conecta ambas bases de datos en DBeaver
2. Tools → **Compare Databases**
3. Selecciona las dos conexiones
4. DBeaver generará un reporte de diferencias

### Método 5: Usar apgdiff (Herramienta de Línea de Comandos)

```bash
# Instalar apgdiff (requiere Java)
# Windows: Descargar de https://www.apgdiff.com/
# Linux/Mac: brew install apgdiff o apt-get install apgdiff

# Exportar esquemas
pg_dump --schema-only origen > origen.sql
pg_dump --schema-only destino > destino.sql

# Comparar
apgdiff origen.sql destino.sql > diferencias.sql
```

### Método 6: Usar Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Generar migraciones de diferencias
supabase db diff --schema public
```

## Comparaciones Específicas

### Comparar Solo Tablas

```sql
-- En base de datos ORIGEN
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- En base de datos DESTINO (mismo query)
-- Compara las listas
```

### Comparar Solo Columnas de una Tabla

```sql
-- Reemplaza 'employees' con tu tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employees' AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Comparar Solo Índices

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Herramientas Recomendadas

1. **pgAdmin** - Mejor para comparación visual
2. **DBeaver** - Excelente para análisis detallado
3. **apgdiff** - Mejor para generar scripts de migración
4. **Supabase CLI** - Integrado con Supabase

## Tips

- Siempre compara primero el esquema (estructura) antes de comparar datos
- Usa `--schema-only` en pg_dump para evitar comparar datos
- Guarda los resultados en archivos para comparación posterior
- Usa herramientas de diff (como VS Code) para comparar archivos SQL exportados

