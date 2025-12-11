import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhosphorIconComponent } from '../shared/phosphor-icon.component';
import { Router } from '@angular/router';
import { AdoptionsHeroComponent } from './adoptions-hero.component';
import { AdoptionsMatchComponent, MatchFilters } from './adoptions-match.component';
import { PetsListComponent } from './pets-list.component';
import { AdoptionRequirementsComponent } from './adoption-requirements.component';
import { AdoptionFAQComponent } from './adoption-faq.component';
import { AdoptionEventsComponent } from './adoption-events.component';
import { AdoptionFamiliesComponent } from './adoption-families.component';
import { Pet, Foundation } from '../models';
import { DemoModeService } from './demo-mode.service';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { Button } from 'primeng/button';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'pt-adoptions-home',
  standalone: true,
  imports: [
    CommonModule,
    AdoptionsHeroComponent,
    AdoptionsMatchComponent,
    PetsListComponent,
    AdoptionRequirementsComponent,
    AdoptionFAQComponent,
    AdoptionEventsComponent,
    AdoptionFamiliesComponent,
    Button,
    PhosphorIconComponent,
  ],
  template: `
    <div class="adoptions-home">
      <div class="hero-section-wrapper">
        <pt-adoptions-hero />
        <div class="match-card-wrapper">
          <pt-adoptions-match (filtersChanged)="onFiltersChanged($event)" />
        </div>
      </div>
      
      <div class="adoption-plan-section">
        <div class="adoption-plan-section-inner">
          <h2 class="plan-title">Descubre nuestro plan de adopciones responsables</h2>
          <p class="plan-description">
            ¡Te acompañamos en esta nueva etapa! Conoce un poco más sobre la adopción de perros y la adopción de gatos.
          </p>
          <div class="animate-banner">
            <div class="banner-content">
              <div class="banner-text-wrapper">
                <span class="animate-text">ANIMATE A ADOPTAR</span>
                <div class="text-underline"></div>
              </div>
              <div class="pet-silhouettes">
                <span class="pet-emoji pet-1"><ph-icon name="dog" [size]="32" color="#000000" weight="regular"></ph-icon></span>
                <span class="pet-emoji pet-2"><ph-icon name="cat" [size]="32" color="#000000" weight="regular"></ph-icon></span>
                <span class="pet-emoji pet-3"><ph-icon name="dog" [size]="32" color="#000000" weight="regular"></ph-icon></span>
                <span class="pet-emoji pet-4"><ph-icon name="cat" [size]="32" color="#000000" weight="regular"></ph-icon></span>
                <span class="pet-emoji pet-5"><ph-icon name="cat" [size]="32" color="#000000" weight="regular"></ph-icon></span>
              </div>
            </div>
            <div class="banner-shine"></div>
          </div>
          <div class="adoption-buttons-row">
            <p-button
              label="FUNDACIONES"
              [style]="{
                background: '#ffffff',
                border: '2px solid #fbbf24',
                color: '#000000',
                fontWeight: 'bold',
                padding: '1rem 2rem',
                flex: '1'
              }"
              (onClick)="navigateToFoundations()"
            >
              <ng-template pTemplate="icon">
                <ph-icon name="handshake" [size]="18" color="currentColor" weight="regular"></ph-icon>
              </ng-template>
            </p-button>
            <p-button
              label="FORMULARIO DE ADOPCIÓN"
              [style]="{
                background: '#fbbf24',
                border: 'none',
                color: '#000000',
                fontWeight: 'bold',
                padding: '1rem 2rem',
                flex: '1'
              }"
            />
            <p-button
              label="QUIERO AYUDAR"
              [style]="{
                background: '#ffffff',
                border: '2px solid #fbbf24',
                color: '#000000',
                fontWeight: 'bold',
                padding: '1rem 2rem',
                flex: '1'
              }"
              (onClick)="navigateToHelp()"
            >
              <ng-template pTemplate="icon">
                <ph-icon name="heart" [size]="18" color="currentColor" weight="fill"></ph-icon>
              </ng-template>
            </p-button>
          </div>
        </div>
      </div>

      <div class="navigation-tabs">
        <a href="#requisitos" class="nav-tab" (click)="scrollToSection('requisitos', $event)">
          <span class="tab-icon"><ph-icon name="file-text" [size]="24" color="currentColor" weight="regular"></ph-icon></span>
          <span>REQUISITOS DE ADOPCIÓN</span>
        </a>
        <a href="#faq" class="nav-tab" (click)="scrollToSection('faq', $event)">
          <span class="tab-icon"><ph-icon name="question" [size]="24" color="currentColor" weight="regular"></ph-icon></span>
          <span>PREGUNTAS FRECUENTES</span>
        </a>
        <a href="#eventos" class="nav-tab" (click)="scrollToSection('eventos', $event)">
          <span class="tab-icon"><ph-icon name="calendar" [size]="24" color="currentColor" weight="regular"></ph-icon></span>
          <span>CALENDARIO</span>
        </a>
        <a href="#familias" class="nav-tab" (click)="scrollToSection('familias', $event)">
          <span class="tab-icon"><ph-icon name="house" [size]="24" color="currentColor" weight="regular"></ph-icon></span>
          <span>FAMILIAS</span>
        </a>
        <a href="#aliados" class="nav-tab" (click)="scrollToSection('aliados', $event)">
          <span class="tab-icon"><ph-icon name="paw-print" [size]="24" color="currentColor" weight="regular"></ph-icon></span>
          <span>ALIADOS BLACK DOG</span>
        </a>
      </div>

      <pt-pets-list [filters]="currentFilters()" [useDemoData]="useDemoData()" [demoPets]="demoPets()" />

      <section id="requisitos" class="section-anchor">
        <pt-adoption-requirements />
      </section>

      <section id="faq" class="section-anchor">
        <pt-adoption-faq />
      </section>

      <section id="eventos" class="section-anchor">
        <pt-adoption-events />
      </section>

      <section id="familias" class="section-anchor">
        <pt-adoption-families />
      </section>
    </div>
  `,
  styles: [
    `
      .adoptions-home {
        display: flex;
        flex-direction: column;
      }

      .hero-section-wrapper {
        position: relative;
      }

      .match-card-wrapper {
        position: absolute;
        top: 50%;
        right: 2rem;
        transform: translateY(-50%);
        width: 400px;
        max-width: calc(100% - 4rem);
        z-index: 20;
        pointer-events: auto;
      }

      @media (max-width: 1024px) {
        .match-card-wrapper {
          position: static;
          transform: none;
          width: 100%;
          padding: 2rem;
          background: #ffffff;
        }
      }

      @media (max-width: 768px) {
        .match-card-wrapper {
          padding: 1rem;
        }
      }

      .adoption-plan-section {
        background: #ffffff;
        width: 100%;
        padding: 3rem 0;
        text-align: center;
      }

      .adoption-plan-section-inner {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .plan-title {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 1rem 0;
      }

      .plan-description {
        font-size: 1.125rem;
        color: #6b7280;
        margin: 0 0 2rem 0;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
      }

      .adoption-buttons-row {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        width: 100%;
        max-width: 1000px;
        margin-left: auto;
        margin-right: auto;
        justify-content: center;
        align-items: center;
      }

      .animate-banner {
        background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 50%, #fbbf24 100%);
        background-size: 200% 100%;
        padding: 2rem 3rem;
        border-radius: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2rem auto;
        max-width: 700px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4),
                    0 0 0 2px rgba(0, 0, 0, 0.1);
        animation: gradientShift 4s ease infinite;
      }

      .banner-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        position: relative;
        z-index: 2;
      }

      .banner-text-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .animate-text {
        font-size: 2rem;
        font-weight: 800;
        color: #000000;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        position: relative;
        animation: textPulse 2s ease-in-out infinite;
      }

      .text-underline {
        width: 80%;
        height: 3px;
        background: linear-gradient(90deg, transparent, #000000, transparent);
        margin-top: 0.5rem;
        border-radius: 2px;
        animation: underlineExpand 2s ease-in-out infinite;
      }

      .pet-silhouettes {
        display: flex;
        gap: 1rem;
        align-items: center;
        justify-content: center;
      }

      .pet-emoji {
        font-size: 2rem;
        display: inline-block;
        animation: petBounce 2s ease-in-out infinite;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        transition: transform 0.3s ease;
      }

      .pet-emoji:hover {
        transform: scale(1.3) rotate(10deg);
      }

      .pet-1 {
        animation-delay: 0s;
      }

      .pet-2 {
        animation-delay: 0.2s;
      }

      .pet-3 {
        animation-delay: 0.4s;
      }

      .pet-4 {
        animation-delay: 0.6s;
      }

      .pet-5 {
        animation-delay: 0.8s;
      }

      .banner-shine {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.3) 50%,
          transparent 70%
        );
        animation: shine 3s infinite;
        pointer-events: none;
      }

      @keyframes gradientShift {
        0%, 100% {
          background-position: 0% center;
        }
        50% {
          background-position: 100% center;
        }
      }

      @keyframes textPulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      @keyframes underlineExpand {
        0%, 100% {
          width: 60%;
        }
        50% {
          width: 100%;
        }
      }

      @keyframes petBounce {
        0%, 100% {
          transform: translateY(0) rotate(0deg);
        }
        50% {
          transform: translateY(-10px) rotate(5deg);
        }
      }

      @keyframes shine {
        0% {
          transform: translateX(-100%) translateY(-100%) rotate(45deg);
        }
        100% {
          transform: translateX(100%) translateY(100%) rotate(45deg);
        }
      }

      .navigation-tabs {
        display: flex;
        justify-content: center;
        gap: 1rem;
        padding: 2rem;
        background: #ffffff;
        flex-wrap: wrap;
        max-width: 1400px;
        margin: 0 auto;
      }

      .nav-tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        text-decoration: none;
        color: #000000;
        font-weight: 600;
        font-size: 0.875rem;
        border-radius: 0.5rem;
        transition: background 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .nav-tab:hover {
        background: #f3f4f6;
      }

      .tab-icon {
        font-size: 2rem;
      }

      .section-anchor {
        scroll-margin-top: 2rem;
      }

      ::ng-deep .adoption-plan-section p-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
      }

      ::ng-deep .adoption-plan-section p-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .adoption-plan-section p-button button:hover {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(251, 191, 36, 0.6), 0 0 25px rgba(251, 191, 36, 0.4) !important;
      }

      ::ng-deep .adoption-plan-section p-button button:hover::before {
        left: 100% !important;
      }

      ::ng-deep .adoption-plan-section p-button button:active {
        transform: translateY(-1px) scale(1.02) !important;
      }

      @media (max-width: 768px) {
        .adoption-plan-section {
          padding: 2rem 0;
        }

        .adoption-plan-section-inner {
          padding: 0 1rem;
        }

        .plan-title {
          font-size: 1.5rem;
        }

        .animate-banner {
          padding: 1.5rem 1.5rem;
          max-width: 100%;
        }

        .banner-content {
          gap: 1rem;
        }

        .animate-text {
          font-size: 1.5rem;
        }

        .pet-emoji {
          font-size: 1.5rem;
        }

        .pet-silhouettes {
          gap: 0.5rem;
        }

        .adoption-buttons-row {
          flex-direction: column;
          gap: 0.75rem;
        }

        .navigation-tabs {
          padding: 1rem;
          gap: 0.5rem;
        }

        .nav-tab {
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
        }

        .tab-icon {
          font-size: 1.5rem;
        }
      }
    `,
  ],
})
export class AdoptionsHomeComponent implements OnInit {
  private demoModeService = inject(DemoModeService);
  private authWrapper = inject(AuthWrapperService);
  private router = inject(Router);
  public currentFilters = signal<MatchFilters | null>(null);
  public useDemoData = this.demoModeService.useDemoData;
  public demoPets = signal<Pet[]>([]);

  constructor() {
    this.initializeDemoData();
  }

  ngOnInit(): void {
    // No redirigir automáticamente desde la página principal
    // La redirección a admin solo ocurre después del login
  }

  private initializeDemoData(): void {
    const demoFoundation: Foundation = {
      id: 'demo-foundation-1',
      name: 'Fundación Black Dog',
      address: 'Calle 50, San Francisco, Ciudad de Panamá',
      phone_number: '+507 6474-5436',
      email: 'info@blackdog.pa',
      is_active: true,
    };

    const demoFoundation2: Foundation = {
      id: 'demo-foundation-2',
      name: 'Refugio de Mascotas Panamá',
      address: 'Vía España, Panamá',
      phone_number: '+507 2234-5678',
      email: 'info@refugio.pa',
      is_active: true,
    };

    const pets: Pet[] = [
      {
        id: 'demo-pet-1',
        name: 'Firulais',
        species: 'dog',
        breed: 'Labrador',
        age: 2,
        gender: 'M',
        size: 'large',
        description: 'Firulais es un perro muy amigable y juguetón. Le encanta jugar con niños y otros perros. Está buscando un hogar lleno de amor y espacio para correr.',
        health_status: 'Saludable',
        is_vaccinated: true,
        is_sterilized: true,
        is_available: true,
        foundation_id: demoFoundation.id,
        foundation: demoFoundation,
        photos: ['assets/dog1.jpg'],
      },
      {
        id: 'demo-pet-2',
        name: 'Luna',
        species: 'cat',
        breed: 'Persa',
        age: 3,
        gender: 'F',
        size: 'small',
        description: 'Luna es una gata tranquila y cariñosa. Le gusta descansar en lugares cómodos y recibir mimos. Perfecta para un hogar tranquilo.',
        health_status: 'Saludable',
        is_vaccinated: true,
        is_sterilized: true,
        is_available: false,
        foundation_id: demoFoundation.id,
        foundation: demoFoundation,
        photos: ['assets/cat1.jpg'],
      },
      {
        id: 'demo-pet-3',
        name: 'Max',
        species: 'dog',
        breed: 'Bulldog',
        age: 1,
        gender: 'M',
        size: 'medium',
        description: 'Max es un cachorro muy activo y juguetón. Necesita una familia que le dedique tiempo para jugar y hacer ejercicio.',
        health_status: 'Saludable',
        is_vaccinated: true,
        is_sterilized: false,
        is_available: true,
        foundation_id: demoFoundation2.id,
        foundation: demoFoundation2,
        photos: ['assets/dog2.jpg'],
      },
      {
        id: 'demo-pet-4',
        name: 'Misu',
        species: 'cat',
        breed: 'Siamés',
        age: 2,
        gender: 'F',
        size: 'small',
        description: 'Misu es una gata muy sociable y curiosa. Le encanta explorar y jugar. Ideal para familias con niños mayores.',
        health_status: 'Saludable',
        is_vaccinated: true,
        is_sterilized: true,
        is_available: true,
        foundation_id: demoFoundation.id,
        foundation: demoFoundation,
        photos: ['assets/cat2.jpg'],
      },
      {
        id: 'demo-pet-5',
        name: 'Toby',
        species: 'dog',
        breed: 'Golden Retriever',
        age: 4,
        gender: 'M',
        size: 'large',
        description: 'Toby es un perro muy leal y protector. Perfecto para una familia que busca un compañero fiel y cariñoso.',
        health_status: 'Saludable',
        is_vaccinated: true,
        is_sterilized: true,
        is_available: true,
        foundation_id: demoFoundation2.id,
        foundation: demoFoundation2,
        photos: ['assets/dog3.jpg'],
      },
      {
        id: 'demo-pet-6',
        name: 'Nina',
        species: 'cat',
        breed: 'Mestiza',
        age: 1,
        gender: 'F',
        size: 'small',
        description: 'Nina es una gatita joven y enérgica. Le encanta jugar y explorar. Necesita un hogar con espacio para correr y jugar.',
        health_status: 'Saludable',
        is_vaccinated: true,
        is_sterilized: true,
        is_available: true,
        foundation_id: demoFoundation.id,
        foundation: demoFoundation,
        photos: ['assets/cat3.jpg'],
      },
    ];

    this.demoPets.set(pets);
  }

  public onFiltersChanged(filters: MatchFilters): void {
    this.currentFilters.set(filters);
  }

  public scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  public navigateToFoundations(): void {
    // Implementar navegación a fundaciones
    console.log('Navegar a fundaciones');
  }

  public navigateToHelp(): void {
    // Implementar navegación a ayuda
    console.log('Navegar a ayuda');
  }
}

