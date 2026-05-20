const EMPLOYEE_PERSONALIZED_SOUND_ID =
  '202c46ab-04f9-41e8-a572-d9f50f7f31b6';
const PERSONALIZED_SUCCESS_SOUNDS = [
  '/sounds/squirrel.mp3',
  '/sounds/cockatoo.mp3',
];
const GENERAL_SUCCESS_SOUNDS = ['/sounds/meow.mp3', '/sounds/bark.mp3'];

const _VIP_TRACK = 'https://cdn.pixabay.com/download/audio/2024/11/26/audio_2133d71af7.mp3?filename=benkirb-shine-11-268907.mp3';

/** Corridos guitar strum for confirmation */
export function playCorridosConfirmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Guitar strum: rapid arpeggiated chord (Am)
    [220, 261.63, 329.63, 440, 523.25, 659.25].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const t = now + i * 0.03;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.01);
      g.gain.setValueAtTime(0.12, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq * 1.5; bp.Q.value = 1.5;
      o.connect(bp); bp.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.65);
    });
  } catch { /* noop */ }
}

/** Star Wars lightsaber ignite sound for confirmation */
export function playStarWarsConfirmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Lightsaber ignite: rising hum with buzz
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
    osc.frequency.setValueAtTime(220, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(185, now + 0.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.08);
    g.gain.setValueAtTime(0.12, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 2;
    osc.connect(lp); lp.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.75);
    // High harmonic buzz
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(440, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(370, now + 0.6);
    g2.gain.setValueAtTime(0, now + 0.1);
    g2.gain.linearRampToValueAtTime(0.04, now + 0.18);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(now + 0.1); osc2.stop(now + 0.7);
  } catch { /* noop */ }
}

/** "I'm Batman" audio clip for Batman confirmation */
export function playBatmanConfirmSound(): void {
  try {
    const a = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_3fbefd4588.mp3?filename=freesound_community-im-batman-2-87380.mp3');
    a.volume = 0.5;
    a.play().catch(() => {});
  } catch { /* noop */ }
}

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

/** Watch Dogs ctOS hacker sound for confirmation */
export function playWatchDogsConfirmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // ctOS access granted: rising digital ping + data burst
    // Phase 1: short low beep (system wake)
    const wake = ctx.createOscillator();
    const wakeG = ctx.createGain();
    wake.type = 'square';
    wake.frequency.setValueAtTime(220, now);
    wake.frequency.linearRampToValueAtTime(440, now + 0.05);
    wakeG.gain.setValueAtTime(0, now);
    wakeG.gain.linearRampToValueAtTime(0.1, now + 0.01);
    wakeG.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    wake.connect(wakeG); wakeG.connect(ctx.destination);
    wake.start(now); wake.stop(now + 0.1);
    // Phase 2: rapid data burst (ascending glitch)
    [660, 880, 1100, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      const t = now + 0.12 + i * 0.045;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = freq * 0.8;
      o.connect(hp); hp.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.05);
    });
    // Phase 3: clean confirmation tone (access granted)
    const ping = ctx.createOscillator();
    const pingG = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1047, now + 0.35); // C6
    ping.frequency.exponentialRampToValueAtTime(880, now + 0.7);
    pingG.gain.setValueAtTime(0, now + 0.35);
    pingG.gain.linearRampToValueAtTime(0.18, now + 0.37);
    pingG.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    ping.connect(pingG); pingG.connect(ctx.destination);
    ping.start(now + 0.35); ping.stop(now + 0.8);
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

// ============== SOUND EFFECTS FOR RANDOM EFFECTS (mod menu) ==============

function tone(ctx: AudioContext, freq: number, dur: number, startOffset = 0, type: OscillatorType = 'sine', vol = 0.2): void {
  const t0 = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur);
}

function noise(ctx: AudioContext, dur: number, startOffset = 0, lowpass = 1500, vol = 0.15): void {
  const t0 = ctx.currentTime + startOffset;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter); filter.connect(g); g.connect(ctx.destination);
  src.start(t0); src.stop(t0 + dur);
}

export function playEffectSound(effect: string | null): void {
  if (!effect) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    switch (effect) {
      case 'jackpot':
        [880, 1100, 1320, 1760].forEach((f, i) => tone(ctx, f, 0.12, i * 0.1, 'square', 0.18));
        break;
      case 'boom':
        noise(ctx, 0.6, 0, 200, 0.4);
        tone(ctx, 60, 0.5, 0, 'sine', 0.5);
        tone(ctx, 110, 0.4, 0.05, 'triangle', 0.3);
        break;
      case 'beer':
        [2200, 2400, 2600].forEach((f, i) => tone(ctx, f, 0.08, i * 0.07, 'triangle', 0.12));
        break;
      case 'panama_flag':
        [523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, 0.18, i * 0.12, 'square', 0.18));
        break;
      case 'lightning':
        noise(ctx, 0.4, 0, 400, 0.5);
        tone(ctx, 80, 0.5, 0.1, 'sawtooth', 0.2);
        break;
      case 'heart_burst':
        [880, 1100, 1320].forEach((f, i) => tone(ctx, f, 0.3, i * 0.05, 'sine', 0.15));
        break;
      case 'money_rain':
        [1200, 1500].forEach((f, i) => tone(ctx, f, 0.15, i * 0.12, 'square', 0.15));
        tone(ctx, 800, 0.3, 0.25, 'triangle', 0.12);
        break;
      case 'disco':
        [220, 330, 440, 330].forEach((f, i) => tone(ctx, f, 0.15, i * 0.18, 'sawtooth', 0.15));
        break;
      case 'dragon_energy':
        for (let i = 0; i < 12; i++) tone(ctx, 200 + i * 50, 0.08, i * 0.05, 'sawtooth', 0.12);
        break;
      case 'fireworks':
        for (let i = 0; i < 4; i++) {
          noise(ctx, 0.2, i * 0.25, 3000, 0.3);
          tone(ctx, 2000 - i * 200, 0.15, i * 0.25, 'triangle', 0.1);
        }
        break;
      case 'unicorn':
        [659, 880, 1109, 1318, 1760].forEach((f, i) => tone(ctx, f, 0.4, i * 0.08, 'sine', 0.12));
        break;
      case 'pizza':
        tone(ctx, 1400, 0.15, 0, 'sine', 0.18);
        tone(ctx, 1800, 0.2, 0.12, 'sine', 0.15);
        break;
      case 'paw_rain':
        for (let i = 0; i < 6; i++) tone(ctx, 800 + Math.random() * 600, 0.08, i * 0.15, 'sine', 0.1);
        break;
      case 'emoji_explosion':
        noise(ctx, 0.3, 0, 5000, 0.2);
        [600, 900, 1200].forEach((f, i) => tone(ctx, f, 0.2, i * 0.08, 'square', 0.15));
        break;
      case 'shake':
        tone(ctx, 80, 0.4, 0, 'sawtooth', 0.3);
        tone(ctx, 120, 0.4, 0.1, 'sawtooth', 0.2);
        break;
      case 'rainbow':
        [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => tone(ctx, f, 0.12, i * 0.08, 'triangle', 0.13));
        break;
      case 'fire':
        noise(ctx, 1.2, 0, 800, 0.18);
        for (let i = 0; i < 5; i++) tone(ctx, 120 + Math.random() * 80, 0.4, i * 0.2, 'sawtooth', 0.1);
        break;
      case 'tornado':
        for (let i = 0; i < 20; i++) tone(ctx, 200 + i * 30, 0.05, i * 0.06, 'sawtooth', 0.1);
        break;
      case 'glitch':
        for (let i = 0; i < 8; i++) {
          if (Math.random() < 0.5) noise(ctx, 0.05, i * 0.06, 4000, 0.2);
          else tone(ctx, 200 + Math.random() * 1000, 0.04, i * 0.06, 'square', 0.15);
        }
        break;
      case 'stars_warp':
        for (let i = 0; i < 8; i++) tone(ctx, 1500 - i * 150, 0.1, i * 0.08, 'triangle', 0.12);
        break;
      case 'confetti_cannon':
        noise(ctx, 0.15, 0, 4000, 0.25);
        tone(ctx, 600, 0.2, 0, 'square', 0.18);
        tone(ctx, 1200, 0.25, 0.05, 'triangle', 0.12);
        break;
      case 'vhs':
        noise(ctx, 1.0, 0, 600, 0.15);
        tone(ctx, 90, 0.8, 0, 'sawtooth', 0.1);
        break;
      case 'laser_show':
        for (let i = 0; i < 8; i++) tone(ctx, 800 + i * 200, 0.1, i * 0.1, 'sawtooth', 0.1);
        break;
    }
  } catch { /* noop */ }
}

/** Vibración (móvil) según tipo de marca */
export function vibrateForMarking(type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit' | 'late'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const patterns: Record<string, number | number[]> = {
    entry: [80, 40, 80],
    lunch_start: 100,
    lunch_end: 100,
    exit: 200,
    late: [50, 30, 50, 30, 50],
  };
  try { navigator.vibrate(patterns[type] || 80); } catch {}
}
