export interface Point2D {
  x: number;
  y: number;
}

export interface PerspectiveQuad {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export type QuadPoints = PerspectiveQuad;

export type WeatherPreset =
  | 'morning'
  | 'warm_afternoon'
  | 'intimate_night'
  | 'sunny_contrast'
  | 'overcast_soft'
  | 'day'
  | 'sunset'
  | 'night'
  | 'sunny'
  | 'cloudy';

export type PlacementMode = 'wall' | 'shelf';

export interface LightSource3D {
  x: number;
  y: number;
  z: number;
}

export interface MockupPosition {
  id: string;
  name: string;
  quad: PerspectiveQuad;
  shadowIntensity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Per-environment optical and spatial overrides. The product finish remains global.
  placementMode?: PlacementMode;
  lightPos3D?: LightSource3D;
  lightSource3D?: LightSource3D;
  wallAngle?: number;
  pitchDeg?: number;
  rollDeg?: number;
  rollAngle?: number;
  thicknessCm?: number;
  zDistance?: number;
  reflectionType?: import('./catalog').ReflectionType;
  reflectionDirection?: import('./catalog').ReflectionDirection;
  reflectionAngleDeg?: number;
  reflectionIntensity?: number;
  reflectionScale?: number;
  reflectionRoughness?: number;
  reflectionBrightness?: number;
  reflectionContrast?: number;
  weatherPreset?: WeatherPreset;
  shelfContactShadow?: boolean;
  wallHarmonization?: number;
  shadowPreset?: import('./catalog').CanvaShadowPreset;
  shadowStyleIntensity?: number;
  shadowAngleDeg?: number;
  shadowDistance?: number;
  shadowContactOcclusion?: number;
  temperature?: number;
  tint?: number;
  brightness?: number;
  contrast?: number;
  highlights?: number;
  shadowsTone?: number;
  whites?: number;
  blacks?: number;
  hue?: number;
  saturation?: number;
  invert?: boolean;
  adjust?: import('./catalog').CanvaImageAdjustOptions;
}

export type EnvironmentPosition = MockupPosition;

export interface EnvironmentScene {
  id: string;
  name: string;
  category: 'portada' | 'living' | 'galeria' | 'oficina' | 'dormitorio' | 'cocina' | 'hall';
  imageUrl: string;
  positions: EnvironmentPosition[];
  isCustom?: boolean;
}

export const BUILTIN_ENVIRONMENTS: EnvironmentScene[] = [
  // 1. Portada ML / Living Escandinavo Sofá
  {
    id: 'living_scandi',
    name: 'Living Minimalista Sofá',
    category: 'living',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    positions: [
      {
        id: 'pos_living_1',
        name: 'Sobre Sofá Principal',
        quad: {
          topLeft: { x: 0.28, y: 0.18 },
          topRight: { x: 0.72, y: 0.18 },
          bottomRight: { x: 0.72, y: 0.48 },
          bottomLeft: { x: 0.28, y: 0.48 },
        },
        shadowIntensity: 0.6,
        shadowBlur: 28,
        shadowOffsetX: 4,
        shadowOffsetY: 18,
      },
    ],
  },

  // 2. Galería de Arte Museo Hormigón
  {
    id: 'galeria_moderna',
    name: 'Galería de Arte Pared Cemento',
    category: 'galeria',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=85',
    positions: [
      {
        id: 'pos_galeria_1',
        name: 'Pared Central de Exposición',
        quad: {
          topLeft: { x: 0.26, y: 0.16 },
          topRight: { x: 0.74, y: 0.16 },
          bottomRight: { x: 0.74, y: 0.54 },
          bottomLeft: { x: 0.26, y: 0.54 },
        },
        shadowIntensity: 0.55,
        shadowBlur: 24,
        shadowOffsetX: 0,
        shadowOffsetY: 16,
      },
    ],
  },

  // 3. Oficina Ejecutiva Minimal
  {
    id: 'oficina_executive',
    name: 'Oficina Ejecutiva & Escritorio',
    category: 'oficina',
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=85',
    positions: [
      {
        id: 'pos_oficina_1',
        name: 'Sobre Escritorio',
        quad: {
          topLeft: { x: 0.3, y: 0.15 },
          topRight: { x: 0.7, y: 0.15 },
          bottomRight: { x: 0.7, y: 0.48 },
          bottomLeft: { x: 0.3, y: 0.48 },
        },
        shadowIntensity: 0.58,
        shadowBlur: 26,
        shadowOffsetX: 3,
        shadowOffsetY: 16,
      },
    ],
  },

  // 4. Dormitorio Nórdico Cama
  {
    id: 'dormitorio_cozy',
    name: 'Dormitorio Nórdico Moderno',
    category: 'dormitorio',
    imageUrl: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1600&q=85',
    positions: [
      {
        id: 'pos_dormitorio_1',
        name: 'Sobre Respaldar de Cama',
        quad: {
          topLeft: { x: 0.28, y: 0.14 },
          topRight: { x: 0.72, y: 0.14 },
          bottomRight: { x: 0.72, y: 0.46 },
          bottomLeft: { x: 0.28, y: 0.46 },
        },
        shadowIntensity: 0.52,
        shadowBlur: 24,
        shadowOffsetX: 2,
        shadowOffsetY: 15,
      },
    ],
  },

  // 5. Living Moderno Sillón Gris
  {
    id: 'living_nordic',
    name: 'Living Contemporáneo',
    category: 'living',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=85',
    positions: [
      {
        id: 'pos_living_nordic',
        name: 'Pared Principal',
        quad: {
          topLeft: { x: 0.29, y: 0.16 },
          topRight: { x: 0.71, y: 0.16 },
          bottomRight: { x: 0.71, y: 0.49 },
          bottomLeft: { x: 0.29, y: 0.49 },
        },
        shadowIntensity: 0.55,
        shadowBlur: 25,
        shadowOffsetX: 3,
        shadowOffsetY: 16,
      },
    ],
  },

  // 6. Recibidor & Hall de Entrada
  {
    id: 'hall_recibidor',
    name: 'Recibidor & Hall de Entrada',
    category: 'hall',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=85',
    positions: [
      {
        id: 'pos_hall_1',
        name: 'Sobre Consola',
        quad: {
          topLeft: { x: 0.3, y: 0.14 },
          topRight: { x: 0.7, y: 0.14 },
          bottomRight: { x: 0.7, y: 0.52 },
          bottomLeft: { x: 0.3, y: 0.52 },
        },
        shadowIntensity: 0.58,
        shadowBlur: 26,
        shadowOffsetX: 2,
        shadowOffsetY: 16,
      },
    ],
  },
];
