import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Button } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import {
  ALL_LEGACY_PERMISSIONS,
  LEGACY_PERMISSION_DEFINITIONS,
  UserPermissionProfile,
} from './permissions.types';
import { SYSTEM_MODULES } from './module-permissions.types';

@Component({
  selector: 'pt-permission-preview-dialog',
  standalone: true,
  imports: [Button, TagModule, DividerModule, AccordionModule, TooltipModule],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Sección 1: Navegación principal simulada -->
      <div>
        <h4 class="text-sm font-semibold text-gray-300 m-0 mb-2">Navegación Principal</h4>
        <div class="flex flex-wrap gap-2">
          @for (mod of moduleNavItems(); track mod.id) {
            <div
              class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all"
              [class]="mod.enabled
                ? 'bg-neutral-700/80 border-neutral-600 text-white'
                : 'bg-neutral-900/50 border-neutral-800 text-gray-600 line-through'"
              [pTooltip]="mod.enabled ? 'Habilitado' : 'Sin acceso'"
              tooltipPosition="top"
            >
              <i [class]="mod.icon" [class.opacity-40]="!mod.enabled"></i>
              <span>{{ mod.label }}</span>
            </div>
          }
        </div>
      </div>

      <p-divider></p-divider>

      <!-- Sección 2: Detalle por módulo habilitado -->
      <div>
        <h4 class="text-sm font-semibold text-gray-300 m-0 mb-2">Detalle de Submódulos</h4>
        @if (enabledModules().length === 0) {
          <p class="text-gray-500 text-sm italic m-0">Este empleado no tiene módulos habilitados.</p>
        } @else {
          <p-accordion [multiple]="true">
            @for (mod of enabledModules(); track mod.id) {
              <p-accordionTab [selected]="true">
                <ng-template pTemplate="header">
                  <div class="flex items-center gap-2">
                    <i [class]="mod.icon" class="text-blue-400"></i>
                    <span class="font-medium text-sm">{{ mod.label }}</span>
                    <span class="text-xs text-gray-400 ml-auto mr-2">
                      {{ mod.enabledCount }}/{{ mod.totalCount }} activos
                    </span>
                  </div>
                </ng-template>

                <div class="flex flex-col gap-1">
                  @for (sub of mod.subModules; track sub.id) {
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded">
                      @if (sub.enabled) {
                        <i class="pi pi-check-circle text-green-400 text-sm"></i>
                      } @else {
                        <i class="pi pi-times-circle text-red-400/60 text-sm"></i>
                      }
                      <div class="flex flex-col">
                        <span class="text-sm" [class.text-white]="sub.enabled" [class.text-gray-500]="!sub.enabled">
                          {{ sub.label }}
                        </span>
                        @if (sub.description) {
                          <span class="text-xs text-gray-500">{{ sub.description }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </p-accordionTab>
            }
          </p-accordion>
        }
      </div>

      <p-divider></p-divider>

      <!-- Sección 3: Permisos legacy -->
      <div>
        <h4 class="text-sm font-semibold text-gray-300 m-0 mb-2">Permisos del Sistema (Legacy)</h4>
        <div class="flex flex-wrap gap-2">
          @for (perm of legacyPermissions(); track perm.key) {
            <p-tag
              [value]="perm.label"
              [severity]="perm.active ? 'success' : 'secondary'"
              [icon]="perm.icon"
              styleClass="text-xs"
              [pTooltip]="perm.description"
              tooltipPosition="top"
            ></p-tag>
          }
        </div>
      </div>

      <!-- Botón cerrar -->
      <div class="flex justify-end mt-2">
        <p-button
          label="Cerrar"
          severity="secondary"
          [text]="true"
          (onClick)="close()"
        ></p-button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    :host ::ng-deep .p-accordion-header .p-accordion-header-link {
      background: rgba(55, 65, 81, 0.3);
      border-color: rgba(75, 85, 99, 0.3);
      padding: 0.75rem;
    }

    :host ::ng-deep .p-accordion-content {
      background: rgba(31, 41, 55, 0.3);
      border-color: rgba(75, 85, 99, 0.3);
      padding: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionPreviewDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);

  private profile: UserPermissionProfile = this.config.data.profile;

  moduleNavItems = computed(() => {
    const frontendPerms = this.profile.frontendPermissions;
    return SYSTEM_MODULES.map((mod) => {
      const modulePerm = frontendPerms?.modules?.[mod.id];
      const enabled = !!modulePerm?.enabled &&
        Object.values(modulePerm?.subModules || {}).some((v) => v);
      return {
        id: mod.id,
        label: mod.label,
        icon: mod.icon,
        enabled,
      };
    });
  });

  enabledModules = computed(() => {
    const frontendPerms = this.profile.frontendPermissions;
    return SYSTEM_MODULES
      .map((mod) => {
        const modulePerm = frontendPerms?.modules?.[mod.id];
        const subModules = mod.subModules.map((sub) => ({
          id: sub.id,
          label: sub.label,
          description: sub.description || '',
          icon: sub.icon || '',
          enabled: !!modulePerm?.subModules?.[sub.id],
        }));
        const enabledCount = subModules.filter((s) => s.enabled).length;
        return {
          id: mod.id,
          label: mod.label,
          icon: mod.icon,
          subModules,
          enabledCount,
          totalCount: mod.subModules.length,
        };
      })
      .filter((mod) => {
        const modulePerm = frontendPerms?.modules?.[mod.id];
        return !!modulePerm?.enabled;
      });
  });

  legacyPermissions = computed(() => {
    return ALL_LEGACY_PERMISSIONS.map((key) => {
      const def = LEGACY_PERMISSION_DEFINITIONS[key];
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        icon: def.icon,
        active: !!this.profile.permissions[key],
      };
    });
  });

  close() {
    this.ref.close();
  }
}
