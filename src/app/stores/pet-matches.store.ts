import { signalStore, withHooks } from '@ngrx/signals';
import { PetMatch } from '../models';
import { withCustomEntities } from './entities.feature';

export const PetMatchesStore = signalStore(
  withCustomEntities<PetMatch>({
    name: 'pet_matches',
    // Simplificar query: no hacer join con users si la foreign key no existe
    // Si necesitas datos del usuario, puedes hacerlo en el componente
    query: '*',
    detailsQuery: '*',
    order: 'created_at.desc',
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);



