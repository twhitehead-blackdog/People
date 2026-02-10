import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';

@Component({
  selector: 'pt-time-management',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, Button, Menu],
  template: `<div [ngClass]="{ 'naz-theme': isNaz() }">
    <header
      class="bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600/50 shadow-md"
      [ngClass]="{ 'naz-header': isNaz() }"
    >
      <div
        class="mx-auto max-w-7xl px-3 py-2 sm:px-4 sm:py-3 lg:px-8 sticky top-0 z-10"
      >
        <!-- Desktop Navigation -->
        <div class="hidden md:block w-full overflow-x-auto">
          <div class="flex gap-2 min-w-max justify-center">
            @if (store.isAdmin()) {
            <a
              routerLink="timelogs"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-clock text-base"></i> <span>Marcaciones</span></a
            >
            } @if(store.isAdmin()) {
            <a
              routerLink="vet-schedule"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-heart text-base"></i> <span>Horario Vet</span></a
            >
            } @if(store.isAdmin()) {
            <a
              routerLink="salon-schedule"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-shop text-base"></i>
              <span>Horario Peluquería</span></a
            >
            }
            <a
              routerLink="timetables"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-calendar-clock text-base"></i>
              <span>Turnos</span></a
            >
            @if(store.isAdmin()) {
            <a
              routerLink="schedules"
              class="flex gap-2 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-4 py-2 transition-all duration-200 whitespace-nowrap"
              [routerLinkActive]="[
                'bg-gradient-to-r',
                'from-amber-500/20',
                'to-amber-600/20',
                'text-amber-300',
                'shadow-md'
              ]"
              ><i class="pi pi-calendar text-base"></i> <span>Horarios</span></a
            >
            }
          </div>
        </div>

        <!-- Mobile Navigation -->
        <div class="md:hidden flex items-center justify-between gap-2">
          <!-- Scrollable nav items -->
          <div class="flex-1 overflow-x-auto scrollbar-hide">
            <div class="flex gap-1.5 min-w-max py-1">
              @if (store.isAdmin()) {
              <a
                routerLink="timelogs"
                class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
                [routerLinkActive]="[
                  'bg-gradient-to-r',
                  'from-amber-500/20',
                  'to-amber-600/20',
                  'text-amber-300',
                  'shadow-md'
                ]"
                ><i class="pi pi-clock text-sm"></i> <span>Marcas</span></a
              >
              } @if(store.isAdmin()) {
              <a
                routerLink="vet-schedule"
                class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
                [routerLinkActive]="[
                  'bg-gradient-to-r',
                  'from-amber-500/20',
                  'to-amber-600/20',
                  'text-amber-300',
                  'shadow-md'
                ]"
                ><i class="pi pi-heart text-sm"></i> <span>Vet</span></a
              >
              } @if(store.isAdmin()) {
              <a
                routerLink="salon-schedule"
                class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
                [routerLinkActive]="[
                  'bg-gradient-to-r',
                  'from-amber-500/20',
                  'to-amber-600/20',
                  'text-amber-300',
                  'shadow-md'
                ]"
                ><i class="pi pi-shop text-sm"></i>
                <span>Pelu</span></a
              >
              }
              <a
                routerLink="timetables"
                class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
                [routerLinkActive]="[
                  'bg-gradient-to-r',
                  'from-amber-500/20',
                  'to-amber-600/20',
                  'text-amber-300',
                  'shadow-md'
                ]"
                ><i class="pi pi-calendar-clock text-sm"></i>
                <span>Turnos</span></a
              >
              @if(store.isAdmin()) {
              <a
                routerLink="schedules"
                class="flex gap-1.5 items-center rounded-lg font-medium text-gray-300 hover:text-white hover:bg-neutral-600/50 px-3 py-2 transition-all duration-200 whitespace-nowrap text-sm"
                [routerLinkActive]="[
                  'bg-gradient-to-r',
                  'from-amber-500/20',
                  'to-amber-600/20',
                  'text-amber-300',
                  'shadow-md'
                ]"
                ><i class="pi pi-calendar text-sm"></i> <span>Horarios</span></a
              >
              }
            </div>
          </div>

          <!-- Mobile Menu Button (if needed for overflow items) -->
          @if (hasOverflowItems()) {
          <p-button
            icon="pi pi-ellipsis-v"
            severity="secondary"
            text
            size="small"
            (onClick)="menu.toggle($event)"
          />
          <p-menu
            #menu
            [model]="overflowMenuItems()"
            [popup]="true"
            appendTo="body"
          />
          }
        </div>
      </div>
    </header>
    <main
      class="bg-neutral-900 min-h-screen"
      [ngClass]="{ 'naz-main': isNaz() }"
    >
      <div class="mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <router-outlet />
      </div>
    </main>
  </div>`,
  styles: `
    /* Tema Naz */
    .naz-theme header.naz-header {
      background: #000000 !important;
      border-bottom-color: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme .naz-header a {
      color: #C6C2BF !important;
    }

    .naz-theme .naz-header a:hover {
      color: #FFFFFF !important;
      background: rgba(255, 255, 255, 0.10) !important;
    }

    .naz-theme .naz-header a[routerlinkactive] {
      background: #0D0D0D !important;
      color: #FFFFFF !important;
    }

    .naz-theme main.naz-main {
      background: #000000 !important;
    }

    /* Hide scrollbar for Chrome, Safari and Opera */
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }

    /* Hide scrollbar for IE, Edge and Firefox */
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeManagementComponent {
  public store = inject(DashboardStore);
  public organizationService = inject(OrganizationService);

  // Computed para verificar si es Naz
  public isNaz = computed(() => this.organizationService.isNaz());

  // Check if there are many items that might overflow
  public hasOverflowItems = computed(() => {
    // Show overflow menu if admin (more items)
    return this.store.isAdmin();
  });

  // Menu items for overflow menu (mobile)
  public overflowMenuItems = computed(() => {
    const items = [];
    if (this.store.isAdmin()) {
      items.push(
        { label: 'Marcaciones', icon: 'pi pi-clock', routerLink: 'timelogs' },
        { label: 'Horario Vet', icon: 'pi pi-heart', routerLink: 'vet-schedule' },
        { label: 'Horario Peluquería', icon: 'pi pi-shop', routerLink: 'salon-schedule' },
        { label: 'Horarios', icon: 'pi pi-calendar', routerLink: 'schedules' }
      );
    }
    items.push({ label: 'Turnos', icon: 'pi pi-calendar-clock', routerLink: 'timetables' });
    return items;
  });
}
