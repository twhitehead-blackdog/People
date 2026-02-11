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
import { exhaustMap, firstValueFrom } from 'rxjs';
import { Employee, Termination, TimeOff, TimeOffType } from '../models';
import { withCustomEntities } from './entities.feature';

type State = {
  timeoff_types: TimeOffType[];
};

export const EmployeesStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ timeoff_types: [] }),
  withCustomEntities<Employee>({
    name: 'employees',
    // Query base - se adaptará automáticamente para naz_* cuando corresponda
    // Nota: naz_positions no tiene dashboard_access ni default_view, así que no los incluimos
    query:
      'id,employee_number,first_name,middle_name,father_name,mother_name,birth_date,gender,start_date,monthly_salary,document_id,end_date,email,phone_number,work_phone_number,is_active,uniform_size,company_id,branch_id,department_id,position_id,bank,account_number,bank_account_type,created_at,code_uri,branch:branches(id,name,short_name),department:departments(id,name),position:positions(id,name,admin,schedule_admin,schedule_approver,dashboard_access,default_view),address,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,work_email,has_portal_access,account_approved,total_lunch_exceeded_minutes,frontend_permissions_override',
    detailsQuery:
      '*, branch:branches(*), department:departments(*), position:positions(*)',
  }),
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
                        message: `Tu solicitud de ${
                          timeoffType?.name || 'tiempo libre'
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
        'id,employee_number,first_name,middle_name,father_name,mother_name,birth_date,gender,start_date,monthly_salary,document_id,end_date,email,phone_number,work_phone_number,is_active,uniform_size,company_id,branch_id,department_id,position_id,bank,account_number,bank_account_type,created_at,code_uri,branch:branches(id,name,short_name),department:departments(id,name),position:positions(id,name,admin,schedule_admin,schedule_approver,dashboard_access,default_view),address,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,work_email,has_portal_access,account_approved,total_lunch_exceeded_minutes,frontend_permissions_override';

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
