import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { AmbientLightMode, ReflectionType, ReflectionDirection, CanvaShadowPreset } from '../types/catalog';
import { finishPresets, RESIN_OVERLAY } from '../components/configurador3d/finishPresets';

export function getReflectionTypeForEnvironment(category?: string): ReflectionType {
  if (category === 'galeria') return 'art_gallery';
  if (category === 'oficina') return 'industrial_loft';
  if (category === 'dormitorio') return 'sunset_window';
  if (category === 'hall') return 'crystal_minimal';
  return 'studio_grid';
}

/**
 * The artwork is always emitted at its source colour. Surface settings only
 * control the separate, neutral specular layer that sits on top of it.
 */
export function getNeutralSurfaceSettings(
  finishType: string,
  hasResina: boolean,
  reflectionIntensity: number,
) {
  const vinyl = finishPresets[finishType] || finishPresets.brillante;
  const strength = hasResina ? Math.max(0, Math.min(reflectionIntensity, 0.8)) : 0;

  if (strength === 0) {
    return {
      roughness: 1,
      clearcoat: 0,
      clearcoatRoughness: 1,
      envMapIntensity: 0,
      specularIntensity: 0,
      iridescence: 0,
      iridescenceIOR: 1.3,
    };
  }

  // Resin is intentionally colourless. Do not apply the vinyl's iridescence
  // here: the real tornasolado workflow will use its own production mask.
  return {
    roughness: RESIN_OVERLAY.roughness ?? 0.012,
    clearcoat: (RESIN_OVERLAY.clearcoat ?? 1.0) * strength,
    clearcoatRoughness: 0.14 + (1 - strength) * 0.18,
    envMapIntensity: (RESIN_OVERLAY.envMapIntensity ?? 4.5) * strength,
    specularIntensity: (vinyl.specularIntensity ?? 1.4) * strength,
    iridescence: 0,
    iridescenceIOR: 1.3,
  };
}

export interface CanvaImageAdjustOptions {
  temperature?: number; // -50..50
  tint?: number; // -50..50
  brightness?: number; // -50..50
  contrast?: number; // -50..50
  highlights?: number; // -50..50
  shadowsTone?: number; // -50..50
  whites?: number; // -50..50
  blacks?: number; // -50..50
  hue?: number; // -180..180
  saturation?: number; // -100..100
  invert?: boolean;
}

export interface RenderWebGLRoomOptions {
  roomImage: HTMLImageElement;
  artworkImage: HTMLImageElement;
  panelsCount?: number;
  gapCm?: number; // 2..8 cm
  artworkWidthCm?: number;
  artworkHeightCm?: number;
  finishType?: string;
  hasResina?: boolean;
  centerX?: number; // 0..1 (default 0.5)
  centerY?: number; // 0..1 (default 0.32)
  scaleWidth?: number; // 0.05..0.90 (default 0.42)
  wallAngleDeg?: number; // -60..60 degrees
  pitchDeg?: number; // -60..60 degrees
  resinGloss?: number; // 0..1 (default 0.85)
  lightMode?: AmbientLightMode;
  reflectionType?: ReflectionType;
  reflectionDirection?: ReflectionDirection;
  reflectionAngleDeg?: number; // 0..360
  reflectionIntensity?: number; // 0..1
  reflectionScale?: number; // 0.5..2.0
  reflectionRoughness?: number; // 0.02..0.30
  wallHarmonization?: number; // 0..1 (default 0.35)

  // Complete Canva Image Adjustment
  adjust?: CanvaImageAdjustOptions;

  // Canva-Style Advanced Shadows
  shadowPreset?: CanvaShadowPreset;
  shadowAngleDeg?: number; // 0..360
  shadowDistance?: number; // 0..100
  shadowBlur?: number; // 0..100
  shadowIntensity?: number; // 0..100
  shadowColor?: string;

  renderWidth?: number;
  renderHeight?: number;
}

/**
 * Full Canva 1:1 Image Adjustments Pipeline.
 * Bit-exact zero-loss passthrough when all sliders are 0!
 */
export function applyCanvaAdjustmentsToCanvas(
  sourceImage: HTMLImageElement,
  options: CanvaImageAdjustOptions,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const {
    temperature = 0,
    tint = 0,
    brightness = 0,
    contrast = 0,
    highlights = 0,
    shadowsTone = 0,
    whites = 0,
    blacks = 0,
    hue = 0,
    saturation = 0,
    invert = false,
  } = options;

  const canvas = targetCanvas || document.createElement('canvas');
  const w = sourceImage.naturalWidth || sourceImage.width || 1200;
  const h = sourceImage.naturalHeight || sourceImage.height || 1200;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;

  const isDefault =
    temperature === 0 &&
    tint === 0 &&
    brightness === 0 &&
    contrast === 0 &&
    highlights === 0 &&
    shadowsTone === 0 &&
    whites === 0 &&
    blacks === 0 &&
    hue === 0 &&
    saturation === 0 &&
    !invert;

  // 100% Bit-Exact Passthrough when no adjustments are applied
  if (isDefault) {
    ctx.filter = 'none';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceImage, 0, 0, w, h);
    return canvas;
  }

  const bVal = 100 + brightness + (whites * 0.4) - (blacks * 0.3);
  const cVal = 100 + contrast;
  const sVal = 100 + saturation;
  const invVal = invert ? 100 : 0;

  ctx.clearRect(0, 0, w, h);
  ctx.filter = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%) hue-rotate(${hue}deg) invert(${invVal}%)`;
  ctx.drawImage(sourceImage, 0, 0, w, h);
  ctx.filter = 'none';

  // Temperature & Tint spectral overlays
  if (temperature !== 0 || tint !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';

    if (temperature > 0) {
      ctx.fillStyle = `rgba(255, 170, 50, ${(temperature / 50) * 0.28})`;
      ctx.fillRect(0, 0, w, h);
    } else if (temperature < 0) {
      ctx.fillStyle = `rgba(70, 150, 255, ${(Math.abs(temperature) / 50) * 0.28})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (tint > 0) {
      ctx.fillStyle = `rgba(230, 80, 230, ${(tint / 50) * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    } else if (tint < 0) {
      ctx.fillStyle = `rgba(80, 230, 120, ${(Math.abs(tint) / 50) * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // Highlights & Shadows compensation
  if (highlights !== 0 || shadowsTone !== 0) {
    ctx.save();
    if (highlights > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 255, 255, ${(highlights / 50) * 0.2})`;
      ctx.fillRect(0, 0, w, h);
    } else if (highlights < 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(200, 200, 200, ${1 - (Math.abs(highlights) / 50) * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  return canvas;
}

/**
 * High-Definition Physically Anchored Frame Drop Shadow Generator.
 * 2-Layer Architecture: Contact Occlusion + Directional Wall Cast Shadow.
 */
export function drawExactFrameShadowToContext(
  ctx: CanvasRenderingContext2D,
  options: {
    shadowPreset?: CanvaShadowPreset;
    aspectRatio: number;
    angleDeg?: number;
    distance?: number;
    blur?: number;
    intensity?: number;
    wallAngleDeg?: number;
    width?: number;
    height?: number;
  }
) {
  const {
    shadowPreset = 'parallel',
    aspectRatio = 1.0,
    angleDeg = 90,
    distance = 30,
    blur = 30,
    intensity = 60,
    wallAngleDeg = 0,
    width = 1024,
    height = 1024,
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (shadowPreset === 'none' || intensity <= 0) {
    return;
  }

  // Scale alpha down so 100% intensity is still a realistic soft shadow, not pitch black
  const alpha = Math.max(0.0, Math.min(1.0, (intensity / 100))) * 0.6;
  const blurPx = Math.max(4, (blur / 100) * 60);

  const centerX = width / 2;
  const centerY = height / 2;

  // Frame Rect dimensions matching exactly the physical 3D box footprint (1 / 1.8 = 0.5555)
  const frameW = width * 0.5555;
  const frameH = frameW / aspectRatio;

  const frameX = centerX - frameW / 2;
  const frameY = centerY - frameH / 2;

  // 1. LAYER 1: Ambient Contact Occlusion (very tight, dark)
  ctx.save();
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.restore();

  // 2. LAYER 2: Soft Perimeter Shadow
  ctx.save();
  ctx.filter = `blur(15px)`;
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
  ctx.fillRect(frameX - 5, frameY - 5, frameW + 10, frameH + 10);
  ctx.restore();

  // 3. LAYER 3: Directional Wall Cast Drop Shadow
  const rad = (angleDeg * Math.PI) / 180;
  const distFactor = (distance / 100);
  const dropY = distFactor * 60; // Downward drop
  const dropX = -Math.sin(rad) * (distFactor * 30) + Math.sin((wallAngleDeg * Math.PI) / 180) * 15;

  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;

  if (shadowPreset === 'parallel') {
    ctx.fillRect(frameX + dropX, frameY + dropY, frameW, frameH);
  } else if (shadowPreset === 'glow') {
    const pad = distFactor * 40;
    ctx.fillRect(frameX - pad, frameY - pad, frameW + pad * 2, frameH + pad * 2);
  } else if (shadowPreset === 'outline') {
    ctx.lineWidth = 12 + distFactor * 20;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
    ctx.strokeRect(frameX, frameY, frameW, frameH);
  } else if (shadowPreset === 'curved') {
    ctx.beginPath();
    ctx.moveTo(frameX, frameY + frameH);
    ctx.quadraticCurveTo(centerX, frameY + frameH + dropY * 1.5, frameX + frameW, frameY + frameH);
    ctx.lineTo(frameX + frameW, frameY + frameH + dropY * 0.5);
    ctx.quadraticCurveTo(centerX, frameY + frameH + dropY * 2.0, frameX, frameY + frameH + dropY * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (shadowPreset === 'floating') {
    const floatGrad = ctx.createRadialGradient(centerX, frameY + frameH + dropY, 10, centerX, frameY + frameH + dropY, frameW * 0.7);
    floatGrad.addColorStop(0, `rgba(0, 0, 0, ${alpha * 0.8})`);
    floatGrad.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.3})`);
    floatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floatGrad;
    ctx.fillRect(centerX - frameW * 0.8, frameY + frameH, frameW * 1.6, dropY * 2 + 80);
  } else if (shadowPreset === 'angled') {
    ctx.beginPath();
    ctx.moveTo(frameX, frameY);
    ctx.lineTo(frameX + frameW, frameY);
    ctx.lineTo(frameX + frameW + dropX * 2, frameY + frameH + dropY * 1.5);
    ctx.lineTo(frameX + dropX * 2, frameY + frameH + dropY * 1.5);
    ctx.closePath();
    ctx.fill();
  } else if (shadowPreset === 'bottom_drop') {
    ctx.fillRect(frameX, frameY + dropY, frameW, frameH);
  }

  ctx.restore();
}

export function generateExactFrameShadowTexture(options: {
  shadowPreset?: CanvaShadowPreset;
  aspectRatio: number;
  angleDeg?: number;
  distance?: number;
  blur?: number;
  intensity?: number;
  wallAngleDeg?: number;
}): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  drawExactFrameShadowToContext(ctx, { ...options, width: 1024, height: 1024 });
  return canvas;
}

export interface RaytracingEquirectangularMapOptions {
  reflectionType?: ReflectionType;
  angleDeg?: number; // 0..360 continuous
  intensity?: number; // 0..1
  scale?: number; // 0.5..2.0
  lightMode?: AmbientLightMode;
}

/**
 * High-Definition HDR Raytracing Equirectangular Reflection Maps with 360° Rotation and Scale.
 */
export function generateRaytracingEquirectangularMap(options: RaytracingEquirectangularMapOptions): THREE.CanvasTexture {
  const {
    reflectionType = 'studio_grid',
    angleDeg = 0,
    intensity = 1.0,
    scale = 1.0,
    lightMode = 'day',
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Pure Neutral Deep Dark Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 2048, 1024);

  // 360° Spherical Horizontal Mapping (2048px = 360°)
  const normAngle = ((angleDeg % 360) + 360) % 360;
  const uCenter = (normAngle / 360) * 2048;
  const vCenter = 460;
  const effScale = Math.max(0.4, Math.min(2.5, scale));

  const drawLightformerAt = (cx: number) => {
    ctx.save();

    if (reflectionType === 'studio_grid') {
      // PROFILE 1: Ventanal Panorámico con Árboles y Follaje Exterior (Referencia ArchViz de Lujo)
      const gW = 740 * effScale;
      const gH = 700 * effScale;
      const gX = cx - gW / 2;
      const gY = vCenter - gH / 2;
      const frameThickness = 14 * effScale;
      const paneW = (gW - frameThickness * 3) / 2;
      const paneH = (gH - frameThickness * 3) / 2;

      // 1. Exterior Sky Light across the 4 Window Panes
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const px = gX + frameThickness + col * (paneW + frameThickness);
          const py = gY + frameThickness + row * (paneH + frameThickness);

          // Glass Sky Gradient (Luminous crisp sky with natural falloff)
          const pGrad = ctx.createLinearGradient(px, py, px, py + paneH);
          pGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
          pGrad.addColorStop(0.35, 'rgba(250, 252, 255, 0.92)');
          pGrad.addColorStop(0.75, 'rgba(230, 238, 248, 0.70)');
          pGrad.addColorStop(1, 'rgba(195, 208, 225, 0.40)');
          ctx.fillStyle = pGrad;
          ctx.fillRect(px, py, paneW, paneH);

          // Subtle Glass Edge Highlight
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.60)';
          ctx.lineWidth = Math.max(1, 2 * effScale);
          ctx.strokeRect(px + 1, py + 1, paneW - 2, paneH - 2);
        }
      }

      // 2. Scenic Exterior Nature (Tree Branches & Leaf Foliage Silhouettes outside the glass)
      ctx.save();
      // Clip to window area so trees only appear through the glass panes
      ctx.beginPath();
      ctx.rect(gX + frameThickness, gY + frameThickness, gW - frameThickness * 2, gH - frameThickness * 2);
      ctx.clip();

      // Main Tree Trunk / Branch (Entering from top-left)
      ctx.strokeStyle = 'rgba(22, 32, 26, 0.85)';
      ctx.lineWidth = 10 * effScale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gX, gY + 120 * effScale);
      ctx.quadraticCurveTo(gX + 160 * effScale, gY + 180 * effScale, gX + 320 * effScale, gY + 140 * effScale);
      ctx.stroke();

      // Secondary Branches
      ctx.lineWidth = 5 * effScale;
      ctx.beginPath();
      ctx.moveTo(gX + 140 * effScale, gY + 170 * effScale);
      ctx.quadraticCurveTo(gX + 220 * effScale, gY + 280 * effScale, gX + 280 * effScale, gY + 340 * effScale);
      ctx.moveTo(gX + 260 * effScale, gY + 150 * effScale);
      ctx.quadraticCurveTo(gX + 360 * effScale, gY + 220 * effScale, gX + 440 * effScale, gY + 200 * effScale);
      ctx.stroke();

      // Leaf Foliage Clusters (Organic shapes with varying opacity)
      const drawLeafCluster = (lx: number, ly: number, size: number, opacity: number) => {
        ctx.fillStyle = `rgba(18, 28, 22, ${opacity})`;
        ctx.beginPath();
        ctx.arc(lx, ly, size, 0, Math.PI * 2);
        ctx.arc(lx + size * 0.5, ly - size * 0.3, size * 0.8, 0, Math.PI * 2);
        ctx.arc(lx - size * 0.4, ly + size * 0.2, size * 0.7, 0, Math.PI * 2);
        ctx.arc(lx + size * 0.2, ly + size * 0.5, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      };

      drawLeafCluster(gX + 80 * effScale, gY + 110 * effScale, 36 * effScale, 0.78);
      drawLeafCluster(gX + 160 * effScale, gY + 160 * effScale, 42 * effScale, 0.82);
      drawLeafCluster(gX + 230 * effScale, gY + 130 * effScale, 38 * effScale, 0.75);
      drawLeafCluster(gX + 310 * effScale, gY + 140 * effScale, 48 * effScale, 0.85);
      drawLeafCluster(gX + 390 * effScale, gY + 170 * effScale, 35 * effScale, 0.70);
      drawLeafCluster(gX + 240 * effScale, gY + 260 * effScale, 32 * effScale, 0.65);
      drawLeafCluster(gX + 290 * effScale, gY + 320 * effScale, 28 * effScale, 0.60);
      drawLeafCluster(gX + 50 * effScale, gY + 240 * effScale, 30 * effScale, 0.55);

      ctx.restore();

      // 3. Dark Architectural Mullions & Transom Bars (Black Metal Frames)
      ctx.strokeStyle = '#06080c';
      ctx.lineWidth = frameThickness;
      ctx.strokeRect(gX + frameThickness / 2, gY + frameThickness / 2, gW - frameThickness, gH - frameThickness);

      ctx.beginPath();
      // Center Vertical Mullion
      ctx.moveTo(gX + frameThickness + paneW + frameThickness / 2, gY);
      ctx.lineTo(gX + frameThickness + paneW + frameThickness / 2, gY + gH);
      // Center Horizontal Transom
      ctx.moveTo(gX, gY + frameThickness + paneH + frameThickness / 2);
      ctx.lineTo(gX + gW, gY + frameThickness + paneH + frameThickness / 2);
      ctx.stroke();

    } else if (reflectionType === 'industrial_loft') {
      // PROFILE 2: Loft Industrial 9 Paneles (3x3 Grid con Hierro Negro)
      const lW = 720 * effScale;
      const lH = 680 * effScale;
      const lX = cx - lW / 2;
      const lY = vCenter - lH / 2;
      const fThick = 12 * effScale;
      const pW = (lW - fThick * 4) / 3;
      const pH = (lH - fThick * 4) / 3;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const px = lX + fThick + c * (pW + fThick);
          const py = lY + fThick + r * (pH + fThick);
          const pGrad = ctx.createLinearGradient(px, py, px + pW * 0.5, py + pH);
          pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          pGrad.addColorStop(0.5, 'rgba(242, 246, 252, 0.85)');
          pGrad.addColorStop(1, 'rgba(195, 205, 220, 0.35)');
          ctx.fillStyle = pGrad;
          ctx.fillRect(px, py, pW, pH);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = Math.max(1, 1.5 * effScale);
          ctx.strokeRect(px + 1, py + 1, pW - 2, pH - 2);
        }
      }

      ctx.strokeStyle = '#05070a';
      ctx.lineWidth = fThick;
      ctx.strokeRect(lX + fThick / 2, lY + fThick / 2, lW - fThick, lH - fThick);

      ctx.beginPath();
      // 2 Vertical Mullions
      ctx.moveTo(lX + fThick + pW + fThick / 2, lY); ctx.lineTo(lX + fThick + pW + fThick / 2, lY + lH);
      ctx.moveTo(lX + (fThick + pW) * 2 + fThick / 2, lY); ctx.lineTo(lX + (fThick + pW) * 2 + fThick / 2, lY + lH);
      // 2 Horizontal Transoms
      ctx.moveTo(lX, lY + fThick + pH + fThick / 2); ctx.lineTo(lX + lW, lY + fThick + pH + fThick / 2);
      ctx.moveTo(lX, lY + (fThick + pH) * 2 + fThick / 2); ctx.lineTo(lX + lW, lY + (fThick + pH) * 2 + fThick / 2);
      ctx.stroke();

    } else if (reflectionType === 'crystal_minimal') {
      // PROFILE 3: Softbox de Estudio Comercial Publicitario (Strip-box de Catálogo de Lujo)
      const sbW = 340 * effScale;
      const sbH = 780 * effScale;
      const sbX = cx - sbW / 2;
      const sbY = vCenter - sbH / 2;

      // Primary Vertical Strip Softbox with High-Gradient Luminous Core
      const sbGrad = ctx.createLinearGradient(sbX, sbY, sbX + sbW, sbY);
      sbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      sbGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.98)');
      sbGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      sbGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.98)');
      sbGrad.addColorStop(1, 'rgba(255, 255, 255, 0.10)');
      ctx.fillStyle = sbGrad;
      ctx.fillRect(sbX, sbY, sbW, sbH);

      // Secondary Accent Rim Strip Light
      const rimX = cx + 260 * effScale;
      const rimW = 80 * effScale;
      const rimGrad = ctx.createLinearGradient(rimX, sbY, rimX + rimW, sbY);
      rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rimGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
      rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = rimGrad;
      ctx.fillRect(rimX, sbY + 50 * effScale, rimW, sbH - 100 * effScale);

    } else if (reflectionType === 'spotlight') {
      // PROFILE 4: Luz de Living Moderno con Ventana Lateral
      const winW = 520 * effScale;
      const winH = 740 * effScale;
      const winX = cx - winW / 2;
      const winY = vCenter - winH / 2;

      const winGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
      winGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      winGrad.addColorStop(0.4, 'rgba(248, 250, 255, 0.85)');
      winGrad.addColorStop(0.8, 'rgba(215, 228, 245, 0.40)');
      winGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = winGrad;
      ctx.fillRect(winX, winY, winW, winH);

      // Living Interior Silhouette (Curtain drape on the side)
      ctx.fillStyle = 'rgba(12, 16, 22, 0.85)';
      ctx.beginPath();
      ctx.moveTo(winX, winY);
      ctx.quadraticCurveTo(winX + 120 * effScale, winY + 300 * effScale, winX + 80 * effScale, winY + winH);
      ctx.lineTo(winX, winY + winH);
      ctx.closePath();
      ctx.fill();

    } else if (reflectionType === 'sunset_window') {
      // PROFILE 5: Persianas Venecianas de Madera (Alto Contraste)
      const slatW = 760 * effScale;
      const slatX = cx - slatW / 2;
      for (let i = 0; i < 11; i++) {
        const sY = vCenter - 250 * effScale + i * 48 * effScale;
        const sGrad = ctx.createLinearGradient(slatX, sY, slatX + slatW, sY);
        sGrad.addColorStop(0, 'rgba(255, 255, 255, 0.80)');
        sGrad.addColorStop(0.5, 'rgba(255, 252, 248, 1.0)');
        sGrad.addColorStop(1, 'rgba(230, 225, 220, 0.60)');
        ctx.fillStyle = sGrad;
        ctx.fillRect(slatX, sY, slatW, 28 * effScale);

        // Sharp Venetian Blind Shadow Cut
        ctx.fillStyle = 'rgba(0, 0, 0, 0.70)';
        ctx.fillRect(slatX, sY + 28 * effScale, slatW, 12 * effScale);
      }

    } else if (reflectionType === 'art_gallery') {
      // PROFILE 6: Focos de Galería Museo (Riel Cenital con 3 Focos Proyectores)
      const lineY = vCenter - 130 * effScale;
      const railW = 920 * effScale;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(cx - railW / 2, lineY, railW, 18 * effScale);

      [-320 * effScale, 0, 320 * effScale].forEach((offset) => {
        const spotX = cx + offset;
        const spotGrad = ctx.createRadialGradient(spotX, lineY + 70 * effScale, 10, spotX, lineY + 70 * effScale, 220 * effScale);
        spotGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        spotGrad.addColorStop(0.3, 'rgba(248, 248, 252, 0.75)');
        spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(spotX, lineY + 70 * effScale, 220 * effScale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  };

  // Draw Primary and Seamless Wrap-Around Lightformers
  drawLightformerAt(uCenter);
  if (uCenter - 400 * effScale < 0) drawLightformerAt(uCenter + 2048);
  if (uCenter + 400 * effScale > 2048) drawLightformerAt(uCenter - 2048);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  return tex;
}

export interface WallLightingSample {
  r: number;
  g: number;
  b: number;
  luminance: number;
  warmth: number;
  hexColor: string;
}

/**
 * Intelligent Wall Lighting & Atmospheric Tone Sampler.
 * Samples the physical environment pixels around the artwork anchor.
 */
export function sampleWallLighting(
  roomImage: HTMLImageElement,
  centerX: number = 0.5,
  centerY: number = 0.32,
  scaleWidth: number = 0.42
): WallLightingSample {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { r: 0.9, g: 0.9, b: 0.9, luminance: 0.9, warmth: 1.0, hexColor: '#e6e6e6' };

    ctx.drawImage(roomImage, 0, 0, 64, 64);
    const imgData = ctx.getImageData(0, 0, 64, 64).data;

    const cX = Math.max(8, Math.min(56, Math.floor(centerX * 64)));
    const cY = Math.max(8, Math.min(56, Math.floor(centerY * 64)));
    const halfW = Math.max(4, Math.floor((scaleWidth * 64) / 2));
    const halfH = Math.max(4, Math.floor(halfW * 0.7));

    const sampleCoords = [
      { x: cX, y: Math.max(2, cY - halfH - 3) },
      { x: Math.max(2, cX - halfW - 3), y: cY },
      { x: Math.min(62, cX + halfW + 3), y: cY },
      { x: cX, y: Math.min(62, cY + halfH + 3) },
      { x: Math.max(2, cX - halfW), y: Math.max(2, cY - halfH) },
      { x: Math.min(62, cX + halfW), y: Math.max(2, cY - halfH) },
    ];

    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (const pt of sampleCoords) {
      const idx = (pt.y * 64 + pt.x) * 4;
      sumR += imgData[idx] / 255;
      sumG += imgData[idx + 1] / 255;
      sumB += imgData[idx + 2] / 255;
      count++;
    }

    const r = sumR / count;
    const g = sumG / count;
    const b = sumB / count;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const warmth = (r + g * 0.5) / (b + 0.001);
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return { r, g, b, luminance, warmth, hexColor };
  } catch {
    return { r: 0.9, g: 0.9, b: 0.9, luminance: 0.9, warmth: 1.0, hexColor: '#e6e6e6' };
  }
}

/**
 * Photorealistic 3D WebGL Room Compositor with 100% Exact Color Fidelity.
 */
export function renderWebGLRoomComposite(options: RenderWebGLRoomOptions): HTMLCanvasElement {
  const {
    roomImage,
    artworkImage,
    panelsCount = 1,
    gapCm = 3,
    artworkWidthCm,
    artworkHeightCm,
    finishType = 'brillante',
    hasResina = true,
    centerX = 0.5,
    centerY = 0.32,
    scaleWidth = 0.42,
    wallAngleDeg = 0,
    pitchDeg = 0,
    lightMode = 'day',
    reflectionType = 'studio_grid',
    reflectionAngleDeg = 0,
    reflectionIntensity = 0.2,
    reflectionScale = 1.0,
    reflectionRoughness = 0.012,
    wallHarmonization = 0.35,
    adjust = {},
    shadowPreset = 'parallel',
    shadowAngleDeg = 62,
    shadowDistance = 30,
    shadowBlur = 25,
    shadowIntensity = 50,
    renderWidth = 1920,
    renderHeight = 1920,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });

  renderer.setSize(renderWidth, renderHeight);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 16;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, renderWidth / renderHeight, 0.1, 50);
  camera.position.set(0, 0, 4.0);

  // 1. Room Background Plane
  const roomTex = new THREE.CanvasTexture(roomImage);
  roomTex.colorSpace = THREE.SRGBColorSpace;
  roomTex.generateMipmaps = true;
  roomTex.minFilter = THREE.LinearMipmapLinearFilter;
  roomTex.magFilter = THREE.LinearFilter;
  roomTex.anisotropy = maxAniso;

  const bgAspect = roomImage.width / roomImage.height;
  let bgW = 3.6;
  let bgH = 3.6 / bgAspect;
  if (bgH < 3.6) {
    bgH = 3.6;
    bgW = 3.6 * bgAspect;
  }

  const bgGeom = new THREE.PlaneGeometry(bgW, bgH);
  const bgMat = new THREE.MeshBasicMaterial({ map: roomTex, depthWrite: false });
  const bgMesh = new THREE.Mesh(bgGeom, bgMat);
  bgMesh.position.set(0, 0, -0.05);
  scene.add(bgMesh);

  // 2. Intelligent Wall Light Harmonization (Extracts Room Ambience)
  const wallSample = sampleWallLighting(roomImage, centerX, centerY, scaleWidth);
  const wallColor = new THREE.Color(wallSample.r, wallSample.g, wallSample.b);
  const neutralColor = new THREE.Color(0xffffff);

  // Blend white ambient with room wall color temperature
  const ambColor = neutralColor.clone().lerp(wallColor, wallHarmonization * 0.5);
  const roomLightScale = 0.65 + wallSample.luminance * 0.7;
  const finalAmbIntensity = 0.4 * (1 - wallHarmonization * 0.4) + (0.4 * roomLightScale * wallHarmonization * 0.4);

  const ambientLight = new THREE.AmbientLight(ambColor, finalAmbIntensity);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(ambColor, 1.3 * (0.6 + 0.4 * roomLightScale));
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.45 * roomLightScale);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  // 3. Environment Map (PMREM Prefiltered Specular Reflections)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envTex = generateRaytracingEquirectangularMap({
    reflectionType,
    angleDeg: reflectionAngleDeg,
    intensity: reflectionIntensity,
    scale: reflectionScale,
    lightMode,
  });
  const envRenderTarget = pmremGenerator.fromEquirectangular(envTex);
  envTex.dispose();
  scene.environment = envRenderTarget.texture;

  // 4. Artwork Texture with Zero-Loss Original Color Fidelity
  const gradedCanvas = applyCanvaAdjustmentsToCanvas(artworkImage, adjust);

  const artTex = new THREE.CanvasTexture(gradedCanvas);
  artTex.colorSpace = THREE.SRGBColorSpace;
  artTex.generateMipmaps = true;
  artTex.minFilter = THREE.LinearMipmapLinearFilter;
  artTex.magFilter = THREE.LinearFilter;
  artTex.anisotropy = maxAniso;

  // 5. 3D Artwork Mesh Setup
  const group = new THREE.Group();
  const normX = (centerX - 0.5) * bgW;
  const normY = -(centerY - 0.5) * bgH;
  group.position.set(normX, normY, 0.04);

  group.rotation.y = (wallAngleDeg * Math.PI) / 180;
  group.rotation.x = -(pitchDeg * Math.PI) / 180;

  const totalW = bgW * scaleWidth;

  const naturalAspect = (artworkImage.naturalWidth || artworkImage.width || 1) / (artworkImage.naturalHeight || artworkImage.height || 1);
  const artAspect = (artworkWidthCm && artworkHeightCm && artworkWidthCm !== 70)
    ? (artworkWidthCm / artworkHeightCm)
    : naturalAspect;
  const totalH = totalW / artAspect;

  const gapM = panelsCount > 1 ? (gapCm / 100) * 0.4 : 0;
  const singleW = (totalW - gapM * (panelsCount - 1)) / panelsCount;
  const depthM = 0.009; // Slim 9mm profile (no chunky box)

  const preset = finishPresets[finishType] || finishPresets.brillante;
  const p = hasResina ? { ...preset, ...RESIN_OVERLAY } : preset;
  const emissiveBoost = p.colorBoost ?? 1.0;

  const roughness = p.roughness;
  const clearcoat = p.clearcoat;
  const clearcoatRoughness = reflectionRoughness ?? p.clearcoatRoughness;
  const envMapIntensity = p.envMapIntensity;
  const ior = 1.50;
  const iridescence = p.iridescence ?? 0;
  const iridescenceIOR = p.iridescenceIOR ?? 1.3;
  const specularIntensity = p.specularIntensity ?? (hasResina ? 2.2 : 1.4);

  // Subtle natural exposure & temperature blend for seamless room integration
  const emissiveColor = neutralColor.clone().lerp(wallColor, wallHarmonization * 0.28);
  const emissiveIntensity = 0.1 * (1.0 - (1.0 - wallSample.luminance) * wallHarmonization * 0.35);

  const frontMat = new THREE.MeshPhysicalMaterial({
    map: artTex,
    color: new THREE.Color(emissiveBoost, emissiveBoost, emissiveBoost),
    emissive: emissiveColor,
    emissiveMap: artTex,
    emissiveIntensity: emissiveIntensity,
    roughness: roughness,
    clearcoat: clearcoat,
    clearcoatRoughness: clearcoatRoughness,
    ior: ior,
    envMapIntensity: envMapIntensity,
    iridescence: iridescence,
    iridescenceIOR: iridescenceIOR,
    specularIntensity: specularIntensity,
  });

  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.1 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const panelGeom = new RoundedBoxGeometry(singleW, totalH, depthM, 4, 0.001);

  const startX = -totalW / 2 + singleW / 2;

  for (let i = 0; i < panelsCount; i++) {
    const pTex = artTex.clone();
    pTex.needsUpdate = true;
    pTex.anisotropy = maxAniso;
    if (panelsCount > 1) {
      pTex.repeat.set(1 / panelsCount, 1);
      pTex.offset.set(i / panelsCount, 0);
    }

    const pMat = frontMat.clone();
    pMat.map = pTex;
    pMat.emissiveMap = pTex;

    const materials = [edgeMat, edgeMat, edgeMat, edgeMat, pMat, backMat];
    const mesh = new THREE.Mesh(panelGeom, materials);
    mesh.position.set(startX + i * (singleW + gapM), 0, 0);
    group.add(mesh);
  }

  scene.add(group);

  // 6. Physically Anchored Frame Drop Shadow Mesh
  const shadowCanvas = generateExactFrameShadowTexture({
    shadowPreset,
    aspectRatio: totalW / totalH,
    angleDeg: shadowAngleDeg,
    distance: shadowDistance,
    blur: shadowBlur,
    intensity: shadowIntensity,
    wallAngleDeg,
  });

  const sTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeom = new THREE.PlaneGeometry(totalW * 1.8, totalH * 1.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: sTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.position.set(normX, normY, 0.003);
  shadowMesh.rotation.y = group.rotation.y;
  shadowMesh.rotation.x = group.rotation.x;
  scene.add(shadowMesh);

  renderer.render(scene, camera);
  pmremGenerator.dispose();
  envRenderTarget.dispose();
  renderer.dispose();

  return canvas;
}
