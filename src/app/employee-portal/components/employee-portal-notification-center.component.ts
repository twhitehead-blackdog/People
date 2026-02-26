import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Button } from 'primeng/button';
import { DeviceService } from '../../services/device.service';
import { NotificationFilter } from '../../stores/employee-portal.store';

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
  selector: 'pt-employee-portal-notification-center',
  standalone: true,
  imports: [Button, DatePipe, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notification-center">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4" [class.px-4]="!device.isDesktop()" [class.pt-4]="!device.isDesktop()">
        <div class="flex items-center gap-2">
          <i class="pi pi-bell text-amber-400" [class.text-lg]="device.isDesktop()"></i>
          <span class="font-semibold text-white" [class.text-lg]="device.isDesktop()" [class.text-sm]="!device.isDesktop()">
            Centro de Notificaciones
          </span>
          @if (unreadCount() > 0) {
          <span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            {{ unreadCount() }}
          </span>
          }
        </div>
        @if (unreadCount() > 0) {
        <button
          pButton
          type="button"
          icon="pi pi-check-square"
          class="p-button-text p-button-sm"
          [class.min-h-[44px]]="!device.isDesktop()"
          label="Leer todas"
          (click)="markAllAsRead.emit()"
          style="-webkit-tap-highlight-color: transparent;"
        ></button>
        }
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs" [class.px-4]="!device.isDesktop()">
        @for (tab of filterTabs; track tab.value) {
        <button
          class="filter-tab"
          [class.filter-tab--active]="activeFilter() === tab.value"
          (click)="filterChange.emit(tab.value)"
          style="-webkit-tap-highlight-color: transparent;"
        >
          {{ tab.label }}
          @if (tab.value === 'unread' && unreadCount() > 0) {
          <span class="ml-1 text-[0.6rem] bg-red-500/30 text-red-400 px-1.5 rounded-full">{{ unreadCount() }}</span>
          }
        </button>
        }
      </div>

      <!-- Notifications list -->
      <div class="notification-list" [class.px-4]="!device.isDesktop()">
        @if (notifications().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-20 h-20 rounded-full bg-neutral-800/60 border border-neutral-700/30 flex items-center justify-center mb-4">
            <i class="pi pi-inbox text-gray-500 text-3xl"></i>
          </div>
          <h3 class="text-base font-semibold text-gray-400 mb-1">{{ emptyMessage() }}</h3>
          <p class="text-xs text-gray-500">{{ emptySubMessage() }}</p>
        </div>
        } @else {
        <div class="flex flex-col gap-2 mt-3">
          @for (notification of notifications(); track notification.id) {
          <div
            class="notification-card"
            [ngClass]="{
              'notification-card--unread': !notification.is_read
            }"
            (click)="onNotificationClick(notification)"
          >
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                [ngClass]="getIconBgClass(notification.related_type || notification.message_type || '')"
              >
                <i
                  [class]="getNotificationIcon()(notification.message_type || '') + ' text-sm'"
                  [ngClass]="getIconColorClass(notification.related_type || notification.message_type || '')"
                ></i>
              </div>
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h3
                    class="text-sm text-white leading-tight truncate"
                    [class.font-bold]="!notification.is_read"
                    [class.font-medium]="notification.is_read"
                  >
                    {{ notification.title }}
                  </h3>
                  @if (!notification.is_read) {
                  <span class="flex-shrink-0 w-2.5 h-2.5 bg-amber-400 rounded-full mt-1"></span>
                  }
                </div>
                <p class="text-xs text-gray-400 mb-2 line-clamp-2">
                  {{ notification.message }}
                </p>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[0.65rem] text-gray-500">
                    {{ getRelativeTime(notification.created_at) }}
                  </span>
                  @if (notification.related_type) {
                  <span class="category-badge">
                    {{ getRelatedTypeLabel()(notification.related_type) }}
                  </span>
                  }
                </div>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .notification-center {
      min-height: 400px;
      max-width: 100%;
      overflow-x: hidden;
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(64, 64, 64, 0.3);
    }
    .filter-tabs::-webkit-scrollbar { display: none; }

    .filter-tab {
      white-space: nowrap;
      padding: 0.5rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #9ca3af;
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
      min-height: 36px;
    }
    .filter-tab:hover {
      color: #e5e7eb;
      background: rgba(38, 38, 38, 0.6);
    }
    .filter-tab--active {
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.3);
    }

    .notification-list {
      padding-bottom: 1rem;
    }

    .notification-card {
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: rgba(38, 38, 38, 0.4);
      border: 1px solid rgba(64, 64, 64, 0.3);
      cursor: pointer;
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden;
    }
    .notification-card:active {
      background: rgba(38, 38, 38, 0.7);
    }
    .notification-card--unread {
      border-color: rgba(251, 191, 36, 0.35);
      background: rgba(251, 191, 36, 0.05);
    }

    .category-badge {
      font-size: 0.6rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.2);
    }
  `],
})
export class EmployeePortalNotificationCenterComponent {
  protected device = inject(DeviceService);

  notifications = input.required<Notification[]>();
  unreadCount = input.required<number>();
  activeFilter = input<NotificationFilter>('all');
  getNotificationIcon = input.required<(messageType: string) => string>();
  getRelatedTypeLabel = input.required<(relatedType: string) => string>();

  markAsRead = output<string>();
  markAllAsRead = output<void>();
  filterChange = output<NotificationFilter>();
  deleteNotification = output<string>();

  filterTabs: Array<{ label: string; value: NotificationFilter }> = [
    { label: 'Todas', value: 'all' },
    { label: 'No leídas', value: 'unread' },
    { label: 'Solicitudes', value: 'requests' },
    { label: 'Aprobaciones', value: 'approvals' },
  ];

  emptyMessage = computed(() => {
    switch (this.activeFilter()) {
      case 'unread':
        return 'Todo al día';
      case 'requests':
        return 'Sin solicitudes';
      case 'approvals':
        return 'Sin aprobaciones';
      default:
        return 'No hay notificaciones';
    }
  });

  emptySubMessage = computed(() => {
    switch (this.activeFilter()) {
      case 'unread':
        return 'No tienes notificaciones pendientes de leer';
      case 'requests':
        return 'No tienes notificaciones de solicitudes';
      case 'approvals':
        return 'No tienes notificaciones de aprobaciones';
      default:
        return 'Todas tus notificaciones aparecerán aquí';
    }
  });

  onNotificationClick(notification: Notification): void {
    if (!notification.is_read) {
      this.markAsRead.emit(notification.id);
    }
  }

  getRelativeTime(dateStr: string | Date): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  getIconBgClass(type: string): string {
    switch (type) {
      case 'vacation':
        return 'bg-blue-500/20';
      case 'compensatory':
        return 'bg-green-500/20';
      case 'disability':
        return 'bg-red-500/20';
      case 'document':
        return 'bg-purple-500/20';
      case 'approval':
        return 'bg-emerald-500/20';
      case 'rejection':
        return 'bg-red-500/20';
      default:
        return 'bg-amber-500/20';
    }
  }

  getIconColorClass(type: string): string {
    switch (type) {
      case 'vacation':
        return 'text-blue-400';
      case 'compensatory':
        return 'text-green-400';
      case 'disability':
        return 'text-red-400';
      case 'document':
        return 'text-purple-400';
      case 'approval':
        return 'text-emerald-400';
      case 'rejection':
        return 'text-red-400';
      default:
        return 'text-amber-400';
    }
  }
}
