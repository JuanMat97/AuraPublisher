export interface FinishMetadata {
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  specularIntensity: number;
  iridescence?: number;
  iridescenceIOR?: number;
  colorBoost?: number;
}

export const finishPresets: Record<string, FinishMetadata> = {
  mate: {
    roughness: 0.92,
    clearcoat: 0,
    clearcoatRoughness: 0.9,
    envMapIntensity: 0.3,
    specularIntensity: 0.3,
    iridescence: 0,
  },
  brillante: {
    roughness: 0.22,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
    specularIntensity: 1.4,
    iridescence: 0,
  },
  tornasolado: {
    roughness: 0.15,
    clearcoat: 0.7,
    clearcoatRoughness: 0.06,
    iridescence: 1.0,
    iridescenceIOR: 1.45,
    envMapIntensity: 2.5,
    specularIntensity: 1.5,
  },
};

export const RESIN_OVERLAY: FinishMetadata = {
  roughness: 0.012,
  clearcoat: 1.0,
  clearcoatRoughness: 0.01,
  envMapIntensity: 4.5,
  specularIntensity: 2.2,
  colorBoost: 1.06,
};

export const FINISH_LIST = [
  { key: 'mate', label: 'Mate' },
  { key: 'brillante', label: 'Brillante' },
  { key: 'tornasolado', label: 'Tornasolado' },
] as const;

export const DEFAULT_FINISH = 'brillante';

