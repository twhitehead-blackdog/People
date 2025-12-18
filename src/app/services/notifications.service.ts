import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  // API para obtener notificaciones
  public notificationsApi = httpResource<any[]>(() => {
    const employeeId = this.currentEmployeeId();
    if (!employeeId) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/hr_messages`,
      method: 'GET',
      params: {
        select: '*',
        employee_id: `eq.${employeeId}`,
        order: 'created_at.desc',
      },
    };
  });

  // Signal para el ID del empleado actual
  private currentEmployeeId = signal<string | null>(null);

  // Computed para obtener todas las notificaciones
  public notifications = computed(() => this.notificationsApi.value() ?? []);

  // Computed para obtener notificaciones no leídas
  public unreadNotifications = computed(() =>
    this.notifications().filter((n: any) => !n.is_read)
  );

  // Computed para el contador de notificaciones no leídas
  public unreadCount = computed(() => this.unreadNotifications().length);

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
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/hr_messages?id=eq.${notificationId}`,
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
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): void {
    const unreadIds = this.unreadNotifications().map((n: any) => n.id);
    if (unreadIds.length === 0) return;

    // Actualizar todas las notificaciones no leídas
    const updates = unreadIds.map((id) =>
      this.http.patch(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/hr_messages?id=eq.${id}`,
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
    );

    // Ejecutar todas las actualizaciones
    Promise.all(updates.map((update) => firstValueFrom(update)))
      .then(() => {
        this.notificationsApi.reload();
      })
      .catch((error) => {
        console.error('Error marcando todas las notificaciones como leídas:', error);
      });
  }
}

