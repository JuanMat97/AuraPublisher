import { CanvaImageAdjustOptions } from '../types/catalog';

export type { CanvaImageAdjustOptions };

/**
 * Checks whether all adjustment parameters are at default/neutral values.
 */
export function isAdjustDefault(options?: CanvaImageAdjustOptions | null): boolean {
  if (!options) return true;
  const {
    brightness = 0,
    contrast = 0,
    highlights = 0,
    shadowsTone = 0,
    whites = 0,
    blacks = 0,
    temperature = 0,
    tint = 0,
    saturation = 0,
    hue = 0,
    invert = false,
    vignette = 0,
  } = options;

  return (
    brightness === 0 &&
    contrast === 0 &&
    highlights === 0 &&
    shadowsTone === 0 &&
    whites === 0 &&
    blacks === 0 &&
    temperature === 0 &&
    tint === 0 &&
    saturation === 0 &&
    hue === 0 &&
    !invert &&
    (vignette === undefined || vignette === 0)
  );
}

export interface ToneCurveLUT {
  lutR: Uint8Array;
  lutG: Uint8Array;
  lutB: Uint8Array;
}

/**
 * Builds 256-entry Look-Up Tables (LUT) for Red, Green, and Blue channels
 * incorporating photographic tone curves and white balance shifts.
 */
export function buildToneCurveLUT(options: CanvaImageAdjustOptions = {}): ToneCurveLUT {
  const {
    brightness = 0,
    contrast = 0,
    highlights = 0,
    shadowsTone = 0,
    whites = 0,
    blacks = 0,
    temperature = 0,
    tint = 0,
    invert = false,
  } = options;

  const lutR = new Uint8Array(256);
  const lutG = new Uint8Array(256);
  const lutB = new Uint8Array(256);

  // 1. Precalculate parameter multipliers
  const bCutoff = (blacks / 100) * (40 / 255);
  const sWeightFactor = (shadowsTone / 100) * 0.32;
  const brNorm = brightness / 100;
  const gammaExp = brNorm !== 0 ? Math.pow(2, -brNorm * 0.85) : 1;
  const cNorm = contrast / 100;
  const hWeightFactor = (highlights / 100) * 0.32;
  const wNorm = whites / 100;
  const wGain = (wNorm * 40) / 255;

  // Temperature (Warmer: +R, -B; Cooler: +B, -R)
  const tempShift = (temperature / 100) * 0.16;
  // Tint (+M, -G)
  const tintShift = (tint / 100) * 0.14;

  const rOffset = tempShift + tintShift * 0.5;
  const gOffset = -tintShift;
  const bOffset = -tempShift + tintShift * 0.5;

  // Precalculate contrast sigmoid constants
  const k = cNorm > 0 ? cNorm * 9.0 : 0;
  const s0 = cNorm > 0 ? 1 / (1 + Math.exp(k * 0.5)) : 0;
  const s1 = cNorm > 0 ? 1 / (1 + Math.exp(-k * 0.5)) : 1;
  const sRange = s1 - s0;

  for (let i = 0; i < 256; i++) {
    let x = i / 255;

    // A. Blacks cutoff & lift
    if (bCutoff >= 0) {
      x = bCutoff + x * (1 - bCutoff);
    } else {
      x = Math.max(0, (x + bCutoff) / (1 + bCutoff));
    }

    // B. Shadows Toe Curve (luminance 0.1..0.45, preserving black point 0)
    if (sWeightFactor !== 0 && x > 0 && x < 0.55) {
      const normX = x / 0.55;
      const toeWeight = Math.sin(Math.PI * normX) * (1 - normX * 0.35);
      x = Math.max(0, Math.min(1, x + sWeightFactor * toeWeight));
    }

    // C. Brightness: Photographic Midtone Exposure Shift (0.5 gamma offset)
    if (gammaExp !== 1) {
      x = Math.pow(Math.max(0, Math.min(1, x)), gammaExp);
    }

    // D. Contrast: Centered S-curve L' = 1 / (1 + e^(-k(L - 0.5)))
    if (cNorm > 0) {
      const sx = 1 / (1 + Math.exp(-k * (x - 0.5)));
      x = (sx - s0) / sRange;
    } else if (cNorm < 0) {
      x = 0.5 + (x - 0.5) * (1 + cNorm * 0.75);
    }
    x = Math.max(0, Math.min(1, x));

    // E. Highlights: Shoulder Curve compressing/boosting bright tones (0.55..0.95)
    if (hWeightFactor !== 0 && x > 0.45 && x < 1.0) {
      const normH = (x - 0.45) / 0.55;
      const shoulderWeight = Math.sin(Math.PI * normH);
      x = Math.max(0, Math.min(1, x + hWeightFactor * shoulderWeight));
    }

    // F. Whites: White Point clipping and shoulder gain
    if (wNorm > 0) {
      x = Math.min(1, x / (1 - wGain * 0.75));
    } else if (wNorm < 0) {
      x = x * (1 + wNorm * 0.25);
    }

    // G. Invert
    if (invert) {
      x = 1.0 - x;
    }

    // H. Channel-specific white balance offsets (Temperature & Tint)
    const valR = Math.max(0, Math.min(1, x + rOffset));
    const valG = Math.max(0, Math.min(1, x + gOffset));
    const valB = Math.max(0, Math.min(1, x + bOffset));

    lutR[i] = Math.round(valR * 255);
    lutG[i] = Math.round(valG * 255);
    lutB[i] = Math.round(valB * 255);
  }

  return { lutR, lutG, lutB };
}

/**
 * Applies professional photographic color grading to an image or canvas.
 * Guaranteed 100% bit-exact passthrough when all adjustments are neutral (0).
 * Highly optimized for 60fps real-time interactive adjustments.
 */
export function applyColorGrading(
  source: HTMLImageElement | HTMLCanvasElement,
  options: CanvaImageAdjustOptions = {},
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = targetCanvas || document.createElement('canvas');
  const w = (source as any).naturalWidth || source.width || 1200;
  const h = (source as any).naturalHeight || source.height || 1200;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Bit-Exact Passthrough when options are default
  if (isAdjustDefault(options)) {
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return canvas;
  }

  // Draw base source
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const { lutR, lutG, lutB } = buildToneCurveLUT(options);

  const {
    saturation = 0,
    hue = 0,
    vignette = 0,
  } = options;

  const hasHueOrSat = saturation !== 0 || hue !== 0;
  const hasVignette = vignette > 0;

  // Case 1: Pure Tone Curves & White Balance (Fastest LUT-only path via 32-bit words)
  if (!hasHueOrSat && !hasVignette) {
    const data32 = new Uint32Array(data.buffer);
    const len = data32.length;
    for (let i = 0; i < len; i++) {
      const pixel = data32[i];
      const r = lutR[pixel & 0xff];
      const g = lutG[(pixel >> 8) & 0xff];
      const b = lutB[(pixel >> 16) & 0xff];
      const a = pixel & 0xff000000;
      data32[i] = a | (b << 16) | (g << 8) | r;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Case 2: Tone Curves + Hue / Saturation / Vignette
  const satMult = 1.0 + saturation / 100;
  const hueRad = (hue * Math.PI) / 180;
  const cosA = Math.cos(hueRad);
  const sinA = Math.sin(hueRad);

  // RGB to YIQ / Hue Rotation Matrix coefficients
  const a00 = 0.213 + cosA * 0.787 - sinA * 0.213;
  const a01 = 0.715 - cosA * 0.715 - sinA * 0.715;
  const a02 = 0.072 - cosA * 0.072 + sinA * 0.928;
  const a10 = 0.213 - cosA * 0.213 + sinA * 0.143;
  const a11 = 0.715 + cosA * 0.285 + sinA * 0.14;
  const a12 = 0.072 - cosA * 0.072 - sinA * 0.283;
  const a20 = 0.213 - cosA * 0.213 - sinA * 0.787;
  const a21 = 0.715 - cosA * 0.715 + sinA * 0.715;
  const a22 = 0.072 + cosA * 0.928 + sinA * 0.072;

  // Vignette parameters
  const centerX = w / 2;
  const centerY = h / 2;
  const maxRadiusSq = centerX * centerX + centerY * centerY;
  const maxRadius = Math.sqrt(maxRadiusSq);
  const innerR = 0.25;
  const outerR = 1.0;
  const vigFactor = (vignette / 100) * 0.88;

  let ptr = 0;
  for (let y = 0; y < h; y++) {
    const dy = y - centerY;
    const dySq = dy * dy;

    for (let x = 0; x < w; x++) {
      // 1. Tonal LUT mapping
      let r = lutR[data[ptr]];
      let g = lutG[data[ptr + 1]];
      let b = lutB[data[ptr + 2]];

      // 2. Hue Rotation
      if (hue !== 0) {
        const nr = a00 * r + a01 * g + a02 * b;
        const ng = a10 * r + a11 * g + a12 * b;
        const nb = a20 * r + a21 * g + a22 * b;
        r = nr;
        g = ng;
        b = nb;
      }

      // 3. Saturation (Luminance preservation)
      if (saturation !== 0) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lum + (r - lum) * satMult;
        g = lum + (g - lum) * satMult;
        b = lum + (b - lum) * satMult;
      }

      // 4. Vignette (Smooth cosine falloff to corners)
      if (hasVignette) {
        const dx = x - centerX;
        const dist = Math.sqrt(dx * dx + dySq) / maxRadius;
        if (dist > innerR) {
          const t = Math.min(1, (dist - innerR) / (outerR - innerR));
          const smooth = t * t * (3 - 2 * t);
          const falloff = 1.0 - vigFactor * smooth;
          r *= falloff;
          g *= falloff;
          b *= falloff;
        }
      }

      data[ptr] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[ptr + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[ptr + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      ptr += 4;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Drop-in backwards-compatible alias for existing codebase callers.
 */
export const applyCanvaAdjustmentsToCanvas = applyColorGrading;
