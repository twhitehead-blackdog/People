import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';

export interface PetMatchFilters {
  species: 'dog' | 'cat' | 'other' | null;
  breed: string | null;
  gender: 'M' | 'F' | null;
  minAge: number | null;
  maxAge: number | null;
  size: 'small' | 'medium' | 'large' | null;
  location: string | null;
  preferredBreedMatch: 'same' | 'different' | 'both' | null;
  searchTerm: string;
}

@Component({
  selector: 'pt-pet-match-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    DropdownModule,
    InputNumber,
    Button,
    MultiSelectModule,
  ],
  template: `
    <div class="filters-container">
      <!-- Search bar -->
      <div class="search-bar-wrapper">
        <span class="search-icon">ðŸ”</span>
        <input
          type="text"
          pInputText
          placeholder="Â¿Buscas a alguien especial? ðŸ”"
          [(ngModel)]="searchTerm"
          (input)="onFilterChange()"
          class="search-input"
        />
        <span class="sparkle-icon">âœ¨</span>
      </div>

      <!-- Filter toggle -->
      <div class="filters-toggle-row">
        <p-button
          label="Filtros MÃ¡gicos âœ¨"
          icon="pi pi-sliders-h"
          severity="secondary"
          [outlined]="true"
          (onClick)="toggleFilters()"
          [style]="{
            border: '2px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '0.75rem',
            fontWeight: '600'
          }"
        />
        @if (activeFiltersCount() > 0) {
          <span class="filter-badge">{{ activeFiltersCount() }}</span>
        }
        @if (activeFiltersCount() > 0) {
          <p-button
            label="Limpiar Todo"
            icon="pi pi-times"
            severity="secondary"
            [text]="true"
            (onClick)="clearFilters()"
            [style]="{ fontSize: '0.875rem', color: '#ec4899' }"
          />
        }
      </div>

      <!-- Filters with animation -->
      @if (showFilters()) {
        <div class="filters-content">
          <div class="filters-grid">
            <div class="filter-group">
              <label class="filter-label">ðŸ¾ Especie</label>
              <p-dropdown
                [(ngModel)]="species"
                [options]="speciesOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="âœ¨ Todos"
                [showClear]="true"
                (onChange)="onFilterChange()"
                [style]="{ width: '100%' }"
              />
            </div>

            <div class="filter-group">
              <label class="filter-label">ðŸ’ GÃ©nero</label>
              <p-dropdown
                [(ngModel)]="gender"
                [options]="genderOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="âœ¨ Todos"
                [showClear]="true"
                (onChange)="onFilterChange()"
                [style]="{ width: '100%' }"
              />
            </div>

            <div class="filter-group">
              <label class="filter-label">ðŸ“ TamaÃ±o</label>
              <p-dropdown
                [(ngModel)]="size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="âœ¨ Todos"
                [showClear]="true"
                (onChange)="onFilterChange()"
                [style]="{ width: '100%' }"
              />
            </div>

            <div class="filter-group">
              <label class="filter-label">ðŸŽ¨ Raza</label>
              <input
                type="text"
                pInputText
                placeholder="Escribe la raza..."
                [(ngModel)]="breed"
                (input)="onFilterChange()"
                class="breed-input"
              />
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .filters-container {
        background: linear-gradient(to bottom right, #ffffff 0%, rgba(243, 232, 255, 0.3) 50%, rgba(252, 231, 243, 0.3) 100%);
        border-radius: 1.5rem;
        padding: 1.5rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 2px solid rgba(168, 85, 247, 0.1);
        transition: box-shadow 0.3s ease;
      }

      .filters-container:hover {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      }

      .search-bar-wrapper {
        position: relative;
        margin-bottom: 1rem;
      }

      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.25rem;
        color: rgba(168, 85, 247, 0.4);
      }

      .search-input {
        width: 100%;
        padding-left: 3rem;
        padding-right: 3rem;
        height: 3.5rem;
        border: 2px solid rgba(168, 85, 247, 0.2);
        border-radius: 1rem;
        font-size: 1rem;
        transition: all 0.3s ease;
      }

      .search-input:focus {
        border-color: #FDB022;
        box-shadow: 0 0 0 3px rgba(253, 176, 34, 0.1);
        outline: none;
      }

      .sparkle-icon {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.25rem;
        color: #FDB022;
        animation: pulse 2s ease-in-out infinite;
      }

      .filters-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .filter-badge {
        background: linear-gradient(to right, #ec4899 0%, #a855f7 100%);
        color: #ffffff;
        border-radius: 9999px;
        padding: 0.25rem 0.75rem;
        font-size: 0.875rem;
        font-weight: 700;
        animation: bounce 1s ease-in-out infinite;
      }

      .filters-content {
        padding-top: 1rem;
        border-top: 2px solid rgba(168, 85, 247, 0.1);
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b21a8;
      }

      .breed-input {
        width: 100%;
        border: 2px solid rgba(168, 85, 247, 0.2);
        border-radius: 0.75rem;
        padding: 0.75rem;
        transition: all 0.3s ease;
      }

      .breed-input:focus {
        border-color: #FDB022;
        box-shadow: 0 0 0 3px rgba(253, 176, 34, 0.1);
        outline: none;
      }

      @media (max-width: 1024px) {
        .filters-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 768px) {
        .filters-container {
          padding: 1rem;
        }

        .filters-grid {
          grid-template-columns: 1fr;
        }

        .search-input {
          height: 3rem;
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class PetMatchFiltersComponent {
  public species = signal<'dog' | 'cat' | 'other' | null>(null);
  public breed = signal<string | null>(null);
  public gender = signal<'M' | 'F' | null>(null);
  public minAge = signal<number | null>(null);
  public maxAge = signal<number | null>(null);
  public size = signal<'small' | 'medium' | 'large' | null>(null);
  public location = signal<string | null>(null);
  public preferredBreedMatch = signal<'same' | 'different' | 'both' | null>(null);
  public searchTerm = signal('');
  public showFilters = signal(false);

  public filtersChanged = output<PetMatchFilters>();

  public activeFiltersCount = computed(() => {
    let count = 0;
    if (this.species() !== null) count++;
    if (this.gender() !== null) count++;
    if (this.size() !== null) count++;
    if (this.breed() && this.breed()!.trim() !== '') count++;
    return count;
  });

  public toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

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

  public onFilterChange(): void {
    const filters: PetMatchFilters = {
      species: this.species(),
      breed: this.breed(),
      gender: this.gender(),
      minAge: this.minAge(),
      maxAge: this.maxAge(),
      size: this.size(),
      location: this.location(),
      preferredBreedMatch: this.preferredBreedMatch(),
      searchTerm: this.searchTerm(),
    };
    this.filtersChanged.emit(filters);
  }

  public clearFilters(): void {
    this.species.set(null);
    this.breed.set(null);
    this.gender.set(null);
    this.minAge.set(null);
    this.maxAge.set(null);
    this.size.set(null);
    this.location.set(null);
    this.preferredBreedMatch.set(null);
    this.searchTerm.set('');
    this.onFilterChange();
  }
}





