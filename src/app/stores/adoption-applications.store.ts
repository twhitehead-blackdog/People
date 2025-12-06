import { signalStore, withHooks } from '@ngrx/signals';
import { AdoptionApplication } from '../models';
import { withCustomEntities } from './entities.feature';

export const AdoptionApplicationsStore = signalStore(
  withCustomEntities<AdoptionApplication>({ 
    name: 'adoption_applications',
    query: '*,pet:pets(*,foundation:foundations(*))',
    detailsQuery: '*,pet:pets(*,foundation:foundations(*))',
    order: 'created_at.desc'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

