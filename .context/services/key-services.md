---
title: Key Services
type: service
status: implemented
tags: [service, overview]
last-updated: 2026-02-13
---
# Key Services

Resumen de los 25 servicios restantes en `src/app/services/`.

## Comunicación y Notificaciones

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| EmailService | `email.service.ts` | Envío de emails (verificar settings antes) |
| NotificationsService | `notifications.service.ts` | Notificaciones in-app |
| WassengerService | `wassenger.service.ts` | Envío de WhatsApp via Wassenger API |

## Tiempo y Sincronización

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| TimeSyncService | `time-sync.service.ts` | Sincroniza hora con servidor Supabase |
| ScreenLockService | `screen-lock.service.ts` | Bloqueo de pantalla kiosk |

## Auditoría

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| ScheduleAuditService | `schedule-audit.service.ts` | Auditoría de cambios en horarios |
| ScheduleAutoAssignService | `schedule-auto-assign.service.ts` | Asignación automática de horarios |
| TimeoffAuditService | `timeoff-audit.service.ts` | Auditoría de time offs |
| VetBranchAuditService | `vet-branch-audit.service.ts` | Auditoría asignaciones veterinaria |

## Evaluación

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| Performance360Service | `performance-360.service.ts` | Evaluaciones 360° |

## UI y UX

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| ThemeService | `theme.service.ts` | Temas y dark mode |
| TutorialGuideService | `tutorial-guide.service.ts` | Guías interactivas |
| EmployeePortalNavigationService | `employee-portal-navigation.service.ts` | Navegación del portal |

## Infraestructura

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| LoggerService | `logger.service.ts` | Logs solo en dev (`isDevMode()`) |
| DiagnosticService | `diagnostic.service.ts` | Diagnóstico del sistema |
| DeviceService | `device.service.ts` | Detección de dispositivo |
| IpMonitorService | `ip-monitor.service.ts` | Monitor de IP para validar marcaciones |
| VersionCheckService | `version-check.service.ts` | Verificación de versión |
| TestModeService | `test-mode.service.ts` | Modo de pruebas |
| SupabaseRealtimeService | `supabase-realtime.service.ts` | Suscripciones realtime |

## Otros

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| QrService | `qr.service.ts` | Generación/regeneración de códigos QR |
| UtilService | `util.service.ts` | Utilidades generales |
