import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumber } from 'primeng/inputnumber';
import { PetBreedsStore } from '../stores/pet-breeds.store';
import { PetBreed } from '../models';

export interface BreedData {
  breed_type: 'pure' | 'mixed' | 'none';
  breed_primary?: string;
  breed_secondary?: string;
  breed_percentage_primary?: number;
  breed_percentage_secondary?: number;
}

@Component({
  selector: 'pt-breed-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, InputNumber],
  template: `
    <div class="breed-selector">
      <div class="breed-type-selector">
        <label class="selector-label">Tipo de Raza *</label>
        <div class="breed-type-buttons">
          <button
            type="button"
            class="breed-type-button"
            [class.active]="breedType() === 'pure'"
            (click)="setBreedType('pure')"
          >
            <span class="button-icon">⭐</span>
            <span>Raza Pura</span>
          </button>
          <button
            type="button"
            class="breed-type-button"
            [class.active]="breedType() === 'mixed'"
            (click)="setBreedType('mixed')"
          >
            <span class="button-icon">🔀</span>
            <span>Mixta</span>
          </button>
          <button
            type="button"
            class="breed-type-button"
            [class.active]="breedType() === 'none'"
            (click)="setBreedType('none')"
          >
            <span class="button-icon">🐾</span>
            <span>Sin Raza</span>
          </button>
        </div>
      </div>

      @if (breedType() === 'pure') {
        <div class="breed-input-group">
          <label class="input-label">Raza *</label>
          <p-dropdown
            [(ngModel)]="breedPrimary"
            [options]="breedOptions()"
            optionLabel="name"
            optionValue="name"
            placeholder="Selecciona la raza"
            [filter]="true"
            filterBy="name"
            [showClear]="true"
            (onChange)="onBreedChange()"
            [style]="{ width: '100%' }"
          />
        </div>
      }

      @if (breedType() === 'mixed') {
        <div class="mixed-breed-container">
          <div class="breed-input-group">
            <label class="input-label">Raza Principal *</label>
            <p-dropdown
              [(ngModel)]="breedPrimary"
              [options]="breedOptions()"
              optionLabel="name"
              optionValue="name"
              placeholder="Selecciona la primera raza"
              [filter]="true"
              filterBy="name"
              [showClear]="true"
              (onChange)="onBreedChange()"
              [style]="{ width: '100%' }"
            />
          </div>
          <div class="breed-input-group">
            <label class="input-label">Porcentaje Raza Principal *</label>
            <p-inputNumber
              [(ngModel)]="breedPercentagePrimary"
              [min]="1"
              [max]="99"
              placeholder="%"
              suffix="%"
              (onInput)="onPercentageChange()"
              [style]="{ width: '100%' }"
            />
          </div>
          <div class="breed-input-group">
            <label class="input-label">Raza Secundaria *</label>
            <p-dropdown
              [(ngModel)]="breedSecondary"
              [options]="breedOptions()"
              optionLabel="name"
              optionValue="name"
              placeholder="Selecciona la segunda raza"
              [filter]="true"
              filterBy="name"
              [showClear]="true"
              (onChange)="onBreedChange()"
              [style]="{ width: '100%' }"
            />
          </div>
          <div class="breed-input-group">
            <label class="input-label">Porcentaje Raza Secundaria *</label>
            <p-inputNumber
              [(ngModel)]="breedPercentageSecondary"
              [min]="1"
              [max]="99"
              placeholder="%"
              suffix="%"
              (onInput)="onPercentageChange()"
              [style]="{ width: '100%' }"
            />
          </div>
          @if (percentageTotal() !== 100 && (breedPercentagePrimary() || breedPercentageSecondary())) {
            <div class="percentage-warning">
              <span>⚠️ La suma debe ser 100%. Actual: {{ percentageTotal() }}%</span>
            </div>
          }
        </div>
      }

      @if (breedType() === 'none') {
        <div class="no-breed-message">
          <span>🐾 No se especificará raza para esta mascota</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .breed-selector {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .selector-label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
        margin-bottom: 0.75rem;
        display: block;
      }

      .breed-type-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
      }

      .breed-type-button {
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

      .breed-type-button:hover {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        transform: translateY(-2px);
      }

      .breed-type-button.active {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.2);
        color: #000000;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
      }

      .button-icon {
        font-size: 1.5rem;
      }

      .breed-input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .input-label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .mixed-breed-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .percentage-warning {
        grid-column: 1 / -1;
        padding: 0.75rem;
        background: rgba(239, 68, 68, 0.1);
        border-radius: 0.5rem;
        border-left: 3px solid #ef4444;
        color: #dc2626;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .no-breed-message {
        padding: 1rem;
        background: rgba(251, 191, 36, 0.1);
        border-radius: 0.5rem;
        border-left: 3px solid #fbbf24;
        text-align: center;
        font-weight: 600;
        color: #000000;
      }

      @media (max-width: 768px) {
        .breed-type-buttons {
          grid-template-columns: 1fr;
        }

        .mixed-breed-container {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class BreedSelectorComponent {
  public species = input.required<'dog' | 'cat' | 'other'>();
  public initialBreed = input<BreedData | null>(null);
  public breedChanged = output<BreedData>();

  public petBreedsStore = inject(PetBreedsStore);

  public breedType = signal<'pure' | 'mixed' | 'none'>('none');
  public breedPrimary = signal<string | null>(null);
  public breedSecondary = signal<string | null>(null);
  public breedPercentagePrimary = signal<number | null>(null);
  public breedPercentageSecondary = signal<number | null>(null);

  public breedOptions = computed(() => {
    const species = this.species();
    if (species === 'dog') {
      return (this.petBreedsStore as any)['dogBreeds']() as PetBreed[];
    } else if (species === 'cat') {
      return (this.petBreedsStore as any)['catBreeds']() as PetBreed[];
    } else {
      return (this.petBreedsStore as any)['otherBreeds']() as PetBreed[];
    }
  });

  public percentageTotal = computed(() => {
    const primary = this.breedPercentagePrimary() ?? 0;
    const secondary = this.breedPercentageSecondary() ?? 0;
    return primary + secondary;
  });

  constructor() {
    // Inicializar con datos si se proporcionan
    effect(() => {
      const initial = this.initialBreed();
      if (initial) {
        this.breedType.set(initial.breed_type);
        this.breedPrimary.set(initial.breed_primary ?? null);
        this.breedSecondary.set(initial.breed_secondary ?? null);
        this.breedPercentagePrimary.set(initial.breed_percentage_primary ?? null);
        this.breedPercentageSecondary.set(initial.breed_percentage_secondary ?? null);
      }
    });
  }

  public setBreedType(type: 'pure' | 'mixed' | 'none'): void {
    this.breedType.set(type);
    if (type === 'none') {
      this.breedPrimary.set(null);
      this.breedSecondary.set(null);
      this.breedPercentagePrimary.set(null);
      this.breedPercentageSecondary.set(null);
    } else if (type === 'pure') {
      this.breedSecondary.set(null);
      this.breedPercentagePrimary.set(null);
      this.breedPercentageSecondary.set(null);
    }
    this.emitBreedChange();
  }

  public onBreedChange(): void {
    this.emitBreedChange();
  }

  public onPercentageChange(): void {
    // Ajustar automáticamente el segundo porcentaje si es necesario
    if (this.breedType() === 'mixed') {
      const primary = this.breedPercentagePrimary() ?? 0;
      if (primary > 0 && primary < 100) {
        this.breedPercentageSecondary.set(100 - primary);
      }
    }
    this.emitBreedChange();
  }

  private emitBreedChange(): void {
    const breedData: BreedData = {
      breed_type: this.breedType(),
    };

    if (this.breedType() === 'pure') {
      breedData.breed_primary = this.breedPrimary() ?? undefined;
    } else if (this.breedType() === 'mixed') {
      breedData.breed_primary = this.breedPrimary() ?? undefined;
      breedData.breed_secondary = this.breedSecondary() ?? undefined;
      breedData.breed_percentage_primary = this.breedPercentagePrimary() ?? undefined;
      breedData.breed_percentage_secondary = this.breedPercentageSecondary() ?? undefined;
    }

    this.breedChanged.emit(breedData);
  }
}

