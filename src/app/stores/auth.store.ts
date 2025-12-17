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
import { filter, pipe, switchMap, catchError, merge, of } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { AuthBypassService } from '../services/auth-bypass.service';
import { getTableNameFromService } from '../utils/table-helper';

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
            console.log('🔓 [AuthStore] Usando bypass, usuario:', bypassUser?.email);
            if (bypassUser) {
              // Retornar el usuario del bypass como Observable
              return of(bypassUser);
            }
            console.warn('🔓 [AuthStore] Bypass activo pero no hay usuario');
          }
          // Si no, usar Supabase Auth
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
            select: `id,company_id,first_name,father_name,${positionSelect}`
          };
          
          // Siempre agregar filtro por company_id
          const companyId = _orgService.getCurrentCompanyId();
          if (companyId) {
            params.company_id = `eq.${companyId}`;
          }
          
          return _http
            .get<{ 
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
            }[]>(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
              { params }
            )
            .pipe(
              switchMap((resp) => {
                // Ya no hay fallback a naz_*, solo retornar la respuesta
                return of(resp || []);
              }),
              tapResponse({
                next: (resp) => {
                  if (resp && resp.length > 0) {
                    const employee = resp[0];
                    patchState(state, { currentEmployeeId: employee.id });
                    
                    // Solo actualizar la organización si no hay una seleccionada previamente
                    // (respetar la selección del usuario en el login)
                    const currentCompanyId = _orgService.getCurrentCompanyId();
                    
                    // Si no hay company_id seleccionado, usar el del empleado
                    if (!currentCompanyId && employee.company_id) {
                      const nazCompanyId = _orgService.getNazCompanyId();
                      const blackdogCompanyId = _orgService.getBlackdogCompanyId();
                      
                      // Actualizar organización basada en company_id del empleado
                      if (employee.company_id === nazCompanyId) {
                        _orgService.setOrganization('naz');
                        console.log('✅ Organización establecida desde empleado: Naz');
                      } else if (employee.company_id === blackdogCompanyId) {
                        _orgService.setOrganization('blackdog');
                        console.log('✅ Organización establecida desde empleado: Black Dog');
                      }
                    } else if (currentCompanyId) {
                      console.log('✅ Manteniendo company_id seleccionado en login:', currentCompanyId);
                    }
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
