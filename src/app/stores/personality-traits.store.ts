import { signalStore, withHooks, withComputed } from '@ngrx/signals';
import { computed } from '@angular/core';
import { PersonalityTrait } from '../models';
import { withCustomEntities } from './entities.feature';

export const PersonalityTraitsStore = signalStore(
  withCustomEntities<PersonalityTrait>({
    name: 'personality_traits',
    order: 'display_order.asc',
  }),
  withComputed(({ entities }) => ({
    activeTraits: computed(() =>
      entities().filter((trait) => trait.is_active).sort((a, b) => a.display_order - b.display_order)
    ),
    traitsByCategory: computed(() => {
      const traits = entities().filter((trait) => trait.is_active);
      const grouped: Record<string, PersonalityTrait[]> = {};
      traits.forEach((trait) => {
        const category = trait.category || 'general';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(trait);
      });
      return grouped;
    }),
  })),
  withHooks({ onInit: ({ fetchItems }) => fetchItems() })
);

