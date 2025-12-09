import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
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
import { filter, Observable, pipe, switchMap, tap } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { getTableName } from '../utils/table-helper';

type State = {
  error: any;
  isLoading: boolean;
  selectedEntityId: EntityId | null;
  lastUpdated: Date | null;
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
  // Helper para adaptar queries que contienen referencias a otras tablas
  const adaptQuery = (q: string, isNaz: boolean, tableName: string): string => {
    if (!isNaz) return q;

    // payrolls es una tabla compartida, no tiene versión naz_*
    // No adaptar sus queries
    if (tableName === 'payrolls') return q;

    let adapted = q
      .replace(/branch:branches/g, 'branch:naz_branches')
      .replace(/department:departments/g, 'department:naz_departments')
      .replace(/position:positions/g, 'position:naz_positions')
      .replace(/schedule:schedules/g, 'schedule:naz_schedules')
      .replace(/company:companies/g, 'company:naz_companies');

    // naz_positions no tiene dashboard_access ni default_view
    // Remover estos campos de las queries cuando se adapten para naz_positions
    adapted = adapted.replace(/position:naz_positions\([^)]*\)/g, (match) => {
      // Remover dashboard_access y default_view si están presentes
      let cleaned = match
        .replace(/dashboard_access[,\s]*/g, '')
        .replace(/default_view[,\s]*/g, '')
        .replace(/,\s*,/g, ',') // Limpiar comas dobles
        .replace(/\(,/g, '(') // Limpiar comas al inicio
        .replace(/,\s*\)/g, ')'); // Limpiar comas al final

      // Si después de limpiar solo queda position:naz_positions(), usar solo los campos básicos
      if (cleaned === 'position:naz_positions()') {
        cleaned =
          'position:naz_positions(id,name,admin,schedule_admin,schedule_approver)';
      }

      return cleaned;
    });

    return adapted;
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

      return {
        _http,
        _message,
        _confirm,
        _orgService,
      };
    }),
    withComputed(({ entityMap, selectedEntityId }) => ({
      selectedEntity: computed(() => {
        const selectedId = selectedEntityId();
        return selectedId ? entityMap()[selectedId] : null;
      }),
    })),
    withMethods((state) => {
      // Helper para obtener el nombre de tabla correcto
      const getTable = () => getTableName(name, state._orgService.isNaz());
      const isNaz = () => state._orgService.isNaz();

      return {
        selectEntity: (id: EntityId) => {
          patchState(state, { selectedEntityId: id });
          if (query === detailsQuery) {
            return;
          }
          const tableName = getTable();
          const adaptedDetailsQuery = adaptQuery(detailsQuery, isNaz(), name);
          state._http
            .get<T>(`${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`, {
              params: { id: `eq.${id}`, select: adaptedDetailsQuery },
            })
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
            filter(
              () =>
                state.lastUpdated() === null ||
                differenceInSeconds(new Date(), state.lastUpdated()!) > 30
            ),
            tap(() => patchState(state, { isLoading: true, error: null })),
            switchMap(() => {
              const tableName = getTable();
              const adaptedQuery = adaptQuery(query, isNaz(), name);
              return state._http
                .get<T[]>(
                  `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
                  {
                    params: { select: adaptedQuery, order: order },
                  }
                )
                .pipe(
                  tapResponse({
                    next: (entities) =>
                      patchState(state, setAllEntities(entities), {
                        lastUpdated: new Date(),
                      }),
                    error: (error) => {
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
              const adaptedQuery = adaptQuery(query, isNaz(), name);
              return state._http
                .get<T[]>(
                  `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
                  {
                    params: { select: adaptedQuery, order: order },
                  }
                )
                .pipe(
                  tapResponse({
                    next: (entities) =>
                      patchState(state, setAllEntities(entities), {
                        lastUpdated: new Date(),
                      }),
                    error: (error) => {
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
          const adaptedQuery = adaptQuery(query, isNaz(), name);
          return state._http
            .post<T[]>(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
              request,
              { params: { select: adaptedQuery } }
            )
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
        },
        editItem(request: T) {
          patchState(state, { isLoading: true, error: null });
          const tableName = getTable();
          return state._http
            .patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
              request,
              { params: { id: `eq.${request.id}` } }
            )
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
              state._http
                .delete(
                  `${process.env['ENV_SUPABASE_URL']}/rest/v1/${tableName}`,
                  {
                    params: { id: `eq.${id}` },
                  }
                )
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
      };
    })
  );
}
