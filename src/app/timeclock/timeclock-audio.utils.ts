const EMPLOYEE_PERSONALIZED_SOUND_ID =
  '202c46ab-04f9-41e8-a572-d9f50f7f31b6';
const PERSONALIZED_SUCCESS_SOUNDS = [
  '/sounds/squirrel.mp3',
  '/sounds/cockatoo.mp3',
];
const GENERAL_SUCCESS_SOUNDS = ['/sounds/meow.mp3', '/sounds/bark.mp3'];

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function initAudioContext(): void {
  getAudioContext();
}

export function playSuccessSound(employeeId?: string): void {
  try {
    let src: string;
    if (
      employeeId === EMPLOYEE_PERSONALIZED_SOUND_ID &&
      PERSONALIZED_SUCCESS_SOUNDS.length > 0
    ) {
      const idx = Math.floor(
        Math.random() * PERSONALIZED_SUCCESS_SOUNDS.length
      );
      src = PERSONALIZED_SUCCESS_SOUNDS[idx];
    } else {
      const idx = Math.floor(Math.random() * GENERAL_SUCCESS_SOUNDS.length);
      src = GENERAL_SUCCESS_SOUNDS[idx];
    }
    const audio = new Audio(src);
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {
    // Audio not supported
  }
}

export function playFailureSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.value = 400;
    osc1.type = 'square';
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.value = 300;
    osc2.type = 'square';
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.2, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.4);
  } catch {
    // Audio not supported
  }
}

export function playLateSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = 'triangle';
      const startTime = now + i * 0.25;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.setValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  } catch {
    // Audio not supported
  }
}
