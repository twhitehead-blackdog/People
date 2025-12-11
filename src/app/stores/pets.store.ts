import { signalStore, withHooks } from '@ngrx/signals';
import { Pet } from '../models';
import { withCustomEntities } from './entities.feature';

export const PetsStore = signalStore(
  withCustomEntities<Pet>({
    name: 'pets',
    query: '*,foundation:foundations!pets_foundation_id_fkey(*)',
    detailsQuery: '*,foundation:foundations!pets_foundation_id_fkey(*)',
    order: 'created_at.desc',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);
