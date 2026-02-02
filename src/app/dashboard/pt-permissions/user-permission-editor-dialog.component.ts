import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { resolvePermissions } from '../../core/permissions/permissions.resolver';
import { PermissionsService } from '../../services/permissions.service';
import { DashboardStore } from '../../stores/dashboard.store';
import {
  EDITABLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  PermissionDefinition,
  PermissionKey,
  UserPermissionProfile,
} from './permissions.types';

@Component({
  selector: 'pt-user-permission-editor-dialog',
  standalone: true,
  imports: [
    Button,
    InputSwitchModule,
    FormsModule,
    MessageModule,
    TooltipModule,
    TagModule,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="bg-neutral-800/50 p-3 rounded mb-2">
        <div class="flex justify-between items-center mb-1">
          <span class="text-sm font-medium">Usuario:</span>
          <span class="text-sm font-bold">{{ config.data.employeeName }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium">Cargo Base:</span>
          <span class="text-sm text-blue-300">{{
            config.data.positionName
          }}</span>
        </div>
      </div>

      <p-message
        severity="info"
        text="Los permisos heredados del Cargo son de solo lectura. Solo puedes agregar permisos adicionales (overrides) a este usuario."
        styleClass="w-full block"
      ></p-message>

      @if (loading()) {
      <div class="flex items-center justify-center py-8 text-gray-400">
        <i class="pi pi-spin pi-spinner mr-2"></i> Cargando permisos...
      </div>
      } @else {
      <div class="flex flex-col gap-3 mt-2 h-[400px] overflow-y-auto pr-2">
        @for (def of editableDefinitions; track def.key) {
        <div
          class="flex items-start justify-between p-3 border rounded-lg bg-neutral-800/30"
          [class.border-blue-500/50]="positionPermissions[def.key]"
          [class.border-green-500/50]="
            !positionPermissions[def.key] && tempOverrides[def.key]
          "
          [class.border-neutral-700]="
            !positionPermissions[def.key] && !tempOverrides[def.key]
          "
        >
          <div class="flex flex-col gap-1 pr-4">
            <div class="flex items-center gap-2">
              <i [class]="def.icon"></i>
              <span class="font-semibold text-sm">{{ def.label }}</span>
              @if(positionPermissions[def.key]) {
              <p-tag
                severity="info"
                value="Del Cargo"
                styleClass="text-[10px] py-0 h-4"
              ></p-tag>
              } @else if(tempOverrides[def.key]) {
              <p-tag
                severity="success"
                value="Override"
                styleClass="text-[10px] py-0 h-4"
              ></p-tag>
              }
            </div>
            <p class="text-xs text-gray-400 m-0">{{ def.description }}</p>
          </div>

          @if (positionPermissions[def.key]) {
          <div
            class="text-blue-400 font-bold px-3"
            pTooltip="Heredado del cargo. Modifícalo desde el editor de Cargo."
          >
            <i class="pi pi-check-circle text-xl"></i>
          </div>
          } @else {
          <div class="flex flex-col items-center">
            <p-inputSwitch
              [(ngModel)]="tempOverrides[def.key]"
              pTooltip="Otorgar este permiso individualmente"
            ></p-inputSwitch>
          </div>
          }
        </div>
        }
      </div>
      }

      <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-700">
        <p-button
          label="Cancelar"
          [text]="true"
          severity="secondary"
          (onClick)="close()"
        ></p-button>
        <p-button
          label="Guardar Overrides"
          severity="primary"
          [loading]="saving()"
          [disabled]="loading()"
          (onClick)="save()"
        ></p-button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPermissionEditorDialogComponent implements OnInit {
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private service = inject(PermissionsService);
  private messageService = inject(MessageService);
  private dashboardStore = inject(DashboardStore);

  public profile: UserPermissionProfile = this.config.data.profile;

  /** Only show non-legacy permission keys */
  public editableDefinitions: PermissionDefinition[] =
    EDITABLE_PERMISSIONS.map((key) => PERMISSION_DEFINITIONS[key]);

  /** Permissions that come from the position (read-only) */
  public positionPermissions: Record<string, boolean> = {};

  /** User-level overrides (editable) */
  public tempOverrides: Record<string, boolean> = {};

  public saving = model(false);
  public loading = signal(true);

  async ngOnInit(): Promise<void> {
    // 1. Resolve position-only permissions (no overrides)
    const employee = this.dashboardStore.employees
      .entities()
      .find((e) => e.id === this.profile.employeeId);
    const posResolved = resolvePermissions(employee?.position ?? null, []);

    // Store which permissions come from position
    for (const key of EDITABLE_PERMISSIONS) {
      this.positionPermissions[key] = posResolved[key] ?? false;
    }

    // 2. Fetch actual overrides from DB
    try {
      const overrides = await this.service.fetchUserOverrides(
        this.profile.employeeId
      );
      for (const key of EDITABLE_PERMISSIONS) {
        // Only show as override if NOT already from position
        const override = overrides.find((o) => o.permissionKey === key);
        this.tempOverrides[key] =
          !this.positionPermissions[key] && override?.granted === true;
      }
    } catch (error) {
      console.error('Error loading user overrides:', error);
      // Default all to false
      for (const key of EDITABLE_PERMISSIONS) {
        this.tempOverrides[key] = false;
      }
    } finally {
      this.loading.set(false);
    }
  }

  close() {
    this.ref.close();
  }

  async save() {
    this.saving.set(true);
    try {
      const adminId = this.dashboardStore.currentEmployee()?.id;
      const promises: Promise<void>[] = [];

      for (const key of EDITABLE_PERMISSIONS) {
        // Skip inherited from position - those aren't overrides
        if (this.positionPermissions[key]) continue;

        promises.push(
          this.service.saveUserOverride(
            this.profile.employeeId,
            key,
            this.tempOverrides[key] ?? false,
            adminId
          )
        );
      }

      await Promise.all(promises);

      // Si el usuario editado es el usuario actual, recargar sus permisos en el store
      const currentEmployee = this.dashboardStore.currentEmployee();
      if (currentEmployee?.id === this.profile.employeeId) {
        await this.service.loadUserPermissions(currentEmployee);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Overrides Guardados',
        detail: 'Permisos de usuario actualizados correctamente.',
      });
      this.ref.close(true);
    } catch (error) {
      console.error('Error saving overrides:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron guardar los overrides.',
      });
    } finally {
      this.saving.set(false);
    }
  }
}
