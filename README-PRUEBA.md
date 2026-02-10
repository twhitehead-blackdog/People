# People – Versión de prueba

Esta carpeta es una **copia de la app en modo prueba**. Puedes hacer aquí todos los cambios que quieras sin afectar la versión en producción.

| | Producción | Prueba |
|---|------------|--------|
| **Carpeta** | `/opt/people-test` | `/opt/people-prueba` (esta) |
| **Puerto** | 3000 | 3001 |
| **URL** | https://people.blackdogpanama.com | https://prueba.people.blackdogpanama.com |
| **Servicio** | `people-backend` | `people-prueba-backend` |

## Flujo de trabajo

1. **Edita solo en `/opt/people-prueba`** (esta carpeta).
2. **Compilar:** `npm run build`
3. **Reiniciar el backend de prueba:** `sudo systemctl restart people-prueba-backend`
4. Probar en **https://prueba.blackdogpanama.com**
5. Cuando estés conforme, **pasa los cambios a producción**: copia los archivos modificados a `/opt/people-test` y reinicia `people-backend`.

## Primera vez en el servidor

```bash
cd /opt/people-prueba
npm install
npm run build

# Instalar y arrancar el servicio
sudo cp docker/people-prueba-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable people-prueba-backend
sudo systemctl start people-prueba-backend

# Nginx: copiar config y obtener certificado SSL
sudo cp docker/nginx-prueba.conf /etc/nginx/sites-available/prueba.blackdogpanama.com.conf
sudo ln -s /etc/nginx/sites-available/prueba.blackdogpanama.com.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d prueba.blackdogpanama.com
sudo nginx -t && sudo systemctl reload nginx
```

## Comandos útiles

- Ver estado: `sudo systemctl status people-prueba-backend`
- Reiniciar tras cambios: `sudo systemctl restart people-prueba-backend`
- Ver logs: `sudo journalctl -u people-prueba-backend -f`
- Probar health: `curl -s http://127.0.0.1:3001/health`
