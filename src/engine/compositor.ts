import { EnvironmentScene } from '../types/environment';
import { ProductConfigState, GeneratedItem } from '../store/appStore';
import { CATALOG_SIZES } from '../types/catalog';
import { renderFramedCanvas } from './frameRenderer';
import { renderSmartMoldComposite } from './smartMoldEngine';
import { getReflectionTypeForEnvironment } from './webglRoomEngine';
import { loadImageElement } from '../utils/imageLoader';
import { SelectedImage } from '../vite-env';

export interface GenerateMockupsOptions {
  artworkImage: HTMLImageElement;
  artworkSlots?: Array<SelectedImage | null>;
  productConfig: ProductConfigState;
  environments: EnvironmentScene[];
  selectedPositions: Array<{ envId: string; posId: string }>;
  onProgress?: (current: number, total: number, message: string) => void;
}

export async function generateFullMockupSet(
  options: GenerateMockupsOptions
): Promise<GeneratedItem[]> {
  const { artworkImage, artworkSlots = [], productConfig, environments, selectedPositions, onProgress } = options;

  const results: GeneratedItem[] = [];
  const sizeOpt = CATALOG_SIZES.find((s) => s.id === productConfig.sizeId) || CATALOG_SIZES[0];
  const panelCount = sizeOpt.panelsCount || 1;

  const sanitizedTitle = (productConfig.title || selectedImageTitle(artworkSlots, artworkImage) || 'cuadro-aurastudio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const totalMockups = selectedPositions.length;
  if (totalMockups === 0) return results;

  // 1. Prepare Framed Canvases for the Panels
  onProgress?.(1, totalMockups, 'Renderizando paneles del set en alta resolución...');

  const framedPanels: HTMLCanvasElement[] = [];

  if (panelCount > 1 && productConfig.setMode === 'collection') {
    for (let i = 0; i < panelCount; i++) {
      const slotImgData = artworkSlots[i];
      let imgToUse = artworkImage;
      if (slotImgData) {
        try {
          imgToUse = await loadImageElement(slotImgData.path);
        } catch {
          imgToUse = artworkImage;
        }
      }
      const pCanvas = renderFramedCanvas({
        artworkImage: imgToUse,
        frameType: 'wrap_1cm',
        finishType: productConfig.vinylFinish,
        panelConfig: 'single',
        targetWidth: 1000,
      });
      framedPanels.push(pCanvas);
    }
  } else if (panelCount > 1 && productConfig.setMode === 'split') {
    const sliceW = Math.floor(artworkImage.width / panelCount);
    const sliceH = artworkImage.height;

    for (let i = 0; i < panelCount; i++) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = sliceW;
      sliceCanvas.height = sliceH;
      const sCtx = sliceCanvas.getContext('2d')!;
      sCtx.drawImage(artworkImage, i * sliceW, 0, sliceW, sliceH, 0, 0, sliceW, sliceH);

      const pCanvas = renderFramedCanvas({
        artworkImage: sliceCanvas as any,
        frameType: 'wrap_1cm',
        finishType: productConfig.vinylFinish,
        panelConfig: 'single',
        targetWidth: 1000,
      });
      framedPanels.push(pCanvas);
    }
  } else {
    const pCanvas = renderFramedCanvas({
      artworkImage,
      frameType: 'wrap_1cm',
      finishType: productConfig.vinylFinish,
      panelConfig: 'single',
      targetWidth: 1400,
    });
    framedPanels.push(pCanvas);
  }

  // 2. Generate ONLY the selected Environment Mockups
  let envCounter = 1;

  for (const sel of selectedPositions) {
    const env = environments.find((e) => e.id === sel.envId);
    if (!env) continue;
    const pos = env.positions.find((p) => p.id === sel.posId) || env.positions[0];
    if (!pos) continue;

    onProgress?.(
      envCounter,
      totalMockups,
      `Componiendo Foto ${envCounter}/${totalMockups}: ${env.name}...`
    );

    const envImg = await loadImageElement(env.imageUrl);

    const centerX = pos.quad ? (pos.quad.topLeft.x + pos.quad.topRight.x) / 2 : 0.5;
    const centerY = pos.quad ? (pos.quad.topLeft.y + pos.quad.bottomLeft.y) / 2 : 0.32;
    const scaleWidth = pos.quad ? Math.abs(pos.quad.topRight.x - pos.quad.topLeft.x) : 0.42;

    const canvas = renderSmartMoldComposite({
      envImage: envImg,
      framedArtworks: framedPanels,
      mold: {
        centerX,
        centerY,
        scaleWidth,
        fitMode: 'contain',
        vinylFinish: productConfig.vinylFinish,
        hasResina: productConfig.hasResina,
        lightMode: productConfig.lightMode,
        reflectionType: pos.reflectionType ?? getReflectionTypeForEnvironment(env.category),
        reflectionDirection: pos.reflectionDirection ?? productConfig.reflectionDirection,
        reflectionAngleDeg: pos.reflectionAngleDeg ?? productConfig.reflectionAngleDeg,
        reflectionIntensity: pos.reflectionIntensity ?? productConfig.reflectionIntensity,
        reflectionScale: pos.reflectionScale ?? productConfig.reflectionScale,
        reflectionRoughness: pos.reflectionRoughness ?? productConfig.reflectionRoughness,
        reflectionBrightness: pos.reflectionBrightness,
        reflectionContrast: pos.reflectionContrast,
        weatherPreset: pos.weatherPreset,
        wallHarmonization: pos.wallHarmonization ?? productConfig.wallHarmonization ?? 0.35,
        wallAngle: pos.wallAngle ?? productConfig.wallAngle,
        pitchDeg: pos.pitchDeg ?? productConfig.pitchDeg,
        rollDeg: pos.rollDeg ?? 0,
        thicknessCm: pos.thicknessCm ?? 1.0,
        zDistance: pos.zDistance ?? 0,
        shelfContactShadow: pos.shelfContactShadow,
        gapCm: productConfig.setSpacingCm,
        adjust: pos.adjust ?? productConfig,
        shadowPreset: pos.shadowPreset,
        shadowAngleDeg: productConfig.shadowAngleDeg,
        shadowDistance: productConfig.shadowDistance,
        shadowBlur: pos.shadowBlur,
        shadowIntensity: pos.shadowStyleIntensity,
        shadowColor: productConfig.shadowColor,
      },
      canvasWidth: 1920,
      canvasHeight: 1920,
    });

    const isPortada = envCounter === 1;
    const categoryName = isPortada ? 'portada' : 'ambiente';
    const envSlug = env.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const filename = isPortada
      ? `01-portada-${sanitizedTitle}.jpg`
      : `${String(envCounter).padStart(2, '0')}-ambiente-${envSlug}-${sanitizedTitle}.jpg`;

    results.push({
      id: 'gen_' + Date.now() + '_' + envCounter,
      title: isPortada ? `Foto 1 (Portada Principal) — ${env.name}` : `Foto ${envCounter} (Ambiente) — ${env.name}`,
      category: categoryName,
      base64: canvas.toDataURL('image/jpeg', 0.92),
      targetFilename: filename,
    });

    envCounter++;
  }

  return results;
}

function selectedImageTitle(slots: Array<SelectedImage | null>, fallbackImg: HTMLImageElement): string {
  const firstSlot = slots.find((s) => s && s.filename);
  if (firstSlot && firstSlot.filename) {
    return firstSlot.filename.replace(/\.[^/.]+$/, '');
  }
  return 'cuadro';
}
