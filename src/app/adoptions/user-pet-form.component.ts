import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    <div class="user-pet-form-section">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-background-elements">
          <div class="animated-emoji emoji-1">ðŸ•</div>
          <div class="animated-emoji emoji-2">ðŸ’•</div>
          <div class="animated-emoji emoji-3">ðŸ±</div>
          <div class="animated-emoji emoji-4">âœ¨</div>
        </div>

        <div class="hero-content">
          <div class="hero-text">
            <div class="hero-title-wrapper">
              <div class="heart-icon-wrapper heart-1">
                <span class="heart-icon">â¤ï¸</span>
                <span class="sparkle-icon sparkle-1">âœ¨</span>
              </div>
              <h1 class="hero-title">{{ isEditMode() ? 'EDITAR MASCOTA' : 'AÃ‘ADIR MASCOTA' }}</h1>
              <div class="heart-icon-wrapper heart-2">
                <span class="heart-icon">â¤ï¸</span>
                <span class="sparkle-icon sparkle-2">âœ¨</span>
              </div>
            </div>
            
            <p class="hero-subtitle">
              {{ isEditMode() ? 'ðŸ’ Actualiza la informaciÃ³n de tu mascota ðŸ¾' : 'ðŸ’ Completa el formulario con los detalles de tu mascota ðŸ¾' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form Container -->
      <div class="user-pet-form-container">
      <form (ngSubmit)="savePet()" class="user-pet-form">
        <!-- InformaciÃ³n BÃ¡sica -->
        <div class="form-section">
          <h3 class="section-title">ðŸ“‹ InformaciÃ³n BÃ¡sica</h3>
          
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
              <label for="gender">GÃ©nero *</label>
              <p-dropdown
                id="gender"
                name="gender"
                [(ngModel)]="petForm.gender"
                [options]="genderOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar gÃ©nero"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="size">TamaÃ±o *</label>
              <p-dropdown
                id="size"
                name="size"
                [(ngModel)]="petForm.size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tamaÃ±o"
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

        <!-- DescripciÃ³n y Salud -->
        <div class="form-section">
          <h3 class="section-title">ðŸ’š DescripciÃ³n y Salud</h3>
          
          <div class="form-group">
            <label for="description">DescripciÃ³n</label>
            <textarea
              id="description"
              pTextarea
              [(ngModel)]="petForm.description"
              name="description"
              rows="4"
              [disabled]="isLoading()"
              placeholder="CuÃ©ntanos sobre tu mascota..."
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

          <div class="form-group checkbox-group">
            <p-checkbox
              [(ngModel)]="petForm.is_vaccinated"
              name="is_vaccinated"
              [binary]="true"
              inputId="is_vaccinated"
              [disabled]="isLoading()"
            />
            <label for="is_vaccinated" class="checkbox-label">ðŸ’‰ Vacunado</label>
          </div>
        </div>

        <!-- Personalidad -->
        <div class="form-section">
          <h3 class="section-title">âœ¨ Personalidad</h3>
          
          <div class="form-group">
            <label for="personality">Rasgos de Personalidad</label>
            <p-multiSelect
              id="personality"
              name="personality"
              [(ngModel)]="petForm.personality"
              [options]="personalityOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione una o mÃ¡s opciones..."
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
          <h3 class="section-title">ðŸ“· Fotos</h3>
          
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
              background: 'linear-gradient(to right, #374151, #FBBF24)',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              padding: '0.75rem 2rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 16px rgba(251, 191, 36, 0.4)'
            }"
          />
          <p-button
            type="button"
            label="Cancelar"
            severity="secondary"
            (onClick)="cancel()"
            [disabled]="isLoading()"
            [style]="{
              background: '#ffffff',
              border: '1px solid rgba(55, 65, 81, 0.3)',
              color: '#374151',
              fontWeight: '600',
              padding: '0.75rem 2rem',
              borderRadius: '0.75rem'
            }"
          />
        </div>
      </form>
      </div>
    </div>
  `,
  styles: [
    `
      .user-pet-form-section {
        width: 100%;
        background: linear-gradient(to bottom, #f0f2f5 0%, #ffffff 50%, #f0f2f5 100%);
        min-height: 100vh;
      }

      /* Hero Section */
      .hero-section {
        background: linear-gradient(135deg, #374151 0%, #000000 50%, #374151 100%);
        padding: 4rem 2rem;
        position: relative;
        overflow: hidden;
        border-bottom: 4px solid #FBBF24;
      }

      .hero-background-elements {
        position: absolute;
        inset: 0;
        overflow: hidden;
        opacity: 0.2;
        pointer-events: none;
      }

      .animated-emoji {
        position: absolute;
        font-size: 3rem;
        animation: bounce 2s ease-in-out infinite;
      }

      .emoji-1 {
        top: 2.5rem;
        left: 2.5rem;
        animation-delay: 0s;
      }

      .emoji-2 {
        top: 5rem;
        right: 5rem;
        animation-delay: 0.5s;
      }

      .emoji-3 {
        bottom: 5rem;
        left: 25%;
        animation-delay: 1s;
      }

      .emoji-4 {
        bottom: 2.5rem;
        right: 33%;
        animation-delay: 1.5s;
      }

      @keyframes bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-20px);
        }
      }

      .hero-content {
        max-width: 1280px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 10;
      }

      .hero-text {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        position: relative;
        z-index: 10;
        text-align: center;
        max-width: 1024px;
      }

      .hero-title-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .heart-icon-wrapper {
        position: relative;
      }

      .heart-icon {
        font-size: 4rem;
        display: block;
        animation: pulse 2s ease-in-out infinite;
      }

      .heart-2 .heart-icon {
        animation-delay: 0.5s;
      }

      .sparkle-icon {
        position: absolute;
        font-size: 2rem;
        animation: spin 3s linear infinite;
      }

      .sparkle-1 {
        top: -0.5rem;
        right: -0.5rem;
      }

      .sparkle-2 {
        bottom: -0.5rem;
        left: -0.5rem;
        animation-delay: 1s;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      .hero-title {
        font-size: 3rem;
        font-weight: 700;
        background: linear-gradient(to right, #FBBF24 0%, #ffffff 50%, #FBBF24 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1.2;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .hero-subtitle {
        font-size: 1.25rem;
        color: #FBBF24;
        line-height: 1.6;
        margin: 0;
      }

      .user-pet-form-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 3rem 2rem;
      }

      .user-pet-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .form-section {
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 1rem;
        border: 1px solid rgba(55, 65, 81, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        margin-bottom: 1.5rem;
        transition: all 0.3s ease;
      }

      .form-section:hover {
        border-color: rgba(251, 191, 36, 0.4);
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.15);
        transform: translateY(-2px);
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 700;
        background: linear-gradient(to right, #374151 0%, #FBBF24 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid rgba(251, 191, 36, 0.2);
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
      }

      /* Espacio adicional despuÃ©s del selector de raza */
      pt-breed-selector {
        display: block;
        margin-bottom: 2rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group label {
        font-weight: 600;
        color: #374151;
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

      /* Input styles to match theme */
      ::ng-deep .user-pet-form-container .p-inputtext,
      ::ng-deep .user-pet-form-container .p-inputtextarea,
      ::ng-deep .user-pet-form-container .p-dropdown,
      ::ng-deep .user-pet-form-container .p-multiselect {
        border: 1px solid rgba(55, 65, 81, 0.2) !important;
        border-radius: 0.5rem !important;
        transition: all 0.3s ease !important;
      }

      ::ng-deep .user-pet-form-container .p-inputtext:focus,
      ::ng-deep .user-pet-form-container .p-inputtextarea:focus,
      ::ng-deep .user-pet-form-container .p-dropdown:focus,
      ::ng-deep .user-pet-form-container .p-multiselect:focus {
        border-color: #FBBF24 !important;
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1) !important;
      }

      /* Asegurar que los overlays de los selects tengan z-index alto */
      ::ng-deep .p-dropdown-panel {
        z-index: 1100 !important;
      }

      ::ng-deep .p-overlay {
        z-index: 1100 !important;
      }

      ::ng-deep .p-multiselect-panel {
        z-index: 1100 !important;
      }

      /* Button hover effects */
      ::ng-deep .user-pet-form-container .form-actions p-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
      }

      ::ng-deep .user-pet-form-container .form-actions p-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .user-pet-form-container .form-actions p-button[style*='#fbbf24'] button:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(251, 191, 36, 0.6), 0 0 25px rgba(251, 191, 36, 0.4) !important;
      }

      ::ng-deep .user-pet-form-container .form-actions p-button[style*='#fbbf24'] button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .user-pet-form-container .form-actions p-button[style*='#e5e7eb'] button:hover:not(:disabled) {
        background: rgba(55, 65, 81, 0.1) !important;
        border-color: #374151 !important;
        transform: translateY(-2px) !important;
      }

      @media (max-width: 768px) {
        .hero-section {
          padding: 2rem 1rem;
        }

        .hero-title {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1rem;
        }

        .heart-icon {
          font-size: 3rem;
        }

        .sparkle-icon {
          font-size: 1.5rem;
        }

        .user-pet-form-container {
          padding: 2rem 1rem;
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
    { label: 'ðŸ• Perro', value: 'dog' },
    { label: 'ðŸ± Gato', value: 'cat' },
    { label: 'ðŸ¾ Otro', value: 'other' },
  ];

  public genderOptions = [
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ];

  public sizeOptions = [
    { label: 'PequeÃ±o', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ];

  public personalityOptions = computed(() => {
    const traits = this.personalityTraitsStore.activeTraits();
    if (traits.length === 0) {
      // Fallback a opciones estÃ¡ticas si no hay datos en el store
      return [
        { label: 'JuguetÃ³n', value: 'jugueton' },
        { label: 'Tranquilo', value: 'tranquilo' },
        { label: 'CariÃ±oso', value: 'carinoso' },
        { label: 'Independiente', value: 'independiente' },
        { label: 'Sociable', value: 'sociable' },
        { label: 'Activo', value: 'activo' },
        { label: 'Protector', value: 'protector' },
        { label: 'TÃ­mido', value: 'timido' },
        { label: 'Curioso', value: 'curioso' },
        { label: 'EnergÃ©tico', value: 'energetico' },
        { label: 'DÃ³cil', value: 'docil' },
        { label: 'Amigable', value: 'amigable' },
        { label: 'Inteligente', value: 'inteligente' },
        { label: 'Leal', value: 'leal' },
        { label: 'Travieso', value: 'travieso' },
      ];
    }
    return traits.map((trait) => ({
      label: trait.label,
      value: trait.value || trait.id,
    }));
  });

  public initialBreedData = signal<BreedData | null>(null);
  public initialAgeData = signal<AgeData | null>(null);

  ngOnInit(): void {
    // Cargar rasgos de personalidad
    this.personalityTraitsStore.fetchItems();
    
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
      // Si no estÃ¡, intentar cargarla usando selectEntity
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
        detail: 'Debes iniciar sesiÃ³n para guardar una mascota',
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
          summary: 'Â¡Ã‰xito!',
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
          summary: 'Â¡Ã‰xito!',
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





