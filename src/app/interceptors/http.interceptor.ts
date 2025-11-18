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
      .set('Prefer', 'return=representation')
      .set('Content-Type', 'application/json')
      .set(
        'Authorization',
        `Bearer ${process.env['ENV_SUPABASE_API_KEY'] ?? ''}`
      );

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
