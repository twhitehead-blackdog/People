import { HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, finalize, switchMap, tap, throwError } from 'rxjs';
import { DiagnosticService } from '../services/diagnostic.service';

// Detectar si estamos en desarrollo
const isDevelopment =
  isDevMode() ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'));

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const diagnosticService = inject(DiagnosticService);

  if (req.url.includes('supabase')) {
    // Logging de métricas (solo en desarrollo)
    const startTime = isDevelopment ? performance.now() : null;
    const method = req.method;
    const url = req.url.replace(process.env['ENV_SUPABASE_URL'] || '', '');
    // Para peticiones a settings, job_applications, timeoffs, hr_messages, notifications y employee_disabilities,
    // usar service_role key para bypassar RLS
    // Para otras peticiones, usar anon key
    const isSettingsRequest = req.url.includes('/rest/v1/settings');
    const isJobApplicationsRequest = req.url.includes(
      '/rest/v1/job_applications'
    );
    const isTimeoffsRequest = req.url.includes('/rest/v1/timeoffs');
    const isNotificationsRequest = req.url.includes('/rest/v1/notifications');
    const isHrMessagesRequest = req.url.includes('/rest/v1/hr_messages');
    const isEmployeeDisabilitiesRequest = req.url.includes('/rest/v1/employee_disabilities');
    const needsServiceRoleKey =
      isSettingsRequest ||
      isJobApplicationsRequest ||
      isTimeoffsRequest ||
      isNotificationsRequest ||
      isHrMessagesRequest ||
      isEmployeeDisabilitiesRequest;

    // Para Service Role Key, intentar todas las variantes posibles
    // ENV_SUPABASE_TOKEN y ENV_SUPABASE_SERVICE_ROLE_KEY deberían ser la misma clave
    const supabaseKey = needsServiceRoleKey
      ? process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'] ??
        process.env['ENV_SUPABASE_TOKEN'] ??
        process.env['ENV_SUPABASE_ANON_KEY'] ??
        process.env['ENV_SUPABASE_API_KEY'] ??
        ''
      : process.env['ENV_SUPABASE_ANON_KEY'] ??
        process.env['ENV_SUPABASE_API_KEY'] ??
        '';

    // Si es una petición que necesita service role key y no hay disponible, mostrar error más claro
    if (needsServiceRoleKey && !supabaseKey) {
      console.error(
        '[ERROR] No se encontró ENV_SUPABASE_SERVICE_ROLE_KEY para peticiones a ' +
          (isSettingsRequest ? 'settings' : 'job_applications') +
          '. ' +
          'Por favor, agrega esta variable a tu archivo .env y reinicia la aplicación.'
      );
    }

    let headers = req.headers
      .set('apikey', supabaseKey)
      .set('Authorization', `Bearer ${supabaseKey}`);

    // No agregar Content-Type para Storage API (dejar que el navegador lo establezca con boundary)
    // No agregar Prefer para Storage API
    if (!req.url.includes('/storage/v1/')) {
      headers = headers
        .set('Prefer', 'return=representation')
        .set('Content-Type', 'application/json');
    }

    // Agregar header Range para peticiones a timelogs que necesitan más de 1000 registros
    // Esto permite obtener hasta 10000 registros (Supabase limita a 1000 por defecto)
    if (req.url.includes('/timelogs') && req.url.includes('limit=10000')) {
      headers = headers.set('Range', '0-9999');
    }

    const request = req.clone({
      headers,
    });
    return next(request).pipe(
      tap({
        next: () => {
          // Logging de duración de request exitoso (solo en desarrollo)
          if (isDevelopment && startTime !== null) {
            const duration = Math.round(performance.now() - startTime);
            console.log(`[${method}] ${url} - ${duration}ms`);
          }
        },
      }),
      catchError((error) => {
        // Logging de errores (solo en desarrollo)
        if (isDevelopment && startTime !== null) {
          const duration = Math.round(performance.now() - startTime);
          console.error(`[${method}] ${url} - ERROR ${error.status || 'NETWORK'} - ${duration}ms`);
        }

        // Capturar errores de Supabase
        if (error.status === 401 || error.status === 403) {
          diagnosticService.addSupabaseError(
            `Error de autenticación: ${error.status}`,
            req.url,
            error.error
          );
        } else if (error.status === 0 || !error.status) {
          diagnosticService.addNetworkError(
            req.url,
            'No se pudo conectar a Supabase',
            error
          );
        } else {
          diagnosticService.addSupabaseError(
            `Error ${error.status}: ${error.message || 'Error desconocido'}`,
            req.url,
            error.error
          );
        }
        return throwError(() => error);
      })
    );
  }

  // Endpoints públicos que NO requieren autenticación de Auth0
  // /api/client-ip es usado por el modo kiosko que no requiere autenticación
  // /api/email/send es usado por el formulario público de feria de empleo
  if (
    req.url.includes('/api/client-ip') ||
    req.url.includes('/api/health') ||
    req.url.includes('/api/email/send')
  ) {
    // Permitir peticiones sin autenticación
    return next(req);
  }

  // For non-Supabase requests, use Auth0 token
  return inject(AuthService)
    .getAccessTokenSilently()
    .pipe(
      switchMap((token) => {
        const request = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`),
        });
        return next(request);
      }),
      catchError((error) => {
        // Capturar errores de red para requests al backend
        if (error.status === 0 || !error.status) {
          diagnosticService.addNetworkError(
            req.url,
            'No se pudo conectar al servidor',
            error
          );
        }
        return throwError(() => error);
      })
    );
};
