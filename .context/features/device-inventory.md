---
title: Device Inventory Feature
type: feature
status: production
tags: [feature, it, devices, inventory]
source: docs/IT_DEVICE_INVENTORY.md
last-updated: 2026-02-13
---
# Device Inventory — Inventario IT

## Descripción
Gestión de inventario de dispositivos IT: laptops, celulares, monitores, etc. Con asignación a empleados y confirmación de recepción.

## Ruta
`/admin/device-inventory`

## Componentes
- `device-inventory.component.ts` — Vista principal
- `device-inventory-form.component.ts` — Formulario CRUD
- `device-assignment-form.component.ts` — Asignación a empleado
- Store: `device-inventory.store.ts`

## Estados de Dispositivo
`Disponible` → `Asignado` → `Mantenimiento` / `Retirado`

## Estados de Asignación
`Activo` → `Devuelto` / `Perdido` / `Dañado`

## Tipos Soportados
Laptop, Desktop, Monitor, Teclado, Mouse, Impresora, Escáner, Teléfono, Tablet, Audífonos, Cámara Web, Otro

## Tablas
- `devices` — Información del dispositivo
- `device_assignments` — Asignación dispositivo ↔ empleado
