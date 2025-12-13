import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PetMatch, UserPet } from '../models';
import { PetMatchesStore } from '../stores/pet-matches.store';
import { UserPetsStore } from '../stores/user-pets.store';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { PersonalityTraitsStore } from '../stores/personality-traits.store';
import { PhotoGalleryComponent } from '../shared/photo-gallery.component';
import { BreedSelectorComponent, BreedData } from './breed-selector.component';
import { AgeSelectorComponent, AgeData } from './age-selector.component';

@Component({
  selector: 'pt-pet-match-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DialogModule,
    InputTextModule,
    InputNumber,
    TextareaModule,
    DropdownModule,
    MultiSelectModule,
    ToastModule,
    PhotoGalleryComponent,
    BreedSelectorComponent,
    AgeSelectorComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="pet-match-form-container">
      <div class="form-header">
        <h2>Publicar Mascota Buscando Pareja</h2>
        <p class="form-subtitle">
          Completa el formulario con los detalles de tu mascota para encontrar la pareja perfecta
        </p>
      </div>

      <form (ngSubmit)="savePetMatch()" class="pet-match-form">
        <!-- Selector de Mascota del Perfil -->
        @if (myPets().length > 0) {
          <div class="form-section highlight-section">
            <h3 class="section-title">🐾 Selecciona una Mascota de tu Perfil</h3>
            <div class="form-group">
              <p-dropdown
                [(ngModel)]="selectedPetId"
                [options]="petOptions()"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecciona una mascota o crea una nueva publicación"
                [showClear]="true"
                (onChange)="onPetSelected()"
                [style]="{ width: '100%' }"
              />
              <small class="form-hint">
                💡 Si seleccionas una mascota, el formulario se llenará automáticamente con sus datos
              </small>
            </div>
          </div>
        }

        <div class="form-section">
          <h3 class="section-title">📋 Información Básica</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="pet_name">Nombre de la mascota *</label>
              <input
                id="pet_name"
                type="text"
                pInputText
                [(ngModel)]="petMatchForm.pet_name"
                name="pet_name"
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
                [(ngModel)]="petMatchForm.species"
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
              [species]="petMatchForm.species || 'dog'"
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
                [(ngModel)]="petMatchForm.gender"
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
                [(ngModel)]="petMatchForm.size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tamaño"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="color">Color</label>
              <input
                id="color"
                type="text"
                pInputText
                [(ngModel)]="petMatchForm.color"
                name="color"
                [disabled]="isLoading()"
                placeholder="Ej: Negro, Blanco, Marrón"
              />
            </div>

            <div class="form-group">
              <label for="weight">Peso (Kg)</label>
              <p-inputNumber
                id="weight"
                name="weight"
                [(ngModel)]="petMatchForm.weight"
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

        <div class="form-section">
          <h3 class="section-title">Preferencias de Pareja</h3>
          
          <div class="form-group">
            <label for="preferred_breed_match">¿Qué tipo de pareja buscas? *</label>
            <p-dropdown
              id="preferred_breed_match"
              name="preferred_breed_match"
              [(ngModel)]="petMatchForm.preferred_breed_match"
              [options]="preferredBreedMatchOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar preferencia"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
            <small class="form-hint">
              Indica si buscas pareja de la misma raza, diferente raza, o cualquier raza
            </small>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Descripción y Detalles</h3>
          
          <div class="form-group">
            <label for="description">Descripción</label>
            <textarea
              id="description"
              pTextarea
              [(ngModel)]="petMatchForm.description"
              name="description"
              [rows]="4"
              [disabled]="isLoading()"
              placeholder="Describe la personalidad, comportamiento y características especiales de tu mascota..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="health_status">Estado de Salud</label>
            <input
              id="health_status"
              type="text"
              pInputText
              [(ngModel)]="petMatchForm.health_status"
              name="health_status"
              [disabled]="isLoading()"
              placeholder="Ej: Saludable, En tratamiento, etc."
            />
          </div>

          <div class="form-group">
            <label for="personality">Personalidad</label>
            <p-multiSelect
              id="personality"
              name="personality"
              [(ngModel)]="petMatchForm.personality"
              [options]="personalityOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione una o más opciones..."
              [displaySelectedLabel]="true"
              [maxSelectedLabels]="3"
              [showToggleAll]="false"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Ubicación y Contacto</h3>
          
          <div class="form-group">
            <label for="location">Ubicación</label>
            <input
              id="location"
              type="text"
              pInputText
              [(ngModel)]="petMatchForm.location"
              name="location"
              [disabled]="isLoading()"
              placeholder="Ej: Ciudad de Panamá, San Francisco, etc."
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="contact_email">Email de contacto *</label>
              <input
                id="contact_email"
                type="email"
                pInputText
                [(ngModel)]="contactInfo.email"
                name="contact_email"
                required
                [disabled]="isLoading()"
                placeholder="tu@email.com"
              />
            </div>

            <div class="form-group">
              <label for="contact_phone">Teléfono de contacto</label>
              <input
                id="contact_phone"
                type="tel"
                pInputText
                [(ngModel)]="contactInfo.phone"
                name="contact_phone"
                [disabled]="isLoading()"
                placeholder="+507 1234-5678"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="preferred_contact">Preferencia de contacto</label>
            <p-dropdown
              id="preferred_contact"
              name="preferred_contact"
              [(ngModel)]="contactInfo.preferred_contact"
              [options]="preferredContactOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Fotos</h3>
          
          <div class="form-group">
            <pt-photo-gallery
              [initialPhotos]="petMatchForm.photos || []"
              [maxPhotos]="10"
              [folder]="'pet-matches'"
              [autoUpload]="true"
              (photosChange)="onPhotosChange($event)"
            />
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Estado de Salud</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [(ngModel)]="petMatchForm.is_vaccinated"
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
                  [(ngModel)]="petMatchForm.is_sterilized"
                  name="is_sterilized"
                  [disabled]="isLoading()"
                />
                <span>Esterilizado</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            label="Publicar"
            [loading]="isLoading()"
            [disabled]="isLoading() || !isFormValid()"
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
      .pet-match-form-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
      }

      .form-header {
        margin-bottom: 2rem;
        text-align: center;
      }

      .form-header h2 {
        font-size: 2rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0 0 0.5rem 0;
      }

      .form-subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .pet-match-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .form-section {
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid rgba(251, 191, 36, 0.3);
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

      .form-hint {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
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
        .pet-match-form-container {
          padding: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }
      }

      .highlight-section {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
        border: 2px solid #fbbf24;
      }
    `,
  ],
})
export class PetMatchFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private petMatchesStore = inject(PetMatchesStore);
  private userPetsStore = inject(UserPetsStore);
  private authWrapper = inject(AuthWrapperService);
  private personalityTraitsStore = inject(PersonalityTraitsStore);
  private messageService = inject(MessageService);

  public isLoading = signal(false);
  public selectedPetId = signal<string | null>(null);
  public myPets = this.userPetsStore.myPets;

  public petMatchForm: Partial<PetMatch> = {
    pet_name: '',
    species: 'dog',
    gender: 'M',
    size: 'medium',
    age: undefined,
    breed: '',
    breed_type: 'none',
    color: '',
    weight: undefined,
    description: '',
    health_status: '',
    location: '',
    preferred_breed_match: 'both',
    personality: [],
    photos: [],
    is_vaccinated: false,
    is_sterilized: false,
    is_active: true,
  };

  public initialBreedData = signal<BreedData | null>(null);
  public initialAgeData = signal<AgeData | null>(null);

  public contactInfo = {
    email: '',
    phone: '',
    preferred_contact: 'email' as 'email' | 'phone' | 'both',
  };

  public speciesOptions = [
    { label: 'Perro', value: 'dog' },
    { label: 'Gato', value: 'cat' },
    { label: 'Otro', value: 'other' },
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

  public preferredBreedMatchOptions = [
    { label: 'Misma raza', value: 'same' },
    { label: 'Diferente raza', value: 'different' },
    { label: 'Cualquier raza', value: 'both' },
  ];

  public preferredContactOptions = [
    { label: 'Email', value: 'email' },
    { label: 'Teléfono', value: 'phone' },
    { label: 'Ambos', value: 'both' },
  ];

  public personalityOptions = computed(() => {
    return this.personalityTraitsStore.activeTraits().map((trait) => ({
      label: trait.label,
      value: trait.value,
    }));
  });

  public petOptions = computed(() => {
    return this.myPets().map((pet: UserPet) => ({
      label: `${pet.name} - ${this.getSpeciesLabel(pet.species)} ${pet.breed_primary ? `(${pet.breed_primary})` : ''}`,
      value: pet.id,
    }));
  });

  ngOnInit(): void {
    // Pre-llenar email con el del usuario autenticado si está disponible
    const user = this.authWrapper.currentUser();
    if (user && user.email) {
      this.contactInfo.email = user.email;
    }

    // Cargar mascotas del usuario
    this.userPetsStore.fetchItems();

    // Verificar si hay un petId en los query params (viene desde el perfil)
    this.route.queryParams.subscribe((params) => {
      if (params['petId']) {
        this.selectedPetId.set(params['petId']);
        this.loadPetFromProfile(params['petId']);
      }
    });
  }

  private loadPetFromProfile(petId: string): void {
    // Buscar la mascota en myPets (ya está cargado)
    const pet = this.myPets().find((p: UserPet) => p.id === petId);
    if (pet) {
      this.fillFormFromPet(pet);
    } else {
      // Si no está, usar entityMap del store
      const petFromMap = this.userPetsStore.entityMap()[petId];
      if (petFromMap) {
        this.fillFormFromPet(petFromMap);
      }
    }
  }

  public onPetSelected(): void {
    const petId = this.selectedPetId();
    if (petId) {
      const pet = this.myPets().find((p: UserPet) => p.id === petId);
      if (pet) {
        this.fillFormFromPet(pet);
      }
    }
  }

  private fillFormFromPet(pet: UserPet): void {
    this.petMatchForm = {
      ...this.petMatchForm,
      user_pet_id: pet.id,
      pet_name: pet.name,
      species: pet.species,
      gender: pet.gender,
      size: pet.size,
      color: pet.color,
      weight: pet.weight,
      description: pet.description,
      health_status: pet.health_status,
      personality: pet.personality || [],
      photos: pet.photos || [],
      is_vaccinated: pet.is_vaccinated,
      is_sterilized: pet.is_sterilized,
      breed_type: pet.breed_type,
      breed_primary: pet.breed_primary,
      breed_secondary: pet.breed_secondary,
      breed_percentage_primary: pet.breed_percentage_primary,
      breed_percentage_secondary: pet.breed_percentage_secondary,
      birth_date: pet.birth_date,
      age_years: pet.age_years,
      age_months: pet.age_months,
      age: pet.age_years ? pet.age_years + (pet.age_months || 0) / 12 : undefined,
      breed: pet.breed_primary || '',
    };

    // Actualizar datos iniciales para los componentes
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
  }

  public onSpeciesChange(): void {
    // Reset breed data when species changes
    this.initialBreedData.set(null);
  }

  public onBreedDataChange(data: BreedData): void {
    this.petMatchForm.breed_type = data.breed_type;
    this.petMatchForm.breed_primary = data.breed_primary;
    this.petMatchForm.breed_secondary = data.breed_secondary;
    this.petMatchForm.breed_percentage_primary = data.breed_percentage_primary;
    this.petMatchForm.breed_percentage_secondary = data.breed_percentage_secondary;
    // Mantener compatibilidad con campo breed
    this.petMatchForm.breed = data.breed_primary || '';
  }

  public onAgeDataChange(data: AgeData): void {
    this.petMatchForm.age_years = data.age_years;
    this.petMatchForm.age_months = data.age_months;
    this.petMatchForm.birth_date = data.birth_date ? (typeof data.birth_date === 'string' ? new Date(data.birth_date) : data.birth_date) : undefined;
    // Mantener compatibilidad con campo age
    this.petMatchForm.age = data.age_years ? data.age_years + (data.age_months || 0) / 12 : undefined;
  }

  public getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  public isFormValid(): boolean {
    return !!(
      this.petMatchForm.pet_name &&
      this.petMatchForm.species &&
      this.petMatchForm.gender &&
      this.petMatchForm.size &&
      this.petMatchForm.preferred_breed_match &&
      this.contactInfo.email
    );
  }

  public onPhotosChange(photos: string[]): void {
    this.petMatchForm.photos = photos;
  }

  public savePetMatch(): void {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    const user = this.authWrapper.currentUser();
    if (!user || !user.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes estar autenticado para publicar una mascota',
      });
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isLoading.set(true);

    const petMatch: Partial<PetMatch> = {
      ...this.petMatchForm,
      user_id: user.id,
      contact_info: {
        email: this.contactInfo.email,
        phone: this.contactInfo.phone || undefined,
        preferred_contact: this.contactInfo.preferred_contact,
      },
    };

    this.petMatchesStore.createItem(petMatch as PetMatch).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Mascota publicada correctamente',
        });
        this.router.navigate(['/adoptions/busco-pareja']);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al publicar la mascota. Intenta de nuevo.',
        });
        console.error('Error al crear pet match:', error);
        this.isLoading.set(false);
      },
    });
  }

  public cancel(): void {
    this.router.navigate(['/adoptions/busco-pareja']);
  }
}

