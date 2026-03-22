const EMPLOYEE_PERSONALIZED_SOUND_ID =
  '202c46ab-04f9-41e8-a572-d9f50f7f31b6';
const PERSONALIZED_SUCCESS_SOUNDS = [
  '/sounds/squirrel.mp3',
  '/sounds/cockatoo.mp3',
];
const GENERAL_SUCCESS_SOUNDS = ['/sounds/meow.mp3', '/sounds/bark.mp3'];

const _VIP_TRACK = 'https://cdn.pixabay.com/download/audio/2024/11/26/audio_2133d71af7.mp3?filename=benkirb-shine-11-268907.mp3';

export function playMatrixConfirmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Short digital glitch: descending beeps
    [880, 660, 440, 330].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + i * 0.07);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.06);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = 3;
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start(now + i * 0.07);
      o.stop(now + i * 0.07 + 0.08);
    });
  } catch { /* noop */ }
}

export function playVipSound(): void {
  try {
    const a = new Audio(_VIP_TRACK);
    a.volume = 0.8;
    a.play().catch(() => {});
  } catch { /* noop */ }
}

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

/** Sad trumpet "wah wah wah" sound for late arrivals */
export function playLateSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Sad trumpet: descending notes with vibrato
    const notes = [392, 349, 311, 261]; // G4 -> F4 -> Eb4 -> C4 (sad descent)
    const noteDuration = 0.35;

    notes.forEach((freq, i) => {
      const startTime = now + i * noteDuration;

      // Main trumpet oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth'; // Brass-like timbre
      osc.frequency.setValueAtTime(freq, startTime);
      // Add slight pitch bend down for "wah" effect
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, startTime + noteDuration * 0.8);

      // Vibrato LFO
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = freq * 0.02;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(startTime);
      vibrato.stop(startTime + noteDuration);

      // Envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.setValueAtTime(0.15, startTime + noteDuration * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

      // Low-pass filter for muted trumpet sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      filter.Q.value = 2;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    });
  } catch {
    // Audio not supported
  }
}

/** Happy birthday jingle for birthday employees */
export function playBirthdaySound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // "Happy Birthday" melody - first line: "Happy birthday to you"
    // C C D C F E — C C D C G F
    const melody = [
      { freq: 523, dur: 0.2 },  // C5
      { freq: 523, dur: 0.2 },  // C5
      { freq: 587, dur: 0.4 },  // D5
      { freq: 523, dur: 0.4 },  // C5
      { freq: 698, dur: 0.4 },  // F5
      { freq: 659, dur: 0.6 },  // E5
      // pause
      { freq: 523, dur: 0.2 },  // C5
      { freq: 523, dur: 0.2 },  // C5
      { freq: 587, dur: 0.4 },  // D5
      { freq: 523, dur: 0.4 },  // C5
      { freq: 784, dur: 0.4 },  // G5
      { freq: 698, dur: 0.6 },  // F5
    ];

    let offset = 0;
    melody.forEach((note, i) => {
      if (i === 6) offset += 0.15; // Small pause between phrases

      const startTime = now + offset;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.freq;

      // Bright, cheerful envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.setValueAtTime(0.25, startTime + note.dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + note.dur);

      // Add harmonics for richer sound
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.value = note.freq * 2;
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime);
      osc2.stop(startTime + note.dur);

      offset += note.dur;
    });
  } catch {
    // Audio not supported
  }
}
