import { signalStore, withHooks } from '@ngrx/signals';
import { PetMatch } from '../models';
import { withCustomEntities } from './entities.feature';

export const PetMatchesStore = signalStore(
  withCustomEntities<PetMatch>({
    name: 'pet_matches',
    query: '*,user:users!pet_matches_user_id_fkey(*)',
    detailsQuery: '*,user:users!pet_matches_user_id_fkey(*)',
    order: 'created_at.desc',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

