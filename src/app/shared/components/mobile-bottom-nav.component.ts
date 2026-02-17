import { Component, input, output } from '@angular/core';

export interface MobileNavTab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'pt-mobile-bottom-nav',
  standalone: true,
  template: `
    <nav class="mobile-bottom-nav">
      @for (tab of tabs(); track tab.id) {
        <button
          class="mobile-bottom-nav__tab"
          [class.mobile-bottom-nav__tab--active]="activeTab() === tab.id"
          (click)="tabChange.emit(tab.id)"
        >
          @if (tab.badge) {
            <span class="mobile-bottom-nav__badge">{{ tab.badge > 99 ? '99+' : tab.badge }}</span>
          }
          <i [class]="tab.icon" class="mobile-bottom-nav__icon"></i>
          <span class="mobile-bottom-nav__label">{{ tab.label }}</span>
        </button>
      }
    </nav>
  `,
  styles: [`
    .mobile-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      display: flex;
      justify-content: space-around;
      align-items: stretch;
      background: #0a0a0a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .mobile-bottom-nav__tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: 56px;
      padding: 6px 4px;
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      position: relative;
      transition: color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .mobile-bottom-nav__tab--active {
      color: #fbbf24;
    }

    .mobile-bottom-nav__icon {
      font-size: 1.25rem;
    }

    .mobile-bottom-nav__label {
      font-size: 0.625rem;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    .mobile-bottom-nav__badge {
      position: absolute;
      top: 4px;
      right: calc(50% - 18px);
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: #ef4444;
      color: #fff;
      font-size: 0.6rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class MobileBottomNavComponent {
  tabs = input.required<MobileNavTab[]>();
  activeTab = input<string>('');
  tabChange = output<string>();
}
