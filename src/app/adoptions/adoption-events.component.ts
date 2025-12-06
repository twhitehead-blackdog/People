import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';

@Component({
  selector: 'pt-adoption-events',
  standalone: true,
  imports: [CommonModule, Button],
  template: `
    <div class="events-section">
      <div class="events-container">
        <div class="events-content">
          <h2 class="events-title">NO HAY EVENTOS PRÓXIMOS</h2>
          <p class="events-message">
            Estate atento a nuestras redes para más información.
          </p>
          <div class="events-image-container">
            <img
              src="assets/dog3.jpg"
              alt="Perro y gato juntos"
              class="events-image"
            />
            <div class="decorative-shapes">
              <div class="shape shape-yellow-1"></div>
              <div class="shape shape-yellow-2"></div>
              <div class="shape shape-blue-1"></div>
            </div>
          </div>
        </div>
        <div class="events-actions">
          <div class="action-buttons">
            <p-button
              label="🤝 FUNDACIONES"
              [style]="{
                background: '#ffffff',
                border: '2px solid #fbbf24',
                color: '#000000',
                fontWeight: 'bold',
                padding: '1rem 2rem',
                width: '100%',
                marginBottom: '1rem'
              }"
              (onClick)="navigateToFoundations()"
            />
            <p-button
              label="❤️ QUIERO AYUDAR"
              [style]="{
                background: '#ffffff',
                border: '2px solid #fbbf24',
                color: '#000000',
                fontWeight: 'bold',
                padding: '1rem 2rem',
                width: '100%'
              }"
              (onClick)="navigateToHelp()"
            />
          </div>
          <div class="foundations-list">
            <div class="foundation-card">
              <h3 class="foundation-name">Milagrinos</h3>
              <p class="foundation-address">
                via suba cota km 7 vereda chorrillos sector 3
              </p>
              <a
                href="https://www.facebook.com/fundacionmilagrinos"
                target="_blank"
                class="foundation-link"
                >https://www.facebook.com/fundacionmilagrinos</a
              >
              <div class="foundation-social">
                <a href="#" class="social-link" aria-label="Facebook">📘</a>
                <a href="#" class="social-link" aria-label="Instagram">📷</a>
              </div>
            </div>
            <div class="foundation-card">
              <h3 class="foundation-name">DogPack</h3>
              <p class="foundation-address">Información de contacto disponible</p>
              <div class="foundation-social">
                <a href="#" class="social-link" aria-label="Facebook">📘</a>
                <a href="#" class="social-link" aria-label="Instagram">📷</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .events-section {
        background: linear-gradient(135deg, #fef3c7 0%, #ffffff 50%, #dbeafe 100%);
        padding: 4rem 2rem;
        max-width: 1400px;
        margin: 0 auto;
        position: relative;
        overflow: hidden;
      }

      .events-section::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -100px;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%);
        border-radius: 50%;
        animation: float 8s ease-in-out infinite;
      }

      .events-section::after {
        content: '';
        position: absolute;
        bottom: -150px;
        left: -150px;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(30, 64, 175, 0.15) 0%, transparent 70%);
        border-radius: 50%;
        animation: float 10s ease-in-out infinite reverse;
      }

      @keyframes float {
        0%, 100% {
          transform: translateY(0) rotate(0deg);
        }
        50% {
          transform: translateY(-30px) rotate(180deg);
        }
      }

      .events-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: start;
      }

      .events-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.5rem;
      }

      .events-title {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #000000 0%, #374151 50%, #000000 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        animation: gradientShift 3s ease infinite;
        text-shadow: 0 4px 20px rgba(30, 64, 175, 0.2);
        position: relative;
      }

      .events-title::after {
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
        0%, 100% {
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

      .events-message {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .events-image-container {
        position: relative;
        width: 100%;
        max-width: 500px;
        height: 400px;
        border-radius: 1rem;
        overflow: hidden;
        border: 3px solid transparent;
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(135deg, #fbbf24, #374151, #fbbf24) border-box;
        box-shadow: 0 10px 40px rgba(251, 191, 36, 0.3),
                    0 0 20px rgba(55, 65, 81, 0.2);
        margin-top: 1rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .events-image-container:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 60px rgba(251, 191, 36, 0.5),
                    0 0 40px rgba(30, 64, 175, 0.3);
      }

      .events-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .events-image-container:hover .events-image {
        transform: scale(1.1);
      }

      .decorative-shapes {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .shape {
        position: absolute;
        border-radius: 50%;
        opacity: 0.8;
      }

      .shape-yellow-1 {
        width: 120px;
        height: 120px;
        background: #fbbf24;
        top: 10%;
        left: 5%;
      }

      .shape-yellow-2 {
        width: 80px;
        height: 80px;
        background: #fbbf24;
        bottom: 15%;
        right: 10%;
      }

      .shape-blue-1 {
        width: 60px;
        height: 60px;
        background: #374151;
        top: 50%;
        right: 5%;
      }

      .events-actions {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .action-buttons {
        display: flex;
        flex-direction: column;
      }

      .foundations-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .foundation-card {
        background: #ffffff;
        border: 2px solid transparent;
        border-radius: 0.75rem;
        padding: 1.5rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .foundation-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #000000, #fbbf24, #000000);
        background-size: 200% 100%;
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }

      .foundation-card:hover {
        border-color: rgba(55, 65, 81, 0.5);
        box-shadow: 0 12px 32px rgba(55, 65, 81, 0.3),
                    0 0 20px rgba(251, 191, 36, 0.2);
        transform: translateY(-4px);
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      }

      .foundation-card:hover::before {
        transform: scaleX(1);
        animation: shimmer 2s infinite;
      }

      .foundation-name {
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #000000 0%, #374151 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 0.75rem 0;
        transition: all 0.3s ease;
      }

      .foundation-card:hover .foundation-name {
        background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .foundation-address {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0 0 0.75rem 0;
        line-height: 1.5;
      }

      .foundation-link {
        display: block;
        font-size: 0.875rem;
        color: #000000;
        text-decoration: none;
        margin-bottom: 0.75rem;
        word-break: break-all;
      }

      .foundation-link:hover {
        text-decoration: underline;
      }

      .foundation-social {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.75rem;
      }

      .social-link {
        font-size: 1.25rem;
        text-decoration: none;
        transition: transform 0.2s;
      }

      .social-link:hover {
        transform: scale(1.2);
      }

      ::ng-deep .events-actions p-button button {
        transition: all 0.3s ease !important;
      }

      ::ng-deep .events-actions p-button button:hover {
        background: #fbbf24 !important;
        color: #000000 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3) !important;
      }

      @media (max-width: 1024px) {
        .events-container {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .events-image-container {
          max-width: 100%;
          height: 350px;
        }
      }

      @media (max-width: 768px) {
        .events-section {
          padding: 2rem 1rem;
        }

        .events-title {
          font-size: 1.5rem;
        }

        .events-image-container {
          height: 300px;
        }

        .foundation-card {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class AdoptionEventsComponent {
  public navigateToFoundations(): void {
    // Implementar navegación a fundaciones
    console.log('Navegar a fundaciones');
  }

  public navigateToHelp(): void {
    // Implementar navegación a ayuda
    console.log('Navegar a ayuda');
  }
}

