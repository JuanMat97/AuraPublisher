import { create } from 'zustand';
import { SelectedImage } from '../vite-env';
import {
  FrameType,
  FinishType,
  VinylFinish,
  AmbientLightMode,
  ReflectionType,
  ReflectionDirection,
  CanvaShadowPreset,
  SetMode,
  CATALOG_SIZES,
} from '../types/catalog';
import { EnvironmentScene, BUILTIN_ENVIRONMENTS } from '../types/environment';
import {
  PublicationType,
  DetectedAspectRatio,
  ADAPTABLE_SIZES,
  AdaptableSize,
  PUBLICATION_FINISHES,
} from '../types/publication';
import {
  detectAspectRatio,
  extractThemeAndDesignFromFilename,
  generateAutoPublicationTitle,
  generateDefaultPublicationDescription,
} from '../utils/publicationHelpers';

export type StudioView = 'studio' | 'publish' | 'seo' | 'infographics' | 'unsplash' | 'presets';


export interface ProductConfigState {
  sizeId: string;
  frameId: FrameType;
  vinylFinish: VinylFinish;
  hasResina: boolean;
  finishId: FinishType;
  lightMode: AmbientLightMode;
  reflectionType: ReflectionType;
  reflectionDirection: ReflectionDirection;
  reflectionAngleDeg: number;
  reflectionIntensity: number;
  reflectionScale: number;
  reflectionRoughness: number;
  wallHarmonization: number; // 0..1 (default 0.35)
  resinGloss: number;
  wallAngle: number;
  pitchDeg: number;
  isWallAnchored?: boolean;
  wallCalibratedAngle?: number;
  wallCalibratedPitch?: number;
  sunIntensity?: number;
  ceilingLightsEnabled?: boolean;
  ceilingLightTemp?: 'warm' | 'neutral' | 'cool';
  placementMode?: 'wall' | 'shelf';
  lightPos3D?: { x: number; y: number; z: number };
  lightSource3D?: { x: number; y: number; z: number };
  setSpacingCm: number;
  setMode: SetMode;
  title: string;
  sku?: string;
  notes?: string;

  // Complete Canva Image Adjustment Suite
  temperature: number; // -50..50 (default 0)
  tint: number; // -50..50 (default 0)
  brightness: number; // -50..50 (default 0)
  contrast: number; // -50..50 (default 0)
  highlights: number; // -50..50 (default 0)
  shadowsTone: number; // -50..50 (default 0)
  whites: number; // -50..50 (default 0)
  blacks: number; // -50..50 (default 0)
  hue: number; // -180..180 (default 0)
  saturation: number; // -100..100 (default 0)
  invert: boolean; // default false
  glassOverlay: boolean; // default true

  // Canva-Style Advanced Shadows
  shadowPreset: CanvaShadowPreset;
  shadowAngleDeg: number;
  shadowDistance: number;
  shadowBlur: number;
  shadowIntensity: number;
  shadowColor: string;
}

export interface Preset {
  id: string;
  name: string;
  config: ProductConfigState;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  artworkName: string;
  imagesCount: number;
  outputFolder: string;
  productConfig: ProductConfigState;
  files: string[];
}

export interface GeneratedItem {
  id: string;
  title: string;
  category: 'portada' | 'ambiente' | 'close_up' | 'detalle' | 'medidas' | 'resina_beneficios';
  base64: string;
  targetFilename: string;
}

interface AppStore {
  currentView: StudioView;
  setCurrentView: (view: StudioView) => void;

  // Publication Workflow Step (1: Cargar, 2: Mockups, 3: Publicar, 4: Exportar)
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Publication Metadata
  detectedAspectRatio: DetectedAspectRatio;
  publicationTheme: string;
  setPublicationTheme: (theme: string) => void;
  designName: string;
  setDesignName: (name: string) => void;
  publicationType: PublicationType;
  setPublicationType: (type: PublicationType) => void;
  publicationTitle: string;
  setPublicationTitle: (title: string) => void;
  publicationDescription: string;
  setPublicationDescription: (desc: string) => void;
  selectedSizes: string[];
  setSelectedSizes: (sizes: string[]) => void;
  toggleSelectedSize: (sizeId: string) => void;
  selectedFinishes: string[];
  setSelectedFinishes: (finishes: string[]) => void;
  toggleSelectedFinish: (finishId: string) => void;
  sizePrices: Record<string, number>;
  setSizePrice: (sizeId: string, price: number) => void;
  setSizePrices: (prices: Record<string, number>) => void;
  generateAutoTitle: () => void;
  generateAutoDescription: () => void;

  selectedImage: SelectedImage | null;
  setSelectedImage: (img: SelectedImage | null) => void;
  artworkSlots: Array<SelectedImage | null>;
  setSlotArtwork: (index: number, img: SelectedImage | null) => void;
  swapArtworkSlots: (indexA: number, indexB: number) => void;

  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;

  productConfig: ProductConfigState;
  setProductConfig: (config: Partial<ProductConfigState>) => void;

  orbitRotation: { x: number; y: number };
  setOrbitRotation: (rot: { x: number; y: number }) => void;

  environments: EnvironmentScene[];
  selectedPositions: Array<{ envId: string; posId: string }>;
  togglePosition: (envId: string, posId: string) => void;
  selectAllPositions: () => void;
  clearPositions: () => void;
  addCustomEnvironment: (env: EnvironmentScene) => void;
  updateEnvironment: (env: EnvironmentScene) => void;
  deleteEnvironment: (envId: string) => void;
  moveEnvironment: (index: number, direction: 'left' | 'right') => void;
  setEnvironmentAsCover: (envId: string) => void;

  presets: Preset[];
  addPreset: (name: string) => void;
  deletePreset: (id: string) => void;
  loadPreset: (preset: Preset) => void;

  outputFolder: string;
  setOutputFolder: (folder: string) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  generationProgress: { current: number; total: number; message: string };
  setGenerationProgress: (progress: { current: number; total: number; message: string }) => void;
  generatedItems: GeneratedItem[];
  setGeneratedItems: (items: GeneratedItem[]) => void;

  history: HistoryItem[];
  addHistoryItem: (item: HistoryItem) => void;
  loadInitialStore: () => Promise<void>;
  syncToStore: () => Promise<void>;
}

const defaultSizePrices: Record<string, number> = ADAPTABLE_SIZES.reduce(
  (acc: Record<string, number>, s: AdaptableSize) => ({ ...acc, [s.id]: s.defaultPrice }),
  {}
);

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: 'studio',
  setCurrentView: (view) => {
    // Sync currentStep when switching views
    let step = get().currentStep;
    if (view === 'studio') step = get().selectedImage ? 2 : 1;
    else if (view === 'publish') step = 3;
    set({ currentView: view, currentStep: step });
  },

  currentStep: 1,
  setCurrentStep: (step) => {
    set({ currentStep: step });
    if (step === 1 || step === 2) set({ currentView: 'studio' });
    else if (step === 3) set({ currentView: 'publish' });
    else if (step === 4) set({ currentView: 'publish' });
  },

  detectedAspectRatio: 'horizontal',
  publicationTheme: '',
  setPublicationTheme: (publicationTheme) => set({ publicationTheme }),
  designName: '',
  setDesignName: (designName) => set({ designName }),
  publicationType: 'individual',
  setPublicationType: (publicationType) => {
    set({ publicationType });
    // Regenerate title and description with new type if theme exists
    const currentTheme = get().publicationTheme;
    if (currentTheme) {
      const title = generateAutoPublicationTitle(publicationType, currentTheme);
      set({ publicationTitle: title });
      set((state) => ({ productConfig: { ...state.productConfig, title } }));
    }
  },
  publicationTitle: '',
  setPublicationTitle: (publicationTitle) => {
    set({ publicationTitle });
    set((state) => ({ productConfig: { ...state.productConfig, title: publicationTitle } }));
  },
  publicationDescription: '',
  setPublicationDescription: (publicationDescription) => set({ publicationDescription }),
  selectedSizes: ['60x40', '70x40', '80x45', '90x50'],
  setSelectedSizes: (selectedSizes) => set({ selectedSizes }),
  toggleSelectedSize: (sizeId) =>
    set((state) => {
      const exists = state.selectedSizes.includes(sizeId);
      return {
        selectedSizes: exists
          ? state.selectedSizes.filter((id) => id !== sizeId)
          : [...state.selectedSizes, sizeId],
      };
    }),
  selectedFinishes: ['mate', 'brillante', 'holografico', 'resina_brillante', 'resina_holografico'],
  setSelectedFinishes: (selectedFinishes) => set({ selectedFinishes }),
  toggleSelectedFinish: (finishId) =>
    set((state) => {
      const exists = state.selectedFinishes.includes(finishId);
      return {
        selectedFinishes: exists
          ? state.selectedFinishes.filter((id) => id !== finishId)
          : [...state.selectedFinishes, finishId],
      };
    }),
  sizePrices: defaultSizePrices,
  setSizePrice: (sizeId, price) =>
    set((state) => ({
      sizePrices: { ...state.sizePrices, [sizeId]: price },
    })),
  setSizePrices: (sizePrices) => set({ sizePrices }),

  generateAutoTitle: () => {
    const { publicationType, publicationTheme } = get();
    const title = generateAutoPublicationTitle(publicationType, publicationTheme);
    set({ publicationTitle: title });
    set((state) => ({ productConfig: { ...state.productConfig, title } }));
  },

  generateAutoDescription: () => {
    const { publicationTheme, designName, publicationType } = get();
    const desc = generateDefaultPublicationDescription({
      theme: publicationTheme,
      designName,
      type: publicationType,
    });
    set({ publicationDescription: desc });
  },

  selectedImage: null,
  setSelectedImage: (img) => {
    const prevSlots = get().artworkSlots;
    const newSlots = [...prevSlots];
    newSlots[0] = img;

    if (img) {
      const detectedRatio = detectAspectRatio(img.width, img.height);
      const { theme, designName } = extractThemeAndDesignFromFilename(img.filename);
      const currentType = get().publicationType;
      const autoTitle = generateAutoPublicationTitle(currentType, theme);
      const autoDesc = generateDefaultPublicationDescription({
        theme,
        designName,
        type: currentType,
      });

      // Filter and pre-select sizes matching the detected aspect ratio
      const matchingSizes = ADAPTABLE_SIZES.filter((s: AdaptableSize) => s.aspectRatio === detectedRatio).map((s: AdaptableSize) => s.id);
      const selectedSizes = matchingSizes.length > 0 ? matchingSizes : ['60x40', '70x40', '80x45', '90x50'];

      set((state) => ({
        selectedImage: img,
        artworkSlots: newSlots,
        detectedAspectRatio: detectedRatio,
        publicationTheme: theme,
        designName: designName,
        publicationTitle: autoTitle,
        publicationDescription: autoDesc,
        selectedSizes: selectedSizes,
        currentStep: state.currentStep === 1 ? 2 : state.currentStep,
        productConfig: {
          ...state.productConfig,
          title: autoTitle,
        },
      }));
    } else {
      set({
        selectedImage: null,
        artworkSlots: newSlots,
      });
    }
  },

  artworkSlots: [null, null, null],
  setSlotArtwork: (index, img) =>
    set((state) => {
      const updated = [...state.artworkSlots];
      updated[index] = img;
      return {
        artworkSlots: updated,
        selectedImage: updated[0] || state.selectedImage,
      };
    }),

  swapArtworkSlots: (indexA, indexB) =>
    set((state) => {
      const updated = [...state.artworkSlots];
      const temp = updated[indexA];
      updated[indexA] = updated[indexB];
      updated[indexB] = temp;
      return {
        artworkSlots: updated,
        selectedImage: updated[0] || state.selectedImage,
      };
    }),

  geminiApiKey: '',
  setGeminiApiKey: (geminiApiKey) => {
    set({ geminiApiKey });
    get().syncToStore();
  },

  productConfig: {
    sizeId: 'auto_native',
    frameId: 'wrap_1cm',
    vinylFinish: 'brillante',
    hasResina: true,
    finishId: 'epoxy_resina',
    lightMode: 'day',
    reflectionType: 'panoramic_window',
    reflectionDirection: 'center',
    reflectionAngleDeg: 0,
    reflectionIntensity: 0.2,
    reflectionScale: 1.0,
    reflectionRoughness: 0.08,
    wallHarmonization: 0.35,
    resinGloss: 0.85,
    wallAngle: 0,
    pitchDeg: 0,
    setSpacingCm: 3,
    setMode: 'collection',
    title: '',
    sku: 'AURA-AUTO-RES',

    // Full Canva Image Adjustment Defaults
    temperature: 0,
    tint: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadowsTone: 0,
    whites: 0,
    blacks: 0,
    hue: 0,
    saturation: 0,
    invert: false,
    glassOverlay: true,

    // Canva-Style Advanced Shadow Defaults
    shadowPreset: 'parallel',
    shadowAngleDeg: 62,
    shadowDistance: 30,
    shadowBlur: 25,
    shadowIntensity: 50,
    shadowColor: '#000000',
  },
  setProductConfig: (config) =>
    set((state) => {
      const merged = { ...state.productConfig, ...config };
      if (merged.hasResina) {
        merged.finishId = 'epoxy_resina';
      } else {
        merged.finishId = merged.vinylFinish as FinishType;
      }
      setTimeout(() => get().syncToStore(), 200);
      return { productConfig: merged };
    }),

  orbitRotation: { x: 0.08, y: 0.35 },
  setOrbitRotation: (orbitRotation) => set({ orbitRotation }),

  environments: BUILTIN_ENVIRONMENTS,
  selectedPositions: [
    { envId: 'living_scandi', posId: 'pos_living_1' },
    { envId: 'galeria_moderna', posId: 'pos_galeria_1' },
    { envId: 'oficina_executive', posId: 'pos_oficina_1' },
  ],
  togglePosition: (envId, posId) =>
    set((state) => {
      const exists = state.selectedPositions.some(
        (p) => p.envId === envId && p.posId === posId
      );
      if (exists) {
        return {
          selectedPositions: state.selectedPositions.filter(
            (p) => !(p.envId === envId && p.posId === posId)
          ),
        };
      } else {
        return {
          selectedPositions: [...state.selectedPositions, { envId, posId }],
        };
      }
    }),
  selectAllPositions: () => {
    const allPos: Array<{ envId: string; posId: string }> = [];
    get().environments.forEach((env) => {
      env.positions.forEach((pos) => {
        allPos.push({ envId: env.id, posId: pos.id });
      });
    });
    set({ selectedPositions: allPos });
  },
  clearPositions: () => set({ selectedPositions: [] }),

  addCustomEnvironment: (env) => {
    const updated = [env, ...get().environments];
    set({
      environments: updated,
      selectedPositions: [...get().selectedPositions, { envId: env.id, posId: env.positions[0]?.id || '' }],
    });
    get().syncToStore();
  },

  updateEnvironment: (updatedEnv) => {
    const updated = get().environments.map((e) => (e.id === updatedEnv.id ? updatedEnv : e));
    set({ environments: updated });
    get().syncToStore();
  },

  deleteEnvironment: (envId) => {
    const updated = get().environments.filter((e) => e.id !== envId);
    set({
      environments: updated,
      selectedPositions: get().selectedPositions.filter((p) => p.envId !== envId),
    });
    get().syncToStore();
  },

  moveEnvironment: (index, direction) => {
    const list = [...get().environments];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    set({ environments: list });
    get().syncToStore();
  },

  setEnvironmentAsCover: (envId) => {
    const list = [...get().environments];
    const index = list.findIndex((e) => e.id === envId);
    if (index < 0) return;
    const [item] = list.splice(index, 1);
    list.unshift(item);
    const posId = item.positions[0]?.id || '';
    const otherSelected = get().selectedPositions.filter((p) => p.envId !== envId);
    set({ environments: list, selectedPositions: [{ envId, posId }, ...otherSelected] });
    get().syncToStore();
  },

  presets: [
    {
      id: 'preset_auto_native',
      name: 'Proporción Original (Resina Epoxi)',
      config: {
        sizeId: 'auto_native',
        frameId: 'wrap_1cm',
        vinylFinish: 'brillante',
        hasResina: true,
        finishId: 'epoxy_resina',
        lightMode: 'day',
        reflectionType: 'panoramic_window',
        reflectionDirection: 'center',
        reflectionAngleDeg: 0,
        reflectionIntensity: 0.2,
        reflectionScale: 1.0,
        reflectionRoughness: 0.08,
        wallHarmonization: 0.35,
        resinGloss: 0.85,
        wallAngle: 0,
        pitchDeg: 0,
        setSpacingCm: 3,
        setMode: 'collection',
        title: '',
        sku: 'AURA-AUTO-RES',
        temperature: 0,
        tint: 0,
        brightness: 0,
        contrast: 0,
        highlights: 0,
        shadowsTone: 0,
        whites: 0,
        blacks: 0,
        hue: 0,
        saturation: 0,
        invert: false,
        glassOverlay: true,
        shadowPreset: 'parallel',
        shadowAngleDeg: 62,
        shadowDistance: 30,
        shadowBlur: 25,
        shadowIntensity: 50,
        shadowColor: '#000000',
      },
    },
  ],
  addPreset: (name) => {
    const newPreset: Preset = {
      id: 'preset_' + Date.now(),
      name,
      config: { ...get().productConfig },
    };
    const updated = [...get().presets, newPreset];
    set({ presets: updated });
    get().syncToStore();
  },
  deletePreset: (id) => {
    const updated = get().presets.filter((p) => p.id !== id);
    set({ presets: updated });
    get().syncToStore();
  },
  loadPreset: (preset) => {
    set((state) => ({
      productConfig: {
        ...state.productConfig,
        ...preset.config,
      },
    }));
  },

  outputFolder: 'C:\\AuraPublisher_Renders',
  setOutputFolder: (folder) => {
    set({ outputFolder: folder });
    get().syncToStore();
  },

  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
  generationProgress: { current: 0, total: 0, message: '' },
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
  generatedItems: [],
  setGeneratedItems: (items) => set({ generatedItems: items }),

  history: [],
  addHistoryItem: (item) => {
    const updated = [item, ...get().history];
    set({ history: updated });
    get().syncToStore();
  },

  loadInitialStore: async () => {
    if (window.electronAPI) {
      try {
        const storeData = await window.electronAPI.getStore();
        if (storeData) {
          if (storeData.environments && Array.isArray(storeData.environments) && storeData.environments.length > 0) {
            set({ environments: storeData.environments });
          } else if (storeData.customEnvironments && storeData.customEnvironments.length > 0) {
            set({ environments: [...storeData.customEnvironments, ...BUILTIN_ENVIRONMENTS] });
          }
          if (storeData.geminiApiKey) set({ geminiApiKey: storeData.geminiApiKey });
          if (storeData.productConfig) {
            set((state) => ({ productConfig: { ...state.productConfig, ...storeData.productConfig } }));
          }
          if (storeData.presets) set({ presets: storeData.presets });
          if (storeData.history) set({ history: storeData.history });
          if (storeData.outputFolder) set({ outputFolder: storeData.outputFolder });
          if (storeData.publicationType) set({ publicationType: storeData.publicationType });
          if (storeData.sizePrices) set((state) => ({ sizePrices: { ...state.sizePrices, ...storeData.sizePrices } }));
          if (storeData.selectedFinishes) set({ selectedFinishes: storeData.selectedFinishes });
        }
      } catch (e) {
        console.error('Error loading electron store:', e);
      }
    }
  },

  syncToStore: async () => {
    if (window.electronAPI) {
      const state = get();
      await window.electronAPI.setStore({
        geminiApiKey: state.geminiApiKey,
        environments: state.environments,
        productConfig: state.productConfig,
        presets: state.presets,
        history: state.history,
        outputFolder: state.outputFolder,
        publicationType: state.publicationType,
        sizePrices: state.sizePrices,
        selectedFinishes: state.selectedFinishes,
      });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useAppStore.getState().syncToStore();
  });
}
