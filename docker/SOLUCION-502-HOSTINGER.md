# Solución: 502 Bad Gateway (people.blackdogpanama.com)

## Cadena de tráfico

```
Usuario → Nginx (443) → Traefik (8443) → people-test-proxy → Backend (3000)
```

**Importante:** Nginx debe enviar el tráfico **HTTPS** a **Traefik en el puerto 8443** (`proxy_pass https://127.0.0.1:8443`). Si envías a 8080, Traefik redirige a HTTPS y se produce un bucle → 502.

Si **cualquier eslabón** falla, verás 502.

---

## Diagnóstico rápido (en el servidor)

```bash
bash /opt/people-test/docker/scripts/diagnostico-502-hostinger.sh
```

Comprueba: puertos 8080/8443, backend 3000, respuesta de Traefik y configuración de Nginx.

---

## 1. Nginx del sistema (Ubuntu)

Debe enviar el tráfico **HTTPS** de `people.blackdogpanama.com` a Traefik en **8443**:

- Archivo de referencia: `people-test/docker/nginx-prod.conf` (usa `proxy_pass https://127.0.0.1:8443`)
- Copiar a `/etc/nginx/sites-available/` (o incluirlo) y hacer `sudo nginx -t` y `sudo systemctl reload nginx`.

---

## 2. Docker (proyecto docker-projects)

Traefik y people-test-proxy deben estar **Running**.

```bash
cd /opt/docker-projects
docker compose ps
```

Si **traefik** o **people-test** están Exited:

```bash
# Si 80/443 están libres (no usa Nginx en el host):
docker compose up -d traefik
docker compose start people-test

# Si Nginx ya usa 80/443 (como en tu caso):
TRAEFIK_HTTP_PORT=8080 TRAEFIK_HTTPS_PORT=8443 docker compose up -d traefik
docker compose start people-test
```

**Importante:** people-test-proxy ahora apunta a **puerto 3000** del host. Si cambiaste el compose, recrea el contenedor:

```bash
docker compose up -d --force-recreate people-test
```

---

## 3. Backend People (puerto 3000)

Algo debe estar escuchando en **127.0.0.1:3000** (API + frontend estático). Si no, 502.

### Opción A: Script manual

```bash
cd /opt/people-test
npm run build
PORT=3000 npx tsx server.ts
```

O usar el script (hace build si no existe):

```bash
cd /opt/people-test
chmod +x scripts/start-backend-server.sh
./scripts/start-backend-server.sh
```

### Opción B: Servicio systemd (arranque automático)

```bash
sudo cp /opt/people-test/docker/people-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable people-backend
sudo systemctl start people-backend
sudo systemctl status people-backend
```

Comprobar que responde:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/health
# Debe devolver 200
```

---

## Resumen rápido

| Paso | Comando / Comprobación |
|------|------------------------|
| ¿Nginx apunta a 8443 (HTTPS)? | Revisar config → `proxy_pass https://127.0.0.1:8443` |
| ¿Traefik en 8443? | `ss -tlnp \| grep 8443` |
| ¿Contenedores docker-projects? | `cd /opt/docker-projects && docker compose ps` |
| ¿Backend en 3000? | `curl http://127.0.0.1:3000/health` → 200 |
| Logs Nginx | `sudo tail -50 /var/log/nginx/error.log` |

Si todo está OK y sigue 502, recarga Nginx: `sudo systemctl reload nginx`.
