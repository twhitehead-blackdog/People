import { signalStore, withHooks } from '@ngrx/signals';
import { Pet } from '../models';
import { withCustomEntities } from './entities.feature';

export const PetsStore = signalStore(
  withCustomEntities<Pet>({ 
    name: 'pets',
    query: '*,foundation:foundations(*)',
    detailsQuery: '*,foundation:foundations(*)',
    order: 'created_at.desc'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

