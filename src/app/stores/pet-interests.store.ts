import { signalStore, withHooks } from '@ngrx/signals';
import { PetInterest } from '../models';
import { withCustomEntities } from './entities.feature';

export const PetInterestsStore = signalStore(
  withCustomEntities<PetInterest>({
    name: 'pet_interests',
    query: '*,pet:pets!pet_id(name,species,photos,foundation:foundations!foundation_id(name))',
    order: 'created_at.desc',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

