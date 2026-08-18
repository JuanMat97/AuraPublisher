import { AmbientLightMode, ReflectionType, ReflectionDirection, CanvaShadowPreset, VinylFinish } from '../types/catalog';
import { renderWebGLRoomComposite, CanvaImageAdjustOptions } from './webglRoomEngine';

export type MoldFitMode = 'contain' | 'cover';

export interface SmartMoldConfig {
  centerX: number;
  centerY: number;
  scaleWidth: number;
  fitMode?: MoldFitMode;
  vinylFinish?: VinylFinish;
  hasResina?: boolean;
  lightMode?: AmbientLightMode;
  reflectionType?: ReflectionType;
  reflectionDirection?: ReflectionDirection;
  reflectionAngleDeg?: number;
  reflectionIntensity?: number;
  reflectionScale?: number;
  reflectionRoughness?: number;
  wallHarmonization?: number;
  wallAngle?: number;
  pitchDeg?: number;
  gapCm?: number;

  // Complete Canva Image Adjustment
  adjust?: CanvaImageAdjustOptions;

  // Canva-Style Shadows
  shadowPreset?: CanvaShadowPreset;
  shadowAngleDeg?: number;
  shadowDistance?: number;
  shadowBlur?: number;
  shadowIntensity?: number;
  shadowColor?: string;
  panelCount?: number;
}

export interface RenderSmartMoldOptions {
  envImage: HTMLImageElement;
  framedArtworks: HTMLCanvasElement[];
  mold: SmartMoldConfig;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function renderSmartMoldComposite(options: RenderSmartMoldOptions): HTMLCanvasElement {
  const {
    envImage,
    framedArtworks,
    mold,
    canvasWidth = 1920,
    canvasHeight = 1920,
  } = options;

  const panelCount = Math.max(1, framedArtworks.length);
  const primaryArtwork = framedArtworks[0];

  return renderWebGLRoomComposite({
    roomImage: envImage,
    artworkImage: primaryArtwork as any,
    panelsCount: panelCount,
    gapCm: mold.gapCm ?? 3,
    finishType: mold.vinylFinish || 'brillante',
    hasResina: mold.hasResina ?? true,
    centerX: mold.centerX ?? 0.5,
    centerY: mold.centerY ?? 0.32,
    scaleWidth: mold.scaleWidth ?? 0.42,
    wallAngleDeg: mold.wallAngle ?? 0,
    pitchDeg: mold.pitchDeg ?? 0,
    lightMode: mold.lightMode ?? 'day',
    reflectionType: mold.reflectionType ?? 'studio_grid',
    reflectionDirection: mold.reflectionDirection ?? 'center',
    reflectionAngleDeg: mold.reflectionAngleDeg ?? 0,
    reflectionIntensity: mold.reflectionIntensity ?? 0.2,
    reflectionScale: mold.reflectionScale ?? 1.0,
    reflectionRoughness: mold.reflectionRoughness ?? 0.012,
    wallHarmonization: mold.wallHarmonization ?? 0.35,
    adjust: mold.adjust,
    shadowPreset: mold.shadowPreset ?? 'parallel',
    shadowAngleDeg: mold.shadowAngleDeg ?? 62,
    shadowDistance: mold.shadowDistance ?? 30,
    shadowBlur: mold.shadowBlur ?? 25,
    shadowIntensity: mold.shadowIntensity ?? 50,
    shadowColor: mold.shadowColor ?? '#000000',
    renderWidth: canvasWidth,
    renderHeight: canvasHeight,
  });
}
