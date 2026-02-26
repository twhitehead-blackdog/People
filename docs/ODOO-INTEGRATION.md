# Integración Odoo 18 (Odoo.sh) – sale.order / Peluquería

El backend expone un endpoint que lee **sale.order** de tu instancia Odoo 18 en Odoo.sh mediante la API JSON-RPC.

## Requisitos en Odoo

- **Plan Custom** (la API externa no está disponible en planes One App Free ni Standard).
- Usuario con contraseña local o **API Key**:
  - **Contraseña:** En Odoo: Ajustes → Usuarios y empresas → Usuarios → [tu usuario] → Acción → Cambiar contraseña.
  - **API Key (recomendado):** Preferencias (tu perfil) → Seguridad de la cuenta → Nueva API Key. Usa la key como `ENV_ODOO_PASSWORD` o `ENV_ODOO_API_KEY`.

## Variables de entorno

En el servidor donde corre el backend (`.env` o variables de entorno) configura:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ENV_ODOO_URL` | URL de la instancia (sin barra final) | `https://tu-proyecto.odoo.com` o `https://xxx.odoo.sh` |
| `ENV_ODOO_DB` | Nombre de la base de datos | En Odoo.sh suele ser el nombre del proyecto |
| `ENV_ODOO_USERNAME` | Login del usuario | `admin@tu-empresa.com` |
| `ENV_ODOO_PASSWORD` o `ENV_ODOO_API_KEY` | Contraseña o API Key del usuario | `tu-password` o la key generada |

## Endpoint

**GET** `/api/odoo/sale-orders`

- **Query params (opcionales):**
  - `date_from`: filtrar órdenes con `date_order >= date_from` (formato `YYYY-MM-DD`).
  - `date_to`: filtrar órdenes con `date_order <= date_to` (formato `YYYY-MM-DD`).
  - `limit`: máximo de registros (default 100, máximo 500).

**Ejemplo:**

```http
GET /api/odoo/sale-orders?date_from=2026-01-01&date_to=2026-02-28&limit=50
```

**Respuesta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "S00123",
      "partner_id": [1, "Cliente Ejemplo"],
      "date_order": "2026-02-01 10:30:00",
      "state": "sale",
      "amount_total": 50.0,
      "amount_untaxed": 45.45,
      "user_id": [2, "Usuario Vendedor"]
    }
  ]
}
```

Los campos devueltos son los estándar de `sale.order`. Si tu **módulo de peluquería** añade campos (ej. sucursal, tipo de servicio, peluquero), se pueden incluir en el backend editando la lista `fields` en `server.ts` (línea ~orden de `sale-orders`) y luego usar esos campos en el frontend.

## Filtrar solo órdenes de peluquería

Si en Odoo tienes un campo o un modelo que identifica ventas de peluquería (por ejemplo un campo `x_tipo` = "peluqueria" o un modelo heredado), puedes:

1. **En el backend:** En `server.ts`, en el endpoint `/api/odoo/sale-orders`, construir el `domain` con ese criterio, por ejemplo:
   - `domain.push(['x_tipo', '=', 'peluqueria']);`  
   o el nombre real del campo/modelo que uses.
2. **Campos extra:** Añadir a `fields` los nombres técnicos de los campos de tu módulo (ej. `x_sucursal_id`, `x_peluquero_id`) para que vengan en la respuesta.

## Consumir desde Angular

Desde tu app People (dashboard, sección Peluquería, etc.) llama al backend, no directamente a Odoo (evitas CORS y no expones credenciales):

```typescript
// Ejemplo: servicio que llama al backend
this.http.get<{ success: boolean; data: SaleOrder[] }>(
  `${this.apiUrl.baseUrl}/api/odoo/sale-orders?limit=50`
).subscribe(res => {
  if (res.success) {
    this.odooOrders.set(res.data);
  }
});
```

Asegúrate de que las peticiones del frontend vayan a la misma base URL que sirve tu backend (ej. `https://prueba.blackdogpanama.com`) para que la ruta `/api/odoo/sale-orders` sea la del Node.
