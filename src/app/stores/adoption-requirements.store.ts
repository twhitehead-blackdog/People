import { signalStore, withHooks } from '@ngrx/signals';
import { AdoptionRequirement } from '../models';
import { withCustomEntities } from './entities.feature';

export const AdoptionRequirementsStore = signalStore(
  withCustomEntities<AdoptionRequirement>({ 
    name: 'adoption_requirements',
    order: 'order,created_at'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

