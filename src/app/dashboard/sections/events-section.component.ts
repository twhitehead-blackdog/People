import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';
import {
  getMonthNameSpanish,
  getPanamaNowParts,
} from '../../utils/panama-date.utils';

@Component({
  selector: 'app-events-section',
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsSectionComponent {
  public state = inject(DashboardStore);

  public currentMonth = computed(() => {
    const { month } = getPanamaNowParts();
    return getMonthNameSpanish(month - 1);
  });

  public getBirthdayDay(date: Date | undefined): string {
    if (!date) return '??';
    return new Date(date).getDate().toString();
  }

  public getBirthdayMonth(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date
      .toLocaleString('es-ES', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }
}
