import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import {
  AmbientLightMode,
  ReflectionType,
  ReflectionDirection,
  CanvaShadowPreset,
  CanvaImageAdjustOptions,
} from '../types/catalog';
import { LightSource3D, PerspectiveQuad } from '../types/environment';
import { finishPresets, RESIN_OVERLAY } from '../components/configurador3d/finishPresets';
import {
  applyColorGrading,
  applyCanvaAdjustmentsToCanvas,
  isAdjustDefault,
} from './colorGrading';

export type { CanvaImageAdjustOptions };
export { applyColorGrading, applyCanvaAdjustmentsToCanvas, isAdjustDefault };

export function getReflectionTypeForEnvironment(category?: string): ReflectionType {
  if (category === 'galeria') return 'gallery_track';
  if (category === 'oficina') return 'industrial_loft';
  if (category === 'dormitorio') return 'warm_lamp';
  if (category === 'hall') return 'french_window';
  if (category === 'living') return 'panoramic_window';
  return 'panoramic_window';
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
      roughness: vinyl.roughness ?? 0.10,
      clearcoat: vinyl.clearcoat ?? 0.88,
      clearcoatRoughness: vinyl.clearcoatRoughness ?? 0.03,
      envMapIntensity: (vinyl.envMapIntensity ?? 2.2) * reflectionIntensity,
      specularIntensity: (vinyl.specularIntensity ?? 1.9) * reflectionIntensity,
      iridescence: vinyl.iridescence ?? 0,
      iridescenceIOR: vinyl.iridescenceIOR ?? 1.3,
    };
  }

  // Resin is intentionally colourless. Do not apply the vinyl's iridescence
  // here: the real tornasolado workflow will use its own production mask.
  return {
    roughness: RESIN_OVERLAY.roughness ?? 0.002,
    clearcoat: (RESIN_OVERLAY.clearcoat ?? 1.0) * strength,
    clearcoatRoughness: RESIN_OVERLAY.clearcoatRoughness ?? 0.002,
    envMapIntensity: (RESIN_OVERLAY.envMapIntensity ?? 6.0) * strength,
    specularIntensity: (RESIN_OVERLAY.specularIntensity ?? 3.0) * strength,
    iridescence: 0,
    iridescenceIOR: 1.3,
  };
}

/**
 * Generates a 3D line wireframe grid with true converging vanishing perspective between the 4 corners of wallQuad.
 */
export function createWallQuadGridGeometry(
  wallQuad: PerspectiveQuad,
  bgW: number,
  bgH: number,
  divisions = 16
): THREE.BufferGeometry {
  const pTL = new THREE.Vector3((wallQuad.topLeft.x - 0.5) * bgW, -(wallQuad.topLeft.y - 0.5) * bgH, 0.002);
  const pTR = new THREE.Vector3((wallQuad.topRight.x - 0.5) * bgW, -(wallQuad.topRight.y - 0.5) * bgH, 0.002);
  const pBR = new THREE.Vector3((wallQuad.bottomRight.x - 0.5) * bgW, -(wallQuad.bottomRight.y - 0.5) * bgH, 0.002);
  const pBL = new THREE.Vector3((wallQuad.bottomLeft.x - 0.5) * bgW, -(wallQuad.bottomLeft.y - 0.5) * bgH, 0.002);

  const gridPoints: THREE.Vector3[] = [];
  // Converging vertical lines from top edge to bottom edge
  for (let i = 0; i <= divisions; i++) {
    const u = i / divisions;
    const top = pTL.clone().lerp(pTR, u);
    const bot = pBL.clone().lerp(pBR, u);
    gridPoints.push(top, bot);
  }
  // Converging horizontal lines from left edge to right edge
  for (let j = 0; j <= divisions; j++) {
    const v = j / divisions;
    const left = pTL.clone().lerp(pBL, v);
    const right = pTR.clone().lerp(pBR, v);
    gridPoints.push(left, right);
  }

  return new THREE.BufferGeometry().setFromPoints(gridPoints);
}

/**
 * Draws true converging vanishing perspective grid lines on a 2D canvas context.
 */
export function drawPerspectiveWallGrid(
  ctx: CanvasRenderingContext2D,
  wallQuad: PerspectiveQuad,
  width: number,
  height: number,
  divisions = 16,
  strokeColor = 'rgba(56, 189, 248, 0.4)',
  lineWidth = 1.5
) {
  const pTL = { x: wallQuad.topLeft.x * width, y: wallQuad.topLeft.y * height };
  const pTR = { x: wallQuad.topRight.x * width, y: wallQuad.topRight.y * height };
  const pBR = { x: wallQuad.bottomRight.x * width, y: wallQuad.bottomRight.y * height };
  const pBL = { x: wallQuad.bottomLeft.x * width, y: wallQuad.bottomLeft.y * height };

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  // Vertical lines from top to bottom
  for (let i = 0; i <= divisions; i++) {
    const u = i / divisions;
    const tx = pTL.x + u * (pTR.x - pTL.x);
    const ty = pTL.y + u * (pTR.y - pTL.y);
    const bx = pBL.x + u * (pBR.x - pBL.x);
    const by = pBL.y + u * (pBR.y - pBL.y);
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx, by);
  }

  // Horizontal lines from left to right
  for (let j = 0; j <= divisions; j++) {
    const v = j / divisions;
    const lx = pTL.x + v * (pBL.x - pTL.x);
    const ly = pTL.y + v * (pBL.y - pTL.y);
    const rx = pTR.x + v * (pBR.x - pTR.x);
    const ry = pTR.y + v * (pBR.y - pTR.y);
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
  }

  ctx.stroke();
  ctx.restore();
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
  placementMode?: 'wall' | 'shelf';
  lightSource3D?: { x: number; y: number; z: number };
  lightsList?: LightSource3D[];
  wallAngleDeg?: number; // -60..60 degrees
  pitchDeg?: number; // -75..75 degrees
  rollDeg?: number; // -180..180 degrees (Z-rotation, default 0)
  thicknessCm?: number; // Frame depth in cm (default 1.0, range 0.1 to 12.0)
  zDistance?: number; // Distance from wall in cm (default 0)
  resinGloss?: number; // 0..1 (default 0.85)
  lightMode?: AmbientLightMode;
  reflectionType?: ReflectionType;
  reflectionDirection?: ReflectionDirection;
  reflectionAngleDeg?: number; // 0..360
  reflectionIntensity?: number; // 0..1
  reflectionScale?: number; // 0.5..2.0
  reflectionRoughness?: number; // 0.02..0.30
  reflectionBrightness?: number; // -50..50
  reflectionContrast?: number; // -50..50
  weatherPreset?: 'morning' | 'warm_afternoon' | 'intimate_night' | 'sunny_contrast' | 'overcast_soft' | string;
  shelfContactShadow?: boolean;
  /** @deprecated Use ambient lighting and color adjustments instead */
  wallHarmonization?: number; // 0..1 (default 0.35)

  // Ceiling Lights & Sun Engine
  ceilingLightsEnabled?: boolean;
  ceilingLightTemp?: 'warm' | 'neutral' | 'cool';
  sunIntensity?: number; // 0..200, default 100
  wallQuad?: PerspectiveQuad;
  showWallGrid?: boolean;
  isWallAnchored?: boolean;
  wallCalibratedAngle?: number;
  wallCalibratedPitch?: number;

  // Complete Canva Image Adjustment
  adjust?: CanvaImageAdjustOptions;
  adjustBg?: CanvaImageAdjustOptions;
  bgAdjust?: CanvaImageAdjustOptions;
  vignette?: number;

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
 * Generates wrapped canvas edge textures for the 4 sides of a frame panel.
 * Extracts physical rim borders from the active artwork canvas.
 */
export function createWrappedEdgeTextures(
  sourceCanvas: HTMLCanvasElement,
  panelWidthCm: number = 60,
  panelHeightCm: number = 80,
  panelThicknessCm: number = 1.0,
  maxAnisotropy: number = 16
): THREE.CanvasTexture[] {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const clampedThick = Math.max(0.1, Math.min(12.0, panelThicknessCm));
  const horizStripPx = Math.max(4, Math.min(Math.floor(W * 0.45), Math.round((W * clampedThick) / Math.max(panelWidthCm, 1))));
  const vertStripPx = Math.max(4, Math.min(Math.floor(H * 0.45), Math.round((H * clampedThick) / Math.max(panelHeightCm, 1))));

  const mk = (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dw: number,
    dh: number,
    isVerticalEdge: boolean
  ) => {
    const c = document.createElement('canvas');
    c.width = dw;
    c.height = dh;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, dw, dh);

      // Ambient Occlusion crease / inner bevel gradients for physical depth & corner folds
      ctx.save();
      if (!isVerticalEdge) {
        // Left & Right side faces: dw is thickness (front-to-back), dh is 256 (height)
        const bevelSize = Math.max(2, Math.min(Math.round(dw * 0.35), 14));

        // Front border dark gradient (crease / inner bevel)
        const frontGrad = ctx.createLinearGradient(0, 0, bevelSize, 0);
        frontGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        frontGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = frontGrad;
        ctx.fillRect(0, 0, bevelSize, dh);

        // Rear border dark gradient (ambient contact occlusion)
        const rearGrad = ctx.createLinearGradient(dw, 0, dw - bevelSize, 0);
        rearGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        rearGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rearGrad;
        ctx.fillRect(dw - bevelSize, 0, bevelSize, dh);

        // Corner folds on top and bottom limits
        const cornerH = Math.min(14, Math.round(dh * 0.06));
        const topFold = ctx.createLinearGradient(0, 0, 0, cornerH);
        topFold.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        topFold.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topFold;
        ctx.fillRect(0, 0, dw, cornerH);

        const botFold = ctx.createLinearGradient(0, dh, 0, dh - cornerH);
        botFold.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        botFold.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = botFold;
        ctx.fillRect(0, dh - cornerH, dw, cornerH);
      } else {
        // Top & Bottom edges: dw is 256 (width), dh is thickness (front-to-back)
        const bevelSize = Math.max(2, Math.min(Math.round(dh * 0.35), 14));

        // Front border dark gradient
        const frontGrad = ctx.createLinearGradient(0, 0, 0, bevelSize);
        frontGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        frontGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = frontGrad;
        ctx.fillRect(0, 0, dw, bevelSize);

        // Rear border dark gradient
        const rearGrad = ctx.createLinearGradient(0, dh, 0, dh - bevelSize);
        rearGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        rearGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rearGrad;
        ctx.fillRect(0, dh - bevelSize, dw, bevelSize);

        // Corner folds on left and right limits
        const cornerW = Math.min(14, Math.round(dw * 0.06));
        const leftFold = ctx.createLinearGradient(0, 0, cornerW, 0);
        leftFold.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        leftFold.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = leftFold;
        ctx.fillRect(0, 0, cornerW, dh);

        const rightFold = ctx.createLinearGradient(dw, 0, dw - cornerW, 0);
        rightFold.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        rightFold.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rightFold;
        ctx.fillRect(dw - cornerW, 0, cornerW, dh);
      }
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  };

  // Face index mapping for Three.js BoxGeometry / RoundedBoxGeometry:
  // 0: +X (Right side edge)
  // 1: -X (Left side edge)
  // 2: +Y (Top edge)
  // 3: -Y (Bottom edge)
  return [
    mk(W - horizStripPx, 0, horizStripPx, H, horizStripPx, 256, false), // Right
    mk(0, 0, horizStripPx, H, horizStripPx, 256, false),                // Left
    mk(0, 0, W, vertStripPx, 256, vertStripPx, true),                 // Top
    mk(0, H - vertStripPx, W, vertStripPx, 256, vertStripPx, true),   // Bottom
  ];
}

export interface FrameShadowOptions {
  shadowPreset?: CanvaShadowPreset;
  aspectRatio: number;
  angleDeg?: number;
  distance?: number;
  blur?: number;
  intensity?: number;
  wallAngleDeg?: number;
  pitchDeg?: number;
  rollDeg?: number;
  zDistance?: number;
  shelfContactShadow?: boolean;
  shadowColor?: string;
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
}

/**
 * Clean Single Physical Drop Shadow Generator.
 * Calculates a single continuous perspective-projected soft shadow directly
 * from the light vector on the wall plane, eliminating multi-layer overlapping box artifacts.
 */
export function drawExactFrameShadowToContext(
  ctx: CanvasRenderingContext2D,
  options: FrameShadowOptions
) {
  const {
    shadowPreset = 'parallel',
    aspectRatio = 1.0,
    angleDeg = 90,
    distance = 30,
    blur = 30,
    intensity = 60,
    wallAngleDeg = 0,
    pitchDeg = 0,
    rollDeg = 0,
    zDistance = 0,
    shelfContactShadow = false,
    shadowColor = '#000000',
    offsetX = 0,
    offsetY = 0,
    width = 1024,
    height = 1024,
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (shadowPreset === 'none' || intensity <= 0) {
    return;
  }

  const zFactor = Math.max(0, Math.min(8.0, zDistance ?? 0));
  // Proximity & Z attenuation
  const distanceBlurMult = 0.5 + zFactor * 0.45;
  const distanceAlphaMult = 1.0 / (1.0 + zFactor * 0.15);

  // Clamped pitch range [-75..75]
  const clampedPitch = Math.max(-75, Math.min(75, pitchDeg ?? 0));
  const pitchRad = (clampedPitch * Math.PI) / 180;
  const pitchTiltFactor = Math.abs(clampedPitch) / 75;

  // Dynamic range intensity: normalized to [0..1]
  const normIntensity = Math.max(0.0, Math.min(1.0, intensity / 100));
  const alpha = Math.min(1.0, normIntensity * distanceAlphaMult * 0.95);

  // Blur covers 0px (razor sharp line) to 150px (ultra-soft diffuse cloud at 100%)
  const normBlur = Math.max(0.0, Math.min(1.0, blur / 100));
  const tiltBlurAdd = normBlur > 0 ? pitchTiltFactor * 20 * normBlur : 0;
  const blurPx = normBlur === 0 ? 0 : Math.max(0, (normBlur * 120 + tiltBlurAdd) * distanceBlurMult);

  const getBlurFilter = (px: number) => {
    const rounded = Math.round(px * 10) / 10;
    return rounded <= 0.2 ? 'none' : `blur(${rounded}px)`;
  };

  const centerX = width / 2;
  const centerY = height / 2;

  // Frame Rect dimensions matching physical 3D box footprint (1 / 1.8 = 0.5555)
  const frameW = width * 0.5555;
  const frameH = frameW / Math.max(0.05, aspectRatio);

  const frameX = centerX - frameW / 2;
  const frameY = centerY - frameH / 2;

  // Perspective deformation under pitch angles up to +-75 degrees
  const pitchCos = Math.max(0.18, Math.cos(pitchRad));
  const taperFactor = Math.sin(pitchRad) * 0.45;
  const topScale = Math.max(0.2, 1.0 + taperFactor);
  const bottomScale = Math.max(0.2, 1.0 - taperFactor);
  const projH = frameH * pitchCos;

  // Directional projection offset calculated from angleDeg (+X right, +Y down) combined with manual offsets
  const rad = (angleDeg * Math.PI) / 180;
  const normDistance = Math.max(0.0, Math.min(1.0, distance / 100));
  const baseDistPx = normDistance * 85 * (1.0 + zFactor * 0.25);

  const manualOffsetX = (offsetX / 100) * 120;
  const manualOffsetY = (offsetY / 100) * 120;

  let dropX = Math.cos(rad) * baseDistPx + manualOffsetX;
  let dropY = Math.sin(rad) * baseDistPx + manualOffsetY;

  // At distance 0 with 0 manual offset: strictly zero offset, shadow hugs vertices
  if (distance === 0 && offsetX === 0 && offsetY === 0) {
    dropX = 0;
    dropY = 0;
  }

  const totalOffset = Math.hypot(dropX, dropY);
  if (totalOffset > 150) {
    const s = 150 / totalOffset;
    dropX *= s;
    dropY *= s;
  }

  // 4 perspective-deformed corner coordinates on projected wall surface
  const topHalfW = (frameW * topScale) / 2;
  const botHalfW = (frameW * bottomScale) / 2;
  const halfProjH = projH / 2;

  const tl_x = centerX - topHalfW + dropX;
  const tl_y = centerY - halfProjH + dropY;
  const tr_x = centerX + topHalfW + dropX;
  const tr_y = centerY - halfProjH + dropY;
  const br_x = centerX + botHalfW + dropX;
  const br_y = centerY + halfProjH + dropY;
  const bl_x = centerX - botHalfW + dropX;
  const bl_y = centerY + halfProjH + dropY;

  const drawQuad = (
    c: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineTo(x3, y3);
    c.closePath();
    c.fill();
  };

  // 1. Ambient Occlusion (AO) Contact Perimeter Shadow directly under the frame
  if (normIntensity > 0.05) {
    const contactAlpha = Math.min(0.85, normIntensity * 0.75 * (1.0 / (1.0 + zFactor * 0.3)));
    ctx.save();
    ctx.filter = getBlurFilter(Math.max(2, 6 * (1.0 - normBlur * 0.4)));
    ctx.fillStyle = `rgba(0, 0, 0, ${contactAlpha})`;
    drawQuad(
      ctx,
      centerX - topHalfW,
      centerY - halfProjH,
      centerX + topHalfW,
      centerY - halfProjH,
      centerX + botHalfW,
      centerY + halfProjH,
      centerX - botHalfW,
      centerY + halfProjH
    );
    ctx.restore();
  }

  // 2. Main Directional Soft Cast Penumbra Shadow
  ctx.save();
  ctx.filter = getBlurFilter(Math.max(4, blurPx));
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.85})`;

  if (shadowPreset === 'floating') {
    const floatCenterY = br_y + Math.max(8, dropY * 0.6);
    const floatGrad = ctx.createRadialGradient(
      centerX + dropX, floatCenterY, 6,
      centerX + dropX, floatCenterY, frameW * 0.75 * Math.max(0.6, bottomScale)
    );
    floatGrad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    floatGrad.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.45})`);
    floatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floatGrad;
    ctx.fillRect(
      centerX + dropX - frameW * 0.9,
      br_y - 4,
      frameW * 1.8,
      Math.max(40, Math.abs(dropY) * 2 + 85)
    );
  } else {
    // Default smooth perspective cast shadow
    drawQuad(ctx, tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y);
  }

  ctx.restore();

  // 3. Shelf contact ambient occlusion: grounds the frame directly on top of the wooden shelf/surface
  if (shelfContactShadow || zFactor < 0.8) {
    ctx.save();
    ctx.filter = 'none';
    const bottomW = Math.max(10, br_x - bl_x);
    const contactH = Math.max(6, Math.min(18, 8 + normIntensity * 10));

    // Soft Ambient Occlusion penumbra under bottom edge onto shelf
    const contactGrad = ctx.createLinearGradient(0, br_y - 2, 0, br_y + contactH);
    contactGrad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(0.95, normIntensity * 1.15)})`);
    contactGrad.addColorStop(0.35, `rgba(0, 0, 0, ${Math.min(0.65, normIntensity * 0.65)})`);
    contactGrad.addColorStop(0.75, `rgba(0, 0, 0, ${Math.min(0.20, normIntensity * 0.25)})`);
    contactGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = contactGrad;
    ctx.beginPath();
    ctx.ellipse(
      bl_x + bottomW / 2,
      br_y + contactH * 0.35,
      bottomW * 0.52,
      contactH * 0.65,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Razor-sharp 1.5px baseline occlusion line directly touching the wood
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1.0, normIntensity * 1.3)})`;
    ctx.fillRect(bl_x + 1, br_y - 1, bottomW - 2, 2);

    ctx.restore();
  }
}

export function generateExactFrameShadowTexture(options: FrameShadowOptions): HTMLCanvasElement {
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
  weatherPreset?: 'morning' | 'warm_afternoon' | 'intimate_night' | 'sunny_contrast' | 'overcast_soft' | string;
  reflectionBrightness?: number;
  reflectionContrast?: number;
  ceilingLightsEnabled?: boolean;
  ceilingLightTemp?: 'warm' | 'neutral' | 'cool';
  warmLampEnabled?: boolean;
}

/**
 * High-Definition HDR Raytracing Equirectangular Reflection Maps with 360° Rotation,
 * 8 Architectural Window Presets, and Industrial Ceiling Lights.
 */
export function generateRaytracingEquirectangularMap(options: RaytracingEquirectangularMapOptions): THREE.CanvasTexture {
  const {
    reflectionType = 'panoramic_window',
    angleDeg = 0,
    intensity = 1.0,
    scale = 1.0,
    lightMode = 'day',
    weatherPreset,
    reflectionBrightness = 0,
    reflectionContrast = 0,
    ceilingLightsEnabled,
    ceilingLightTemp = 'neutral',
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

  // Resolve style and aliases
  let resolvedStyle: string = reflectionType;
  if (resolvedStyle === 'loft') resolvedStyle = 'industrial_loft';
  else if (resolvedStyle === 'estudio' || resolvedStyle === 'modern_window' || resolvedStyle === 'crystal_minimal') resolvedStyle = 'panoramic_window';
  else if (resolvedStyle === 'galeria' || resolvedStyle === 'art_gallery') resolvedStyle = 'gallery_track';
  else if (resolvedStyle === 'ventanal_noche' || resolvedStyle === 'spotlight') resolvedStyle = 'warm_lamp';
  else if (resolvedStyle === 'studio_grid' || resolvedStyle === 'sunset_window') resolvedStyle = 'sunny_balcony';

  const drawLightformerAt = (cx: number) => {
    ctx.save();

    if (resolvedStyle === 'industrial_loft') {
      // 1. INDUSTRIAL LOFT: Complete Architectural Room Scene with Grid Windows, Concrete Pillars, Leather Lounge Armchairs, and Warm Pendant Fixtures
      const roomW = 1200 * effScale;
      const roomH = 880 * effScale;
      const rX = cx - roomW * 0.5;
      const rY = vCenter - roomH * 0.5;

      // --- A. Left High-Rise Industrial Window (3 columns x 4 rows black iron grid) ---
      const winW = 440 * effScale;
      const winH = 740 * effScale;
      const winX = rX + 40 * effScale;
      const winY = rY + 40 * effScale;
      const fThick = 10 * effScale;
      const pW = (winW - fThick * 4) / 3;
      const pH = (winH - fThick * 5) / 4;

      // Window panes with sky/daylight gradient
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          const px = winX + fThick + col * (pW + fThick);
          const py = winY + fThick + row * (pH + fThick);
          const pGrad = ctx.createLinearGradient(px, py, px + pW * 0.4, py + pH);
          pGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
          pGrad.addColorStop(0.35, 'rgba(240, 248, 255, 0.92)');
          pGrad.addColorStop(0.75, 'rgba(215, 230, 248, 0.70)');
          pGrad.addColorStop(1, 'rgba(180, 200, 225, 0.40)');
          ctx.fillStyle = pGrad;
          ctx.fillRect(px, py, pW, pH);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = Math.max(1, 1.5 * effScale);
          ctx.strokeRect(px + 1, py + 1, pW - 2, pH - 2);
        }
      }

      // Outer window black frame & mullions
      ctx.strokeStyle = '#05070a';
      ctx.lineWidth = fThick;
      ctx.strokeRect(winX + fThick / 2, winY + fThick / 2, winW - fThick, winH - fThick);

      ctx.beginPath();
      // 2 Vertical Mullions
      for (let c = 1; c <= 2; c++) {
        const mx = winX + c * (pW + fThick) + fThick / 2;
        ctx.moveTo(mx, winY); ctx.lineTo(mx, winY + winH);
      }
      // 3 Horizontal Transoms
      for (let r = 1; r <= 3; r++) {
        const my = winY + r * (pH + fThick) + fThick / 2;
        ctx.moveTo(winX, my); ctx.lineTo(winX + winW, my);
      }
      ctx.stroke();

      // --- B. Architectural Concrete Pillars (Cylindrical with volumetric lighting) ---
      // Pillar 1 (Main center-left column)
      const pil1X = winX + winW + 40 * effScale;
      const pil1W = 100 * effScale;
      const pil1Grad = ctx.createLinearGradient(pil1X, rY, pil1X + pil1W, rY);
      pil1Grad.addColorStop(0, 'rgba(200, 210, 220, 0.90)'); // lit face
      pil1Grad.addColorStop(0.35, 'rgba(150, 160, 175, 0.85)');
      pil1Grad.addColorStop(0.85, 'rgba(70, 78, 90, 0.80)');
      pil1Grad.addColorStop(1, 'rgba(35, 40, 48, 0.80)'); // shadow side
      ctx.fillStyle = pil1Grad;
      ctx.fillRect(pil1X, rY, pil1W, roomH);

      // Pillar 2 (Background distance column)
      const pil2X = pil1X + 280 * effScale;
      const pil2W = 85 * effScale;
      const pil2Grad = ctx.createLinearGradient(pil2X, rY, pil2X + pil2W, rY);
      pil2Grad.addColorStop(0, 'rgba(170, 180, 195, 0.75)');
      pil2Grad.addColorStop(0.4, 'rgba(120, 130, 145, 0.70)');
      pil2Grad.addColorStop(1, 'rgba(40, 46, 56, 0.70)');
      ctx.fillStyle = pil2Grad;
      ctx.fillRect(pil2X, rY, pil2W, roomH);

      // --- C. Interior Furniture Silhouettes & Perspective Reflections ---
      const floorY = winY + winH - 60 * effScale;
      const floorGrad = ctx.createLinearGradient(rX, floorY, rX, rY + roomH);
      floorGrad.addColorStop(0, 'rgba(30, 36, 45, 0.50)');
      floorGrad.addColorStop(0.3, 'rgba(20, 24, 32, 0.80)');
      floorGrad.addColorStop(1, 'rgba(10, 12, 16, 0.95)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(rX, floorY, roomW, rY + roomH - floorY);

      const drawArmchair = (ax: number, ay: number, aw: number, ah: number, isDark = false) => {
        ctx.save();
        const cGrad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
        if (isDark) {
          cGrad.addColorStop(0, 'rgba(45, 50, 60, 0.95)');
          cGrad.addColorStop(1, 'rgba(20, 24, 30, 0.95)');
        } else {
          cGrad.addColorStop(0, 'rgba(110, 95, 80, 0.95)'); // warm leather
          cGrad.addColorStop(0.5, 'rgba(75, 62, 52, 0.95)');
          cGrad.addColorStop(1, 'rgba(35, 28, 22, 0.95)');
        }
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah * 0.65, 8 * effScale);
        ctx.fill();

        ctx.fillStyle = isDark ? '#141820' : '#2b221a';
        ctx.beginPath();
        ctx.roundRect(ax - 6 * effScale, ay + ah * 0.45, aw + 12 * effScale, ah * 0.35, 6 * effScale);
        ctx.fill();

        ctx.strokeStyle = '#080a0e';
        ctx.lineWidth = Math.max(1.5, 3 * effScale);
        ctx.beginPath();
        ctx.moveTo(ax + 4 * effScale, ay + ah * 0.75); ctx.lineTo(ax - 8 * effScale, ay + ah);
        ctx.moveTo(ax + aw - 4 * effScale, ay + ah * 0.75); ctx.lineTo(ax + aw + 8 * effScale, ay + ah);
        ctx.stroke();
        ctx.restore();
      };

      // Lounge Chair 1 (Near window)
      drawArmchair(winX + winW * 0.2, floorY - 60 * effScale, 110 * effScale, 110 * effScale, false);
      // Lounge Chair 2 (Center)
      drawArmchair(pil1X + 40 * effScale, floorY - 45 * effScale, 95 * effScale, 95 * effScale, true);
      // Modern Low Coffee Table
      ctx.fillStyle = '#1c222b';
      ctx.fillRect(winX + winW * 0.65, floorY + 10 * effScale, 90 * effScale, 24 * effScale);
      ctx.strokeStyle = '#0a0d12';
      ctx.lineWidth = 2 * effScale;
      ctx.strokeRect(winX + winW * 0.65, floorY + 10 * effScale, 90 * effScale, 24 * effScale);

      // Row of lounge armchairs in distance (Right side)
      for (let ch = 0; ch < 3; ch++) {
        drawArmchair(pil2X + 70 * effScale + ch * 75 * effScale, floorY - 35 * effScale, 65 * effScale, 75 * effScale, true);
      }

      // --- D. Industrial Ceiling Pendant Fixtures & Warm Glow Halos ---
      const drawPendantLight = (lx: number, ly: number, size: number) => {
        ctx.strokeStyle = '#080a0f';
        ctx.lineWidth = Math.max(1, 1.8 * effScale);
        ctx.beginPath();
        ctx.moveTo(lx, rY); ctx.lineTo(lx, ly);
        ctx.stroke();

        ctx.fillStyle = '#0c0f15';
        ctx.beginPath();
        ctx.arc(lx, ly, size * 0.5, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();

        const bulbGrad = ctx.createRadialGradient(lx, ly + 2 * effScale, 2 * effScale, lx, ly + 2 * effScale, size * 2.8);
        bulbGrad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
        bulbGrad.addColorStop(0.2, 'rgba(255, 200, 100, 0.95)');
        bulbGrad.addColorStop(0.55, 'rgba(255, 150, 40, 0.45)');
        bulbGrad.addColorStop(1, 'rgba(255, 140, 30, 0)');
        ctx.fillStyle = bulbGrad;
        ctx.beginPath();
        ctx.arc(lx, ly + 2 * effScale, size * 2.8, 0, Math.PI * 2);
        ctx.fill();
      };

      drawPendantLight(winX + winW * 0.45, rY + 160 * effScale, 28 * effScale);
      drawPendantLight(pil1X + 140 * effScale, rY + 180 * effScale, 24 * effScale);
      drawPendantLight(pil2X + 160 * effScale, rY + 190 * effScale, 22 * effScale);

    } else if (resolvedStyle === 'panoramic_window') {
      // 2. PANORAMIC WINDOW: Floor-to-ceiling wide glass window with skyline & modern interior
      const pW = 1080 * effScale;
      const pH = 820 * effScale;
      const pX = cx - pW / 2;
      const pY = vCenter - pH / 2;

      const panGrad = ctx.createLinearGradient(pX, pY, pX, pY + pH);
      panGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      panGrad.addColorStop(0.25, 'rgba(250, 252, 255, 0.95)');
      panGrad.addColorStop(0.65, 'rgba(232, 240, 250, 0.65)');
      panGrad.addColorStop(1, 'rgba(195, 210, 230, 0.25)');
      ctx.fillStyle = panGrad;
      ctx.fillRect(pX, pY, pW, pH);

      // Frameless glass borders with soft edge falloff
      const edgeGradLeft = ctx.createLinearGradient(pX, pY, pX + 80 * effScale, pY);
      edgeGradLeft.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      edgeGradLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = edgeGradLeft;
      ctx.fillRect(pX, pY, 80 * effScale, pH);

      const edgeGradRight = ctx.createLinearGradient(pX + pW, pY, pX + pW - 80 * effScale, pY);
      edgeGradRight.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      edgeGradRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = edgeGradRight;
      ctx.fillRect(pX + pW - 80 * effScale, pY, 80 * effScale, pH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = Math.max(1, 2 * effScale);
      ctx.beginPath();
      ctx.moveTo(cx, pY);
      ctx.lineTo(cx, pY + pH);
      ctx.stroke();

    } else if (resolvedStyle === 'sunny_balcony') {
      // 3. SUNNY BALCONY: High intensity sun flare with open glass balcony
      const bW = 980 * effScale;
      const bH = 780 * effScale;
      const bX = cx - bW / 2;
      const bY = vCenter - bH / 2;

      const bGrad = ctx.createLinearGradient(bX, bY, bX, bY + bH);
      bGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      bGrad.addColorStop(0.35, 'rgba(255, 250, 240, 0.95)');
      bGrad.addColorStop(0.7, 'rgba(235, 242, 252, 0.70)');
      bGrad.addColorStop(1, 'rgba(190, 205, 225, 0.35)');
      ctx.fillStyle = bGrad;
      ctx.fillRect(bX, bY, bW, bH);

      const sunX = cx + 140 * effScale;
      const sunY = bY + 160 * effScale;
      const sunFlare = ctx.createRadialGradient(sunX, sunY, 15 * effScale, sunX, sunY, 340 * effScale);
      sunFlare.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      sunFlare.addColorStop(0.2, 'rgba(255, 252, 230, 0.98)');
      sunFlare.addColorStop(0.5, 'rgba(255, 230, 180, 0.65)');
      sunFlare.addColorStop(0.8, 'rgba(255, 210, 140, 0.25)');
      sunFlare.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = sunFlare;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 340 * effScale, 0, Math.PI * 2);
      ctx.fill();

    } else if (resolvedStyle === 'gallery_track') {
      // 4. GALLERY TRACK: Clean art gallery with warm track spotlights
      const railW = 1000 * effScale;
      const railY = vCenter - 180 * effScale;
      const railX = cx - railW / 2;

      ctx.fillStyle = '#0c0e14';
      ctx.fillRect(railX, railY, railW, 20 * effScale);
      ctx.fillStyle = '#222632';
      ctx.fillRect(railX, railY + 16 * effScale, railW, 4 * effScale);

      const spotOffsets = [-360 * effScale, -120 * effScale, 120 * effScale, 360 * effScale];
      spotOffsets.forEach((offset) => {
        const sx = cx + offset;
        ctx.fillStyle = '#141720';
        ctx.fillRect(sx - 20 * effScale, railY + 20 * effScale, 40 * effScale, 30 * effScale);

        const coneGrad = ctx.createRadialGradient(sx, railY + 120 * effScale, 15 * effScale, sx, railY + 120 * effScale, 280 * effScale);
        coneGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        coneGrad.addColorStop(0.3, 'rgba(255, 240, 200, 0.85)');
        coneGrad.addColorStop(0.65, 'rgba(255, 210, 150, 0.35)');
        coneGrad.addColorStop(1, 'rgba(255, 200, 140, 0)');
        ctx.fillStyle = coneGrad;

        ctx.beginPath();
        ctx.moveTo(sx - 18 * effScale, railY + 50 * effScale);
        ctx.lineTo(sx + 18 * effScale, railY + 50 * effScale);
        ctx.lineTo(sx + 220 * effScale, railY + 440 * effScale);
        ctx.lineTo(sx - 220 * effScale, railY + 440 * effScale);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.restore();
  };

  const drawCeilingLightsAt = (cx: number) => {
    if (ceilingLightsEnabled === undefined) return;

    ctx.save();
    const lampOffsets = [-420 * effScale, -140 * effScale, 140 * effScale, 420 * effScale];
    const lampShadeH = 40 * effScale;
    const lampShadeW = 55 * effScale;
    const dropY = 170 * effScale;

    // Color based on ceilingLightTemp: warm (#ffa845), neutral (#fff2e0), cool (#d8eaff)
    let r = 255, g = 242, b = 224;
    if (ceilingLightTemp === 'warm') {
      r = 255; g = 168; b = 69;
    } else if (ceilingLightTemp === 'cool') {
      r = 216; g = 234; b = 255;
    }

    lampOffsets.forEach((offset) => {
      const lx = cx + offset;

      // 1. Ceiling Canopy Mount
      ctx.fillStyle = '#141720';
      ctx.fillRect(lx - 12 * effScale, 0, 24 * effScale, 14 * effScale);

      // 2. Electrical Cord
      ctx.strokeStyle = '#0a0c10';
      ctx.lineWidth = Math.max(1.5, 2.5 * effScale);
      ctx.beginPath();
      ctx.moveTo(lx, 14 * effScale);
      ctx.lineTo(lx, dropY);
      ctx.stroke();

      // 3. Dark Industrial Pendant Lamp Shade
      ctx.fillStyle = '#0e1118';
      ctx.beginPath();
      ctx.moveTo(lx - lampShadeW * 0.25, dropY);
      ctx.lineTo(lx + lampShadeW * 0.25, dropY);
      ctx.lineTo(lx + lampShadeW * 0.5, dropY + lampShadeH);
      ctx.lineTo(lx - lampShadeW * 0.5, dropY + lampShadeH);
      ctx.closePath();
      ctx.fill();

      // Shade rim highlight
      ctx.strokeStyle = '#1e2330';
      ctx.lineWidth = Math.max(1, 1.5 * effScale);
      ctx.stroke();

      if (ceilingLightsEnabled) {
        // Glowing bulb at bottom opening
        const bulbY = dropY + lampShadeH;

        // Downward glowing spot / falloff
        const spotGrad = ctx.createRadialGradient(lx, bulbY, 6 * effScale, lx, bulbY, 200 * effScale);
        spotGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        spotGrad.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, 0.95)`);
        spotGrad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.40)`);
        spotGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = spotGrad;

        ctx.beginPath();
        ctx.arc(lx, bulbY + 30 * effScale, 200 * effScale, 0, Math.PI * 2);
        ctx.fill();

        // Downward soft spotlight cone
        const coneGrad = ctx.createLinearGradient(lx, bulbY, lx, bulbY + 280 * effScale);
        coneGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.65)`);
        coneGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(lx - lampShadeW * 0.5, bulbY);
        ctx.lineTo(lx + lampShadeW * 0.5, bulbY);
        ctx.lineTo(lx + 140 * effScale, bulbY + 280 * effScale);
        ctx.lineTo(lx - 140 * effScale, bulbY + 280 * effScale);
        ctx.closePath();
        ctx.fill();
      }
    });

    ctx.restore();
  };

  const drawWarmLampAt = (cx: number) => {
    if (!options.warmLampEnabled) return;
    ctx.save();
    const lampX = cx + 580 * effScale;
    const lampY = vCenter + 80 * effScale;

    // Warm radial glow (2700K cozy lamp)
    const warmGrad = ctx.createRadialGradient(lampX, lampY - 80 * effScale, 15 * effScale, lampX, lampY - 80 * effScale, 420 * effScale);
    warmGrad.addColorStop(0, 'rgba(255, 248, 220, 1.0)');
    warmGrad.addColorStop(0.2, 'rgba(255, 185, 75, 0.95)');
    warmGrad.addColorStop(0.55, 'rgba(255, 130, 40, 0.45)');
    warmGrad.addColorStop(0.85, 'rgba(240, 90, 20, 0.15)');
    warmGrad.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = warmGrad;
    ctx.beginPath();
    ctx.arc(lampX, lampY - 80 * effScale, 420 * effScale, 0, Math.PI * 2);
    ctx.fill();

    // Floor lamp shade silhouette
    const shadeW = 150 * effScale;
    const shadeH = 95 * effScale;
    const shadeTopY = lampY - 120 * effScale;

    ctx.fillStyle = '#0f1116';
    ctx.beginPath();
    ctx.moveTo(lampX - shadeW * 0.35, shadeTopY);
    ctx.lineTo(lampX + shadeW * 0.35, shadeTopY);
    ctx.lineTo(lampX + shadeW * 0.5, shadeTopY + shadeH);
    ctx.lineTo(lampX - shadeW * 0.5, shadeTopY + shadeH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0b0d11';
    ctx.lineWidth = 6 * effScale;
    ctx.beginPath();
    ctx.moveTo(lampX, shadeTopY + shadeH);
    ctx.lineTo(lampX, lampY + 300 * effScale);
    ctx.stroke();
    ctx.restore();
  };

  // Draw Primary and Seamless Wrap-Around Lightformers & Ceiling Lights
  drawLightformerAt(uCenter);
  drawCeilingLightsAt(uCenter);
  drawWarmLampAt(uCenter);
  if (uCenter - 400 * effScale < 0) {
    drawLightformerAt(uCenter + 2048);
    drawCeilingLightsAt(uCenter + 2048);
    drawWarmLampAt(uCenter + 2048);
  }
  if (uCenter + 400 * effScale > 2048) {
    drawLightformerAt(uCenter - 2048);
    drawCeilingLightsAt(uCenter - 2048);
    drawWarmLampAt(uCenter - 2048);
  }

  // Pixel-level Reflection Brightness & Contrast adjustment
  if (reflectionBrightness !== 0 || reflectionContrast !== 0) {
    try {
      const imgData = ctx.getImageData(0, 0, 2048, 1024);
      const d = imgData.data;
      const brOffset = (reflectionBrightness / 100) * 180;
      const cFactor = (259 * (reflectionContrast + 100)) / (100 * (259 - reflectionContrast));

      for (let i = 0; i < d.length; i += 4) {
        let r = d[i];
        let g = d[i + 1];
        let b = d[i + 2];

        if (reflectionBrightness !== 0) {
          r = Math.min(255, Math.max(0, r + brOffset));
          g = Math.min(255, Math.max(0, g + brOffset));
          b = Math.min(255, Math.max(0, b + brOffset));
        }

        if (reflectionContrast !== 0) {
          r = Math.min(255, Math.max(0, cFactor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, cFactor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, cFactor * (b - 128) + 128));
        }

        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Ignore canvas security errors if any
    }
  }

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
    placementMode = 'wall',
    lightSource3D,
    lightsList,
    wallAngleDeg = 0,
    pitchDeg = 0,
    rollDeg = 0,
    thicknessCm = 1.0,
    zDistance = 0,
    lightMode = 'day',
    reflectionType = 'panoramic_window',
    reflectionAngleDeg = 0,
    reflectionIntensity = 0.2,
    reflectionScale = 1.0,
    reflectionRoughness = 0.012,
    reflectionBrightness = 0,
    reflectionContrast = 0,
    weatherPreset,
    shelfContactShadow = false,
    wallHarmonization = 0.35,
    ceilingLightsEnabled,
    ceilingLightTemp = 'neutral',
    sunIntensity = 100,
    wallQuad,
    showWallGrid,
    isWallAnchored,
    wallCalibratedAngle,
    wallCalibratedPitch,
    adjust = {},
    adjustBg,
    bgAdjust,
    vignette = 0,
    shadowPreset = 'parallel',
    shadowAngleDeg = 62,
    shadowDistance = 30,
    shadowBlur = 25,
    shadowIntensity = 50,
    shadowColor = '#000000',
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
  const shiftX = (centerX - 0.5) * renderWidth;
  const shiftY = (centerY - 0.5) * renderHeight;
  camera.setViewOffset(renderWidth, renderHeight, shiftX, shiftY, renderWidth, renderHeight);
  camera.updateProjectionMatrix();

  // 1. Room Background Plane (with professional photo color grading support)
  const effectiveBgAdjust = bgAdjust || adjustBg;
  let roomSource: CanvasImageSource = roomImage;
  if (effectiveBgAdjust && !isAdjustDefault(effectiveBgAdjust)) {
    roomSource = applyColorGrading(roomImage, effectiveBgAdjust);
  } else if (vignette && vignette > 0) {
    roomSource = applyColorGrading(roomImage, { vignette });
  }

  const roomTex = new THREE.CanvasTexture(roomSource as any);
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

  // 1b. Perspective Wall Grid (Converging vanishing lines between wallQuad corners)
  if (wallQuad) {
    const gridGeom = createWallQuadGridGeometry(wallQuad, bgW, bgH, 16);
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const wallGridMesh = new THREE.LineSegments(gridGeom, gridMat);
    scene.add(wallGridMesh);
  }

  // 2. Intelligent Wall Light Harmonization & Weather Presets (Extracts Room Ambience)
  const wallSample = sampleWallLighting(roomImage, centerX, centerY, scaleWidth);
  const wallColor = new THREE.Color(wallSample.r, wallSample.g, wallSample.b);
  const neutralColor = new THREE.Color(0xffffff);

  // Blend white ambient with room wall color temperature
  const ambColor = neutralColor.clone().lerp(wallColor, wallHarmonization * 0.5);
  const roomLightScale = 0.65 + wallSample.luminance * 0.7;
  let finalAmbIntensity = 0.4 * (1 - wallHarmonization * 0.4) + (0.4 * roomLightScale * wallHarmonization * 0.4);
  let keyLightColor = ambColor.clone();
  let keyLightIntensity = 1.3 * (0.6 + 0.4 * roomLightScale);

  if (weatherPreset === 'warm_afternoon') {
    keyLightColor.lerp(new THREE.Color(0xffb040), 0.35);
    keyLightIntensity *= 1.15;
  } else if (weatherPreset === 'morning') {
    keyLightColor.lerp(new THREE.Color(0xe0f2fe), 0.3);
    finalAmbIntensity *= 1.1;
  } else if (weatherPreset === 'intimate_night') {
    keyLightColor.lerp(new THREE.Color(0xfef08a), 0.3);
    finalAmbIntensity *= 0.65;
    keyLightIntensity *= 0.85;
  } else if (weatherPreset === 'sunny_contrast') {
    keyLightIntensity *= 1.25;
    finalAmbIntensity *= 0.85;
  } else if (weatherPreset === 'overcast_soft') {
    keyLightIntensity *= 0.85;
    finalAmbIntensity *= 1.2;
  }

  const ambientLight = new THREE.AmbientLight(ambColor, finalAmbIntensity);
  scene.add(ambientLight);

  // Multi-Light System & Vector Angle Calculation
  const activeLights: LightSource3D[] = (lightsList && lightsList.length > 0)
    ? lightsList
    : (lightSource3D
      ? [{
          id: 'key_1',
          x: lightSource3D.x,
          y: lightSource3D.y,
          z: lightSource3D.z ?? 1.0,
          intensity: sunIntensity ?? 100,
        }]
      : [{
          id: 'key_1',
          x: 0.833,
          y: 0.0,
          z: 0.625,
          intensity: sunIntensity ?? 100,
        }]);

  let effectiveReflectionAngle = reflectionAngleDeg;
  const combinedLightDir = new THREE.Vector3();

  activeLights.forEach((l, idx) => {
    const lx = (l.x - 0.5) * 12;
    const ly = -(l.y - 0.5) * 12;
    const lz = (l.z ?? 1.0) * 8;
    const lPos = new THREE.Vector3(lx, ly, lz);

    const lColor = l.color ? new THREE.Color(l.color) : keyLightColor;
    const lightNormIntensity = ((l.intensity ?? 100) / 100) * (sunIntensity / 100);
    const dirLight = new THREE.DirectionalLight(lColor, lightNormIntensity * keyLightIntensity);
    dirLight.position.copy(lPos);
    scene.add(dirLight);

    combinedLightDir.add(lPos.clone().normalize().multiplyScalar(lightNormIntensity));

    const dx = l.x - centerX;
    const dy = -(l.y - centerY); // Screen Y inverted to standard math +Y
    const angleToLightDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

    if (idx === 0 && (lightsList && lightsList.length > 0 || lightSource3D)) {
      effectiveReflectionAngle = angleToLightDeg;
    }
  });

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.45 * roomLightScale);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  // 3. Environment Map (PMREM Prefiltered Specular Reflections)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envTex = generateRaytracingEquirectangularMap({
    reflectionType,
    angleDeg: effectiveReflectionAngle,
    intensity: reflectionIntensity,
    scale: reflectionScale,
    lightMode,
    weatherPreset,
    reflectionBrightness,
    reflectionContrast,
    ceilingLightsEnabled,
    ceilingLightTemp,
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

  // 5. Physics Clamping & 3D Artwork Mesh Setup
  const clampedZDistCm = Math.max(0, Math.min(8.0, zDistance ?? 0));
  const clampedPitchDeg = Math.max(-75, Math.min(75, pitchDeg ?? 0));
  const zDistM = clampedZDistCm / 100;

  const totalW = bgW * scaleWidth;
  const naturalAspect = (artworkImage.naturalWidth || artworkImage.width || 1) / (artworkImage.naturalHeight || artworkImage.height || 1);
  const artAspect = (artworkWidthCm && artworkHeightCm && artworkWidthCm !== 70)
    ? (artworkWidthCm / artworkHeightCm)
    : naturalAspect;
  const totalH = totalW / artAspect;

  const isShelf = placementMode === 'shelf';
  const effectiveShelfContactShadow = isShelf || !!shelfContactShadow;

  // In shelf mode, anchor bottom of frame to the shelf baseline
  const baseNormY = -(centerY - 0.5) * bgH;
  const normX = (centerX - 0.5) * bgW;
  const normY = isShelf ? baseNormY + (totalH / 2) : baseNormY;

  const group = new THREE.Group();
  group.position.set(normX, normY, 0.04 + zDistM);
  group.rotation.x = -(clampedPitchDeg * Math.PI) / 180;
  group.rotation.y = (wallAngleDeg * Math.PI) / 180;
  group.rotation.z = ((rollDeg ?? 0) * Math.PI) / 180;

  const gapM = panelsCount > 1 ? (gapCm / 100) * 0.4 : 0;
  const singleW = (totalW - gapM * (panelsCount - 1)) / panelsCount;
  const thickCm = Math.max(0.1, Math.min(12.0, thicknessCm ?? 1.0));
  const depthM = thickCm / 100;

  // PBR Physical Material Calibration
  let roughness: number;
  let clearcoat: number;
  let clearcoatRoughness: number;
  let envMapIntensity: number;
  let specularIntensity: number;
  let iridescence = 0;
  let iridescenceIOR = 1.3;
  let emissiveBoost = 1.0;

  if (hasResina || finishType === 'epoxy_resina' || finishType === 'resina') {
    // Resina Epoxi: high-definition mirror highlight centered at lightSource3D vector
    roughness = RESIN_OVERLAY.roughness ?? 0.002;
    clearcoat = RESIN_OVERLAY.clearcoat ?? 1.0;
    clearcoatRoughness = reflectionRoughness ?? (RESIN_OVERLAY.clearcoatRoughness ?? 0.002);
    envMapIntensity = RESIN_OVERLAY.envMapIntensity ?? 6.0;
    specularIntensity = RESIN_OVERLAY.specularIntensity ?? 3.0;
    emissiveBoost = RESIN_OVERLAY.colorBoost ?? 1.08;
  } else if (finishType === 'mate') {
    // Vinilo Mate -> Satinado look
    const p = finishPresets.mate;
    roughness = p.roughness ?? 0.42;
    clearcoat = p.clearcoat ?? 0.30;
    clearcoatRoughness = reflectionRoughness ?? (p.clearcoatRoughness ?? 0.15);
    envMapIntensity = p.envMapIntensity ?? 0.90;
    specularIntensity = p.specularIntensity ?? 0.90;
    emissiveBoost = 1.0;
  } else if (finishType === 'tornasolado') {
    const p = finishPresets.tornasolado;
    roughness = p.roughness ?? 0.15;
    clearcoat = p.clearcoat ?? 0.70;
    clearcoatRoughness = reflectionRoughness ?? (p.clearcoatRoughness ?? 0.06);
    envMapIntensity = p.envMapIntensity ?? 2.5;
    specularIntensity = p.specularIntensity ?? 1.5;
    iridescence = p.iridescence ?? 1.0;
    iridescenceIOR = p.iridescenceIOR ?? 1.45;
  } else {
    // Vinilo Brillante nítido
    const p = finishPresets[finishType] || finishPresets.brillante;
    roughness = p.roughness ?? 0.10;
    clearcoat = p.clearcoat ?? 0.88;
    clearcoatRoughness = reflectionRoughness ?? (p.clearcoatRoughness ?? 0.03);
    envMapIntensity = p.envMapIntensity ?? 2.2;
    specularIntensity = p.specularIntensity ?? 1.9;
  }

  const ior = 1.50;

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

  const backMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const panelGeom = new RoundedBoxGeometry(singleW, totalH, depthM, 4, Math.min(0.002, depthM * 0.1));

  const startX = -totalW / 2 + singleW / 2;

  // Directional edge shading on 4 side edges based on key light direction relative to frame
  const frameEuler = new THREE.Euler(
    -(clampedPitchDeg * Math.PI) / 180,
    (wallAngleDeg * Math.PI) / 180,
    ((rollDeg ?? 0) * Math.PI) / 180,
    'XYZ'
  );
  const frameQuat = new THREE.Quaternion().setFromEuler(frameEuler);
  const invFrameQuat = frameQuat.clone().invert();
  const dominantLightDir = combinedLightDir.lengthSq() > 0
    ? combinedLightDir.clone().normalize()
    : new THREE.Vector3(4, 7, 5).normalize();
  const lightLocal = dominantLightDir.applyQuaternion(invFrameQuat);

  // BoxGeometry face normals: 0: +X (Right), 1: -X (Left), 2: +Y (Top), 3: -Y (Bottom)
  const edgeNormals = [
    new THREE.Vector3(1, 0, 0),  // 0: +X (Right side edge)
    new THREE.Vector3(-1, 0, 0), // 1: -X (Left side edge)
    new THREE.Vector3(0, 1, 0),  // 2: +Y (Top edge)
    new THREE.Vector3(0, -1, 0), // 3: -Y (Bottom edge)
  ];

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

    // Generate wrapped edge textures for physical wrapped border rendering on all frames
    let panelCanvas = gradedCanvas;
    if (panelsCount > 1) {
      const sliceW = Math.max(2, Math.floor(gradedCanvas.width / panelsCount));
      const sliceH = gradedCanvas.height;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = sliceW;
      sliceCanvas.height = sliceH;
      const sCtx = sliceCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(gradedCanvas, i * sliceW, 0, sliceW, sliceH, 0, 0, sliceW, sliceH);
      }
      panelCanvas = sliceCanvas;
    }

    const singlePanelWCm = (artworkWidthCm || 60) / panelsCount;
    const panelHCm = artworkHeightCm || 80;
    const edgeTextures = createWrappedEdgeTextures(panelCanvas, singlePanelWCm, panelHCm, thickCm, maxAniso);
    const edgeMaterials = edgeTextures.map((t, idx) => {
      const normal = edgeNormals[idx];
      const dot = normal.dot(lightLocal);

      let brightness: number;
      let edgeRoughness: number;

      if (dot >= 0) {
        // Direct key light illumination: highlighted edge with crisp sheen
        brightness = 1.0 + Math.min(0.35, dot * 0.28);
        edgeRoughness = Math.max(0.04, (roughness ?? 0.45) * (1.0 - dot * 0.20));
      } else {
        // Grazing / shadowed edge: darkened with higher diffuse roughness
        brightness = Math.max(0.38, 1.0 + dot * 0.45);
        edgeRoughness = Math.min(0.90, (roughness ?? 0.45) * (1.0 - dot * 0.40));
      }

      const edgeColor = new THREE.Color(brightness, brightness, brightness);

      return new THREE.MeshStandardMaterial({
        map: t,
        color: edgeColor,
        roughness: edgeRoughness,
        metalness: 0.05,
      });
    });

    const materials = [
      edgeMaterials[0], // +X (Right side edge)
      edgeMaterials[1], // -X (Left side edge)
      edgeMaterials[2], // +Y (Top edge)
      edgeMaterials[3], // -Y (Bottom edge)
      pMat,             // +Z (Front face)
      backMat,          // -Z (Back face)
    ];

    const mesh = new THREE.Mesh(panelGeom, materials);
    mesh.position.set(startX + i * (singleW + gapM), 0, 0);
    group.add(mesh);
  }

  scene.add(group);

  // 6. Physically Anchored Multi-Light Frame Drop Shadow Mesh
  const masterShadowCanvas = document.createElement('canvas');
  masterShadowCanvas.width = 1024;
  masterShadowCanvas.height = 1024;
  const masterShadowCtx = masterShadowCanvas.getContext('2d')!;
  masterShadowCtx.clearRect(0, 0, 1024, 1024);

  const shadowAspect = totalW / totalH;
  const tempShadowCanvas = document.createElement('canvas');
  tempShadowCanvas.width = 1024;
  tempShadowCanvas.height = 1024;
  const tempShadowCtx = tempShadowCanvas.getContext('2d')!;

  activeLights.forEach((l) => {
    const dx = l.x - centerX;
    const dy = -(l.y - centerY);
    const angleToLightDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const lightShadowAngle = (angleToLightDeg + 180) % 360;
    const lightWeight = (l.intensity ?? 100) / 100;
    const singleIntensity = Math.min(100, shadowIntensity * lightWeight);

    tempShadowCtx.clearRect(0, 0, 1024, 1024);
    drawExactFrameShadowToContext(tempShadowCtx, {
      shadowPreset,
      aspectRatio: shadowAspect,
      angleDeg: lightShadowAngle,
      distance: shadowDistance,
      blur: shadowBlur,
      intensity: singleIntensity,
      wallAngleDeg,
      pitchDeg: clampedPitchDeg,
      rollDeg,
      zDistance: clampedZDistCm,
      shelfContactShadow: false,
      shadowColor,
      width: 1024,
      height: 1024,
    });

    masterShadowCtx.drawImage(tempShadowCanvas, 0, 0);
  });

  if (effectiveShelfContactShadow) {
    tempShadowCtx.clearRect(0, 0, 1024, 1024);
    drawExactFrameShadowToContext(tempShadowCtx, {
      shadowPreset: 'none',
      aspectRatio: shadowAspect,
      intensity: shadowIntensity,
      shelfContactShadow: true,
      shadowColor,
      width: 1024,
      height: 1024,
    });
    masterShadowCtx.drawImage(tempShadowCanvas, 0, 0);
  }

  const sTex = new THREE.CanvasTexture(masterShadowCanvas);
  const shadowGeom = new THREE.PlaneGeometry(totalW * 2.2, totalH * 2.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: sTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.position.set(normX, normY, 0.001);
  shadowMesh.rotation.x = 0;
  shadowMesh.rotation.y = group.rotation.y;
  shadowMesh.rotation.z = group.rotation.z;
  scene.add(shadowMesh);

  renderer.render(scene, camera);
  pmremGenerator.dispose();
  envRenderTarget.dispose();
  renderer.dispose();

  return canvas;
}
