import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string | Date;
  read_at?: string | Date | null;
  message_type?: string;
  related_type?: string;
};

@Component({
  selector: 'pt-employee-portal-notifications',
  standalone: true,
  imports: [Card, Button, DatePipe, NgClass],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-bell text-amber-400"></i>
            <span>Buzón de Notificaciones</span>
          </div>
          <p-button
            label="Marcar todas como leídas"
            icon="pi pi-check"
            [outlined]="true"
            severity="secondary"
            size="small"
            (onClick)="onMarkAllAsRead()"
            [disabled]="unreadCount() === 0"
          />
        </div>
      </ng-template>
      <ng-template #subtitle>Gestiona todas tus notificaciones</ng-template>

      @if (notifications().length === 0) {
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div
          class="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center mb-4"
        >
          <i class="pi pi-inbox text-amber-400 text-4xl"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No hay notificaciones</h3>
        <p class="text-gray-400 text-sm">Todas tus notificaciones aparecerán aquí</p>
      </div>
      } @else {
      <div class="space-y-3">
        @for (notification of notifications(); track notification.id) {
        <div
          class="rounded-lg bg-neutral-800/50 border border-neutral-700/50 p-4 hover:bg-neutral-800/70 transition-all cursor-pointer"
          [ngClass]="{
            'bg-neutral-800/70': !notification.is_read,
            'border-amber-400/50': !notification.is_read
          }"
          (click)="onMarkAsRead(notification.id)"
        >
          <div class="flex items-start gap-4">
            <!-- Icono -->
            <div
              class="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center"
            >
              <i
                [class]="getNotificationIcon()(notification.message_type || '') + ' text-amber-400 text-lg'"
              ></i>
            </div>
            <!-- Contenido -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-2">
                <h3
                  class="text-base font-semibold text-white"
                  [class.font-bold]="!notification.is_read"
                >
                  {{ notification.title }}
                </h3>
                @if (!notification.is_read) {
                <span class="flex-shrink-0 w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
                }
              </div>
              <p class="text-sm text-gray-300 mb-3 whitespace-pre-wrap">
                {{ notification.message }}
              </p>
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-3">
                  <span class="text-xs text-gray-500">
                    <i class="pi pi-calendar text-gray-500 mr-1"></i>
                    {{ notification.created_at | date : 'dd/MM/yyyy HH:mm' }}
                  </span>
                  @if (notification.related_type) {
                  <span
                    class="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-400/30"
                  >
                    {{ getRelatedTypeLabel()(notification.related_type) }}
                  </span>
                  }
                </div>
                @if (notification.is_read && notification.read_at) {
                <span class="text-xs text-gray-500">
                  Leída: {{ notification.read_at | date : 'dd/MM/yyyy HH:mm' }}
                </span>
                }
              </div>
            </div>
          </div>
        </div>
        }
      </div>
      }
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalNotificationsComponent {
  // Inputs
  public notifications = input.required<Notification[]>();
  public unreadCount = input.required<number>();
  public getNotificationIcon = input.required<(messageType: string) => string>();
  public getRelatedTypeLabel = input.required<(relatedType: string) => string>();

  // Outputs
  public markAsRead = output<string>();
  public markAllAsRead = output<void>();

  public onMarkAsRead(notificationId: string): void {
    this.markAsRead.emit(notificationId);
  }

  public onMarkAllAsRead(): void {
    this.markAllAsRead.emit();
  }
}
