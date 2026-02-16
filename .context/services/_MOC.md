---
title: Services MOC
type: moc
status: active
tags: [services, moc]
last-updated: 2026-02-13
---
# Services

28 servicios en `src/app/services/`. Los más importantes:

| Nota | Servicios | Responsabilidad |
|------|----------|-----------------|
| [[api-url-service]] | ApiUrlService | URL builder para Supabase (obligatorio) |
| [[organization-service]] | OrganizationService | Multi-company context |
| [[permissions-service]] | PermissionsService | Permisos y roles |
| [[key-services]] | 25 servicios más | Logger, Email, QR, Realtime, etc. |
