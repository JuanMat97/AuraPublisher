import {
  AmbientLightMode,
  ReflectionType,
  ReflectionDirection,
  CanvaShadowPreset,
  VinylFinish,
  CanvaMoldConfig,
  CanvaImageAdjustOptions,
} from '../types/catalog';
import { renderWebGLRoomComposite } from './webglRoomEngine';

export type MoldFitMode = 'contain' | 'cover';

export type SmartMoldConfig = CanvaMoldConfig;

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
    placementMode: mold.placementMode,
    lightSource3D: mold.lightSource3D,
    wallAngleDeg: mold.wallAngle ?? 0,
    pitchDeg: mold.pitchDeg ?? 0,
    rollDeg: mold.rollDeg ?? 0,
    thicknessCm: mold.thicknessCm ?? 1.0,
    zDistance: mold.zDistance ?? 0,
    lightMode: mold.lightMode ?? 'day',
    reflectionType: mold.reflectionType ?? 'studio_grid',
    reflectionDirection: mold.reflectionDirection ?? 'center',
    reflectionAngleDeg: mold.reflectionAngleDeg ?? 0,
    reflectionIntensity: mold.reflectionIntensity ?? 0.2,
    reflectionScale: mold.reflectionScale ?? 1.0,
    reflectionRoughness: mold.reflectionRoughness ?? 0.012,
    reflectionBrightness: mold.reflectionBrightness,
    reflectionContrast: mold.reflectionContrast,
    weatherPreset: mold.weatherPreset as any,
    shelfContactShadow: mold.shelfContactShadow,
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
