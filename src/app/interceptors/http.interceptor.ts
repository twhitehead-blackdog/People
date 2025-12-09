import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap, catchError, take } from 'rxjs/operators';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('supabase')) {
    // Use Supabase API key directly
    let headers = req.headers;

    // Solo agregar apikey si no está presente
    if (!headers.has('apikey')) {
      headers = headers.set('apikey', process.env['ENV_SUPABASE_API_KEY'] ?? '');
    }

    // Solo agregar Authorization si no está presente
    if (!headers.has('Authorization')) {
      headers = headers.set(
        'Authorization',
        `Bearer ${process.env['ENV_SUPABASE_API_KEY'] ?? ''}`
      );
    }

    // No agregar Content-Type ni Prefer para Storage API
    // Dejar que se establezcan manualmente en el componente para subidas de archivos
    // Esto es crítico para que los archivos se suban correctamente
    if (!req.url.includes('/storage/v1/')) {
      // Solo agregar Prefer y Content-Type si no están presentes y NO es Storage
      if (!headers.has('Prefer')) {
        headers = headers.set('Prefer', 'return=representation');
      }
      if (!headers.has('Content-Type')) {
        headers = headers.set('Content-Type', 'application/json');
      }
    } else {
      // Para Storage API, asegurar que no sobrescribimos headers personalizados
      // Especialmente importante para PUT requests con archivos
      // El Content-Type y otros headers deben establecerse en el componente
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
  }

  // No intentar obtener token de Auth0 para peticiones de Auth0 (evita error circular)
  if (req.url.includes('auth0.com')) {
    return next(req);
  }

  // For non-Supabase, non-Auth0 requests, use Auth0 token (only if user is authenticated)
  const auth = inject(AuthService);
  
  // Verificar si el usuario está autenticado antes de intentar obtener el token
  return auth.isAuthenticated$.pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        // Usuario no autenticado, continuar sin token
        return next(req);
      }
      
      // Usuario autenticado, intentar obtener el token
      console.log('🔍 [HTTP Interceptor] Usuario autenticado, intentando obtener token de Auth0...');
      return auth.getAccessTokenSilently().pipe(
        switchMap((token) => {
          console.log('✅ [HTTP Interceptor] Token obtenido exitosamente, longitud:', token?.length || 0);
          let headers = req.headers;
          if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
          }
          const request = req.clone({ headers });
          return next(request);
        }),
        catchError((error) => {
          // Si falla obtener el token (401, etc.), continuar sin Authorization header
          // Esto es normal si el token expiró o hay un problema de configuración
          console.error('❌ [HTTP Interceptor] Error al obtener token de Auth0:', {
            error: error,
            message: error?.message,
            status: error?.status,
            url: req.url,
            method: req.method
          });
          return next(req);
        })
      );
    })
  );
};
