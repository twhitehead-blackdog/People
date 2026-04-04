import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { ApiUrlService } from '../services/api-url.service';
import {
  patchState,
  signalStoreFeature,
  type,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  EntityId,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { differenceInSeconds } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { filter, from, Observable, pipe, switchMap, tap } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { RealtimeBatch } from '../services/supabase-realtime.service';
import { getTableNameFromService } from '../utils/table-helper';

type State = {
  error: any;
  isLoading: boolean;
  selectedEntityId: EntityId | null;
  lastUpdated: Date | null;
};

// Duración de caché por tipo de entidad (en segundos)
const CACHE_DURATION: Record<string, number> = {
  companies: 30 * 60,      // 30 minutos - catálogo que cambia muy poco
  branches: 30 * 60,       // 30 minutos - catálogo que cambia muy poco
  schedules: 60 * 60,      // 60 minutos - horarios que cambian raramente
  positions: 30 * 60,      // 30 minutos - cargos que cambian poco
  departments: 30 * 60,    // 30 minutos - departamentos que cambian poco
  employees: 5 * 60,       // 5 minutos - datos que pueden cambiar más frecuentemente
  timelogs: 2 * 60,        // 2 minutos - datos dinámicos (antes 30seg era excesivo)
  default: 5 * 60,         // 5 minutos por defecto
};

export function withCustomEntities<T extends { id: EntityId }>({
  name,
  query = '*',
  detailsQuery = '*',
  order = 'id',
}: {
  name: string;
  query?: string;
  detailsQuery?: string;
  order?: string;
}) {
  // Helper para agregar filtro de company_id a los parámetros de query
  // Ya no hay tablas naz_*, todo se filtra por company_id
  const addCompanyFilter = (
    params: any,
    companyId: string | null,
    tableName: string,
    orgService: OrganizationService
  ): any => {
    if (!companyId) {
      return params;
    }

    // Tablas que NO tienen company_id (entidades principales)
    // Estas tablas no deben filtrarse por company_id
    const tablesWithoutCompanyId = ['companies'];

    // Si la tabla no tiene company_id, no agregar filtro
    if (tablesWithoutCompanyId.includes(tableName)) {
      return params;
    }

    // Tablas que tienen company_id y deben filtrarse siempre
    const tablesWithCompanyId = [
      'employees',
      'branches',
      'departments',
      'positions',
      'schedules',
      'employee_schedules',
      'attendance_sheets',
      'timelogs',
      'payrolls',
      'devices',
      'device_assignments',
      'recruitment_rules',
      'recruitment_classifications',
    ];

    // Bancos y creditors pueden tener company_id NULL (compartidos)
    // Para estos, necesitamos incluir tanto los del company_id como los compartidos (NULL)
    if (tableName === 'banks' || tableName === 'creditors') {
      // PostgREST/Supabase usa or= para condiciones OR
      // La sintaxis correcta es: or=(condition1,condition2)
      // Nota: Los paréntesis deben estar en el valor, no en el nombre del parámetro
      return {
        ...params,
        or: `(company_id.is.null,company_id.eq.${companyId})`,
      };
    }

    // TEMP: Positions - No agregar filtro de company_id hasta que PostgREST reconozca la columna
    // if (tableName === 'positions' && companyId) {
    //   return {
    //     ...params,
    //     or: `(company_id.is.null,company_id.eq.${companyId})`,
    //   };
    // }

    // Schedules puede tener company_id NULL temporalmente (durante migración)
    // Incluir tanto schedules con company_id como sin company_id para evitar problemas
    if (tableName === 'schedules' && companyId) {
      return {
        ...params,
        or: `(company_id.is.null,company_id.eq.${companyId})`,
      };
    }

    if (tablesWithCompanyId.includes(tableName)) {
      return {
        ...params,
        company_id: `eq.${companyId}`,
      };
    }

    return params;
  };

  // Helper para limpiar query de campos opcionales que pueden no existir
  // Ya no hay tablas naz_*, todo es por company_id en tablas compartidas
  const cleanQuery = (
    q: string,
    tableName: string,
    orgService: OrganizationService
  ): string => {
    const cleaned = q;

    // Ya no necesitamos adaptar relaciones para naz_* porque todo usa tablas compartidas
    // Solo limpiar campos que pueden no existir en algunas versiones

    // positions puede no tener estos campos si fueron agregados después
    // (mantener compatibilidad con tablas que no los tienen)
    if (tableName === 'positions') {
      // No remover, solo asegurar que la query funcione
      // Los campos opcionales se manejarán en el backend
    }

    // employees puede no tener use_timelog o week_hours en algunos casos
    if (tableName === 'employees') {
      // No remover, solo asegurar que la query funcione
      // Los campos opcionales se manejarán en el backend
    }

    return cleaned;
  };
  return signalStoreFeature(
    withState<State>({
      isLoading: false,
      error: null,
      selectedEntityId: null,
      lastUpdated: null,
    }),
    withEntities({ entity: type<T>() }),
    withProps(() => {
      // Inyectar servicios
      const _http = inject(HttpClient);
      const _message = inject(MessageService);
      const _confirm = inject(ConfirmationService);
      const _orgService = inject(OrganizationService);
      const _apiUrl = inject(ApiUrlService);

      return {
        _http,
        _message,
        _confirm,
        _orgService,
        _apiUrl,
      };
    }),
    withComputed(({ entityMap, selectedEntityId }) => ({
      selectedEntity: computed(() => {
        const selectedId = selectedEntityId();
        return selectedId ? entityMap()[selectedId] : null;
      }),
    })),
    withMethods((state) => {
      // Helper para obtener el company_id actual
      const getCurrentCompanyId = () => state._orgService.getCurrentCompanyId();

      // Obtener el nombre correcto de la tabla según la organización
      const getTable = () => getTableNameFromService(name, state._orgService);

      // Helper to perform a full reload (shared between reloadItems and _handleRealtimeBatch)
      const doReload = () => {
        patchState(state, { lastUpdated: null, isLoading: true, error: null });
        const tableName = getTable();
        const companyId = getCurrentCompanyId();
        const cleanedQuery = cleanQuery(query, tableName, state._orgService);
        const params = addCompanyFilter(
          { select: cleanedQuery, order: order },
          companyId,
          tableName,
          state._orgService
        );
        const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
        state._http
          .get<T[]>(url)
          .pipe(
            tapResponse({
              next: (entities) => {
                patchState(state, setAllEntities(entities), {
                  lastUpdated: new Date(),
                });
              },
              error: (error: unknown) => {
                console.error(`[${name}] Error reloading items:`, error);
                patchState(state, { error });
              },
              finalize: () => patchState(state, { isLoading: false }),
            })
          )
          .subscribe();
      };

      return {
        selectEntity: (id: EntityId) => {
          patchState(state, { selectedEntityId: id });
          if (query === detailsQuery) {
            return;
          }
          const tableName = getTable();
          const cleanedQuery = cleanQuery(
            detailsQuery,
            tableName,
            state._orgService
          );
          const companyId = getCurrentCompanyId();
          const params = addCompanyFilter(
            { id: `eq.${id}`, select: cleanedQuery },
            companyId,
            tableName,
            state._orgService
          );
          const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
          state._http
            .get<T>(url)
            .pipe(
              tapResponse({
                next: (changes) => {
                  patchState(state, updateEntity({ id: changes.id, changes }));
                },
                error: (error) => {
                  patchState(state, { error });
                },
              })
            )
            .subscribe();
        },
        clearSelectedEntity: () =>
          patchState(state, { selectedEntityId: null }),
        fetchItems: rxMethod<void>(
          pipe(
            filter(() => {
              const tableName = getTable();
              // Obtener duración de caché específica para esta entidad o usar default
              const cacheDuration = CACHE_DURATION[tableName] || CACHE_DURATION['default'];
              
              return (
                state.lastUpdated() === null ||
                differenceInSeconds(new Date(), state.lastUpdated()!) > cacheDuration
              );
            }),
            tap(() => patchState(state, { isLoading: true, error: null })),
            switchMap(() => {
              const tableName = getTable();
              const companyId = getCurrentCompanyId();
              const cleanedQuery = cleanQuery(
                query,
                tableName,
                state._orgService
              );

              // Usar el filtro normal que maneja correctamente banks, creditors y positions con or=
              const params = addCompanyFilter(
                { select: cleanedQuery, order: order },
                companyId,
                tableName,
                state._orgService
              );

              const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
              return state._http
                .get<T[]>(url)
                .pipe(
                  tapResponse({
                    next: (entities) => {
                      patchState(state, setAllEntities(entities), {
                        lastUpdated: new Date(),
                      });
                    },
                    error: (error: unknown) => {
                      console.error(`[${name}] Error fetching items:`, error);
                      patchState(state, { error });
                    },
                    finalize: () => patchState(state, { isLoading: false }),
                  })
                );
            })
          )
        ),
        reloadItems: rxMethod<void>(
          pipe(
            tap(() => {
              // Reset lastUpdated to force reload
              patchState(state, {
                lastUpdated: null,
                isLoading: true,
                error: null,
              });
            }),
            switchMap(() => {
              const tableName = getTable();
              const companyId = getCurrentCompanyId();
              const cleanedQuery = cleanQuery(
                query,
                tableName,
                state._orgService
              );

              // Usar el filtro normal que maneja correctamente banks, creditors y positions con or=
              const params = addCompanyFilter(
                { select: cleanedQuery, order: order },
                companyId,
                tableName,
                state._orgService
              );

              // Debug: Log para posiciones
              if (tableName === 'positions') {
                console.log(
                  '[PositionsStore] Cargando posiciones con params:',
                  params
                );
                console.log('[PositionsStore] Company ID:', companyId);
              }

              const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
              return state._http
                .get<T[]>(url)
                .pipe(
                  tapResponse({
                    next: (entities) => {
                      // Debug: Log para posiciones
                      if (tableName === 'positions') {
                        console.log(
                          '[PositionsStore] Posiciones recibidas:',
                          entities.length,
                          entities
                        );
                        if (entities.length === 0) {
                          console.warn(
                            '[PositionsStore] ⚠️ No se encontraron posiciones. Verificar que existan posiciones con company_id:',
                            companyId
                          );
                        }
                      }
                      patchState(state, setAllEntities(entities), {
                        lastUpdated: new Date(),
                      });
                    },
                    error: (error) => {
                      // Debug: Log para posiciones
                      if (tableName === 'positions') {
                        console.error(
                          '[PositionsStore] ❌ Error cargando posiciones:',
                          error
                        );
                      }
                      patchState(state, { error });
                    },
                    finalize: () => patchState(state, { isLoading: false }),
                  })
                );
            })
          )
        ),
        createItem(request: T): Observable<T[]> {
          patchState(state, { isLoading: true, error: null });
          const tableName = getTable();
          const cleanedQuery = cleanQuery(query, tableName, state._orgService);

          // Asegurar que company_id esté presente en el request
          const requestData: any = { ...request };

          // Agregar company_id si la tabla lo requiere y no está presente
          // Ahora que usamos tablas compartidas, TANTO Naz como Black Dog necesitan company_id
          // NOTA: positions temporalmente excluido - PostgREST no reconoce la columna company_id
          const tablesRequiringCompanyId = [
            'employees',
            'branches',
            'departments',
            // 'positions', // TEMP: Error 400 - column positions.company_id does not exist
            'schedules',
            'employee_schedules',
            'attendance_sheets',
            'timelogs',
            'payrolls',
            'devices',
            'device_assignments',
          ];

          // Función para ejecutar la creación con el company_id correcto
          const doCreate = (companyId: string | null) => {
            // Agregar company_id si la tabla lo requiere y companyId está disponible
            if (
              tablesRequiringCompanyId.includes(name) &&
              companyId &&
              !requestData.company_id
            ) {
              requestData.company_id = companyId;
            }

            // Para banks y creditors, company_id es opcional (puede ser NULL para compartidos)
            if (
              (name === 'banks' || name === 'creditors') &&
              companyId &&
              !requestData.company_id
            ) {
              requestData.company_id = companyId;
            }

            const params = addCompanyFilter(
              { select: cleanedQuery },
              companyId,
              tableName,
              state._orgService
            );

            const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
            return state._http
              .post<T[]>(url, requestData)
              .pipe(
                tapResponse({
                  next: (item) => {
                    patchState(state, addEntity(item[0]));
                    state._message.add({
                      severity: 'success',
                      detail: 'Elemento creado con exito',
                      summary: 'Exito',
                    });
                  },
                  error: (error) => {
                    patchState(state, { error });
                    state._message.add({
                      severity: 'error',
                      detail: 'Algo salio mal, intente de nuevo',
                      summary: 'Error',
                    });
                    console.error(error);
                    throw error;
                  },
                  finalize: () => patchState(state, { isLoading: false }),
                })
              );
          };

          // Esperar a que los company_ids estén listos antes de crear
          const companyId = getCurrentCompanyId();
          if (companyId) {
            // Si ya tenemos company_id, crear inmediatamente
            return doCreate(companyId);
          } else {
            // Si no tenemos company_id, esperar a que esté listo
            return from(state._orgService.waitForCompanyIds()).pipe(
              switchMap(() => {
                const finalCompanyId = getCurrentCompanyId();
                return doCreate(finalCompanyId);
              })
            );
          }
        },
        editItem(request: T): Observable<unknown> {
          patchState(state, { isLoading: true, error: null });
          const tableName = getTable();

          // Asegurar que company_id esté presente en el request si es requerido
          const requestData: any = { ...request };

          // Agregar company_id si la tabla lo requiere y no está presente
          // NOTA: positions temporalmente excluido - PostgREST no reconoce la columna company_id
          const tablesRequiringCompanyId = [
            'employees',
            'branches',
            'departments',
            // 'positions', // TEMP: Error 400 - column positions.company_id does not exist
            'schedules',
            'employee_schedules',
            'attendance_sheets',
            'timelogs',
            'payrolls',
            'devices',
            'device_assignments',
          ];

          // Función para ejecutar la edición con el company_id correcto
          const doEdit = (companyId: string | null) => {
            // Agregar company_id si la tabla lo requiere y companyId está disponible
            if (
              tablesRequiringCompanyId.includes(name) &&
              companyId &&
              !requestData.company_id
            ) {
              requestData.company_id = companyId;
            }

            const params = addCompanyFilter(
              { id: `eq.${request.id}` },
              companyId,
              tableName,
              state._orgService
            );

            const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
            return state._http
              .patch(url, requestData)
              .pipe(
                tap(() => console.log('editItem')),
                tapResponse({
                  next: () => {
                    patchState(
                      state,
                      updateEntity({ id: request.id, changes: request })
                    );
                    state._message.add({
                      severity: 'success',
                      detail: 'Elemento actualizado con exito',
                      summary: 'Exito',
                    });
                  },
                  error: (error) => {
                    patchState(state, { error });
                    state._message.add({
                      severity: 'error',
                      detail: 'Algo salio mal, intente de nuevo',
                      summary: 'Error',
                    });
                    console.error(error);
                    throw error;
                  },
                  finalize: () => patchState(state, { isLoading: false }),
                })
              );
          };

          // Esperar a que los company_ids estén listos antes de editar
          const companyId = getCurrentCompanyId();
          if (companyId) {
            // Si ya tenemos company_id, editar inmediatamente
            return doEdit(companyId);
          } else {
            // Si no tenemos company_id, esperar a que esté listo
            return from(state._orgService.waitForCompanyIds()).pipe(
              switchMap(() => {
                const finalCompanyId = getCurrentCompanyId();
                return doEdit(finalCompanyId);
              })
            );
          }
        },
        deleteItem(id: EntityId): void {
          state._confirm.confirm({
            header: 'Confirmación',
            closable: true,
            closeOnEscape: true,
            icon: 'pi pi-info-circle',
            message: '¿Está seguro que desea eliminar este elemento?',
            rejectButtonProps: {
              label: 'Cancelar',
              severity: 'secondary',
              outlined: true,
              rounded: true,
            },
            acceptButtonProps: {
              label: 'Eliminar',
              severity: 'danger',
              icon: 'pi pi-trash',
              rounded: true,
            },
            accept: () => {
              patchState(state, { isLoading: true, error: null });
              const tableName = getTable();
              const companyId = getCurrentCompanyId();
              const params = addCompanyFilter(
                { id: `eq.${id}` },
                companyId,
                tableName,
                state._orgService
              );
              const url = state._apiUrl.build(`rest/v1/${tableName}`, params);
              state._http
                .delete(url)
                .pipe(
                  tapResponse({
                    next: () => {
                      patchState(state, removeEntity(id));
                      state._message.add({
                        severity: 'info',
                        detail: 'Elemento eliminado con exito',
                        summary: 'Exito',
                      });
                    },
                    error: (error) => {
                      state._message.add({
                        severity: 'error',
                        detail: 'Algo salio mal, intente de nuevo',
                        summary: 'Error',
                      });
                      patchState(state, { error });
                      console.error(error);
                    },
                    finalize: () => patchState(state, { isLoading: false }),
                  })
                )
                .subscribe();
            },
          });
        },
        /**
         * Handle a batch of realtime events from Supabase Realtime.
         * Called by withRealtimeSync feature.
         */
        _handleRealtimeBatch(batch: RealtimeBatch): void {
          // If the query has JOINs (embedded relations), we need a full reload
          // to get the complete data with relations populated.
          const hasJoins = query.includes(':') && query.includes('(');

          let needsReload = false;

          for (const event of batch.events) {
            switch (event.type) {
              case 'INSERT': {
                if (hasJoins) {
                  // Can't add with incomplete data (missing relations), reload
                  needsReload = true;
                } else {
                  const entity = event.record as T;
                  if (entity?.id) {
                    patchState(state, addEntity(entity));
                  }
                }
                break;
              }
              case 'UPDATE': {
                const entity = event.record as T;
                if (entity?.id) {
                  // Update with flat fields immediately for responsiveness
                  patchState(
                    state,
                    updateEntity({ id: entity.id, changes: entity as any })
                  );
                  // If query has JOINs, also reload to refresh embedded relations
                  if (hasJoins) {
                    needsReload = true;
                  }
                }
                break;
              }
              case 'DELETE': {
                const id = event.old_record?.['id'] as EntityId;
                if (id) {
                  patchState(state, removeEntity(id));
                }
                break;
              }
            }
          }

          if (needsReload) {
            doReload();
          }
        },
      };
    })
  );
}
