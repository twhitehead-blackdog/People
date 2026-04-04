import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

type DogState =
  | 'idle' | 'walking' | 'running' | 'sitting' | 'barking'
  | 'licking' | 'itching' | 'stretching' | 'lying-down' | 'sleeping';

type DogBreed =
  | 'Dog-1-Golden-Retriever' | 'Dog-2-Akita' | 'Dog-3-Great-Dane'
  | 'Dog-4-Schnauzer' | 'Dog-5-Saint-Bernard' | 'Dog-6-Siberian-Husky';

interface DogAction { name: DogState; frames: number; width: number; duration: string; }
interface DogConfig { folder: string; prefix: string; idleCase: 'idle' | 'Idle'; }

const STATE_TO_FILE: Record<DogState, string> = {
  idle: 'idle', walking: 'walk', running: 'run', sitting: 'sitting', barking: 'bark',
  licking: 'licking1', itching: 'itching', stretching: 'stretching',
  'lying-down': 'lying-down', sleeping: 'sleeping',
};

const ACTIONS: DogAction[] = [
  { name: 'idle',       frames: 10, width: 1000, duration: '1.2s'  },
  { name: 'walking',    frames: 8,  width: 800,  duration: '0.6s'  },
  { name: 'running',    frames: 8,  width: 800,  duration: '0.35s' },
  { name: 'sitting',    frames: 1,  width: 100,  duration: '0s'    },
  { name: 'barking',    frames: 3,  width: 300,  duration: '0.6s'  },
  { name: 'licking',    frames: 4,  width: 400,  duration: '0.7s'  },
  { name: 'itching',    frames: 2,  width: 200,  duration: '0.8s'  },
  { name: 'stretching', frames: 10, width: 1000, duration: '1.2s'  },
  { name: 'lying-down', frames: 7,  width: 700,  duration: '1.0s'  },
  { name: 'sleeping',   frames: 1,  width: 100,  duration: '0s'    },
];

const BREEDS: Record<DogBreed, DogConfig> = {
  'Dog-1-Golden-Retriever': { folder: 'Dog-1-Golden-Retriever', prefix: 'Golden-Retriever-', idleCase: 'idle' },
  'Dog-2-Akita':            { folder: 'Dog-2-Akita',            prefix: 'Akita-',            idleCase: 'Idle' },
  'Dog-3-Great-Dane':       { folder: 'Dog-3-Great-Dane',       prefix: 'Great-Dane-',       idleCase: 'idle' },
  'Dog-4-Schnauzer':        { folder: 'Dog-4-Schnauzer',        prefix: 'Schnauzer-',        idleCase: 'Idle' },
  'Dog-5-Saint-Bernard':    { folder: 'Dog-5-Saint-Bernard',    prefix: 'Saint-Bernard-',    idleCase: 'Idle' },
  'Dog-6-Siberian-Husky':   { folder: 'Dog-6-Siberian-Husky',  prefix: 'Siberian-Husky-',   idleCase: 'Idle' },
};

const MSGS: Record<string, string[]> = {
  idle:         ['...', '👀', 'Husmeando~', '*bostezo*', '¿Hay snacks?', 'Hmm...', '🐾', '¿Dónde está mi pelota?', 'Todo tranquilo~', '*olisquea el aire*', 'Relajado~', '¿Y eso?', '*mira al horizonte*', '¡Black Dog! 🐾', '¡Tamos! 💪', '¡Epale~', '¡Qué vacano!'],
  walking:      ['Patrullando 🐕', 'Inspeccionando...', 'A ver qué hay~', '¡Al rescate!', '¡Voy voy!', 'Dando vueltas~', '¡Explorador oficial!', '*misión importante*', '¡Black Dog finest! 🐕', '¡Dale que vamos!', 'Ronda de inspección~'],
  running:      ['¡A toda velocidad! 💨', '*corre corre*', '¡Turbo activado!', '¡YA VOOOY!', '💨 *whoosh*', '¡Black Dog SPEED! 🔥', '¡Vamo a darle!'],
  barking:      ['¡Woof! 🗣️', '¡AU AU!', '¡GUAU GUAU!', '¡EH TÚ!', '¡Hola amigo!', '¡Woof woof!', '¡¡ALERTA!!', 'WOOF WOOF WOOF', '¡¡EPALE!!', '¡¡OYE!!'],
  licking:      ['*se limpia* 🐾', '*muy higiénico*', 'Mmm~', '¡Me arreglo solo!', '*lame la pata*', 'Qué rico~', '*spa time*', '¡Pura higiene!'],
  itching:      ['Ahhhh... 😌', '*rasca rasca*', 'Qué rico~', 'Ahhh justo ahí~', 'Mmm sí~', '¡Por fin!', '*rasca rasca rasca*'],
  stretching:   ['*se estira* 🙆', 'Aaah~', 'Listooo~', '¡Buenos días!', '*crack* ¡Ajá!', 'Qué rico~', '¡Recargado!', '¡Listo pa´ lo que sea!'],
  sitting:      ['👀', '¿Me llamaste?', 'Aquí sentadito~', 'A sus órdenes 🐕', 'Esperando~', '*mira fijamente*', 'Soy bueno~', '¡Atento!'],
  'lying-down': ['Creo que descansaré...', 'Uf qué día...', '*se acomoda*', 'Solo un momento~', '*suspiro*', 'Modo relax~', '¡Qué bulla tan rica!'],
  sleeping:     ['Zzz...', '💤', 'Zzz 🐾', '*ronca suavecito*', 'Zzzz~', '*sueña con salchichas*', '💤💤', '*sueña con Black Dog*'],
  zoomies:      ['¡¡ZOOMIES!! 🚀', '¡WOO HOO!', '¡AGÁRRAME!', '¡YAAAS!', '💨💨💨', '¡GO GO GO!', '¡¡SPEED!!', '¡YUJU!', '¡¡IMPARABLE!!', '¡¡FULL ENVUELTO!!'],
  wake:         ['¡Wuh?! 😲', '*despierta*', '¿Ehh? ¿Me llamaste?', '¡Ya estoy! 🐕', '*parpadea*', '¿dormí mucho?', '¡Presente!'],
  pet:          ['❤️ Gracias~', '¡Más! ¡Más!', 'Qué buena onda 🥰', '*mueve la cola*', '¡Te quiero!', '🐾❤️', 'Aww~', '¡Qué vacano~!'],
  poop:         ['💩 Privacidad pls', 'No mires 😳', '...fue el otro perro', '*mirada inocente*', 'Ejem...', '¡Disculpen!'],
  pee:          ['💦 un momento...', '*hace pipí*', 'Territorio marcado ✅', '¡Mío mío mío!', 'Disculpen~', '¡Área asegurada!'],
  grumpy:       ['😤 Déjame.', '¡HOY NO!', '*gruñido*', '😠 ...', 'No estoy de humor', '¡MOLESTO!', 'GRR...', '¡SUFICIENTE!', '*cara de pocos amigos*', '¡Qué broma!'],
  grumpy_pet:   ['¡NO ME TOQUES! 😤', '*gruñido bajo*', '¡ALÉJATE!', '😠 En serio.', '¡GRR!', 'HOY NO.', '¡RETÍRATE!'],
  sneeze:       ['¡ACHÍS! 🤧', '*achú*', '¡Salud yo mismo!', '🤧 uf...', '¡ATCHOO!'],
  howl:         ['¡Auuuuuu! 🌙', '*aullido nocturno*', '¡AUUUU!', '🐺 Auuu~', '¡AWOOOOO!', '¡¡LUNA LLENA!! 🌕'],
  chase:        ['*persigue la cola*', '¡La agarré! Espera...', '¡Casi casi!', '*gira y gira*', '¡Es mía!'],
  hungry:       ['¿Snacks? 🦴', '*ruido de barriga*', '¿Hay comida?', '¡Tengo hambre! 🍖', '¿Pancito? 🥺', '¡¿Y el perro?! 🐾'],
  snack: [
    // Treats genéricos
    '¿Alguien dijo treats? 👀🦴', '¡Yo quiero un treat! 🦴', '*olfatea el aire* ...¿treats?',
    '¡Dame un snack o no marco! 🐾🦴', '¡Motivación = treat! 💡🦴',
    // Greatness
    '¡Necesito mi Greatness! 🌿🐕', '¡Greatness para desayuno, almuerzo y cena! 🌿',
    '*sueña con Greatness natural* 🌿😴', '¡Greatness: la comida que merezco! 👑🌿',
    '¡Sin Greatness no hay energía! 🌿⚡', '¡Comida natural = vida larga! 🌿❤️',
    '¡Greatness > croquetas normales! 🌿💪', '¡Black Dog tiene lo mejor: Greatness! 🌿🐾',
    // Patas de pollo
    '¡PATAS DE POLLO! 🍗😍', '¡Una patita de pollo por favor! 🍗🥺',
    '*babea pensando en patas de pollo* 🍗', '¡Las patas de pollo son la vida! 🍗💕',
    '¿Hay patas de pollo en bodega? 👀🍗', '¡Patas de pollo: el snack 10/10! 🍗🏆',
    '¡Patas de pollo > todo lo demás! 🍗', '*corre hacia las patas de pollo* 🍗💨',
    // Traque
    '¡Quiero mi Traque! 🦷💪', '¡Traque para los dientes! 🦷✨',
    '*mastica Traque felizmente* 🦷😌', '¡Traque: snack + limpieza dental! 🦷🐾',
    '¡Dame un Traque! 🦷🥺', '¡El Traque es vida! 🦷❤️',
    // Oreja de cerdo
    '¡OREJA DE CERDO! 🐷😍', '¡Oreja de cerdo = felicidad pura! 🐷💕',
    '*sueña con oreja de cerdo* 🐷💭', '¡Una orejita por favor! 🐷🥺',
    '¡Oreja de cerdo: el lujo supremo! 🐷👑', '¡No me hablen hasta que tenga mi oreja! 🐷😤',
    '*olfatea la oreja de cerdo desde lejos* 🐷👃',
    // Combos
    '¡Pata de pollo + Traque + oreja = el combo perfecto! 🍗🦷🐷',
    '¡Black Dog tiene los mejores snacks! 🦴🐾', '¡Primero el Greatness, después trabajo! 🌿💼',
    '¡Snack ahora o huelga! ✊🦴',
  ],
  confused:     ['¿Qué? 🤔', '*cabecita ladeada*', 'No entiendo...', '¿Ehh?', '*orejas alzadas*', '¿Eso es normal?'],
  excited:      ['¡¡SIIIII!! 🎉', '¡WOW WOW!', '¡¡YAY!!', '¡¡AMOR!!', '🎊🐕🎊', '¡¡FELIZ!!', '¡¡FULL HYPE!!'],
  jump:         ['¡WHEEE! 🦘', '¡SALTOOO!', '¡Soy libre!', '¡¡BOING!!', '¡Miren qué salto!', '¡¡YAAAS!!', '¡SKY HIGH!'],
  superman:     ['¡¡SOY SUPERDOGGO!! 🦸', '¡AL INFINITO!', '💨 SWOOOOSH', '¡¡VUELOOO!!', 'Es un pájaro... es un avión... ¡soy yo!', '¡¡BLACK DOG VUELA!!'],
  dig:          ['*excava* 🐾', '¡Sé que está aquí!', 'Está en algún lado...', '¡¡TESORO!!', '*excava frenéticamente*', '¡¡Lo encontré!!'],
  roll:         ['*rueda rueda* 🔄', '¡Voltearseee!', 'Miren esto~', '¡Truco nuevo!', '*se revuelca*'],
  typing:       ['¿Escribiendo? 👀', '*mira la pantalla*', '¿Qué haces?', '¡Estoy aquí también!', '*muy atento*', '¿Me hablas a mí?', 'Clac clac clac...', '¡Yo también sé escribir! ...casi'],
  aprilFools:   ['¡Inocente! 😜', '*fingió dormirse*', '¡Sorpresa! 🎉', '¡HA! ¡Te engañé!', '¡Día de los Inocentes! 🃏', '*era broma*', '¡Jijiji! 😏'],
  monday:       ['Lunes... 😩', '*suspiro de lunes*', 'Ya es lunes otra vez.', 'No me hablen.', '¿Por qué no es viernes?', 'El lunes es trampa.'],
  friday:       ['¡¡VIERNESSS!! 🎉', '¡TGIF! 🐕', '¡Llegó el viernes!', '¡¡FINDE!! 🥳', '¡¡SÍ SÍ SÍ!! Viernes~', '¡¡BLACK DOG FINDE!!'],
  hyper:        ['¡¡¡HIPERACTIVO!!! 🤪', '¡¡¡NO PUEDO PARAR!!!', '¡¡¡ENERGÍAAA!!!', '💥💥💥', '¡¡¡WOOOOO!!!', '¡¡MAXIMO HYPE!!', '¡¡¡YO SOY EL CAOS!!!', '¡¡¡FULL PALO!!!'],
  hyperDone:    ['*jadeando*', 'Uf... uf...', 'Necesito... agua...', '*colapsa*', '...valió la pena 😌', 'Uff 💀', '*sin aliento*', '...eso estuvo bueno'],
  sexy:         ['😘 muak~', '💋', '*guiño guiño* 😉', '¡Woof~ ❤️', '*coqueto*', '💕 hola~', '¡Qué rico~', '*ojos de cachorro* 🥺', '¿Me buscabas? 😏', '¡Woof bonito!'],
  drag:         ['¡Ey! ¡Me agarraron! 😅', '*resiste heroicamente*', '¡No tan fuerte!', 'Umm... ok~', '*curioso*', '¿A dónde vamos?'],
  drop:         ['¡Uf! Me soltaron~', '*sacude el polvo*', '¡Qué paseo!', 'Eso fue raro... 😅', '*recupera la dignidad*', '¡Bien! ¡Ya llegué!'],
  trophy:       ['¡¡CAMPEÓN!! 🏆', '¡Miren mi trofeo!', '¡El mejor perro! 🏆', '¡GANAMOS! 🎉', '¡Black Dog #1! 🏆'],
  dance:        ['🎵 *bop bop*', '¡Que suene! 🎶', '*mueve el esqueleto*', '🎵 woof woof~', '¡DJ Black Dog! 🎧', '¡A bailar!', '*disco mode*'],
  chase_mouse:  ['¡A ese mouse! 💨', '¡Lo tengo!', '¡Atrápalo!', '¡CORRE!', '¡¡PERSECUCIÓN!!', '¡No te me vas!'],
  konami:       ['¡¡¡MODO DIOS ACTIVADO!!! ✨', '¡¡BLACK DOG ULTRA!!', '¡¡¡CHEAT CODE!!!', '💥🐕💥', '¡¡¡NIVEL 99!!!'],
  blackdog:     ['¡Black Dog gang! 🐾', '¡Tamos! 💪', '¡Dale que vamos!', '¡Epale~', '¡Qué vacano!', '¡Tá bueno! 🔥', '¡Pura bulla!', '¡Vamo a darle!', '¡Black Dog finest! 🐕‍🦺', '¡Somo los mejores!', '¡Black Dog family! 🖤', '¡Full equipo!'],
};

// Frases únicas por raza
const BREED_MSGS: Partial<Record<DogBreed, Partial<Record<string, string[]>>>> = {
  'Dog-1-Golden-Retriever': {
    idle:     ['¡Hola! ¡Hola! 🎾', '¿Jugamos?', '¡Te quiero muchísimo~', '¡Eres el mejor!', '¡Qué día tan lindo!', '¡Todo es maravilloso!'],
    walking:  ['¡Voy a exploraaaar!', '¡Qué aventura!', '¿Y si corro?', '¡Mira todo esto!', '¡Mejor día ever!'],
    running:  ['¡¡WOOOOO!!', '¡Soy el más rápido! 🎾', '¡YAAAAS!', '¡VÉANme CORREERR!'],
    barking:  ['¡¡AMIGO!!', '¡Hola hola HOLA!', '¡Woof! ¡Soy feliz!', '¡¡YAAAY!!', '¡¡TE VEO!!'],
    licking:  ['*muy limpiito* ✨', '¡Brillante como el sol!', '¡Guapo y limpio!'],
    pet:      ['¡¡SÍIIII!!', '¡Más más más!', '¡¡TE AMO!!', '*coletazo intenso*', '¡¡MEJOR DÍA!!'],
    sexy:     ['¡¡AMOR!!! 😘', '¡Soy el más bonito! 💛', '*cola full velocidad*'],
    grumpy:   ['Intenté enojarme... 😅', '¡Bueno te perdono!', '¿Abrazos?', '*difícil estar enojado*'],
    jump:     ['¡¡WEEEEE!!', '¡Puedo volar casi!', '¡¡TAM TAM TAM!!'],
    friday:   ['¡¡EL MEJOR DÍA!! 🎾🎉', '¡Viernesss y yo! 🐕💛'],
    blackdog: ['¡Golden Dog gang! 🎾🐾', '¡Pura felicidad y Black Dog!'],
  },
  'Dog-2-Akita': {
    idle:     ['...', '*honor y dignidad*', 'Vigilando.', 'Todo en orden.', 'Perfecto.'],
    walking:  ['Ronda de vigilancia.', 'Inspeccionando el perímetro.', 'Todo en orden.'],
    running:  ['Velocidad con honor.', '*corre con dignidad*', 'Sprint calculado.'],
    barking:  ['¡ALTO!', '¿Quién anda ahí?', '¡Identifícate!', 'Intruso detectado.'],
    licking:  ['*higiene impecable*', 'Limpieza ritual.', 'Honor y aseo.'],
    pet:      ['...aceptable.', '*dignidad intacta*', 'Mmh.', 'Honor concedido.'],
    sexy:     ['...interesante.', '*levanta una ceja*', 'Procede con gracia.'],
    grumpy:   ['Falta el respeto.', '*mirada penetrante*', 'Inaceptable.'],
    howl:     ['¡Auuuu! (con honor)', '*aullido ceremonial*', 'Saludo a la luna.'],
    blackdog: ['Black Dog. Con honor.', 'Honor al equipo.'],
  },
  'Dog-3-Great-Dane': {
    idle:     ['¿Subo al regazo? 🥺', '*choca con algo*', 'Soy pequeñito~', 'No soy tan grande~'],
    walking:  ['*roza con las paredes*', 'Con cuiiidado~', '*derriba algo de paso*'],
    running:  ['*TERREMOTO EN CURSO* 🌍', '*todo tiembla a su paso*', '¡CUIDADO QUE VENGO!'],
    barking:  ['¡¡¡WOOF!!! (el suelo tiembla)', '¡¡HOLA!! (muy fuerte)', '¿Muy alto? Perdón~'],
    pet:      ['*casi te tumba de amor*', '¡¡YAY!! (rompe algo)', '*coletazo demoledor*'],
    sexy:     ['*tropiezo seductor*', '¡Soy grande pero tierno! 🥺', '*casi rompe algo coqueteando*'],
    grumpy:   ['*rompe algo sin querer*', '¡Oops! No fui yo~'],
    blackdog: ['¡Black Dog GRANDE! 💪', '*sacude el edificio de emoción*'],
  },
  'Dog-4-Schnauzer': {
    idle:     ['Yo mando aquí.', '*inspecciona todo*', 'Tengo reglas.', '¡Atención!'],
    walking:  ['Patrulla oficial.', 'Verificando el área.', 'Todo bajo control.'],
    running:  ['¡ACCIÓN REGLAMENTARIA!', '¡Sprint autorizado!'],
    barking:  ['¡OYE TÚ!', '¡A MIS ÓRDENES!', '¡AQUÍ MANDO YO!', '¡REGLAS!'],
    licking:  ['*limpieza conforme al reglamento*', 'Aseo: aprobado.'],
    pet:      ['Está... permitido.', 'Una vez.', 'Solo por hoy.'],
    sexy:     ['Esto... no estaba en el reglamento.', '*acepta coqueteo previo protocolo*'],
    grumpy:   ['¡INACEPTABLE!', '¡Mi territorio!', '¡ORDEN!'],
    dig:      ['¡Aquí está la evidencia!', '*excava con autoridad*'],
    blackdog: ['Black Dog bajo reglamento. 📋', '¡Protocolo Black Dog activado!'],
  },
  'Dog-5-Saint-Bernard': {
    idle:     ['¿Necesitas rescate? 🛡️', 'Aquí para ayudar~', 'Listo para la misión.'],
    walking:  ['Buscando quién necesite ayuda~', '¡A ayudar!', 'Patrulla de rescate.'],
    running:  ['¡¡EMERGENCIA EN CAMINO!!', '¡RESCATE VELOZ! 🛡️'],
    barking:  ['¡AL RESCATE!', '¡EMERGENCIA!', '¡MISIÓN ACTIVADA!'],
    licking:  ['*lame de rescate*', 'Primeros auxilios de lamida~'],
    pet:      ['*te salva aunque no lo necesites*', 'Misión cumplida~', '¡Estás a salvo!'],
    sexy:     ['*te rescata y encima coquetea*', '¡Salvo corazones también! 💕'],
    superman: ['¡SUPERBERNARDO AL RESCATE! 🦸', '¡VUELO DE RESCATE!'],
    blackdog: ['¡Black Dog Rescue Team! 🛡️🐾', '¡Salvando con estilo!'],
  },
  'Dog-6-Siberian-Husky': {
    idle:     ['*llanto dramático*', 'Nadie me entiende~', 'La vida es dura 😤', '¡WOOOO!'],
    walking:  ['*dramático suspiro al caminar*', 'Nadie aprecia el esfuerzo.', 'Caminando en mi tragedia~'],
    running:  ['¡¡HUYENDO DE MI DESTINO!!', '*corre dramáticamente*'],
    barking:  ['¡AWOOOO!', '¡¡ESCÚCHENME!!', '¡WOO WOO WOO!'],
    licking:  ['*lame con drama*', 'Limpiándome mis lágrimas~'],
    pet:      ['*acepta dramáticamente*', '¡¡AWOOOO! (feliz)', 'Quizás no me abandonaste.'],
    sexy:     ['*coquetea dramáticamente*', '¡Auuuu de amor! 😭❤️', 'Quizás sí te merezca...'],
    grumpy:   ['¡¡TRAICIÓN!!', '*drama máximo*', '¡¡NUNCA LO PERDONARÉ!!'],
    howl:     ['¡¡AUUUUUUUU!! 🌕', '*aullido de 10 minutos*', '¡MI VIDA ES UNA ÓPERA!'],
    monday:   ['EL. PEOR. DÍA. 😭', '*llora en lunes*'],
    friday:   ['¡¡SOBREVIVÍ A LA SEMANA!! 😭🎉', '*llora de alegría*'],
    blackdog: ['¡Black Dog es mi familia! 😭❤️', '*llora de orgullo por Black Dog*'],
  },
};

// Full moon approximation (Metonic cycle)
function isFullMoon(): boolean {
  const known = new Date(2024, 0, 25).getTime(); // known full moon
  const msPerCycle = 29.53059 * 24 * 3600 * 1000;
  const diff = (Date.now() - known) % msPerCycle;
  const phase = diff / msPerCycle;
  return phase > 0.45 && phase < 0.55; // within ~1.5 days of full moon
}

@Component({
  selector: 'pt-dog-animation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #dogContainer style="position:fixed;bottom:0;left:0;width:100%;height:0;pointer-events:none;z-index:9999;">

      <div
        #dogWrapper
        style="position:absolute;bottom:-28px;"
        class="cursor-pointer pointer-events-auto dog-wrapper"
        [class.opacity-0]="!isReady()"
        [class.opacity-100]="isReady()"
        [class.dog-zoomies]="isZoomies()"
        [class.dog-jumping]="isJumping()"
        [class.dog-superman]="isSuperman()"
        [class.dog-hyper]="isHyper()"
        [class.dog-sexy]="isSexy()"
        [class.dog-dancing]="isDancing()"
        (mousedown)="onDogMouseDown($event)"
        (click)="onDogClick()"
        [style.transform]="'translateX(' + currentPixelPosition() + 'px)'"
        [class.transition-transform]="isMoving() && !isZoomies() && !isSuperman() && !isDragging()"
        [style.transition-duration]="moveDuration() + 's'"
        [style.transition-timing-function]="'ease-in-out'"
      >
        <!-- Speech bubble -->
        @if (showTip()) {
          <div class="dog-bubble"
            [class.dog-bubble--sleep]="isSleepState()"
            [class.dog-bubble--zoomies]="isZoomies() || isHyper()"
            [class.dog-bubble--grumpy]="badMood()"
            [class.dog-bubble--sexy]="isSexy()">
            {{ currentTip() }}
          </div>
        }

        <!-- Hearts / Kiss particles -->
        @if (showHearts()) {
          <div class="particles-wrap">
            @for (h of heartList; track h.id) {
              <span class="heart-particle" [style.--delay]="h.delay + 's'" [style.--dx]="h.dx + 'px'">{{ h.emoji }}</span>
            }
          </div>
        }

        <!-- Dirt particles when digging -->
        @if (showDirt()) {
          <div class="dirt-wrap">
            <span class="dirt d1">🟤</span>
            <span class="dirt d2">🟫</span>
            <span class="dirt d3">🟤</span>
          </div>
        }

        <!-- Sleeping Zzz -->
        @if (currentState() === 'sleeping') {
          <div class="zzz-wrap">
            <span class="zzz z1">z</span>
            <span class="zzz z2">z</span>
            <span class="zzz z3">Z</span>
          </div>
        }

        <!-- Dancing music notes -->
        @if (isDancing()) {
          <div class="music-wrap">
            <span class="note n1">🎵</span>
            <span class="note n2">🎶</span>
            <span class="note n3">🎵</span>
          </div>
        }

        <!-- Poop -->
        @if (showPoop()) { <div class="poop-emoji">💩</div> }

        <!-- Pee puddle -->
        @if (showPee()) { <div class="pee-puddle">💦</div> }

        <!-- Trophy -->
        @if (showTrophy()) { <div class="trophy-emoji">🏆</div> }

        <!-- Superman cape -->
        @if (isSuperman()) { <div class="cape">🦸</div> }

        <!-- Sexy sparkle -->
        @if (isSexy()) { <div class="sexy-sparkle">✨</div> }

        <!-- Shadow -->
        <div class="dog-shadow"></div>

        <!-- Sprite -->
        <div
          class="dog-sprite w-[100px] h-[100px]"
          [ngStyle]="dogStyle()"
          [style.transform]="currentDirection() === 'left' ? 'scaleX(-1)' : 'scaleX(1)'"
          [style.filter]="spriteFilter()"
        ></div>
      </div>
    </div>
  `,
  styles: `
    @keyframes bubble-in {
      from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.85); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1);    }
    }
    @keyframes zzz-up {
      0%   { opacity: 0;   transform: translateY(0)     scale(0.6); }
      25%  { opacity: 1; }
      100% { opacity: 0;   transform: translateY(-32px) scale(1.1); }
    }
    @keyframes heart-up {
      0%   { opacity: 1; transform: translateY(0)     translateX(var(--dx)) scale(0.8); }
      100% { opacity: 0; transform: translateY(-55px) translateX(var(--dx)) scale(1.2); }
    }
    @keyframes poop-pop {
      0%   { transform: scale(0) translateY(4px); opacity: 0; }
      30%  { transform: scale(1.2) translateY(0); opacity: 1; }
      70%  { transform: scale(1) translateY(0);   opacity: 1; }
      100% { transform: scale(0.8) translateY(4px); opacity: 0; }
    }
    @keyframes shadow-pulse {
      0%, 100% { transform: translateX(-50%) scaleX(1);    opacity: .25; }
      50%       { transform: translateX(-50%) scaleX(0.85); opacity: .15; }
    }
    @keyframes dog-jump {
      0%   { margin-bottom: 0px; }
      25%  { margin-bottom: 55px; }
      50%  { margin-bottom: 80px; }
      75%  { margin-bottom: 40px; }
      90%  { margin-bottom: 8px; }
      100% { margin-bottom: 0px; }
    }
    @keyframes superman-fly {
      0%   { margin-bottom: 0px;  rotate: 0deg; }
      20%  { margin-bottom: 35px; rotate: -8deg; }
      50%  { margin-bottom: 55px; rotate: -12deg; }
      80%  { margin-bottom: 35px; rotate: -8deg; }
      100% { margin-bottom: 0px;  rotate: 0deg; }
    }
    @keyframes dirt-fly {
      0%   { opacity: 1; transform: translateY(0)     translateX(var(--dx)); }
      100% { opacity: 0; transform: translateY(-35px) translateX(var(--dx)); }
    }
    @keyframes pee-drip {
      0%   { opacity: 0; transform: scale(0.5); }
      30%  { opacity: 1; transform: scale(1.2); }
      70%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.8); }
    }
    @keyframes cape-flutter {
      0%, 100% { transform: rotate(-5deg) scale(1); }
      50%       { transform: rotate(5deg) scale(1.1); }
    }
    @keyframes trophy-bounce {
      0%,100% { transform: translateY(0) rotate(-5deg); opacity: 1; }
      50%      { transform: translateY(-12px) rotate(5deg); opacity: 1; }
    }
    @keyframes hyper-shake {
      0%,100% { transform: rotate(0deg); }
      20%      { transform: rotate(-4deg) scale(1.05); }
      40%      { transform: rotate(4deg)  scale(1.08); }
      60%      { transform: rotate(-3deg) scale(1.05); }
      80%      { transform: rotate(3deg)  scale(1.07); }
    }
    @keyframes sexy-pulse {
      0%,100% { transform: scale(1); }
      50%      { transform: scale(1.06); }
    }
    @keyframes sparkle-float {
      0%   { opacity: 0; transform: translateY(0) rotate(0deg) scale(0.5); }
      40%  { opacity: 1; }
      100% { opacity: 0; transform: translateY(-30px) rotate(180deg) scale(1.2); }
    }
    @keyframes note-float {
      0%   { opacity: 0; transform: translateY(0) scale(0.7); }
      20%  { opacity: 1; }
      100% { opacity: 0; transform: translateY(-40px) scale(1.1); }
    }
    @keyframes dog-bop {
      0%,100% { margin-bottom: 0px; }
      50%      { margin-bottom: 10px; }
    }
    @keyframes konami-flash {
      0%,100% { filter: brightness(1); }
      25%      { filter: brightness(2) hue-rotate(90deg); }
      50%      { filter: brightness(2) hue-rotate(180deg); }
      75%      { filter: brightness(2) hue-rotate(270deg); }
    }

    @keyframes dog-spin     { 0% { rotate:0deg } 100% { rotate:360deg } }
    @keyframes dog-float    { 0%,100% { margin-bottom:0 } 30% { margin-bottom:35px } 60% { margin-bottom:55px } 80% { margin-bottom:30px } }
    @keyframes dog-wiggle   { 0%,100% { rotate:0deg } 20% { rotate:-15deg } 40% { rotate:12deg } 60% { rotate:-10deg } 80% { rotate:8deg } }
    @keyframes dog-shrink   { 0%,100% { scale:1 } 40% { scale:0.6 } 70% { scale:1.15 } }
    .dog-spinning   { animation: dog-spin    0.6s cubic-bezier(.36,.07,.19,.97) 1; }
    .dog-floating   { animation: dog-float   1.2s ease-in-out 1; }
    .dog-wiggling   { animation: dog-wiggle  0.5s ease-in-out 1; }
    .dog-shrinking  { animation: dog-shrink  0.5s ease-in-out 1; }
    .dog-wrapper        { position: relative; width: 100px; user-select: none; -webkit-user-select: none; }
    @media (max-width: 768px) { :host { display: none !important; } }
    .dog-jumping        { animation: dog-jump 0.7s cubic-bezier(.36,.07,.19,.97); }
    .dog-superman       { animation: superman-fly 2.4s ease-in-out; }
    .dog-hyper .dog-sprite { animation: hyper-shake 0.25s linear infinite !important; }
    .dog-sexy           { animation: sexy-pulse 0.8s ease-in-out infinite; }
    .dog-dancing        { animation: dog-bop 0.4s ease-in-out infinite; }
    .dog-konami .dog-sprite { animation: konami-flash 0.3s linear infinite !important; }

    .dog-bubble {
      position: absolute;
      bottom: 102px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #1f2937;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 5px 11px;
      border-radius: 14px;
      white-space: normal;
      max-width: min(220px, 60vw);
      text-align: center;
      line-height: 1.3;
      box-shadow: 0 3px 10px rgba(0,0,0,.18);
      border: 1px solid #e5e7eb;
      animation: bubble-in .22s ease-out;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      z-index: 50;
    }
    .dog-bubble::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 8px; height: 8px;
      background: white;
      border-right: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .dog-bubble--sleep   { background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }
    .dog-bubble--sleep::after   { background: #ede9fe; border-color: #c4b5fd; }
    .dog-bubble--zoomies { background: #fef9c3; border-color: #fcd34d; color: #92400e; font-size: .8rem; font-weight: 800; }
    .dog-bubble--zoomies::after { background: #fef9c3; border-color: #fcd34d; }
    .dog-bubble--grumpy  { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
    .dog-bubble--grumpy::after  { background: #fee2e2; border-color: #fca5a5; }
    .dog-bubble--sexy    { background: #fdf2f8; border-color: #f9a8d4; color: #9d174d; }
    .dog-bubble--sexy::after    { background: #fdf2f8; border-color: #f9a8d4; }

    .pee-puddle {
      position: absolute; bottom: -4px; left: 60px;
      font-size: 1.5rem;
      animation: pee-drip 2.5s ease-in-out forwards;
      pointer-events: none;
    }
    .cape {
      position: absolute; top: 10px; right: -18px;
      font-size: 1.4rem;
      animation: cape-flutter 0.4s ease-in-out infinite;
      pointer-events: none;
    }
    .trophy-emoji {
      position: absolute; bottom: 80px; left: 50%;
      transform: translateX(-50%);
      font-size: 1.8rem;
      animation: trophy-bounce 0.6s ease-in-out infinite;
      pointer-events: none;
    }
    .sexy-sparkle {
      position: absolute; top: -8px; right: -10px;
      font-size: 1.1rem;
      animation: sparkle-float 1.2s ease-out infinite;
      pointer-events: none;
    }
    .dirt-wrap { position: absolute; bottom: 5px; left: -10px; pointer-events: none; }
    .dirt { position: absolute; font-size: 0.85rem; animation: dirt-fly 0.7s ease-out infinite; opacity: 0; }
    .d1 { --dx: -15px; animation-delay: 0s;    }
    .d2 { --dx:  5px;  animation-delay: 0.15s; }
    .d3 { --dx: -25px; animation-delay: 0.3s;  }

    .music-wrap { position: absolute; bottom: 105px; left: 50%; transform: translateX(-50%); pointer-events: none; }
    .note { position: absolute; font-size: 1rem; animation: note-float 1.4s ease-out infinite; opacity: 0; }
    .n1 { left: -18px; animation-delay: 0s;    }
    .n2 { left:   0px; animation-delay: 0.45s; }
    .n3 { left:  18px; animation-delay: 0.9s;  }

    .particles-wrap { position: absolute; bottom: calc(100% + 5px); left: 50%; transform: translateX(-50%); pointer-events: none; }
    .heart-particle { position: absolute; font-size: 1.1rem; animation: heart-up 1.1s ease-out forwards; animation-delay: var(--delay, 0s); opacity: 0; }

    .zzz-wrap { position: absolute; bottom: calc(100% + 2px); right: 2px; pointer-events: none; }
    .zzz { position: absolute; color: #8b5cf6; font-weight: 800; font-style: italic; animation: zzz-up 2.2s ease-in-out infinite; opacity: 0; }
    .z1 { font-size: .6rem;  right: 0;     bottom: 0; animation-delay: 0s;   }
    .z2 { font-size: .8rem;  right: -8px;  bottom: 0; animation-delay: .75s; }
    .z3 { font-size: 1rem;   right: -18px; bottom: 0; animation-delay: 1.5s; }

    .poop-emoji { position: absolute; bottom: -2px; left: 108px; font-size: 1.4rem; animation: poop-pop 3s ease-in-out forwards; pointer-events: none; }

    .dog-shadow { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); width: 70px; height: 10px; background: rgba(0,0,0,.35); border-radius: 50%; filter: blur(4px); animation: shadow-pulse 1.8s ease-in-out infinite; }
    .dog-zoomies .dog-shadow { animation: none; transform: translateX(-50%) scaleX(0.7); opacity: .15; }

    .dog-sprite { background-repeat: no-repeat; image-rendering: pixelated; position: relative; z-index: 2; }
  `,
})
export class DogAnimationComponent implements OnInit, OnDestroy {
  private store  = inject(DashboardStore);
  private ngZone = inject(NgZone);

  @ViewChild('dogWrapper')   dogWrapper!:   ElementRef<HTMLDivElement>;
  @ViewChild('dogContainer') dogContainer!: ElementRef<HTMLDivElement>;

  // ── Inputs ────────────────────────────────────────────────────────────
  public muted            = input<boolean>(false);
  public selectedName     = input<string>('');
  public selectedPosition = input<string>('');
  public selectedDept     = input<string>('');
  public selectedGender   = input<'M'|'F'|''>('');

  // ── Signals ──────────────────────────────────────────────────────────
  public currentBreed         = signal<DogBreed>('Dog-1-Golden-Retriever');
  public currentState         = signal<DogState>('idle');
  public currentDirection     = signal<'left' | 'right'>('right');
  public currentPixelPosition = signal<number>(0);
  public isReady              = signal<boolean>(false);
  public showTip              = signal<boolean>(false);
  public currentTip           = signal<string>('');
  public moveDuration         = signal<number>(0);
  public isZoomies            = signal<boolean>(false);
  public showHearts           = signal<boolean>(false);
  public showPoop             = signal<boolean>(false);
  public showPee              = signal<boolean>(false);
  public showDirt             = signal<boolean>(false);
  public showTrophy           = signal<boolean>(false);
  public isJumping            = signal<boolean>(false);
  public isSuperman           = signal<boolean>(false);
  public badMood              = signal<boolean>(false);
  public isHyper              = signal<boolean>(false);
  public isSexy               = signal<boolean>(false);
  public isDragging           = signal<boolean>(false);
  public isDancing            = signal<boolean>(false);
  public isKonami             = signal<boolean>(false);

  public isSleepState = computed(() =>
    this.currentState() === 'sleeping' || this.currentState() === 'lying-down'
  );
  public isMoving = computed(() =>
    this.currentState() === 'walking' || this.currentState() === 'running'
  );
  public spriteFilter = computed(() => {
    if (this.badMood())    return 'hue-rotate(320deg) saturate(2) brightness(0.85)';
    if (this.isKonami())   return 'hue-rotate(var(--konami-hue,0deg)) saturate(3) brightness(1.4)';
    if (this.isSexy())     return 'hue-rotate(300deg) saturate(1.8) brightness(1.1) drop-shadow(0 0 5px #f9a8d4)';
    if (this.isSuperman()) return 'drop-shadow(0 0 8px #ffd700) brightness(1.2)';
    if (this.isHyper())    return 'hue-rotate(280deg) saturate(3) brightness(1.3) drop-shadow(0 0 6px #f0abfc)';
    return '';
  });
  public dogStyle = computed(() => {
    const breed  = BREEDS[this.currentBreed()];
    const action = ACTIONS.find(a => a.name === this.currentState());
    if (!action || !breed) return {};
    let fileName = STATE_TO_FILE[action.name];
    if (action.name === 'idle' && breed.idleCase === 'Idle') fileName = 'Idle';
    const url    = `assets_dog/Pet Dogs Pack/${breed.folder}/${breed.prefix}${fileName}.png`;
    const scale  = this.DOG_SIZE / 100;
    const endPos = -(action.width * scale);
    return {
      'background-image': `url('${url}')`,
      'background-size':  `auto ${this.DOG_SIZE}px`,
      width: `${this.DOG_SIZE}px`, height: `${this.DOG_SIZE}px`,
      '--sprite-width': `${endPos}px`,
      animation: action.frames > 1
        ? `play-sprite ${action.duration} steps(${action.frames}) infinite` : 'none',
    };
  });

  public heartList: { id: number; delay: number; dx: number; emoji: string }[] = [];

  // ── Private state ─────────────────────────────────────────────────────
  private readonly ROTATION_KEY = 'pt_dog_rotation_v3';
  private readonly SLEEP_DELAY  = 3 * 60 * 1000;
  private readonly DOG_SIZE     = 100;
  private timeoutIds:      ReturnType<typeof setTimeout>[] = [];
  private sleepTimer:      ReturnType<typeof setTimeout> | null = null;
  private resizeObserver:  ResizeObserver | null = null;
  private isDestroyed      = false;
  private containerWidth   = 0;
  private clickCount       = 0;
  private lastClickTime    = 0;
  private clickResetTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMouseBarkAt  = 0;
  private lastKeyReactAt   = 0;
  private keyTypeCount     = 0;
  private isSleeping       = false;
  private energyWalkCount  = 0;
  private rafId:           number | null = null;
  private heartCounter     = 0;
  private pawCounter       = 0;
  private lastMouseX       = 0;
  private lastMouseY       = 0;
  private lastMouseTime    = 0;
  private isChasing        = false;
  private chaseTimeout:    ReturnType<typeof setTimeout> | null = null;
  private konamiProgress   = 0;
  private readonly KONAMI  = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  private dragMoveHandler: ((e: MouseEvent) => void) | null = null;
  private dragUpHandler:   (() => void) | null = null;
  private dragStartX       = 0;
  private didDrag          = false;

  // ── Mouse proximity + velocity chase ─────────────────────────────────
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.dogWrapper?.nativeElement || !this.isReady()) return;

      // Velocity tracking
      const now  = Date.now();
      const dt   = now - this.lastMouseTime;
      const dx   = Math.abs(event.clientX - this.lastMouseX);
      const vel  = dt > 20 ? dx / dt * 1000 : 0;
      this.lastMouseX    = event.clientX;
      this.lastMouseY    = event.clientY;
      this.lastMouseTime = now;

      // Mouse chase: fast mouse → dog runs after it
      if (vel > 450 && !this.isSleeping && !this.isHyper() && !this.isZoomies()
          && !this.isDragging() && !this.isChasing && this.currentState() !== 'running') {
        this.ngZone.run(() => this.startMouseChase(event.clientX));
        return;
      }

      const rect       = this.dogWrapper.nativeElement.getBoundingClientRect();
      const dogCenterX = rect.left + rect.width / 2;
      const dist       = Math.abs(event.clientX - dogCenterX);

      if (dist > 70 && this.currentState() === 'idle') {
        const newDir = event.clientX > dogCenterX ? 'right' : 'left';
        if (this.currentDirection() !== newDir) {
          this.ngZone.run(() => this.currentDirection.set(newDir));
        }
      }

      if (dist < 55 && this.currentState() === 'idle') {
        if (now - this.lastMouseBarkAt > 8000) {
          this.lastMouseBarkAt = now;
          this.ngZone.run(() => this.reactToMouse());
        }
      }
    });
  }

  private startMouseChase(mouseClientX: number) {
    if (this.isDestroyed || this.isSleeping || this.isDragging()) return;
    this.isChasing = true;
    this.clearActions();
    if (this.chaseTimeout) clearTimeout(this.chaseTimeout);

    const container = this.dogContainer?.nativeElement;
    if (!container) return;
    const cRect   = container.getBoundingClientRect();
    const targetX = Math.max(25, Math.min(mouseClientX - cRect.left - 50, this.containerWidth - 125));

    this.currentDirection.set(targetX > this.currentPixelPosition() ? 'right' : 'left');
    const dist     = Math.abs(targetX - this.currentPixelPosition());
    const duration = Math.min(dist / 450, 2.5);
    this.moveDuration.set(duration);
    this.currentState.set('running');
    this.currentPixelPosition.set(targetX);
    this.showStateMessage('chase_mouse');
    this.spawnPawTrail(this.currentPixelPosition(), targetX, duration * 1000);

    this.chaseTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        this.isChasing = false;
        this.currentState.set('sitting');
        this.showMsgDirect(this.rnd(['¡Lo atrapé! 😤', '*jadea*', '¡Era mío!', '*mira triunfante*', 'Siguiente vez no escapa.']));
        const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(1200); } }, 1500);
        this.timeoutIds.push(id);
      }
    }, duration * 1000 + 200);
    this.timeoutIds.push(this.chaseTimeout);
  }

  // ── Keyboard: typing reaction + Konami ───────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Konami code
    if (event.key === this.KONAMI[this.konamiProgress]) {
      this.konamiProgress++;
      if (this.konamiProgress === this.KONAMI.length) {
        this.konamiProgress = 0;
        this.ngZone.run(() => this.triggerKonami());
        return;
      }
    } else {
      this.konamiProgress = 0;
      // Re-check in case current key starts new sequence
      if (event.key === this.KONAMI[0]) this.konamiProgress = 1;
    }

    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key.length !== 1 && !['Enter', 'Backspace'].includes(event.key)) return;
    this.keyTypeCount++;
    const now = Date.now();
    if (this.keyTypeCount >= 8 && now - this.lastKeyReactAt > 20_000 && this.currentState() === 'idle') {
      this.lastKeyReactAt = now;
      this.keyTypeCount   = 0;
      this.ngZone.run(() => this.reactToTyping());
    }
  }

  private reactToMouse() {
    if (this.isDestroyed || this.isSleeping || this.isMoving()) return;
    this.clearActions();
    this.currentState.set('barking');
    this.showStateMessage('barking');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); }
    }, 1200);
    this.timeoutIds.push(id);
  }

  private reactToTyping() {
    if (this.isDestroyed || this.isSleeping || this.isMoving()) return;
    this.clearActions();
    this.currentState.set('sitting');
    this.showStateMessage('typing');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(1000); }
    }, 2200);
    this.timeoutIds.push(id);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  constructor() {
    this.injectKeyframes();
    afterNextRender(() => this.initResize());

    // React when timeclock passes a selected employee
    effect(() => {
      const name   = this.selectedName();
      if (!name) return;
      const pos    = this.selectedPosition();
      const dept   = this.selectedDept();
      const gender = this.selectedGender();
      // Switch breed based on gender
      untracked(() => this.applyGenderBreed(gender));
      const ready = untracked(() => this.isReady());
      if (ready) {
        untracked(() => this.greetByName(name, pos, dept));
      } else {
        const id = setTimeout(() => {
          if (!this.isDestroyed && untracked(() => this.isReady())) this.greetByName(name, pos, dept);
        }, 1200);
        this.timeoutIds.push(id);
      }
    });
  }

  async ngOnInit() {
    this.updateMetrics();
    await this.initBreedRotation();
    if (!this.isDestroyed) {
      this.currentPixelPosition.set(100);
      this.scheduleNext();
      this.resetSleepTimer();
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.timeoutIds.forEach(clearTimeout);
    if (this.sleepTimer)      clearTimeout(this.sleepTimer);
    if (this.clickResetTimer) clearTimeout(this.clickResetTimer);
    if (this.chaseTimeout)    clearTimeout(this.chaseTimeout);
    if (this.rafId)           cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.removeDragListeners();
  }

  // ── Click & drag ──────────────────────────────────────────────────────
  public onDogMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    this.dragStartX = event.clientX;
    this.didDrag    = false;
    this.dragMoveHandler = (e: MouseEvent) => this.onDragMove(e);
    this.dragUpHandler   = () => this.onDragUp();
    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup',   this.dragUpHandler);
  }

  private onDragMove(event: MouseEvent) {
    if (Math.abs(event.clientX - this.dragStartX) < 8) return;
    if (!this.didDrag) {
      this.didDrag = true;
      this.ngZone.run(() => {
        this.isDragging.set(true);
        this.badMood.set(true);
        this.clearActions();
        if (this.isMoving()) this.freezeMovement();
        this.currentState.set('barking');
        this.playSound('growl');
        this.showMsgDirect(this.rnd(MSGS['drag']));
      });
    }
    const container = this.dogContainer?.nativeElement;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const newX  = Math.max(25, Math.min(event.clientX - cRect.left - 50, this.containerWidth - 125));
    this.ngZone.run(() => {
      this.moveDuration.set(0);
      this.currentPixelPosition.set(newX);
    });
  }

  private onDragUp() {
    this.removeDragListeners();
    if (!this.didDrag) return;
    this.ngZone.run(() => {
      this.isDragging.set(false);
      this.currentState.set('barking');
      this.showMsgDirect(this.rnd(MSGS['drop']));
      this.playSound('growl');
      // Stays grumpy for ~12s after being dragged
      const calm = setTimeout(() => {
        if (!this.isDestroyed) {
          this.badMood.set(false);
          this.showMsgDirect('...ok, ya me calmé 😤');
        }
      }, 12_000);
      this.timeoutIds.push(calm);
      const id = setTimeout(() => {
        if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(1500); }
      }, 1800);
      this.timeoutIds.push(id);
    });
  }

  private removeDragListeners() {
    if (this.dragMoveHandler) { document.removeEventListener('mousemove', this.dragMoveHandler); this.dragMoveHandler = null; }
    if (this.dragUpHandler)   { document.removeEventListener('mouseup',   this.dragUpHandler);   this.dragUpHandler   = null; }
  }

  public onDogClick() {
    if (this.didDrag) return; // was a drag, not a click

    if (this.isSleeping) { this.wakeUp(); return; }

    if (this.badMood()) {
      this.clearActions();
      if (this.isMoving()) this.freezeMovement();
      this.currentState.set('barking');
      this.playSound('growl');
      this.showMsgDirect(this.rnd(MSGS['grumpy_pet']));
      const ig = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); } }, 1000);
      this.timeoutIds.push(ig);
      return;
    }

    const now = Date.now();
    // Double-click detection (within 300ms)
    if (now - this.lastClickTime < 300 && this.clickCount === 1) {
      this.clickCount    = 0;
      this.lastClickTime = 0;
      this.doTrick();
      return;
    }
    this.lastClickTime = now;

    this.clickCount++;
    if (this.clickResetTimer) clearTimeout(this.clickResetTimer);
    this.clickResetTimer = setTimeout(() => { this.clickCount = 0; }, 700);
    if (this.clickCount >= 6) { this.clickCount = 0; this.triggerHyper(); return; }
    if (this.clickCount >= 3) { this.clickCount = 0; this.triggerZoomies(); return; }

    this.clearActions();
    this.showTip.set(false);
    this.resetSleepTimer();
    if (this.isMoving()) this.freezeMovement();

    const sounds: ('bark'|'howl'|'sneeze'|'pee'|'growl'|'lick'|'eating'|'panting')[] = ['bark','bark','bark','howl','sneeze','pee','growl','lick','eating','panting'];
    this.playSound(sounds[Math.floor(Math.random() * sounds.length)]);
    this.spawnHearts(this.isSexy() ? 8 : 5, this.isSexy());
    this.currentState.set('barking');
    this.showStateMessage(this.isSexy() ? 'sexy' : 'pet');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('sitting'); this.scheduleNext(2500); }
    }, 1300);
    this.timeoutIds.push(id);
  }

  private doTrick() {
    this.clearActions();
    if (this.isMoving()) this.freezeMovement();
    const tricks = [
      () => { this.doJump(); },
      () => { this.doRoll(); },
      () => { this.currentState.set('stretching'); this.showMsgDirect('¡Miren este truco! 🐕'); const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); } }, 1800); this.timeoutIds.push(id); },
      () => { this.doChaseTail(); },
    ];
    this.rnd(tricks)();
    this.showMsgDirect(this.rnd(['¡Truco! 🎪', '¡Lo vi en YouTube!', '¡Miren esto!', '¡Shazam! ✨', '¡Black Dog tricks!']));
  }

  private spawnHearts(count = 5, kisses = false) {
    const emojis = kisses
      ? ['💋', '😘', '💕', '❤️', '💗']
      : ['❤️', '🧡', '💛', '💚', '💙', '🩷'];
    this.heartList = Array.from({ length: count }, (_, i) => ({
      id: this.heartCounter++,
      delay: i * 0.1,
      dx: (Math.random() - 0.5) * 60,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    this.showHearts.set(true);
    const id = setTimeout(() => { if (!this.isDestroyed) this.showHearts.set(false); }, 1800);
    this.timeoutIds.push(id);
  }

  // ── Greet by name + position (timeclock employee selection) ─────────
  private greetByName(name: string, position = '', dept = '') {
    if (this.isDestroyed || this.isSleeping) return;
    const first = name.split(' ')[0];
    const pos   = position.toLowerCase();
    const dep   = dept.toLowerCase();

    // ── Frases por cargo ─────────────────────────────────────────────────
    const byPosition = ((): string[] => {
      // Peluquero / Groomer
      if (/peluc|groo|estilis/i.test(pos)) return [
        `¡${first} el/la peluquero/a llegó! ✂️🐾`, `¡${first}! ¡A transformar peludos! ✂️`,
        `¡Las tijeras están listas, ${first}! ✂️`, `¡${first}! ¡Artista del pelaje! 🎨🐾`,
        `¡Llegó el/la estilista más crack! ✂️ ${first} in da house`,
        `${first}: las mascotas ya suspiran de alivio ✂️😌`,
        `¡${first}! ¡Black Dog Grooming te necesita! 🐕💅`,
        `El secador pregunta por ti, ${first} ✂️🔥`,
      ];
      // Veterinario / Vet
      if (/vet|doctor|dr\.|médic|clínic/i.test(pos)) return [
        `¡Dr(a). ${first} en el edificio! 🩺🐾`, `¡${first}! ¡Las mascotas están en buenas manos! 🩺`,
        `¡${first}! El estetoscopio te espera 🩺`, `Diagnóstico del día: ${first} es crack 🩺💪`,
        `¡${first}! ¡Guardián de las patitas! 🐾🩺`,
        `Las mascotas enfermas ya se sienten mejor, ${first} llegó 🩺❤️`,
        `¡${first}! ¡Medicina pura Black Dog! 🏥🐾`,
      ];
      // Cajero / Cashier
      if (/caj|cajero|cash|cobrad/i.test(pos)) return [
        `¡${first}! ¡La caja registradora te saluda! 💰`, `¡${first} al frente! 💵🐾`,
        `¡${first}! Sin ti no hay flujo de caja 💰💪`,
        `${first}: maestro/a del POS 🖥️💳`, `¡${first}! Las ventas dependen de ti hoy 💵`,
        `¡${first}! ¡El dinero fluye cuando llegas! 💰🌊`,
      ];
      // Gerente / Manager
      if (/gerent|manager|supervis|jef[ae]|direct|coord/i.test(pos)) return [
        `¡El/La jefe/a en la casa! 👑 ${first}`, `¡${first}! ¡Comandante del turno! 🎖️`,
        `¡${first}! El equipo estaba esperando al líder 👑`,
        `${first}: máxima autoridad ha llegado 📋👑`, `¡Boss ${first} activado! 💼`,
        `¡${first}! ¡Liderazgo nivel Black Dog! 🖤👑`,
        `El perro reconoce al/a la líder: ${first} 🐕👑`,
      ];
      // Vendedor / Sales
      if (/vend|sales|comerc|asesore|ejecutiv/i.test(pos)) return [
        `¡${first}! ¡A vender todo! 💼🔥`, `¡${first} en modo ventas! 📈`,
        `¡${first}! ¡Las metas tiemblan cuando llegas! 🎯`,
        `${first}: números al alza hoy 📊💪`, `¡${first}! ¡El mejor pitch de Black Dog! 💬`,
        `¡${first} llega y las ventas suben! 📈🚀`,
      ];
      // Guardia / Security
      if (/guard|segur|vigilant|cuidad/i.test(pos)) return [
        `¡${first}! ¡Protector oficial! 🛡️`, `¡${first}! ¡Black Dog está seguro contigo! 🛡️🐾`,
        `¡${first} en guardia! El perro duerme tranquilo 🛡️😴`,
        `¡${first}! ¡Nadie pasa sin tu ok! 🚫🛡️`,
        `Seguridad máxima: ${first} llegó 🛡️💪`,
      ];
      // Recepcionista / Front desk
      if (/recep|recepcion|atenc|front|bienven/i.test(pos)) return [
        `¡${first}! ¡La cara bonita de Black Dog! 😊🐾`,
        `¡${first}! ¡Recepción habilitada! 📞`,
        `${first}: primera impresión = 10/10 ✨`, `¡${first}! ¡Bienvenida oficial está aquí! 🤝`,
        `¡Las visitas preguntan por ${first}! 😊💐`,
      ];
      // Almacén / Bodega / Inventory
      if (/bodeg|almac|invent|stock|logis|bodeguero/i.test(pos)) return [
        `¡${first}! ¡El inventario en orden! 📦`, `¡${first}! ¡Sin ti no hay stock! 📦💪`,
        `¡${first}! ¡Maestro/a de la bodega! 🏭📦`,
        `${first}: el corazón del inventario late fuerte 📦❤️`,
        `¡${first}! ¡Las cajas te extrañaban! 📦🎉`,
      ];
      // Limpieza / Mantenimiento
      if (/limpiez|manten|aseo|higiene|janitor/i.test(pos)) return [
        `¡${first}! ¡Black Dog brilla gracias a ti! ✨🧹`,
        `¡${first}! ¡El héroe/heroína del orden! 🧹✨`,
        `${first}: sin ti esto sería un caos 🧹💪`,
        `¡${first}! ¡Limpieza nivel profesional! ✨🏆`,
      ];
      // Trainer / Entrenador
      if (/train|entren|instruc|coach/i.test(pos)) return [
        `¡${first}! ¡A entrenar perritos! 🎾🐕`, `¡${first}! ¡Maestro/a de comandos! 🐕‍🦺`,
        `${first}: los perros obedecen cuando llegas 🎾`, `¡${first}! ¡Training mode ON! 🎾💪`,
      ];
      // Easter egg: Gustavo Pereira el motorista
      if (/gustavo/i.test(name)) return [
        `¡GUSTAVO! ¡Llegó el rey de la moto! 🏍️👑`,
        `¡Gustavo! ¿A cuántos km/h viniste hoy? 💨🏍️`,
        `¡El perro quiere subirse a la moto de Gustavo! 🐕🏍️`,
        `¡GUSTAVO EN LA CASA! 🏍️🔥`,
        `¡Gustavo Pereira: terrorista de las calles panameñas! 🏍️😤`,
        `¡Llegó Gustavo! El perro corre a esconderse 🐕💨`,
        `¡Gustavo! ¿Me prestas el casco? 🪖🐕`,
        `¡El motorista más crack de Black Dog! 🏍️⭐ Gustavo`,
        `¡Gustavo llegó y la moto quedó afuera! ¿Cómo quedó la moto? 👀🏍️`,
        `¡Gustavo! El perro ya marcó tu llegada antes de que parquearas 🐕🏍️`,
      ];
      // Mensajero / Delivery / Moto
      if (/mensaj|delivery|domicil|moto|motoriz|repartid|courier|chofer|conductor/i.test(pos)) return [
        `¡${first}! ¡Lleváme en tu moto! 🏍️🐕`,
        `¡${first}! ¿Puedo ir en la caja de delivery? 📦🐾`,
        `¡${first} llegó! ¿Y los paquetes? 🏍️`,
        `¡${first}! ¿A cuántos km/h vienes? 💨🏍️`,
        `¡${first}! El perro quiere subirse a la moto 🐕🏍️`,
        `¡${first}! ¡Delivery de Black Dog en camino! 📦🔥`,
        `${first}: semáforo en rojo... ¡tiempo de saludar! 🏍️🐾`,
        `¡${first}! ¿Me traes algo? 👀📦`,
        `¡El/La motorista más crack: ${first}! 🏍️⚡`,
        `¡${first}! ¿Cuántas rutas hoy? 🗺️🏍️`,
        `${first} llegó vivo/a. ¡Éxito del día! 🏍️😅`,
        `¡${first}! La calle te pertenece 🏍️🔥`,
      ];
      return [];
    })();

    // ── Frases por departamento ───────────────────────────────────────────
    const byDept = ((): string[] => {
      if (/groo|peluc|spa/i.test(dep)) return [
        `¡${first}! ¡Departamento de Grooming necesita su estrella! ✂️`,
        `¡El spa canino espera a ${first}! 🐕💆`,
      ];
      if (/vet|clínic|salud/i.test(dep)) return [
        `¡${first}! ¡Clínica veterinaria lista! 🏥`,
        `¡${first}! El departamento médico te espera 🩺`,
      ];
      if (/vent|sales|tienda/i.test(dep)) return [
        `¡${first}! ¡Ventas al 100 hoy! 📈`,
        `¡Llega ${first} y el equipo de ventas se activa! 💼`,
      ];
      if (/adm|admin|rrhh|recurso|human/i.test(dep)) return [
        `¡${first}! ¡La columna vertebral de Black Dog! 📋`,
        `¡${first}! ¡Administración en la house! 📋💼`,
      ];
      return [];
    })();

    // ── Frases generales ─────────────────────────────────────────────────
    const general = [
      `¡${first}! ¡Llegaste! 🐕`, `¡Woof ${first}~! 🐾`, `¡Hola ${first}! ❤️`,
      `¡${first}! ¡Te vi llegar! 👀`, `¡Llegó ${first}! 🎉`, `¡Qué bueno verte, ${first}! 🐾`,
      `¡${first}! ¡Presente! ✅`, `¡${first} en la casa! 🏠`, `¡Ey ${first}! ¿Qué hay? 🐾`,
      `¡${first}! ¡Aquí el perro te saluda! 🐾`, `¡Llegó el/la gran ${first}! 👑`,
      `${first}: ¡puntualidad nivel élite! ⭐`, `¡${first} nunca falla! 💪`,
      `${first}: siempre aquí cuando cuenta 🕐`, `${first}: presencia confirmada ✅`,
      `¡${first} suma otro día! 📅`, `¡Marcación aprobada, ${first}! ✅🐾`,
      `${first} marcó. ¡El equipo está completo! 🤝`, `¡${first} es Black Dog certified! 🖤🐾`,
      `Dato: ${first} es de los más cumplidos 📋`, `¡Black Dog reconoce a ${first}! 🐾🖤`,
      `El perro no miente: ${first} es top 🐕‍🦺`, `Confidencial: ${first} = favorito del perro 🤫`,
      `${first}: MVP de las marcaciones 🏆`, `Black Dog data: ${first} = confiable 📊`,
      `${first} llegó y el día mejoró 🌟`, `Estadística oficial: ${first} vale oro 🥇`,
      `¡Vamo ${first}! Hoy va a ser épico 🔥`, `¡${first}, a darle con todo! 💪`,
      `${first}: que el día sea tan bueno como tú 🌟`, `¡Ánimo ${first}! El perro cree en ti 🐕`,
      `${first}: hoy conquistas todo 👊`, `${first}: energía cargada, listo/a para el turno ⚡`,
    ];

    // Si hay frases específicas del cargo, 65% de probabilidad de usarlas
    const posPool = [...byPosition, ...byDept];
    const pool = posPool.length > 0 && Math.random() < 0.65 ? posPool : general;
    const msg  = this.rnd(pool);

    this.clearActions();
    if (this.isMoving()) this.freezeMovement();
    this.currentState.set('barking');
    this.spawnHearts(4);
    this.showMsgDirect(msg);

    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('sitting'); this.scheduleNext(2000); }
    }, 1500);
    this.timeoutIds.push(id);
  }

  // ── Zoomies (running state) ───────────────────────────────────────────
  private triggerZoomies(laps = 0) {
    if (this.isDestroyed) return;
    this.clearActions();
    this.isSleeping  = false;
    this.isChasing   = false;
    const goRight    = laps % 2 === 0
      ? this.currentPixelPosition() < this.containerWidth / 2
      : this.currentPixelPosition() >= this.containerWidth / 2;
    const targetPos  = goRight ? Math.max(25, this.containerWidth - 125) : 25;

    this.currentDirection.set(goRight ? 'right' : 'left');
    this.moveDuration.set(0.55);
    this.currentState.set('running');
    this.isZoomies.set(true);
    this.currentPixelPosition.set(targetPos);
    if (laps === 0) this.showStateMessage('zoomies');
    this.spawnPawTrail(this.currentPixelPosition(), targetPos, 550);

    const totalLaps = 2 + Math.floor(Math.random() * 3);
    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      if (laps + 1 < totalLaps) { this.triggerZoomies(laps + 1); }
      else {
        this.isZoomies.set(false);
        this.currentState.set('idle');
        this.energyWalkCount = 0;
        this.scheduleNext(1500);
        this.resetSleepTimer();
      }
    }, 600);
    this.timeoutIds.push(id);
  }

  // ── Hyper mode (6+ rapid clicks) ─────────────────────────────────────
  private triggerHyper() {
    if (this.isDestroyed || this.isHyper()) return;
    this.clearActions();
    this.isSleeping = false;
    this.isChasing  = false;
    this.isHyper.set(true);
    this.isZoomies.set(true);
    this.showMsgDirect(this.rnd(MSGS['hyper']));
    this.energyWalkCount = 0;
    this.doHyperLap(0, 6 + Math.floor(Math.random() * 4));
  }

  private doHyperLap(lap: number, total: number) {
    if (this.isDestroyed) return;
    const goRight   = lap % 2 === 0
      ? this.currentPixelPosition() < this.containerWidth / 2
      : this.currentPixelPosition() >= this.containerWidth / 2;
    const targetPos = goRight ? Math.max(25, this.containerWidth - 125) : 25;
    this.currentDirection.set(goRight ? 'right' : 'left');
    this.moveDuration.set(0.4);
    this.currentState.set('running');
    this.currentPixelPosition.set(targetPos);
    this.spawnPawTrail(this.currentPixelPosition(), targetPos, 400);
    if (lap % 2 === 0) this.spawnHearts(5);

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      if (lap + 1 < total) {
        this.doHyperLap(lap + 1, total);
      } else {
        this.isHyper.set(false);
        this.isZoomies.set(false);
        this.showMsgDirect(this.rnd(MSGS['hyperDone']));
        this.currentState.set('lying-down');
        this.isSleeping = true;
        const restId = setTimeout(() => {
          if (!this.isDestroyed) {
            this.currentState.set('sleeping');
            const wakeId = setTimeout(() => {
              if (!this.isDestroyed) this.ngZone.run(() => this.wakeUp());
            }, 8000 + Math.random() * 5000);
            this.timeoutIds.push(wakeId);
          }
        }, 2000);
        this.timeoutIds.push(restId);
      }
    }, 450);
    this.timeoutIds.push(id);
  }

  // ── Konami easter egg ─────────────────────────────────────────────────
  private triggerKonami() {
    if (this.isDestroyed) return;
    this.clearActions();
    this.isKonami.set(true);
    this.showMsgDirect(this.rnd(MSGS['konami']));
    this.spawnHearts(10);
    this.doSuperman();
    const id = setTimeout(() => {
      if (!this.isDestroyed) this.isKonami.set(false);
    }, 3000);
    this.timeoutIds.push(id);
  }

  // ── Sleep ─────────────────────────────────────────────────────────────
  private resetSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    const h     = new Date().getHours();
    const delay = (h >= 22 || h < 6) ? 60_000 : (h >= 12 && h < 14) ? 90_000 : this.SLEEP_DELAY;
    this.sleepTimer = setTimeout(() => this.ngZone.run(() => this.enterSleep()), delay);
  }

  private enterSleep() {
    if (this.isDestroyed || this.isSleeping) return;
    this.isSleeping = true;
    this.clearActions();
    this.isZoomies.set(false);
    this.isSexy.set(false);
    this.isDancing.set(false);
    this.currentState.set('lying-down');
    this.showStateMessage('lying-down');
    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentState.set('sleeping');
      this.showStateMessage('sleeping');
      const wId = setTimeout(() => {
        if (!this.isDestroyed) this.ngZone.run(() => this.wakeUp());
      }, 120_000 + Math.random() * 180_000);
      this.timeoutIds.push(wId);
    }, 2500);
    this.timeoutIds.push(id);
  }

  private wakeUp() {
    if (this.isDestroyed) return;
    this.isSleeping = false;
    this.clearActions();
    this.showMsgDirect(this.rnd(MSGS['wake']));
    this.currentState.set('stretching');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(900); this.resetSleepTimer(); }
    }, 2000);
    this.timeoutIds.push(id);
  }

  // ── Behaviors ─────────────────────────────────────────────────────────
  private triggerBadMood() {
    if (this.isDestroyed || this.badMood()) return;
    this.badMood.set(true);
    this.isSexy.set(false);
    this.clearActions();
    this.currentState.set('barking');
    this.showStateMessage('grumpy');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.badMood.set(false); this.showMsgDirect('😌 Ya pasó~'); }
    }, 90_000 + Math.random() * 150_000);
    this.timeoutIds.push(id);
    this.scheduleNext(1200);
  }

  private triggerSexyMode() {
    if (this.isDestroyed || this.isSexy() || this.badMood()) return;
    this.isSexy.set(true);
    this.showStateMessage('sexy');
    this.spawnHearts(6, true);
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.isSexy.set(false); }
    }, 25_000 + Math.random() * 20_000);
    this.timeoutIds.push(id);
  }

  private doLick() {
    this.currentState.set('licking');
    this.showStateMessage('licking');
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(500); } }, 2200);
    this.timeoutIds.push(id);
  }

  private doPee() {
    this.currentState.set('sitting');
    this.showStateMessage('pee');
    const id1 = setTimeout(() => {
      if (this.isDestroyed) return;
      this.showPee.set(true);
      const id2 = setTimeout(() => {
        if (!this.isDestroyed) { this.showPee.set(false); this.currentState.set('idle'); this.scheduleNext(800); }
      }, 2500);
      this.timeoutIds.push(id2);
    }, 900);
    this.timeoutIds.push(id1);
  }

  private doJump() {
    if (this.isJumping()) return;
    this.isJumping.set(true);
    this.showStateMessage('jump');
    this.currentState.set('barking');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.isJumping.set(false); this.currentState.set('idle'); this.scheduleNext(600); }
    }, 750);
    this.timeoutIds.push(id);
  }

  private doSuperman() {
    if (this.isSuperman()) return;
    this.isSuperman.set(true);
    this.playSound('whoosh');
    this.showStateMessage('superman');
    this.currentState.set('stretching');
    const goRight = this.currentPixelPosition() < this.containerWidth / 2;
    this.currentDirection.set(goRight ? 'right' : 'left');
    this.moveDuration.set(2.2);
    this.currentPixelPosition.set(goRight ? Math.max(25, this.containerWidth - 125) : 25);
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.isSuperman.set(false); this.currentState.set('idle'); this.scheduleNext(1000); }
    }, 2500);
    this.timeoutIds.push(id);
  }

  private doDig() {
    this.currentState.set('sitting');
    this.showStateMessage('dig');
    this.showDirt.set(true);
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.showDirt.set(false); this.currentState.set('idle'); this.scheduleNext(600); }
    }, 2200);
    this.timeoutIds.push(id);
  }

  private doRoll() {
    this.currentState.set('lying-down');
    this.showStateMessage('roll');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(500); }
    }, 1800);
    this.timeoutIds.push(id);
  }

  private doSneeze() {
    this.currentState.set('sitting');
    this.showStateMessage('sneeze');
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(600); } }, 1800);
    this.timeoutIds.push(id);
  }

  private doChaseTail() {
    this.currentState.set('itching');
    this.showMsgDirect(this.rnd(MSGS['chase']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(400); } }, 2500);
    this.timeoutIds.push(id);
  }

  private doHowl() {
    this.currentState.set('barking');
    this.showStateMessage('howl');
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); } }, 1600);
    this.timeoutIds.push(id);
  }

  private doExcited() {
    this.currentState.set('barking');
    this.showMsgDirect(this.rnd(MSGS['excited']));
    this.spawnHearts();
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(500); } }, 1500);
    this.timeoutIds.push(id);
  }

  private doHungry() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(MSGS['hungry']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(600); } }, 2000);
    this.timeoutIds.push(id);
  }

  private doSnack() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(MSGS['snack']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); } }, 2500);
    this.timeoutIds.push(id);
  }

  private doConfused() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(MSGS['confused']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(400); } }, 1800);
    this.timeoutIds.push(id);
  }

  private doTrophy() {
    this.currentState.set('sitting');
    this.showStateMessage('trophy');
    this.showTrophy.set(true);
    this.spawnHearts(6);
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.showTrophy.set(false); this.currentState.set('idle'); this.scheduleNext(800); }
    }, 3500);
    this.timeoutIds.push(id);
  }

  private doDance() {
    this.isDancing.set(true);
    this.currentState.set('idle');
    this.showStateMessage('dance');
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.isDancing.set(false); this.currentState.set('idle'); this.scheduleNext(600); }
    }, 4000);
    this.timeoutIds.push(id);
  }

  private doSpin() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(['¡SPIN! 🌀', '¡Giro! 💫', '¡Vuelta entera! 🌀', '¡Trompo activado! 💫']));
    this.dogWrapper?.nativeElement.classList.add('dog-spinning');
    const id = setTimeout(() => {
      if (!this.isDestroyed) {
        this.dogWrapper?.nativeElement.classList.remove('dog-spinning');
        this.currentState.set('idle'); this.scheduleNext(800);
      }
    }, 700);
    this.timeoutIds.push(id);
  }

  private doFloat() {
    this.currentState.set('running');
    this.showMsgDirect(this.rnd(['¡Vuelo! ✈️', '*levita* 🐕', '¡Soy astronauta! 🚀', '¡Sin gravedad! 🌌']));
    this.dogWrapper?.nativeElement.classList.add('dog-floating');
    const id = setTimeout(() => {
      if (!this.isDestroyed) {
        this.dogWrapper?.nativeElement.classList.remove('dog-floating');
        this.currentState.set('idle'); this.scheduleNext(800);
      }
    }, 1300);
    this.timeoutIds.push(id);
  }

  private doWiggle() {
    this.currentState.set('barking');
    this.showMsgDirect(this.rnd(['¡Wiggle wiggle! 🐕', '*menea menea*', '¡Baile movimiento!', '🕺 *wiggle*']));
    this.dogWrapper?.nativeElement.classList.add('dog-wiggling');
    const id = setTimeout(() => {
      if (!this.isDestroyed) {
        this.dogWrapper?.nativeElement.classList.remove('dog-wiggling');
        this.currentState.set('idle'); this.scheduleNext(800);
      }
    }, 600);
    this.timeoutIds.push(id);
  }

  private doShrink() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(['¿Me achiqué? 🐾', '*modo mini* 🐕', 'Ahora soy Chihuahua~', '¡Modo bolsillo! 👝']));
    this.dogWrapper?.nativeElement.classList.add('dog-shrinking');
    const id = setTimeout(() => {
      if (!this.isDestroyed) {
        this.dogWrapper?.nativeElement.classList.remove('dog-shrinking');
        this.currentState.set('idle'); this.scheduleNext(800);
      }
    }, 600);
    this.timeoutIds.push(id);
  }

  private doBlackDogShoutout() {
    this.currentState.set('barking');
    this.showMsgDirect(this.rnd(MSGS['blackdog']));
    const id = setTimeout(() => { if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(800); } }, 1400);
    this.timeoutIds.push(id);
  }

  // ── Behavior decision tree ────────────────────────────────────────────
  private scheduleNext(delay?: number) {
    if (this.isDestroyed) return;
    const d = delay ?? (Math.random() * 2000 + 800);
    const id = setTimeout(() => this.decide(), d);
    this.timeoutIds.push(id);
  }

  private decide() {
    if (this.isDestroyed || this.isSleeping || this.isChasing) return;
    const now          = new Date();
    const h            = now.getHours();
    const dow          = now.getDay();
    const isNight      = h >= 22 || h < 6;
    const isMorn       = h >= 6  && h < 9;
    const isLunch      = h >= 12 && h < 14;
    const isMonday     = dow === 1;
    const isFriday     = dow === 5;
    const isAprilFools = now.getMonth() === 3 && now.getDate() === 1;
    const fullMoon     = isNight && isFullMoon();
    const tired        = this.energyWalkCount > 5;
    const grumpy       = this.badMood();
    const roll         = Math.random();

    // April Fools chaos
    if (isAprilFools && !grumpy && roll < 0.10) {
      this.showMsgDirect(this.rnd(MSGS['aprilFools']));
      if (Math.random() < 0.5) this.triggerZoomies(); else { this.currentState.set('barking'); this.scheduleNext(1200); }
      return;
    }
    // Friday hype
    if (isFriday && !grumpy && !tired && roll < 0.07) { this.showStateMessage('friday'); this.doExcited(); return; }
    // Monday grumpy
    if (isMonday && !grumpy && roll < 0.05) { this.showStateMessage('monday'); this.triggerBadMood(); return; }
    // Bad mood
    if (!grumpy && roll < 0.03) { this.triggerBadMood(); return; }
    // Sexy mode (rare, ~1.5%)
    if (!grumpy && !this.isSexy() && roll < 0.015) { this.triggerSexyMode(); this.scheduleNext(1500); return; }
    // Zoomies
    const zoomieChance = isFriday ? 0.04 : isMorn ? 0.025 : 0.012;
    if (!tired && !grumpy && roll < zoomieChance) { this.triggerZoomies(); return; }
    // Poop
    if (roll < 0.008) { this.doPoop(); return; }
    // Tired
    if (tired && roll < 0.45) { this.energyWalkCount = 0; this.enterSleep(); return; }

    if (isNight) {
      if (fullMoon && roll < 0.35)    { this.doHowl(); }
      else if (roll < 0.20)           { this.doHowl(); }
      else if (roll < 0.40)           { this.currentState.set('idle'); this.scheduleNext(3500); }
      else if (roll < 0.62)           { this.doWalk(); }
      else if (roll < 0.72)           { this.doConfused(); }
      else                             { this.enterSleep(); }
      return;
    }

    if (grumpy) {
      if (roll < 0.40)      { this.doAction('barking', 1200); }
      else if (roll < 0.60) { this.currentState.set('idle'); this.showStateMessage('grumpy'); this.scheduleNext(1800); }
      else if (roll < 0.75) { this.doWalk(); }
      else                   { this.doAction('itching', 1600); }
      this.resetSleepTimer(); return;
    }

    if (isLunch && roll < 0.20) { if (Math.random() < 0.5) this.doSnack(); else this.doHungry(); this.resetSleepTimer(); return; }

    if (roll < 0.24)       { this.doWalkMaybeStretch(); }
    else if (roll < 0.32)  { this.doAction('barking',    1400); }
    else if (roll < 0.39)  { this.doAction('itching',    2200); }
    else if (roll < 0.45)  { this.doAction('stretching', 2000); }
    else if (roll < 0.50)  { this.doSneeze(); }
    else if (roll < 0.54)  { this.doChaseTail(); }
    else if (roll < 0.58)  { this.doExcited(); }
    else if (roll < 0.61)  { this.doHungry(); }
    else if (roll < 0.63)  { this.doSnack(); }
    else if (roll < 0.66)  { this.doConfused(); }
    else if (roll < 0.69)  { this.doJump(); }
    else if (roll < 0.72)  { this.doPee(); }
    else if (roll < 0.75)  { this.doDig(); }
    else if (roll < 0.78)  { this.doRoll(); }
    else if (roll < 0.80)  { this.doSuperman(); }
    else if (roll < 0.83)  { this.doLick(); }
    else if (roll < 0.86)  { this.doDance(); }
    else if (roll < 0.88)  { this.doTrophy(); }
    else if (roll < 0.91)  { this.doBlackDogShoutout(); }
    else if (roll < 0.93)  { this.doSpin(); }
    else if (roll < 0.95)  { this.doFloat(); }
    else if (roll < 0.97)  { this.doWiggle(); }
    else if (roll < 0.99)  { this.doShrink(); }
    else                    { this.currentState.set('idle'); if (Math.random() < 0.35) this.showStateMessage('idle'); this.scheduleNext(2500); }

    this.resetSleepTimer();
  }

  private doAction(state: DogState, dur: number) {
    this.currentState.set(state);
    this.showStateMessage(state);
    const id = setTimeout(() => {
      if (!this.isDestroyed) { this.currentState.set('idle'); this.scheduleNext(400); }
    }, dur);
    this.timeoutIds.push(id);
  }

  private doWalkMaybeStretch() {
    if (Math.random() < 0.3) {
      this.currentState.set('stretching');
      this.showStateMessage('stretching');
      const id = setTimeout(() => { if (!this.isDestroyed) this.doWalk(); }, 1800);
      this.timeoutIds.push(id);
    } else { this.doWalk(); }
  }

  private doWalk() {
    if (this.containerWidth === 0) this.updateMetrics();
    const margin  = 25;
    const maxPos  = Math.max(25, this.containerWidth - margin - this.DOG_SIZE);
    const minPos  = margin;
    const corner  = Math.random() < 0.22;
    let target: number;

    if (corner) {
      target = this.currentPixelPosition() > this.containerWidth / 2 ? minPos : maxPos;
    } else {
      target = Math.random() * (maxPos - minPos) + minPos;
      if (Math.abs(target - this.currentPixelPosition()) < 100)
        target = this.currentPixelPosition() > this.containerWidth / 2 ? minPos + 50 : maxPos - 50;
    }

    const fromX    = this.currentPixelPosition();
    const dist     = Math.abs(target - fromX);
    const speed    = 55 + Math.random() * 20;
    const duration = Math.min(dist / speed, 5);

    this.currentDirection.set(target > fromX ? 'right' : 'left');
    this.moveDuration.set(duration);
    this.currentState.set('walking');
    this.currentPixelPosition.set(target);
    this.energyWalkCount++;
    this.spawnPawTrail(fromX, target, duration * 1000);

    const id = setTimeout(() => {
      if (this.isDestroyed) return;
      if (corner && Math.random() < 0.55) {
        this.doAction(Math.random() < 0.5 ? 'itching' : 'barking', 1800);
      } else {
        this.currentState.set('idle');
        this.scheduleNext(800 + Math.random() * 1200);
      }
    }, duration * 1000 + 50);
    this.timeoutIds.push(id);
  }

  // ── Poop ──────────────────────────────────────────────────────────────
  private doPoop() {
    this.currentState.set('sitting');
    this.showMsgDirect(this.rnd(MSGS['poop']));
    const id1 = setTimeout(() => {
      if (this.isDestroyed) return;
      this.showPoop.set(true);
      const id2 = setTimeout(() => {
        if (!this.isDestroyed) { this.showPoop.set(false); this.currentState.set('idle'); this.scheduleNext(1000); }
      }, 3200);
      this.timeoutIds.push(id2);
    }, 1200);
    this.timeoutIds.push(id1);
  }

  // ── Paw print trail (direct DOM) ──────────────────────────────────────
  private spawnPawTrail(fromX: number, toX: number, durationMs: number) {
    const dist      = Math.abs(toX - fromX);
    const numPrints = Math.min(Math.floor(dist / 65), 12);
    if (numPrints < 1) return;
    for (let i = 1; i <= numPrints; i++) {
      const t       = i / (numPrints + 1);
      const x       = fromX + (toX - fromX) * t + 30;
      const delayMs = t * durationMs;
      const flip    = i % 2 === 0;
      const id = setTimeout(() => {
        if (!this.isDestroyed) this.dropPawPrint(x, flip);
      }, delayMs);
      this.timeoutIds.push(id);
    }
  }

  private dropPawPrint(x: number, flip: boolean) {
    const container = this.dogContainer?.nativeElement;
    if (!container) return;
    const el = document.createElement('div');
    el.textContent = '🐾';
    el.style.cssText = `position:absolute;bottom:28px;left:${x}px;font-size:0.7rem;pointer-events:none;transform:scaleX(${flip ? -1 : 1});animation:paw-fade 1.4s ease-out forwards;z-index:1;opacity:0;`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // ── Speech bubbles ────────────────────────────────────────────────────
  private showStateMessage(key: string) {
    const breedArr   = BREED_MSGS[this.currentBreed()]?.[key];
    const genericArr = MSGS[key];
    const arr = breedArr && breedArr.length && Math.random() < 0.65 ? breedArr : (genericArr ?? breedArr ?? []);
    if (arr && arr.length > 0) this.showMsgDirect(this.rnd(arr));
  }

  private showMsgDirect(msg: string) {
    this.showTip.set(false);
    const id0 = setTimeout(() => {
      if (this.isDestroyed) return;
      this.currentTip.set(msg);
      this.showTip.set(true);
      const id1 = setTimeout(() => { if (!this.isDestroyed) this.showTip.set(false); }, 3500);
      this.timeoutIds.push(id1);
    }, 40);
    this.timeoutIds.push(id0);
  }

  private rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Sound effects (Web Audio API) ─────────────────────────────────────
  private playSound(type: 'bark'|'squeak'|'zoomies'|'jump'|'growl'|'howl'|'sneeze'|'pee'|'lick'|'eating'|'panting'|'whoosh') {
    if (this.muted() || typeof window === 'undefined') return;
    try {
      const FILE_MAP: Partial<Record<string, string>> = {
        bark:   'sounds/bark.mp3',
        growl:  'sounds/growl.mp3',
        howl:   'sounds/howl.mp3',
        sneeze: 'sounds/sneeze.mp3',
        pee:    'sounds/pee.mp3',
        lick:    'sounds/lick.mp3',
        eating:  'sounds/eating.mp3',
        panting: 'sounds/panting.mp3',
        whoosh:  'sounds/whoosh.mp3',
      };
      const file = FILE_MAP[type];
      if (file) {
        const audio = new Audio(file);
        audio.volume = type === 'squeak' ? 0.6 : 0.5;
        audio.play().catch(() => {/* blocked by browser policy */});
        return;
      }
      // Synthesized fallback for zoomies / jump
      if (!window.AudioContext) return;
      const ctx = new AudioContext();
      const g   = ctx.createGain();
      g.connect(ctx.destination);
      if (type === 'zoomies') {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.28);
        g.gain.setValueAtTime(0.07, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.28);
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.28);
      } else if (type === 'jump') {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(220, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.14);
        o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.32);
        g.gain.setValueAtTime(0.14, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.32);
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.32);
      }
      setTimeout(() => ctx.close(), 1500);
    } catch { /* audio not supported */ }
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private clearActions() { this.timeoutIds.forEach(clearTimeout); this.timeoutIds = []; }

  private freezeMovement() {
    if (!this.dogWrapper?.nativeElement) return;
    const rect  = this.dogWrapper.nativeElement.getBoundingClientRect();
    const cRect = this.dogContainer.nativeElement.getBoundingClientRect();
    this.currentPixelPosition.set(rect.left - cRect.left);
    this.moveDuration.set(0);
  }

  // ── Gender → breed ───────────────────────────────────────────────────
  private readonly MALE_BREEDS:   DogBreed[] = ['Dog-2-Akita', 'Dog-3-Great-Dane', 'Dog-5-Saint-Bernard'];
  private readonly FEMALE_BREEDS: DogBreed[] = ['Dog-1-Golden-Retriever', 'Dog-4-Schnauzer', 'Dog-6-Siberian-Husky'];
  private genderBreedOverride: DogBreed | null = null;

  private applyGenderBreed(gender: 'M'|'F'|'') {
    if (!gender) {
      this.genderBreedOverride = null;
      return;
    }
    const pool = gender === 'M' ? this.MALE_BREEDS : this.FEMALE_BREEDS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.genderBreedOverride = pick;
    this.loadBreed(pick);
  }

  // ── Breed rotation (30 min) ───────────────────────────────────────────
  private async initBreedRotation() {
    if (typeof window === 'undefined') return;
    const INTERVAL  = 1_800_000;
    const breedKeys = Object.keys(BREEDS) as DogBreed[];
    try {
      const stored = localStorage.getItem(this.ROTATION_KEY);
      let data     = stored ? JSON.parse(stored) : null;
      const now    = Date.now();
      if (!data || now - data.timestamp > INTERVAL) {
        let idx = Math.floor(Math.random() * breedKeys.length);
        if (data && breedKeys.length > 1) while (breedKeys[idx] === data.breed) idx = Math.floor(Math.random() * breedKeys.length);
        data = { breed: breedKeys[idx], timestamp: now };
        localStorage.setItem(this.ROTATION_KEY, JSON.stringify(data));
      }
      await this.loadBreed(data.breed || breedKeys[0]);
      if (!this.isDestroyed) this.isReady.set(true);
      const id = setTimeout(() => this.ngZone.run(() => this.initBreedRotation()), Math.max(0, INTERVAL - (now - data.timestamp)) + 1000);
      this.timeoutIds.push(id);
    } catch {
      await this.loadBreed('Dog-1-Golden-Retriever');
      if (!this.isDestroyed) this.isReady.set(true);
    }
  }

  private async loadBreed(breed: DogBreed) {
    this.currentBreed.set(breed);
    const cfg  = BREEDS[breed];
    const urls = ACTIONS.map(a => {
      let f = STATE_TO_FILE[a.name];
      if (a.name === 'idle' && cfg.idleCase === 'Idle') f = 'Idle';
      return `assets_dog/Pet Dogs Pack/${cfg.folder}/${cfg.prefix}${f}.png`;
    });
    await Promise.all(urls.map(u => new Promise<void>(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = u; })));
  }

  // ── Resize ────────────────────────────────────────────────────────────
  private initResize() {
    if (!this.dogContainer?.nativeElement) return;
    this.resizeObserver = new ResizeObserver(entries => {
      for (const e of entries) this.ngZone.run(() => { this.containerWidth = e.contentRect.width; this.clamp(); });
    });
    this.resizeObserver.observe(this.dogContainer.nativeElement);
  }

  private updateMetrics() {
    this.containerWidth = this.dogContainer?.nativeElement?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
  }

  private clamp() {
    const max = this.containerWidth - 125;
    const pos = this.currentPixelPosition();
    if (pos > max) this.currentPixelPosition.set(max);
    else if (pos < 0) this.currentPixelPosition.set(0);
  }

  // ── Keyframes ─────────────────────────────────────────────────────────
  private injectKeyframes() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('dog-sprite-kf')) {
      const s = document.createElement('style');
      s.id = 'dog-sprite-kf';
      s.innerHTML = `
        @keyframes play-sprite { from { background-position-x: 0px; } to { background-position-x: var(--sprite-width); } }
        @keyframes paw-fade    { 0% { opacity: 0.6; } 40% { opacity: 0.5; } 100% { opacity: 0; transform: translateY(-4px); } }
      `;
      document.head.appendChild(s);
    }
  }
}
