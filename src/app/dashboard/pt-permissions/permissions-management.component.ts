import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
import { PermissionsService } from '../../services/permissions.service';
import { DeviceService } from '../../services/device.service';
import { DashboardStore } from '../../stores/dashboard.store';
import { PermissionEditorDialogComponent } from './permission-editor-dialog.component';
import { UserPermissionProfile } from './permissions.types';
import { SYSTEM_MODULES } from './module-permissions.types';

@Component({
  selector: 'pt-permissions-management',
  standalone: true,
  imports: [
    TableModule,
    Card,
    Button,
    IconField,
    InputIcon,
    InputText,
    FormsModule,
    TagModule,
    TooltipModule,
    AccordionModule,
    BadgeModule,
  ],
  providers: [DialogService, DynamicDialogRef],
  template: `
    <div class="permissions-page w-full">
      <!-- Vista Desktop -->
      @if (device.isDesktop()) {
      <p-card styleClass="permissions-card">
        <ng-template #title>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
            <div>
              <h2 class="m-0 text-xl font-bold text-white">Gestión de Permisos</h2>
              <p class="text-sm text-gray-400 m-0 mt-1">Control de acceso al frontend por cargo y módulos del sistema.</p>
            </div>
          </div>
        </ng-template>

        <!-- Tabs para cambiar entre vistas -->
        <div class="flex gap-2 mb-4 border-b border-neutral-700 pb-3">
          <button 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-blue-600]="activeView() === 'profiles'"
            [class.text-white]="activeView() === 'profiles'"
            [class.bg-neutral-700]="activeView() !== 'profiles'"
            [class.text-gray-300]="activeView() !== 'profiles'"
            (click)="activeView.set('profiles')"
          >
            <i class="pi pi-users mr-2"></i>Por Persona
          </button>
          <button 
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-blue-600]="activeView() === 'modules'"
            [class.text-white]="activeView() === 'modules'"
            [class.bg-neutral-700]="activeView() !== 'modules'"
            [class.text-gray-300]="activeView() !== 'modules'"
            (click)="activeView.set('modules')"
          >
            <i class="pi pi-th-large mr-2"></i>Por Módulo
          </button>
        </div>

        @if (activeView() === 'profiles') {
        <!-- Vista por Persona -->
        <div class="mb-4 flex gap-2">
          <p-iconfield iconPosition="left" class="w-full sm:w-auto">
            <p-inputicon><i class="pi pi-search"></i></p-inputicon>
            <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar usuario, cargo o sucursal..." class="w-full sm:w-80 text-sm rounded-lg border-neutral-600 bg-neutral-800/80 px-3 py-2" />
          </p-iconfield>
        </div>
        <p-table
          [value]="filteredProfiles()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50, 100]"
          styleClass="p-datatable-sm min-w-full"
          [tableStyle]="{ 'min-width': '50rem' }"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="employeeName" style="width: 25%">Usuario <p-sortIcon field="employeeName" /></th>
              <th pSortableColumn="positionName" style="width: 20%">Cargo <p-sortIcon field="positionName" /></th>
              <th style="width: 45%">Módulos Permitidos</th>
              <th style="width: 10%"></th>
            </tr>
          </ng-template>
          <ng-template #body let-profile>
            <tr class="hover:bg-neutral-800/50 transition-colors">
              <td>
                <div class="flex flex-col">
                  <span class="font-medium text-white">{{ profile.employeeName }}</span>
                  <span class="text-xs text-gray-400">{{ profile.branchName }}</span>
                </div>
              </td>
              <td>
                <span [class.text-blue-300]="profile.userType === 'manager'" [class.text-amber-300]="profile.userType === 'admin'">{{ profile.positionName }}</span>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (moduleAccess of getProfileModuleSummary(profile); track moduleAccess.moduleId) {
                    @if (moduleAccess.hasAccess) {
                      <p-tag 
                        [severity]="moduleAccess.enabledCount > 0 ? 'success' : 'secondary'" 
                        [value]="moduleAccess.label + ' (' + moduleAccess.enabledCount + '/' + moduleAccess.totalCount + ')'" 
                        [icon]="moduleAccess.icon"
                        [pTooltip]="moduleAccess.subModulesText"
                        styleClass="text-xs"
                      ></p-tag>
                    }
                  }
                  @if (getProfileModuleSummary(profile).length === 0) {
                    <span class="text-gray-500 text-xs italic">Sin acceso a módulos</span>
                  }
                </div>
              </td>
              <td class="text-right">
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" pTooltip="Editar permisos del cargo" tooltipPosition="left" (onClick)="openEditor(profile)"></p-button>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="4" class="text-center py-8 text-gray-400">No se encontraron usuarios con el criterio de búsqueda.</td></tr>
          </ng-template>
        </p-table>
        } @else {
        <!-- Vista por Módulo -->
        <div class="modules-overview">
          <p class="text-sm text-gray-400 mb-4">
            Resumen de todos los módulos y submódulos del sistema. Haz clic en "Editar" para configurar el acceso por cargo.
          </p>
          
          <p-accordion [multiple]="true">
            @for (module of systemModules; track module.id) {
            <p-accordionTab>
              <ng-template pTemplate="header">
                <div class="flex items-center gap-2 w-full">
                  <i [class]="module.icon" class="text-blue-400"></i>
                  <span class="font-medium">{{ module.label }}</span>
                  <span class="text-xs text-gray-400 ml-2">({{ module.subModules.length }} submódulos)</span>
                  <p-badge 
                    [value]="getModuleAccessCount(module.id) + ' cargos'" 
                    severity="info" 
                    class="ml-auto mr-2"
                  />
                </div>
              </ng-template>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (sub of module.subModules; track sub.id) {
                <div class="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 flex items-start gap-3">
                  <i [class]="sub.icon" class="text-gray-400 mt-0.5"></i>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white m-0 truncate">{{ sub.label }}</p>
                    <p class="text-xs text-gray-500 m-0 truncate">{{ sub.description }}</p>
                    <p class="text-xs text-gray-600 m-0 mt-1">{{ sub.route }}</p>
                  </div>
                </div>
                }
              </div>

              <div class="mt-4 pt-3 border-t border-neutral-700">
                <p class="text-xs text-gray-400 mb-2">Cargos con acceso:</p>
                <div class="flex flex-wrap gap-2">
                  @for (position of getPositionsWithModuleAccess(module.id); track position.positionId) {
                    <p-tag 
                      [value]="position.positionName" 
                      severity="secondary" 
                      styleClass="text-xs"
                      [pTooltip]="position.employeeNames"
                    />
                  }
                </div>
              </div>
            </p-accordionTab>
            }
          </p-accordion>
        </div>
        }
      </p-card>
      
      } @else {
      <!-- Vista Mobile -->
      <div class="mobile-permissions flex flex-col min-h-[60vh]">
        <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
          <h2 class="m-0 text-lg font-bold text-white">Permisos</h2>
          <p class="text-xs text-gray-400 m-0 mt-1">Niveles de acceso por usuario</p>
          
          <!-- Tabs Mobile -->
          <div class="flex gap-2 mt-3">
            <button 
              class="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              [class.bg-blue-600]="activeView() === 'profiles'"
              [class.text-white]="activeView() === 'profiles'"
              [class.bg-neutral-700]="activeView() !== 'profiles'"
              [class.text-gray-300]="activeView() !== 'profiles'"
              (click)="activeView.set('profiles')"
            >
              Por Persona
            </button>
            <button 
              class="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              [class.bg-blue-600]="activeView() === 'modules'"
              [class.text-white]="activeView() === 'modules'"
              [class.bg-neutral-700]="activeView() !== 'modules'"
              [class.text-gray-300]="activeView() !== 'modules'"
              (click)="activeView.set('modules')"
            >
              Por Módulo
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto px-3 py-3">
          @if (activeView() === 'profiles') {
            <!-- Vista Mobile por Persona -->
            <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar..." class="w-full mb-3 text-sm rounded-lg border-neutral-600 bg-neutral-900/80 px-3 py-2.5 text-white placeholder-gray-500" />
            
            @if (filteredProfiles().length === 0) {
              <div class="text-center py-12 text-gray-400">
                <i class="pi pi-lock text-4xl block mb-2 opacity-60"></i>
                <p class="text-sm font-medium">No hay resultados</p>
              </div>
            } @else {
              <div class="flex flex-col gap-2 pb-4">
                @for (profile of filteredProfiles(); track profile.positionId) {
                  <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-white text-sm m-0">{{ profile.employeeName }}</p>
                        <p class="text-xs text-gray-400 m-0 mt-0.5" [class.text-blue-300]="profile.userType === 'manager'" [class.text-amber-300]="profile.userType === 'admin'">{{ profile.positionName }}</p>
                        @if (profile.branchName) {
                          <p class="text-xs text-gray-500 m-0 mt-0.5">{{ profile.branchName }}</p>
                        }
                        <div class="flex flex-wrap gap-1 mt-2">
                          @for (moduleAccess of getProfileModuleSummary(profile); track moduleAccess.moduleId) {
                            @if (moduleAccess.hasAccess) {
                              <p-tag [severity]="'success'" [value]="moduleAccess.label" styleClass="text-[10px] py-0"></p-tag>
                            }
                          }
                        </div>
                      </div>
                      <p-button icon="pi pi-pencil" (onClick)="openEditor(profile)" rounded text size="small" class="min-w-[36px] min-h-[36px]" pTooltip="Editar permisos" tooltipPosition="top"></p-button>
                    </div>
                  </div>
                }
              </div>
            }
          } @else {
            <!-- Vista Mobile por Módulo -->
            <div class="flex flex-col gap-2 pb-4">
              @for (module of systemModules; track module.id) {
                <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 overflow-hidden">
                  <div class="p-3 flex items-center gap-2 border-b border-neutral-700/50">
                    <i [class]="module.icon" class="text-blue-400"></i>
                    <span class="font-medium text-sm text-white">{{ module.label }}</span>
                    <span class="text-xs text-gray-500 ml-auto">{{ getModuleAccessCount(module.id) }} cargos</span>
                  </div>
                  <div class="p-3 space-y-2">
                    @for (sub of module.subModules; track sub.id) {
                      <div class="flex items-center gap-2 text-xs">
                        <i [class]="sub.icon" class="text-gray-500 text-[10px]"></i>
                        <span class="text-gray-300">{{ sub.label }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </main>
      </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    :host ::ng-deep .permissions-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .permissions-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .permissions-card .p-card-title { color: #f3f4f6 !important; }
    
    :host ::ng-deep .p-accordion .p-accordion-header .p-accordion-header-link {
      background: rgba(55, 65, 81, 0.5) !important;
      border-color: rgba(75, 85, 99, 0.5) !important;
      color: #f3f4f6 !important;
    }
    :host ::ng-deep .p-accordion .p-accordion-content {
      background: rgba(31, 41, 55, 0.5) !important;
      border-color: rgba(75, 85, 99, 0.5) !important;
      color: #d1d5db !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsManagementComponent {
  private service = inject(PermissionsService);
  private dialogService = inject(DialogService);
  private store = inject(DashboardStore);
  protected device = inject(DeviceService);

  public searchTerm = model<string>('');
  public activeView = model<'profiles' | 'modules'>('profiles');

  // Exponer los módulos del sistema para la vista
  public systemModules = SYSTEM_MODULES;

  public profiles = this.service.allUserProfiles;

  public filteredProfiles = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase().trim();
    const all = this.profiles();

    if (!term) return all;

    return all.filter(
      (p) =>
        (p.employeeName?.toLowerCase() || '').includes(term) ||
        (p.positionName?.toLowerCase() || '').includes(term) ||
        (p.branchName?.toLowerCase() || '').includes(term)
    );
  });

  /**
   * Obtiene un resumen de módulos para un perfil
   */
  getProfileModuleSummary(profile: UserPermissionProfile) {
    const modules = profile.frontendPermissions?.modules || {};
    const summary: Array<{
      moduleId: string;
      label: string;
      icon: string;
      hasAccess: boolean;
      enabledCount: number;
      totalCount: number;
      subModulesText: string;
    }> = [];

    for (const moduleDef of SYSTEM_MODULES) {
      const modulePerm = modules[moduleDef.id];
      if (!modulePerm) continue;

      const enabledSubModules = Object.entries(modulePerm.subModules || {})
        .filter(([_, enabled]) => enabled)
        .map(([id, _]) => {
          const sub = moduleDef.subModules.find(s => s.id === id);
          return sub?.label || id;
        });

      summary.push({
        moduleId: moduleDef.id,
        label: moduleDef.label,
        icon: moduleDef.icon,
        hasAccess: modulePerm.enabled && enabledSubModules.length > 0,
        enabledCount: enabledSubModules.length,
        totalCount: moduleDef.subModules.length,
        subModulesText: enabledSubModules.join(', ') || 'Sin submódulos activos',
      });
    }

    return summary.filter(s => s.hasAccess);
  }

  /**
   * Cuenta cuántos cargos tienen acceso a un módulo
   */
  getModuleAccessCount(moduleId: string): number {
    const profiles = this.profiles();
    let count = 0;

    for (const profile of profiles) {
      const modulePerm = profile.frontendPermissions?.modules?.[moduleId];
      if (modulePerm?.enabled && Object.values(modulePerm.subModules || {}).some(v => v)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Obtiene la lista de cargos con acceso a un módulo
   */
  getPositionsWithModuleAccess(moduleId: string): Array<{ positionId: string; positionName: string; employeeNames: string }> {
    const profiles = this.profiles();
    const positionMap = new Map<string, { positionName: string; employees: string[] }>();

    for (const profile of profiles) {
      const modulePerm = profile.frontendPermissions?.modules?.[moduleId];
      if (modulePerm?.enabled && Object.values(modulePerm.subModules || {}).some(v => v)) {
        if (!positionMap.has(profile.positionId)) {
          positionMap.set(profile.positionId, {
            positionName: profile.positionName,
            employees: [],
          });
        }
        positionMap.get(profile.positionId)!.employees.push(profile.employeeName);
      }
    }

    return Array.from(positionMap.entries()).map(([positionId, data]) => ({
      positionId,
      positionName: data.positionName,
      employeeNames: data.employees.join(', '),
    }));
  }

  public openEditor(profile: UserPermissionProfile) {
    const dialogRef = this.dialogService.open(PermissionEditorDialogComponent, {
      header: `Permisos: ${profile.positionName}`,
      width: '600px',
      modal: true,
      dismissableMask: true, // Cerrar al hacer clic fuera
      closeOnEscape: true,   // Cerrar con tecla Escape
      data: {
        positionId: profile.positionId,
        positionName: profile.positionName,
        currentPermissions: profile.permissions,
        frontendPermissions: profile.frontendPermissions,
        isSupportUser: profile.isSupportUser,
      },
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
    });

    // Refrescar datos tras guardar cambios
    dialogRef.onClose.subscribe((result) => {
      if (result) {
        // Recargar employees y positions para reflejar cambios
        this.store.employees.reloadItems();
        this.store.positions.reloadItems();
      }
    });
  }
}
