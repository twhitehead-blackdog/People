---
title: Módulo de Compras (Shopping)
type: feature
status: stable
created: 2026-02-19
tags:
  - frontend
  - shopping
  - employee-portal
  - mock-data
---

# Módulo de Compras (Shopping)

## Descripción General
El módulo de compras permite a los empleados visualizar un catálogo de productos y realizar pedidos directamente desde el portal del empleado. Actualmente, esta funcionalidad opera con **datos simulados (mock data)** para propósitos de demostración y diseño de UI, simulando una integración con una tienda como Shopify.

## Arquitectura

### Componentes Principales

1.  **`EmployeePortalShoppingComponent`** (`src/app/employee-portal/components/employee-portal-shopping.component.ts`)
    *   Vista principal del módulo.
    *   Muestra el banner promocional, la lista de categorías y la cuadrícula de productos populares.
    *   Inyecta `ShoppingService` para obtener los datos.

2.  **`ShoppingProductCardComponent`** (`src/app/employee-portal/components/shopping/shopping-product-card.component.ts`)
    *   Componente reutilizable para visualizar un producto individual.
    *   Muestra imagen, precio, nombre y botón de "Agregar al carrito" (visual).

3.  **`ShoppingService`** (`src/app/employee-portal/services/shopping.service.ts`)
    *   Servicio `providedIn: 'root'`.
    *   Gestiona el estado de los productos y categorías usando Signals.
    *   Contiene la data simulada (mock data).

### Modelo de Datos (Mock)

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category_id: string;
  is_popular?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string; // Clase de PrimeIcons
  color: string; // Clase de Tailwind para color de fondo/texto
}
```

## Estado Actual y Limitaciones
*   **Datos Mock**: No hay conexión real con backend o Shopify API.
*   **Solo Lectura**: Los botones de compra son visuales y no persisten acciones.
*   **Imágenes**: Se utilizan placeholders (`placehold.co`).

## Futuras Mejoras
1.  Conectar con API real de Shopify o Base de Datos interna.
2.  Implementar carrito de compras persistente.
3.  Implementar flujo de checkout o solicitud de descuento por planilla.

## Roadmap para Producción (Lo que falta)

Para que este módulo sea 100% funcional, se requiere implementar:

### 1. Integración de Datos (Backend)
*   **Opción A (Shopify):** Conectar con la API de Shopify para obtener productos reales, precios e inventario en tiempo real.
    *   *Requisitos:* API Key (`X-Shopify-Access-Token`), Domain (`shop.myshopify.com`).
*   **Opción B (Supabase):** Crear tablas `products` y `categories` en la base de datos interna si no se usa Shopify.

### 2. Gestión del Carrito (Cart)
*   Crear `CartStore` o `CartService` para manejar:
    *   Agregar/Remover items.
    *   Calcular totales.
    *   Persistencia (localStorage o DB).
*   UI de "Mi Carrito" (Slide-over o página dedicada).

### 3. Checkout y Pagos
*   **Método de Pago:** Definir si será:
    *   *Descuento por Planilla:* Requiere integración con el módulo de `Payroll`.
    *   *Tarjeta de Crédito:* Requiere pasarela de pagos (o redirigir a Shopify Checkout).
*   **Creación de Orden:** Generar el registro de la orden (`orders` table o Shopify Order).

### 4. Gestión de Pedidos
*   Vista de "Mis Pedidos" para el empleado.
*   Vista de "Administración de Pedidos" para RRHH/Administración.
