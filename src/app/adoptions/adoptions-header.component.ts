import { CommonModule } from '@angular/common';
import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DemoModeService } from './demo-mode.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'pt-adoptions-header',
  standalone: true,
  imports: [CommonModule],
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
            <a href="#" class="nav-link active">Tienda</a>
            <a href="#" class="nav-link">Servicios</a>
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
          @if (isAuthenticated()) {
            <div class="user-menu">
              <button class="user-button" (click)="goToProfile()" type="button">
                <span class="user-avatar">{{ userInitials() }}</span>
                <span class="user-name">{{ userName() }}</span>
              </button>
            </div>
          } @else {
            <button class="login-button" type="button" (click)="goToLogin()">Iniciar Sesión</button>
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .adoptions-header {
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: background-color 0.3s ease, border-color 0.3s ease;
      }

      .adoptions-container.dark .adoptions-header,
      :host-context(.adoptions-dark) .adoptions-header {
        background: #1f2937;
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

      .logo-icon {
        height: 80px;
        width: auto;
        object-fit: contain;
        transition: all 0.3s ease;
        animation: logoFloat 3s ease-in-out infinite;
      }

      .logo-container:hover .logo-icon {
        transform: scale(1.1);
        filter: drop-shadow(0 4px 12px rgba(55, 65, 81, 0.4));
      }

      @keyframes logoFloat {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
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
        transition: background 0.2s, color 0.2s;
      }

      .adoptions-container.dark .nav-link,
      :host-context(.adoptions-dark) .nav-link {
        color: #ffffff;
      }

      .nav-link:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .adoptions-container.dark .nav-link:hover,
      :host-context(.adoptions-dark) .nav-link:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .nav-link.active {
        background: #fbbf24;
        color: #000000;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .login-button {
        background: #fbbf24;
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
        box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
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
        background: #000000;
        color: #fbbf24;
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 8px 20px rgba(251, 191, 36, 0.5),
          0 0 20px rgba(251, 191, 36, 0.3);
      }

      .login-button:hover::before {
        left: 100%;
      }

      .login-button:active {
        transform: translateY(0) scale(1.02);
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
  private authService = inject(AuthService);
  public useDemoData = this.demoModeService.useDemoData;
  public isAuthenticated = this.authService.isAuthenticated;
  public currentUser = this.authService.currentUser;

  public userName = computed(() => {
    const user = this.currentUser();
    return user?.full_name || user?.email?.split('@')[0] || 'Usuario';
  });

  public userInitials = computed(() => {
    const user = this.currentUser();
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  });

  public onToggleDemo(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.demoModeService.setDemoMode(checked);
  }

  public openUserMenu(event: Event): void {
    // Implementar menú de usuario
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
}
