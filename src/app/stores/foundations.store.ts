import { signalStore, withHooks } from '@ngrx/signals';
import { Foundation } from '../models';
import { withCustomEntities } from './entities.feature';

export const FoundationsStore = signalStore(
  withCustomEntities<Foundation>({ 
    name: 'foundations',
    order: 'name'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

