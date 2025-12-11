import { signalStore, withHooks } from '@ngrx/signals';
import { Partner } from '../models';
import { withCustomEntities } from './entities.feature';

export const PartnersStore = signalStore(
  withCustomEntities<Partner>({ 
    name: 'partners',
    order: 'name'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

