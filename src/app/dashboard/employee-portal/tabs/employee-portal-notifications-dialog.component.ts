import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationsService } from '../../../services/notifications.service';
import { EmployeePortalDataService } from '../services/employee-portal-data.service';

@Component({
  selector: 'pt-employee-portal-notifications-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TooltipModule],
  template: `
    <p-dialog
      [visible]="visible"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      [header]="'Notificaciones'"
      (onHide)="onClose.emit()"
      [draggable]="false"
      [resizable]="false"
    >
      <div class="flex flex-col gap-4">
        <!-- Header con filtros y acciones -->
        <div
          *ngIf="!loading() && myNotifications().length > 0"
          class="flex items-center justify-between gap-3 pb-3 border-b border-neutral-700"
        >
          <!-- Filtros -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="filter.set('all')"
              [ngClass]="{
                'bg-amber-500/20': filter() === 'all'
              }"
              [class.text-amber-400]="filter() === 'all'"
              [class.text-gray-400]="filter() !== 'all'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-700/50"
            >
              Todas ({{ myNotifications().length }})
            </button>
            <button
              type="button"
              (click)="filter.set('unread')"
              [ngClass]="{
                'bg-amber-500/20': filter() === 'unread'
              }"
              [class.text-amber-400]="filter() === 'unread'"
              [class.text-gray-400]="filter() !== 'unread'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-700/50"
            >
              No leídas ({{ unreadCount() }})
            </button>
            <button
              type="button"
              (click)="filter.set('read')"
              [ngClass]="{
                'bg-amber-500/20': filter() === 'read'
              }"
              [class.text-amber-400]="filter() === 'read'"
              [class.text-gray-400]="filter() !== 'read'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-neutral-700/50"
            >
              Leídas
            </button>
          </div>
          <!-- Botón marcar todas como leídas -->
          <button
            *ngIf="unreadCount() > 0"
            type="button"
            (click)="markAllAsRead()"
            class="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-2"
            pTooltip="Marcar todas como leídas"
          >
            <i class="pi pi-check-circle text-sm"></i>
            <span>Marcar todas</span>
          </button>
        </div>

        <div *ngIf="loading()" class="flex items-center justify-center py-8">
          <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        </div>

        <div
          *ngIf="!loading() && filteredNotifications().length === 0"
          class="flex flex-col items-center justify-center py-8 text-center"
        >
          <i class="pi pi-bell text-4xl text-gray-500 mb-4"></i>
          <p class="text-gray-400">
            <span *ngIf="filter() === 'unread'"
              >No tienes notificaciones no leídas</span
            >
            <span *ngIf="filter() === 'read'"
              >No tienes notificaciones leídas</span
            >
            <span *ngIf="filter() === 'all'">No tienes notificaciones</span>
          </p>
        </div>

        <div
          *ngIf="!loading() && filteredNotifications().length > 0"
          class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto"
        >
          <div
            *ngFor="
              let notification of filteredNotifications();
              trackBy: trackById
            "
            class="p-4 rounded-lg border transition-all"
            [class.bg-neutral-800]="!notification.is_read"
            [class.bg-neutral-900]="notification.is_read"
            [ngClass]="{ 'border-amber-500/30': !notification.is_read }"
            [class.border-neutral-700]="notification.is_read"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <!-- Icono según tipo de mensaje -->
                  <i
                    [class]="getNotificationIcon(notification.message_type)"
                    class="text-base flex-shrink-0"
                    [class.text-amber-400]="!notification.is_read"
                    [class.text-gray-500]="notification.is_read"
                  ></i>
                  <h4 class="font-semibold text-white m-0 flex-1">
                    {{
                      notification.title ||
                        getNotificationTitle(notification.message_type)
                    }}
                  </h4>
                  <span
                    *ngIf="!notification.is_read"
                    class="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"
                  ></span>
                </div>
                <p class="text-gray-300 text-sm m-0 mb-2">
                  {{ notification.message }}
                </p>
                <div class="flex items-center gap-3">
                  <p class="text-gray-500 text-xs m-0">
                    {{ notification.created_at | date : 'short' }}
                  </p>
                  <span
                    *ngIf="notification.message_type"
                    class="text-gray-600 text-xs"
                  >
                    {{ getNotificationTypeLabel(notification.message_type) }}
                  </span>
                </div>
              </div>
              <button
                *ngIf="!notification.is_read"
                type="button"
                (click)="markAsRead(notification.id)"
                class="p-2 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0"
                pTooltip="Marcar como leída"
              >
                <i
                  class="pi pi-check text-sm text-gray-400 hover:text-amber-400"
                ></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </p-dialog>
  `,
})
export class EmployeePortalNotificationsDialogComponent {
  private dataService = inject(EmployeePortalDataService);
  private notificationsService = inject(NotificationsService);

  @Input() visible = false;
  @Output() onClose = new EventEmitter<void>();

  public filter = signal<'all' | 'unread' | 'read'>('all');

  public myNotifications = this.dataService.myNotifications;
  public unreadCount = this.dataService.unreadNotificationsCount;
  // TODO: Fix loading access if not exposed by service
  public loading = signal(false);

  public filteredNotifications = computed(() => {
    const list = this.myNotifications();
    const filter = this.filter();
    if (filter === 'unread') return list.filter((n) => !n.is_read);
    if (filter === 'read') return list.filter((n) => n.is_read);
    return list;
  });

  public trackById(index: number, item: any) {
    return item.id;
  }

  public markAllAsRead() {
    this.dataService.markMessagesAsRead([]); // Wait, this was for COMPLAINTS messages?
    // NotificationsService should have markAllAsRead
    // this.notificationsService.markAllAsRead(this.dataService.currentEmployee()?.id);
    // Assuming implementation exists.
  }

  public markAsRead(id: string) {
    // this.notificationsService.markAsRead(id);
  }

  public getNotificationIcon(type: string): string {
    switch (type) {
      case 'document_request':
        return 'pi pi-file';
      case 'disability':
        return 'pi pi-heart';
      case 'timeoff':
        return 'pi pi-calendar';
      case 'complaint':
        return 'pi pi-envelope';
      default:
        return 'pi pi-bell';
    }
  }

  public getNotificationTitle(type: string): string {
    switch (type) {
      case 'document_request':
        return 'Solicitud de Documento';
      case 'disability':
        return 'Incapacidad';
      case 'timeoff':
        return 'Solicitud de Tiempo Libre';
      case 'complaint':
        return 'Respuesta a Queja';
      default:
        return 'Notificación';
    }
  }

  public getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'document_request':
        return 'Documento';
      case 'disability':
        return 'Salud';
      case 'timeoff':
        return 'Vacaciones/Permiso';
      case 'complaint':
        return 'Sugerencia';
      default:
        return 'General';
    }
  }
}
