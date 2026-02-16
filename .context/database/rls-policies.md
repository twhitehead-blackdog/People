---
title: RLS Policies
type: database
status: current
tags: [database, rls, security]
last-updated: 2026-02-13
---
# Row Level Security (RLS)

## Principio
Supabase usa RLS para filtrar datos a nivel de fila. Cada tabla con datos sensibles tiene policies que limitan acceso.

## Patrón General
- Los usuarios solo ven datos de su `company_id`
- Solo admins pueden crear/editar/eliminar
- Los empleados pueden ver solo sus propios datos en el portal

## Storage Policies
El bucket `disabilities` tiene 4 políticas:
1. **SELECT** — Lectura pública (bucket público)
2. **INSERT** — authenticated + anon pueden subir
3. **UPDATE** — authenticated puede actualizar archivos propios
4. **DELETE** — authenticated puede eliminar archivos propios

## Buckets de Storage

| Bucket | Acceso | Uso |
|--------|--------|-----|
| `disabilities` | Public | Certificados médicos |
| `compensatory` | Public | Documentos compensatorio |
| `employee-documents` | Public | Documentos generales |

## Notas
- Al crear nuevas tablas, siempre definir RLS policies
- Usar `ENV_SUPABASE_SERVICE_ROLE_KEY` para operaciones que bypass RLS (storage uploads)
- Ver `database/STORAGE_SETUP.md` para setup detallado de storage
