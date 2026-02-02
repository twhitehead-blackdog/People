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

interface PositionField {
  key: 'admin' | 'dashboard_access' | 'schedule_admin' | 'schedule_approver';
  label: string;
  description: string;
  icon: string;
}

const POSITION_FIELDS: PositionField[] = [
  {
    key: 'admin',
    label: 'Administrador',
    description:
      'Acceso total al sistema. Activa TODOS los permisos automáticamente.',
    icon: 'pi pi-shield',
  },
  {
    key: 'dashboard_access',
    label: 'Acceso al Dashboard',
    description: 'Permite ingresar al panel administrativo.',
    icon: 'pi pi-th-large',
  },
  {
    key: 'schedule_admin',
    label: 'Administrador de Horarios',
    description:
      'Puede crear y editar horarios, turnos y gestionar tiempo de empleados.',
    icon: 'pi pi-calendar-times',
  },
  {
    key: 'schedule_approver',
    label: 'Aprobador de Horarios',
    description:
      'Puede ver horarios y aprobar solicitudes. Acceso de solo lectura.',
    icon: 'pi pi-check-circle',
  },
];

@Component({
  selector: 'pt-permission-editor-dialog',
  standalone: true,
  imports: [Button, InputSwitchModule, FormsModule, MessageModule],
  template: `
    <div class="flex flex-col gap-4">
      <p-message
        severity="info"
        text="Estás editando permisos a nivel de CARGO. Los cambios afectarán a TODOS los usuarios con este cargo. Para permisos individuales, usa el editor de usuario."
        styleClass="w-full block"
      ></p-message>

      <div class="flex flex-col gap-3 mt-2">
        @for (field of positionFields; track field.key) {
        <div
          class="flex items-start justify-between p-3 border border-neutral-700 rounded-lg bg-neutral-800/30"
        >
          <div class="flex flex-col gap-1 pr-4">
            <div class="flex items-center gap-2">
              <i [class]="field.icon"></i>
              <span class="font-semibold text-sm">{{ field.label }}</span>
            </div>
            <p class="text-xs text-gray-400 m-0">{{ field.description }}</p>
          </div>

          <p-inputSwitch
            [(ngModel)]="tempValues[field.key]"
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

  public positionFields = POSITION_FIELDS;
  public tempValues: Record<string, boolean> = {
    admin: this.config.data.positionFlags?.admin ?? false,
    dashboard_access: this.config.data.positionFlags?.dashboard_access ?? false,
    schedule_admin: this.config.data.positionFlags?.schedule_admin ?? false,
    schedule_approver:
      this.config.data.positionFlags?.schedule_approver ?? false,
  };
  public saving = model(false);

  close() {
    this.ref.close();
  }

  async save() {
    this.saving.set(true);
    try {
      const positionId = this.config.data.positionId;
      await this.service.updatePositionPermissions(positionId, this.tempValues);
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Permisos de cargo actualizados correctamente',
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
