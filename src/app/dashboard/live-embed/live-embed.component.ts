import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-live-embed',
  standalone: true,
  template: `
    <div class="flex flex-col" [style.height]="device.isDesktop() ? '100%' : 'calc(100dvh - 120px)'">
      <iframe
        [src]="url"
        class="flex-1 w-full"
        style="border: none; height: 100%"
        frameborder="0"
        allowfullscreen
      ></iframe>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  `]
})
export class LiveEmbedComponent {
  private sanitizer = inject(DomSanitizer);
  protected device = inject(DeviceService);
  public url: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://dashboards.blackdogpanama.com/live'
  );
}
