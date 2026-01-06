import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { Pet, Foundation } from '../models';
import { FoundationsStore } from '../stores/foundations.store';
import { PetsStore } from '../stores/pets.store';
import { PersonalityTraitsStore } from '../stores/personality-traits.store';
import {
  EditableSelectComponent,
  EditableOption,
} from '../shared/editable-select.component';
import { PhotoGalleryComponent } from '../shared/photo-gallery.component';

@Component({
  selector: 'pt-admin-pets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    DropdownModule,
    InputText,
    TextareaModule,
    SelectModule,
    MultiSelectModule,
    InputNumber,
    TagModule,
    ToastModule,
    Card,
    EditableSelectComponent,
    PhotoGalleryComponent,
  ],
  template: `
    <p-toast />
    <div class="pets-management">
      <div class="section-header">
        <h2>
          GestiÃ³n de Mascotas
        </h2>
        <div class="header-actions">
          <p-button
            label="Crear Ejemplos"
            icon="pi pi-database"
            (onClick)="createExamplePets()"
            [loading]="isCreatingExamples()"
            [disabled]="isCreatingExamples()"
            severity="secondary"
            [style]="{
              background: '#10b981',
              border: 'none',
              color: '#ffffff',
              fontWeight: 'bold',
              marginRight: '0.75rem'
            }"
          />
          <p-button
            label="Nueva Mascota"
            icon="pi pi-plus"
            (onClick)="openNewPetDialog()"
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
            <span class="stat-label">Total Mascotas</span>
            <span class="stat-value">{{ totalPets() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Disponibles</span>
            <span class="stat-value stat-available">{{ availablePets() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Adoptadas</span>
            <span class="stat-value stat-adopted">{{ adoptedPets() }}</span>
          </div>
        </div>
      </p-card>

      <p-card>
        <p-table
          [value]="filteredPets()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['name', 'species', 'foundation.name']"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <div class="search-controls">
                <input
                  type="text"
                  pInputText
                  placeholder="Buscar mascotas..."
                  (input)="onGlobalFilter($event)"
                  class="search-input"
                />
                <p-button
                  [label]="showAdvancedSearch() ? 'Ocultar Filtros' : 'BÃºsqueda Avanzada'"
                  [icon]="showAdvancedSearch() ? 'pi pi-filter-slash' : 'pi pi-filter'"
                  severity="secondary"
                  [text]="true"
                  (onClick)="toggleAdvancedSearch()"
                  [style]="{ marginLeft: '0.5rem' }"
                />
              </div>
              @if (showAdvancedSearch()) {
                <div class="advanced-search-panel">
                  <div class="advanced-filters">
                    <div class="filter-row">
                      <div class="filter-group">
                        <label>Especie</label>
                        <p-dropdown
                          [(ngModel)]="advancedFilters().species"
                          [options]="speciesFilterOptions"
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Todas"
                          [showClear]="true"
                          (onChange)="applyAdvancedFilters()"
                          [style]="{ width: '100%' }"
                        />
                      </div>
                      <div class="filter-group">
                        <label>GÃ©nero</label>
                        <p-dropdown
                          [(ngModel)]="advancedFilters().gender"
                          [options]="genderFilterOptions"
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Todos"
                          [showClear]="true"
                          (onChange)="applyAdvancedFilters()"
                          [style]="{ width: '100%' }"
                        />
                      </div>
                      <div class="filter-group">
                        <label>TamaÃ±o</label>
                        <p-dropdown
                          [(ngModel)]="advancedFilters().size"
                          [options]="sizeFilterOptions"
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Todos"
                          [showClear]="true"
                          (onChange)="applyAdvancedFilters()"
                          [style]="{ width: '100%' }"
                        />
                      </div>
                    </div>
                    <div class="filter-row">
                      <div class="filter-group">
                        <label>Edad MÃ­nima</label>
                        <p-inputNumber
                          [(ngModel)]="advancedFilters().minAge"
                          [min]="0"
                          [max]="20"
                          placeholder="0"
                          (onInput)="applyAdvancedFilters()"
                          [style]="{ width: '100%' }"
                        />
                      </div>
                      <div class="filter-group">
                        <label>Edad MÃ¡xima</label>
                        <p-inputNumber
                          [(ngModel)]="advancedFilters().maxAge"
                          [min]="0"
                          [max]="20"
                          placeholder="20"
                          (onInput)="applyAdvancedFilters()"
                          [style]="{ width: '100%' }"
                        />
                      </div>
                      <div class="filter-group">
                        <label>Personalidad</label>
                        <p-multiSelect
                          [(ngModel)]="advancedFilters().personality"
                          [options]="personalityOptions()"
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Seleccionar rasgos"
                          [showClear]="true"
                          (onChange)="applyAdvancedFilters()"
                          [style]="{ width: '100%' }"
                        />
                      </div>
                    </div>
                    <div class="filter-row">
                      <div class="filter-group">
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            [checked]="advancedFilters().is_vaccinated === true"
                            (change)="updateVaccinatedFilter($any($event.target).checked)"
                          />
                          <span>Solo vacunados</span>
                        </label>
                      </div>
                      <div class="filter-group">
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            [checked]="advancedFilters().is_sterilized === true"
                            (change)="updateSterilizedFilter($any($event.target).checked)"
                          />
                          <span>Solo esterilizados</span>
                        </label>
                      </div>
                      <div class="filter-group">
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            [checked]="advancedFilters().is_archived === true"
                            (change)="updateArchivedFilter($any($event.target).checked)"
                          />
                          <span>Incluir archivadas</span>
                        </label>
                      </div>
                    </div>
                    <div class="filter-actions">
                      <p-button
                        label="Limpiar Filtros"
                        severity="secondary"
                        [text]="true"
                        icon="pi pi-times"
                        (onClick)="clearAdvancedFilters()"
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Especie</th>
              <th>FundaciÃ³n</th>
              <th>Estado</th>
              <th>Edad</th>
              <th>GÃ©nero</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-pet>
            <tr>
              <td>{{ pet.name }}</td>
              <td>
                <span class="species-badge">{{
                  getSpeciesLabel(pet.species)
                }}</span>
              </td>
              <td>{{ pet.foundation?.name || 'Sin fundaciÃ³n' }}</td>
              <td>
                <p-tag
                  [value]="pet.is_available ? 'Disponible' : 'Adoptada'"
                  [severity]="pet.is_available ? 'success' : 'danger'"
                />
              </td>
              <td>{{ pet.age ? pet.age.toFixed(1) : 'N/A' }} aÃ±os</td>
              <td>{{ pet.gender === 'M' ? 'Macho' : 'Hembra' }}</td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    severity="info"
                    (onClick)="showPreview(pet)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Vista Previa"
                  />
                  <p-button
                    icon="pi pi-copy"
                    [text]="true"
                    severity="secondary"
                    (onClick)="duplicatePet(pet)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Duplicar"
                  />
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(pet)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="(pet.is_archived === true) ? 'pi pi-folder' : 'pi pi-save'"
                    [text]="true"
                    [severity]="(pet.is_archived === true) ? 'warn' : 'secondary'"
                    (onClick)="toggleArchive(pet)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="(pet.is_archived === true) ? 'Desarchivar' : 'Archivar'"
                  />
                  <p-button
                    [icon]="pet.is_available ? 'pi pi-check' : 'pi pi-times'"
                    [text]="true"
                    [severity]="pet.is_available ? 'success' : 'warn'"
                    (onClick)="toggleAvailability(pet)"
                    title="Cambiar Disponibilidad"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">No se encontraron mascotas</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar mascota -->
    <p-dialog
      [visible]="showPetDialog()"
      (visibleChange)="showPetDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [header]="editingPet() ? 'Editar Mascota' : 'Nueva Mascota'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="savePet()" class="pet-form">
        <div class="form-group">
          <label for="name">Nombre *</label>
          <input
            id="name"
            type="text"
            pInputText
            [(ngModel)]="petForm.name"
            name="name"
            required
            [disabled]="isLoading()"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="species">Especie *</label>
            <pt-editable-select
              id="species"
              name="species"
              [selectedValue]="petForm.species || null"
              (valueChange)="onSpeciesChange($event)"
              [options]="speciesOptions()"
              (optionsChange)="speciesOptions.set($event)"
              placeholder="Seleccionar especie"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>

          <div class="form-group">
            <label for="gender">GÃ©nero *</label>
            <pt-editable-select
              id="gender"
              name="gender"
              [selectedValue]="petForm.gender || null"
              (valueChange)="onGenderChange($event)"
              [options]="genderOptions()"
              (optionsChange)="genderOptions.set($event)"
              placeholder="Seleccionar gÃ©nero"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="size">TamaÃ±o *</label>
            <pt-editable-select
              id="size"
              name="size"
              [selectedValue]="petForm.size || null"
              (valueChange)="onSizeChange($event)"
              [options]="sizeOptions()"
              (optionsChange)="sizeOptions.set($event)"
              placeholder="Seleccionar tamaÃ±o"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>

          <div class="form-group">
            <label for="age">Edad (aÃ±os)</label>
            <input
              id="age"
              type="number"
              pInputText
              [(ngModel)]="petForm.age"
              name="age"
              step="0.1"
              min="0"
              [disabled]="isLoading()"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="weight">Peso (Kg)</label>
            <input
              id="weight"
              type="number"
              pInputText
              [(ngModel)]="petForm.weight"
              name="weight"
              step="0.1"
              min="0"
              placeholder="Ej: 15"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label for="foundation_id">FundaciÃ³n *</label>
            <p-select
              id="foundation_id"
              name="foundation_id"
              [(ngModel)]="petForm.foundation_id"
              [options]="foundations()"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccionar fundaciÃ³n"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="breed">Raza</label>
            <input
              id="breed"
              type="text"
              pInputText
              [(ngModel)]="petForm.breed"
              name="breed"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-group">
            <label for="color">Color</label>
            <input
              id="color"
              type="text"
              pInputText
              [(ngModel)]="petForm.color"
              name="color"
              placeholder="Ej: Negro, Blanco, MarrÃ³n"
              [disabled]="isLoading()"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="description">DescripciÃ³n</label>
          <textarea
            id="description"
            pTextarea
            [(ngModel)]="petForm.description"
            name="description"
            [rows]="4"
            [disabled]="isLoading()"
            placeholder="Describe la personalidad, comportamiento y caracterÃ­sticas especiales de la mascota..."
            class="pet-description-textarea"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="personality">Personalidad</label>
          <p-multiSelect
            id="personality"
            name="personality"
            [(ngModel)]="petForm.personality"
            [options]="personalityOptions()"
            placeholder="Seleccione una o mÃ¡s opciones..."
            [displaySelectedLabel]="true"
            [maxSelectedLabels]="3"
            [showToggleAll]="false"
            [disabled]="isLoading()"
            styleClass="w-full"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="health_status">Estado de Salud</label>
            <pt-editable-select
              id="health_status"
              name="health_status"
              [selectedValue]="petForm.health_status || null"
              (valueChange)="petForm.health_status = $event || undefined"
              [options]="healthStatusOptions()"
              (optionsChange)="healthStatusOptions.set($event)"
              placeholder="Seleccionar estado de salud"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>

          <div class="form-group">
            <label for="location_type">En (Tipo de UbicaciÃ³n)</label>
            <pt-editable-select
              id="location_type"
              name="location_type"
              [selectedValue]="petForm.location_type || null"
              (valueChange)="petForm.location_type = $event || undefined"
              [options]="locationTypeOptions()"
              (optionsChange)="locationTypeOptions.set($event)"
              placeholder="Seleccionar tipo"
              [disabled]="isLoading()"
              styleClass="w-full"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="location_detail">UbicaciÃ³n EspecÃ­fica</label>
          <input
            id="location_detail"
            type="text"
            pInputText
            [(ngModel)]="petForm.location_detail"
            name="location_detail"
            placeholder="Ej: ME ENCUENTRO EN LA SEDE DE LAS VILLAS"
            [disabled]="isLoading()"
          />
          <small class="form-hint">
            Este texto se mostrarÃ¡ en la tarjeta de la mascota con el Ã­cono âž•
          </small>
        </div>

        <div class="form-group">
          <pt-photo-gallery
            [initialPhotos]="petForm.photos || []"
            [maxPhotos]="10"
            [folder]="'pets'"
            [autoUpload]="true"
            (photosChange)="onPhotosChange($event)"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="petForm.is_vaccinated"
                name="is_vaccinated"
                [disabled]="isLoading()"
              />
              <span>Vacunado</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="petForm.is_sterilized"
                name="is_sterilized"
                [disabled]="isLoading()"
              />
              <span>Esterilizado</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [(ngModel)]="petForm.is_available"
                name="is_available"
                [disabled]="isLoading()"
              />
              <span>Disponible para adopciÃ³n</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [checked]="!petForm.is_available"
                name="is_adopted"
                [disabled]="isLoading()"
                (change)="onAdoptedChange($event)"
              />
              <span>Marcar como adoptado</span>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingPet() ? 'Actualizar' : 'Crear'"
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

    <!-- Dialog para vista previa de mascota -->
    <p-dialog
      [visible]="showPreviewDialog()"
      (visibleChange)="showPreviewDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '700px' }"
      header="Vista Previa de Mascota"
      [draggable]="false"
      [resizable]="false"
    >
      @if (previewPet()) {
        <div class="pet-preview">
          <div class="preview-header">
            <h2>{{ previewPet()!.name }}</h2>
            <p-tag
              [value]="previewPet()!.is_available ? 'Disponible' : 'Adoptada'"
              [severity]="previewPet()!.is_available ? 'success' : 'danger'"
            />
          </div>

          @if (previewPet()!.photos && previewPet()!.photos!.length > 0) {
            <div class="preview-photos">
              <img
                [src]="previewPet()!.photos![0]"
                [alt]="previewPet()!.name"
                class="preview-main-photo"
              />
            </div>
          }

          <div class="preview-details">
            <div class="preview-section">
              <h3>InformaciÃ³n BÃ¡sica</h3>
              <div class="preview-grid">
                <div class="preview-item">
                  <strong>Especie:</strong> {{ getSpeciesLabel(previewPet()!.species) }}
                </div>
                <div class="preview-item">
                  <strong>GÃ©nero:</strong> {{ previewPet()!.gender === 'M' ? 'Macho' : 'Hembra' }}
                </div>
                <div class="preview-item">
                  <strong>TamaÃ±o:</strong> {{ getSizeLabel(previewPet()!.size) }}
                </div>
                <div class="preview-item">
                  <strong>Edad:</strong> {{ formatAge(previewPet()?.age) }}
                </div>
                @if (previewPet()!.breed) {
                  <div class="preview-item">
                    <strong>Raza:</strong> {{ previewPet()!.breed }}
                  </div>
                }
                @if (previewPet()!.color) {
                  <div class="preview-item">
                    <strong>Color:</strong> {{ previewPet()!.color }}
                  </div>
                }
                @if (previewPet()!.weight) {
                  <div class="preview-item">
                    <strong>Peso:</strong> {{ previewPet()!.weight }} kg
                  </div>
                }
                <div class="preview-item">
                  <strong>FundaciÃ³n:</strong> {{ previewPet()!.foundation?.name || 'Sin fundaciÃ³n' }}
                </div>
              </div>
            </div>

            @if (previewPet()!.description) {
              <div class="preview-section">
                <h3>DescripciÃ³n</h3>
                <p class="preview-item">{{ previewPet()!.description }}</p>
              </div>
            }

            @if (previewPet()!.personality && previewPet()!.personality!.length > 0) {
              <div class="preview-section">
                <h3>Personalidad</h3>
                <div class="preview-personality">
                  @for (trait of previewPet()!.personality; track trait) {
                    <span class="personality-badge">{{ getPersonalityLabel(trait) }}</span>
                  }
                </div>
              </div>
            }

            <div class="preview-section">
              <h3>Estado de Salud</h3>
              <div class="preview-grid">
                <div class="preview-item">
                  <strong>Estado:</strong> {{ previewPet()!.health_status || 'No especificado' }}
                </div>
                <div class="preview-item">
                  <strong>Vacunado:</strong> {{ previewPet()!.is_vaccinated ? 'SÃ­' : 'No' }}
                </div>
                <div class="preview-item">
                  <strong>Esterilizado:</strong> {{ previewPet()!.is_sterilized ? 'SÃ­' : 'No' }}
                </div>
              </div>
            </div>

            @if (previewPet()!.location_type || previewPet()!.location_detail) {
              <div class="preview-section">
                <h3>UbicaciÃ³n</h3>
                <div class="preview-grid">
                  @if (previewPet()!.location_type) {
                    <div class="preview-item">
                      <strong>Tipo:</strong> {{ previewPet()!.location_type }}
                    </div>
                  }
                  @if (previewPet()!.location_detail) {
                    <div class="preview-item">
                      <strong>Detalle:</strong> {{ previewPet()!.location_detail }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </p-dialog>
  `,
  styles: [
    `
      .pets-management {
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

      .stat-available {
        color: #10b981;
      }

      .stat-adopted {
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
      }

      .search-input {
        flex: 1;
        max-width: 300px;
      }

      .advanced-search-panel {
        margin-top: 1rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .advanced-filters {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .filter-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-group label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #000000;
      }

      .filter-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.5rem;
      }

      .pet-preview {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .preview-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .preview-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
        margin: 0;
        flex: 1;
      }

      .preview-photos {
        width: 100%;
        max-height: 400px;
        overflow: hidden;
        border-radius: 0.5rem;
      }

      .preview-main-photo {
        width: 100%;
        height: auto;
        object-fit: cover;
        border-radius: 0.5rem;
      }

      .preview-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .preview-section {
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .preview-section:last-child {
        border-bottom: none;
      }

      .preview-section h3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #000000;
        margin: 0 0 0.75rem 0;
      }

      .preview-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .preview-item {
        font-size: 0.875rem;
        color: #374151;
      }

      .preview-item strong {
        color: #000000;
        font-weight: 600;
      }

      .preview-personality {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .personality-badge {
        padding: 0.375rem 0.75rem;
        background: rgba(251, 191, 36, 0.15);
        color: #6b7280;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      .preview-health {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      /* Asegurar que las celdas de la tabla no se mezclen */
      ::ng-deep .p-datatable tbody td {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.75rem;
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

      .pet-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
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

      ::ng-deep .pet-description-textarea {
        min-height: 120px !important;
        height: auto !important;
        overflow-y: auto !important;
        resize: vertical;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .checkbox-label input[type='checkbox'] {
        cursor: pointer;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      /* Asegurar que las tablas no se desborden */
      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      /* Asegurar que los diÃ¡logos no se sobrepongan */
      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
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

        .filter-row {
          grid-template-columns: 1fr;
        }

        .preview-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminPetsComponent {
  private messageService = inject(MessageService);
  public petsStore = inject(PetsStore);
  public foundationsStore = inject(FoundationsStore);
  public personalityTraitsStore = inject(PersonalityTraitsStore);
  
  constructor() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-pets.component.ts:1024',message:'AdminPetsComponent constructor',data:{petsCount:this.petsStore.entities().length,foundationsCount:this.foundationsStore.entities().length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
  }

  public showPetDialog = signal(false);
  public editingPet = signal<Pet | null>(null);
  public isLoading = signal(false);
  public isCreatingExamples = signal(false);
  public globalFilter = signal('');
  public showPreviewDialog = signal(false);
  public previewPet = signal<Pet | null>(null);
  public showAdvancedSearch = signal(false);
  public advancedFilters = signal({
    species: null as string | null,
    gender: null as string | null,
    size: null as string | null,
    minAge: null as number | null,
    maxAge: null as number | null,
    personality: [] as string[],
    is_vaccinated: null as boolean | null,
    is_sterilized: null as boolean | null,
    is_archived: null as boolean | null,
  });

  public petForm: Partial<Pet> = {
    name: '',
    species: 'dog',
    gender: 'M',
    size: 'medium',
    age: undefined,
    breed: '',
    color: '',
    weight: undefined,
    description: '',
    health_status: '',
    location_type: '',
    location_detail: '',
    foundation_id: '',
    photos: [],
    personality: [],
    is_vaccinated: false,
    is_sterilized: false,
    is_available: true,
  };

  public speciesOptions = signal<EditableOption[]>([
    { label: 'Perro', value: 'dog' },
    { label: 'Gato', value: 'cat' },
    { label: 'Otro', value: 'other' },
  ]);

  public genderOptions = signal<EditableOption[]>([
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ]);

  public sizeOptions = signal<EditableOption[]>([
    { label: 'PequeÃ±o', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ]);

  public locationTypeOptions = signal<EditableOption[]>([
    { label: 'Tienda', value: 'Tienda' },
    { label: 'Sede', value: 'Sede' },
    { label: 'Hogar temporal', value: 'Hogar temporal' },
    { label: 'Refugio', value: 'Refugio' },
    { label: 'Otro', value: 'Otro' },
  ]);

  public healthStatusOptions = signal<EditableOption[]>([
    { label: 'Saludable', value: 'Saludable' },
    { label: 'En tratamiento', value: 'En tratamiento' },
    { label: 'Necesita atenciÃ³n especial', value: 'Necesita atenciÃ³n especial' },
    { label: 'RecuperaciÃ³n', value: 'RecuperaciÃ³n' },
  ]);

  public personalityOptions = computed(() => {
    return this.personalityTraitsStore.activeTraits().map((trait) => ({
      label: trait.label,
      value: trait.value,
    }));
  });

  public foundations = computed(() => this.foundationsStore.entities());

  public totalPets = computed(() => this.petsStore.entities().length);
  public availablePets = computed(
    () => this.petsStore.entities().filter((p) => p.is_available).length
  );
  public adoptedPets = computed(
    () => this.petsStore.entities().filter((p) => !p.is_available).length
  );

  getSpeciesLabel(species: string): string {
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

  public getPersonalityLabel(value: string): string {
    const trait = this.personalityTraitsStore
      .entities()
      .find((t) => t.value === value);
    return trait ? trait.label : value;
  }

  public filteredPets = computed(() => {
    let pets = this.petsStore.entities();
    const filters = this.advancedFilters();
    const search = this.globalFilter().toLowerCase();

    // Filtrar por bÃºsqueda de texto
    if (search) {
      pets = pets.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.species.toLowerCase().includes(search) ||
          p.foundation?.name?.toLowerCase().includes(search) ||
          p.breed?.toLowerCase().includes(search)
      );
    }

    // Filtros avanzados
    if (filters.species) {
      pets = pets.filter((p) => p.species === filters.species);
    }
    if (filters.gender) {
      pets = pets.filter((p) => p.gender === filters.gender);
    }
    if (filters.size) {
      pets = pets.filter((p) => p.size === filters.size);
    }
    if (filters.minAge !== null) {
      pets = pets.filter((p) => (p.age || 0) >= filters.minAge!);
    }
    if (filters.maxAge !== null) {
      pets = pets.filter((p) => (p.age || 0) <= filters.maxAge!);
    }
    if (filters.personality.length > 0) {
      pets = pets.filter((p) =>
        filters.personality.some((trait) => p.personality?.includes(trait))
      );
    }
    if (filters.is_vaccinated !== null) {
      pets = pets.filter((p) => p.is_vaccinated === filters.is_vaccinated);
    }
    if (filters.is_sterilized !== null) {
      pets = pets.filter((p) => p.is_sterilized === filters.is_sterilized);
    }
    // Si is_archived es false (checkbox desmarcado), excluir archivadas
    // Si es true (checkbox marcado), incluir todas (no filtrar)
    // Si es null, no filtrar
    if (filters.is_archived === false) {
      pets = pets.filter((p) => !p.is_archived);
    } else if (filters.is_archived === true) {
      // Incluir todas, no filtrar
    }

    return pets;
  });

  public speciesFilterOptions = [
    { label: 'Perro', value: 'dog' },
    { label: 'Gato', value: 'cat' },
    { label: 'Otro', value: 'other' },
  ];

  public genderFilterOptions = [
    { label: 'Macho', value: 'M' },
    { label: 'Hembra', value: 'F' },
  ];

  public sizeFilterOptions = [
    { label: 'PequeÃ±o', value: 'small' },
    { label: 'Mediano', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ];

  public toggleAdvancedSearch(): void {
    this.showAdvancedSearch.set(!this.showAdvancedSearch());
  }

  public applyAdvancedFilters(): void {
    // Los filtros se aplican automÃ¡ticamente a travÃ©s del computed filteredPets
  }

  public updateVaccinatedFilter(checked: boolean): void {
    this.advancedFilters.set({
      ...this.advancedFilters(),
      is_vaccinated: checked ? true : null,
    });
  }

  public updateSterilizedFilter(checked: boolean): void {
    this.advancedFilters.set({
      ...this.advancedFilters(),
      is_sterilized: checked ? true : null,
    });
  }

  public updateArchivedFilter(checked: boolean): void {
    this.advancedFilters.set({
      ...this.advancedFilters(),
      is_archived: checked ? true : false,
    });
  }

  public clearAdvancedFilters(): void {
    this.advancedFilters.set({
      species: null,
      gender: null,
      size: null,
      minAge: null,
      maxAge: null,
      personality: [],
      is_vaccinated: null,
      is_sterilized: null,
      is_archived: null,
    });
  }

  public duplicatePet(pet: Pet): void {
    const duplicated: Partial<Pet> = {
      name: `${pet.name} (Copia)`,
      species: pet.species,
      gender: pet.gender,
      size: pet.size,
      age: pet.age,
      breed: pet.breed,
      color: pet.color,
      weight: pet.weight,
      description: pet.description,
      health_status: pet.health_status,
      location_type: pet.location_type,
      location_detail: pet.location_detail,
      foundation_id: pet.foundation_id,
      photos: pet.photos ? [...pet.photos] : [],
      personality: pet.personality ? [...pet.personality] : [],
      is_vaccinated: pet.is_vaccinated,
      is_sterilized: pet.is_sterilized,
      is_available: false, // Por defecto no disponible hasta que se edite
      is_archived: false,
    };

    this.isLoading.set(true);
    this.petsStore.createItem(duplicated as Pet).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Mascota duplicada',
          detail: 'La mascota se ha duplicado correctamente. Puedes editarla ahora.',
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error al duplicar mascota:', error);
        const errorMessage = error.error?.message || error.message || 'No se pudo duplicar la mascota';
        const errorDetails = error.error?.details || error.error?.hint || '';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        });
        this.isLoading.set(false);
      },
    });
  }

  public toggleArchive(pet: Pet): void {
    this.isLoading.set(true);
    const updated: Pet = {
      ...pet,
      is_archived: !pet.is_archived,
    };

    this.petsStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `La mascota ahora estÃ¡ ${updated.is_archived ? 'archivada' : 'desarchivada'}`,
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error al archivar/desarchivar mascota:', error);
        const errorMessage = error.error?.message || error.message || 'No se pudo actualizar el estado';
        const errorDetails = error.error?.details || error.error?.hint || '';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        });
        this.isLoading.set(false);
      },
    });
  }

  public showPreview(pet: Pet): void {
    this.previewPet.set(pet);
    this.showPreviewDialog.set(true);
  }

  public formatAge(age: number | undefined | null): string {
    if (age == null) {
      return 'N/A';
    }
    return age.toFixed(1) + ' aÃ±os';
  }

  onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  createExamplePets(): void {
    this.isCreatingExamples.set(true);
    
    const foundationsList = this.foundations();
    let foundationId: string;

    if (foundationsList.length === 0) {
      const exampleFoundation: Partial<Foundation> = {
        name: 'FundaciÃ³n Black Dog',
        description: 'FundaciÃ³n dedicada al rescate y adopciÃ³n de mascotas',
        address: 'PanamÃ¡, Ciudad de PanamÃ¡',
        phone_number: '+507 1234-5678',
        email: 'contacto@blackdogpanama.com',
        website: 'https://blackdogpanama.com',
        is_active: true,
      };

      this.foundationsStore.createItem(exampleFoundation as Foundation).subscribe({
        next: (foundations) => {
          foundationId = foundations[0].id;
          this.createPetsWithFoundation(foundationId);
        },
        error: (error: any) => {
          this.isCreatingExamples.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la fundaciÃ³n de ejemplo: ' + (error.message || 'Error desconocido'),
          });
        },
      });
      return;
    }

    foundationId = foundationsList[0].id;
    this.createPetsWithFoundation(foundationId);
  }

  private createPetsWithFoundation(foundationId: string): void {
    const examplePet1: Partial<Pet> = {
      name: 'Max',
      species: 'dog',
      gender: 'M',
      size: 'large',
      age: 3.5,
      breed: 'Labrador Retriever',
      color: 'Dorado',
      weight: 28.5,
      description:
        'Max es un perro muy amigable y juguetÃ³n. Le encanta estar con niÃ±os y es muy obediente. Tiene mucha energÃ­a y necesita ejercicio diario. Es perfecto para familias activas.',
      health_status: 'Saludable',
      location_type: 'Sede',
      location_detail: 'ME ENCUENTRO EN LA SEDE DE LAS VILLAS',
      foundation_id: foundationId,
      photos: [
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
      ],
      is_vaccinated: true,
      is_sterilized: true,
      is_available: true,
    };

    const examplePet2: Partial<Pet> = {
      name: 'Luna',
      species: 'cat',
      gender: 'F',
      size: 'small',
      age: 2.0,
      breed: 'Persa',
      color: 'Blanco y Gris',
      weight: 4.2,
      description:
        'Luna es una gata muy cariÃ±osa y tranquila. Le encanta acurrucarse y recibir mimos. Es perfecta para personas que buscan una compaÃ±era tranquila. Se lleva bien con otros gatos.',
      health_status: 'En tratamiento',
      location_type: 'Tienda',
      location_detail: 'Tienda Principal - Ãrea de adopciones',
      foundation_id: foundationId,
      photos: [
        'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800',
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
        'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=800',
      ],
      is_vaccinated: true,
      is_sterilized: true,
      is_available: true,
    };

    let completed = 0;
    const total = 2;

    const handleComplete = () => {
      completed++;
      if (completed === total) {
        this.isCreatingExamples.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Ejemplos creados',
          detail: 'Se han creado 2 mascotas de ejemplo con todos los datos',
        });
      }
    };

    const handleError = (error: any) => {
      console.error('âŒ [AdminPets] Error al crear mascota:', error);
      const errorMessage = error.error?.message || error.message || 'No se pudo crear la mascota de ejemplo';
      const errorDetails = error.error?.details || error.error?.hint || '';
      this.messageService.add({
        severity: 'error',
        summary: 'Error al crear mascota',
        detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
      });
      completed++;
      if (completed === total) {
        this.isCreatingExamples.set(false);
      }
    };

    this.petsStore.createItem(examplePet1 as Pet).subscribe({
      next: handleComplete,
      error: handleError,
    });

    this.petsStore.createItem(examplePet2 as Pet).subscribe({
      next: handleComplete,
      error: handleError,
    });
  }

  openNewPetDialog(): void {
    this.editingPet.set(null);
    this.resetForm();
    this.showPetDialog.set(true);
  }

  openEditDialog(pet: Pet): void {
    this.editingPet.set(pet);
    this.petForm = {
      name: pet.name,
      species: pet.species,
      gender: pet.gender,
      size: pet.size,
      age: pet.age,
      breed: pet.breed || '',
      color: pet.color || '',
      weight: pet.weight,
      description: pet.description || '',
      health_status: pet.health_status || '',
      location_type: pet.location_type || '',
      location_detail: pet.location_detail || '',
      foundation_id: pet.foundation_id,
      photos: pet.photos ? [...pet.photos] : [],
      personality: pet.personality ? [...pet.personality] : [],
      is_vaccinated: pet.is_vaccinated,
      is_sterilized: pet.is_sterilized,
      is_available: pet.is_available,
      is_archived: pet.is_archived || false,
    };
    this.showPetDialog.set(true);
  }

  resetForm(): void {
    this.petForm = {
      name: '',
      species: 'dog',
      gender: 'M',
      size: 'medium',
      age: undefined,
      breed: '',
      color: '',
      weight: undefined,
      description: '',
      health_status: '',
      location_type: '',
      location_detail: '',
      foundation_id: '',
      photos: [],
      personality: [],
      is_vaccinated: false,
      is_sterilized: false,
      is_available: true,
      is_archived: false,
    };
    this.editingPet.set(null);
    this.showPetDialog.set(false);
  }

  onAdoptedChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.petForm.is_available = !target.checked;
  }

  savePet(): void {
    if (
      !this.petForm.name ||
      !this.petForm.species ||
      !this.petForm.foundation_id
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const pet = this.editingPet();
    if (pet) {
      const validFields: Partial<Pet> = {
        id: pet.id,
        name: this.petForm.name,
        species: this.petForm.species,
        gender: this.petForm.gender,
        size: this.petForm.size,
        age: this.petForm.age,
        breed: this.petForm.breed || undefined,
        color: this.petForm.color || undefined,
        weight: this.petForm.weight,
        description: this.petForm.description || undefined,
        health_status: this.petForm.health_status || undefined,
        location_type: this.petForm.location_type || undefined,
        location_detail: this.petForm.location_detail || undefined,
        foundation_id: this.petForm.foundation_id,
        photos: this.petForm.photos && this.petForm.photos.length > 0 ? this.petForm.photos : undefined,
        personality: this.petForm.personality && this.petForm.personality.length > 0 ? this.petForm.personality : undefined,
        is_vaccinated: this.petForm.is_vaccinated,
        is_sterilized: this.petForm.is_sterilized,
        is_available: this.petForm.is_available,
        is_archived: this.petForm.is_archived || false,
      };
      
      this.petsStore
        .editItem(validFields as Pet)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Mascota actualizada',
              detail: 'La mascota se ha actualizado correctamente',
            });
            this.resetForm();
            this.isLoading.set(false);
          },
          error: (error: any) => {
            console.error('Error al actualizar mascota:', error);
            const errorMessage = error.error?.message || error.message || 'No se pudo actualizar la mascota';
            const errorDetails = error.error?.details || error.error?.hint || '';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
            });
            this.isLoading.set(false);
          },
        });
    } else {
      const validFields: Partial<Pet> = {
        name: this.petForm.name,
        species: this.petForm.species,
        gender: this.petForm.gender,
        size: this.petForm.size,
        age: this.petForm.age,
        breed: this.petForm.breed || undefined,
        color: this.petForm.color || undefined,
        weight: this.petForm.weight,
        description: this.petForm.description || undefined,
        health_status: this.petForm.health_status || undefined,
        location_type: this.petForm.location_type || undefined,
        location_detail: this.petForm.location_detail || undefined,
        foundation_id: this.petForm.foundation_id,
        photos: this.petForm.photos && this.petForm.photos.length > 0 ? this.petForm.photos : undefined,
        personality: this.petForm.personality && this.petForm.personality.length > 0 ? this.petForm.personality : undefined,
        is_vaccinated: this.petForm.is_vaccinated,
        is_sterilized: this.petForm.is_sterilized,
        is_available: this.petForm.is_available,
        is_archived: this.petForm.is_archived || false,
      };
      
      this.petsStore.createItem(validFields as Pet).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Mascota creada',
            detail: 'La mascota se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error al crear mascota:', error);
          const errorMessage = error.error?.message || error.message || 'No se pudo crear la mascota';
          const errorDetails = error.error?.details || error.error?.hint || '';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  toggleAvailability(pet: Pet): void {
    this.isLoading.set(true);

    this.petsStore
      .editItem({
        ...pet,
        is_available: !pet.is_available,
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Estado actualizado',
            detail: `La mascota ahora estÃ¡ ${
              pet.is_available ? 'adoptada' : 'disponible'
            }`,
          });
          this.isLoading.set(false);
        },
      error: (error: any) => {
        console.error('Error al cambiar disponibilidad:', error);
        const errorMessage = error.error?.message || error.message || 'No se pudo actualizar el estado';
        const errorDetails = error.error?.details || error.error?.hint || '';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        });
        this.isLoading.set(false);
      },
      });
  }

  onSpeciesChange(value: string | null): void {
    if (!value) {
      this.petForm.species = undefined;
      return;
    }
    const validSpecies: ('dog' | 'cat' | 'other')[] = ['dog', 'cat', 'other'];
    if (validSpecies.includes(value as 'dog' | 'cat' | 'other')) {
      this.petForm.species = value as 'dog' | 'cat' | 'other';
    } else {
      this.petForm.species = 'dog';
    }
  }

  onGenderChange(value: string | null): void {
    if (!value) {
      this.petForm.gender = 'M';
      return;
    }
    this.petForm.gender = (value === 'F' ? 'F' : 'M') as 'M' | 'F';
  }

  onSizeChange(value: string | null): void {
    if (!value) {
      this.petForm.size = 'medium';
      return;
    }
    const validSizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    if (validSizes.includes(value as 'small' | 'medium' | 'large')) {
      this.petForm.size = value as 'small' | 'medium' | 'large';
    } else {
      this.petForm.size = 'medium';
    }
  }

  onPhotosChange(photos: string[]): void {
    this.petForm.photos = photos;
  }
}





