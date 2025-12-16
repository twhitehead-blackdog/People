import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor que convierte rutas relativas /api/... a rutas absolutas
 * cuando ENV_API_URL está configurado (Railway, producción)
 * 
 * En desarrollo local (sin ENV_API_URL), las rutas se mantienen relativas
 * En Railway (con ENV_API_URL), las rutas se convierten a absolutas
 */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo interceptar rutas que empiecen con /api/
  if (req.url.startsWith('/api/')) {
    const apiUrl = process.env['ENV_API_URL'];
    
    // Si ENV_API_URL está configurado, usar ruta absoluta
    if (apiUrl) {
      // Asegurarse de que apiUrl no termine con / y req.url empiece con /
      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const absoluteUrl = `${baseUrl}${req.url}`;
      req = req.clone({ url: absoluteUrl });
    }
    // Si no está configurado, usar ruta relativa (desarrollo local)
  }
  
  return next(req);
};

