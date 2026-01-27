import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { differenceInSeconds } from 'date-fns';
import { MessageService } from 'primeng/api';
import { filter, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { ScheduleConfiguration } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

type State = {
  isLoading: boolean;
  error: unknown;
  lastUpdated: Date | null;
};

const CACHE_DURATION_SECONDS = 5 * 60; // 5 minutes

export const ScheduleConfigurationsStore = signalStore(
  { providedIn: 'root' },
  withState<State>({
    isLoading: false,
    error: null,
    lastUpdated: null,
  }),
  withEntities<ScheduleConfiguration>(),
  withComputed(({ entities }) => ({
    // Map configs by schedule_id for quick lookup
    configsByScheduleId: computed(() => {
      const map = new Map<string, ScheduleConfiguration>();
      for (const config of entities()) {
        map.set(config.schedule_id, config);
      }
      return map;
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const apiUrl = inject(ApiUrlService);
    const message = inject(MessageService);
    const orgService = inject(OrganizationService);

    const getCompanyId = () => orgService.getCurrentCompanyId();

    return {
      fetchItems: rxMethod<void>(
        pipe(
          filter(() => {
            return (
              store.lastUpdated() === null ||
              differenceInSeconds(new Date(), store.lastUpdated()!) >
                CACHE_DURATION_SECONDS
            );
          }),
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap(() => {
            const companyId = getCompanyId();
            const params: Record<string, string> = {
              select: '*',
              order: 'created_at',
            };

            // Include both company-specific and global configs (company_id IS NULL)
            if (companyId) {
              params['or'] = `(company_id.is.null,company_id.eq.${companyId})`;
            }

            const url = apiUrl.build(
              'rest/v1/schedule_configurations',
              params
            );

            return http.get<ScheduleConfiguration[]>(url).pipe(
              tapResponse({
                next: (configs) => {
                  patchState(store, setAllEntities(configs), {
                    lastUpdated: new Date(),
                  });
                },
                error: (error: unknown) => {
                  console.error(
                    '[ScheduleConfigurationsStore] Error fetching:',
                    error
                  );
                  patchState(store, { error });
                },
                finalize: () => patchState(store, { isLoading: false }),
              })
            );
          })
        )
      ),

      reloadItems: rxMethod<void>(
        pipe(
          tap(() =>
            patchState(store, {
              lastUpdated: null,
              isLoading: true,
              error: null,
            })
          ),
          switchMap(() => {
            const companyId = getCompanyId();
            const params: Record<string, string> = {
              select: '*',
              order: 'created_at',
            };

            if (companyId) {
              params['or'] = `(company_id.is.null,company_id.eq.${companyId})`;
            }

            const url = apiUrl.build(
              'rest/v1/schedule_configurations',
              params
            );

            return http.get<ScheduleConfiguration[]>(url).pipe(
              tapResponse({
                next: (configs) => {
                  patchState(store, setAllEntities(configs), {
                    lastUpdated: new Date(),
                  });
                },
                error: (error: unknown) => {
                  console.error(
                    '[ScheduleConfigurationsStore] Error reloading:',
                    error
                  );
                  patchState(store, { error });
                },
                finalize: () => patchState(store, { isLoading: false }),
              })
            );
          })
        )
      ),

      getConfigForSchedule(
        scheduleId: string
      ): ScheduleConfiguration | undefined {
        return store.configsByScheduleId().get(scheduleId);
      },

      async saveConfiguration(
        config: Partial<ScheduleConfiguration> & { schedule_id: string }
      ): Promise<ScheduleConfiguration | null> {
        patchState(store, { isLoading: true, error: null });

        const companyId = getCompanyId();
        const existingConfig = store.configsByScheduleId().get(config.schedule_id);

        try {
          if (existingConfig) {
            // Update existing
            const updateData = { ...config };
            delete (updateData as any).id;
            delete (updateData as any).created_at;

            const url = apiUrl.build('rest/v1/schedule_configurations', {
              id: `eq.${existingConfig.id}`,
              select: '*',
            });

            const result = await firstValueFrom(
              http.patch<ScheduleConfiguration[]>(url, updateData)
            );

            if (result && result.length > 0) {
              patchState(
                store,
                updateEntity({ id: result[0].id, changes: result[0] })
              );
              message.add({
                severity: 'success',
                summary: 'Configuración actualizada',
                detail: 'Los cambios se guardaron correctamente.',
              });
              return result[0];
            }
          } else {
            // Create new
            const createData: Partial<ScheduleConfiguration> = {
              ...config,
              company_id: companyId,
            };

            const url = apiUrl.build('rest/v1/schedule_configurations', {
              select: '*',
            });

            const result = await firstValueFrom(
              http.post<ScheduleConfiguration[]>(url, createData)
            );

            if (result && result.length > 0) {
              patchState(store, addEntity(result[0]));
              message.add({
                severity: 'success',
                summary: 'Configuración creada',
                detail: 'La configuración se guardó correctamente.',
              });
              return result[0];
            }
          }
          return null;
        } catch (error) {
          console.error(
            '[ScheduleConfigurationsStore] Error saving config:',
            error
          );
          patchState(store, { error });
          message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la configuración.',
          });
          return null;
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      // Get default config values for schedules without config
      getDefaultConfig(): Omit<ScheduleConfiguration, 'id' | 'schedule_id'> {
        return {
          is_active: true,
          allow_for_managers: true,
          allow_for_submanagers: true,
          allowed_position_ids: [],
          daily_usage_limit: 0,
        };
      },
    };
  }),
  withHooks({
    onInit: ({ fetchItems }) => fetchItems(),
  })
);
