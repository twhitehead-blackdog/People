import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Employee } from '../../models';
import { ModulePermissionsService } from '../../services/module-permissions.service';
import { PermissionsService } from '../../services/permissions.service';
import { BranchesStore } from '../../stores/branches.store';
import { DashboardStore } from '../../stores/dashboard.store';
import { EmployeesStore } from '../../stores/employees.store';
import { PermissionEditorDialogComponent } from './permission-editor-dialog.component';
import { ModulePermissionEditorDialogComponent } from './module-permission-editor-dialog.component';
import {
  AccessState,
  getAccessStateIcon,
  getAccessStateLabel,
  getAccessStateSeverity,
  ModuleUserPermissionProfile,
  UserPermissionProfile,
} from './permissions.types';

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
    DropdownModule,
    SelectModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
  ],
  providers: [DialogService, DynamicDialogRef, ConfirmationService],
  template: `
    <p-confirmDialog />
    <p-card>
      <ng-template #title>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3"
        >
          <div>
            <h2 class="m-0 text-lg sm:text-xl flex items-center gap-2">
              <i class="pi pi-lock text-yellow-400"></i>
              Gestión de Permisos
            </h2>
            <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">
              Administra los niveles de acceso de los usuarios por módulo y
              submódulo.
            </p>
          </div>

          <!-- Acciones globales -->
          <div class="flex gap-2">
            <p-button
              label="Actualizar"
              icon="pi pi-refresh"
              [text]="true"
              severity="secondary"
              [loading]="loading()"
              (onClick)="loadProfiles()"
            ></p-button>
          </div>
        </div>
      </ng-template>

      <!-- Filtros -->
      <div class="mb-4 flex flex-wrap gap-3">
        <p-iconfield iconPosition="left" class="flex-1 min-w-[200px]">
          <p-inputicon>
            <i class="pi pi-search"></i>
          </p-inputicon>
          <input
            pInputText
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar usuario, cargo o sucursal..."
            class="w-full text-sm"
          />
        </p-iconfield>

        <p-select
          [options]="branchOptions()"
          [(ngModel)]="selectedBranch"
          placeholder="Filtrar por sucursal"
          [showClear]="true"
          optionLabel="label"
          optionValue="value"
          class="w-full sm:w-48"
        ></p-select>

        <p-select
          [options]="accessStateOptions"
          [(ngModel)]="selectedAccessState"
          placeholder="Estado de acceso"
          [showClear]="true"
          optionLabel="label"
          optionValue="value"
          class="w-full sm:w-48"
        ></p-select>
      </div>

      <!-- Loading -->
      @if (loading()) {
      <div class="flex justify-center items-center py-12">
        <p-progressSpinner strokeWidth="4" animationDuration="1s" />
      </div>
      } @else {
      <!-- Tabla de usuarios -->
      <p-table
        [value]="filteredProfiles()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50, 100]"
        styleClass="p-datatable-sm"
        [tableStyle]="{ 'min-width': '60rem' }"
        [globalFilterFields]="['employeeName', 'positionName', 'branchName']"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="employeeName" style="width: 25%">
              Usuario <p-sortIcon field="employeeName" />
            </th>
            <th pSortableColumn="positionName" style="width: 18%">
              Cargo <p-sortIcon field="positionName" />
            </th>
            <th pSortableColumn="branchName" style="width: 15%">
              Sucursal <p-sortIcon field="branchName" />
            </th>
            <th style="width: 15%">Estado</th>
            <th style="width: 12%">Módulos</th>
            <th style="width: 15%">Acciones</th>
          </tr>
        </ng-template>

        <ng-template #body let-profile>
          <tr class="hover:bg-neutral-800/50 transition-colors">
            <!-- Usuario -->
            <td>
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium"
                >
                  {{ getInitials(profile.employeeName) }}
                </div>
                <div class="flex flex-col">
                  <span class="font-medium text-white">
                    {{ profile.employeeName }}
                  </span>
                  @if (profile.hasOverrides) {
                  <span class="text-xs text-yellow-400">
                    <i class="pi pi-exclamation-circle mr-1"></i>Tiene overrides
                  </span>
                  }
                </div>
              </div>
            </td>

            <!-- Cargo -->
            <td>
              <span class="text-sm">{{ profile.positionName }}</span>
            </td>

            <!-- Sucursal -->
            <td>
              <span class="text-sm text-gray-400">{{ profile.branchName }}</span>
            </td>

            <!-- Estado -->
            <td>
              <p-tag
                [severity]="getStateSeverity(profile.accessState)"
                [value]="getStateLabel(profile.accessState)"
                [icon]="getStateIcon(profile.accessState)"
              ></p-tag>
            </td>

            <!-- Módulos -->
            <td>
              <div class="flex items-center gap-1">
                <span class="text-sm font-medium text-green-400">
                  {{ profile.accessibleModules }}
                </span>
                <span class="text-gray-500">/</span>
                <span class="text-sm text-gray-400">
                  {{ profile.totalModules }}
                </span>
                @if (profile.blockedModules > 0) {
                <span
                  class="text-xs text-red-400 ml-2"
                  pTooltip="Módulos bloqueados"
                >
                  <i class="pi pi-lock"></i> {{ profile.blockedModules }}
                </span>
                }
              </div>
            </td>

            <!-- Acciones -->
            <td>
              <div class="flex gap-1">
                <p-button
                  icon="pi pi-pencil"
                  [rounded]="true"
                  [text]="true"
                  severity="primary"
                  pTooltip="Editar permisos"
                  tooltipPosition="top"
                  (onClick)="openModuleEditor(profile)"
                ></p-button>

                <p-button
                  icon="pi pi-copy"
                  [rounded]="true"
                  [text]="true"
                  severity="secondary"
                  pTooltip="Clonar de otro usuario"
                  tooltipPosition="top"
                  (onClick)="openCloneDialog(profile)"
                ></p-button>

                <p-button
                  icon="pi pi-refresh"
                  [rounded]="true"
                  [text]="true"
                  severity="warn"
                  pTooltip="Restablecer a permisos del cargo"
                  tooltipPosition="top"
                  [disabled]="!profile.hasOverrides"
                  (onClick)="confirmReset(profile)"
                ></p-button>

                <p-button
                  [icon]="
                    profile.accessState === 'blocked'
                      ? 'pi pi-lock-open'
                      : 'pi pi-lock'
                  "
                  [rounded]="true"
                  [text]="true"
                  [severity]="
                    profile.accessState === 'blocked' ? 'danger' : 'secondary'
                  "
                  [pTooltip]="
                    profile.accessState === 'blocked'
                      ? 'Desbloquear acceso'
                      : 'Bloquear todo el acceso'
                  "
                  tooltipPosition="top"
                  (onClick)="toggleBlockAll(profile)"
                ></p-button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="6" class="text-center py-8 text-gray-400">
              <i class="pi pi-search text-3xl mb-3 block"></i>
              No se encontraron usuarios con el criterio de búsqueda.
            </td>
          </tr>
        </ng-template>
      </p-table>
      }
    </p-card>
  `,
  styles: `
    :host {
      display: block;
    }

    ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.75rem 1rem;
    }

    ::ng-deep .p-tag {
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsManagementComponent implements OnInit {
  private legacyService = inject(PermissionsService);
  private moduleService = inject(ModulePermissionsService);
  private dialogService = inject(DialogService);
  private store = inject(DashboardStore);
  private employeesStore = inject(EmployeesStore);
  private branchesStore = inject(BranchesStore);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Estado
  public loading = signal(false);
  public profiles = signal<ModuleUserPermissionProfile[]>([]);

  // Filtros
  public searchTerm = model<string>('');
  public selectedBranch = model<string | null>(null);
  public selectedAccessState = model<AccessState | null>(null);

  // Opciones de filtros
  public branchOptions = computed(() => {
    return this.branchesStore
      .entities()
      .filter((b) => b.is_active)
      .map((b) => ({
        label: b.name,
        value: b.id,
      }));
  });

  public accessStateOptions = [
    { label: 'Acceso Total', value: 'full' as AccessState },
    { label: 'Acceso Parcial', value: 'partial' as AccessState },
    { label: 'Bloqueado', value: 'blocked' as AccessState },
    { label: 'Sin Acceso', value: 'none' as AccessState },
  ];

  // Perfiles filtrados
  public filteredProfiles = computed(() => {
    let result = this.profiles();
    const term = (this.searchTerm() ?? '').toLowerCase().trim();
    const branch = this.selectedBranch();
    const state = this.selectedAccessState();

    if (term) {
      result = result.filter(
        (p) =>
          (p.employeeName?.toLowerCase() || '').includes(term) ||
          (p.positionName?.toLowerCase() || '').includes(term) ||
          (p.branchName?.toLowerCase() || '').includes(term)
      );
    }

    if (branch) {
      result = result.filter((p) => p.branchId === branch);
    }

    if (state) {
      result = result.filter((p) => p.accessState === state);
    }

    return result;
  });

  async ngOnInit(): Promise<void> {
    await this.loadProfiles();
  }

  /**
   * Carga los perfiles de todos los empleados
   */
  async loadProfiles(): Promise<void> {
    this.loading.set(true);

    try {
      // Inicializar servicio de módulos
      await this.moduleService.initialize();

      // Obtener empleados activos
      const employees = this.employeesStore.entities().filter((e) => e.is_active);

      // Cargar perfiles con permisos
      const profiles = await this.moduleService.getAllProfiles(employees);
      this.profiles.set(profiles);
    } catch (error) {
      console.error('Error loading permission profiles:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los perfiles de permisos',
      });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Abre el editor de permisos por módulo
   */
  openModuleEditor(profile: ModuleUserPermissionProfile): void {
    const employee = this.employeesStore
      .entities()
      .find((e) => e.id === profile.employeeId);

    if (!employee) return;

    const dialogRef = this.dialogService.open(
      ModulePermissionEditorDialogComponent,
      {
        header: `Permisos: ${profile.employeeName}`,
        width: '800px',
        data: {
          employee,
          profile,
        },
        contentStyle: { overflow: 'auto' },
        baseZIndex: 10000,
      }
    );

    dialogRef.onClose.subscribe((result) => {
      if (result) {
        this.loadProfiles();
      }
    });
  }

  /**
   * Abre diálogo para clonar permisos
   */
  openCloneDialog(profile: ModuleUserPermissionProfile): void {
    // Obtener lista de empleados para seleccionar origen
    const employees = this.employeesStore
      .entities()
      .filter((e) => e.is_active && e.id !== profile.employeeId);

    if (employees.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No hay otros empleados disponibles para clonar permisos',
      });
      return;
    }

    // Por ahora, usar el diálogo de confirmación simple
    // En una versión más completa, se crearía un diálogo dedicado
    this.confirmationService.confirm({
      message: `¿Deseas clonar los permisos de otro empleado para ${profile.employeeName}? Esto reemplazará todos los overrides actuales.`,
      header: 'Clonar Permisos',
      icon: 'pi pi-copy',
      accept: async () => {
        // Mostrar selector de empleado origen
        // Por ahora, mostrar un mensaje informativo
        this.messageService.add({
          severity: 'info',
          summary: 'Función en desarrollo',
          detail:
            'El diálogo de selección de empleado origen estará disponible pronto',
        });
      },
    });
  }

  /**
   * Confirma reset de permisos
   */
  confirmReset(profile: ModuleUserPermissionProfile): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de restablecer los permisos de ${profile.employeeName} a los de su cargo "${profile.positionName}"? Se eliminarán todos los overrides individuales.`,
      header: 'Restablecer Permisos',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.moduleService.resetToPosition(profile.employeeId);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Permisos restablecidos correctamente',
          });
          await this.loadProfiles();
        } catch (error) {
          console.error('Error resetting permissions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron restablecer los permisos',
          });
        }
      },
    });
  }

  /**
   * Alterna bloqueo total de un usuario
   */
  toggleBlockAll(profile: ModuleUserPermissionProfile): void {
    const isBlocked = profile.accessState === 'blocked';
    const action = isBlocked ? 'desbloquear' : 'bloquear';

    this.confirmationService.confirm({
      message: `¿Estás seguro de ${action} todo el acceso para ${profile.employeeName}?`,
      header: isBlocked ? 'Desbloquear Acceso' : 'Bloquear Acceso',
      icon: isBlocked ? 'pi pi-lock-open' : 'pi pi-lock',
      acceptButtonStyleClass: isBlocked ? 'p-button-success' : 'p-button-danger',
      accept: async () => {
        try {
          if (isBlocked) {
            // Desbloquear = resetear a permisos del cargo
            await this.moduleService.resetToPosition(profile.employeeId);
          } else {
            // Bloquear todos los módulos
            await this.moduleService.blockAllModules(
              profile.employeeId,
              'Bloqueado por administrador'
            );
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Acceso ${isBlocked ? 'desbloqueado' : 'bloqueado'} correctamente`,
          });
          await this.loadProfiles();
        } catch (error) {
          console.error('Error toggling block:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `No se pudo ${action} el acceso`,
          });
        }
      },
    });
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

  getStateSeverity(
    state: AccessState
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return getAccessStateSeverity(state);
  }

  getStateLabel(state: AccessState): string {
    return getAccessStateLabel(state);
  }

  getStateIcon(state: AccessState): string {
    return getAccessStateIcon(state);
  }
}
