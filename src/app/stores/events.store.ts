import { signalStore, withHooks } from '@ngrx/signals';
import { Event } from '../models';
import { withCustomEntities } from './entities.feature';

export const EventsStore = signalStore(
  withCustomEntities<Event>({ 
    name: 'events',
    query: '*,foundation:foundations!foundation_id(*)',
    detailsQuery: '*,foundation:foundations!foundation_id(*)',
    order: 'event_date.asc,event_time.asc'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

