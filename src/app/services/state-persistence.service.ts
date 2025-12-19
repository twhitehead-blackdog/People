import { Injectable, isDevMode } from '@angular/core';

export interface PersistedState<T> {
  version: number;
  timestamp: number;
  data: T;
}

export interface StateMigration<T> {
  fromVersion: number;
  toVersion: number;
  migrate: (oldData: any) => T;
}

@Injectable({
  providedIn: 'root',
})
export class StatePersistenceService {
  private readonly STORAGE_PREFIX = 'app_state:';
  private readonly DEFAULT_VERSION = 1;
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Guarda el estado en localStorage con versionado
   */
  saveState<T>(
    namespace: string,
    state: T,
    version: number = this.DEFAULT_VERSION,
    useSessionStorage: boolean = false
  ): boolean {
    try {
      const persistedState: PersistedState<T> = {
        version,
        timestamp: Date.now(),
        data: state,
      };

      const key = this.getStorageKey(namespace);
      const serialized = JSON.stringify(persistedState);

      // Verificar tamaño antes de guardar
      if (this.getStorageSize() + serialized.length > this.MAX_STORAGE_SIZE) {
        if (isDevMode()) {
          console.warn(
            `[StatePersistenceService] localStorage casi lleno, no se puede guardar ${namespace}`
          );
        }
        return false;
      }

      const storage = useSessionStorage ? sessionStorage : localStorage;
      storage.setItem(key, serialized);

      if (isDevMode()) {
        console.log(`[StatePersistenceService] Estado guardado: ${namespace} (v${version})`);
      }

      return true;
    } catch (error) {
      if (isDevMode()) {
        console.error(`[StatePersistenceService] Error al guardar estado ${namespace}:`, error);
      }
      return false;
    }
  }

  /**
   * Carga el estado desde localStorage con validación de versión
   */
  loadState<T>(
    namespace: string,
    expectedVersion?: number,
    useSessionStorage: boolean = false
  ): T | null {
    try {
      const key = this.getStorageKey(namespace);
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const stored = storage.getItem(key);

      if (!stored) {
        return null;
      }

      const persistedState: PersistedState<T> = JSON.parse(stored);

      // Validar estructura
      if (
        !persistedState ||
        typeof persistedState.version !== 'number' ||
        !persistedState.data
      ) {
        if (isDevMode()) {
          console.warn(
            `[StatePersistenceService] Estado ${namespace} tiene estructura inválida, se resetea`
          );
        }
        this.clearState(namespace, useSessionStorage);
        return null;
      }

      // Validar versión si se especifica
      if (expectedVersion !== undefined && persistedState.version !== expectedVersion) {
        if (isDevMode()) {
          console.warn(
            `[StatePersistenceService] Versión de ${namespace} no coincide: esperada ${expectedVersion}, encontrada ${persistedState.version}`
          );
        }
        // Reset elegante: limpiar estado antiguo
        this.clearState(namespace, useSessionStorage);
        return null;
      }

      if (isDevMode()) {
        console.log(
          `[StatePersistenceService] Estado cargado: ${namespace} (v${persistedState.version})`
        );
      }

      return persistedState.data;
    } catch (error) {
      if (isDevMode()) {
        console.error(`[StatePersistenceService] Error al cargar estado ${namespace}:`, error);
      }
      // Si hay error al parsear, limpiar el estado corrupto
      this.clearState(namespace, useSessionStorage);
      return null;
    }
  }

  /**
   * Limpia el estado de un namespace específico
   */
  clearState(namespace: string, useSessionStorage: boolean = false): void {
    try {
      const key = this.getStorageKey(namespace);
      const storage = useSessionStorage ? sessionStorage : localStorage;
      storage.removeItem(key);

      if (isDevMode()) {
        console.log(`[StatePersistenceService] Estado limpiado: ${namespace}`);
      }
    } catch (error) {
      if (isDevMode()) {
        console.error(`[StatePersistenceService] Error al limpiar estado ${namespace}:`, error);
      }
    }
  }

  /**
   * Limpia todos los estados guardados
   */
  clearAllStates(useSessionStorage: boolean = false): void {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const prefix = this.STORAGE_PREFIX;
      const keysToRemove: string[] = [];

      // Encontrar todas las claves que empiezan con el prefijo
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Eliminar todas las claves encontradas
      keysToRemove.forEach((key) => storage.removeItem(key));

      if (isDevMode()) {
        console.log(
          `[StatePersistenceService] Todos los estados limpiados (${keysToRemove.length} claves)`
        );
      }
    } catch (error) {
      if (isDevMode()) {
        console.error('[StatePersistenceService] Error al limpiar todos los estados:', error);
      }
    }
  }

  /**
   * Migra el estado de una versión a otra
   */
  migrateState<T>(
    namespace: string,
    migration: StateMigration<T>,
    useSessionStorage: boolean = false
  ): T | null {
    try {
      const key = this.getStorageKey(namespace);
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const stored = storage.getItem(key);

      if (!stored) {
        return null;
      }

      const persistedState: PersistedState<any> = JSON.parse(stored);

      // Verificar que la versión actual coincide con fromVersion
      if (persistedState.version !== migration.fromVersion) {
        if (isDevMode()) {
          console.warn(
            `[StatePersistenceService] No se puede migrar ${namespace}: versión actual (${persistedState.version}) no coincide con fromVersion (${migration.fromVersion})`
          );
        }
        return null;
      }

      // Ejecutar migración
      const migratedData = migration.migrate(persistedState.data);

      // Guardar estado migrado
      const success = this.saveState(namespace, migratedData, migration.toVersion, useSessionStorage);

      if (success) {
        if (isDevMode()) {
          console.log(
            `[StatePersistenceService] Estado migrado: ${namespace} (v${migration.fromVersion} -> v${migration.toVersion})`
          );
        }
        return migratedData;
      }

      return null;
    } catch (error) {
      if (isDevMode()) {
        console.error(`[StatePersistenceService] Error al migrar estado ${namespace}:`, error);
      }
      return null;
    }
  }

  /**
   * Obtiene el tamaño actual de localStorage
   */
  getStorageSize(useSessionStorage: boolean = false): number {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      let total = 0;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            total += key.length + value.length;
          }
        }
      }

      return total;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Verifica si hay espacio disponible en localStorage
   */
  hasStorageSpace(requiredBytes: number, useSessionStorage: boolean = false): boolean {
    const currentSize = this.getStorageSize(useSessionStorage);
    return currentSize + requiredBytes <= this.MAX_STORAGE_SIZE;
  }

  /**
   * Obtiene la clave de almacenamiento para un namespace
   */
  private getStorageKey(namespace: string): string {
    return `${this.STORAGE_PREFIX}${namespace}`;
  }

  /**
   * Obtiene información de todos los estados guardados (solo en desarrollo)
   */
  getStoredStatesInfo(useSessionStorage: boolean = false): Array<{
    namespace: string;
    version: number;
    timestamp: number;
    size: number;
  }> {
    if (!isDevMode()) {
      return [];
    }

    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const prefix = this.STORAGE_PREFIX;
      const info: Array<{
        namespace: string;
        version: number;
        timestamp: number;
        size: number;
      }> = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          const namespace = key.replace(prefix, '');
          const value = storage.getItem(key);
          if (value) {
            try {
              const state: PersistedState<any> = JSON.parse(value);
              info.push({
                namespace,
                version: state.version,
                timestamp: state.timestamp,
                size: value.length,
              });
            } catch {
              // Ignorar estados corruptos
            }
          }
        }
      }

      return info;
    } catch (error) {
      return [];
    }
  }
}

