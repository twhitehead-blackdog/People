import { DestroyRef, inject, signal } from '@angular/core';
import {
  RealtimeBatch,
  SupabaseRealtimeService,
} from '../services/supabase-realtime.service';

/**
 * Utility for components using httpResource that need realtime updates.
 * Returns a signal that emits batches whenever the given table changes.
 * Automatically unsubscribes when the component is destroyed.
 *
 * Usage in a component:
 *   private timelogChanges = useRealtimeTrigger('timelogs');
 *
 *   constructor() {
 *     effect(() => {
 *       const batch = this.timelogChanges();
 *       if (batch) {
 *         this.myHttpResource.reload();
 *       }
 *     });
 *   }
 */
export function useRealtimeTrigger(
  table: string
): ReturnType<typeof signal<RealtimeBatch | null>> {
  const realtimeService = inject(SupabaseRealtimeService);
  const destroyRef = inject(DestroyRef);

  const batchSignal = realtimeService.subscribeToTable(table);

  destroyRef.onDestroy(() => {
    realtimeService.unsubscribeFromTable(table);
  });

  return batchSignal;
}
