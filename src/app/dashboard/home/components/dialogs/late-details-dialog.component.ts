import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'pt-late-details-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      [header]="headerTitle()"
      styleClass="late-details-dialog lates-dialog"
    >
      <div class="dialog-content">
        @if (details().length === 0) {
        <div class="empty-state">
          No hay tardanzas registradas en esta fecha.
        </div>
        } @else {
        <ul class="lates-list">
          @for (d of details(); track d.id || $index) {
          <li class="lates-list-item">
            <div class="lates-item-content">
              <div
                class="lates-icon-box"
                [class.late-severe]="d.minutesLate && d.minutesLate > 10"
                [class.late-moderate]="d.minutesLate && d.minutesLate <= 10"
              >
                <i
                  class="pi"
                  [class.pi-clock]="d.minutesLate && d.minutesLate <= 10"
                  [class.pi-exclamation-triangle]="
                    d.minutesLate && d.minutesLate > 10
                  "
                ></i>
              </div>
              <div class="lates-details">
                <div class="lates-name-row">
                  <span class="lates-name">
                    {{ d.name || 'Sin nombre' }}
                  </span>
                </div>
                <div class="lates-info-row">
                  @if (d.scheduledEntry && d.actualEntry && d.minutesLate !==
                  undefined) {
                  <span class="lates-time-info">
                    <i class="pi pi-calendar-clock"></i>
                    {{ d.scheduledEntry }} → {{ d.actualEntry }}
                  </span>
                  } @else {
                  <span class="lates-time-info">
                    <i class="pi pi-info-circle"></i>
                    Sin detalles de horario
                  </span>
                  }
                </div>
              </div>
              <div class="lates-right-section">
                @if (d.minutesLate !== undefined) {
                <div
                  class="lates-delay-display"
                  [class.delay-severe]="d.minutesLate && d.minutesLate > 10"
                  [class.delay-moderate]="d.minutesLate && d.minutesLate <= 10"
                >
                  {{ d.minutesLate }} min
                </div>
                } @else {
                <span class="text-xs text-gray-400">-</span>
                }
              </div>
            </div>
          </li>
          }
        </ul>
        }
      </div>
    </p-dialog>
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

      .lates-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        max-height: 24rem;
        overflow-y: auto;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .lates-list-item {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        &:last-child {
          border-bottom: none;
        }
      }

      .lates-item-content {
        display: flex;
        align-items: center;
        padding: 0.75rem 0;
        gap: 1rem;
      }

      .lates-icon-box {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.late-moderate {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        &.late-severe {
          background: rgba(248, 113, 113, 0.15);
          color: #f87171;
        }
      }

      .lates-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .lates-name {
        font-weight: 500;
        color: #e4e4e7;
      }

      .lates-time-info {
        font-size: 0.75rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .lates-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .lates-delay-display {
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;

        &.delay-moderate {
          color: #fbbf24;
        }

        &.delay-severe {
          color: #f87171;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateDetailsDialogComponent {
  visible = model.required<boolean>();
  details = input.required<any[]>();
  headerTitle = input<string>('');
}
