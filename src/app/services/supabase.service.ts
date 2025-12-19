import { Injectable, inject, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { isDevMode } from '@angular/core';

export type RealtimeLevel = 'A' | 'B' | 'C';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  level: RealtimeLevel;
  table: string;
}

export interface RealtimeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private subscriptions = new Map<string, RealtimeSubscription>();
  private levelASubscriptions = new Set<string>(); // Tablas de Nivel A (siempre activas)
  private isConnected = signal<boolean>(false);
  private connectionError = signal<string | null>(null);

  constructor() {
    this.initializeClient();
  }

  /**
   * Inicializa el cliente de Supabase
   */
  private initializeClient(): void {
    const supabaseUrl = process.env['ENV_SUPABASE_URL'];
    const supabaseKey = process.env['ENV_SUPABASE_ANON_KEY'] || process.env['ENV_SUPABASE_API_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      const error = 'Supabase URL o API Key no configurados';
      this.connectionError.set(error);
      if (isDevMode()) {
        console.error('[SupabaseService]', error);
      }
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });

      // El estado de conexión se monitorea a través de las suscripciones
      // No hay métodos onOpen/onClose/onError en la API actual de Supabase

      if (isDevMode()) {
        console.log('[SupabaseService] Cliente inicializado');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.connectionError.set(errorMessage);
      if (isDevMode()) {
        console.error('[SupabaseService] Error al inicializar:', error);
      }
    }
  }

  /**
   * Obtiene el cliente de Supabase
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Verifica si está conectado a Realtime
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected.asReadonly(),
      error: this.connectionError.asReadonly(),
    };
  }

  /**
   * Suscribe a cambios en una tabla con nivel específico
   */
  subscribeToTable<T = any>(
    table: string,
    level: RealtimeLevel,
    filters?: Record<string, any>,
    callback?: (event: RealtimeEvent<T>) => void
  ): RealtimeChannel | null {
    // Nivel C no se suscribe
    if (level === 'C') {
      if (isDevMode()) {
        console.log(`[SupabaseService] Tabla ${table} es Nivel C, no se suscribe`);
      }
      return null;
    }

    if (!this.client) {
      if (isDevMode()) {
        console.warn('[SupabaseService] Cliente no inicializado');
      }
      return null;
    }

    // Si ya existe una suscripción para esta tabla, reutilizarla
    const existingSub = this.subscriptions.get(table);
    if (existingSub && existingSub.level === level) {
      if (isDevMode()) {
        console.log(`[SupabaseService] Reutilizando suscripción existente para ${table}`);
      }
      return existingSub.channel;
    }

    try {
      // Construir filtro de suscripción
      let channel = this.client
        .channel(`realtime:${table}:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            ...(filters || {}),
          },
          (payload) => {
            const event: RealtimeEvent<T> = {
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new as T,
              old: payload.old as T,
            };

            if (isDevMode()) {
              console.log(`[SupabaseService] Evento en ${table}:`, event.eventType, event.new || event.old);
            }

            if (callback) {
              callback(event);
            }
          }
        )
        .subscribe((status) => {
          if (isDevMode()) {
            console.log(`[SupabaseService] Estado de suscripción ${table}:`, status);
          }

          if (status === 'SUBSCRIBED') {
            this.isConnected.set(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.connectionError.set(`Error en suscripción a ${table}`);
          }
        });

      // Guardar suscripción
      const subscription: RealtimeSubscription = {
        channel,
        level,
        table,
      };
      this.subscriptions.set(table, subscription);

      // Si es Nivel A, agregarlo al conjunto de suscripciones globales
      if (level === 'A') {
        this.levelASubscriptions.add(table);
      }

      if (isDevMode()) {
        console.log(`[SupabaseService] Suscrito a ${table} (Nivel ${level})`);
      }

      return channel;
    } catch (error) {
      if (isDevMode()) {
        console.error(`[SupabaseService] Error al suscribirse a ${table}:`, error);
      }
      return null;
    }
  }

  /**
   * Desuscribe de una tabla
   */
  unsubscribeFromTable(table: string): void {
    const subscription = this.subscriptions.get(table);
    if (!subscription) {
      return;
    }

    try {
      this.client?.removeChannel(subscription.channel);
      this.subscriptions.delete(table);
      this.levelASubscriptions.delete(table);

      if (isDevMode()) {
        console.log(`[SupabaseService] Desuscrito de ${table}`);
      }
    } catch (error) {
      if (isDevMode()) {
        console.error(`[SupabaseService] Error al desuscribirse de ${table}:`, error);
      }
    }
  }

  /**
   * Inicializa suscripciones de Nivel A (siempre activas)
   */
  initializeLevelASubscriptions(
    subscriptions: Array<{
      table: string;
      filters?: Record<string, any>;
      callback?: (event: RealtimeEvent) => void;
    }>
  ): void {
    subscriptions.forEach(({ table, filters, callback }) => {
      this.subscribeToTable(table, 'A', filters, callback);
    });
  }

  /**
   * Limpia todas las suscripciones de Nivel B (llamar al desmontar componentes)
   */
  cleanupLevelBSubscriptions(): void {
    const levelBSubs = Array.from(this.subscriptions.entries()).filter(
      ([, sub]) => sub.level === 'B'
    );

    levelBSubs.forEach(([table]) => {
      this.unsubscribeFromTable(table);
    });
  }

  /**
   * Limpia todas las suscripciones
   */
  cleanupAllSubscriptions(): void {
    this.subscriptions.forEach((_, table) => {
      this.unsubscribeFromTable(table);
    });
  }

  /**
   * Obtiene información de suscripciones activas (solo en desarrollo)
   */
  getActiveSubscriptions(): Array<{ table: string; level: RealtimeLevel }> {
    if (!isDevMode()) {
      return [];
    }

    return Array.from(this.subscriptions.values()).map((sub) => ({
      table: sub.table,
      level: sub.level,
    }));
  }
}

