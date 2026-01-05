import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DashboardStore } from '../../stores/dashboard.store';

// NOTA: No usar providedIn:'root' porque depende de DashboardStore (scope del layout del portal).
// Se provee explícitamente en EmployeePortalComponent para compartir el injector correcto.
@Injectable()
export class EmployeePortalConversationService {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private store = inject(DashboardStore);

  public currentEmployee = computed(() => this.store.currentEmployee());

  // Signal para la queja seleccionada
  public selectedComplaint = signal<any>(null);

  // API para mensajes de una queja específica
  public complaintMessagesApi = httpResource<any[]>(() => {
    const complaint = this.selectedComplaint();
    if (!complaint) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: '*',
        complaint_id: `eq.${complaint.id}`,
        order: 'created_at.asc',
      },
    };
  });

  public conversationMessages = computed(
    () => this.complaintMessagesApi.value() ?? []
  );

  // API para obtener todos los mensajes sin leer de HR (por complaint_id)
  public unreadMessagesApi = httpResource<any[]>(() => {
    if (!this.currentEmployee()?.id) return undefined;
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: 'complaint_id',
        sender_type: 'eq.hr',
        is_read: 'eq.false',
      },
    };
  });

  // Computed: Set de quejas con mensajes sin leer del empleado
  public unreadMessagesMap = computed(() => {
    const messages = this.unreadMessagesApi.value() ?? [];
    const myComplaints = this.getMyComplaints();

    if (myComplaints.length === 0 || messages.length === 0)
      return new Set<string>();

    // Crear un Set de complaint_ids de las quejas del empleado
    const myComplaintIds = new Set(myComplaints.map((c: any) => c.id));

    // Filtrar mensajes sin leer que pertenecen a las quejas del empleado
    const unreadSet = new Set<string>();
    messages.forEach((msg: any) => {
      if (msg.complaint_id && myComplaintIds.has(msg.complaint_id)) {
        unreadSet.add(msg.complaint_id);
      }
    });

    return unreadSet;
  });

  public unreadComplaintsCount = computed(() => {
    return this.unreadMessagesMap().size;
  });

  // Esta función debe ser inyectada desde el componente que tiene acceso a myComplaints
  private getMyComplaints: () => any[] = () => [];

  public setMyComplaintsGetter(getter: () => any[]): void {
    this.getMyComplaints = getter;
  }

  public hasUnreadMessages(complaint: any, selectedComplaintId: string | null): boolean {
    // Primero verificar si hay mensajes sin leer de la conversación actual
    if (complaint.id === selectedComplaintId) {
      const messages = this.conversationMessages();
      return messages.some((m) => m.sender_type === 'hr' && !m.is_read);
    }

    // Si no está seleccionada, usar el mapa de mensajes sin leer
    return this.unreadMessagesMap().has(complaint.id);
  }

  public async markMessagesAsRead(complaint: any): Promise<void> {
    // Esperar a que se carguen los mensajes
    if (!this.complaintMessagesApi.value()) {
      // Esperar un poco para que se carguen los mensajes
      setTimeout(() => this.markMessagesAsRead(complaint), 500);
      return;
    }

    const messages = this.complaintMessagesApi.value() || [];
    // Marcar mensajes de HR como leídos cuando el empleado los ve
    const unreadMessages = messages.filter(
      (m) => m.sender_type === 'hr' && !m.is_read
    );

    if (unreadMessages.length === 0) return;

    // Marcar todos los mensajes de HR como leídos
    for (const message of unreadMessages) {
      try {
        await firstValueFrom(
          this.http.patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?id=eq.${message.id}`,
            { is_read: true, read_at: new Date().toISOString() },
            {
              headers: {
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
            }
          )
        );
      } catch (error: any) {
        console.error('Error marking message as read:', error);
      }
    }

    // Recargar mensajes para actualizar el estado
    this.complaintMessagesApi.reload();
  }

  public async sendReply(replyMessage: string, complaint: any): Promise<void> {
    if (!complaint || !replyMessage.trim()) return;

    const currentEmployee = this.currentEmployee();
    if (!currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar al usuario actual',
      });
      return;
    }

    const messageData = {
      complaint_id: complaint.id,
      sender_id: currentEmployee.id,
      sender_type: 'employee',
      is_anonymous: false, // Si la queja ya tiene employee_id, no puede ser anónima
      message: replyMessage.trim(),
      thread_id: complaint.thread_id || complaint.id,
    };

    try {
      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
          messageData,
          {
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
          }
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Mensaje Enviado',
        detail: 'Tu respuesta ha sido enviada correctamente',
      });

      this.complaintMessagesApi.reload();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo enviar el mensaje',
      });
    }
  }
}
