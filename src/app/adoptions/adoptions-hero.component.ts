import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
        <div class="hero-image">
          <div class="dog-image-placeholder">
            <span style="font-size: 8rem; opacity: 0.1;">🖼️</span>
          </div>
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
        padding: 4rem 2rem;
        position: relative;
        overflow: hidden;
        min-height: 600px;
      }

      .hero-content {
        max-width: 1400px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 3rem;
        align-items: center;
        position: relative;
        z-index: 1;
        min-height: 500px;
      }

      .hero-text {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
      }

      .hero-subtitle {
        font-size: 1.25rem;
        color: #ffffff;
        line-height: 1.6;
        margin: 0;
        max-width: 600px;
      }

      .hero-image {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .dog-image-placeholder {
        width: 100%;
        height: 400px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
      }

      @media (max-width: 1024px) {
        .hero-content {
          grid-template-columns: 1fr;
        }

        .hero-title {
          font-size: 2.5rem;
        }

        .hero-image {
          display: none;
        }
      }

      @media (max-width: 768px) {
        .hero-section {
          padding: 2rem 1rem;
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

