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
    roughness: 0.88,
    clearcoat: 0.05,
    clearcoatRoughness: 0.85,
    envMapIntensity: 0.25,
    specularIntensity: 0.35,
    iridescence: 0,
  },
  brillante: {
    roughness: 0.20,
    clearcoat: 0.65,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
    specularIntensity: 1.4,
    iridescence: 0,
  },
  tornasolado: {
    roughness: 0.15,
    clearcoat: 0.70,
    clearcoatRoughness: 0.06,
    iridescence: 1.0,
    iridescenceIOR: 1.45,
    envMapIntensity: 2.5,
    specularIntensity: 1.5,
  },
};

export const RESIN_OVERLAY: FinishMetadata = {
  roughness: 0.008,
  clearcoat: 1.0,
  clearcoatRoughness: 0.008,
  envMapIntensity: 4.8,
  specularIntensity: 2.4,
  colorBoost: 1.06,
};

export const FINISH_LIST = [
  { key: 'mate', label: 'Mate' },
  { key: 'brillante', label: 'Brillante' },
  { key: 'tornasolado', label: 'Tornasolado' },
] as const;

export const DEFAULT_FINISH = 'brillante';

