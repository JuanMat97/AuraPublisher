export interface DimensionPricingItem {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  aspectRatio: 'square' | 'vertical' | 'horizontal';
  basePrice: number;
  active: boolean;
}

export interface FinishPricingItem {
  id: string;
  name: string;
  surcharge: number;
  active: boolean;
}

export interface PricingConfig {
  dimensions: DimensionPricingItem[];
  finishes: FinishPricingItem[];
  manufacturingDays: number; // default 2
  defaultStock: number; // default 25
  salesFormat: string; // 'Unidad'
  warrantyDays?: number; // default 30

  // Compatibility fields for legacy mass publisher
  basePrices?: Record<string, number>;
  finishSurcharges?: Record<string, number>;
  freeShippingThreshold?: number;
  defaultSizes?: string[];
  defaultFinishes?: string[];
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  dimensions: [
    {
      id: '25x25',
      name: '25 × 25 cm (Cuadrado chico)',
      widthCm: 25,
      heightCm: 25,
      aspectRatio: 'square',
      basePrice: 14900,
      active: true,
    },
    {
      id: '50x50',
      name: '50 × 50 cm (Cuadrado grande)',
      widthCm: 50,
      heightCm: 50,
      aspectRatio: 'square',
      basePrice: 29900,
      active: true,
    },
    {
      id: '30x40',
      name: '30 × 40 cm (Vertical estándar)',
      widthCm: 30,
      heightCm: 40,
      aspectRatio: 'vertical',
      basePrice: 19900,
      active: true,
    },
    {
      id: '60x40',
      name: '60 × 40 cm (Horizontal mediano)',
      widthCm: 60,
      heightCm: 40,
      aspectRatio: 'horizontal',
      basePrice: 34900,
      active: true,
    },
    {
      id: '70x40',
      name: '70 × 40 cm (Horizontal intermedio)',
      widthCm: 70,
      heightCm: 40,
      aspectRatio: 'horizontal',
      basePrice: 42900,
      active: true,
    },
    {
      id: '80x45',
      name: '80 × 45 cm (Horizontal panorámico)',
      widthCm: 80,
      heightCm: 45,
      aspectRatio: 'horizontal',
      basePrice: 49900,
      active: true,
    },
    {
      id: '90x50',
      name: '90 × 50 cm (Horizontal grande)',
      widthCm: 90,
      heightCm: 50,
      aspectRatio: 'horizontal',
      basePrice: 59900,
      active: true,
    },
    {
      id: '90x30',
      name: '90 × 30 cm (Panorámico estrecho)',
      widthCm: 90,
      heightCm: 30,
      aspectRatio: 'horizontal',
      basePrice: 39900,
      active: true,
    },
  ],
  finishes: [
    {
      id: 'mate',
      name: 'Vinilo Mate',
      surcharge: 0,
      active: true,
    },
    {
      id: 'brillante',
      name: 'Vinilo Brillante',
      surcharge: 0,
      active: true,
    },
    {
      id: 'resina_epoxi',
      name: 'Resina Cristal Epoxi',
      surcharge: 8500,
      active: true,
    },
    {
      id: 'holografico',
      name: 'Holográfico Especial',
      surcharge: 3900,
      active: true,
    },
  ],
  manufacturingDays: 2,
  defaultStock: 25,
  salesFormat: 'Unidad',
  warrantyDays: 30,
};
