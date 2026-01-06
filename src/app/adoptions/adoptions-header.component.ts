import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthWrapperService } from '../auth/auth-wrapper.service';
import { DemoModeService } from './demo-mode.service';

@Component({
  selector: 'pt-adoptions-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AsyncPipe],
  template: `
    <header class="adoptions-header">
      <div class="header-top">
        <div class="header-left">
          <div class="logo-container" (click)="goHome()">
            <img src="assets/1.svg" alt="Black Dog Logo" class="logo-icon" />
          </div>
        </div>

        <div class="header-center">
          <nav class="header-nav">
            <a
              href="https://www.blackdogpanama.com/"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link"
            >
              Tienda
              <span class="nav-underline"></span>
            </a>
            <div
              class="nav-dropdown"
              (mouseenter)="showServicesMenu.set(true)"
              (mouseleave)="showServicesMenu.set(false)"
            >
              <a href="#" class="nav-link" [class.active]="isServicesActive()">
                Servicios
                <span class="nav-underline"></span>
                <span class="dropdown-arrow">â–¼</span>
              </a>
              @if (showServicesMenu()) {
              <div class="dropdown-menu">
                <a
                  href="/adoptions"
                  class="dropdown-item"
                  (click)="navigateToAdoptions($event)"
                >
                  ðŸ¾ AdopciÃ³n
                </a>
                <a
                  href="/adoptions/busco-pareja"
                  class="dropdown-item"
                  (click)="navigateToBuscoPareja($event)"
                >
                  ðŸ’• Busco Pareja
                </a>
              </div>
              }
            </div>
          </nav>
        </div>

        <div class="header-right">
          <div class="demo-toggle">
            <label class="toggle-label">
              <input
                type="checkbox"
                [checked]="useDemoData()"
                (change)="onToggleDemo($event)"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">{{
                useDemoData() ? 'Demo' : 'Real'
              }}</span>
            </label>
          </div>
          @if (isAuthenticated$ | async) {
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span class="status-text">Online</span>
          </div>
          @if (isAdmin()) {
          <button class="admin-button" type="button" (click)="goToAdmin()">
            Panel Admin
          </button>
          }
          <button class="user-button" (click)="goToProfile()" type="button">
            <span class="user-avatar">{{ userInitials() }}</span>
            <span class="user-name">{{ userName() }}</span>
          </button>
          } @else {
          <button class="login-button" type="button" (click)="goToLogin()">
            Iniciar SesiÃ³n
          </button>
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .adoptions-header {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s ease, border-color 0.3s ease;
      }

      .adoptions-container.dark .adoptions-header,
      :host-context(.adoptions-dark) .adoptions-header {
        background: rgba(31, 41, 55, 0.8);
        border-bottom-color: #374151;
      }

      .header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 2rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .header-left {
        display: flex;
        align-items: center;
      }

      .logo-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        transition: transform 0.3s ease;
      }

      .logo-container:hover {
        transform: scale(1.05);
      }

      .logo-icon-wrapper {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #fdb022 0%, #fcd34d 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .logo-container:hover .logo-icon-wrapper {
        transform: scale(1.1);
      }

      .logo-icon {
        height: 80px;
        width: auto;
        object-fit: contain;
        display: block;
      }

      .logo-text {
        font-weight: 700;
        font-size: 1.25rem;
        background: linear-gradient(to right, #000000 0%, #374151 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .header-center {
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .header-nav {
        display: flex;
        gap: 1.5rem;
        align-items: center;
      }

      .nav-link {
        color: #000000;
        text-decoration: none;
        font-weight: 600;
        font-size: 1rem;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        transition: color 0.3s ease;
        position: relative;
      }

      .nav-underline {
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 0;
        height: 2px;
        background: #fdb022;
        transition: width 0.3s ease;
      }

      .nav-link:hover .nav-underline,
      .nav-link.active .nav-underline {
        width: 100%;
      }

      .nav-link:hover {
        color: #fdb022;
      }

      .adoptions-container.dark .nav-link,
      :host-context(.adoptions-dark) .nav-link {
        color: #ffffff;
      }

      .adoptions-container.dark .nav-link:hover,
      :host-context(.adoptions-dark) .nav-link:hover {
        color: #fdb022;
      }

      .nav-dropdown {
        position: relative;
      }

      .dropdown-arrow {
        font-size: 0.75rem;
        margin-left: 0.25rem;
        transition: transform 0.3s ease;
      }

      .nav-dropdown:hover .dropdown-arrow {
        transform: rotate(180deg);
      }

      .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 0.5rem;
        background: #ffffff;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 200px;
        z-index: 1000;
        overflow: hidden;
        animation: slideDown 0.2s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .dropdown-item {
        display: block;
        padding: 0.75rem 1rem;
        color: #000000;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9375rem;
        transition: all 0.2s ease;
        border-bottom: 1px solid #f3f4f6;
      }

      .dropdown-item:last-child {
        border-bottom: none;
      }

      .dropdown-item:hover {
        background: #fbbf24;
        color: #000000;
      }

      .adoptions-container.dark .dropdown-menu,
      :host-context(.adoptions-dark) .dropdown-menu {
        background: #1f2937;
        border: 1px solid #374151;
      }

      .adoptions-container.dark .dropdown-item,
      :host-context(.adoptions-dark) .dropdown-item {
        color: #ffffff;
        border-bottom-color: #374151;
      }

      .adoptions-container.dark .dropdown-item:hover,
      :host-context(.adoptions-dark) .dropdown-item:hover {
        background: #fbbf24;
        color: #000000;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f0fdf4;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .status-text {
        color: #15803d;
        font-weight: 500;
      }

      .login-button {
        background: linear-gradient(to right, #fdb022 0%, #fcd34d 100%);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        color: #000000;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1rem;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(253, 176, 34, 0.3);
      }

      .login-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        transition: left 0.5s;
      }

      .login-button:hover {
        background: linear-gradient(to right, #fdb022 0.9, #fcd34d 0.9);
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(253, 176, 34, 0.5);
      }

      .login-button:hover::before {
        left: 100%;
      }

      .login-button:active {
        transform: translateY(0) scale(1.02);
      }

      .user-menu {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .admin-button {
        background: linear-gradient(to right, #fdb022 0%, #fcd34d 100%);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        color: #000000;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 2px 8px rgba(253, 176, 34, 0.3);
      }

      .admin-button:hover {
        background: linear-gradient(to right, #fdb022 0.9, #fcd34d 0.9);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(253, 176, 34, 0.5);
      }

      .user-button {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: linear-gradient(to right, #fdb022 0%, #fcd34d 100%);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(253, 176, 34, 0.3);
      }

      .user-button:hover {
        box-shadow: 0 4px 12px rgba(253, 176, 34, 0.5);
        transform: translateY(-2px);
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #000000;
        color: #fdb022;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.75rem;
      }

      .user-name {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      @media (max-width: 640px) {
        .user-name {
          display: none;
        }
        .status-indicator {
          display: none;
        }
      }

      .dark-mode-toggle {
        display: flex;
        align-items: center;
        margin-right: 1rem;
      }

      .demo-toggle {
        display: flex;
        align-items: center;
        margin-right: 1rem;
      }

      .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        user-select: none;
      }

      .toggle-input {
        display: none;
      }

      .toggle-slider {
        position: relative;
        width: 50px;
        height: 26px;
        background: #d1d5db;
        border-radius: 13px;
        transition: background 0.3s;
      }

      .toggle-slider::before {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        top: 3px;
        left: 3px;
        transition: transform 0.3s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .toggle-input:checked + .toggle-slider {
        background: #fbbf24;
      }

      .toggle-input:checked + .toggle-slider::before {
        transform: translateX(24px);
      }

      .toggle-text {
        font-size: 0.875rem;
        font-weight: 600;
        color: #000000;
        min-width: 40px;
        transition: color 0.3s ease;
      }

      .adoptions-container.dark .toggle-text,
      :host-context(.adoptions-dark) .toggle-text {
        color: #ffffff;
      }

      @media (max-width: 768px) {
        .header-top {
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
        }

        .header-center {
          order: 3;
          width: 100%;
        }

        .header-right {
          order: 2;
        }

        .logo-icon {
          max-width: 200px;
          height: 60px;
        }
      }
    `,
  ],
})
export class AdoptionsHeaderComponent {
  private router = inject(Router);
  private demoModeService = inject(DemoModeService);
  private auth = inject(AuthWrapperService);
  public useDemoData = this.demoModeService.useDemoData;
  public isAuthenticated$ = this.auth.isAuthenticated$;
  public user$ = this.auth.user$;
  public showServicesMenu = signal(false);
  public currentUrl = signal<string>('');

  constructor() {
    // Detectar cambios en la ruta
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentUrl.set(event.urlAfterRedirects);
        }
      });
    // Establecer la URL inicial
    this.currentUrl.set(this.router.url);
  }

  public isServicesActive = computed(() => {
    const url = this.currentUrl();
    return (
      this.showServicesMenu() ||
      url === '/adoptions' ||
      url.startsWith('/adoptions/busco-pareja') ||
      url.startsWith('/adoptions/profile')
    );
  });

  public isAdmin = computed(() => this.auth.isAdmin());

  public userName = computed(() => {
    const user = this.auth.currentUser();
    if (user?.full_name) {
      return user.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuario';
  });

  public userInitials = computed(() => {
    const user = this.auth.currentUser();
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  });

  public onToggleDemo(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.demoModeService.setDemoMode(checked);
  }

  public openUserMenu(event: Event): void {
    // Implementar menÃº de usuario
    console.log('Open user menu');
  }

  public goHome(): void {
    this.router.navigate(['/adoptions']);
  }

  public goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  public goToProfile(): void {
    this.router.navigate(['/adoptions/profile']);
  }

  public goToAdmin(): void {
    this.router.navigate(['/adoptions/admin']);
  }

  public goToBuscoPareja(): void {
    this.showServicesMenu.set(false);
    this.router.navigate(['/adoptions/busco-pareja']);
  }

  public navigateToAdoptions(event: Event): void {
    event.preventDefault();
    this.showServicesMenu.set(false);
    this.router.navigate(['/adoptions']);
  }

  public navigateToBuscoPareja(event: Event): void {
    event.preventDefault();
    this.showServicesMenu.set(false);
    this.router.navigate(['/adoptions/busco-pareja']);
  }
}




