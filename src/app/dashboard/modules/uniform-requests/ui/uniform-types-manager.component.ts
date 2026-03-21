import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SCOPE_LABELS, UniformTypeScope, UniformTypesService } from '../data/uniform-types.service';

@Component({
  selector: 'pt-uniform-types-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    TooltipModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="space-y-3">
      <div
        class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/60 rounded-lg border border-neutral-700/50 backdrop-blur-sm overflow-hidden"
      >
        <!-- Header + Add -->
        <div class="p-3 border-b border-neutral-700/50 flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-white m-0 flex items-center gap-1.5">
            <i class="pi pi-list text-teal-400 text-sm"></i>
            Catálogo de Tipos de Uniforme
          </h3>
          <div class="flex items-center gap-2 flex-wrap">
            <input
              pInputText
              [(ngModel)]="newTypeName"
              placeholder="Nombre de la prenda..."
              class="text-sm"
              style="height: 32px; padding: 0 0.5rem; min-width: 160px;"
              (keyup.enter)="addType()"
            />
            <div style="min-width: 160px;">
              <p-select
                [(ngModel)]="newTypeScope"
                [options]="scopeOptions"
                optionLabel="label"
                optionValue="value"
                styleClass="w-full text-sm"
                appendTo="body"
              />
            </div>
            <p-button
              icon="pi pi-plus"
              label="Agregar"
              size="small"
              [disabled]="!newTypeName().trim() || saving()"
              [loading]="saving()"
              (onClick)="addType()"
            />
          </div>
        </div>

        @if (service.isLoading()) {
        <div class="flex justify-center py-8">
          <p-progressSpinner />
        </div>
        } @else if (service.all().length === 0) {
        <div class="text-center py-8">
          <i class="pi pi-list text-gray-400 text-4xl mb-3"></i>
          <p class="text-gray-400">No hay tipos de uniforme. Agrega el primero.</p>
        </div>
        } @else {
        <p-table
          [value]="service.all()"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="padding: 0.4rem; text-align: left;">
                <span class="text-xs">Nombre</span>
              </th>
              <th style="width: 180px; padding: 0.4rem; text-align: center;">
                <span class="text-xs">Aplica a</span>
              </th>
              <th style="width: 90px; padding: 0.4rem; text-align: center;">
                <span class="text-xs">Estado</span>
              </th>
              <th style="width: 130px; padding: 0.4rem; text-align: center;">
                <span class="text-xs">Acciones</span>
              </th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-type>
            <tr class="hover:bg-neutral-700/30 transition-colors">
              <td style="padding: 0.4rem;">
                @if (editingId() === type.id) {
                <input
                  pInputText
                  [(ngModel)]="editName"
                  class="text-sm w-full"
                  style="height: 28px; padding: 0 0.5rem;"
                  (keyup.enter)="saveEdit(type.id)"
                  (keyup.escape)="cancelEdit()"
                />
                } @else {
                <span class="text-sm text-white">{{ type.name }}</span>
                }
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                @if (editingId() === type.id) {
                <p-select
                  [(ngModel)]="editScope"
                  [options]="scopeOptions"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="text-xs w-full"
                  appendTo="body"
                />
                } @else {
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  [class]="getScopeClass(type.scope)"
                >
                  {{ getScopeLabel(type.scope) }}
                </span>
                }
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <p-tag
                  [value]="type.is_active ? 'Activo' : 'Inactivo'"
                  [severity]="type.is_active ? 'success' : 'secondary'"
                  class="text-xs"
                />
              </td>
              <td style="padding: 0.4rem; text-align: center;">
                <div class="flex gap-0.5 justify-center">
                  @if (editingId() === type.id) {
                  <p-button
                    icon="pi pi-check"
                    [text]="true"
                    severity="success"
                    size="small"
                    [rounded]="true"
                    pTooltip="Guardar"
                    tooltipPosition="top"
                    (onClick)="saveEdit(type.id)"
                  />
                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    [rounded]="true"
                    pTooltip="Cancelar"
                    tooltipPosition="top"
                    (onClick)="cancelEdit()"
                  />
                  } @else {
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    size="small"
                    [rounded]="true"
                    pTooltip="Editar"
                    tooltipPosition="top"
                    (onClick)="startEdit(type.id, type.name, type.scope)"
                  />
                  <p-button
                    [icon]="type.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="type.is_active ? 'warn' : 'success'"
                    size="small"
                    [rounded]="true"
                    [pTooltip]="type.is_active ? 'Desactivar' : 'Activar'"
                    tooltipPosition="top"
                    (onClick)="toggleActive(type.id, type.is_active)"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        }
      </div>
    </div>
  `,
})
export class UniformTypesManagerComponent {
  public service = inject(UniformTypesService);
  private messageService = inject(MessageService);

  public scopeOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Solo Oficina Central', value: 'office' },
    { label: 'Solo Sucursales', value: 'branch' },
  ];

  public newTypeName = signal('');
  public newTypeScope = signal<UniformTypeScope>('all');
  public saving = signal(false);
  public editingId = signal<string | null>(null);
  public editName = '';
  public editScope: UniformTypeScope = 'all';

  public getScopeLabel(scope: UniformTypeScope): string {
    return SCOPE_LABELS[scope] ?? 'Todos';
  }

  public getScopeClass(scope: UniformTypeScope): string {
    if (scope === 'office') return 'bg-purple-500/20 text-purple-300';
    if (scope === 'branch') return 'bg-blue-500/20 text-blue-300';
    return 'bg-neutral-600/40 text-gray-300';
  }

  public async addType(): Promise<void> {
    const name = this.newTypeName().trim();
    if (!name) return;
    this.saving.set(true);
    try {
      await this.service.create(name, this.newTypeScope());
      this.newTypeName.set('');
      this.newTypeScope.set('all');
      this.messageService.add({
        severity: 'success',
        summary: 'Agregado',
        detail: `"${name}" agregado al catálogo`,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo agregar el tipo de uniforme',
      });
    } finally {
      this.saving.set(false);
    }
  }

  public startEdit(id: string, name: string, scope: UniformTypeScope): void {
    this.editingId.set(id);
    this.editName = name;
    this.editScope = scope;
  }

  public cancelEdit(): void {
    this.editingId.set(null);
    this.editName = '';
  }

  public async saveEdit(id: string): Promise<void> {
    const name = this.editName.trim();
    if (!name) return;
    try {
      await this.service.update(id, { name, scope: this.editScope });
      this.editingId.set(null);
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Prenda actualizada correctamente',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar',
      });
    }
  }

  public async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      await this.service.toggleActive(id, !isActive);
      this.messageService.add({
        severity: 'info',
        summary: isActive ? 'Desactivado' : 'Activado',
        detail: isActive ? 'El tipo fue desactivado' : 'El tipo fue activado',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cambiar el estado',
      });
    }
  }
}
