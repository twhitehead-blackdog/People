import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Card } from 'primeng/card';

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
  imports: [CommonModule, Card],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (card of cards; track card.id) {
      <p-card
        [class.border-yellow-400]="activeSection === card.section"
        [class.border-neutral-700]="activeSection !== card.section"
        class="cursor-pointer hover:shadow-lg transition-all border-2"
        (click)="selectSection(card.section)"
      >
        <div class="flex flex-col items-center text-center gap-3">
          <div
            [class]="
              'w-12 h-12 rounded-full flex items-center justify-center ' +
              card.colorClass
            "
          >
            <i [class]="'pi ' + card.icon + ' text-xl'"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">{{ card.label }}</h3>
          <p class="text-sm text-gray-400 m-0">{{ card.description }}</p>
        </div>
      </p-card>
      }
    </div>
  `,
})
export class EmployeePortalManagementNavigationComponent {
  @Input() activeSection: string | null = null;
  @Output() sectionChange = new EventEmitter<string>();

  public cards: ManagementNavCard[] = [
    {
      id: 'disabilities',
      label: 'Incapacidades',
      description: 'Sube documentos de incapacidad médica',
      icon: 'pi-file-plus',
      section: 'disabilities',
      colorClass: 'bg-blue-500/20 text-blue-400',
    },
    {
      id: 'documents',
      label: 'Solicitar Documentos',
      description: 'Solicita cartas de trabajo u otros documentos',
      icon: 'pi-file-edit',
      section: 'documents',
      colorClass: 'bg-green-500/20 text-green-400',
    },
    {
      id: 'vacations',
      label: 'Solicitar Vacaciones',
      description: 'Solicita tus días de vacaciones',
      icon: 'pi-calendar-plus',
      section: 'vacations',
      colorClass: 'bg-purple-500/20 text-purple-400',
    },
    {
      id: 'compensatory',
      label: 'Tiempo Compensatorio',
      description: 'Solicita tiempo compensatorio por horas extras',
      icon: 'pi-clock',
      section: 'compensatory',
      colorClass: 'bg-cyan-500/20 text-cyan-400',
    },
    {
      id: 'timelog_correction',
      label: 'Omisión de Marcación',
      description: 'Solicita corrección de marcación de asistencia',
      icon: 'pi-exclamation-triangle',
      section: 'timelog_correction',
      colorClass: 'bg-orange-500/20 text-orange-400',
    },
    {
      id: 'uniform_request',
      label: 'Solicitud de Uniforme',
      description: 'Solicita uniformes o prendas de trabajo',
      icon: 'pi-tag',
      section: 'uniform_request',
      colorClass: 'bg-teal-500/20 text-teal-400',
    },
    {
      id: 'my-requests',
      label: 'Mis Solicitudes',
      description: 'Visualiza todas tus solicitudes',
      icon: 'pi-list',
      section: 'my-requests',
      colorClass: 'bg-indigo-500/20 text-indigo-400',
    },
  ];

  public selectSection(section: string): void {
    this.sectionChange.emit(section);
  }
}
