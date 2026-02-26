# 🚀 Guía de Despliegue a Producción

## 📋 Resumen Rápido

1. **Ejecutar script de despliegue** (actualiza código y hace build)
2. **Ejecutar scripts SQL en Supabase** (configura base de datos)
3. **Verificar variables de entorno**
4. **Reiniciar aplicación**

---

## 🔧 Opción 1: Script Automatizado (Recomendado)

### En Windows (PowerShell):

```powershell
.\scripts\deploy-production.ps1
```

### En Linux/Mac:

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

### Opciones del script:

```powershell
# Omitir build (solo actualizar código)
.\scripts\deploy-production.ps1 -SkipBuild

# Omitir actualización de git (solo build)
.\scripts\deploy-production.ps1 -SkipGit

# Ambos
.\scripts\deploy-production.ps1 -SkipBuild -SkipGit
```

---

## 🔧 Opción 2: Manual

### Paso 1: Actualizar código

```bash
cd /ruta/a/tu/proyecto
git pull origin testDA  # O tu rama de producción
```

### Paso 2: Instalar dependencias

```bash
npm install
```

### Paso 3: Build de producción

```bash
npm run build
```

---

## 🗄️ Configurar Base de Datos (OBLIGATORIO)

### ⚠️ IMPORTANTE: Ejecuta estos scripts en tu proyecto de Supabase de PRODUCCIÓN

### Script 1: Storage (OBLIGATORIO)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto de **PRODUCCIÓN**
3. Ve a **SQL Editor** → **New Query**
4. Abre el archivo: `database/migrations/setup-storage.sql`
5. Copia TODO el contenido
6. Pégalo en el SQL Editor
7. Haz clic en **Run** o presiona `Ctrl+Enter` / `Cmd+Enter`

**Verificación:**
- Ve a **Storage** en el menú lateral
- Deberías ver el bucket `disabilities`
- Debe estar marcado como **Public**

### Script 2: Schema Principal (OBLIGATORIO)

1. En el mismo SQL Editor, haz clic en **New Query**
2. Abre el archivo: `database/01-setup.sql`
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run** o presiona `Ctrl+Enter` / `Cmd+Enter`

**Nota:** Este script es seguro, no elimina datos existentes.

---

## 🔐 Variables de Entorno

Asegúrate de tener estas variables configuradas en producción:

```env
ENV_SUPABASE_URL=https://tu-proyecto-produccion.supabase.co
ENV_SUPABASE_API_KEY=tu-api-key-publica-produccion
ENV_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-produccion
```

**⚠️ IMPORTANTE:** `ENV_SUPABASE_SERVICE_ROLE_KEY` es necesario para subir archivos de incapacidades.

**Dónde encontrarlo:**
- Supabase Dashboard → Settings → API → service_role (secret)

---

## 🔄 Reiniciar Aplicación

Depende de cómo tengas configurado tu servidor:

### Con PM2:

```bash
pm2 restart all
# O específico
pm2 restart people-app
```

### Con systemd:

```bash
sudo systemctl restart tu-servicio
```

### Con Docker:

```bash
docker-compose restart
# O
docker restart tu-contenedor
```

### Con Nginx + Node:

```bash
# Reinicia el proceso Node
pm2 restart all
# O reinicia Nginx si es necesario
sudo systemctl restart nginx
```

---

## ✅ Checklist Post-Despliegue

Después de desplegar, verifica:

- [ ] El bucket `disabilities` existe en Supabase Storage
- [ ] El bucket está marcado como **Public**
- [ ] Las políticas de Storage están creadas (4 políticas)
- [ ] La aplicación carga correctamente sin errores
- [ ] Puedes subir un archivo de incapacidad desde la app
- [ ] Los logs no muestran errores relacionados con Storage
- [ ] Las variables de entorno están configuradas correctamente

---

## 🐛 Solución de Problemas

### Error: "Bucket not found"
- Verifica que ejecutaste `setup-storage.sql`
- Ve a Storage y verifica que el bucket `disabilities` existe

### Error: "new row violates row-level security policy"
- Verifica que las políticas de Storage están creadas
- Revisa que la política de INSERT permite `anon` o `authenticated`

### Error: "column does not exist"
- Ejecuta `01-setup.sql` de nuevo (es seguro, solo agrega lo que falta)

### La aplicación no carga
- Verifica las variables de entorno
- Revisa los logs: `pm2 logs` o `docker logs`
- Verifica que el build se completó correctamente

### No puedo subir archivos
- Verifica que `ENV_SUPABASE_SERVICE_ROLE_KEY` está configurado
- Verifica que las políticas de Storage permiten INSERT
- Revisa la consola del navegador para errores específicos

---

## 📝 Notas Importantes

1. **Siempre ejecuta los scripts SQL en PRODUCCIÓN primero** antes de desplegar el código
2. **Los scripts SQL son idempotentes** - puedes ejecutarlos múltiples veces sin problemas
3. **No se eliminan datos existentes** - los scripts solo crean/actualizan lo necesario
4. **Haz backup de tu base de datos** antes de ejecutar scripts en producción (buena práctica)

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs de la aplicación
2. Revisa los logs de Supabase (Dashboard → Logs)
3. Verifica que todos los pasos se completaron correctamente
4. Consulta `database/PRODUCCION-MIGRACION.md` para más detalles

