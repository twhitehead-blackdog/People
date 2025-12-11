import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, Subject, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType = 'info' | 'success' | 'warn' | 'error' | 'application' | 'pet' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string; // URL para navegar cuando se hace clic
  actionLabel?: string; // Texto del botón de acción
  metadata?: Record<string, any>; // Datos adicionales
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private messageService = inject(MessageService);
  private notificationsSubject = new Subject<Notification>();
  private notifications = signal<Notification[]>([]);

  // Observable para suscribirse a nuevas notificaciones
  public notifications$ = this.notificationsSubject.asObservable();

  // Signal con todas las notificaciones
  public allNotifications = this.notifications.asReadonly();

  // Notificaciones no leídas
  public unreadNotifications = signal<Notification[]>([]);

  // Contador de no leídas
  public unreadCount = signal<number>(0);

  // Cliente de Supabase para Realtime
  private supabaseClient: SupabaseClient | null = null;
  private realtimeChannels: RealtimeChannel[] = [];

  constructor() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:45',message:'NotificationService constructor - inicio',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Cargar notificaciones del localStorage al iniciar
    this.loadNotificationsFromStorage();

    // Actualizar contador de no leídas cuando cambian las notificaciones
    this.notifications.update((notifs) => {
      const unread = notifs.filter((n) => !n.read);
      this.unreadNotifications.set(unread);
      this.unreadCount.set(unread.length);
      return notifs;
    });

    // Inicializar Realtime si hay configuración de Supabase
    this.initializeRealtime();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:58',message:'NotificationService constructor - fin',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Simular notificaciones periódicas (opcional, para testing)
    // this.startPeriodicNotifications();
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones de Realtime
    this.cleanupRealtime();
  }

  /**
   * Inicializa las suscripciones de Supabase Realtime
   */
  private initializeRealtime(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:72',message:'initializeRealtime - entrada',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const supabaseUrl = process.env['ENV_SUPABASE_URL'];
    const supabaseKey = process.env['ENV_SUPABASE_API_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:77',message:'initializeRealtime - configuración faltante',data:{hasUrl:!!supabaseUrl,hasKey:!!supabaseKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.warn('⚠️ [NotificationService] Supabase no configurado, Realtime deshabilitado');
      return;
    }

    try {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:83',message:'initializeRealtime - cliente creado',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Suscribirse a cambios en adoption_applications
      const applicationsChannel = this.supabaseClient
        .channel('adoption_applications_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'adoption_applications',
          },
          (payload) => {
            this.handleNewApplication(payload.new as any);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'adoption_applications',
            filter: 'status=neq.pending',
          },
          (payload) => {
            this.handleApplicationStatusChange(payload.new as any, payload.old as any);
          }
        )
        .subscribe();

      // Suscribirse a cambios en pets
      const petsChannel = this.supabaseClient
        .channel('pets_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pets',
          },
          (payload) => {
            this.handleNewPet(payload.new as any);
          }
        )
        .subscribe();

      // Suscribirse a cambios en pet_interests
      const interestsChannel = this.supabaseClient
        .channel('pet_interests_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pet_interests',
          },
          (payload) => {
            this.handleNewInterest(payload.new as any);
          }
        )
        .subscribe();

      this.realtimeChannels = [applicationsChannel, petsChannel, interestsChannel];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:165',message:'initializeRealtime - canales suscritos',data:{channelsCount:this.realtimeChannels.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('✅ [NotificationService] Realtime inicializado correctamente');
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notification.service.ts:169',message:'initializeRealtime - error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('❌ [NotificationService] Error al inicializar Realtime:', error);
    }
  }

  /**
   * Limpia las suscripciones de Realtime
   */
  private cleanupRealtime(): void {
    this.realtimeChannels.forEach((channel) => {
      this.supabaseClient?.removeChannel(channel);
    });
    this.realtimeChannels = [];
  }

  /**
   * Maneja una nueva solicitud de adopción desde Realtime
   */
  private handleNewApplication(application: any): void {
    this.notifyNewApplication(
      application.id,
      application.pet?.name || 'una mascota',
      application.applicant_name || 'Un usuario'
    );
  }

  /**
   * Maneja un cambio de estado en una solicitud desde Realtime
   */
  private handleApplicationStatusChange(newApplication: any, oldApplication: any): void {
    if (oldApplication?.status !== newApplication?.status) {
      this.notifyApplicationStatusChange(
        newApplication.id,
        newApplication.pet?.name || 'una mascota',
        newApplication.applicant_name || 'Un usuario',
        newApplication.status
      );
    }
  }

  /**
   * Maneja una nueva mascota desde Realtime
   */
  private handleNewPet(pet: any): void {
    this.notifyNewPet(pet.id, pet.name || 'Nueva mascota');
  }

  /**
   * Maneja un nuevo interés desde Realtime
   */
  private handleNewInterest(interest: any): void {
    // Necesitaríamos hacer una consulta para obtener el nombre de la mascota
    // Por ahora, usamos el ID
    this.notifyNewInterest(
      interest.pet_id,
      'una mascota',
      interest.user_email || 'Un usuario'
    );
  }

  /**
   * Crea y muestra una nueva notificación
   */
  public notify(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      actionUrl?: string;
      actionLabel?: string;
      metadata?: Record<string, any>;
      showToast?: boolean; // Si se muestra también como toast
    }
  ): Notification {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      actionUrl: options?.actionUrl,
      actionLabel: options?.actionLabel,
      metadata: options?.metadata,
    };

    // Agregar a la lista
    this.notifications.update((notifs) => {
      const updated = [notification, ...notifs];
      this.saveNotificationsToStorage(updated);
      return updated;
    });

    // Emitir evento
    this.notificationsSubject.next(notification);

    // Mostrar toast si está habilitado
    if (options?.showToast !== false) {
      this.showToast(notification);
    }

    return notification;
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notificationId: string): void {
    this.notifications.update((notifs) => {
      const updated = notifs.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      this.saveNotificationsToStorage(updated);
      return updated;
    });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): void {
    this.notifications.update((notifs) => {
      const updated = notifs.map((n) => ({ ...n, read: true }));
      this.saveNotificationsToStorage(updated);
      return updated;
    });
  }

  /**
   * Elimina una notificación
   */
  public removeNotification(notificationId: string): void {
    this.notifications.update((notifs) => {
      const updated = notifs.filter((n) => n.id !== notificationId);
      this.saveNotificationsToStorage(updated);
      return updated;
    });
  }

  /**
   * Elimina todas las notificaciones
   */
  public clearAll(): void {
    this.notifications.set([]);
    this.saveNotificationsToStorage([]);
  }

  /**
   * Elimina todas las notificaciones leídas
   */
  public clearRead(): void {
    this.notifications.update((notifs) => {
      const unread = notifs.filter((n) => !n.read);
      this.saveNotificationsToStorage(unread);
      return unread;
    });
  }

  /**
   * Obtiene notificaciones por tipo
   */
  public getByType(type: NotificationType): Notification[] {
    return this.notifications().filter((n) => n.type === type);
  }

  /**
   * Obtiene notificaciones no leídas
   */
  public getUnread(): Notification[] {
    return this.notifications().filter((n) => !n.read);
  }

  /**
   * Notifica sobre una nueva solicitud de adopción
   */
  public notifyNewApplication(applicationId: string, petName: string, applicantName: string): void {
    this.notify(
      'application',
      'Nueva Solicitud de Adopción',
      `${applicantName} ha solicitado adoptar a ${petName}`,
      {
        actionUrl: `/admin/adoptions?tab=applications&application=${applicationId}`,
        actionLabel: 'Ver Solicitud',
        metadata: { applicationId, petName, applicantName },
        showToast: true,
      }
    );
  }

  /**
   * Notifica sobre un cambio de estado en una solicitud
   */
  public notifyApplicationStatusChange(
    applicationId: string,
    petName: string,
    applicantName: string,
    newStatus: string
  ): void {
    const statusLabels: Record<string, string> = {
      approved: 'Aprobada',
      rejected: 'Rechazada',
      completed: 'Completada',
      pending: 'Pendiente',
    };

    this.notify(
      'application',
      'Estado de Solicitud Actualizado',
      `La solicitud de ${applicantName} para ${petName} ha sido ${statusLabels[newStatus] || newStatus}`,
      {
        actionUrl: `/admin/adoptions?tab=applications&application=${applicationId}`,
        actionLabel: 'Ver Solicitud',
        metadata: { applicationId, petName, applicantName, newStatus },
        showToast: true,
      }
    );
  }

  /**
   * Notifica sobre una nueva mascota agregada
   */
  public notifyNewPet(petId: string, petName: string): void {
    this.notify(
      'pet',
      'Nueva Mascota Agregada',
      `Se ha agregado ${petName} al sistema`,
      {
        actionUrl: `/admin/adoptions?tab=pets&pet=${petId}`,
        actionLabel: 'Ver Mascota',
        metadata: { petId, petName },
        showToast: false,
      }
    );
  }

  /**
   * Notifica sobre un nuevo interés en una mascota
   */
  public notifyNewInterest(petId: string, petName: string, userEmail: string): void {
    this.notify(
      'pet',
      'Nuevo Interés en Mascota',
      `${userEmail} ha mostrado interés en ${petName}`,
      {
        actionUrl: `/admin/adoptions?tab=interests`,
        actionLabel: 'Ver Intereses',
        metadata: { petId, petName, userEmail },
        showToast: true,
      }
    );
  }

  /**
   * Muestra un toast usando PrimeNG MessageService
   */
  private showToast(notification: Notification): void {
    const severityMap: Record<NotificationType, 'success' | 'info' | 'warn' | 'error'> = {
      success: 'success',
      info: 'info',
      warn: 'warn',
      error: 'error',
      application: 'info',
      pet: 'info',
      system: 'info',
    };

    this.messageService.add({
      severity: severityMap[notification.type] || 'info',
      summary: notification.title,
      detail: notification.message,
      life: 5000,
    });
  }

  /**
   * Genera un ID único para la notificación
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Guarda notificaciones en localStorage
   */
  private saveNotificationsToStorage(notifications: Notification[]): void {
    try {
      // Guardar solo las últimas 100 notificaciones
      const toSave = notifications.slice(0, 100);
      const serialized = JSON.stringify(
        toSave.map((n) => ({
          ...n,
          timestamp: n.timestamp.toISOString(),
        }))
      );
      localStorage.setItem('adoptions_notifications', serialized);
    } catch (error) {
      console.error('Error al guardar notificaciones:', error);
    }
  }

  /**
   * Carga notificaciones desde localStorage
   */
  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('adoptions_notifications');
      if (stored) {
        const parsed = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        this.notifications.set(parsed);

        // Actualizar contador de no leídas
        const unread = parsed.filter((n: Notification) => !n.read);
        this.unreadNotifications.set(unread);
        this.unreadCount.set(unread.length);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  }

  /**
   * Inicia notificaciones periódicas (solo para testing)
   */
  private startPeriodicNotifications(): void {
    // Comentado por defecto - descomentar para testing
    // interval(30000).subscribe(() => {
    //   this.notify(
    //     'info',
    //     'Notificación de Prueba',
    //     'Esta es una notificación de prueba generada automáticamente',
    //     { showToast: false }
    //   );
    // });
  }
}

