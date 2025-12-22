import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

interface Suggestion {
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

interface SuggestionMessage {
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
  selector: 'pt-suggestions-inbox',
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
    <div class="h-[calc(100vh-180px)] flex flex-col bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700">
      <!-- Header con filtros -->
      <div class="bg-neutral-800 border-b border-neutral-700 p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2 m-0">
              <i class="pi pi-comments text-cyan-400"></i>
              Buzón de Sugerencias
            </h2>
            <p class="text-sm text-gray-400 m-0 mt-1">
              Gestión de sugerencias y conversaciones con empleados
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
        <div class="w-1/3 border-r border-neutral-700 flex flex-col bg-neutral-850">
          <div class="flex-1 overflow-y-auto">
            @if(suggestionsApi.isLoading()) {
              <div class="p-8 text-center text-gray-400">Cargando conversaciones...</div>
            } @else if(filteredSuggestions().length === 0) {
              <div class="p-8 text-center text-gray-400">
                <i class="pi pi-comments text-4xl mb-4 block"></i>
                <p>No hay sugerencias disponibles</p>
              </div>
            } @else {
              @for(suggestion of filteredSuggestions(); track suggestion.id) {
                <div
                  class="p-3 border-l-4 border-b border-neutral-700 cursor-pointer hover:bg-neutral-800 transition-colors"
                  [ngClass]="{
                    'bg-neutral-800': selectedSuggestion()?.id === suggestion.id,
                    'bg-cyan-500/10 border-l-cyan-400': hasUnreadMessages(suggestion) && selectedSuggestion()?.id !== suggestion.id,
                    'border-l-orange-400': suggestion.status === 'pending' && !hasUnreadMessages(suggestion) && selectedSuggestion()?.id !== suggestion.id,
                    'border-l-blue-400': suggestion.status === 'in_review' && !hasUnreadMessages(suggestion) && selectedSuggestion()?.id !== suggestion.id,
                    'border-l-green-400': suggestion.status === 'resolved' && !hasUnreadMessages(suggestion) && selectedSuggestion()?.id !== suggestion.id,
                    'border-l-gray-400': suggestion.status === 'closed' && !hasUnreadMessages(suggestion) && selectedSuggestion()?.id !== suggestion.id
                  }"
                  (click)="openConversation(suggestion)"
                >
                  <div class="flex items-start gap-3">
                    <!-- Avatar con indicador de prioridad -->
                    <div class="relative flex-shrink-0">
                      <div class="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
                        @if(suggestion.employee) {
                          <span class="text-white font-semibold text-sm">
                            {{ suggestion.employee.first_name.charAt(0) }}{{ suggestion.employee.father_name.charAt(0) }}
                          </span>
                        } @else {
                          <i class="pi pi-user-secret text-gray-400"></i>
                        }
                      </div>
                      @if(suggestion.priority === 'urgent') {
                        <span class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border border-neutral-850"></span>
                      } @else if(suggestion.priority === 'high') {
                        <span class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border border-neutral-850"></span>
                      }
                    </div>
                    
                    <!-- Información -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-1.5 gap-2">
                        <h3 class="text-white font-semibold text-sm break-words flex-1 min-w-0">
                          @if((suggestion.allow_contact || suggestion.reveal_identity) && suggestion.employee) {
                            {{ suggestion.employee.first_name }} {{ suggestion.employee.father_name }}
                          } @else {
                            Anónimo
                          }
                        </h3>
                        <span class="text-xs text-gray-500 flex-shrink-0">
                          {{ getRelativeTime(suggestion.last_message_at || suggestion.updated_at) }}
                        </span>
                      </div>
                      
                      <!-- Mensaje -->
                      <p class="text-sm text-gray-400 break-words mb-2 line-clamp-2">
                        {{ suggestion.complaint }}
                      </p>
                      
                      <!-- Tags y controles en una línea -->
                      <div class="flex items-center gap-2 flex-wrap" (click)="$event.stopPropagation()">
                        <p-tag
                          [value]="getStatusLabel(suggestion.status)"
                          [severity]="getStatusSeverity(suggestion.status)"
                          styleClass="text-xs"
                        />
                        <p-select
                          [ngModel]="suggestion.status"
                          (ngModelChange)="updateStatusQuick($event, suggestion)"
                          [options]="statusOptionsForSelect"
                          optionLabel="label"
                          optionValue="value"
                          appendTo="body"
                          styleClass="text-xs h-6 w-24 border-0 bg-transparent text-gray-400 hover:text-white"
                          [showClear]="false"
                        />
                        <span class="text-gray-600">•</span>
                        <p-select
                          [ngModel]="suggestion.priority || 'medium'"
                          (ngModelChange)="updatePriorityQuick($event, suggestion)"
                          [options]="priorityOptions"
                          optionLabel="label"
                          optionValue="value"
                          appendTo="body"
                          styleClass="text-xs h-6 w-20 border-0 bg-transparent text-gray-400 hover:text-white"
                          [showClear]="false"
                        />
                        @if(hasUnreadMessages(suggestion)) {
                          <span class="ml-auto">
                            <span class="w-2 h-2 bg-cyan-400 rounded-full inline-block animate-pulse"></span>
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Vista de conversación (derecha) -->
        <div class="flex-1 flex flex-col bg-neutral-900">
          @if(!selectedSuggestion()) {
            <div class="flex-1 flex items-center justify-center bg-neutral-900">
              <div class="text-center">
                <i class="pi pi-comments text-6xl text-gray-600 mb-4 block"></i>
                <p class="text-gray-400 text-lg">Selecciona una conversación para comenzar</p>
              </div>
            </div>
          } @else {
            <!-- Header de conversación -->
            <div class="bg-neutral-800 border-b border-neutral-700 p-3">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                    @if(selectedSuggestion()!.employee) {
                      <span class="text-white font-semibold text-xs">
                        {{ selectedSuggestion()!.employee!.first_name.charAt(0) }}{{ selectedSuggestion()!.employee!.father_name.charAt(0) }}
                      </span>
                    } @else {
                      <i class="pi pi-user-secret text-gray-400 text-xs"></i>
                    }
                  </div>
                  <div>
                    <h3 class="text-white font-semibold text-sm m-0">
                      @if((selectedSuggestion()!.allow_contact || selectedSuggestion()!.reveal_identity) && selectedSuggestion()!.employee) {
                        {{ selectedSuggestion()!.employee!.first_name }} {{ selectedSuggestion()!.employee!.father_name }}
                      } @else {
                        Anónimo
                      }
                    </h3>
                    @if(selectedSuggestion()!.employee?.work_email) {
                      <p class="text-xs text-gray-500 m-0">{{ selectedSuggestion()!.employee!.work_email }}</p>
                    }
                  </div>
                </div>
                <p-tag
                  [value]="getCategoryLabel(selectedSuggestion()!.category)"
                  [severity]="getCategorySeverity(selectedSuggestion()!.category)"
                  styleClass="text-xs"
                />
              </div>
              
              <!-- Controles de gestión compactos -->
              <div class="flex items-center gap-2 flex-wrap">
                <p-select
                  [ngModel]="selectedSuggestion()!.status"
                  (ngModelChange)="updateStatus($event)"
                  [options]="statusOptionsForSelect"
                  optionLabel="label"
                  optionValue="value"
                  appendTo="body"
                  styleClass="text-xs h-7 w-28"
                />
                <p-select
                  [ngModel]="selectedSuggestion()!.priority || 'medium'"
                  (ngModelChange)="updatePriority($event)"
                  [options]="priorityOptions"
                  optionLabel="label"
                  optionValue="value"
                  appendTo="body"
                  styleClass="text-xs h-7 w-24"
                />
                <div class="flex items-center gap-1 ml-auto">
                  @if(selectedSuggestion()!.status !== 'resolved' && selectedSuggestion()!.status !== 'closed') {
                    <p-button
                      icon="pi pi-check"
                      severity="success"
                      size="small"
                      (onClick)="markAsResolved()"
                      [pTooltip]="'Marcar como Resuelto'"
                      styleClass="h-7 w-7"
                    />
                  }
                  @if(!selectedSuggestion()!.closed) {
                    <p-button
                      icon="pi pi-times"
                      severity="secondary"
                      size="small"
                      (onClick)="closeSuggestion()"
                      [pTooltip]="'Cerrar'"
                      styleClass="h-7 w-7"
                    />
                  } @else {
                    <p-button
                      icon="pi pi-refresh"
                      severity="info"
                      size="small"
                      (onClick)="reopenSuggestion()"
                      [pTooltip]="'Reabrir'"
                      styleClass="h-7 w-7"
                    />
                  }
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    size="small"
                    (onClick)="deleteSuggestion()"
                    [pTooltip]="'Eliminar conversación'"
                    styleClass="h-7 w-7"
                  />
                </div>
              </div>
            </div>

            <!-- Mensajes -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-900" #messagesContainer>
              @if(conversationMessagesApi.isLoading()) {
                <div class="text-center py-8 text-gray-400">Cargando mensajes...</div>
              } @else if(messages().length === 0) {
                <div class="text-center py-8">
                  <p class="text-gray-400">No hay mensajes todavía.</p>
                  <p class="text-sm text-gray-500 mt-2">
                    El empleado envió: "{{ selectedSuggestion()?.complaint }}"
                  </p>
                </div>
              } @else {
                @for(message of messages(); track message.id) {
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
                        'bg-cyan-500/20': message.sender_type === 'hr',
                        'border': message.sender_type === 'hr',
                        'border-cyan-500/30': message.sender_type === 'hr',
                        'bg-neutral-700': message.sender_type === 'employee',
                        'border-neutral-600': message.sender_type === 'employee'
                      }"
                    >
                      <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                        @if(message.sender_type === 'hr') {
                          <span class="text-cyan-300 font-semibold text-xs">RRHH</span>
                        } @else {
                          @if(message.is_anonymous || !message.sender) {
                            <span class="text-gray-400 italic text-xs">Anónimo</span>
                          } @else {
                            <span class="text-gray-300 font-semibold text-xs">
                              {{ message.sender.first_name }} {{ message.sender.father_name }}
                            </span>
                          }
                        }
                        <span class="text-xs text-gray-500">
                          {{ message.created_at | date : 'short' }}
                        </span>
                        @if(message.sender_type === 'employee' && !message.is_read) {
                          <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block"></span>
                        }
                      </div>
                      <p class="text-white text-sm whitespace-pre-wrap break-words m-0">{{ message.message }}</p>
                    </div>
                  </div>
                }
              }
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
  styles: [`
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestionsInboxComponent {
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
    { label: 'Mejora de Procesos', value: 'process_improvement' },
    { label: 'Innovación', value: 'innovation' },
    { label: 'Ambiente Laboral', value: 'work_environment' },
    { label: 'Beneficios', value: 'benefits' },
    { label: 'Otros', value: 'other' },
  ];

  // API para obtener sugerencias (usando la misma tabla de complaints pero filtrando por tipo)
  public suggestionsApi = httpResource<Suggestion[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
    method: 'GET',
    params: {
      select: '*',
      order: 'created_at.desc',
      // Filtrar por categorías de sugerencias
      or: '(category.eq.process_improvement,category.eq.innovation,category.eq.work_environment,category.eq.benefits,category.eq.other)',
    },
  }));

  // Computed: Sugerencias con información del empleado
  public suggestionsWithEmployee = computed(() => {
    const suggestions = this.suggestionsApi.value() || [];
    const employees = this.employeesStore.entities();
    return suggestions.map((suggestion) => {
      const employeeId = suggestion.employee_id || suggestion.creator_employee_id;
      const employee = employeeId
        ? employees.find((e) => e.id === employeeId)
        : null;
      return {
        ...suggestion,
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

  // Computed: Sugerencias filtradas
  public filteredSuggestions = computed(() => {
    let suggestions = this.suggestionsWithEmployee();
    
    if (this.statusFilter()) {
      suggestions = suggestions.filter((s) => s.status === this.statusFilter());
    }
    
    if (this.categoryFilter()) {
      suggestions = suggestions.filter((s) => s.category === this.categoryFilter());
    }
    
    return suggestions;
  });

  public selectedSuggestion = signal<Suggestion | null>(null);
  public conversationDialogVisible = signal(false);
  public conversationMessagesApi = httpResource<SuggestionMessage[]>(() => {
    const suggestion = this.selectedSuggestion();
    if (!suggestion) return undefined;
    
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
      method: 'GET',
      params: {
        select: '*',
        complaint_id: `eq.${suggestion.id}`,
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

  // Computed: Mapa de sugerencias con mensajes sin leer
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
  public openConversation(suggestion: Suggestion): void {
    this.selectedSuggestion.set(suggestion);
    this.replyMessage.set('');
    this.conversationMessagesApi.reload();
    setTimeout(() => this.markMessagesAsRead(suggestion), 300);
  }

  public async markMessagesAsRead(suggestion: Suggestion): Promise<void> {
    if (!this.conversationMessagesApi.value()) {
      setTimeout(() => this.markMessagesAsRead(suggestion), 500);
      return;
    }

    const messages = this.conversationMessagesApi.value() || [];
    const unreadMessages = messages.filter(
      (m) => m.sender_type === 'employee' && !m.is_read
    );

    if (unreadMessages.length === 0) return;

    for (const message of unreadMessages) {
      try {
        await this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?id=eq.${message.id}`,
            { is_read: true, read_at: new Date().toISOString() },
            {
              headers: {
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
            }
          )
          .toPromise();
      } catch (error: any) {
        console.error('Error marking message as read:', error);
      }
    }

    this.conversationMessagesApi.reload();
    this.suggestionsApi.reload();
  }

  public hasUnreadMessages(suggestion: Suggestion): boolean {
    return this.unreadMessagesMap().has(suggestion.id);
  }

  public async deleteSuggestion(): Promise<void> {
    const suggestion = this.selectedSuggestion();
    if (!suggestion) return;

    if (!confirm(`¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await this.http
        .delete(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages?complaint_id=eq.${suggestion.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
        .toPromise();

      await this.http
        .delete(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${suggestion.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
        .toPromise();

      this.selectedSuggestion.set(null);
      this.suggestionsApi.reload();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Conversación eliminada',
        detail: 'La conversación ha sido eliminada exitosamente',
      });
    } catch (error: any) {
      console.error('Error deleting suggestion:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar la conversación',
      });
    }
  }

  public async sendReply(): Promise<void> {
    const suggestion = this.selectedSuggestion();
    if (!suggestion || !this.replyMessage().trim()) return;

    this.sendingMessage.set(true);

    const messageData = {
      complaint_id: suggestion.id,
      sender_id: null,
      sender_type: 'hr',
      is_anonymous: false,
      message: this.replyMessage().trim(),
      thread_id: suggestion.thread_id || suggestion.id,
    };

    try {
      await this.http
        .post(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
          messageData
        )
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Mensaje Enviado',
        detail: 'Tu respuesta ha sido enviada correctamente',
      });

      this.replyMessage.set('');
      this.conversationMessagesApi.reload();
      this.suggestionsApi.reload();
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
      process_improvement: 'Mejora de Procesos',
      innovation: 'Innovación',
      work_environment: 'Ambiente Laboral',
      benefits: 'Beneficios',
      other: 'Otros',
    };
    return labels[category] || category;
  }

  public getCategorySeverity(category: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      process_improvement: 'info',
      innovation: 'success',
      work_environment: 'info',
      benefits: 'warn',
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

  public getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
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

  public getPrioritySeverity(priority: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      low: 'secondary',
      medium: 'info',
      high: 'warn',
      urgent: 'danger',
    };
    return severities[priority] || 'secondary';
  }

  public async updateStatus(newStatus: string, suggestion?: Suggestion): Promise<void> {
    const targetSuggestion = suggestion || this.selectedSuggestion();
    if (!targetSuggestion) return;

    try {
      await this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${targetSuggestion.id}`,
          { status: newStatus },
          {
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
          }
        )
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: `El estado se ha cambiado a: ${this.getStatusLabel(newStatus)}`,
      });

      this.suggestionsApi.reload();
      if (!suggestion) {
        const updated = this.suggestionsWithEmployee().find(s => s.id === targetSuggestion.id);
        if (updated) {
          this.selectedSuggestion.set(updated);
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

  public async updateStatusQuick(newStatus: string, suggestion: Suggestion): Promise<void> {
    await this.updateStatus(newStatus, suggestion);
  }

  public async updatePriority(newPriority: string, suggestion?: Suggestion): Promise<void> {
    const targetSuggestion = suggestion || this.selectedSuggestion();
    if (!targetSuggestion) return;

    try {
      await this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${targetSuggestion.id}`,
          { priority: newPriority },
          {
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
          }
        )
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Prioridad Actualizada',
        detail: `La prioridad se ha cambiado a: ${this.getPriorityLabel(newPriority)}`,
      });

      this.suggestionsApi.reload();
      if (!suggestion) {
        const updated = this.suggestionsWithEmployee().find(s => s.id === targetSuggestion.id);
        if (updated) {
          this.selectedSuggestion.set(updated);
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

  public async updatePriorityQuick(newPriority: string, suggestion: Suggestion): Promise<void> {
    await this.updatePriority(newPriority, suggestion);
  }

  public async markAsResolved(): Promise<void> {
    await this.updateStatus('resolved');
  }

  public async closeSuggestion(): Promise<void> {
    const suggestion = this.selectedSuggestion();
    if (!suggestion) return;

    try {
      await this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${suggestion.id}`,
          { 
            status: 'closed',
            closed: true,
            closed_at: new Date().toISOString()
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
          }
        )
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Sugerencia Cerrada',
        detail: 'La sugerencia ha sido cerrada correctamente',
      });

      this.suggestionsApi.reload();
      const updated = this.suggestionsWithEmployee().find(s => s.id === suggestion.id);
      if (updated) {
        this.selectedSuggestion.set(updated);
      }
    } catch (error: any) {
      console.error('Error closing suggestion:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo cerrar la sugerencia',
      });
    }
  }

  public async reopenSuggestion(): Promise<void> {
    const suggestion = this.selectedSuggestion();
    if (!suggestion) return;

    try {
      await this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints?id=eq.${suggestion.id}`,
          { 
            closed: false,
            closed_at: null,
            status: 'pending'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
          }
        )
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Sugerencia Reabierta',
        detail: 'La sugerencia ha sido reabierta correctamente',
      });

      this.suggestionsApi.reload();
      const updated = this.suggestionsWithEmployee().find(s => s.id === suggestion.id);
      if (updated) {
        this.selectedSuggestion.set(updated);
      }
    } catch (error: any) {
      console.error('Error reopening suggestion:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.error?.message || 'No se pudo reabrir la sugerencia',
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

