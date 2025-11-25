import { HttpClient, HttpParams } from '@angular/common/http';
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

type State = {
  currentEmployeeId: string | null;
  supervisorBranchId: string | null; // ID de la sucursal si es supervisor por correo de sucursal
};

export const AuthStore = signalStore(
  withState<State>({
    currentEmployeeId: null,
    supervisorBranchId: null,
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
          const userEmail = user.email?.toLowerCase();
          if (!userEmail) return [];

          // Primero buscar en branches por work_email (correo de sucursal)
          // Usar formato 'or' con HttpParams como en guard.ts
          if (!userEmail) {
            return [];
          }
          const params = new HttpParams()
            .set('select', 'id')
            .set('or', `(work_email.eq.${userEmail})`);

          return _http
            .get<{ id: string }[]>(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/branches`,
              { params }
            )
            .pipe(
              switchMap((branches) => {
                // Si se encuentra una sucursal con ese correo, es un supervisor
                if (branches.length > 0) {
                  const branchId = branches[0].id;
                  // Buscar un empleado de esa sucursal para usar como referencia
                  // O usar el branch_id directamente
                  return _http
                    .get<{ id: string }[]>(
                      `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
                      {
                        params: {
                          branch_id: `eq.${branchId}`,
                          is_active: 'eq.true',
                          select: 'id',
                          limit: '1',
                        },
                      }
                    )
                    .pipe(
                      tapResponse({
                        next: (employees) => {
                          // Guardar el branch_id del supervisor
                          patchState(state, {
                            supervisorBranchId: branchId,
                            // Usar el primer empleado de la sucursal como referencia si existe
                            currentEmployeeId: employees[0]?.id || null,
                          });
                        },
                        error: (error) => {
                          // Si no hay empleados, solo guardar el branch_id
                          patchState(state, {
                            supervisorBranchId: branchId,
                            currentEmployeeId: null,
                          });
                        },
                      })
                    );
                }

                // Si no es correo de sucursal, buscar como empleado normal
                if (!userEmail) {
                  return [];
                }
                // Usar formato 'or' con HttpParams como en guard.ts
                const params = new HttpParams()
                  .set('select', 'id')
                  .set('or', `(work_email.eq.${userEmail})`);

                return _http
                  .get<{ id: string }[]>(
                    `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
                    { params }
                  )
                  .pipe(
                    tapResponse({
                      next: (resp) =>
                        patchState(state, {
                          currentEmployeeId: resp[0]?.id || null,
                          supervisorBranchId: null,
                        }),
                      error: (error) => {
                        patchState(state, {
                          currentEmployeeId: null,
                          supervisorBranchId: null,
                        });
                        console.log(error);
                      },
                    })
                  );
              })
            );
        })
      )
    ),
  })),
  withHooks({ onInit: ({ getCurrentEmployee }) => getCurrentEmployee() })
);
