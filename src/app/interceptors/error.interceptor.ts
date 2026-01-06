import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const url = req.url;
      const method = req.method;
      const status = error.status || 0;

      // Silenciar errores esperados que no requieren notificación al usuario
      // 1. Errores 401 de Auth0 cuando no hay token (esperado si el usuario no está autenticado)
      if (status === 401 && url.includes('auth0.com')) {
        // Log detallado para debugging
        console.group('⚠️ [Error Interceptor] Error 401 de Auth0 detectado');
        console.log('URL:', url);
        console.log('Método:', method);
        console.log('Status:', status);
        console.log('Status Text:', error.statusText);
        console.log('Error completo:', error);
        console.log('Error body (error.error):', error.error);
        console.log('Error message:', error.message);
        console.log('Headers de respuesta:', error.headers?.keys() ? Array.from(error.headers.keys()) : 'N/A');
        
        // Intentar parsear el error si es un string
        if (typeof error.error === 'string') {
          try {
            const parsedError = JSON.parse(error.error);
            console.log('Error parseado:', parsedError);
          } catch (e) {
            console.log('Error como string:', error.error);
          }
        }
        
        // Verificar si hay información en el body
        if (error.error && typeof error.error === 'object') {
          console.log('Detalles del error:', {
            error: error.error.error,
            error_description: error.error.error_description,
            error_uri: error.error.error_uri
          });
        }
        
        console.log('URL actual del navegador:', window.location.href);
        console.log('Query params:', window.location.search);
        console.log('Hash:', window.location.hash);
        console.groupEnd();
        console.warn('⚠️ [Error Interceptor] Esto es normal si no hay API configurada en Auth0 o si el callback está fallando');
        // No mostrar error ni log para peticiones de Auth0 sin token
        // Esto es normal cuando el usuario no está autenticado
        return throwError(() => error);
      }

      // 2. Errores 404 de tablas de Supabase que aún no existen (esperado durante desarrollo)
      const tablesToSilence = ['pets', 'foundations', 'personality_traits', 'pet_breeds', 'user_pets'];
      const isTable404 = status === 404 && url.includes('supabase') && 
          tablesToSilence.some(table => url.includes(`/${table}`));
      
      if (isTable404) {
        // Silenciar completamente estos errores - son esperados durante desarrollo
        // No mostrar ningún log ni toast
        return throwError(() => error);
      }

      // 3. Errores 400 de Storage de Supabase (pueden ser por permisos o configuración del bucket)
      if (status === 400 && url.includes('supabase') && url.includes('/storage/v1/object/')) {
        // Silenciar completamente estos errores - el componente manejará el error
        return throwError(() => error);
      }

      // 4. Errores 400 de queries de Supabase con foreign keys que no existen
      if (status === 400 && url.includes('supabase') && url.includes('/rest/v1/')) {
        // Verificar si es un error de foreign key
        const errorMsg = error.error?.message || error.error?.error || '';
        if (errorMsg.includes('foreign key') || errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
          const logKey = 'supabase_fkey_400';
          if (!(window as any)[logKey]) {
            console.warn('⚠️ Error en query de Supabase. Puede ser por foreign keys o relaciones que no existen. Verifica el schema de la base de datos.');
            (window as any)[logKey] = true;
          }
          // No mostrar toast ni log detallado para estos errores
          return throwError(() => error);
        }
      }

      let errorMessage = 'Ocurrió un error inesperado';
      let errorSummary = 'Error';
      const errorDetails: string[] = [];

      // Agregar información del contexto
      errorDetails.push(`Método: ${method}`);
      errorDetails.push(`URL: ${url.length > 80 ? url.substring(0, 80) + '...' : url}`);

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorSummary = 'Error de Cliente';
        errorMessage = error.error.message || 'Error en la conexión';
        errorDetails.push(`Tipo: Error del navegador`);
        errorDetails.push(`Mensaje: ${error.error.message}`);
      } else {
        // Error del lado del servidor
        errorDetails.push(`Código de estado: ${status}`);

        // Intentar obtener mensaje detallado del servidor
        let serverMessage = '';
        if (error.error) {
          if (typeof error.error === 'string') {
            serverMessage = error.error;
          } else if (error.error.message) {
            serverMessage = error.error.message;
          } else if (error.error.error) {
            serverMessage = error.error.error;
          } else if (error.error.details) {
            serverMessage = error.error.details;
          } else if (error.error.hint) {
            serverMessage = error.error.hint;
          }
        }

        switch (status) {
          case 0:
            errorSummary = 'Error de Conexión';
            errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
            errorDetails.push('Posible causa: Sin conexión a internet o servidor no disponible');
            break;
          case 400:
            errorSummary = 'Solicitud Incorrecta';
            errorMessage = serverMessage || 'Los datos enviados no son válidos. Por favor, verifica la información.';
            errorDetails.push('El servidor rechazó la solicitud debido a datos inválidos');
            if (serverMessage) {
              errorDetails.push(`Detalle del servidor: ${serverMessage}`);
            }
            break;
          case 401:
            errorSummary = 'Sesión Expirada';
            errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página.';
            errorDetails.push('Tu token de autenticación es inválido o ha expirado');
            // Invalidar cache si existe
            if (typeof window !== 'undefined') {
              sessionStorage.clear();
              localStorage.removeItem('auth_token');
            }
            break;
          case 403:
            errorSummary = 'Sin Permisos';
            errorMessage = serverMessage || 'No tienes permisos para realizar esta acción.';
            errorDetails.push('Tu cuenta no tiene los permisos necesarios para esta operación');
            if (serverMessage) {
              errorDetails.push(`Detalle: ${serverMessage}`);
            }
            break;
          case 404:
            errorSummary = 'Recurso No Encontrado';
            errorMessage = serverMessage || 'El recurso solicitado no existe.';
            errorDetails.push('El servidor no encontró el recurso solicitado');
            if (serverMessage) {
              errorDetails.push(`Detalle: ${serverMessage}`);
            }
            break;
          case 409:
            errorSummary = 'Conflicto';
            errorMessage = serverMessage || 'Ya existe un registro con estos datos.';
            errorDetails.push('El recurso ya existe o hay un conflicto con los datos');
            if (serverMessage) {
              errorDetails.push(`Detalle: ${serverMessage}`);
            }
            break;
          case 422:
            errorSummary = 'Datos Inválidos';
            errorMessage = serverMessage || 'Los datos proporcionados no son válidos.';
            errorDetails.push('Error de validación en los datos enviados');
            if (serverMessage) {
              errorDetails.push(`Detalle: ${serverMessage}`);
            }
            break;
          case 429:
            errorSummary = 'Demasiadas Solicitudes';
            errorMessage = 'Has realizado demasiadas solicitudes. Por favor, espera un momento.';
            errorDetails.push('Límite de solicitudes excedido');
            break;
          case 500:
            errorSummary = 'Error del Servidor';
            errorMessage = serverMessage || 'El servidor encontró un error interno. Por favor, intenta más tarde o contacta al soporte.';
            errorDetails.push('Error interno del servidor');
            if (serverMessage) {
              errorDetails.push(`Detalle del servidor: ${serverMessage}`);
            }
            break;
          case 502:
            errorSummary = 'Error de Gateway';
            errorMessage = 'El servidor no pudo obtener una respuesta válida.';
            errorDetails.push('Problema de comunicación entre servidores');
            break;
          case 503:
            errorSummary = 'Servicio No Disponible';
            errorMessage = 'El servicio está temporalmente no disponible. Por favor, intenta más tarde.';
            errorDetails.push('El servidor está en mantenimiento o sobrecargado');
            break;
          case 504:
            errorSummary = 'Timeout del Gateway';
            errorMessage = 'El servidor tardó demasiado en responder.';
            errorDetails.push('Timeout en la comunicación con el servidor');
            break;
          default:
            errorSummary = `Error ${status}`;
            errorMessage = serverMessage || error.message || 'Error de conexión con el servidor.';
            errorDetails.push(`Código de error: ${status}`);
            if (serverMessage) {
              errorDetails.push(`Mensaje: ${serverMessage}`);
            }
        }
      }

      // Construir el mensaje completo con detalles
      const fullMessage = errorDetails.length > 0 
        ? `${errorMessage}\n\nDetalles:\n${errorDetails.join('\n')}`
        : errorMessage;

      // Mostrar toast de error con información detallada
      messageService.add({
        severity: 'error',
        summary: errorSummary,
        detail: fullMessage,
        life: 8000, // Más tiempo para leer los detalles
        closable: true,
      });

      // Log completo del error en consola (solo si no es un error silenciado)
      // No loguear errores que ya fueron silenciados arriba
      const isSilencedError = 
        (status === 404 && url.includes('supabase') && tablesToSilence.some(table => url.includes(`/${table}`))) ||
        (status === 400 && url.includes('supabase') && url.includes('/storage/v1/object/')) ||
        (status === 400 && url.includes('supabase') && url.includes('/rest/v1/') && 
         (error.error?.message?.includes('foreign key') || error.error?.error?.includes('foreign key')));
      
      if (!isSilencedError) {
        console.error('🚨 Error HTTP Detectado:', {
          summary: errorSummary,
          status: status,
          method: method,
          url: url,
          message: error.message,
          error: error.error,
          details: errorDetails,
          timestamp: new Date().toISOString(),
        });
      }

      // En producción, aquí se podría enviar el error a un servicio de tracking
      // como Sentry, Rollbar, etc.

      return throwError(() => error);
    })
  );
};




