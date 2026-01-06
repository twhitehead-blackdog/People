import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Pet, AdoptionApplication } from '../models';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { PetFavoritesStore } from '../stores/pet-favorites.store';
import { MatchFilters } from './adoptions-match.component';

@Component({
  selector: 'pt-pets-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, Button, TagModule, DialogModule, TooltipModule],
  template: `
    <div class="pets-list-container">
      <div class="pets-list-inner">
        <div class="section-header">
          <h1 class="section-title">LOS RECIÃ‰N LLEGADOS</h1>
          <div class="view-toggle">
            <button
              type="button"
              class="toggle-btn"
              [class.active]="viewMode() === 'grid'"
              (click)="setViewMode('grid')"
              title="Vista de tarjetas"
            >
              <span>âŠž</span>
            </button>
            <button
              type="button"
              class="toggle-btn"
              [class.active]="viewMode() === 'list'"
              (click)="setViewMode('list')"
              title="Vista de lista"
            >
              <span>â˜°</span>
            </button>
          </div>
        </div>

        <div class="pets-list" [class.list-view]="viewMode() === 'list'">
          @for (pet of filteredPets(); track pet.id) {
          <div class="pet-card" (click)="viewPet(pet.id)">
            <div class="pet-image-container">
              @if (!pet.is_available) {
              <p-tag 
                severity="secondary" 
                value="ADOPTADA" 
                icon="pi pi-check"
                class="adopted-badge"
              />
              }
              @if (pet.photos && pet.photos.length > 0) {
              <img [src]="pet.photos[0]" [alt]="pet.name" class="pet-image" />
              <button
                type="button"
                class="favorite-button"
                [class.favorited]="isFavorite(pet.id)"
                (click)="toggleFavorite(pet, $event)"
                title="{{ isFavorite(pet.id) ? 'Quitar de favoritos' : 'Agregar a favoritos' }}"
              >
                {{ isFavorite(pet.id) ? 'â¤ï¸' : 'ðŸ¤' }}
              </button>
              } @else {
              <div class="pet-image-placeholder">
                <div class="topographic-pattern"></div>
                <button
                  type="button"
                  class="favorite-button"
                  [class.favorited]="isFavorite(pet.id)"
                  (click)="toggleFavorite(pet, $event)"
                  title="{{ isFavorite(pet.id) ? 'Quitar de favoritos' : 'Agregar a favoritos' }}"
                >
                  {{ isFavorite(pet.id) ? 'â¤ï¸' : 'ðŸ¤' }}
                </button>
              </div>
              }
            </div>

            <div class="pet-info">
              <div class="pet-header">
                <h3 class="pet-name">
                  @if (pet.species === 'dog') {
                  <span class="gender-icon">â™‚</span>
                  } @else if (pet.species === 'cat') {
                  <span class="gender-icon">â™€</span>
                  }
                  {{ pet.name }}
                </h3>
              </div>

              <div class="pet-details-grid">
                <div class="pet-details-left">
                  <div class="pet-detail-item">
                    <span class="detail-label">{{
                      pet.gender === 'M' ? 'Macho' : 'Hembra'
                    }}</span>
                    @if (pet.species === 'dog') {
                    <span class="gender-icon">â™‚</span>
                    } @else if (pet.species === 'cat') {
                    <span class="gender-icon">â™€</span>
                    }
                  </div>
                  <div class="pet-detail-item size-item">
                    <span class="detail-label">TamaÃ±o</span>
                    <span class="paw-prints" [title]="getSizeLabel(pet.size)">ðŸ¾ ðŸ¾ ðŸ¾</span>
                    <span class="size-tooltip">{{ getSizeLabel(pet.size) }}</span>
                  </div>
                  <div class="pet-detail-item">
                    <span class="detail-label">Personalidad</span>
                    <span class="personality-tags">
                      @if (pet.personality && pet.personality.length > 0) {
                        @for (trait of pet.personality.slice(0, 3); track trait) {
                          <span class="personality-tag">{{ getPersonalityLabel(trait) }}</span>
                        }
                        @if (pet.personality.length > 3) {
                          <span class="personality-tag-more">+{{ pet.personality.length - 3 }}</span>
                        }
                      } @else {
                        <span class="personality-none">No especificada</span>
                      }
                    </span>
                  </div>
                  @if (pet.location_detail) {
                  <div class="pet-location-info">
                    <span class="plus-icon">âž•</span>
                    <span>{{ pet.location_detail }}</span>
                  </div>
                  }
                  <p-button
                    [label]="pet.is_available ? 'PREGUNTAR POR MI' : 'ADOPTADA'"
                    [style]="{
                      background: '#fbbf24',
                      border: 'none',
                      color: '#000000',
                      fontWeight: 'bold',
                      padding: '0.75rem 1.5rem',
                      marginTop: '1rem'
                    }"
                    (onClick)="openAdoptionForm(pet)"
                    [disabled]="!pet.is_available"
                    [icon]="!pet.is_available ? 'pi pi-lock' : ''"
                    [pTooltip]="!pet.is_available ? 'Esta mascota ya fue adoptada' : ''"
                    tooltipPosition="top"
                  />
                  <p class="interest-count">
                    {{ getInterestCount(pet.id) }} personas estÃ¡n interesadas
                  </p>
                  <div class="action-links">
                    <a
                      href="#"
                      class="action-link"
                      (click)="sharePet(pet, $event)"
                    >
                      <span>ðŸ“¤</span>
                      Compartir
                    </a>
                    <a
                      href="#"
                      class="action-link"
                      (click)="showMoreInfo(pet, $event)"
                    >
                      <span>âž•</span>
                      + MÃ¡s InformaciÃ³n
                    </a>
                  </div>
                </div>
                <div class="pet-details-right">
                  <div class="detail-row">
                    <span class="detail-label">Peso:</span>
                    <span class="detail-value">{{ getWeight(pet) }} Kg</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">AÃ±os:</span>
                    <span class="detail-value"
                      >{{ pet.age ? pet.age.toFixed(1) : '0.4' }} aÃ±os</span
                    >
                  </div>
                  @if (pet.location_type) {
                  <div class="detail-row">
                    <span class="detail-label">En:</span>
                    <span class="detail-value">{{ pet.location_type }}</span>
                  </div>
                  }
                  <div class="detail-row">
                    <span class="detail-label">UbicaciÃ³n:</span>
                    <span class="detail-value">{{
                      pet.foundation?.name || 'Sin ubicaciÃ³n'
                    }}</span>
                  </div>
                  @if (pet.location_detail || pet.foundation?.name) {
                  <div class="map-container-small">
                    <iframe
                      [src]="getSafeMapUrl(pet)"
                      width="100%"
                      height="200"
                      style="border:0; border-radius: 0.5rem;"
                      allowfullscreen=""
                      loading="lazy"
                      referrerpolicy="no-referrer-when-downgrade"
                    ></iframe>
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>
          } @empty {
          <div class="empty-state">
            <span style="font-size: 4rem;">📥</span>
            <p>No se encontraron mascotas disponibles</p>
          </div>
          }
        </div>
      </div>
    </div>

    <p-dialog
      [(visible)]="showPetDetails"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="MÃ¡s InformaciÃ³n"
    >
      @if (selectedPet()) {
      <div class="pet-details-dialog">
        <h3>{{ selectedPet()!.name }}</h3>
        <p>
          <strong>Especie:</strong>
          {{ getSpeciesLabel(selectedPet()!.species) }}
        </p>
        <p>
          <strong>FundaciÃ³n:</strong>
          {{ selectedPet()!.foundation?.name || 'Sin fundaciÃ³n' }}
        </p>
        @if (selectedPet()!.age) {
        <p><strong>Edad:</strong> {{ selectedPet()!.age }} aÃ±os</p>
        }
        <p>
          <strong>GÃ©nero:</strong>
          {{ selectedPet()!.gender === 'M' ? 'Macho' : 'Hembra' }}
        </p>
        <p><strong>TamaÃ±o:</strong> {{ getSizeLabel(selectedPet()!.size) }}</p>
        @if (selectedPet()!.description) {
        <p><strong>DescripciÃ³n:</strong> {{ selectedPet()!.description }}</p>
        } @if (selectedPet()!.health_status) {
        <p>
          <strong>Estado de salud:</strong> {{ selectedPet()!.health_status }}
        </p>
        } @if (selectedPet()!.is_vaccinated) {
        <p><strong>Vacunado:</strong> SÃ­</p>
        }         @if (selectedPet()!.is_sterilized) {
        <p><strong>Esterilizado:</strong> SÃ­</p>
        }
        @if (selectedPet()!.personality; as personality) {
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
        @if (selectedPet()!.location_type) {
        <p><strong>UbicaciÃ³n (Tipo):</strong> {{ selectedPet()!.location_type }}</p>
        }
        @if (selectedPet()!.location_detail) {
        <p><strong>UbicaciÃ³n (Detalle):</strong> {{ selectedPet()!.location_detail }}</p>
        }
        @if (selectedPet()!.weight) {
        <p><strong>Peso:</strong> {{ selectedPet()!.weight }} Kg</p>
        }
      </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .pets-list-container {
        width: 100%;
        background: #ffffff;
        min-height: 100vh;
        padding: 2rem 0;
      }

      .pets-list-inner {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .section-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
        text-transform: uppercase;
        flex: 1;
        text-align: center;
        letter-spacing: 0.02em;
        text-shadow: 0 2px 12px rgba(251, 191, 36, 0.4);
        position: relative;
        display: inline-block;
      }

      .section-title::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 100px;
        height: 4px;
        background: linear-gradient(90deg, transparent, #fbbf24, transparent);
        border-radius: 2px;
      }

      .view-toggle {
        display: flex;
        gap: 0.5rem;
        background: #ffffff;
        border: 2px solid #374151;
        border-radius: 0.5rem;
        padding: 0.25rem;
      }

      .toggle-btn {
        background: transparent;
        border: none;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 1.25rem;
        color: #6b7280;
        transition: all 0.3s ease;
        border-radius: 0.25rem;
      }

      .toggle-btn:hover {
        background: #f9fafb;
        color: #000000;
      }

      .toggle-btn.active {
        background: #FBBF24;
        color: #000000;
        font-weight: 700;
      }

      /* Vista por defecto: en filas (list) */
      .pets-list {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .pets-list.list-view .pet-card {
        flex-direction: row;
        padding: 1.5rem;
        gap: 2rem;
      }

      .pets-list.list-view .pet-image-container {
        width: 300px;
        height: 300px;
        flex-shrink: 0;
      }

      .pets-list.list-view .pet-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .pets-list.list-view .pet-details-grid {
        grid-template-columns: 2fr 1fr;
        gap: 2rem;
      }

      /* Vista cuadriculada (grid) */
      .pets-list:not(.list-view) {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
      }

      .pets-list:not(.list-view) .pet-card {
        flex-direction: column;
        margin-bottom: 0;
        gap: 1rem;
        padding: 1rem;
      }

      .pets-list:not(.list-view) .pet-image-container {
        width: 100%;
        height: 300px;
      }

      .pets-list:not(.list-view) .pet-details-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      .pets-list:not(.list-view) .pet-details-right {
        display: none;
      }

      .pets-list:not(.list-view) .action-links {
        flex-direction: column;
        gap: 0.5rem;
      }

      .pets-list:not(.list-view) .pet-details-left {
        gap: 0.5rem;
      }

      .pets-list:not(.list-view) .pet-detail-item {
        padding: 0.375rem;
        font-size: 0.8125rem;
      }

      .pets-list:not(.list-view) .pet-location-info {
        padding: 0.5rem;
        font-size: 0.8125rem;
        margin-top: 0.25rem;
      }

      .pets-list:not(.list-view) .interest-count {
        font-size: 0.75rem;
        padding: 0.375rem;
        margin-top: 0.25rem;
      }

      .pets-list:not(.list-view) .action-link {
        padding: 0.375rem 0.5rem;
        font-size: 0.8125rem;
      }

      .pets-list:not(.list-view) ::ng-deep .pet-card p-button button {
        padding: 0.625rem 1rem !important;
        font-size: 0.875rem !important;
      }

      .pet-card {
        display: flex;
        gap: 2rem;
        background: #ffffff;
        border: 2px solid rgba(251, 191, 36, 0.3);
        border-radius: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 1.5rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(251, 191, 36, 0.1);
        margin-bottom: 1.5rem;
        position: relative;
        overflow: hidden;
      }

      .pet-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #fbbf24, #fcd34d, #fbbf24);
        background-size: 200% 100%;
        animation: shimmer 3s infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      .pet-card:hover {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
        border-color: rgba(251, 191, 36, 0.5);
      }

      .pet-image-container {
        position: relative;
        flex-shrink: 0;
        width: 300px;
        height: 300px;
      }

      .adopted-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        z-index: 20;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .pet-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0.75rem;
        border: 4px solid #fbbf24;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.4s ease;
      }

      .pet-card:hover .pet-image {
        transform: scale(1.02);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        border-color: #fcd34d;
      }

      .pet-image-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
        border-radius: 0.75rem;
        position: relative;
        overflow: hidden;
        border: 4px solid #fbbf24;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .topographic-pattern {
        width: 100%;
        height: 100%;
        background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
          ),
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
          );
      }

      .favorite-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 1.5rem;
        background: rgba(255, 255, 255, 0.95);
        width: 45px;
        height: 45px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10;
        transition: all 0.3s ease;
        cursor: pointer;
        border: 2px solid rgba(251, 191, 36, 0.3);
        padding: 0;
        line-height: 1;
      }

      .favorite-button:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.5);
        background: rgba(251, 191, 36, 0.95);
      }

      .favorite-button.favorited {
        background: rgba(251, 191, 36, 0.95);
        border-color: #fbbf24;
      }

      .favorite-button.favorited:hover {
        background: rgba(255, 255, 255, 0.95);
      }

      .pet-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .pet-header {
        margin-bottom: 0.5rem;
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

      .pets-list:not(.list-view) .pet-name {
        font-size: 1.5rem;
      }

      .pet-card:hover .pet-name {
        color: #f59e0b;
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

      .interest-count {
        margin: 0.5rem 0 0 0;
        font-size: 0.875rem;
        color: #6b7280;
        font-style: italic;
        padding: 0.5rem;
        background: #f9fafb;
        border-radius: 0.375rem;
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

      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #9ca3af;
      }

      .pets-list:not(.list-view) .empty-state {
        grid-column: 1 / -1;
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

      .location-section {
        margin-top: 1rem;
        margin-bottom: 1rem;
      }

      .map-container-small {
        margin-top: 0.75rem;
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        width: 100%;
      }

      ::ng-deep .pet-card p-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
      }

      ::ng-deep .pet-card p-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        ) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .pet-card p-button button:hover:not(:disabled) {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }

      ::ng-deep .pet-card p-button button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .pet-card p-button button:active:not(:disabled) {
        transform: translateY(-1px) scale(1.02) !important;
      }

      @media (max-width: 1024px) {
        .pets-list:not(.list-view) {
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .pets-list.list-view .pet-card {
          flex-direction: column;
        }

        .pets-list.list-view .pet-image-container {
          width: 100%;
          height: 250px;
        }

        .pets-list.list-view .pet-details-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .pets-list:not(.list-view) {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .section-title {
          font-size: 2rem;
        }

        .pets-list-container {
          padding: 1rem 0;
        }

        .pets-list-inner {
          padding: 0 1rem;
        }

        .pet-card {
          padding: 1rem;
        }
      }

      @media (max-width: 480px) {
        .pets-list:not(.list-view) {
          grid-template-columns: 1fr;
        }
      }

    `,
  ],
})
export class PetsListComponent {
  public petsStore = inject(PetsStore);
  public foundationsStore = inject(FoundationsStore);
  public applicationsStore = inject(AdoptionApplicationsStore);
  public favoritesStore = inject(PetFavoritesStore);
  private router = inject(Router);
  private authService = inject(AuthService);
  private authWrapper = inject(AuthWrapperService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  public filters = input<MatchFilters | null>(null);
  public useDemoData = input<boolean>(false);
  public demoPets = input<Pet[]>([]);
  public searchTerm = signal('');
  public showPetDetails = signal(false);
  public selectedPet = signal<Pet | null>(null);
  public mapUrls = signal<Record<string, string>>({});
  public viewMode = signal<'grid' | 'list'>('list');

  public filteredPets = computed(() => {
    // Usar datos de ejemplo si el switch estÃ¡ activado
    let pets = this.useDemoData()
      ? this.demoPets().filter((p) => p.is_available)
      : this.petsStore.entities().filter((p) => p.is_available);

    const currentFilters = this.filters();
    if (currentFilters) {
      if (currentFilters.species) {
        pets = pets.filter((p) => p.species === currentFilters.species);
      }
      if (currentFilters.location) {
        const locationLower = currentFilters.location.toLowerCase();
        pets = pets.filter((p) => {
          const foundationName = p.foundation?.name?.toLowerCase() || '';
          return foundationName.includes(locationLower);
        });
      }
      if (currentFilters.ageMin !== null && currentFilters.ageMin !== undefined) {
        pets = pets.filter((p) => p.age !== null && p.age !== undefined && p.age >= currentFilters.ageMin!);
      }
      if (currentFilters.ageMax !== null && currentFilters.ageMax !== undefined) {
        pets = pets.filter((p) => p.age !== null && p.age !== undefined && p.age <= currentFilters.ageMax!);
      }
      if (currentFilters.size) {
        pets = pets.filter((p) => p.size === currentFilters.size);
      }
      if (currentFilters.gender) {
        pets = pets.filter((p) => p.gender === currentFilters.gender);
      }
      if (currentFilters.breed) {
        pets = pets.filter((p) => p.breed === currentFilters.breed);
      }
      if (currentFilters.personality && currentFilters.personality.length > 0) {
        pets = pets.filter((p) => {
          if (!p.personality || p.personality.length === 0) return false;
          return currentFilters.personality!.some((trait) => p.personality!.includes(trait));
        });
      }
      if (currentFilters.is_vaccinated !== null && currentFilters.is_vaccinated !== undefined) {
        pets = pets.filter((p) => p.is_vaccinated === currentFilters.is_vaccinated);
      }
      if (currentFilters.is_sterilized !== null && currentFilters.is_sterilized !== undefined) {
        pets = pets.filter((p) => p.is_sterilized === currentFilters.is_sterilized);
      }
      if (currentFilters.foundation_id) {
        pets = pets.filter((p) => p.foundation_id === currentFilters.foundation_id);
      }
    }

    const search = this.searchTerm().toLowerCase();
    if (search) {
      pets = pets.filter((p) => p.name.toLowerCase().includes(search));
    }

    return pets;
  });

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

  public getSafeMapUrl(pet: Pet): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.getMapIframeUrl(pet));
  }

  public getMapIframeUrl(pet: Pet): string {
    // Verificar si tenemos coordenadas especÃ­ficas
    const coords = this.getMapCoordinates(pet);
    if (coords) {
      // Usar coordenadas directamente con zoom estÃ¡tico y fijo
      // bbox mÃ¡s pequeÃ±o = zoom mÃ¡s cercano (0.002 es un zoom medio-cercano)
      const bbox = `${coords.lon - 0.002},${coords.lat - 0.002},${coords.lon + 0.002},${coords.lat + 0.002}`;
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat},${coords.lon}`;
    }

    // Si no hay coordenadas, usar geocodificaciÃ³n
    const address = this.getMapAddress(pet);
    const cacheKey = `address_${address}`;
    
    // Verificar si ya tenemos la URL del mapa en cache
    const cached = this.mapUrls()[cacheKey];
    if (cached) {
      return cached;
    }

    // Cargar el mapa de forma asÃ­ncrona
    this.loadMapForAddress(address).then(url => {
      const currentUrls = { ...this.mapUrls() };
      currentUrls[cacheKey] = url;
      this.mapUrls.set(currentUrls);
    });

    // Retornar URL temporal mientras se carga (mapa genÃ©rico de PanamÃ¡)
    return `https://www.openstreetmap.org/export/embed.html?bbox=-79.5,8.9,-79.4,9.0&layer=mapnik&marker=8.95,-79.45`;
  }

  private async loadMapForAddress(address: string): Promise<string> {
    // Geocodificar la direcciÃ³n usando Nominatim (gratis, sin API key)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'AdoptionApp/1.0' // Nominatim requiere User-Agent
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        // Usar OpenStreetMap con zoom muy cercano (equivalente a 3 toques mÃ¡s de zoom)
        // bbox mÃ¡s pequeÃ±o = zoom mÃ¡s cercano (0.0005 es aproximadamente 3 niveles de zoom mÃ¡s)
        const bbox = `${lon - 0.0005},${lat - 0.0005},${lon + 0.0005},${lat + 0.0005}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
      }
    } catch (error) {
      // Error silencioso
    }
    // Fallback: mostrar un mapa genÃ©rico de PanamÃ¡
    return `https://www.openstreetmap.org/export/embed.html?bbox=-79.5,8.9,-79.4,9.0&layer=mapnik&marker=8.95,-79.45`;
  }

  // Computed signal que calcula el contador real de interÃ©s basado en las solicitudes
  private interestCountsMap = computed(() => {
    const map = new Map<string, number>();
    const applications = this.applicationsStore.entities();
    
    // Contar solicitudes por pet_id (solo las que tienen status pending o approved)
    for (const app of applications) {
      if (app.status === 'pending' || app.status === 'approved') {
        const currentCount = map.get(app.pet_id) || 0;
        map.set(app.pet_id, currentCount + 1);
      }
    }
    
    return map;
  });

  public getInterestCount(petId: string): number {
    return this.interestCountsMap().get(petId) || 0;
  }

  public getWeight(pet: Pet): number {
    if (pet.weight) {
      return pet.weight;
    }
    // Valor por defecto basado en el tamaÃ±o si no hay peso
    const weightMap: Record<string, number> = {
      small: 1,
      medium: 5,
      large: 15,
    };
    return weightMap[pet.size] || 1;
  }

  public getMapAddress(pet: Pet): string {
    // Priorizar location_detail, luego foundation name, luego fallback
    if (pet.location_detail) {
      return pet.location_detail;
    }
    if (pet.foundation?.name) {
      return pet.foundation.name;
    }
    return 'PanamÃ¡, PanamÃ¡'; // Fallback genÃ©rico
  }

  public getMapCoordinates(pet: Pet): { lat: number; lon: number } | null {
    // Coordenadas especÃ­ficas para Black Dog en Calle 50
    if (pet.foundation?.name && pet.foundation.name.toLowerCase().includes('black dog')) {
      return { lat: 8.992360, lon: -79.505932 };
    }
    
    // Si hay location_detail, intentar geocodificar
    // Por ahora retornamos null para usar geocodificaciÃ³n
    return null;
  }

  public sharePet(pet: Pet, event: Event): void {
    event.preventDefault();
    if (navigator.share) {
      navigator.share({
        title: `Adopta a ${pet.name}`,
        text: `Mira esta mascota disponible para adopciÃ³n: ${pet.name}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(window.location.href);
    }
  }

  public showMoreInfo(pet: Pet, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedPet.set(pet);
    this.showPetDetails.set(true);
  }

  public viewPet(petId: string): void {
    this.router.navigate(['/adoptions/mascota', petId]);
  }

  public setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    localStorage.setItem('petsViewMode', mode);
  }

  public isFavorite(petId: string): boolean {
    const user = this.authWrapper.currentUser();
    if (!user?.email) {
      return false;
    }
    return this.favoritesStore.isFavorite(user.email, petId);
  }

  public toggleFavorite(pet: Pet, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.authService.isAuthenticated$.pipe(take(1)).subscribe((isAuth) => {
      if (!isAuth) {
        this.router.navigate(['/auth/login']);
        return;
      }

      const user = this.authWrapper.currentUser();
      if (!user?.email) {
        return;
      }

      this.favoritesStore.toggleFavorite(user.email, pet.id).subscribe({
        next: () => {
          // El store se actualizarÃ¡ automÃ¡ticamente
        },
        error: (error: any) => {
          console.error('Error al actualizar favorito:', error);
        },
      });
    });
  }

  public openAdoptionForm(pet: Pet): void {
    this.authService.isAuthenticated$.pipe(take(1)).subscribe((isAuth) => {
      if (!isAuth) {
        // Redirigir al login con returnUrl para mejorar UX
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: `/adoptions/adoptar/${pet.id}` }
        });
        return;
      }
      
      // Solo navegar al formulario de adopciÃ³n
      this.router.navigate(['/adoptions/adoptar', pet.id]);
    });
  }
}



