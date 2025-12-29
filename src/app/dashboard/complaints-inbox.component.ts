import { DatePipe, NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { EmployeesStore } from '../stores/employees.store';
import { firstValueFrom } from 'rxjs';

interface Complaint {
  id: string;
  employee_id: string | null;
  creator_employee_id?: string | null;
  category: string;
  complaint: string;
  allow_contact: boolean;
  contact_method: string | null;
  status: string;
  priority?: string;
  closed?: boolean;
  closed_at?: string | null;
  response: string | null;
  responded_by: string | null;
  response_date: string | null;
  reveal_identity: boolean;
  thread_id: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email?: string;
    phone_number?: string;
  } | null;
}

interface ComplaintMessage {
  id: string;
  complaint_id: string;
  sender_id: string | null;
  sender_type: 'employee' | 'hr';
  is_anonymous: boolean;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  thread_id: string;
  sender?: {
    id: string;
    first_name: string;
    father_name: string;
  } | null;
}

@Component({
  selector: 'pt-complaints-inbox',
  imports: [
    Button,
    Select,
    InputTextarea,
    Tag,
    FormsModule,
    DatePipe,
    ToastModule,
    TooltipModule,
    NgClass,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div
      class="h-[calc(100vh-180px)] flex flex-col bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700"
    >
      <!-- Header con filtros -->
      <div class="bg-neutral-800 border-b border-neutral-700 p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2
              class="text-xl font-bold text-white flex items-center gap-2 m-0"
            >
              <i class="pi pi-inbox text-amber-400"></i>
              Buzón de Sugerencias
            </h2>
            <p class="text-sm text-gray-400 m-0 mt-1">
              Gestión de quejas y conversaciones con empleados
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <p-select
              [ngModel]="statusFilter()"
              (ngModelChange)="statusFilter.set($event)"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Todos los estados"
              showClear
              appendTo="body"
              class="w-full"
            />
          </div>
          <div class="flex-1 min-w-[200px]">
            <p-select
              [ngModel]="categoryFilter()"
              (ngModelChange)="categoryFilter.set($event)"
              [options]="categoryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Todas las categorías"
              showClear
              appendTo="body"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Contenedor principal estilo WhatsApp -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Lista de conversaciones (izquierda) -->
        <div
          class="w-1/3 border-r border-neutral-700 flex flex-col bg-neutral-850"
        >
          <div class="flex-1 overflow-y-auto">
            @if(complaintsApi.isLoading()) {
            <div class="p-8 text-center text-gray-400">
              Cargando conversaciones...
            </div>
            } @else if(filteredComplaints().length === 0) {
            <div class="p-8 text-center text-gray-400">
              <i class="pi pi-inbox text-4xl mb-4 block"></i>
              <p>No hay quejas disponibles</p>
            </div>
            } @else { @for(complaint of filteredComplaints(); track
            complaint.id) {
            <div
              class="p-3 border-l-4 border-b border-neutral-700 cursor-pointer hover:bg-neutral-800 transition-colors"
              [ngClass]="{
                'bg-neutral-800': selectedComplaint()?.id === complaint.id,
                'bg-amber-500/10 border-l-amber-400':
                  hasUnreadMessages(complaint) &&
                  selectedComplaint()?.id !== complaint.id,
                'border-l-orange-400':
                  complaint.status === 'pending' &&
                  !hasUnreadMessages(complaint) &&
                  selectedComplaint()?.id !== complaint.id,
                'border-l-blue-400':
                  complaint.status === 'in_review' &&
                  !hasUnreadMessages(complaint) &&
                  selectedComplaint()?.id !== complaint.id,
                'border-l-green-400':
                  complaint.status === 'resolved' &&
                  !hasUnreadMessages(complaint) &&
                  selectedComplaint()?.id !== complaint.id,
                'border-l-gray-400':
                  complaint.status === 'closed' &&
                  !hasUnreadMessages(complaint) &&
                  selectedComplaint()?.id !== complaint.id
              }"
              (click)="openConversation(complaint)"
            >
              <div class="flex items-start gap-3">
                <!-- Avatar con indicador de prioridad -->
                <div class="relative flex-shrink-0">
                  <div
                    class="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center"
                  >
                    @if(complaint.employee) {
                    <span class="text-white font-semibold text-sm">
                      {{ complaint.employee.first_name.charAt(0)
                      }}{{ complaint.employee.father_name.charAt(0) }}
                    </span>
                    } @else {
                    <i class="pi pi-user-secret text-gray-400"></i>
                    }
                  </div>
                  @if(complaint.priority === 'urgent') {
                  <span
                    class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border border-neutral-850"
                  ></span>
                  } @else if(complaint.priority === 'high') {
                  <span
                    class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border border-neutral-850"
                  ></span>
                  }
                </div>

                <!-- Información -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1.5 gap-2">
                    <h3
                      class="text-white font-semibold text-sm break-words flex-1 min-w-0"
                    >
                      @if((complaint.allow_contact || complaint.reveal_identity)
                      && complaint.employee) {
                      {{ complaint.employee.first_name }}
                      {{ complaint.employee.father_name }}
                      } @else { Anónimo }
                    </h3>
                    <span class="text-xs text-gray-500 flex-shrink-0">
                      {{
                        getRelativeTime(
                          complaint.last_message_at || complaint.updated_at
                        )
                      }}
                    </span>
                  </div>

                  <!-- Mensaje -->
                  <p
                    class="text-sm text-gray-400 break-words mb-2 line-clamp-2"
                  >
                    {{ complaint.complaint }}
                  </p>

                  <!-- Tags y controles en una línea -->
                  <div
                    class="flex items-center gap-2 flex-wrap"
                    (click)="$event.stopPropagation()"
                  >
                    <p-tag
                      [value]="getStatusLabel(complaint.status)"
                      [severity]="getStatusSeverity(complaint.status)"
                      styleClass="text-xs"
                    />
                    <p-select
                      [ngModel]="complaint.status"
                      (ngModelChange)="updateStatusQuick($event, complaint)"
                      [options]="statusOptionsForSelect"
                      optionLabel="label"
                      optionValue="value"
                      appendTo="body"
                      styleClass="text-xs h-6 w-24 border-0 bg-transparent text-gray-400 hover:text-white"
                      [showClear]="false"
                    />
                    <span class="text-gray-600">•</span>
                    <p-select
                      [ngModel]="complaint.priority || 'medium'"
                      (ngModelChange)="updatePriorityQuick($event, complaint)"
                      [options]="priorityOptions"
                      optionLabel="label"
                      optionValue="value"
                      appendTo="body"
                      styleClass="text-xs h-6 w-20 border-0 bg-transparent text-gray-400 hover:text-white"
                      [showClear]="false"
                    />
                    @if(hasUnreadMessages(complaint)) {
                    <span class="ml-auto">
                      <span
                        class="w-2 h-2 bg-amber-400 rounded-full inline-block animate-pulse"
                      ></span>
                    </span>
                    }
                  </div>
                </div>
              </div>
            </div>
            } }
          </div>
        </div>

        <!-- Vista de conversación (derecha) -->
        <div class="flex-1 flex flex-col bg-neutral-900">
          @if(!selectedComplaint()) {
          <div class="flex-1 flex items-center justify-center bg-neutral-900">
            <div class="text-center">
              <i class="pi pi-comments text-6xl text-gray-600 mb-4 block"></i>
              <p class="text-gray-400 text-lg">
                Selecciona una conversación para comenzar
              </p>
            </div>
          </div>
          } @else {
          <!-- Header de conversación -->
          <div class="bg-neutral-800 border-b border-neutral-700 p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0"
                >
                  @if(selectedComplaint()!.employee) {
                  <span class="text-white font-semibold text-xs">
                    {{ selectedComplaint()!.employee!.first_name.charAt(0)
                    }}{{ selectedComplaint()!.employee!.father_name.charAt(0) }}
                  </span>
                  } @else {
                  <i class="pi pi-user-secret text-gray-400 text-xs"></i>
                  }
                </div>
                <div>
                  <h3 class="text-white font-semibold text-sm m-0">
                    @if((selectedComplaint()!.allow_contact ||
                    selectedComplaint()!.reveal_identity) &&
                    selectedComplaint()!.employee) {
                    {{ selectedComplaint()!.employee!.first_name }}
                    {{ selectedComplaint()!.employee!.father_name }}
                    } @else { Anónimo }
                  </h3>
                  @if(selectedComplaint()!.employee?.work_email) {
                  <p class="text-xs text-gray-500 m-0">
                    {{ selectedComplaint()!.employee!.work_email }}
                  </p>
                  }
                </div>
              </div>
              <p-tag
                [value]="getCategoryLabel(selectedComplaint()!.category)"
                [severity]="getCategorySeverity(selectedComplaint()!.category)"
                styleClass="text-xs"
              />
            </div>

            <!-- Controles de gestión compactos -->
            <div class="flex items-center gap-2 flex-wrap">
              <p-select
                [ngModel]="selectedComplaint()!.status"
                (ngModelChange)="updateStatus($event)"
                [options]="statusOptionsForSelect"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
                styleClass="text-xs h-7 w-28"
              />
              <p-select
                [ngModel]="selectedComplaint()!.priority || 'medium'"
                (ngModelChange)="updatePriority($event)"
                [options]="priorityOptions"
                optionLabel="label"
                optionValue="value"
                appendTo="body"
                styleClass="text-xs h-7 w-24"
              />
              <div class="flex items-center gap-1 ml-auto">
                @if(selectedComplaint()!.status !== 'resolved' &&
                selectedComplaint()!.status !== 'closed') {
                <p-button
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  (onClick)="markAsResolved()"
                  [pTooltip]="'Marcar como Resuelto'"
                  styleClass="h-7 w-7"
                />
                } @if(!selectedComplaint()!.closed) {
                <p-button
                  icon="pi pi-times"
                  severity="secondary"
                  size="small"
                  (onClick)="closeComplaint()"
                  [pTooltip]="'Cerrar'"
                  styleClass="h-7 w-7"
                />
                } @else {
                <p-button
                  icon="pi pi-refresh"
                  severity="info"
                  size="small"
                  (onClick)="reopenComplaint()"
                  [pTooltip]="'Reabrir'"
                  styleClass="h-7 w-7"
                />
                }
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  (onClick)="deleteComplaint()"
                  [pTooltip]="'Eliminar conversación'"
                  styleClass="h-7 w-7"
                />
              </div>
            </div>
          </div>

          <!-- Mensajes -->
          <div
            class="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-900"
            #messagesContainer
          >
            @if(conversationMessagesApi.isLoading()) {
            <div class="text-center py-8 text-gray-400">
              Cargando mensajes...
            </div>
            } @else if(messages().length === 0) {
            <div class="text-center py-8">
              <p class="text-gray-400">No hay mensajes todavía.</p>
              <p class="text-sm text-gray-500 mt-2">
                El empleado envió: "{{ selectedComplaint()?.complaint }}"
              </p>
            </div>
            } @else { @for(message of messages(); track message.id) {
            <div
              class="flex"
              [ngClass]="{
                'justify-end': message.sender_type === 'hr',
                'justify-start': message.sender_type === 'employee'
              }"
            >
              <div
                class="max-w-[85%] rounded-lg p-2.5 break-words"
                [ngClass]="{
                  'bg-amber-500/20': message.sender_type === 'hr',
                  border: message.sender_type === 'hr',
                  'border-amber-500/30': message.sender_type === 'hr',
                  'bg-neutral-700': message.sender_type === 'employee',
                  'border-neutral-600': message.sender_type === 'employee'
                }"
              >
                <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                  @if(message.sender_type === 'hr') {
                  <span class="text-amber-300 font-semibold text-xs">RRHH</span>
                  } @else { @if(message.is_anonymous || !message.sender) {
                  <span class="text-gray-400 italic text-xs">Anónimo</span>
                  } @else {
                  <span class="text-gray-300 font-semibold text-xs">
                    {{ message.sender.first_name }}
                    {{ message.sender.father_name }}
                  </span>
                  } }
                  <span class="text-xs text-gray-500">
                    {{ message.created_at | date : 'short' }}
                  </span>
                  @if(message.sender_type === 'employee' && !message.is_read) {
                  <span
                    class="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block"
                  ></span>
                  }
                </div>
                <p
                  class="text-white text-sm whitespace-pre-wrap break-words m-0"
                >
                  {{ message.message }}
                </p>
              </div>
            </div>
            } }
          </div>

          <!-- Input de respuesta -->
          <div class="bg-neutral-800 border-t border-neutral-700 p-3">
            <div class="flex gap-2">
              <textarea
                pInputTextarea
                [ngModel]="replyMessage()"
                (ngModelChange)="replyMessage.set($event)"
                placeholder="Escribe tu respuesta..."
                [rows]="2"
                [autoResize]="true"
                class="flex-1 w-full text-sm"
                (keydown.enter)="onEnterKey($event)"
              ></textarea>
              <p-button
                icon="pi pi-send"
                [disabled]="!replyMessage().trim() || sendingMessage()"
                [loading]="sendingMessage()"
                (onClick)="sendReply()"
                styleClass="self-end h-10 w-10"
              />
            </div>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .bg-neutral-850 {
        background-color: #1a1a1a;
      }

      /* Scrollbar personalizado */
      .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
      }

      .overflow-y-auto::-webkit-scrollbar-track {
        background: #2a2a2a;
      }

      .overflow-y-auto::-webkit-scrollbar-thumb {
        background: #4a4a4a;
        border-radius: 3px;
      }

      .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background: #5a5a5a;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplaintsInboxComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private employeesStore = inject(EmployeesStore);

  // Filtros
  public statusFilter = signal<string | null>(null);
  public categoryFilter = signal<string | null>(null);

  public statusOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'pending' },
    { label: 'En Revisión', value: 'in_review' },
    { label: 'Resuelto', value: 'resolved' },
    { label: 'Cerrado', value: 'closed' },
  ];

  public statusOptionsForSelect = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'En Revisión', value: 'in_review' },
    { label: 'Resuelto', value: 'resolved' },
    { label: 'Cerrado', value: 'closed' },
  ];

  public priorityOptions = [
    { label: 'Baja', value: 'low' },
    { label: 'Media', value: 'medium' },
    { label: 'Alta', value: 'high' },
    { label: 'Urgente', value: 'urgent' },
  ];

  public categoryOptions = [
    { label: 'Todas las categorías', value: null },
    { label: 'Ambiente Laboral', value: 'work_environment' },
    { label: 'Salario y Beneficios', value: 'salary_benefits' },
    { label: 'Gestión', value: 'management' },
    { label: 'Recursos', value: 'resources' },
    { label: 'Otros', value: 'other' },
  ];

  // API para obtener quejas
  public complaintsApi = httpResource<Complaint[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
    method: 'GET',
    params: {
      select: '*',
      order: 'created_at.desc',
    },
  }));

  // Computed: Quejas con información del empleado
  public complaintsWithEmployee = computed(() => {
    const complaints = this.complaintsApi.value() || [];
    const employees = this.employeesStore.entities();
    return complaints.map((complaint) => {
      const employeeId = complaint.employee_id || complaint.creator_employee_id;
      const employee = employeeId
        ? employees.find((e) => e.id === employeeId)
        : null;
      return {
        ...complaint,
        employee: employee
          ? {
              id: employee.id,
              first_name: employee.first_name,
              father_name: employee.father_name,
              work_email: employee.work_email,
              phone_number: employee.phone_number,
            }
          : null,
      };
    });
  });

  // Computed: Quejas filtradas
  public filteredComplaints = computed(() => {
    let complaints = this.complaintsWithEmployee();

    if (this.statusFilter()) {
      complaints = complaints.filter((c) => c.status === this.statusFilter());
    }

    if (this.categoryFilter()) {
      complaints = complaints.filter(
        (c) => c.category === this.categoryFilter()
      );
    }

    return complaints;
  });

  public selectedComplaint = signal<Complaint | null>(null);
  public conversationDialogVisible = signal(false);
  public conversationMessagesApi = httpResource<ComplaintMessage[]>(() => {
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

  // API para obtener mensajes sin leer
  private unreadMessagesApi = httpResource<any[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
    method: 'GET',
    params: {
      select: 'complaint_id',
      sender_type: 'eq.employee',
      is_read: 'eq.false',
    },
  }));

  // Computed: Mapa de quejas con mensajes sin leer
  public unreadMessagesMap = computed(() => {
    const messages = this.unreadMessagesApi.value() || [];
    const map = new Map<string, boolean>();
    messages.forEach((msg) => {
      map.set(msg.complaint_id, true);
    });
    return map;
  });

  // Computed: Mensajes con información del remitente
  public messagesWithSender = computed(() => {
    const messages = this.conversationMessagesApi.value() || [];
    const employees = this.employeesStore.entities();

    return messages.map((message) => {
      const sender = message.sender_id
        ? employees.find((e) => e.id === message.sender_id)
        : null;

      return {
        ...message,
        sender: sender
          ? {
              id: sender.id,
              first_name: sender.first_name,
              father_name: sender.father_name,
            }
          : null,
      };
    });
  });

  public messages = computed(() => {
    return this.messagesWithSender();
  });

  public replyMessage = signal('');
  public sendingMessage = signal(false);

  // Métodos
  public openConversation(complaint: Complaint): void {
    this.selectedComplaint.set(complaint);
    this.replyMessage.set('');
    this.conversationMessagesApi.reload();
    setTimeout(() => this.markMessagesAsRead(complaint), 300);
  }

  public async markMessagesAsRead(complaint: Complaint): Promise<void> {
    if (!this.conversationMessagesApi.value()) {
      setTimeout(() => this.markMessagesAsRead(complaint), 500);
      return;
    }

    const messages = this.conversationMessagesApi.value() || [];
    const unreadMessages = messages.filter(
      (m) => m.sender_type === 'employee' && !m.is_read
    );

    if (unreadMessages.length === 0) return;

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

    this.conversationMessagesApi.reload();
    this.complaintsApi.reload();
    // Recargar notificaciones en admin component
    // Esto se hace mediante el efecto de httpResource cuando se recarga complaintsApi
  }

  public hasUnreadMessages(complaint: Complaint): boolean {
    return this.unreadMessagesMap().has(complaint.id);
  }

  public async deleteComplaint(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint) return;

    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      // Primero eliminar todos los mensajes de la conversación
      await firstValueFrom(
        this.http.delete(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?complaint_id=eq.${complaint.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );

      // Luego eliminar la queja
      await firstValueFrom(
        this.http.delete(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${complaint.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );

      this.selectedComplaint.set(null);
      this.complaintsApi.reload();

      if (this.messageService) {
        this.messageService.add({
          severity: 'success',
          summary: 'Conversación eliminada',
          detail: 'La conversación ha sido eliminada exitosamente',
        });
      }
    } catch (error: any) {
      console.error('Error deleting complaint:', error);
      if (this.messageService) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la conversación',
        });
      }
    }
  }

  public async sendReply(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint || !this.replyMessage().trim()) return;

    this.sendingMessage.set(true);

    const messageData = {
      complaint_id: complaint.id,
      sender_id: null, // HR no tiene sender_id específico
      sender_type: 'hr',
      is_anonymous: false,
      message: this.replyMessage().trim(),
      thread_id: complaint.thread_id || complaint.id,
    };

    try {
      await firstValueFrom(
        this.http.post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
          messageData
        )
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Mensaje Enviado',
        detail: 'Tu respuesta ha sido enviada correctamente',
      });

      this.replyMessage.set('');
      this.conversationMessagesApi.reload();
      this.complaintsApi.reload();
      this.sendingMessage.set(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo enviar el mensaje',
      });
      this.sendingMessage.set(false);
    }
  }

  public onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.replyMessage().trim() && !this.sendingMessage()) {
        this.sendReply();
      }
    }
  }

  public getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      work_environment: 'Ambiente Laboral',
      salary_benefits: 'Salario y Beneficios',
      management: 'Gestión',
      resources: 'Recursos',
      other: 'Otros',
    };
    return labels[category] || category;
  }

  public getCategorySeverity(
    category: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<
      string,
      'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'
    > = {
      work_environment: 'info',
      salary_benefits: 'warn',
      management: 'danger',
      resources: 'secondary',
      other: 'contrast',
    };
    return severities[category] || 'contrast';
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      in_review: 'En Revisión',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    };
    return labels[status] || status;
  }

  public getStatusSeverity(
    status: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<
      string,
      'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'
    > = {
      pending: 'warn',
      in_review: 'info',
      resolved: 'success',
      closed: 'secondary',
    };
    return severities[status] || 'contrast';
  }

  public getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  }

  public getPrioritySeverity(
    priority: string
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<
      string,
      'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'
    > = {
      low: 'secondary',
      medium: 'info',
      high: 'warn',
      urgent: 'danger',
    };
    return severities[priority] || 'secondary';
  }

  public async updateStatus(
    newStatus: string,
    complaint?: Complaint
  ): Promise<void> {
    const targetComplaint = complaint || this.selectedComplaint();
    if (!targetComplaint) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${targetComplaint.id}`,
          { status: newStatus },
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
        summary: 'Estado Actualizado',
        detail: `El estado se ha cambiado a: ${this.getStatusLabel(newStatus)}`,
      });

      this.complaintsApi.reload();
      if (!complaint) {
        // Solo actualizar selectedComplaint si estamos actualizando el seleccionado
        const updated = this.complaintsWithEmployee().find(
          (c) => c.id === targetComplaint.id
        );
        if (updated) {
          this.selectedComplaint.set(updated);
        }
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo actualizar el estado',
      });
    }
  }

  public async updateStatusQuick(
    newStatus: string,
    complaint: Complaint
  ): Promise<void> {
    await this.updateStatus(newStatus, complaint);
  }

  public async updatePriority(
    newPriority: string,
    complaint?: Complaint
  ): Promise<void> {
    const targetComplaint = complaint || this.selectedComplaint();
    if (!targetComplaint) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${targetComplaint.id}`,
          { priority: newPriority },
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
        summary: 'Prioridad Actualizada',
        detail: `La prioridad se ha cambiado a: ${this.getPriorityLabel(
          newPriority
        )}`,
      });

      this.complaintsApi.reload();
      if (!complaint) {
        // Solo actualizar selectedComplaint si estamos actualizando el seleccionado
        const updated = this.complaintsWithEmployee().find(
          (c) => c.id === targetComplaint.id
        );
        if (updated) {
          this.selectedComplaint.set(updated);
        }
      }
    } catch (error: any) {
      console.error('Error updating priority:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo actualizar la prioridad',
      });
    }
  }

  public async updatePriorityQuick(
    newPriority: string,
    complaint: Complaint
  ): Promise<void> {
    await this.updatePriority(newPriority, complaint);
  }

  public async markAsResolved(): Promise<void> {
    await this.updateStatus('resolved');
  }

  public async closeComplaint(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${complaint.id}`,
          {
            status: 'closed',
            closed: true,
            closed_at: new Date().toISOString(),
          },
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
        summary: 'Queja Cerrada',
        detail: 'La queja ha sido cerrada correctamente',
      });

      this.complaintsApi.reload();
      const updated = this.complaintsWithEmployee().find(
        (c) => c.id === complaint.id
      );
      if (updated) {
        this.selectedComplaint.set(updated);
      }
    } catch (error: any) {
      console.error('Error closing complaint:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo cerrar la queja',
      });
    }
  }

  public async reopenComplaint(): Promise<void> {
    const complaint = this.selectedComplaint();
    if (!complaint) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${complaint.id}`,
          {
            closed: false,
            closed_at: null,
            status: 'pending',
          },
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
        summary: 'Queja Reabierta',
        detail: 'La queja ha sido reabierta correctamente',
      });

      this.complaintsApi.reload();
      const updated = this.complaintsWithEmployee().find(
        (c) => c.id === complaint.id
      );
      if (updated) {
        this.selectedComplaint.set(updated);
      }
    } catch (error: any) {
      console.error('Error reopening complaint:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo reabrir la queja',
      });
    }
  }

  public getRelativeTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return format(date, 'dd/MM/yy');
  }
}
