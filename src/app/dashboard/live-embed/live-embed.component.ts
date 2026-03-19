import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

@Component({
  selector: 'pt-live-embed',
  standalone: true,
  template: `
    <div class="flex flex-col" style="height: 100dvh">
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
  public url: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://dashboards.blackdogpanama.com'
  );
}
