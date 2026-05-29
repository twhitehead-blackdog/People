import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiUrlService } from '../../services/api-url.service';

/**
 * Servicio de fingerprinting de dispositivos.
 *
 * Identifica cada computadora con 3 capas:
 *  1) device_id persistente en localStorage (UUID)
 *  2) combined_hash = sha256(canvas+webgl+audio+font+screen+cpu+ram)
 *  3) Datos contextuales (IP local, client hints, battery, etc.)
 *
 * El device_id sobrevive cambios de red. El combined_hash sobrevive borrado
 * de localStorage (modo incógnito) — útil para detectar la misma máquina física.
 */
@Injectable({ providedIn: 'root' })
export class DeviceFingerprintService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  private static readonly DEVICE_ID_KEY = 'pt_device_id_v1';
  private cached: any | null = null;

  /** UUID persistente del browser. Se crea si no existe. */
  public getDeviceId(): string {
    try {
      let id = localStorage.getItem(DeviceFingerprintService.DEVICE_ID_KEY);
      if (!id) {
        id = (crypto?.randomUUID?.() ?? this.fallbackUuid());
        localStorage.setItem(DeviceFingerprintService.DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      // localStorage bloqueado (algunos browsers en modo strict)
      return this.fallbackUuid();
    }
  }

  /** Recopila TODO el fingerprint. Cachea en memoria por la vida de la pestaña. */
  public async collect(extra: { company_id?: string; branch_id?: string | null } = {}): Promise<Record<string, any>> {
    if (this.cached) return { ...this.cached, ...extra };

    const [canvasHash, audioHash, fontHash, ipLocal, battery] = await Promise.all([
      this.canvasFingerprint(),
      this.audioFingerprint(),
      this.fontFingerprint(),
      this.localIp(),
      this.batteryInfo(),
    ]);
    const webglInfo = this.webglInfo();
    const webglHash = await this.sha256(JSON.stringify(webglInfo));
    const ua = navigator.userAgent;
    const parsedUa = this.parseUserAgent(ua);
    const clientHints = await this.userAgentClientHints();

    const combinedInput = [canvasHash, audioHash, webglHash, fontHash,
      screen.width, screen.height, screen.colorDepth,
      navigator.hardwareConcurrency, (navigator as any).deviceMemory,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join('|');
    const combinedHash = await this.sha256(combinedInput);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const fp: Record<string, any> = {
      device_id: this.getDeviceId(),
      canvas_hash: canvasHash,
      audio_hash: audioHash,
      webgl_hash: webglHash,
      font_hash: fontHash,
      combined_hash: combinedHash,
      user_agent: ua,
      platform: navigator.platform,
      os_name: parsedUa.os,
      os_version: parsedUa.osVersion,
      browser_name: parsedUa.browser,
      browser_version: parsedUa.browserVersion,
      is_mobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua),
      cpu_cores: navigator.hardwareConcurrency ?? null,
      device_memory_gb: (navigator as any).deviceMemory ?? null,
      screen_width: screen.width,
      screen_height: screen.height,
      screen_color_depth: screen.colorDepth,
      device_pixel_ratio: window.devicePixelRatio,
      touch_points: (navigator as any).maxTouchPoints ?? 0,
      gpu_vendor: webglInfo.vendor,
      gpu_renderer: webglInfo.renderer,
      language: navigator.language,
      languages: navigator.languages?.slice(0, 10) ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezone_offset: new Date().getTimezoneOffset(),
      ip_local: ipLocal,
      connection_type: conn?.effectiveType ?? null,
      connection_downlink: conn?.downlink ?? null,
      battery_level: battery?.level ?? null,
      battery_charging: battery?.charging ?? null,
      ua_brands: clientHints.brands ?? null,
      ua_platform_version: clientHints.platformVersion ?? null,
      ua_arch: clientHints.architecture ?? null,
      ua_bitness: clientHints.bitness ?? null,
      ua_model: clientHints.model ?? null,
      device_model: clientHints.model ?? null,
      extra: {
        // Espacio para más datos sin tocar schema
        cookie_enabled: navigator.cookieEnabled,
        do_not_track: navigator.doNotTrack,
        plugins_count: (navigator.plugins?.length ?? 0),
        vendor: navigator.vendor,
        product: navigator.product,
        webdriver: (navigator as any).webdriver ?? false,
        screen_avail: `${screen.availWidth}x${screen.availHeight}`,
        screen_orientation: (screen as any).orientation?.type ?? null,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        max_touch_points: (navigator as any).maxTouchPoints ?? 0,
        pdf_viewer_enabled: (navigator as any).pdfViewerEnabled ?? null,
      },
    };

    this.cached = fp;
    return { ...fp, ...extra };
  }

  /** Persiste el fingerprint en Supabase (vía RPC). Se llama al abrir el kiosk. */
  public async persist(extra: { company_id?: string; branch_id?: string | null } = {}): Promise<void> {
    try {
      const fp = await this.collect(extra);
      const url = this.apiUrl.build('rest/v1/rpc/upsert_device_fingerprint', {});
      await this.http.post(url, { p: fp }).toPromise();
    } catch (e) {
      // No bloqueamos al usuario si falla la persistencia.
      console.warn('[device-fp] persist failed', e);
    }
  }

  // ────────── Fingerprints técnicos ──────────

  /** Canvas fingerprint — único por GPU/drivers/OS. */
  private async canvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 280; canvas.height = 60;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Cwm fjordbank glyphs vext quiz, 🦄🛡️', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Cwm fjordbank glyphs vext quiz, 🦄🛡️', 4, 17);
      ctx.beginPath(); ctx.arc(60, 30, 18, 0, Math.PI * 2, true); ctx.closePath();
      ctx.fillStyle = 'rgb(255,0,255)'; ctx.fill();
      return await this.sha256(canvas.toDataURL());
    } catch { return 'canvas-err'; }
  }

  /** Audio fingerprint — único por DSP/audio stack del device. */
  private async audioFingerprint(): Promise<string> {
    try {
      const AudioCtx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!AudioCtx) return 'no-audio';
      const context = new AudioCtx(1, 44100, 44100);
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;
      oscillator.connect(compressor); compressor.connect(context.destination);
      oscillator.start(0);
      const buffer = await context.startRendering();
      let sum = 0;
      const data = buffer.getChannelData(0);
      for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
      return sum.toString();
    } catch { return 'audio-err'; }
  }

  /** WebGL info — vendor + renderer + extensiones. */
  private webglInfo(): { vendor: string; renderer: string; extensions: string } {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!gl) return { vendor: '', renderer: '', extensions: '' };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const exts = (gl.getSupportedExtensions() ?? []).sort().join(',');
      return { vendor: String(vendor ?? ''), renderer: String(renderer ?? ''), extensions: exts };
    } catch { return { vendor: '', renderer: '', extensions: '' }; }
  }

  /** Font fingerprint — qué fuentes están instaladas. */
  private async fontFingerprint(): Promise<string> {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
      'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia',
      'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Helvetica Neue',
      'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'MS Sans Serif',
      'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS',
      'Verdana', 'San Francisco', 'Andale Mono', 'Apple Chancery', 'Bookman',
      'Hoefler Text', 'Optima', 'Charcoal', 'Roboto', 'Noto Sans', 'Ubuntu',
    ];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const span = document.createElement('span');
    span.style.cssText = `position:absolute;left:-9999px;font-size:${testSize};visibility:hidden`;
    span.textContent = testString;
    document.body.appendChild(span);

    const defaults: Record<string, { w: number; h: number }> = {};
    for (const b of baseFonts) {
      span.style.fontFamily = b;
      defaults[b] = { w: span.offsetWidth, h: span.offsetHeight };
    }
    const detected: string[] = [];
    for (const f of testFonts) {
      let isDetected = false;
      for (const b of baseFonts) {
        span.style.fontFamily = `'${f}',${b}`;
        const w = span.offsetWidth;
        const h = span.offsetHeight;
        if (w !== defaults[b].w || h !== defaults[b].h) { isDetected = true; break; }
      }
      if (isDetected) detected.push(f);
    }
    document.body.removeChild(span);
    return await this.sha256(detected.sort().join(','));
  }

  /** IP local vía WebRTC STUN (Chrome la enmascara con mDNS, Firefox la entrega real). */
  private localIp(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        const timeout = setTimeout(() => { try { pc.close(); } catch {} ; resolve(null); }, 1500);
        pc.createDataChannel('');
        pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => resolve(null));
        pc.onicecandidate = (ev) => {
          if (!ev || !ev.candidate || !ev.candidate.candidate) return;
          const m = ev.candidate.candidate.match(/(\d{1,3}(\.\d{1,3}){3})/);
          if (m) { clearTimeout(timeout); try { pc.close(); } catch {}; resolve(m[1]); }
        };
      } catch { resolve(null); }
    });
  }

  /** Battery API — disponible en Chrome desktop/android. */
  private async batteryInfo(): Promise<{ level: number; charging: boolean } | null> {
    try {
      const b: any = await (navigator as any).getBattery?.();
      if (!b) return null;
      return { level: b.level, charging: b.charging };
    } catch { return null; }
  }

  /** User-Agent Client Hints — info adicional de Chromium (platform real, modelo). */
  private async userAgentClientHints(): Promise<any> {
    try {
      const uaData: any = (navigator as any).userAgentData;
      if (!uaData) return {};
      const hi = await uaData.getHighEntropyValues?.([
        'architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList', 'wow64',
      ]);
      return {
        brands: uaData.brands,
        mobile: uaData.mobile,
        platform: uaData.platform,
        ...hi,
      };
    } catch { return {}; }
  }

  /** Parser UA (cliente, mismo formato que face-alerts.component). */
  private parseUserAgent(ua: string): { browser: string; browserVersion: string; os: string; osVersion: string } {
    let os = 'Otro', osVersion = '';
    const iOSMatch = ua.match(/iPhone OS (\d+_\d+)|iPad; CPU OS (\d+_\d+)|CPU iPhone OS (\d+_\d+)/);
    if (iOSMatch) { os = 'iOS'; osVersion = (iOSMatch[1] || iOSMatch[2] || iOSMatch[3] || '').replace('_', '.'); }
    else if (/Android (\d+(\.\d+)?)/.test(ua)) { os = 'Android'; osVersion = ua.match(/Android (\d+(\.\d+)?)/)![1]; }
    else if (/Windows NT 10/.test(ua)) { os = 'Windows'; osVersion = '10/11'; }
    else if (/Windows NT 6\.3/.test(ua)) { os = 'Windows'; osVersion = '8.1'; }
    else if (/Windows NT 6\.1/.test(ua)) { os = 'Windows'; osVersion = '7'; }
    else if (/Mac OS X (\d+[._]\d+)/.test(ua)) { os = 'macOS'; osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)![1].replace('_','.'); }
    else if (/CrOS/.test(ua)) os = 'ChromeOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    let browser = 'Otro', browserVersion = '';
    if (/Edg\/(\d+)/.test(ua)) { browser = 'Edge'; browserVersion = ua.match(/Edg\/(\d+)/)![1]; }
    else if (/OPR\/(\d+)/.test(ua)) { browser = 'Opera'; browserVersion = ua.match(/OPR\/(\d+)/)![1]; }
    else if (/SamsungBrowser\/(\d+)/.test(ua)) { browser = 'Samsung'; browserVersion = ua.match(/SamsungBrowser\/(\d+)/)![1]; }
    else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua)) { browser = 'Chrome'; browserVersion = ua.match(/Chrome\/(\d+)/)![1]; }
    else if (/Firefox\/(\d+)/.test(ua)) { browser = 'Firefox'; browserVersion = ua.match(/Firefox\/(\d+)/)![1]; }
    else if (/Version\/(\d+).+Safari/.test(ua)) { browser = 'Safari'; browserVersion = ua.match(/Version\/(\d+)/)![1]; }
    else if (/Safari/.test(ua)) browser = 'Safari';
    return { browser, browserVersion, os, osVersion };
  }

  // ────────── Utils ──────────
  private async sha256(input: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private fallbackUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
