import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

export interface LateDetail {
  name: string;
  scheduledEntry?: string;
  actualEntry?: string;
  minutesLate?: number;
}

@Component({
  selector: 'app-late-details-dialog',
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
      [header]="title"
      styleClass="late-details-dialog lates-dialog"
      appendTo="body"
    >
      <div
        class="flex flex-col gap-0"
        style="padding: 1.5rem 2rem; min-height: 100px;"
      >
        <div
          class="text-sm text-gray-300 text-center py-4"
          *ngIf="details.length === 0"
        >
          No hay tardanzas registradas en esta fecha.
        </div>
        <ul
          class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
          *ngIf="details.length > 0"
        >
          <li class="lates-list-item" *ngFor="let d of details">
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
                  <span
                    class="lates-time-info"
                    *ngIf="
                      d.scheduledEntry &&
                      d.actualEntry &&
                      d.minutesLate !== undefined
                    "
                  >
                    <i class="pi pi-calendar-clock"></i>
                    {{ d.scheduledEntry }} → {{ d.actualEntry }}
                  </span>
                  <span
                    class="lates-time-info"
                    *ngIf="!d.scheduledEntry || !d.actualEntry"
                  >
                    <i class="pi pi-info-circle"></i>
                    Sin detalles de horario
                  </span>
                </div>
              </div>
              <div class="lates-right-section">
                <div
                  class="lates-delay-display"
                  [class.delay-severe]="d.minutesLate && d.minutesLate > 10"
                  [class.delay-moderate]="d.minutesLate && d.minutesLate <= 10"
                  *ngIf="d.minutesLate !== undefined"
                >
                  {{ d.minutesLate }} min
                </div>
                <span
                  class="text-xs text-gray-400"
                  *ngIf="d.minutesLate === undefined"
                >
                  -
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
      .lates-list-item {
        background: transparent;
        border: none;
        padding: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }

      .lates-list-item:first-child .lates-item-content {
        padding-top: 0;
      }

      .lates-list-item:last-child {
        border-bottom: none;
      }

      .lates-list-item:hover {
        background: rgba(251, 191, 36, 0.05);
      }

      .lates-item-content {
        display: flex;
        gap: 0.875rem;
        align-items: center;
        padding: 0.875rem 0;
      }

      .lates-icon-box {
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

      .lates-icon-box.late-moderate {
        background: linear-gradient(
          135deg,
          rgba(251, 191, 36, 0.2),
          rgba(245, 158, 11, 0.1)
        );
        border: 2px solid rgba(251, 191, 36, 0.4);
        color: #fbbf24;
      }

      .lates-icon-box.late-severe {
        background: linear-gradient(
          135deg,
          rgba(239, 68, 68, 0.2),
          rgba(220, 38, 38, 0.1)
        );
        border: 2px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
      }

      .lates-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      .lates-name-row {
        display: flex;
        align-items: center;
      }

      .lates-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
      }

      .lates-info-row {
        display: flex;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
        flex-wrap: wrap;
      }

      .lates-time-info {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .lates-time-info i {
        font-size: 0.625rem;
        color: rgba(251, 191, 36, 0.5);
      }

      .lates-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
      }

      .lates-delay-display {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1;
        font-family: 'Segoe UI', sans-serif;
      }

      .lates-delay-display.delay-moderate {
        color: #fbbf24;
      }

      .lates-delay-display.delay-severe {
        color: #ef4444;
      }

      /* Custom Scrollbar for Lates List */
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
export class LateDetailsDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() title = 'Tardanzas';
  @Input() details: LateDetail[] = [];
}
