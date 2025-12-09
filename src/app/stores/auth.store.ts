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
import { filter, pipe, switchMap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { getTableName } from '../utils/table-helper';

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
    _orgService: inject(OrganizationService),
  })),
  withMethods(({ _auth, _http, _orgService, ...state }) => ({
    getCurrentEmployee: rxMethod<void>(
      pipe(
        switchMap(() => _auth.user$),
        filter((user) => !!user),
        switchMap((user) => {
          // Buscar primero en employees (Black Dog)
          const employeesTable = getTableName('employees', false);
          return _http
            .get<{ id: string }[]>(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/${employeesTable}`,
              {
                params: { work_email: `eq.${user.email}`, select: 'id' },
              }
            )
            .pipe(
              tapResponse({
                next: (resp) => {
                  if (resp && resp.length > 0) {
                    patchState(state, { currentEmployeeId: resp[0].id });
                  } else {
                    // Si no se encuentra en employees, buscar en naz_employees
                    const nazEmployeesTable = getTableName('employees', true);
                    _http
                      .get<{ id: string }[]>(
                        `${process.env['ENV_SUPABASE_URL']}/rest/v1/${nazEmployeesTable}`,
                        {
                          params: { work_email: `eq.${user.email}`, select: 'id' },
                        }
                      )
                      .pipe(
                        tapResponse({
                          next: (nazResp) => {
                            if (nazResp && nazResp.length > 0) {
                              patchState(state, { currentEmployeeId: nazResp[0].id });
                            }
                          },
                          error: (error) => console.log(error),
                        })
                      )
                      .subscribe();
                  }
                },
                error: (error) => {
                  // Si falla, intentar en naz_employees
                  const nazEmployeesTable = getTableName('employees', true);
                  _http
                    .get<{ id: string }[]>(
                      `${process.env['ENV_SUPABASE_URL']}/rest/v1/${nazEmployeesTable}`,
                      {
                        params: { work_email: `eq.${user.email}`, select: 'id' },
                      }
                    )
                    .pipe(
                      tapResponse({
                        next: (nazResp) => {
                          if (nazResp && nazResp.length > 0) {
                            patchState(state, { currentEmployeeId: nazResp[0].id });
                          }
                        },
                        error: (err) => console.log(err),
                      })
                    )
                    .subscribe();
                },
              })
            );
        })
      )
    ),
  })),
  withHooks({ onInit: ({ getCurrentEmployee }) => getCurrentEmployee() })
);
