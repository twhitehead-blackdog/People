import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente wrapper para usar iconos de Phosphor Icons en Angular
 * Los web components se registran automáticamente al importar el paquete
 * Uso: <ph-icon name="paw-print" [size]="24" [color]="'#fbbf24'" [weight]="'regular'"></ph-icon>
 */
@Component({
  selector: 'ph-icon',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ng-container [ngSwitch]="name">
      <ph-paw-print *ngSwitchCase="'paw-print'" [size]="size" [color]="color" [weight]="weight"></ph-paw-print>
      <ph-dog *ngSwitchCase="'dog'" [size]="size" [color]="color" [weight]="weight"></ph-dog>
      <ph-cat *ngSwitchCase="'cat'" [size]="size" [color]="color" [weight]="weight"></ph-cat>
      <ph-heart *ngSwitchCase="'heart'" [size]="size" [color]="color" [weight]="weight"></ph-heart>
      <ph-heart *ngSwitchCase="'heart-fill'" [size]="size" [color]="color" weight="fill"></ph-heart>
      <ph-archive *ngSwitchCase="'archive'" [size]="size" [color]="color" [weight]="weight"></ph-archive>
      <ph-folder *ngSwitchCase="'folder'" [size]="size" [color]="color" [weight]="weight"></ph-folder>
      <ph-folder-open *ngSwitchCase="'folder-open'" [size]="size" [color]="color" [weight]="weight"></ph-folder-open>
      <ph-eye *ngSwitchCase="'eye'" [size]="size" [color]="color" [weight]="weight"></ph-eye>
      <ph-pencil *ngSwitchCase="'pencil'" [size]="size" [color]="color" [weight]="weight"></ph-pencil>
      <ph-copy *ngSwitchCase="'copy'" [size]="size" [color]="color" [weight]="weight"></ph-copy>
      <ph-check *ngSwitchCase="'check'" [size]="size" [color]="color" [weight]="weight"></ph-check>
      <ph-check-circle *ngSwitchCase="'check-circle'" [size]="size" [color]="color" [weight]="weight"></ph-check-circle>
      <ph-x *ngSwitchCase="'x'" [size]="size" [color]="color" [weight]="weight"></ph-x>
      <ph-chart-line *ngSwitchCase="'chart-line'" [size]="size" [color]="color" [weight]="weight"></ph-chart-line>
      <ph-chart-bar *ngSwitchCase="'chart-bar'" [size]="size" [color]="color" [weight]="weight"></ph-chart-bar>
      <ph-file-text *ngSwitchCase="'file-text'" [size]="size" [color]="color" [weight]="weight"></ph-file-text>
      <ph-building *ngSwitchCase="'building'" [size]="size" [color]="color" [weight]="weight"></ph-building>
      <ph-list-checks *ngSwitchCase="'list-checks'" [size]="size" [color]="color" [weight]="weight"></ph-list-checks>
      <ph-question *ngSwitchCase="'question'" [size]="size" [color]="color" [weight]="weight"></ph-question>
      <ph-calendar *ngSwitchCase="'calendar'" [size]="size" [color]="color" [weight]="weight"></ph-calendar>
      <ph-users *ngSwitchCase="'users'" [size]="size" [color]="color" [weight]="weight"></ph-users>
      <ph-handshake *ngSwitchCase="'handshake'" [size]="size" [color]="color" [weight]="weight"></ph-handshake>
      <ph-clock *ngSwitchCase="'clock'" [size]="size" [color]="color" [weight]="weight"></ph-clock>
      <ph-user *ngSwitchCase="'user'" [size]="size" [color]="color" [weight]="weight"></ph-user>
      <ph-gear *ngSwitchCase="'gear'" [size]="size" [color]="color" [weight]="weight"></ph-gear>
      <ph-star *ngSwitchCase="'star'" [size]="size" [color]="color" [weight]="weight"></ph-star>
      <ph-trash *ngSwitchCase="'trash'" [size]="size" [color]="color" [weight]="weight"></ph-trash>
      <ph-plus *ngSwitchCase="'plus'" [size]="size" [color]="color" [weight]="weight"></ph-plus>
      <ph-image *ngSwitchCase="'image'" [size]="size" [color]="color" [weight]="weight"></ph-image>
      <ph-prohibit *ngSwitchCase="'prohibit'" [size]="size" [color]="color" [weight]="weight"></ph-prohibit>
      <ph-download *ngSwitchCase="'download'" [size]="size" [color]="color" [weight]="weight"></ph-download>
      <ph-arrow-clockwise *ngSwitchCase="'refresh'" [size]="size" [color]="color" [weight]="weight"></ph-arrow-clockwise>
      <ph-arrow-left *ngSwitchCase="'arrow-left'" [size]="size" [color]="color" [weight]="weight"></ph-arrow-left>
      <ph-sign-out *ngSwitchCase="'sign-out'" [size]="size" [color]="color" [weight]="weight"></ph-sign-out>
      <ph-google-logo *ngSwitchCase="'google'" [size]="size" [color]="color" [weight]="weight"></ph-google-logo>
      <ph-database *ngSwitchCase="'database'" [size]="size" [color]="color" [weight]="weight"></ph-database>
      <ph-eye-slash *ngSwitchCase="'eye-slash'" [size]="size" [color]="color" [weight]="weight"></ph-eye-slash>
      <ph-warning *ngSwitchCase="'warning'" [size]="size" [color]="color" [weight]="weight"></ph-warning>
      <ph-camera *ngSwitchCase="'camera'" [size]="size" [color]="color" [weight]="weight"></ph-camera>
      <ph-arrow-right *ngSwitchCase="'arrow-right'" [size]="size" [color]="color" [weight]="weight"></ph-arrow-right>
      <ph-house *ngSwitchCase="'house'" [size]="size" [color]="color" [weight]="weight"></ph-house>
      <ph-envelope *ngSwitchCase="'envelope'" [size]="size" [color]="color" [weight]="weight"></ph-envelope>
      <ph-bell *ngSwitchCase="'bell'" [size]="size" [color]="color" [weight]="weight"></ph-bell>
      <ph-tray *ngSwitchCase="'inbox'" [size]="size" [color]="color" [weight]="weight"></ph-tray>
      <ph-map-pin *ngSwitchCase="'map-pin'" [size]="size" [color]="color" [weight]="weight"></ph-map-pin>
      <ph-confetti *ngSwitchCase="'confetti'" [size]="size" [color]="color" [weight]="weight"></ph-confetti>
      <ph-hourglass *ngSwitchCase="'hourglass'" [size]="size" [color]="color" [weight]="weight"></ph-hourglass>
      <ph-music-note *ngSwitchCase="'music-note'" [size]="size" [color]="color" [weight]="weight"></ph-music-note>
      <ph-mask-sad *ngSwitchCase="'mask'" [size]="size" [color]="color" [weight]="weight"></ph-mask-sad>
    </ng-container>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class PhosphorIconComponent {
  @Input() name: string = '';
  @Input() size: number | string = 20;
  @Input() color: string = 'currentColor';
  @Input() weight: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' = 'regular';
}

