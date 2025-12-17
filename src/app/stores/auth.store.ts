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
import { filter, of, pipe, switchMap } from 'rxjs';
import { AuthBypassService } from '../services/auth-bypass.service';
import { OrganizationService } from '../services/organization.service';

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
    _bypass: inject(AuthBypassService),
  })),
  withMethods(({ _auth, _http, _orgService, _bypass, ...state }) => ({
    getCurrentEmployee: rxMethod<void>(
      pipe(
        switchMap(() => {
          // Si el bypass está activo, usar el usuario del bypass
          if (_bypass.isBypassActive()) {
            const bypassUser = _bypass.getCurrentUser();
            console.log(
              '🔓 [AuthStore] Usando bypass, usuario:',
              bypassUser?.email
            );
            if (bypassUser) {
              // Retornar el usuario del bypass como Observable
              return of(bypassUser);
            }
            console.warn('🔓 [AuthStore] Bypass activo pero no hay usuario');
          }
          // Si no, usar Auth0
          return _auth.user$;
        }),
        filter((user) => !!user),
        switchMap((user) => {
          // Ya no hay tablas naz_*, todo es por company_id en tablas compartidas
          const tableName = 'employees';
          const positionTableName = 'positions';

          // Usar positions siempre (tabla compartida)
          const positionSelect = `position:positions(id, name, admin, schedule_admin, schedule_approver, dashboard_access, default_view)`;

          const params: any = {
            work_email: `eq.${user.email}`,
            select: `id,company_id,first_name,father_name,${positionSelect}`,
          };

          // Siempre agregar filtro por company_id
          const companyId = _orgService.getCurrentCompanyId();
          if (companyId) {
            params.company_id = `eq.${companyId}`;
          }

          return _http
            .get<
              {
                id: string;
                company_id?: string;
                first_name?: string;
                father_name?: string;
                position?: {
                  id: string;
                  name: string;
                  admin: boolean;
                  schedule_admin?: boolean;
                  schedule_approver?: boolean;
                  dashboard_access?: boolean;
                  default_view?: string;
                };
              }[]
            >(`${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`, {
              params,
            })
            .pipe(
              switchMap((resp) => {
                // Si no se encuentra el empleado con el company_id actual, buscar sin filtro de company_id
                // Esto permite encontrar al empleado aunque esté en otra organización
                if (!resp || resp.length === 0) {
                  console.warn(
                    '⚠️ Empleado no encontrado con company_id actual, buscando sin filtro...'
                  );
                  const paramsWithoutCompany = {
                    work_email: `eq.${user.email}`,
                    select: `id,company_id,first_name,father_name,${positionSelect}`,
                  };
                  return _http.get<typeof resp>(
                    `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
                    { params: paramsWithoutCompany }
                  );
                }
                return of(resp || []);
              }),
              tapResponse({
                next: (resp) => {
                  if (resp && resp.length > 0) {
                    const employee = resp[0];
                    patchState(state, { currentEmployeeId: employee.id });

                    const currentCompanyId = _orgService.getCurrentCompanyId();
                    const nazCompanyId = _orgService.getNazCompanyId();
                    const blackdogCompanyId =
                      _orgService.getBlackdogCompanyId();

                    // Solo actualizar la organización automáticamente en el login inicial
                    // NO cambiar si el usuario ya tiene una organización seleccionada
                    // (respetar selección manual del usuario)
                    if (employee.company_id) {
                      // Verificar si es la primera vez (no hay company_id en localStorage)
                      const savedCompanyId = typeof window !== 'undefined' && window.localStorage
                        ? window.localStorage.getItem('selected_company_id')
                        : null;
                      
                      if (!savedCompanyId) {
                        // Primera vez/login: usar el company_id del empleado
                        if (employee.company_id === nazCompanyId) {
                          _orgService.setOrganization('naz');
                          console.log(
                            '✅ Organización establecida desde empleado: Naz'
                          );
                        } else if (employee.company_id === blackdogCompanyId) {
                          _orgService.setOrganization('blackdog');
                          console.log(
                            '✅ Organización establecida desde empleado: Black Dog'
                          );
                        }
                      } else {
                        // Ya hay una selección previa: NO cambiar automáticamente
                        // Respetar la selección del usuario (puede ser diferente al company_id del empleado)
                        console.log(
                          '✅ Respetando selección del usuario:',
                          _orgService.currentOrganization,
                          'company_id:',
                          currentCompanyId,
                          '(empleado pertenece a:',
                          employee.company_id === nazCompanyId ? 'Naz' : employee.company_id === blackdogCompanyId ? 'Black Dog' : 'otro',
                          ')'
                        );
                      }
                    }
                  } else {
                    console.warn(
                      '⚠️ No se encontró empleado con el email:',
                      user.email
                    );
                  }
                },
                error: (error) => {
                  console.error('Error buscando empleado:', error);
                },
              })
            );
        })
      )
    ),
  })),
  withHooks({ onInit: ({ getCurrentEmployee }) => getCurrentEmployee() })
);
