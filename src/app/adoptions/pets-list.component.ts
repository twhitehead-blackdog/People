import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { Pet } from '../models';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';
import { MatchFilters } from './adoptions-match.component';

@Component({
  selector: 'pt-pets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, TagModule, DialogModule],
  template: `
    <div class="pets-list-container">
      <div class="section-header">
        <h1 class="section-title">LOS RECIÉN LLEGADOS</h1>
      </div>

      <div class="pets-list">
        @for (pet of filteredPets(); track pet.id) {
        <div class="pet-card">
          <div class="pet-image-container">
            @if (pet.photos && pet.photos.length > 0) {
            <img [src]="pet.photos[0]" [alt]="pet.name" class="pet-image" />
            <span class="heart-icon">💛</span>
            } @else {
            <div class="pet-image-placeholder">
              <div class="topographic-pattern"></div>
              <span class="heart-icon">💛</span>
            </div>
            }
          </div>

          <div class="pet-info">
            <div class="pet-header">
              <h3 class="pet-name">
                @if (pet.species === 'dog') {
                <span class="gender-icon">♂</span>
                } @else if (pet.species === 'cat') {
                <span class="gender-icon">♀</span>
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
                  <span class="gender-icon">♂</span>
                  } @else if (pet.species === 'cat') {
                  <span class="gender-icon">♀</span>
                  }
                </div>
                <div class="pet-detail-item">
                  <span class="detail-label">Tamaño</span>
                  <span class="paw-prints">🐾 🐾 🐾</span>
                </div>
                <div class="pet-detail-item">
                  <span class="detail-label">Personalidad</span>
                  <span class="personality-box">📦</span>
                </div>
                <div class="pet-location-info">
                  <span class="plus-icon">➕</span>
                  <span>ME ENCUENTRO EN LA SEDE DE LAS VILLAS</span>
                </div>
                <p-button
                  label="PREGUNTAR POR MI"
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
                />
                <p class="interest-count">
                  {{ getInterestCount(pet.id) }} personas están interesadas
                </p>
                <div class="action-links">
                  <a
                    href="#"
                    class="action-link"
                    (click)="sharePet(pet, $event)"
                  >
                    <span>📤</span>
                    Compartir
                  </a>
                  <a
                    href="#"
                    class="action-link"
                    (click)="showMoreInfo(pet, $event)"
                  >
                    <span>➕</span>
                    + Más Información
                  </a>
                </div>
              </div>
              <div class="pet-details-right">
                <div class="detail-row">
                  <span class="detail-label">Peso:</span>
                  <span class="detail-value">{{ getWeight(pet) }} Kg</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Años:</span>
                  <span class="detail-value"
                    >{{ pet.age ? pet.age.toFixed(1) : '0.4' }} años</span
                  >
                </div>
                <div class="detail-row">
                  <span class="detail-label">En:</span>
                  <span class="detail-value">Tienda</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Ubicación:</span>
                  <span class="detail-value">{{
                    pet.foundation?.name || 'Bogota'
                  }}</span>
                </div>
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

    <p-dialog
      [(visible)]="showPetDetails"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="Más Información"
    >
      @if (selectedPet()) {
      <div class="pet-details-dialog">
        <h3>{{ selectedPet()!.name }}</h3>
        <p>
          <strong>Especie:</strong>
          {{ getSpeciesLabel(selectedPet()!.species) }}
        </p>
        <p>
          <strong>Fundación:</strong>
          {{ selectedPet()!.foundation?.name || 'Sin fundación' }}
        </p>
        @if (selectedPet()!.age) {
        <p><strong>Edad:</strong> {{ selectedPet()!.age }} años</p>
        }
        <p>
          <strong>Género:</strong>
          {{ selectedPet()!.gender === 'M' ? 'Macho' : 'Hembra' }}
        </p>
        <p><strong>Tamaño:</strong> {{ getSizeLabel(selectedPet()!.size) }}</p>
        @if (selectedPet()!.description) {
        <p><strong>Descripción:</strong> {{ selectedPet()!.description }}</p>
        } @if (selectedPet()!.health_status) {
        <p>
          <strong>Estado de salud:</strong> {{ selectedPet()!.health_status }}
        </p>
        } @if (selectedPet()!.is_vaccinated) {
        <p><strong>Vacunado:</strong> Sí</p>
        } @if (selectedPet()!.is_sterilized) {
        <p><strong>Esterilizado:</strong> Sí</p>
        }
      </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .pets-list-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
        min-height: 100vh;
      }

      .section-header {
        text-align: center;
        margin-bottom: 3rem;
      }

      .section-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
        text-transform: uppercase;
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

      .pets-list {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .pet-card {
        display: flex;
        gap: 2rem;
        background: #ffffff;
        border: 2px solid rgba(251, 191, 36, 0.3);
        border-radius: 1rem;
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
        box-shadow: 0 12px 40px rgba(251, 191, 36, 0.4),
          0 0 30px rgba(251, 191, 36, 0.2);
        transform: translateY(-4px) scale(1.01);
        border-color: rgba(251, 191, 36, 0.6);
      }

      .pet-image-container {
        position: relative;
        flex-shrink: 0;
        width: 300px;
        height: 300px;
      }

      .pet-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0.75rem;
        border: 4px solid #fbbf24;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4),
          inset 0 0 20px rgba(0, 0, 0, 0.3);
        transition: all 0.4s ease;
      }

      .pet-card:hover .pet-image {
        transform: scale(1.05);
        box-shadow: 0 12px 32px rgba(251, 191, 36, 0.6),
          inset 0 0 25px rgba(0, 0, 0, 0.4);
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
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4),
          inset 0 0 20px rgba(0, 0, 0, 0.3);
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

      .heart-icon {
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 1.5rem;
        background: rgba(251, 191, 36, 0.95);
        width: 45px;
        height: 45px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.5),
          0 0 15px rgba(251, 191, 36, 0.3);
        z-index: 10;
        transition: all 0.3s ease;
        cursor: pointer;
      }

      .heart-icon:hover {
        transform: scale(1.2) rotate(10deg);
        box-shadow: 0 6px 20px rgba(251, 191, 36, 0.7),
          0 0 25px rgba(251, 191, 36, 0.5);
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

      .personality-box {
        font-size: 0.875rem;
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

      .pet-details-dialog {
        color: #000000;
      }

      .pet-details-dialog h3 {
        color: #fbbf24;
        margin-bottom: 1rem;
      }

      .pet-details-dialog p {
        margin-bottom: 0.5rem;
        color: rgb(209, 210, 212);
        font-weight: 500;
        font-size: 1rem;
      }

      .pet-details-dialog p strong {
        color: #fbbf24;
        font-weight: 700;
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
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(251, 191, 36, 0.6),
          0 0 25px rgba(251, 191, 36, 0.4) !important;
      }

      ::ng-deep .pet-card p-button button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep .pet-card p-button button:active:not(:disabled) {
        transform: translateY(-1px) scale(1.02) !important;
      }

      @media (max-width: 1024px) {
        .pet-card {
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

      @media (max-width: 768px) {
        .section-title {
          font-size: 2rem;
        }

        .pets-list-container {
          padding: 1rem;
        }

        .pet-card {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class PetsListComponent {
  public petsStore = inject(PetsStore);
  public foundationsStore = inject(FoundationsStore);
  private router = inject(Router);

  public filters = input<MatchFilters | null>(null);
  public useDemoData = input<boolean>(false);
  public demoPets = input<Pet[]>([]);
  public searchTerm = signal('');
  public showPetDetails = signal(false);
  public selectedPet = signal<Pet | null>(null);

  public filteredPets = computed(() => {
    // Usar datos de ejemplo si el switch está activado
    let pets = this.useDemoData()
      ? this.demoPets().filter((p) => p.is_available)
      : this.petsStore.entities().filter((p) => p.is_available);

    const currentFilters = this.filters();
    if (currentFilters) {
      if (currentFilters.species) {
        pets = pets.filter((p) => p.species === currentFilters.species);
      }
      if (currentFilters.location) {
        // Filtrar por ubicación si está disponible en el modelo
        const locationLower = currentFilters.location.toLowerCase();
        pets = pets.filter((p) => {
          const foundationName = p.foundation?.name?.toLowerCase() || '';
          return foundationName.includes(locationLower);
        });
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
      small: 'Pequeño',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }

  public getInterestCount(petId: string): number {
    // TODO: Implementar contador real desde AdoptionApplicationsStore
    return Math.floor(Math.random() * 10) + 1;
  }

  public getWeight(pet: Pet): number {
    // TODO: Agregar campo weight al modelo Pet
    // Por ahora retornamos un valor por defecto basado en el tamaño
    const weightMap: Record<string, number> = {
      small: 1,
      medium: 5,
      large: 15,
    };
    return weightMap[pet.size] || 1;
  }

  public sharePet(pet: Pet, event: Event): void {
    event.preventDefault();
    if (navigator.share) {
      navigator.share({
        title: `Adopta a ${pet.name}`,
        text: `Mira esta mascota disponible para adopción: ${pet.name}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(window.location.href);
    }
  }

  public showMoreInfo(pet: Pet, event: Event): void {
    event.preventDefault();
    this.selectedPet.set(pet);
    this.showPetDetails.set(true);
  }

  public openAdoptionForm(pet: Pet): void {
    this.router.navigate(['/adoptions/adoptar', pet.id]);
  }
}
