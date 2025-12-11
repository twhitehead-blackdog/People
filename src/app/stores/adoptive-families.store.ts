import { signalStore, withHooks } from '@ngrx/signals';
import { AdoptiveFamily } from '../models';
import { withCustomEntities } from './entities.feature';

export const AdoptiveFamiliesStore = signalStore(
  withCustomEntities<AdoptiveFamily>({ 
    name: 'adoptive_families',
    query: '*,pet:pets(id,name,species,photos)',
    order: 'created_at.desc'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

