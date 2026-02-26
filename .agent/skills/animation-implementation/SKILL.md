---
name: animation-implementation
description: Guía para implementar animaciones pixel-art responsivas en Angular usando Signals y CSS steps().
---

# Implementación de Animaciones Pixel-Art Responsivas

Esta guía detalla cómo crear componentes de animación ambiental (como mascotas virtuales) que sean responsivos, interactivos y performantes.

## 1. Patrón de Componente Standalone

Usa componentes `standalone` con `OnPush` para máximo rendimiento.

```typescript
@Component({
  selector: 'app-pixel-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`...\`,
  styles: \`...\`
})
export class PixelAnimationComponent {}
```

## 2. Animación CSS con Sprites

Para pixel art, usa `steps(N)` donde N es el número de frames. Esto evita el suavizado borroso entre frames.

```css
.sprite {
  background-image: url('assets/sprite-sheet.png');
  background-repeat: no-repeat;
  background-size: cover;
  image-rendering: pixelated; /* CRÍTICO para pixel art */
  width: 48px;
  height: 48px;
}

.animate {
  /* Mueve el background de 0 a -100% (o ancho total) en pasos discretos */
  animation: play-strip 0.6s steps(4) infinite;
}

@keyframes play-strip {
  100% {
    background-position: -192px;
  } /* 48px * 4 frames */
}
```

## 3. Movimiento Responsivo con Signals

En lugar de usar porcentajes simples que pueden deformarse o colisionar, usa posicionamiento absoluto en píxeles calculado dinámicamente.

### Estado

```typescript
// Posición exacta en píxeles
public currentPixelPosition = signal<number>(0);
// Dirección para voltear el sprite
public currentDirection = signal<'left' | 'right'>('right');
```

### HostListener para Responsividad

Recalcula límites al redimensionar la ventana.

```typescript
@HostListener('window:resize')
onResize() {
    this.screenWidth = window.innerWidth;
    // Ajustar posición si se sale de la pantalla
    if (this.currentPixelPosition() > this.screenWidth - margin) {
        this.currentPixelPosition.set(this.screenWidth - margin);
    }
}
```

### Lógica de Movimiento Continuo (Random Walk)

Para evitar "zonas" rígidas, usa un algoritmo de camino aleatorio con rebote o selección de nuevos objetivos.

```typescript
private performWalk() {
    // 1. Elegir objetivo aleatorio
    const target = Math.random() * (this.screenWidth - margin);

    // 2. Calcular distancia y duración (velocidad constante)
    const distance = Math.abs(target - current);
    const speed = 50; // px/segundo
    const duration = distance / speed;

    // 3. Mover usando requestAnimationFrame para sincronizar UI
    requestAnimationFrame(() => {
        this.currentPixelPosition.set(target);
    });

    // 4. Esperar y planificar siguiente movimiento
    setTimeout(() => this.scheduleNext(), duration * 1000);
}
```

## 4. Consejos de UX

- **Pointer Events**: Si la animación flota sobre UI interactiva, usa `pointer-events-none` en el contenedor y `auto` en el sprite si necesitas clics en la mascota.
- **Tip Bubbles**: Usa `setTimeout` para mostrar/ocultar burbujas de texto temporales.
- **Safe Areas**: Define márgenes para no solapar logos o botones críticos.

## 5. Estructura de Archivos Recomendada

```
src/app/features/animation/
├── components/
│   └── animation.component.ts
└── assets/
    └── sprite-sheet.png
```
