import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { NotificationsService } from '../services/notifications.service';

@Component({
  selector: 'pt-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, ButtonModule, DatePipe],
  template: `
    @if (isVisible()) {
    <!-- Overlay para cerrar al hacer clic fuera -->
    <div
      class="fixed inset-0 z-[1000]"
      (click)="close()"
    ></div>
    <!-- Dropdown -->
    <div
      class="absolute right-0 top-full mt-2 w-[400px] max-w-[90vw] bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-neutral-700/50 rounded-lg shadow-2xl z-[1001] overflow-hidden"
      (click)="$event.stopPropagation()"
    >
      <!-- Header -->
      <div
        class="px-4 py-3 border-b border-neutral-700/50 bg-neutral-800/50 flex items-center justify-between"
      >
        <h3 class="text-lg font-semibold text-white flex items-center gap-2">
          <i class="pi pi-bell text-cyan-400"></i>
          Notificaciones
        </h3>
        <button
          type="button"
          (click)="close()"
          class="text-gray-400 hover:text-white transition-colors p-1 rounded"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Lista de notificaciones -->
      <div class="max-h-[500px] overflow-y-auto">
        @if (recentNotifications().length === 0) {
        <div class="px-4 py-8 text-center text-gray-400">
          <i class="pi pi-inbox text-4xl mb-2"></i>
          <p class="text-sm">No hay notificaciones</p>
        </div>
        } @else {
        <div class="divide-y divide-neutral-700/50">
          @for (notification of recentNotifications(); track notification.id) {
          <div
            class="px-4 py-3 hover:bg-neutral-800/50 transition-colors cursor-pointer"
            [class.bg-neutral-800/30]="!notification.is_read"
            (click)="markAsRead(notification.id)"
          >
            <div class="flex items-start gap-3">
              <!-- Icono según tipo -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-400/30 flex items-center justify-center"
              >
                <i
                  [class]="getNotificationIcon(notification.message_type) + ' text-cyan-400'"
                ></i>
              </div>
              <!-- Contenido -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h4
                    class="text-sm font-semibold text-white truncate"
                    [class.font-bold]="!notification.is_read"
                  >
                    {{ notification.title }}
                  </h4>
                  @if (!notification.is_read) {
                  <span
                    class="flex-shrink-0 w-2 h-2 bg-cyan-400 rounded-full"
                  ></span>
                  }
                </div>
                <p class="text-xs text-gray-400 line-clamp-2 mb-2">
                  {{ notification.message }}
                </p>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    {{ notification.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                  @if (notification.related_type) {
                  <span
                    class="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
                  >
                    {{ getRelatedTypeLabel(notification.related_type) }}
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

      <!-- Footer con botón Ir al buzón -->
      <div
        class="px-4 py-3 border-t border-neutral-700/50 bg-neutral-800/50"
      >
        <p-button
          label="Ir al buzón"
          icon="pi pi-inbox"
          [outlined]="true"
          severity="secondary"
          class="w-full"
          (onClick)="goToInbox()"
        />
      </div>
    </div>
    }
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class NotificationsDropdownComponent {
  private notificationsService = inject(NotificationsService);
  private router = inject(Router);

  // Input para controlar visibilidad desde el componente padre
  public isVisible = input.required<boolean>();
  public onClose = input<() => void>();

  // Computed para obtener las notificaciones más recientes (máximo 10)
  public recentNotifications = computed(() => {
    const all = this.notificationsService.notifications();
    return all.slice(0, 10);
  });

  constructor() {
    // Recargar notificaciones cuando se abre el dropdown
    effect(() => {
      if (this.isVisible()) {
        this.notificationsService.reload();
      }
    });
  }

  public close(): void {
    if (this.onClose()) {
      this.onClose()!();
    }
  }

  public markAsRead(notificationId: string): void {
    this.notificationsService.markAsRead(notificationId);
  }

  public goToInbox(): void {
    this.close();
    this.router.navigate(['/employee-portal'], {
      fragment: 'notifications',
    });
  }

  public getNotificationIcon(messageType: string): string {
    const icons: Record<string, string> = {
      compensatory_request: 'pi pi-clock',
      compensatory_approved: 'pi pi-check-circle',
      compensatory_rejected: 'pi pi-times-circle',
      compensatory_registered: 'pi pi-calendar-check',
    };
    return icons[messageType] || 'pi pi-bell';
  }

  public getRelatedTypeLabel(relatedType: string): string {
    const labels: Record<string, string> = {
      timeoff: 'Tiempo Compensatorio',
      disability: 'Incapacidad',
      document: 'Documento',
    };
    return labels[relatedType] || relatedType;
  }
}

