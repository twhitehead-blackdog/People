import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';

interface CardEmployee {
  id: string;
  first_name: string;
  middle_name: string;
  father_name: string;
  work_email: string;
  email: string;
  phone_number: string;
  work_phone_number?: string;
  profile_photo_url?: string;
  position?: { name: string };
  company?: { name: string; phone_number: string };
  branch?: { name: string };
}

@Component({
  selector: 'pt-business-card',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="card-wrapper">
        <div class="card-container">
          <div class="loading-pulse">
            <div class="pulse-line w-60"></div>
            <div class="pulse-line w-40"></div>
            <div class="pulse-line w-52"></div>
          </div>
        </div>
      </div>
    } @else if (error()) {
      <div class="card-wrapper">
        <div class="card-container">
          <div class="error-state">
            <i class="pi pi-user-minus error-icon"></i>
            <h2>Tarjeta no disponible</h2>
            <p>No se encontró la información de este colaborador.</p>
          </div>
        </div>
      </div>
    } @else if (employee()) {
      <div class="card-wrapper">
        <div class="card-container">
          <!-- Top accent bar -->
          <div class="accent-bar"></div>

          <!-- Header with logo -->
          <div class="card-header">
            <img src="/images/blackdog.png" alt="Black Dog" class="company-logo" />
          </div>

          <!-- Profile section -->
          <div class="profile-section">
            <h1 class="employee-name">{{ getFullName() }}</h1>

            @if (employee()!.position?.name) {
              <p class="employee-position">{{ employee()!.position!.name }}</p>
            }

            @if (employee()!.company?.name) {
              <p class="employee-company">{{ employee()!.company!.name }}</p>
            }
          </div>

          <!-- Divider -->
          <div class="divider">
            <div class="divider-line"></div>
            <div class="divider-diamond"></div>
            <div class="divider-line"></div>
          </div>

          <!-- Contact info -->
          <div class="contact-section">
            @if (getPhone()) {
              <div class="contact-row">
                <div class="contact-icon">
                  <i class="pi pi-phone"></i>
                </div>
                <span>{{ getPhone() }}</span>
              </div>
            }

            @if (getEmail()) {
              <div class="contact-row">
                <div class="contact-icon">
                  <i class="pi pi-envelope"></i>
                </div>
                <span>{{ getEmail() }}</span>
              </div>
            }

            <div class="contact-row">
              <div class="contact-icon">
                <i class="pi pi-map-marker"></i>
              </div>
              <span>Panamá</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="action-buttons">
            @if (getPhone()) {
              <a [href]="'https://wa.me/' + getWhatsAppNumber()" target="_blank" class="action-btn action-btn--whatsapp">
                <i class="pi pi-whatsapp"></i>
                <span>WhatsApp</span>
              </a>
            }
            @if (getEmail()) {
              <a [href]="'mailto:' + getEmail()" class="action-btn action-btn--email">
                <i class="pi pi-envelope"></i>
                <span>Correo</span>
              </a>
            }
          </div>

          <!-- Save contact button -->
          <div class="action-section">
            <button class="save-contact-btn" (click)="downloadVCard()">
              <i class="pi pi-download"></i>
              Guardar Contacto
            </button>
          </div>

          <!-- Footer -->
          <div class="card-footer">
            <span>blackdogpanama.com</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background: #0a0a0a;
      }

      .card-wrapper {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: radial-gradient(ellipse at 30% 20%, rgba(251, 191, 36, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(251, 191, 36, 0.05) 0%, transparent 50%),
          #0a0a0a;
      }

      .card-container {
        width: 100%;
        max-width: 400px;
        background: linear-gradient(165deg, #1a1a1a 0%, #111111 100%);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5),
          0 0 60px rgba(251, 191, 36, 0.06);
        border: 1px solid rgba(251, 191, 36, 0.12);
        animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes cardIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .accent-bar {
        height: 4px;
        background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
      }

      .card-header {
        display: flex;
        justify-content: center;
        padding: 1.75rem 2rem 0.5rem;
      }

      .company-logo {
        height: 36px;
        width: auto;
        opacity: 0.9;
        filter: brightness(1.1);
      }

      .profile-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem 2rem 1.25rem;
      }

      .profile-photo {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid rgba(251, 191, 36, 0.3);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        margin-bottom: 1rem;
      }

      .employee-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
        margin: 0 0 0.35rem;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .employee-position {
        font-size: 0.95rem;
        color: #fbbf24;
        font-weight: 500;
        margin: 0 0 0.25rem;
        text-align: center;
      }

      .employee-company {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 400;
        margin: 0;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .divider {
        display: flex;
        align-items: center;
        padding: 0 2rem;
        gap: 0.75rem;
      }

      .divider-line {
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.2), transparent);
      }

      .divider-diamond {
        width: 6px;
        height: 6px;
        background: #fbbf24;
        transform: rotate(45deg);
        opacity: 0.6;
      }

      .contact-section {
        padding: 1.25rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .contact-row {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s;
        cursor: default;
      }

      a.contact-row {
        cursor: pointer;
      }

      a.contact-row:hover {
        color: #fbbf24;
      }

      .contact-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(251, 191, 36, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .contact-icon i {
        font-size: 0.9rem;
        color: #fbbf24;
      }

      .action-buttons {
        display: flex;
        gap: 0.75rem;
        padding: 0.25rem 2rem 0.75rem;
      }

      .action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        text-decoration: none;
        transition: transform 0.15s, box-shadow 0.15s;
      }

      .action-btn:hover {
        transform: translateY(-1px);
      }

      .action-btn--whatsapp {
        background: rgba(37, 211, 102, 0.15);
        color: #25d366;
        border: 1px solid rgba(37, 211, 102, 0.25);
      }

      .action-btn--whatsapp:hover {
        background: rgba(37, 211, 102, 0.25);
        box-shadow: 0 4px 16px rgba(37, 211, 102, 0.2);
      }

      .action-btn--email {
        background: rgba(251, 191, 36, 0.1);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.2);
      }

      .action-btn--email:hover {
        background: rgba(251, 191, 36, 0.2);
        box-shadow: 0 4px 16px rgba(251, 191, 36, 0.15);
      }

      .action-section {
        padding: 0.5rem 2rem 1.25rem;
      }

      .save-contact-btn {
        width: 100%;
        padding: 0.875rem;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #0a0a0a;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 2px 12px rgba(245, 158, 11, 0.25);
      }

      .save-contact-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);
      }

      .save-contact-btn:active {
        transform: translateY(0);
      }

      .card-footer {
        text-align: center;
        padding: 0.75rem 2rem 1.25rem;
        color: rgba(255, 255, 255, 0.25);
        font-size: 0.75rem;
        letter-spacing: 0.05em;
      }

      /* Loading state */
      .loading-pulse {
        padding: 3rem 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .pulse-avatar {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .pulse-line {
        height: 14px;
        border-radius: 7px;
        background: rgba(255, 255, 255, 0.06);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .w-60 { width: 240px; }
      .w-52 { width: 208px; }
      .w-40 { width: 160px; }

      @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }

      /* Error state */
      .error-state {
        padding: 3rem 2rem;
        text-align: center;
      }

      .error-icon {
        font-size: 3rem;
        color: rgba(255, 255, 255, 0.15);
        margin-bottom: 1rem;
      }

      .error-state h2 {
        color: rgba(255, 255, 255, 0.7);
        font-size: 1.25rem;
        margin: 0 0 0.5rem;
      }

      .error-state p {
        color: rgba(255, 255, 255, 0.35);
        font-size: 0.9rem;
        margin: 0;
      }
    `,
  ],
})
export class BusinessCardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  public employee = signal<CardEmployee | null>(null);
  public loading = signal(true);
  public error = signal(false);

  async ngOnInit(): Promise<void> {
    const employeeId = this.route.snapshot.paramMap.get('employee_id');
    if (!employeeId) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }

    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        id: `eq.${employeeId}`,
        is_active: 'eq.true',
        select:
          'id,first_name,middle_name,father_name,work_email,email,phone_number,work_phone_number,profile_photo_url,position:positions(name),company:companies(name,phone_number),branch:branches(name)',
      });

      const employees = await firstValueFrom(
        this.http.get<CardEmployee[]>(url)
      );

      if (employees && employees.length > 0) {
        this.employee.set(employees[0]);
      } else {
        this.error.set(true);
      }
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  getFullName(): string {
    const e = this.employee()!;
    const parts = [e.first_name, e.middle_name, e.father_name].filter(Boolean);
    return parts.join(' ');
  }

  getInitials(): string {
    const e = this.employee()!;
    const first = e.first_name?.[0] || '';
    const last = e.father_name?.[0] || '';
    return (first + last).toUpperCase();
  }

  getEmail(): string {
    const e = this.employee()!;
    return e.work_email || e.email || '';
  }

  getPhone(): string {
    const e = this.employee()!;
    return e.work_phone_number || e.phone_number || '';
  }

  getWhatsAppNumber(): string {
    const phone = this.getPhone();
    // Strip non-digits, ensure country code
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('507')) return digits;
    if (digits.length === 8) return '507' + digits; // Panama
    return digits;
  }

  downloadVCard(): void {
    const e = this.employee()!;
    const fullName = this.getFullName();
    const email = this.getEmail();
    const phone = this.getPhone();
    const company = e.company?.name || '';
    const position = e.position?.name || '';

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fullName}`,
      `N:${e.father_name || ''};${e.first_name || ''};${e.middle_name || ''};;`,
      company ? `ORG:${company}` : '',
      position ? `TITLE:${position}` : '',
      email ? `EMAIL;TYPE=WORK:${email}` : '',
      phone ? `TEL;TYPE=CELL:${phone}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
