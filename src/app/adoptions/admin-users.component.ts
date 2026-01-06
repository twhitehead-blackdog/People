import { CommonModule } from '@angular/common';
import { , ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { AdminUser } from '../models';
import { AdminUsersStore } from '../stores/admin-users.store';

@Component({
  selector: 'pt-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    TableModule,
    DialogModule,
    InputText,
    DropdownModule,
    TagModule,
    ToastModule,
    Card,
    CheckboxModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="users-container">
      <div class="section-header">
        <h2>GestiÃ³n de Usuarios Administradores</h2>
        <p-button
          label="Nuevo Usuario"
          icon="pi pi-plus"
          (onClick)="openNewUserDialog()"
          [style]="{
            background: '#fbbf24',
            border: 'none',
            color: '#000000',
            fontWeight: 'bold'
          }"
        />
      </div>

      <p-card>
        <p-table
          [value]="usersStore.entities()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          [globalFilterFields]="['email', 'full_name', 'role']"
          styleClass="p-datatable-striped"
          [loading]="usersStore.isLoading()"
          [sortField]="'created_at'"
          [sortOrder]="-1"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <input
                type="text"
                pInputText
                placeholder="Buscar usuarios..."
                (input)="onGlobalFilter($event)"
                class="search-input"
              />
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Ãšltimo Acceso</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-user>
            <tr>
              <td>
                <div class="table-cell-content user-info">
                  @if (user.avatar_url) {
                    <img [src]="user.avatar_url" [alt]="user.full_name" class="user-avatar" />
                  } @else {
                    <div class="user-avatar-placeholder">{{ user.full_name.charAt(0).toUpperCase() }}</div>
                  }
                  <span>{{ user.full_name }}</span>
                </div>
              </td>
              <td><div class="table-cell-content">{{ user.email }}</div></td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="getRoleLabel(user.role)"
                    [severity]="getRoleSeverity(user.role)"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  <p-tag
                    [value]="user.is_active ? 'Activo' : 'Inactivo'"
                    [severity]="user.is_active ? 'success' : 'danger'"
                  />
                </div>
              </td>
              <td>
                <div class="table-cell-content">
                  {{ user.last_login_at ? formatDate(user.last_login_at) : 'Nunca' }}
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="info"
                    (onClick)="openEditDialog(user)"
                    [style]="{ marginRight: '0.5rem' }"
                    title="Editar"
                  />
                  <p-button
                    [icon]="user.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    [text]="true"
                    [severity]="user.is_active ? 'warn' : 'success'"
                    (onClick)="toggleActive(user)"
                    [style]="{ marginRight: '0.5rem' }"
                    [title]="user.is_active ? 'Desactivar' : 'Activar'"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    (onClick)="deleteUser(user)"
                    title="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6">No se encontraron usuarios administradores</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>

    <!-- Dialog para crear/editar usuario -->
    <p-dialog
      [visible]="showUserDialog()"
      (visibleChange)="showUserDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '600px' }"
      [header]="editingUser() ? 'Editar Usuario' : 'Nuevo Usuario'"
      (onHide)="resetForm()"
      [draggable]="false"
      [resizable]="false"
    >
      <form (ngSubmit)="saveUser()" class="user-form">
        <div class="form-group">
          <label for="user_id">ID de Usuario (Auth0) *</label>
          <input
            id="user_id"
            type="text"
            pInputText
            [(ngModel)]="userForm.user_id"
            name="user_id"
            required
            [disabled]="isLoading() || editingUser() !== null"
            placeholder="auth0|..."
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="email">Email *</label>
            <input
              id="email"
              type="email"
              pInputText
              [(ngModel)]="userForm.email"
              name="email"
              required
              [disabled]="isLoading()"
              placeholder="usuario@example.com"
            />
          </div>
          <div class="form-group">
            <label for="full_name">Nombre Completo *</label>
            <input
              id="full_name"
              type="text"
              pInputText
              [(ngModel)]="userForm.full_name"
              name="full_name"
              required
              [disabled]="isLoading()"
              placeholder="Juan PÃ©rez"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="avatar_url">URL del Avatar</label>
          <input
            id="avatar_url"
            type="url"
            pInputText
            [(ngModel)]="userForm.avatar_url"
            name="avatar_url"
            [disabled]="isLoading()"
            placeholder="https://ejemplo.com/avatar.jpg"
          />
        </div>

        <div class="form-group">
          <label for="role">Rol *</label>
          <p-dropdown
            id="role"
            [(ngModel)]="userForm.role"
            name="role"
            [options]="roleOptions"
            placeholder="Seleccionar rol"
            [showClear]="false"
            [disabled]="isLoading()"
            required
            [style]="{ width: '100%' }"
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <p-checkbox
              [(ngModel)]="userForm.is_active"
              name="is_active"
              [binary]="true"
              [disabled]="isLoading()"
            />
            <span>Usuario activo</span>
          </label>
        </div>

        <div class="form-actions">
          <p-button
            type="submit"
            [label]="editingUser() ? 'Actualizar' : 'Crear'"
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
  `,
  styles: [
    `
      .users-container {
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
      }

      .section-header h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }

      .table-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .search-input {
        max-width: 300px;
      }

      ::ng-deep .p-datatable td .table-cell-content {
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
        padding: 0.5rem 0;
      }

      ::ng-deep .p-datatable {
        overflow-x: auto;
      }

      ::ng-deep .p-datatable-wrapper {
        overflow-x: auto;
      }

      ::ng-deep .p-dialog {
        z-index: 1100 !important;
        position: fixed !important;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
      }

      .user-avatar-placeholder {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #fbbf24;
        color: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1rem;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .user-form {
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

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        color: #000000;
        font-size: 0.875rem;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }

      @media (max-width: 768px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminUsersComponent {
  private messageService = inject(MessageService);
  public usersStore = inject(AdminUsersStore);

  public showUserDialog = signal(false);
  public editingUser = signal<AdminUser | null>(null);
  public isLoading = signal(false);
  public globalFilter = signal('');

  public userForm: Partial<AdminUser> = {
    user_id: '',
    email: '',
    full_name: '',
    avatar_url: '',
    role: 'viewer',
    permissions: {},
    is_active: true,
  };

  public roleOptions = [
    { label: 'Administrador', value: 'admin' },
    { label: 'Editor', value: 'editor' },
    { label: 'Visualizador', value: 'viewer' },
  ];

  public onGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }

  public openNewUserDialog(): void {
    this.editingUser.set(null);
    this.resetForm();
    this.showUserDialog.set(true);
  }

  public openEditDialog(user: AdminUser): void {
    this.editingUser.set(user);
    this.userForm = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url || '',
      role: user.role,
      permissions: user.permissions || {},
      is_active: user.is_active,
    };
    this.showUserDialog.set(true);
  }

  public resetForm(): void {
    this.userForm = {
      user_id: '',
      email: '',
      full_name: '',
      avatar_url: '',
      role: 'viewer',
      permissions: {},
      is_active: true,
    };
    this.editingUser.set(null);
    this.showUserDialog.set(false);
  }

  public saveUser(): void {
    if (!this.userForm.user_id || !this.userForm.email || !this.userForm.full_name || !this.userForm.role) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    this.isLoading.set(true);

    const user = this.editingUser();
    if (user) {
      const validFields: Partial<AdminUser> = {
        id: user.id,
        user_id: this.userForm.user_id,
        email: this.userForm.email,
        full_name: this.userForm.full_name,
        avatar_url: this.userForm.avatar_url || undefined,
        role: this.userForm.role,
        permissions: this.userForm.permissions || undefined,
        is_active: this.userForm.is_active,
      };

      this.usersStore.editItem(validFields as AdminUser).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Usuario actualizado',
            detail: 'El usuario se ha actualizado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo actualizar el usuario',
          });
          this.isLoading.set(false);
        },
      });
    } else {
      const validFields: Partial<AdminUser> = {
        user_id: this.userForm.user_id,
        email: this.userForm.email,
        full_name: this.userForm.full_name,
        avatar_url: this.userForm.avatar_url || undefined,
        role: this.userForm.role,
        permissions: this.userForm.permissions || undefined,
        is_active: this.userForm.is_active,
      };

      this.usersStore.createItem(validFields as AdminUser).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Usuario creado',
            detail: 'El usuario se ha creado correctamente',
          });
          this.resetForm();
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo crear el usuario',
          });
          this.isLoading.set(false);
        },
      });
    }
  }

  public toggleActive(user: AdminUser): void {
    this.isLoading.set(true);
    const updated: AdminUser = {
      ...user,
      is_active: !user.is_active,
    };

    this.usersStore.editItem(updated).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El usuario ahora estÃ¡ ${updated.is_active ? 'activo' : 'inactivo'}`,
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo actualizar el estado',
        });
        this.isLoading.set(false);
      },
    });
  }

  public deleteUser(user: AdminUser): void {
    this.usersStore.deleteItem(user.id);
  }

  public getRoleLabel(role: string): string {
    const option = this.roleOptions.find((opt) => opt.value === role);
    return option ? option.label : role;
  }

  public getRoleSeverity(role: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'editor':
        return 'warn';
      case 'viewer':
        return 'info';
      default:
        return 'secondary';
    }
  }

  public formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}




