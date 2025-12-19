import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Avatar } from 'primeng/avatar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { AuthWrapperService } from './auth-wrapper.service';
import { User, UserPet, AdoptionApplication, Pet } from '../models';
import { UserPetsStore } from '../stores/user-pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { PetFavoritesStore } from '../stores/pet-favorites.store';
import { PetsStore } from '../stores/pets.store';

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
    Avatar,
    TableModule,
    TagModule,
    DropdownModule,
    CalendarModule,
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

          <!-- My Favorites Card -->
          <div class="favorites-card">
            <div class="favorites-card-header">
              <h3 class="favorites-card-title">❤️ Mis Favoritos</h3>
            </div>
            <div class="favorites-card-content">
              @if (myFavorites().length === 0) {
                <div class="empty-favorites">
                  <span class="empty-icon">💛</span>
                  <p class="empty-text">No tienes mascotas favoritas aún</p>
                  <p-button
                    label="Explorar Mascotas"
                    icon="pi pi-search"
                    (onClick)="goToAdoptions()"
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
                <div class="favorites-grid">
                  @for (favorite of myFavorites(); track favorite.id) {
                    @if (favorite.pet) {
                      <div class="favorite-pet-card" (click)="viewPet(favorite.pet!.id)">
                        <div class="favorite-pet-image">
                          @if (favorite.pet.photos && favorite.pet.photos.length > 0) {
                            <img [src]="favorite.pet.photos[0]" [alt]="favorite.pet.name" />
                          } @else {
                            <div class="favorite-pet-placeholder">
                              <span class="placeholder-icon">{{ favorite.pet.species === 'dog' ? '🐕' : favorite.pet.species === 'cat' ? '🐱' : '🐾' }}</span>
                            </div>
                          }
                          <button
                            type="button"
                            class="remove-favorite-button"
                            (click)="removeFavorite(favorite, $event)"
                            title="Quitar de favoritos"
                          >
                            ❌
                          </button>
                        </div>
                        <div class="favorite-pet-info">
                          <h4 class="favorite-pet-name">{{ favorite.pet.name }}</h4>
                          <p class="favorite-pet-details">
                            {{ getSpeciesLabel(favorite.pet.species) }} • {{ favorite.pet.gender === 'M' ? 'Macho' : 'Hembra' }}
                          </p>
                          <p-tag
                            [value]="favorite.pet.is_available ? 'Disponible' : 'Adoptada'"
                            [severity]="favorite.pet.is_available ? 'success' : 'danger'"
                            [style]="{ marginTop: '0.5rem' }"
                          />
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <!-- My Adoption Applications Card -->
          <div class="applications-card">
            <div class="applications-card-header">
              <h3 class="applications-card-title">📋 Mis Solicitudes de Adopción</h3>
            </div>
            
            <!-- Statistics Summary -->
            <div class="applications-stats">
              <div class="stat-item">
                <span class="stat-value">{{ applicationStats().total }}</span>
                <span class="stat-label">Total</span>
              </div>
              <div class="stat-item pending">
                <span class="stat-value">{{ applicationStats().pending }}</span>
                <span class="stat-label">Pendientes</span>
              </div>
              <div class="stat-item approved">
                <span class="stat-value">{{ applicationStats().approved }}</span>
                <span class="stat-label">Aprobadas</span>
              </div>
              <div class="stat-item completed">
                <span class="stat-value">{{ applicationStats().completed }}</span>
                <span class="stat-label">Completadas</span>
              </div>
            </div>
            
            <!-- Filters -->
            <div class="applications-filters">
              <div class="filter-item">
                <label>Estado</label>
                <p-dropdown
                  [options]="statusOptions"
                  [(ngModel)]="statusFilter"
                  placeholder="Todos los estados"
                  optionLabel="label"
                  optionValue="value"
                  [showClear]="true"
                />
              </div>
              <div class="filter-item">
                <label>Desde</label>
                <p-calendar
                  [(ngModel)]="dateFrom"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Fecha inicial"
                  [showClear]="true"
                />
              </div>
              <div class="filter-item">
                <label>Hasta</label>
                <p-calendar
                  [(ngModel)]="dateTo"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Fecha final"
                  [showClear]="true"
                />
              </div>
              <div class="filter-item">
                <p-button
                  label="Limpiar Filtros"
                  severity="secondary"
                  [text]="true"
                  (onClick)="clearFilters()"
                  [style]="{ marginTop: '1.5rem' }"
                />
              </div>
            </div>
            
            <div class="applications-card-content">
              @if (myApplications().length === 0) {
                <div class="empty-applications">
                  <span class="empty-icon">📝</span>
                  <p class="empty-text">No has realizado ninguna solicitud de adopción aún</p>
                  <p-button
                    label="Ver Mascotas Disponibles"
                    icon="pi pi-search"
                    (onClick)="goToAdoptions()"
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
                <p-table
                  [value]="myApplications()"
                  [paginator]="true"
                  [rows]="5"
                  [rowsPerPageOptions]="[5, 10, 20]"
                  styleClass="p-datatable-striped"
                  [loading]="applicationsStore.isLoading()"
                >
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Mascota</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-application>
                    <tr>
                      <td>
                        <div class="application-pet-info">
                          @if (application.pet?.photos && application.pet.photos.length > 0) {
                            <img [src]="application.pet.photos[0]" [alt]="application.pet.name" class="pet-thumbnail" />
                          }
                          <div class="pet-info-text">
                            <strong>{{ application.pet?.name || 'N/A' }}</strong>
                            <small>{{ getSpeciesLabel(application.pet?.species || 'other') }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p-tag
                          [value]="getStatusLabel(application.status)"
                          [severity]="getStatusSeverity(application.status)"
                        />
                      </td>
                      <td>{{ formatDate(application.created_at) }}</td>
                      <td>
                        <p-button
                          icon="pi pi-eye"
                          [text]="true"
                          severity="info"
                          (onClick)="viewApplication(application)"
                          title="Ver detalles"
                        />
                        @if (application.status === 'pending') {
                          <p-button
                            icon="pi pi-pencil"
                            [text]="true"
                            severity="secondary"
                            (onClick)="editApplication(application)"
                            title="Editar solicitud"
                            [style]="{ marginLeft: '0.5rem' }"
                          />
                        }
                      </td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr>
                      <td colspan="4">No se encontraron solicitudes</td>
                    </tr>
                  </ng-template>
                </p-table>
              }
            </div>
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
      .pets-card,
      .applications-card,
      .favorites-card {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 1rem;
        box-shadow: 0 4px 12px rgba(55, 65, 81, 0.1);
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .info-card:hover,
      .pets-card:hover,
      .applications-card:hover,
      .favorites-card:hover {
        border-color: #FBBF24;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.2);
      }

      .info-card-header,
      .pets-card-header,
      .applications-card-header,
      .favorites-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        background: linear-gradient(to right, #FBBF24 0%, transparent 100%);
        border-bottom: 1px solid #000000;
      }

      .info-card-title,
      .pets-card-title,
      .applications-card-title,
      .favorites-card-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .favorites-card-content {
        padding: 1.5rem;
      }

      .empty-favorites {
        text-align: center;
        padding: 4rem 1rem;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        border-radius: 0.75rem;
        border: 1px dashed #374151;
      }

      .favorites-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1.5rem;
      }

      .favorite-pet-card {
        background: #ffffff;
        border: 1px solid #374151;
        border-radius: 0.75rem;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(55, 65, 81, 0.1);
        cursor: pointer;
      }

      .favorite-pet-card:hover {
        border-color: #FBBF24;
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.3);
        transform: translateY(-4px);
      }

      .favorite-pet-image {
        width: 100%;
        height: 180px;
        overflow: hidden;
        background: #374151;
        position: relative;
      }

      .favorite-pet-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .favorite-pet-card:hover .favorite-pet-image img {
        transform: scale(1.05);
      }

      .favorite-pet-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #FBBF24 0%, #FBBF24 100%);
      }

      .remove-favorite-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #ef4444;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.3s ease;
        z-index: 10;
        padding: 0;
        line-height: 1;
      }

      .remove-favorite-button:hover {
        background: #ef4444;
        transform: scale(1.1);
      }

      .favorite-pet-info {
        padding: 1rem;
        background: #ffffff;
      }

      .favorite-pet-name {
        font-size: 1rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .favorite-pet-details {
        font-size: 0.875rem;
        color: #374151;
        margin: 0;
        font-weight: 500;
      }

      .applications-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background: #ffffff;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
      }

      .stat-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-item.pending .stat-value {
        color: #fbbf24;
      }

      .stat-item.approved .stat-value {
        color: #10b981;
      }

      .stat-item.completed .stat-value {
        color: #3b82f6;
      }

      .applications-filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        padding: 1.5rem;
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
      }

      .filter-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-item label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .applications-card-content {
        padding: 1.5rem;
      }

      .empty-applications {
        text-align: center;
        padding: 4rem 1rem;
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        border-radius: 0.75rem;
        border: 1px dashed #374151;
      }

      .application-pet-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .pet-thumbnail {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 0.5rem;
        border: 2px solid #FBBF24;
      }

      .pet-info-text {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .pet-info-text strong {
        color: #000000;
        font-weight: 700;
      }

      .pet-info-text small {
        color: #374151;
        font-size: 0.875rem;
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
  public applicationsStore = inject(AdoptionApplicationsStore);
  public favoritesStore = inject(PetFavoritesStore);
  public petsStore = inject(PetsStore);

  user$ = this.auth.user$;
  isLoading = signal(false);
  myPets = this.userPetsStore.myPets;
  
  // Filtros para historial
  public statusFilter = signal<string | null>(null);
  public dateFrom = signal<Date | null>(null);
  public dateTo = signal<Date | null>(null);
  
  public statusOptions = [
    { label: 'Todas', value: null },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Aprobadas', value: 'approved' },
    { label: 'Rechazadas', value: 'rejected' },
    { label: 'Completadas', value: 'completed' },
  ];
  
  myApplications = computed(() => {
    const user = this.auth.currentUser();
    if (!user?.email) {
      return [];
    }
    let apps = this.applicationsStore.getUserApplications(user.email);
    
    // Aplicar filtros
    if (this.statusFilter()) {
      apps = apps.filter(app => app.status === this.statusFilter());
    }
    
    if (this.dateFrom()) {
      apps = apps.filter(app => {
        if (!app.created_at) return false;
        const appDate = new Date(app.created_at);
        return appDate >= this.dateFrom()!;
      });
    }
    
    if (this.dateTo()) {
      apps = apps.filter(app => {
        if (!app.created_at) return false;
        const appDate = new Date(app.created_at);
        // Agregar un día para incluir el día completo
        const toDate = new Date(this.dateTo()!);
        toDate.setHours(23, 59, 59, 999);
        return appDate <= toDate;
      });
    }
    
    // Ordenar por fecha más reciente primero
    return apps.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  });
  
  public applicationStats = computed(() => {
    const user = this.auth.currentUser();
    if (!user?.email) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
      };
    }
    const allApps = this.applicationsStore.getUserApplications(user.email);
    return {
      total: allApps.length,
      pending: allApps.filter(app => app.status === 'pending').length,
      approved: allApps.filter(app => app.status === 'approved').length,
      rejected: allApps.filter(app => app.status === 'rejected').length,
      completed: allApps.filter(app => app.status === 'completed').length,
    };
  });

  myFavorites = computed(() => {
    const user = this.auth.currentUser();
    if (!user?.email) {
      return [];
    }
    const favorites = this.favoritesStore.getUserFavorites(user.email);
    // Obtener las mascotas completas desde el petsStore
    return favorites
      .map(fav => {
        const pet = this.petsStore.entities().find(p => p.id === fav.pet_id);
        return pet ? { ...fav, pet } : null;
      })
      .filter((fav): fav is { pet: Pet } & typeof favorites[0] => fav !== null);
  });;
  
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
    const user = this.auth.currentUser();
    if (user?.email) {
      const apps = this.applicationsStore.getUserApplications(user.email);
      this.adoptionStats.set({
        pending: apps.filter(app => app.status === 'pending').length,
        approved: apps.filter(app => app.status === 'approved').length,
        rejected: apps.filter(app => app.status === 'rejected').length,
      });
    }
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

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      completed: 'Completada',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | undefined> = {
      pending: 'warn',
      approved: 'success',
      rejected: 'danger',
      completed: 'info',
    };
    return severities[status] || 'secondary';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  viewApplication(application: AdoptionApplication): void {
    // Navegar a la página de detalles de la solicitud
    // Por ahora, mostrar información en un diálogo o navegar a la página de adopciones
    this.router.navigate(['/adoptions'], {
      queryParams: { applicationId: application.id },
    });
  }

  editApplication(application: AdoptionApplication): void {
    // Navegar al formulario de adopción para editar
    if (application.pet_id) {
      this.router.navigate(['/adoptions/adoptar', application.pet_id], {
        queryParams: { edit: application.id },
      });
    }
  }

  goToAdoptions(): void {
    this.router.navigate(['/adoptions']);
  }

  viewPet(petId: string): void {
    // Navegar a la página de detalles de la mascota (se implementará después)
    this.router.navigate(['/adoptions/mascota', petId]);
  }

  removeFavorite(favorite: { id: string; pet_id: string }, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const user = this.auth.currentUser();
    if (!user?.email) {
      return;
    }

    this.favoritesStore.removeFavorite(user.email, favorite.pet_id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Favorito eliminado',
          detail: 'La mascota se ha eliminado de tus favoritos',
        });
      },
      error: (error) => {
        console.error('Error al eliminar favorito:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el favorito',
        });
      },
    });
  }

  clearFilters(): void {
    this.statusFilter.set(null);
    this.dateFrom.set(null);
    this.dateTo.set(null);
  }
}

