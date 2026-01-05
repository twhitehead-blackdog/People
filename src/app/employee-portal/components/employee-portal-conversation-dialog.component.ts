import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';

type Complaint = {
  id: string;
  category: string;
  status: string;
  complaint?: string;
};

type Message = {
  id: string;
  message: string;
  sender_type: 'employee' | 'hr';
  created_at: string | Date;
};

@Component({
  selector: 'pt-employee-portal-conversation-dialog',
  standalone: true,
  imports: [Button, InputTextarea, FormsModule, DatePipe, NgClass],
  template: `
    @if (visible()) {
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      (click)="onClose()"
    >
      <div
        class="bg-neutral-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="p-6 border-b border-neutral-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              <i class="pi pi-comments text-amber-400"></i>
              Conversación
            </h3>
            <p-button
              icon="pi pi-times"
              severity="secondary"
              text
              rounded
              (onClick)="onClose()"
            />
          </div>
          @if (selectedComplaint()) {
          <div class="flex flex-wrap gap-4 text-sm">
            <div>
              <span class="text-gray-400">Categoría: </span>
              <span class="text-white">{{
                getComplaintCategoryLabel()(selectedComplaint()!.category)
              }}</span>
            </div>
            <div>
              <span class="text-gray-400">Estado: </span>
              <span class="text-white">{{
                selectedComplaint()!.status === 'pending'
                  ? 'Pendiente'
                  : selectedComplaint()!.status === 'in_review'
                  ? 'En Revisión'
                  : 'Resuelto'
              }}</span>
            </div>
          </div>
          }
        </div>

        <!-- Mensajes -->
        <div
          class="flex-1 overflow-y-auto p-6 space-y-4"
          style="max-height: 400px;"
        >
          @if (isLoading()) {
          <div class="text-center py-8 text-gray-400">Cargando mensajes...</div>
          } @else if (messages().length === 0) {
          <div class="text-center py-8">
            <p class="text-gray-400">No hay mensajes todavía.</p>
            <p class="text-sm text-gray-500 mt-2">
              {{ selectedComplaint()?.complaint }}
            </p>
          </div>
          } @else {
            @for (message of messages(); track message.id) {
            <div
              class="flex"
              [ngClass]="{
                'justify-end': message.sender_type === 'employee',
                'justify-start': message.sender_type === 'hr'
              }"
            >
              <div
                class="max-w-[70%] rounded-lg p-4"
                [ngClass]="{
                  'bg-amber-500/20': message.sender_type === 'employee',
                  border: message.sender_type === 'employee',
                  'border-amber-500/30': message.sender_type === 'employee',
                  'bg-neutral-700': message.sender_type === 'hr',
                  'border-neutral-600': message.sender_type === 'hr'
                }"
              >
                <div class="flex items-center gap-2 mb-2">
                  @if (message.sender_type === 'employee') {
                  <i class="pi pi-user text-amber-400"></i>
                  <span class="text-amber-300 font-semibold text-sm">Tú</span>
                  } @else {
                  <i class="pi pi-building text-gray-400"></i>
                  <span class="text-gray-300 font-semibold text-sm">RRHH</span>
                  }
                  <span class="text-xs text-gray-500">
                    {{ message.created_at | date : 'short' }}
                  </span>
                </div>
                <p class="text-white text-sm whitespace-pre-wrap">
                  {{ message.message }}
                </p>
              </div>
            </div>
            }
          }
        </div>

        <!-- Input de respuesta -->
        @if (selectedComplaint()) {
        <div class="p-6 border-t border-neutral-700">
          <div class="flex flex-col gap-3">
            <textarea
              pInputTextarea
              [ngModel]="replyMessageValue()"
              (ngModelChange)="onReplyMessageChange($event)"
              rows="3"
              placeholder="Escribe tu respuesta..."
              class="w-full"
            ></textarea>
            <div class="flex justify-end gap-2">
              <p-button
                label="Enviar"
                icon="pi pi-send"
                [loading]="sendingReply()"
                [disabled]="!replyMessageValue().trim()"
                (onClick)="onSendReply()"
              />
            </div>
          </div>
        </div>
        }
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalConversationDialogComponent {
  // Inputs
  public visible = input.required<boolean>();
  public selectedComplaint = input<Complaint | null | undefined>();
  public messages = input.required<Message[]>();
  public replyMessageValue = input.required<string>();
  public sendingReply = input.required<boolean>();
  public isLoading = input.required<boolean>();
  public getComplaintCategoryLabel = input.required<(category: string) => string>();

  // Outputs
  public closed = output<void>();
  public sendReply = output<void>();
  public replyMessageChange = output<string>();

  public onClose(): void {
    this.closed.emit();
  }

  public onSendReply(): void {
    this.sendReply.emit();
  }

  public onReplyMessageChange(value: string): void {
    this.replyMessageChange.emit(value);
  }
}
