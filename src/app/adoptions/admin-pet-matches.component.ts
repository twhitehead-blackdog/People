import { CommonModule } from '@angular/common';
import { , ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { PetMatch } from '../models';
import { PetMatchesStore } from '../stores/pet-matches.store';
import { PersonalityTraitsStore } from '../stores/personality-traits.store';
import { PhotoGalleryComponent } from '../shared/photo-gallery.component';
import { BreedSelectorComponent } from './breed-selector.component';
import { AgeSelectorComponent } from './age-selector.component';

@Component({
  selector: 'pt-admin-pet-matches',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    InputNumber,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    CheckboxModule,
    TagModule,
    ToastModule,
    Card,
    PhotoGalleryComponent,
    BreedSelectorComponent,
    AgeSelectorComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="pet-matches-management">
      <div class="section-header">
        <h2>GestiÃ³n de "Busco Pareja"</h2>
        <div class="header-actions">
          <p-button
            label="Nueva PublicaciÃ³n"
            icon="pi pi-plus"
            (onClick)="openNewMatchDialog()"
            [style]="{
              background: '#fbbf24',
              border: 'none',
              color: '#000000',
              fontWeight: 'bold'
            }"
          />
        </div>
      </div>

      <p-card class="stats-card">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Publicaciones</span>
            <span class="stat-value">{{ totalMatches() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Activas</span>
            <span class="stat-value stat-active">{{ activeMatches() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Inactivas</span>
            <span class="stat-value stat-inactive">{{ inactiveMatches() }}</span>
          </div>
        </div>
      </p-card>

      <p-card>
        <p-table
          [value]="filteredMatches()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['pet_name', 'species']"
          styleClass="p-datatable-striped"
          [loading]="petMatchesStore.isLoading()"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <div class="search-controls">
                <input
                  type="text"
                  pInputText
                  placeholder="Buscar publicaciones..."
                  (input)="onGlobalFilter($event)"
                  class="search-input"
                />
                <p-select
                  [options]="statusFilterOptions"
                  [(ngModel)]="selectedStatus"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Filtrar por estado"
                  [showClear]="true"
                  (onChange)="applyFilters()"
                  [style]="{ width: '200px', marginLeft: '0.5rem' }"
                />
                <p-select
                  [options]="speciesFilterOptions"
                  [(ngModel)]="selectedSpecies"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Filtrar por especie"
                  [showClear]="true"
                  (onChange)="applyFilters()"
                  [style]="{ width: '200px', marginLeft: '0.5rem' }"
                />
              </div>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Mascota</th>
              <th>Especie</th>
              <th>GÃ©nero</th>
              <th>Edad</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-match>
            <tr>
              <td>
                <div class="pet-info-cell">
                  @if (match.photos && match.photos.length > 0) {
                    <img [src]="match.photos[0]" [alt]="match.pet_name" class="pet-thumbnail" />
                  }
                  <span>{{ match.pet_name }}</span>
                </div>
              </td>
              <td>
                <span class="species-badge">{{ getSpeciesLabel(match.species) }}</span>
              </td>
              <td>{{ match.gender === 'M' ? 'Macho' : 'Hembra' }}</td>
              <td>{{ formatAge(match) }}</td>
              <td>
                <p-tag
                  [value]="match.is_active ? 'Activa' : 'Inactiva'"
                  [severity]="match.is_active ? 'success' : 'danger'"
                />
              </td>
              <td>{{ formatDate(match.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    (onClick)="viewDetails(match)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Ver detalles"
                  />
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(match)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="match.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="match.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(match)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="match.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteMatch(match)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron publicaciones</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar pet match -->
    <p-dialog
      [visible]="showMatchDialog()"
      (visibleChange)="showMatchDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [header]="editingMatch() ? 'Editar PublicaciÃ³n' : 'Nueva PublicaciÃ³n'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveMatch()" class="match-form">
        <div class="form-section">
          <h3 class="section-title">InformaciÃ³n BÃ¡sica</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="pet_name">Nombre de la Mascota *</label>
              <input
                id="pet_name"
                type="text"
                pInputText
                [(ngModel)]="matchForm.pet_name"
                name="pet_name"
                required
                [disabled]="isLoading()"
              />
            </div>

            <div class="form-group">
              <label for="species">Especie *</label>
              <p-select
                id="species"
                name="species"
                [(ngModel)]="matchForm.species"
                [options]="speciesOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar especie"
                [disabled]="isLoading()"
                (onChange)="onSpeciesChange()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Raza *</label>
            <pt-breed-selector
              [species]="matchForm.species || 'dog'"
              [initialBreed]="initialBreedData()"
              (breedChanged)="onBreedDataChange($event)"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Edad *</label>
              <pt-age-selector
                [initialAge]="initialAgeData()"
                (ageChanged)="onAgeDataChange($event)"
              />
            </div>

            <div class="form-group">
              <label for="gender">GÃ©nero *</label>
              <p-select
                id="gender"
                name="gender"
                [(ngModel)]="matchForm.gender"
                [options]="genderOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar gÃ©nero"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="size">TamaÃ±o *</label>
              <p-select
                id="size"
                name="size"
                [(ngModel)]="matchForm.size"
                [options]="sizeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tamaÃ±o"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>

            <div class="form-group">
              <label for="weight">Peso (Kg)</label>
              <p-inputNumber
                id="weight"
                [(ngModel)]="matchForm.weight"
                name="weight"
                mode="decimal"
                [min]="0"
                [max]="100"
                [step]="0.1"
                [minFractionDigits]="1"
                [maxFractionDigits]="2"
                placeholder="0.0"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="color">Color</label>
            <input
              id="color"
              type="text"
              pInputText
              [(ngModel)]="matchForm.color"
              name="color"
              [disabled]="isLoading()"
              placeholder="Ej: Negro, Blanco, etc."
            />
          </div>

          <div class="form-group">
            <label for="description">DescripciÃ³n</label>
            <textarea
              id="description"
              pTextarea
              [(ngModel)]="matchForm.description"
              name="description"
              rows="4"
              [disabled]="isLoading()"
              placeholder="CuÃ©ntanos sobre la mascota..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="health_status">Estado de Salud</label>
            <input
              id="health_status"
              type="text"
              pInputText
              [(ngModel)]="matchForm.health_status"
              name="health_status"
              [disabled]="isLoading()"
              placeholder="Ej: Excelente, Bueno, etc."
            />
          </div>

          <div class="form-row">
            <div class="form-group checkbox-group">
              <p-checkbox
                [(ngModel)]="matchForm.is_vaccinated"
                name="is_vaccinated"
                [binary]="true"
                inputId="is_vaccinated"
                [disabled]="isLoading()"
              />
              <label for="is_vaccinated" class="checkbox-label">Vacunado</label>
            </div>

            <div class="form-group checkbox-group">
              <p-checkbox
                [(ngModel)]="matchForm.is_sterilized"
                name="is_sterilized"
                [binary]="true"
                inputId="is_sterilized"
                [disabled]="isLoading()"
              />
              <label for="is_sterilized" class="checkbox-label">Esterilizado</label>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Preferencias de Pareja</h3>
          
          <div class="form-group">
            <label for="preferred_breed_match">Preferencia de Raza *</label>
            <p-select
              id="preferred_breed_match"
              name="preferred_breed_match"
              [(ngModel)]="matchForm.preferred_breed_match"
              [options]="breedMatchOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar preferencia"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="preferred_age_min">Edad preferida (mÃ­n. aÃ±os)</label>
              <p-inputNumber
                id="preferred_age_min"
                name="preferred_age_min"
                [(ngModel)]="matchForm.preferred_age_min"
                [min]="0"
                [max]="30"
                placeholder="0"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
            <div class="form-group">
              <label for="preferred_age_max">Edad preferida (mÃ¡x. aÃ±os)</label>
              <p-inputNumber
                id="preferred_age_max"
                name="preferred_age_max"
                [(ngModel)]="matchForm.preferred_age_max"
                [min]="matchForm.preferred_age_min || 0"
                [max]="30"
                placeholder="30"
                [disabled]="isLoading()"
                [style]="{ width: '100%' }"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="preferred_size">TamaÃ±o preferido de pareja</label>
            <p-select
              id="preferred_size"
              name="preferred_size"
              [(ngModel)]="matchForm.preferred_size"
              [options]="sizeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Cualquier tamaÃ±o"
              [showClear]="true"
              [disabled]="isLoading()"
              [style]="{ width: '100%' }"
            />
          </div>

          <div class="form-group checkbox-group">
            <p-checkbox
              [(ngModel)]="matchForm.notify_if_has_pet"
              name="notify_if_has_pet"
              [binary]="true"
              inputId="notify_if_has_pet"
              [disabled]="isLoading()"
            />
            <label for="notify_if_has_pet" class="checkbox-label">
              Notificarme si hay {{ matchForm.gender === 'M' ? 'una perrita' : 'un perrito' }} buscando pareja
            </label>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Personalidad</h3>
          
          <div class="form-group">
            <label for="personality">Rasgos de Personalidad</label>
            <p-multiSelect
              id="personality"
              name="personality"
              [(ngModel)]="matchForm.personality"
              [options]="personalityOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione una o mÃ¡s opciones..."
              [displaySelectedLabel]="true"
              [maxSelectedLabels]="3"
              [showToggleAll]="false"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Fotos</h3>
          
          <div class="form-group">
            <pt-photo-gallery
              [initialPhotos]="matchForm.photos || []"
              [maxPhotos]="10"
              [folder]="'pet-matches'"
              [autoUpload]="true"
              (photosChange)="onPhotosChange($event)"
            />
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Estado</h3>
          
          <div class="form-group checkbox-group">
            <p-checkbox
              [(ngModel)]="matchForm.is_active"
              name="is_active"
              [binary]="true"
              inputId="is_active"
              [disabled]="isLoading()"
            />
            <label for="is_active" class="checkbox-label">PublicaciÃ³n activa</label>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingMatch() ? 'Actualizar' : 'Crear'"
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
    </p-dialog>

    <!-- Dialog para ver detalles -->
    <p-dialog
      [visible]="showDetailsDialog()"
      (visibleChange)="showDetailsDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      header="Detalles de la PublicaciÃ³n"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedMatch()) {
        <div class="match-details">
          <div class="details-header">
            <h2>{{ selectedMatch()!.pet_name }}</h2>
            <p-tag
              [value]="selectedMatch()!.is_active ? 'Activa' : 'Inactiva'"
              [severity]="selectedMatch()!.is_active ? 'success' : 'danger'"
            />
          </div>

          @if (selectedMatch()!.photos && selectedMatch()!.photos!.length > 0) {
            <div class="details-photos">
              <img
                [src]="selectedMatch()!.photos![0]"
                [alt]="selectedMatch()!.pet_name"
                class="details-main-photo"
              />
            </div>
          }

          <div class="details-content">
            <div class="details-section">
              <h3>InformaciÃ³n BÃ¡sica</h3>
              <div class="details-grid">
                <div class="details-item">
                  <strong>Especie:</strong> {{ getSpeciesLabel(selectedMatch()!.species) }}
                </div>
                <div class="details-item">
                  <strong>GÃ©nero:</strong> {{ selectedMatch()!.gender === 'M' ? 'Macho' : 'Hembra' }}
                </div>
                <div class="details-item">
                  <strong>TamaÃ±o:</strong> {{ getSizeLabel(selectedMatch()!.size) }}
                </div>
                <div class="details-item">
                  <strong>Edad:</strong> {{ formatAge(selectedMatch()!) }}
                </div>
                @if (selectedMatch()!.breed_primary) {
                  <div class="details-item">
                    <strong>Raza:</strong> {{ selectedMatch()!.breed_primary }}
                    @if (selectedMatch()!.breed_secondary) {
                      <span> / {{ selectedMatch()!.breed_secondary }}</span>
                    }
                  </div>
                }
                @if (selectedMatch()!.color) {
                  <div class="details-item">
                    <strong>Color:</strong> {{ selectedMatch()!.color }}
                  </div>
                }
                @if (selectedMatch()!.weight) {
                  <div class="details-item">
                    <strong>Peso:</strong> {{ selectedMatch()!.weight }} kg
                  </div>
                }
              </div>
            </div>

            @if (selectedMatch()!.description) {
              <div class="details-section">
                <h3>DescripciÃ³n</h3>
                <p>{{ selectedMatch()!.description }}</p>
              </div>
            }

            <div class="details-section">
              <h3>Preferencias de Pareja</h3>
              <div class="details-grid">
                <div class="details-item">
                  <strong>Preferencia de raza:</strong> {{ getBreedMatchLabel(selectedMatch()!.preferred_breed_match) }}
                </div>
                @if (selectedMatch()!.preferred_age_min || selectedMatch()!.preferred_age_max) {
                  <div class="details-item">
                    <strong>Edad preferida:</strong>
                    {{ selectedMatch()!.preferred_age_min || 0 }} - {{ selectedMatch()!.preferred_age_max || 30 }} aÃ±os
                  </div>
                }
                @if (selectedMatch()!.preferred_size) {
                  <div class="details-item">
                    <strong>TamaÃ±o preferido:</strong> {{ getSizeLabel(selectedMatch()!.preferred_size!) }}
                  </div>
                }
                <div class="details-item">
                  <strong>Notificaciones:</strong> {{ selectedMatch()!.notify_if_has_pet ? 'SÃ­' : 'No' }}
                </div>
              </div>
            </div>

            @if (selectedMatch()!.personality && selectedMatch()!.personality!.length > 0) {
              <div class="details-section">
                <h3>Personalidad</h3>
                <div class="personality-tags">
                  @for (trait of selectedMatch()!.personality; track trait) {
                    <span class="personality-tag">{{ trait }}</span>
                  }
                </div>
              </div>
            }

            <div class="details-section">
              <h3>Estado de Salud</h3>
              <div class="details-grid">
                <div class="details-item">
                  <strong>Estado:</strong> {{ selectedMatch()!.health_status || 'No especificado' }}
                </div>
                <div class="details-item">
                  <strong>Vacunado:</strong> {{ selectedMatch()!.is_vaccinated ? 'SÃ­' : 'No' }}
                </div>
                <div class="details-item">
                  <strong>Esterilizado:</strong> {{ selectedMatch()!.is_sterilized ? 'SÃ­' : 'No' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .pet-matches-management {
        width: 100%;
        position: relative;
        overflow-x: hidden;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 1rem 0;
        border-bottom: 2px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 1rem;
        width: 100%;
      }

      .section-header h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }

      .header-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .stats-card {
        margin-bottom: 2rem;
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .stats-grid {
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

      .stat-active {
        color: #10b981;
      }

      .stat-inactive {
        color: #ef4444;
      }

      .table-header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .search-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        flex-wrap: wrap;
      }

      .search-input {
        flex: 1;
        min-width: 200px;
      }

      .pet-info-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .pet-thumbnail {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 0.375rem;
        border: 1px solid #e5e7eb;
      }

      .species-badge {
        padding: 0.25rem 0.75rem;
        background: #fbbf24;
        color: #000000;
        border-radius: 0.375rem;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .match-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-section {
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
      }

      .section-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #000000;
        margin: 0 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #fbbf24;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-top: 1rem;
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

      .checkbox-group {
        flex-direction: row;
        align-items: center;
        gap: 0.75rem;
      }

      .checkbox-label {
        margin: 0;
        cursor: pointer;
        font-weight: 500;
        color: #000000;
        font-size: 0.875rem;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
      }

      .match-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .details-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .details-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
        flex: 1;
      }

      .details-photos {
        width: 100%;
        max-height: 400px;
        overflow: hidden;
        border-radius: 0.5rem;
      }

      .details-main-photo {
        width: 100%;
        height: auto;
        object-fit: cover;
        border-radius: 0.5rem;
      }

      .details-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .details-section {
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .details-section:last-child {
        border-bottom: none;
      }

      .details-section h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.75rem 0;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .details-item {
        font-size: 0.875rem;
        color: #374151;
      }

      .details-item strong {
        color: #000000;
        font-weight: 600;
      }

      .personality-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .personality-tag {
        padding: 0.375rem 0.75rem;
        background: rgba(251, 191, 36, 0.15);
        color: #6b7280;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      @media (max-width: 768px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .header-actions {
          width: 100%;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .details-grid {
          grid-template-columns: 1fr;
        }

        .search-controls {
          flex-direction: column;
        }

        .search-input {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdminPetMatchesComponent {
  public petMatchesStore = inject(PetMatchesStore);
  private personalityTraitsStore = inject(PersonalityTraitsStore);
  private messageService = inject(MessageService);
  private router = inject(Router);

  public showMatchDialog = signal(false);
  public showDetailsDialog = signal(false);
  public isLoading = signal(false);
  public selectedMatch = signal<PetMatch | null>(null);
  public searchTerm = signal('');
  public selectedStatus = signal<string | null>(null);
  public selectedSpecies = signal<string | null>(null);

  public initialBreedData = signal<any>(null);
  public initialAgeData = signal<any>(null);

  public matchForm: Partial<PetMatch> = {
    pet_name: '',
    species: 'dog',
    gender: 'M',
    size: 'medium',
    preferred_breed_match: 'both',
    is_vaccinated: false,
    is_sterilized: false,
    is_active: true,
    personality: [],
    photos: [],
  };

  public speciesOptions = [
    { label: 'ðŸ• Perro', value: 'dog' },
    { label: 'ðŸ± Gato', value: 'cat' },
    { label: 'ðŸ¾ Otro', value: 'other' },
  ];

  public genderOptions = [
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ];

  public sizeOptions = [
    { label: 'PequeÃ±o', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ];

  public breedMatchOptions = [
    { label: 'Misma raza', value: 'same' },
    { label: 'Diferente raza', value: 'different' },
    { label: 'Ambas opciones', value: 'both' },
  ];

  public statusFilterOptions = [
    { label: 'Activas', value: 'active' },
    { label: 'Inactivas', value: 'inactive' },
  ];

  public speciesFilterOptions = [
    { label: 'Perro', value: 'dog' },
    { label: 'Gato', value: 'cat' },
    { label: 'Otro', value: 'other' },
  ];

  public personalityOptions = computed(() => {
    const traits = this.personalityTraitsStore.entities();
    if (traits.length > 0) {
      return traits.map((trait) => ({
        label: trait.label,
        value: trait.id,
      }));
    }
    // Fallback estÃ¡tico si el store estÃ¡ vacÃ­o
    return [
      { label: 'JuguetÃ³n', value: 'jugueton' },
      { label: 'Tranquilo', value: 'tranquilo' },
      { label: 'CariÃ±oso', value: 'carinoso' },
      { label: 'Independiente', value: 'independiente' },
      { label: 'Sociable', value: 'sociable' },
      { label: 'Activo', value: 'activo' },
      { label: 'Protector', value: 'protector' },
      { label: 'TÃ­mido', value: 'timido' },
      { label: 'Curioso', value: 'curioso' },
      { label: 'EnergÃ©tico', value: 'energetico' },
      { label: 'DÃ³cil', value: 'docil' },
    ];
  });

  public totalMatches = computed(() => this.petMatchesStore.entities().length);
  public activeMatches = computed(() => 
    this.petMatchesStore.entities().filter(m => m.is_active).length
  );
  public inactiveMatches = computed(() => 
    this.petMatchesStore.entities().filter(m => !m.is_active).length
  );

  public filteredMatches = computed(() => {
    let matches = this.petMatchesStore.entities();

    const search = this.searchTerm().toLowerCase();
    if (search) {
      matches = matches.filter(m => 
        m.pet_name.toLowerCase().includes(search) ||
        m.species.toLowerCase().includes(search)
      );
    }

    const status = this.selectedStatus();
    if (status === 'active') {
      matches = matches.filter(m => m.is_active);
    } else if (status === 'inactive') {
      matches = matches.filter(m => !m.is_active);
    }

    const species = this.selectedSpecies();
    if (species) {
      matches = matches.filter(m => m.species === species);
    }

    return matches;
  });

  public editingMatch = computed(() => this.selectedMatch() !== null);

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  public applyFilters(): void {
    // Los filtros se aplican automÃ¡ticamente a travÃ©s del computed
  }

  public openNewMatchDialog(): void {
    this.selectedMatch.set(null);
    this.resetForm();
    this.showMatchDialog.set(true);
  }

  public openEditDialog(match: PetMatch): void {
    this.selectedMatch.set(match);
    this.matchForm = { ...match };
    
    // Configurar datos de raza y edad para los selectores
    if (match.breed_type || match.breed_primary) {
      this.initialBreedData.set({
        breed_type: match.breed_type || 'none',
        breed_primary: match.breed_primary,
        breed_secondary: match.breed_secondary,
        breed_percentage_primary: match.breed_percentage_primary,
        breed_percentage_secondary: match.breed_percentage_secondary,
      });
    }

    if (match.birth_date || match.age_years !== undefined) {
      this.initialAgeData.set({
        age_mode: match.birth_date ? 'birthday' : 'years_months',
        age_years: match.age_years,
        age_months: match.age_months,
        birth_date: match.birth_date ? (typeof match.birth_date === 'string' ? new Date(match.birth_date) : match.birth_date) : undefined,
      });
    }

    this.showMatchDialog.set(true);
  }

  public viewDetails(match: PetMatch): void {
    this.selectedMatch.set(match);
    this.showDetailsDialog.set(true);
  }

  public onSpeciesChange(): void {
    this.initialBreedData.set(null);
  }

  public onBreedDataChange(data: any): void {
    this.matchForm.breed_type = data.breed_type;
    this.matchForm.breed_primary = data.breed_primary;
    this.matchForm.breed_secondary = data.breed_secondary;
    this.matchForm.breed_percentage_primary = data.breed_percentage_primary;
    this.matchForm.breed_percentage_secondary = data.breed_percentage_secondary;
  }

  public onAgeDataChange(data: any): void {
    this.matchForm.age_years = data.age_years;
    this.matchForm.age_months = data.age_months;
    this.matchForm.birth_date = data.birth_date ? (typeof data.birth_date === 'string' ? new Date(data.birth_date) : data.birth_date) : undefined;
  }

  public onPhotosChange(photos: string[]): void {
    this.matchForm.photos = photos;
  }

  public async saveMatch(): Promise<void> {
    this.isLoading.set(true);
    try {
      const matchData: Partial<PetMatch> = {
        ...this.matchForm,
      };

      if (this.editingMatch() && this.selectedMatch()?.id) {
        const fullMatchData: PetMatch = {
          ...matchData,
          id: this.selectedMatch()!.id,
        } as PetMatch;
        await this.petMatchesStore.editItem(fullMatchData).toPromise();
        this.messageService.add({
          severity: 'success',
          summary: 'Â¡Ã‰xito!',
          detail: 'PublicaciÃ³n actualizada correctamente',
        });
      } else {
        const fullMatchData: PetMatch = {
          ...matchData,
          id: crypto.randomUUID(),
          user_id: '', // Esto deberÃ­a venir del usuario autenticado
        } as PetMatch;
        await this.petMatchesStore.createItem(fullMatchData).toPromise();
        this.messageService.add({
          severity: 'success',
          summary: 'Â¡Ã‰xito!',
          detail: 'PublicaciÃ³n creada correctamente',
        });
      }

      this.resetForm();
      this.showMatchDialog.set(false);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo guardar la publicaciÃ³n',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  public async toggleActive(match: PetMatch): Promise<void> {
    this.isLoading.set(true);
    try {
      const updatedMatch: PetMatch = {
        ...match,
        is_active: !match.is_active,
      };
      await this.petMatchesStore.editItem(updatedMatch).toPromise();
      this.messageService.add({
        severity: 'success',
        summary: 'Â¡Ã‰xito!',
        detail: `PublicaciÃ³n ${updatedMatch.is_active ? 'activada' : 'desactivada'} correctamente`,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo actualizar la publicaciÃ³n',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  public deleteMatch(match: PetMatch): void {
    if (!confirm(`Â¿EstÃ¡s seguro de que deseas eliminar la publicaciÃ³n de "${match.pet_name}"?`)) {
      return;
    }

    this.isLoading.set(true);
    try {
      this.petMatchesStore.deleteItem(match.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Â¡Ã‰xito!',
        detail: 'PublicaciÃ³n eliminada correctamente',
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo eliminar la publicaciÃ³n',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  public resetForm(): void {
    this.matchForm = {
      pet_name: '',
      species: 'dog',
      gender: 'M',
      size: 'medium',
      preferred_breed_match: 'both',
      is_vaccinated: false,
      is_sterilized: false,
      is_active: true,
      personality: [],
      photos: [],
    };
    this.initialBreedData.set(null);
    this.initialAgeData.set(null);
    this.selectedMatch.set(null);
  }

  public getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  public getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      small: 'PequeÃ±o',
      medium: 'Mediano',
      large: 'Grande',
    };
    return labels[size] || size;
  }

  public getBreedMatchLabel(preference: string): string {
    const labels: Record<string, string> = {
      same: 'Misma raza',
      different: 'Diferente raza',
      both: 'Ambas opciones',
    };
    return labels[preference] || preference;
  }

  public formatAge(match: PetMatch): string {
    if (match.age_years !== undefined) {
      if (match.age_months !== undefined && match.age_months > 0) {
        return `${match.age_years} aÃ±os y ${match.age_months} meses`;
      }
      return `${match.age_years} aÃ±os`;
    }
    if (match.age !== undefined) {
      return `${match.age.toFixed(1)} aÃ±os`;
    }
    return 'N/A';
  }

  public formatDate(date?: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}




