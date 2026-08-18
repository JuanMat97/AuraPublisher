export type PanelConfig = 'single' | 'diptych' | 'triptych' | 'polyptych';
export type Orientation = 'vertical' | 'horizontal' | 'square';
export type FrameType = 'wrap_1cm';
export type VinylFinish = 'mate' | 'brillante' | 'tornasolado';
export type FinishType = VinylFinish | 'epoxy_resina' | 'satin';
export type AmbientLightMode = 'day' | 'sunset' | 'night' | 'nordic_cold' | 'warm_home' | 'neon_gamer';
export type ReflectionType = 'studio_grid' | 'art_gallery' | 'industrial_loft' | 'spotlight' | 'sunset_window' | 'crystal_minimal';
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
  { id: 'studio_grid', name: 'Ventanal con Árboles', icon: '🌳', description: 'Ventanal piso-techo con follaje exterior y cielo HDR' },
  { id: 'industrial_loft', name: 'Loft 9 Paneles', icon: '🏙️', description: 'Gran ventanal industrial con 9 cuadrantes de hierro' },
  { id: 'crystal_minimal', name: 'Softbox Comercial', icon: '💎', description: 'Caja de luz de estudio fotográfico publicitario' },
  { id: 'spotlight', name: 'Luz de Living', icon: '🛋️', description: 'Ventana lateral moderna con luz natural y silueta' },
  { id: 'sunset_window', name: 'Persianas Venecianas', icon: '🌅', description: 'Rayos nítidos con persianas horizontales de madera' },
  { id: 'art_gallery', name: 'Focos de Galería', icon: '🏛️', description: 'Riel cenital de focos proyectores de museo' },
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
