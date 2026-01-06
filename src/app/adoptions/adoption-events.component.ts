import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { Event } from '../models';
import { EventsStore } from '../stores/events.store';

@Component({
  selector: 'pt-adoption-events',
  standalone: true,
  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="events-section">
      <div class="events-container">
        <div class="events-content">
          <h2 class="events-title">EVENTOS</h2>
          @if (eventsStore.isLoading()) {
          <div class="loading-state">
            <p>Cargando eventos...</p>
          </div>
          } @else if (allEvents().length === 0) {
          <p class="events-message">
            No hay eventos disponibles. Estate atento a nuestras redes para mÃ¡s
            informaciÃ³n.
          </p>
          <div class="events-image-container">
            <img
              src="assets/dog3.jpg"
              alt="Perro y gato juntos"
              class="events-image"
            />
            <div class="decorative-shapes">
              <div class="shape shape-yellow-1"></div>
              <div class="shape shape-yellow-2"></div>
              <div class="shape shape-blue-1"></div>
            </div>
          </div>
          } @else {
          <div class="events-carousel-container">
            <div class="events-carousel-wrapper">
              @if (shouldShowLeftArrow()) {
              <button
                class="carousel-nav-button carousel-prev"
                (click)="scrollCarousel('left')"
                aria-label="Anterior"
              >
                â€¹
              </button>
              }
              <div
                class="events-carousel"
                #carouselElement
                (scroll)="onCarouselScroll()"
              >
                @if (pastEvents().length > 0) {
                <div class="carousel-section past-events">
                  @for (event of pastEvents(); track event.id) {
                  <div
                    class="event-card"
                    [class.active]="isClosestToToday(event)"
                    (click)="centerEventCard($event)"
                    [attr.data-event-date]="
                      getEventDateString(event.event_date)
                    "
                    #eventCard
                  >
                    @if (event.image_url) {
                    <div class="event-image">
                      <img [src]="event.image_url" [alt]="event.title" />
                    </div>
                    }
                    <div class="event-content">
                      <div class="event-header">
                        <h3 class="event-title">{{ event.title }}</h3>
                      </div>
                      @if (event.description) {
                      <p class="event-description">{{ event.description }}</p>
                      }
                      <div class="event-details">
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ“…</span>
                          <span class="detail-text">{{
                            formatEventDate(event.event_date)
                          }}</span>
                        </div>
                        @if (event.event_time) {
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ•</span>
                          <span class="detail-text">{{
                            event.event_time
                          }}</span>
                        </div>
                        } @if (event.location) {
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ“</span>
                          <span class="detail-text">{{ event.location }}</span>
                        </div>
                        <div class="event-type-badge-container">
                          <span
                            class="event-type-badge"
                            [class]="'type-' + event.event_type"
                          >
                            {{ getEventTypeLabel(event.event_type) }}
                          </span>
                        </div>
                        } @if (event.foundation) {
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ¢</span>
                          <span class="detail-text">{{
                            event.foundation.name
                          }}</span>
                        </div>
                        }
                      </div>
                    </div>
                  </div>
                  }
                </div>
                } @if (upcomingEvents().length > 0) {
                <div class="carousel-section upcoming-events">
                  @for (event of upcomingEvents(); track event.id) {
                  <div
                    class="event-card"
                    [class.active]="isClosestToToday(event)"
                    (click)="centerEventCard($event)"
                    [attr.data-event-date]="
                      getEventDateString(event.event_date)
                    "
                    #eventCard
                  >
                    @if (event.image_url) {
                    <div class="event-image">
                      <img [src]="event.image_url" [alt]="event.title" />
                    </div>
                    }
                    <div class="event-content">
                      <div class="event-header">
                        <h3 class="event-title">{{ event.title }}</h3>
                      </div>
                      @if (event.description) {
                      <p class="event-description">{{ event.description }}</p>
                      }
                      <div class="event-details">
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ“…</span>
                          <span class="detail-text">{{
                            formatEventDate(event.event_date)
                          }}</span>
                        </div>
                        @if (event.event_time) {
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ•</span>
                          <span class="detail-text">{{
                            event.event_time
                          }}</span>
                        </div>
                        } @if (event.location) {
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ“</span>
                          <span class="detail-text">{{ event.location }}</span>
                        </div>
                        <div class="event-type-badge-container">
                          <span
                            class="event-type-badge"
                            [class]="'type-' + event.event_type"
                          >
                            {{ getEventTypeLabel(event.event_type) }}
                          </span>
                        </div>
                        } @else {
                        <div class="event-type-badge-container">
                          <span
                            class="event-type-badge"
                            [class]="'type-' + event.event_type"
                          >
                            {{ getEventTypeLabel(event.event_type) }}
                          </span>
                        </div>
                        } @if (event.foundation) {
                        <div class="event-detail-item">
                          <span class="detail-icon">ðŸ¢</span>
                          <span class="detail-text">{{
                            event.foundation.name
                          }}</span>
                        </div>
                        }
                      </div>
                      @if (event.registration_url) {
                      <a
                        [href]="event.registration_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="event-register-link"
                        (click)="$event.stopPropagation()"
                      >
                        Registrarse â†’
                      </a>
                      }
                    </div>
                  </div>
                  }
                </div>
                }
              </div>
              @if (shouldShowRightArrow()) {
              <button
                class="carousel-nav-button carousel-next"
                (click)="scrollCarousel('right')"
                aria-label="Siguiente"
              >
                â€º
              </button>
              }
            </div>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .events-section {
        background: linear-gradient(
          135deg,
          #fef3c7 0%,
          #ffffff 50%,
          #dbeafe 100%
        );
        width: 100%;
        padding: 4rem 0;
        position: relative;
        overflow: hidden;
      }

      .events-section::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -100px;
        width: 400px;
        height: 400px;
        background: radial-gradient(
          circle,
          rgba(251, 191, 36, 0.2) 0%,
          transparent 70%
        );
        border-radius: 50%;
        animation: float 8s ease-in-out infinite;
      }

      .events-section::after {
        content: '';
        position: absolute;
        bottom: -150px;
        left: -150px;
        width: 500px;
        height: 500px;
        background: radial-gradient(
          circle,
          rgba(30, 64, 175, 0.15) 0%,
          transparent 70%
        );
        border-radius: 50%;
        animation: float 10s ease-in-out infinite reverse;
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0) rotate(0deg);
        }
        50% {
          transform: translateY(-30px) rotate(180deg);
        }
      }

      .events-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .events-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.5rem;
        width: 100%;
      }

      .action-buttons-header {
        display: flex;
        gap: 1rem;
        width: 100%;
        max-width: 600px;
        margin-bottom: 1rem;
      }

      .events-title {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(
          135deg,
          #000000 0%,
          #374151 50%,
          #000000 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        animation: gradientShift 3s ease infinite;
        text-shadow: 0 4px 20px rgba(30, 64, 175, 0.2);
        position: relative;
      }

      .events-title::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 4px;
        background: linear-gradient(90deg, #000000, #fbbf24, #000000);
        background-size: 200% 100%;
        border-radius: 2px;
        animation: shimmer 2s infinite;
      }

      @keyframes gradientShift {
        0%,
        100% {
          background-position: 0% center;
        }
        50% {
          background-position: 100% center;
        }
      }

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }

      .events-message {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
      }

      .loading-state,
      .empty-state {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
      }

      .events-carousel-container {
        width: 100%;
        position: relative;
      }

      .carousel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding: 0 1rem;
      }

      .carousel-section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
        margin: 0;
      }

      .carousel-section-title.upcoming-title {
        color: #fbbf24;
      }

      .events-carousel-wrapper {
        position: relative;
        width: 100%;
      }

      .events-carousel {
        display: flex;
        gap: 2rem;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: #fbbf24 #f3f4f6;
        padding: 1rem;
        -webkit-overflow-scrolling: touch;
      }

      .events-carousel::-webkit-scrollbar {
        height: 8px;
      }

      .events-carousel::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
      }

      .events-carousel::-webkit-scrollbar-thumb {
        background: #fbbf24;
        border-radius: 4px;
      }

      .events-carousel::-webkit-scrollbar-thumb:hover {
        background: #f59e0b;
      }

      .carousel-section {
        display: flex;
        gap: 2rem;
        min-width: fit-content;
      }

      .carousel-section.past-events {
        flex-shrink: 0;
      }

      .carousel-section.upcoming-events {
        flex-shrink: 0;
      }

      .carousel-nav-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #fbbf24;
        color: #000000;
        font-size: 2rem;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .carousel-nav-button:hover:not(:disabled) {
        background: #fbbf24;
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 6px 16px rgba(251, 191, 36, 0.4);
      }

      .carousel-nav-button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .carousel-prev {
        left: -25px;
      }

      .carousel-next {
        right: -25px;
      }

      .events-list {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        width: 100%;
        max-width: 800px;
      }

      .event-card {
        background: #ffffff;
        border: 2px solid transparent;
        border-radius: 1rem;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        min-width: 350px;
        max-width: 400px;
        flex-shrink: 0;
      }

      .event-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #fbbf24, #374151, #fbbf24);
        background-size: 200% 100%;
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }

      .event-card:hover {
        border-color: rgba(251, 191, 36, 0.5);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        transform: translateY(-4px);
      }

      .event-card:hover::before {
        transform: scaleX(1);
        animation: shimmer 2s infinite;
      }

      .event-image {
        width: 100%;
        height: 250px;
        overflow: hidden;
        background: #f3f4f6;
      }

      .event-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .event-card:hover .event-image img {
        transform: scale(1.1);
      }

      .event-content {
        padding: 1.5rem;
      }

      .event-header {
        margin-bottom: 1rem;
      }

      .event-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .event-type-badge-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 0.75rem;
        margin-bottom: 0.5rem;
      }

      .event-type-badge {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        white-space: nowrap;
        display: inline-block;
      }

      .event-type-badge.type-adoption_fair {
        background: #d1fae5;
        color: #065f46;
      }

      .event-type-badge.type-workshop {
        background: #dbeafe;
        color: #1e40af;
      }

      .event-type-badge.type-campaign {
        background: #fef3c7;
        color: #92400e;
      }

      .event-type-badge.type-fundraiser {
        background: #fce7f3;
        color: #9f1239;
      }

      .event-type-badge.type-other {
        background: #e5e7eb;
        color: #374151;
      }

      .event-description {
        font-size: 1rem;
        color: #6b7280;
        line-height: 1.6;
        margin: 0 0 1rem 0;
      }

      .event-details {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .event-detail-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.875rem;
        color: #374151;
      }

      .detail-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .detail-text {
        flex: 1;
        word-wrap: break-word;
      }

      .event-register-link {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #fbbf24;
        color: #000000;
        text-decoration: none;
        border-radius: 0.5rem;
        font-weight: 600;
        transition: all 0.3s ease;
        margin-top: 0.5rem;
      }

      .event-register-link:hover {
        background: #f59e0b;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
      }

      .events-image-container {
        position: relative;
        width: 100%;
        max-width: 500px;
        height: 400px;
        border-radius: 1rem;
        overflow: hidden;
        border: 3px solid transparent;
        background: linear-gradient(white, white) padding-box,
          linear-gradient(135deg, #fbbf24, #374151, #fbbf24) border-box;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        margin-top: 1rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .events-image-container:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .events-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .events-image-container:hover .events-image {
        transform: scale(1.05);
      }

      .decorative-shapes {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .shape {
        position: absolute;
        border-radius: 50%;
        opacity: 0.8;
      }

      .shape-yellow-1 {
        width: 120px;
        height: 120px;
        background: #fbbf24;
        top: 10%;
        left: 5%;
      }

      .shape-yellow-2 {
        width: 80px;
        height: 80px;
        background: #fbbf24;
        bottom: 15%;
        right: 10%;
      }

      .shape-blue-1 {
        width: 60px;
        height: 60px;
        background: #374151;
        top: 50%;
        right: 5%;
      }

      @media (max-width: 1024px) {
        .events-section {
          padding: 3rem 0;
        }

        .events-container {
          padding: 0 1.5rem;
        }

        .events-image-container {
          max-width: 100%;
          height: 350px;
        }
      }

      @media (max-width: 1024px) {
        .events-list {
          max-width: 100%;
        }

        .event-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .event-type-badge {
          align-self: flex-start;
        }
      }

      @media (max-width: 768px) {
        .events-section {
          padding: 2rem 0;
        }

        .events-container {
          padding: 0 1rem;
          grid-template-columns: 1fr;
        }

        .events-title {
          font-size: 1.5rem;
        }

        .events-image-container {
          height: 300px;
        }

        .events-carousel {
          padding: 0.5rem;
          gap: 1rem;
        }

        .event-card {
          min-width: 280px;
          max-width: 320px;
        }

        .carousel-nav-button {
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
        }

        .carousel-prev {
          left: -20px;
        }

        .carousel-next {
          right: -20px;
        }

        .carousel-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .events-list {
          gap: 1.5rem;
        }

        .event-card {
          border-radius: 0.75rem;
        }

        .event-content {
          padding: 1rem;
        }

        .event-title {
          font-size: 1.25rem;
        }

        .event-image {
          height: 200px;
        }

        .event-details {
          gap: 0.5rem;
        }

        .event-register-link {
          width: 100%;
          text-align: center;
        }
      }
    `,
  ],
})
export class AdoptionEventsComponent implements AfterViewInit {
  @ViewChild('carouselElement', { static: false })
  carouselElement!: ElementRef<HTMLDivElement>;

  public eventsStore = inject(EventsStore);
  public canScrollLeftSignal = signal(false);
  public canScrollRightSignal = signal(true);
  private closestEventCard: HTMLElement | null = null;

  // Obtener todos los eventos activos
  public allEvents = computed(() => {
    return this.eventsStore
      .entities()
      .filter((event) => event.is_active)
      .sort((a, b) => {
        const dateA =
          typeof a.event_date === 'string'
            ? new Date(a.event_date)
            : a.event_date;
        const dateB =
          typeof b.event_date === 'string'
            ? new Date(b.event_date)
            : b.event_date;
        return dateA.getTime() - dateB.getTime();
      });
  });

  // Eventos pasados (izquierda) - ordenados descendente (mÃ¡s recientes primero)
  public pastEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.allEvents()
      .filter((event) => {
        const eventDate =
          typeof event.event_date === 'string'
            ? new Date(event.event_date)
            : event.event_date;
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today;
      })
      .reverse(); // MÃ¡s recientes primero
  });

  // Eventos futuros (derecha) - ordenados ascendente (prÃ³ximos primero)
  public upcomingEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.allEvents().filter((event) => {
      const eventDate =
        typeof event.event_date === 'string'
          ? new Date(event.event_date)
          : event.event_date;
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
  });

  ngAfterViewInit(): void {
    this.centerClosestEvent();
    this.updateScrollButtons();
  }

  // Encontrar y centrar el evento mÃ¡s cercano a hoy
  private centerClosestEvent(): void {
    if (!this.carouselElement?.nativeElement) return;

    const carousel = this.carouselElement.nativeElement;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let closestCard: HTMLElement | null = null;
    let closestDiff = Infinity;

    // Buscar en eventos pasados (mÃ¡s reciente)
    const pastCards = carousel.querySelectorAll('.past-events .event-card');
    pastCards.forEach((card) => {
      const eventDateStr = (card as HTMLElement).dataset['eventDate'];
      if (eventDateStr) {
        const eventDate = new Date(eventDateStr);
        eventDate.setHours(0, 0, 0, 0);
        const diff = Math.abs(today.getTime() - eventDate.getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closestCard = card as HTMLElement;
        }
      }
    });

    // Buscar en eventos futuros (mÃ¡s prÃ³ximo)
    const upcomingCards = carousel.querySelectorAll(
      '.upcoming-events .event-card'
    );
    upcomingCards.forEach((card) => {
      const eventDateStr = (card as HTMLElement).dataset['eventDate'];
      if (eventDateStr) {
        const eventDate = new Date(eventDateStr);
        eventDate.setHours(0, 0, 0, 0);
        const diff = Math.abs(today.getTime() - eventDate.getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closestCard = card as HTMLElement;
        }
      }
    });

    if (closestCard) {
      this.closestEventCard = closestCard;
      setTimeout(() => {
        this.scrollToCard(closestCard!);
      }, 100);
    }
  }

  public isClosestToToday(event: Event): boolean {
    if (!this.closestEventCard) return false;
    const eventDate =
      typeof event.event_date === 'string'
        ? new Date(event.event_date)
        : event.event_date;
    const cardDateStr = this.closestEventCard.dataset['eventDate'];
    if (!cardDateStr) return false;
    const cardDate = new Date(cardDateStr);
    return eventDate.getTime() === cardDate.getTime();
  }

  public centerEventCard(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    this.closestEventCard = card;
    this.scrollToCard(card);
  }

  private scrollToCard(card: HTMLElement): void {
    if (!this.carouselElement?.nativeElement) return;

    const carousel = this.carouselElement.nativeElement;
    const cardRect = card.getBoundingClientRect();
    const carouselRect = carousel.getBoundingClientRect();
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const carouselWidth = carousel.clientWidth;

    // Calcular la posiciÃ³n para centrar la card
    const scrollPosition = cardLeft - carouselWidth / 2 + cardWidth / 2;

    carousel.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });

    setTimeout(() => this.updateScrollButtons(), 300);
  }

  public scrollCarousel(direction: 'left' | 'right'): void {
    if (!this.carouselElement?.nativeElement) return;

    const carousel = this.carouselElement.nativeElement;
    const scrollAmount = carousel.clientWidth * 0.8; // Scroll 80% del ancho visible

    if (direction === 'left') {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Actualizar botones despuÃ©s de un breve delay
    setTimeout(() => this.updateScrollButtons(), 300);
  }

  public onCarouselScroll(): void {
    this.updateScrollButtons();
  }

  private updateScrollButtons(): void {
    if (!this.carouselElement?.nativeElement) return;

    const carousel = this.carouselElement.nativeElement;
    const canScrollLeft = carousel.scrollLeft > 0;
    const canScrollRight =
      carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth - 10; // 10px de margen

    this.canScrollLeftSignal.set(canScrollLeft);
    this.canScrollRightSignal.set(canScrollRight);
  }

  public shouldShowLeftArrow(): boolean {
    if (!this.carouselElement?.nativeElement) return false;
    const carousel = this.carouselElement.nativeElement;
    const visibleWidth = carousel.clientWidth;
    const cardWidth = 400; // Ancho aproximado de una card + gap
    const cardsVisible = Math.floor(visibleWidth / cardWidth);
    const totalPastEvents = this.pastEvents().length;

    // Mostrar flecha solo si hay 3 o mÃ¡s eventos pasados que no estÃ¡n visibles
    return totalPastEvents >= 3 && carousel.scrollLeft > 0;
  }

  public shouldShowRightArrow(): boolean {
    if (!this.carouselElement?.nativeElement) return false;
    const carousel = this.carouselElement.nativeElement;
    const visibleWidth = carousel.clientWidth;
    const cardWidth = 400; // Ancho aproximado de una card + gap
    const cardsVisible = Math.floor(visibleWidth / cardWidth);
    const totalUpcomingEvents = this.upcomingEvents().length;
    const scrollRight =
      carousel.scrollWidth - carousel.scrollLeft - carousel.clientWidth;

    // Mostrar flecha solo si hay 3 o mÃ¡s eventos futuros que no estÃ¡n visibles
    return totalUpcomingEvents >= 3 && scrollRight > 50;
  }

  public canScrollLeft(): boolean {
    return this.canScrollLeftSignal();
  }

  public canScrollRight(): boolean {
    return this.canScrollRightSignal();
  }

  public getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      adoption_fair: 'Feria de AdopciÃ³n',
      workshop: 'Taller',
      campaign: 'CampaÃ±a',
      fundraiser: 'RecaudaciÃ³n',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  public formatEventDate(date: Date | string | undefined): string {
    if (!date) return 'Fecha por confirmar';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  public getEventDateString(date: Date | string | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  public navigateToFoundations(): void {
    // Implementar navegaciÃ³n a fundaciones
    console.log('Navegar a fundaciones');
  }

  public navigateToHelp(): void {
    // Implementar navegaciÃ³n a ayuda
    console.log('Navegar a ayuda');
  }
}

