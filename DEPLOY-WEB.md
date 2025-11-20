# 🌐 Guía: Hacer la Aplicación Accesible desde la Web

## 📋 Resumen

Para hacer tu aplicación Angular accesible desde internet necesitas:
1. ✅ Build de producción (ya lo tienes)
2. 🔧 Servidor web (Nginx recomendado)
3. 🔄 Proceso manager (PM2)
4. 🔒 SSL/HTTPS (Let's Encrypt)
5. 🌍 Dominio configurado

---

## 🚀 Opción 1: Configuración Completa con Nginx + PM2

### Paso 1: Instalar Nginx

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Paso 2: Instalar PM2 (si no lo tienes)

```bash
npm install -g pm2
pm2 startup
# Sigue las instrucciones que aparecen
```

### Paso 3: Configurar PM2 para tu aplicación

```bash
cd /var/www/People

# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'people-app',
    script: 'server.ts',
    interpreter: 'tsx',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# O si usas el build estático, servir con un servidor simple:
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'people-app',
    script: 'npx',
    args: 'serve dist/people -s -l 3000',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
};
EOF
```

### Paso 4: Iniciar con PM2

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Paso 5: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/people
```

Pega esta configuración (ajusta `tu-dominio.com`):

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /var/www/People/dist/people/browser;
    index index.html;

    # Logs
    access_log /var/log/nginx/people-access.log;
    error_log /var/log/nginx/people-error.log;

    # Configuración para Angular (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API si usas un servidor Node
    # location /api {
    #     proxy_pass http://localhost:3000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    #     proxy_cache_bypass $http_upgrade;
    # }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Habilitar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/people /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl reload nginx
```

---

## 🔒 Paso 6: Configurar SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Sigue las instrucciones. El certificado se renovará automáticamente.

---

## 🚀 Opción 2: Servir Solo el Build Estático (Más Simple)

Si tu aplicación Angular es completamente estática (sin servidor Node):

### Paso 1: Verificar que el build esté completo

```bash
cd /var/www/People
ls -la dist/people/browser/
# Deberías ver index.html y otros archivos
```

### Paso 2: Configurar Nginx (más simple)

```bash
sudo nano /etc/nginx/sites-available/people
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /var/www/People/dist/people/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/people /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔧 Opción 3: Usar PM2 Serve (Rápido para pruebas)

```bash
npm install -g pm2
cd /var/www/People
pm2 serve dist/people/browser 3000 --spa --name people-app
pm2 save
```

Luego configura Nginx para hacer proxy a `http://localhost:3000`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ Verificación

1. **Verifica que Nginx esté corriendo:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Verifica que PM2 esté corriendo:**
   ```bash
   pm2 status
   pm2 logs
   ```

3. **Prueba localmente:**
   ```bash
   curl http://localhost
   ```

4. **Prueba desde tu navegador:**
   - Abre `http://tu-dominio.com` o `http://tu-ip-del-vps`

---

## 🐛 Solución de Problemas

### Error 502 Bad Gateway
- Verifica que PM2 esté corriendo: `pm2 status`
- Verifica que la aplicación esté escuchando en el puerto correcto
- Revisa logs: `pm2 logs` y `sudo tail -f /var/log/nginx/error.log`

### Error 404 Not Found
- Verifica la ruta del build: `ls -la dist/people/browser/`
- Verifica que `index.html` exista
- Revisa la configuración de Nginx

### La aplicación carga pero no funciona
- Verifica las variables de entorno
- Revisa la consola del navegador (F12)
- Verifica que las APIs estén accesibles

### No puedo acceder desde internet
- Verifica el firewall: `sudo ufw status`
- Abre el puerto 80: `sudo ufw allow 80`
- Abre el puerto 443 (para HTTPS): `sudo ufw allow 443`
- Verifica que tu proveedor de VPS permita tráfico HTTP/HTTPS

---

## 📝 Comandos Útiles

```bash
# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Ver logs de PM2
pm2 logs people-app
pm2 logs --lines 100

# Reiniciar servicios
sudo systemctl restart nginx
pm2 restart people-app

# Verificar configuración
sudo nginx -t
pm2 status

# Ver procesos
ps aux | grep nginx
ps aux | grep node
```

---

## 🔄 Actualizar la Aplicación

Cuando hagas cambios:

```bash
cd /var/www/People
git pull origin testDA
npm install --legacy-peer-deps
npm run build
pm2 restart people-app
# O si usas Nginx directamente:
sudo systemctl reload nginx
```

---

## 🌍 Configurar Dominio

1. **En tu proveedor de DNS**, agrega un registro A:
   ```
   Tipo: A
   Nombre: @ (o www)
   Valor: IP-de-tu-VPS
   TTL: 3600
   ```

2. **Espera a que se propague** (puede tardar unos minutos a horas)

3. **Verifica con:**
   ```bash
   dig tu-dominio.com
   # O
   nslookup tu-dominio.com
   ```

---

## 📚 Recursos

- [Documentación de Nginx](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

