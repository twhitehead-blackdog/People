import { Component, inject, signal, OnInit, computed, AfterViewInit, effect } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@auth0/auth0-angular';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { PetsStore } from '../stores/pets.store';
import { PetFavoritesStore } from '../stores/pet-favorites.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { Pet } from '../models';
import { take } from 'rxjs/operators';

@Component({
  selector: 'pt-pet-detail',
  standalone: true,
  imports: [
    CommonModule,
    Button,
    TagModule,
    DialogModule,
  ],
  template: `
    <div class="pet-detail-container">
      @if (pet()) {
        <!-- Hero Section with Main Photo -->
        <div class="pet-hero">
          <button class="back-button" (click)="goBack()" title="Volver">
            ← Volver
          </button>
          <div class="hero-image-container">
            @if (!pet()!.is_available) {
              <p-tag 
                severity="secondary" 
                value="ADOPTADA" 
                icon="pi pi-check"
                class="adopted-badge-detail"
              />
            }
            @if (pet()?.photos && pet()!.photos!.length > 0) {
              <div class="main-photo-wrapper">
                <img
                  [src]="pet()!.photos![currentPhotoIndex()]"
                  [alt]="pet()!.name"
                  class="main-photo"
                />
                @if (pet()!.photos!.length > 1) {
                  <button
                    class="photo-nav photo-prev"
                    (click)="previousPhoto()"
                    [disabled]="currentPhotoIndex() === 0"
                    title="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    class="photo-nav photo-next"
                    (click)="nextPhoto()"
                    [disabled]="currentPhotoIndex() === (pet()!.photos?.length ?? 0) - 1"
                    title="Foto siguiente"
                  >
                    ›
                  </button>
                  <div class="photo-counter">
                    {{ currentPhotoIndex() + 1 }} / {{ pet()!.photos?.length ?? 0 }}
                  </div>
                }
                <button
                  class="favorite-button-detail"
                  [class.favorited]="isFavorite()"
                  (click)="toggleFavorite()"
                  [title]="isFavorite() ? 'Quitar de favoritos' : 'Agregar a favoritos'"
                >
                  {{ isFavorite() ? '❤️' : '🤍' }}
                </button>
              </div>
              @if (pet()?.photos && pet()!.photos!.length > 1) {
                <div class="photo-thumbnails">
                  @for (photo of pet()!.photos!; track photo; let i = $index) {
                    <img
                      [src]="photo"
                      [alt]="'Foto ' + (i + 1)"
                      class="thumbnail"
                      [class.active]="i === currentPhotoIndex()"
                      (click)="goToPhoto(i)"
                    />
                  }
                </div>
              }
            } @else {
              <div class="no-photo-placeholder">
                <span class="placeholder-icon">{{ pet()!.species === 'dog' ? '🐕' : pet()!.species === 'cat' ? '🐱' : '🐾' }}</span>
                <p>Sin fotos disponibles</p>
              </div>
            }
          </div>
        </div>

        <!-- Main Content -->
        <div class="pet-content">
          <!-- Pet Info Card -->
          <div class="info-section">
            <div class="pet-header">
              <div class="pet-title-group">
                <h1 class="pet-name">{{ pet()!.name }}</h1>
                <div class="pet-badges">
                  <p-tag
                    [value]="getSpeciesLabel(pet()!.species)"
                    severity="info"
                  />
                  <p-tag
                    [value]="pet()!.gender === 'M' ? 'Macho' : 'Hembra'"
                    severity="secondary"
                  />
                  <p-tag
                    [value]="getSizeLabel(pet()!.size)"
                    severity="contrast"
                  />
                  @if (pet()!.is_available) {
                    <p-tag value="Disponible" severity="success" />
                  } @else {
                    <p-tag value="Adoptada" severity="danger" />
                  }
                </div>
              </div>
            </div>

            @if (pet()!.description) {
              <div class="description-section">
                <h3 class="section-title">📝 Sobre {{ pet()!.name }}</h3>
                <p class="description-text">{{ pet()!.description }}</p>
              </div>
            }

            <!-- Pet Details Grid -->
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">🏠 Fundación</span>
                <span class="detail-value">{{ pet()!.foundation?.name || 'N/A' }}</span>
              </div>
              @if (pet()!.age) {
                <div class="detail-item">
                  <span class="detail-label">🎂 Edad</span>
                  <span class="detail-value">{{ pet()!.age }} años</span>
                </div>
              }
              @if (pet()!.breed) {
                <div class="detail-item">
                  <span class="detail-label">🐾 Raza</span>
                  <span class="detail-value">{{ pet()!.breed }}</span>
                </div>
              }
              @if (pet()!.color) {
                <div class="detail-item">
                  <span class="detail-label">🎨 Color</span>
                  <span class="detail-value">{{ pet()!.color }}</span>
                </div>
              }
              @if (pet()!.weight) {
                <div class="detail-item">
                  <span class="detail-label">⚖️ Peso</span>
                  <span class="detail-value">{{ pet()!.weight }} kg</span>
                </div>
              }
              <div class="detail-item">
                <span class="detail-label">💉 Vacunado</span>
                <span class="detail-value">
                  <p-tag
                    [value]="pet()!.is_vaccinated ? 'Sí' : 'No'"
                    [severity]="pet()!.is_vaccinated ? 'success' : 'danger'"
                  />
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">✂️ Esterilizado</span>
                <span class="detail-value">
                  <p-tag
                    [value]="pet()!.is_sterilized ? 'Sí' : 'No'"
                    [severity]="pet()!.is_sterilized ? 'success' : 'danger'"
                  />
                </span>
              </div>
            </div>

            @if (pet()!.personality && pet()!.personality!.length > 0) {
              <div class="personality-section">
                <h3 class="section-title">✨ Personalidad</h3>
                <div class="personality-tags">
                  @for (trait of pet()!.personality; track trait) {
                    <p-tag [value]="trait" severity="info" />
                  }
                </div>
              </div>
            }

            @if (pet()!.health_status) {
              <div class="health-section">
                <h3 class="section-title">🏥 Estado de Salud</h3>
                <p class="health-text">{{ pet()!.health_status }}</p>
              </div>
            }

            @if (pet()!.foundation) {
              <div class="foundation-section">
                <h3 class="section-title">🏢 Información de la Fundación</h3>
                <div class="foundation-info">
                  <p><strong>Nombre:</strong> {{ pet()!.foundation!.name }}</p>
                  @if (pet()!.foundation!.address) {
                    <p><strong>Dirección:</strong> {{ pet()!.foundation!.address }}</p>
                  }
                  @if (pet()!.foundation!.phone_number) {
                    <p><strong>Teléfono:</strong> {{ pet()!.foundation!.phone_number }}</p>
                  }
                  @if (pet()!.foundation!.email) {
                    <p><strong>Email:</strong> {{ pet()!.foundation!.email }}</p>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="actions-section">
            @if (pet()!.is_available) {
              <p-button
                label="PREGUNTAR POR MI"
                icon="pi pi-heart"
                (onClick)="openAdoptionForm()"
                [style]="{
                  background: 'linear-gradient(to right, #fbbf24, #fcd34d)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 'bold',
                  padding: '1rem 2rem',
                  fontSize: '1.125rem',
                  width: '100%'
                }"
              />
            } @else {
              <p-button
                label="Esta mascota ya fue adoptada"
                [disabled]="true"
                severity="secondary"
                icon="pi pi-lock"
                [style]="{
                  width: '100%',
                  padding: '1rem 2rem'
                }"
              />
            }
            <p-button
              label="Compartir"
              icon="pi pi-share-alt"
              severity="secondary"
              (onClick)="sharePet()"
              [style]="{
                width: '100%',
                marginTop: '1rem'
              }"
            />
          </div>
        </div>
      } @else {
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 3rem; color: #FBBF24;"></i>
          <p>Cargando información de la mascota...</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .pet-detail-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
      }

      .back-button {
        position: absolute;
        top: 2rem;
        left: 2rem;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid #374151;
        border-radius: 0.5rem;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: #000000;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .back-button:hover {
        background: #FBBF24;
        border-color: #FBBF24;
        transform: translateX(-4px);
      }

      .pet-hero {
        position: relative;
        margin-bottom: 2rem;
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .adopted-badge-detail {
        position: absolute;
        top: 2rem;
        right: 2rem;
        z-index: 20;
        font-weight: 700;
        font-size: 1.125rem;
        padding: 0.75rem 1.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .hero-image-container {
        position: relative;
        width: 100%;
        background: #ffffff;
      }

      .main-photo-wrapper {
        position: relative;
        width: 100%;
        height: 500px;
        overflow: hidden;
        background: #374151;
      }

      .main-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .photo-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #374151;
        color: #000000;
        font-size: 2rem;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .photo-nav:hover:not(:disabled) {
        background: #FBBF24;
        border-color: #FBBF24;
        transform: translateY(-50%) scale(1.1);
      }

      .photo-nav:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .photo-prev {
        left: 1rem;
      }

      .photo-next {
        right: 1rem;
      }

      .photo-counter {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        background: rgba(0, 0, 0, 0.7);
        color: #ffffff;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .favorite-button-detail {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid rgba(251, 191, 36, 0.3);
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
        padding: 0;
        line-height: 1;
      }

      .favorite-button-detail:hover {
        background: rgba(251, 191, 36, 0.95);
        border-color: #fbbf24;
        transform: scale(1.1);
      }

      .favorite-button-detail.favorited {
        background: rgba(251, 191, 36, 0.95);
        border-color: #fbbf24;
      }

      .photo-thumbnails {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background: #ffffff;
        overflow-x: auto;
        border-top: 1px solid #e5e7eb;
      }

      .thumbnail {
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 0.5rem;
        cursor: pointer;
        border: 3px solid transparent;
        transition: all 0.3s ease;
        opacity: 0.6;
        flex-shrink: 0;
      }

      .thumbnail:hover {
        opacity: 1;
        transform: scale(1.05);
      }

      .thumbnail.active {
        border-color: #FBBF24;
        opacity: 1;
      }

      .no-photo-placeholder {
        width: 100%;
        height: 500px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #FBBF24 0%, #FBBF24 100%);
        color: #000000;
      }

      .placeholder-icon {
        font-size: 5rem;
        margin-bottom: 1rem;
      }

      .pet-content {
        display: grid;
        grid-template-columns: 1fr 350px;
        gap: 2rem;
      }

      .info-section {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 4px 12px rgba(55, 65, 81, 0.1);
      }

      .pet-header {
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .pet-title-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .pet-name {
        font-size: 2.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .pet-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .section-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 1rem 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .description-section {
        margin-bottom: 2rem;
      }

      .description-text {
        font-size: 1rem;
        line-height: 1.6;
        color: #374151;
        margin: 0;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.75rem;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .detail-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .detail-value {
        font-size: 1rem;
        font-weight: 600;
        color: #000000;
      }

      .personality-section,
      .health-section,
      .foundation-section {
        margin-bottom: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
      }

      .personality-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .health-text {
        font-size: 1rem;
        line-height: 1.6;
        color: #374151;
        margin: 0;
      }

      .foundation-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .foundation-info p {
        margin: 0;
        font-size: 1rem;
        color: #374151;
      }

      .foundation-info strong {
        color: #000000;
        font-weight: 700;
      }

      .actions-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem;
        text-align: center;
      }

      .loading-state p {
        margin-top: 1rem;
        font-size: 1.125rem;
        color: #374151;
      }

      @media (max-width: 1024px) {
        .pet-content {
          grid-template-columns: 1fr;
        }

        .actions-section {
          order: -1;
        }
      }

      @media (max-width: 768px) {
        .pet-detail-container {
          padding: 1rem;
        }

        .back-button {
          top: 1rem;
          left: 1rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .main-photo-wrapper {
          height: 300px;
        }

        .pet-name {
          font-size: 2rem;
        }

        .details-grid {
          grid-template-columns: 1fr;
        }

        .photo-thumbnails {
          padding: 0.5rem;
        }

        .thumbnail {
          width: 70px;
          height: 70px;
        }
      }
    `,
  ],
})
export class PetDetailComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private petsStore = inject(PetsStore);
  private favoritesStore = inject(PetFavoritesStore);
  private applicationsStore = inject(AdoptionApplicationsStore);
  private authService = inject(AuthService);
  private authWrapper = inject(AuthWrapperService);
  private viewportScroller = inject(ViewportScroller);

  public pet = signal<Pet | null>(null);
  public currentPhotoIndex = signal(0);

  constructor() {
    // Escuchar cambios en selectedEntity del store
    effect(() => {
      const selectedPet = this.petsStore.selectedEntity();
      if (selectedPet && (!this.pet() || this.pet()!.id !== selectedPet.id)) {
        this.pet.set(selectedPet);
      }
    });
  }

  public isFavorite = computed(() => {
    const user = this.authWrapper.currentUser();
    if (!user?.email || !this.pet()) {
      return false;
    }
    return this.favoritesStore.isFavorite(user.email, this.pet()!.id);
  });

  ngOnInit(): void {
    const petId = this.route.snapshot.paramMap.get('id');
    if (petId) {
      const pet = this.petsStore.entities().find((p) => p.id === petId);
      if (pet) {
        this.pet.set(pet);
      } else {
        // Si no está en el store, seleccionar para cargar los detalles
        this.petsStore.selectEntity(petId);
        // El effect se encargará de actualizar pet cuando se cargue
      }
    }
  }

  ngAfterViewInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  previousPhoto(): void {
    if (this.currentPhotoIndex() > 0) {
      this.currentPhotoIndex.set(this.currentPhotoIndex() - 1);
    }
  }

  nextPhoto(): void {
    if (this.pet()?.photos && this.currentPhotoIndex() < (this.pet()!.photos?.length ?? 0) - 1) {
      this.currentPhotoIndex.set(this.currentPhotoIndex() + 1);
    }
  }

  goToPhoto(index: number): void {
    this.currentPhotoIndex.set(index);
  }

  toggleFavorite(): void {
    if (!this.pet()) return;

    this.authService.isAuthenticated$.pipe(take(1)).subscribe((isAuth) => {
      if (!isAuth) {
        this.router.navigate(['/auth/login']);
        return;
      }

      const user = this.authWrapper.currentUser();
      if (!user?.email) {
        return;
      }

      this.favoritesStore.toggleFavorite(user.email, this.pet()!.id).subscribe();
    });
  }

  openAdoptionForm(): void {
    if (!this.pet()) return;

    this.authService.isAuthenticated$.pipe(take(1)).subscribe((isAuth) => {
      if (!isAuth) {
        // Redirigir al login con returnUrl para mejorar UX
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: `/adoptions/adoptar/${this.pet()!.id}` }
        });
        return;
      }
      // Solo navegar al formulario de adopción
      this.router.navigate(['/adoptions/adoptar', this.pet()!.id]);
    });
  }

  sharePet(): void {
    if (navigator.share && this.pet()) {
      navigator.share({
        title: `Adopta a ${this.pet()!.name}`,
        text: `Mira esta mascota disponible para adopción: ${this.pet()!.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  goBack(): void {
    this.router.navigate(['/adoptions']);
  }

  getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      small: 'Pequeño',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }
}

