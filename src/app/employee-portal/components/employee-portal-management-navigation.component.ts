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
type ManagementNavCard = {
  id: string;
  label: string;
  description: string;
  icon: string;
  section: string;
  colorClass: string;
};

@Component({
  selector: 'pt-employee-portal-management-navigation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <div class="grid grid-cols-2 gap-4">
      @for (card of cards; track card.id) {
      <button
        class="mgmt-card group"
        [class.mgmt-card--active]="activeSection === card.section"
        (click)="selectSection(card.section)"
      >
        <div [class]="'w-14 h-14 rounded-2xl flex items-center justify-center ring-1 transition-all duration-200 flex-shrink-0 ' + card.colorClass">
          <i [class]="'pi ' + card.icon + ' text-xl'"></i>
        </div>
        <div class="text-left min-w-0">
          <span class="text-base font-semibold text-white block">{{ card.label }}</span>
          <span class="text-xs text-gray-500 block mt-1 leading-snug">{{ card.description }}</span>
        </div>
      </button>
      }
    </div>
    } @else {
    <div class="grid grid-cols-2 gap-2.5">
      @for (card of cards; track card.id) {
      <button
        class="flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition-all"
        [class.border-amber-400]="activeSection === card.section"
        [class.bg-amber-500/10]="activeSection === card.section"
        [class.border-neutral-700/30]="activeSection !== card.section"
        [class.bg-neutral-800/60]="activeSection !== card.section"
        style="-webkit-tap-highlight-color: transparent;"
        (click)="selectSection(card.section)"
      >
        <div [class]="'w-10 h-10 rounded-full flex items-center justify-center ' + card.colorClass">
          <i [class]="'pi ' + card.icon + ' text-base'"></i>
        </div>
        <span class="text-xs font-semibold text-white leading-tight">{{ card.label }}</span>
      </button>
      }
    </div>
    }
  `,
  styles: [`
    .mgmt-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.25rem;
      border-radius: 1rem;
      background: rgba(23, 23, 23, 0.5);
      border: 1px solid rgba(64, 64, 64, 0.25);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      -webkit-tap-highlight-color: transparent;
    }
    .mgmt-card:hover {
      background: rgba(30, 30, 30, 0.8);
      border-color: rgba(82, 82, 82, 0.4);
      transform: translateY(-1px);
    }
    .mgmt-card:active { transform: scale(0.98); }
    .mgmt-card--active {
      border-color: rgba(251, 191, 36, 0.3) !important;
      background: rgba(251, 191, 36, 0.06) !important;
    }
  `],
})
export class EmployeePortalManagementNavigationComponent {
  protected device = inject(DeviceService);
  @Input() activeSection: string | null = null;
  @Output() sectionChange = new EventEmitter<string>();

  public cards: ManagementNavCard[] = [
    {
      id: 'disabilities',
      label: 'Incapacidades',
      description: 'Sube documentos de incapacidad médica',
      icon: 'pi-file-plus',
      section: 'disabilities',
      colorClass: 'bg-blue-500/12 ring-blue-500/15 text-blue-400',
    },
    {
      id: 'documents',
      label: 'Solicitar Documentos',
      description: 'Solicita cartas de trabajo u otros documentos',
      icon: 'pi-file-edit',
      section: 'documents',
      colorClass: 'bg-green-500/12 ring-green-500/15 text-green-400',
    },
    {
      id: 'vacations',
      label: 'Solicitar Vacaciones',
      description: 'Solicita tus días de vacaciones',
      icon: 'pi-calendar-plus',
      section: 'vacations',
      colorClass: 'bg-purple-500/12 ring-purple-500/15 text-purple-400',
    },
    {
      id: 'compensatory',
      label: 'Tiempo Compensatorio',
      description: 'Solicita tiempo compensatorio por horas extras',
      icon: 'pi-clock',
      section: 'compensatory',
      colorClass: 'bg-cyan-500/12 ring-cyan-500/15 text-cyan-400',
    },
    {
      id: 'timelog_correction',
      label: 'Omisión de Marcación',
      description: 'Solicita corrección de marcación de asistencia',
      icon: 'pi-exclamation-triangle',
      section: 'timelog_correction',
      colorClass: 'bg-orange-500/12 ring-orange-500/15 text-orange-400',
    },
    {
      id: 'work_permit',
      label: 'Solicitud de Permiso',
      description: 'Solicita permisos laborales',
      icon: 'pi-id-card',
      section: 'work_permit',
      colorClass: 'bg-amber-500/12 ring-amber-500/15 text-amber-400',
    },
    {
      id: 'uniform_request',
      label: 'Solicitud de Uniforme',
      description: 'Solicita uniformes o prendas de trabajo',
      icon: 'pi-tag',
      section: 'uniform_request',
      colorClass: 'bg-teal-500/12 ring-teal-500/15 text-teal-400',
    },
    {
      id: 'surveys',
      label: 'Encuestas',
      description: 'Completa encuestas asignadas por HR',
      icon: 'pi-chart-bar',
      section: 'surveys',
      colorClass: 'bg-pink-500/12 ring-pink-500/15 text-pink-400',
    },
    {
      id: 'my-requests',
      label: 'Mis Solicitudes',
      description: 'Visualiza todas tus solicitudes',
      icon: 'pi-list',
      section: 'my-requests',
      colorClass: 'bg-indigo-500/12 ring-indigo-500/15 text-indigo-400',
    },
  ];

  public selectSection(section: string): void {
    this.sectionChange.emit(section);
  }
}
