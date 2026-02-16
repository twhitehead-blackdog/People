---
title: Migrations Guide
type: database
status: current
tags: [database, migrations, sql]
source: database/migrations/
last-updated: 2026-02-13
---
# Migrations Guide

## Ubicación
`database/migrations/` — 116 archivos SQL

## Archivos Base
- `database/01-setup.sql` — Schema principal (idempotente, seguro de re-ejecutar)
- `database/02-migrations.sql` — Migraciones iniciales

## Convención de Nombres
```
YYYYMMDD_descripcion.sql
# Ejemplo: 20260110_groomer_branch_assignments.sql
```

## Cómo Crear una Migration

1. Crear archivo en `database/migrations/`:
```sql
-- database/migrations/YYYYMMDD_mi_cambio.sql
-- Descripción: Agregar campo X a tabla Y

ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_field type;
```

2. Usar `IF NOT EXISTS` / `IF EXISTS` para idempotencia

3. No eliminar datos existentes

## Cómo Ejecutar

1. Ir a [Supabase Dashboard](https://app.supabase.com)
2. SQL Editor → New Query
3. Copiar contenido del archivo
4. Click **Run**

## ⚠️ Reglas
- Scripts deben ser **idempotentes** (seguros de ejecutar múltiples veces)
- **NO eliminar datos** existentes
- **Hacer backup** antes de ejecutar en producción
- Ejecutar scripts SQL **ANTES** de desplegar código que los requiera
- Ver `database/PRODUCCION-MIGRACION.md` para procedimientos de producción
