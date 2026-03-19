import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Employee } from '../../models';
import { DeviceService } from '../../services/device.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'pt-employee-portal-profile',
  standalone: true,
  imports: [Card, Button, InputText, FormsModule, DatePipe, NgClass],
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="space-y-4">
      <!-- Header Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"
              >
                <i class="pi pi-user text-white text-xl"></i>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white m-0">
                  {{ employee()?.first_name }}
                  {{ employee()?.father_name }}
                </h3>
                <p class="text-sm text-gray-400 m-0 mt-1">
                  {{ employee()?.position?.name }}
                </p>
              </div>
            </div>
            @if (!editMode()) {
            <p-button
              label="Editar"
              icon="pi pi-pencil"
              (onClick)="onToggleEdit()"
              rounded
              severity="secondary"
              outlined
            />
            } @else {
            <div class="flex gap-2">
              <p-button
                label="Cancelar"
                severity="secondary"
                outlined
                rounded
                (onClick)="onCancelEdit()"
              />
              <p-button
                label="Guardar cambios"
                icon="pi pi-save"
                rounded
                [loading]="savingPersonalData()"
                (onClick)="onSavePersonalData()"
              />
            </div>
            }
          </div>
        </ng-template>
      </p-card>

      <!-- Información Básica Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-id-card text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">
              Información Básica
            </h4>
          </div>
        </ng-template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Código de Empleado
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.employee_number || '-' }}
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Fecha de Ingreso
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.start_date | date : 'mediumDate' }}
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Sucursal
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.branch?.name || '-' }}
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Departamento
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.department?.name || '-' }}
            </dd>
          </div>
        </div>
      </p-card>

      <!-- Información de Contacto Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-phone text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">
              Información de Contacto
            </h4>
          </div>
        </ng-template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Email Personal
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.email || '-' }}
              } @else {
                <input
                  pInputText
                  type="email"
                  [ngModel]="editEmailValue()"
                  (ngModelChange)="onEditEmailChange($event)"
                  placeholder="Correo personal"
                  class="w-full"
                />
              }
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Email Laboral
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.work_email || '-' }}
              } @else {
                <input
                  pInputText
                  type="email"
                  [ngModel]="editWorkEmailValue()"
                  (ngModelChange)="onEditWorkEmailChange($event)"
                  placeholder="Correo corporativo"
                  class="w-full"
                />
              }
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Teléfono
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.phone_number || '-' }}
              } @else {
                <input
                  pInputText
                  type="text"
                  [ngModel]="editPhoneValue()"
                  (ngModelChange)="onEditPhoneChange($event)"
                  placeholder="Número de teléfono"
                  class="w-full"
                />
              }
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50 md:col-span-2"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Dirección
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.address || '-' }}
              } @else {
                <textarea
                  pInputTextarea
                  [ngModel]="editAddressValue()"
                  (ngModelChange)="onEditAddressChange($event)"
                  rows="3"
                  placeholder="Dirección"
                  class="w-full"
                ></textarea>
              }
            </dd>
          </div>
        </div>
      </p-card>

      <!-- PIN de Caja Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-key text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">PIN de Caja</h4>
          </div>
        </ng-template>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-gray-400 m-0">Tu PIN de 4-6 dígitos para la caja registradora. Este PIN se sincroniza con Odoo.</p>
          <div class="flex items-center gap-3">
            <div class="flex-1 max-w-[200px]">
              @if (!editingPin()) {
              <div class="flex items-center gap-2">
                <span class="text-lg font-mono text-white tracking-widest">
                  {{ showPin() ? (currentPin() || '----') : '••••' }}
                </span>
                <button
                  class="text-gray-400 hover:text-white transition-colors p-1"
                  (click)="showPin.set(!showPin())"
                >
                  <i [class]="showPin() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                </button>
              </div>
              } @else {
              <input
                pInputText
                type="text"
                inputmode="numeric"
                maxlength="6"
                [ngModel]="newPin()"
                (ngModelChange)="newPin.set($event)"
                placeholder="Nuevo PIN"
                class="w-full font-mono tracking-widest"
              />
              }
            </div>
            @if (!editingPin()) {
            <p-button
              label="Cambiar PIN"
              icon="pi pi-pencil"
              severity="secondary"
              outlined
              size="small"
              (onClick)="editingPin.set(true)"
            />
            } @else {
            <div class="flex gap-2">
              <p-button
                label="Cancelar"
                severity="secondary"
                outlined
                size="small"
                (onClick)="cancelPinEdit()"
              />
              <p-button
                label="Guardar"
                icon="pi pi-save"
                size="small"
                [loading]="savingPin()"
                [disabled]="!isValidPin()"
                (onClick)="onSavePin()"
              />
            </div>
            }
          </div>
        </div>
      </p-card>

      <!-- Notificaciones Push Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-bell text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">Notificaciones Push</h4>
          </div>
        </ng-template>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-300 m-0">Recibe notificaciones en tu dispositivo</p>
            <p class="text-xs text-gray-500 m-0 mt-1">
              @if (pushPermission() === 'denied') {
                Permiso denegado. Habilita las notificaciones en la configuración del navegador.
              } @else if (pushSubscribed()) {
                Notificaciones activadas
              } @else {
                Notificaciones desactivadas
              }
            </p>
          </div>
          <button
            class="push-toggle"
            [ngClass]="pushSubscribed() ? 'push-toggle--on' : 'push-toggle--off'"
            [disabled]="pushPermission() === 'denied' || togglingPush()"
            (click)="onTogglePush()"
          >
            <div class="push-toggle__thumb" [ngClass]="pushSubscribed() ? 'push-toggle__thumb--on' : 'push-toggle__thumb--off'"></div>
          </button>
        </div>
      </p-card>

      <!-- Tema de la Aplicación Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-palette text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">Tema de la Aplicación</h4>
          </div>
        </ng-template>
        <div class="flex flex-col gap-3">
          <p class="text-sm text-gray-400 m-0">Escoge cómo quieres que se vea People.</p>
          <div class="flex gap-3">
            <button
              class="theme-option"
              [ngClass]="themeService.isDark() ? 'theme-option--active' : ''"
              (click)="themeService.setTheme('dark')"
            >
              <div class="theme-preview theme-preview--dark">
                <div class="theme-preview__bar"></div>
                <div class="theme-preview__body">
                  <div class="theme-preview__sidebar"></div>
                  <div class="theme-preview__content">
                    <div class="theme-preview__line"></div>
                    <div class="theme-preview__line short"></div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <i class="pi pi-moon text-sm"></i>
                <span class="text-sm font-medium">Oscuro</span>
              </div>
            </button>
            <button
              class="theme-option"
              [ngClass]="themeService.isLight() ? 'theme-option--active' : ''"
              (click)="themeService.setTheme('light')"
            >
              <div class="theme-preview theme-preview--light">
                <div class="theme-preview__bar"></div>
                <div class="theme-preview__body">
                  <div class="theme-preview__sidebar"></div>
                  <div class="theme-preview__content">
                    <div class="theme-preview__line"></div>
                    <div class="theme-preview__line short"></div>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <i class="pi pi-sun text-sm"></i>
                <span class="text-sm font-medium">Claro</span>
              </div>
            </button>
          </div>
        </div>
      </p-card>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="px-4 py-4 flex flex-col gap-3">
      <!-- Header -->
      <div class="bg-neutral-800/60 rounded-xl p-4 border border-neutral-700/30">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-user text-white text-lg"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-bold text-white m-0 truncate">{{ employee()?.first_name }} {{ employee()?.father_name }}</h3>
            <p class="text-xs text-gray-400 m-0 mt-0.5 truncate">{{ employee()?.position?.name }}</p>
          </div>
        </div>
        @if (!editMode()) {
        <button
          class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-neutral-700/50 border border-neutral-600/40 text-sm text-gray-200 font-medium"
          style="-webkit-tap-highlight-color: transparent;"
          (click)="onToggleEdit()"
        >
          <i class="pi pi-pencil text-amber-400 text-xs"></i> Editar Perfil
        </button>
        } @else {
        <div class="flex gap-2">
          <button
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-neutral-700/50 border border-neutral-600/40 text-sm text-gray-300"
            style="-webkit-tap-highlight-color: transparent;"
            (click)="onCancelEdit()"
          >
            Cancelar
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500 text-sm text-black font-semibold"
            style="-webkit-tap-highlight-color: transparent;"
            [disabled]="savingPersonalData()"
            (click)="onSavePersonalData()"
          >
            @if (savingPersonalData()) {
              <i class="pi pi-spin pi-spinner text-xs"></i>
            } @else {
              <i class="pi pi-save text-xs"></i>
            }
            Guardar
          </button>
        </div>
        }
      </div>

      <!-- Información Básica -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-id-card text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">Información Básica</span>
        </div>
        <div class="grid grid-cols-2 gap-px bg-neutral-700/20">
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Código</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.employee_number || '-' }}</dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Ingreso</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.start_date | date : 'mediumDate' }}</dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Sucursal</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.branch?.name || '-' }}</dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Departamento</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.department?.name || '-' }}</dd>
          </div>
        </div>
      </div>

      <!-- Información de Contacto -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-phone text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">Contacto</span>
        </div>
        <div class="flex flex-col gap-px bg-neutral-700/20">
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Email Personal</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.email || '-' }} }
              @else { <input pInputText type="email" [ngModel]="editEmailValue()" (ngModelChange)="onEditEmailChange($event)" placeholder="Correo personal" class="w-full mt-1" /> }
            </dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Email Laboral</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.work_email || '-' }} }
              @else { <input pInputText type="email" [ngModel]="editWorkEmailValue()" (ngModelChange)="onEditWorkEmailChange($event)" placeholder="Correo corporativo" class="w-full mt-1" /> }
            </dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Teléfono</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.phone_number || '-' }} }
              @else { <input pInputText type="text" [ngModel]="editPhoneValue()" (ngModelChange)="onEditPhoneChange($event)" placeholder="Teléfono" class="w-full mt-1" /> }
            </dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Dirección</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.address || '-' }} }
              @else { <textarea pInputTextarea [ngModel]="editAddressValue()" (ngModelChange)="onEditAddressChange($event)" rows="2" placeholder="Dirección" class="w-full mt-1"></textarea> }
            </dd>
          </div>
        </div>
      </div>

      <!-- PIN de Caja (mobile) -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-key text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">PIN de Caja</span>
        </div>
        <div class="p-3">
          <p class="text-xs text-gray-400 m-0 mb-2">PIN de 4-6 dígitos para la caja. Se sincroniza con Odoo.</p>
          @if (!editingPin()) {
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg font-mono text-white tracking-widest">
                {{ showPin() ? (currentPin() || '----') : '••••' }}
              </span>
              <button
                class="text-gray-400 active:text-white p-1.5"
                style="-webkit-tap-highlight-color: transparent;"
                (click)="showPin.set(!showPin())"
              >
                <i [class]="showPin() ? 'pi pi-eye-slash text-sm' : 'pi pi-eye text-sm'"></i>
              </button>
            </div>
            <button
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-700/50 border border-neutral-600/40 text-xs text-gray-200"
              style="-webkit-tap-highlight-color: transparent;"
              (click)="editingPin.set(true)"
            >
              <i class="pi pi-pencil text-amber-400 text-xs"></i> Cambiar
            </button>
          </div>
          } @else {
          <div class="flex flex-col gap-2">
            <input
              pInputText
              type="text"
              inputmode="numeric"
              maxlength="6"
              [ngModel]="newPin()"
              (ngModelChange)="newPin.set($event)"
              placeholder="Nuevo PIN (4-6 dígitos)"
              class="w-full font-mono tracking-widest"
            />
            <div class="flex gap-2">
              <button
                class="flex-1 py-2.5 rounded-lg bg-neutral-700/50 border border-neutral-600/40 text-sm text-gray-300"
                style="-webkit-tap-highlight-color: transparent;"
                (click)="cancelPinEdit()"
              >Cancelar</button>
              <button
                class="flex-1 py-2.5 rounded-lg bg-amber-500 text-sm text-black font-semibold"
                style="-webkit-tap-highlight-color: transparent;"
                [disabled]="!isValidPin() || savingPin()"
                (click)="onSavePin()"
              >
                @if (savingPin()) {
                <i class="pi pi-spin pi-spinner text-xs"></i>
                } @else {
                Guardar
                }
              </button>
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Notificaciones Push (mobile) -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-bell text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">Notificaciones Push</span>
        </div>
        <div class="p-3">
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-300 m-0">Recibe notificaciones en tu dispositivo</p>
              <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5">
                @if (pushPermission() === 'denied') {
                  Habilita notificaciones en ajustes del navegador
                } @else if (pushSubscribed()) {
                  Activadas
                } @else {
                  Desactivadas
                }
              </p>
            </div>
            <button
              class="push-toggle"
              [ngClass]="pushSubscribed() ? 'push-toggle--on' : 'push-toggle--off'"
              [disabled]="pushPermission() === 'denied' || togglingPush()"
              (click)="onTogglePush()"
              style="-webkit-tap-highlight-color: transparent;"
            >
              <div class="push-toggle__thumb" [ngClass]="pushSubscribed() ? 'push-toggle__thumb--on' : 'push-toggle__thumb--off'"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Tema (mobile) -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-palette text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">Tema</span>
        </div>
        <div class="p-3">
          <p class="text-xs text-gray-400 m-0 mb-2">Escoge cómo quieres que se vea People.</p>
          <div class="flex gap-3">
            <button
              class="theme-option flex-1"
              [ngClass]="themeService.isDark() ? 'theme-option--active' : ''"
              (click)="themeService.setTheme('dark')"
              style="-webkit-tap-highlight-color: transparent;"
            >
              <div class="theme-preview theme-preview--dark">
                <div class="theme-preview__bar"></div>
                <div class="theme-preview__body">
                  <div class="theme-preview__sidebar"></div>
                  <div class="theme-preview__content">
                    <div class="theme-preview__line"></div>
                    <div class="theme-preview__line short"></div>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-center gap-1.5 mt-1.5">
                <i class="pi pi-moon text-xs"></i>
                <span class="text-xs font-medium">Oscuro</span>
              </div>
            </button>
            <button
              class="theme-option flex-1"
              [ngClass]="themeService.isLight() ? 'theme-option--active' : ''"
              (click)="themeService.setTheme('light')"
              style="-webkit-tap-highlight-color: transparent;"
            >
              <div class="theme-preview theme-preview--light">
                <div class="theme-preview__bar"></div>
                <div class="theme-preview__body">
                  <div class="theme-preview__sidebar"></div>
                  <div class="theme-preview__content">
                    <div class="theme-preview__line"></div>
                    <div class="theme-preview__line short"></div>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-center gap-1.5 mt-1.5">
                <i class="pi pi-sun text-xs"></i>
                <span class="text-xs font-medium">Claro</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .push-toggle {
      width: 48px;
      height: 28px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }
    .push-toggle--on { background: #fbbf24; }
    .push-toggle--off { background: #404040; }
    .push-toggle:disabled { opacity: 0.4; cursor: not-allowed; }

    .push-toggle__thumb {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: white;
      position: absolute;
      top: 3px;
      transition: left 0.2s ease;
    }
    .push-toggle__thumb--on { left: 23px; }
    .push-toggle__thumb--off { left: 3px; }

    /* Theme option buttons */
    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      border-radius: 12px;
      border: 2px solid transparent;
      background: rgba(255,255,255,0.03);
      cursor: pointer;
      transition: all 0.2s ease;
      color: rgba(255,255,255,0.7);
    }
    .theme-option:hover {
      background: rgba(255,255,255,0.06);
    }
    .theme-option--active {
      border-color: #fbbf24 !important;
      background: rgba(251,191,36,0.08) !important;
      color: #fbbf24 !important;
    }

    /* Mini preview mockups */
    .theme-preview {
      width: 100px;
      height: 64px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .theme-preview--dark {
      background: #0a0a0a;
    }
    .theme-preview--dark .theme-preview__bar {
      height: 10px;
      background: #1a1a1a;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .theme-preview--dark .theme-preview__body {
      display: flex;
      height: calc(100% - 10px);
    }
    .theme-preview--dark .theme-preview__sidebar {
      width: 22px;
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.06);
    }
    .theme-preview--dark .theme-preview__content {
      flex: 1;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .theme-preview--dark .theme-preview__line {
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.1);
    }
    .theme-preview--dark .theme-preview__line.short {
      width: 60%;
    }

    .theme-preview--light {
      background: #f5f5f5;
      border-color: rgba(0,0,0,0.15);
    }
    .theme-preview--light .theme-preview__bar {
      height: 10px;
      background: #ffffff;
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    .theme-preview--light .theme-preview__body {
      display: flex;
      height: calc(100% - 10px);
    }
    .theme-preview--light .theme-preview__sidebar {
      width: 22px;
      background: #ffffff;
      border-right: 1px solid rgba(0,0,0,0.08);
    }
    .theme-preview--light .theme-preview__content {
      flex: 1;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .theme-preview--light .theme-preview__line {
      height: 4px;
      border-radius: 2px;
      background: rgba(0,0,0,0.12);
    }
    .theme-preview--light .theme-preview__line.short {
      width: 60%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalProfileComponent {
  protected device = inject(DeviceService);
  public themeService = inject(ThemeService);
  // Inputs
  public employee = input<Employee | null | undefined>();
  public editMode = input.required<boolean>();
  public editEmailValue = input.required<string>();
  public editWorkEmailValue = input.required<string>();
  public editPhoneValue = input.required<string>();
  public editAddressValue = input.required<string>();
  public savingPersonalData = input.required<boolean>();

  // Push notification inputs
  public pushSubscribed = input(false);
  public pushPermission = input<NotificationPermission>('default');
  public togglingPush = input(false);

  // HR PIN inputs
  public currentPin = input<string>('');
  public savingPin = input(false);

  // Outputs
  public toggleEdit = output<void>();
  public cancelEdit = output<void>();
  public savePersonalData = output<void>();
  public editEmailChange = output<string>();
  public editWorkEmailChange = output<string>();
  public editPhoneChange = output<string>();
  public editAddressChange = output<string>();
  public togglePush = output<void>();
  public savePin = output<string>();

  // Local state for PIN editing
  public editingPin = signal(false);
  public showPin = signal(false);
  public newPin = signal('');

  public onToggleEdit(): void {
    this.toggleEdit.emit();
  }

  public onCancelEdit(): void {
    this.cancelEdit.emit();
  }

  public onSavePersonalData(): void {
    this.savePersonalData.emit();
  }

  public onEditEmailChange(value: string): void {
    this.editEmailChange.emit(value);
  }

  public onEditWorkEmailChange(value: string): void {
    this.editWorkEmailChange.emit(value);
  }

  public onEditPhoneChange(value: string): void {
    this.editPhoneChange.emit(value);
  }

  public onEditAddressChange(value: string): void {
    this.editAddressChange.emit(value);
  }

  public onTogglePush(): void {
    this.togglePush.emit();
  }

  public isValidPin(): boolean {
    const pin = this.newPin();
    return /^\d{4,6}$/.test(pin);
  }

  public cancelPinEdit(): void {
    this.editingPin.set(false);
    this.newPin.set('');
  }

  public onSavePin(): void {
    if (this.isValidPin()) {
      this.savePin.emit(this.newPin());
      this.editingPin.set(false);
      this.newPin.set('');
    }
  }
}
