import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AdoptionRequirementsStore } from '../stores/adoption-requirements.store';

@Component({
  selector: 'pt-adoption-requirements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="requirements-section">
      <div class="requirements-container">
        <div class="requirements-image-container">
          <div class="requirements-image-wrapper">
            <img
              src="assets/dog1.jpg"
              alt="Perro feliz"
              class="requirements-image"
            />
            <div class="decorative-shapes">
              <div class="shape shape-yellow-1"></div>
              <div class="shape shape-yellow-2"></div>
              <div class="shape shape-blue-1"></div>
              <div class="shape shape-blue-2"></div>
            </div>
          </div>
        </div>
        <div class="requirements-content">
          <h2 class="requirements-title">REQUISITOS PARA ADOPTAR</h2>
          @if (requirementsStore.isLoading()) {
            <div class="loading-state">
              <p>Cargando requisitos...</p>
            </div>
          } @else if (activeRequirements().length === 0) {
            <div class="empty-state">
              <p>No hay requisitos disponibles en este momento.</p>
            </div>
          } @else {
            <ol class="requirements-list">
              @for (requirement of activeRequirements(); track requirement.id) {
                <li class="requirement-item">
                  <span class="requirement-number">{{ requirement.order }}</span>
                  <span class="requirement-text">{{ requirement.description }}</span>
                </li>
              }
            </ol>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .requirements-section {
        background: linear-gradient(
          135deg,
          #f9fafb 0%,
          #ffffff 50%,
          #f0f9ff 100%
        );
        width: 100%;
        padding: 4rem 0;
        position: relative;
        overflow: hidden;
      }

      .requirements-section::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 500px;
        height: 500px;
        background: radial-gradient(
          circle,
          rgba(251, 191, 36, 0.1) 0%,
          transparent 70%
        );
        border-radius: 50%;
        animation: float 6s ease-in-out infinite;
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0) rotate(0deg);
        }
        50% {
          transform: translateY(-20px) rotate(180deg);
        }
      }

      .requirements-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: center;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .requirements-image-container {
        position: relative;
      }

      .requirements-image-wrapper {
        position: relative;
        width: 100%;
        height: 500px;
        border-radius: 1rem;
        overflow: hidden;
        border: 3px solid transparent;
        background: linear-gradient(white, white) padding-box,
          linear-gradient(135deg, #fbbf24, #374151, #fbbf24) border-box;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .requirements-image-wrapper:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .requirements-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .requirements-image-wrapper:hover .requirements-image {
        transform: scale(1.05);
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
        animation: pulse 3s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.6;
        }
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
        width: 100px;
        height: 100px;
        background: #374151;
        top: 50%;
        right: 5%;
      }

      .shape-blue-2 {
        width: 60px;
        height: 60px;
        background: #374151;
        bottom: 10%;
        left: 15%;
      }

      .requirements-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .requirements-title {
        font-size: 2.5rem;
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
        text-shadow: 0 4px 20px rgba(30, 64, 175, 0.2);
        position: relative;
      }

      .requirements-title::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 100px;
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

      .requirements-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .requirement-item {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
        border-radius: 0.75rem;
        background: #ffffff;
        border: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .requirement-item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 4px;
        background: linear-gradient(180deg, #fbbf24, #374151);
        transform: scaleY(0);
        transition: transform 0.3s ease;
      }

      .requirement-item:hover {
        border-color: rgba(251, 191, 36, 0.5);
        background: linear-gradient(135deg, #fffbeb 0%, #eff6ff 100%);
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .requirement-item:hover::before {
        transform: scaleY(1);
      }

      .requirement-number {
        flex-shrink: 0;
        width: 45px;
        height: 45px;
        background: linear-gradient(135deg, #000000 0%, #374151 100%);
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.125rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        position: relative;
      }

      .requirement-item:hover .requirement-number {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
        color: #000000;
      }

      .requirement-text {
        flex: 1;
        font-size: 1rem;
        color: #374151;
        line-height: 1.6;
        padding-top: 0.5rem;
      }

      .loading-state,
      .empty-state {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
      }

      .loading-state p,
      .empty-state p {
        margin: 0;
        font-size: 1rem;
      }

      @media (max-width: 1024px) {
        .requirements-section {
          padding: 3rem 0;
        }

        .requirements-container {
          grid-template-columns: 1fr;
          gap: 2rem;
          padding: 0 1.5rem;
        }

        .requirements-image-wrapper {
          height: 400px;
        }
      }

      @media (max-width: 768px) {
        .requirements-section {
          padding: 2rem 0;
        }

        .requirements-container {
          padding: 0 1rem;
        }

        .requirements-title {
          font-size: 1.5rem;
        }

        .requirements-image-wrapper {
          height: 300px;
        }

        .requirement-text {
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class AdoptionRequirementsComponent {
  public requirementsStore = inject(AdoptionRequirementsStore);

  // Obtener solo los requisitos activos, ordenados por el campo 'order'
  public activeRequirements = computed(() => {
    return this.requirementsStore
      .entities()
      .filter((req) => req.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });
}
