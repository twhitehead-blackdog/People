import { inject, Injectable, NgZone, signal } from '@angular/core';
import {
  createClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import { getEnv } from '../utils/env.utils';
import { OrganizationService } from './organization.service';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeEvent {
  type: RealtimeEventType;
  table: string;
  record: Record<string, any>;
  old_record: Record<string, any>;
}

export interface RealtimeBatch {
  events: RealtimeEvent[];
  timestamp: number;
}

interface ChannelEntry {
  channel: RealtimeChannel;
  refCount: number;
  signal: ReturnType<typeof signal<RealtimeBatch | null>>;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingEvents: RealtimeEvent[];
}

@Injectable({ providedIn: 'root' })
export class SupabaseRealtimeService {
  private readonly zone = inject(NgZone);
  private readonly orgService = inject(OrganizationService);

  private client: SupabaseClient | null = null;
  private channels = new Map<string, ChannelEntry>();
  private readonly DEBOUNCE_MS = 300;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const url = getEnv('ENV_SUPABASE_URL') ?? '';
      const key =
        getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_TOKEN') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        getEnv('ENV_SUPABASE_ANON_KEY') ||
        '';

      this.client = createClient(url, key, {
        realtime: {
          params: { eventsPerSecond: 10 },
        },
        // Disable REST/Auth features - we only need Realtime
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.client;
  }

  /**
   * Subscribe to Postgres changes on a table.
   * Returns a signal that emits debounced batches of events.
   * Multiple callers subscribing to the same table share one channel (ref-counted).
   */
  subscribeToTable(table: string): ReturnType<typeof signal<RealtimeBatch | null>> {
    const existing = this.channels.get(table);
    if (existing) {
      existing.refCount++;
      return existing.signal;
    }

    const batchSignal = signal<RealtimeBatch | null>(null);
    const entry: ChannelEntry = {
      channel: null as any,
      refCount: 1,
      signal: batchSignal,
      debounceTimer: null,
      pendingEvents: [],
    };

    const client = this.getClient();
    const channelName = `realtime-${table}`;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        (payload: RealtimePostgresChangesPayload<Record<string, any>>) => {
          this.handlePayload(table, payload, entry);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error for ${table}, will reconnect`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel timed out for ${table}`);
        }
      });

    entry.channel = channel;
    this.channels.set(table, entry);
    return batchSignal;
  }

  /**
   * Decrement ref count and unsubscribe if no more listeners.
   */
  unsubscribeFromTable(table: string): void {
    const entry = this.channels.get(table);
    if (!entry) return;

    entry.refCount--;
    if (entry.refCount <= 0) {
      this.removeChannel(table, entry);
    }
  }

  /**
   * Disconnect all channels. Call on logout.
   */
  disconnectAll(): void {
    for (const [table, entry] of this.channels) {
      this.removeChannel(table, entry);
    }
    this.channels.clear();

    if (this.client) {
      this.client.removeAllChannels();
      this.client = null;
    }
    console.log('[Realtime] Disconnected all channels');
  }

  private removeChannel(table: string, entry: ChannelEntry): void {
    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer);
    }
    entry.channel.unsubscribe();
    this.channels.delete(table);
  }

  private handlePayload(
    table: string,
    payload: RealtimePostgresChangesPayload<Record<string, any>>,
    entry: ChannelEntry
  ): void {
    const eventType = payload.eventType as RealtimeEventType;
    const record = (payload as any).new ?? {};
    const oldRecord = (payload as any).old ?? {};

    // Client-side company_id filter
    const companyId = this.orgService.getCurrentCompanyId();
    if (companyId) {
      const recordCompanyId = record?.company_id ?? oldRecord?.company_id;
      if (recordCompanyId && recordCompanyId !== companyId) {
        return; // Skip events from other companies
      }
    }

    entry.pendingEvents.push({
      type: eventType,
      table,
      record,
      old_record: oldRecord,
    });

    // Debounce: flush after DEBOUNCE_MS of silence
    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer);
    }

    entry.debounceTimer = setTimeout(() => {
      const events = [...entry.pendingEvents];
      entry.pendingEvents = [];
      entry.debounceTimer = null;

      // Run inside NgZone so Angular picks up signal changes
      this.zone.run(() => {
        entry.signal.set({
          events,
          timestamp: Date.now(),
        });
      });
    }, this.DEBOUNCE_MS);
  }
}
