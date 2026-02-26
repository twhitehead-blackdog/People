import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimeclockAudioService {
  /** Empleado con sonido personalizado al marcar exitosamente */
  private readonly EMPLOYEE_PERSONALIZED_SOUND_ID = '202c46ab-04f9-41e8-a572-d9f50f7f31b6';
  private readonly PERSONALIZED_SUCCESS_SOUNDS = ['/sounds/squirrel.mp3', '/sounds/cockatoo.mp3'];
  private readonly GENERAL_SUCCESS_SOUNDS = ['/sounds/meow.mp3', '/sounds/bark.mp3'];

  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      return this.audioContext;
    } catch (error) {
      console.warn('Audio no soportado:', error);
      return null;
    }
  }

  public playSuccessSound(employeeId?: string): void {
    try {
      let src: string;
      if (employeeId === this.EMPLOYEE_PERSONALIZED_SOUND_ID && this.PERSONALIZED_SUCCESS_SOUNDS.length > 0) {
        const idx = Math.floor(Math.random() * this.PERSONALIZED_SUCCESS_SOUNDS.length);
        src = this.PERSONALIZED_SUCCESS_SOUNDS[idx];
      } else {
        const idx = Math.floor(Math.random() * this.GENERAL_SUCCESS_SOUNDS.length);
        src = this.GENERAL_SUCCESS_SOUNDS[idx];
      }
      const audio = new Audio(src);
      audio.volume = 0.7;
      audio.play().then(() => {
        console.log('🔊 Sonido de éxito reproducido');
      }).catch((error) => {
        console.warn('Error reproduciendo sonido de éxito:', error);
      });
    } catch (error) {
      console.warn('Error reproduciendo sonido de éxito:', error);
    }
  }

  public playFailureSound(): void {
    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;

      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.frequency.value = 400;
      osc1.type = 'square';
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.frequency.value = 300;
      osc2.type = 'square';
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.2, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.4);

      console.log('🔊 Sonido de error reproducido');
    } catch (error) {
      console.warn('Error reproduciendo sonido de error:', error);
    }
  }

  public playLateSound(): void {
    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;

      for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.frequency.value = 880;
        osc.type = 'triangle';
        const startTime = now + i * 0.25;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.setValueAtTime(0.25, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      }

      console.log('🔊 Sonido de tardanza reproducido');
    } catch (error) {
      console.warn('Error reproduciendo sonido de tardanza:', error);
    }
  }
}
