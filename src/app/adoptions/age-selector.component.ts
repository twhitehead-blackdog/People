import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { Button } from 'primeng/button';
import { differenceInMonths, differenceInYears, parseISO } from 'date-fns';

export interface AgeData {
  age_years?: number;
  age_months?: number;
  birth_date?: Date | string;
  age_mode: 'years_months' | 'birthday';
}

@Component({
  selector: 'pt-age-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, InputNumber, CalendarModule, Button],
  template: `
    <div class="age-selector">
      <div class="age-mode-toggle">
        <button
          type="button"
          class="mode-button"
          [class.active]="ageMode() === 'years_months'"
          (click)="setAgeMode('years_months')"
        >
          <span class="mode-icon">ðŸ“…</span>
          <span>AÃ±os y Meses</span>
        </button>
        <button
          type="button"
          class="mode-button"
          [class.active]="ageMode() === 'birthday'"
          (click)="setAgeMode('birthday')"
        >
          <span class="mode-icon">ðŸŽ‚</span>
          <span>Fecha de CumpleaÃ±os</span>
        </button>
      </div>

      <div class="age-input-container">
        @if (ageMode() === 'years_months') {
          <div class="age-inputs">
            <div class="age-input-group">
              <label>AÃ±os</label>
              <p-inputNumber
                [(ngModel)]="ageYears"
                [min]="0"
                [max]="30"
                placeholder="0"
                (onInput)="onYearsMonthsChange()"
                [style]="{ width: '100%' }"
              />
            </div>
            <div class="age-input-group">
              <label>Meses (0-11)</label>
              <p-inputNumber
                [(ngModel)]="ageMonths"
                [min]="0"
                [max]="11"
                placeholder="0"
                (onInput)="onMonthsInput($event)"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>
          @if (calculatedAge()) {
            <div class="age-display">
              <span class="age-text">ðŸ’« Edad: {{ calculatedAge() }}</span>
            </div>
          }
        } @else {
          <div class="birthday-input">
            <label>Fecha de CumpleaÃ±os</label>
            <p-calendar
              [(ngModel)]="birthDate"
              [maxDate]="maxDate"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              placeholder="Selecciona la fecha"
              (onSelect)="onBirthdayChange()"
              [style]="{ width: '100%' }"
            />
            @if (calculatedAgeFromBirthday()) {
              <div class="age-display">
                <span class="age-text">ðŸ’« Edad calculada: {{ calculatedAgeFromBirthday() }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .age-selector {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .age-mode-toggle {
        display: flex;
        gap: 0.5rem;
        background: #f9fafb;
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .mode-button {
        flex: 1;
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

      .mode-button:hover {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        transform: translateY(-2px);
      }

      .mode-button.active {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.2);
        color: #000000;
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
      }

      .mode-icon {
        font-size: 1.5rem;
      }

      .age-input-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .age-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .age-input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .age-input-group label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .birthday-input {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .birthday-input label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .age-display {
        padding: 0.75rem;
        background: rgba(251, 191, 36, 0.1);
        border-radius: 0.5rem;
        border-left: 3px solid #fbbf24;
      }

      .age-text {
        font-weight: 600;
        color: #000000;
        font-size: 0.9375rem;
      }

      .form-hint {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      @media (max-width: 768px) {
        .age-inputs {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AgeSelectorComponent {
  public initialAge = input<AgeData | null>(null);
  public ageChanged = output<AgeData>();

  public ageMode = signal<'years_months' | 'birthday'>('years_months');
  public ageYears = signal<number | null>(null);
  public ageMonths = signal<number | null>(null);
  public birthDate = signal<Date | null>(null);
  public maxDate = new Date();

  public calculatedAge = computed(() => {
    const years = this.ageYears();
    const months = this.ageMonths();
    if (years === null && months === null) {
      return null;
    }
    const yearsStr = years !== null ? `${years} aÃ±o${years !== 1 ? 's' : ''}` : '';
    const monthsStr = months !== null && months > 0 ? `${months} mes${months !== 1 ? 'es' : ''}` : '';
    if (yearsStr && monthsStr) {
      return `${yearsStr} y ${monthsStr}`;
    }
    return yearsStr || monthsStr || null;
  });

  public calculatedAgeFromBirthday = computed(() => {
    const date = this.birthDate();
    if (!date) {
      return null;
    }
    const today = new Date();
    const years = differenceInYears(today, date);
    const months = differenceInMonths(today, date) % 12;
    const yearsStr = years > 0 ? `${years} aÃ±o${years !== 1 ? 's' : ''}` : '';
    const monthsStr = months > 0 ? `${months} mes${months !== 1 ? 'es' : ''}` : '';
    if (yearsStr && monthsStr) {
      return `${yearsStr} y ${monthsStr}`;
    }
    return yearsStr || monthsStr || `${months} mes${months !== 1 ? 'es' : ''}`;
  });

  constructor() {
    // Inicializar con datos si se proporcionan
    effect(() => {
      const initial = this.initialAge();
      if (initial) {
        this.ageMode.set(initial.age_mode);
        if (initial.age_years !== undefined) {
          this.ageYears.set(initial.age_years);
        }
        if (initial.age_months !== undefined) {
          this.ageMonths.set(initial.age_months);
        }
        if (initial.birth_date) {
          const date = typeof initial.birth_date === 'string' ? parseISO(initial.birth_date) : initial.birth_date;
          this.birthDate.set(date);
        }
      }
    });
  }

  public setAgeMode(mode: 'years_months' | 'birthday'): void {
    this.ageMode.set(mode);
    this.emitAgeChange();
  }

  public onYearsMonthsChange(): void {
    this.emitAgeChange();
  }

  public onMonthsInput(event: any): void {
    // Asegurar que los meses no excedan 11
    // El evento de p-inputNumber puede pasar el valor de diferentes formas
    const value = event.value !== undefined ? event.value : (event.target?.value !== undefined ? Number(event.target.value) : this.ageMonths());
    
    if (value !== null && value !== undefined && !isNaN(value)) {
      const numValue = Number(value);
      if (numValue > 11) {
        this.ageMonths.set(11);
      } else if (numValue < 0) {
        this.ageMonths.set(0);
      } else {
        this.ageMonths.set(Math.floor(numValue)); // Asegurar que sea un entero
      }
    }
    this.emitAgeChange();
  }

  public onBirthdayChange(): void {
    this.emitAgeChange();
  }

  private emitAgeChange(): void {
    const ageData: AgeData = {
      age_mode: this.ageMode(),
    };

    if (this.ageMode() === 'years_months') {
      ageData.age_years = this.ageYears() ?? undefined;
      ageData.age_months = this.ageMonths() ?? undefined;
    } else {
      ageData.birth_date = this.birthDate() ?? undefined;
      // Calcular aÃ±os y meses desde cumpleaÃ±os
      if (this.birthDate()) {
        const today = new Date();
        ageData.age_years = differenceInYears(today, this.birthDate()!);
        ageData.age_months = differenceInMonths(today, this.birthDate()!) % 12;
      }
    }

    this.ageChanged.emit(ageData);
  }
}





