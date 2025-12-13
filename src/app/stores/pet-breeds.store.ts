import { computed } from '@angular/core';
import { signalStore, withHooks, withComputed } from '@ngrx/signals';
import { PetBreed } from '../models';
import { withCustomEntities } from './entities.feature';

export const PetBreedsStore = signalStore(
  withCustomEntities<PetBreed>({
    name: 'pet_breeds',
    query: '*',
    detailsQuery: '*',
    order: 'display_order.asc,name.asc',
  }),
  withComputed(({ entities }) => ({
    // Razas activas de perros
    dogBreeds: computed(() => {
      return entities().filter((breed) => breed.species === 'dog' && breed.is_active);
    }),
    // Razas activas de gatos
    catBreeds: computed(() => {
      return entities().filter((breed) => breed.species === 'cat' && breed.is_active);
    }),
    // Razas activas de otras especies
    otherBreeds: computed(() => {
      return entities().filter((breed) => breed.species === 'other' && breed.is_active);
    }),
  })),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

