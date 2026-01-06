import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { FAQItem } from '../models';
import { FAQStore } from '../stores/faq.store';

@Component({
  selector: 'pt-admin-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    TextareaModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    ToastModule,
    Card,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="faq-container">
      <div class="section-header">
        <h2>GestiÃ³n de Preguntas Frecuentes</h2>
        <p-button
          label="Nueva Pregunta"
          icon="pi pi-plus"
          (onClick)="openNewFAQDialog()"
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
          [value]="faqStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['question', 'answer', 'category']"
          styleClass="p-datatable-striped"
          [loading]="faqStore.isLoading()"
          [sortField]="'order'"
          [sortOrder]="1"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar preguntas..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="order">
                Orden <p-sortIcon field="order" />
              </th>
              <th>Pregunta</th>
              <th>Respuesta</th>
              <th>CategorÃ­a</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-faq>
            <tr>
              <td>{{ faq.order }}</td>
              <td>
                <span class="question-text">{{ faq.question }}</span>
              </td>
              <td>
                <span class="answer-text">{{ faq.answer }}</span>
              </td>
              <td>
                @if (faq.category) {
                  <p-tag [value]="faq.category" severity="info" />
                } @else {
                  <span class="no-category">Sin categorÃ­a</span>
                }
              </td>
              <td>
                <p-tag
                  [value]="faq.is_active ? 'Activo' : 'Inactivo'"
                  [severity]="faq.is_active ? 'success' : 'danger'"
                />
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(faq)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="faq.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="faq.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(faq)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="faq.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteFAQ(faq)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6">No se encontraron preguntas frecuentes</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar FAQ -->
    <p-dialog
      [visible]="showFAQDialog()"
      (visibleChange)="showFAQDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      [header]="editingFAQ() ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveFAQ()" class="faq-form">
        <div class="form-group">
          <label for="order">Orden *</label>
          <p-inputNumber
            id="order"
            [(ngModel)]="faqForm.order"
            name="order"
            [min]="1"
            [max]="100"
            [showButtons]="true"
            [disabled]="isLoading()"
            required
            [style]="{ width: '100%' }"
          />
          <small class="form-hint">El orden determina la posiciÃ³n en la lista</small>
        </div>

        <div class="form-group">
          <label for="category">CategorÃ­a</label>
          <p-select
            id="category"
            [(ngModel)]="faqForm.category"
            name="category"
            [options]="categoryOptions"
            placeholder="Seleccionar categorÃ­a (opcional)"
            [showClear]="true"
            [disabled]="isLoading()"
            [style]="{ width: '100%' }"
          />
        </div>

        <div class="form-group">
          <label for="question">Pregunta *</label>
          <input
            id="question"
            type="text"
            pInputText
            [(ngModel)]="faqForm.question"
            name="question"
            required
            [disabled]="isLoading()"
            placeholder="Ej: Â¿CuÃ¡nto tiempo toma el proceso de adopciÃ³n?"
          />
        </div>

        <div class="form-group">
          <label for="answer">Respuesta *</label>
          <textarea
            id="answer"
            pTextarea
            [(ngModel)]="faqForm.answer"
            name="answer"
            [rows]="5"
            [disabled]="isLoading()"
            placeholder="Respuesta detallada a la pregunta..."
            required
          ></textarea>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              [(ngModel)]="faqForm.is_active"
              name="is_active"
              [disabled]="isLoading()"
            />
            <span>Pregunta activa</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingFAQ() ? 'Actualizar' : 'Crear'"
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
      .faq-container {
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

      .question-text {
        font-weight: 600;
        color: #000000;
        max-width: 250px;
        display: block;
        word-wrap: break-word;
        white-space: normal;
        overflow-wrap: break-word;
      }

      .answer-text {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
        word-wrap: break-word;
        white-space: normal;
        overflow-wrap: break-word;
      }

      /* Asegurar que las celdas de la tabla no se mezclen */
      ::ng-deep .p-datatable tbody td {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.75rem;
      }

      ::ng-deep .p-datatable tbody td .question-text,
      ::ng-deep .p-datatable tbody td .answer-text {
        display: block;
        max-width: 100%;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Asegurar que los diÃ¡logos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      .no-category {
        color: #6b7280;
        font-style: italic;
        font-size: 0.875rem;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .faq-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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

      .form-hint {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: -0.25rem;
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

        .question-text,
        .answer-text {
          max-width: 150px;
        }
      }
    `,
  ],
})
export class AdminFAQComponent {
  private messageService = inject(MessageService);
  public faqStore = inject(FAQStore);

  public showFAQDialog = signal(false);
  public editingFAQ = signal<FAQItem | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public categoryOptions = [
    { label: 'AdopciÃ³n', value: 'AdopciÃ³n' },
    { label: 'Cuidados', value: 'Cuidados' },
    { label: 'Proceso', value: 'Proceso' },
    { label: 'Requisitos', value: 'Requisitos' },
    { label: 'General', value: 'General' },
  ];

  public faqForm: Partial<FAQItem> = {
    question: '',
    answer: '',
    category: undefined,
    order: 1,
    is_active: true,
  };

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewFAQDialog(): void {
    this.editingFAQ.set(null);
    this.resetForm();
    // Calcular el siguiente orden disponible
    const maxOrder = Math.max(
      0,
      ...this.faqStore.entities().map((f) => f.order || 0)
    );
    this.faqForm.order = maxOrder + 1;
    this.showFAQDialog.set(true);
  }

  public openEditDialog(faq: FAQItem): void {
    this.editingFAQ.set(faq);
    this.faqForm = {
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order: faq.order,
      is_active: faq.is_active,
    };
    this.showFAQDialog.set(true);
  }

  public resetForm(): void {
    this.faqForm = {
      question: '',
      answer: '',
      category: undefined,
      order: 1,
      is_active: true,
    };
    this.editingFAQ.set(null);
    this.showFAQDialog.set(false);
  }

  public saveFAQ(): void {
    if (
      !this.faqForm.question ||
      !this.faqForm.answer ||
      !this.faqForm.order
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const faq = this.editingFAQ();
    if (faq) {
      const validFields: Partial<FAQItem> = {
        id: faq.id,
        question: this.faqForm.question,
        answer: this.faqForm.answer,
        category: this.faqForm.category || undefined,
        order: this.faqForm.order,
        is_active: this.faqForm.is_active,
      };

      this.faqStore.editItem(validFields as FAQItem).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Pregunta actualizada',
            detail: 'La pregunta frecuente se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar la pregunta',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<FAQItem> = {
        question: this.faqForm.question,
        answer: this.faqForm.answer,
        category: this.faqForm.category || undefined,
        order: this.faqForm.order,
        is_active: this.faqForm.is_active,
      };

      this.faqStore.createItem(validFields as FAQItem).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Pregunta creada',
            detail: 'La pregunta frecuente se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear la pregunta',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleActive(faq: FAQItem): void {
    this.isLoading.set(true);
    const updated: FAQItem = {
      ...faq,
      is_active: !faq.is_active,
    };
    this.faqStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `La pregunta ahora estÃ¡ ${updated.is_active ? 'activa' : 'inactiva'}`,
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

  public deleteFAQ(faq: FAQItem): void {
    this.faqStore.deleteItem(faq.id);
  }
}





