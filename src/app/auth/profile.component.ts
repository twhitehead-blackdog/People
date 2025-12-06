import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Card } from 'primeng/card';
import { Avatar } from 'primeng/avatar';
import { AuthService } from './auth.service';
import { User } from '../models';

@Component({
  selector: 'pt-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    InputText,
    InputTextarea,
    ToastModule,
    Card,
    Avatar,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="profile-container">
      <div class="profile-header">
        <h1 class="profile-title">Mi Perfil</h1>
        <p-button
          label="Cerrar Sesión"
          icon="pi pi-sign-out"
          severity="secondary"
          (onClick)="logout()"
          [style]="{
            background: '#374151',
            border: 'none',
            color: '#ffffff'
          }"
        />
      </div>

      <div class="profile-content">
        <p-card class="profile-card">
          <div class="profile-avatar-section">
            <p-avatar
              [label]="avatarInitials()"
              [style]="{
                width: '120px',
                height: '120px',
                fontSize: '3rem',
                background: '#fbbf24',
                color: '#000000'
              }"
              shape="circle"
            />
            <div class="avatar-info">
              <h2 class="user-name">{{ currentUser()?.full_name || currentUser()?.email || 'Usuario' }}</h2>
              <p class="user-email">{{ currentUser()?.email }}</p>
            </div>
          </div>
        </p-card>

        <p-card class="profile-form-card">
          <ng-template pTemplate="header">
            <h3 class="form-title">Información Personal</h3>
          </ng-template>

          <form (ngSubmit)="onSubmit()" class="profile-form">
            <div class="form-row">
              <div class="form-group">
                <label for="full_name">Nombre Completo</label>
                <input
                  id="full_name"
                  type="text"
                  pInputText
                  [(ngModel)]="formData.full_name"
                  name="full_name"
                  placeholder="Tu nombre completo"
                  [disabled]="isLoading()"
                />
              </div>

              <div class="form-group">
                <label for="email">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  pInputText
                  [value]="currentUser()?.email || ''"
                  disabled
                  class="disabled-input"
                />
                <small class="form-hint">El correo no se puede modificar</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="phone_number">Teléfono</label>
                <input
                  id="phone_number"
                  type="tel"
                  pInputText
                  [(ngModel)]="formData.phone_number"
                  name="phone_number"
                  placeholder="+507 1234-5678"
                  [disabled]="isLoading()"
                />
              </div>

              <div class="form-group">
                <label for="document_id">Cédula / Documento</label>
                <input
                  id="document_id"
                  type="text"
                  pInputText
                  [(ngModel)]="formData.document_id"
                  name="document_id"
                  placeholder="8-123-4567"
                  [disabled]="isLoading()"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="address">Dirección</label>
              <textarea
                id="address"
                pInputTextarea
                [(ngModel)]="formData.address"
                name="address"
                rows="3"
                placeholder="Tu dirección completa"
                [disabled]="isLoading()"
                [autoResize]="true"
              ></textarea>
            </div>

            <div class="form-actions">
              <p-button
                type="submit"
                label="Guardar Cambios"
                [loading]="isLoading()"
                [disabled]="isLoading()"
                [style]="{
                  background: '#fbbf24',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 'bold',
                  padding: '0.75rem 2rem'
                }"
              />
              <p-button
                type="button"
                label="Cancelar"
                severity="secondary"
                (onClick)="resetForm()"
                [disabled]="isLoading()"
                [style]="{
                  background: '#e5e7eb',
                  border: 'none',
                  color: '#374151',
                  padding: '0.75rem 2rem'
                }"
              />
            </div>
          </form>
        </p-card>

        <p-card class="profile-stats-card">
          <ng-template pTemplate="header">
            <h3 class="form-title">Mis Adopciones</h3>
          </ng-template>
          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-label">Solicitudes Enviadas</span>
              <span class="stat-value">{{ adoptionStats().pending + adoptionStats().approved + adoptionStats().rejected }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Aprobadas</span>
              <span class="stat-value stat-approved">{{ adoptionStats().approved }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Pendientes</span>
              <span class="stat-value stat-pending">{{ adoptionStats().pending }}</span>
            </div>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        background: #ffffff;
        min-height: calc(100vh - 200px);
      }

      .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .profile-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .profile-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .profile-card {
        background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      }

      .profile-avatar-section {
        display: flex;
        align-items: center;
        gap: 2rem;
        padding: 1.5rem;
      }

      .avatar-info {
        flex: 1;
      }

      .user-name {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
      }

      .user-email {
        font-size: 1rem;
        color: #374151;
        margin: 0;
      }

      .profile-form-card,
      .profile-stats-card {
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .form-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .profile-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group label {
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .form-hint {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .disabled-input {
        background: #f3f4f6;
        cursor: not-allowed;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      .stats-content {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
        padding: 1.5rem;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .stat-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 600;
        text-align: center;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
      }

      .stat-approved {
        color: #10b981;
      }

      .stat-pending {
        color: #fbbf24;
      }

      ::ng-deep .profile-form-card .p-card-body,
      ::ng-deep .profile-stats-card .p-card-body {
        padding: 0;
      }

      @media (max-width: 768px) {
        .profile-container {
          padding: 1rem;
        }

        .profile-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .profile-title {
          font-size: 1.75rem;
        }

        .profile-avatar-section {
          flex-direction: column;
          text-align: center;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .stats-content {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  currentUser = this.authService.currentUser;
  isLoading = signal(false);
  
  formData = signal<Partial<User>>({
    full_name: '',
    phone_number: '',
    document_id: '',
    address: '',
  });

  avatarInitials = computed(() => {
    const user = this.currentUser();
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  });

  adoptionStats = signal({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const user = this.currentUser();
    if (user) {
      this.formData.set({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        document_id: user.document_id || '',
        address: user.address || '',
      });
    }

    // TODO: Cargar estadísticas de adopciones del usuario
    // Por ahora valores de ejemplo
    this.loadAdoptionStats();
  }

  private async loadAdoptionStats(): Promise<void> {
    // TODO: Implementar carga de estadísticas desde el store
    // const userId = this.currentUser()?.id;
    // if (userId) {
    //   const stats = await this.adoptionApplicationsStore.getUserStats(userId);
    //   this.adoptionStats.set(stats);
    // }
  }

  async onSubmit(): Promise<void> {
    this.isLoading.set(true);

    const result = await this.authService.updateProfile(this.formData());

    this.isLoading.set(false);

    if (result.success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Perfil actualizado',
        detail: 'Tus cambios se han guardado correctamente',
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: result.error || 'No se pudieron guardar los cambios',
      });
    }
  }

  resetForm(): void {
    const user = this.currentUser();
    if (user) {
      this.formData.set({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        document_id: user.document_id || '',
        address: user.address || '',
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.messageService.add({
      severity: 'info',
      summary: 'Sesión cerrada',
      detail: 'Has cerrado sesión correctamente',
    });
    this.router.navigate(['/adoptions']);
  }
}

