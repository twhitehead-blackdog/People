import { signalStore, withHooks } from '@ngrx/signals';
import { FAQItem } from '../models';
import { withCustomEntities } from './entities.feature';

export const FAQStore = signalStore(
  withCustomEntities<FAQItem>({ 
    name: 'faq_items',
    order: 'order,created_at'
  }),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

