import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { CalendarModule } from 'primeng/calendar';
import { Event, Foundation } from '../models';
import { EventsStore } from '../stores/events.store';
import { FoundationsStore } from '../stores/foundations.store';

@Component({
  selector: 'pt-admin-events',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    TextareaModule,
    DropdownModule,
    TagModule,
    ToastModule,
    Card,
    CalendarModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="events-container">
      <div class="section-header">
        <h2>Gestión de Eventos</h2>
        <p-button
          label="Nuevo Evento"
          icon="pi pi-plus"
          (onClick)="openNewEventDialog()"
          [style]="{
            background: '#fbbf24',
            border: 'none',
            color: '#000000',
            fontWeight: 'bold'
          }"
        />
      </div>

      <p-card>
        <p-table
          [value]="eventsStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['title', 'description', 'location', 'event_type']"
          styleClass="p-datatable-striped"
          [loading]="eventsStore.isLoading()"
          [sortField]="'event_date'"
          [sortOrder]="-1"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar eventos..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Ubicación</th>
              <th>Fundación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-event>
            <tr>
              <td>
                <span class="title-text">{{ event.title }}</span>
              </td>
              <td>
                <p-tag [value]="getEventTypeLabel(event.event_type)" [severity]="getEventTypeSeverity(event.event_type)" />
              </td>
              <td>{{ formatDate(event.event_date) }}</td>
              <td>{{ event.event_time || 'N/A' }}</td>
              <td>
                <span class="location-text">{{ event.location || 'N/A' }}</span>
              </td>
              <td>{{ event.foundation?.name || 'N/A' }}</td>
              <td>
                <p-tag
                  [value]="event.is_active ? 'Activo' : 'Inactivo'"
                  [severity]="event.is_active ? 'success' : 'danger'"
                />
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(event)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="event.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="event.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(event)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="event.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteEvent(event)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8">No se encontraron eventos</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar evento -->
    <p-dialog
      [visible]="showEventDialog()"
      (visibleChange)="showEventDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [header]="editingEvent() ? 'Editar Evento' : 'Nuevo Evento'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveEvent()" class="event-form">
        <div class="form-group">
          <label for="title">Título *</label>
          <input
            id="title"
            type="text"
            pInputText
            [(ngModel)]="eventForm.title"
            name="title"
            required
            [disabled]="isLoading()"
            placeholder="Ej: Feria de Adopción 2024"
          />
        </div>

        <div class="form-group">
          <label for="description">Descripción</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="eventForm.description"
            name="description"
            [rows]="4"
            [disabled]="isLoading()"
            placeholder="Descripción del evento..."
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="event_date">Fecha del Evento *</label>
            <p-calendar
              id="event_date"
              [(ngModel)]="eventForm.event_date"
              name="event_date"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
              required
            />
          </div>

          <div class="form-group">
            <label for="event_time">Hora (HH:mm)</label>
            <input
              id="event_time"
              type="time"
              pInputText
              [(ngModel)]="eventForm.event_time"
              name="event_time"
              [disabled]="isLoading()"
              placeholder="14:00"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="event_type">Tipo de Evento *</label>
            <p-dropdown
              id="event_type"
              [(ngModel)]="eventForm.event_type"
              name="event_type"
              [options]="eventTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar tipo"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
              required
            />
          </div>

          <div class="form-group">
            <label for="foundation_id">Fundación (Opcional)</label>
            <p-dropdown
              id="foundation_id"
              [(ngModel)]="eventForm.foundation_id"
              name="foundation_id"
              [options]="foundationOptions()"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccionar fundación"
              [showClear]="true"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="location">Ubicación</label>
          <input
            id="location"
            type="text"
            pInputText
            [(ngModel)]="eventForm.location"
            name="location"
            [disabled]="isLoading()"
            placeholder="Ej: Parque Central, Ciudad de Panamá"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="image_url">URL de Imagen</label>
            <input
              id="image_url"
              type="url"
              pInputText
              [(ngModel)]="eventForm.image_url"
              name="image_url"
              [disabled]="isLoading()"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div class="form-group">
            <label for="registration_url">URL de Registro</label>
            <input
              id="registration_url"
              type="url"
              pInputText
              [(ngModel)]="eventForm.registration_url"
              name="registration_url"
              [disabled]="isLoading()"
              placeholder="https://ejemplo.com/registro"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              [(ngModel)]="eventForm.is_active"
              name="is_active"
              [disabled]="isLoading()"
            />
            <span>Evento activo</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingEvent() ? 'Actualizar' : 'Crear'"
            [loading]="isLoading()"
            [disabled]="isLoading()"
            [style]="{
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              padding: '0.75rem 2rem'
            }"
          />
          <p-button
            type="button"
            label="Cancelar"
            severity="secondary"
            (onClick)="resetForm()"
            [disabled]="isLoading()"
            [style]="{
              background: '#e5e7eb',
              border: 'none',
              color: '#374151',
              padding: '0.75rem 2rem'
            }"
          />
        </div>
      </form>
    </p-dialog>
  `,
  styles: [
    `
      .events-container {
        width: 100%;
        position: relative;
        overflow-x: hidden;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 1rem 0;
        border-bottom: 2px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 1rem;
        width: 100%;
      }

      .section-header h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }

      .table-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .search-input {
        width: 100%;
        max-width: 300px;
      }

      .title-text {
        font-weight: 600;
        color: #000000;
        word-wrap: break-word;
        white-space: normal;
        overflow-wrap: break-word;
      }

      .location-text {
        word-wrap: break-word;
        white-space: normal;
        overflow-wrap: break-word;
        max-width: 200px;
        display: block;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Asegurar que las celdas de la tabla no se mezclen */
      ::ng-deep .p-datatable tbody td {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.75rem;
      }

      /* Asegurar que los diálogos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .event-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .checkbox-label input[type='checkbox'] {
        cursor: pointer;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      @media (max-width: 768px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .location-text {
          max-width: 150px;
        }
      }
    `,
  ],
})
export class AdminEventsComponent {
  private messageService = inject(MessageService);
  public eventsStore = inject(EventsStore);
  public foundationsStore = inject(FoundationsStore);

  public showEventDialog = signal(false);
  public editingEvent = signal<Event | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public eventForm: Partial<Event> = {
    title: '',
    description: '',
    event_date: undefined,
    event_time: '',
    location: '',
    event_type: 'other',
    foundation_id: undefined,
    image_url: '',
    registration_url: '',
    is_active: true,
  };

  public eventTypeOptions = [
    { label: 'Feria de Adopción', value: 'adoption_fair' },
    { label: 'Taller', value: 'workshop' },
    { label: 'Campaña', value: 'campaign' },
    { label: 'Recaudación de Fondos', value: 'fundraiser' },
    { label: 'Otro', value: 'other' },
  ];

  public foundationOptions = computed(() => 
    this.foundationsStore.entities().filter(f => f.is_active)
  );

  public onGlobalFilter(event: any): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewEventDialog(): void {
    this.editingEvent.set(null);
    this.resetForm();
    this.showEventDialog.set(true);
  }

  public openEditDialog(event: Event): void {
    this.editingEvent.set(event);
    this.eventForm = {
      title: event.title,
      description: event.description || '',
      event_date: typeof event.event_date === 'string' ? new Date(event.event_date) : event.event_date,
      event_time: event.event_time || '',
      location: event.location || '',
      event_type: event.event_type,
      foundation_id: event.foundation_id || undefined,
      image_url: event.image_url || '',
      registration_url: event.registration_url || '',
      is_active: event.is_active,
    };
    this.showEventDialog.set(true);
  }

  public resetForm(): void {
    this.eventForm = {
      title: '',
      description: '',
      event_date: undefined,
      event_time: '',
      location: '',
      event_type: 'other',
      foundation_id: undefined,
      image_url: '',
      registration_url: '',
      is_active: true,
    };
    this.editingEvent.set(null);
    this.showEventDialog.set(false);
  }

  public saveEvent(): void {
    if (!this.eventForm.title || !this.eventForm.event_date || !this.eventForm.event_type) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const event = this.editingEvent();
    if (event) {
      const validFields: Partial<Event> = {
        id: event.id,
        title: this.eventForm.title,
        description: this.eventForm.description || undefined,
        event_date: this.eventForm.event_date,
        event_time: this.eventForm.event_time || undefined,
        location: this.eventForm.location || undefined,
        event_type: this.eventForm.event_type,
        foundation_id: this.eventForm.foundation_id || undefined,
        image_url: this.eventForm.image_url || undefined,
        registration_url: this.eventForm.registration_url || undefined,
        is_active: this.eventForm.is_active,
      };

      this.eventsStore.editItem(validFields as Event).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Evento actualizado',
            detail: 'El evento se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar el evento',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<Event> = {
        title: this.eventForm.title,
        description: this.eventForm.description || undefined,
        event_date: this.eventForm.event_date,
        event_time: this.eventForm.event_time || undefined,
        location: this.eventForm.location || undefined,
        event_type: this.eventForm.event_type,
        foundation_id: this.eventForm.foundation_id || undefined,
        image_url: this.eventForm.image_url || undefined,
        registration_url: this.eventForm.registration_url || undefined,
        is_active: this.eventForm.is_active,
      };

      this.eventsStore.createItem(validFields as Event).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Evento creado',
            detail: 'El evento se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear el evento',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleActive(event: Event): void {
    this.isLoading.set(true);
    const updated: Event = {
      ...event,
      is_active: !event.is_active,
    };
    this.eventsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El evento ahora está ${updated.is_active ? 'activo' : 'inactivo'}`,
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo actualizar el estado',
        });
        this.isLoading.set(false);
      },
    });
  }

  public deleteEvent(event: Event): void {
    this.eventsStore.deleteItem(event.id);
  }

  public getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      adoption_fair: 'Feria de Adopción',
      workshop: 'Taller',
      campaign: 'Campaña',
      fundraiser: 'Recaudación',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  public getEventTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'secondary' | undefined> = {
      adoption_fair: 'success',
      workshop: 'info',
      campaign: 'warn',
      fundraiser: 'secondary',
      other: 'secondary',
    };
    return severities[type] || 'secondary';
  }

  public formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

