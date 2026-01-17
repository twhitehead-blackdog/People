import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DashboardStore } from '../../../../stores/dashboard.store';

@Component({
  selector: 'pt-events-section',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  template: `
    <div class="section-content">
      <div class="events-grid">
        <div class="event-card">
          <h3 class="event-title">
            <i class="pi pi-star"></i>
            Cumpleañeros de {{ currentMonth() | titlecase }}
          </h3>
          <div class="birthday-list">
            @if (state.birthDates().length > 0) { @for (item of
            state.birthDates(); track item) {
            <div class="birthday-item">
              <div class="birthday-date">
                <div class="birthday-day">
                  {{ getBirthdayDay(item.birth_date) }}
                </div>
                <div class="birthday-month">
                  {{ getBirthdayMonth(item.birth_date) }}
                </div>
              </div>
              <div class="birthday-info">
                <div class="birthday-name">
                  {{ item.first_name }} {{ item.father_name }}
                </div>
                <div class="birthday-branch">
                  {{ item.branch?.name || 'Sin sucursal' }}
                </div>
              </div>
            </div>
            } } @else {
            <div class="empty-state-small">No hay cumpleañeros este mes</div>
            }
          </div>
        </div>
        <div class="event-card">
          <h3 class="event-title">
            <i class="pi pi-star"></i>
            Próximos Aniversarios
          </h3>
          <div class="anniversary-list">
            @if (state.upcomingAnniversaries().length > 0) { @for (item of
            state.upcomingAnniversaries(); track item.employee.id) {
            <div class="anniversary-item">
              <div class="anniversary-info">
                <div class="anniversary-name">
                  {{ item.employee.first_name }}
                  {{ item.employee.father_name }}
                </div>
                <div class="anniversary-branch">
                  {{ item.employee.branch?.name || 'Sin sucursal' }}
                </div>
              </div>
              <div class="anniversary-badge">{{ item.years }} años</div>
            </div>
            } } @else {
            <div class="empty-state-small">No hay aniversarios próximos</div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .section-content {
        padding: 0;
      }

      .events-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 1.5rem;
      }

      .event-card {
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .event-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        font-family: 'Segoe UI', sans-serif;

        i {
          color: #fbbf24;
        }
      }

      .birthday-list,
      .anniversary-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-height: 400px;
        overflow-y: auto;
        padding-right: 0.5rem;
      }

      .birthday-item,
      .anniversary-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      }

      .birthday-date {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        background: rgba(251, 191, 36, 0.1);
        border-radius: 8px;
        margin-right: 1rem;
        flex-shrink: 0;
        border: 1px solid rgba(251, 191, 36, 0.2);
      }

      .birthday-day {
        font-size: 1.25rem;
        font-weight: 700;
        color: #fbbf24;
        line-height: 1;
      }

      .birthday-month {
        font-size: 0.625rem;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 2px;
      }

      .birthday-info,
      .anniversary-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .birthday-name,
      .anniversary-name {
        font-weight: 500;
        color: #e4e4e7;
        font-size: 0.95rem;
      }

      .birthday-branch,
      .anniversary-branch {
        font-size: 0.75rem;
        color: #a1a1aa;
      }

      .anniversary-item {
        justify-content: space-between;
      }

      .anniversary-badge {
        background: rgba(52, 211, 153, 0.1);
        color: #34d399;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid rgba(52, 211, 153, 0.2);
        white-space: nowrap;
      }

      .empty-state-small {
        text-align: center;
        font-size: 0.875rem;
        color: #71717a;
        padding: 2rem 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsSectionComponent {
  state = inject(DashboardStore);
  currentMonth = input.required<string>();

  getBirthdayDay(dateStr: string): string {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'd');
  }

  getBirthdayMonth(dateStr: string): string {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'MMM', { locale: es }).replace('.', '');
  }
}
