import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, timeout } from 'rxjs';

/**
 * Guard para el modo kiosko del reloj de marcaciones
 * Permite acceso sin autenticación pero valida la IP del cliente
 * Solo permite acceso desde IPs de tienda configuradas
 * 
 * Configuración:
 * - Variable de entorno: ENV_KIOSK_ALLOWED_IPS
 * - Formato: IPs separadas por comas (ej: "192.168.1.100,192.168.1.101,10.0.0.50")
 * - Ejemplo: ENV_KIOSK_ALLOWED_IPS=192.168.1.100,192.168.1.101,10.0.0.50
 */
export const timeclockKioskGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  // Lista de IPs permitidas para modo kiosko desde variables de entorno
  const allowedIPsEnv = process.env['ENV_KIOSK_ALLOWED_IPS'];
  const allowedIPs = allowedIPsEnv?.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0) || [];

  // Si no hay IPs configuradas, denegar acceso por seguridad
  if (allowedIPs.length === 0) {
    console.warn('No hay IPs configuradas para modo kiosko. Configure ENV_KIOSK_ALLOWED_IPS');
    router.navigate(['/sin-acceso'], {
      queryParams: { reason: 'no_ips_configured' }
    });
    return of(false);
  }

  // Obtener la IP del cliente usando un servicio externo
  // Timeout de 5 segundos para evitar esperas largas
  return http.get<{ ip: string }>('https://api.ipify.org?format=json').pipe(
    timeout(5000),
    map((response) => {
      const clientIP = response.ip;
      
      // Verificar si la IP está en la lista de permitidas
      const isAllowed = allowedIPs.some((allowedIP) => {
        // Soporta IPs exactas
        // TODO: Implementar validación CIDR si es necesario en el futuro
        const trimmedIP = allowedIP.trim();
        return clientIP === trimmedIP;
      });

      if (!isAllowed) {
        console.warn(`Acceso denegado desde IP: ${clientIP}. IPs permitidas: ${allowedIPs.join(', ')}`);
        router.navigate(['/sin-acceso'], {
          queryParams: { reason: 'ip_not_allowed', ip: clientIP }
        });
        return false;
      }

      console.log(`Acceso permitido desde IP: ${clientIP}`);
      return true;
    }),
    catchError((error) => {
      console.error('Error al obtener IP del cliente:', error);
      // En caso de error, denegar acceso por seguridad
      router.navigate(['/sin-acceso'], {
        queryParams: { reason: 'ip_check_failed' }
      });
      return of(false);
    })
  );
};

