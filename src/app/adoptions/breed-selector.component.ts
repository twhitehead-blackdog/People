import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SelectModule, InputNumber],
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
            <span class="button-icon">â­</span>
            <span>Raza Pura</span>
          </button>
          <button
            type="button"
            class="breed-type-button"
            [class.active]="breedType() === 'mixed'"
            (click)="setBreedType('mixed')"
          >
            <span class="button-icon">ðŸ”€</span>
            <span>Mixta</span>
          </button>
          <button
            type="button"
            class="breed-type-button"
            [class.active]="breedType() === 'none'"
            (click)="setBreedType('none')"
          >
            <span class="button-icon">ðŸ¾</span>
            <span>Sin Raza</span>
          </button>
        </div>
      </div>

      @if (breedType() === 'pure') {
        <div class="breed-input-group">
          <label class="input-label">Raza *</label>
          <p-select
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
            <p-select
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
            <p-select
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
              <span>âš ï¸ La suma debe ser 100%. Actual: {{ percentageTotal() }}%</span>
            </div>
          }
        </div>
      }

      @if (breedType() === 'none') {
        <div class="no-breed-message">
          <span>ðŸ¾ No se especificarÃ¡ raza para esta mascota</span>
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

      /* Asegurar que los overlays de los selects tengan z-index alto */
      ::ng-deep .p-select-panel {
        z-index: 1100 !important;
      }

      ::ng-deep .p-overlay {
        z-index: 1100 !important;
      }

      ::ng-deep .p-select-overlay {
        z-index: 1100 !important;
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

  // Lista completa de razas de perros ordenadas de A a Z
  private static readonly DOG_BREEDS: PetBreed[] = [
    { id: '1', name: 'Afgano', species: 'dog', is_active: true, display_order: 1 },
    { id: '2', name: 'Airedale Terrier', species: 'dog', is_active: true, display_order: 2 },
    { id: '3', name: 'Akita', species: 'dog', is_active: true, display_order: 3 },
    { id: '4', name: 'Akita Americano', species: 'dog', is_active: true, display_order: 4 },
    { id: '5', name: 'Alano EspaÃ±ol', species: 'dog', is_active: true, display_order: 5 },
    { id: '6', name: 'Malamute de Alaska', species: 'dog', is_active: true, display_order: 6 },
    { id: '7', name: 'Bully Americano', species: 'dog', is_active: true, display_order: 7 },
    { id: '8', name: 'Pit Bull Terrier Americano', species: 'dog', is_active: true, display_order: 8 },
    { id: '9', name: 'Staffordshire Terrier Americano', species: 'dog', is_active: true, display_order: 9 },
    { id: '10', name: 'Perro Ganadero Australiano', species: 'dog', is_active: true, display_order: 10 },
    { id: '11', name: 'Pastor Australiano', species: 'dog', is_active: true, display_order: 11 },
    { id: '12', name: 'Basenji', species: 'dog', is_active: true, display_order: 12 },
    { id: '13', name: 'Basset Hound', species: 'dog', is_active: true, display_order: 13 },
    { id: '14', name: 'Beagle', species: 'dog', is_active: true, display_order: 14 },
    { id: '15', name: 'Collie Barbudo', species: 'dog', is_active: true, display_order: 15 },
    { id: '16', name: 'BichÃ³n FrisÃ©', species: 'dog', is_active: true, display_order: 16 },
    { id: '17', name: 'BichÃ³n MaltÃ©s', species: 'dog', is_active: true, display_order: 17 },
    { id: '18', name: 'Border Collie', species: 'dog', is_active: true, display_order: 18 },
    { id: '19', name: 'Terrier de Boston', species: 'dog', is_active: true, display_order: 19 },
    { id: '20', name: 'Boxer', species: 'dog', is_active: true, display_order: 20 },
    { id: '21', name: 'Braco AlemÃ¡n', species: 'dog', is_active: true, display_order: 21 },
    { id: '22', name: 'Braco de Weimar', species: 'dog', is_active: true, display_order: 22 },
    { id: '23', name: 'Bulldog Americano', species: 'dog', is_active: true, display_order: 23 },
    { id: '24', name: 'Bulldog FrancÃ©s', species: 'dog', is_active: true, display_order: 24 },
    { id: '25', name: 'Bulldog InglÃ©s', species: 'dog', is_active: true, display_order: 25 },
    { id: '26', name: 'Bull Terrier', species: 'dog', is_active: true, display_order: 26 },
    { id: '27', name: 'Cane Corso', species: 'dog', is_active: true, display_order: 27 },
    { id: '28', name: 'Caniche', species: 'dog', is_active: true, display_order: 28 },
    { id: '29', name: 'Caniche Enano', species: 'dog', is_active: true, display_order: 29 },
    { id: '30', name: 'Caniche Gigante', species: 'dog', is_active: true, display_order: 30 },
    { id: '31', name: 'Caniche Mediano', species: 'dog', is_active: true, display_order: 31 },
    { id: '32', name: 'Caniche Toy', species: 'dog', is_active: true, display_order: 32 },
    { id: '33', name: 'Carlino', species: 'dog', is_active: true, display_order: 33 },
    { id: '34', name: 'Chihuahua', species: 'dog', is_active: true, display_order: 34 },
    { id: '35', name: 'Chow Chow', species: 'dog', is_active: true, display_order: 35 },
    { id: '36', name: 'Cocker Spaniel Americano', species: 'dog', is_active: true, display_order: 36 },
    { id: '37', name: 'Cocker Spaniel InglÃ©s', species: 'dog', is_active: true, display_order: 37 },
    { id: '38', name: 'Collie', species: 'dog', is_active: true, display_order: 38 },
    { id: '39', name: 'Teckel', species: 'dog', is_active: true, display_order: 39 },
    { id: '40', name: 'DÃ¡lmata', species: 'dog', is_active: true, display_order: 40 },
    { id: '41', name: 'Doberman', species: 'dog', is_active: true, display_order: 41 },
    { id: '42', name: 'Dogo Argentino', species: 'dog', is_active: true, display_order: 42 },
    { id: '43', name: 'Dogo de Burdeos', species: 'dog', is_active: true, display_order: 43 },
    { id: '44', name: 'Fox Terrier', species: 'dog', is_active: true, display_order: 44 },
    { id: '45', name: 'Sabueso Americano', species: 'dog', is_active: true, display_order: 45 },
    { id: '46', name: 'Galgo EspaÃ±ol', species: 'dog', is_active: true, display_order: 46 },
    { id: '47', name: 'Golden Retriever', species: 'dog', is_active: true, display_order: 47 },
    { id: '48', name: 'Gran DanÃ©s', species: 'dog', is_active: true, display_order: 48 },
    { id: '49', name: 'Galgo InglÃ©s', species: 'dog', is_active: true, display_order: 49 },
    { id: '50', name: 'Husky Siberiano', species: 'dog', is_active: true, display_order: 50 },
    { id: '51', name: 'Jack Russell Terrier', species: 'dog', is_active: true, display_order: 51 },
    { id: '52', name: 'Labrador', species: 'dog', is_active: true, display_order: 52 },
    { id: '53', name: 'Lhasa Apso', species: 'dog', is_active: true, display_order: 53 },
    { id: '54', name: 'MastÃ­n EspaÃ±ol', species: 'dog', is_active: true, display_order: 54 },
    { id: '55', name: 'MastÃ­n Napolitano', species: 'dog', is_active: true, display_order: 55 },
    { id: '56', name: 'Pastor AlemÃ¡n', species: 'dog', is_active: true, display_order: 56 },
    { id: '57', name: 'Pastor Australiano', species: 'dog', is_active: true, display_order: 57 },
    { id: '58', name: 'Pastor Belga', species: 'dog', is_active: true, display_order: 58 },
    { id: '59', name: 'Pastor de Shetland', species: 'dog', is_active: true, display_order: 59 },
    { id: '60', name: 'PekinÃ©s', species: 'dog', is_active: true, display_order: 60 },
    { id: '61', name: 'Corgi GalÃ©s de Pembroke', species: 'dog', is_active: true, display_order: 61 },
    { id: '62', name: 'Perro de Agua EspaÃ±ol', species: 'dog', is_active: true, display_order: 62 },
    { id: '63', name: 'Perro Lobo Checoslovaco', species: 'dog', is_active: true, display_order: 63 },
    { id: '64', name: 'Perro Salchicha', species: 'dog', is_active: true, display_order: 64 },
    { id: '65', name: 'Pinscher Miniatura', species: 'dog', is_active: true, display_order: 65 },
    { id: '66', name: 'Pomerania', species: 'dog', is_active: true, display_order: 66 },
    { id: '67', name: 'Presa Canario', species: 'dog', is_active: true, display_order: 67 },
    { id: '68', name: 'Rottweiler', species: 'dog', is_active: true, display_order: 68 },
    { id: '69', name: 'San Bernardo', species: 'dog', is_active: true, display_order: 69 },
    { id: '70', name: 'Schnauzer', species: 'dog', is_active: true, display_order: 70 },
    { id: '71', name: 'Schnauzer Gigante', species: 'dog', is_active: true, display_order: 71 },
    { id: '72', name: 'Schnauzer Miniatura', species: 'dog', is_active: true, display_order: 72 },
    { id: '73', name: 'Setter IrlandÃ©s', species: 'dog', is_active: true, display_order: 73 },
    { id: '74', name: 'Shar Pei', species: 'dog', is_active: true, display_order: 74 },
    { id: '75', name: 'Shih Tzu', species: 'dog', is_active: true, display_order: 75 },
    { id: '76', name: 'Staffordshire Bull Terrier', species: 'dog', is_active: true, display_order: 76 },
    { id: '77', name: 'Terranova', species: 'dog', is_active: true, display_order: 77 },
    { id: '78', name: 'Weimaraner', species: 'dog', is_active: true, display_order: 78 },
    { id: '79', name: 'West Highland White Terrier', species: 'dog', is_active: true, display_order: 79 },
    { id: '80', name: 'Yorkshire Terrier', species: 'dog', is_active: true, display_order: 80 },
  ];

  // Lista completa de razas de gatos ordenadas de A a Z
  private static readonly CAT_BREEDS: PetBreed[] = [
    { id: '101', name: 'Abisinio', species: 'cat', is_active: true, display_order: 101 },
    { id: '102', name: 'Rizo Americano', species: 'cat', is_active: true, display_order: 102 },
    { id: '103', name: 'Pelo Corto Americano', species: 'cat', is_active: true, display_order: 103 },
    { id: '104', name: 'Angora Turco', species: 'cat', is_active: true, display_order: 104 },
    { id: '105', name: 'Azul Ruso', species: 'cat', is_active: true, display_order: 105 },
    { id: '106', name: 'BengalÃ­', species: 'cat', is_active: true, display_order: 106 },
    { id: '107', name: 'Birmano', species: 'cat', is_active: true, display_order: 107 },
    { id: '108', name: 'Bobtail JaponÃ©s', species: 'cat', is_active: true, display_order: 108 },
    { id: '109', name: 'Bombay', species: 'cat', is_active: true, display_order: 109 },
    { id: '110', name: 'Pelo Corto BritÃ¡nico', species: 'cat', is_active: true, display_order: 110 },
    { id: '111', name: 'BurmÃ©s', species: 'cat', is_active: true, display_order: 111 },
    { id: '112', name: 'Chartreux', species: 'cat', is_active: true, display_order: 112 },
    { id: '113', name: 'Rex de Cornualles', species: 'cat', is_active: true, display_order: 113 },
    { id: '114', name: 'Rex de Devon', species: 'cat', is_active: true, display_order: 114 },
    { id: '115', name: 'Egipcio', species: 'cat', is_active: true, display_order: 115 },
    { id: '116', name: 'ExÃ³tico de Pelo Corto', species: 'cat', is_active: true, display_order: 116 },
    { id: '117', name: 'Himalayo', species: 'cat', is_active: true, display_order: 117 },
    { id: '118', name: 'Korat', species: 'cat', is_active: true, display_order: 118 },
    { id: '119', name: 'LaPerm', species: 'cat', is_active: true, display_order: 119 },
    { id: '120', name: 'Maine Coon', species: 'cat', is_active: true, display_order: 120 },
    { id: '121', name: 'Manx', species: 'cat', is_active: true, display_order: 121 },
    { id: '122', name: 'Mau Egipcio', species: 'cat', is_active: true, display_order: 122 },
    { id: '123', name: 'Munchkin', species: 'cat', is_active: true, display_order: 123 },
    { id: '124', name: 'Noruego del Bosque', species: 'cat', is_active: true, display_order: 124 },
    { id: '125', name: 'Oriental', species: 'cat', is_active: true, display_order: 125 },
    { id: '126', name: 'Persa', species: 'cat', is_active: true, display_order: 126 },
    { id: '127', name: 'Persa Chinchilla', species: 'cat', is_active: true, display_order: 127 },
    { id: '128', name: 'Ragdoll', species: 'cat', is_active: true, display_order: 128 },
    { id: '129', name: 'Sagrado de Birmania', species: 'cat', is_active: true, display_order: 129 },
    { id: '130', name: 'Pliegue EscocÃ©s', species: 'cat', is_active: true, display_order: 130 },
    { id: '131', name: 'Rex de Selkirk', species: 'cat', is_active: true, display_order: 131 },
    { id: '132', name: 'SiamÃ©s', species: 'cat', is_active: true, display_order: 132 },
    { id: '133', name: 'Siberiano', species: 'cat', is_active: true, display_order: 133 },
    { id: '134', name: 'SomalÃ­', species: 'cat', is_active: true, display_order: 134 },
    { id: '135', name: 'Esfinge', species: 'cat', is_active: true, display_order: 135 },
    { id: '136', name: 'TonkinÃ©s', species: 'cat', is_active: true, display_order: 136 },
    { id: '137', name: 'Van Turco', species: 'cat', is_active: true, display_order: 137 },
  ];

  public breedOptions = computed(() => {
    const species = this.species();
    const storeBreeds = species === 'dog' 
      ? (this.petBreedsStore as any)['dogBreeds']() as PetBreed[]
      : species === 'cat'
      ? (this.petBreedsStore as any)['catBreeds']() as PetBreed[]
      : (this.petBreedsStore as any)['otherBreeds']() as PetBreed[];
    
    // Si hay razas en el store, usarlas; si no, usar la lista estÃ¡tica
    if (storeBreeds && storeBreeds.length > 0) {
      return storeBreeds.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Usar lista estÃ¡tica como fallback
    if (species === 'dog') {
      return BreedSelectorComponent.DOG_BREEDS.sort((a, b) => a.name.localeCompare(b.name));
    } else if (species === 'cat') {
      return BreedSelectorComponent.CAT_BREEDS.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return [];
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
    // Ajustar automÃ¡ticamente el segundo porcentaje si es necesario
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





