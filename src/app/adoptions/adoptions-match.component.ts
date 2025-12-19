import { Component, signal, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumber } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { PetsStore } from '../stores/pets.store';
import { FoundationsStore } from '../stores/foundations.store';
import { PersonalityTraitsStore } from '../stores/personality-traits.store';

export interface MatchFilters {
  species: 'dog' | 'cat' | null;
  location: string;
  ageMin?: number | null;
  ageMax?: number | null;
  size?: 'small' | 'medium' | 'large' | null;
  gender?: 'M' | 'F' | null;
  breed?: string | null;
  personality?: string[] | null;
  is_vaccinated?: boolean | null;
  is_sterilized?: boolean | null;
  foundation_id?: string | null;
}

@Component({
  selector: 'pt-adoptions-match',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    MultiSelectModule,
    InputNumber,
    CheckboxModule,
    Button,
  ],
  template: `
    <div class="match-card">
      <div class="match-header">
        <h2 class="match-title">¡ENCUENTRA A TU MATCH!</h2>
      </div>

      <div class="match-content">
        <div class="match-question">
          <p>¿QUÉ TIPO DE MASCOTA BUSCAS?</p>
        </div>
        <div class="pet-type-buttons">
          <button
            type="button"
            class="pet-type-button cat-button"
            [class.active]="selectedSpecies() === 'cat'"
            (click)="selectSpecies('cat')"
          >
            <span style="font-size: 3rem;">🐈</span>
            <span>Gato</span>
          </button>
          <button
            type="button"
            class="pet-type-button dog-button"
            [class.active]="selectedSpecies() === 'dog'"
            (click)="selectSpecies('dog')"
          >
            <span style="font-size: 3rem;">🐕</span>
            <span>Perro</span>
          </button>
        </div>

        <div class="match-question">
          <p>¿DÓNDE VIVES?</p>
        </div>
        <div class="location-input-container">
          <span class="location-icon">📍</span>
          <input
            type="text"
            pInputText
            placeholder="INGRESA TU UBICACIÓN"
            [(ngModel)]="location"
            class="location-input"
          />
        </div>

        <div class="advanced-filters-toggle">
          <button
            type="button"
            class="toggle-button"
            (click)="showAdvanced.set(!showAdvanced())"
          >
            {{ showAdvanced() ? '▼' : '▶' }} Búsqueda Avanzada
          </button>
        </div>

        @if (showAdvanced()) {
          <div class="advanced-filters">
            <div class="filter-group">
              <label>Edad (años)</label>
              <div class="age-range">
                <p-inputNumber
                  [(ngModel)]="ageMin"
                  placeholder="Mín"
                  [min]="0"
                  [max]="20"
                  [showButtons]="true"
                  styleClass="age-input"
                />
                <span>a</span>
                <p-inputNumber
                  [(ngModel)]="ageMax"
                  placeholder="Máx"
                  [min]="0"
                  [max]="20"
                  [showButtons]="true"
                  styleClass="age-input"
                />
              </div>
            </div>

            <div class="filter-group">
              <label>Tamaño</label>
              <p-dropdown
                [options]="sizeOptions"
                [(ngModel)]="selectedSize"
                placeholder="Seleccione..."
                [showClear]="true"
              />
            </div>

            <div class="filter-group">
              <label>Género</label>
              <p-dropdown
                [options]="genderOptions"
                [(ngModel)]="selectedGender"
                placeholder="Seleccione..."
                [showClear]="true"
              />
            </div>

            <div class="filter-group">
              <label>Raza</label>
              <p-dropdown
                [options]="breedOptions()"
                [(ngModel)]="selectedBreed"
                placeholder="Seleccione..."
                [showClear]="true"
                [filter]="true"
              />
            </div>

            <div class="filter-group">
              <label>Personalidad</label>
              <p-multiSelect
                [options]="personalityOptions()"
                [(ngModel)]="selectedPersonality"
                placeholder="Seleccione..."
                [showClear]="true"
                [displaySelectedLabel]="true"
                [maxSelectedLabels]="3"
              />
            </div>

            <div class="filter-group">
              <label>Fundación</label>
              <p-dropdown
                [options]="foundationOptions()"
                [(ngModel)]="selectedFoundation"
                placeholder="Seleccione..."
                [showClear]="true"
                optionLabel="name"
                optionValue="id"
                [filter]="true"
              />
            </div>

            <div class="checkbox-group">
              <p-checkbox
                [(ngModel)]="isVaccinated"
                binary="true"
                inputId="vaccinated"
              />
              <label for="vaccinated">Vacunado</label>
            </div>

            <div class="checkbox-group">
              <p-checkbox
                [(ngModel)]="isSterilized"
                binary="true"
                inputId="sterilized"
              />
              <label for="sterilized">Esterilizado</label>
            </div>
          </div>
        }

        <p-button
          label="ENCUENTRA TU MASCOTA"
          [style]="{
            background: '#fbbf24',
            border: 'none',
            color: '#000000',
            fontWeight: 'bold',
            width: '100%',
            padding: '0.875rem',
            marginTop: '1.5rem'
          }"
          (onClick)="findMatch()"
        />
        <p-button
          label="LIMPIAR FILTROS"
          severity="secondary"
          [text]="true"
          [style]="{
            width: '100%',
            marginTop: '0.5rem'
          }"
          (onClick)="clearFilters()"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .match-card {
        background: #ffffff;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        position: relative;
        z-index: 20;
      }

      .match-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 2rem;
      }

      .match-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .match-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .match-question p {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin: 0;
      }

      .pet-type-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .pet-type-button {
        aspect-ratio: 1;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        padding: 1rem;
      }

      .pet-type-button:hover {
        border-color: #fbbf24;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
      }

      .pet-type-button.active {
        border-color: #fbbf24;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      }

      .cat-button.active {
        background: #fb923c;
        color: #ffffff;
        border-color: #fb923c;
      }

      .dog-button.active {
        background: #ec4899;
        color: #ffffff;
        border-color: #ec4899;
      }

      .location-input-container {
        width: 100%;
        position: relative;
        display: flex;
        align-items: center;
      }

      .location-icon {
        position: absolute;
        left: 1rem;
        font-size: 1.25rem;
        z-index: 1;
      }

      .location-input {
        width: 100%;
        padding: 0.875rem 1rem 0.875rem 3rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 1rem;
      }

      .location-input:focus {
        outline: none;
        border-color: #fbbf24;
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
      }

      .advanced-filters-toggle {
        margin-top: 1rem;
      }

      .toggle-button {
        background: transparent;
        border: none;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0.5rem;
        transition: color 0.2s;
      }

      .toggle-button:hover {
        color: #fbbf24;
      }

      .advanced-filters {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-group label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }

      .age-range {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .age-range span {
        color: #6b7280;
        font-weight: 600;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .checkbox-group label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
      }

      ::ng-deep .match-card p-button button {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3) !important;
      }

      ::ng-deep .match-card p-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
        transition: left 0.5s !important;
      }

      ::ng-deep .match-card p-button button:hover {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-3px) scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(251, 191, 36, 0.6), 0 0 25px rgba(251, 191, 36, 0.4) !important;
      }

      ::ng-deep .match-card p-button button:hover::before {
        left: 100% !important;
      }

      ::ng-deep .match-card p-button button:active {
        transform: translateY(-1px) scale(1.02) !important;
      }

      @media (max-width: 768px) {
        .match-card {
          padding: 1.5rem;
        }

        .match-title {
          font-size: 1.25rem;
        }

        .pet-type-button {
          padding: 0.75rem;
        }
      }
    `,
  ],
})
export class AdoptionsMatchComponent {
  private petsStore = inject(PetsStore);
  private foundationsStore = inject(FoundationsStore);
  private personalityTraitsStore = inject(PersonalityTraitsStore);

  public selectedSpecies = signal<'dog' | 'cat' | null>(null);
  public location = signal('');
  public showAdvanced = signal(false);
  public ageMin = signal<number | null>(null);
  public ageMax = signal<number | null>(null);
  public selectedSize = signal<'small' | 'medium' | 'large' | null>(null);
  public selectedGender = signal<'M' | 'F' | null>(null);
  public selectedBreed = signal<string | null>(null);
  public selectedPersonality = signal<string[]>([]);
  public selectedFoundation = signal<string | null>(null);
  public isVaccinated = signal<boolean | null>(null);
  public isSterilized = signal<boolean | null>(null);

  public filtersChanged = output<MatchFilters>();

  public sizeOptions = [
    { label: 'Pequeño', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ];

  public genderOptions = [
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ];

  public breedOptions = computed(() => {
    const pets = this.petsStore.entities();
    const breeds = new Set<string>();
    pets.forEach((pet) => {
      if (pet.breed) {
        breeds.add(pet.breed);
      }
    });
    return Array.from(breeds)
      .sort()
      .map((breed) => ({ label: breed, value: breed }));
  });

  public personalityOptions = computed(() => {
    const traits = this.personalityTraitsStore.entities();
    return traits
      .filter((t) => t.is_active)
      .sort((a, b) => a.display_order - b.display_order)
      .map((t) => ({ label: t.label, value: t.value }));
  });

  public foundationOptions = computed(() => {
    return this.foundationsStore
      .entities()
      .filter((f) => f.is_active)
      .map((f) => ({ name: f.name, id: f.id }));
  });

  public selectSpecies(species: 'dog' | 'cat'): void {
    if (this.selectedSpecies() === species) {
      this.selectedSpecies.set(null);
    } else {
      this.selectedSpecies.set(species);
    }
  }

  public findMatch(): void {
    const filters: MatchFilters = {
      species: this.selectedSpecies(),
      location: this.location(),
      ageMin: this.ageMin(),
      ageMax: this.ageMax(),
      size: this.selectedSize(),
      gender: this.selectedGender(),
      breed: this.selectedBreed(),
      personality: this.selectedPersonality().length > 0 ? this.selectedPersonality() : null,
      is_vaccinated: this.isVaccinated(),
      is_sterilized: this.isSterilized(),
      foundation_id: this.selectedFoundation(),
    };
    this.filtersChanged.emit(filters);
  }

  public clearFilters(): void {
    this.selectedSpecies.set(null);
    this.location.set('');
    this.ageMin.set(null);
    this.ageMax.set(null);
    this.selectedSize.set(null);
    this.selectedGender.set(null);
    this.selectedBreed.set(null);
    this.selectedPersonality.set([]);
    this.selectedFoundation.set(null);
    this.isVaccinated.set(null);
    this.isSterilized.set(null);
    this.findMatch();
  }
}

