import { computed } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { addEntity, updateEntity } from '@ngrx/signals/entities';
import { differenceInMonths } from 'date-fns';
import { exhaustMap, firstValueFrom, of } from 'rxjs';
import { Employee, Termination, TimeOff, TimeOffType } from '../models';
import { withCustomEntities } from './entities.feature';
import { withRealtimeSync } from './realtime.feature';

type State = {
  timeoff_types: TimeOffType[];
};

export const EmployeesStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ timeoff_types: [] }),
  withCustomEntities<Employee>({
    name: 'employees',
    // Query base - se adaptará automáticamente para naz_* cuando corresponda
    // Nota: naz_positions no tiene default_view, así que no lo incluimos
    query:
      'id,employee_number,first_name,middle_name,father_name,mother_name,birth_date,gender,start_date,monthly_salary,document_id,uniform_size,end_date,email,phone_number,is_active,company_id,branch_id,department_id,position_id,created_at,updated_at,branch:branches(id,name,short_name,zone),department:departments(id,name),position:positions(id,name,admin,schedule_admin,schedule_approver,dashboard_access,default_view),work_email,work_phone_number,has_portal_access,account_approved,frontend_permissions_override,legacy_permissions_override,code_uri,hr_pin,address,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,bank,account_number,bank_account_type,hourly_salary,payroll_type,use_timelog,total_lunch_exceeded_minutes',
    detailsQuery:
      '*, branch:branches(*), department:departments(*), position:positions(*)',
  }),
  withRealtimeSync('employees'),
  withComputed((state) => {
    const employeesList = computed(() =>
      state
        .entities()
        .map((item) => ({
          ...item,
          full_name: `${item.first_name} ${item.middle_name} ${item.father_name} ${item.mother_name}`,
          short_name: `${item.first_name} ${item.father_name}`,
          months: differenceInMonths(new Date(), item.start_date ?? new Date()),
          probatory:
            differenceInMonths(new Date(), item.start_date ?? new Date()) < 3,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
    );
    const activeEmployees = computed(() =>
      employeesList().filter((x) => x.is_active)
    );
    return {
      employeesList,
      activeEmployees,
    };
  }),
  withMethods((state) => ({
    terminateEmployee(request: Termination) {
      patchState(state, { isLoading: true, error: null });
      const companyId = state._orgService.getCurrentCompanyId();
      const params: any = { id: `eq.${request.employee_id}` };

      // Agregar filtro por company_id para seguridad
      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }

      return state._http
        .post(state._apiUrl.build('rest/v1/terminations'), request)
        .pipe(
          exhaustMap(() =>
            state._http.patch(
              state._apiUrl.build('rest/v1/employees', params),
              {
                is_active: false,
                end_date: request.date, // Actualizar también el campo end_date con la fecha de terminación
              }
            )
          ),
          tapResponse({
            next: () => {
              state._message.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Empleado terminado exitosamente',
              });
            },
            error: (error) => {
              state._message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al terminar empleado',
              });
              patchState(state, { error });
            },
            finalize: () => patchState(state, { isLoading: false }),
          })
        );
    },
    reintegrateEmployee(employeeId: string, reintegrationDate: string) {
      patchState(state, { isLoading: true, error: null });
      const companyId = state._orgService.getCurrentCompanyId();

      // 1. Buscar la terminación más reciente sin reintegration_date
      const terminationParams: any = {
        employee_id: `eq.${employeeId}`,
        reintegration_date: 'is.null',
        order: 'date.desc',
        limit: '1',
        select: 'id',
      };

      return state._http
        .get<{ id: string }[]>(
          state._apiUrl.build('rest/v1/terminations', terminationParams)
        )
        .pipe(
          exhaustMap((terminations) => {
            if (terminations && terminations.length > 0) {
              // PATCH reintegration_date en la terminación
              return state._http.patch(
                state._apiUrl.build('rest/v1/terminations', {
                  id: `eq.${terminations[0].id}`,
                }),
                { reintegration_date: reintegrationDate }
              );
            }
            // Sin terminación, continuar igual para reactivar
            return of('no_termination');
          }),
          exhaustMap(() => {
            // PATCH empleado: reactivar
            const employeeParams: any = { id: `eq.${employeeId}` };
            if (companyId) {
              employeeParams.company_id = `eq.${companyId}`;
            }
            return state._http.patch(
              state._apiUrl.build('rest/v1/employees', employeeParams),
              { is_active: true, end_date: null }
            );
          }),
          tapResponse({
            next: () => {
              state._message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Empleado reintegrado exitosamente',
              });
            },
            error: (error) => {
              state._message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al reintegrar empleado',
              });
              patchState(state, { error });
            },
            finalize: () => patchState(state, { isLoading: false }),
          })
        );
    },
    saveTimeOff(request: TimeOff) {
      patchState(state, { isLoading: true, error: null });
      return state._http
        .post(state._apiUrl.build('rest/v1/timeoffs'), request)
        .pipe(
          tapResponse({
            next: async (response) => {
              state._message.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Solicitud de tiempo libre enviada',
              });

              // Crear notificación en el buzón
              try {
                const timeoffId = Array.isArray(response)
                  ? (response[0] as any)?.id
                  : (response as any)?.id;

                if (timeoffId && request.employee_id) {
                  // Obtener información del tipo de timeoff
                  const timeoffType = state
                    .timeoff_types()
                    .find((t) => t.id === request.type_id);

                  await firstValueFrom(
                    state._http.post(
                      state._apiUrl.build('rest/v1/hr_messages'),
                      {
                        employee_id: request.employee_id,
                        related_type: 'timeoff',
                        related_id: timeoffId,
                        message_type: 'timeoff_created',
                        title: 'Solicitud de tiempo libre enviada',
                        message: `Tu solicitud de ${timeoffType?.name || 'tiempo libre'
                          } ha sido enviada y está pendiente de aprobación.`,
                        is_read: false,
                      },
                      {
                        headers: {
                          'Content-Type': 'application/json',
                          Prefer: 'return=representation',
                        },
                      }
                    )
                  );
                }
              } catch (error) {
                console.error('Error al crear notificación:', error);
                // No fallar el flujo principal si la notificación falla
              }
            },
            error: (error) => {
              state._message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al enviar solicitud de tiempo libre',
              });
              patchState(state, { error });
            },
            finalize: () => patchState(state, { isLoading: false }),
          })
        );
    },
    fetchTimeOffTypes() {
      patchState(state, { isLoading: true });
      return state._http
        .get<TimeOffType[]>(state._apiUrl.build('rest/v1/timeoff_types'))
        .pipe(
          tapResponse({
            next: (items) => {
              patchState(state, { timeoff_types: items });
            },
            error: (error) => {
              state._message.add({
                severity: 'error',
                detail: 'Error al obtener tipos de tiempo libre',
                summary: 'Error',
              });
              console.error(error);
              throw error;
            },
            finalize: () => patchState(state, { isLoading: false }),
          })
        );
    },
    /**
     * Carga un empleado específico sin filtrar por company_id
     * Útil para cargar el empleado actual cuando no coincide con el company_id actual
     */
    ensureEmployeeLoaded: (employeeId: string) => {
      // Query completa con todas las relaciones necesarias
      const query =
        'id,employee_number,first_name,middle_name,father_name,mother_name,birth_date,gender,start_date,monthly_salary,document_id,end_date,email,phone_number,work_phone_number,is_active,uniform_size,company_id,branch_id,department_id,position_id,bank,account_number,bank_account_type,created_at,code_uri,branch:branches(id,name,short_name,zone),department:departments(id,name),position:positions(id,name,admin,schedule_admin,schedule_approver,default_view),address,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,work_email,has_portal_access,account_approved,total_lunch_exceeded_minutes,frontend_permissions_override,legacy_permissions_override';

      // NO filtrar por company_id para asegurar que se cargue el empleado
      const params: any = {
        id: `eq.${employeeId}`,
        select: query,
      };

      state._http
        .get<Employee[]>(state._apiUrl.build('rest/v1/employees', params), {})
        .pipe(
          tapResponse({
            next: (employees) => {
              if (employees && employees.length > 0) {
                const loadedEmployee = employees[0];
                // Verificar si el empleado ya existe en entities
                const allEmployees = state.entities();
                const existingEmployee = allEmployees.find(
                  (x) => x.id === loadedEmployee.id
                );

                if (existingEmployee) {
                  // Actualizar el empleado existente
                  patchState(
                    state,
                    updateEntity({
                      id: loadedEmployee.id,
                      changes: loadedEmployee,
                    })
                  );
                } else {
                  // Agregar el empleado si no existe
                  patchState(state, addEntity(loadedEmployee));
                }
                console.log(
                  '✅ Empleado cargado en EmployeesStore:',
                  loadedEmployee.first_name,
                  loadedEmployee.father_name,
                  '- Position:',
                  loadedEmployee.position?.name || 'Sin cargo'
                );
              }
            },
            error: (error) => {
              console.error(
                '❌ Error cargando empleado en EmployeesStore:',
                error
              );
            },
          })
        )
        .subscribe();
    },
  })),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
