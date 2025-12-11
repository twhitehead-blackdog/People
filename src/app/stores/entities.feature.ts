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
import { AuditService } from '../services/audit.service';

// Helper para obtener email del usuario actual
function getCurrentUserEmail(): string | undefined {
  try {
    const authData = localStorage.getItem('auth_data');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.email || parsed.user?.email;
    }
  } catch (e) {
    // Ignorar errores
  }
  return undefined;
}

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
      _audit: inject(AuditService),
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
              error: (error: any) => {
                patchState(state, { error });
                // El interceptor HTTP mostrará la notificación automáticamente
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
          tap(() => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'entities.feature.ts:110',message:'fetchItems - inicio',data:{entityName:name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            patchState(state, { isLoading: true, error: null });
          }),
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
                  error: (error: any) => {
                    patchState(state, { error, isLoading: false });
                    // El interceptor HTTP mostrará la notificación automáticamente
                  },
                  finalize: () => patchState(state, { isLoading: false }),
                })
              )
          )
        )
      ),
      reloadItems: rxMethod<void>(
        pipe(
          tap(() => {
            // Reset lastUpdated to force reload
            patchState(state, { lastUpdated: null, isLoading: true, error: null });
          }),
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
                  error: (error: any) => {
                    patchState(state, { error, isLoading: false });
                    // El interceptor HTTP mostrará la notificación automáticamente
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
                // Logging automático de auditoría
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'entities.feature.ts:177',message:'createItem - iniciando logging',data:{entityType:name,entityId:String(item[0].id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                state._audit.logAction(
                  name,
                  String(item[0].id),
                  'create',
                  {
                    userEmail: getCurrentUserEmail(),
                    metadata: { created: true },
                  }
                ).subscribe({
                  next: (log) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'entities.feature.ts:189',message:'createItem - logging exitoso',data:{logId:log?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                  },
                  error: (err) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'entities.feature.ts:195',message:'createItem - error en logging',data:{error:err?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                  }
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
        
        // Obtener entidad anterior para calcular cambios
        const oldEntity = state.entityMap()[request.id] as T | undefined;
        
        // Filtrar campos que no deben enviarse en el PATCH:
        // - id: ya está en los params
        // - Relaciones expandidas (objetos anidados)
        // - created_at: no debería actualizarse manualmente
        const { id, created_at, ...updateData } = request as any;
        
        // Remover relaciones expandidas (campos que son objetos planos)
        const cleanData: any = {};
        for (const [key, value] of Object.entries(updateData)) {
          // Incluir: primitivos, null, undefined, arrays, Dates
          // Excluir: objetos planos (que son relaciones expandidas como pet, foundation, etc.)
          if (value === null || 
              value === undefined || 
              Array.isArray(value) ||
              value instanceof Date ||
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean') {
            cleanData[key] = value;
          }
          // Excluir objetos planos (relaciones expandidas)
        }
        
        // Determinar si es cambio de estado
        const isStatusChange = oldEntity && 
          (oldEntity as any).status !== undefined && 
          (oldEntity as any).status !== (request as any).status;
        
        return state._http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/${name}`,
            cleanData,
            { params: { id: `eq.${request.id}` } }
          )
          .pipe(
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
                // Logging automático de auditoría
                const changes = oldEntity 
                  ? state._audit.calculateChanges(oldEntity, request)
                  : undefined;
                state._audit.logAction(
                  name,
                  String(request.id),
                  isStatusChange ? 'status_change' : 'update',
                  {
                    userEmail: getCurrentUserEmail(),
                    changes,
                    metadata: { updated: true },
                  }
                ).subscribe();
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
            // Obtener entidad antes de eliminar para logging
            const entityToDelete = state.entityMap()[id] as T | undefined;
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
                    // Logging automático de auditoría
                    state._audit.logAction(
                      name,
                      String(id),
                      'delete',
                      {
                        userEmail: getCurrentUserEmail(),
                        metadata: { deleted: true, entity: entityToDelete ? JSON.stringify(entityToDelete) : undefined },
                      }
                    ).subscribe();
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
