import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { DeviceService } from '../../services/device.service';
import { PermissionsService } from '../../services/permissions.service';

import { Employee } from '../../models';

interface DashboardTimelogEvent {
  id: string;
  type: string;
  typeLabel: string;
  icon: string;
  date: Date;
  time: string;
  branch: { name?: string } | null;
}

@Component({
  selector: 'pt-employee-portal-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="flex flex-col gap-5 max-w-6xl mx-auto">

      <!-- Greeting + ticker -->
      <div class="flex flex-col items-center text-center gap-2 pt-2">
        @if (employee?.profile_photo_url) {
        <img [src]="employee!.profile_photo_url" class="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-400/20 shadow-lg mb-1" alt="" />
        }
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent m-0">
          Hola, <span class="text-amber-400 bg-none" style="background: none; -webkit-text-fill-color: #fbbf24;">{{ employee?.first_name }}!</span>
        </h1>
        <div class="portal-ticker w-full max-w-5xl">
          <div class="portal-ticker-track">
            @for (tip of doubledTips; track $index) {
            <span class="portal-ticker-item">
              <i class="pi" [class]="tip.icon"></i>
              <strong>{{ tip.title }}</strong>
              <span class="portal-ticker-sep">—</span>
              {{ tip.message }}
            </span>
            }
          </div>
        </div>
      </div>

      <!-- Photo nudge (non-invasive, shows randomly) -->
      @if (!employee?.profile_photo_url && showPhotoNudge) {
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10 max-w-md mx-auto">
        <div class="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-camera text-amber-400 text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-300 m-0">Personaliza tu perfil con una foto</p>
          <button class="text-[0.65rem] text-amber-400 hover:text-amber-300 font-semibold m-0 mt-0.5 cursor-pointer bg-transparent border-0 p-0" (click)="quickAction.emit('profile')">Ir a Mi Perfil</button>
        </div>
        <button class="text-gray-600 hover:text-gray-400 transition-colors p-1 cursor-pointer bg-transparent border-0" (click)="dismissPhotoNudge()">
          <i class="pi pi-times text-xs"></i>
        </button>
      </div>
      }

      <!-- Bento grid: balance + stats -->
      <div class="grid grid-cols-6 gap-4">
        <!-- Vacaciones -->
        <div class="col-span-2 portal-card-balance relative overflow-hidden rounded-2xl p-5 group">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/12 to-blue-600/4"></div>
          <div class="absolute -top-8 -right-8 w-28 h-28 bg-blue-500/8 rounded-full transition-transform duration-500 group-hover:scale-125"></div>
          <div class="relative">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
                <i class="pi pi-sun text-blue-400 text-sm"></i>
              </div>
              <span class="text-xs font-bold text-blue-400/90 uppercase tracking-widest">Vacaciones</span>
            </div>
            <p class="text-4xl font-extrabold text-white m-0 tracking-tight">{{ vacationBalance }}</p>
            <p class="text-xs text-gray-500 m-0 mt-1.5 font-medium">días disponibles</p>
          </div>
        </div>

        <!-- Compensatorio -->
        <div class="col-span-2 portal-card-balance relative overflow-hidden rounded-2xl p-5 group">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/12 to-emerald-600/4"></div>
          <div class="absolute -top-8 -right-8 w-28 h-28 bg-emerald-500/8 rounded-full transition-transform duration-500 group-hover:scale-125"></div>
          <div class="relative">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/20">
                <i class="pi pi-clock text-emerald-400 text-sm"></i>
              </div>
              <span class="text-xs font-bold text-emerald-400/90 uppercase tracking-widest">Compensatorio</span>
            </div>
            <p class="text-4xl font-extrabold text-white m-0 tracking-tight">{{ compensatoryBalance }}</p>
            <p class="text-xs text-gray-500 m-0 mt-1.5 font-medium">horas aprobadas</p>
          </div>
        </div>

        <!-- Mini stats grid -->
        <div class="col-span-2 grid grid-cols-2 grid-rows-2 gap-3">
          <div class="portal-stat-mini rounded-2xl p-3.5">
            <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Días Trabajados</p>
            <p class="text-xl font-extrabold text-white m-0 mt-1 tracking-tight">{{ daysWorkedThisMonth }}</p>
          </div>
          <div class="portal-stat-mini rounded-2xl p-3.5">
            <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Tardanzas</p>
            <p class="text-xl font-extrabold m-0 mt-1 tracking-tight" [class.text-white]="(myLates?.length ?? 0) === 0" [class.text-red-400]="(myLates?.length ?? 0) > 0">{{ myLates?.length ?? 0 }}</p>
          </div>
          <div class="portal-stat-mini rounded-2xl p-3.5">
            <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Hrs Compensatorias</p>
            <p class="text-xl font-extrabold text-white m-0 mt-1 tracking-tight">{{ approvedCompensatoryHours }}</p>
          </div>
          @if (canViewSalary()) {
          <div class="portal-stat-mini rounded-2xl p-3.5 cursor-pointer" (click)="toggleSalary.emit()">
            <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Salario</p>
            <p class="text-xl font-extrabold m-0 mt-1 tracking-tight" [class.text-amber-400]="showSalary" [class.text-gray-600]="!showSalary">
              @if (showSalary && employee?.monthly_salary) {
                {{ employee?.monthly_salary | currency : '$' }}
              } @else {
                ****
              }
            </p>
          </div>
          } @else {
          <div class="portal-stat-mini rounded-2xl p-3.5">
            <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Aprobadas</p>
            <p class="text-xl font-extrabold text-emerald-400 m-0 mt-1 tracking-tight">{{ approvedCompensatoryHours }}h</p>
          </div>
          }
        </div>
      </div>

      <!-- Quick Actions -->
      <div>
        <p class="text-[0.65rem] text-gray-500 m-0 mb-3 uppercase tracking-widest font-bold pl-1">Acciones rápidas</p>
        <div class="grid grid-cols-4 gap-3">
          <button class="portal-action group" (click)="quickAction.emit('vacations')">
            <div class="w-11 h-11 rounded-xl bg-blue-500/12 flex items-center justify-center ring-1 ring-blue-500/15 transition-all duration-200 group-hover:ring-blue-500/30 group-hover:bg-blue-500/20">
              <i class="pi pi-sun text-blue-400"></i>
            </div>
            <div class="text-left">
              <span class="text-sm text-white font-semibold block">Vacaciones</span>
              <span class="text-[0.65rem] text-gray-500">Solicitar días</span>
            </div>
          </button>
          <button class="portal-action group" (click)="quickAction.emit('documents')">
            <div class="w-11 h-11 rounded-xl bg-purple-500/12 flex items-center justify-center ring-1 ring-purple-500/15 transition-all duration-200 group-hover:ring-purple-500/30 group-hover:bg-purple-500/20">
              <i class="pi pi-file text-purple-400"></i>
            </div>
            <div class="text-left">
              <span class="text-sm text-white font-semibold block">Documentos</span>
              <span class="text-[0.65rem] text-gray-500">Cartas y constancias</span>
            </div>
          </button>
          <button class="portal-action group" (click)="quickAction.emit('compensatory')">
            <div class="w-11 h-11 rounded-xl bg-emerald-500/12 flex items-center justify-center ring-1 ring-emerald-500/15 transition-all duration-200 group-hover:ring-emerald-500/30 group-hover:bg-emerald-500/20">
              <i class="pi pi-clock text-emerald-400"></i>
            </div>
            <div class="text-left">
              <span class="text-sm text-white font-semibold block">Compensatorio</span>
              <span class="text-[0.65rem] text-gray-500">Registrar horas</span>
            </div>
          </button>
          <button class="portal-action group" (click)="quickAction.emit('uniform_request')">
            <div class="w-11 h-11 rounded-xl bg-amber-500/12 flex items-center justify-center ring-1 ring-amber-500/15 transition-all duration-200 group-hover:ring-amber-500/30 group-hover:bg-amber-500/20">
              <i class="pi pi-tag text-amber-400"></i>
            </div>
            <div class="text-left">
              <span class="text-sm text-white font-semibold block">Uniforme</span>
              <span class="text-[0.65rem] text-gray-500">Solicitar uniforme</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Bottom two-column -->
      <div class="grid grid-cols-2 gap-5">
        <!-- Recent timelogs -->
        <div class="portal-panel rounded-2xl p-5">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg bg-amber-500/12 flex items-center justify-center ring-1 ring-amber-500/15">
              <i class="pi pi-clock text-amber-400 text-sm"></i>
            </div>
            <span class="text-sm font-bold text-white tracking-tight">Marcaciones Recientes</span>
          </div>
          <div class="flex flex-col gap-2">
            @if (recentTimelogs && recentTimelogs.length > 0) {
              @for (event of recentTimelogs; track event.id) {
              <div class="portal-timelog-row flex items-center gap-3 p-3 rounded-xl">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  [ngClass]="event.type === 'check_in' ? 'bg-emerald-500/12 ring-1 ring-emerald-500/15' : 'bg-orange-500/12 ring-1 ring-orange-500/15'">
                  <i [class]="'pi ' + event.icon + ' text-sm'" [ngClass]="event.type === 'check_in' ? 'text-emerald-400' : 'text-orange-400'"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-white font-semibold m-0">{{ event.typeLabel }}</p>
                  <p class="text-xs text-gray-500 m-0 mt-0.5 truncate">
                    {{ event.date | date : 'EEE d MMM' }} · {{ event.time }}
                    @if (event.branch?.name) { · {{ event.branch?.name }} }
                  </p>
                </div>
              </div>
              }
            } @else {
              <div class="flex flex-col items-center justify-center py-8 text-center">
                <div class="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center mb-3">
                  <i class="pi pi-clock text-gray-600 text-lg"></i>
                </div>
                <p class="text-gray-500 text-sm m-0">Sin marcaciones recientes</p>
              </div>
            }
          </div>
        </div>

        <!-- Quick info -->
        <div class="portal-panel rounded-2xl p-5">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg bg-violet-500/12 flex items-center justify-center ring-1 ring-violet-500/15">
              <i class="pi pi-id-card text-violet-400 text-sm"></i>
            </div>
            <span class="text-sm font-bold text-white tracking-tight">Mi Información</span>
          </div>
          @if (employee) {
          <div class="flex flex-col gap-2.5">
            <div class="portal-info-row flex items-center justify-between p-3 rounded-xl">
              <div class="flex items-center gap-2.5">
                <i class="pi pi-id-card text-amber-400 text-sm"></i>
                <span class="text-xs text-gray-400 font-medium">Cargo</span>
              </div>
              <span class="text-sm text-white font-semibold">{{ employee.position?.name || 'N/A' }}</span>
            </div>
            <div class="portal-info-row flex items-center justify-between p-3 rounded-xl">
              <div class="flex items-center gap-2.5">
                <i class="pi pi-map-marker text-blue-400 text-sm"></i>
                <span class="text-xs text-gray-400 font-medium">Sucursal</span>
              </div>
              <span class="text-sm text-white font-semibold">{{ employee.branch?.name || 'N/A' }}</span>
            </div>
            <div class="portal-info-row flex items-center justify-between p-3 rounded-xl">
              <div class="flex items-center gap-2.5">
                <i class="pi pi-sitemap text-purple-400 text-sm"></i>
                <span class="text-xs text-gray-400 font-medium">Departamento</span>
              </div>
              <span class="text-sm text-white font-semibold">{{ employee.department?.name || 'N/A' }}</span>
            </div>
            <div class="portal-info-row flex items-center justify-between p-3 rounded-xl">
              <div class="flex items-center gap-2.5">
                <i class="pi pi-calendar text-emerald-400 text-sm"></i>
                <span class="text-xs text-gray-400 font-medium">Fecha de Ingreso</span>
              </div>
              <span class="text-sm text-white font-semibold">{{ employee.start_date | date : 'mediumDate' }}</span>
            </div>
            <div class="portal-info-row flex items-center justify-between p-3 rounded-xl">
              <div class="flex items-center gap-2.5">
                <i class="pi pi-envelope text-amber-400 text-sm"></i>
                <span class="text-xs text-gray-400 font-medium">Email</span>
              </div>
              <span class="text-xs text-white font-semibold truncate max-w-[200px]">{{ employee.work_email || 'N/A' }}</span>
            </div>
          </div>
          }
        </div>
      </div>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="flex flex-col gap-4 px-4 py-4">
      <!-- Greeting + ticker -->
      <div class="flex flex-col items-center text-center gap-1.5 pt-1">
        <h1 class="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent m-0">
          Hola, <span style="background: none; -webkit-text-fill-color: #fbbf24;">{{ employee?.first_name }}!</span>
        </h1>
        <div class="portal-ticker w-full">
          <div class="portal-ticker-track">
            @for (tip of doubledTips; track $index) {
            <span class="portal-ticker-item">
              <i class="pi" [class]="tip.icon"></i>
              <strong>{{ tip.title }}</strong>
              <span class="portal-ticker-sep">—</span>
              {{ tip.message }}
            </span>
            }
          </div>
        </div>
      </div>

      <!-- Balance cards (mobile) -->
      <div class="grid grid-cols-2 gap-3">
        <div class="relative overflow-hidden rounded-2xl p-4 border border-blue-500/15">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/3"></div>
          <div class="relative">
            <div class="flex items-center gap-1.5 mb-2">
              <i class="pi pi-sun text-blue-400 text-xs"></i>
              <span class="text-[0.6rem] text-blue-400/80 uppercase tracking-widest font-bold">Vacaciones</span>
            </div>
            <p class="text-3xl font-extrabold text-white m-0 tracking-tight">{{ vacationBalance }}</p>
            <p class="text-[0.6rem] text-gray-500 m-0 mt-0.5 font-medium">días disponibles</p>
          </div>
        </div>
        <div class="relative overflow-hidden rounded-2xl p-4 border border-emerald-500/15">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/3"></div>
          <div class="relative">
            <div class="flex items-center gap-1.5 mb-2">
              <i class="pi pi-clock text-emerald-400 text-xs"></i>
              <span class="text-[0.6rem] text-emerald-400/80 uppercase tracking-widest font-bold">Compensatorio</span>
            </div>
            <p class="text-3xl font-extrabold text-white m-0 tracking-tight">{{ compensatoryBalance }}</p>
            <p class="text-[0.6rem] text-gray-500 m-0 mt-0.5 font-medium">hrs aprobadas</p>
          </div>
        </div>
      </div>

      <!-- Stats scroll -->
      <div class="portal-scroll-row">
        <div class="portal-stat-mini rounded-2xl p-3.5 min-w-[140px]">
          <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Días Trabajados</p>
          <p class="text-xl font-extrabold text-white m-0 mt-1">{{ daysWorkedThisMonth }}</p>
        </div>
        <div class="portal-stat-mini rounded-2xl p-3.5 min-w-[140px]">
          <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Tardanzas</p>
          <p class="text-xl font-extrabold m-0 mt-1" [class.text-white]="(myLates?.length ?? 0) === 0" [class.text-red-400]="(myLates?.length ?? 0) > 0">{{ myLates?.length ?? 0 }}</p>
        </div>
        <div class="portal-stat-mini rounded-2xl p-3.5 min-w-[140px]">
          <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Compensatorio</p>
          <p class="text-xl font-extrabold text-white m-0 mt-1">{{ approvedCompensatoryHours }} <span class="text-xs font-medium text-gray-500">hrs</span></p>
        </div>
        @if (canViewSalary()) {
        <div class="portal-stat-mini rounded-2xl p-3.5 min-w-[140px] cursor-pointer" (click)="toggleSalary.emit()">
          <p class="text-[0.6rem] text-gray-500 m-0 uppercase tracking-wider font-semibold">Salario</p>
          <p class="text-xl font-extrabold m-0 mt-1" [class.text-amber-400]="showSalary" [class.text-gray-600]="!showSalary">
            @if (showSalary && employee?.monthly_salary) {
              {{ employee?.monthly_salary | currency : '$' }}
            } @else {
              ****
            }
          </p>
        </div>
        }
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-2 gap-3">
        <button class="portal-action-mobile group" (click)="quickAction.emit('vacations')">
          <div class="w-10 h-10 rounded-xl bg-blue-500/12 flex items-center justify-center ring-1 ring-blue-500/15">
            <i class="pi pi-sun text-blue-400"></i>
          </div>
          <span class="text-xs text-white font-semibold">Vacaciones</span>
        </button>
        <button class="portal-action-mobile group" (click)="quickAction.emit('documents')">
          <div class="w-10 h-10 rounded-xl bg-purple-500/12 flex items-center justify-center ring-1 ring-purple-500/15">
            <i class="pi pi-file text-purple-400"></i>
          </div>
          <span class="text-xs text-white font-semibold">Documentos</span>
        </button>
        <button class="portal-action-mobile group" (click)="quickAction.emit('compensatory')">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/12 flex items-center justify-center ring-1 ring-emerald-500/15">
            <i class="pi pi-clock text-emerald-400"></i>
          </div>
          <span class="text-xs text-white font-semibold">Compensatorio</span>
        </button>
        <button class="portal-action-mobile group" (click)="quickAction.emit('uniform_request')">
          <div class="w-10 h-10 rounded-xl bg-amber-500/12 flex items-center justify-center ring-1 ring-amber-500/15">
            <i class="pi pi-tag text-amber-400"></i>
          </div>
          <span class="text-xs text-white font-semibold">Uniforme</span>
        </button>
      </div>

      <!-- Recent timelogs -->
      <div class="portal-panel rounded-2xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-7 h-7 rounded-lg bg-amber-500/12 flex items-center justify-center">
            <i class="pi pi-clock text-amber-400 text-xs"></i>
          </div>
          <span class="text-sm font-bold text-white">Marcaciones</span>
        </div>
        <div class="flex flex-col gap-2">
          @if (recentTimelogs && recentTimelogs.length > 0) {
            @for (event of recentTimelogs; track event.id) {
            <div class="portal-timelog-row flex items-center gap-2.5 p-2.5 rounded-xl">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                [ngClass]="event.type === 'check_in' ? 'bg-emerald-500/12 ring-1 ring-emerald-500/15' : 'bg-orange-500/12 ring-1 ring-orange-500/15'">
                <i [class]="'pi ' + event.icon + ' text-xs'" [ngClass]="event.type === 'check_in' ? 'text-emerald-400' : 'text-orange-400'"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-white font-semibold m-0">{{ event.typeLabel }}</p>
                <p class="text-[0.65rem] text-gray-500 m-0 mt-0.5 truncate">
                  {{ event.date | date : 'EEE d MMM' }} · {{ event.time }}
                </p>
              </div>
            </div>
            }
          } @else {
            <div class="flex flex-col items-center py-6">
              <i class="pi pi-clock text-gray-700 text-xl mb-2"></i>
              <p class="text-gray-500 text-xs m-0">Sin marcaciones recientes</p>
            </div>
          }
        </div>
      </div>

      <!-- Quick info -->
      @if (employee) {
      <div class="portal-panel rounded-2xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-7 h-7 rounded-lg bg-violet-500/12 flex items-center justify-center">
            <i class="pi pi-id-card text-violet-400 text-xs"></i>
          </div>
          <span class="text-sm font-bold text-white">Mi Información</span>
        </div>
        <div class="flex flex-col gap-2">
          <div class="portal-info-row flex items-center justify-between p-2.5 rounded-xl">
            <div class="flex items-center gap-2"><i class="pi pi-id-card text-amber-400 text-xs"></i><span class="text-[0.65rem] text-gray-400">Cargo</span></div>
            <span class="text-xs text-white font-semibold">{{ employee.position?.name || 'N/A' }}</span>
          </div>
          <div class="portal-info-row flex items-center justify-between p-2.5 rounded-xl">
            <div class="flex items-center gap-2"><i class="pi pi-map-marker text-blue-400 text-xs"></i><span class="text-[0.65rem] text-gray-400">Sucursal</span></div>
            <span class="text-xs text-white font-semibold">{{ employee.branch?.name || 'N/A' }}</span>
          </div>
          <div class="portal-info-row flex items-center justify-between p-2.5 rounded-xl">
            <div class="flex items-center gap-2"><i class="pi pi-sitemap text-purple-400 text-xs"></i><span class="text-[0.65rem] text-gray-400">Departamento</span></div>
            <span class="text-xs text-white font-semibold">{{ employee.department?.name || 'N/A' }}</span>
          </div>
          <div class="portal-info-row flex items-center justify-between p-2.5 rounded-xl">
            <div class="flex items-center gap-2"><i class="pi pi-calendar text-emerald-400 text-xs"></i><span class="text-[0.65rem] text-gray-400">Ingreso</span></div>
            <span class="text-xs text-white font-semibold">{{ employee.start_date | date : 'mediumDate' }}</span>
          </div>
          <div class="portal-info-row flex items-center justify-between p-2.5 rounded-xl">
            <div class="flex items-center gap-2"><i class="pi pi-envelope text-amber-400 text-xs"></i><span class="text-[0.65rem] text-gray-400">Email</span></div>
            <span class="text-[0.6rem] text-white font-semibold truncate max-w-[150px]">{{ employee.work_email || 'N/A' }}</span>
          </div>
        </div>
      </div>
      }
    </div>
    }
  `,
  styles: [`
    /* ── Ticker ── */
    .portal-ticker {
      overflow: hidden;
      padding: 5px 0;
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
    }
    .portal-ticker-track {
      display: flex;
      gap: 2.5rem;
      white-space: nowrap;
      animation: portal-ticker-scroll 60s linear infinite;
      width: max-content;
    }
    .portal-ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 0.01em;
    }
    .portal-ticker-item i {
      color: #fbbf24;
      font-size: 0.6rem;
    }
    .portal-ticker-item strong {
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
    }
    .portal-ticker-sep {
      color: rgba(255, 255, 255, 0.15);
      margin: 0 2px;
    }
    @keyframes portal-ticker-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* ── Shared card foundations ── */
    .portal-card-balance {
      border: 1px solid rgba(64, 64, 64, 0.25);
      background: rgba(23, 23, 23, 0.6);
      backdrop-filter: blur(8px);
      transition: border-color 0.3s ease, transform 0.2s ease;
    }
    .portal-card-balance:hover {
      border-color: rgba(82, 82, 82, 0.4);
      transform: translateY(-1px);
    }

    .portal-stat-mini {
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
    }

    .portal-stat-card {
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
      transition: border-color 0.2s ease;
    }
    .portal-stat-card:hover {
      border-color: rgba(82, 82, 82, 0.4);
    }

    .portal-panel {
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
    }

    .portal-timelog-row {
      background: rgba(10, 10, 10, 0.4);
      border: 1px solid rgba(50, 50, 50, 0.2);
      transition: background 0.15s ease;
    }
    .portal-timelog-row:hover {
      background: rgba(20, 20, 20, 0.6);
    }

    .portal-info-row {
      background: rgba(10, 10, 10, 0.3);
      border: 1px solid rgba(50, 50, 50, 0.15);
    }

    /* ── Quick actions (desktop) ── */
    .portal-action {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.875rem 1rem;
      border-radius: 1rem;
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .portal-action:hover {
      background: rgba(30, 30, 30, 0.8);
      border-color: rgba(82, 82, 82, 0.4);
      transform: translateY(-1px);
    }
    .portal-action:active {
      transform: scale(0.98);
    }

    /* ── Quick actions (mobile) ── */
    .portal-action-mobile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      padding: 1rem 0.5rem;
      border-radius: 1rem;
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .portal-action-mobile:active {
      transform: scale(0.96);
      background: rgba(30, 30, 30, 0.8);
    }

    /* ── Mobile scroll row ── */
    .portal-scroll-row {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 4px;
    }
    .portal-scroll-row::-webkit-scrollbar { display: none; }
    .portal-scroll-row > * {
      scroll-snap-align: start;
      flex-shrink: 0;
    }
  `],
})
export class EmployeePortalDashboardComponent {
  protected device = inject(DeviceService);
  private permissions = inject(PermissionsService);

  @Input() employee: Employee | null = null;
  @Input() daysWorkedThisMonth = 0;
  @Input() myLates: Array<{ minutes: number }> | null = [];
  @Input() approvedCompensatoryHours = 0;
  @Input() recentTimelogs: DashboardTimelogEvent[] | null = [];
  @Input() currentDate: Date = new Date();
  @Input() showSalary = false;
  @Input() vacationBalance = 0;
  @Input() compensatoryBalance = 0;
  @Output() toggleSalary = new EventEmitter<void>();
  @Output() quickAction = new EventEmitter<string>();

  // Photo nudge - shows ~30% of sessions, dismissable, respects localStorage
  public showPhotoNudge = (() => {
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('photo_nudge_dismissed');
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      // Don't show for 7 days after dismissal
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return false;
    }
    return Math.random() < 0.3;
  })();

  public dismissPhotoNudge(): void {
    this.showPhotoNudge = false;
    localStorage.setItem('photo_nudge_dismissed', Date.now().toString());
  }

  private readonly tips = [
    { icon: 'pi-clock', title: 'Puntualidad', message: 'Recuerda marcar tu entrada a tiempo todos los días' },
    { icon: 'pi-sun', title: 'Vacaciones', message: 'Planifica tus vacaciones con anticipación para una mejor coordinación' },
    { icon: 'pi-file', title: 'Documentos', message: 'Puedes solicitar cartas de trabajo directamente desde el portal' },
    { icon: 'pi-bell', title: 'Notificaciones', message: 'Activa las notificaciones push para no perderte actualizaciones' },
    { icon: 'pi-shield', title: 'PIN de Caja', message: 'Mantén tu PIN seguro y cámbialo periódicamente' },
    { icon: 'pi-calendar', title: 'Compensatorio', message: 'Registra tus horas extras para tiempo compensatorio' },
    { icon: 'pi-heart', title: 'Bienestar', message: 'Tu salud es lo primero, no dudes en reportar incapacidades' },
    { icon: 'pi-check-circle', title: 'Solicitudes', message: 'Revisa el estado de tus solicitudes en "Mis Solicitudes"' },
    { icon: 'pi-tag', title: 'Uniformes', message: 'Solicita tu uniforme nuevo cuando lo necesites' },
    { icon: 'pi-id-card', title: 'Perfil', message: 'Mantén tu información de contacto actualizada' },
  ];

  public doubledTips = [...this.tips, ...this.tips];

  canViewSalary(): boolean {
    return this.permissions.canCurrentUser('view_salaries');
  }

  getMotivationalMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      const morning = [
        'Que tengas un excelente día',
        'Arranca el día con toda la energía',
        'Buenos días, a dar lo mejor hoy',
      ];
      return morning[Math.floor(this.currentDate.getDate() % morning.length)];
    } else if (hour < 18) {
      const afternoon = [
        'Sigue así, vas muy bien',
        'La mitad del día ya es tuya',
        'Buena tarde, a seguir adelante',
      ];
      return afternoon[Math.floor(this.currentDate.getDate() % afternoon.length)];
    } else {
      const evening = [
        'Buen trabajo hoy, descansa bien',
        'Otro día productivo completado',
        'Buena noche, recarga energías',
      ];
      return evening[Math.floor(this.currentDate.getDate() % evening.length)];
    }
  }
}
