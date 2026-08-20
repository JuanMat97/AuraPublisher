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
    roughness: 0.42,
    clearcoat: 0.30,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.90,
    specularIntensity: 0.90,
    iridescence: 0,
  },
  brillante: {
    roughness: 0.10,
    clearcoat: 0.88,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2.2,
    specularIntensity: 1.9,
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
  roughness: 0.002,
  clearcoat: 1.0,
  clearcoatRoughness: 0.002,
  envMapIntensity: 6.0,
  specularIntensity: 3.0,
  colorBoost: 1.08,
};

export const FINISH_LIST = [
  { key: 'mate', label: 'Mate' },
  { key: 'brillante', label: 'Brillante' },
  { key: 'tornasolado', label: 'Tornasolado' },
] as const;

export const DEFAULT_FINISH = 'brillante';

