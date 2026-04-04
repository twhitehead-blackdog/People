import { HttpClient, httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { NotificationFilter } from '../stores/employee-portal.store';
import { SupabaseRealtimeService } from './supabase-realtime.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private destroyRef = inject(DestroyRef);
  private realtimeService = inject(SupabaseRealtimeService);

  // API para obtener notificaciones
  public notificationsApi = httpResource<any[]>(() => {
    const employeeId = this.currentEmployeeId();
    if (!employeeId) return undefined;
    const url = this.apiUrl.build('rest/v1/hr_messages', {
      select: 'id,employee_id,title,message,message_type,is_read,read_at,related_type,created_at',
      employee_id: `eq.${employeeId}`,
      order: 'created_at.desc',
    });
    return {
      url,
      method: 'GET',
    };
  });

  // Signal para el ID del empleado actual
  private currentEmployeeId = signal<string | null>(null);

  constructor() {
    // Suscripcion realtime a hr_messages: recarga cuando llega una notificacion nueva
    const hrMessagesBatch = this.realtimeService.subscribeToTable('hr_messages');
    effect(() => {
      const batch = hrMessagesBatch();
      const employeeId = this.currentEmployeeId();
      if (!batch || !employeeId) return;
      const relevant = batch.events.some(
        (e) => e.type === 'INSERT' && e.record?.['employee_id'] === employeeId
      );
      if (relevant) {
        this.notificationsApi.reload();
      }
    });
  }

  // Computed para obtener todas las notificaciones
  public notifications = computed(() => this.notificationsApi.value() ?? []);

  // Computed para obtener notificaciones no leídas
  public unreadNotifications = computed(() =>
    this.notifications().filter((n: any) => !n.is_read)
  );

  // Computed para el contador de notificaciones no leídas
  public unreadCount = computed(() => this.unreadNotifications().length);

  // Computed por categoría
  public requestNotifications = computed(() =>
    this.notifications().filter(
      (n: any) =>
        n.related_type === 'vacation' ||
        n.related_type === 'compensatory' ||
        n.related_type === 'disability' ||
        n.related_type === 'document' ||
        n.related_type === 'uniform' ||
        n.related_type === 'timelog_correction'
    )
  );

  public approvalNotifications = computed(() =>
    this.notifications().filter(
      (n: any) =>
        n.message_type === 'approval' ||
        n.message_type === 'rejection' ||
        n.related_type === 'approval'
    )
  );

  // Active filter signal
  private activeFilter = signal<NotificationFilter>('all');

  // Filtered notifications based on active filter
  public filteredNotifications = computed(() => {
    const filter = this.activeFilter();
    switch (filter) {
      case 'unread':
        return this.unreadNotifications();
      case 'requests':
        return this.requestNotifications();
      case 'approvals':
        return this.approvalNotifications();
      default:
        return this.notifications();
    }
  });

  /**
   * Establece el ID del empleado actual para cargar sus notificaciones
   */
  public setCurrentEmployeeId(employeeId: string | null): void {
    this.currentEmployeeId.set(employeeId);
    if (employeeId) {
      this.notificationsApi.reload();
    }
  }

  /**
   * Recarga las notificaciones
   */
  public reload(): void {
    this.notificationsApi.reload();
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notificationId: string): void {
    this.http
      .patch(
        this.apiUrl.build('rest/v1/hr_messages', { id: `eq.${notificationId}` }),
        {
          is_read: true,
          read_at: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationsApi.reload();
        },
        error: (error) => {
          console.error('Error marcando notificación como leída:', error);
        },
      });
  }

  /**
   * Sets the active notification filter
   */
  public setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  /**
   * Marca todas las notificaciones como leídas en una sola llamada PATCH
   */
  public markAllAsRead(): void {
    const employeeId = this.currentEmployeeId();
    if (!employeeId || this.unreadCount() === 0) return;

    this.http
      .patch(
        this.apiUrl.build('rest/v1/hr_messages', {
          employee_id: `eq.${employeeId}`,
          is_read: 'eq.false',
        }),
        {
          is_read: true,
          read_at: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
        }
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationsApi.reload();
        },
        error: (error) => {
          console.error('Error marcando todas como leídas:', error);
        },
      });
  }

  /**
   * Elimina una notificación
   */
  public deleteNotification(notificationId: string): void {
    this.http
      .delete(
        this.apiUrl.build('rest/v1/hr_messages', {
          id: `eq.${notificationId}`,
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationsApi.reload();
        },
        error: (error) => {
          console.error('Error eliminando notificación:', error);
        },
      });
  }
}

