import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { throwError } from 'rxjs';
import { ReadOnlyContextService } from '../services/read-only-context.service';

/**
 * Defensa en profundidad: cuando la vista actual está en modo solo lectura,
 * cualquier intento de mutación (POST/PUT/PATCH/DELETE) hacia Supabase es bloqueado
 * antes de salir del navegador.
 *
 * No bloqueamos GET. Tampoco bloqueamos endpoints internos de Auth/Storage que pueden
 * usar POST para autenticación o subida de avatares — filtramos por path de Supabase REST.
 */
export const readOnlyInterceptor: HttpInterceptorFn = (req, next) => {
  const readOnlyCtx = inject(ReadOnlyContextService);
  const messageService = inject(MessageService, { optional: true });

  const method = req.method.toUpperCase();
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  // Solo nos interesan mutaciones contra la REST API de Supabase
  const isSupabaseRest = /\/rest\/v1\//.test(req.url);

  if (isMutation && isSupabaseRest && readOnlyCtx.isReadOnly()) {
    messageService?.add({
      severity: 'warn',
      summary: 'Solo lectura',
      detail: 'No tienes permiso de escritura en esta sección.',
      life: 4000,
    });
    return throwError(() => new HttpErrorResponse({
      status: 403,
      statusText: 'Read-only',
      error: { message: 'Operación bloqueada: la vista actual es solo lectura.' },
      url: req.url,
    }));
  }

  return next(req);
};
