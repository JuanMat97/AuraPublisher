import type { PerspectiveQuad, LightSource3D } from './environment';
export type { PerspectiveQuad, LightSource3D };

export type PanelConfig = 'single' | 'diptych' | 'triptych' | 'polyptych';
export type Orientation = 'vertical' | 'horizontal' | 'square';
export type FrameType = 'wrap_1cm';
export type VinylFinish = 'mate' | 'brillante' | 'tornasolado';
export type FinishType = VinylFinish | 'epoxy_resina' | 'satin';
export type AmbientLightMode = 'day' | 'sunset' | 'night' | 'nordic_cold' | 'warm_home' | 'neon_gamer';
export type ReflectionType =
  | 'industrial_loft'
  | 'panoramic_window'
  | 'sunny_balcony'
  | 'french_window'
  | 'double_corner'
  | 'skylight_zenith'
  | 'gallery_track'
  | 'warm_lamp'
  | 'estudio'
  | 'loft'
  | 'galeria'
  | 'ventanal_noche'
  | 'modern_window';
export type ReflectionDirection = 'left' | 'center' | 'right' | 'top';
export type CanvaShadowPreset = 'none' | 'parallel' | 'glow' | 'outline' | 'curved' | 'floating' | 'angled' | 'bottom_drop';
export type ShadowType = CanvaShadowPreset;
export type AspectRatioMode = 'original' | 'catalog';
export type SetMode = 'collection' | 'split';

export interface SizeOption {
  id: string;
  name: string;
  panelConfig: PanelConfig;
  orientation: Orientation;
  widthCm: number;
  heightCm: number;
  panelsCount: number;
  description: string;
}

export const CATALOG_SIZES: SizeOption[] = [
  // 1. Proporción Nativa Automática
  { id: 'auto_native', name: '🔒 Proporción Original Automática (1:1, 16:9, 3:4)', panelConfig: 'single', orientation: 'vertical', widthCm: 70, heightCm: 70, panelsCount: 1, description: 'Respeta la proporción exacta de tu imagen sin deformar' },

  // 2. Medidas Estándar MercadoLibre
  { id: 'v_50x70', name: 'Individual 50 × 70 cm (3:4 Clásico)', panelConfig: 'single', orientation: 'vertical', widthCm: 50, heightCm: 70, panelsCount: 1, description: '1 Cuadro vertical estándar' },
  { id: 'sq_80x80', name: 'Individual 80 × 80 cm (1:1 Cuadrado)', panelConfig: 'single', orientation: 'square', widthCm: 80, heightCm: 80, panelsCount: 1, description: '1 Cuadro cuadrado' },
  { id: 'h_90x50', name: 'Individual 90 × 50 cm (16:9 Panorámico)', panelConfig: 'single', orientation: 'horizontal', widthCm: 90, heightCm: 50, panelsCount: 1, description: '1 Cuadro horizontal panorámico' },
  { id: 'h_100x70', name: 'Individual 100 × 70 cm (Living XL)', panelConfig: 'single', orientation: 'horizontal', widthCm: 100, heightCm: 70, panelsCount: 1, description: '1 Cuadro grande sobre sofá' },

  // 3. Dípticos & Trípticos
  { id: 'dip_100x70', name: 'Díptico 100 × 70 cm (2x 50x70)', panelConfig: 'diptych', orientation: 'horizontal', widthCm: 100, heightCm: 70, panelsCount: 2, description: 'Juego de 2 cuadros lado a lado' },
  { id: 'trip_120x60', name: 'Tríptico 120 × 60 cm (3x 40x60)', panelConfig: 'triptych', orientation: 'horizontal', widthCm: 120, heightCm: 60, panelsCount: 3, description: 'Set de 3 cuadros verticales' },
  { id: 'trip_150x70', name: 'Tríptico 150 × 70 cm (3x 50x70)', panelConfig: 'triptych', orientation: 'horizontal', widthCm: 150, heightCm: 70, panelsCount: 3, description: 'Set de 3 cuadros XL de pared completa' },
];

export interface VinylOption {
  id: VinylFinish;
  name: string;
  description: string;
  badge?: string;
}

export const CATALOG_VINYLS: VinylOption[] = [
  { id: 'mate', name: 'Mate', description: 'Acabado antirreflejo suave y sobrio', badge: 'CLÁSICO' },
  { id: 'brillante', name: 'Brillante', description: 'Realce de colores y reflejo nítido', badge: 'POPULAR' },
  { id: 'tornasolado', name: 'Tornasolado', description: 'Reflejos holográficos dinámicos con la luz', badge: 'ESTELAR' },
];

export const CATALOG_FINISHES = CATALOG_VINYLS;

export interface AmbientLightOption {
  id: AmbientLightMode;
  name: string;
  icon: string;
  colorHex: string;
  description: string;
}

export const AMBIENT_LIGHTS: AmbientLightOption[] = [
  { id: 'day', name: 'Día Luminoso', icon: '☀️', colorHex: '#ffffff', description: 'Luz natural 5500K bien luminosa y clara' },
  { id: 'sunset', name: 'Atardecer Dorado', icon: '🌇', colorHex: '#f59e0b', description: 'Luz cálida dorada 3200K de atardecer' },
  { id: 'warm_home', name: 'Cálida Hogar', icon: '💡', colorHex: '#fbbf24', description: 'Luz acogedora 2700K de living' },
  { id: 'nordic_cold', name: 'Fría Nórdica', icon: '❄️', colorHex: '#93c5fd', description: 'Luz limpia y moderna 6500K' },
  { id: 'neon_gamer', name: 'Neón Gamer', icon: '🌆', colorHex: '#c084fc', description: 'Acentos cyan y magenta para setups' },
  { id: 'night', name: 'Noche Íntima', icon: '🌙', colorHex: '#60a5fa', description: 'Luz focal tenue con sombras profundas' },
];

export interface ReflectionOption {
  id: ReflectionType;
  name: string;
  icon: string;
  description: string;
}

export const REFLECTION_OPTIONS: ReflectionOption[] = [
  { id: 'industrial_loft', name: 'Loft Industrial', icon: '🏭', description: 'Ventanales de hierro, columnas de hormigón y luces colgantes' },
  { id: 'panoramic_window', name: 'Ventanal Panorámico', icon: '🪟', description: 'Gran ventanal moderno de pared completa con horizonte' },
  { id: 'sunny_balcony', name: 'Balcón Luminoso', icon: '☀️', description: 'Alta luminosidad y claridad exterior natural' },
  { id: 'gallery_track', name: 'Rieles Lumínicos', icon: '💡', description: 'Múltiples rieles de focos proyectores de galería' },
];

export const REFLECTION_DIRECTIONS: Array<{ id: ReflectionDirection; name: string; icon: string; angle: number }> = [
  { id: 'left', name: 'Izquierda', icon: '⬅️', angle: -45 },
  { id: 'center', name: 'Frontal', icon: '⏺️', angle: 0 },
  { id: 'right', name: 'Derecha', icon: '➡️', angle: 45 },
  { id: 'top', name: 'Cenital', icon: '⬆️', angle: 90 },
];

export interface CanvaShadowOption {
  id: CanvaShadowPreset;
  name: string;
  description: string;
}

export const CANVA_SHADOW_OPTIONS: CanvaShadowOption[] = [
  { id: 'parallel', name: 'Paralela', description: 'Sombra direccional proyectada con ángulo' },
  { id: 'glow', name: 'Brillante', description: 'Halo suave difuso en todo el contorno' },
  { id: 'outline', name: 'Contorno', description: 'Sombra de contacto ajustada al marco' },
  { id: 'curved', name: 'Curva', description: 'Profundidad curva en las esquinas inferiores' },
  { id: 'floating', name: 'Página Flotante', description: 'Sombra suave en el borde inferior' },
  { id: 'angled', name: 'En Ángulo', description: 'Proyección angular de luz lateral' },
  { id: 'bottom_drop', name: 'Fondo', description: 'Sombra inferior directa' },
  { id: 'none', name: 'Ninguno', description: 'Sin sombra proyectada' },
];

export interface CanvaImageAdjustOptions {
  brightness?: number; // -100..100
  contrast?: number; // -100..100
  highlights?: number; // -100..100
  shadowsTone?: number; // -100..100
  whites?: number; // -100..100
  blacks?: number; // -100..100
  temperature?: number; // -100..100
  tint?: number; // -100..100
  saturation?: number; // -100..100
  hue?: number; // -180..180
  invert?: boolean;
  vignette?: number; // 0..100
}

export interface CanvaMoldConfig {
  centerX?: number;
  centerY?: number;
  scaleWidth?: number;
  fitMode?: 'contain' | 'cover';
  placementMode?: 'wall' | 'shelf';
  lightSource3D?: LightSource3D | { x: number; y: number; z: number };
  lightsList?: LightSource3D[];
  vinylFinish?: VinylFinish;
  hasResina?: boolean;
  lightMode?: AmbientLightMode;
  reflectionType?: ReflectionType;
  reflectionDirection?: ReflectionDirection;
  reflectionAngleDeg?: number;
  reflectionIntensity?: number;
  reflectionScale?: number;
  reflectionRoughness?: number;
  reflectionBrightness?: number;
  reflectionContrast?: number;
  weatherPreset?: string;
  /** @deprecated Use ambient lighting and color adjustments instead */
  wallHarmonization?: number;
  wallAngle?: number;
  pitchDeg?: number;
  rollDeg?: number;
  thicknessCm?: number;
  zDistance?: number;
  shelfContactShadow?: boolean;
  gapCm?: number;
  panelCount?: number;

  // Independent 3D Wall Grid & Calibration
  wallQuad?: PerspectiveQuad;
  isWallAnchored?: boolean;
  wallCalibratedAngle?: number;
  wallCalibratedPitch?: number;

  // Sun Light & Industrial Ceiling Lighting
  sunIntensity?: number;
  ceilingLightsEnabled?: boolean;
  ceilingLightTemp?: 'warm' | 'neutral' | 'cool';

  // Complete Canva Image Adjustment
  adjust?: CanvaImageAdjustOptions;
  adjustBg?: CanvaImageAdjustOptions;
  bgAdjust?: CanvaImageAdjustOptions;
  vignette?: number;

  // Canva-Style Shadows
  shadowPreset?: CanvaShadowPreset;
  shadowAngleDeg?: number;
  shadowDistance?: number;
  shadowBlur?: number;
  shadowIntensity?: number;
  shadowColor?: string;
}
