import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Button } from 'primeng/button';

@Component({
  selector: 'pt-adoptions-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, Button],
  template: `
    <footer class="adoptions-footer">
      <div class="footer-content">
        <div class="footer-column">
          <h3 class="footer-title">¿NECESITAS AYUDA?</h3>
          <div class="logo-container">
            <img
              src="images/blackdog.png"
              alt="Black Dog Logo"
              class="footer-logo"
            />
            <span class="logo-text">BLACK DOG</span>
          </div>
          <div class="contact-details">
            <p class="address">
              Calle 50, San Francisco, Ciudad de Panamá<br />
              (A un lado del KFC, antiguo local de Pizza Hut)
            </p>
            <p class="phone">
              <span style="color: #ec4899;">📞</span>
              <a href="tel:+50764745436">TEL: +507 6474-5436</a>
            </p>
            <div class="hours">
              <p>Nuestro horario de atención es:</p>
              <p>Lun - Sáb: 7:00 a.m. – 8:00 p.m.</p>
              <p>Dom: 8:00 a.m. – 6:00 p.m.</p>
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
            <a href="#" class="footer-link">Políticas</a>
          </nav>
        </div>

        <div class="footer-column">
          <h3 class="footer-title">RECIBE NOVEDADES</h3>
          <div class="newsletter">
            <p class="newsletter-text">
              ¡Suscríbete a nuestro correo y sé el primero en enterarte de
              nuestras ofertas especiales!
            </p>
            <div class="newsletter-input-container">
              <span class="newsletter-icon">✉️</span>
              <input
                type="email"
                pInputText
                placeholder="Correo electrónico"
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
              Al hacer clic en el botón, aceptas la Política de Privacidad y
              los Términos y Condiciones.
            </p>
          </div>

          <div class="social-media">
            <h4 class="social-title">SÍGUENOS:</h4>
            <div class="social-icons">
              <a href="#" class="social-icon" aria-label="Facebook">
                <span>📘</span>
              </a>
              <a href="#" class="social-icon" aria-label="Instagram">
                <span>📷</span>
              </a>
              <a href="#" class="social-icon" aria-label="TikTok">
                <span>🎵</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-content">
            <p class="copyright">
            © 2025, Black Dog Panamá 🐕 Hecho con 💝 para las mascotas
          </p>
          <div class="payment-methods">
            <span class="payment-label">Métodos de pago:</span>
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
        background: linear-gradient(135deg, #1f2937 0%, #000000 50%, #1f2937 100%);
        border-top: 4px solid #FDB022;
        padding: 3rem 2rem 1rem;
        margin-top: 4rem;
      }

      .footer-content {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3rem;
        max-width: 1400px;
        margin: 0 auto;
        padding-bottom: 2rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .footer-column {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .footer-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #FDB022;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .logo-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .footer-logo {
        width: 40px;
        height: 40px;
        object-fit: contain;
      }

      .logo-text {
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.05em;
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
      }

      .phone {
        color: #FDB022;
      }

      .phone {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .phone a {
        color: #FDB022;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.3s ease;
      }

      .phone a:hover {
        color: #fcd34d;
        text-decoration: underline;
      }

      .footer-nav {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .footer-link {
        color: #d1d5db;
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.3s ease;
      }

      .footer-link:hover {
        color: #FDB022;
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
      }

      .newsletter-icon {
        position: absolute;
        left: 1rem;
        z-index: 1;
        font-size: 1rem;
        display: flex;
        align-items: center;
        height: 100%;
      }

      .newsletter-input {
        flex: 1;
        padding-left: 3rem;
        padding-right: 1rem;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
        border: 2px solid rgba(253, 176, 34, 0.3);
        border-radius: 0.75rem;
        background: #1f2937;
        color: #ffffff;
        transition: all 0.3s ease;
      }

      .newsletter-input:focus {
        border-color: #FDB022;
        box-shadow: 0 0 0 3px rgba(253, 176, 34, 0.2);
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

      .social-media {
        margin-top: 1rem;
      }

      .social-title {
        font-size: 0.875rem;
        font-weight: 700;
        color: #FDB022;
        margin: 0 0 0.75rem 0;
        text-transform: uppercase;
      }

      .social-icons {
        display: flex;
        gap: 1rem;
      }

      .social-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(31, 41, 55, 1);
        border: 2px solid rgba(253, 176, 34, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FDB022;
        text-decoration: none;
        transition: all 0.3s ease;
        font-size: 1.25rem;
      }

      .social-icon span {
        font-size: 1.25rem;
      }

      .social-icon:hover {
        background: #FDB022;
        border-color: #FDB022;
        color: #000000;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(253, 176, 34, 0.5);
      }

      .footer-bottom {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid rgba(107, 114, 128, 0.3);
      }

      .footer-bottom-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1400px;
        margin: 0 auto;
      }

      .copyright {
        font-size: 0.875rem;
        color: #9ca3af;
        margin: 0;
      }

      .copyright :global(span) {
        color: #fbbf24;
      }

      .payment-methods {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .payment-label {
        font-size: 0.875rem;
        color: #9ca3af;
      }

      .payment-icons {
        display: flex;
        gap: 0.5rem;
      }

      .payment-icon {
        padding: 0.5rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #000000;
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
        .footer-content {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .footer-bottom-content {
          flex-direction: column;
          gap: 1rem;
          text-align: center;
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
      // Implementar suscripción
      this.email.set('');
    }
  }
}

