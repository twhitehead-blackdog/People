import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PetMatch } from '../models';
import { PetMatchesStore } from '../stores/pet-matches.store';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { DemoModeService } from './demo-mode.service';
import { PetMatchCardComponent } from './pet-match-card.component';
import { PetMatchFiltersComponent, PetMatchFilters } from './pet-match-filters.component';

@Component({
  selector: 'pt-pet-matches-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Button, ToastModule, PetMatchCardComponent, PetMatchFiltersComponent],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="pet-matches-section">
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
              <h1 class="hero-title">BUSCO PAREJA</h1>
              <div class="heart-icon-wrapper heart-2">
                <span class="heart-icon">â¤ï¸</span>
                <span class="sparkle-icon sparkle-2">âœ¨</span>
              </div>
            </div>
            
            <p class="hero-subtitle">
              ðŸ’ Â¡El Tinder de las mascotas! Encuentra la pareja perfecta para tu peludo amigo ðŸ¾
            </p>

            <!-- Stats -->
            <div class="hero-stats">
              <div class="stat-badge stat-1">
                <span class="stat-icon">ðŸ‘¥</span>
                <span class="stat-text">{{ filteredMatches().length }} mascotas disponibles</span>
              </div>
              <div class="stat-badge stat-2">
                <span class="stat-icon">ðŸ“ˆ</span>
                <span class="stat-text">Â¡En tendencia!</span>
              </div>
              <div class="stat-badge stat-3">
                <span class="stat-icon">â­</span>
                <span class="stat-text">100% Gratis</span>
              </div>
            </div>
            
            <p-button
              label="âž• Â¡Publicar Mi Mascota Ahora! ðŸš€"
              [style]="{
                background: 'linear-gradient(to right, #ec4899, #a855f7, #FDB022)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '1.5rem 2rem',
                marginTop: '1rem',
                fontSize: '1.25rem',
                borderRadius: '1rem',
                boxShadow: '0 8px 25px rgba(251, 191, 36, 0.6)'
              }"
              (onClick)="navigateToForm()"
              [disabled]="!isAuthenticated()"
            />
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Search and Filters -->
        <div class="filters-wrapper">
          <pt-pet-match-filters (filtersChanged)="onFiltersChanged($event)" />
        </div>

        <!-- Tabs -->
        <div class="tabs-container">
          <div class="tabs-list">
            <button 
              class="tab-trigger" 
              [class.active]="activeTab() === 'all'"
              (click)="setActiveTab('all')"
            >
              âœ¨ Todos
            </button>
            <button 
              class="tab-trigger" 
              [class.active]="activeTab() === 'dog'"
              (click)="setActiveTab('dog')"
            >
              ðŸ• Perritos
            </button>
            <button 
              class="tab-trigger" 
              [class.active]="activeTab() === 'cat'"
              (click)="setActiveTab('cat')"
            >
              ðŸ± Gatitos
            </button>
          </div>
        </div>

        <!-- Results count -->
        <div class="results-count">
          <div class="results-badge">
            <span class="sparkle-icon">âœ¨</span>
            Mostrando <span class="count-number">{{ filteredByTab().length }}</span> 
            {{ filteredByTab().length === 1 ? 'mascota disponible' : 'mascotas disponibles' }} ðŸ’•
          </div>
        </div>

        <!-- Pet Grid -->
        <div class="matches-grid">
          @if (filteredByTab().length > 0) {
            @for (match of filteredByTab(); track match.id) {
              <pt-pet-match-card [petMatch]="match" />
            }
          } @else {
            <div class="empty-state">
              <div class="empty-heart-wrapper">
                <div class="empty-heart-main">
                  <span class="empty-heart-icon">â¤ï¸</span>
                </div>
                <div class="empty-heart-small-1">
                  <span class="empty-heart-icon">â¤ï¸</span>
                </div>
                <div class="empty-heart-small-2">
                  <span class="empty-sparkle-icon">âœ¨</span>
                </div>
              </div>
              <h3 class="empty-title">Â¡Ups! No hay mascotas aquÃ­ ðŸ¾</h3>
              <p class="empty-description">
                Parece que no encontramos ninguna mascota buscando amor. Â¡SÃ© el primero en publicar y ayuda a tu peludo a encontrar su media naranja! ðŸ’•
              </p>
              <p-button
                label="âž• Â¡Publicar Mi Mascota Ahora! âœ¨"
                [style]="{
                  background: 'linear-gradient(to right, #FDB022, #fcd34d, #fbbf24)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 'bold',
                  padding: '1.5rem 2rem',
                  marginTop: '1rem',
                  fontSize: '1.125rem',
                  borderRadius: '1rem',
                  boxShadow: '0 8px 25px rgba(251, 191, 36, 0.6)'
                }"
                (onClick)="navigateToForm()"
                [disabled]="!isAuthenticated()"
              />
              <div class="empty-decorative">
                <span class="decorative-emoji">ðŸ•</span>
                <span class="decorative-emoji">ðŸ’</span>
                <span class="decorative-emoji">ðŸ±</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .pet-matches-section {
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

      .hero-stats {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
      }

      .stat-badge {
        background: linear-gradient(to right, #ec4899 0%, #db2777 100%);
        color: #ffffff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .stat-badge:hover {
        transform: scale(1.05);
      }

      .stat-2 {
        background: linear-gradient(to right, #a855f7 0%, #9333ea 100%);
      }

      .stat-3 {
        background: linear-gradient(to right, #FDB022 0%, #fbbf24 100%);
        color: #000000;
      }

      .stat-icon {
        font-size: 1rem;
      }

      /* Main Content */
      .main-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: 3rem 1rem;
      }

      .filters-wrapper {
        margin-bottom: 2.5rem;
      }

      /* Tabs */
      .tabs-container {
        margin-bottom: 2rem;
        display: flex;
        justify-content: center;
      }

      .tabs-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        width: 100%;
        max-width: 512px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(8px);
        padding: 0.5rem;
        border-radius: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 2px solid rgba(168, 85, 247, 0.2);
        gap: 0.5rem;
      }

      .tab-trigger {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: none;
        background: transparent;
        color: #374151;
        font-size: 1.125rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .tab-trigger.active {
        background: linear-gradient(to right, #ec4899 0%, #a855f7 100%);
        color: #ffffff;
      }

      .tab-trigger:not(.active):hover {
        background: rgba(168, 85, 247, 0.1);
      }

      /* Results Count */
      .results-count {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
      }

      .results-badge {
        background: linear-gradient(to right, #f3e8ff 0%, #fce7f3 100%);
        color: #6b21a8;
        border: 2px solid rgba(168, 85, 247, 0.3);
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 1.125rem;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .count-number {
        font-weight: 700;
        margin: 0 0.25rem;
      }

      /* Matches Grid */
      .matches-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
        margin-bottom: 4rem;
      }

      /* Empty State */
      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 5rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
      }

      .empty-heart-wrapper {
        position: relative;
        margin-bottom: 2rem;
        animation: bounce 2s ease-in-out infinite;
      }

      .empty-heart-main {
        width: 128px;
        height: 128px;
        background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .empty-heart-icon {
        font-size: 4rem;
      }

      .empty-heart-small-1 {
        position: absolute;
        top: -0.5rem;
        right: -0.5rem;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #f9a8d4 0%, #f472b6 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        animation: pulse 2s ease-in-out infinite;
      }

      .empty-heart-small-2 {
        position: absolute;
        bottom: -0.5rem;
        left: -0.5rem;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }

      .empty-sparkle-icon {
        font-size: 1.25rem;
      }

      .empty-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #374151;
        margin: 0;
      }

      .empty-description {
        font-size: 1.125rem;
        color: #6b7280;
        max-width: 512px;
        margin: 0;
      }

      .empty-decorative {
        display: flex;
        gap: 1rem;
        margin-top: 3rem;
        opacity: 0.5;
      }

      .decorative-emoji {
        font-size: 2rem;
        animation: bounce 2s ease-in-out infinite;
      }

      .decorative-emoji:nth-child(1) {
        animation-delay: 0s;
      }

      .decorative-emoji:nth-child(2) {
        animation-delay: 0.15s;
      }

      .decorative-emoji:nth-child(3) {
        animation-delay: 0.3s;
      }

      ::ng-deep .pet-matches-section p-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
      }

      ::ng-deep .pet-matches-section p-button button::before {
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

      ::ng-deep .pet-matches-section p-button button:hover {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }

      ::ng-deep .pet-matches-section p-button button:hover::before {
        left: 100% !important;
      }

      @media (max-width: 1024px) {
        .hero-title {
          font-size: 2.5rem;
        }

        .matches-grid {
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
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

        .stat-badge {
          font-size: 0.875rem;
          padding: 0.375rem 0.75rem;
        }

        .main-content {
          padding: 2rem 1rem;
        }

        .matches-grid {
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        .tabs-list {
          max-width: 100%;
        }

        .tab-trigger {
          font-size: 1rem;
          padding: 0.5rem 0.75rem;
        }
      }
    `,
  ],
})
export class PetMatchesSectionComponent {
  private router = inject(Router);
  public petMatchesStore = inject(PetMatchesStore);
  private authWrapper = inject(AuthWrapperService);
  private demoModeService = inject(DemoModeService);
  private messageService = inject(MessageService);

  public useDemoData = this.demoModeService.useDemoData;
  public currentFilters = signal<PetMatchFilters | null>(null);
  public activeTab = signal<'all' | 'dog' | 'cat'>('all');
  public demoMatches = signal<PetMatch[]>([]);

  constructor() {
    this.initializeDemoData();
  }

  public isAuthenticated = computed(() => {
    return this.authWrapper.currentUser() !== null;
  });

  public filteredByTab = computed(() => {
    let matches = this.filteredMatches();
    
    if (this.activeTab() === 'all') {
      return matches;
    }
    
    return matches.filter(m => m.species === this.activeTab());
  });

  public setActiveTab(tab: 'all' | 'dog' | 'cat'): void {
    this.activeTab.set(tab);
  }

  public filteredMatches = computed(() => {
    // Usar datos demo si el modo demo estÃ¡ activado, sino usar datos reales
    let matches = this.useDemoData() 
      ? this.demoMatches().filter((m) => m.is_active)
      : this.petMatchesStore.entities().filter((m) => m.is_active);

    const filters = this.currentFilters();
    if (!filters) {
      return matches;
    }

    // Filtrar por especie
    if (filters.species) {
      matches = matches.filter((m) => m.species === filters.species);
    }

    // Filtrar por gÃ©nero
    if (filters.gender) {
      matches = matches.filter((m) => m.gender === filters.gender);
    }

    // Filtrar por tamaÃ±o
    if (filters.size) {
      matches = matches.filter((m) => m.size === filters.size);
    }

    // Filtrar por edad
    if (filters.minAge !== null && filters.minAge !== undefined) {
      matches = matches.filter((m) => m.age !== undefined && m.age >= filters.minAge!);
    }
    if (filters.maxAge !== null && filters.maxAge !== undefined) {
      matches = matches.filter((m) => m.age !== undefined && m.age <= filters.maxAge!);
    }

    // Filtrar por ubicaciÃ³n
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      matches = matches.filter((m) => {
        return m.location?.toLowerCase().includes(locationLower);
      });
    }

    // Filtrar por raza
    if (filters.breed) {
      const breedLower = filters.breed.toLowerCase();
      matches = matches.filter((m) => {
        return m.breed?.toLowerCase().includes(breedLower);
      });
    }

    // Filtrar por preferencia de raza
    if (filters.preferredBreedMatch) {
      matches = matches.filter((m) => m.preferred_breed_match === filters.preferredBreedMatch);
    }

    // Filtrar por tÃ©rmino de bÃºsqueda
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      matches = matches.filter((m) => {
        return (
          m.pet_name.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower) ||
          m.breed?.toLowerCase().includes(searchLower)
        );
      });
    }

    return matches;
  });

  public onFiltersChanged(filters: PetMatchFilters): void {
    this.currentFilters.set(filters);
  }

  public navigateToForm(): void {
    if (!this.isAuthenticated()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Inicio de sesiÃ³n requerido',
        detail: 'Por favor inicia sesiÃ³n para publicar tu mascota buscando pareja',
        life: 3000
      });
      // PequeÃ±o delay para que el usuario vea el mensaje antes de redirigir
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: '/adoptions/busco-pareja/publicar' }
        });
      }, 500);
      return;
    }
    
    // Navegar al formulario de publicaciÃ³n
    this.router.navigate(['/adoptions/busco-pareja/publicar']).then((success) => {
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Â¡Vamos a publicar!',
          detail: 'Completa el formulario para encontrar la pareja perfecta para tu mascota',
          life: 3000
        });
      }
    }).catch((error) => {
      console.error('Error al navegar al formulario:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo abrir el formulario. Por favor intenta de nuevo.',
        life: 3000
      });
    });
  }

  private initializeDemoData(): void {
    const demoMatches: PetMatch[] = [
      {
        id: 'demo-match-1',
        user_id: 'demo-user-1',
        pet_name: 'Max',
        species: 'dog',
        breed: 'Golden Retriever',
        breed_type: 'pure',
        breed_primary: 'Golden Retriever',
        age: 3,
        age_years: 3,
        age_months: 0,
        gender: 'M',
        size: 'large',
        color: 'Dorado',
        weight: 28,
        description: 'Max es un perro muy cariÃ±oso y juguetÃ³n. Le encanta jugar en el parque y estÃ¡ buscando una pareja para compartir aventuras. Es muy sociable y se lleva bien con otros perros.',
        health_status: 'Saludable, vacunado y esterilizado',
        location: 'Ciudad de PanamÃ¡, San Francisco',
        contact_info: {
          email: 'max.owner@demo.com',
          phone: '+507 6123-4567',
          preferred_contact: 'both'
        },
        preferred_breed_match: 'both',
        personality: ['amigable', 'juguetÃ³n', 'sociable', 'activo'],
        photos: ['assets/dog1.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15')
      },
      {
        id: 'demo-match-2',
        user_id: 'demo-user-2',
        pet_name: 'Luna',
        species: 'cat',
        breed: 'Persa',
        breed_type: 'pure',
        breed_primary: 'Persa',
        age: 2,
        age_years: 2,
        age_months: 4,
        gender: 'F',
        size: 'small',
        color: 'Blanco y gris',
        weight: 4,
        description: 'Luna es una gata muy dulce y tranquila. Le encanta recibir mimos y estÃ¡ buscando un compaÃ±ero felino para compartir su hogar. Es muy cariÃ±osa y se adapta bien a nuevos ambientes.',
        health_status: 'Saludable, vacunada y esterilizada',
        location: 'PanamÃ¡, Bella Vista',
        contact_info: {
          email: 'luna.owner@demo.com',
          phone: '+507 6234-5678',
          preferred_contact: 'email'
        },
        preferred_breed_match: 'same',
        personality: ['tranquila', 'cariÃ±osa', 'dÃ³cil', 'curiosa'],
        photos: ['assets/cat1.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-01-20'),
        updated_at: new Date('2024-01-20')
      },
      {
        id: 'demo-match-3',
        user_id: 'demo-user-3',
        pet_name: 'Rocky',
        species: 'dog',
        breed: 'Bulldog FrancÃ©s',
        breed_type: 'pure',
        breed_primary: 'Bulldog FrancÃ©s',
        age: 1,
        age_years: 1,
        age_months: 6,
        gender: 'M',
        size: 'small',
        color: 'Atigrado',
        weight: 12,
        description: 'Rocky es un perrito muy enÃ©rgico y divertido. Aunque es pequeÃ±o, tiene mucha personalidad. EstÃ¡ buscando una pareja para jugar y hacer ejercicio juntos.',
        health_status: 'Saludable, vacunado',
        location: 'PanamÃ¡, El Cangrejo',
        contact_info: {
          email: 'rocky.owner@demo.com',
          phone: '+507 6345-6789',
          preferred_contact: 'phone'
        },
        preferred_breed_match: 'different',
        personality: ['enÃ©rgico', 'divertido', 'juguetÃ³n', 'inteligente'],
        photos: ['assets/dog2.jpg'],
        is_vaccinated: true,
        is_sterilized: false,
        is_active: true,
        created_at: new Date('2024-02-01'),
        updated_at: new Date('2024-02-01')
      },
      {
        id: 'demo-match-4',
        user_id: 'demo-user-4',
        pet_name: 'Mia',
        species: 'cat',
        breed: 'SiamÃ©s',
        breed_type: 'pure',
        breed_primary: 'SiamÃ©s',
        age: 1,
        age_years: 1,
        age_months: 8,
        gender: 'F',
        size: 'small',
        color: 'Crema y marrÃ³n',
        weight: 3.5,
        description: 'Mia es una gatita muy curiosa y activa. Le encanta explorar y jugar. EstÃ¡ buscando un compaÃ±ero felino con quien compartir sus aventuras diarias.',
        health_status: 'Saludable, vacunada y esterilizada',
        location: 'PanamÃ¡, Obarrio',
        contact_info: {
          email: 'mia.owner@demo.com',
          phone: '+507 6456-7890',
          preferred_contact: 'both'
        },
        preferred_breed_match: 'both',
        personality: ['curiosa', 'activa', 'juguetona', 'sociable'],
        photos: ['assets/cat2.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-02-10'),
        updated_at: new Date('2024-02-10')
      },
      {
        id: 'demo-match-5',
        user_id: 'demo-user-5',
        pet_name: 'Toby',
        species: 'dog',
        breed: 'Labrador',
        breed_type: 'pure',
        breed_primary: 'Labrador',
        age: 4,
        age_years: 4,
        age_months: 2,
        gender: 'M',
        size: 'large',
        color: 'Negro',
        weight: 32,
        description: 'Toby es un perro muy leal y protector. Es muy cariÃ±oso con su familia y estÃ¡ buscando una pareja para formar una familia. Le encanta nadar y jugar al aire libre.',
        health_status: 'Saludable, vacunado y esterilizado',
        location: 'PanamÃ¡, Costa del Este',
        contact_info: {
          email: 'toby.owner@demo.com',
          phone: '+507 6567-8901',
          preferred_contact: 'email'
        },
        preferred_breed_match: 'same',
        personality: ['leal', 'protector', 'cariÃ±oso', 'activo'],
        photos: ['assets/dog3.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-02-15'),
        updated_at: new Date('2024-02-15')
      },
      {
        id: 'demo-match-6',
        user_id: 'demo-user-6',
        pet_name: 'Nina',
        species: 'cat',
        breed: 'Mestiza',
        breed_type: 'mixed',
        breed_primary: 'Persa',
        breed_secondary: 'SiamÃ©s',
        breed_percentage_primary: 60,
        breed_percentage_secondary: 40,
        age: 1,
        age_years: 1,
        age_months: 3,
        gender: 'F',
        size: 'small',
        color: 'Tricolor',
        weight: 3,
        description: 'Nina es una gatita joven y muy juguetona. Es una mezcla de Persa y SiamÃ©s, lo que le da una personalidad Ãºnica. EstÃ¡ buscando un compaÃ±ero para jugar y crecer juntos.',
        health_status: 'Saludable, vacunada y esterilizada',
        location: 'PanamÃ¡, San Francisco',
        contact_info: {
          email: 'nina.owner@demo.com',
          phone: '+507 6678-9012',
          preferred_contact: 'both'
        },
        preferred_breed_match: 'both',
        personality: ['juguetona', 'curiosa', 'cariÃ±osa', 'activa'],
        photos: ['assets/cat3.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-02-20'),
        updated_at: new Date('2024-02-20')
      },
      {
        id: 'demo-match-7',
        user_id: 'demo-user-7',
        pet_name: 'Zeus',
        species: 'dog',
        breed: 'Pastor AlemÃ¡n',
        breed_type: 'pure',
        breed_primary: 'Pastor AlemÃ¡n',
        age: 5,
        age_years: 5,
        age_months: 0,
        gender: 'M',
        size: 'large',
        color: 'Negro y marrÃ³n',
        weight: 35,
        description: 'Zeus es un perro muy inteligente y entrenado. Es excelente con niÃ±os y estÃ¡ buscando una pareja para formar una familia. Le encanta hacer ejercicio y aprender nuevos trucos.',
        health_status: 'Saludable, vacunado y esterilizado',
        location: 'PanamÃ¡, Clayton',
        contact_info: {
          email: 'zeus.owner@demo.com',
          phone: '+507 6789-0123',
          preferred_contact: 'phone'
        },
        preferred_breed_match: 'both',
        personality: ['inteligente', 'leal', 'protector', 'obediente'],
        photos: ['assets/dog1.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-02-25'),
        updated_at: new Date('2024-02-25')
      },
      {
        id: 'demo-match-8',
        user_id: 'demo-user-8',
        pet_name: 'Chloe',
        species: 'cat',
        breed: 'British Shorthair',
        breed_type: 'pure',
        breed_primary: 'British Shorthair',
        age: 3,
        age_years: 3,
        age_months: 1,
        gender: 'F',
        size: 'medium',
        color: 'Gris',
        weight: 5,
        description: 'Chloe es una gata muy tranquila y elegante. Le encanta descansar en lugares cÃ³modos y recibir atenciÃ³n. EstÃ¡ buscando un compaÃ±ero tranquilo con quien compartir su espacio.',
        health_status: 'Saludable, vacunada y esterilizada',
        location: 'PanamÃ¡, Punta PacÃ­fica',
        contact_info: {
          email: 'chloe.owner@demo.com',
          phone: '+507 6890-1234',
          preferred_contact: 'email'
        },
        preferred_breed_match: 'same',
        personality: ['tranquila', 'elegante', 'cariÃ±osa', 'dÃ³cil'],
        photos: ['assets/cat1.jpg'],
        is_vaccinated: true,
        is_sterilized: true,
        is_active: true,
        created_at: new Date('2024-03-01'),
        updated_at: new Date('2024-03-01')
      }
    ];

    this.demoMatches.set(demoMatches);
  }
}





