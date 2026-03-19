import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

@Component({
  selector: 'pt-analytics-embed',
  standalone: true,
  template: `
    <iframe
      [src]="iframeUrl"
      style="width: 100%; height: calc(100dvh - 56px); border: none; display: block;"
      frameborder="0"
    ></iframe>
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `]
})
export class AnalyticsEmbedComponent {
  private sanitizer = inject(DomSanitizer);

  public iframeUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/analytics/');
}
