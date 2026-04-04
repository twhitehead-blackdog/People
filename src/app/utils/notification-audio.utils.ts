let _notifAudioCtx: AudioContext | null = null;

function getNotifAudioContext(): AudioContext | null {
  try {
    if (!_notifAudioCtx) {
      _notifAudioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    if (_notifAudioCtx.state === 'suspended') {
      _notifAudioCtx.resume();
    }
    return _notifAudioCtx;
  } catch {
    return null;
  }
}

/** Short two-tone chime (C5 -> E5) for incoming notifications */
export function playNotificationSound(): void {
  const ctx = getNotifAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const tones = [523.25, 659.25]; // C5, E5
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.setValueAtTime(0.15, start + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch { /* noop */ }
}
