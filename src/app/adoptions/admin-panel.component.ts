import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputText } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Pet, Foundation } from '../models';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';
import {
  EditableSelectComponent,
  EditableOption,
} from '../shared/editable-select.component';

@Component({
  selector: 'pt-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    TagModule,
    ToastModule,
    Card,
    EditableSelectComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="admin-panel-container">
      <div class="admin-header">
        <h1 class="admin-title">Panel de Administración</h1>
        <div class="header-actions">
          <p-button
            label="Crear Ejemplos"
            icon="pi pi-database"
            (onClick)="createExamplePets()"
            [loading]="isCreatingExamples()"
            [disabled]="isCreatingExamples()"
            severity="secondary"
            [style]="{
              background: '#10b981',
              border: 'none',
              color: '#ffffff',
              fontWeight: 'bold',
              marginRight: '0.75rem'
            }"
          />
          <p-button
            label="Nueva Mascota"
            icon="pi pi-plus"
            (onClick)="openNewPetDialog()"
            [style]="{
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold'
            }"
          />
        </div>
      </div>

      <p-card class="stats-card">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Mascotas</span>
            <span class="stat-value">{{ totalPets() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Disponibles</span>
            <span class="stat-value stat-available">{{ availablePets() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Adoptadas</span>
            <span class="stat-value stat-adopted">{{ adoptedPets() }}</span>
          </div>
        </div>
      </p-card>

      <p-card>
        <ng-template pTemplate="header">
          <h3>Gestión de Mascotas</h3>
        </ng-template>
        <p-table
          [value]="petsStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['name', 'species', 'foundation.name']"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input
                  type="text"
                  pInputText
                  placeholder="Buscar mascotas..."
                  (input)="onGlobalFilter($event)"
                />
              </span>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Especie</th>
              <th>Fundación</th>
              <th>Estado</th>
              <th>Edad</th>
              <th>Género</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-pet>
            <tr>
              <td>{{ pet.name }}</td>
              <td>
                <span class="species-badge">{{
                  getSpeciesLabel(pet.species)
                }}</span>
              </td>
              <td>{{ pet.foundation?.name || 'Sin fundación' }}</td>
              <td>
                <p-tag
                  [value]="pet.is_available ? 'Disponible' : 'Adoptada'"
                  [severity]="pet.is_available ? 'success' : 'danger'"
                />
              </td>
              <td>{{ pet.age ? pet.age.toFixed(1) : 'N/A' }} años</td>
              <td>{{ pet.gender === 'M' ? 'Macho' : 'Hembra' }}</td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(pet)"
                    [style]="{ marginRight: '0.5rem' }"
                  />
                  <p-button
                    [icon]="pet.is_available ? 'pi pi-check' : 'pi pi-times'"
                    [text]="true"
                    [severity]="pet.is_available ? 'success' : 'warn'"
                    (onClick)="toggleAvailability(pet)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron mascotas</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar mascota -->
    <p-dialog
      [visible]="showPetDialog()"
      (visibleChange)="showPetDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [header]="editingPet() ? 'Editar Mascota' : 'Nueva Mascota'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="savePet()" class="pet-form">
        <div class="form-group">
          <label for="name">Nombre *</label>
          <input
            id="name"
            type="text"
            pInputText
            [(ngModel)]="petForm.name"
            name="name"
            required
            [disabled]="isLoading()"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="species">Especie *</label>
            <pt-editable-select
              id="species"
              name="species"
              [selectedValue]="petForm.species || null"
              (valueChange)="onSpeciesChange($event)"
              [options]="speciesOptions()"
              (optionsChange)="speciesOptions.set($event)"
              placeholder="Seleccionar especie"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>

          <div class="form-group">
            <label for="gender">Género *</label>
            <pt-editable-select
              id="gender"
              name="gender"
              [selectedValue]="petForm.gender || null"
              (valueChange)="onGenderChange($event)"
              [options]="genderOptions()"
              (optionsChange)="genderOptions.set($event)"
              placeholder="Seleccionar género"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="size">Tamaño *</label>
            <pt-editable-select
              id="size"
              name="size"
              [selectedValue]="petForm.size || null"
              (valueChange)="onSizeChange($event)"
              [options]="sizeOptions()"
              (optionsChange)="sizeOptions.set($event)"
              placeholder="Seleccionar tamaño"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>

          <div class="form-group">
            <label for="age">Edad (años)</label>
            <input
              id="age"
              type="number"
              pInputText
              [(ngModel)]="petForm.age"
              name="age"
              step="0.1"
              min="0"
              [disabled]="isLoading()"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="weight">Peso (Kg)</label>
            <input
              id="weight"
              type="number"
              pInputText
              [(ngModel)]="petForm.weight"
              name="weight"
              step="0.1"
              min="0"
              placeholder="Ej: 15"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label for="foundation_id">Fundación *</label>
            <p-select
              id="foundation_id"
              name="foundation_id"
              [(ngModel)]="petForm.foundation_id"
              [options]="foundations()"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccionar fundación"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="breed">Raza</label>
            <input
              id="breed"
              type="text"
              pInputText
              [(ngModel)]="petForm.breed"
              name="breed"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label for="color">Color</label>
            <input
              id="color"
              type="text"
              pInputText
              [(ngModel)]="petForm.color"
              name="color"
              placeholder="Ej: Negro, Blanco, Marrón"
              [disabled]="isLoading()"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="description">Descripción</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="petForm.description"
            name="description"
            [rows]="4"
            [disabled]="isLoading()"
            placeholder="Describe la personalidad, comportamiento y características especiales de la mascota..."
            class="pet-description-textarea"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="personality">Personalidad</label>
          <p-multiSelect
            id="personality"
            name="personality"
            [(ngModel)]="petForm.personality"
            [options]="personalityOptions"
            placeholder="Seleccione una o más opciones..."
            [displaySelectedLabel]="true"
            [maxSelectedLabels]="3"
            [showToggleAll]="false"
            [disabled]="isLoading()"
            styleClass="w-full"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="health_status">Estado de Salud</label>
            <pt-editable-select
              id="health_status"
              name="health_status"
              [selectedValue]="petForm.health_status || null"
              (valueChange)="petForm.health_status = $event || undefined"
              [options]="healthStatusOptions()"
              (optionsChange)="healthStatusOptions.set($event)"
              placeholder="Seleccionar estado de salud"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>

          <div class="form-group">
            <label for="location_type">En (Tipo de Ubicación)</label>
            <pt-editable-select
              id="location_type"
              name="location_type"
              [selectedValue]="petForm.location_type || null"
              (valueChange)="petForm.location_type = $event || undefined"
              [options]="locationTypeOptions()"
              (optionsChange)="locationTypeOptions.set($event)"
              placeholder="Seleccionar tipo"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="location_detail">Ubicación Específica</label>
          <input
            id="location_detail"
            type="text"
            pInputText
            [(ngModel)]="petForm.location_detail"
            name="location_detail"
            placeholder="Ej: ME ENCUENTRO EN LA SEDE DE LAS VILLAS"
            [disabled]="isLoading()"
          />
          <small class="form-hint">
            Este texto se mostrará en la tarjeta de la mascota con el ícono ➕
          </small>
        </div>

        <div class="form-group">
          <label for="photos">URLs de Fotos (una por línea)</label>
          <textarea
            id="photos"
            pTextarea
            [ngModel]="photoUrls()"
            (ngModelChange)="updatePhotos($event)"
            name="photos"
            [rows]="3"
            [disabled]="isLoading()"
            placeholder="Ingresa las URLs de las fotos, una por línea:&#10;https://ejemplo.com/foto1.jpg&#10;https://ejemplo.com/foto2.jpg"
            class="pet-photos-textarea"
          ></textarea>
          <small class="form-hint">
            Ingresa las URLs de las fotos, una por línea. Las fotos se mostrarán en la tarjeta de la mascota.
          </small>
          @if (petForm.photos && petForm.photos.length > 0) {
          <div class="photos-preview">
            <p class="photos-count">{{ petForm.photos.length }} foto(s) agregada(s)</p>
            <div class="photos-list">
              @for (photo of petForm.photos; track $index) {
              <div class="photo-item">
                <img [src]="photo" [alt]="petForm.name || 'Mascota'" class="photo-preview" />
                <button
                  type="button"
                  class="remove-photo-btn"
                  (click)="removePhoto($index)"
                  [disabled]="isLoading()"
                >
                  ✕
                </button>
              </div>
              }
            </div>
          </div>
          }
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="petForm.is_vaccinated"
                name="is_vaccinated"
                [disabled]="isLoading()"
              />
              <span>Vacunado</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="petForm.is_sterilized"
                name="is_sterilized"
                [disabled]="isLoading()"
              />
              <span>Esterilizado</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="petForm.is_available"
                name="is_available"
                [disabled]="isLoading()"
              />
              <span>Disponible para adopción</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [checked]="!petForm.is_available"
                name="is_adopted"
                [disabled]="isLoading()"
                (change)="onAdoptedChange($event)"
              />
              <span>Marcar como adoptado</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingPet() ? 'Actualizar' : 'Crear'"
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
      .admin-panel-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
        min-height: calc(100vh - 200px);
      }

      .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .admin-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        position: relative;
        z-index: 10;
      }

      ::ng-deep .header-actions p-button button {
        cursor: pointer !important;
        pointer-events: auto !important;
      }

      .stats-card {
        margin-bottom: 2rem;
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
        padding: 1.5rem;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .stat-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 600;
        text-align: center;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
      }

      .stat-available {
        color: #10b981;
      }

      .stat-adopted {
        color: #ef4444;
      }

      .table-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .species-badge {
        padding: 0.25rem 0.75rem;
        background: #fbbf24;
        color: #000000;
        border-radius: 0.375rem;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .pet-form {
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

      ::ng-deep .pet-description-textarea,
      ::ng-deep .pet-photos-textarea {
        min-height: 100px !important;
        height: auto !important;
        overflow-y: auto !important;
        resize: vertical;
      }

      ::ng-deep .pet-description-textarea {
        min-height: 120px !important;
      }

      ::ng-deep .pet-photos-textarea {
        min-height: 80px !important;
        font-family: monospace;
        font-size: 0.875rem;
      }

      .form-hint {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        color: #6b7280;
        font-style: italic;
      }

      .photos-preview {
        margin-top: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .photos-count {
        margin: 0 0 0.75rem 0;
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 600;
      }

      .photos-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 0.75rem;
      }

      .photo-item {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 0.5rem;
        overflow: hidden;
        border: 2px solid #e5e7eb;
      }

      .photo-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .remove-photo-btn {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: bold;
        transition: all 0.2s ease;
      }

      .remove-photo-btn:hover:not(:disabled) {
        background: rgba(239, 68, 68, 1);
        transform: scale(1.1);
      }

      .remove-photo-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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

      ::ng-deep .p-card .p-card-header h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      ::ng-deep .p-card .p-card-body {
        padding: 1.5rem;
      }

      @media (max-width: 768px) {
        .admin-panel-container {
          padding: 1rem;
        }

        .admin-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .admin-title {
          font-size: 1.75rem;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminPanelComponent implements OnInit {
  private authService = inject(AuthWrapperService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  public petsStore = inject(PetsStore);
  public foundationsStore = inject(FoundationsStore);

  public showPetDialog = signal(false);
  public editingPet = signal<Pet | null>(null);
  public isLoading = signal(false);
  public isCreatingExamples = signal(false);
  public globalFilter = signal('');

  public petForm: Partial<Pet> = {
    name: '',
    species: 'dog',
    gender: 'M',
    size: 'medium',
    age: undefined,
    breed: '',
    color: '',
    weight: undefined,
    description: '',
    health_status: '',
    location_type: '',
    location_detail: '',
    foundation_id: '',
    photos: [],
    personality: [],
    is_vaccinated: false,
    is_sterilized: false,
    is_available: true,
  };

  public photoUrls = signal<string>('');

  // Opciones editables usando signals
  public speciesOptions = signal<EditableOption[]>([
    { label: 'Perro', value: 'dog' },
    { label: 'Gato', value: 'cat' },
    { label: 'Otro', value: 'other' },
  ]);

  public genderOptions = signal<EditableOption[]>([
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ]);

  public sizeOptions = signal<EditableOption[]>([
    { label: 'Pequeño', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ]);

  public locationTypeOptions = signal<EditableOption[]>([
    { label: 'Tienda', value: 'Tienda' },
    { label: 'Sede', value: 'Sede' },
    { label: 'Hogar temporal', value: 'Hogar temporal' },
    { label: 'Refugio', value: 'Refugio' },
    { label: 'Otro', value: 'Otro' },
  ]);

  public healthStatusOptions = signal<EditableOption[]>([
    { label: 'Saludable', value: 'Saludable' },
    { label: 'En tratamiento', value: 'En tratamiento' },
    { label: 'Necesita atención especial', value: 'Necesita atención especial' },
    { label: 'Recuperación', value: 'Recuperación' },
  ]);

  public personalityOptions = [
    { label: 'Juguetón', value: 'jugueton' },
    { label: 'Tranquilo', value: 'tranquilo' },
    { label: 'Cariñoso', value: 'carinoso' },
    { label: 'Independiente', value: 'independiente' },
    { label: 'Sociable', value: 'sociable' },
    { label: 'Activo', value: 'activo' },
    { label: 'Protector', value: 'protector' },
    { label: 'Tímido', value: 'timido' },
    { label: 'Curioso', value: 'curioso' },
    { label: 'Energético', value: 'energetico' },
    { label: 'Dócil', value: 'docil' },
  ];

  public foundations = computed(() => this.foundationsStore.entities());

  public totalPets = computed(() => this.petsStore.entities().length);
  public availablePets = computed(
    () => this.petsStore.entities().filter((p) => p.is_available).length
  );
  public adoptedPets = computed(
    () => this.petsStore.entities().filter((p) => !p.is_available).length
  );

  ngOnInit(): void {
    // El guard ya verifica autenticación y admin, pero verificamos aquí también por seguridad
    this.authService.isAuthenticated$.subscribe((isAuth) => {
      if (!isAuth) {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail: 'Debes iniciar sesión para acceder a esta sección',
        });
        this.router.navigate(['/auth/login']);
        return;
      }

      // Verificar si es admin usando el método del servicio
      if (!this.authService.isAdmin()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail: 'No tienes permisos de administrador para acceder a esta sección',
        });
        this.router.navigate(['/adoptions']);
      }
    });
  }

  getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
    // La tabla de PrimeNG manejará el filtro automáticamente
  }

  createExamplePets(): void {
    this.isCreatingExamples.set(true);
    
    const foundationsList = this.foundations();
    let foundationId: string;

    // Si no hay fundaciones, crear una de ejemplo primero
    if (foundationsList.length === 0) {
      const exampleFoundation: Partial<Foundation> = {
        name: 'Fundación Black Dog',
        description: 'Fundación dedicada al rescate y adopción de mascotas',
        address: 'Panamá, Ciudad de Panamá',
        phone_number: '+507 1234-5678',
        email: 'contacto@blackdogpanama.com',
        website: 'https://blackdogpanama.com',
        is_active: true,
      };

      this.foundationsStore.createItem(exampleFoundation as Foundation).subscribe({
        next: (foundations) => {
          foundationId = foundations[0].id;
          this.createPetsWithFoundation(foundationId);
        },
        error: (error) => {
          this.isCreatingExamples.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la fundación de ejemplo: ' + (error.message || 'Error desconocido'),
          });
        },
      });
      return;
    }

    foundationId = foundationsList[0].id;
    this.createPetsWithFoundation(foundationId);
  }

  private createPetsWithFoundation(foundationId: string): void {

    // Ejemplo 1: Perro completo
    const examplePet1: Partial<Pet> = {
      name: 'Max',
      species: 'dog',
      gender: 'M',
      size: 'large',
      age: 3.5,
      breed: 'Labrador Retriever',
      color: 'Dorado',
      weight: 28.5,
      description:
        'Max es un perro muy amigable y juguetón. Le encanta estar con niños y es muy obediente. Tiene mucha energía y necesita ejercicio diario. Es perfecto para familias activas.',
      health_status: 'Saludable',
      location_type: 'Sede',
      location_detail: 'ME ENCUENTRO EN LA SEDE DE LAS VILLAS',
      foundation_id: foundationId,
      photos: [
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
      ],
      is_vaccinated: true,
      is_sterilized: true,
      is_available: true,
    };

    // Ejemplo 2: Gato completo
    const examplePet2: Partial<Pet> = {
      name: 'Luna',
      species: 'cat',
      gender: 'F',
      size: 'small',
      age: 2.0,
      breed: 'Persa',
      color: 'Blanco y Gris',
      weight: 4.2,
      description:
        'Luna es una gata muy cariñosa y tranquila. Le encanta acurrucarse y recibir mimos. Es perfecta para personas que buscan una compañera tranquila. Se lleva bien con otros gatos.',
      health_status: 'En tratamiento',
      location_type: 'Tienda',
      location_detail: 'Tienda Principal - Área de adopciones',
      foundation_id: foundationId,
      photos: [
        'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800',
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
        'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=800',
      ],
      is_vaccinated: true,
      is_sterilized: true,
      is_available: true,
    };

    // Crear ambas mascotas
    let completed = 0;
    const total = 2;

    const handleComplete = () => {
      completed++;
      if (completed === total) {
        this.isCreatingExamples.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Ejemplos creados',
          detail: 'Se han creado 2 mascotas de ejemplo con todos los datos',
        });
      }
    };

    const handleError = (error: any) => {
      console.error('❌ [AdminPanel] Error al crear mascota:', error);
      const errorMessage = error.error?.message || error.message || 'No se pudo crear la mascota de ejemplo';
      const errorDetails = error.error?.details || error.error?.hint || '';
      this.messageService.add({
        severity: 'error',
        summary: 'Error al crear mascota',
        detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
      });
      completed++;
      if (completed === total) {
        this.isCreatingExamples.set(false);
      }
    };

    this.petsStore.createItem(examplePet1 as Pet).subscribe({
      next: handleComplete,
      error: handleError,
    });

    this.petsStore.createItem(examplePet2 as Pet).subscribe({
      next: handleComplete,
      error: handleError,
    });
  }

  openNewPetDialog(): void {
    this.editingPet.set(null);
    this.resetForm();
    this.showPetDialog.set(true);
  }

  openEditDialog(pet: Pet): void {
    this.editingPet.set(pet);
    this.petForm = {
      name: pet.name,
      species: pet.species,
      gender: pet.gender,
      size: pet.size,
      age: pet.age,
      breed: pet.breed || '',
      color: pet.color || '',
      weight: pet.weight,
      description: pet.description || '',
      health_status: pet.health_status || '',
      location_type: pet.location_type || '',
      location_detail: pet.location_detail || '',
      foundation_id: pet.foundation_id,
      photos: pet.photos ? [...pet.photos] : [],
      personality: pet.personality ? [...pet.personality] : [],
      is_vaccinated: pet.is_vaccinated,
      is_sterilized: pet.is_sterilized,
      is_available: pet.is_available,
    };
    // Actualizar el textarea de fotos con las URLs separadas por líneas
    this.photoUrls.set(pet.photos ? pet.photos.join('\n') : '');
    this.showPetDialog.set(true);
  }

  resetForm(): void {
    this.petForm = {
      name: '',
      species: 'dog',
      gender: 'M',
      size: 'medium',
      age: undefined,
      breed: '',
      color: '',
      weight: undefined,
      description: '',
      health_status: '',
      location_type: '',
      location_detail: '',
      foundation_id: '',
      photos: [],
      personality: [],
      is_vaccinated: false,
      is_sterilized: false,
      is_available: true,
    };
    this.photoUrls.set('');
    this.editingPet.set(null);
    this.showPetDialog.set(false);
  }

  onAdoptedChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.petForm.is_available = !target.checked;
  }

  updatePhotos(urlsText: string): void {
    // Actualizar el signal del textarea
    this.photoUrls.set(urlsText);
    // Convertir el texto del textarea en un array de URLs
    const urls = urlsText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    this.petForm.photos = urls;
  }

  removePhoto(index: number): void {
    if (this.petForm.photos) {
      this.petForm.photos = this.petForm.photos.filter((_, i) => i !== index);
      // Actualizar el textarea
      this.photoUrls.set(this.petForm.photos.join('\n'));
    }
  }

  savePet(): void {
    if (
      !this.petForm.name ||
      !this.petForm.species ||
      !this.petForm.foundation_id
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const pet = this.editingPet();
    if (pet) {
      // Filtrar solo los campos válidos para la base de datos
      const validFields: Partial<Pet> = {
        id: pet.id,
        name: this.petForm.name,
        species: this.petForm.species,
        gender: this.petForm.gender,
        size: this.petForm.size,
        age: this.petForm.age,
        breed: this.petForm.breed || undefined,
        color: this.petForm.color || undefined,
        weight: this.petForm.weight,
        description: this.petForm.description || undefined,
        health_status: this.petForm.health_status || undefined,
        location_type: this.petForm.location_type || undefined,
        location_detail: this.petForm.location_detail || undefined,
        foundation_id: this.petForm.foundation_id,
        photos: this.petForm.photos && this.petForm.photos.length > 0 ? this.petForm.photos : undefined,
        personality: this.petForm.personality && this.petForm.personality.length > 0 ? this.petForm.personality : undefined,
        is_vaccinated: this.petForm.is_vaccinated,
        is_sterilized: this.petForm.is_sterilized,
        is_available: this.petForm.is_available,
      };
      
      // Actualizar mascota existente
      this.petsStore
        .editItem(validFields as Pet)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Mascota actualizada',
              detail: 'La mascota se ha actualizado correctamente',
            });
            this.resetForm();
            this.isLoading.set(false);
          },
          error: (error: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.message || 'No se pudo actualizar la mascota',
            });
            this.isLoading.set(false);
          },
        });
    } else {
      // Filtrar solo los campos válidos para la base de datos
      const validFields: Partial<Pet> = {
        name: this.petForm.name,
        species: this.petForm.species,
        gender: this.petForm.gender,
        size: this.petForm.size,
        age: this.petForm.age,
        breed: this.petForm.breed || undefined,
        color: this.petForm.color || undefined,
        weight: this.petForm.weight,
        description: this.petForm.description || undefined,
        health_status: this.petForm.health_status || undefined,
        location_type: this.petForm.location_type || undefined,
        location_detail: this.petForm.location_detail || undefined,
        foundation_id: this.petForm.foundation_id,
        photos: this.petForm.photos && this.petForm.photos.length > 0 ? this.petForm.photos : undefined,
        personality: this.petForm.personality && this.petForm.personality.length > 0 ? this.petForm.personality : undefined,
        is_vaccinated: this.petForm.is_vaccinated,
        is_sterilized: this.petForm.is_sterilized,
        is_available: this.petForm.is_available,
      };
      
      // Crear nueva mascota
      this.petsStore.createItem(validFields as Pet).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Mascota creada',
            detail: 'La mascota se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear la mascota',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  toggleAvailability(pet: Pet): void {
    this.isLoading.set(true);

    this.petsStore
      .editItem({
        ...pet,
        is_available: !pet.is_available,
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Estado actualizado',
            detail: `La mascota ahora está ${
              pet.is_available ? 'adoptada' : 'disponible'
            }`,
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

  // Métodos helper para manejar cambios de valor con validación de tipos
  onSpeciesChange(value: string | null): void {
    if (!value) {
      this.petForm.species = undefined;
      return;
    }
    const validSpecies: ('dog' | 'cat' | 'other')[] = ['dog', 'cat', 'other'];
    if (validSpecies.includes(value as 'dog' | 'cat' | 'other')) {
      this.petForm.species = value as 'dog' | 'cat' | 'other';
    } else {
      this.petForm.species = 'dog'; // Valor por defecto
    }
  }

  onGenderChange(value: string | null): void {
    if (!value) {
      this.petForm.gender = 'M'; // Valor por defecto
      return;
    }
    this.petForm.gender = (value === 'F' ? 'F' : 'M') as 'M' | 'F';
  }

  onSizeChange(value: string | null): void {
    if (!value) {
      this.petForm.size = 'medium'; // Valor por defecto
      return;
    }
    const validSizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    if (validSizes.includes(value as 'small' | 'medium' | 'large')) {
      this.petForm.size = value as 'small' | 'medium' | 'large';
    } else {
      this.petForm.size = 'medium'; // Valor por defecto
    }
  }
}
