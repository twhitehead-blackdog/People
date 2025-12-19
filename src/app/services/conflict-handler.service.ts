import { Injectable, signal, computed } from '@angular/core';
import { MessageService } from 'primeng/api';
import { isDevMode } from '@angular/core';

export interface ConflictInfo {
  entityId: string;
  entityType: string;
  lastUpdatedBy: string | null;
  lastUpdatedAt: Date;
  localChanges: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ConflictHandlerService {
  // Mapa de entidades en edición: entityType -> Set<entityId>
  private editingEntities = new Map<string, Set<string>>();

  // Mapa de conflictos pendientes: entityType -> Map<entityId, ConflictInfo>
  private pendingConflicts = new Map<string, Map<string, ConflictInfo>>();

  // Signal para notificar conflictos
  private conflicts = signal<ConflictInfo[]>([]);

  constructor(private messageService?: MessageService) {}

  /**
   * Registra que una entidad está siendo editada
   */
  startEditing(entityType: string, entityId: string): void {
    if (!this.editingEntities.has(entityType)) {
      this.editingEntities.set(entityType, new Set());
    }
    this.editingEntities.get(entityType)!.add(entityId);

    if (isDevMode()) {
      console.log(`[ConflictHandler] Iniciando edición: ${entityType}:${entityId}`);
    }
  }

  /**
   * Registra que una entidad ya no está siendo editada
   */
  stopEditing(entityType: string, entityId: string): void {
    const entitySet = this.editingEntities.get(entityType);
    if (entitySet) {
      entitySet.delete(entityId);
      if (entitySet.size === 0) {
        this.editingEntities.delete(entityType);
      }
    }

    // Limpiar conflictos pendientes para esta entidad
    this.clearConflict(entityType, entityId);

    if (isDevMode()) {
      console.log(`[ConflictHandler] Finalizando edición: ${entityType}:${entityId}`);
    }
  }

  /**
   * Verifica si una entidad está siendo editada
   */
  isEditing(entityType: string, entityId: string): boolean {
    const entitySet = this.editingEntities.get(entityType);
    return entitySet ? entitySet.has(entityId) : false;
  }

  /**
   * Maneja un evento de actualización externa durante edición
   */
  handleExternalUpdate(
    entityType: string,
    entityId: string,
    updatedBy: string | null = null,
    updatedAt: Date = new Date()
  ): 'ignore' | 'pending' | 'conflict' {
    // Si no está en edición, no hay conflicto
    if (!this.isEditing(entityType, entityId)) {
      return 'ignore';
    }

    // Registrar conflicto pendiente
    const conflictInfo: ConflictInfo = {
      entityId,
      entityType,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: updatedAt,
      localChanges: true,
    };

    if (!this.pendingConflicts.has(entityType)) {
      this.pendingConflicts.set(entityType, new Map());
    }
    this.pendingConflicts.get(entityType)!.set(entityId, conflictInfo);

    // Actualizar signal de conflictos
    this.updateConflictsSignal();

    // Mostrar aviso al usuario
    this.showConflictWarning(entityType, entityId);

    if (isDevMode()) {
      console.warn(
        `[ConflictHandler] Conflicto detectado: ${entityType}:${entityId} fue actualizado externamente durante edición`
      );
    }

    return 'pending';
  }

  /**
   * Resuelve un conflicto (el usuario decidió recargar)
   */
  resolveConflict(entityType: string, entityId: string, reload: boolean = true): void {
    if (reload) {
      // Limpiar conflicto y permitir actualización
      this.clearConflict(entityType, entityId);
      this.stopEditing(entityType, entityId);
    } else {
      // Mantener edición local, pero marcar conflicto como resuelto temporalmente
      // El conflicto se volverá a mostrar si hay otra actualización
      this.clearConflict(entityType, entityId);
    }

    if (isDevMode()) {
      console.log(
        `[ConflictHandler] Conflicto resuelto: ${entityType}:${entityId} (reload: ${reload})`
      );
    }
  }

  /**
   * Limpia un conflicto específico
   */
  clearConflict(entityType: string, entityId: string): void {
    const conflictsMap = this.pendingConflicts.get(entityType);
    if (conflictsMap) {
      conflictsMap.delete(entityId);
      if (conflictsMap.size === 0) {
        this.pendingConflicts.delete(entityType);
      }
    }
    this.updateConflictsSignal();
  }

  /**
   * Limpia todos los conflictos de un tipo de entidad
   */
  clearAllConflicts(entityType: string): void {
    this.pendingConflicts.delete(entityType);
    this.updateConflictsSignal();
  }

  /**
   * Obtiene conflictos pendientes para un tipo de entidad
   */
  getConflicts(entityType: string): ConflictInfo[] {
    const conflictsMap = this.pendingConflicts.get(entityType);
    if (!conflictsMap) {
      return [];
    }
    return Array.from(conflictsMap.values());
  }

  /**
   * Obtiene todos los conflictos pendientes
   */
  getAllConflicts(): ConflictInfo[] {
    return this.conflicts();
  }

  /**
   * Verifica si hay conflictos pendientes
   */
  hasConflicts(entityType?: string): boolean {
    if (entityType) {
      return this.pendingConflicts.has(entityType) && this.pendingConflicts.get(entityType)!.size > 0;
    }
    return this.conflicts().length > 0;
  }

  /**
   * Actualiza el signal de conflictos
   */
  private updateConflictsSignal(): void {
    const allConflicts: ConflictInfo[] = [];
    this.pendingConflicts.forEach((conflictsMap) => {
      allConflicts.push(...Array.from(conflictsMap.values()));
    });
    this.conflicts.set(allConflicts);
  }

  /**
   * Muestra un aviso de conflicto al usuario
   */
  private showConflictWarning(entityType: string, entityId: string): void {
    if (this.messageService) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Registro actualizado',
        detail: `Este registro fue actualizado por otro usuario. ¿Deseas recargar los cambios?`,
        life: 10000, // 10 segundos
        sticky: false,
      });
    }
  }

  /**
   * Limpia todas las ediciones y conflictos (útil para limpieza)
   */
  clearAll(): void {
    this.editingEntities.clear();
    this.pendingConflicts.clear();
    this.conflicts.set([]);
  }
}

