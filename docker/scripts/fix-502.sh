#!/usr/bin/env bash
# ============================================
# Diagnóstico y corrección rápida: 502 Bad Gateway
# Ejecutar en el servidor donde corre people-test (ej. Hostinger)
# Uso: cd /opt/people-test/docker && bash scripts/fix-502.sh
# ============================================

set -e
cd "$(dirname "$0")/.."
DOCKER_DIR="$(pwd)"
COMPOSE_FILE="prod/docker-compose.yml"

echo "=== Diagnóstico 502 (upstream 127.0.0.1:8080) ==="
echo ""

echo "1. ¿Algo escuchando en 8080?"
if ss -tlnp 2>/dev/null | grep -q 8080 || netstat -tlnp 2>/dev/null | grep -q 8080; then
  echo "   OK: Hay un proceso en el puerto 8080."
else
  echo "   FALLO: Nada en 8080. Nginx no puede conectar (502)."
  echo "   Acción: Levantar los contenedores (paso 2)."
fi
echo ""

echo "2. Estado de contenedores (people-test prod):"
docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || true
echo ""

echo "3. ¿Responde el frontend en local?"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:8080/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   OK: Frontend responde 200 en http://127.0.0.1:8080/health"
else
  echo "   FALLO: Frontend no responde (código $HTTP_CODE). Reiniciando contenedores..."
  docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null || docker-compose -f "$COMPOSE_FILE" up -d 2>/dev/null || true
  echo "   Esperando 15 segundos..."
  sleep 15
  HTTP_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://127.0.0.1:8080/health 2>/dev/null || echo "000")
  if [ "$HTTP_CODE2" = "200" ]; then
    echo "   OK: Ahora responde 200."
  else
    echo "   Sigue sin responder. Revisar logs: docker compose -f $COMPOSE_FILE logs --tail=100"
  fi
fi
echo ""

echo "4. Últimas líneas de logs:"
docker compose -f "$COMPOSE_FILE" logs --tail=20 2>/dev/null || docker-compose -f "$COMPOSE_FILE" logs --tail=20 2>/dev/null || true
echo ""
echo "=== Fin diagnóstico. Si sigue 502: docker compose -f $COMPOSE_FILE down && docker compose -f $COMPOSE_FILE up -d ==="
