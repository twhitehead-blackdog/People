/**
 * SourceAFIS wrapper: extracts templates from PNG samples and computes match scores.
 *
 * Templates are stored as base64-encoded SourceAFIS proprietary blobs in
 * dp_fingerprint_templates.template_b64 (format = 'DP_PROPRIETARY' kept for legacy
 * shape, but the bytes are SourceAFIS templates — DP Lite Client only ships
 * raw PNG samples, the cryptographic template is derived server-side).
 */

import {
  templateFromEncoded,
  createMatcher,
  matchWithMatcher,
} from 'sourceafis-js';

/**
 * SourceAFIS score threshold. Default 25 = ~0.1% false accept rate.
 * Override via env var DP_MATCH_THRESHOLD.
 */
export const DEFAULT_MATCH_THRESHOLD = (() => {
  const v = parseFloat(process.env['DP_MATCH_THRESHOLD'] || '');
  return Number.isFinite(v) && v > 0 ? v : 25;
})();

/**
 * High-confidence threshold. Above this, we accept the match without asking
 * for a second finger. Between DEFAULT_MATCH_THRESHOLD and HIGH_CONFIDENCE,
 * we ask the user to verify with another finger.
 */
export const HIGH_CONFIDENCE_THRESHOLD = (() => {
  const v = parseFloat(process.env['DP_HIGH_CONFIDENCE'] || '');
  return Number.isFinite(v) && v > 0 ? v : 35;
})();

/** Decode a base64 PNG and produce a serialized SourceAFIS template (Buffer). */
export function extractTemplate(pngB64: string): Buffer {
  const buf = Buffer.from(stripDataUrl(pngB64), 'base64');
  return templateFromEncoded(buf);
}

/**
 * 1:N match a probe template against many candidate templates.
 * Returns the best match (employee_id, finger_index, score) or null if no candidate clears `threshold`.
 */
export function matchOneToMany<T extends { template_b64: string; employee_id: string; finger_index: number; id?: string }>(
  probeTemplate: Buffer,
  candidates: T[],
  threshold = DEFAULT_MATCH_THRESHOLD,
): { row: T; score: number } | null {
  const matcher = createMatcher(probeTemplate);
  let best: { row: T; score: number } | null = null;
  for (const c of candidates) {
    let candTemplate: Buffer;
    try { candTemplate = Buffer.from(c.template_b64, 'base64'); }
    catch { continue; }
    let score = 0;
    try { score = matchWithMatcher(matcher, candTemplate); }
    catch { continue; }
    if (!best || score > best.score) best = { row: c, score };
  }
  if (best && best.score >= threshold) return best;
  return null;
}

function stripDataUrl(s: string): string {
  const i = s.indexOf(',');
  return i >= 0 && s.startsWith('data:') ? s.slice(i + 1) : s;
}
