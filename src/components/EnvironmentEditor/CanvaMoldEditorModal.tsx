import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { EnvironmentScene, WeatherPreset } from '../../types/environment';
import { loadImageElement, getSampleArtwork } from '../../utils/imageLoader';
import { useAppStore } from '../../store/appStore';
import {
  AmbientLightMode,
  ReflectionType,
  REFLECTION_OPTIONS,
  CanvaShadowPreset,
  CANVA_SHADOW_OPTIONS,
  CATALOG_SIZES,
} from '../../types/catalog';
import {
  applyCanvaAdjustmentsToCanvas,
  drawExactFrameShadowToContext,
  generateRaytracingEquirectangularMap,
  getReflectionTypeForEnvironment,
  sampleWallLighting,
  WallLightingSample,
} from '../../engine/webglRoomEngine';
import { finishPresets, RESIN_OVERLAY } from '../configurador3d/finishPresets';
import { getEdgeTextures } from '../configurador3d/textureUtils';
import { clearThumbnailCache } from '../Workspace/MockupGridView';
import {
  X,
  Check,
  Move,
  Sliders,
  Sun,
  Layers,
  Palette,
  RotateCcw,
  Target,
  Sparkles,
  CloudSun,
  Box,
} from 'lucide-react';

interface CanvaMoldEditorModalProps {
  environment: EnvironmentScene;
  onClose: () => void;
}

type EditorTab = 'perspective' | 'color' | 'lighting' | 'shadow';
type DragTarget =
  | 'center'
  | 'topLeft'
  | 'topRight'
  | 'bottomRight'
  | 'bottomLeft'
  | 'topCenter'
  | 'bottomCenter'
  | 'leftCenter'
  | 'rightCenter'
  | null;

export const CanvaMoldEditorModal: React.FC<CanvaMoldEditorModalProps> = ({ environment, onClose }) => {
  const { selectedImage, artworkSlots, productConfig, setProductConfig, updateEnvironment } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<EditorTab>('perspective');

  const pos = environment.positions[0];
  const initialCenterX = pos?.quad ? (pos.quad.topLeft.x + pos.quad.topRight.x) / 2 : 0.5;
  const initialCenterY = pos?.quad ? (pos.quad.topLeft.y + pos.quad.bottomLeft.y) / 2 : 0.32;
  const initialScale = pos?.quad ? Math.abs(pos.quad.topRight.x - pos.quad.topLeft.x) : 0.35;

  // 1. Spatial & 3D Parameters (Rehydrated from position)
  const [centerX, setCenterX] = useState(initialCenterX);
  const [centerY, setCenterY] = useState(initialCenterY);
  const [scaleWidth, setScaleWidth] = useState(Math.max(0.05, Math.min(0.90, initialScale)));
  const [wallAngle, setWallAngle] = useState(pos?.wallAngle ?? productConfig.wallAngle ?? 0);
  const [pitchAngle, setPitchAngle] = useState(pos?.pitchDeg ?? productConfig.pitchDeg ?? 0);
  const [rollAngle, setRollAngle] = useState(pos?.rollAngle ?? pos?.rollDeg ?? 0);
  const [thicknessCm, setThicknessCm] = useState(pos?.thicknessCm ?? 1.0);
  const [zDistance, setZDistance] = useState(pos?.zDistance ?? 0);

  // Snapping Guidelines & Hover / Ctrl Interaction State
  const [isSnappedX, setIsSnappedX] = useState(false);
  const [isSnappedY, setIsSnappedY] = useState(false);
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState<DragTarget>(null);

  // 2. Lighting & Reflection Parameters (Rehydrated)
  const [reflectionType, setReflectionType] = useState<ReflectionType>(
    pos?.reflectionType ?? getReflectionTypeForEnvironment(environment.category)
  );
  const [reflectionAngleDeg, setReflectionAngleDeg] = useState(
    pos?.reflectionAngleDeg ?? productConfig.reflectionAngleDeg ?? 0
  );
  const [reflectionIntensity, setReflectionIntensity] = useState(
    pos?.reflectionIntensity ?? productConfig.reflectionIntensity ?? 0.2
  );
  const [reflectionScale, setReflectionScale] = useState(
    pos?.reflectionScale ?? productConfig.reflectionScale ?? 1.0
  );
  const [reflectionRoughness, setReflectionRoughness] = useState(
    pos?.reflectionRoughness ?? productConfig.reflectionRoughness ?? 0.08
  );
  const [reflectionBrightness, setReflectionBrightness] = useState(pos?.reflectionBrightness ?? 0);
  const [reflectionContrast, setReflectionContrast] = useState(pos?.reflectionContrast ?? 0);
  const [weatherPreset, setWeatherPreset] = useState<WeatherPreset>(
    (pos?.weatherPreset as WeatherPreset) ?? 'day'
  );
  const [wallHarmonization, setWallHarmonization] = useState(
    pos?.wallHarmonization ?? productConfig.wallHarmonization ?? 0.35
  );
  const [wallSample, setWallSample] = useState<WallLightingSample | null>(null);

  // Acabado Mode (Resina, Vinilo Brillante, Vinilo Mate)
  const [finishMode, setFinishMode] = useState<'resina' | 'brillante' | 'mate'>(
    productConfig.hasResina ? 'resina' : productConfig.vinylFinish === 'mate' ? 'mate' : 'brillante'
  );

  // 3. Full Canva Image Adjustment Suite (Rehydrated from position or neutral 0)
  const [temperature, setTemperature] = useState(pos?.temperature ?? pos?.adjust?.temperature ?? 0);
  const [tint, setTint] = useState(pos?.tint ?? pos?.adjust?.tint ?? 0);
  const [brightness, setBrightness] = useState(pos?.brightness ?? pos?.adjust?.brightness ?? 0);
  const [contrast, setContrast] = useState(pos?.contrast ?? pos?.adjust?.contrast ?? 0);
  const [highlights, setHighlights] = useState(pos?.highlights ?? pos?.adjust?.highlights ?? 0);
  const [shadowsTone, setShadowsTone] = useState(pos?.shadowsTone ?? pos?.adjust?.shadowsTone ?? 0);
  const [whites, setWhites] = useState(pos?.whites ?? pos?.adjust?.whites ?? 0);
  const [blacks, setBlacks] = useState(pos?.blacks ?? pos?.adjust?.blacks ?? 0);
  const [hue, setHue] = useState(pos?.hue ?? pos?.adjust?.hue ?? 0);
  const [saturation, setSaturation] = useState(pos?.saturation ?? pos?.adjust?.saturation ?? 0);
  const [invert, setInvert] = useState(pos?.invert ?? pos?.adjust?.invert ?? false);

  // 4. Auto-Synchronized Shadows (Rehydrated)
  const [shadowPreset, setShadowPreset] = useState<CanvaShadowPreset>(
    pos?.shadowPreset ?? productConfig.shadowPreset ?? 'parallel'
  );
  const [shadowBlur, setShadowBlur] = useState(pos?.shadowBlur ?? productConfig.shadowBlur ?? 25);
  const [shadowIntensity, setShadowIntensity] = useState(
    pos?.shadowStyleIntensity ?? productConfig.shadowIntensity ?? 50
  );
  const [shadowDistance, setShadowDistance] = useState(pos?.shadowDistance ?? 30);
  const [shadowAngleDeg, setShadowAngleDeg] = useState(
    pos?.shadowAngleDeg ?? 90 + (pos?.reflectionAngleDeg ?? productConfig.reflectionAngleDeg ?? 0) * 0.5
  );
  const [shadowContactOcclusion, setShadowContactOcclusion] = useState(pos?.shadowContactOcclusion ?? 40);

  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const dragStart = useRef({
    x: 0,
    y: 0,
    origX: 0,
    origY: 0,
    origScale: 0,
    origAngle: 0,
    origPitch: 0,
    origRoll: 0,
  });

  // On-Screen Vector Pin Coordinates (9 Pins: 4 Corners + 4 Midpoints + Center)
  const [screenPins, setScreenPins] = useState<{
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    br: { x: number; y: number };
    bl: { x: number; y: number };
    tc: { x: number; y: number };
    bc: { x: number; y: number };
    lc: { x: number; y: number };
    rc: { x: number; y: number };
    center: { x: number; y: number };
  } | null>(null);

  const sizeOpt = CATALOG_SIZES.find((s) => s.id === productConfig.sizeId) || CATALOG_SIZES[0];
  const panelsCount = sizeOpt.panelsCount || 1;

  // Persistent Three.js Scene References
  const threeState = useRef<{
    renderer: THREE.WebGLRenderer | null;
    pmremGenerator: THREE.PMREMGenerator | null;
    currentEnvRenderTarget: THREE.WebGLRenderTarget | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    artGroup: THREE.Group | null;
    artMeshes: THREE.Mesh[];
    shadowMesh: THREE.Mesh | null;
    shadowCanvas: HTMLCanvasElement | null;
    shadowTexture: THREE.CanvasTexture | null;
    frontMaterials: THREE.MeshPhysicalMaterial[];
    edgeMaterialSets: THREE.Material[][];
    rawArtImages: HTMLImageElement[];
    proxyCanvases: HTMLCanvasElement[];
    gradedCanvases: HTMLCanvasElement[];
    gradedTextures: THREE.CanvasTexture[];
    ambLight: THREE.AmbientLight | null;
    keyLight: THREE.DirectionalLight | null;
    fillLight: THREE.DirectionalLight | null;
    bgW: number;
    bgH: number;
    artAspect: number;
    totalW: number;
    totalH: number;
    singleW: number;
    animId: number;
  }>({
    renderer: null,
    pmremGenerator: null,
    currentEnvRenderTarget: null,
    scene: null,
    camera: null,
    artGroup: null,
    artMeshes: [],
    shadowMesh: null,
    shadowCanvas: null,
    shadowTexture: null,
    frontMaterials: [],
    edgeMaterialSets: [],
    rawArtImages: [],
    proxyCanvases: [],
    gradedCanvases: [],
    gradedTextures: [],
    ambLight: null,
    keyLight: null,
    fillLight: null,
    bgW: 3.6,
    bgH: 3.6,
    artAspect: 1.0,
    totalW: 1.0,
    totalH: 1.0,
    singleW: 1.0,
    animId: 0,
  });

  // Track Ctrl / Cmd key state globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlActive(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlActive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update Environment Lighting Rig & PBR Materials
  const updateEnvironmentLighting = useCallback(
    (
      reflType: ReflectionType,
      reflAngle: number,
      wPreset: WeatherPreset,
      reflInt: number,
      reflScale: number,
      reflRough: number,
      reflBright: number,
      wallHarm: number,
      curFinish: 'resina' | 'brillante' | 'mate'
    ) => {
      const { scene, frontMaterials, ambLight, keyLight, fillLight, pmremGenerator } = threeState.current;
      if (!scene) return;

      const effectiveLightMode: AmbientLightMode =
        wPreset === 'sunset' ? 'sunset' : wPreset === 'night' ? 'night' : wPreset === 'cloudy' ? 'nordic_cold' : 'day';

      if (pmremGenerator) {
        const envTex = generateRaytracingEquirectangularMap({
          reflectionType: reflType,
          angleDeg: reflAngle,
          intensity: Math.max(0, reflInt * (1 + reflBright / 50)),
          scale: reflScale,
          lightMode: effectiveLightMode,
        });
        if (threeState.current.currentEnvRenderTarget) {
          threeState.current.currentEnvRenderTarget.dispose();
        }
        const envRenderTarget = pmremGenerator.fromEquirectangular(envTex);
        envTex.dispose();
        threeState.current.currentEnvRenderTarget = envRenderTarget;
        scene.environment = envRenderTarget.texture;
      }

      // Determine material profile based on Finish Mode
      let roughness = 0.22;
      let clearcoat = 0.6;
      let clearcoatRoughness = reflRough;
      let envMapIntensity = 1.8;
      let specularIntensity = 1.4;
      let emissiveBoost = 1.0;

      if (curFinish === 'resina') {
        roughness = RESIN_OVERLAY.roughness ?? 0.012;
        clearcoat = RESIN_OVERLAY.clearcoat ?? 1.0;
        clearcoatRoughness = Math.min(reflRough, 0.03);
        envMapIntensity = (RESIN_OVERLAY.envMapIntensity ?? 4.5) * (reflInt / 0.2);
        specularIntensity = RESIN_OVERLAY.specularIntensity ?? 2.2;
        emissiveBoost = RESIN_OVERLAY.colorBoost ?? 1.06;
      } else if (curFinish === 'mate') {
        const m = finishPresets.mate;
        roughness = m.roughness;
        clearcoat = 0;
        clearcoatRoughness = 0.9;
        envMapIntensity = 0.3 * (reflInt / 0.2);
        specularIntensity = 0.3;
        emissiveBoost = 1.0;
      } else {
        const b = finishPresets.brillante;
        roughness = b.roughness;
        clearcoat = b.clearcoat;
        clearcoatRoughness = reflRough;
        envMapIntensity = b.envMapIntensity * (reflInt / 0.2);
        specularIntensity = b.specularIntensity;
        emissiveBoost = 1.0;
      }

      // Weather lighting modifiers
      let ambIntensity = 0.4;
      let keyIntensity = 1.4;
      let fillIntensity = 0.5;
      let weatherColor = new THREE.Color(0xffffff);

      if (wPreset === 'sunset') {
        weatherColor = new THREE.Color(0xffd7a8);
        ambIntensity = 0.38;
        keyIntensity = 1.5;
      } else if (wPreset === 'night') {
        weatherColor = new THREE.Color(0x90b8f8);
        ambIntensity = 0.22;
        keyIntensity = 1.6;
        fillIntensity = 0.25;
      } else if (wPreset === 'sunny') {
        weatherColor = new THREE.Color(0xfffaed);
        ambIntensity = 0.5;
        keyIntensity = 1.8;
      } else if (wPreset === 'cloudy') {
        weatherColor = new THREE.Color(0xecf2f8);
        ambIntensity = 0.58;
        keyIntensity = 0.95;
      }

      if (wallSample) {
        const neutralColor = weatherColor.clone();
        const wallColor = new THREE.Color(wallSample.r, wallSample.g, wallSample.b);
        const ambColor = neutralColor.clone().lerp(wallColor, wallHarm * 0.5);
        const roomLightScale = 0.65 + wallSample.luminance * 0.7;

        if (ambLight) {
          ambLight.color = ambColor;
          ambLight.intensity = ambIntensity * (1 - wallHarm * 0.4) + ambIntensity * roomLightScale * wallHarm * 0.4;
        }
        if (keyLight) {
          keyLight.color = ambColor;
          keyLight.intensity = keyIntensity * (0.6 + 0.4 * roomLightScale);
        }
        if (fillLight) {
          fillLight.intensity = fillIntensity * roomLightScale;
        }

        const subtleEmissiveColor = neutralColor.clone().lerp(wallColor, wallHarm * 0.28);
        const emissiveIntensity = 0.1 * (1.0 - (1.0 - wallSample.luminance) * wallHarm * 0.35);

        frontMaterials.forEach((mat) => {
          mat.color.setRGB(emissiveBoost, emissiveBoost, emissiveBoost);
          mat.emissive = subtleEmissiveColor;
          mat.emissiveIntensity = emissiveIntensity;
          mat.roughness = roughness;
          mat.clearcoat = clearcoat;
          mat.clearcoatRoughness = clearcoatRoughness;
          mat.envMapIntensity = envMapIntensity;
          mat.ior = 1.5;
          mat.specularIntensity = specularIntensity;
          mat.needsUpdate = true;
        });
      } else {
        if (ambLight) {
          ambLight.color = weatherColor;
          ambLight.intensity = ambIntensity;
        }
        if (keyLight) {
          keyLight.color = weatherColor;
          keyLight.intensity = keyIntensity;
        }
        if (fillLight) {
          fillLight.intensity = fillIntensity;
        }

        frontMaterials.forEach((mat) => {
          mat.color.setRGB(emissiveBoost, emissiveBoost, emissiveBoost);
          mat.emissive = new THREE.Color(0xffffff);
          mat.emissiveIntensity = 0.1;
          mat.roughness = roughness;
          mat.clearcoat = clearcoat;
          mat.clearcoatRoughness = clearcoatRoughness;
          mat.envMapIntensity = envMapIntensity;
          mat.ior = 1.5;
          mat.specularIntensity = specularIntensity;
          mat.needsUpdate = true;
        });
      }
    },
    [wallSample]
  );

  // Throttled 60fps Color Grading Pipeline using 1024px Proxy Canvas
  const rafColorRef = useRef<number | null>(null);
  const updateArtworkColorThrottled = useCallback(() => {
    if (rafColorRef.current) cancelAnimationFrame(rafColorRef.current);
    rafColorRef.current = requestAnimationFrame(() => {
      const { proxyCanvases, gradedCanvases, gradedTextures } = threeState.current;
      if (!proxyCanvases.length || !gradedCanvases.length) return;

      proxyCanvases.forEach((pCanvas, idx) => {
        const gCanvas = gradedCanvases[idx];
        const gTex = gradedTextures[idx];
        if (pCanvas && gCanvas && gTex) {
          applyCanvaAdjustmentsToCanvas(
            pCanvas as any,
            {
              temperature,
              tint,
              brightness,
              contrast,
              highlights,
              shadowsTone,
              whites,
              blacks,
              hue,
              saturation,
              invert,
            },
            gCanvas
          );
          gTex.needsUpdate = true;
        }
      });
    });
  }, [temperature, tint, brightness, contrast, highlights, shadowsTone, whites, blacks, hue, saturation, invert]);

  // Update Box Geometry Depth when thickness changes
  const updateGeometryDepth = useCallback((thickCm: number) => {
    const { artMeshes, totalH, singleW } = threeState.current;
    if (!artMeshes.length) return;
    const depthM = Math.max(0.005, thickCm / 100);
    const radiusM = Math.min(0.002, depthM * 0.1);

    artMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.geometry = new RoundedBoxGeometry(singleW, totalH, depthM, 4, radiusM);
    });
  }, []);

  // 1. Initialize WebGL Scene with Multi-Panel & Wrapped Edge Texture Support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;

    const initScene = async () => {
      try {
        const envImg = await loadImageElement(environment.imageUrl);

        // Load images for all panels
        const rawArtImages: HTMLImageElement[] = [];
        const rawArtSources: string[] = [];
        for (let i = 0; i < panelsCount; i++) {
          let artSource = selectedImage ? selectedImage.path : getSampleArtwork('abstract').path;
          if (productConfig.setMode === 'collection' && artworkSlots[i]) {
            artSource = artworkSlots[i]!.path;
          }
          rawArtSources.push(artSource);
          const loaded = await loadImageElement(artSource);
          rawArtImages.push(loaded);
        }

        if (!alive) return;

        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setSize(660, 660);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 16;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
        camera.position.set(0, 0, 4.0);

        // Room Background Plane
        const roomTex = new THREE.CanvasTexture(envImg);
        roomTex.colorSpace = THREE.SRGBColorSpace;
        roomTex.generateMipmaps = true;
        roomTex.minFilter = THREE.LinearMipmapLinearFilter;
        roomTex.anisotropy = maxAniso;

        const bgAspect = envImg.width / envImg.height;
        let bgW = 3.6;
        let bgH = 3.6 / bgAspect;
        if (bgH < 3.6) {
          bgH = 3.6;
          bgW = 3.6 * bgAspect;
        }

        const bgGeom = new THREE.PlaneGeometry(bgW, bgH);
        const bgMat = new THREE.MeshBasicMaterial({ map: roomTex, depthWrite: false });
        const bgMesh = new THREE.Mesh(bgGeom, bgMat);
        bgMesh.position.set(0, 0, -0.05);
        scene.add(bgMesh);

        // Studio 3-Point Lighting Rig
        const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(4, 7, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-4, 3, -3);
        scene.add(fillLight);

        // Prepare Textures & 1024px Proxies for fast color grading
        const proxyCanvases: HTMLCanvasElement[] = [];
        const gradedCanvases: HTMLCanvasElement[] = [];
        const gradedTextures: THREE.CanvasTexture[] = [];
        const frontMaterials: THREE.MeshPhysicalMaterial[] = [];
        const edgeMaterialSets: THREE.Material[][] = [];

        const primaryRaw = rawArtImages[0];
        const artAspect =
          (primaryRaw.naturalWidth || primaryRaw.width || 1) / (primaryRaw.naturalHeight || primaryRaw.height || 1);

        const totalW = bgW * initialScale;
        const totalH = totalW / artAspect;

        const gapM = panelsCount > 1 ? 0.03 : 0;
        const singleW = (totalW - gapM * (panelsCount - 1)) / panelsCount;
        const depthM = Math.max(0.005, thicknessCm / 100);

        const panelGeom = new RoundedBoxGeometry(singleW, totalH, depthM, 4, 0.001);
        const backMat = new THREE.MeshStandardMaterial({ color: '#0c0d12', roughness: 0.9 });

        const artGroup = new THREE.Group();
        const startX = -totalW / 2 + singleW / 2;
        const artMeshes: THREE.Mesh[] = [];

        for (let i = 0; i < panelsCount; i++) {
          const rawImg = rawArtImages[i] || primaryRaw;

          // 1024px Proxy Canvas for 60fps adjustments
          const pCanvas = document.createElement('canvas');
          const natW = rawImg.naturalWidth || rawImg.width || 1024;
          const natH = rawImg.naturalHeight || rawImg.height || 1024;
          const maxDim = 1024;
          let targetW = natW;
          let targetH = natH;
          if (Math.max(natW, natH) > maxDim) {
            if (natW >= natH) {
              targetW = maxDim;
              targetH = Math.round((natH / natW) * maxDim);
            } else {
              targetH = maxDim;
              targetW = Math.round((natW / natH) * maxDim);
            }
          }
          pCanvas.width = targetW;
          pCanvas.height = targetH;
          const pCtx = pCanvas.getContext('2d')!;
          pCtx.drawImage(rawImg, 0, 0, targetW, targetH);
          proxyCanvases.push(pCanvas);

          const gCanvas = document.createElement('canvas');
          applyCanvaAdjustmentsToCanvas(
            pCanvas as any,
            {
              temperature,
              tint,
              brightness,
              contrast,
              highlights,
              shadowsTone,
              whites,
              blacks,
              hue,
              saturation,
              invert,
            },
            gCanvas
          );

          const gTex = new THREE.CanvasTexture(gCanvas);
          gTex.colorSpace = THREE.SRGBColorSpace;
          gTex.generateMipmaps = true;
          gTex.minFilter = THREE.LinearMipmapLinearFilter;
          gTex.magFilter = THREE.LinearFilter;
          gTex.anisotropy = maxAniso;

          if (productConfig.setMode === 'split' && panelsCount > 1) {
            gTex.repeat.set(1 / panelsCount, 1);
            gTex.offset.set(i / panelsCount, 0);
          }

          gradedCanvases.push(gCanvas);
          gradedTextures.push(gTex);

          const frontMat = new THREE.MeshPhysicalMaterial({
            map: gTex,
            color: new THREE.Color(1, 1, 1),
            emissive: new THREE.Color(0xffffff),
            emissiveMap: gTex,
            emissiveIntensity: 0.1,
            roughness: 0.22,
            clearcoat: 0.6,
            clearcoatRoughness: reflectionRoughness,
            envMapIntensity: 1.8,
            ior: 1.5,
            specularIntensity: 1.4,
          });
          frontMaterials.push(frontMat);

          // Wrapped Side Edge Textures
          const edgeTexs = await getEdgeTextures(
            rawArtSources[i],
            Math.round(singleW * 100),
            Math.round(totalH * 100),
            thicknessCm
          );

          let edgeMats: THREE.Material[];
          if (edgeTexs && edgeTexs.length === 4) {
            edgeMats = [
              new THREE.MeshStandardMaterial({ map: edgeTexs[0], roughness: 0.35, metalness: 0.1 }),
              new THREE.MeshStandardMaterial({ map: edgeTexs[1], roughness: 0.35, metalness: 0.1 }),
              new THREE.MeshStandardMaterial({ map: edgeTexs[2], roughness: 0.35, metalness: 0.1 }),
              new THREE.MeshStandardMaterial({ map: edgeTexs[3], roughness: 0.35, metalness: 0.1 }),
            ];
          } else {
            const fallbackEdge = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.1 });
            edgeMats = [fallbackEdge, fallbackEdge, fallbackEdge, fallbackEdge];
          }
          edgeMaterialSets.push(edgeMats);

          const materials = [...edgeMats, frontMat, backMat];

          const pMesh = new THREE.Mesh(panelGeom, materials);
          pMesh.position.set(startX + i * (singleW + gapM), 0, 0);
          artGroup.add(pMesh);
          artMeshes.push(pMesh);
        }

        scene.add(artGroup);

        // Physically Anchored Frame Drop Shadow
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 1024;
        shadowCanvas.height = 1024;
        const sCtx = shadowCanvas.getContext('2d')!;

        drawExactFrameShadowToContext(sCtx, {
          shadowPreset,
          aspectRatio: totalW / totalH,
          angleDeg: shadowAngleDeg,
          distance: 30,
          blur: shadowBlur,
          intensity: shadowIntensity,
          wallAngleDeg: wallAngle,
          pitchDeg: pitchAngle,
          rollDeg: rollAngle,
          zDistance,
          shelfContactShadow: shadowContactOcclusion > 0,
          width: 1024,
          height: 1024,
        });

        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        shadowTexture.generateMipmaps = true;
        shadowTexture.minFilter = THREE.LinearMipmapLinearFilter;

        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTexture,
          transparent: true,
          depthWrite: false,
        });
        const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(totalW * 2.2, totalH * 2.2), shadowMat);
        scene.add(shadowMesh);

        const sample = sampleWallLighting(envImg, initialCenterX, initialCenterY, initialScale);
        setWallSample(sample);

        threeState.current = {
          renderer,
          pmremGenerator,
          currentEnvRenderTarget: null,
          scene,
          camera,
          artGroup,
          artMeshes,
          shadowMesh,
          shadowCanvas,
          shadowTexture,
          frontMaterials,
          edgeMaterialSets,
          rawArtImages,
          proxyCanvases,
          gradedCanvases,
          gradedTextures,
          ambLight,
          keyLight,
          fillLight,
          bgW,
          bgH,
          artAspect,
          totalW,
          totalH,
          singleW,
          animId: 0,
        };

        updateEnvironmentLighting(
          reflectionType,
          reflectionAngleDeg,
          weatherPreset,
          reflectionIntensity,
          reflectionScale,
          reflectionRoughness,
          reflectionBrightness,
          wallHarmonization,
          finishMode
        );

        const renderLoop = () => {
          renderer.render(scene, camera);
          threeState.current.animId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
      } catch (e) {
        console.error('Error initializing 3D modal:', e);
      }
    };

    initScene();

    return () => {
      alive = false;
      if (threeState.current.animId) cancelAnimationFrame(threeState.current.animId);
      if (rafColorRef.current) cancelAnimationFrame(rafColorRef.current);
      if (threeState.current.currentEnvRenderTarget) threeState.current.currentEnvRenderTarget.dispose();
      if (threeState.current.pmremGenerator) threeState.current.pmremGenerator.dispose();
      if (threeState.current.renderer) threeState.current.renderer.dispose();
    };
  }, [environment, selectedImage, artworkSlots, panelsCount, productConfig.setMode]);

  // 2. Dynamic 3D Transform & Sub-Pixel Vector Pin Projection (7 Pins)
  useEffect(() => {
    const { artGroup, shadowMesh, camera, bgW, bgH, totalW, totalH } = threeState.current;
    if (!artGroup || !shadowMesh || !camera) return;

    const normX = (centerX - 0.5) * bgW;
    const normY = -(centerY - 0.5) * bgH;
    const scaleFactor = scaleWidth / initialScale;

    // 3D Scene Mesh Position & 3-Axis Rotation
    artGroup.position.set(normX, normY, 0.04 + zDistance / 100);
    artGroup.scale.set(scaleFactor, scaleFactor, 1);
    artGroup.rotation.set(
      -(pitchAngle * Math.PI) / 180,
      (wallAngle * Math.PI) / 180,
      (rollAngle * Math.PI) / 180
    );

    shadowMesh.position.set(normX, normY, 0.01);
    shadowMesh.scale.set(scaleFactor, scaleFactor, 1);
    shadowMesh.rotation.set(
      -(pitchAngle * Math.PI) / 180,
      (wallAngle * Math.PI) / 180,
      (rollAngle * Math.PI) / 180
    );

    artGroup.updateMatrixWorld(true);

    const halfW = totalW / 2;
    const halfH = totalH / 2;

    const localCorners = [
      new THREE.Vector3(-halfW, halfH, 0.005), // Top-Left (0)
      new THREE.Vector3(halfW, halfH, 0.005), // Top-Right (1)
      new THREE.Vector3(halfW, -halfH, 0.005), // Bottom-Right (2)
      new THREE.Vector3(-halfW, -halfH, 0.005), // Bottom-Left (3)
      new THREE.Vector3(0, halfH, 0.005), // Top-Center (4)
      new THREE.Vector3(0, -halfH, 0.005), // Bottom-Center (5)
      new THREE.Vector3(-halfW, 0, 0.005), // Left-Center (6)
      new THREE.Vector3(halfW, 0, 0.005), // Right-Center (7)
      new THREE.Vector3(0, 0, 0.005), // Center (8)
    ];

    const projected = localCorners.map((pt) => {
      const worldPt = pt.clone().applyMatrix4(artGroup.matrixWorld);
      const screenPt = worldPt.project(camera);
      return {
        x: (screenPt.x * 0.5 + 0.5) * 100,
        y: (-(screenPt.y * 0.5) + 0.5) * 100,
      };
    });

    setScreenPins({
      tl: projected[0],
      tr: projected[1],
      br: projected[2],
      bl: projected[3],
      tc: projected[4],
      bc: projected[5],
      lc: projected[6],
      rc: projected[7],
      center: projected[8],
    });
  }, [centerX, centerY, scaleWidth, wallAngle, pitchAngle, rollAngle, zDistance, initialScale]);

  // Dynamic Geometry Thickness update
  useEffect(() => {
    updateGeometryDepth(thicknessCm);
  }, [thicknessCm, updateGeometryDepth]);

  // Dynamic Triggers for Lighting & Fast Color Grading
  useEffect(() => {
    updateEnvironmentLighting(
      reflectionType,
      reflectionAngleDeg,
      weatherPreset,
      reflectionIntensity,
      reflectionScale,
      reflectionRoughness,
      reflectionBrightness,
      wallHarmonization,
      finishMode
    );
  }, [
    reflectionType,
    reflectionAngleDeg,
    weatherPreset,
    reflectionIntensity,
    reflectionScale,
    reflectionRoughness,
    reflectionBrightness,
    wallHarmonization,
    finishMode,
    updateEnvironmentLighting,
  ]);

  useEffect(() => {
    updateArtworkColorThrottled();
  }, [updateArtworkColorThrottled]);

  // Live Auto-Synchronized Shadow Texture Redraw
  useEffect(() => {
    const { shadowCanvas, shadowTexture, artAspect } = threeState.current;
    if (shadowCanvas && shadowTexture) {
      const sCtx = shadowCanvas.getContext('2d')!;

      drawExactFrameShadowToContext(sCtx, {
        shadowPreset,
        aspectRatio: artAspect,
        angleDeg: shadowAngleDeg,
        distance: shadowDistance,
        blur: shadowBlur,
        intensity: shadowIntensity,
        wallAngleDeg: wallAngle,
        pitchDeg: pitchAngle,
        rollDeg: rollAngle,
        zDistance,
        shelfContactShadow: shadowContactOcclusion > 0,
        width: 1024,
        height: 1024,
      });
      shadowTexture.needsUpdate = true;
    }
  }, [
    shadowPreset,
    shadowAngleDeg,
    shadowBlur,
    shadowIntensity,
    shadowDistance,
    wallAngle,
    pitchAngle,
    rollAngle,
    zDistance,
    shadowContactOcclusion,
  ]);

  // Mouse Handlers with 9 Vector Pins + Proportional Scaling + Celestial Midpoint Controls + Ctrl Modes
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    let hitTarget: DragTarget = null;
    if (screenPins) {
      const pinDist = (p: { x: number; y: number }) => Math.hypot(clickX * 100 - p.x, clickY * 100 - p.y);
      if (pinDist(screenPins.tc) < 6) hitTarget = 'topCenter';
      else if (pinDist(screenPins.bc) < 6) hitTarget = 'bottomCenter';
      else if (pinDist(screenPins.lc) < 6) hitTarget = 'leftCenter';
      else if (pinDist(screenPins.rc) < 6) hitTarget = 'rightCenter';
      else if (pinDist(screenPins.tl) < 6) hitTarget = 'topLeft';
      else if (pinDist(screenPins.tr) < 6) hitTarget = 'topRight';
      else if (pinDist(screenPins.br) < 6) hitTarget = 'bottomRight';
      else if (pinDist(screenPins.bl) < 6) hitTarget = 'bottomLeft';
      else if (pinDist(screenPins.center) < 7) hitTarget = 'center';
    }

    setDragTarget(hitTarget || 'center');

    dragStart.current = {
      x: clickX,
      y: clickY,
      origX: centerX,
      origY: centerY,
      origScale: scaleWidth,
      origAngle: wallAngle,
      origPitch: pitchAngle,
      origRoll: rollAngle,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / rect.width;
    const curY = (e.clientY - rect.top) / rect.height;

    if (!dragTarget) {
      if (screenPins) {
        const pinDist = (p: { x: number; y: number }) => Math.hypot(curX * 100 - p.x, curY * 100 - p.y);
        if (pinDist(screenPins.tc) < 6) setHoveredTarget('topCenter');
        else if (pinDist(screenPins.bc) < 6) setHoveredTarget('bottomCenter');
        else if (pinDist(screenPins.lc) < 6) setHoveredTarget('leftCenter');
        else if (pinDist(screenPins.rc) < 6) setHoveredTarget('rightCenter');
        else if (pinDist(screenPins.tl) < 6) setHoveredTarget('topLeft');
        else if (pinDist(screenPins.tr) < 6) setHoveredTarget('topRight');
        else if (pinDist(screenPins.br) < 6) setHoveredTarget('bottomRight');
        else if (pinDist(screenPins.bl) < 6) setHoveredTarget('bottomLeft');
        else if (pinDist(screenPins.center) < 7) setHoveredTarget('center');
        else setHoveredTarget(null);
      }
      return;
    }

    const deltaX = curX - dragStart.current.x;
    const deltaY = curY - dragStart.current.y;
    const isCtrl = e.ctrlKey || e.metaKey || isCtrlActive;

    if (dragTarget === 'center') {
      let rawX = dragStart.current.origX + deltaX;
      let rawY = dragStart.current.origY + deltaY;

      // Smart Snapping (Center X = 0.5, Standard Hanging Y = 0.32, Center Y = 0.50)
      if (Math.abs(rawX - 0.5) < 0.02) {
        rawX = 0.5;
        setIsSnappedX(true);
      } else {
        setIsSnappedX(false);
      }

      if (Math.abs(rawY - 0.32) < 0.02) {
        rawY = 0.32;
        setIsSnappedY(true);
      } else if (Math.abs(rawY - 0.5) < 0.02) {
        rawY = 0.5;
        setIsSnappedY(true);
      } else {
        setIsSnappedY(false);
      }

      setCenterX(Math.min(Math.max(rawX, 0.05), 0.95));
      setCenterY(Math.min(Math.max(rawY, 0.05), 0.95));
    } else if (dragTarget === 'topCenter') {
      if (isCtrl) {
        // Ctrl + Drag: "Acostar objeto" extreme pitch angle (-75° to +75°)
        const newPitch = Math.max(-75, Math.min(75, Math.round(dragStart.current.origPitch - deltaY * 150)));
        setPitchAngle(newPitch);
      } else {
        // Normal Drag: Adjusts pitchAngle (-30° to +30°)
        const newPitch = Math.max(-30, Math.min(30, Math.round(dragStart.current.origPitch - deltaY * 100)));
        setPitchAngle(newPitch);
      }
    } else if (dragTarget === 'bottomCenter') {
      if (isCtrl) {
        // Ctrl + Drag: "Acostar objeto" extreme pitch angle (-75° to +75°)
        const newPitch = Math.max(-75, Math.min(75, Math.round(dragStart.current.origPitch + deltaY * 150)));
        setPitchAngle(newPitch);
      } else {
        // Normal Drag: Adjusts pitchAngle (-30° to +30°)
        const newPitch = Math.max(-30, Math.min(30, Math.round(dragStart.current.origPitch + deltaY * 100)));
        setPitchAngle(newPitch);
      }
    } else if (dragTarget === 'leftCenter') {
      if (isCtrl) {
        // Ctrl + Drag: Planar perspective / extended yaw
        const newAngle = Math.max(-85, Math.min(85, Math.round(dragStart.current.origAngle - deltaX * 160)));
        setWallAngle(newAngle);
      } else {
        // Normal Drag: Adjusts wallAngle / yaw (-60° to +60°)
        const newAngle = Math.max(-60, Math.min(60, Math.round(dragStart.current.origAngle - deltaX * 120)));
        setWallAngle(newAngle);
      }
    } else if (dragTarget === 'rightCenter') {
      if (isCtrl) {
        // Ctrl + Drag: Planar perspective / extended yaw
        const newAngle = Math.max(-85, Math.min(85, Math.round(dragStart.current.origAngle + deltaX * 160)));
        setWallAngle(newAngle);
      } else {
        // Normal Drag: Adjusts wallAngle / yaw (-60° to +60°)
        const newAngle = Math.max(-60, Math.min(60, Math.round(dragStart.current.origAngle + deltaX * 120)));
        setWallAngle(newAngle);
      }
    } else if (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].includes(dragTarget)) {
      const centerPxX = (screenPins ? screenPins.center.x / 100 : centerX) * rect.width;
      const centerPxY = (screenPins ? screenPins.center.y / 100 : centerY) * rect.height;

      if (isCtrl) {
        // Ctrl + Corner Drag: Rotation in the same plane (Z-roll)
        const startMouseAngle = Math.atan2(
          dragStart.current.y * rect.height - centerPxY,
          dragStart.current.x * rect.width - centerPxX
        );
        const curMouseAngle = Math.atan2(curY * rect.height - centerPxY, curX * rect.width - centerPxX);
        const diffDeg = ((curMouseAngle - startMouseAngle) * 180) / Math.PI;
        const newRoll = Math.max(-45, Math.min(45, Math.round(dragStart.current.origRoll + diffDeg)));
        setRollAngle(newRoll);
      } else {
        // Normal Corner Drag: ONLY Scale (agrandar o achicar el cuadro proporcionalmente). Does NOT rotate.
        const startDist = Math.hypot(
          dragStart.current.x * rect.width - centerPxX,
          dragStart.current.y * rect.height - centerPxY
        );
        const curDist = Math.hypot(
          curX * rect.width - centerPxX,
          curY * rect.height - centerPxY
        );
        if (startDist > 0) {
          const scaleRatio = curDist / startDist;
          const newScale = Math.min(Math.max(dragStart.current.origScale * scaleRatio, 0.05), 0.90);
          setScaleWidth(newScale);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDragTarget(null);
    setIsSnappedX(false);
    setIsSnappedY(false);
  };

  const handleAutoCenter = () => {
    setCenterX(0.5);
    setCenterY(0.32);
    setWallAngle(0);
    setPitchAngle(0);
    setRollAngle(0);
    setZDistance(0);
  };

  // Full Persistence: Save all 3D, optical, color & shadow parameters
  const handleSave = () => {
    const artAspect = threeState.current.artAspect || 1.0;
    const halfW = scaleWidth / 2;
    const halfH = scaleWidth / artAspect / 2;

    const updatedEnv: EnvironmentScene = {
      ...environment,
      positions: [
        {
          ...pos,
          wallAngle,
          pitchDeg: pitchAngle,
          rollAngle,
          rollDeg: rollAngle,
          thicknessCm,
          zDistance,
          reflectionType,
          reflectionAngleDeg,
          reflectionIntensity,
          reflectionScale,
          reflectionRoughness,
          reflectionBrightness,
          reflectionContrast,
          weatherPreset,
          wallHarmonization,
          shadowPreset,
          shadowBlur,
          shadowStyleIntensity: shadowIntensity,
          shadowAngleDeg,
          shadowDistance,
          shadowContactOcclusion,
          temperature,
          tint,
          brightness,
          contrast,
          highlights,
          shadowsTone,
          whites,
          blacks,
          hue,
          saturation,
          invert,
          quad: {
            topLeft: { x: centerX - halfW, y: centerY - halfH },
            topRight: { x: centerX + halfW, y: centerY - halfH },
            bottomRight: { x: centerX + halfW, y: centerY + halfH },
            bottomLeft: { x: centerX - halfW, y: centerY + halfH },
          },
        },
        ...environment.positions.slice(1),
      ],
    };

    updateEnvironment(updatedEnv);
    clearThumbnailCache();

    setProductConfig({
      wallAngle,
      pitchDeg: pitchAngle,
      reflectionAngleDeg,
      reflectionIntensity,
      reflectionScale,
      reflectionRoughness,
      reflectionType,
      wallHarmonization,
      temperature,
      tint,
      brightness,
      contrast,
      highlights,
      shadowsTone,
      whites,
      blacks,
      hue,
      saturation,
      invert,
      hasResina: finishMode === 'resina',
      vinylFinish: finishMode === 'mate' ? 'mate' : 'brillante',
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(28px) saturate(180%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '1140px',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: '24px 28px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#0d1017',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--accent-primary)',
              }}
            >
              MOLDE 3D INTELIGENTE PROFESIONAL
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
              }}
            >
              Calibrar en {environment.name} {panelsCount > 1 ? `(Set de ${panelsCount})` : ''}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleAutoCenter}
              style={{
                background: 'var(--accent-primary-subtle)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Target size={14} />
              <span>Auto-Centrar en Pared</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 410px', gap: '24px', alignItems: 'start' }}>
          {/* Left Canvas with Interactive Vector Pins */}
          <div
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setHoveredTarget(null);
              handleMouseUp();
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'relative',
              background: '#040508',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              userSelect: 'none',
              cursor: (() => {
                if (dragTarget) {
                  if (isCtrlActive) return 'grabbing';
                  if (dragTarget === 'center') return 'grabbing';
                  if (dragTarget === 'topCenter' || dragTarget === 'bottomCenter') return 'ns-resize';
                  if (dragTarget === 'leftCenter' || dragTarget === 'rightCenter') return 'ew-resize';
                  if (dragTarget === 'topLeft' || dragTarget === 'bottomRight') return 'nwse-resize';
                  if (dragTarget === 'topRight' || dragTarget === 'bottomLeft') return 'nesw-resize';
                  return 'grabbing';
                }
                if (hoveredTarget) {
                  if (isCtrlActive) return 'grab';
                  if (hoveredTarget === 'center') return 'grab';
                  if (hoveredTarget === 'topCenter' || hoveredTarget === 'bottomCenter') return 'ns-resize';
                  if (hoveredTarget === 'leftCenter' || hoveredTarget === 'rightCenter') return 'ew-resize';
                  if (hoveredTarget === 'topLeft' || hoveredTarget === 'bottomRight') return 'nwse-resize';
                  if (hoveredTarget === 'topRight' || hoveredTarget === 'bottomLeft') return 'nesw-resize';
                  return 'grab';
                }
                return isCtrlActive ? 'grab' : 'default';
              })(),
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                maxWidth: '650px',
                height: 'auto',
                display: 'block',
              }}
            />

            {/* Auto-Hide Guidelines, Pins, Outline & Tips (visible on hover or drag) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                opacity: isHovered || dragTarget !== null ? 1 : 0,
                transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Smart Snapping Vertical Guideline */}
              {isSnappedX && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '1.5px',
                    background: '#de2367',
                    boxShadow: '0 0 10px #de2367',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '6px',
                      background: '#de2367',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Centro Horizontal (X: 50%)
                  </span>
                </div>
              )}

              {/* Smart Snapping Horizontal Guideline */}
              {isSnappedY && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${centerY * 100}%`,
                    left: 0,
                    right: 0,
                    height: '1.5px',
                    background: '#de2367',
                    boxShadow: '0 0 10px #de2367',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '-18px',
                      background: '#de2367',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Nivel de Pared Estándar
                  </span>
                </div>
              )}

              {/* Active Ctrl Action Badge */}
              {isCtrlActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(222, 35, 103, 0.92)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '5px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 16px rgba(222, 35, 103, 0.5)',
                    pointerEvents: 'none',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>
                    {dragTarget === 'topCenter' || dragTarget === 'bottomCenter' || hoveredTarget === 'topCenter' || hoveredTarget === 'bottomCenter'
                      ? `Acostar objeto: ${pitchAngle > 0 ? `+${pitchAngle}°` : `${pitchAngle}°`} (Ctrl activo)`
                      : dragTarget === 'leftCenter' || dragTarget === 'rightCenter' || hoveredTarget === 'leftCenter' || hoveredTarget === 'rightCenter'
                      ? `Perspectiva / Giro: ${wallAngle > 0 ? `+${wallAngle}°` : `${wallAngle}°`} (Ctrl activo)`
                      : `Rotación Z: ${rollAngle > 0 ? `+${rollAngle}°` : `${rollAngle}°`} (Ctrl activo)`}
                  </span>
                </div>
              )}

              {/* Vector Quad Polygon Outline */}
              {screenPins && (
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                >
                  <polygon
                    points={`${screenPins.tl.x}%,${screenPins.tl.y}% ${screenPins.tr.x}%,${screenPins.tr.y}% ${screenPins.br.x}%,${screenPins.br.y}% ${screenPins.bl.x}%,${screenPins.bl.y}%`}
                    fill="rgba(222, 35, 103, 0.06)"
                    stroke="#de2367"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}

              {/* Interactive Vector Pin Handles */}
              {screenPins && (
                <>
                  {/* 4 Corner Pins (Proportional Scale / Ctrl: Z-Rotation) */}
                  <div
                    title="Esquina: Arrastra para escalar proporcionalmente. Ctrl + Arrastre para Rotación Z."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.tl.x}%`,
                      top: `${screenPins.tl.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#de2367',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 10px #de2367',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    title="Esquina: Arrastra para escalar proporcionalmente. Ctrl + Arrastre para Rotación Z."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.tr.x}%`,
                      top: `${screenPins.tr.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#de2367',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 10px #de2367',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    title="Esquina: Arrastra para escalar proporcionalmente. Ctrl + Arrastre para Rotación Z."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.br.x}%`,
                      top: `${screenPins.br.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#de2367',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 10px #de2367',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    title="Esquina: Arrastra para escalar proporcionalmente. Ctrl + Arrastre para Rotación Z."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.bl.x}%`,
                      top: `${screenPins.bl.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#de2367',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 10px #de2367',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* 4 Celestial Midpoint Pins (Cyan #38bdf8) */}
                  {/* Top Center Pin (tc) */}
                  <div
                    title="Pin Superior: Inclinación Vertical (Pitch). Ctrl + Arrastre: Acostar objeto en repisa."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.tc.x}%`,
                      top: `${screenPins.tc.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '18px',
                      height: '9px',
                      borderRadius: '4px',
                      background: '#38bdf8',
                      border: '1.5px solid #ffffff',
                      boxShadow: '0 0 8px #38bdf8',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Bottom Center Pin (bc) */}
                  <div
                    title="Pin Inferior: Inclinación Vertical (Pitch). Ctrl + Arrastre: Acostar objeto en repisa."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.bc.x}%`,
                      top: `${screenPins.bc.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '18px',
                      height: '9px',
                      borderRadius: '4px',
                      background: '#38bdf8',
                      border: '1.5px solid #ffffff',
                      boxShadow: '0 0 8px #38bdf8',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Left Center Pin (lc) */}
                  <div
                    title="Pin Lateral Izquierdo: Ángulo de Pared (Yaw). Ctrl + Arrastre: Perspectiva planar."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.lc.x}%`,
                      top: `${screenPins.lc.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '9px',
                      height: '18px',
                      borderRadius: '4px',
                      background: '#38bdf8',
                      border: '1.5px solid #ffffff',
                      boxShadow: '0 0 8px #38bdf8',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Right Center Pin (rc) */}
                  <div
                    title="Pin Lateral Derecho: Ángulo de Pared (Yaw). Ctrl + Arrastre: Perspectiva planar."
                    style={{
                      position: 'absolute',
                      left: `${screenPins.rc.x}%`,
                      top: `${screenPins.rc.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '9px',
                      height: '18px',
                      borderRadius: '4px',
                      background: '#38bdf8',
                      border: '1.5px solid #ffffff',
                      boxShadow: '0 0 8px #38bdf8',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Center Pin */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${screenPins.center.x}%`,
                      top: `${screenPins.center.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(222, 35, 103, 0.75)',
                      backdropFilter: 'blur(4px)',
                      border: '1.5px solid #de2367',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      pointerEvents: 'none',
                      boxShadow: '0 0 12px rgba(222, 35, 103, 0.6)',
                    }}
                  >
                    <Move size={13} />
                  </div>
                </>
              )}

              {/* Bottom Tip Bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  right: '12px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(10, 12, 18, 0.88)',
                  backdropFilter: 'blur(10px)',
                  color: '#94a3b8',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span>
                  📍 <strong>Centro</strong>: Mover
                </span>
                <span>
                  ↔️/↕️ <strong>Pines Celestes</strong>: Inclinación / Pared (Ctrl: Acostar)
                </span>
                <span>
                  ⤡ <strong>Esquinas</strong>: Escala proporcional (Ctrl: Rotación Z)
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Pill Tab Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <button
                onClick={() => setActiveTab('perspective')}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'perspective' ? 'var(--accent-primary)' : 'transparent',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Sliders size={13} />
                <span>3D</span>
              </button>
              <button
                onClick={() => setActiveTab('color')}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'color' ? 'var(--accent-primary)' : 'transparent',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Palette size={13} />
                <span>Ajustar</span>
              </button>
              <button
                onClick={() => setActiveTab('lighting')}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'lighting' ? 'var(--accent-primary)' : 'transparent',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Sun size={13} />
                <span>Reflejo</span>
              </button>
              <button
                onClick={() => setActiveTab('shadow')}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'shadow' ? 'var(--accent-primary)' : 'transparent',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Layers size={13} />
                <span>Sombras</span>
              </button>
            </div>

            {/* TAB 1: 3D CONTROLS */}
            {activeTab === 'perspective' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {/* 1. Grosor del Cuadro (Espesor 3D con Canto) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Box size={13} color="var(--accent-primary)" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Grosor del Cuadro</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {thicknessCm.toFixed(1)} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="12.0"
                    step="0.1"
                    value={thicknessCm}
                    onChange={(e) => setThicknessCm(parseFloat(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {[
                      { label: '1 cm', val: 1.0 },
                      { label: '2 cm', val: 2.0 },
                      { label: '3.5 cm', val: 3.5 },
                      { label: '6 cm', val: 6.0 },
                      { label: '12 cm', val: 12.0 },
                    ].map((b) => (
                      <button
                        key={b.label}
                        onClick={() => setThicknessCm(b.val)}
                        style={{
                          padding: '4px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: thicknessCm === b.val ? 700 : 500,
                          background: thicknessCm === b.val ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.04)',
                          border:
                            thicknessCm === b.val
                              ? '1px solid var(--accent-primary)'
                              : '1px solid rgba(255,255,255,0.08)',
                          color: thicknessCm === b.val ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Distancia a la Pared (Atraer / Empujar en Z) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      Distancia a la Pared (Atraer / Empujar)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {zDistance.toFixed(1)} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8.0"
                    step="0.1"
                    value={zDistance}
                    onChange={(e) => setZDistance(parseFloat(e.target.value))}
                  />
                </div>

                {/* 3. Rotación Z (Roll / Diagonal) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      Rotación Z (Roll / Diagonal)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {rollAngle > 0 ? `+${rollAngle}°` : `${rollAngle}°`}
                      </span>
                      {rollAngle !== 0 && (
                        <button
                          onClick={() => setRollAngle(0)}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            cursor: 'pointer',
                          }}
                        >
                          0°
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="1"
                    value={rollAngle}
                    onChange={(e) => setRollAngle(parseInt(e.target.value))}
                  />
                </div>

                {/* 4. Inclinación Vertical (Pitch / Repisa) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      Inclinación Vertical (Pitch / Repisa)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {pitchAngle > 0 ? `+${pitchAngle}º` : `${pitchAngle}º`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-75"
                    max="75"
                    step="1"
                    value={pitchAngle}
                    onChange={(e) => setPitchAngle(parseInt(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    <button
                      onClick={() => setPitchAngle(0)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                      }}
                    >
                      <RotateCcw size={10} /> 0º
                    </button>
                    <button
                      onClick={() => setPitchAngle(15)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      +15º Arriba
                    </button>
                    <button
                      onClick={() => setPitchAngle(-15)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      -15º Abajo
                    </button>
                    <button
                      onClick={() => setPitchAngle(60)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      Acostar (60º)
                    </button>
                  </div>
                </div>

                {/* 5. Ángulo Horizontal (Pared) */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      Ángulo Horizontal (Pared)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {wallAngle > 0 ? `+${wallAngle}º` : `${wallAngle}º`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="1"
                    value={wallAngle}
                    onChange={(e) => setWallAngle(parseInt(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    <button
                      onClick={() => setWallAngle(0)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                      }}
                    >
                      <RotateCcw size={10} /> 0º
                    </button>
                    <button
                      onClick={() => setWallAngle(35)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      35º
                    </button>
                    <button
                      onClick={() => setWallAngle(-35)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      -35º
                    </button>
                    <button
                      onClick={() => setWallAngle(90)}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      Canto
                    </button>
                  </div>
                </div>

                {/* 6. Escala del Cuadro */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>Escala del Cuadro</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {Math.round(scaleWidth * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.90"
                    step="0.01"
                    value={scaleWidth}
                    onChange={(e) => setScaleWidth(parseFloat(e.target.value))}
                  />
                </div>

                {/* 7. Armonización Lumínica con la Pared */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      🎨 Integración con la Habitación (Smart Match)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {Math.round(wallHarmonization * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wallHarmonization}
                    onChange={(e) => setWallHarmonization(parseFloat(e.target.value))}
                    style={{ marginBottom: '8px' }}
                  />

                  {wallSample && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '4px',
                            background: wallSample.hexColor,
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        />
                        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
                          {wallSample.luminance < 0.4
                            ? 'Ambiente Moody'
                            : wallSample.luminance > 0.75
                            ? 'Ambiente Luminoso'
                            : 'Ambiente Neutro'}
                        </span>
                      </div>
                      <button
                        onClick={() => setWallHarmonization(0.35)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '9px',
                          fontWeight: 600,
                          background: 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Auto (35%)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FULL CANVA ADJUSTMENT SUITE (60FPS THROTTLED) */}
            {activeTab === 'color' && (
              <div
                style={{
                  maxHeight: '440px',
                  overflowY: 'auto',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* 1. Balance de Blancos */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    💡 Balance de Blancos
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Temperatura</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: temperature > 0 ? '#f59e0b' : temperature < 0 ? '#38bdf8' : '#94a3b8',
                          }}
                        >
                          {temperature}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={temperature}
                        onChange={(e) => setTemperature(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Matiz (Tint)</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: tint > 0 ? '#de2367' : tint < 0 ? '#10b981' : '#94a3b8',
                          }}
                        >
                          {tint}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={tint}
                        onChange={(e) => setTint(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Iluminación */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    ☀️ Iluminación
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Brillo</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={brightness}
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Contraste</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Luces (Highlights)</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{highlights}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={highlights}
                        onChange={(e) => setHighlights(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Sombras</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{shadowsTone}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={shadowsTone}
                        onChange={(e) => setShadowsTone(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Blancos</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{whites}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={whites}
                        onChange={(e) => setWhites(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Negros</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{blacks}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={blacks}
                        onChange={(e) => setBlacks(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Color */}
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    🎨 Color
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Tono (Hue Rotate)</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{hue}º</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={hue}
                        onChange={(e) => setHue(parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                        <span>Saturación</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{saturation}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={saturation}
                        onChange={(e) => setSaturation(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTemperature(0);
                    setTint(0);
                    setBrightness(0);
                    setContrast(0);
                    setHighlights(0);
                    setShadowsTone(0);
                    setWhites(0);
                    setBlacks(0);
                    setHue(0);
                    setSaturation(0);
                    setInvert(false);
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: 'rgba(255,255,255,0.05)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={11} /> Resetear Todos los Ajustes
                </button>
              </div>
            )}

            {/* TAB 3: REFLECTION & WEATHER LIGHTING */}
            {activeTab === 'lighting' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {/* 1. Selector de Acabado del Cuadro */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                    💎 Acabado y Superficie
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    {[
                      { id: 'resina', name: 'Resina Epoxi', sub: 'Muy Brillante' },
                      { id: 'brillante', name: 'Vinilo Brillante', sub: 'Satinado' },
                      { id: 'mate', name: 'Vinilo Mate', sub: 'Antirreflejo' },
                    ].map((f) => {
                      const isSel = finishMode === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setFinishMode(f.id as any)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: isSel ? 700 : 500,
                            border: isSel ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                            background: isSel ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.03)',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <span>{f.name}</span>
                          <span style={{ fontSize: '8.5px', opacity: 0.7 }}>{f.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Tonalidad & Clima del Mockup */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <CloudSun size={13} color="var(--accent-primary)" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      Tonalidad & Clima del Mockup
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                    {[
                      { id: 'day', name: 'Mañana', icon: '☀️' },
                      { id: 'sunset', name: 'Cálida', icon: '🌇' },
                      { id: 'night', name: 'Noche', icon: '🌙' },
                      { id: 'sunny', name: 'Soleado', icon: '✨' },
                      { id: 'cloudy', name: 'Nublado', icon: '☁️' },
                    ].map((w) => {
                      const isSel = weatherPreset === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => setWeatherPreset(w.id as WeatherPreset)}
                          style={{
                            padding: '6px 2px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: isSel ? 700 : 500,
                            border: isSel ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                            background: isSel ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.03)',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <span>{w.icon}</span>
                          <span>{w.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Rotación 360° del Ventanal */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                      🔄 Ángulo del Ventanal (360°)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {reflectionAngleDeg}º
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {[
                      { name: 'Frontal', angle: 0 },
                      { name: 'Lat. Der', angle: 90 },
                      { name: 'Opuesto', angle: 180 },
                      { name: 'Lat. Izq', angle: 270 },
                    ].map((p) => {
                      const isSel = Math.abs(reflectionAngleDeg - p.angle) < 5;
                      return (
                        <button
                          key={p.name}
                          onClick={() => setReflectionAngleDeg(p.angle)}
                          style={{
                            padding: '5px 2px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 600,
                            border: isSel ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                            background: isSel ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.03)',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                          }}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="2"
                    value={reflectionAngleDeg}
                    onChange={(e) => setReflectionAngleDeg(parseInt(e.target.value))}
                  />
                </div>

                {/* 4. Sliders de Brillo, Contraste, Escala & Nitidez */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>💎 Brillo de Reflejo</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {Math.round(reflectionIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={reflectionIntensity}
                    onChange={(e) => setReflectionIntensity(parseFloat(e.target.value))}
                    style={{ marginBottom: '10px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>🌓 Contraste de Reflejo</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{reflectionBrightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={reflectionBrightness}
                    onChange={(e) => setReflectionBrightness(parseInt(e.target.value))}
                    style={{ marginBottom: '10px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>🔍 Cobertura / Escala del Ventanal</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {Math.round(reflectionScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={reflectionScale}
                    onChange={(e) => setReflectionScale(parseFloat(e.target.value))}
                    style={{ marginBottom: '10px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ffffff', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>✨ Nitidez / Rugosidad del Cristal</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {reflectionRoughness <= 0.04
                        ? 'Cristal Ultra Nítido'
                        : reflectionRoughness <= 0.1
                        ? 'Vidrio / Resina'
                        : reflectionRoughness <= 0.18
                        ? 'Semibrillo'
                        : 'Satinado'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.25"
                    step="0.01"
                    value={reflectionRoughness}
                    onChange={(e) => setReflectionRoughness(parseFloat(e.target.value))}
                  />
                </div>

                {/* 5. Firmas de Reflejo Escénico */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                    🏛️ Firmas de Reflejo Escénico Publicitario
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {REFLECTION_OPTIONS.map((ref) => {
                      const isSel = reflectionType === ref.id;
                      return (
                        <button
                          key={ref.id}
                          onClick={() => setReflectionType(ref.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: isSel ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                            background: isSel ? 'rgba(222, 35, 103, 0.18)' : 'rgba(255,255,255,0.03)',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{ref.icon}</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ref.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SHADOWS (AUTO-SYNCHRONIZED) */}
            {activeTab === 'shadow' && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                  Estilo de Sombra en Pared
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {CANVA_SHADOW_OPTIONS.map((opt) => {
                    const isSel = shadowPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setShadowPreset(opt.id)}
                        style={{
                          padding: '8px 2px',
                          borderRadius: '8px',
                          border: isSel ? '1.5px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                          background: isSel ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.03)',
                          color: isSel ? '#ffffff' : '#94a3b8',
                          fontSize: '10px',
                          fontWeight: isSel ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '4px',
                            background: '#f43f7e',
                            boxShadow:
                              opt.id === 'parallel'
                                ? '2px 3px 5px rgba(0,0,0,0.8)'
                                : opt.id === 'glow'
                                ? '0 0 6px rgba(0,0,0,0.8)'
                                : opt.id === 'curved'
                                ? '0 4px 3px rgba(0,0,0,0.7)'
                                : 'none',
                          }}
                        />
                        <span>{opt.name}</span>
                      </button>
                    );
                  })}
                </div>

                {shadowPreset !== 'none' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* 1. Intensidad de Sombra (0% a 100%) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Intensidad de Sombra</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {shadowIntensity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={shadowIntensity}
                        onChange={(e) => setShadowIntensity(parseInt(e.target.value))}
                      />
                    </div>

                    {/* 2. Difuminación / Suavizado (Blur) (0% a 100%) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Difuminación / Suavizado (Blur)</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {shadowBlur <= 15 ? `${shadowBlur}% (Nítida)` : shadowBlur >= 65 ? `${shadowBlur}% (Difusa)` : `${shadowBlur}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={shadowBlur}
                        onChange={(e) => setShadowBlur(parseInt(e.target.value))}
                      />
                    </div>

                    {/* 3. Proyección / Distancia (0 a 100) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Proyección / Distancia</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {shadowDistance}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={shadowDistance}
                        onChange={(e) => setShadowDistance(parseInt(e.target.value))}
                      />
                    </div>

                    {/* 4. Sombra de Contacto en Repisa (0% a 100%) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Sombra de Contacto en Repisa</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {shadowContactOcclusion}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={shadowContactOcclusion}
                        onChange={(e) => setShadowContactOcclusion(parseInt(e.target.value))}
                      />
                    </div>

                    {/* 5. Ángulo de Luz / Sombra (0° a 360°) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#ffffff' }}>Ángulo de Luz / Sombra</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {Math.round(shadowAngleDeg)}º
                          </span>
                          <button
                            onClick={() => setShadowAngleDeg(Math.round((90 + reflectionAngleDeg * 0.5) % 360))}
                            title="Sincronizar automáticamente con el ventanal"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'var(--accent-primary)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            ⚡ Auto
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={shadowAngleDeg}
                        onChange={(e) => setShadowAngleDeg(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px var(--accent-primary-glow)',
                }}
              >
                <Check size={15} />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
