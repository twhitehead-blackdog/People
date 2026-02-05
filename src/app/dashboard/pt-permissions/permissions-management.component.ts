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
import { PermissionsService } from '../../services/permissions.service';
import { DeviceService } from '../../services/device.service';
import { DashboardStore } from '../../stores/dashboard.store';
import { PermissionEditorDialogComponent } from './permission-editor-dialog.component';
import { UserPermissionProfile } from './permissions.types';

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
  ],
  providers: [DialogService, DynamicDialogRef],
  template: `
    <div class="permissions-page w-full">
    @if (device.isDesktop()) {
    <p-card styleClass="permissions-card">
      <ng-template #title>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div>
            <h2 class="m-0 text-xl font-bold text-white">Gestión de Permisos</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Visualiza y administra los niveles de acceso de los usuarios.</p>
          </div>
        </div>
      </ng-template>
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
            <th style="width: 45%">Permisos Activos</th>
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
                @for (def of permissionDefinitions; track def.key) {
                  @if (profile.permissions[def.key]) {
                    <p-tag [severity]="def.severity" [value]="def.label" [icon]="def.icon" [pTooltip]="def.description" styleClass="text-xs"></p-tag>
                  }
                }
                @if (hasNoPermissions(profile)) {
                  <span class="text-gray-500 text-xs italic">Sin permisos especiales</span>
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
    </p-card>
    } @else {
    <div class="mobile-permissions flex flex-col min-h-[60vh]">
      <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
        <h2 class="m-0 text-lg font-bold text-white">Permisos</h2>
        <p class="text-xs text-gray-400 m-0 mt-1">Niveles de acceso por usuario</p>
        <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar usuario, cargo o sucursal..." class="w-full mt-3 text-sm rounded-lg border-neutral-600 bg-neutral-900/80 px-3 py-2.5 text-white placeholder-gray-500" />
      </header>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (filteredProfiles().length === 0) {
          <div class="text-center py-12 text-gray-400">
            <i class="pi pi-lock text-4xl block mb-2 opacity-60"></i>
            <p class="text-sm font-medium">No hay resultados</p>
            <p class="text-xs mt-1">Prueba otro criterio de búsqueda</p>
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
                      @for (def of permissionDefinitions; track def.key) {
                        @if (profile.permissions[def.key]) {
                          <p-tag [severity]="def.severity" [value]="def.label" styleClass="text-[10px] py-0"></p-tag>
                        }
                      }
                      @if (hasNoPermissions(profile)) {
                        <span class="text-gray-500 text-xs italic">Sin permisos especiales</span>
                      }
                    </div>
                  </div>
                  <p-button icon="pi pi-pencil" [label]="''" (onClick)="openEditor(profile)" rounded text size="small" class="min-w-[36px] min-h-[36px]" pTooltip="Editar permisos" tooltipPosition="top"></p-button>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsManagementComponent {
  private service = inject(PermissionsService);
  private dialogService = inject(DialogService);
  private store = inject(DashboardStore);
  protected device = inject(DeviceService);

  public searchTerm = model<string>('');

  public permissionDefinitions = this.service.getPermissionDefinitions();

  public profiles = this.service.allUserProfiles;

  // Verificar si el usuario actual puede editar permisos
  public canEdit = computed(() => {
    return this.service.canCurrentUser('admin');
  });

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

  public hasNoPermissions(profile: UserPermissionProfile): boolean {
    return !Object.values(profile.permissions).some((v) => v);
  }

  public openEditor(profile: UserPermissionProfile) {
    const dialogRef = this.dialogService.open(PermissionEditorDialogComponent, {
      header: `Permisos: ${profile.positionName}`,
      width: '500px',
      data: {
        positionId: profile.positionId,
        positionName: profile.positionName,
        currentPermissions: profile.permissions,
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
