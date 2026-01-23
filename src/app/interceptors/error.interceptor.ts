import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { DiagnosticService } from '../services/diagnostic.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);
  const router = inject(Router);
  const diagnosticService = inject(DiagnosticService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('[ErrorInterceptor] Error caught for URL:', req.url);
      console.error('[ErrorInterceptor] Status:', error.status);
      console.error('[ErrorInterceptor] Error body:', error.error);
      let errorMessage = 'Ocurrió un error inesperado';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        switch (error.status) {
          case 400:
            errorMessage = 'Solicitud incorrecta. Por favor, verifica los datos.';
            break;
          case 401:
            console.error('[ErrorInterceptor] 401 Unauthorized detected!');
            console.error('[ErrorInterceptor] URL:', req.url);
            console.error('[ErrorInterceptor] Error details:', error.error);
            errorMessage = 'Tu sesion ha expirado. Por favor, inicia sesion nuevamente.';
            // Invalidar cache del guard si existe
            if (typeof window !== 'undefined') {
              // Limpiar cualquier dato de sesión local
              sessionStorage.clear();
              localStorage.removeItem('auth_token');
            }
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción.';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado.';
            break;
          case 500:
            errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
            break;
          case 503:
            errorMessage = 'Servicio no disponible temporalmente.';
            break;
          default:
            errorMessage = error.error?.message || 'Error de conexión';
        }
      }

      // Mostrar toast de error
      messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000,
      });

      // Registrar error en el servicio de diagnóstico
      diagnosticService.addHttpError(
        req.url,
        error.status,
        errorMessage,
        {
          method: req.method,
          headers: req.headers.keys(),
          error: error.error,
        }
      );

      // Log del error en desarrollo
      if (typeof window !== 'undefined' && (window as any).isDevMode) {
        console.error('HTTP Error:', {
          status: error.status,
          message: error.message,
          url: req.url,
          error: error.error,
        });
      }

      // En producción, aquí se podría enviar el error a un servicio de tracking
      // como Sentry, Rollbar, etc.

      return throwError(() => error);
    })
  );
};




