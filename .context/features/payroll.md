---
title: Payroll Feature
type: feature
status: production
tags: [feature, payroll, deductions, payments]
related: [[payroll-model]], [[employee-model]]
last-updated: 2026-02-13
---
# Payroll — Nómina

## Descripción
Gestión completa de nómina: definición de deducciones, asignación de empleados, períodos de pago, y cálculo de ingresos/deducciones/deudas.

## Componentes

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| payroll.component | General nómina | Vista principal |
| payrolls.component | Lista de nóminas | CRUD nóminas |
| payroll-deductions | Deducciones | ISR, CSS, etc. |
| payroll-employees | Empleados/nómina | Asignación |
| payroll-payments | Períodos de pago | Start/end date |
| payroll-payments-details | Detalle de pago | Items por empleado |
| payroll-debts | Deudas | Préstamos, adelantos |
| payroll-summary | Resumen | Totales y exportación |

## Flujo
```
Crear nómina → Definir deducciones → Asignar empleados
→ Crear período de pago → Calcular detalle por empleado
→ Generar items (ingresos, deducciones, deudas)
→ Marcar como PAID
```

## ⚠️ Precauciones
- **Sistema en producción** — cambios deben ser seguros e incrementales
- No modificar lógica de cálculo sin revisión exhaustiva
- Exportación a Excel depende de la estructura actual de items
