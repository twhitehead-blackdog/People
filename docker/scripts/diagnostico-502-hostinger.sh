#!/usr/bin/env bash
# ============================================
# Diagnóstico 502 - people.blackdogpanama.com
# Cadena: Nginx (443) → Traefik (8443) → people-test-proxy → Backend (3000)
# Ejecutar en el servidor: bash /opt/people-test/docker/scripts/diagnostico-502-hostinger.sh
# ============================================

set -e
HOST="people.blackdogpanama.com"

echo "=== Diagnóstico 502 (Hostinger / docker-projects) ==="
echo ""

echo "1. ¿Traefik escuchando en 8080 y 8443?"
for port in 8080 8443; do
  if ss -tlnp 2>/dev/null | grep -q ":$port " || netstat -tlnp 2>/dev/null | grep -q ":$port "; then
    echo "   OK: Puerto $port en uso (Traefik)."
  else
    echo "   FALLO: Nada en $port. Levantar: cd /opt/docker-projects && docker compose up -d traefik"
  fi
done
echo ""

echo "2. ¿Backend People en 3000?"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:3000/health 2>/dev/null || echo "000")
if [ "$CODE" = "200" ]; then
  echo "   OK: Backend responde 200 en http://127.0.0.1:3000/health"
else
  echo "   FALLO: Backend no responde (código $CODE). Debe estar en marcha en el puerto 3000."
  echo "   Levantar: cd /opt/people-test && ./scripts/start-backend-server.sh"
  echo "   O con systemd: sudo systemctl start people-backend"
fi
echo ""

echo "3. ¿Traefik (8443) responde con Host $HOST?"
CODE=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 3 -H "Host: $HOST" https://127.0.0.1:8443/ 2>/dev/null || echo "000")
if [ "$CODE" = "200" ] || [ "$CODE" = "302" ] || [ "$CODE" = "301" ]; then
  echo "   OK: Traefik devuelve $CODE para https://127.0.0.1:8443/ (Host: $HOST)"
else
  echo "   FALLO: Traefik devuelve $CODE (esperado 200/301/302). Revisar: docker logs traefik"
fi
echo ""

echo "4. Contenedores docker-projects:"
(cd /opt/docker-projects 2>/dev/null && docker compose ps -a 2>/dev/null) || echo "   No se pudo ejecutar docker compose en /opt/docker-projects"
echo ""

echo "5. Nginx del sistema: ¿usa proxy a 8443?"
if [ -d /etc/nginx/sites-enabled ]; then
  if grep -r "127.0.0.1:8443" /etc/nginx/sites-enabled 2>/dev/null | head -1; then
    echo "   OK: Nginx configurado para enviar a 8443 (HTTPS)."
  elif grep -r "127.0.0.1:8080" /etc/nginx/sites-enabled 2>/dev/null | head -1; then
    echo "   AVISO: Nginx envía a 8080. Para evitar bucles, usar 8443. Ver: people-test/docker/nginx-prod.conf"
  else
    echo "   Revisar: Nginx debe tener proxy_pass a https://127.0.0.1:8443 para este sitio."
  fi
else
  echo "   No se encontró /etc/nginx/sites-enabled (¿Nginx instalado?)."
fi
echo ""

echo "=== Resumen ==="
echo "Si backend (3000) y Traefik (8443) están OK y Nginx usa 8443, recargar Nginx: sudo systemctl reload nginx"
echo "Config de referencia: /opt/people-test/docker/nginx-prod.conf"
