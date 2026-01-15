import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

export interface TopAbsenceRecord {
  employee_name: string;
  count: number;
}

@Component({
  selector: 'app-top-absences-dialog',
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
      header="Top de Empleados con Más Ausencias"
      styleClass="late-details-dialog top-absences-dialog"
      appendTo="body"
    >
      <div
        class="flex flex-col gap-0"
        style="padding: 1.5rem 2rem; min-height: 100px;"
      >
        <div
          class="text-sm text-gray-300 text-center py-4"
          *ngIf="absences.length === 0"
        >
          No hay ausencias registradas este mes.
        </div>
        <ul *ngIf="absences.length > 0" class="top-absences-list">
          <li
            class="top-absences-list-item"
            *ngFor="let item of absences; let i = index"
          >
            <div class="top-absences-item-content">
              <div
                class="top-absences-rank"
                [class.rank-1]="i === 0"
                [class.rank-2]="i === 1"
                [class.rank-3]="i === 2"
              >
                {{ i + 1 }}
              </div>
              <div class="top-absences-details">
                <div class="top-absences-name-row">
                  <span class="top-absences-name">{{
                    item.employee_name
                  }}</span>
                </div>
                <div class="top-absences-info-row">
                  <span class="top-absences-count"
                    >{{ item.count }} ausencia{{
                      item.count > 1 ? 's' : ''
                    }}</span
                  >
                </div>
              </div>
              <div class="top-absences-right-section">
                <div
                  class="top-absences-badge"
                  [class.badge-high]="item.count >= 5"
                  [class.badge-medium]="item.count >= 3 && item.count < 5"
                >
                  {{ item.count }}
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .top-absences-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
        max-height: 500px;
        overflow-y: auto;
      }

      .top-absences-list-item {
        background: transparent;
        border: none;
        padding: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }

      .top-absences-list-item:first-child .top-absences-item-content {
        padding-top: 0;
      }

      .top-absences-list-item:last-child {
        border-bottom: none;
      }

      .top-absences-list-item:hover {
        background: rgba(251, 191, 36, 0.05);
      }

      .top-absences-item-content {
        display: flex;
        gap: 0.875rem;
        align-items: center;
        padding: 0.875rem 0;
      }

      .top-absences-rank {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1rem;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }

      .top-absences-rank.rank-1 {
        background: linear-gradient(
          135deg,
          rgba(168, 85, 247, 0.3),
          rgba(147, 51, 234, 0.2)
        );
        border-color: rgba(168, 85, 247, 0.6);
        color: #a855f7;
        font-size: 1.125rem;
      }

      .top-absences-rank.rank-2 {
        background: linear-gradient(
          135deg,
          rgba(156, 163, 175, 0.3),
          rgba(107, 114, 128, 0.2)
        );
        border-color: rgba(156, 163, 175, 0.6);
        color: #9ca3af;
      }

      .top-absences-rank.rank-3 {
        background: linear-gradient(
          135deg,
          rgba(124, 58, 237, 0.3),
          rgba(109, 40, 217, 0.2)
        );
        border-color: rgba(124, 58, 237, 0.6);
        color: #7c3aed;
      }

      .top-absences-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        overflow: hidden;
      }

      .top-absences-name-row {
        display: flex;
        align-items: center;
        min-width: 0;
        overflow: hidden;
      }

      .top-absences-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }

      .top-absences-info-row {
        display: flex;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .top-absences-count {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .top-absences-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
      }

      .top-absences-badge {
        font-size: 1.25rem;
        font-weight: 700;
        color: #a855f7;
        line-height: 1;
        font-family: 'Segoe UI', sans-serif;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        background: rgba(168, 85, 247, 0.1);
        border: 1px solid rgba(168, 85, 247, 0.3);
      }

      .top-absences-badge.badge-medium {
        color: #9333ea;
        background: rgba(147, 51, 234, 0.15);
        border-color: rgba(147, 51, 234, 0.4);
      }

      .top-absences-badge.badge-high {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.4);
      }

      /* Custom Scrollbar */
      ul {
        scrollbar-width: thin;
        scrollbar-color: rgba(168, 85, 247, 0.4) rgba(255, 255, 255, 0.05);
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
          rgba(168, 85, 247, 0.6),
          rgba(147, 51, 234, 0.4)
        );
        border-radius: 10px;
        border: 2px solid rgba(24, 24, 27, 0.3);
        transition: all 0.3s ease;
      }

      ul::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          180deg,
          rgba(168, 85, 247, 0.8),
          rgba(147, 51, 234, 0.6)
        );
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
      }

      ul::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, #a855f7, #9333ea);
      }
    `,
  ],
})
export class TopAbsencesDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() absences: TopAbsenceRecord[] = [];
}
