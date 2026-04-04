import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: '',
})
export class ScorecardRedirectComponent {
  constructor() {
    window.location.href = 'https://scorecard.blackdogpanama.com';
  }
}
