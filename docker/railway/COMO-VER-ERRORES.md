# 🔍 Cómo Ver Qué No Funciona en el Website

## 🎯 Panel de Diagnóstico en Tiempo Real

He creado un **Panel de Diagnóstico** que muestra todos los errores en tiempo real directamente en el navegador.

### 📍 Cómo Abrir el Panel

**Método 1: Atajo de Teclado**

- Presiona **`Ctrl + Shift + D`** en cualquier momento
- El panel aparecerá en la esquina inferior derecha

**Método 2: Desde el Código**

- El panel se abre automáticamente cuando hay errores críticos
- También puedes abrirlo programáticamente desde la consola del navegador

---

## 📊 Qué Muestra el Panel

El panel muestra:

### 1. **Errores HTTP** (rojo)

- Errores de conexión al backend
- Errores 404, 500, 502, etc.
- URLs que fallan
- Status codes

### 2. **Errores de Consola** (amarillo)

- Errores de JavaScript
- Warnings importantes
- Errores no capturados

### 3. **Errores de Red** (rojo)

- Conexiones fallidas
- Timeouts
- Problemas de CORS

### 4. **Errores de Auth0** (amarillo)

- Problemas de autenticación
- Errores de configuración
- Callback errors

### 5. **Errores de Supabase** (azul)

- Errores de conexión a Supabase
- Errores 401/403 (autenticación)
- Problemas con las queries

---

## 🔧 Funcionalidades del Panel

### Botones Disponibles:

1. **🔄 Refresh (Verificar Servicios)**

   - Verifica el estado de:
     - Supabase
     - Backend
     - Auth0
   - Muestra ✅ o ❌ para cada servicio

2. **🗑️ Trash (Limpiar Errores)**

   - Limpia todos los errores registrados
   - Útil después de corregir problemas

3. **❌ Close (Cerrar)**
   - Cierra el panel
   - También puedes usar `Ctrl + Shift + D` de nuevo

---

## 📋 Información que Muestra Cada Error

Para cada error verás:

- **Tipo**: HTTP, Console, Network, Auth, Supabase
- **Hora**: Timestamp exacto del error
- **Mensaje**: Descripción del error
- **URL**: (si aplica) La URL que falló
- **Status Code**: (si aplica) Código HTTP
- **Detalles**: Información adicional (click en "Ver detalles")

---

## 🎯 Casos de Uso

### Caso 1: "No cargan las sucursales en el reloj de marcación"

1. Abre el panel con `Ctrl + Shift + D`
2. Busca errores de tipo **Supabase** o **HTTP**
3. Revisa la URL que falla
4. Verifica el mensaje de error
5. Usa el botón "Verificar Servicios" para ver si Supabase está conectado

### Caso 2: "No cargan los empleados"

1. Abre el panel
2. Busca errores relacionados con `/rest/v1/employees`
3. Revisa si es un error 401 (autenticación) o 500 (servidor)
4. Verifica los detalles del error

### Caso 3: "La página no carga nada"

1. Abre el panel
2. Revisa TODOS los errores
3. Busca errores de **Network** (conexión fallida)
4. Verifica si el backend está respondiendo

---

## 🔍 Verificación Rápida de Servicios

El panel puede verificar automáticamente:

1. **Supabase**: Intenta conectar a la API
2. **Backend**: Verifica el endpoint `/api/health`
3. **Auth0**: Verifica que las variables estén configuradas

**Cómo usar:**

- Click en el botón **🔄 Refresh**
- Espera unos segundos
- Verás ✅ o ❌ para cada servicio

---

## 📱 Ubicación del Panel

El panel aparece en:

- **Esquina inferior derecha** de la pantalla
- **Siempre visible** cuando está abierto (z-index alto)
- **Responsive**: Se adapta al tamaño de la pantalla

---

## 🎨 Colores del Panel

- **Rojo**: Errores críticos (HTTP, Network)
- **Amarillo**: Warnings (Console, Auth)
- **Azul**: Información (Supabase)

---

## 💡 Tips

1. **Mantén el panel abierto** mientras pruebas la aplicación
2. **Revisa los errores más recientes** primero (están arriba)
3. **Usa "Ver detalles"** para información técnica completa
4. **Limpia los errores** después de corregir problemas para ver solo los nuevos

---

## 🆘 Si el Panel No Aparece

1. **Verifica que estés en la aplicación desplegada**

   - El panel solo funciona en la aplicación Angular
   - No funciona en páginas estáticas

2. **Verifica la consola del navegador (F12)**

   - Busca errores de JavaScript
   - El panel puede no cargar si hay errores críticos

3. **Intenta recargar la página**
   - Presiona F5
   - Luego intenta `Ctrl + Shift + D` de nuevo

---

## 📝 Ejemplo de Uso

```
1. Abres la aplicación en Railway
2. Presionas Ctrl + Shift + D
3. El panel aparece mostrando:
   - "HTTP 401: Error de autenticación" → Supabase
   - "Network Error: No se pudo conectar" → Backend
4. Click en "Verificar Servicios"
5. Ves que Supabase está ❌ (no conecta)
6. Revisas las variables de entorno en Railway
7. Corriges ENV_SUPABASE_ANON_KEY
8. Recargas la página
9. El panel ahora muestra menos errores
```

---

## 🔗 Relacionado

- `docker/railway/TROUBLESHOOTING.md` - Guía completa de troubleshooting
- `docker/railway/DIAGNOSTICO-RAPIDO.md` - Diagnóstico rápido
- `docker/railway/PASO-7-VERIFICACION.md` - Checklist de verificación

---

**Última actualización:** 2025-12-17
