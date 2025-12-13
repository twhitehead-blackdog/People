import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { PetMatch } from '../models';
import { AuthWrapperService } from '../auth/auth-wrapper.service';

@Component({
  selector: 'pt-pet-match-card',
  standalone: true,
  imports: [CommonModule, TagModule, DialogModule],
  template: `
    <div class="pet-match-card" (mouseenter)="isHovered.set(true)" (mouseleave)="isHovered.set(false)">
      <!-- Image -->
      <div class="pet-image-container">
        @if (petMatch().photos && petMatch().photos!.length > 0) {
        <img 
          [src]="petMatch().photos![0]" 
          [alt]="petMatch().pet_name" 
          class="pet-image"
          [class.scaled]="isHovered()"
        />
        } @else {
        <div class="pet-image-placeholder">
          <div class="gradient-bg"></div>
        </div>
        }
        
        <!-- Gradient overlay on hover -->
        <div class="gradient-overlay" [class.visible]="isHovered()"></div>
        
        <!-- Like button -->
        <button
          class="like-button"
          [class.liked]="isLiked()"
          (click)="toggleLike($event)"
        >
          <span class="heart-icon">❤️</span>
        </button>
        
        <!-- Type badge -->
        <div class="type-badge">
          {{ petMatch().species === 'dog' ? '🐕 Perrito' : '🐱 Gatito' }}
        </div>

        <!-- Sparkle effect on hover -->
        @if (isHovered()) {
          <div class="sparkle-effect">✨</div>
        }
      </div>

      <!-- Content -->
      <div class="pet-content">
        <div class="pet-header">
          <div>
            <h3 class="pet-name">{{ petMatch().pet_name }}</h3>
            <p class="pet-breed">{{ petMatch().breed || 'Sin raza específica' }}</p>
          </div>
          <div class="gender-badge" [class.male]="petMatch().gender === 'M'" [class.female]="petMatch().gender === 'F'">
            {{ petMatch().gender === 'M' ? '♂️ Macho' : '♀️ Hembra' }}
          </div>
        </div>

        <div class="pet-details">
          <div class="detail-item">
            <div class="detail-icon-wrapper purple">
              <span class="detail-icon">📅</span>
            </div>
            <span class="detail-text">
              @if (petMatch().age_years !== undefined || petMatch().age_months !== undefined) {
                @if (petMatch().age_years !== undefined && petMatch().age_years! > 0) {
                  {{ petMatch().age_years }} año{{ petMatch().age_years! !== 1 ? 's' : '' }}
                }
                @if (petMatch().age_months !== undefined && petMatch().age_months! > 0) {
                  @if (petMatch().age_years !== undefined && petMatch().age_years! > 0) {
                    y 
                  }
                  {{ petMatch().age_months }} mes{{ petMatch().age_months! !== 1 ? 'es' : '' }}
                }
              } @else if (petMatch().age) {
                {{ petMatch().age!.toFixed(1) }} años
              } @else {
                No especificada
              }
            </span>
          </div>
          @if (petMatch().location) {
          <div class="detail-item">
            <div class="detail-icon-wrapper pink">
              <span class="detail-icon">📍</span>
            </div>
            <span class="detail-text">{{ petMatch().location }}</span>
          </div>
          }
        </div>

        <div class="pet-badges">
          <div class="size-badge">{{ getSizeLabel(petMatch().size) }}</div>
          <div class="available-badge">✨ Disponible</div>
        </div>

        <button 
          class="view-profile-button"
          (click)="showMoreInfo($event)"
          [class.scaled]="isHovered()"
        >
          ℹ️ Ver Perfil Completo
        </button>
      </div>
    </div>

    <p-dialog
      [(visible)]="showPetDetails"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="Más Información"
    >
      @if (petMatch()) {
      <div class="pet-details-dialog">
        <h3>{{ petMatch().pet_name }}</h3>
        <p>
          <strong>Especie:</strong>
          {{ getSpeciesLabel(petMatch().species) }}
        </p>
        <p><strong>Raza:</strong>
          @if (petMatch().breed_type === 'pure' && petMatch().breed_primary) {
            <span>⭐ {{ petMatch().breed_primary }} (Raza Pura)</span>
          } @else if (petMatch().breed_type === 'mixed' && petMatch().breed_primary && petMatch().breed_secondary) {
            <span>🔀 {{ petMatch().breed_primary }}
              @if (petMatch().breed_percentage_primary) {
                ({{ petMatch().breed_percentage_primary }}%)
              }
              / {{ petMatch().breed_secondary }}
              @if (petMatch().breed_percentage_secondary) {
                ({{ petMatch().breed_percentage_secondary }}%)
              }
              (Mixta)
            </span>
          } @else if (petMatch().breed) {
            <span>{{ petMatch().breed }}</span>
          } @else {
            <span>🐾 Sin raza específica</span>
          }
        </p>
        <p><strong>Edad:</strong>
          @if (petMatch().age_years !== undefined || petMatch().age_months !== undefined) {
            @if (petMatch().age_years !== undefined && petMatch().age_years! > 0) {
              <span>{{ petMatch().age_years }} año{{ petMatch().age_years! !== 1 ? 's' : '' }}</span>
            }
            @if (petMatch().age_months !== undefined && petMatch().age_months! > 0) {
              @if (petMatch().age_years !== undefined && petMatch().age_years! > 0) {
                <span> y </span>
              }
              <span>{{ petMatch().age_months }} mes{{ petMatch().age_months! !== 1 ? 'es' : '' }}</span>
            }
            @if (petMatch().birth_date) {
              <span> (Cumpleaños: {{ formatBirthDate(petMatch().birth_date) }})</span>
            }
          } @else if (petMatch().age) {
            <span>{{ petMatch().age }} años</span>
          } @else {
            <span>No especificada</span>
          }
        </p>
        <p>
          <strong>Género:</strong>
          {{ petMatch().gender === 'M' ? 'Macho' : 'Hembra' }}
        </p>
        <p><strong>Tamaño:</strong> {{ getSizeLabel(petMatch().size) }}</p>
        @if (petMatch().color) {
        <p><strong>Color:</strong> {{ petMatch().color }}</p>
        }
        @if (petMatch().weight) {
        <p><strong>Peso:</strong> {{ petMatch().weight }} Kg</p>
        }
        @if (petMatch().description) {
        <p><strong>Descripción:</strong> {{ petMatch().description }}</p>
        }
        @if (petMatch().health_status) {
        <p>
          <strong>Estado de salud:</strong> {{ petMatch().health_status }}
        </p>
        }
        @if (petMatch().location) {
        <p><strong>Ubicación:</strong> {{ petMatch().location }}</p>
        }
        <p>
          <strong>Busca pareja:</strong>
          {{ getPreferredBreedLabel() }}
        </p>
        @if (petMatch().is_vaccinated) {
        <p><strong>Vacunado:</strong> Sí</p>
        }
        @if (petMatch().is_sterilized) {
        <p><strong>Esterilizado:</strong> Sí</p>
        }
        @if (petMatch().personality; as personality) {
          @if (personality.length > 0) {
            <p>
              <strong>Personalidad:</strong>
              <span class="personality-tags-dialog">
                @for (trait of personality; track trait) {
                  <span class="personality-tag-dialog">{{ getPersonalityLabel(trait) }}</span>
                }
              </span>
            </p>
          }
        }
        @if (petMatch().contact_info) {
        <div class="contact-info-section">
          <p><strong>Información de contacto:</strong></p>
          @if (petMatch().contact_info!.email) {
          <p>📧 {{ petMatch().contact_info!.email }}</p>
          }
          @if (petMatch().contact_info!.phone) {
          <p>📱 {{ petMatch().contact_info!.phone }}</p>
          }
        </div>
        }
      </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .pet-match-card {
        background: #ffffff;
        border-radius: 1rem;
        border: 2px solid transparent;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .pet-match-card:hover {
        border-color: #FDB022;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        transform: translateY(-8px);
      }

      .pet-image-container {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%);
      }

      .pet-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
      }

      .pet-image.scaled {
        transform: scale(1.1);
      }

      .gradient-bg {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%);
      }

      .gradient-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.4) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      .gradient-overlay.visible {
        opacity: 1;
      }

      .like-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 3rem;
        height: 3rem;
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .like-button:hover {
        background: rgba(255, 255, 255, 1);
        transform: scale(1.1);
      }

      .like-button.liked {
        background: #ec4899;
        transform: scale(1.1);
      }

      .heart-icon {
        font-size: 1.5rem;
        transition: all 0.3s ease;
      }

      .like-button.liked .heart-icon {
        filter: brightness(0) invert(1);
      }

      .type-badge {
        position: absolute;
        top: 1rem;
        left: 1rem;
        background: linear-gradient(to right, #FDB022 0%, #fcd34d 100%);
        color: #000000;
        border: none;
        padding: 0.375rem 1rem;
        border-radius: 9999px;
        font-size: 1rem;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10;
      }

      .sparkle-effect {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        animation: pulse 2s ease-in-out infinite;
        pointer-events: none;
        z-index: 5;
      }

      .pet-content {
        padding: 1.25rem;
      }

      .pet-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }

      .pet-name {
        font-size: 1.25rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.25rem 0;
        transition: color 0.3s ease;
      }

      .pet-match-card:hover .pet-name {
        color: #FDB022;
      }

      .pet-breed {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .gender-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: 2px solid;
      }

      .gender-badge.male {
        border-color: rgba(59, 130, 246, 0.3);
        background: rgba(239, 246, 255, 1);
        color: #1e40af;
      }

      .gender-badge.female {
        border-color: rgba(236, 72, 153, 0.3);
        background: rgba(253, 242, 248, 1);
        color: #be185d;
      }

      .pet-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #6b7280;
        transition: color 0.3s ease;
        cursor: pointer;
      }

      .pet-match-card:hover .detail-item {
        color: #FDB022;
      }

      .detail-icon-wrapper {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .detail-icon-wrapper.purple {
        background: rgba(243, 232, 255, 1);
      }

      .detail-icon-wrapper.pink {
        background: rgba(253, 242, 248, 1);
      }

      .detail-icon {
        font-size: 1rem;
      }

      .detail-icon-wrapper.purple .detail-icon {
        color: #7c3aed;
      }

      .detail-icon-wrapper.pink .detail-icon {
        color: #ec4899;
      }

      .pet-badges {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }

      .size-badge {
        background: linear-gradient(to right, rgba(243, 232, 255, 1) 0%, rgba(253, 242, 248, 1) 100%);
        color: #6b21a8;
        border: none;
        padding: 0.25rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .available-badge {
        background: linear-gradient(to right, rgba(209, 250, 229, 1) 0%, rgba(167, 243, 208, 1) 100%);
        color: #065f46;
        border: none;
        padding: 0.25rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .view-profile-button {
        width: 100%;
        background: linear-gradient(to right, #FDB022, #fcd34d);
        border: none;
        color: #000000;
        font-weight: bold;
        padding: 0.75rem;
        margin-top: 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(253, 176, 34, 0.3);
        font-size: 1rem;
      }

      .view-profile-button.scaled {
        transform: scale(1.05);
      }

      .view-profile-button:hover {
        background: linear-gradient(to right, #FDB022 0.9, #fcd34d 0.9);
        box-shadow: 0 4px 16px rgba(253, 176, 34, 0.5);
        transform: translateY(-2px);
      }

      .pet-image-placeholder {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }

      .pet-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .pet-header {
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .pet-name {
        font-size: 1.75rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.3s ease;
      }

      .pet-match-card:hover .pet-name {
        color: #f59e0b;
      }

      .match-badge {
        padding: 0.375rem 0.75rem;
        background: rgba(251, 191, 36, 0.2);
        color: #000000;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid rgba(251, 191, 36, 0.4);
        white-space: nowrap;
      }

      .gender-icon {
        font-size: 1.25rem;
        color: #ec4899;
      }

      .pet-details-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 2rem;
        margin-top: 1rem;
      }

      .pet-details-left {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .pet-details-right {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #f9fafb;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid rgba(251, 191, 36, 0.2);
      }

      .pet-detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #374151;
        padding: 0.5rem;
        background: #f9fafb;
        border-radius: 0.375rem;
        transition: all 0.3s ease;
      }

      .pet-detail-item:hover {
        background: rgba(251, 191, 36, 0.1);
        transform: translateX(4px);
      }

      .detail-label {
        font-weight: 600;
        color: #fbbf24;
      }

      .detail-value {
        color: #6b7280;
      }

      .paw-prints {
        font-size: 0.875rem;
      }

      .size-item {
        position: relative;
      }

      .size-tooltip {
        position: absolute;
        bottom: calc(100% + 0.5rem);
        left: 50%;
        transform: translateX(-50%);
        background: #374151;
        color: #ffffff;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .size-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: #374151;
      }

      .size-item:hover .size-tooltip {
        opacity: 1;
      }

      .personality-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        align-items: center;
      }

      .personality-tag {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        background: rgba(251, 191, 36, 0.15);
        color: #6b7280;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      .personality-tag-more {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        background: rgba(107, 114, 128, 0.15);
        color: #6b7280;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid rgba(107, 114, 128, 0.3);
      }

      .personality-none {
        font-size: 0.75rem;
        color: #9ca3af;
        font-style: italic;
      }

      .personality-tags-dialog {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .personality-tag-dialog {
        padding: 0.25rem 0.75rem;
        background: rgba(251, 191, 36, 0.15);
        color: #6b7280;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      .pet-location-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #374151;
        margin-top: 0.5rem;
        padding: 0.75rem;
        background: rgba(251, 191, 36, 0.1);
        border-radius: 0.5rem;
        border-left: 3px solid #fbbf24;
      }

      .plus-icon {
        color: #fbbf24;
        font-size: 1rem;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        padding: 0.5rem;
        background: #f9fafb;
        border-radius: 0.375rem;
        margin-bottom: 0.25rem;
        transition: all 0.3s ease;
      }

      .detail-row:hover {
        background: rgba(251, 191, 36, 0.1);
        transform: translateX(4px);
      }

      .detail-row .detail-label {
        color: #fbbf24;
      }

      .detail-row .detail-value {
        color: #374151;
        font-weight: 500;
      }

      .action-links {
        display: flex;
        gap: 1rem;
      }

      .action-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #6b7280;
        text-decoration: none;
        font-size: 0.875rem;
        transition: all 0.3s ease;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        background: #f9fafb;
      }

      .action-link:hover {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        transform: translateX(4px);
      }

      .action-link span {
        font-size: 0.75rem;
      }

      .pet-details-dialog {
        color: #000000;
      }

      .pet-details-dialog h3 {
        color: #fbbf24;
        margin-bottom: 1rem;
      }

      .pet-details-dialog p {
        margin-bottom: 0.5rem;
        color: #374151;
        font-weight: 500;
        font-size: 1rem;
      }

      .pet-details-dialog p strong {
        color: #fbbf24;
        font-weight: 700;
      }

      .contact-info-section {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(251, 191, 36, 0.1);
        border-radius: 0.5rem;
      }


      @media (max-width: 1024px) {
        .pet-match-card {
          flex-direction: column;
        }

        .pet-image-container {
          width: 100%;
          height: 250px;
        }

        .pet-details-grid {
          grid-template-columns: 1fr;
        }
      }

      .breed-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .breed-badge.pure {
        background: rgba(251, 191, 36, 0.2);
        color: #000000;
      }

      .breed-badge.mixed {
        background: rgba(139, 92, 246, 0.2);
        color: #6b21a8;
      }

      .breed-badge.none {
        background: rgba(107, 114, 128, 0.2);
        color: #374151;
      }

      .breed-percentage {
        font-size: 0.75rem;
        opacity: 0.8;
        font-weight: 500;
      }

      .birthday-hint {
        margin-left: 0.5rem;
        cursor: help;
        font-size: 1rem;
      }

      @media (max-width: 768px) {
        .pet-match-card {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class PetMatchCardComponent {
  public petMatch = input.required<PetMatch>();
  private router = inject(Router);
  private authWrapper = inject(AuthWrapperService);
  public showPetDetails = false;
  public isLiked = signal(false);
  public isHovered = signal(false);

  public toggleLike(event: Event): void {
    event.stopPropagation();
    this.isLiked.set(!this.isLiked());
  }

  public getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  public getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      small: 'Pequeño',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }

  public getPersonalityLabel(value: string): string {
    const labels: Record<string, string> = {
      jugueton: 'Juguetón',
      tranquilo: 'Tranquilo',
      carinoso: 'Cariñoso',
      independiente: 'Independiente',
      sociable: 'Sociable',
      activo: 'Activo',
      protector: 'Protector',
      timido: 'Tímido',
      curioso: 'Curioso',
      energetico: 'Energético',
      docil: 'Dócil',
    };
    return labels[value] || value;
  }

  public getPreferredBreedLabel(): string {
    const match = this.petMatch().preferred_breed_match;
    const labels: Record<string, string> = {
      same: 'Busca misma raza',
      different: 'Busca diferente raza',
      both: 'Busca cualquier raza',
    };
    return labels[match] || match;
  }

  public contactOwner(): void {
    const match = this.petMatch();
    if (match.contact_info) {
      if (match.contact_info.email) {
        window.location.href = `mailto:${match.contact_info.email}`;
      } else if (match.contact_info.phone) {
        window.location.href = `tel:${match.contact_info.phone}`;
      }
    }
  }

  public sharePet(event: Event): void {
    event.preventDefault();
    if (navigator.share) {
      navigator.share({
        title: `Busco pareja para ${this.petMatch().pet_name}`,
        text: `Mira esta mascota buscando pareja: ${this.petMatch().pet_name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  public showMoreInfo(event: Event): void {
    event.preventDefault();
    this.showPetDetails = true;
  }

  public formatBirthDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

