import { , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DialogModule,
    InputTextModule,
    InputNumber,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
    PhotoGalleryComponent,
    BreedSelectorComponent,
    AgeSelectorComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="pet-match-form-section">
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
              <h1 class="hero-title">PUBLICAR MASCOTA</h1>
              <div class="heart-icon-wrapper heart-2">
                <span class="heart-icon">â¤ï¸</span>
                <span class="sparkle-icon sparkle-2">âœ¨</span>
              </div>
            </div>
            
            <p class="hero-subtitle">
              ðŸ’ Completa el formulario con los detalles de tu mascota para encontrar la pareja perfecta ðŸ¾
            </p>
          </div>
        </div>
      </div>

      <!-- Form Container -->
      <div class="pet-match-form-container">

      <form (ngSubmit)="savePetMatch()" class="pet-match-form">
        <!-- Selector de Mascota del Perfil -->
        @if (myPets().length > 0) {
          <div class="form-section highlight-section">
            <h3 class="section-title">ðŸ¾ Selecciona una Mascota de tu Perfil</h3>
            <div class="form-group">
              <p-select
                [(ngModel)]="selectedPetId"
                [options]="petOptions()"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecciona una mascota o crea una nueva publicaciÃ³n"
                [showClear]="true"
                (onChange)="onPetSelected()"
                [style]="{ width: '100%' }"
              />
              <small class="form-hint">
                ðŸ’¡ Si seleccionas una mascota, el formulario se llenarÃ¡ automÃ¡ticamente con sus datos
              </small>
            </div>
          </div>
        }

        <div class="form-section">
          <h3 class="section-title">ðŸ“‹ InformaciÃ³n BÃ¡sica</h3>
          
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
              <p-select
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
              <label for="gender">GÃ©nero *</label>
              <div class="gender-selector">
                <button
                  type="button"
                  class="gender-button"
                  [class.active]="petMatchForm.gender === 'M'"
                  (click)="setGender('M')"
                  [disabled]="isLoading()"
                >
                  <span class="gender-icon">â™‚ï¸</span>
                  <span>Macho</span>
                </button>
                <button
                  type="button"
                  class="gender-button"
                  [class.active]="petMatchForm.gender === 'F'"
                  (click)="setGender('F')"
                  [disabled]="isLoading()"
                >
                  <span class="gender-icon">â™€ï¸</span>
                  <span>Hembra</span>
                </button>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="size">TamaÃ±o *</label>
              <p-select
                id="size"
                name="size"
                [(ngModel)]="petMatchForm.size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tamaÃ±o"
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
                placeholder="Ej: Negro, Blanco, MarrÃ³n"
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
                mode="decimal"
                [minFractionDigits]="1"
                [maxFractionDigits]="2"
                placeholder="0.0"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Preferencias de Pareja</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="preferred_breed_match">Â¿QuÃ© tipo de pareja buscas? *</label>
              <p-select
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

            <div class="form-group">
              <label for="preferred_size">TamaÃ±o preferido</label>
              <p-select
                id="preferred_size"
                name="preferred_size"
                [(ngModel)]="petMatchForm.preferred_size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Cualquier tamaÃ±o"
                [showClear]="true"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="preferred_age_min">Edad preferida (aÃ±os)</label>
              <div class="age-range-group">
                <p-inputNumber
                  id="preferred_age_min"
                  name="preferred_age_min"
                  [(ngModel)]="petMatchForm.preferred_age_min"
                  [min]="0"
                  [max]="20"
                  placeholder="MÃ­n"
                  [disabled]="isLoading()"
                  [style]="{ width: '100%' }"
                />
                <span class="age-range-separator">-</span>
                <p-inputNumber
                  id="preferred_age_max"
                  name="preferred_age_max"
                  [(ngModel)]="petMatchForm.preferred_age_max"
                  [min]="0"
                  [max]="20"
                  placeholder="MÃ¡x"
                  [disabled]="isLoading()"
                  [style]="{ width: '100%' }"
                />
              </div>
              <small class="form-hint">Deja vacÃ­o para cualquier edad</small>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [(ngModel)]="petMatchForm.notify_if_has_pet"
                  name="notify_if_has_pet"
                  [disabled]="isLoading()"
                />
                <span>
                  @if (petMatchForm.gender === 'M') {
                    Notificar si ya tiene una perrita
                  } @else if (petMatchForm.gender === 'F') {
                    Notificar si ya tiene un perrito
                  } @else {
                    Notificar si ya tiene una mascota del gÃ©nero opuesto
                  }
                </span>
              </label>
              <small class="form-hint">
                Si estÃ¡ marcado, recibirÃ¡s notificaciones cuando alguien con una mascota del gÃ©nero opuesto publique
              </small>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">DescripciÃ³n y Detalles</h3>
          
          <div class="form-group">
            <label for="description">DescripciÃ³n</label>
            <textarea
              id="description"
              pTextarea
              [(ngModel)]="petMatchForm.description"
              name="description"
              [rows]="4"
              [disabled]="isLoading()"
              placeholder="Describe la personalidad, comportamiento y caracterÃ­sticas especiales de tu mascota..."
            ></textarea>
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
              placeholder="Seleccione una o mÃ¡s opciones..."
              [displaySelectedLabel]="true"
              [maxSelectedLabels]="3"
              [showToggleAll]="false"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">UbicaciÃ³n y Contacto</h3>
          
          <div class="form-group">
            <label for="location">UbicaciÃ³n</label>
            <input
              id="location"
              type="text"
              pInputText
              [(ngModel)]="petMatchForm.location"
              name="location"
              [disabled]="isLoading()"
              placeholder="Ej: Ciudad de PanamÃ¡, San Francisco, etc."
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
              <label for="contact_phone">TelÃ©fono de contacto</label>
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
            <p-select
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
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            label="Publicar"
            [loading]="isLoading()"
            [disabled]="isLoading() || !isFormValid()"
            [style]="{
              background: 'linear-gradient(to right, #ec4899, #a855f7, #FDB022)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 'bold',
              padding: '0.75rem 2rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)'
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
              border: '2px solid rgba(168, 85, 247, 0.3)',
              color: '#6b21a8',
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
      .pet-match-form-section {
        width: 100%;
        background: linear-gradient(to bottom, #fef3f2 0%, #f3e8ff 50%, #fef3c7 100%);
        min-height: 100vh;
      }

      /* Hero Section */
      .hero-section {
        background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%);
        padding: 4rem 2rem;
        position: relative;
        overflow: hidden;
        border-bottom: 4px solid #FDB022;
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
        background: linear-gradient(to right, #ec4899 0%, #a855f7 50%, #FDB022 100%);
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
        color: #374151;
        line-height: 1.6;
        margin: 0;
      }

      .pet-match-form-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 3rem 2rem;
      }

      .pet-match-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .form-section {
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 1rem;
        border: 2px solid rgba(168, 85, 247, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        margin-bottom: 1.5rem;
        transition: all 0.3s ease;
      }

      .form-section:hover {
        border-color: rgba(168, 85, 247, 0.4);
        box-shadow: 0 8px 24px rgba(168, 85, 247, 0.15);
        transform: translateY(-2px);
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 700;
        background: linear-gradient(to right, #ec4899 0%, #a855f7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid rgba(168, 85, 247, 0.2);
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
      }

      .age-range-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .age-range-separator {
        color: #6b7280;
        font-weight: 600;
        flex-shrink: 0;
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
        color: #6b21a8;
        font-size: 0.875rem;
      }

      .gender-selector {
        display: flex;
        gap: 0.5rem;
        background: #f9fafb;
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .gender-button {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background: #ffffff;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 600;
        color: #374151;
      }

      .gender-button:hover:not(:disabled) {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        transform: translateY(-2px);
      }

      .gender-button.active {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.2);
        color: #000000;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
      }

      .gender-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .gender-icon {
        font-size: 1.5rem;
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

      /* Input styles to match theme */
      ::ng-deep .pet-match-form-container .p-inputtext,
      ::ng-deep .pet-match-form-container .p-inputtextarea,
      ::ng-deep .pet-match-form-container .p-select,
      ::ng-deep .pet-match-form-container .p-multiselect {
        border: 2px solid rgba(168, 85, 247, 0.2) !important;
        border-radius: 0.5rem !important;
        transition: all 0.3s ease !important;
      }

      ::ng-deep .pet-match-form-container .p-inputtext:focus,
      ::ng-deep .pet-match-form-container .p-inputtextarea:focus,
      ::ng-deep .pet-match-form-container .p-select:focus,
      ::ng-deep .pet-match-form-container .p-multiselect:focus {
        border-color: #a855f7 !important;
        box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1) !important;
      }

      /* Asegurar que los overlays de los selects tengan z-index alto */
      ::ng-deep .p-select-panel {
        z-index: 1100 !important;
      }

      ::ng-deep .p-overlay {
        z-index: 1100 !important;
      }

      ::ng-deep .p-select-overlay {
        z-index: 1100 !important;
      }

      ::ng-deep .p-multiselect-panel {
        z-index: 1100 !important;
      }

      /* Button hover effects */
      ::ng-deep .pet-match-form-container .form-actions p-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
      }

      ::ng-deep .pet-match-form-container .form-actions p-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .pet-match-form-container .form-actions p-button[style*='gradient'] button:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(168, 85, 247, 0.6), 0 0 25px rgba(236, 72, 153, 0.4) !important;
      }

      ::ng-deep .pet-match-form-container .form-actions p-button[style*='gradient'] button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .pet-match-form-container .form-actions p-button[style*='border'] button:hover:not(:disabled) {
        background: linear-gradient(to right, rgba(243, 232, 255, 0.3) 0%, rgba(253, 242, 248, 0.3) 100%) !important;
        border-color: #ec4899 !important;
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

        .pet-match-form-container {
          padding: 2rem 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }
      }

      .highlight-section {
        background: linear-gradient(135deg, rgba(243, 232, 255, 0.3) 0%, rgba(253, 242, 248, 0.3) 50%, rgba(254, 243, 199, 0.3) 100%);
        border: 2px solid rgba(168, 85, 247, 0.4);
        box-shadow: 0 4px 16px rgba(168, 85, 247, 0.2);
      }

      .highlight-section:hover {
        border-color: rgba(236, 72, 153, 0.5);
        box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);
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
    preferred_size: undefined,
    preferred_age_min: undefined,
    preferred_age_max: undefined,
    notify_if_has_pet: false,
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
    { label: 'PequeÃ±o', value: 'small' },
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
    { label: 'TelÃ©fono', value: 'phone' },
    { label: 'Ambos', value: 'both' },
  ];

  // Opciones estÃ¡ticas de personalidad como fallback
  private static readonly DEFAULT_PERSONALITY_OPTIONS = [
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

  public personalityOptions = computed(() => {
    const traits = this.personalityTraitsStore.activeTraits();
    if (traits.length > 0) {
      return traits.map((trait) => ({
        label: trait.label,
        value: trait.value,
      }));
    }
    // Fallback a opciones estÃ¡ticas si no hay datos en el store
    return PetMatchFormComponent.DEFAULT_PERSONALITY_OPTIONS;
  });

  public petOptions = computed(() => {
    return this.myPets().map((pet: UserPet) => ({
      label: `${pet.name} - ${this.getSpeciesLabel(pet.species)} ${pet.breed_primary ? `(${pet.breed_primary})` : ''}`,
      value: pet.id,
    }));
  });

  ngOnInit(): void {
    // Pre-llenar email con el del usuario autenticado si estÃ¡ disponible
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
    // Buscar la mascota en myPets (ya estÃ¡ cargado)
    const pet = this.myPets().find((p: UserPet) => p.id === petId);
    if (pet) {
      this.fillFormFromPet(pet);
    } else {
      // Si no estÃ¡, usar entityMap del store
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

  public setGender(gender: 'M' | 'F'): void {
    this.petMatchForm.gender = gender;
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

    // Si no hay user_pet_id, crear la mascota en "Mis Mascotas" primero
    if (!petMatch.user_pet_id) {
      const userPet: Partial<UserPet> = {
        name: petMatch.pet_name!,
        species: petMatch.species!,
        gender: petMatch.gender!,
        size: petMatch.size!,
        color: petMatch.color,
        weight: petMatch.weight,
        description: petMatch.description,
        health_status: petMatch.health_status,
        personality: petMatch.personality || [],
        photos: petMatch.photos || [],
        is_vaccinated: petMatch.is_vaccinated || false,
        is_sterilized: petMatch.is_sterilized || false,
        breed_type: petMatch.breed_type || 'none',
        breed_primary: petMatch.breed_primary,
        breed_secondary: petMatch.breed_secondary,
        breed_percentage_primary: petMatch.breed_percentage_primary,
        breed_percentage_secondary: petMatch.breed_percentage_secondary,
        birth_date: petMatch.birth_date,
        age_years: petMatch.age_years,
        age_months: petMatch.age_months,
      };

      this.userPetsStore.createItem(userPet as UserPet).subscribe({
        next: (createdPets) => {
          // Asociar la mascota creada al pet match
          if (createdPets && createdPets.length > 0) {
            petMatch.user_pet_id = createdPets[0].id;
          }
          this.createPetMatch(petMatch);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al crear la mascota. Intenta de nuevo.',
          });
          console.error('Error al crear user pet:', error);
          this.isLoading.set(false);
        },
      });
    } else {
      this.createPetMatch(petMatch);
    }
  }

  private createPetMatch(petMatch: Partial<PetMatch>): void {
    this.petMatchesStore.createItem(petMatch as PetMatch).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ã‰xito',
          detail: 'Mascota publicada correctamente y agregada a Mis Mascotas',
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




