// Wrapper de compatibilidad: la lógica vive en TicketsAdminComponent.
// Esta clase se conserva para no romper rutas existentes que importan el nombre viejo.
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TicketsAdminComponent } from './tickets-admin.component';

@Component({
  selector: 'pt-it-tickets-admin',
  standalone: true,
  imports: [TicketsAdminComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<pt-tickets-admin department="it" />`,
})
export class ItTicketsAdminComponent {}
