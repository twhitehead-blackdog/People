# 📧 Configuración de Postmark para Envío de Emails

## 🚀 ¿Por qué Postmark?

Postmark es un servicio de envío de emails confiable y profesional que ofrece:

- ✅ **Alta deliverabilidad** (99.9% uptime garantizado)
- ✅ **Excelente reputación** (whitelist en proveedores principales)
- ✅ **SMTP confiable** (sin límites de envío)
- ✅ **Soporte técnico** excepcional
- ✅ **Precios transparentes** (sin costos ocultos)

## 📋 Requisitos Previos

1. **Cuenta en Postmark**: Regístrate en [https://postmarkapp.com](https://postmarkapp.com)
2. **Dominio verificado**: Verifica tu dominio en Postmark
3. **Server API Token**: Obtén tu token desde el dashboard

## ⚙️ Configuración en Railway

### Variables de Entorno Requeridas

Agrega estas variables en tu servicio backend de Railway:

```bash
ENV_POSTMARK_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ENV_POSTMARK_FROM_EMAIL=noreply@tu-dominio.com
ENV_POSTMARK_FROM_NAME=People - RRHH
```

**Opcional:**
```bash
ENV_POSTMARK_SMTP_PORT=587  # Puerto alternativo (por defecto prueba 587 y 2525)
```

### ¿Dónde obtener los valores?

#### 1. Server API Token
1. Ve a [https://account.postmarkapp.com](https://account.postmarkapp.com)
2. Selecciona tu Server
3. Ve a **API Tokens** en el menú lateral
4. Copia el **Server API Token**

#### 2. From Email
- Debe ser una dirección verificada en tu dominio
- Ejemplo: `noreply@tudominio.com`, `rrhh@tudominio.com`
- **Importante**: El dominio debe estar verificado en Postmark

#### 3. From Name
- Nombre que aparecerá como remitente
- Ejemplo: `People - RRHH`, `Recursos Humanos`

## 🔧 Configuración Técnica

El sistema automáticamente configura SMTP con estos parámetros:

- **Host**: `smtp.postmarkapp.com`
- **Puertos**: 587 (TLS) o 2525 (alternativo)
- **Seguridad**: STARTTLS
- **Autenticación**: Server API Token (usuario y contraseña)

## 🧪 Verificación de Configuración

### 1. Verificar Variables en Railway
1. Ve a tu proyecto en Railway
2. Selecciona el servicio backend
3. Ve a **Variables**
4. Confirma que todas las variables `ENV_POSTMARK_*` estén presentes

### 2. Verificar Configuración
Verifica qué proveedor está configurado:

```bash
curl https://tu-backend.railway.app/api/email/config
```

Respuesta esperada cuando Postmark está configurado:
```json
{
  "provider": "postmark",
  "host": "smtp.postmarkapp.com",
  "port": 587,
  "user": "(Postmark Server API Token)",
  "senderEmail": "noreply@tu-dominio.com",
  "senderName": "People - RRHH",
  "configured": true,
  "priorities": {
    "resend": false,
    "postmark": true,
    "smtp": false
  }
}
```

### 3. Probar Envío
Usa el endpoint de prueba incluido (ahora soporta Postmark):

```bash
curl -X POST https://tu-backend.railway.app/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "tu-email@ejemplo.com"}'
```

### 4. Verificar Logs
Los logs mostrarán:
- ✅ `✅ Usando Postmark para envío de email`
- ✅ `✅ Email enviado via Postmark SMTP`
- ✅ `✅ Email de prueba enviado via Postmark`

## 🚨 Solución de Problemas

### Error: "Error de autenticación"
**Causa**: Server API Token incorrecto
**Solución**: Verifica que el token sea correcto en Postmark Dashboard

### Error: "No se pudo conectar al servidor SMTP"
**Causa**: Problemas de red o firewall
**Solución**: Verifica la conectividad desde Railway

### Error: "From email not verified"
**Causa**: El dominio del email remitente no está verificado
**Solución**: Verifica el dominio en Postmark o usa un email de un dominio verificado

## 📊 Monitoreo

### Dashboard de Postmark
- Ve a [https://account.postmarkapp.com](https://account.postmarkapp.com)
- Revisa **Activity** para ver envíos
- Monitorea **Bounce & Complaint** rates

### Logs de Railway
- Los envíos exitosos se loguean como: `✅ Email enviado via Postmark SMTP`
- Los errores se loguean como: `❌ Error con Postmark SMTP`

## 🎯 Recomendaciones

1. **Usa dominios verificados** para máxima deliverabilidad
2. **Configura SPF/DKIM/DMARC** en tu dominio
3. **Monitorea regularmente** las estadísticas de envío
4. **Mantén actualizado** el Server API Token
5. **Usa direcciones noreply@** para emails del sistema

## 🔄 Migración desde otros proveedores

Si migras desde Gmail, SMTP genérico u otro proveedor:

1. **Mantén las variables antiguas** temporalmente
2. **Configura Postmark** como se indica arriba
3. **Prueba exhaustivamente** antes de remover configuración antigua
4. **Actualiza dominios** si es necesario

El sistema automáticamente **prioriza Postmark** sobre otros proveedores cuando está configurado.