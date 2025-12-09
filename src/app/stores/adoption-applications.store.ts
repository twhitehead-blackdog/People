import { signalStore, withHooks, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap } from 'rxjs';
import { updateEntity } from '@ngrx/signals/entities';
import { AdoptionApplication } from '../models';
import { withCustomEntities } from './entities.feature';
import { PetsStore } from './pets.store';

export const AdoptionApplicationsStore = signalStore(
  withCustomEntities<AdoptionApplication>({ 
    name: 'adoption_applications',
    query: '*,pet:pets(*,foundation:foundations(*))',
    detailsQuery: '*,pet:pets(*,foundation:foundations(*))',
    order: 'created_at.desc'
  }),
  withMethods((store, petsStore = inject(PetsStore), http = inject(HttpClient)) => ({
    editItem(request: AdoptionApplication) {
      // Si el status cambia a 'completed', marcar la mascota como no disponible
      if (request.status === 'completed' && request.pet_id) {
        // Primero actualizar la adopción
        return http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/adoption_applications`,
          request,
          { params: { id: `eq.${request.id}` } }
        ).pipe(
          switchMap(() => {
            // Luego actualizar la mascota como no disponible
            return http.patch(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/pets`,
              { is_available: false },
              { params: { id: `eq.${request.pet_id}` } }
            ).pipe(
              tap(() => {
                // Actualizar el estado local de la adopción
                patchState(store, updateEntity({ id: request.id, changes: request }));
                // Refrescar las mascotas para actualizar el estado
                petsStore.fetchItems();
              })
            );
          })
        );
      }
      // Si no es completed, usar el método por defecto del feature
      return (store as any).editItem(request);
    }
  })),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

