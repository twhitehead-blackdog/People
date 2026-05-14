import { Directive, ElementRef, Injector, Input, OnInit, Renderer2, effect, inject } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';
import { ReadOnlyContextService } from '../services/read-only-context.service';

/**
 * Oculta o deshabilita un elemento cuando el usuario tiene acceso 'read'
 * (solo lectura) sobre un sub-módulo.
 *
 * Uso explícito (especifica el target):
 *   <button ptReadOnly="time_management:schedules">Crear turno</button>
 *
 * Uso global (lee el contexto de la ruta actual):
 *   <button ptReadOnly>Crear</button>
 *
 * Modos:
 *   - 'hide'    (default) → display:none cuando es solo lectura
 *   - 'disable' → atributo disabled + opacidad
 */
@Directive({
  selector: '[ptReadOnly]',
  standalone: true,
})
export class ReadOnlyDirective implements OnInit {
  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private permissions = inject(PermissionsService);
  private readOnlyCtx = inject(ReadOnlyContextService);
  private injector = inject(Injector);

  /** Formato: "moduleId:subModuleId" o cadena vacía/true para usar el contexto global */
  @Input('ptReadOnly') target: string | '' | boolean = '';

  /** 'hide' (default) | 'disable' */
  @Input() mode: 'hide' | 'disable' = 'hide';

  private originalDisplay: string | null = null;

  ngOnInit(): void {
    effect(() => {
      this.applyState(this.computeIsReadOnly());
    }, { injector: this.injector });
  }

  private computeIsReadOnly(): boolean {
    // Target explícito tipo "module:submodule"
    if (typeof this.target === 'string' && this.target.includes(':')) {
      const [m, s] = this.target.split(':');
      return this.permissions.isCurrentSubModuleReadOnly(m, s);
    }
    // Sin target → contexto global de la ruta (reactivo a signals)
    return this.readOnlyCtx.isReadOnly();
  }

  private applyState(isReadOnly: boolean): void {
    const node = this.el.nativeElement;
    if (isReadOnly) {
      if (this.mode === 'hide') {
        if (this.originalDisplay === null) {
          this.originalDisplay = node.style.display || '';
        }
        this.renderer.setStyle(node, 'display', 'none');
      } else {
        this.renderer.setAttribute(node, 'disabled', 'true');
        this.renderer.addClass(node, 'opacity-50');
        this.renderer.addClass(node, 'pointer-events-none');
      }
    } else {
      if (this.mode === 'hide' && this.originalDisplay !== null) {
        this.renderer.setStyle(node, 'display', this.originalDisplay);
      } else if (this.mode === 'disable') {
        this.renderer.removeAttribute(node, 'disabled');
        this.renderer.removeClass(node, 'opacity-50');
        this.renderer.removeClass(node, 'pointer-events-none');
      }
    }
  }
}
