import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PermissionsService } from './permissions.service';
import { AccessScheduleService } from './access-schedule.service';
import { SubModuleMode } from '../dashboard/pt-permissions/permissions.types';

/**
 * Servicio global que rastrea el sub-módulo activo de la ruta actual
 * y expone su modo de acceso ('none' | 'read' | 'write') para el usuario logueado.
 *
 * Se alimenta automáticamente desde `modulePermissionGuard` cuando una ruta
 * con submódulo es activada.
 *
 * Patrón de uso:
 *
 *   private readOnly = inject(ReadOnlyContextService);
 *
 *   // En la plantilla:
 *   @if (readOnly.canWrite()) { <button>Crear</button> }
 *   <p-button [disabled]="readOnly.isReadOnly()">Guardar</p-button>
 *
 *   // O con override manual (cuando un componente no está atado a ruta):
 *   this.readOnly.overrideTarget('admin', 'employees');
 */
@Injectable({ providedIn: 'root' })
export class ReadOnlyContextService {
  private permissions = inject(PermissionsService);
  private router = inject(Router);
  private accessSchedule = inject(AccessScheduleService);

  private currentTarget = signal<{ moduleId: string; subModuleId: string } | null>(null);

  constructor() {
    // Limpia el target en cada navegación; el guard volverá a fijarlo si aplica
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        // No limpiamos inmediatamente: el guard se ejecuta ANTES del NavigationEnd
        // así que el target ya está fijado para la nueva ruta. Solo expiramos targets
        // huérfanos si el guard no los actualizó (caso raro de rutas sin guard).
      });
  }

  /**
   * Llamado desde modulePermissionGuard cuando se activa una ruta con submódulo.
   */
  setCurrentTarget(moduleId: string, subModuleId: string | undefined): void {
    if (subModuleId) {
      this.currentTarget.set({ moduleId, subModuleId });
    } else {
      this.currentTarget.set(null);
    }
  }

  /**
   * Permite a un componente forzar manualmente el contexto (útil para diálogos
   * o pantallas no atadas directamente a una ruta).
   */
  overrideTarget(moduleId: string, subModuleId: string): void {
    this.currentTarget.set({ moduleId, subModuleId });
  }

  clearTarget(): void {
    this.currentTarget.set(null);
  }

  readonly target = computed(() => this.currentTarget());

  readonly mode = computed<SubModuleMode>(() => {
    // Horario fuera-de-rango con modo 'readonly' fuerza modo lectura global
    if (
      this.accessSchedule.isOutOfHours() &&
      this.accessSchedule.mode() === 'readonly'
    ) {
      return 'read';
    }
    const t = this.currentTarget();
    if (!t) return 'write';
    return this.permissions.getCurrentSubModuleMode(t.moduleId, t.subModuleId);
  });

  readonly canWrite = computed(() => this.mode() === 'write');
  readonly canRead = computed(() => this.mode() !== 'none');
  readonly isReadOnly = computed(() => this.mode() === 'read');
}
