import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'pt-adoptions-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <div class="house-icon">
            <span>🏠</span>
          </div>
          <h1 class="hero-title">CONECTANDO HUMANOS CON SUS MASCOTAS</h1>
          <p class="hero-subtitle">
            Ayudamos a encontrar una familia para cada peludito.
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .hero-section {
        background: linear-gradient(
          to right,
          #1f2937 0%,
          #1f2937 60%,
          #374151 100%
        );
        padding: 3rem 2rem 3rem 2rem;
        padding-right: 450px;
        position: relative;
        overflow: visible;
        min-height: 500px;
        height: auto;
        display: flex;
        align-items: center;
        transition: background 0.3s ease;
      }

      .adoptions-container.dark .hero-section,
      :host-context(.adoptions-dark) .hero-section {
        background: linear-gradient(
          to right,
          #000000 0%,
          #000000 60%,
          #1f2937 100%
        );
      }

      .hero-logo-left {
        position: absolute;
        top: 2rem;
        left: 2rem;
        z-index: 10;
      }

      .logo-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
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
        font-size: 1.5rem;
        display: block;
      }

      .logo-text {
        font-weight: 700;
        font-size: 1.25rem;
        color: #ffffff;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .hero-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
      }

      .hero-text {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        position: relative;
        z-index: 1;
        flex: 1;
        padding-right: 420px;
        justify-content: center;
      }

      @media (max-width: 1024px) {
        .hero-section {
          padding-right: 2rem;
        }
        .hero-text {
          padding-right: 0;
        }
      }

      .house-icon {
        width: 60px;
        height: 60px;
        background: #fbbf24;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        color: #000000;
        margin-bottom: 1rem;
      }

      .hero-title {
        font-size: 3rem;
        font-weight: 700;
        color: #fbbf24;
        line-height: 1.2;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        max-width: 100%;
      }

      .hero-subtitle {
        font-size: 1.25rem;
        color: #ffffff;
        line-height: 1.6;
        margin: 0;
        max-width: 100%;
      }

      @media (max-width: 1024px) {
        .hero-title {
          font-size: 2.5rem;
        }
      }

      @media (max-width: 768px) {
        .hero-section {
          padding: 2rem 1rem;
          min-height: 400px;
          height: auto;
        }

        .hero-logo-left {
          top: 1rem;
          left: 1rem;
        }

        .logo-icon-wrapper {
          width: 32px;
          height: 32px;
        }

        .logo-icon {
          font-size: 1.25rem;
        }

        .logo-text {
          font-size: 1rem;
        }

        .hero-title {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1rem;
        }

        .house-icon {
          width: 50px;
          height: 50px;
          font-size: 1.5rem;
        }
      }
    `,
  ],
})
export class AdoptionsHeroComponent {}
