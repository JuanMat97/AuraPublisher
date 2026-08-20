export * from './pricing';

export type PublicationType = 'individual' | 'set' | 'personalizado' | 'resina';

export type PublicationFinish =
  | 'mate'
  | 'brillante'
  | 'holografico'
  | 'resina_brillante'
  | 'resina_holografico';

export type DetectedAspectRatio = 'square' | 'horizontal' | 'vertical';

export interface DimensionOption {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  basePrice: number;
  aspectRatio: DetectedAspectRatio;
  label?: string;
  description?: string;
}

export interface PublicationVariant {
  designName: string;
  finish: PublicationFinish;
  size: DimensionOption;
  price: number;
  sku: string;
  stock: number;
  imagePaths: string[];

  // Compatibility fields for legacy helpers
  sizeId?: string;
  sizeLabel?: string;
  finishId?: string;
  finishLabel?: string;
  basePrice?: number;
  surcharge?: number;
  finalPrice?: number;
}

export interface PublicationListing {
  title: string;
  theme: string;
  type: PublicationType;
  description: string;
  variants: PublicationVariant[];
  categoryId: string;
  brand?: string;
  model?: string;
  manufacturingDays?: number;
  warrantyDays?: number;
  freeShippingThreshold?: number;
}

export interface FinishMetadata {
  id: PublicationFinish;
  name: string;
  description: string;
  badge: string;
  mlColorName: string;
  surcharge: number;
  priceMultiplier: number;
}

export interface AdaptableSize extends DimensionOption {
  label: string;
  defaultPrice: number;
  description: string;
}

export const PUBLICATION_FINISHES_RECORD: Record<PublicationFinish, FinishMetadata> = {
  mate: {
    id: 'mate',
    name: 'Mate',
    surcharge: 0,
    badge: 'CLÁSICO',
    description: 'Vinilo anti-reflejo suave de alta densidad',
    mlColorName: 'Negro Mate',
    priceMultiplier: 1.0,
  },
  brillante: {
    id: 'brillante',
    name: 'Brillante',
    surcharge: 0,
    badge: 'POPULAR',
    description: 'Vinilo glossy con realce vívido de colores',
    mlColorName: 'Brillante',
    priceMultiplier: 1.0,
  },
  holografico: {
    id: 'holografico',
    name: 'Holográfico',
    surcharge: 2500,
    badge: 'ESTELAR',
    description: 'Efecto tornasolado que brilla con la luz ambiental',
    mlColorName: 'Plateado Tornasolado',
    priceMultiplier: 1.15,
  },
  resina_brillante: {
    id: 'resina_brillante',
    name: 'Resina Brillante',
    surcharge: 4500,
    badge: 'PREMIUM',
    description: 'Capa vítrea de Resina Epoxi 3mm con brillo espejo',
    mlColorName: 'Cristal Brillante',
    priceMultiplier: 1.45,
  },
  resina_holografico: {
    id: 'resina_holografico',
    name: 'Resina Holográfico',
    surcharge: 6000,
    badge: 'COLECCIÓN',
    description: 'Resina Epoxi + destellos tornasolados galácticos',
    mlColorName: 'Cristal Holográfico',
    priceMultiplier: 1.6,
  },
};

export const PUBLICATION_FINISHES_MAP = PUBLICATION_FINISHES_RECORD;
export const PUBLICATION_FINISHES: FinishMetadata[] = Object.values(PUBLICATION_FINISHES_RECORD);

export const STANDARD_DIMENSIONS: DimensionOption[] = [
  {
    id: 'v_50x70',
    name: '50 × 70 cm (3:4 Vertical)',
    label: '50 × 70 cm',
    widthCm: 50,
    heightCm: 70,
    basePrice: 24900,
    aspectRatio: 'vertical',
    description: '3:4 Proporción dorada',
  },
  {
    id: 'v_70x100',
    name: '70 × 100 cm (Living XL)',
    label: '70 × 100 cm',
    widthCm: 70,
    heightCm: 100,
    basePrice: 38900,
    aspectRatio: 'vertical',
    description: 'Pared completa vertical XL',
  },
  {
    id: 'sq_80x80',
    name: '80 × 80 cm (1:1 Cuadrado)',
    label: '80 × 80 cm',
    widthCm: 80,
    heightCm: 80,
    basePrice: 32900,
    aspectRatio: 'square',
    description: 'Cuadrado XL de impacto',
  },
  {
    id: 'h_90x50',
    name: '90 × 50 cm (16:9 Panorámico)',
    label: '90 × 50 cm',
    widthCm: 90,
    heightCm: 50,
    basePrice: 29900,
    aspectRatio: 'horizontal',
    description: 'Sobre sofá o cabecera',
  },
  {
    id: 'h_100x70',
    name: '100 × 70 cm (Living Panorámico)',
    label: '100 × 70 cm',
    widthCm: 100,
    heightCm: 70,
    basePrice: 41900,
    aspectRatio: 'horizontal',
    description: 'Living XL gran impacto',
  },
  {
    id: 'trip_120x60',
    name: 'Tríptico 120 × 60 cm (3x 40x60)',
    label: '120 × 60 cm',
    widthCm: 120,
    heightCm: 60,
    basePrice: 48900,
    aspectRatio: 'horizontal',
    description: 'Set de 3 cuadros verticales',
  },
  {
    id: 'trip_150x70',
    name: 'Tríptico 150 × 70 cm (3x 50x70)',
    label: '150 × 70 cm',
    widthCm: 150,
    heightCm: 70,
    basePrice: 59900,
    aspectRatio: 'horizontal',
    description: 'Set de 3 cuadros XL pared completa',
  },
];

export const ADAPTABLE_SIZES: AdaptableSize[] = [
  // Square (1:1)
  { id: '25x25', name: '25 × 25 cm', label: '25 × 25 cm', aspectRatio: 'square', widthCm: 25, heightCm: 25, defaultPrice: 14900, basePrice: 14900, description: 'Cuadrado chico / Setup Desk' },
  { id: '50x50', name: '50 × 50 cm', label: '50 × 50 cm', aspectRatio: 'square', widthCm: 50, heightCm: 50, defaultPrice: 24900, basePrice: 24900, description: 'Cuadrado mediano versátil' },
  { id: '80x80', name: '80 × 80 cm', label: '80 × 80 cm', aspectRatio: 'square', widthCm: 80, heightCm: 80, defaultPrice: 36900, basePrice: 36900, description: 'Cuadrado XL de impacto' },

  // Horizontal (> 1.05)
  { id: '60x40', name: '60 × 40 cm', label: '60 × 40 cm', aspectRatio: 'horizontal', widthCm: 60, heightCm: 40, defaultPrice: 25900, basePrice: 25900, description: 'Horizontal estándar' },
  { id: '70x40', name: '70 × 40 cm', label: '70 × 40 cm', aspectRatio: 'horizontal', widthCm: 70, heightCm: 40, defaultPrice: 28900, basePrice: 28900, description: 'Horizontal panorámico' },
  { id: '80x45', name: '80 × 45 cm', label: '80 × 45 cm', aspectRatio: 'horizontal', widthCm: 80, heightCm: 45, defaultPrice: 31900, basePrice: 31900, description: '16:9 Panorámico de cine' },
  { id: '90x50', name: '90 × 50 cm', label: '90 × 50 cm', aspectRatio: 'horizontal', widthCm: 90, heightCm: 50, defaultPrice: 34900, basePrice: 34900, description: 'Sobre sofá o cabecera' },
  { id: '90x30', name: '90 × 30 cm', label: '90 × 30 cm', aspectRatio: 'horizontal', widthCm: 90, heightCm: 30, defaultPrice: 27900, basePrice: 27900, description: 'Ultra panorámico estilizado' },
  { id: '100x70', name: '100 × 70 cm', label: '100 × 70 cm', aspectRatio: 'horizontal', widthCm: 100, heightCm: 70, defaultPrice: 42900, basePrice: 42900, description: 'Living XL gran impacto' },
  { id: '120x60', name: '120 × 60 cm', label: '120 × 60 cm', aspectRatio: 'horizontal', widthCm: 120, heightCm: 60, defaultPrice: 46900, basePrice: 46900, description: 'Gran formato / Tríptico' },

  // Vertical (< 0.95)
  { id: '40x60', name: '40 × 60 cm', label: '40 × 60 cm', aspectRatio: 'vertical', widthCm: 40, heightCm: 60, defaultPrice: 25900, basePrice: 25900, description: 'Vertical estándar clásico' },
  { id: '40x70', name: '40 × 70 cm', label: '40 × 70 cm', aspectRatio: 'vertical', widthCm: 40, heightCm: 70, defaultPrice: 28900, basePrice: 28900, description: 'Vertical panorámico' },
  { id: '45x80', name: '45 × 80 cm', label: '45 × 80 cm', aspectRatio: 'vertical', widthCm: 45, heightCm: 80, defaultPrice: 31900, basePrice: 31900, description: 'Vertical estilizado' },
  { id: '50x90', name: '50 × 90 cm', label: '50 × 90 cm', aspectRatio: 'vertical', widthCm: 50, heightCm: 90, defaultPrice: 34900, basePrice: 34900, description: 'Vertical esbelto XL' },
  { id: '30x90', name: '30 × 90 cm', label: '30 × 90 cm', aspectRatio: 'vertical', widthCm: 30, heightCm: 90, defaultPrice: 27900, basePrice: 27900, description: 'Columna vertical delgada' },
  { id: '50x70', name: '50 × 70 cm', label: '50 × 70 cm', aspectRatio: 'vertical', widthCm: 50, heightCm: 70, defaultPrice: 29900, basePrice: 29900, description: '3:4 Proporción dorada' },
  { id: '70x100', name: '70 × 100 cm', label: '70 × 100 cm', aspectRatio: 'vertical', widthCm: 70, heightCm: 100, defaultPrice: 42900, basePrice: 42900, description: 'Pared completa vertical XL' },
];

export interface LibraryTitle {
  id: string;
  titulo: string;
  titulo_original?: string;
  anio?: string | number;
  generos?: string[];
  sinopsis?: string;
  poster_path?: string;
  posterUrl?: string;
  category?: 'peliculas' | 'series' | 'anime' | 'gamer' | 'musica' | 'deportes' | 'arte_general' | string;
  finishType?: 'resina' | 'vinilo' | 'mate' | 'brillante' | string;
  seoTitle?: string;
  selected?: boolean;
  variantsCount?: number;
  customPrice?: number;
  availableSizes?: string[];
}

export type { DimensionPricingItem, FinishPricingItem, PricingConfig } from './pricing';

