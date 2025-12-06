import { HttpInterceptorFn } from '@angular/common/http';

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

  // Para otras peticiones, continuar sin modificar
  return next(req);
};
