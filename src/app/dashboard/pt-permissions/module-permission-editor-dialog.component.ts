import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Employee } from '../../models';
import { ModulePermissionsService } from '../../services/module-permissions.service';
import { PermissionTreeEditorComponent } from './permission-tree-editor.component';
import {
  EffectivePermission,
  getAccessStateIcon,
  getAccessStateLabel,
  getAccessStateSeverity,
  ModuleUserPermissionProfile,
} from './permissions.types';

@Component({
  selector: 'pt-module-permission-editor-dialog',
  standalone: true,
  imports: [
    Button,
    FormsModule,
    MessageModule,
    DividerModule,
    ProgressSpinnerModule,
    PermissionTreeEditorComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Info del empleado -->
      <div class="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-lg">
        <div
          class="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-lg font-medium"
        >
          {{ getInitials(profile.employeeName) }}
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-white m-0">{{ profile.employeeName }}</h3>
          <p class="text-sm text-gray-400 m-0">
            {{ profile.positionName }} • {{ profile.branchName }}
          </p>
        </div>
        <div class="text-right">
          <span
            class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
            [class.bg-green-500/20]="profile.accessState === 'full'"
            [class.text-green-400]="profile.accessState === 'full'"
            [class.bg-yellow-500/20]="profile.accessState === 'partial'"
            [class.text-yellow-400]="profile.accessState === 'partial'"
            [class.bg-red-500/20]="profile.accessState === 'blocked'"
            [class.text-red-400]="profile.accessState === 'blocked'"
            [class.bg-gray-500/20]="profile.accessState === 'none'"
            [class.text-gray-400]="profile.accessState === 'none'"
          >
            <i [class]="getStateIcon(profile.accessState)"></i>
            {{ getStateLabel(profile.accessState) }}
          </span>
          <p class="text-xs text-gray-500 m-0 mt-1">
            {{ profile.accessibleModules }}/{{ profile.totalModules }} módulos
          </p>
        </div>
      </div>

      <!-- Mensaje informativo -->
      <p-message
        severity="info"
        styleClass="w-full"
      >
        <ng-template #content>
          <div class="flex items-start gap-2">
            <i class="pi pi-info-circle mt-0.5"></i>
            <div>
              <span class="font-medium">Permisos individuales</span>
              <p class="text-xs m-0 mt-1 opacity-80">
                Los cambios aquí crean "overrides" individuales que tienen
                prioridad sobre los permisos del cargo. Usa "Restablecer" para
                volver a los permisos del cargo.
              </p>
            </div>
          </div>
        </ng-template>
      </p-message>

      <!-- Acciones rápidas -->
      <div class="flex flex-wrap gap-2">
        <p-button
          label="Bloquear todo"
          icon="pi pi-lock"
          severity="danger"
          [text]="true"
          size="small"
          [disabled]="saving() || profile.accessState === 'blocked'"
          (onClick)="blockAll()"
        ></p-button>

        <p-button
          label="Permitir todo"
          icon="pi pi-check"
          severity="success"
          [text]="true"
          size="small"
          [disabled]="saving()"
          (onClick)="allowAll()"
        ></p-button>

        <p-button
          label="Restablecer al cargo"
          icon="pi pi-refresh"
          severity="warn"
          [text]="true"
          size="small"
          [disabled]="saving() || !profile.hasOverrides"
          (onClick)="resetToPosition()"
        ></p-button>
      </div>

      <p-divider></p-divider>

      <!-- Loading -->
      @if (loading()) {
      <div class="flex justify-center py-8">
        <p-progressSpinner strokeWidth="4" />
      </div>
      } @else {
      <!-- Árbol de permisos -->
      <pt-permission-tree-editor
        [permissions]="permissions()"
        [readonly]="saving()"
        (permissionChanged)="onPermissionChange($event)"
        (blockToggled)="onBlockToggle($event)"
      ></pt-permission-tree-editor>
      }

      <p-divider></p-divider>

      <!-- Botones de acción -->
      <div class="flex justify-end gap-2">
        <p-button
          label="Cancelar"
          [text]="true"
          severity="secondary"
          [disabled]="saving()"
          (onClick)="cancel()"
        ></p-button>
        <p-button
          label="Guardar Cambios"
          icon="pi pi-save"
          severity="primary"
          [loading]="saving()"
          [disabled]="!hasChanges()"
          (onClick)="save()"
        ></p-button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulePermissionEditorDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private moduleService = inject(ModulePermissionsService);
  private messageService = inject(MessageService);

  // Datos del diálogo
  public employee: Employee = this.config.data.employee;
  public profile: ModuleUserPermissionProfile = this.config.data.profile;

  // Estado
  public loading = signal(true);
  public saving = signal(false);
  public permissions = signal<EffectivePermission[]>([]);
  public pendingChanges = signal<
    Map<string, Partial<EffectivePermission>>
  >(new Map());

  async ngOnInit(): Promise<void> {
    await this.loadPermissions();
  }

  /**
   * Carga los permisos del empleado
   */
  async loadPermissions(): Promise<void> {
    this.loading.set(true);
    try {
      const profile = await this.moduleService.getEmployeeProfile(this.employee);
      this.permissions.set([...profile.modulePermissions]);
      this.profile = profile;
    } catch (error) {
      console.error('Error loading permissions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los permisos',
      });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Maneja cambio de permiso
   */
  onPermissionChange(event: {
    moduleId: string;
    field: string;
    value: boolean;
  }): void {
    const changes = this.pendingChanges();
    const existing = changes.get(event.moduleId) || {};
    existing[event.field as keyof EffectivePermission] = event.value as never;
    changes.set(event.moduleId, existing);
    this.pendingChanges.set(new Map(changes));
  }

  /**
   * Maneja toggle de bloqueo
   */
  onBlockToggle(event: { moduleId: string; blocked: boolean }): void {
    const changes = this.pendingChanges();
    const existing = changes.get(event.moduleId) || {};
    existing.isBlocked = event.blocked;
    if (event.blocked) {
      existing.canView = false;
      existing.canCreate = false;
      existing.canEdit = false;
      existing.canDelete = false;
    }
    changes.set(event.moduleId, existing);
    this.pendingChanges.set(new Map(changes));
  }

  /**
   * Bloquea todos los módulos
   */
  async blockAll(): Promise<void> {
    this.saving.set(true);
    try {
      await this.moduleService.blockAllModules(
        this.employee.id,
        'Bloqueado por administrador'
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Todos los módulos han sido bloqueados',
      });
      await this.loadPermissions();
      this.pendingChanges.set(new Map());
    } catch (error) {
      console.error('Error blocking all:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron bloquear los módulos',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Permite todos los módulos (quita bloqueos)
   */
  async allowAll(): Promise<void> {
    this.saving.set(true);
    try {
      // Permitir todos = resetear y luego dar acceso view a todo
      await this.moduleService.resetToPosition(this.employee.id);

      // Dar acceso view a todos los módulos raíz
      const modules = this.moduleService.getSystemModules();
      for (const module of modules.filter((m) => !m.parentId)) {
        await this.moduleService.updateEmployeeOverride({
          employeeId: this.employee.id,
          moduleId: module.id,
          canView: true,
          isBlocked: false,
        });
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Acceso permitido a todos los módulos',
      });
      await this.loadPermissions();
      this.pendingChanges.set(new Map());
    } catch (error) {
      console.error('Error allowing all:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo permitir el acceso',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Restablece a permisos del cargo
   */
  async resetToPosition(): Promise<void> {
    this.saving.set(true);
    try {
      await this.moduleService.resetToPosition(this.employee.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Permisos restablecidos a los del cargo',
      });
      await this.loadPermissions();
      this.pendingChanges.set(new Map());
    } catch (error) {
      console.error('Error resetting:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron restablecer los permisos',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Guarda los cambios pendientes
   */
  async save(): Promise<void> {
    const changes = this.pendingChanges();
    if (changes.size === 0) {
      this.cancel();
      return;
    }

    this.saving.set(true);
    try {
      // Aplicar cada cambio
      for (const [moduleId, perms] of changes) {
        await this.moduleService.updateEmployeeOverride({
          employeeId: this.employee.id,
          moduleId,
          canView: perms.canView,
          canCreate: perms.canCreate,
          canEdit: perms.canEdit,
          canDelete: perms.canDelete,
          isBlocked: perms.isBlocked,
        });
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `${changes.size} permisos actualizados`,
      });

      this.ref.close(true);
    } catch (error) {
      console.error('Error saving permissions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron guardar los cambios',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Cancela y cierra el diálogo
   */
  cancel(): void {
    this.ref.close(false);
  }

  /**
   * Verifica si hay cambios pendientes
   */
  hasChanges(): boolean {
    return this.pendingChanges().size > 0;
  }

  // Helpers
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getStateLabel(state: string): string {
    return getAccessStateLabel(state as 'full' | 'partial' | 'blocked' | 'none');
  }

  getStateIcon(state: string): string {
    return getAccessStateIcon(state as 'full' | 'partial' | 'blocked' | 'none');
  }

  getStateSeverity(state: string): string {
    return getAccessStateSeverity(
      state as 'full' | 'partial' | 'blocked' | 'none'
    );
  }
}
