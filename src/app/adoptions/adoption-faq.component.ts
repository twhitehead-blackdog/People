import { , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FAQStore } from '../stores/faq.store';
import { FAQItem as FAQItemModel } from '../models';

@Component({
  selector: 'pt-adoption-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="faq-section">
      <div class="faq-container">
        <div class="faq-image-container">
          <div class="faq-image-wrapper">
            <img
              src="assets/dog2.jpg"
              alt="Perro adoptado"
              class="faq-image"
            />
            <div class="decorative-shapes">
              <div class="shape shape-yellow-1"></div>
              <div class="shape shape-yellow-2"></div>
              <div class="shape shape-blue-1"></div>
            </div>
          </div>
        </div>
        <div class="faq-content">
          <h2 class="faq-title">
            PREGUNTAS FRECUENTES SOBRE ADOPCIÃ“N DE MASCOTAS
          </h2>
          <div class="faq-intro">
            <p>
              En Black Dog conectamos humanos con su mascota. Sabemos la importancia
              de que no haya ningÃºn animal sin familia y por eso apoyamos y
              ayudamos a rescatistas y fundaciones todos los dÃ­as para lograrlo.
            </p>
            <p>
              Si estÃ¡s pensando sumar un amigo peludo tenÃ©s que saber el
              compromiso que esto implica. No sÃ³lo serÃ¡ tu compaÃ±Ã­a sino un
              integrante mÃ¡s de la familia. Por lo que te recomendamos planifiques
              bien su llegada, asegÃºrate que todos estÃ©n de acuerdo y que en tu
              edificio o casa se permitan mascotas. TenÃ© en cuenta los gastos
              mensuales relacionados, cuidados generales que necesitarÃ¡ para que se
              encuentre saludable y cÃ³modo y con quiÃ©n dejarlo en caso de salir de
              vacaciones.
            </p>
            <p class="faq-cta">
              <strong
                >Te dejamos acÃ¡ un resumen de las preguntas que recibimos siempre
                asÃ­ te ayudamos a prepararte en lo que se viene</strong
              >
            </p>
          </div>
          @if (faqStore.isLoading()) {
            <div class="loading-state">
              <p>Cargando preguntas frecuentes...</p>
            </div>
          } @else if (activeFAQItems().length === 0) {
            <div class="empty-state">
              <p>No hay preguntas frecuentes disponibles en este momento.</p>
            </div>
          } @else {
            <div class="faq-items">
              @for (item of activeFAQItems(); track item.id; let i = $index) {
              <div class="faq-item" [class.expanded]="expandedIndex() === i">
                <button
                  class="faq-question"
                  (click)="toggleFAQ(i)"
                  [attr.aria-expanded]="expandedIndex() === i"
                >
                  <span>{{ item.question }}</span>
                  <span class="faq-icon">{{
                    expandedIndex() === i ? 'â–¼' : 'â–¶'
                  }}</span>
                </button>
                @if (expandedIndex() === i) {
                <div class="faq-answer">
                  <p>{{ item.answer }}</p>
                </div>
                }
              </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .faq-section {
        background: linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%);
        width: 100%;
        padding: 4rem 0;
        position: relative;
        overflow: hidden;
      }

      .faq-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: -50%;
        width: 200%;
        height: 100%;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 50px,
          rgba(55, 65, 81, 0.02) 50px,
          rgba(55, 65, 81, 0.02) 100px
        );
        animation: slide 20s linear infinite;
      }

      @keyframes slide {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(50px);
        }
      }

      .faq-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: start;
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .faq-image-container {
        position: relative;
      }

      .faq-image-wrapper {
        position: relative;
        width: 100%;
        height: 600px;
        border-radius: 1rem;
        overflow: hidden;
        border: 3px solid transparent;
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(135deg, #000000, #374151, #6b7280) border-box;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .faq-image-wrapper:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .faq-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .faq-image-wrapper:hover .faq-image {
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
      }

      .shape-yellow-1 {
        width: 150px;
        height: 150px;
        background: #6b7280;
        top: 10%;
        left: 5%;
      }

      .shape-yellow-2 {
        width: 100px;
        height: 100px;
        background: #9ca3af;
        bottom: 20%;
        right: 10%;
      }

      .shape-blue-1 {
        width: 80px;
        height: 80px;
        background: #374151;
        top: 50%;
        right: 5%;
      }

      .faq-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .faq-title {
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

      .faq-title::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        width: 150px;
        height: 4px;
        background: linear-gradient(90deg, #1e40af, #374151, #1e40af);
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

      .faq-intro {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .faq-intro p {
        font-size: 0.95rem;
        color: #6b7280;
        line-height: 1.7;
        margin: 0;
      }

      .faq-cta {
        margin-top: 0.5rem;
      }

      .faq-cta strong {
        color: #374151;
        font-weight: 600;
      }

      .faq-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
      }

      .faq-item {
        border: 2px solid transparent;
        border-radius: 0.75rem;
        overflow: hidden;
        background: #ffffff;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .faq-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #1e40af, #374151, #1e40af);
        background-size: 200% 100%;
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }

      .faq-item:hover {
        border-color: rgba(30, 64, 175, 0.5);
        box-shadow: 0 8px 24px rgba(30, 64, 175, 0.2);
        transform: translateY(-2px);
      }

      .faq-item:hover::before {
        transform: scaleX(1);
        animation: shimmer 2s infinite;
      }

      .faq-item.expanded {
        border-color: #374151;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
      }

      .faq-item.expanded::before {
        transform: scaleX(1);
        animation: shimmer 2s infinite;
      }

      .faq-question {
        width: 100%;
        padding: 1.5rem 1.75rem;
        background: transparent;
        border: none;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        transition: all 0.3s ease;
        position: relative;
      }

      .faq-question::after {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, #1e40af, #374151);
        transform: scaleY(0);
        transition: transform 0.3s ease;
      }

      .faq-question:hover {
        background: rgba(30, 64, 175, 0.05);
        color: #374151;
        padding-left: 2rem;
      }

      .faq-question:hover::after {
        transform: scaleY(1);
      }

      .faq-item.expanded .faq-question {
        background: rgba(30, 64, 175, 0.1);
      }

      .faq-item.expanded .faq-question::after {
        transform: scaleY(1);
      }

      .faq-question span:first-child {
        flex: 1;
      }

      .faq-icon {
        font-size: 1rem;
        color: #000000;
        transition: all 0.3s ease;
        background: rgba(30, 64, 175, 0.1);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .faq-question:hover .faq-icon {
        background: rgba(30, 64, 175, 0.2);
        color: #1e40af;
        transform: scale(1.1);
      }

      .faq-item.expanded .faq-icon {
        transform: rotate(90deg) scale(1.1);
        background: rgba(30, 64, 175, 0.3);
        color: #1e40af;
      }

      .faq-answer {
        padding: 0 1.5rem 1.5rem 1.5rem;
        background: #ffffff;
        animation: slideDown 0.3s ease;
      }

      .faq-answer p {
        font-size: 0.95rem;
        color: #6b7280;
        line-height: 1.7;
        margin: 0;
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

      @media (max-width: 1024px) {
        .faq-section {
          padding: 3rem 0;
        }

        .faq-container {
          grid-template-columns: 1fr;
          gap: 2rem;
          padding: 0 1.5rem;
        }

        .faq-image-wrapper {
          height: 400px;
        }

        .faq-title {
          font-size: 2rem;
        }

        .faq-intro p {
          font-size: 0.9rem;
        }
      }

      @media (max-width: 768px) {
        .faq-section {
          padding: 2rem 0;
        }

        .faq-container {
          padding: 0 1rem;
        }

        .faq-container {
          gap: 1.5rem;
        }

        .faq-title {
          font-size: 1.5rem;
          line-height: 1.3;
        }

        .faq-title::after {
          width: 100px;
        }

        .faq-image-wrapper {
          height: 300px;
        }

        .faq-content {
          gap: 1.5rem;
        }

        .faq-intro {
          gap: 0.75rem;
        }

        .faq-intro p {
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .faq-items {
          gap: 0.75rem;
        }

        .faq-question {
          padding: 1rem 1.25rem;
          font-size: 0.875rem;
        }

        .faq-question:hover {
          padding-left: 1.5rem;
        }

        .faq-answer {
          padding: 0 1.25rem 1rem 1.25rem;
        }

        .faq-answer p {
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .faq-icon {
          width: 28px;
          height: 28px;
          font-size: 0.875rem;
        }

        .shape-yellow-1 {
          width: 100px;
          height: 100px;
        }

        .shape-yellow-2 {
          width: 70px;
          height: 70px;
        }

        .shape-blue-1 {
          width: 60px;
          height: 60px;
        }
      }

      @media (max-width: 480px) {
        .faq-section {
          padding: 1.5rem 0;
        }

        .faq-container {
          padding: 0 0.75rem;
        }

        .faq-title {
          font-size: 1.25rem;
        }

        .faq-image-wrapper {
          height: 250px;
        }

        .faq-question {
          padding: 0.875rem 1rem;
          font-size: 0.8125rem;
        }

        .faq-answer {
          padding: 0 1rem 1rem 1rem;
        }
      }
    `,
  ],
})
export class AdoptionFAQComponent {
  public faqStore = inject(FAQStore);
  public expandedIndex = signal<number | null>(0);

  // Obtener solo las preguntas activas, ordenadas por el campo 'order'
  public activeFAQItems = computed(() => {
    return this.faqStore
      .entities()
      .filter((faq) => faq.is_active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  public toggleFAQ(index: number): void {
    if (this.expandedIndex() === index) {
      this.expandedIndex.set(null);
    } else {
      this.expandedIndex.set(index);
    }
  }
}




