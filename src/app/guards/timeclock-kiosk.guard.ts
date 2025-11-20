import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, from, Observable, of, switchMap, timeout } from 'rxjs';
import { IpMonitorService } from '../services/ip-monitor.service';
import { Branch } from '../models';

/**
 * Guard para el modo kiosko del reloj de marcaciones
 * Permite acceso sin autenticación pero valida la IP del cliente
 * Solo permite acceso desde IPs de sucursales activas configuradas en la base de datos
 */
export const timeclockKioskGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const ipMonitor = inject(IpMonitorService);

  // Obtener IPs de sucursales activas desde la base de datos
  // El interceptor HTTP ya agrega los headers de Supabase automáticamente
  return http.get<Branch[]>(`${process.env['ENV_SUPABASE_URL']}/rest/v1/branches`, {
    params: {
      select: 'ip',
      is_active: 'eq.true'
    }
  }).pipe(
    timeout(10000),
    switchMap((branches) => {
      // Extraer IPs de las sucursales, filtrando valores nulos o vacíos
      const allowedIPs = branches
        .map(branch => branch.ip?.trim())
        .filter((ip): ip is string => !!ip && ip.length > 0);

      // Si no hay IPs configuradas, denegar acceso por seguridad
      if (allowedIPs.length === 0) {
        return of(router.createUrlTree(['/sin-acceso'], {
          queryParams: { reason: 'no_ips_configured' }
        }));
      }

      // Configurar IPs permitidas en el servicio
      ipMonitor.setAllowedIPs(allowedIPs);

      // Validar IP inicial usando el servicio de monitoreo
      // Convertir Promise a Observable usando from()
      return from(ipMonitor.validateInitialIP(allowedIPs)).pipe(
        switchMap((result) => {
          // BLOQUEAR ACCESO si no se pudo obtener la IP
          if (!result.ip) {
            return of(router.createUrlTree(['/sin-acceso'], {
              queryParams: { reason: 'ip_check_failed', ip: 'unknown' }
            }));
          }

          // Verificar explícitamente que la IP esté en la lista de permitidas
          const clientIP = result.ip.trim();
          const isIPInList = allowedIPs.some(allowedIP => {
            const trimmedAllowed = allowedIP.trim();
            return clientIP === trimmedAllowed;
          });

          // BLOQUEAR ACCESO si la IP no está en la lista O si result.allowed es false
          if (!isIPInList || !result.allowed) {
            return of(router.createUrlTree(['/sin-acceso'], {
              queryParams: { reason: 'ip_not_allowed', ip: clientIP }
            }));
          }

          // Iniciar monitoreo continuo de IP
          ipMonitor.startMonitoring(allowedIPs);
          
          return of(true);
        }),
        catchError((error) => {
          console.error('[timeclockKioskGuard] Error al validar IP:', error);
          // En caso de error, SIEMPRE BLOQUEAR acceso por seguridad
          return of(router.createUrlTree(['/sin-acceso'], {
            queryParams: { reason: 'ip_check_failed' }
          }));
        })
      );
    }),
    catchError((error) => {
      console.error('[timeclockKioskGuard] Error al obtener IPs de sucursales:', error);
      // En caso de error, BLOQUEAR acceso por seguridad
      return of(router.createUrlTree(['/sin-acceso'], {
        queryParams: { reason: 'ip_check_failed' }
      }));
    })
  );
};

