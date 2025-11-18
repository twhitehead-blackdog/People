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
  return signalStoreFeature(
    withState<State>({
      isLoading: false,
      error: null,
      selectedEntityId: null,
      lastUpdated: null,
    }),
    withEntities({ entity: type<T>() }),
    withProps(() => ({
      _http: inject(HttpClient),
      _message: inject(MessageService),
      _confirm: inject(ConfirmationService),
    })),
    withComputed(({ entityMap, selectedEntityId }) => ({
      selectedEntity: computed(() => {
        const selectedId = selectedEntityId();
        return selectedId ? entityMap()[selectedId] : null;
      }),
    })),
    withMethods((state) => ({
      selectEntity: (id: EntityId) => {
        patchState(state, { selectedEntityId: id });
        if (query === detailsQuery) {
          return;
        }
        state._http
          .get<T>(`${process.env['ENV_SUPABASE_URL']}/rest/v1/${name}`, {
            params: { id: `eq.${id}`, select: detailsQuery },
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
      clearSelectedEntity: () => patchState(state, { selectedEntityId: null }),
      fetchItems: rxMethod<void>(
        pipe(
          filter(
            () =>
              state.lastUpdated() === null ||
              differenceInSeconds(new Date(), state.lastUpdated()!) > 30
          ),
          tap(() => patchState(state, { isLoading: true, error: null })),
          switchMap(() =>
            state._http
              .get<T[]>(`${process.env['ENV_SUPABASE_URL']}/rest/v1/${name}`, {
                params: { select: query, order: order },
              })
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
              )
          )
        )
      ),
      createItem(request: T): Observable<T[]> {
        patchState(state, { isLoading: true, error: null });
        return state._http
          .post<T[]>(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/${name}`,
            request,
            { params: { select: query } }
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
        return state._http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/${name}`,
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
            state._http
              .delete(`${process.env['ENV_SUPABASE_URL']}/rest/v1/${name}`, {
                params: { id: `eq.${id}` },
              })
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
    }))
  );
}
