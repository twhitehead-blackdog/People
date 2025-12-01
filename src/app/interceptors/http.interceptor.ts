import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('supabase')) {
    // Use Supabase API key directly for now
    // TODO: Configure Supabase to accept Auth0 tokens or use service role for admin operations
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

  // Endpoints públicos que NO requieren autenticación de Auth0
  // /api/client-ip es usado por el modo kiosko que no requiere autenticación
  if (req.url.includes('/api/client-ip') || req.url.includes('/api/health')) {
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
      })
    );
};
