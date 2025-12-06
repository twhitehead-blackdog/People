import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerComponent } from 'ngx-spinner';
import { MessageService } from 'primeng/api';

@Component({
  imports: [RouterOutlet, NgxSpinnerComponent],
  providers: [MessageService],
  selector: 'pt-root',
  template: ` <router-outlet />
    <ngx-spinner type="ball-scale-multiple" bdColor="rgba(0, 0, 0, 0.5)">
      <p class="text-white">Cargando...</p></ngx-spinner
    >`,
  styles: ``,
})
export class AppComponent {}
