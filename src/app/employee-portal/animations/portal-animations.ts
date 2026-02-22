import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';

/**
 * Transición suave entre secciones del portal.
 * fadeIn + slide vertical corto.
 */
export const sectionFadeSlide = trigger('sectionFadeSlide', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(12px)' }),
    animate(
      '250ms ease-out',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
  transition(':leave', [
    animate(
      '150ms ease-in',
      style({ opacity: 0, transform: 'translateY(-8px)' })
    ),
  ]),
]);

/**
 * Entrada escalonada de cards en dashboard.
 * Cada card aparece con un delay incremental.
 */
export const cardStagger = trigger('cardStagger', [
  transition(':enter', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        stagger('60ms', [
          animate(
            '300ms ease-out',
            style({ opacity: 1, transform: 'translateY(0)' })
          ),
        ]),
      ],
      { optional: true }
    ),
  ]),
]);

/**
 * Slide desde la derecha - navegación "push" hacia sub-secciones.
 */
export const slideInFromRight = trigger('slideInFromRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(30px)' }),
    animate(
      '250ms ease-out',
      style({ opacity: 1, transform: 'translateX(0)' })
    ),
  ]),
  transition(':leave', [
    animate(
      '200ms ease-in',
      style({ opacity: 0, transform: 'translateX(-20px)' })
    ),
  ]),
]);

/**
 * Slide desde la izquierda - navegación "back" desde sub-secciones.
 */
export const slideInFromLeft = trigger('slideInFromLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-30px)' }),
    animate(
      '250ms ease-out',
      style({ opacity: 1, transform: 'translateX(0)' })
    ),
  ]),
  transition(':leave', [
    animate(
      '200ms ease-in',
      style({ opacity: 0, transform: 'translateX(20px)' })
    ),
  ]),
]);
