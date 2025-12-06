import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from 'primeng/button';

export interface MatchFilters {
  species: 'dog' | 'cat' | null;
  location: string;
}

@Component({
  selector: 'pt-adoptions-match',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, Button],
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
        z-index: 10;
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
  public selectedSpecies = signal<'dog' | 'cat' | null>(null);
  public location = signal('');

  public filtersChanged = output<MatchFilters>();

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
    };
    this.filtersChanged.emit(filters);
  }
}

