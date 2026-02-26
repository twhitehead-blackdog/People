import { effect, inject } from '@angular/core';
import { signalStoreFeature, withHooks, withMethods } from '@ngrx/signals';
import {
  RealtimeBatch,
  SupabaseRealtimeService,
} from '../services/supabase-realtime.service';

/**
 * Composable feature for NgRX Signal stores that enables Supabase Realtime sync.
 *
 * Usage:
 *   signalStore(
 *     withCustomEntities<Employee>({ name: 'employees', ... }),
 *     withRealtimeSync('employees'),
 *     withHooks({ onInit: ({ fetchItems }) => fetchItems() })
 *   )
 *
 * Requires the store to have `_handleRealtimeBatch` method (added by entities.feature.ts).
 */
export function withRealtimeSync(tableName: string) {
  return signalStoreFeature(
    withMethods(() => {
      const realtimeService = inject(SupabaseRealtimeService);
      return {
        _subscribeRealtime: () => realtimeService.subscribeToTable(tableName),
        _unsubscribeRealtime: () => realtimeService.unsubscribeFromTable(tableName),
      };
    }),
    withHooks({
      onInit(store: any) {
        const batchSignal = store._subscribeRealtime();

        effect(() => {
          const batch: RealtimeBatch | null = batchSignal();
          if (!batch) return;

          if (typeof store._handleRealtimeBatch === 'function') {
            store._handleRealtimeBatch(batch);
          } else {
            // Fallback: force reload if the store doesn't have the handler
            if (typeof store.reloadItems === 'function') {
              store.reloadItems();
            }
          }
        });
      },
      onDestroy(store: any) {
        store._unsubscribeRealtime();
      },
    })
  );
}
