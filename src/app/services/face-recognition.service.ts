import { Injectable, signal } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

/**
 * FaceRecognitionService
 * ──────────────────────
 * Reconocimiento facial 1:N para marcación con:
 *  - Descriptor 128-d via @vladmandic/face-api
 *  - Liveness por pose (mover cabeza arriba)
 *  - Quality gating (blur, iluminación, pose, score, tamaño bbox)
 *  - Margin check (best vs second-best) para reducir falsos positivos
 *  - Multi-template (varios descriptores por persona) para robustez
 *
 * Todo on-device. Los descriptores viven en Supabase para sync cross-device.
 */

export interface FaceDetection {
  descriptor: Float32Array;
  landmarks: faceapi.FaceLandmarks68;
  box: { x: number; y: number; width: number; height: number };
  ear: number;
  yaw: number;
  pitch: number;
  detectionScore: number;
}

export interface QualityIssue {
  code: 'blur' | 'lighting' | 'pose' | 'low_score' | 'too_small' | 'no_face';
  detail?: string;
  value?: number;
}

export interface QualityResult {
  ok: boolean;
  issues: QualityIssue[];
  metrics: {
    blurVariance: number;
    brightness: number;
    contrast: number;
    score: number;
    bboxSize: number;
    yaw: number;
    pitch: number;
  };
}

export interface EnrollmentTemplate {
  descriptors: number[][]; // varios descriptores por persona
}

export interface MatchResult {
  status: 'matched' | 'unknown' | 'ambiguous';
  bestId: string | null;
  bestDistance: number;
  secondBestId: string | null;
  secondBestDistance: number;
  margin: number; // best / second  → cerca de 1 = ambiguo
  similarity: number;
}

const MODEL_URL = '/face-models';
// Umbral más estricto que el default de face-api (0.6) — queremos menos falsos positivos.
export const FACE_MATCH_THRESHOLD = 0.45;
// Si best/second > este valor, marcamos como ambiguo (muy parecidos entre sí).
export const MARGIN_RATIO_MAX = 0.85;
// Quality gates
const MIN_BLUR_VARIANCE = 60;        // Laplacian variance — menos = más borroso
const MIN_BRIGHTNESS = 50;           // 0..255
const MAX_BRIGHTNESS = 220;
const MIN_DETECTION_SCORE = 0.85;
const MIN_BBOX_PX = 160;             // lado mínimo de la bbox
const MAX_FRONTAL_YAW = 0.20;
const MAX_FRONTAL_PITCH = 0.25;
// EAR para ojos cerrados (parpadeo)
const EAR_CLOSED = 0.21;

@Injectable({ providedIn: 'root' })
export class FaceRecognitionService {
  public readonly modelsLoaded = signal(false);
  public readonly loading = signal(false);
  private loadPromise: Promise<void> | null = null;

  public async loadModels(): Promise<void> {
    if (this.modelsLoaded()) return;
    if (this.loadPromise) return this.loadPromise;
    this.loading.set(true);
    this.loadPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      this.modelsLoaded.set(true);
    })();
    try {
      await this.loadPromise;
    } finally {
      this.loading.set(false);
    }
  }

  /** Solo carga el TinyFaceDetector (~193KB). Suficiente para detectar presencia/posición. */
  public detectorOnlyLoaded = signal(false);
  private detectorOnlyPromise: Promise<void> | null = null;
  public async loadDetectorOnly(): Promise<void> {
    if (this.detectorOnlyLoaded() || this.modelsLoaded()) {
      this.detectorOnlyLoaded.set(true);
      return;
    }
    if (this.detectorOnlyPromise) return this.detectorOnlyPromise;
    this.detectorOnlyPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      this.detectorOnlyLoaded.set(true);
    })();
    return this.detectorOnlyPromise;
  }

  /** Detección rápida sin landmarks ni descriptor. Devuelve box + score. */
  public async detectBoxOnly(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement)
    : Promise<{ box: { x: number; y: number; width: number; height: number }; score: number } | null> {
    if (!this.detectorOnlyLoaded() && !this.modelsLoaded()) {
      try { await this.loadDetectorOnly(); } catch { return null; }
    }
    const res = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }));
    if (!res) return null;
    const b = res.box;
    return { box: { x: b.x, y: b.y, width: b.width, height: b.height }, score: res.score };
  }

  /**
   * Detecta un rostro. `mode='enroll'` usa inputSize 416 (más preciso, más lento).
   * `mode='verify'` usa 320 (más rápido para loops en vivo).
   */
  public async detect(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    mode: 'enroll' | 'verify' = 'verify',
  ): Promise<FaceDetection | null> {
    if (!this.modelsLoaded()) await this.loadModels();
    // inputSize 416 da mejor detección sobre webcams 640x480.
    // scoreThreshold 0.1 muy permisivo — quality gate (0.85 cliente / 0.92 server) sigue siendo el filtro real.
    const inputSize = 416;
    const res = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.1 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!res) return null;
    const lm = res.landmarks;
    const b = res.detection.box;
    return {
      descriptor: res.descriptor,
      landmarks: lm,
      box: { x: b.x, y: b.y, width: b.width, height: b.height },
      ear: this.computeEAR(lm),
      yaw: this.computeYaw(lm),
      pitch: this.computePitch(lm),
      detectionScore: res.detection.score,
    };
  }

  /** Distancia euclidiana entre dos descriptores. */
  public distance(a: Float32Array | number[], b: Float32Array | number[]): number {
    return faceapi.euclideanDistance(a as number[], b as number[]);
  }

  /**
   * Compara un descriptor contra una lista de enrolados (1:N).
   * Cada enrolado puede tener varios templates; tomamos la mínima distancia por persona.
   * Retorna match/ambiguous/unknown según umbral y margin ratio.
   */
  public compareToList(
    probe: Float32Array,
    enrolled: { id: string; templates: number[][] }[],
  ): MatchResult {
    if (!enrolled.length) {
      return {
        status: 'unknown',
        bestId: null, bestDistance: Number.POSITIVE_INFINITY,
        secondBestId: null, secondBestDistance: Number.POSITIVE_INFINITY,
        margin: 1, similarity: 0,
      };
    }
    const scores: { id: string; distance: number }[] = enrolled.map(e => {
      const dMin = e.templates.length
        ? Math.min(...e.templates.map(t => this.distance(probe, t)))
        : Number.POSITIVE_INFINITY;
      return { id: e.id, distance: dMin };
    });
    scores.sort((a, b) => a.distance - b.distance);
    const best = scores[0];
    const second = scores[1] ?? { id: null as any, distance: Number.POSITIVE_INFINITY };
    const margin = second.distance === 0 ? 1 : best.distance / second.distance;
    const similarity = Math.max(0, Math.min(1, 1 - best.distance));

    let status: MatchResult['status'];
    if (best.distance < FACE_MATCH_THRESHOLD && margin <= MARGIN_RATIO_MAX) {
      status = 'matched';
    } else if (best.distance < FACE_MATCH_THRESHOLD && margin > MARGIN_RATIO_MAX) {
      status = 'ambiguous';
    } else {
      status = 'unknown';
    }
    return {
      status,
      bestId: best.id, bestDistance: best.distance,
      secondBestId: second.id, secondBestDistance: second.distance,
      margin, similarity,
    };
  }

  /** Compatibilidad: comparación 1:1 contra un único descriptor. */
  public compare(a: Float32Array | number[], b: Float32Array | number[]): { match: boolean; distance: number; similarity: number } {
    const distance = this.distance(a, b);
    const similarity = Math.max(0, Math.min(1, 1 - distance));
    return { match: distance < FACE_MATCH_THRESHOLD, distance, similarity };
  }

  public isBlinkClosed(ear: number): boolean {
    return ear < EAR_CLOSED;
  }

  /**
   * Mide calidad de la captura. Recorta la región de la cara, calcula:
   *  - Varianza de Laplacian (blur)
   *  - Brillo / contraste promedio
   *  - Pose (yaw/pitch)
   *  - Score de detección
   *  - Tamaño de la bbox
   */
  public qualityCheck(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    det: FaceDetection,
  ): QualityResult {
    const issues: QualityIssue[] = [];
    const bboxSize = Math.min(det.box.width, det.box.height);
    const { blurVariance, brightness, contrast } = this.measureRegion(input, det.box);

    if (det.detectionScore < MIN_DETECTION_SCORE) {
      issues.push({ code: 'low_score', value: det.detectionScore });
    }
    if (bboxSize < MIN_BBOX_PX) {
      issues.push({ code: 'too_small', value: bboxSize, detail: 'Acércate a la cámara' });
    }
    if (blurVariance < MIN_BLUR_VARIANCE) {
      issues.push({ code: 'blur', value: blurVariance, detail: 'Imagen borrosa' });
    }
    if (brightness < MIN_BRIGHTNESS) {
      issues.push({ code: 'lighting', value: brightness, detail: 'Muy oscuro' });
    } else if (brightness > MAX_BRIGHTNESS) {
      issues.push({ code: 'lighting', value: brightness, detail: 'Muy claro / contraluz' });
    }
    if (Math.abs(det.yaw) > MAX_FRONTAL_YAW || Math.abs(det.pitch) > MAX_FRONTAL_PITCH) {
      issues.push({ code: 'pose', value: Math.max(Math.abs(det.yaw), Math.abs(det.pitch)), detail: 'Mira al frente' });
    }

    return {
      ok: issues.length === 0,
      issues,
      metrics: {
        blurVariance, brightness, contrast,
        score: det.detectionScore,
        bboxSize,
        yaw: det.yaw, pitch: det.pitch,
      },
    };
  }

  // ── Internos ─────────────────────────────────────────────────────────

  private measureRegion(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    box: { x: number; y: number; width: number; height: number },
  ): { blurVariance: number; brightness: number; contrast: number } {
    // Sample down to ~120px lado mayor para velocidad
    const target = 120;
    const scale = target / Math.max(box.width, box.height);
    const w = Math.max(8, Math.round(box.width * scale));
    const h = Math.max(8, Math.round(box.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return { blurVariance: 0, brightness: 0, contrast: 0 };
    try {
      ctx.drawImage(input as any, box.x, box.y, box.width, box.height, 0, 0, w, h);
    } catch {
      return { blurVariance: 0, brightness: 0, contrast: 0 };
    }
    const img = ctx.getImageData(0, 0, w, h);
    const gray = new Float32Array(w * h);
    let sum = 0, sumSq = 0;
    for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
      // luma
      const g = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
      gray[j] = g;
      sum += g;
      sumSq += g * g;
    }
    const n = w * h;
    const brightness = sum / n;
    const variance = sumSq / n - brightness * brightness;
    const contrast = Math.sqrt(Math.max(0, variance));

    // Laplacian 3x3: [[0,1,0],[1,-4,1],[0,1,0]]
    let lapSum = 0, lapSumSq = 0, count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const l =
          -4 * gray[idx] +
          gray[idx - 1] + gray[idx + 1] +
          gray[idx - w] + gray[idx + w];
        lapSum += l;
        lapSumSq += l * l;
        count++;
      }
    }
    const lapMean = count ? lapSum / count : 0;
    const blurVariance = count ? lapSumSq / count - lapMean * lapMean : 0;
    return { blurVariance, brightness, contrast };
  }

  private computeEAR(lm: faceapi.FaceLandmarks68): number {
    const left = lm.getLeftEye();
    const right = lm.getRightEye();
    return (this.eyeAspectRatio(left) + this.eyeAspectRatio(right)) / 2;
  }

  private eyeAspectRatio(eye: faceapi.Point[]): number {
    const d = (a: faceapi.Point, b: faceapi.Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const vertical = d(eye[1], eye[5]) + d(eye[2], eye[4]);
    const horizontal = 2 * d(eye[0], eye[3]);
    return horizontal === 0 ? 0 : vertical / horizontal;
  }

  private computeYaw(lm: faceapi.FaceLandmarks68): number {
    const left = lm.getLeftEye();
    const right = lm.getRightEye();
    const nose = lm.getNose();
    const eyeCenterX = (this.centroid(left).x + this.centroid(right).x) / 2;
    const noseX = this.centroid(nose).x;
    const eyeDist = Math.abs(this.centroid(right).x - this.centroid(left).x) || 1;
    return Math.max(-1, Math.min(1, (noseX - eyeCenterX) / (eyeDist / 2)));
  }

  private computePitch(lm: faceapi.FaceLandmarks68): number {
    const left = lm.getLeftEye();
    const right = lm.getRightEye();
    const nose = lm.getNose();
    const mouth = lm.getMouth();
    const eyeY = (this.centroid(left).y + this.centroid(right).y) / 2;
    const mouthY = this.centroid(mouth).y;
    const noseY = this.centroid(nose).y;
    const faceSpan = Math.abs(mouthY - eyeY) || 1;
    return ((noseY - eyeY) / faceSpan - 0.5) * 2;
  }

  private centroid(pts: faceapi.Point[]): { x: number; y: number } {
    const n = pts.length || 1;
    let x = 0, y = 0;
    for (const p of pts) { x += p.x; y += p.y; }
    return { x: x / n, y: y / n };
  }
}
