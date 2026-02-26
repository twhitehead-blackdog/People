---
title: Branch Manager Feature
type: feature
status: production
tags: [feature, branch-manager, gestiones]
last-updated: 2026-02-13
---
# Branch Manager — Gestión de Sucursal

## Descripción
Vista para gerentes de sucursal. Permite supervisar empleados, gestionar solicitudes (incapacidades, vacaciones, documentos, compensatorios), y administrar asignaciones.

## Componentes

| Componente | Archivo | Líneas |
|-----------|---------|--------|
| branch-manager.component | Vista principal | ~131K |
| branch-manager-gestiones.component | Gestiones | ~83K |

## Funcionalidades
- Supervisión de empleados de la sucursal
- Gestión de incapacidades (con file upload)
- Gestión de vacaciones
- Solicitudes de documentos
- Tiempo compensatorio
- Aprobaciones y rechazos

## Notas
- Estos son de los archivos más grandes del proyecto
- Referencia para el patrón de file upload: ver métodos `onDisabilityFileSelect`, `onVacationFileSelect`
