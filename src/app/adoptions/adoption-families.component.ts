import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Button } from 'primeng/button';

@Component({
  selector: 'pt-adoption-families',
  standalone: true,
  imports: [CommonModule, Button],
  template: `
    <div class="families-section">
      <div class="families-container">
        <h2 class="families-title">FAMILIAS BLACK DOG</h2>
        <p class="families-subtitle">
          Gracias a nuestra campaña de Adopción Responsable estas familias
          reciben #AmorPuro.
        </p>
        <div class="families-cards">
          <div class="family-card">
            <div class="family-card-image">
              <div class="family-card-header">
                <div class="header-shape header-shape-yellow"></div>
                <h3 class="header-text">CUÉNTANOS TU HISTORIA</h3>
                <div class="header-shape header-shape-gray"></div>
              </div>
              <div class="family-card-content">
                <img
                  src="assets/cat1.jpg"
                  alt="Gato con comida"
                  class="family-pet-image"
                />
                <div class="heart-icon">💛</div>
              </div>
            </div>
          </div>
          <div class="family-card">
            <div class="family-photo-container">
              <img
                src="assets/cat2.jpg"
                alt="Familia con gato adoptado"
                class="family-photo"
              />
              <div class="heart-icon">💛</div>
            </div>
            <div class="family-story">
              <div class="certificate">
                <div class="certificate-header">
                  <span class="certificate-logo">Black Dog</span>
                  <span class="certificate-paw">🐾</span>
                </div>
                <div class="certificate-content">
                  <p class="certificate-name">Camila Mou</p>
                  <p class="certificate-pet">Mia</p>
                </div>
                <div class="certificate-footer">🐱</div>
              </div>
            </div>
          </div>
        </div>
        <div class="families-cta">
          <p-button
            label="¡Cuéntanos tu historia!"
            [style]="{
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold',
              padding: '1rem 2rem',
              borderRadius: '0.5rem'
            }"
            (onClick)="shareStory()"
          />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .families-section {
        background: linear-gradient(
          135deg,
          #f9fafb 0%,
          #ffffff 50%,
          #fef3c7 100%
        );
        width: 100%;
        padding: 4rem 0;
        position: relative;
        overflow: hidden;
      }

      .families-section::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -10%;
        width: 600px;
        height: 600px;
        background: radial-gradient(
          circle,
          rgba(55, 65, 81, 0.1) 0%,
          transparent 70%
        );
        border-radius: 50%;
        animation: float 8s ease-in-out infinite;
      }

      .families-section::after {
        content: '';
        position: absolute;
        bottom: -30%;
        right: -10%;
        width: 500px;
        height: 500px;
        background: radial-gradient(
          circle,
          rgba(251, 191, 36, 0.2) 0%,
          transparent 70%
        );
        border-radius: 50%;
        animation: float 10s ease-in-out infinite reverse;
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0) rotate(0deg);
        }
        50% {
          transform: translateY(-30px) rotate(180deg);
        }
      }

      .families-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .families-title {
        font-size: 3rem;
        font-weight: 700;
        background: linear-gradient(
          135deg,
          #000000 0%,
          #374151 50%,
          #000000 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        animation: gradientShift 3s ease infinite;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        position: relative;
        display: inline-block;
      }

      .families-title::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 4px;
        background: linear-gradient(90deg, #000000, #fbbf24, #000000);
        background-size: 200% 100%;
        border-radius: 2px;
        animation: shimmer 2s infinite;
      }

      @keyframes gradientShift {
        0%,
        100% {
          background-position: 0% center;
        }
        50% {
          background-position: 100% center;
        }
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      .families-subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
        text-align: center;
        max-width: 600px;
      }

      .families-cards {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2rem;
        width: 100%;
        max-width: 1000px;
      }

      .family-card {
        position: relative;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
      }

      .family-card:hover {
        transform: translateY(-8px);
      }

      .family-card:last-child {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .family-card-image {
        position: relative;
        width: 100%;
        border-radius: 1rem;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border: 3px solid transparent;
        background-image: linear-gradient(white, white),
          linear-gradient(135deg, #000000, #fbbf24, #374151);
        background-origin: border-box;
        background-clip: padding-box, border-box;
      }

      .family-card:hover .family-card-image {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        transform: scale(1.01);
      }

      .family-card-header {
        position: relative;
        padding: 2rem 1.5rem;
        background: linear-gradient(
          135deg,
          #fbbf24 0%,
          #fcd34d 50%,
          #fbbf24 100%
        );
        background-size: 200% 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        animation: gradientShift 3s ease infinite;
        overflow: hidden;
      }

      .family-card-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        );
        animation: shine 3s infinite;
      }

      @keyframes shine {
        0% {
          transform: translateX(-100%) translateY(-100%) rotate(45deg);
        }
        100% {
          transform: translateX(100%) translateY(100%) rotate(45deg);
        }
      }

      .header-shape {
        position: absolute;
        border-radius: 50%;
        opacity: 0.6;
      }

      .header-shape-yellow {
        width: 80px;
        height: 80px;
        background: #ffffff;
        top: 10%;
        left: 5%;
      }

      .header-shape-gray {
        width: 60px;
        height: 60px;
        background: #374151;
        bottom: 10%;
        right: 5%;
      }

      .header-text {
        position: relative;
        z-index: 1;
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
        text-align: center;
        letter-spacing: 0.05em;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      .family-card:hover .header-text {
        color: #374151;
      }

      .family-card-content {
        position: relative;
        width: 100%;
        height: 300px;
        background: #ffffff;
      }

      .family-pet-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .family-photo-container {
        position: relative;
        width: 100%;
        height: 400px;
        border-radius: 1rem;
        overflow: hidden;
        border: 3px solid transparent;
        background-image: linear-gradient(white, white),
          linear-gradient(135deg, #fbbf24, #374151, #fbbf24);
        background-origin: border-box;
        background-clip: padding-box, border-box;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .family-card:hover .family-photo-container {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        transform: scale(1.01);
      }

      .family-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .family-photo-container:hover .family-photo {
        transform: scale(1.1);
      }

      .heart-icon {
        position: absolute;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        font-size: 2rem;
        background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        animation: heartbeat 2s ease-in-out infinite;
        cursor: pointer;
      }

      .heart-icon:hover {
        transform: translateX(-50%) scale(1.1);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
      }

      @keyframes heartbeat {
        0%,
        100% {
          transform: translateX(-50%) scale(1);
        }
        50% {
          transform: translateX(-50%) scale(1.1);
        }
      }

      .family-story {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }

      .certificate {
        background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%);
        border: 3px solid transparent;
        background-image: linear-gradient(white, #fef3c7),
          linear-gradient(135deg, #000000, #fbbf24, #374151);
        background-origin: border-box;
        background-clip: padding-box, border-box;
        border-radius: 0.75rem;
        padding: 2rem;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        width: 100%;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .certificate::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent,
          rgba(251, 191, 36, 0.2),
          transparent
        );
        animation: shine 4s infinite;
      }

      .family-card:hover .certificate {
        transform: scale(1.02);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .certificate-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .certificate-logo {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
      }

      .certificate-paw {
        font-size: 1.5rem;
      }

      .certificate-content {
        margin-bottom: 1.5rem;
      }

      .certificate-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem 0;
        position: relative;
        z-index: 1;
      }

      .certificate-pet {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        position: relative;
        z-index: 1;
      }

      .certificate-footer {
        font-size: 2rem;
      }

      .families-cta {
        margin-top: 2rem;
      }

      ::ng-deep .families-cta p-button button {
        transition: all 0.3s ease !important;
      }

      ::ng-deep .families-cta p-button button:hover {
        background: #000000 !important;
        color: #fbbf24 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4) !important;
      }

      @media (max-width: 1024px) {
        .families-section {
          padding: 3rem 0;
        }

        .families-container {
          padding: 0 1.5rem;
        }

        .families-cards {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .families-section {
          padding: 2rem 0;
        }

        .families-container {
          padding: 0 1rem;
        }

        .families-title {
          font-size: 1.75rem;
        }

        .header-text {
          font-size: 1.125rem;
        }

        .family-card-content {
          height: 250px;
        }

        .family-photo {
          min-height: 300px;
        }
      }
    `,
  ],
})
export class AdoptionFamiliesComponent {
  public shareStory(): void {
    // Implementar funcionalidad para compartir historia
    console.log('Compartir historia');
  }
}
