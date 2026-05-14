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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageModule } from 'primeng/message';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { TabsModule } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PermissionsService } from '../../services/permissions.service';
import { invalidateEmployeeCache } from '../../guards/employee-portal.guard';
import {
  FrontendPermissions,
  LegacyPermissionKey,
  ModulePermission,
  SubModuleAccess,
  SubModuleMode,
  normalizeSubModuleMode,
} from './permissions.types';
import { SYSTEM_MODULES, ModuleDefinition, SubModule } from './module-permissions.types';

@Component({
  selector: 'pt-permission-editor-dialog',
  standalone: true,
  imports: [
    Button,
    ToggleSwitchModule,
    FormsModule,
    MessageModule,
    AccordionModule,
    BadgeModule,
    TabsModule,
    DividerModule,
    SelectButtonModule,
  ],
  template: `
    <div class="flex flex-col gap-4 permission-editor-container">
      <!-- Tabs para cambiar entre permisos legacy y frontend -->
      <p-tabs [value]="0" styleClass="permissions-tabs">
        <p-tablist>
          <p-tab [value]="0">
            <i class="pi pi-shield"></i>
            <span class="ml-2">Permisos del Sistema</span>
          </p-tab>
          <p-tab [value]="1">
            <i class="pi pi-desktop"></i>
            <span class="ml-2">Acceso al Frontend</span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
        <p-tabpanel [value]="0">
          <div class="flex flex-col gap-3 mt-2">
            <p-message
              severity="info"
              text="Estos permisos determinan el nivel de acceso administrativo del empleado."
              styleClass="w-full block"
            ></p-message>

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

                <p-toggleswitch
                  [(ngModel)]="tempPermissions[def.key]"
                ></p-toggleswitch>
              </div>
              }
            </div>
          </div>
        </p-tabpanel>

        <p-tabpanel [value]="1">
          <div class="flex flex-col gap-3 mt-2">
            <p-message
              severity="warn"
              text="Controla qué módulos y páginas puede ver este empleado en el sistema."
              styleClass="w-full block"
            ></p-message>

            <!-- Toggle para habilitar/deshabilitar todo -->
            <div class="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <div class="flex flex-col">
                <span class="font-semibold text-sm text-blue-300">Acceso Total</span>
                <span class="text-xs text-gray-400">Habilitar todos los módulos y submódulos</span>
              </div>
              <p-toggleswitch
                [ngModel]="isAllEnabled()"
                (ngModelChange)="toggleAll($event)"
              ></p-toggleswitch>
            </div>

            <p-divider></p-divider>

            <!-- Lista de módulos -->
            <p-accordion [value]="defaultAccordionValues" [multiple]="true" class="modules-accordion">
              @for (module of systemModules; track module.id) {
              <p-accordion-panel [value]="module.id">
                <p-accordion-header>
                  <div class="flex items-center gap-2 w-full pr-2">
                    <i [class]="module.icon" class="text-blue-400"></i>
                    <span class="font-medium text-sm">{{ module.label }}</span>
                    <p-badge
                      [value]="getEnabledSubModulesCount(module.id) + '/' + module.subModules.length"
                      [severity]="getModuleEnabled(module.id) ? 'success' : 'secondary'"
                      class="ml-auto"
                    />
                    <p-toggleswitch
                      [ngModel]="getModuleEnabled(module.id)"
                      (ngModelChange)="toggleModule(module.id, $event)"
                      (click)="$event.stopPropagation()"
                    ></p-toggleswitch>
                  </div>
                </p-accordion-header>
                <p-accordion-content>
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
                      <p-selectbutton
                        [options]="accessOptions"
                        [ngModel]="getSubModuleAccess(module.id, sub.id)"
                        (ngModelChange)="setSubModuleAccess(module.id, sub.id, $event)"
                        optionLabel="label"
                        optionValue="value"
                        [allowEmpty]="false"
                        styleClass="access-select"
                      ></p-selectbutton>
                    </div>
                    }
                  </div>
                </p-accordion-content>
              </p-accordion-panel>
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
        </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <div class="sticky-buttons flex justify-end gap-2">
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

    :host ::ng-deep .access-select .p-button {
      padding: 0.25rem 0.6rem;
      font-size: 0.7rem;
    }
    :host ::ng-deep .access-select .p-button.p-highlight[data-pc-name="button"]:nth-child(2) {
      background: #f59e0b;
      border-color: #f59e0b;
    }

    .sticky-buttons {
      position: sticky;
      bottom: -1.25rem;
      background: var(--p-dialog-background, #1f2937);
      padding: 0.75rem 0;
      margin: 0 -1.25rem -1.25rem;
      padding-left: 1.25rem;
      padding-right: 1.25rem;
      border-top: 1px solid rgba(75, 85, 99, 0.5);
      z-index: 10;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionEditorDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private service = inject(PermissionsService);
  private messageService = inject(MessageService);

  public employeeId: string | null = this.config.data.employeeId || null;

  // Permisos legacy
  public legacyDefinitions = this.service.getPermissionDefinitions();
  public tempPermissions: Record<LegacyPermissionKey, boolean> = {
    ...this.config.data.currentPermissions,
  };

  // Módulos del sistema
  public systemModules = SYSTEM_MODULES;

  // Opciones para el selector tri-estado por sub-módulo
  public accessOptions: Array<{ label: string; value: SubModuleMode; icon: string }> = [
    { label: 'Sin acceso', value: 'none', icon: 'pi pi-ban' },
    { label: 'Lectura', value: 'read', icon: 'pi pi-eye' },
    { label: 'Completo', value: 'write', icon: 'pi pi-pencil' },
  ];

  // Valores iniciales para abrir todos los paneles del acordeón por defecto
  public defaultAccordionValues = SYSTEM_MODULES.map((m) => m.id);

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
        .filter(v => normalizeSubModuleMode(v) !== 'none').length;
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
      const subModules: Record<string, SubModuleAccess> = {};
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
    return !!module.subModules[subModuleId];
  }

  getSubModuleAccess(moduleId: string, subModuleId: string): SubModuleMode {
    const module = this.frontendPermissionsState().modules[moduleId];
    if (!module?.enabled) return 'none';
    return normalizeSubModuleMode(module.subModules[subModuleId]);
  }

  getEnabledSubModulesCount(moduleId: string): number {
    const module = this.frontendPermissionsState().modules[moduleId];
    if (!module?.enabled) return 0;
    return Object.values(module.subModules).filter(v => normalizeSubModuleMode(v) !== 'none').length;
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
    this.setSubModuleAccess(moduleId, subModuleId, enabled ? 'write' : 'none');
  }

  /**
   * Aplica el modo de acceso ('none'|'read'|'write') a un sub-módulo.
   * Se persiste como `false | 'read' | true` para mantener compatibilidad con el JSON existente.
   */
  setSubModuleAccess(moduleId: string, subModuleId: string, mode: SubModuleMode): void {
    const current = this.frontendPermissionsState();
    const module = current.modules[moduleId];
    if (!module) return;

    const value: SubModuleAccess = mode === 'write' ? true : mode === 'read' ? 'read' : false;
    const shouldEnableModule = mode !== 'none' ? true : module.enabled;

    this.frontendPermissionsState.set({
      ...current,
      modules: {
        ...current.modules,
        [moduleId]: {
          ...module,
          enabled: shouldEnableModule,
          subModules: {
            ...module.subModules,
            [subModuleId]: value,
          },
        },
      },
    });
  }

  toggleAll(enabled: boolean): void {
    const current = this.frontendPermissionsState();
    const newModules: Record<string, ModulePermission> = {};

    for (const module of SYSTEM_MODULES) {
      const subModules: Record<string, SubModuleAccess> = {};
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
      if (this.employeeId) {
        // Guardar overrides (legacy + frontend)
        await this.service.updateEmployeeFrontendPermissions(
          this.employeeId,
          this.frontendPermissionsState()
        );

        // Guardar legacy permissions como override
        const legacyUpdates: Partial<Record<LegacyPermissionKey, boolean>> = {};
        for (const key of Object.keys(this.tempPermissions) as LegacyPermissionKey[]) {
          legacyUpdates[key] = this.tempPermissions[key];
        }
        await this.service.updateEmployeeLegacyPermissions(this.employeeId, legacyUpdates);

        // Invalidar cache del guard para que los cambios se reflejen inmediatamente
        invalidateEmployeeCache();

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Permisos del empleado actualizados',
        });
        this.ref.close(true);
      }
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
}
