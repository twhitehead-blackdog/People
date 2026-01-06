import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'pt-adoptions-footer',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, InputTextModule, Button],
  template: `
    <footer class="adoptions-footer">
      <div class="footer-content">
        <div class="footer-column">
          <h3 class="footer-title">Â¿NECESITAS AYUDA?</h3>
          <div class="logo-container">
            <img
              src="images/blackdog.png"
              alt="Black Dog Logo"
              class="footer-logo"
            />
          </div>
          <div class="contact-details">
            <p class="address">
              Calle 50, San Francisco, Ciudad de PanamÃ¡<br />
              (A un lado del KFC, antiguo local de Pizza Hut)
            </p>
            <p class="phone">
              <span style="color: #ec4899;">ðŸ“ž</span>
              <a href="tel:+50764745436">TEL: +507 6474-5436</a>
            </p>
            <div class="hours">
              <p>Nuestro horario de atenciÃ³n es:</p>
              <p>Lun - SÃ¡b: 7:00 a.m. â€“ 8:00 p.m.</p>
              <p>Dom: 8:00 a.m. â€“ 6:00 p.m.</p>
            </div>
          </div>
        </div>

        <div class="footer-column">
          <h3 class="footer-title">CATEGORIAS</h3>
          <nav class="footer-nav">
            <a href="#" class="footer-link">Inicio</a>
            <a href="#" class="footer-link">Perros</a>
            <a href="#" class="footer-link">Gatos</a>
            <a href="#" class="footer-link">Farmacia</a>
            <a href="#" class="footer-link">Compra por marcas</a>
            <a href="#" class="footer-link">Servicios</a>
            <a href="#" class="footer-link">Sucursales</a>
            <a href="#" class="footer-link">PolÃ­ticas</a>
          </nav>
        </div>

        <div class="footer-column">
          <h3 class="footer-title">RECIBE NOVEDADES</h3>
          <div class="newsletter">
            <p class="newsletter-text">
              Â¡SuscrÃ­bete a nuestro correo y sÃ© el primero en enterarte de
              nuestras ofertas especiales!
            </p>
            <div class="newsletter-input-container">
              <span class="newsletter-icon">âœ‰ï¸</span>
              <input
                type="email"
                pInputText
                placeholder="Correo electrÃ³nico"
                [(ngModel)]="email"
                class="newsletter-input"
              />
              <p-button
                label="Suscribirse"
                [style]="{
                  background: 'linear-gradient(to right, #FDB022, #fcd34d)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(253, 176, 34, 0.3)'
                }"
                (onClick)="subscribe()"
              />
            </div>
            <p class="privacy-text">
              Al hacer clic en el botÃ³n, aceptas la PolÃ­tica de Privacidad y los
              TÃ©rminos y Condiciones.
            </p>
          </div>

          <div class="social-media">
            <h4 class="social-title">SÃGUENOS:</h4>
            <div class="social-icons">
              <a href="#" class="social-icon" aria-label="Facebook">
                <span>ðŸ“˜</span>
              </a>
              <a href="#" class="social-icon" aria-label="Instagram">
                <span>ðŸ“·</span>
              </a>
              <a href="#" class="social-icon" aria-label="TikTok">
                <span>ðŸŽµ</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-content">
          <p class="copyright">
            Â© 2025, Black Dog PanamÃ¡ ðŸ• Hecho con ðŸ’ para las mascotas
          </p>
          <div class="payment-methods">
            <span class="payment-label">MÃ©todos de pago:</span>
            <div class="payment-icons">
              <span class="payment-icon visa">VISA</span>
              <span class="payment-icon mastercard">MC</span>
              <span class="payment-icon amex">AM EX</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .adoptions-footer {
        background: linear-gradient(
          135deg,
          #1f2937 0%,
          #000000 50%,
          #1f2937 100%
        );
        position: relative;
        overflow: hidden;
        border-top: 4px solid #fdb022;
        padding: 4rem 2rem 1.5rem;
        margin-top: 4rem;
      }

      .adoptions-footer::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(253, 176, 34, 0.5),
          transparent
        );
        animation: shimmer 3s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%,
        100% {
          opacity: 0.3;
        }
        50% {
          opacity: 1;
        }
      }

      .adoptions-footer::after {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 500px;
        height: 500px;
        background: radial-gradient(
          circle,
          rgba(253, 176, 34, 0.1) 0%,
          transparent 70%
        );
        border-radius: 50%;
        animation: float 6s ease-in-out infinite;
      }

      @keyframes float {
        0%,
        100% {
          transform: translate(0, 0) scale(1);
        }
        50% {
          transform: translate(-20px, -20px) scale(1.1);
        }
      }

      .footer-content {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3rem;
        max-width: 1400px;
        margin: 0 auto;
        padding-bottom: 2.5rem;
        border-bottom: 1px solid rgba(253, 176, 34, 0.2);
        position: relative;
        z-index: 1;
      }

      .footer-content::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(253, 176, 34, 0.6),
          transparent
        );
      }

      .footer-column {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        position: relative;
      }

      .footer-column::before {
        content: '';
        position: absolute;
        left: -1rem;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(
          180deg,
          transparent,
          rgba(253, 176, 34, 0.3),
          transparent
        );
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .footer-column:first-child::before {
        display: none;
      }

      .footer-column:hover::before {
        opacity: 1;
      }

      .footer-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #fdb022;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        position: relative;
        display: inline-block;
        padding-bottom: 0.5rem;
      }

      .footer-title::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 40px;
        height: 2px;
        background: linear-gradient(90deg, #fdb022, #fcd34d);
        border-radius: 2px;
        animation: expand 2s ease-in-out infinite;
      }

      @keyframes expand {
        0%,
        100% {
          width: 40px;
        }
        50% {
          width: 60px;
        }
      }

      .logo-container {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        width: fit-content;
        max-width: 100%;
        position: relative;
        padding: 1rem;
        border-radius: 0.75rem;
        background: rgba(253, 176, 34, 0.05);
        border: 1px solid rgba(253, 176, 34, 0.1);
        transition: all 0.3s ease;
      }

      .logo-container:hover {
        background: rgba(253, 176, 34, 0.1);
        border-color: rgba(253, 176, 34, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(253, 176, 34, 0.2);
      }

      .footer-logo {
        width: 280px;
        height: 60px;
        object-fit: contain;
        flex-shrink: 0;
        filter: drop-shadow(0 2px 8px rgba(253, 176, 34, 0.3));
        transition: filter 0.3s ease;
      }

      .logo-container:hover .footer-logo {
        filter: drop-shadow(0 4px 12px rgba(253, 176, 34, 0.5));
      }

      .contact-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .address,
      .phone,
      .hours p {
        font-size: 0.875rem;
        color: #d1d5db;
        line-height: 1.6;
        margin: 0;
        transition: color 0.3s ease;
      }

      .address:hover,
      .hours p:hover {
        color: #fcd34d;
      }

      .phone {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #fdb022;
        padding: 0.5rem;
        border-radius: 0.5rem;
        transition: all 0.3s ease;
      }

      .phone:hover {
        background: rgba(253, 176, 34, 0.1);
        transform: translateX(5px);
      }

      .phone a {
        color: #fdb022;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s ease;
        position: relative;
      }

      .phone a::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #fdb022, #fcd34d);
        transition: width 0.3s ease;
      }

      .phone a:hover {
        color: #fcd34d;
      }

      .phone a:hover::after {
        width: 100%;
      }

      .footer-nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .footer-link {
        color: #d1d5db;
        text-decoration: none;
        font-size: 0.875rem;
        transition: all 0.3s ease;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        position: relative;
        display: inline-block;
        width: fit-content;
      }

      .footer-link::before {
        content: 'â†’';
        position: absolute;
        left: -1rem;
        opacity: 0;
        transition: all 0.3s ease;
        color: #fdb022;
      }

      .footer-link:hover {
        color: #fdb022;
        background: rgba(253, 176, 34, 0.1);
        transform: translateX(10px);
        padding-left: 1.5rem;
      }

      .footer-link:hover::before {
        opacity: 1;
        left: 0.5rem;
      }

      .newsletter {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .newsletter-text {
        font-size: 0.875rem;
        color: #d1d5db;
        line-height: 1.6;
        margin: 0;
      }

      .newsletter-input-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        position: relative;
        background: rgba(31, 41, 55, 0.5);
        border-radius: 0.75rem;
        padding: 0.25rem;
        border: 2px solid rgba(253, 176, 34, 0.2);
        transition: all 0.3s ease;
      }

      .newsletter-input-container:focus-within {
        border-color: rgba(253, 176, 34, 0.5);
        box-shadow: 0 0 0 4px rgba(253, 176, 34, 0.1),
          0 4px 12px rgba(253, 176, 34, 0.2);
      }

      .newsletter-icon {
        position: absolute;
        left: 1rem;
        z-index: 1;
        font-size: 1rem;
        display: flex;
        align-items: center;
        height: 100%;
        filter: drop-shadow(0 0 4px rgba(253, 176, 34, 0.5));
      }

      .newsletter-input {
        flex: 1;
        padding-left: 3rem;
        padding-right: 1rem;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
        border: none;
        border-radius: 0.5rem;
        background: transparent;
        color: #ffffff;
        transition: all 0.3s ease;
      }

      .newsletter-input:focus {
        outline: none;
      }

      .newsletter-input::placeholder {
        color: #9ca3af;
      }

      .privacy-text {
        font-size: 0.75rem;
        color: #6b7280;
        line-height: 1.5;
        margin: 0;
      }

      ::ng-deep .newsletter-input-container p-button button {
        background: linear-gradient(to right, #fdb022, #fcd34d) !important;
        border: none !important;
        color: #000000 !important;
        font-weight: bold !important;
        box-shadow: 0 2px 8px rgba(253, 176, 34, 0.3) !important;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
      }

      ::ng-deep .newsletter-input-container p-button button::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        ) !important;
        transition: left 0.5s ease !important;
      }

      ::ng-deep
        .newsletter-input-container
        p-button
        button:hover:not(:disabled) {
        background: linear-gradient(to right, #fcd34d, #fdb022) !important;
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(253, 176, 34, 0.5),
          0 0 30px rgba(253, 176, 34, 0.3) !important;
      }

      ::ng-deep
        .newsletter-input-container
        p-button
        button:hover:not(:disabled)::before {
        left: 100% !important;
      }

      ::ng-deep
        .newsletter-input-container
        p-button
        button:active:not(:disabled) {
        transform: translateY(0) scale(1.02) !important;
      }

      .social-media {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(253, 176, 34, 0.1);
      }

      .social-title {
        font-size: 0.875rem;
        font-weight: 700;
        color: #fdb022;
        margin: 0 0 1rem 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .social-icons {
        display: flex;
        gap: 1rem;
      }

      .social-icon {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background: rgba(31, 41, 55, 1);
        border: 2px solid rgba(253, 176, 34, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fdb022;
        text-decoration: none;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1.25rem;
        position: relative;
        overflow: hidden;
      }

      .social-icon::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(253, 176, 34, 0.2);
        transform: translate(-50%, -50%);
        transition: width 0.4s ease, height 0.4s ease;
      }

      .social-icon span {
        font-size: 1.25rem;
        position: relative;
        z-index: 1;
        transition: transform 0.3s ease;
      }

      .social-icon:hover {
        background: #fdb022;
        border-color: #fdb022;
        color: #000000;
        transform: translateY(-4px) scale(1.1);
        box-shadow: 0 6px 20px rgba(253, 176, 34, 0.6),
          0 0 30px rgba(253, 176, 34, 0.4);
      }

      .social-icon:hover::before {
        width: 100px;
        height: 100px;
      }

      .social-icon:hover span {
        transform: scale(1.2) rotate(5deg);
      }

      .footer-bottom {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid rgba(253, 176, 34, 0.2);
        position: relative;
        z-index: 1;
      }

      .footer-bottom::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 100px;
        height: 1px;
        background: linear-gradient(90deg, transparent, #fdb022, transparent);
      }

      .footer-bottom-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1400px;
        margin: 0 auto;
        gap: 2rem;
      }

      .copyright {
        font-size: 0.875rem;
        color: #9ca3af;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .copyright :global(span) {
        color: #fbbf24;
        animation: pulse-heart 2s ease-in-out infinite;
      }

      @keyframes pulse-heart {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.2);
        }
      }

      .payment-methods {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .payment-label {
        font-size: 0.875rem;
        color: #9ca3af;
        font-weight: 500;
      }

      .payment-icons {
        display: flex;
        gap: 0.5rem;
      }

      .payment-icon {
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #000000;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .payment-icon::before {
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
        transition: left 0.5s ease;
      }

      .payment-icon:hover::before {
        left: 100%;
      }

      .payment-icon:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .payment-icon.visa {
        background: #1a1f71;
        color: #ffffff;
        border-color: #1a1f71;
      }

      .payment-icon.mastercard {
        background: #eb001b;
        color: #ffffff;
        border-color: #eb001b;
      }

      .payment-icon.amex {
        background: #006fcf;
        color: #ffffff;
        border-color: #006fcf;
      }

      @media (max-width: 1024px) {
        .footer-content {
          grid-template-columns: repeat(2, 1fr);
        }

        .footer-column:last-child {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 768px) {
        .adoptions-footer {
          padding: 3rem 1.5rem 1rem;
        }

        .footer-content {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .footer-bottom-content {
          flex-direction: column;
          gap: 1rem;
          text-align: center;
        }

        .payment-methods {
          justify-content: center;
        }
      }
    `,
  ],
})
export class AdoptionsFooterComponent {
  public email = signal('');

  public subscribe(): void {
    if (this.email()) {
      console.log('Subscribe:', this.email());
      // Implementar suscripciÃ³n
      this.email.set('');
    }
  }
}

