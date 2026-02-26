import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type TimelineStep = {
  label: string;
  icon: string;
  state: 'completed' | 'active' | 'future' | 'rejected';
  date?: string | Date | null;
};

@Component({
  selector: 'pt-employee-portal-request-timeline',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline" [class.timeline--compact]="compact()">
      @for (step of steps(); track step.label; let i = $index; let last = $last) {
      <div class="timeline-step">
        <!-- Circle -->
        <div
          class="timeline-circle"
          [ngClass]="{
            'timeline-circle--completed': step.state === 'completed',
            'timeline-circle--active': step.state === 'active',
            'timeline-circle--rejected': step.state === 'rejected',
            'timeline-circle--future': step.state === 'future'
          }"
        >
          @if (step.state === 'completed') {
          <i class="pi pi-check text-[0.6rem]"></i>
          } @else if (step.state === 'rejected') {
          <i class="pi pi-times text-[0.6rem]"></i>
          } @else if (step.state === 'active') {
          <div class="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          }
        </div>
        <!-- Line -->
        @if (!last) {
        <div
          class="timeline-line"
          [ngClass]="{
            'bg-green-500': step.state === 'completed',
            'bg-amber-400/40': step.state === 'active',
            'bg-red-500/40': step.state === 'rejected',
            'bg-neutral-700': step.state === 'future'
          }"
        ></div>
        }
        <!-- Label -->
        @if (!compact()) {
        <span
          class="timeline-label"
          [ngClass]="{
            'text-green-400': step.state === 'completed',
            'text-amber-400': step.state === 'active',
            'text-red-400': step.state === 'rejected',
            'text-gray-500': step.state === 'future'
          }"
        >
          {{ step.label }}
        </span>
        }
      </div>
      }
    </div>
  `,
  styles: [`
    .timeline {
      display: flex;
      align-items: flex-start;
      gap: 0;
      width: 100%;
    }

    .timeline-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
    }

    .timeline-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      flex-shrink: 0;
    }
    .timeline-circle--completed {
      background: rgba(34, 197, 94, 0.2);
      border: 2px solid #22c55e;
      color: #22c55e;
    }
    .timeline-circle--active {
      background: rgba(251, 191, 36, 0.15);
      border: 2px solid #fbbf24;
    }
    .timeline-circle--rejected {
      background: rgba(239, 68, 68, 0.2);
      border: 2px solid #ef4444;
      color: #ef4444;
    }
    .timeline-circle--future {
      background: rgba(64, 64, 64, 0.4);
      border: 2px solid #404040;
    }

    .timeline-line {
      position: absolute;
      top: 12px;
      left: calc(50% + 12px);
      right: calc(-50% + 12px);
      height: 2px;
    }

    .timeline-label {
      font-size: 0.6rem;
      font-weight: 500;
      margin-top: 4px;
      text-align: center;
      white-space: nowrap;
    }

    .timeline--compact .timeline-circle {
      width: 18px;
      height: 18px;
    }
    .timeline--compact .timeline-circle .pi {
      font-size: 0.5rem;
    }
    .timeline--compact .timeline-circle .animate-pulse {
      width: 6px;
      height: 6px;
    }
    .timeline--compact .timeline-line {
      top: 9px;
      left: calc(50% + 9px);
      right: calc(-50% + 9px);
    }
  `],
})
export class EmployeePortalRequestTimelineComponent {
  status = input<string>('pending');
  timestamps = input<{
    created_at?: string | Date | null;
    reviewed_at?: string | Date | null;
    completed_at?: string | Date | null;
  }>({});
  compact = input(false);

  steps = computed<TimelineStep[]>(() => {
    const s = this.status();
    const ts = this.timestamps();

    const isRejected = s === 'rejected' || s === 'rechazado';
    const isApproved = s === 'approved' || s === 'aprobado' || s === 'is_approved';
    const isReviewed = s === 'in_review' || s === 'en_revision' || !!ts.reviewed_at;

    return [
      {
        label: 'Enviada',
        icon: 'pi pi-send',
        state: 'completed',
        date: ts.created_at,
      },
      {
        label: 'En Revisión',
        icon: 'pi pi-search',
        state: isApproved || isRejected
          ? 'completed'
          : isReviewed
          ? 'active'
          : 'future',
        date: ts.reviewed_at,
      },
      {
        label: isRejected ? 'Rechazada' : 'Aprobada',
        icon: isRejected ? 'pi pi-times' : 'pi pi-check',
        state: isApproved
          ? 'completed'
          : isRejected
          ? 'rejected'
          : 'future',
        date: ts.completed_at,
      },
    ];
  });
}
