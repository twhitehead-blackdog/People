import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Card } from 'primeng/card';
import { Avatar } from 'primeng/avatar';
import { AuthWrapperService } from './auth-wrapper.service';
import { User, UserPet } from '../models';
import { UserPetsStore } from '../stores/user-pets.store';

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
    AsyncPipe,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="dashboard-container">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div class="header-left">
          <h1 class="dashboard-title">Mi Dashboard</h1>
          <p class="dashboard-subtitle">Gestiona tu perfil y tus mascotas</p>
        </div>
        <div class="header-right">
          <p-button
            label="Cerrar Sesión"
            icon="pi pi-sign-out"
            severity="secondary"
            (onClick)="logout()"
            [style]="{
              background: '#374151',
              border: 'none',
              color: '#ffffff',
              fontWeight: 'bold'
            }"
          />
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Sidebar Profile Card -->
        <div class="dashboard-sidebar">
          <div class="profile-widget">
            <div class="profile-avatar-wrapper">
              <p-avatar
                [label]="avatarInitials()"
                [style]="{
                  width: '100px',
                  height: '100px',
                  fontSize: '2.5rem',
                  background: '#FBBF24',
                  color: '#000000',
                  border: '4px solid #000000'
                }"
                shape="circle"
              />
              <div class="avatar-badge">👤</div>
            </div>
            <div class="profile-widget-content">
              <h2 class="widget-user-name">{{ (user$ | async)?.name || (user$ | async)?.email || 'Usuario' }}</h2>
              <p class="widget-user-email">{{ (user$ | async)?.email }}</p>
              <div class="profile-stats-mini">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ myPets().length }}</span>
                  <span class="mini-stat-label">Mascotas</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ adoptionStats().pending + adoptionStats().approved }}</span>
                  <span class="mini-stat-label">Adopciones</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Stats Widget -->
          <div class="quick-stats-widget">
            <h3 class="widget-title">📊 Estadísticas Rápidas</h3>
            <div class="quick-stats-grid">
              <div class="quick-stat-card">
                <div class="quick-stat-icon">📝</div>
                <div class="quick-stat-info">
                  <span class="quick-stat-value">{{ adoptionStats().pending + adoptionStats().approved + adoptionStats().rejected }}</span>
                  <span class="quick-stat-label">Solicitudes</span>
                </div>
              </div>
              <div class="quick-stat-card approved">
                <div class="quick-stat-icon">✅</div>
                <div class="quick-stat-info">
                  <span class="quick-stat-value">{{ adoptionStats().approved }}</span>
                  <span class="quick-stat-label">Aprobadas</span>
                </div>
              </div>
              <div class="quick-stat-card pending">
                <div class="quick-stat-icon">⏳</div>
                <div class="quick-stat-info">
                  <span class="quick-stat-value">{{ adoptionStats().pending }}</span>
                  <span class="quick-stat-label">Pendientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="dashboard-main">
          <!-- Top Stats Row -->
          <div class="stats-row">
            <div class="stat-card large">
              <div class="stat-card-header">
                <h3 class="stat-card-title">🐾 Mis Mascotas</h3>
                <p-button
                  label="Añadir"
                  icon="pi pi-plus"
                  (onClick)="goToAddPet()"
                  [style]="{
                    background: '#FBBF24',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 'bold',
                    padding: '0.5rem 1rem'
                  }"
                />
              </div>
              <div class="stat-card-content">
                <div class="big-number">{{ myPets().length }}</div>
                <p class="stat-description">mascotas registradas</p>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-card-header">
                <h3 class="stat-card-title">💕 Busco Pareja</h3>
              </div>
              <div class="stat-card-content">
                <div class="big-number">0</div>
                <p class="stat-description">publicaciones activas</p>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-card-header">
                <h3 class="stat-card-title">📋 Adopciones</h3>
              </div>
              <div class="stat-card-content">
                <div class="big-number">{{ adoptionStats().approved }}</div>
                <p class="stat-description">completadas</p>
              </div>
            </div>
          </div>

          <!-- Info Card -->
          <div class="info-card">
            <div class="info-card-header">
              <h3 class="info-card-title">📝 Información Personal</h3>
            </div>
            <form (ngSubmit)="onSubmit()" class="dashboard-form">
              <div class="form-grid">
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
                    [value]="(user$ | async)?.email || ''"
                    disabled
                    class="disabled-input"
                  />
                  <small class="form-hint">El correo no se puede modificar</small>
                </div>

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

                <div class="form-group full-width">
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
              </div>

              <div class="form-actions">
                <p-button
                  type="submit"
                  label="Guardar Cambios"
                  icon="pi pi-save"
                  [loading]="isLoading()"
                  [disabled]="isLoading()"
                  [style]="{
                    background: '#FBBF24',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 'bold',
                    padding: '0.75rem 2rem'
                  }"
                />
                <p-button
                  type="button"
                  label="Cancelar"
                  icon="pi pi-times"
                  severity="secondary"
                  (onClick)="resetForm()"
                  [disabled]="isLoading()"
                  [style]="{
                    background: '#374151',
                    border: '2px solid #374151',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    padding: '0.75rem 2rem'
                  }"
                />
              </div>
            </form>
          </div>

          <!-- Pets Grid Card -->
          <div class="pets-card">
            <div class="pets-card-header">
              <h3 class="pets-card-title">🐕 Mis Mascotas</h3>
              <p-button
                label="Añadir Mascota"
                icon="pi pi-plus"
                (onClick)="goToAddPet()"
                [style]="{
                  background: '#FBBF24',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 'bold'
                }"
              />
            </div>
            <div class="pets-card-content">
              @if (myPets().length === 0) {
                <div class="empty-pets">
                  <span class="empty-icon">🐾</span>
                  <p class="empty-text">No tienes mascotas registradas aún</p>
                  <p-button
                    label="Añadir mi Primera Mascota"
                    icon="pi pi-plus"
                    (onClick)="goToAddPet()"
                    [style]="{
                      background: '#FBBF24',
                      border: 'none',
                      color: '#000000',
                      fontWeight: 'bold',
                      marginTop: '1rem'
                    }"
                  />
                </div>
              } @else {
                <div class="pets-grid">
                  @for (pet of myPets(); track pet.id) {
                    <div class="pet-card">
                      <div class="pet-image">
                        @if (pet.photos && pet.photos.length > 0) {
                          <img [src]="pet.photos[0]" [alt]="pet.name" />
                        } @else {
                          <div class="pet-placeholder">
                            <span class="placeholder-icon">{{ pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾' }}</span>
                          </div>
                        }
                        <div class="pet-overlay">
                          <div class="pet-overlay-actions">
                            <p-button
                              icon="pi pi-pencil"
                              [text]="true"
                              (onClick)="editPet(pet.id)"
                              [style]="{
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: 'none',
                                color: '#000000'
                              }"
                              title="Editar"
                            />
                            <p-button
                              icon="pi pi-heart"
                              [text]="true"
                              (onClick)="publishPetMatch(pet.id)"
                              [style]="{
                                background: 'rgba(251, 191, 36, 0.9)',
                                border: 'none',
                                color: '#000000'
                              }"
                              title="Publicar en Busco Pareja"
                            />
                          </div>
                        </div>
                      </div>
                      <div class="pet-info">
                        <h4 class="pet-name">{{ pet.name }}</h4>
                        <p class="pet-details">
                          {{ getSpeciesLabel(pet.species) }} • {{ pet.gender === 'M' ? 'Macho' : 'Hembra' }} • {{ getSizeLabel(pet.size) }}
                        </p>
                        @if (pet.breed_type === 'pure' && pet.breed_primary) {
                          <p class="pet-breed">⭐ {{ pet.breed_primary }}</p>
                        } @else if (pet.breed_type === 'mixed' && pet.breed_primary && pet.breed_secondary) {
                          <p class="pet-breed">🔀 {{ pet.breed_primary }} / {{ pet.breed_secondary }}</p>
                        } @else {
                          <p class="pet-breed">🐾 Sin raza específica</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        padding: 2rem;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding: 2rem;
        background: linear-gradient(135deg, #000000 0%, #374151 100%);
        border-radius: 1rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        position: relative;
        overflow: hidden;
      }

      .dashboard-header::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(30%, -30%);
      }

      .header-left {
        position: relative;
        z-index: 1;
      }

      .dashboard-title {
        font-size: 3rem;
        font-weight: 700;
        color: #FBBF24;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .dashboard-subtitle {
        font-size: 1.125rem;
        color: #ffffff;
        margin: 0;
        opacity: 0.9;
      }

      .header-right {
        position: relative;
        z-index: 1;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 2rem;
        max-width: 1600px;
        margin: 0 auto;
      }

      /* Sidebar */
      .dashboard-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .profile-widget {
        background: #ffffff;
        border: 1px solid #000000;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        position: relative;
        overflow: hidden;
      }

      .profile-widget::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #FBBF24 0%, #374151 50%, #FBBF24 100%);
      }

      .profile-avatar-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        margin-bottom: 1.5rem;
      }

      .avatar-badge {
        position: absolute;
        bottom: 0;
        right: calc(50% - 60px);
        background: #FBBF24;
        border: 2px solid #000000;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }

      .profile-widget-content {
        text-align: center;
      }

      .widget-user-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .widget-user-email {
        font-size: 0.875rem;
        color: #374151;
        margin: 0 0 1.5rem 0;
        font-weight: 500;
      }

      .profile-stats-mini {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding-top: 1.5rem;
        border-top: 2px solid #374151;
      }

      .mini-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
      }

      .mini-stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
      }

      .mini-stat-label {
        font-size: 0.75rem;
        color: #374151;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .quick-stats-widget {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(55, 65, 81, 0.1);
      }

      .widget-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 1rem 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .quick-stats-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .quick-stat-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border: 1px solid #374151;
        border-radius: 0.75rem;
        transition: all 0.3s ease;
      }

      .quick-stat-card:hover {
        border-color: #FBBF24;
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
      }

      .quick-stat-card.approved {
        border-left: 3px solid #FBBF24;
      }

      .quick-stat-card.pending {
        border-left: 3px solid #374151;
      }

      .quick-stat-icon {
        font-size: 1.5rem;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #FBBF24;
        border-radius: 0.5rem;
        flex-shrink: 0;
      }

      .quick-stat-info {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .quick-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
        line-height: 1;
      }

      .quick-stat-label {
        font-size: 0.75rem;
        color: #374151;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Main Content */
      .dashboard-main {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .stats-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 1.5rem;
      }

      .stat-card {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 12px rgba(55, 65, 81, 0.1);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #FBBF24;
      }

      .stat-card:hover {
        border-color: #FBBF24;
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
      }

      .stat-card.large {
        background: linear-gradient(135deg, #FBBF24 0%, #FBBF24 100%);
        border: 1px solid #000000;
      }

      .stat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .stat-card-title {
        font-size: 1rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .stat-card-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .big-number {
        font-size: 3rem;
        font-weight: 700;
        color: #000000;
        line-height: 1;
      }

      .stat-description {
        font-size: 0.875rem;
        color: #374151;
        margin: 0;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .info-card,
      .pets-card {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 1rem;
        box-shadow: 0 4px 12px rgba(55, 65, 81, 0.1);
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .info-card:hover,
      .pets-card:hover {
        border-color: #FBBF24;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.2);
      }

      .info-card-header,
      .pets-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        background: linear-gradient(to right, #FBBF24 0%, transparent 100%);
        border-bottom: 1px solid #000000;
      }

      .info-card-title,
      .pets-card-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .dashboard-form {
        padding: 1.5rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-group.full-width {
        grid-column: 1 / -1;
      }

      .form-group label {
        font-weight: 700;
        color: #000000;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .form-hint {
        font-size: 0.75rem;
        color: #374151;
        margin-top: 0.25rem;
        font-style: italic;
      }

      .disabled-input {
        background: #f9fafb;
        cursor: not-allowed;
        border: 1px solid #374151 !important;
      }

      ::ng-deep .dashboard-form .p-inputtext,
      ::ng-deep .dashboard-form .p-inputtextarea {
        border: 1px solid #374151 !important;
        border-radius: 0.5rem !important;
        transition: all 0.3s ease !important;
      }

      ::ng-deep .dashboard-form .p-inputtext:focus,
      ::ng-deep .dashboard-form .p-inputtextarea:focus {
        border-color: #FBBF24 !important;
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1) !important;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid #374151;
      }

      .pets-card-content {
        padding: 1.5rem;
      }

      .empty-pets {
        text-align: center;
        padding: 4rem 1rem;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        border-radius: 0.75rem;
        border: 1px dashed #374151;
      }

      .empty-icon {
        font-size: 5rem;
        display: block;
        margin-bottom: 1rem;
      }

      .empty-text {
        font-size: 1.125rem;
        color: #374151;
        margin: 0 0 1.5rem 0;
        font-weight: 600;
      }

      .pets-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .pet-card {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 0.75rem;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(55, 65, 81, 0.1);
      }

      .pet-card:hover {
        border-color: #FBBF24;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
        transform: translateY(-4px);
      }

      .pet-image {
        width: 100%;
        height: 200px;
        overflow: hidden;
        background: #374151;
        position: relative;
      }

      .pet-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .pet-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .pet-card:hover .pet-overlay {
        opacity: 1;
      }

      .pet-overlay-actions {
        display: flex;
        gap: 0.5rem;
      }

      .pet-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #FBBF24 0%, #FBBF24 100%);
        position: relative;
      }

      .pet-placeholder::before {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.05) 10px,
          rgba(0, 0, 0, 0.05) 20px
        );
      }

      .placeholder-icon {
        font-size: 4rem;
        position: relative;
        z-index: 1;
      }

      .pet-info {
        padding: 1.25rem;
        background: #ffffff;
      }

      .pet-name {
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .pet-details {
        font-size: 0.875rem;
        color: #374151;
        margin: 0 0 0.5rem 0;
        font-weight: 500;
      }

      .pet-breed {
        font-size: 0.875rem;
        color: #374151;
        margin: 0;
        font-weight: 600;
      }

      @media (max-width: 1200px) {
        .dashboard-grid {
          grid-template-columns: 280px 1fr;
        }

        .stats-row {
          grid-template-columns: 1fr 1fr;
        }

        .stat-card.large {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 768px) {
        .dashboard-container {
          padding: 1rem;
        }

        .dashboard-header {
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
        }

        .dashboard-title {
          font-size: 2rem;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .stats-row {
          grid-template-columns: 1fr;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }

        .pets-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthWrapperService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private userPetsStore = inject(UserPetsStore);

  user$ = this.auth.user$;
  isLoading = signal(false);
  myPets = this.userPetsStore.myPets;;
  
  formData: Partial<User> = {
    full_name: '',
    phone_number: '',
    document_id: '',
    address: '',
  };

  avatarInitials = computed(() => {
    let initials = 'U';
    this.auth.user$.subscribe((user) => {
      if (user?.name) {
        initials = user.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      } else if (user?.email) {
        initials = user.email[0].toUpperCase();
      }
    });
    return initials;
  });

  adoptionStats = signal({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  ngOnInit(): void {
    this.auth.isAuthenticated$.subscribe((isAuth) => {
      if (!isAuth) {
        this.router.navigate(['/auth/login']);
        return;
      }

      this.auth.user$.subscribe((user) => {
        if (user) {
          this.formData = {
            full_name: user.name || '',
            phone_number: '',
            document_id: '',
            address: '',
          };
        }
      });
    });

    // Cargar mascotas del usuario
    this.userPetsStore.fetchItems();

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

    // TODO: Implementar actualización de perfil con Auth0
    // Por ahora solo mostramos mensaje de éxito
    setTimeout(() => {
      this.isLoading.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Perfil actualizado',
        detail: 'Tus cambios se han guardado correctamente',
      });
    }, 500);
  }

  resetForm(): void {
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.formData = {
          full_name: user.name || '',
          phone_number: '',
          document_id: '',
          address: '',
        };
      }
    });
  }

  logout(): void {
    // Usar ENV_APP_URL si está disponible, sino usar window.location.origin
    const appUrl = process.env['ENV_APP_URL'] || window.location.origin;
    const returnTo = `${appUrl}/adoptions`;
    
    this.auth.logout({
      logoutParams: {
        returnTo: returnTo,
      },
    });
  }

  goToAddPet(): void {
    this.router.navigate(['/adoptions/profile/mascotas/nueva']);
  }

  getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      small: 'Pequeño',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }

  editPet(petId: string): void {
    this.router.navigate(['/adoptions/profile/mascotas', petId, 'editar']);
  }

  publishPetMatch(petId: string): void {
    this.router.navigate(['/adoptions/busco-pareja/publicar'], {
      queryParams: { petId },
    });
  }
}

