import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { getPanamaNowParts } from '../../../utils/panama-date.utils';

export interface Birthday {
  birth_date?: string;
  name?: string;
  branch_name?: string;
}

@Component({
  selector: 'app-birthdays-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    <p-dialog
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="Cumpleañeros del Mes"
      styleClass="late-details-dialog birthdays-dialog"
      appendTo="body"
    >
      <div
        class="flex flex-col gap-0"
        style="padding: 1.5rem 2rem; min-height: 100px;"
      >
        <div
          class="text-sm text-gray-300 text-center py-4"
          *ngIf="birthdays.length === 0"
        >
          No hay cumpleañeros este mes.
        </div>
        <ul
          class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
          *ngIf="birthdays.length > 0"
        >
          <li
            class="birthday-list-item"
            *ngFor="let birthday of getSortedBirthdays()"
            [class.birthday-today]="isBirthdayToday(birthday.birth_date)"
            [class.birthday-passed]="hasBirthdayPassed(birthday.birth_date)"
          >
            <div class="birthday-item-content">
              <div
                class="birthday-icon-box"
                [class.icon-today]="isBirthdayToday(birthday.birth_date)"
                [class.icon-upcoming]="
                  !hasBirthdayPassed(birthday.birth_date) &&
                  !isBirthdayToday(birthday.birth_date)
                "
                [class.icon-passed]="hasBirthdayPassed(birthday.birth_date)"
              >
                <i class="pi pi-gift"></i>
              </div>
              <div class="birthday-details">
                <div class="birthday-name-row">
                  <span class="birthday-name">
                    {{ birthday.name || 'Sin nombre' }}
                  </span>
                </div>
                <div class="birthday-info-row">
                  <span class="birthday-branch">
                    <i class="pi pi-building"></i>
                    {{ birthday.branch_name || 'Sin sucursal' }}
                  </span>
                </div>
              </div>
              <div class="birthday-right-section">
                <div class="birthday-date-display">
                  {{ getBirthdayDay(birthday.birth_date) }}
                  <span class="date-month">
                    {{ getBirthdayMonth(birthday.birth_date) }}
                  </span>
                </div>
                <span
                  class="birthday-status-badge"
                  [class.status-today]="isBirthdayToday(birthday.birth_date)"
                  [class.status-upcoming]="
                    !hasBirthdayPassed(birthday.birth_date) &&
                    !isBirthdayToday(birthday.birth_date)
                  "
                  [class.status-passed]="hasBirthdayPassed(birthday.birth_date)"
                >
                  <i
                    class="pi"
                    [class.pi-star-fill]="isBirthdayToday(birthday.birth_date)"
                    [class.pi-clock]="
                      !hasBirthdayPassed(birthday.birth_date) &&
                      !isBirthdayToday(birthday.birth_date)
                    "
                    [class.pi-check-circle]="
                      hasBirthdayPassed(birthday.birth_date)
                    "
                  ></i>
                  <span *ngIf="isBirthdayToday(birthday.birth_date)">
                    ¡HOY ES SU DÍA!
                  </span>
                  <span
                    *ngIf="
                      !hasBirthdayPassed(birthday.birth_date) &&
                      !isBirthdayToday(birthday.birth_date)
                    "
                  >
                    Próximamente
                  </span>
                  <span *ngIf="hasBirthdayPassed(birthday.birth_date)">
                    Ya Celebrado
                  </span>
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .birthday-list-item {
        background: transparent;
        border: none;
        padding: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }

      .birthday-list-item:first-child .birthday-item-content {
        padding-top: 0;
      }

      .birthday-list-item:last-child {
        border-bottom: none;
      }

      .birthday-list-item:hover {
        background: rgba(251, 191, 36, 0.05);
      }

      .birthday-list-item.birthday-today {
        background: rgba(251, 191, 36, 0.08);
      }

      .birthday-list-item.birthday-today:hover {
        background: rgba(251, 191, 36, 0.12);
      }

      .birthday-list-item.birthday-passed {
        opacity: 0.5;
      }

      .birthday-item-content {
        display: flex;
        gap: 0.875rem;
        align-items: center;
        padding: 0.875rem 0;
      }

      .birthday-icon-box {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1.25rem;
        transition: all 0.3s ease;
      }

      .birthday-icon-box.icon-today {
        background: linear-gradient(
          135deg,
          rgba(251, 191, 36, 0.2),
          rgba(245, 158, 11, 0.1)
        );
        border: 2px solid rgba(251, 191, 36, 0.4);
        color: #fbbf24;
      }

      .birthday-icon-box.icon-upcoming {
        background: linear-gradient(
          135deg,
          rgba(96, 165, 250, 0.15),
          rgba(59, 130, 246, 0.1)
        );
        border: 2px solid rgba(96, 165, 250, 0.3);
        color: #60a5fa;
      }

      .birthday-icon-box.icon-passed {
        background: rgba(156, 163, 175, 0.1);
        border: 2px solid rgba(156, 163, 175, 0.25);
        color: #9ca3af;
      }

      .birthday-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      .birthday-name-row {
        display: flex;
        align-items: center;
      }

      .birthday-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
      }

      .birthday-info-row {
        display: flex;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .birthday-branch {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .birthday-branch i {
        font-size: 0.625rem;
        color: rgba(251, 191, 36, 0.5);
      }

      .birthday-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
      }

      .birthday-date-display {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
        line-height: 1;
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        font-family: 'Segoe UI', sans-serif;
      }

      .birthday-date-display .date-month {
        font-size: 0.65rem;
        font-weight: 600;
        color: rgba(251, 191, 36, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .birthday-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        border-radius: 1rem;
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
      }

      .birthday-status-badge i {
        font-size: 0.625rem;
      }

      .birthday-status-badge.status-today {
        background: rgba(251, 191, 36, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.4);
      }

      .birthday-status-badge.status-upcoming {
        background: rgba(96, 165, 250, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(96, 165, 250, 0.3);
      }

      .birthday-status-badge.status-passed {
        background: rgba(107, 114, 128, 0.15);
        color: #9ca3af;
        border: 1px solid rgba(107, 114, 128, 0.3);
      }

      /* Custom Scrollbar */
      ul {
        scrollbar-width: thin;
        scrollbar-color: rgba(251, 191, 36, 0.4) rgba(255, 255, 255, 0.05);
      }

      ul::-webkit-scrollbar {
        width: 10px;
      }

      ul::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        margin: 4px 0;
      }

      ul::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          rgba(251, 191, 36, 0.6),
          rgba(245, 158, 11, 0.4)
        );
        border-radius: 10px;
        border: 2px solid rgba(24, 24, 27, 0.3);
        transition: all 0.3s ease;
      }

      ul::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          180deg,
          rgba(251, 191, 36, 0.8),
          rgba(245, 158, 11, 0.6)
        );
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
      }

      ul::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, #fbbf24, #f59e0b);
      }
    `,
  ],
})
export class BirthdaysDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() birthdays: Birthday[] = [];

  public getSortedBirthdays() {
    const list = [...this.birthdays];
    const { day: currentDay, month: currentMonth } = getPanamaNowParts();

    return list.sort((a, b) => {
      if (!a.birth_date || !b.birth_date) return 0;

      const dateA = new Date(a.birth_date);
      const dateB = new Date(b.birth_date);
      const dayA = dateA.getDate();
      const dayB = dateB.getDate();
      // Month could be different if input list has mixed months, but assume current month for now or check month.
      // Assuming list is already filtered by month in HomeComponent.

      const isTodayA = dayA === currentDay;
      const isTodayB = dayB === currentDay;
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      const isUpcomingA = dayA > currentDay;
      const isUpcomingB = dayB > currentDay;
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      return dayA - dayB;
    });
  }

  public isBirthdayToday(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const { day, month } = getPanamaNowParts();
    // Assuming dateStr is ISO yyyy-mm-dd or similar, date.getMonth() depends on parsing.
    // If birth_date is full date of birth, we check day and month.
    return date.getDate() === day && date.getMonth() === month - 1;
  }

  public hasBirthdayPassed(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const { day, month } = getPanamaNowParts();
    if (date.getMonth() < month - 1) return true;
    if (date.getMonth() > month - 1) return false;
    return date.getDate() < day;
  }

  public getBirthdayDay(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).getDate().toString();
  }

  public getBirthdayMonth(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date
      .toLocaleString('es-ES', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }
}
