import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
} from '@angular/core';
import { format, getDate, getYear, getMonth, parseISO, setYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { DialogModule } from 'primeng/dialog';
import { DeviceService } from '../../../../services/device.service';

@Component({
  selector: 'pt-birthdays-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    @if (device.isDesktop()) {
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="Cumpleañeros del Mes"
      styleClass="late-details-dialog birthdays-dialog"
    >
      <div class="dialog-content">
        @if (birthDates().length === 0) {
        <div class="empty-state">No hay cumpleañeros este mes.</div>
        } @else {
        <ul class="birthday-list">
          @for (birthday of getSortedBirthdays(); track birthday.id) {
          <li
            class="birthday-list-item"
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
                <i
                  class="pi"
                  [class.pi-gift]="isBirthdayToday(birthday.birth_date)"
                  [class.pi-star]="
                    !hasBirthdayPassed(birthday.birth_date) &&
                    !isBirthdayToday(birthday.birth_date)
                  "
                  [class.pi-check-circle]="
                    hasBirthdayPassed(birthday.birth_date)
                  "
                ></i>
              </div>
              <div class="birthday-details">
                <div class="birthday-name-row">
                  <span class="birthday-name">
                    {{ birthday.first_name + ' ' + birthday.father_name }}
                  </span>
                </div>
                <div class="birthday-info-row">
                  <span class="birthday-branch">
                    <i class="pi pi-building"></i>
                    {{ birthday.branch?.name || 'Sin sucursal' }}
                  </span>
                </div>
              </div>
              <div class="birthday-right-section">
                <div class="birthday-date-display">
                  {{ getBirthdayDay(birthday.birth_date) }}
                  <span class="date-month">{{
                    getBirthdayMonth(birthday.birth_date)
                  }}</span>
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
                  <span *ngIf="isBirthdayToday(birthday.birth_date)"
                    >¡HOY ES SU DÍA!</span
                  >
                  <span
                    *ngIf="
                      !hasBirthdayPassed(birthday.birth_date) &&
                      !isBirthdayToday(birthday.birth_date)
                    "
                    >Próximamente</span
                  >
                  <span *ngIf="hasBirthdayPassed(birthday.birth_date)"
                    >Ya Celebrado</span
                  >
                </span>
              </div>
            </div>
          </li>
          }
        </ul>
        }
      </div>
    </p-dialog>
    } @else {
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '95vw', 'max-height': '90vh' }"
      position="bottom"
      header="Cumpleañeros del Mes"
      styleClass="late-details-dialog birthdays-dialog"
    >
      <div class="p-2">
        @if (birthDates().length === 0) {
        <div class="text-sm text-gray-400 text-center py-4">No hay cumpleañeros este mes.</div>
        } @else {
        <div class="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
          @for (birthday of getSortedBirthdays(); track birthday.id) {
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
            <div class="flex items-center gap-3">
              <div
                class="birthday-icon-box flex-shrink-0"
                [class.icon-today]="isBirthdayToday(birthday.birth_date)"
                [class.icon-upcoming]="
                  !hasBirthdayPassed(birthday.birth_date) &&
                  !isBirthdayToday(birthday.birth_date)
                "
                [class.icon-passed]="hasBirthdayPassed(birthday.birth_date)"
              >
                <i
                  class="pi"
                  [class.pi-gift]="isBirthdayToday(birthday.birth_date)"
                  [class.pi-star]="
                    !hasBirthdayPassed(birthday.birth_date) &&
                    !isBirthdayToday(birthday.birth_date)
                  "
                  [class.pi-check-circle]="
                    hasBirthdayPassed(birthday.birth_date)
                  "
                ></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-white font-medium truncate">
                  {{ birthday.first_name + ' ' + birthday.father_name }}
                </div>
                <div class="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <i class="pi pi-building text-[10px]"></i>
                  {{ birthday.branch?.name || 'Sin sucursal' }}
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <div class="text-sm font-bold text-white">
                  {{ getBirthdayDay(birthday.birth_date) }}
                  <span class="text-xs text-gray-400 font-normal uppercase">{{
                    getBirthdayMonth(birthday.birth_date)
                  }}</span>
                </div>
                <span
                  class="birthday-status-badge text-[10px]"
                  [class.status-today]="isBirthdayToday(birthday.birth_date)"
                  [class.status-upcoming]="
                    !hasBirthdayPassed(birthday.birth_date) &&
                    !isBirthdayToday(birthday.birth_date)
                  "
                  [class.status-passed]="hasBirthdayPassed(birthday.birth_date)"
                >
                  @if (isBirthdayToday(birthday.birth_date)) {
                    <i class="pi pi-star-fill"></i> HOY
                  } @else if (!hasBirthdayPassed(birthday.birth_date)) {
                    <i class="pi pi-clock"></i> Próximo
                  } @else {
                    <i class="pi pi-check-circle"></i> Pasado
                  }
                </span>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </p-dialog>
    }
  `,
  styles: [
    `
      .dialog-content {
        padding: 1.5rem 2rem;
        min-height: 100px;
      }

      .empty-state {
        font-size: 0.875rem;
        color: #d1d5db;
        text-align: center;
        padding: 1rem 0;
      }

      .birthday-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        max-height: 24rem;
        overflow-y: auto;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .birthday-list-item {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);

        &:last-child {
          border-bottom: none;
        }
      }

      .birthday-item-content {
        display: flex;
        align-items: center;
        padding: 1rem 0;
        gap: 1rem;
      }

      .birthday-icon-box {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.icon-today {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
          animation: pulse 2s infinite;
        }

        &.icon-upcoming {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        &.icon-passed {
          background: rgba(255, 255, 255, 0.05);
          color: #9ca3af;
        }
      }

      .birthday-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .birthday-name {
        font-weight: 500;
        color: #e4e4e7;
      }

      .birthday-info-row {
        display: flex;
        gap: 1rem;
      }

      .birthday-branch {
        font-size: 0.75rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .birthday-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
      }

      .birthday-date-display {
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: baseline;
        gap: 0.25rem;

        .date-month {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: normal;
        }
      }

      .birthday-status-badge {
        font-size: 0.625rem;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        text-transform: uppercase;
        font-weight: 600;

        &.status-today {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        &.status-upcoming {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        &.status-passed {
          background: rgba(255, 255, 255, 0.05);
          color: #6b7280;
        }
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(251, 191, 36, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdaysDialogComponent {
  protected device = inject(DeviceService);
  visible = model.required<boolean>();
  birthDates = input.required<any[]>();

  getSortedBirthdays() {
    return [...this.birthDates()].sort((a, b) => {
      const dayA = parseInt(format(parseISO(a.birth_date), 'd'));
      const dayB = parseInt(format(parseISO(b.birth_date), 'd'));
      return dayA - dayB;
    });
  }

  isBirthdayToday(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    const today = new Date();
    // Compare only day and month
    return (
      getDate(date) === getDate(today) && getMonth(date) === getMonth(today)
    );
  }

  hasBirthdayPassed(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    const today = new Date();

    // Set both to same year for comparison
    const birthDateThisYear = setYear(date, getYear(today));

    // Check if passed (ignoring time)
    // If month is less than current month, it passed
    if (getMonth(birthDateThisYear) < getMonth(today)) return true;

    // If month is same, check day
    if (
      getMonth(birthDateThisYear) === getMonth(today) &&
      getDate(birthDateThisYear) < getDate(today)
    )
      return true;

    return false;
  }

  getBirthdayDay(dateStr: string): string {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'd');
  }

  getBirthdayMonth(dateStr: string): string {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'MMM', { locale: es }).replace('.', '');
  }
}
