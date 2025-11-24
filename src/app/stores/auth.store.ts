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
        switchMap((user) =>
          _http
            .get<{ id: string }[]>(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
              {
                params: { work_email: `eq.${user.email}`, select: 'id' },
              }
            )
            .pipe(
              tapResponse({
                next: (resp) =>
                  patchState(state, { currentEmployeeId: resp[0].id }),
                error: (error) => console.log(error),
              })
            )
        )
      )
    ),
  })),
  withHooks({ onInit: ({ getCurrentEmployee }) => getCurrentEmployee() })
);
