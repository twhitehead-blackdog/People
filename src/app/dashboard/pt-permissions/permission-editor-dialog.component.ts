import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MessageModule } from 'primeng/message';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { TabViewModule } from 'primeng/tabview';
import { DividerModule } from 'primeng/divider';
import { PermissionsService } from '../../services/permissions.service';
import {
  FrontendPermissions,
  LegacyPermissionKey,
  ModulePermission,
} from './permissions.types';
import { SYSTEM_MODULES, ModuleDefinition, SubModule } from './module-permissions.types';

@Component({
  selector: 'pt-permission-editor-dialog',
  standalone: true,
  imports: [
    Button,
    InputSwitchModule,
    FormsModule,
    MessageModule,
    AccordionModule,
    BadgeModule,
    TabViewModule,
    DividerModule,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Tabs para cambiar entre permisos legacy y frontend -->
      <p-tabView styleClass="permissions-tabs">
        <p-tabPanel header="Permisos del Sistema" leftIcon="pi pi-shield">
          <div class="flex flex-col gap-3 mt-2">
            @if (mode === 'employee') {
              <p-message
                severity="info"
                text="Estos permisos son específicos para este empleado y NO afectan a otros del mismo cargo."
                styleClass="w-full block"
              ></p-message>
            } @else {
              <p-message
                severity="info"
                text="Estás editando permisos a nivel de CARGO. Los cambios afectarán a TODOS los usuarios con este cargo."
                styleClass="w-full block"
              ></p-message>
            }

            <div class="flex flex-col gap-3 mt-2">
              @for (def of legacyDefinitions; track def.key) {
              <div
                class="flex items-start justify-between p-3 border border-neutral-700 rounded-lg bg-neutral-800/30"
              >
                <div class="flex flex-col gap-1 pr-4">
                  <div class="flex items-center gap-2">
                    <i [class]="def.icon"></i>
                    <span class="font-semibold text-sm">{{ def.label }}</span>
                  </div>
                  <p class="text-xs text-gray-400 m-0">{{ def.description }}</p>
                </div>

                <p-inputSwitch
                  [(ngModel)]="tempPermissions[def.key]"
                ></p-inputSwitch>
              </div>
              }
            </div>
          </div>
        </p-tabPanel>

        <p-tabPanel header="Acceso al Frontend" leftIcon="pi pi-desktop">
          <div class="flex flex-col gap-3 mt-2">
            @if (mode === 'employee') {
              <p-message
                severity="warn"
                text="Controla qué módulos y páginas puede ver este empleado en el sistema."
                styleClass="w-full block"
              ></p-message>
            } @else {
              <p-message
                severity="warn"
                text="Controla qué módulos y páginas puede ver este cargo en el sistema."
                styleClass="w-full block"
              ></p-message>
            }

            <!-- Toggle para habilitar/deshabilitar todo -->
            <div class="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <div class="flex flex-col">
                <span class="font-semibold text-sm text-blue-300">Acceso Total</span>
                <span class="text-xs text-gray-400">Habilitar todos los módulos y submódulos</span>
              </div>
              <p-inputSwitch
                [ngModel]="isAllEnabled()"
                (ngModelChange)="toggleAll($event)"
              ></p-inputSwitch>
            </div>

            <p-divider></p-divider>

            <!-- Lista de módulos -->
            <p-accordion [multiple]="true" class="modules-accordion">
              @for (module of systemModules; track module.id) {
              <p-accordionTab [selected]="true">
                <ng-template pTemplate="header">
                  <div class="flex items-center gap-2 w-full pr-2">
                    <i [class]="module.icon" class="text-blue-400"></i>
                    <span class="font-medium text-sm">{{ module.label }}</span>
                    <p-badge 
                      [value]="getEnabledSubModulesCount(module.id) + '/' + module.subModules.length" 
                      [severity]="getModuleEnabled(module.id) ? 'success' : 'secondary'"
                      class="ml-auto"
                    />
                    <p-inputSwitch
                      [ngModel]="getModuleEnabled(module.id)"
                      (ngModelChange)="toggleModule(module.id, $event)"
                      (click)="$event.stopPropagation()"
                    ></p-inputSwitch>
                  </div>
                </ng-template>

                <div class="flex flex-col gap-2 pl-2">
                  @for (sub of module.subModules; track sub.id) {
                  <div 
                    class="flex items-center justify-between p-2 rounded-lg transition-colors"
                    [class.bg-neutral-800]="getSubModuleEnabled(module.id, sub.id)"
                    [class.bg-transparent]="!getSubModuleEnabled(module.id, sub.id)"
                  >
                    <div class="flex items-center gap-2">
                      <i [class]="sub.icon" class="text-gray-500 text-sm"></i>
                      <div class="flex flex-col">
                        <span class="text-sm text-gray-200">{{ sub.label }}</span>
                        <span class="text-xs text-gray-500">{{ sub.description }}</span>
                      </div>
                    </div>
                    <p-inputSwitch
                      [ngModel]="getSubModuleEnabled(module.id, sub.id)"
                      (ngModelChange)="toggleSubModule(module.id, sub.id, $event)"
                    ></p-inputSwitch>
                  </div>
                  }
                </div>
              </p-accordionTab>
              }
            </p-accordion>

            <!-- Resumen -->
            <div class="mt-4 p-3 bg-neutral-800/50 rounded-lg">
              <p class="text-sm font-medium text-gray-300 mb-2">Resumen de accesos:</p>
              <div class="flex flex-wrap gap-2">
                @for (summary of moduleSummary(); track summary.moduleId) {
                  @if (summary.enabledCount > 0) {
                    <p-badge 
                      [value]="summary.label + ': ' + summary.enabledCount" 
                      severity="success"
                      styleClass="text-xs"
                    />
                  }
                }
                @if (totalEnabledSubModules() === 0) {
                  <span class="text-xs text-gray-500 italic">Sin accesos configurados</span>
                }
              </div>
            </div>
          </div>
        </p-tabPanel>
      </p-tabView>

      <div class="flex justify-between mt-4">
        @if (mode === 'employee') {
          <p-button
            label="Restaurar permisos del cargo"
            icon="pi pi-refresh"
            [text]="true"
            severity="warn"
            [loading]="saving()"
            (onClick)="restorePositionPermissions()"
          ></p-button>
        } @else {
          <div></div>
        }
        <div class="flex gap-2">
          <p-button
            label="Cancelar"
            [text]="true"
            severity="secondary"
            (onClick)="close()"
          ></p-button>
          <p-button
            label="Guardar Cambios"
            severity="primary"
            [loading]="saving()"
            (onClick)="save()"
          ></p-button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    
    :host ::ng-deep .permissions-tabs .p-tabview-nav {
      background: transparent;
      border-color: rgba(75, 85, 99, 0.5);
    }
    
    :host ::ng-deep .permissions-tabs .p-tabview-nav li .p-tabview-nav-link {
      background: rgba(55, 65, 81, 0.5);
      color: #9ca3af;
      border-color: rgba(75, 85, 99, 0.5);
    }
    
    :host ::ng-deep .permissions-tabs .p-tabview-nav li.p-highlight .p-tabview-nav-link {
      background: rgba(31, 41, 55, 0.95);
      color: #f3f4f6;
      border-color: #3b82f6;
    }
    
    :host ::ng-deep .permissions-tabs .p-tabview-panels {
      background: transparent;
      padding: 0.5rem 0;
    }
    
    :host ::ng-deep .modules-accordion .p-accordion-header .p-accordion-header-link {
      background: rgba(55, 65, 81, 0.3);
      border-color: rgba(75, 85, 99, 0.3);
      padding: 0.75rem;
    }
    
    :host ::ng-deep .modules-accordion .p-accordion-content {
      background: rgba(31, 41, 55, 0.3);
      border-color: rgba(75, 85, 99, 0.3);
      padding: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionEditorDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private service = inject(PermissionsService);
  private messageService = inject(MessageService);

  // Modo de edición: 'position' (cargo) o 'employee' (individual)
  public mode: 'position' | 'employee' = this.config.data.mode || 'position';
  public employeeId: string | null = this.config.data.employeeId || null;

  // Datos del cargo
  public positionId = this.config.data.positionId;
  public positionName = this.config.data.positionName;
  public isSupportUser = this.config.data.isSupportUser || false;

  // Permisos legacy
  public legacyDefinitions = this.service.getPermissionDefinitions();
  public tempPermissions: Record<LegacyPermissionKey, boolean> = {
    ...this.config.data.currentPermissions,
  };

  // Módulos del sistema
  public systemModules = SYSTEM_MODULES;

  // Permisos de frontend (estructura mutable)
  private frontendPermissionsState = signal<FrontendPermissions>(
    this.config.data.frontendPermissions || this.createEmptyFrontendPermissions()
  );

  public saving = model(false);

  // Computed para el resumen
  moduleSummary = computed(() => {
    const perms = this.frontendPermissionsState();
    return SYSTEM_MODULES.map(module => {
      const modulePerm = perms.modules[module.id];
      const enabledCount = Object.values(modulePerm?.subModules || {})
        .filter(v => v).length;
      return {
        moduleId: module.id,
        label: module.label,
        enabledCount,
      };
    });
  });

  totalEnabledSubModules = computed(() => {
    return this.moduleSummary().reduce((acc, m) => acc + m.enabledCount, 0);
  });

  isAllEnabled = computed(() => {
    for (const module of SYSTEM_MODULES) {
      const modulePerm = this.frontendPermissionsState().modules[module.id];
      if (!modulePerm?.enabled) return false;
      for (const sub of module.subModules) {
        if (!modulePerm.subModules[sub.id]) return false;
      }
    }
    return true;
  });

  private createEmptyFrontendPermissions(): FrontendPermissions {
    const modules: Record<string, ModulePermission> = {};
    
    for (const module of SYSTEM_MODULES) {
      const subModules: Record<string, boolean> = {};
      for (const sub of module.subModules) {
        subModules[sub.id] = false;
      }
      modules[module.id] = {
        moduleId: module.id,
        enabled: false,
        subModules,
      };
    }

    return {
      version: 1,
      modules,
    };
  }

  // Getters y setters para los switches
  getModuleEnabled(moduleId: string): boolean {
    return this.frontendPermissionsState().modules[moduleId]?.enabled || false;
  }

  getSubModuleEnabled(moduleId: string, subModuleId: string): boolean {
    const module = this.frontendPermissionsState().modules[moduleId];
    if (!module?.enabled) return false;
    return module.subModules[subModuleId] || false;
  }

  getEnabledSubModulesCount(moduleId: string): number {
    const module = this.frontendPermissionsState().modules[moduleId];
    if (!module?.enabled) return 0;
    return Object.values(module.subModules).filter(v => v).length;
  }

  // Toggles
  toggleModule(moduleId: string, enabled: boolean): void {
    const current = this.frontendPermissionsState();
    const module = current.modules[moduleId];
    if (!module) return;

    // Actualizar el estado
    this.frontendPermissionsState.set({
      ...current,
      modules: {
        ...current.modules,
        [moduleId]: {
          ...module,
          enabled,
          // Si se desactiva el módulo, mantener los submódulos como están
          // Si se activa, no cambiar los submódulos individuales
        },
      },
    });
  }

  toggleSubModule(moduleId: string, subModuleId: string, enabled: boolean): void {
    const current = this.frontendPermissionsState();
    const module = current.modules[moduleId];
    if (!module) return;

    this.frontendPermissionsState.set({
      ...current,
      modules: {
        ...current.modules,
        [moduleId]: {
          ...module,
          enabled: true, // Activar el módulo si se activa un submódulo
          subModules: {
            ...module.subModules,
            [subModuleId]: enabled,
          },
        },
      },
    });
  }

  toggleAll(enabled: boolean): void {
    const current = this.frontendPermissionsState();
    const newModules: Record<string, ModulePermission> = {};

    for (const module of SYSTEM_MODULES) {
      const subModules: Record<string, boolean> = {};
      for (const sub of module.subModules) {
        subModules[sub.id] = enabled;
      }
      newModules[module.id] = {
        moduleId: module.id,
        enabled,
        subModules,
      };
    }

    this.frontendPermissionsState.set({
      ...current,
      modules: newModules,
    });
  }

  close() {
    this.ref.close();
  }

  async save() {
    this.saving.set(true);
    try {
      if (this.mode === 'employee' && this.employeeId) {
        // Modo empleado: solo guardar frontend permissions como override
        await this.service.updateEmployeeFrontendPermissions(
          this.employeeId,
          this.frontendPermissionsState()
        );
      } else {
        // Modo cargo: guardar permisos legacy + frontend a nivel de position
        const legacyUpdates: Partial<Record<LegacyPermissionKey, boolean>> = {};
        for (const key of Object.keys(this.tempPermissions) as LegacyPermissionKey[]) {
          legacyUpdates[key] = this.tempPermissions[key];
        }

        if (Object.keys(legacyUpdates).length > 0) {
          await this.service.updatePositionPermissions(this.positionId, legacyUpdates);
        }

        await this.service.updatePositionFrontendPermissions(
          this.positionId,
          this.frontendPermissionsState()
        );
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: this.mode === 'employee'
          ? 'Permisos del empleado actualizados'
          : 'Permisos del cargo actualizados',
      });
      this.ref.close(true);
    } catch (error) {
      console.error('Error saving permissions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron guardar los permisos',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async restorePositionPermissions() {
    if (!this.employeeId) return;
    this.saving.set(true);
    try {
      await this.service.clearEmployeeFrontendPermissions(this.employeeId);
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Permisos restaurados a los del cargo',
      });
      this.ref.close(true);
    } catch (error) {
      console.error('Error restoring permissions:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron restaurar los permisos',
      });
    } finally {
      this.saving.set(false);
    }
  }
}
