import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';

import { NgxSpinnerComponent, NgxSpinnerService } from 'ngx-spinner';

@Component({
  imports: [RouterOutlet, NgxSpinnerComponent],
  providers: [MessageService],
  selector: 'pt-root',
  template: ` <router-outlet />
    <ngx-spinner type="ball-scale-multiple" bdColor="rgb(250, 184, 3, 0.8)">
      <p class="text-white">Cargando...</p></ngx-spinner
    >`,
  styles: ``,
})
export class AppComponent implements OnInit {
  private spinner = inject(NgxSpinnerService);
  private router = inject(Router);

  ngOnInit() {
    // Forzar modo oscuro siempre
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
    
    // Mostrar la URL de Supabase que se está usando
    const supabaseUrl = process.env['ENV_SUPABASE_URL'];
    const supabaseApiKey = process.env['ENV_SUPABASE_API_KEY'];
    // Configuración de Supabase validada
    // Logs removidos para producción (usar LoggerService si necesario)
    
    this.router.initialNavigation();
  }
}
