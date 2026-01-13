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
    <p-card>
      <ng-template #title>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3"
        >
          <div>
            <h2 class="m-0 text-lg sm:text-xl">Gestión de Permisos</h2>
            <p class="text-xs sm:text-sm text-gray-400 m-0 mt-1">
              Visualiza y administra los niveles de acceso de los usuarios en el
              sistema.
            </p>
          </div>
          <!-- Future: Add global actions if needed -->
        </div>
      </ng-template>

      <div class="mb-4 flex gap-2">
        <p-iconfield iconPosition="left" class="w-full sm:w-auto">
          <p-inputicon>
            <i class="pi pi-search"></i>
          </p-inputicon>
          <input
            pInputText
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar usuario, cargo o sucursal..."
            class="w-full sm:w-80 text-sm"
          />
        </p-iconfield>
      </div>

      <p-table
        [value]="filteredProfiles()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50, 100]"
        styleClass="p-datatable-sm"
        [tableStyle]="{ 'min-width': '50rem' }"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="employeeName" style="width: 25%">
              Usuario <p-sortIcon field="employeeName" />
            </th>
            <th pSortableColumn="positionName" style="width: 20%">
              Cargo <p-sortIcon field="positionName" />
            </th>
            <th style="width: 45%">Permisos Activos</th>
            <th style="width: 10%"></th>
          </tr>
        </ng-template>
        <ng-template #body let-profile>
          <tr class="hover:bg-neutral-800/50 transition-colors">
            <td>
              <div class="flex flex-col">
                <span class="font-medium text-white">{{
                  profile.employeeName
                }}</span>
                <span class="text-xs text-gray-400">{{
                  profile.branchName
                }}</span>
              </div>
            </td>
            <td>
              <span
                [class.text-blue-300]="profile.userType === 'manager'"
                [class.text-amber-300]="profile.userType === 'admin'"
              >
                {{ profile.positionName }}
              </span>
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                @for (def of permissionDefinitions; track def.key) { @if
                (profile.permissions[def.key]) {
                <p-tag
                  [severity]="def.severity"
                  [value]="def.label"
                  [icon]="def.icon"
                  [pTooltip]="def.description"
                  styleClass="text-xs"
                ></p-tag>
                } } @if (hasNoPermissions(profile)) {
                <span class="text-gray-500 text-xs italic"
                  >Sin permisos especiales</span
                >
                }
              </div>
            </td>
            <td class="text-right">
              <p-button
                icon="pi pi-pencil"
                [rounded]="true"
                [text]="true"
                pTooltip="Editar permisos del cargo"
                tooltipPosition="left"
                (onClick)="openEditor(profile)"
              ></p-button>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="4" class="text-center py-8 text-gray-400">
              No se encontraron usuarios con el criterio de búsqueda.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsManagementComponent {
  private service = inject(PermissionsService);
  private dialogService = inject(DialogService);

  public searchTerm = model<string>('');

  public permissionDefinitions = this.service.getPermissionDefinitions();

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

  public hasNoPermissions(profile: UserPermissionProfile): boolean {
    return !Object.values(profile.permissions).some((v) => v);
  }

  public openEditor(profile: UserPermissionProfile) {
    this.dialogService.open(PermissionEditorDialogComponent, {
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
  }
}
