import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { MessageModule } from 'primeng/message';
import { PermissionsService } from '../../services/permissions.service';
import { PermissionKey } from './permissions.types';

@Component({
  selector: 'pt-permission-editor-dialog',
  standalone: true,
  imports: [Button, InputSwitchModule, FormsModule, MessageModule],
  template: `
    <div class="flex flex-col gap-4">
      <p-message
        severity="info"
        text="Estás editando permisos a nivel de CARGO. Los cambios afectarán a TODOS los usuarios con este cargo."
        styleClass="w-full block"
      ></p-message>

      <div class="flex flex-col gap-3 mt-2">
        @for (def of definitions; track def.key) {
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
            (max)="(true)"
          ></p-inputSwitch>
        </div>
        }
      </div>

      <div class="flex justify-end gap-2 mt-4">
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionEditorDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private service = inject(PermissionsService);
  private messageService = inject(MessageService);

  public definitions = this.service.getPermissionDefinitions();
  public tempPermissions: Record<PermissionKey, boolean> = {
    ...this.config.data.currentPermissions,
  };
  public saving = model(false);

  close() {
    this.ref.close();
  }

  async save() {
    this.saving.set(true);
    try {
      const positionId = this.config.data.positionId;
      await this.service.updatePositionPermissions(
        positionId,
        this.tempPermissions
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Permisos actualizados correctamente',
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
}
