import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('supabase')) {
    // Use Supabase API key directly for now
    // TODO: Configure Supabase to accept Auth0 tokens or use service role for admin operations
    let headers = req.headers
      .set('apikey', process.env['ENV_SUPABASE_API_KEY'] ?? '')
      .set(
        'Authorization',
        `Bearer ${process.env['ENV_SUPABASE_API_KEY'] ?? ''}`
      );

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
      })
    );
};
