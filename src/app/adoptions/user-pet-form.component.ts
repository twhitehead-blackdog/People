import { Component, inject, OnInit, signal, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumber } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { PhotoGalleryComponent } from '../shared/photo-gallery.component';
import { BreedSelectorComponent, BreedData } from './breed-selector.component';
import { AgeSelectorComponent, AgeData } from './age-selector.component';
import { UserPet } from '../models';
import { UserPetsStore } from '../stores/user-pets.store';
import { PersonalityTraitsStore } from '../stores/personality-traits.store';
import { AuthWrapperService } from '../auth/auth-wrapper.service';

@Component({
  selector: 'pt-user-pet-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    Button,
    DropdownModule,
    InputNumber,
    MultiSelectModule,
    TextareaModule,
    ToastModule,
    CheckboxModule,
    PhotoGalleryComponent,
    BreedSelectorComponent,
    AgeSelectorComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="user-pet-form-container">
      <div class="form-header">
        <h2 class="form-title">🐾 {{ isEditMode() ? 'Editar' : 'Añadir' }} Mascota</h2>
        <p class="form-subtitle">
          {{ isEditMode() ? 'Actualiza la información de tu mascota' : 'Completa el formulario con los detalles de tu mascota' }}
        </p>
      </div>

      <form (ngSubmit)="savePet()" class="user-pet-form">
        <!-- Información Básica -->
        <div class="form-section">
          <h3 class="section-title">📋 Información Básica</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="name">Nombre de la Mascota *</label>
              <input
                id="name"
                type="text"
                pInputText
                [(ngModel)]="petForm.name"
                name="name"
                required
                [disabled]="isLoading()"
                placeholder="Ej: Max, Luna, etc."
              />
            </div>

            <div class="form-group">
              <label for="species">Especie *</label>
              <p-dropdown
                id="species"
                name="species"
                [(ngModel)]="petForm.species"
                [options]="speciesOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar especie"
                [disabled]="isLoading()"
                (onChange)="onSpeciesChange()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Raza *</label>
            <pt-breed-selector
              [species]="petForm.species || 'dog'"
              [initialBreed]="initialBreedData()"
              (breedChanged)="onBreedDataChange($event)"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Edad *</label>
              <pt-age-selector
                [initialAge]="initialAgeData()"
                (ageChanged)="onAgeDataChange($event)"
              />
            </div>

            <div class="form-group">
              <label for="gender">Género *</label>
              <p-dropdown
                id="gender"
                name="gender"
                [(ngModel)]="petForm.gender"
                [options]="genderOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar género"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="size">Tamaño *</label>
              <p-dropdown
                id="size"
                name="size"
                [(ngModel)]="petForm.size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tamaño"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
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
                [disabled]="isLoading()"
                placeholder="Ej: Negro, Blanco, etc."
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="weight">Peso (Kg)</label>
              <p-inputNumber
                id="weight"
                [(ngModel)]="petForm.weight"
                name="weight"
                mode="decimal"
                [min]="0"
                [max]="100"
                [step]="0.1"
                placeholder="0.0"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>
        </div>

        <!-- Descripción y Salud -->
        <div class="form-section">
          <h3 class="section-title">💚 Descripción y Salud</h3>
          
          <div class="form-group">
            <label for="description">Descripción</label>
            <textarea
              id="description"
              pTextarea
              [(ngModel)]="petForm.description"
              name="description"
              rows="4"
              [disabled]="isLoading()"
              placeholder="Cuéntanos sobre tu mascota..."
              [autoResize]="true"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="health_status">Estado de Salud</label>
            <input
              id="health_status"
              type="text"
              pInputText
              [(ngModel)]="petForm.health_status"
              name="health_status"
              [disabled]="isLoading()"
              placeholder="Ej: Excelente, Bueno, etc."
            />
          </div>

          <div class="form-row">
            <div class="form-group checkbox-group">
              <p-checkbox
                [(ngModel)]="petForm.is_vaccinated"
                name="is_vaccinated"
                [binary]="true"
                inputId="is_vaccinated"
                [disabled]="isLoading()"
              />
              <label for="is_vaccinated" class="checkbox-label">💉 Vacunado</label>
            </div>

            <div class="form-group checkbox-group">
              <p-checkbox
                [(ngModel)]="petForm.is_sterilized"
                name="is_sterilized"
                [binary]="true"
                inputId="is_sterilized"
                [disabled]="isLoading()"
              />
              <label for="is_sterilized" class="checkbox-label">✂️ Esterilizado</label>
            </div>
          </div>
        </div>

        <!-- Personalidad -->
        <div class="form-section">
          <h3 class="section-title">✨ Personalidad</h3>
          
          <div class="form-group">
            <label for="personality">Rasgos de Personalidad</label>
            <p-multiSelect
              id="personality"
              name="personality"
              [(ngModel)]="petForm.personality"
              [options]="personalityOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione una o más opciones..."
              [displaySelectedLabel]="true"
              [maxSelectedLabels]="3"
              [showToggleAll]="false"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <!-- Fotos -->
        <div class="form-section">
          <h3 class="section-title">📷 Fotos</h3>
          
          <div class="form-group">
            <pt-photo-gallery
              [initialPhotos]="petForm.photos || []"
              [maxPhotos]="10"
              [folder]="'user-pets'"
              [autoUpload]="true"
              (photosChange)="onPhotosChange($event)"
            />
          </div>
        </div>

        <!-- Acciones -->
        <div class="form-actions">
          <p-button
            type="submit"
            [label]="isEditMode() ? 'Actualizar Mascota' : 'Guardar Mascota'"
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
            (onClick)="cancel()"
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
    </div>
  `,
  styles: [
    `
      .user-pet-form-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
      }

      .form-header {
        margin-bottom: 2rem;
        text-align: center;
      }

      .form-title {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
      }

      .form-subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .user-pet-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .form-section {
        background: #f9fafb;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #000000;
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #fbbf24;
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

      .checkbox-group {
        flex-direction: row;
        align-items: center;
        gap: 0.75rem;
      }

      .checkbox-label {
        margin: 0;
        cursor: pointer;
        font-weight: 500;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 2px solid #e5e7eb;
      }

      @media (max-width: 768px) {
        .user-pet-form-container {
          padding: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class UserPetFormComponent implements OnInit {
  private userPetsStore = inject(UserPetsStore);
  private personalityTraitsStore = inject(PersonalityTraitsStore);
  private authWrapper = inject(AuthWrapperService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public isLoading = signal(false);
  public petId = signal<string | null>(null);
  public isEditMode = computed(() => this.petId() !== null);

  public petForm: Partial<UserPet> = {
    name: '',
    species: 'dog',
    breed_type: 'none',
    gender: 'M',
    size: 'medium',
    personality: [],
    photos: [],
    is_vaccinated: false,
    is_sterilized: false,
  };

  public speciesOptions = [
    { label: '🐕 Perro', value: 'dog' },
    { label: '🐱 Gato', value: 'cat' },
    { label: '🐾 Otro', value: 'other' },
  ];

  public genderOptions = [
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ];

  public sizeOptions = [
    { label: 'Pequeño', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ];

  public personalityOptions = computed(() => {
    return this.personalityTraitsStore.entities().map((trait) => ({
      label: trait.label,
      value: trait.id,
    }));
  });

  public initialBreedData = signal<BreedData | null>(null);
  public initialAgeData = signal<AgeData | null>(null);

  ngOnInit(): void {
    const routePetId = this.route.snapshot.paramMap.get('id');
    if (routePetId) {
      this.petId.set(routePetId);
      this.loadPet(routePetId);
    }
  }

  private loadPet(id: string): void {
    this.isLoading.set(true);
    // Buscar la mascota en myPets o entityMap
    const pet = this.userPetsStore.myPets().find((p: UserPet) => p.id === id) || this.userPetsStore.entityMap()[id];
    if (pet) {
      this.petForm = { ...pet };
      this.initialBreedData.set({
        breed_type: pet.breed_type || 'none',
        breed_primary: pet.breed_primary,
        breed_secondary: pet.breed_secondary,
        breed_percentage_primary: pet.breed_percentage_primary,
        breed_percentage_secondary: pet.breed_percentage_secondary,
      });
      this.initialAgeData.set({
        age_mode: pet.birth_date ? 'birthday' : 'years_months',
        age_years: pet.age_years,
        age_months: pet.age_months,
        birth_date: pet.birth_date ? (typeof pet.birth_date === 'string' ? new Date(pet.birth_date) : pet.birth_date) : undefined,
      });
      this.isLoading.set(false);
    } else {
      // Si no está, intentar cargarla usando selectEntity
      this.userPetsStore.selectEntity(id);
      // Esperar un momento y buscar de nuevo
      setTimeout(() => {
        const loadedPet = this.userPetsStore.entityMap()[id];
        if (loadedPet) {
          this.petForm = { ...loadedPet };
          this.initialBreedData.set({
            breed_type: loadedPet.breed_type || 'none',
            breed_primary: loadedPet.breed_primary,
            breed_secondary: loadedPet.breed_secondary,
            breed_percentage_primary: loadedPet.breed_percentage_primary,
            breed_percentage_secondary: loadedPet.breed_percentage_secondary,
          });
          this.initialAgeData.set({
            age_mode: loadedPet.birth_date ? 'birthday' : 'years_months',
            age_years: loadedPet.age_years,
            age_months: loadedPet.age_months,
            birth_date: loadedPet.birth_date ? (typeof loadedPet.birth_date === 'string' ? new Date(loadedPet.birth_date) : loadedPet.birth_date) : undefined,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la mascota',
          });
        }
        this.isLoading.set(false);
      }, 500);
    }
  }

  public onSpeciesChange(): void {
    // Reset breed data when species changes
    this.initialBreedData.set(null);
  }

  public onBreedDataChange(data: BreedData): void {
    this.petForm.breed_type = data.breed_type;
    this.petForm.breed_primary = data.breed_primary;
    this.petForm.breed_secondary = data.breed_secondary;
    this.petForm.breed_percentage_primary = data.breed_percentage_primary;
    this.petForm.breed_percentage_secondary = data.breed_percentage_secondary;
  }

  public onAgeDataChange(data: AgeData): void {
    this.petForm.age_years = data.age_years;
    this.petForm.age_months = data.age_months;
    this.petForm.birth_date = data.birth_date ? (typeof data.birth_date === 'string' ? new Date(data.birth_date) : data.birth_date) : undefined;
  }

  public onPhotosChange(photos: string[]): void {
    this.petForm.photos = photos;
  }

  public async savePet(): Promise<void> {
    const currentUser = this.authWrapper.currentUser();
    if (!currentUser?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes iniciar sesión para guardar una mascota',
      });
      return;
    }

    this.isLoading.set(true);
    try {
      const petData: Partial<UserPet> = {
        ...this.petForm,
        user_id: currentUser.id,
      };

      if (this.isEditMode() && this.petId()) {
        const fullPetData: UserPet = {
          ...petData,
          id: this.petId()!,
        } as UserPet;
        await this.userPetsStore.editItem(fullPetData).toPromise();
        this.messageService.add({
          severity: 'success',
          summary: '¡Éxito!',
          detail: 'Mascota actualizada correctamente',
        });
      } else {
        const fullPetData: UserPet = {
          ...petData,
          id: crypto.randomUUID(),
        } as UserPet;
        await this.userPetsStore.createItem(fullPetData).toPromise();
        this.messageService.add({
          severity: 'success',
          summary: '¡Éxito!',
          detail: 'Mascota guardada correctamente',
        });
      }

      this.router.navigate(['/adoptions/profile']);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo guardar la mascota',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  public cancel(): void {
    this.router.navigate(['/adoptions/profile']);
  }
}

