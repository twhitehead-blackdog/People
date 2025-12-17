import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { SupabaseAuthService } from '../services/supabase-auth.service';
import { switchMap, catchError, from } from 'rxjs';
import { DiagnosticService } from '../services/diagnostic.service';
import { throwError } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const diagnosticService = inject(DiagnosticService);
  const supabaseAuth = inject(SupabaseAuthService);

  if (req.url.includes('supabase')) {
    // Para peticiones a Supabase, usar el token de sesión del usuario si está autenticado
    // o la API key anónima como fallback
    return from(supabaseAuth.getAccessToken()).pipe(
      switchMap((accessToken) => {
        // Usar token de sesión si está disponible, sino usar API key anónima
        const supabaseKey = 
          accessToken ||
          (process.env['ENV_SUPABASE_ANON_KEY'] ?? 
           process.env['ENV_SUPABASE_API_KEY'] ?? 
           '');
        
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
        return next(request);
      }),
      catchError((error: HttpErrorResponse) => {
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

  // Endpoints públicos que NO requieren autenticación
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

  // For non-Supabase requests, use Supabase token
  return supabaseAuth.getAccessTokenSilently().pipe(
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
