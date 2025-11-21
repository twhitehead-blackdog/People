import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap } from 'rxjs';

/**
 * Escapa y cita correctamente un email para uso en filtros PostgREST.
 * PostgREST requiere que los valores string estén entre comillas dobles.
 * Cualquier comilla doble dentro del email debe ser escapada.
 * 
 * @param email - El email a escapar y citar
 * @returns El email correctamente escapado y citado para PostgREST
 */
function escapeEmailForPostgREST(email: string): string {
  // Validar formato básico de email para prevenir caracteres peligrosos
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email: email must be a non-empty string');
  }

  // Normalizar a lowercase
  const normalizedEmail = email.toLowerCase().trim();
  
  // Validar formato básico de email (debe contener @)
  if (!normalizedEmail.includes('@')) {
    throw new Error('Invalid email format: must contain @');
  }

  // Escapar comillas dobles dentro del email (reemplazar " con \"")
  const escapedEmail = normalizedEmail.replace(/"/g, '""');
  
  // Citar el email con comillas dobles para PostgREST
  return `"${escapedEmail}"`;
}

type State = {
  currentEmployeeId: string | null;
};

export const AuthStore = signalStore(
  withState<State>({
    currentEmployeeId: null,
  }),
  withProps(() => ({
    _auth: inject(AuthService),
    _http: inject(HttpClient),
  })),
  withMethods(({ _auth, _http, ...state }) => ({
    getCurrentEmployee: rxMethod<void>(
      pipe(
        switchMap(() => _auth.user$),
        filter((user) => !!user),
        switchMap((user) => {
          try {
            // Escapar y citar el email correctamente para PostgREST
            const escapedEmail = escapeEmailForPostgREST(user.email!);
            return _http
              .get<{ id: string }[]>(
                `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
                {
                  params: { work_email: `eq.${escapedEmail}`, select: 'id' },
                }
              )
              .pipe(
                tapResponse({
                  next: (resp) =>
                    patchState(state, { currentEmployeeId: resp[0]?.id || null }),
                  error: (error) => {
                    console.error('Error getting current employee:', error);
                    patchState(state, { currentEmployeeId: null });
                  },
                })
              );
          } catch (error) {
            // Si el email es inválido, denegar acceso por seguridad
            console.error('⚠️ Security: Invalid email format detected:', error);
            patchState(state, { currentEmployeeId: null });
            return [];
          }
        })
      )
    ),
  })),
  withHooks({ onInit: ({ getCurrentEmployee }) => getCurrentEmployee() })
);
