import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'pt-hires-exits-dialog',
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
      styleClass="late-details-dialog hires-exits-dialog"
    >
      <div class="dialog-content">
        <!-- Tabs -->
        <div class="hires-exits-tabs">
          <button
            class="tab-button"
            [class.active]="activeTab() === 'hires'"
            (click)="activeTab.set('hires')"
          >
            <i class="pi pi-arrow-down"></i>
            Ingresos ({{ hires().length }})
          </button>
          <button
            class="tab-button"
            [class.active]="activeTab() === 'exits'"
            (click)="activeTab.set('exits')"
          >
            <i class="pi pi-arrow-up"></i>
            Salidas ({{ exits().length }})
          </button>
        </div>

        <!-- Hires List -->
        @if (activeTab() === 'hires') { @if (hires().length === 0) {
        <div class="empty-state">No hay ingresos registrados.</div>
        } @else {
        <ul class="list-container">
          @for (hire of hires(); track hire.id) {
          <li class="list-item">
            <div class="item-content">
              <div class="icon-box icon-hire">
                <i class="pi pi-user-plus"></i>
              </div>
              <div class="item-details">
                <div class="name-row">
                  <span class="name">
                    {{ hire.first_name }} {{ hire.father_name }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="branch">
                    <i class="pi pi-building"></i>
                    {{ hire.branch?.name || 'Sin sucursal' }}
                  </span>
                  @if (hire.position) {
                  <span class="position">
                    <i class="pi pi-briefcase"></i>
                    {{ hire.position.name }}
                  </span>
                  }
                </div>
              </div>
              <div class="right-section">
                <div class="date-display">
                  {{ formatDate(hire.start_date) }}
                </div>
              </div>
            </div>
          </li>
          }
        </ul>
        } }

        <!-- Exits List -->
        @if (activeTab() === 'exits') { @if (exits().length === 0) {
        <div class="empty-state">No hay salidas registradas.</div>
        } @else {
        <ul class="list-container">
          @for (exit of exits(); track exit.id || $index) {
          <li class="list-item">
            <div class="item-content">
              <div class="icon-box icon-exit">
                <i class="pi pi-user-minus"></i>
              </div>
              <div class="item-details">
                <div class="name-row">
                  <span class="name">
                    {{ exit.employee?.first_name }}
                    {{ exit.employee?.father_name }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="branch">
                    <i class="pi pi-building"></i>
                    {{ exit.employee?.branch?.name || 'Sin sucursal' }}
                  </span>
                  @if (exit.reason) {
                  <span class="reason">
                    <i class="pi pi-info-circle"></i>
                    {{ exit.reason }}
                  </span>
                  }
                </div>
              </div>
              <div class="right-section">
                <div class="date-display exit-date">
                  {{ formatDate(exit.date) }}
                </div>
              </div>
            </div>
          </li>
          }
        </ul>
        } }
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .dialog-content {
        padding: 1.5rem 2rem;
        min-height: 100px;
      }

      .hires-exits-tabs {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.5rem;
      }

      .tab-button {
        background: transparent;
        border: none;
        color: #9ca3af;
        font-size: 0.9rem;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        &.active {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      }

      .empty-state {
        font-size: 0.875rem;
        color: #d1d5db;
        text-align: center;
        padding: 1rem 0;
      }

      .list-container {
        display: flex;
        flex-direction: column;
        gap: 0;
        max-height: 24rem;
        overflow-y: auto;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .list-item {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        &:last-child {
          border-bottom: none;
        }
      }

      .item-content {
        display: flex;
        align-items: center;
        padding: 1rem 0;
        gap: 1rem;
      }

      .icon-box {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.icon-hire {
          background: rgba(52, 211, 153, 0.15);
          color: #34d399;
        }

        &.icon-exit {
          background: rgba(248, 113, 113, 0.15);
          color: #f87171;
        }
      }

      .item-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .name {
        font-weight: 500;
        color: #e4e4e7;
      }

      .info-row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .branch,
      .position,
      .reason {
        font-size: 0.75rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .date-display {
        font-size: 0.875rem;
        font-weight: 600;
        color: #34d399;

        &.exit-date {
          color: #f87171;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HiresExitsDialogComponent {
  visible = model.required<boolean>();
  hires = input.required<any[]>();
  exits = input.required<any[]>();
  headerTitle = input<string>('Ingresos y Salidas del Personal');

  activeTab = signal<'hires' | 'exits'>('hires');

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: es });
  }
}
