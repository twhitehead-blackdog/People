import { Injectable } from '@angular/core';

interface PhraseContext {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
  dayOfMonth: number;
  hour: number;
  isLate: boolean;
}

@Injectable({ providedIn: 'root' })
export class TimeclockPhrasesService {
  /** Frases para los viernes */
  private readonly FRIDAY: string[] = [
    'Es viernes y el cuerpo lo sabe',
    'Viernes al fin, a darlo todo',
    'Último empujón de la semana',
    'Viernes: modo guerrero activado',
    'Ya huele a fin de semana',
    'Viernes con energía panameña',
    'Hoy se cierra la semana con broche de oro',
    'Viernes y el ánimo por las nubes',
    'Un viernes más conquistado',
    'La semana se gana los viernes',
  ];

  /** Frases para los lunes */
  private readonly MONDAY: string[] = [
    'Nuevo lunes, nuevas oportunidades',
    'Arrancamos la semana con todo',
    'Lunes de actitud ganadora',
    'Empieza la semana como campeón',
    'Lunes: el primer paso hacia el éxito',
    'A romperla esta semana',
    'Nuevo lunes, nueva energía',
    'Hoy empieza tu mejor semana',
    'Lunes con mentalidad de tiburón',
    'Dale con todo al lunes',
  ];

  /** Frases para martes a jueves */
  private readonly MIDWEEK: string[] = [
    'A mitad de semana y sin parar',
    'Cada día cuenta, hoy también',
    'Seguimos sumando días de éxito',
    'Paso a paso se llega lejos',
    'Hoy es un buen día para dar el máximo',
    'La constancia es la clave del éxito',
    'Un día más cerca de la meta',
    'Sigue así, vas por buen camino',
    'Hoy también se puede ganar',
    'Ánimo, la semana avanza',
  ];

  /** Frases cuando se acerca la quincena (1-3 días antes del 15 o 30) */
  private readonly PAYDAY_CLOSE: string[] = [
    'Ya casi es quincena, a darle duro',
    'Se acerca la quincena y tú dando el ejemplo',
    'Falta poquito pa la quincena',
    'Quincena a la vuelta de la esquina',
    'Ya se siente la quincena cerca',
    'Unos días más y llega la recompensa',
    'La quincena se acerca, ¡qué bueno verte aquí!',
    'Falta nada pa cobrar, sigue así',
    'Con ese compromiso sí se gana la quincena',
    'Quincena incoming, ánimo total',
  ];

  /** Frases el día de quincena (15 o último día del mes) */
  private readonly PAYDAY: string[] = [
    '¡Día de quincena! Bien merecida',
    'Hoy es quincena y tú puntual, eso habla bien de ti',
    'Quincena day! A celebrar el esfuerzo',
    '¡Llegó la quincena! Gracias por tu dedicación',
    'Día de pago, día de orgullo',
    'La quincena llegó para quien se la merece',
    '¡Feliz quincena! Tu esfuerzo vale oro',
    'Quincena + puntualidad = combo ganador',
    'Hoy se cosecha lo sembrado. ¡Feliz quincena!',
    '¡Quincena! El premio al que madruga',
  ];

  /** Frases para sábados */
  private readonly SATURDAY: string[] = [
    'Sábado y aquí dando la cara',
    'Trabajar en sábado es de valientes',
    'Sábado productivo, eso se respeta',
    'Un sábado de compromiso total',
    'Fin de semana y tú cumpliendo',
    'Sábado guerrero, así se hace',
    'El extra siempre se nota. Buen sábado',
    'Sábado con actitud de campeón',
  ];

  /** Frases para domingos */
  private readonly SUNDAY: string[] = [
    'Domingo y aquí dando batalla',
    'Trabajar en domingo es de líderes',
    'Domingo con compromiso, eso vale mucho',
    'Un domingo más sirviendo con excelencia',
    'Domingo heroico, se agradece tu esfuerzo',
    'El que trabaja domingo merece aplausos',
  ];

  /** Frases para madrugadores (antes de 7am) */
  private readonly EARLY_BIRD: string[] = [
    'Madrugaste, el éxito te espera',
    'Al que madruga Dios le ayuda',
    'Tempranero y comprometido, bien ahí',
    'Esa madrugada habla de tu carácter',
    'Primero en llegar, primero en triunfar',
    'Madrugar es de campeones',
    'La mañana premia a los valientes',
    'Arrancando temprano, así se gana',
  ];

  /** Frases cuando llegan tarde (pero gentiles, no regaño) */
  private readonly LATE_ARRIVAL: string[] = [
    'Mejor tarde que nunca, ¡ánimo!',
    'Ya estás aquí, eso es lo que importa',
    'Llegaste, ahora a dar lo mejor',
    'El día aún tiene mucho por dar',
    'Lo importante es que viniste, a recuperar',
    'Aún queda día para brillar',
    'Ya estamos, ahora con todo',
    'Cada minuto cuenta, a aprovecharlo',
  ];

  /** Frases panameñas / dichos populares */
  private readonly PANAMANIAN: string[] = [
    'Échale ganas, panameño',
    'Con sabor a Panamá y ganas de triunfar',
    'El panameño no se rinde, ¡dale!',
    'Pura cepa canalera',
    'Con la fuerza del Canal',
    'Orgullo panameño en cada marcada',
    'Istmo de campeones',
    'Panamá en el corazón, trabajo en las manos',
    'Aquí se trabaja con garra panameña',
    'Del Puente de las Américas al éxito',
    'Como diría Omar Torrijos: "No quiero entrar en la historia, quiero entrar en la zona del Canal"',
    'Tierra de Balboa y de gente trabajadora',
    'Con el espíritu del 9 de enero',
    'Sangre panameña, esfuerzo de campeón',
    'De Panamá para el mundo, dando el ejemplo',
    'Cinta Costera vibes: siempre hacia adelante',
    'Más fuerte que el verano panameño',
    'Con la misma fuerza que cruza el Canal',
    'Somos el puente del mundo, corazón del universo',
    'Panameño y orgulloso de trabajar duro',
  ];

  /** Frases célebres panameñas y de personajes panameños */
  private readonly FAMOUS_PANAMA: string[] = [
    '"La patria es ara y no pedestal" — Justo Arosemena',
    '"En la lucha por la libertad todos los días son buenos" — Victoriano Lorenzo',
    '"Ni millonarios ni muertos de hambre" — Omar Torrijos',
    '"Panamá para los panameños" — Grito generacional',
    '"El trabajo dignifica al hombre" — Dicho panameño',
    '"La educación es el arma más poderosa" — Adaptado por maestros panameños',
    '"Cada día es una oportunidad de ser mejor" — Sabiduría istmeña',
    '"El que persevera alcanza" — Dicho popular panameño',
    '"Primero la patria" — Lema patriota panameño',
    '"Con unidad todo se logra" — Espíritu del 3 de noviembre',
    '"No hay distancia que no se pueda recorrer" — Dicho canalero',
    '"El esfuerzo de hoy es el triunfo de mañana" — Proverbio panameño',
    '"Somos pequeños pero echados pa\'lante" — Dicho popular',
    '"Panameño que se respeta, madruga y trabaja" — Refrán popular',
    '"La disciplina tarde o temprano vence a la inteligencia" — Sabiduría istmeña',
  ];

  /** Frases generales motivacionales */
  private readonly GENERAL: string[] = [
    'Hoy va a ser un gran día',
    'Tu esfuerzo no pasa desapercibido',
    'Gracias por tu compromiso',
    'Cada día cuentas más',
    'Eres parte importante del equipo',
    'Tu puntualidad marca la diferencia',
    'Sigue con esa actitud ganadora',
    'El éxito se construye día a día',
    'Hoy es un buen día para ser excelente',
    'Tu presencia hace la diferencia',
    'El equipo cuenta contigo',
    'Otro día, otra oportunidad de brillar',
    'La consistencia te hace grande',
    'Vas por excelente camino',
    'Ese compromiso se nota',
    'Un día más de excelencia',
    'Tu dedicación inspira',
    'Bienvenido a otro día de logros',
    'La actitud lo es todo, y la tuya es ganadora',
    'Hoy es el día perfecto para dar tu mejor versión',
    'Tu trabajo tiene valor, gracias por estar',
    'La excelencia es un hábito, y tú lo demuestras',
    'Sigue sumando días de grandeza',
    'Cada marca es un paso hacia el éxito',
    'Tu compromiso es tu mejor carta de presentación',
    'Hoy también se puede lograr algo increíble',
    'La disciplina abre puertas',
    'El mejor momento es ahora',
    'Eres más fuerte de lo que crees',
    'Hoy es otro día para dejar huella',
    'Tu constancia dice mucho de ti',
    'Un día productivo empieza con llegar',
    'Nada detiene a quien tiene actitud',
    'Tu mejor versión está en construcción',
    'Hoy trae oportunidades nuevas',
    'Que nada apague tu energía hoy',
    'El éxito ama a los puntuales',
    'Hacer lo correcto siempre vale la pena',
    'Tu trabajo es semilla de grandes cosas',
    'Empieza el día con gratitud y energía',
    'Eres pieza clave en este engranaje',
    'El esfuerzo silencioso es el más poderoso',
    'Día a día construyes tu legado',
    'Confía en el proceso, vas bien',
    'Quien llega puntual, ya ganó la mitad',
    'Tu energía contagia al equipo',
    'Nada como empezar el día cumpliendo',
    'Con esa actitud llegas lejos',
    'Hoy es una página en blanco, escríbela bien',
    'El trabajo duro siempre paga',
    'Eres el motor de este equipo',
    'Gracias por ser parte de esto',
    'Que este día supere al anterior',
    'Tu dedicación tiene nombre y apellido',
    'Hoy también es día de victoria',
    'Sigue adelante, el camino es tuyo',
    'El mundo necesita gente como tú',
    'Arrancamos con todo hoy',
    'Nada es imposible para quien se presenta',
    'Tu compromiso es inspiración',
    'Llegaste y eso ya es ganar',
    'Hoy eres imparable',
    'La puntualidad es tu superpoder',
    'Otro día demostrando de qué estás hecho',
    'Tu responsabilidad habla más que mil palabras',
    'A darle con ganas que el día es tuyo',
    'Nadie puede detenerte hoy',
    'Tú marcas el ritmo del equipo',
    'Profesionalismo se deletrea con tu nombre',
    'La excelencia no es un acto, es un hábito',
    'Tu ejemplo motiva a los demás',
    'Hoy traes buena vibra, se siente',
    'Constancia + actitud = éxito asegurado',
    'Que nada te quite las ganas hoy',
    'Firme como el Cerro Ancón',
    'Como buen panameño: con calle y con clase',
    'Dale que la vida premia al constante',
    'Siempre se puede un poco más',
    'Con ese flow no hay quien te pare',
    'Llegaste primero que el café, crack',
    'Hoy vas a romperla, ya lo sé',
    'El que se levanta temprano tiene doble ventaja',
    'Cada día es una nueva victoria',
    'Tú haces que este lugar funcione mejor',
    'Excelente inicio de jornada',
    'Arriba ese ánimo, hoy será épico',
  ];

  /**
   * Obtiene una frase motivacional contextual basada en el momento actual.
   * Prioridad: quincena > día de semana > hora > general/panameña
   */
  public getPhrase(isLate = false): string {
    const now = new Date();
    const ctx: PhraseContext = {
      dayOfWeek: now.getDay(),
      dayOfMonth: now.getDate(),
      hour: now.getHours(),
      isLate,
    };

    // Si llega tarde, usar frases gentiles de tardanza
    if (ctx.isLate) {
      return this.pick(this.LATE_ARRIVAL);
    }

    // Día de quincena (15 o último día del mes)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (ctx.dayOfMonth === 15 || ctx.dayOfMonth === lastDay) {
      return this.pick(this.PAYDAY);
    }

    // 1-3 días antes de quincena
    const daysTo15 = 15 - ctx.dayOfMonth;
    const daysToEnd = lastDay - ctx.dayOfMonth;
    if ((daysTo15 > 0 && daysTo15 <= 3) || (daysToEnd > 0 && daysToEnd <= 3)) {
      // 40% quincena cercana, 60% otra cosa
      if (Math.random() < 0.4) {
        return this.pick(this.PAYDAY_CLOSE);
      }
    }

    // Madrugadores (antes de 7am)
    if (ctx.hour < 7 && Math.random() < 0.5) {
      return this.pick(this.EARLY_BIRD);
    }

    // Día de la semana específico
    const dayPool = this.getDayPool(ctx.dayOfWeek);
    if (dayPool && Math.random() < 0.45) {
      return this.pick(dayPool);
    }

    // 30% panameño/famoso, 70% general
    if (Math.random() < 0.3) {
      return Math.random() < 0.5
        ? this.pick(this.PANAMANIAN)
        : this.pick(this.FAMOUS_PANAMA);
    }

    return this.pick(this.GENERAL);
  }

  private getDayPool(day: number): string[] | null {
    switch (day) {
      case 0: return this.SUNDAY;
      case 1: return this.MONDAY;
      case 5: return this.FRIDAY;
      case 6: return this.SATURDAY;
      default: return this.MIDWEEK;
    }
  }

  private pick(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
