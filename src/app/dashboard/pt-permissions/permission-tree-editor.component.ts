import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import {
  buildPermissionTree,
  EffectivePermission,
  ModulePermissionNode,
} from './permissions.types';

interface PermissionChange {
  moduleId: string;
  field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isBlocked';
  value: boolean;
}

@Component({
  selector: 'pt-permission-tree-editor',
  standalone: true,
  imports: [
    TreeModule,
    CheckboxModule,
    FormsModule,
    Button,
    TooltipModule,
    MessageModule,
    PanelModule,
    DividerModule,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Leyenda -->
      <div class="flex flex-wrap gap-4 text-xs">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-green-500"></span>
          <span class="text-gray-400">Heredado del cargo</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span class="text-gray-400">Override individual</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-500"></span>
          <span class="text-gray-400">Bloqueado</span>
        </div>
      </div>

      <!-- Árbol de permisos -->
      <div class="border border-neutral-700 rounded-lg overflow-hidden">
        <div
          class="bg-neutral-800 px-4 py-2 border-b border-neutral-700 flex items-center justify-between"
        >
          <span class="font-medium text-sm">Módulos del Sistema</span>
          <div class="flex gap-4 text-xs text-gray-400">
            <span class="w-12 text-center">Ver</span>
            <span class="w-12 text-center">Crear</span>
            <span class="w-12 text-center">Editar</span>
            <span class="w-12 text-center">Eliminar</span>
            <span class="w-16 text-center">Bloquear</span>
          </div>
        </div>

        <div class="max-h-[500px] overflow-y-auto">
          @for (node of permissionTree(); track node.key) {
          <div class="permission-node">
            <!-- Módulo raíz -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-neutral-700/50 hover:bg-neutral-800/50 transition-colors"
              [class.bg-red-900/20]="node.data.isBlocked"
            >
              <div class="flex items-center gap-3">
                <button
                  class="p-1 hover:bg-neutral-700 rounded transition-colors"
                  (click)="toggleExpand(node)"
                  [class.invisible]="!node.children?.length"
                >
                  <i
                    [class]="
                      node.expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'
                    "
                    class="text-xs text-gray-400"
                  ></i>
                </button>
                <i [class]="node.icon" class="text-gray-400"></i>
                <span
                  class="font-medium"
                  [class.text-red-400]="node.data.isBlocked"
                  [class.line-through]="node.data.isBlocked"
                >
                  {{ node.label }}
                </span>
                @if (node.data.source === 'employee_override') {
                <span
                  class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded"
                >
                  Override
                </span>
                } @if (node.data.isBlocked) {
                <span
                  class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded"
                >
                  <i class="pi pi-lock mr-1"></i>Bloqueado
                </span>
                }
              </div>

              <div class="flex gap-4 items-center">
                <!-- Checkboxes de permisos -->
                <div class="w-12 flex justify-center">
                  <p-checkbox
                    [(ngModel)]="node.data.canView"
                    [binary]="true"
                    [disabled]="node.data.isBlocked || readonly()"
                    (onChange)="onPermissionChange(node.data, 'canView', $event.checked)"
                  ></p-checkbox>
                </div>
                <div class="w-12 flex justify-center">
                  <p-checkbox
                    [(ngModel)]="node.data.canCreate"
                    [binary]="true"
                    [disabled]="node.data.isBlocked || readonly() || !node.data.canView"
                    (onChange)="onPermissionChange(node.data, 'canCreate', $event.checked)"
                  ></p-checkbox>
                </div>
                <div class="w-12 flex justify-center">
                  <p-checkbox
                    [(ngModel)]="node.data.canEdit"
                    [binary]="true"
                    [disabled]="node.data.isBlocked || readonly() || !node.data.canView"
                    (onChange)="onPermissionChange(node.data, 'canEdit', $event.checked)"
                  ></p-checkbox>
                </div>
                <div class="w-12 flex justify-center">
                  <p-checkbox
                    [(ngModel)]="node.data.canDelete"
                    [binary]="true"
                    [disabled]="node.data.isBlocked || readonly() || !node.data.canView"
                    (onChange)="onPermissionChange(node.data, 'canDelete', $event.checked)"
                  ></p-checkbox>
                </div>
                <div class="w-16 flex justify-center">
                  <p-button
                    [icon]="node.data.isBlocked ? 'pi pi-lock-open' : 'pi pi-lock'"
                    [rounded]="true"
                    [text]="true"
                    [severity]="node.data.isBlocked ? 'danger' : 'secondary'"
                    [disabled]="readonly()"
                    [pTooltip]="node.data.isBlocked ? 'Desbloquear módulo' : 'Bloquear módulo'"
                    tooltipPosition="left"
                    (onClick)="toggleBlock(node.data)"
                  ></p-button>
                </div>
              </div>
            </div>

            <!-- Submódulos -->
            @if (node.expanded && node.children?.length) {
            <div class="pl-8 bg-neutral-900/30">
              @for (child of node.children; track child.key) {
              <div
                class="flex items-center justify-between px-4 py-2 border-b border-neutral-700/30 hover:bg-neutral-800/30 transition-colors"
                [class.bg-red-900/10]="child.data.isBlocked"
              >
                <div class="flex items-center gap-3">
                  <i [class]="child.icon" class="text-gray-500 text-sm"></i>
                  <span
                    class="text-sm"
                    [class.text-red-400]="child.data.isBlocked"
                    [class.line-through]="child.data.isBlocked"
                  >
                    {{ child.label }}
                  </span>
                  @if (child.data.source === 'employee_override') {
                  <span
                    class="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-[10px]"
                  >
                    Override
                  </span>
                  }
                </div>

                <div class="flex gap-4 items-center">
                  <div class="w-12 flex justify-center">
                    <p-checkbox
                      [(ngModel)]="child.data.canView"
                      [binary]="true"
                      [disabled]="child.data.isBlocked || node.data.isBlocked || readonly()"
                      (onChange)="onPermissionChange(child.data, 'canView', $event.checked)"
                    ></p-checkbox>
                  </div>
                  <div class="w-12 flex justify-center">
                    <p-checkbox
                      [(ngModel)]="child.data.canCreate"
                      [binary]="true"
                      [disabled]="child.data.isBlocked || node.data.isBlocked || readonly() || !child.data.canView"
                      (onChange)="onPermissionChange(child.data, 'canCreate', $event.checked)"
                    ></p-checkbox>
                  </div>
                  <div class="w-12 flex justify-center">
                    <p-checkbox
                      [(ngModel)]="child.data.canEdit"
                      [binary]="true"
                      [disabled]="child.data.isBlocked || node.data.isBlocked || readonly() || !child.data.canView"
                      (onChange)="onPermissionChange(child.data, 'canEdit', $event.checked)"
                    ></p-checkbox>
                  </div>
                  <div class="w-12 flex justify-center">
                    <p-checkbox
                      [(ngModel)]="child.data.canDelete"
                      [binary]="true"
                      [disabled]="child.data.isBlocked || node.data.isBlocked || readonly() || !child.data.canView"
                      (onChange)="onPermissionChange(child.data, 'canDelete', $event.checked)"
                    ></p-checkbox>
                  </div>
                  <div class="w-16 flex justify-center">
                    <p-button
                      [icon]="child.data.isBlocked ? 'pi pi-lock-open' : 'pi pi-lock'"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      [severity]="child.data.isBlocked ? 'danger' : 'secondary'"
                      [disabled]="readonly() || node.data.isBlocked"
                      [pTooltip]="child.data.isBlocked ? 'Desbloquear' : 'Bloquear'"
                      tooltipPosition="left"
                      (onClick)="toggleBlock(child.data)"
                    ></p-button>
                  </div>
                </div>
              </div>
              }
            </div>
            }
          </div>
          }
        </div>
      </div>

      <!-- Resumen de cambios -->
      @if (pendingChanges().length > 0) {
      <p-message
        severity="warn"
        [text]="'Tienes ' + pendingChanges().length + ' cambios pendientes por guardar'"
        styleClass="w-full"
      ></p-message>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .permission-node {
      &:last-child > div:first-child {
        border-bottom: none;
      }
    }

    ::ng-deep .p-checkbox .p-checkbox-box {
      width: 1.25rem;
      height: 1.25rem;
    }

    ::ng-deep .p-checkbox.p-disabled .p-checkbox-box {
      opacity: 0.4;
    }

    .blocked-module {
      opacity: 0.6;
    }

    .override-module {
      border-left: 3px solid #eab308;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionTreeEditorComponent {
  private messageService = inject(MessageService);

  // Inputs
  public permissions = input.required<EffectivePermission[]>();
  public readonly = input<boolean>(false);

  // Outputs
  public permissionChanged = output<PermissionChange>();
  public blockToggled = output<{ moduleId: string; blocked: boolean }>();

  // Estado interno
  public pendingChanges = signal<PermissionChange[]>([]);

  // Árbol de permisos construido
  public permissionTree = computed(() => {
    const perms = this.permissions();
    const tree = buildPermissionTree(perms);

    // Expandir todos por defecto
    tree.forEach((node) => {
      node.expanded = true;
    });

    return tree;
  });

  /**
   * Alterna la expansión de un nodo
   */
  toggleExpand(node: ModulePermissionNode): void {
    node.expanded = !node.expanded;
  }

  /**
   * Maneja cambio en un permiso
   */
  onPermissionChange(
    perm: EffectivePermission,
    field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ): void {
    // Si se desmarca canView, desmarcar los demás
    if (field === 'canView' && !value) {
      perm.canCreate = false;
      perm.canEdit = false;
      perm.canDelete = false;
    }

    // Registrar cambio
    const change: PermissionChange = {
      moduleId: perm.moduleId,
      field,
      value,
    };

    this.addPendingChange(change);
    this.permissionChanged.emit(change);

    // Marcar como override
    perm.source = 'employee_override';
  }

  /**
   * Alterna el bloqueo de un módulo
   */
  toggleBlock(perm: EffectivePermission): void {
    const newBlocked = !perm.isBlocked;

    // Actualizar estado local
    perm.isBlocked = newBlocked;

    if (newBlocked) {
      // Al bloquear, quitar todos los permisos
      perm.canView = false;
      perm.canCreate = false;
      perm.canEdit = false;
      perm.canDelete = false;
      perm.source = 'blocked';
    } else {
      // Al desbloquear, marcar como override para que se pueda configurar
      perm.source = 'employee_override';
    }

    // Registrar cambio
    const change: PermissionChange = {
      moduleId: perm.moduleId,
      field: 'isBlocked',
      value: newBlocked,
    };

    this.addPendingChange(change);
    this.blockToggled.emit({ moduleId: perm.moduleId, blocked: newBlocked });
  }

  /**
   * Agrega un cambio a la lista de pendientes
   */
  private addPendingChange(change: PermissionChange): void {
    const current = this.pendingChanges();

    // Buscar si ya existe un cambio para este módulo y campo
    const existingIndex = current.findIndex(
      (c) => c.moduleId === change.moduleId && c.field === change.field
    );

    if (existingIndex >= 0) {
      // Actualizar cambio existente
      current[existingIndex] = change;
    } else {
      // Agregar nuevo cambio
      current.push(change);
    }

    this.pendingChanges.set([...current]);
  }

  /**
   * Obtiene los cambios pendientes
   */
  getPendingChanges(): PermissionChange[] {
    return this.pendingChanges();
  }

  /**
   * Limpia los cambios pendientes
   */
  clearPendingChanges(): void {
    this.pendingChanges.set([]);
  }
}
