import { Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { firstValueFrom } from 'rxjs';

interface NewsItem {
  id: string;
  title: string;
  message: string;
  icon: string;
}

@Component({
  selector: 'pt-news-ticker',
  standalone: true,
  template: `
    @if (items().length > 0) {
    <div class="ticker-wrap" [class]="variant()">
      <div class="ticker-track">
        @for (item of doubledItems(); track $index) {
          <span class="ticker-item">
            <i class="pi" [class]="item.icon"></i>
            <strong>{{ item.title }}</strong>
            <span class="ticker-sep">—</span>
            {{ item.message }}
          </span>
        }
      </div>
    </div>
    }
  `,
  styles: [`
    .ticker-wrap {
      width: 100%;
      overflow: hidden;
      background: rgba(247, 177, 4, 0.08);
      border-top: 1px solid rgba(247, 177, 4, 0.15);
      border-bottom: 1px solid rgba(247, 177, 4, 0.15);
      padding: 6px 0;
      position: relative;
      z-index: 5;
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
    }
    .ticker-wrap.kiosk {
      background: rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .ticker-track {
      display: flex;
      gap: 3rem;
      white-space: nowrap;
      animation: ticker-scroll var(--ticker-duration, 30s) linear infinite;
      width: max-content;
    }
    .ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 0.01em;
    }
    .ticker-item i {
      color: #f7b104;
      font-size: 0.65rem;
    }
    .ticker-item strong {
      color: #f7b104;
      font-weight: 600;
    }
    .ticker-sep {
      color: rgba(255, 255, 255, 0.2);
      margin: 0 2px;
    }
    @keyframes ticker-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `]
})
export class NewsTickerComponent implements OnInit, OnDestroy {
  variant = input<'default' | 'kiosk'>('default');

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  public items = signal<NewsItem[]>([]);

  public doubledItems = computed(() => {
    const list = this.items();
    return [...list, ...list];
  });

  ngOnInit() {
    // Naz company doesn't see the ticker
    if (this.org.isNaz()) return;
    this.loadNews();
    this.intervalId = setInterval(() => this.loadNews(), 5 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async loadNews() {
    try {
      const allItems: NewsItem[] = [];

      // 1. Manual news
      const now = new Date().toISOString();
      const url = this.apiUrl.build('rest/v1/news_ticker', {
        is_active: 'eq.true',
        or: `(expires_at.is.null,expires_at.gte.${now})`,
        starts_at: `lte.${now}`,
        order: 'priority.desc,created_at.desc',
        select: 'id,title,message,icon',
      });
      const data = await firstValueFrom(this.http.get<NewsItem[]>(url));
      if (data?.length) allItems.push(...data);

      // 2. Auto birthdays (today + next 2 days)
      const birthdays = await this.loadBirthdays();
      allItems.push(...birthdays);

      // 3. Store target achievements (disabled - reading wrong data)
      // const targets = await this.loadStoreTargets();
      // allItems.push(...targets);

      this.items.set(allItems);
    } catch (e) {
      // silent - ticker is non-critical
    }
  }

  private async loadBirthdays(): Promise<NewsItem[]> {
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        is_active: 'eq.true',
        select: 'id,first_name,father_name,birth_date',
        birth_date: 'not.is.null',
      });
      const employees = await firstValueFrom(this.http.get<any[]>(url));
      if (!employees?.length) return [];

      const today = new Date();
      const items: NewsItem[] = [];

      for (const emp of employees) {
        if (!emp.birth_date) continue;
        const bd = new Date(emp.birth_date + 'T12:00:00');
        const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
        const diffMs = thisYearBd.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const diffDays = Math.round(diffMs / 86400000);
        const name = `${emp.first_name || ''} ${emp.father_name || ''}`.trim();

        if (diffDays === 0) {
          items.push({ id: `bd-${emp.id}`, title: 'Cumpleaños', message: `¡Feliz cumpleaños ${name}! 🎂`, icon: 'pi-gift' });
        } else if (diffDays === 1) {
          items.push({ id: `bd-${emp.id}`, title: 'Cumpleaños mañana', message: `Mañana cumple años ${name} 🎉`, icon: 'pi-gift' });
        } else if (diffDays === 2) {
          items.push({ id: `bd-${emp.id}`, title: 'Próximo cumpleaños', message: `${name} cumple años en 2 días 🎈`, icon: 'pi-calendar' });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  private async loadStoreTargets(): Promise<NewsItem[]> {
    try {
      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const resp = await fetch(`/analytics/api/dashboard/budget-progress?from=${from}&to=${to}`);
      if (!resp.ok) return [];
      const stores: any[] = await resp.json();
      const items: NewsItem[] = [];
      const LEVELS = [
        { key: 'meta_oro', label: 'Meta Oro', emoji: '🥇' },
        { key: 'meta_alta', label: 'Meta Alta', emoji: '🥈' },
        { key: 'meta_promedio', label: 'Meta Promedio', emoji: '🎯' },
      ];
      for (const store of stores) {
        const sales = parseFloat(store.actual_sales || '0');
        for (const level of LEVELS) {
          const target = parseFloat(store[level.key] || '0');
          if (target > 0 && sales >= target) {
            items.push({
              id: `target-${store.store_id}-${level.key}`,
              title: store.store_name,
              message: `¡Alcanzó ${level.label}! ${level.emoji}`,
              icon: 'pi-trophy',
            });
            break;
          }
        }
      }
      return items;
    } catch {
      return [];
    }
  }
}
