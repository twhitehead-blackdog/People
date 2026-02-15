import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'pt-rejection-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      (onHide)="comment.set('')"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-red-400"></i>
          <span class="text-lg font-semibold text-white">{{ title() }}</span>
        </div>
      </ng-template>

      <div class="space-y-4 pt-4">
        <p class="text-gray-300">{{ description() }}</p>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">
            Motivo de Rechazo <span class="text-red-400">*</span>
          </label>
          <textarea
            pTextarea
            [(ngModel)]="comment"
            rows="4"
            placeholder="Escribe el motivo del rechazo..."
            class="w-full"
            maxlength="500"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            {{ comment().length }}/500 caracteres
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="visible.set(false)"
          />
          <p-button
            label="Confirmar Rechazo"
            severity="danger"
            icon="pi pi-times"
            [disabled]="!comment().trim() || updating()"
            [loading]="updating()"
            (onClick)="onConfirm()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class RejectionDialogComponent {
  visible = model.required<boolean>();
  title = input<string>('Confirmar Rechazo');
  description = input<string>('Por favor, indica el motivo del rechazo.');
  updating = input<boolean>(false);

  confirm = output<string>();

  public comment = signal('');

  public onConfirm(): void {
    const text = this.comment().trim();
    if (!text) return;
    this.confirm.emit(text);
  }
}
