import { Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { firstValueFrom } from 'rxjs';

interface NewsItem {
  id: string;
  title: string;
  message: string;
  icon: string;
}

const FILLER_POOL: NewsItem[] = [
  // Motivación y equipo
  { id: 'f1',  icon: 'pi-bolt',       title: 'Actitud positiva',    message: 'Una sonrisa puede cambiar el día de un cliente y de su mascota 😊🐾' },
  { id: 'f2',  icon: 'pi-heart',      title: 'Trabajo en equipo',   message: 'Juntos llegamos más lejos — gracias por apoyar a sus compañeros 🤝' },
  { id: 'f3',  icon: 'pi-star',       title: 'Excelencia',          message: 'Cada detalle cuenta cuando buscamos superar las expectativas ⭐' },
  { id: 'f4',  icon: 'pi-bolt',       title: 'Energía',             message: '¡Hoy es un gran día para dar lo mejor de sí! 💪' },
  { id: 'f5',  icon: 'pi-thumbs-up',  title: 'Orgullo Black Dog',   message: 'Gracias por ser parte de nuestra familia 🐾❤️' },
  { id: 'f6',  icon: 'pi-sparkles',   title: 'Logros',              message: 'Cada venta cerrada es un paso hacia la meta del equipo 🎯' },
  { id: 'f7',  icon: 'pi-heart-fill', title: 'Gratitud',            message: 'Apreciamos su esfuerzo y dedicación diaria — ¡sigan brillando! ✨' },
  { id: 'f8',  icon: 'pi-star',       title: 'Campeones',           message: 'El equipo que trabaja unido, triunfa unido 🏆' },
  // Servicio al cliente pet shop
  { id: 'f9',  icon: 'pi-users',      title: 'Servicio al cliente', message: 'Un cliente satisfecho regresa con su mascota — y trae a un amigo 🐕🛍️' },
  { id: 'f10', icon: 'pi-comments',   title: 'Tip de ventas',       message: 'Pregunta por la mascota del cliente — ese dato vale una venta 🐾🔑' },
  { id: 'f11', icon: 'pi-verified',   title: 'Confianza',           message: 'La honestidad con el cliente construye relaciones que duran años 🤍' },
  { id: 'f12', icon: 'pi-user-plus',  title: 'Fidelización',        message: 'Recordar el nombre de la mascota del cliente es magia pura ✨🐶' },
  { id: 'f13', icon: 'pi-lightbulb',  title: 'Tip del día',         message: 'Recomienda productos por raza y edad de la mascota — el cliente lo agradece 🎯' },
  { id: 'f14', icon: 'pi-tag',        title: 'Cross-selling',       message: 'Si vende comida, ofrezca el snack — una combinación ganadora 🦴🍖' },
  // Datos curiosos de mascotas
  { id: 'f15', icon: 'pi-globe',      title: 'Dato perruno',        message: '¿Sabías que los perros pueden reconocer hasta 250 palabras? ¡Más que algunos jefes! 🐕😄' },
  { id: 'f16', icon: 'pi-globe',      title: 'Dato gatuno',         message: 'Los gatos pasan el 70% de su vida durmiendo. Algunos humanos también 🐱😴' },
  { id: 'f17', icon: 'pi-globe',      title: 'Curiosidad animal',   message: '¿Sabías que los perros sudan por las patas? Por eso les encantan los pisos fríos 🐾❄️' },
  { id: 'f18', icon: 'pi-globe',      title: 'Dato pet',            message: 'Los perros tienen un olfato 40 veces más poderoso que el humano 👃🐶' },
  { id: 'f19', icon: 'pi-globe',      title: 'Curiosidad',          message: '¿Sabías que los gatos maullan casi exclusivamente para comunicarse con humanos? 🐱💬' },
  { id: 'f20', icon: 'pi-globe',      title: 'Dato animal',         message: 'Los conejos no vomitan. No sé si eso es bueno o malo, pero es interesante 🐰🤔' },
  { id: 'f21', icon: 'pi-globe',      title: 'Dato curioso',        message: 'Panamá tiene más de 180 especies de mamíferos — ¡somos un país de animales! 🌿🦜' },
  { id: 'f22', icon: 'pi-map',        title: 'Black Dog Panamá',    message: 'Cuidando mascotas en Panamá — presentes en sus sucursales favoritas 📍🐾' },
  // Bienestar
  { id: 'f23', icon: 'pi-heart',      title: 'Bienestar',           message: 'Recuerda hidratarte durante tu jornada 💧' },
  { id: 'f24', icon: 'pi-refresh',    title: 'Descanso activo',     message: 'Unos minutos de pausa mejoran tu concentración y productividad ☕' },
  { id: 'f25', icon: 'pi-clock',      title: 'Puntualidad',         message: 'Llegar a tiempo es una forma de respetar a todo el equipo ⏰' },
  // Seguridad y orden
  { id: 'f26', icon: 'pi-shield',     title: 'Seguridad',           message: 'Mantén tu área de trabajo ordenada — los productos de mascotas merecen cuidado 🛡️' },
  { id: 'f27', icon: 'pi-check',      title: 'Buenas prácticas',    message: 'Revisar fechas de vencimiento protege a las mascotas y la confianza del cliente ✅' },
  { id: 'f28', icon: 'pi-lock',       title: 'Seguridad',           message: 'Nunca compartas tus credenciales — tu acceso es personal y único 🔐' },
  { id: 'f29', icon: 'pi-check',      title: 'Disciplina',          message: 'El orden en tienda genera confianza — las mascotas también lo aprecian 🗂️🐾' },
  // Reconocimiento
  { id: 'f30', icon: 'pi-trophy',     title: '¡Bien hecho!',        message: 'Reconocemos el esfuerzo de cada miembro del equipo — ¡sigan así! 🥇' },
  { id: 'f31', icon: 'pi-star-fill',  title: 'Talento Black Dog',   message: 'Cada día hay alguien que va más allá — ¡puede ser tú hoy! 🌟' },
  // Cómicos con tema pet shop
  { id: 'f32', icon: 'pi-face-smile', title: 'Tip laboral',         message: 'El café no resuelve los problemas... pero los perros sí 🐕☕😄' },
  { id: 'f33', icon: 'pi-face-smile', title: 'Filosofía BD',        message: 'Los gatos no te obedecen. Los clientes tampoco a veces... paciencia 😅🐱' },
  { id: 'f34', icon: 'pi-face-smile', title: 'Consejo del día',     message: 'No dejes para mañana lo que puedes venderle al cliente hoy 🛍️😄' },
  { id: 'f35', icon: 'pi-bolt',       title: 'Motivación express',  message: 'Tú puedes hacerlo. Lo confirmo. Los perritos también confían en ti 🐶💪' },
  { id: 'f36', icon: 'pi-face-smile', title: 'Dato inútil',         message: 'Los perros tienen orejas con 18 músculos. Tú con 2 ya escuchas al cliente 👂😄' },
  { id: 'f37', icon: 'pi-clock',      title: 'Lunes pet',           message: 'El lunes llega sin avisar, igual que un gato sobre el teclado 🐱😂' },
  { id: 'f38', icon: 'pi-heart',      title: 'Amor al trabajo',     message: 'Si amas lo que haces no trabajas ni un día de tu vida... y rodeado de mascotas, menos 🐾❤️' },
  { id: 'f39', icon: 'pi-face-smile', title: 'Sabiduría',           message: 'Un equipo unido jamás es vencido. Un perro sin correa sí puede escapar 🐕😅' },
  { id: 'f40', icon: 'pi-bolt',       title: 'Motivación real',     message: 'Recuerda: el cliente siempre tiene la razón... y su mascota también 🐾😬' },
  { id: 'f41', icon: 'pi-face-smile', title: 'Ciencia pet',         message: 'Estudios demuestran que acariciar perros reduce el estrés. Hay uno en tienda 🐕😂' },
  { id: 'f42', icon: 'pi-face-smile', title: 'Productividad',       message: 'La reunión que pudo haber sido un ladrido... pero aquí estamos 🐕📱' },
  { id: 'f43', icon: 'pi-sparkles',   title: 'Zen pet',             message: 'Respira hondo. Exhala. Imagina un gatito. Ya te sientes mejor ¿verdad? 🐱🧘' },
  { id: 'f44', icon: 'pi-face-smile', title: 'Tip de ventas',       message: 'El mejor vendedor de Black Dog es el que sabe cuál es la raza del perro del cliente 🐶🏆' },
  { id: 'f45', icon: 'pi-globe',      title: 'Dato del día',        message: 'Los peces dorados tienen memoria de 3 meses. Más de lo que parece 🐠🧠' },
  // Gatos (para la fanática)
  { id: 'f46', icon: 'pi-heart-fill', title: 'Amor gatuno',         message: 'Los gatos ronronean entre 25 y 150 Hz — frecuencia que reduce el estrés humano 🐱💜' },
  { id: 'f47', icon: 'pi-globe',      title: 'Dato gatuno',         message: 'Un gato tiene más huesos que un humano: 244 vs 206 🐱🦴' },
  { id: 'f48', icon: 'pi-face-smile', title: 'Filosofía gatuna',    message: 'Los gatos no tienen dueños, tienen empleados 🐱😂 — quienes los aman lo saben' },
  { id: 'f49', icon: 'pi-globe',      title: 'Gatos curiosos',      message: '¿Sabías que los gatos pueden girar sus orejas 180°? Talento que ningún vendedor tiene 🐱👂' },
  { id: 'f50', icon: 'pi-heart',      title: 'Tip felino',          message: 'Los gatos necesitan estimulación mental — recomienda juguetes interactivos al cliente 🎯🐱' },
  { id: 'f51', icon: 'pi-globe',      title: 'Miau del día',        message: 'El ronroneo de un gato puede acelerar la sanación de huesos. ¡Tráigalo a la tienda! 🐱✨' },
  { id: 'f52', icon: 'pi-face-smile', title: 'Realidad gatuna',     message: 'El gato ignora cuando lo llamas. El cliente no — atiéndelo siempre con una sonrisa 😄🐱' },
  // Exóticos (para la doctora de exóticos)
  { id: 'f53', icon: 'pi-globe',      title: 'Exóticos',            message: 'Los conejos necesitan heno ilimitado — representa el 80% de su dieta ideal 🐰🌿' },
  { id: 'f54', icon: 'pi-globe',      title: 'Dato exótico',        message: 'Las tortugas pueden vivir más de 150 años. Paciencia infinita — como con el cliente difícil 🐢😄' },
  { id: 'f55', icon: 'pi-globe',      title: 'Aves curiosas',       message: 'Los loros pueden aprender cientos de palabras — y algunos saben más que un GPS 🦜😂' },
  { id: 'f56', icon: 'pi-lightbulb',  title: 'Tip exóticos',        message: 'Los reptiles necesitan temperatura específica — es clave orientar bien al dueño 🦎🌡️' },
  { id: 'f57', icon: 'pi-globe',      title: 'Mundo exótico',       message: '¿Sabías que los erizos se auto-ungen con saliva cuando encuentran olores nuevos? 🦔🤔' },
  { id: 'f58', icon: 'pi-heart',      title: 'Exóticos',            message: 'Un hámster recorre hasta 12 km por noche en su rueda. Motivación pura 🐹💨' },
  { id: 'f59', icon: 'pi-globe',      title: 'Peces tropicales',    message: 'Los peces betta no deben convivir con otros machos — como ciertos colegas en el almuerzo 🐠😄' },
  // Más perros
  { id: 'f60', icon: 'pi-globe',      title: 'Dato perruno',        message: 'Los perros sueñan igual que los humanos — probablemente con carreras y premios 🐶💤' },
  { id: 'f61', icon: 'pi-heart',      title: 'Tip canino',          message: 'Recomienda juguetes según el tamaño de la raza — previene accidentes y fideliza al cliente 🐕🎾' },
  { id: 'f62', icon: 'pi-globe',      title: 'Perros curiosos',     message: 'El Basenji es la única raza que no ladra — ladra en silencio como el empleado del mes 😄🐕' },
  { id: 'f63', icon: 'pi-face-smile', title: 'Sabiduría canina',    message: 'Los perros dan amor incondicional. Nosotros también intentamos con el cliente 🐶❤️' },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

@Component({
  selector: 'pt-news-ticker',
  standalone: true,
  template: `
    @if (items().length > 0) {
    <div class="ticker-wrap" [class]="variant()">
      <div class="ticker-track">
        @for (item of doubledItems(); track $index) {
          <span class="ticker-item">
            <i class="pi" [class]="item.icon"></i>
            <strong>{{ item.title }}</strong>
            <span class="ticker-sep">—</span>
            {{ item.message }}
          </span>
        }
      </div>
    </div>
    }
  `,
  styles: [`
    .ticker-wrap {
      width: 100%;
      overflow: hidden;
      background: rgba(247, 177, 4, 0.08);
      border-top: 1px solid rgba(247, 177, 4, 0.15);
      border-bottom: 1px solid rgba(247, 177, 4, 0.15);
      padding: 6px 0;
      position: relative;
      z-index: 5;
      -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
      mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
    }
    .ticker-wrap.kiosk {
      background: rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .ticker-track {
      display: flex;
      gap: 3rem;
      white-space: nowrap;
      animation: ticker-scroll var(--ticker-duration, 30s) linear infinite;
      width: max-content;
    }
    .ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 0.01em;
    }
    .ticker-item i {
      color: #f7b104;
      font-size: 0.65rem;
    }
    .ticker-item strong {
      color: #f7b104;
      font-weight: 600;
    }
    .ticker-sep {
      color: rgba(255, 255, 255, 0.2);
      margin: 0 2px;
    }
    @keyframes ticker-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `]
})
export class NewsTickerComponent implements OnInit, OnDestroy {
  variant = input<'default' | 'kiosk'>('default');

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  public items = signal<NewsItem[]>([]);

  public doubledItems = computed(() => {
    const list = this.items();
    return [...list, ...list];
  });

  ngOnInit() {
    // Naz company doesn't see the ticker
    if (this.org.isNaz()) return;
    this.loadNews();
    this.intervalId = setInterval(() => this.loadNews(), 5 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private getGreetingItem(): NewsItem {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const date = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (date === 15 || date === lastDay) {
      return { id: 'greeting', icon: 'pi-wallet', title: '¡Feliz día de quincena!', message: 'Que disfruten su pago 💰' };
    }
    if (hour >= 5 && hour < 12) {
      return { id: 'greeting', icon: 'pi-sun', title: '☀️ ¡Buenos días!', message: 'Bienvenidos — que tengan un día increíble 🚀' };
    } else if (hour >= 12 && hour < 19) {
      return { id: 'greeting', icon: 'pi-cloud-sun', title: '🌤️ ¡Buenas tardes!', message: 'Gracias por su dedicación y esfuerzo 💪' };
    } else {
      return { id: 'greeting', icon: 'pi-moon', title: '🌙 ¡Buenas noches!', message: 'Gracias por su trabajo de hoy — ¡lo dieron todo! ⭐' };
    }
  }

  private async loadNews() {
    try {
      const allItems: NewsItem[] = [];

      // 0. Greeting always first
      allItems.push(this.getGreetingItem());

      // 1. Manual news (priority items from Supabase)
      const now = new Date().toISOString();
      const url = this.apiUrl.build('rest/v1/news_ticker', {
        is_active: 'eq.true',
        or: `(expires_at.is.null,expires_at.gte.${now})`,
        starts_at: `lte.${now}`,
        order: 'priority.desc,created_at.desc',
        select: 'id,title,message,icon',
      });
      const data = await firstValueFrom(this.http.get<NewsItem[]>(url));
      if (data?.length) {
        // Priority news exist — add them, skip fillers
        allItems.push(...data);
      } else {
        // No priority news — fill with random motivational messages
        allItems.push(...pickRandom(FILLER_POOL, 4));
      }

      // 2. Auto birthdays (today + next 2 days) — always shown regardless of news
      const birthdays = await this.loadBirthdays();
      allItems.push(...birthdays);

      this.items.set(allItems);
    } catch (e) {
      // silent - ticker is non-critical
    }
  }

  private async loadBirthdays(): Promise<NewsItem[]> {
    try {
      const url = this.apiUrl.build('rest/v1/employees', {
        is_active: 'eq.true',
        select: 'id,first_name,father_name,birth_date',
        birth_date: 'not.is.null',
      });
      const employees = await firstValueFrom(this.http.get<any[]>(url));
      if (!employees?.length) return [];

      const today = new Date();
      const items: NewsItem[] = [];

      for (const emp of employees) {
        if (!emp.birth_date) continue;
        const bd = new Date(emp.birth_date + 'T12:00:00');
        const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
        const diffMs = thisYearBd.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const diffDays = Math.round(diffMs / 86400000);
        const name = `${emp.first_name || ''} ${emp.father_name || ''}`.trim();

        if (diffDays === 0) {
          items.push({ id: `bd-${emp.id}`, title: 'Cumpleaños', message: `¡Feliz cumpleaños ${name}! 🎂`, icon: 'pi-gift' });
        } else if (diffDays === 1) {
          items.push({ id: `bd-${emp.id}`, title: 'Cumpleaños mañana', message: `Mañana cumple años ${name} 🎉`, icon: 'pi-gift' });
        } else if (diffDays === 2) {
          items.push({ id: `bd-${emp.id}`, title: 'Próximo cumpleaños', message: `${name} cumple años en 2 días 🎈`, icon: 'pi-calendar' });
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  private async loadStoreTargets(): Promise<NewsItem[]> {
    try {
      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const resp = await fetch(`/analytics/api/dashboard/budget-progress?from=${from}&to=${to}`);
      if (!resp.ok) return [];
      const stores: any[] = await resp.json();
      const items: NewsItem[] = [];
      const LEVELS = [
        { key: 'meta_oro', label: 'Meta Oro', emoji: '🥇' },
        { key: 'meta_alta', label: 'Meta Alta', emoji: '🥈' },
        { key: 'meta_promedio', label: 'Meta Promedio', emoji: '🎯' },
      ];
      for (const store of stores) {
        const sales = parseFloat(store.actual_sales || '0');
        for (const level of LEVELS) {
          const target = parseFloat(store[level.key] || '0');
          if (target > 0 && sales >= target) {
            items.push({
              id: `target-${store.store_id}-${level.key}`,
              title: store.store_name,
              message: `¡Alcanzó ${level.label}! ${level.emoji}`,
              icon: 'pi-trophy',
            });
            break;
          }
        }
      }
      return items;
    } catch {
      return [];
    }
  }
}
