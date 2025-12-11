import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { Notification, NotificationService, NotificationType } from '../services/notification.service';

@Component({
  selector: 'pt-notifications-panel',
  standalone: true,
  imports: [CommonModule, Button, Card, OverlayPanelModule, TagModule, BadgeModule],
  template: `
    <div class="notifications-panel">
      <button
        class="notification-button"
        (click)="notificationsPanel.toggle($event)"
        [pBadge]="unreadCount()"
        [badgeValue]="unreadCount()"
        [badgeSeverity]="'danger'"
        [badgeHidden]="unreadCount() === 0"
        [title]="unreadCount() > 0 ? unreadCount() + ' notificaciones no leídas' : 'Notificaciones'"
      >
        <span class="notification-icon">🔔</span>
      </button>

      <p-overlayPanel #notificationsPanel [dismissable]="true" [showCloseIcon]="true" styleClass="notifications-overlay">
        <div class="notifications-content">
          <div class="notifications-header">
            <h3 class="notifications-title">Notificaciones</h3>
            <div class="header-actions">
              @if (unreadCount() > 0) {
                <p-button
                  label="Marcar todas como leídas"
                  [text]="true"
                  size="small"
                  (onClick)="markAllAsRead()"
                  [style]="{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem'
                  }"
                />
              }
              <p-button
                label="Limpiar leídas"
                [text]="true"
                size="small"
                severity="secondary"
                (onClick)="clearRead()"
                [style]="{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem'
                }"
              />
            </div>
          </div>

          <div class="notifications-list">
            @if (notificationService.allNotifications().length === 0) {
              <div class="empty-notifications">
                <span class="empty-icon">📭</span>
                <p class="empty-text">No hay notificaciones</p>
              </div>
            } @else {
              @for (notification of notificationService.allNotifications(); track notification.id) {
                <div
                  class="notification-item"
                  [class.unread]="!notification.read"
                  [class]="'type-' + notification.type"
                  (click)="handleNotificationClick(notification)"
                >
                  <div class="notification-content">
                    <div class="notification-header">
                      <h4 class="notification-title">{{ notification.title }}</h4>
                      <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
                    </div>
                    <p class="notification-message">{{ notification.message }}</p>
                    @if (notification.actionLabel) {
                      <p-button
                        [label]="notification.actionLabel"
                        [text]="true"
                        size="small"
                        (onClick)="handleActionClick(notification, $event)"
                        [style]="{
                          marginTop: '0.5rem',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem'
                        }"
                      />
                    }
                  </div>
                  <div class="notification-actions">
                    @if (!notification.read) {
                      <button
                        class="action-btn mark-read"
                        (click)="markAsRead(notification.id, $event)"
                        title="Marcar como leída"
                      >
                        ✓
                      </button>
                    }
                    <button
                      class="action-btn delete"
                      (click)="removeNotification(notification.id, $event)"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          @if (notificationService.allNotifications().length > 0) {
            <div class="notifications-footer">
              <p-button
                label="Limpiar todas"
                [text]="true"
                severity="danger"
                size="small"
                (onClick)="clearAll()"
                [style]="{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem'
                }"
              />
            </div>
          }
        </div>
      </p-overlayPanel>
    </div>
  `,
  styles: [
    `
      .notifications-panel {
        position: relative;
      }

      .notification-button {
        position: relative;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notification-button:hover {
        background: rgba(251, 191, 36, 0.1);
      }

      .notification-icon {
        font-size: 1.5rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      ::ng-deep .notifications-overlay {
        width: 400px;
        max-width: 90vw;
        max-height: 600px;
      }

      .notifications-content {
        display: flex;
        flex-direction: column;
        max-height: 600px;
      }

      .notifications-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 1rem;
      }

      .notifications-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
      }

      .notifications-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-height: 450px;
        overflow-y: auto;
        padding-right: 0.5rem;
      }

      .notifications-list::-webkit-scrollbar {
        width: 6px;
      }

      .notifications-list::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 3px;
      }

      .notifications-list::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      .notifications-list::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      .notification-item {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
      }

      .notification-item:hover {
        background: #f9fafb;
        border-color: #fbbf24;
        transform: translateX(4px);
      }

      .notification-item.unread {
        background: #fef3c7;
        border-left: 3px solid #fbbf24;
      }

      .notification-item.type-application {
        border-left-color: #3b82f6;
      }

      .notification-item.type-pet {
        border-left-color: #10b981;
      }

      .notification-item.type-error {
        border-left-color: #ef4444;
      }

      .notification-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .notification-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
        flex: 1;
      }

      .notification-time {
        font-size: 0.75rem;
        color: #6b7280;
        white-space: nowrap;
      }

      .notification-message {
        font-size: 0.875rem;
        color: #374151;
        margin: 0;
        line-height: 1.5;
      }

      .notification-actions {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .notification-item:hover .notification-actions {
        opacity: 1;
      }

      .action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        width: 24px;
        height: 24px;
        border-radius: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        transition: all 0.2s ease;
      }

      .action-btn.mark-read {
        color: #10b981;
      }

      .action-btn.mark-read:hover {
        background: #d1fae5;
      }

      .action-btn.delete {
        color: #ef4444;
      }

      .action-btn.delete:hover {
        background: #fee2e2;
      }

      .empty-notifications {
        text-align: center;
        padding: 3rem 1rem;
        color: #6b7280;
      }

      .empty-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 0.5rem;
      }

      .empty-text {
        font-size: 0.875rem;
        margin: 0;
      }

      .notifications-footer {
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        margin-top: 1rem;
        text-align: center;
      }

      @media (max-width: 768px) {
        ::ng-deep .notifications-overlay {
          width: 90vw;
        }

        .notification-item {
          padding: 0.75rem;
        }

        .notification-actions {
          opacity: 1;
        }
      }
    `,
  ],
})
export class NotificationsPanelComponent {
  public notificationService = inject(NotificationService);
  private router = inject(Router);

  public unreadCount = computed(() => this.notificationService.unreadCount());

  public markAsRead(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId);
  }

  public markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  public removeNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.removeNotification(notificationId);
  }

  public clearAll(): void {
    this.notificationService.clearAll();
  }

  public clearRead(): void {
    this.notificationService.clearRead();
  }

  public handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  public handleActionClick(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  public formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      return 'Ahora';
    }
  }
}

