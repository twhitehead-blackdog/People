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
  })),
  withMethods(({ _auth, _http, _orgService, ...state }) => ({
    getCurrentEmployee: rxMethod<void>(
      pipe(
        switchMap(() => {
          // Usar Auth0
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
            select: `id,company_id,first_name,father_name,work_email,${positionSelect}`,
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
                work_email?: string;
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
                    select: `id,company_id,first_name,father_name,work_email,${positionSelect}`,
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

                    // Verificar si el empleado es admin (puede ver todas las organizaciones)
                    const isAdmin = employee.position?.admin || false;
                    const superAdminEmails = [
                      'mercadeo@blackdogpanama.com',
                      'soporte2@blackdogpanama.com',
                    ];
                    const isSuperAdmin =
                      employee.work_email &&
                      superAdminEmails.includes(
                        employee.work_email.toLowerCase()
                      );
                    const canAccessAllOrgs = isAdmin || isSuperAdmin;

                    // En el login inicial, siempre usar el company_id del empleado
                    // Solo respetar selección manual si el usuario ya estaba logueado y cambió manualmente
                    // Para detectar si es login inicial, verificamos si hay un company_id guardado
                    // Si no hay company_id guardado, es login inicial y debemos usar el del empleado
                    if (employee.company_id) {
                      // Verificar si es login inicial (no hay company_id en localStorage)
                      const savedCompanyId =
                        typeof window !== 'undefined' && window.localStorage
                          ? window.localStorage.getItem('selected_company_id')
                          : null;

                      // Si es login inicial (no hay company_id guardado) o NO es admin:
                      // usar el company_id del empleado
                      if (!savedCompanyId || !canAccessAllOrgs) {
                        // Login inicial o usuario no admin: usar el company_id del empleado
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
                        // Admin con selección previa: respetar su selección manual
                        // (puede trabajar con cualquier organización)
                        console.log(
                          '✅ Respetando selección del admin:',
                          _orgService.currentOrganization,
                          'company_id:',
                          currentCompanyId,
                          '(admin puede trabajar con cualquier organización)'
                        );
                      }
                    } else if (canAccessAllOrgs) {
                      // Empleado sin company_id pero es admin: usar Black Dog por defecto
                      if (!currentCompanyId) {
                        _orgService.setOrganization('blackdog');
                        console.log(
                          '✅ Admin sin company_id asignado, estableciendo Black Dog por defecto'
                        );
                      } else {
                        console.log(
                          '✅ Admin sin company_id asignado, respetando selección:',
                          _orgService.currentOrganization
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
