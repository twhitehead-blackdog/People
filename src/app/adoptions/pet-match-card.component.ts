import { , ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TagModule, DialogModule, Button],
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
          <span class="heart-icon">â¤ï¸</span>
        </button>
        
        <!-- Type badge -->
        <div class="type-badge">
          {{ petMatch().species === 'dog' ? 'ðŸ• Perrito' : 'ðŸ± Gatito' }}
        </div>

      </div>

      <!-- Content -->
      <div class="pet-content">
        <div class="pet-header">
          <div class="pet-name-section">
            <h3 class="pet-name">{{ petMatch().pet_name }}</h3>
            <div class="pet-breed-section">
              @if (petMatch().breed_type === 'pure' && petMatch().breed_primary) {
                <span class="breed-badge pure">â­ {{ petMatch().breed_primary }}</span>
              } @else if (petMatch().breed_type === 'mixed' && petMatch().breed_primary && petMatch().breed_secondary) {
                <span class="breed-badge mixed">
                  ðŸ”€ {{ petMatch().breed_primary }}
                  @if (petMatch().breed_percentage_primary) {
                    <span class="breed-percentage">({{ petMatch().breed_percentage_primary }}%)</span>
                  }
                  / {{ petMatch().breed_secondary }}
                  @if (petMatch().breed_percentage_secondary) {
                    <span class="breed-percentage">({{ petMatch().breed_percentage_secondary }}%)</span>
                  }
                </span>
              } @else if (petMatch().breed) {
                <span class="breed-badge">{{ petMatch().breed }}</span>
              } @else {
                <span class="breed-badge none">ðŸ¾ Sin raza especÃ­fica</span>
              }
            </div>
          </div>
          <div class="gender-badge" [class.male]="petMatch().gender === 'M'" [class.female]="petMatch().gender === 'F'">
            {{ petMatch().gender === 'M' ? 'â™‚ï¸ Macho' : 'â™€ï¸ Hembra' }}
          </div>
        </div>

        <div class="pet-details">
          <div class="detail-item">
            <div class="detail-icon-wrapper purple">
              <span class="detail-icon">ðŸ“…</span>
            </div>
            <span class="detail-text">
              @if (petMatch().age_years !== undefined || petMatch().age_months !== undefined) {
                @if (petMatch().age_years !== undefined && petMatch().age_years! > 0) {
                  {{ petMatch().age_years }} aÃ±o{{ petMatch().age_years! !== 1 ? 's' : '' }}
                }
                @if (petMatch().age_months !== undefined && petMatch().age_months! > 0) {
                  @if (petMatch().age_years !== undefined && petMatch().age_years! > 0) {
                    y 
                  }
                  {{ petMatch().age_months }} mes{{ petMatch().age_months! !== 1 ? 'es' : '' }}
                }
              } @else if (petMatch().age) {
                {{ petMatch().age!.toFixed(1) }} aÃ±os
              } @else {
                No especificada
              }
            </span>
          </div>
          @if (petMatch().location) {
          <div class="detail-item">
            <div class="detail-icon-wrapper pink">
              <span class="detail-icon">ðŸ“</span>
            </div>
            <span class="detail-text">{{ petMatch().location }}</span>
          </div>
          }
        </div>

        <div class="pet-badges">
          <div class="size-badge">{{ getSizeLabel(petMatch().size) }}</div>
          <div class="available-badge">âœ¨ Disponible</div>
        </div>

        <button 
          class="view-profile-button"
          (click)="showMoreInfo($event)"
          [class.scaled]="isHovered()"
        >
          â„¹ï¸ Ver Perfil Completo
        </button>
      </div>
    </div>

    <p-dialog
      [(visible)]="showPetDetails"
      [modal]="true"
      [dismissableMask]="false"
      [style]="{ width: '90vw', maxWidth: '1024px', padding: '0' }"
      [styleClass]="'pet-profile-modal'"
      [closable]="false"
      (onHide)="onModalHide()"
    >
      @if (petMatch()) {
      <div class="pet-profile-dialog">
        <!-- Header with Image -->
        <div class="profile-header-image">
          @if (petMatch().photos && petMatch().photos!.length > 0) {
            <img 
              [src]="petMatch().photos![0]" 
              [alt]="petMatch().pet_name"
              class="header-img"
              (click)="openImageFullscreen()"
              [style.cursor]="'pointer'"
            />
          } @else {
            <div class="header-placeholder"></div>
          }
          
          <!-- Gradient overlay -->
          <div class="header-gradient-overlay"></div>
          
          <!-- Close button -->
          <button
            class="close-button"
            (click)="showPetDetails = false"
            type="button"
          >
            <span class="close-icon">âœ•</span>
          </button>
          
          <!-- Type badge -->
          <div class="type-badge-header">
            <span class="type-badge-text">
              {{ petMatch().species === 'dog' ? 'ðŸ• Perrito' : 'ðŸ± Gatito' }}
            </span>
          </div>

          <!-- Fullscreen button -->
          @if (petMatch().photos && petMatch().photos!.length > 0) {
            <button
              class="fullscreen-button"
              (click)="openImageFullscreen()"
              type="button"
              title="Ver imagen en tamaÃ±o completo"
            >
              <span class="fullscreen-icon">ðŸ”</span>
            </button>
          }

          <!-- Bottom info -->
          <div class="header-bottom-info">
            <div class="header-info-left">
              <h2 class="header-pet-name">{{ petMatch().pet_name }}</h2>
              <p class="header-pet-breed">
                {{ getBreedDisplay() }} â€¢ {{ getAgeDisplay() }}
              </p>
            </div>
            
            <button
              class="header-like-button"
              [class.liked]="isLiked()"
              (click)="toggleLike($event)"
              type="button"
            >
              <span class="header-heart-icon">â¤ï¸</span>
            </button>
          </div>
        </div>

        <!-- Fullscreen Image Lightbox -->
        @if (showFullscreenImage()) {
          <div class="fullscreen-lightbox" (click)="closeImageFullscreen()">
            <button
              class="lightbox-close"
              (click)="closeImageFullscreen()"
              type="button"
            >
              <span class="close-icon">âœ•</span>
            </button>
            <div class="lightbox-content" (click)="$event.stopPropagation()">
              @if (petMatch().photos && petMatch().photos!.length > 0) {
                <img 
                  [src]="petMatch().photos![0]" 
                  [alt]="petMatch().pet_name"
                  class="lightbox-image"
                />
              }
            </div>
          </div>
        }

        <!-- Content -->
        <div class="profile-content">
          <!-- Quick Info Cards -->
          <div class="quick-info-grid">
            <div class="quick-info-card">
              <div class="quick-info-icon-wrapper" [class.male]="petMatch().gender === 'M'" [class.female]="petMatch().gender === 'F'">
                <span class="quick-info-icon">{{ petMatch().gender === 'M' ? 'â™‚ï¸' : 'â™€ï¸' }}</span>
              </div>
              <p class="quick-info-label">GÃ©nero</p>
              <p class="quick-info-value">{{ petMatch().gender === 'M' ? 'Macho' : 'Hembra' }}</p>
            </div>

            <div class="quick-info-card">
              <div class="quick-info-icon-wrapper purple">
                <span class="quick-info-icon">âš–ï¸</span>
              </div>
              <p class="quick-info-label">Peso</p>
              <p class="quick-info-value">{{ getWeightDisplay() }}</p>
            </div>

            <div class="quick-info-card">
              <div class="quick-info-icon-wrapper green">
                <span class="quick-info-icon">ðŸ“</span>
              </div>
              <p class="quick-info-label">Altura</p>
              <p class="quick-info-value">{{ getHeightDisplay() }}</p>
            </div>

            <div class="quick-info-card">
              <div class="quick-info-icon-wrapper yellow">
                <span class="quick-info-icon">ðŸ“</span>
              </div>
              <p class="quick-info-label">UbicaciÃ³n</p>
              <p class="quick-info-value">{{ petMatch().location || 'No especificada' }}</p>
            </div>
          </div>

          <!-- Health Status -->
          <div class="info-section health-section">
            <h3 class="section-title">
              <span class="section-icon">ðŸ†</span>
              Estado de Salud
            </h3>
            <div class="health-badges">
              @if (petMatch().is_vaccinated) {
                <span class="health-badge vaccinated">âœ… Vacunado</span>
              }
              @if (petMatch().is_sterilized) {
                <span class="health-badge sterilized">âœ… Esterilizado</span>
              }
              <span class="health-badge healthy">âœ… Saludable</span>
            </div>
          </div>

          <!-- Personality -->
          @if (petMatch().personality && petMatch().personality!.length > 0) {
          <div class="info-section personality-section">
            <h3 class="section-title">
              <span class="section-icon">âœ¨</span>
              Personalidad
            </h3>
            <div class="personality-badges">
              @for (trait of petMatch().personality; track trait) {
                <span class="personality-badge">{{ getPersonalityLabel(trait) }}</span>
              }
            </div>
          </div>
          }

          <!-- Description -->
          @if (petMatch().description) {
          <div class="info-section description-section">
            <h3 class="section-title">
              <span class="section-icon">â„¹ï¸</span>
              Sobre {{ petMatch().pet_name }}
            </h3>
            <p class="description-text">{{ petMatch().description }}</p>
          </div>
          }

          <!-- Looking for Partner -->
          <div class="info-section looking-for-section">
            <h3 class="section-title">
              <span class="section-icon">â¤ï¸</span>
              Buscando Pareja
            </h3>
            <div class="preferences-grid">
              <div class="preference-item">
                <p class="preference-label">GÃ©nero buscado</p>
                <p class="preference-value">{{ getPreferredGender() }}</p>
              </div>
              <div class="preference-item">
                <p class="preference-label">Edad preferida</p>
                <p class="preference-value">{{ getPreferredAgeRange() }}</p>
              </div>
              <div class="preference-item">
                <p class="preference-label">TamaÃ±o preferido</p>
                <p class="preference-value">{{ getPreferredSize() }}</p>
              </div>
            </div>
          </div>

          <!-- Separator -->
          <div class="section-separator"></div>

          <!-- Owner Info -->
          @if (petMatch().user) {
          <div class="info-section owner-section">
            <h3 class="section-title">InformaciÃ³n del DueÃ±o</h3>
            <div class="owner-info">
              <div class="owner-avatar">
                <span class="owner-initials">{{ getOwnerInitials() }}</span>
              </div>
              <div class="owner-details">
                <p class="owner-name">{{ petMatch().user?.full_name || petMatch().user?.email || 'Usuario' }}</p>
                <p class="owner-member-since">Miembro desde {{ getMemberSince() }}</p>
              </div>
            </div>
          </div>
          }

          <!-- Action Buttons -->
          <div class="action-buttons">
            <p-button
              label="Â¡Quiero Conocer a {{ petMatch().pet_name }}! ðŸ’•"
              [style]="{
                background: 'linear-gradient(to right, #ec4899, #a855f7, #FDB022)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '1rem 2rem',
                fontSize: '1.125rem',
                borderRadius: '1rem',
                boxShadow: '0 8px 25px rgba(251, 191, 36, 0.6)',
                width: '100%'
              }"
              (onClick)="contactOwner()"
            />
            
            <p-button
              label="Compartir Perfil"
              [style]="{
                background: '#ffffff',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                color: '#6b21a8',
                fontWeight: '600',
                padding: '1rem 2rem',
                fontSize: '1.125rem',
                borderRadius: '1rem',
                width: '100%'
              }"
              (onClick)="sharePet($event)"
            />
          </div>

          <!-- Report -->
          <div class="report-section">
            <button class="report-button" (click)="reportProfile($event)" type="button">
              <span class="report-icon">ðŸš©</span>
              Reportar perfil
            </button>
          </div>
        </div>
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
        border-color: rgba(168, 85, 247, 0.5);
        box-shadow: 0 8px 32px rgba(168, 85, 247, 0.3), 0 0 0 1px rgba(236, 72, 153, 0.2);
        transform: translateY(-8px);
        background: linear-gradient(to bottom, rgba(243, 232, 255, 0.1) 0%, rgba(253, 242, 248, 0.1) 100%);
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
        background: linear-gradient(135deg, rgba(236, 72, 153, 0.9) 0%, rgba(168, 85, 247, 0.9) 100%);
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
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
        background: linear-gradient(to right, #ec4899 0%, #a855f7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .pet-name-section {
        flex: 1;
      }

      .pet-breed-section {
        margin-top: 0.5rem;
      }

      .breed-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        margin-top: 0.25rem;
      }

      .breed-badge.pure {
        background: rgba(251, 191, 36, 0.2);
        color: #000000;
        border: 1px solid rgba(251, 191, 36, 0.4);
      }

      .breed-badge.mixed {
        background: rgba(139, 92, 246, 0.2);
        color: #6b21a8;
        border: 1px solid rgba(139, 92, 246, 0.4);
      }

      .breed-badge.none {
        background: rgba(107, 114, 128, 0.2);
        color: #374151;
        border: 1px solid rgba(107, 114, 128, 0.4);
      }

      .breed-percentage {
        font-size: 0.75rem;
        opacity: 0.8;
        font-weight: 500;
        margin: 0 0.25rem;
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
        color: #a855f7;
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
        background: linear-gradient(to right, #ec4899 0%, #a855f7 50%, #FDB022 100%);
        box-shadow: 0 4px 16px rgba(168, 85, 247, 0.4), 0 0 20px rgba(236, 72, 153, 0.3);
        transform: translateY(-2px);
        color: #ffffff;
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
        background: linear-gradient(to right, #ec4899 0%, #a855f7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
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
        background: linear-gradient(to right, rgba(243, 232, 255, 0.3) 0%, rgba(253, 242, 248, 0.3) 100%);
        transform: translateX(4px);
        border-left: 3px solid #a855f7;
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
        background: linear-gradient(to right, rgba(243, 232, 255, 0.3) 0%, rgba(253, 242, 248, 0.3) 100%);
        transform: translateX(4px);
        border-left: 3px solid #ec4899;
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
        color: #a855f7;
        background: linear-gradient(to right, rgba(243, 232, 255, 0.3) 0%, rgba(253, 242, 248, 0.3) 100%);
        transform: translateX(4px);
        border-left: 3px solid #ec4899;
      }

      .action-link span {
        font-size: 0.75rem;
      }

      /* Modal Styles */
      ::ng-deep .pet-profile-modal .p-dialog-content {
        padding: 0 !important;
        background: linear-gradient(to bottom right, #f3e8ff 0%, #fce7f3 50%, #fef3c7 100%) !important;
        border-radius: 1rem !important;
        overflow: hidden !important;
      }

      ::ng-deep .pet-profile-modal .p-dialog-header {
        display: none !important;
      }

      .pet-profile-dialog {
        max-height: 90vh;
        overflow-y: auto;
      }

      /* Header with Image */
      .profile-header-image {
        position: relative;
        height: 500px;
        min-height: 500px;
        overflow: hidden;
        background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%);
      }

      @media (min-width: 768px) {
        .profile-header-image {
          height: 600px;
          min-height: 600px;
        }
      }

      .header-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        transition: transform 0.3s ease;
      }

      .header-img:hover {
        transform: scale(1.05);
      }

      .header-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%);
      }

      .header-gradient-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
      }

      .close-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 2.5rem;
        height: 2.5rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .close-button:hover {
        background: #ffffff;
        transform: scale(1.1);
      }

      .close-icon {
        font-size: 1.25rem;
        color: #000000;
        font-weight: 600;
      }

      .type-badge-header {
        position: absolute;
        top: 1rem;
        left: 1rem;
        z-index: 10;
      }

      .type-badge-text {
        background: linear-gradient(to right, #FDB022 0%, #fcd34d 100%);
        color: #000000;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 1rem;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: inline-block;
      }

      .header-bottom-info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1.5rem;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        z-index: 10;
      }

      .header-info-left {
        flex: 1;
      }

      .header-pet-name {
        font-size: 2.5rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 0.5rem 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .header-pet-breed {
        font-size: 1.125rem;
        color: rgba(255, 255, 255, 0.9);
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .header-like-button {
        width: 4rem;
        height: 4rem;
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .header-like-button:hover {
        background: #ffffff;
        transform: scale(1.1);
      }

      .header-like-button.liked {
        background: #ec4899;
        transform: scale(1.1);
      }

      .header-heart-icon {
        font-size: 2rem;
        transition: all 0.3s ease;
      }

      .header-like-button.liked .header-heart-icon {
        filter: brightness(0) invert(1);
      }

      /* Fullscreen button */
      .fullscreen-button {
        position: absolute;
        top: 1rem;
        right: 4rem;
        width: 2.5rem;
        height: 2.5rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .fullscreen-button:hover {
        background: #ffffff;
        transform: scale(1.1);
      }

      .fullscreen-icon {
        font-size: 1.25rem;
      }

      /* Fullscreen Lightbox */
      .fullscreen-lightbox {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .lightbox-close {
        position: absolute;
        top: 2rem;
        right: 2rem;
        width: 3rem;
        height: 3rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .lightbox-close:hover {
        background: #ffffff;
        transform: scale(1.1);
      }

      .lightbox-content {
        max-width: 95vw;
        max-height: 95vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .lightbox-image {
        max-width: 100%;
        max-height: 95vh;
        object-fit: contain;
        border-radius: 0.5rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: zoomIn 0.3s ease;
      }

      @keyframes zoomIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      @media (max-width: 768px) {
        .fullscreen-button {
          right: 3.5rem;
          width: 2rem;
          height: 2rem;
        }

        .fullscreen-icon {
          font-size: 1rem;
        }

        .lightbox-close {
          top: 1rem;
          right: 1rem;
          width: 2.5rem;
          height: 2.5rem;
        }

        .lightbox-content {
          padding: 1rem;
        }
      }

      /* Content */
      .profile-content {
        padding: 2rem;
        background: linear-gradient(to bottom right, #f3e8ff 0%, #fce7f3 50%, #fef3c7 100%);
      }

      /* Quick Info Grid */
      .quick-info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
      }

      @media (min-width: 768px) {
        .quick-info-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      .quick-info-card {
        background: #ffffff;
        border-radius: 1rem;
        padding: 1rem;
        border: 2px solid rgba(168, 85, 247, 0.2);
        text-align: center;
        transition: transform 0.3s ease;
      }

      .quick-info-card:hover {
        transform: scale(1.05);
      }

      .quick-info-icon-wrapper {
        width: 3rem;
        height: 3rem;
        margin: 0 auto 0.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .quick-info-icon-wrapper.male {
        background: rgba(239, 246, 255, 1);
      }

      .quick-info-icon-wrapper.female {
        background: rgba(253, 242, 248, 1);
      }

      .quick-info-icon-wrapper.purple {
        background: rgba(243, 232, 255, 1);
      }

      .quick-info-icon-wrapper.green {
        background: rgba(209, 250, 229, 1);
      }

      .quick-info-icon-wrapper.yellow {
        background: rgba(254, 243, 199, 1);
      }

      .quick-info-icon {
        font-size: 1.5rem;
      }

      .quick-info-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0 0 0.25rem 0;
      }

      .quick-info-value {
        font-size: 1rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      /* Info Sections */
      .info-section {
        background: #ffffff;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        border: 2px solid;
      }

      .health-section {
        border-color: rgba(34, 197, 94, 0.2);
      }

      .personality-section {
        border-color: rgba(236, 72, 153, 0.2);
      }

      .description-section {
        border-color: rgba(251, 191, 36, 0.2);
      }

      .looking-for-section {
        background: linear-gradient(to bottom right, rgba(253, 242, 248, 1) 0%, rgba(243, 232, 255, 1) 50%, rgba(254, 243, 199, 1) 100%);
        border-color: rgba(168, 85, 247, 0.3);
      }

      .owner-section {
        border-color: rgba(107, 114, 128, 0.2);
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #000000;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .section-icon {
        font-size: 1.5rem;
      }

      .health-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .health-badge {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: none;
      }

      .health-badge.vaccinated {
        background: linear-gradient(to right, rgba(209, 250, 229, 1) 0%, rgba(167, 243, 208, 1) 100%);
        color: #065f46;
      }

      .health-badge.sterilized {
        background: linear-gradient(to right, rgba(219, 234, 254, 1) 0%, rgba(191, 219, 254, 1) 100%);
        color: #1e40af;
      }

      .health-badge.healthy {
        background: linear-gradient(to right, rgba(243, 232, 255, 1) 0%, rgba(253, 242, 248, 1) 100%);
        color: #6b21a8;
      }

      .personality-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .personality-badge {
        padding: 0.5rem 1rem;
        background: linear-gradient(to right, rgba(253, 242, 248, 1) 0%, rgba(243, 232, 255, 1) 100%);
        color: #be185d;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: none;
      }

      .description-text {
        color: #6b7280;
        line-height: 1.6;
        margin: 0;
      }

      .preferences-grid {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        gap: 1rem;
      }

      @media (min-width: 768px) {
        .preferences-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      .preference-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .preference-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .preference-value {
        font-size: 1rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .section-separator {
        height: 1px;
        background: rgba(0, 0, 0, 0.1);
        margin: 2rem 0;
      }

      .owner-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .owner-avatar {
        width: 4rem;
        height: 4rem;
        background: linear-gradient(to right, #FDB022 0%, #fcd34d 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .owner-initials {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
      }

      .owner-details {
        flex: 1;
      }

      .owner-name {
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.25rem 0;
      }

      .owner-member-since {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .action-buttons {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      @media (min-width: 768px) {
        .action-buttons {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .report-section {
        text-align: center;
        margin-top: 1.5rem;
      }

      .report-button {
        background: transparent;
        border: none;
        color: #6b7280;
        font-size: 0.875rem;
        cursor: pointer;
        transition: color 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
      }

      .report-button:hover {
        color: #ef4444;
      }

      .report-icon {
        font-size: 1rem;
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
  public showFullscreenImage = signal(false);

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
      small: 'PequeÃ±o',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }

  public getPersonalityLabel(value: string): string {
    const labels: Record<string, string> = {
      jugueton: 'JuguetÃ³n',
      tranquilo: 'Tranquilo',
      carinoso: 'CariÃ±oso',
      independiente: 'Independiente',
      sociable: 'Sociable',
      activo: 'Activo',
      protector: 'Protector',
      timido: 'TÃ­mido',
      curioso: 'Curioso',
      energetico: 'EnergÃ©tico',
      docil: 'DÃ³cil',
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

  public onModalHide(): void {
    this.showPetDetails = false;
    // Cerrar tambiÃ©n el lightbox si estÃ¡ abierto
    this.showFullscreenImage.set(false);
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

  public getBreedDisplay(): string {
    const match = this.petMatch();
    if (match.breed_type === 'pure' && match.breed_primary) {
      return match.breed_primary;
    } else if (match.breed_type === 'mixed' && match.breed_primary && match.breed_secondary) {
      return `${match.breed_primary} / ${match.breed_secondary}`;
    } else if (match.breed) {
      return match.breed;
    }
    return 'Sin raza especÃ­fica';
  }

  public getAgeDisplay(): string {
    const match = this.petMatch();
    if (match.age_years !== undefined || match.age_months !== undefined) {
      const parts: string[] = [];
      if (match.age_years !== undefined && match.age_years! > 0) {
        parts.push(`${match.age_years} aÃ±o${match.age_years! !== 1 ? 's' : ''}`);
      }
      if (match.age_months !== undefined && match.age_months! > 0) {
        parts.push(`${match.age_months} mes${match.age_months! !== 1 ? 'es' : ''}`);
      }
      return parts.join(' y ') || 'No especificada';
    } else if (match.age) {
      return `${match.age.toFixed(1)} aÃ±os`;
    }
    return 'No especificada';
  }

  public getWeightDisplay(): string {
    const weight = this.petMatch().weight;
    if (weight) {
      return `${weight} kg`;
    }
    // Estimar peso basado en tamaÃ±o
    const size = this.petMatch().size;
    if (size === 'large') return '30 kg';
    if (size === 'medium') return '15 kg';
    return '8 kg';
  }

  public getHeightDisplay(): string {
    // Estimar altura basada en tamaÃ±o
    const size = this.petMatch().size;
    if (size === 'large') return '60 cm';
    if (size === 'medium') return '40 cm';
    return '25 cm';
  }

  public getPreferredGender(): string {
    const match = this.petMatch();
    // Si busca pareja, generalmente busca el gÃ©nero opuesto
    return match.gender === 'M' ? 'Hembra' : 'Macho';
  }

  public getPreferredAgeRange(): string {
    const match = this.petMatch();
    const age = match.age || (match.age_years || 0);
    // Rango basado en la edad actual
    if (age <= 1) return '1-3 aÃ±os';
    if (age <= 3) return '1-5 aÃ±os';
    if (age <= 5) return '3-7 aÃ±os';
    return '5-10 aÃ±os';
  }

  public getPreferredSize(): string {
    return 'Cualquiera';
  }

  public getOwnerInitials(): string {
    const user = this.petMatch().user;
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }

  public getMemberSince(): string {
    const user = this.petMatch().user;
    if (user?.created_at) {
      const date = typeof user.created_at === 'string' ? new Date(user.created_at) : user.created_at;
      return date.getFullYear().toString();
    }
    return '2023';
  }

  public reportProfile(event: Event): void {
    event.preventDefault();
    // Implementar lÃ³gica de reporte
    console.log('Reportar perfil:', this.petMatch().id);
  }

  public openImageFullscreen(): void {
    if (this.petMatch().photos && this.petMatch().photos!.length > 0) {
      this.showFullscreenImage.set(true);
    }
  }

  public closeImageFullscreen(): void {
    this.showFullscreenImage.set(false);
  }
}




