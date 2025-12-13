import { computed, inject } from '@angular/core';
import { signalStore, withHooks, withComputed } from '@ngrx/signals';
import { UserPet } from '../models';
import { withCustomEntities } from './entities.feature';
import { AuthWrapperService } from '../auth/auth-wrapper.service';

export const UserPetsStore = signalStore(
  withCustomEntities<UserPet>({
    name: 'user_pets',
    query: '*',
    detailsQuery: '*',
    order: 'created_at.desc',
  }),
  withComputed(({ entities }) => {
    const authWrapper = inject(AuthWrapperService);
    
    return {
      // Mascotas del usuario actual
      myPets: computed(() => {
        const currentUser = authWrapper.currentUser();
        if (!currentUser?.id) {
          return [];
        }
        return entities().filter((pet) => pet.user_id === currentUser.id);
      }),
    };
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

